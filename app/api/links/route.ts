import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { verifyWalletSignature } from '../../../lib/auth';
import crypto from 'crypto';

/**
 * @description GET /api/links?slug=xyz
 * Retorna los detalles de un link de pago público para la pantalla de cobro.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ success: false, error: 'Slug no proporcionado.' }, { status: 400 });
  }

  const link = await db.getPaymentLinkBySlug(slug);
  if (!link) {
    return NextResponse.json({ success: false, error: 'Link de pago no encontrado.' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    link: {
      id: link.id,
      slug: link.slug,
      amount: link.amount,
      description: link.description,
      user_id: link.user_id,
      users: {
        wallet_address: link.user_wallet_address,
      },
    },
  });
}

/**
 * @description POST /api/links
 * Crea un nuevo link de pago requiriendo autenticación criptográfica de wallet en headers.
 */
export async function POST(req: NextRequest) {
  const walletAddress = req.headers.get('x-wallet-address');
  const signature = req.headers.get('x-signature');
  const timestamp = req.headers.get('x-timestamp');

  if (!walletAddress || !signature || !timestamp) {
    return NextResponse.json(
      { success: false, error: 'Headers de autenticación incompletos (x-wallet-address, x-signature, x-timestamp).' },
      { status: 401 }
    );
  }

  // 1. Verificación criptográfica de firma (vinculada a la acción CREATE_LINK)
  const authResult = verifyWalletSignature(walletAddress, signature, timestamp, 'CREATE_LINK');
  if (!authResult.valid) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { amount, description } = body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ success: false, error: 'El monto debe ser un número mayor a 0.' }, { status: 400 });
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'La descripción no puede estar vacía.' }, { status: 400 });
    }

    // 2. Obtener o crear usuario
    const user = await db.upsertUser(walletAddress);

    // 3. Generar slug seguro (8 caracteres alfanuméricos)
    const slug = crypto.randomBytes(4).toString('hex');

    // 4. Crear link en BD
    const link = await db.createPaymentLink({
      userId: user.id,
      amount: numAmount,
      description: description.trim(),
      slug,
    });

    return NextResponse.json({ success: true, link, slug });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: `Error creando el link de pago: ${err.message}` }, { status: 500 });
  }
}
