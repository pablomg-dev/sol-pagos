import { User, PaymentLink, Payment } from './types';
import { neon } from '@neondatabase/serverless';

export interface DatabaseAdapter {
  upsertUser(walletAddress: string): Promise<User>;
  getUserByWallet(walletAddress: string): Promise<User | null>;
  createPaymentLink(params: { userId: string; amount: number; description: string; slug: string }): Promise<PaymentLink>;
  getPaymentLinkBySlug(slug: string): Promise<(PaymentLink & { user_wallet_address: string }) | null>;
  getPaymentByTxSignature(txSignature: string): Promise<Payment | null>;
  recordPayment(params: { paymentLinkId: string; fromWallet: string; amount: number; txSignature: string }): Promise<Payment>;
  getUserDashboardData(userId: string): Promise<{ links: PaymentLink[]; payments: Payment[]; totalCollected: number }>;
}

// In-Memory Database Fallback para desarrollo sin DATABASE_URL
class InMemoryAdapter implements DatabaseAdapter {
  private users: Map<string, User> = new Map();
  private links: Map<string, PaymentLink> = new Map();
  private payments: Map<string, Payment> = new Map();

  async upsertUser(walletAddress: string): Promise<User> {
    let user = Array.from(this.users.values()).find(u => u.wallet_address === walletAddress);
    if (!user) {
      user = {
        id: crypto.randomUUID(),
        wallet_address: walletAddress,
        created_at: new Date().toISOString(),
      };
      this.users.set(user.id, user);
    }
    return user;
  }

  async getUserByWallet(walletAddress: string): Promise<User | null> {
    return Array.from(this.users.values()).find(u => u.wallet_address === walletAddress) || null;
  }

  async createPaymentLink(params: { userId: string; amount: number; description: string; slug: string }): Promise<PaymentLink> {
    const link: PaymentLink = {
      id: crypto.randomUUID(),
      user_id: params.userId,
      slug: params.slug,
      amount: params.amount,
      description: params.description,
      created_at: new Date().toISOString(),
    };
    this.links.set(link.id, link);
    return link;
  }

  async getPaymentLinkBySlug(slug: string): Promise<(PaymentLink & { user_wallet_address: string }) | null> {
    const link = Array.from(this.links.values()).find(l => l.slug === slug);
    if (!link) return null;
    const user = this.users.get(link.user_id);
    return {
      ...link,
      user_wallet_address: user ? user.wallet_address : '',
    };
  }

  async getPaymentByTxSignature(txSignature: string): Promise<Payment | null> {
    return Array.from(this.payments.values()).find(p => p.tx_signature === txSignature) || null;
  }

  async recordPayment(params: { paymentLinkId: string; fromWallet: string; amount: number; txSignature: string }): Promise<Payment> {
    const existing = Array.from(this.payments.values()).find(p => p.tx_signature === params.txSignature);
    if (existing) {
      throw new Error('TX_SIGNATURE_EXISTS: La firma de la transacción ya ha sido procesada.');
    }
    const payment: Payment = {
      id: crypto.randomUUID(),
      payment_link_id: params.paymentLinkId,
      from_wallet: params.fromWallet,
      amount: params.amount,
      tx_signature: params.txSignature,
      created_at: new Date().toISOString(),
    };
    this.payments.set(payment.id, payment);
    return payment;
  }

