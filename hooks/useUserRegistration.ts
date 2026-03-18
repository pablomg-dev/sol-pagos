'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../lib/types';

/**
 * @description Hook personalizado para manejar el registro/actualización de usuarios en Supabase
 * cuando detecta una conexión de wallet activa de Solana.
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

    /**
     * @description Guarda o actualiza al usuario por su dirección de wallet en la BD.
     */
    const syncUser = async (): Promise<void> => {
      const wallet: string = publicKey.toBase58();

      const { data, error: sbError } = await supabase
        .from('users')
        .upsert({ wallet_address: wallet }, { onConflict: 'wallet_address' })
        .select()
        .single();

      if (sbError) {
        console.error('Error sincronizando usuario:', sbError);
        setError(sbError.message);
      } else {
        setUser(data as User);
        setError(null);
      }
    };

    syncUser();
  }, [publicKey]);

  return { user, error };
};
