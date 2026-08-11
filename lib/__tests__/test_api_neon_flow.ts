import nacl from 'tweetnacl';
import bs58 from 'bs58';
import fs from 'fs';
import path from 'path';
import { verifyWalletSignature, getAuthMessage } from '../auth';
import { db } from '../db';

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const val = valueParts.join('=').replace(/^["']|["']$/g, '');
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = val.trim();
        }
      }
    }
  }
}

loadEnvLocal();

async function runApiNeonFlowTest() {
  console.log('⚡ === PRUEBA INTEGRAL DE FLUJO DE API Y BASE DE DATOS NEON REAL ===\n');

  const wallet = nacl.sign.keyPair();
  const walletPubkey = bs58.encode(wallet.publicKey);
  const ts = Date.now();

  // 1. Crear / Sincronizar Usuario en Neon
  console.log('1. Sincronizando usuario en Neon por wallet...');
  const user = await db.upsertUser(walletPubkey);
  console.log(`✅ Usuario registrado en Neon con ID: ${user.id}`);

  // 2. Crear Payment Link con Firma
  console.log('\n2. Verificando autenticación y creando Payment Link...');
  const msgCreate = getAuthMessage(walletPubkey, ts, 'CREATE_LINK');
  const sigCreate = bs58.encode(nacl.sign.detached(new TextEncoder().encode(msgCreate), wallet.secretKey));
  const authCreate = verifyWalletSignature(walletPubkey, sigCreate, ts.toString(), 'CREATE_LINK');

  if (!authCreate.valid) {
    console.error('❌ Error en autenticación de firma:', authCreate.error);
    process.exit(1);
  }

  const slug = 'api' + Math.floor(Math.random() * 10000);
  const link = await db.createPaymentLink({
    userId: user.id,
    amount: 49.99,
    description: 'Suscripción Premium Solpagos',
    slug,
  });
  console.log(`✅ Payment Link guardado en Neon: /pagar/${link.slug} (Monto: ${link.amount} USDC)`);

  // 3. Obtener Payment Link por Slug (Pantalla de pago pública)
  console.log('\n3. Obteniendo información pública del link por slug...');
  const fetchedLink = await db.getPaymentLinkBySlug(slug);
  if (!fetchedLink || fetchedLink.user_wallet_address !== walletPubkey) {
    console.error('❌ Falló la recuperación del link en Neon.');
    process.exit(1);
  }
  console.log(`✅ Link recuperado exitosamente. Creador: ${fetchedLink.user_wallet_address}`);

  // 4. Consultar Dashboard Autenticado
  console.log('\n4. Verificando firma y obteniendo datos privados del Dashboard...');
  const tsDash = Date.now() + 1;
  const msgDash = getAuthMessage(walletPubkey, tsDash, 'GET_DASHBOARD');
  const sigDash = bs58.encode(nacl.sign.detached(new TextEncoder().encode(msgDash), wallet.secretKey));
  const authDash = verifyWalletSignature(walletPubkey, sigDash, tsDash.toString(), 'GET_DASHBOARD');

  if (!authDash.valid) {
    console.error('❌ Error autenticando sesión del dashboard.');
    process.exit(1);
  }

  const dashboardData = await db.getUserDashboardData(user.id);
  console.log(`✅ Dashboard cargado desde Neon: ${dashboardData.links.length} links activos, total cobrado: ${dashboardData.totalCollected} USDC.`);

  // 5. Limpieza
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(process.env.DATABASE_URL!);
  await sql`DELETE FROM users WHERE wallet_address = ${walletPubkey};`;
  console.log('\n✅ Limpieza de datos de prueba completada.');
  console.log('🎉 === PRUEBA INTEGRAL DE API CON NEON COMPLETADA CON ÉXITO ===');
}

runApiNeonFlowTest().catch(err => {
  console.error('❌ Error en prueba integral:', err);
  process.exit(1);
});
