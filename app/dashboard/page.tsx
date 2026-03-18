'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { WalletButton } from '../../components/Solana/WalletButton';
import { User, PaymentLink, Payment } from '../../lib/types';
import Link from 'next/link';

/**
 * @description Dashboard principal del usuario con diseño Premium.
 */
export default function Dashboard() {
  const { publicKey } = useWallet();
  const [pagos, setPagos] = useState<Payment[]>([]);
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [totalRecibido, setTotalRecibido] = useState(0);
  const [loading, setLoading] = useState(false);
  const fetched = useRef(false);

  useEffect(() => {
    if (!publicKey || fetched.current) return;
    fetched.current = true;

    const loadData = async () => {
      setLoading(true);
      const user = await fetchUser(publicKey.toBase58());
      if (user) await fetchDashboardData(user.id);
      setLoading(false);
    };

    const fetchDashboardData = async (userId: string) => {
      const linksData = await fetchUserLinks(userId);
      const pagosData = await fetchUserPayments(userId);
      setLinks(linksData);
      setPagos(pagosData);
      setTotalRecibido(pagosData.reduce((acc, p) => acc + p.amount, 0));
    };

    loadData();
  }, [publicKey]);

  return (
    <main className="min-h-screen p-6 md:p-12 overflow-x-hidden">
      <div className="max-w-4xl mx-auto animate-premium">
        <Header />
        
        {!publicKey && <WalletPrompt />}
        
        {publicKey && loading && (
          <div className="flex justify-center py-20">
            <p className="text-purple-400 animate-pulse font-medium">Cargando datos del protocolo...</p>
          </div>
        )}

        {publicKey && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 space-y-8">
              <Stats total={totalRecibido} />
              <Link href="/crear" className="block glow-hover">
                <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-4 rounded-2xl text-center font-bold text-white shadow-lg shadow-purple-500/20">
                  + Crear Nuevo Link
                </div>
              </Link>
            </div>

            <div className="md:col-span-2 space-y-10">
              <LinksSection links={links} />
              <PaymentsSection pagos={pagos} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// --- Sub-componentes con Estilo Premium ---

const Header = () => (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
    <div>
      <Link href="/">
        <h1 className="text-4xl font-extrabold pb-2 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity leading-normal">
          Mi Dashboard
        </h1>
      </Link>
      <p className="text-gray-500 mt-1">Gestiona tus cobros en la red Solana</p>
    </div>
    <div>
      <WalletButton />
    </div>
  </div>
);

const WalletPrompt = () => (
  <div className="glass p-20 text-center mt-10">
    <p className="text-gray-400 text-lg">Conectá tu wallet para acceder a tus finanzas descentralizadas.</p>
  </div>
);

const Stats = ({ total }: { total: number }) => (
  <div className="glass p-8 border-l-4 border-l-purple-500">
    <p className="text-gray-400 text-xs uppercase tracking-widest mb-2 font-semibold">Total recibido</p>
    <div className="flex items-baseline gap-2">
      <span className="text-5xl font-black text-white">{total}</span>
      <span className="text-purple-400 font-bold uppercase">USDC</span>
    </div>
  </div>
);

const LinksSection = ({ links }: { links: PaymentLink[] }) => (
  <section>
    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
      <span className="w-2 h-2 bg-blue-500 rounded-full" /> Mis links de pago
    </h2>
    <div className="space-y-4">
      {links.length === 0 && <p className="text-gray-500 italic">No hay links activos.</p>}
      {links.map((link) => (
        <LinkCard key={link.id} link={link} />
      ))}
    </div>
  </section>
);

const LinkCard = ({ link }: { link: PaymentLink }) => (
  <div className="glass p-5 flex justify-between items-center group glow-hover">
    <div>
      <p className="font-bold text-white text-lg group-hover:text-purple-300 transition-colors uppercase tracking-tight">
        {link.description}
      </p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-purple-400 text-sm font-bold">{link.amount} USDC</span>
        <span className="text-gray-600 text-xs">•</span>
        <span className="text-gray-500 text-xs font-mono">/{link.slug}</span>
      </div>
    </div>
    <button
      onClick={() => navigator.clipboard.writeText(`${window.location.origin}/pagar/${link.slug}`)}
      className="bg-white/5 hover:bg-white/10 text-white text-xs font-bold px-4 py-2 rounded-xl border border-white/10 transition-all uppercase tracking-wider"
    >
      Copiar Link
    </button>
  </div>
);

const PaymentsSection = ({ pagos }: { pagos: Payment[] }) => (
  <section>
    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
      <span className="w-2 h-2 bg-green-500 rounded-full" /> Historial de ingresos
    </h2>
    <div className="space-y-3">
      {pagos.length === 0 && <p className="text-gray-500 italic">Esperando tu primer pago...</p>}
      {pagos.map((pago) => (
        <PaymentCard key={pago.id} pago={pago} />
      ))}
    </div>
  </section>
);

const PaymentCard = ({ pago }: { pago: Payment }) => (
  <div className="glass p-4 md:px-6 flex justify-between items-center bg-green-500/5">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 text-xl font-bold">
        $
      </div>
      <div>
        <p className="font-bold text-white leading-tight">{pago.payment_links?.description}</p>
        <p className="text-[10px] text-gray-500 font-mono mt-1 uppercase">Remitente: {pago.from_wallet.slice(0, 10)}...</p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-green-400 font-black text-lg">+{pago.amount} USDC</p>
      <a
        href={`https://explorer.solana.com/tx/${pago.tx_signature}?cluster=devnet`}
        target="_blank"
        rel="noreferrer"
        className="text-[10px] text-purple-400 hover:text-white uppercase font-bold tracking-widest transition-colors"
      >
        Ver en Blockchain
      </a>
    </div>
  </div>
);

// --- Fetchers adaptados ---

async function fetchUser(wallet: string): Promise<User | null> {
  const { data } = await supabase.from('users').select('*').eq('wallet_address', wallet).single();
  return data as User | null;
}

async function fetchUserLinks(userId: string): Promise<PaymentLink[]> {
  const { data } = await supabase.from('payment_links').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  return data as PaymentLink[] || [];
}

async function fetchUserPayments(userId: string): Promise<Payment[]> {
  const { data } = await supabase.from('payments').select('*, payment_links(description, user_id)').order('created_at', { ascending: false });
  return (data as any[] || []).filter((p) => p.payment_links?.user_id === userId) as Payment[];
}