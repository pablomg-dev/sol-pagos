import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { verifyWalletSignature, getAuthMessage } from '../auth';
import { db } from '../db';
import { verifySolanaPaymentOnChain } from '../solana-verifier';

console.log('🧪 === SOLPAGOS SUITE DE AUDITORÍA POST-IMPLEMENTACIÓN Y PRUEBAS DE ATAQUE ===\n');

async function runAttackSuite() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${detail || 'Falló la aserción'}`);
      failed++;
    }
  }

  // Generación de Wallets de prueba
  const walletA = nacl.sign.keyPair();
  const walletA_pubkey = bs58.encode(walletA.publicKey);
  const walletB = nacl.sign.keyPair();
  const walletB_pubkey = bs58.encode(walletB.publicKey);

  // --- ATAQUE 1: Wallet A intenta firmar una petición declarando ser Wallet B (Falsificación de Headers) ---
  const ts1 = Date.now();
  const msgA = getAuthMessage(walletA_pubkey, ts1, 'CREATE_LINK');
  const sigA = bs58.encode(nacl.sign.detached(new TextEncoder().encode(msgA), walletA.secretKey));
  
  // Intento enviando header walletAddress = B pero firma de A
  const attack1 = verifyWalletSignature(walletB_pubkey, sigA, ts1.toString(), 'CREATE_LINK');
  assert(attack1.valid === false, 'Ataque 1: Falsificación de wallet header con firma de otra wallet RECHAZADO');

  // --- ATAQUE 2: Wallet A intenta reutilizar la misma firma de autenticación (Replay Attack de Firma) ---
  const ts2 = Date.now();
  const msgSingle = getAuthMessage(walletA_pubkey, ts2, 'GET_DASHBOARD');
  const sigSingle = bs58.encode(nacl.sign.detached(new TextEncoder().encode(msgSingle), walletA.secretKey));
  
  const firstUse = verifyWalletSignature(walletA_pubkey, sigSingle, ts2.toString(), 'GET_DASHBOARD');
  const secondUse = verifyWalletSignature(walletA_pubkey, sigSingle, ts2.toString(), 'GET_DASHBOARD');
  assert(firstUse.valid === true && secondUse.valid === false, 'Ataque 2: Reuso/Replay de la misma firma de auth RECHAZADO (Single-use)');

  // --- ATAQUE 3: Reuso de firma para una acción distinta (Cross-Action Replay Attack) ---
  const ts3 = Date.now();
  const msgAction = getAuthMessage(walletA_pubkey, ts3, 'GET_DASHBOARD');
  const sigAction = bs58.encode(nacl.sign.detached(new TextEncoder().encode(msgAction), walletA.secretKey));
  
  // Se envía la firma para CREATE_LINK cuando fue firmada para GET_DASHBOARD
  const attack3 = verifyWalletSignature(walletA_pubkey, sigAction, ts3.toString(), 'CREATE_LINK');
  assert(attack3.valid === false, 'Ataque 3: Firma emitida para una acción usada en otra diferente RECHAZADO');

  // --- ATAQUE 4: Enviar timestamps manipulados/futuros/expirados ---
  const tsExpired = Date.now() - (6 * 60 * 1000); // 6 minutos en el pasado
  const msgExp = getAuthMessage(walletA_pubkey, tsExpired, 'CREATE_LINK');
  const sigExp = bs58.encode(nacl.sign.detached(new TextEncoder().encode(msgExp), walletA.secretKey));
  const attack4a = verifyWalletSignature(walletA_pubkey, sigExp, tsExpired.toString(), 'CREATE_LINK');
  assert(attack4a.valid === false, 'Ataque 4a: Timestamp expirado RECHAZADO');

  const tsFuture = Date.now() + (10 * 60 * 1000); // 10 minutos en el futuro
  const msgFut = getAuthMessage(walletA_pubkey, tsFuture, 'CREATE_LINK');
  const sigFut = bs58.encode(nacl.sign.detached(new TextEncoder().encode(msgFut), walletA.secretKey));
  const attack4b = verifyWalletSignature(walletA_pubkey, sigFut, tsFuture.toString(), 'CREATE_LINK');
  assert(attack4b.valid === false, 'Ataque 4b: Timestamp manipulado en el futuro RECHAZADO');

  // --- ATAQUE 5: Wallet A intenta consultar el Dashboard de Wallet B ---
  const userA = await db.upsertUser(walletA_pubkey);
  const userB = await db.upsertUser(walletB_pubkey);
  
  const linkB = await db.createPaymentLink({
    userId: userB.id,
    amount: 100,
    description: 'Cobro privado de B',
    slug: 'slugprivadob',
  });

  const dashDataA = await db.getUserDashboardData(userA.id);
  const dashDataB = await db.getUserDashboardData(userB.id);

  assert(
    dashDataA.links.every(l => l.user_id === userA.id) &&
    dashDataB.links.every(l => l.user_id === userB.id) &&
    !dashDataA.links.some(l => l.slug === 'slugprivadob'),
    'Ataque 5: Intento de fuga/consulta de datos entre wallets aisladas RECHAZADO'
  );

  // --- ATAQUE 6: Petición simultánea/concurrente con la misma `tx_signature` ---
  const concurrentTxSig = 'Concurrent_Tx_Signature_Test_99999';
  const p1 = db.recordPayment({ paymentLinkId: linkB.id, fromWallet: walletA_pubkey, amount: 100, txSignature: concurrentTxSig });
  const p2 = db.recordPayment({ paymentLinkId: linkB.id, fromWallet: walletA_pubkey, amount: 100, txSignature: concurrentTxSig });

  const results = await Promise.allSettled([p1, p2]);
  const fulfilledCount = results.filter(r => r.status === 'fulfilled').length;
  const rejectedCount = results.filter(r => r.status === 'rejected').length;

  assert(fulfilledCount === 1 && rejectedCount === 1, 'Ataque 6: Peticiones concurrentes con misma tx_signature (Solo 1 exitosa, 1 rechazada por condición de carrera)');

  // --- ATAQUE 7: Intento de verificación de transacción con firma de Solana inexistente ---
  const attack7 = await verifySolanaPaymentOnChain({
    slug: linkB.slug,
    fromWallet: walletA_pubkey,
    txSignature: 'FakeSolanaTxSignature1111111111111111111111111111111111111111111111111111111111',
  });
  assert(attack7.verified === false, 'Ataque 7: Verificación on-chain de transacción inexistente RECHAZADA');

  console.log(`\n📊 Resumen de Suite de Ataque: ${passed} pasadas, ${failed} falladas.`);
  if (failed > 0) process.exit(1);
}

runAttackSuite().catch(err => {
  console.error('Error durante la suite de ataque:', err);
  process.exit(1);
});
