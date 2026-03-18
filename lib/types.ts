/**
 * @file types.ts
 * @description Definiciones de tipos e interfaces para el proyecto Solpagos.
 */

export interface User {
  id: string;
  wallet_address: string;
  created_at: string;
}

export interface PaymentLink {
  id: string;
  user_id: string;
  slug: string;
  amount: number;
  description: string;
  created_at: string;
  users?: {
    wallet_address: string;
  };
}

export interface Payment {
  id: string;
  payment_link_id: string;
  from_wallet: string;
  amount: number;
  tx_signature: string;
  created_at: string;
  payment_links?: {
    description: string;
    user_id: string;
  };
}
