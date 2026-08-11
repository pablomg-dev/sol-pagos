import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { verifySolanaPaymentOnChain } from '../../../../lib/solana-verifier';

/**
 * @description POST /api/payments/verify
 * Endpoint servidor que verifica la validez on-chain de una transacción en Solana
 * antes de registrarla en la base de datos.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, fromWallet, txSignature } = body;

    if (!slug || !fromWallet || !txSignature) {
      return NextResponse.json(
        { success: false, error: 'Parámetros obligatorios faltantes: slug, fromWallet, txSignature.' },
        { status: 400 }
      );
    }

    // 1. Verificación rigurosa on-chain en Solana
    const verification = await verifySolanaPaymentOnChain({ slug, fromWallet, txSignature });

    if (!verification.verified || !verification.link) {
      const isReplay = verification.reason?.includes('REPLAY_ATTACK');
      const status = isReplay ? 409 : 422;
      return NextResponse.json(
        { success: false, error: verification.reason || 'No se pudo verificar la transacción on-chain.' },
        { status }
      );
    }

    const link = verification.link;

    // 2. Inserción idempotente en la BD
    try {
      const payment = await db.recordPayment({
        paymentLinkId: link.id,
        fromWallet,
        amount: link.amount,
        txSignature,
      });

      return NextResponse.json({
        success: true,
        message: 'Pago verificado on-chain y registrado exitosamente.',
        payment,
      });
    } catch (dbErr: any) {
      if (dbErr?.message?.includes('TX_SIGNATURE_EXISTS')) {
        return NextResponse.json(
          { success: false, error: 'REPLAY_ATTACK: Esta firma de transacción ya fue procesada anteriormente.' },
          { status: 409 }
        );
      }
      throw dbErr;
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: `Error en la verificación del pago: ${err.message}` },
      { status: 500 }
    );
  }
}
