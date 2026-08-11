'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { User } from '../lib/types';

/**
 * @description Hook personalizado para manejar el estado del usuario cuando detecta una wallet activa de Solana.
 * @returns {{ user: User | null, error: string | null }} El estado del usuario y posibles errores.
 */
export const useUserRegistration = () => {
  const { publicKey } = useWallet();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setUser(null);
      setError(null);
      return;
    }

    const wallet: string = publicKey.toBase58();
    setUser({
      id: wallet,
      wallet_address: wallet,
      created_at: new Date().toISOString(),
    });
    setError(null);
  }, [publicKey]);

  return { user, error };
};
