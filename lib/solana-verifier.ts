import { Connection } from '@solana/web3.js';
import { db } from './db';
import { PaymentLink } from './types';

const DEVNET_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const USDC_MINT_STR = process.env.NEXT_PUBLIC_USDC_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

export interface VerificationResult {
  verified: boolean;
  reason?: string;
  link?: PaymentLink & { user_wallet_address: string };
  amountProcessed?: number;
}

/**
 * @description Verifica de forma rigurosa en la blockchain de Solana si una transacción
 * de pago enviada es válida y cumple con todos los requisitos antes de registrarla en la BD.
 */
export async function verifySolanaPaymentOnChain(params: {
  slug: string;
  fromWallet: string;
  txSignature: string;
  connection?: Connection;
}): Promise<VerificationResult> {
  const { slug, fromWallet, txSignature } = params;

  if (!slug || !fromWallet || !txSignature) {
    return { verified: false, reason: 'Parámetros incompletos (slug, fromWallet, txSignature son requeridos).' };
  }

  // 1. Prevención de Replay Attack: verificar que la firma no haya sido procesada antes
  const existingPayment = await db.getPaymentByTxSignature(txSignature);
  if (existingPayment) {
    return { verified: false, reason: 'REPLAY_ATTACK: La firma de la transacción ya ha sido procesada previamente.' };
  }

  // 2. Obtener la información del payment link en la BD
  const link = await db.getPaymentLinkBySlug(slug);
  if (!link) {
    return { verified: false, reason: 'NOT_FOUND: El link de pago indicado no existe.' };
  }

  // 3. Consultar la transacción en la blockchain de Solana
  const rpcConnection = params.connection || new Connection(DEVNET_RPC, 'confirmed');

  let parsedTx;
  try {
    parsedTx = await rpcConnection.getParsedTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });
  } catch (err: any) {
    return { verified: false, reason: `RPC_ERROR: Error al consultar la red de Solana: ${err.message}` };
  }

  if (!parsedTx) {
    return { verified: false, reason: 'TX_NOT_FOUND: La transacción no fue encontrada en la red Solana.' };
  }

  // 4. Verificar que la transacción se haya ejecutado sin errores
  if (parsedTx.meta?.err !== null) {
    return { verified: false, reason: 'TX_FAILED: La transacción falló en la blockchain de Solana.' };
  }

  // 5. Verificar fecha de la transacción (Evitar reutilización de transacciones históricas anteriores a la creación del link)
  if (parsedTx.blockTime) {
    const linkCreatedAtUnix = Math.floor(new Date(link.created_at).getTime() / 1000);
    // Margen de 120 segundos por posible desfasaje de reloj
    if (parsedTx.blockTime < linkCreatedAtUnix - 120) {
      return {
        verified: false,
        reason: 'TIMING_MISMATCH: La transacción fue ejecutada en la blockchain antes de la creación de este link de pago.',
      };
    }
  }

  // 6. Analizar los cambios de balance de tokens (SPL Token Transfer)
  const meta = parsedTx.meta;
  if (!meta || !meta.preTokenBalances || !meta.postTokenBalances) {
    return { verified: false, reason: 'NO_TOKEN_BALANCES: La transacción no contiene balances de tokens SPL validables.' };
  }

  // Verificar si hay mints de USDC involucrados
  const tokenBalances = [...meta.preTokenBalances, ...meta.postTokenBalances];
  const hasUsdcMint = tokenBalances.some(b => b.mint === USDC_MINT_STR);

  if (!hasUsdcMint) {
    return { verified: false, reason: `INVALID_MINT: La transacción no incluye el token de pago esperado (${USDC_MINT_STR}).` };
  }

  // Verificar la transferencia a la wallet receptora del creador del link
  const recipientWallet = link.user_wallet_address;
  if (!recipientWallet) {
    return { verified: false, reason: 'INVALID_RECIPIENT_DATA: No se pudo determinar la wallet del vendedor.' };
  }

  // Calcular el incremento neto de balance para la wallet receptora
  const postRecipientBalances = meta.postTokenBalances.filter(
    b => b.owner === recipientWallet && b.mint === USDC_MINT_STR
  );
  const preRecipientBalances = meta.preTokenBalances.filter(
    b => b.owner === recipientWallet && b.mint === USDC_MINT_STR
  );

  let recipientReceivedAmount = 0;

  if (postRecipientBalances.length > 0) {
    const postAmt = postRecipientBalances.reduce((acc, b) => acc + (b.uiTokenAmount.uiAmount || 0), 0);
    const preAmt = preRecipientBalances.reduce((acc, b) => acc + (b.uiTokenAmount.uiAmount || 0), 0);
    recipientReceivedAmount = postAmt - preAmt;
  } else {
    // Si no se encuentra balance en el array por owner, verificar parsed instructions (transfer y transferChecked)
    const instructions = parsedTx.transaction.message.instructions;
    for (const ix of instructions) {
      if ('parsed' in ix && ix.program === 'spl-token') {
        const type = ix.parsed?.type;
        if (type === 'transfer' || type === 'transferChecked') {
          const info = ix.parsed.info;
          if (info && info.amount) {
            const rawAmount = Number(info.amount) / 1_000_000;
            recipientReceivedAmount += rawAmount;
          }
        }
      }
    }
  }

  // 7. Verificar que el monto recibido sea exacto o mayor al solicitado
  const expectedAmount = link.amount;
  const isAmountValid = Math.abs(recipientReceivedAmount - expectedAmount) < 0.001 || recipientReceivedAmount >= expectedAmount;

  if (!isAmountValid) {
    return {
      verified: false,
      reason: `INVALID_AMOUNT: El monto recibido (${recipientReceivedAmount} USDC) es insuficiente o no coincide con el solicitado (${expectedAmount} USDC).`,
    };
  }

  // 8. Verificar que la wallet emisora figure entre los firmantes de la transacción
  const isFromWalletInSigners = parsedTx.transaction.message.accountKeys.some(
    acc => acc.pubkey.toBase58() === fromWallet && acc.signer
  );

  if (!isFromWalletInSigners) {
    return { verified: false, reason: 'INVALID_SENDER: La wallet del remitente no figura como firmante de la transacción.' };
  }

  return {
    verified: true,
    link,
    amountProcessed: link.amount,
  };
}
