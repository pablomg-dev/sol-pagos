'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Home() {
  const { publicKey } = useWallet();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!publicKey) return;

    const saveUser = async () => {
      const wallet = publicKey.toBase58();

      const { data, error } = await supabase
        .from('users')
        .upsert({ wallet_address: wallet }, { onConflict: 'wallet_address' })
        .select()
        .single();

      if (error) {
        console.error('Error guardando usuario:', error);
      } else {
        setUser(data);
        console.log('Usuario guardado:', data);
      }
    };

    saveUser();
  }, [publicKey]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white">
      <h1 className="text-4xl font-bold mb-2">Solpagos</h1>
      <p className="text-gray-400 mb-8">Cobrá en USDC, fácil y rápido</p>

      <WalletMultiButton />

      {user && (
        <p className="mt-6 text-green-400 text-sm">
          Bienvenido: {user.wallet_address.slice(0, 8)}...
        </p>
      )}
    </main>
  );
}