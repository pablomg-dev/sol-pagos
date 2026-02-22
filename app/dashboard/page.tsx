'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function Dashboard() {
  const { publicKey } = useWallet();
  const [pagos, setPagos] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [totalRecibido, setTotalRecibido] = useState(0);
  const [loading, setLoading] = useState(false);
  const fetched = useRef(false);

  useEffect(() => {
    if (!publicKey || fetched.current) return;
    fetched.current = true;

    const fetchData = async () => {
      setLoading(true);

      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', publicKey.toBase58())
        .single();

      if (!user) return setLoading(false);

      const { data: linksData } = await supabase
        .from('payment_links')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setLinks(linksData || []);

      const { data: pagosData } = await supabase
        .from('payments')
        .select('*, payment_links(description, user_id)')
        .order('created_at', { ascending: false });

      const misPagos = (pagosData || []).filter(
        (p: any) => p.payment_links?.user_id === user.id
      );

      setPagos(misPagos);
      setTotalRecibido(misPagos.reduce((acc: number, p: any) => acc + p.amount, 0));
      setLoading(false);
    };

    fetchData();
  }, [publicKey]);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <WalletMultiButton />
        </div>

        {!publicKey && (
          <p className="text-gray-400">Conectá tu wallet para ver tu dashboard.</p>
        )}

        {publicKey && loading && (
          <p className="text-gray-400">Cargando...</p>
        )}

        {publicKey && !loading && (
          <div>
            <div className="bg-gray-800 rounded-2xl p-6 mb-6">
              <p className="text-gray-400 text-sm mb-1">Total recibido</p>
              <p className="text-4xl font-bold text-purple-400">{totalRecibido} USDC</p>
            </div>

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Mis payment links</h2>
              <Link href="/crear" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-semibold">
                + Nuevo
              </Link>
            </div>

            {links.length === 0 && (
              <p className="text-gray-400 mb-6">No tenés links creados todavía.</p>
            )}

            {links.map((link) => (
              <div key={link.id} className="bg-gray-800 rounded-xl p-4 mb-3 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{link.description}</p>
                  <p className="text-purple-400 text-sm">{link.amount} USDC</p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(window.location.origin + '/pagar/' + link.slug)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Copiar link
                </button>
              </div>
            ))}

            <h2 className="text-xl font-semibold mt-6 mb-4">Pagos recibidos</h2>

            {pagos.length === 0 && (
              <p className="text-gray-400">No recibiste pagos todavía.</p>
            )}

            {pagos.map((pago) => (
              <div key={pago.id} className="bg-gray-800 rounded-xl p-4 mb-3 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{pago.payment_links?.description}</p>
                  <p className="text-xs text-gray-400 font-mono">{pago.from_wallet.slice(0, 12)}...</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-semibold">{pago.amount} USDC</p>
                  <a href={"https://explorer.solana.com/tx/" + pago.tx_signature + "?cluster=devnet"} target="_blank" rel="noreferrer" className="text-xs text-purple-400 hover:underline">Ver TX</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}