  async getUserDashboardData(userId: string): Promise<{ links: PaymentLink[]; payments: Payment[]; totalCollected: number }> {
    const userLinks = Array.from(this.links.values())
      .filter(l => l.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const userLinkIds = new Set(userLinks.map(l => l.id));
    const userPayments = Array.from(this.payments.values())
      .filter(p => userLinkIds.has(p.payment_link_id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(p => {
        const link = this.links.get(p.payment_link_id);
        return {
          ...p,
          payment_links: link ? { description: link.description, user_id: link.user_id } : undefined,
        };
      });

    const totalCollected = userPayments.reduce((acc, p) => acc + p.amount, 0);

    return { links: userLinks, payments: userPayments, totalCollected };
  }
}

// Adaptador PostgreSQL Serverless (Neon / Postgres)
class NeonAdapter implements DatabaseAdapter {
  private sql: ReturnType<typeof neon>;
  private schemaInitialized = false;

  constructor(connectionString: string) {
    this.sql = neon(connectionString);
  }

  private async ensureSchema() {
    if (this.schemaInitialized) return;
    try {
      await this.sql`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          wallet_address VARCHAR(44) NOT NULL UNIQUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;
      await this.sql`
        CREATE TABLE IF NOT EXISTS payment_links (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          slug VARCHAR(16) NOT NULL UNIQUE,
          amount NUMERIC(14, 6) NOT NULL CHECK (amount > 0),
          description TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;
      await this.sql`
        CREATE TABLE IF NOT EXISTS payments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          payment_link_id UUID NOT NULL REFERENCES payment_links(id) ON DELETE CASCADE,
          from_wallet VARCHAR(44) NOT NULL,
          amount NUMERIC(14, 6) NOT NULL CHECK (amount > 0),
          tx_signature VARCHAR(88) NOT NULL UNIQUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;
      this.schemaInitialized = true;
    } catch (err) {
      console.error('[NeonAdapter] Error al inicializar esquema:', err);
    }
  }

  async upsertUser(walletAddress: string): Promise<User> {
    await this.ensureSchema();
    const rows = (await this.sql`
      INSERT INTO users (wallet_address)
      VALUES (${walletAddress})
      ON CONFLICT (wallet_address) DO UPDATE SET wallet_address = EXCLUDED.wallet_address
      RETURNING id, wallet_address, created_at;
    `) as any[];
    const r = rows[0];
    return { id: r.id, wallet_address: r.wallet_address, created_at: new Date(r.created_at).toISOString() };
  }

  async getUserByWallet(walletAddress: string): Promise<User | null> {
    await this.ensureSchema();
    const rows = (await this.sql`
      SELECT id, wallet_address, created_at FROM users WHERE wallet_address = ${walletAddress} LIMIT 1;
    `) as any[];
    if (!rows.length) return null;
    const r = rows[0];
    return { id: r.id, wallet_address: r.wallet_address, created_at: new Date(r.created_at).toISOString() };
  }

  async createPaymentLink(params: { userId: string; amount: number; description: string; slug: string }): Promise<PaymentLink> {
    await this.ensureSchema();
    const rows = (await this.sql`
      INSERT INTO payment_links (user_id, slug, amount, description)
      VALUES (${params.userId}, ${params.slug}, ${params.amount}, ${params.description})
      RETURNING id, user_id, slug, amount, description, created_at;
    `) as any[];
    const r = rows[0];
    return {
      id: r.id,
      user_id: r.user_id,
      slug: r.slug,
      amount: Number(r.amount),
      description: r.description,
      created_at: new Date(r.created_at).toISOString(),
    };
  }

  async getPaymentLinkBySlug(slug: string): Promise<(PaymentLink & { user_wallet_address: string }) | null> {
    await this.ensureSchema();
    const rows = (await this.sql`
      SELECT pl.id, pl.user_id, pl.slug, pl.amount, pl.description, pl.created_at, u.wallet_address as user_wallet_address
      FROM payment_links pl
      JOIN users u ON u.id = pl.user_id
      WHERE pl.slug = ${slug}
      LIMIT 1;
    `) as any[];
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: r.id,
      user_id: r.user_id,
      slug: r.slug,
      amount: Number(r.amount),
      description: r.description,
      created_at: new Date(r.created_at).toISOString(),
      user_wallet_address: r.user_wallet_address,
    };
  }

  async getPaymentByTxSignature(txSignature: string): Promise<Payment | null> {
    await this.ensureSchema();
    const rows = (await this.sql`
      SELECT id, payment_link_id, from_wallet, amount, tx_signature, created_at
      FROM payments WHERE tx_signature = ${txSignature} LIMIT 1;
    `) as any[];
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: r.id,
      payment_link_id: r.payment_link_id,
      from_wallet: r.from_wallet,
      amount: Number(r.amount),
      tx_signature: r.tx_signature,
      created_at: new Date(r.created_at).toISOString(),
    };
  }

  async recordPayment(params: { paymentLinkId: string; fromWallet: string; amount: number; txSignature: string }): Promise<Payment> {
    await this.ensureSchema();
    try {
      const rows = (await this.sql`
        INSERT INTO payments (payment_link_id, from_wallet, amount, tx_signature)
        VALUES (${params.paymentLinkId}, ${params.fromWallet}, ${params.amount}, ${params.txSignature})
        RETURNING id, payment_link_id, from_wallet, amount, tx_signature, created_at;
      `) as any[];
      const r = rows[0];
      return {
        id: r.id,
        payment_link_id: r.payment_link_id,
        from_wallet: r.from_wallet,
        amount: Number(r.amount),
        tx_signature: r.tx_signature,
        created_at: new Date(r.created_at).toISOString(),
      };
    } catch (err: any) {
      if (err?.code === '23505' || err?.message?.includes('unique') || err?.message?.includes('UNIQUE')) {
        throw new Error('TX_SIGNATURE_EXISTS: La firma de la transacción ya ha sido procesada.');
      }
      throw err;
    }
  }

  async getUserDashboardData(userId: string): Promise<{ links: PaymentLink[]; payments: Payment[]; totalCollected: number }> {
    await this.ensureSchema();
    const linksRows = (await this.sql`
      SELECT id, user_id, slug, amount, description, created_at
      FROM payment_links
      WHERE user_id = ${userId}
      ORDER BY created_at DESC;
    `) as any[];
    const links: PaymentLink[] = linksRows.map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      slug: r.slug,
      amount: Number(r.amount),
      description: r.description,
      created_at: new Date(r.created_at).toISOString(),
    }));

    const paymentsRows = (await this.sql`
      SELECT p.id, p.payment_link_id, p.from_wallet, p.amount, p.tx_signature, p.created_at, pl.description, pl.user_id
      FROM payments p
      JOIN payment_links pl ON pl.id = p.payment_link_id
      WHERE pl.user_id = ${userId}
      ORDER BY p.created_at DESC;
    `) as any[];
    const payments: Payment[] = paymentsRows.map((r: any) => ({
      id: r.id,
      payment_link_id: r.payment_link_id,
      from_wallet: r.from_wallet,
      amount: Number(r.amount),
      tx_signature: r.tx_signature,
      created_at: new Date(r.created_at).toISOString(),
      payment_links: {
        description: r.description,
        user_id: r.user_id,
      },
    }));

    const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0);

    return { links, payments, totalCollected };
  }
}

// Adaptador diferido (Lazy Loading) para permitir next build estático y validar credenciales en runtime
class LazyDatabaseAdapter implements DatabaseAdapter {
  private instance: DatabaseAdapter | null = null;

  private getAdapter(): DatabaseAdapter {
    if (this.instance) return this.instance;

    const dbUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL;

    if (dbUrl) {
      this.instance = new NeonAdapter(dbUrl);
      return this.instance;
    }

    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_IN_MEMORY_DB !== 'true') {
      throw new Error(
        '[SECURITY ERROR] La variable de entorno DATABASE_URL no está configurada en producción. Se prohíbe el uso de InMemoryAdapter en entorno de producción salvo que ALLOW_IN_MEMORY_DB=true.'
      );
    }

    this.instance = new InMemoryAdapter();
    return this.instance;
  }

  async upsertUser(walletAddress: string) {
    return this.getAdapter().upsertUser(walletAddress);
  }

  async getUserByWallet(walletAddress: string) {
    return this.getAdapter().getUserByWallet(walletAddress);
  }

  async createPaymentLink(params: { userId: string; amount: number; description: string; slug: string }) {
    return this.getAdapter().createPaymentLink(params);
  }

  async getPaymentLinkBySlug(slug: string) {
    return this.getAdapter().getPaymentLinkBySlug(slug);
  }

  async getPaymentByTxSignature(txSignature: string) {
    return this.getAdapter().getPaymentByTxSignature(txSignature);
  }

  async recordPayment(params: { paymentLinkId: string; fromWallet: string; amount: number; txSignature: string }) {
    return this.getAdapter().recordPayment(params);
  }

  async getUserDashboardData(userId: string) {
    return this.getAdapter().getUserDashboardData(userId);
  }
}

export const db: DatabaseAdapter = new LazyDatabaseAdapter();


