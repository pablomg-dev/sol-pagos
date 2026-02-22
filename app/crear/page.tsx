'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function Crear() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkGenerado, setLinkGenerado] = useState('');

  const generarSlug = () => Math.random().toString(36).substring(2, 10);

  const handleCrear = async () => {
    if (!publicKey) return alert('Conectá tu wallet primero');
    if (!monto || !descripcion) return alert('Completá todos los campos');

    setLoading(true);

    // Obtener el user_id
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', publicKey.toBase58())
      .single();

    if (!user) return alert('Usuario no encontrado');

    const slug = generarSlug();

    const { error } = await supabase
      .from('payment_links')
      .insert({
        user_id: user.id,
        slug,
        amount: parseFloat(monto),
        description: descripcion,
      });

    if (error) {
      console.error(error);
      alert('Error creando el link');
    } else {
      const link = `${window.location.origin}/pagar/${slug}`;
      setLinkGenerado(link);
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white p-6">
      <h1 className="text-3xl font-bold mb-8">Crear Payment Link</h1>

      <div className="w-full max-w-md flex flex-col gap-4">
        <WalletMultiButton />

        <input
          type="number"
          placeholder="Monto en USDC"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="bg-gray-800 rounded-lg p-3 text-white outline-none"
        />

        <input
          type="text"
          placeholder="Descripción (ej: Diseño de logo)"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="bg-gray-800 rounded-lg p-3 text-white outline-none"
        />

        <button
          onClick={handleCrear}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 rounded-lg p-3 font-semibold disabled:opacity-50"
        >
          {loading ? 'Generando...' : 'Generar Link'}
        </button>

        {linkGenerado && (
          <div className="bg-gray-800 rounded-lg p-4 mt-4">
            <p className="text-green-400 text-sm mb-2">¡Link generado!</p>
            <p className="text-xs break-all">{linkGenerado}</p>
            <button
              onClick={() => navigator.clipboard.writeText(linkGenerado)}
              className="mt-3 text-purple-400 text-sm hover:underline"
            >
              Copiar link
            </button>
          </div>
        )}
      </div>
    </main>
  );
}