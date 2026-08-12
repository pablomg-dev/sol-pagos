'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState, useRef } from 'react';
import { WalletButton } from '../../components/Solana/WalletButton';
import { PaymentLink, Payment } from '../../lib/types';
import { getAuthMessage } from '../../lib/auth';
import bs58 from 'bs58';
import Link from 'next/link';

/**
 * @description Dashboard principal del usuario autenticado por firma criptográfica.
 */
export default function Dashboard() {
  const { publicKey, signMessage } = useWallet();
  const [pagos, setPagos] = useState<Payment[]>([]);
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [totalRecibido, setTotalRecibido] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fetched = useRef(false);

  useEffect(() => {
    if (!publicKey || !signMessage || fetched.current) return;

    const loadDashboardData = async () => {
      fetched.current = true;
      setLoading(true);
      setErrorMsg('');

      try {
        const timestamp = Date.now();
        const walletAddress = publicKey.toBase58();
        const messageText = getAuthMessage(walletAddress, timestamp, 'GET_DASHBOARD');
        const messageBytes = new TextEncoder().encode(messageText);

        const signatureBytes = await signMessage(messageBytes);
        const signatureBase58 = bs58.encode(signatureBytes);

        const response = await fetch('/api/dashboard', {
          method: 'GET',
          headers: {
            'x-wallet-address': walletAddress,
            'x-signature': signatureBase58,
            'x-timestamp': timestamp.toString(),
          },
        });

        const data = await response.json();

        if (data.success) {
          setLinks(data.links || []);
          setPagos(data.payments || []);
          setTotalRecibido(data.totalCollected || 0);
        } else {
          setErrorMsg(data.error || 'Error autenticando la sesión del dashboard.');
        }
      } catch (err: any) {
        if (err?.message?.includes('User rejected')) {
          setErrorMsg('Firma requerida para acceder a tus datos privados.');
        } else {
          setErrorMsg(`Error al cargar datos: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [publicKey, signMessage]);

  return (
    <main className="min-h-screen p-6 md:p-12 overflow-x-hidden">
      <div className="max-w-4xl mx-auto animate-premium">
        <Header />

        {!publicKey && <WalletPrompt />}

        {publicKey && loading && (
          <div className="flex justify-center py-20">
            <p className="text-purple-400 animate-pulse font-medium">Autenticando firma y cargando dashboard...</p>
          </div>
        )}

        {publicKey && errorMsg && (
          <div className="glass p-8 text-center my-8 border-red-500/20">
            <p className="text-red-400 font-bold mb-4">{errorMsg}</p>
            <button
              onClick={() => {
                fetched.current = false;
                window.location.reload();
              }}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
            >
              Reintentar Firma
            </button>
          </div>
        )}

        {publicKey && !loading && !errorMsg && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 space-y-8">
              <Stats total={totalRecibido} />
              <Link href="/crear" className="block glow-hover">
                <div className="bg-linear-to-br from-purple-600 to-blue-600 p-4 rounded-2xl text-center font-bold text-white shadow-lg shadow-purple-500/20">
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

const Header = () => (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
    <div>
      <Link href="/">
        <h1 className="text-4xl font-extrabold pb-2 bg-linear-to-r from-white to-gray-500 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity leading-normal">
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

const LinkCard = ({ link }: { link: PaymentLink }) => {
  const [copiado, setCopiado] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/pagar/${link.slug}`);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const btnStyle = copiado
    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    : 'bg-white/5 hover:bg-white/10 text-white border-white/10';

  return (
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
      <button onClick={handleCopy} className={`text-xs font-bold px-4 py-2 rounded-xl border transition-all uppercase tracking-wider cursor-pointer ${btnStyle}`}>
        {copiado ? '¡Copiado! ✓' : 'Copiar Link'}
      </button>
    </div>
  );
};

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
        <p className="text-[10px] text-gray-500 font-mono mt-1 uppercase">
          Remitente: {pago.from_wallet.slice(0, 8)}...{pago.from_wallet.slice(-6)}
        </p>
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