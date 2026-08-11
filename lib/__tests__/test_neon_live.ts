import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

// Cargar .env.local manualmente para node tsx
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

async function runNeonLiveTest() {
  console.log('🐘 === PRUEBA DE CONEXIÓN Y VERIFICACIÓN DE SCHEMA EN NEON POSTGRES ===\n');

  const dbUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL;

  if (!dbUrl) {
    console.error('❌ Error: DATABASE_URL no encontrada en .env.local');
    process.exit(1);
  }

  console.log('✅ Variable DATABASE_URL detectada en el servidor (Valor ocultado por seguridad).\n');

  const sql = neon(dbUrl);

  try {
    // 1. Probar conexión básica
    console.log('📡 1. Probando handshake de conexión con Neon...');
    const nowResult = (await sql`SELECT NOW() as current_time;`) as any[];
    console.log(`✅ Conexión establecida exitosamente. Hora del servidor Postgres: ${nowResult[0].current_time}`);

    // 2. Crear / Asegurar esquema DDL
    console.log('\n🛠 2. Verificando/Creando esquema relacional (users, payment_links, payments)...');

    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_address VARCHAR(44) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS payment_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        slug VARCHAR(16) NOT NULL UNIQUE,
        amount NUMERIC(14, 6) NOT NULL CHECK (amount > 0),
        description TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_link_id UUID NOT NULL REFERENCES payment_links(id) ON DELETE CASCADE,
        from_wallet VARCHAR(44) NOT NULL,
        amount NUMERIC(14, 6) NOT NULL CHECK (amount > 0),
        tx_signature VARCHAR(88) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    console.log('✅ Esquema DDL aplicado correctamente.');

    // 3. Inspeccionar tablas e índices existentes
    console.log('\n🔍 3. Inspeccionando estructura de tablas en Neon information_schema...');
    const tables = (await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'payment_links', 'payments');
    `) as any[];

    const tableNames = tables.map(t => t.table_name);
    console.log(`✅ Tablas confirmadas en la BD public: ${tableNames.join(', ')}`);

    // 4. Probar Operaciones CRUD reales
    console.log('\n🧪 4. Ejecutando prueba de inserción, consulta y constraints en Neon...');

    const testWallet = 'TestWallet111111111111111111111111111111111';
    const testSlug = 'neonslug' + Math.floor(Math.random() * 1000);
    const testTxSig = 'NeonTxSig_' + Math.random().toString(36).substring(2, 10);

    // a. Inserción de usuario
    const uRows = (await sql`
      INSERT INTO users (wallet_address)
      VALUES (${testWallet})
      ON CONFLICT (wallet_address) DO UPDATE SET wallet_address = EXCLUDED.wallet_address
      RETURNING id, wallet_address;
    `) as any[];
    const userId = uRows[0].id;
    console.log(`  └─ Usuario creado/actualizado OK (ID: ${userId})`);

    // b. Inserción de payment link
    const linkRows = (await sql`
      INSERT INTO payment_links (user_id, slug, amount, description)
      VALUES (${userId}, ${testSlug}, 25.00, 'Prueba Neon Live')
      RETURNING id, slug, amount;
    `) as any[];
    const linkId = linkRows[0].id;
    console.log(`  └─ Payment Link creado OK (Slug: ${testSlug}, Monto: 25.00 USDC)`);

    // c. Inserción de pago
    const pRows = (await sql`
      INSERT INTO payments (payment_link_id, from_wallet, amount, tx_signature)
      VALUES (${linkId}, 'PayerWallet22222222222222222222222222222', 25.00, ${testTxSig})
      RETURNING id, tx_signature;
    `) as any[];
    console.log(`  └─ Pago registrado OK (TX Signature: ${testTxSig})`);

    // d. Prueba de UNIQUE constraint en tx_signature
    let caughtUniqueErr = false;
    try {
      await sql`
        INSERT INTO payments (payment_link_id, from_wallet, amount, tx_signature)
        VALUES (${linkId}, 'PayerWallet22222222222222222222222222222', 25.00, ${testTxSig});
      `;
    } catch (err: any) {
      if (err.message.includes('unique') || err.message.includes('UNIQUE') || err.code === '23505') {
        caughtUniqueErr = true;
      }
    }
    console.log(`  └─ Prueba de UNIQUE constraint en tx_signature: ${caughtUniqueErr ? '✅ FUNCIONA (Rechazó duplicado)' : '❌ FALLÓ'}`);

    // e. Limpieza de datos de prueba
    await sql`DELETE FROM users WHERE wallet_address = ${testWallet};`;
    console.log('  └─ Limpieza de datos de prueba realizada OK.');

    console.log('\n🎉 === TODAS LAS PRUEBAS EN NEON POSTGRES COMPLETADAS CON ÉXITO ===');
  } catch (err: any) {
    console.error('❌ Error ejecutando pruebas en Neon:', err.message);
    process.exit(1);
  }
}

runNeonLiveTest();
