import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { verifyWalletSignature } from '../../../lib/auth';

/**
 * @description GET /api/dashboard
 * Retorna las estadísticas, links y pagos del usuario autenticado por firma de wallet.
 */
export async function GET(req: NextRequest) {
  const walletAddress = req.headers.get('x-wallet-address');
  const signature = req.headers.get('x-signature');
  const timestamp = req.headers.get('x-timestamp');

  if (!walletAddress || !signature || !timestamp) {
    return NextResponse.json(
      { success: false, error: 'Headers de autenticación requeridos (x-wallet-address, x-signature, x-timestamp).' },
      { status: 401 }
    );
  }

  // 1. Verificación criptográfica de firma (vinculada a la acción GET_DASHBOARD)
  const authResult = verifyWalletSignature(walletAddress, signature, timestamp, 'GET_DASHBOARD');
  if (!authResult.valid) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
  }

  try {
    // 2. Obtener usuario por wallet
    let user = await db.getUserByWallet(walletAddress);
    if (!user) {
      user = await db.upsertUser(walletAddress);
    }

    // 3. Obtener métricas exclusivas del usuario
    const dashboardData = await db.getUserDashboardData(user.id);

    return NextResponse.json({
      success: true,
      user,
      links: dashboardData.links,
      payments: dashboardData.payments,
      totalCollected: dashboardData.totalCollected,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: `Error obteniendo datos del dashboard: ${err.message}` },
      { status: 500 }
    );
  }
}
