'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';
import { WalletButton } from '../../../components/Solana/WalletButton';
import { PaymentLink } from '../../../lib/types';

const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

/**
 * @description Página de pago para un link específico con diseño Premium.
 */
export default function PagarPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagando, setPagando] = useState(false);
  const [pagado, setPagado] = useState(false);
  const [txSignature, setTxSignature] = useState('');

  useEffect(() => {
    const fetchLink = async () => {
      const { data } = await supabase.from('payment_links').select('*, users(wallet_address)').eq('slug', slug).single();
      setLink(data as PaymentLink);
      setLoading(false);
    };
    fetchLink();
  }, [slug]);

  const handlePagar = async () => {
    if (!publicKey || !link) return alert('Conectá tu wallet primero');
    setPagando(true);
    try {
      const signature = await executePayment(publicKey, link, connection, sendTransaction);
      await registerPayment(link.id, publicKey.toBase58(), link.amount, signature);
      setTxSignature(signature);
      setPagado(true);
    } catch (error: any) {
      alert('Error al procesar el pago: ' + error.message);
    } finally {
      setPagando(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!link) return <NotFoundScreen />;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 blur-[150px] rounded-full -z-10" />
      
      <div className="w-full max-w-lg animate-premium">
        <PaymentCard
          link={link}
          pagando={pagando}
          pagado={pagado}
          txSignature={txSignature}
          publicKey={publicKey}
          onPay={handlePagar}
        />
      </div>
    </main>
  );
}

// --- Sub-componentes Premium ---

const LoadingScreen = () => (
  <main className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
      <p className="text-gray-400 font-medium tracking-widest uppercase text-xs">Sincronizando con Solana...</p>
    </div>
  </main>
);

const NotFoundScreen = () => (
  <main className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
    <div className="glass p-10 text-center">
      <p className="text-red-400 font-bold mb-2 uppercase tracking-widest">Protocolo Interrumpido</p>
      <p className="text-gray-400 text-sm">Este link de pago no existe o ha sido desactivado.</p>
    </div>
  </main>
);

interface PaymentCardProps {
  link: PaymentLink;
  pagando: boolean;
  pagado: boolean;
  txSignature: string;
  publicKey: PublicKey | null;
  onPay: () => Promise<void>;
}

const PaymentCard = ({ link, pagando, pagado, txSignature, publicKey, onPay }: PaymentCardProps) => (
  <div className="glass p-10 flex flex-col gap-8 border-t-white/10">
    <div className="text-center">
      <p className="text-purple-400 text-[10px] font-black uppercase tracking-widest mb-2">Solicitud de Pago</p>
      <h2 className="text-3xl font-black pb-2 text-white leading-normal uppercase tracking-tighter">
        {link.description}
      </h2>
    </div>

    <div className="bg-white/5 rounded-3xl p-8 border border-white/5 flex flex-col items-center">
      <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Total a enviar</p>
      <div className="flex items-baseline gap-2">
        <span className="text-6xl font-black text-white leading-none tracking-tighter">{link.amount}</span>
        <span className="text-purple-400 font-black text-xl">USDC</span>
      </div>
    </div>

    <div className="space-y-6">
      <div className="flex justify-between items-center px-2">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Destinatario</span>
        <span className="text-xs font-mono text-gray-300">{link.users?.wallet_address.slice(0, 14)}...</span>
      </div>

      <div className="flex justify-center">
        <WalletButton />
      </div>

      {publicKey && !pagado && (
        <button
          onClick={onPay}
          disabled={pagando}
          className="w-full cursor-pointer disabled:cursor-not-allowed bg-gradient-to-r from-purple-600 to-blue-600 text-white py-5 rounded-3xl font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-purple-500/30 disabled:opacity-30 uppercase tracking-tight"
        >
          {pagando ? 'Procesando Transacción...' : `Pagar ${link.amount} USDC`}
        </button>
      )}

      {pagado && <SuccessMessage signature={txSignature} />}
    </div>
  </div>
);

const SuccessMessage = ({ signature }: { signature: string }) => (
  <div className="bg-green-500/10 border border-green-500/20 rounded-3xl p-6 text-center animate-premium">
    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-400 text-2xl">
      ✓
    </div>
    <p className="text-green-400 font-black mb-2 uppercase tracking-tight">¡Pago confirmado!</p>
    <p className="text-[10px] text-gray-500 mb-4 uppercase font-bold tracking-widest">Transmitido a la Mainnet/Devnet</p>
    <a
      href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
      target="_blank"
      rel="noreferrer"
      className="inline-block text-xs font-bold text-purple-400 hover:text-white border-b border-purple-400/30 transition-all uppercase tracking-widest"
    >
      Ver en Blockchain
    </a>
  </div>
);

// --- Lógica de Negocio ---

async function executePayment(publicKey: PublicKey, link: PaymentLink, connection: any, sendTransaction: any): Promise<string> {
  const destinatario = new PublicKey(link.users!.wallet_address);
  const monto = link.amount * 1_000_000;
  const fromTokenAccount = await getAssociatedTokenAddress(USDC_MINT, publicKey);
  const toTokenAccount = await getAssociatedTokenAddress(USDC_MINT, destinatario);
  const transaction = new Transaction().add(createTransferInstruction(fromTokenAccount, toTokenAccount, publicKey, monto));
  const signature = await sendTransaction(transaction, connection);
  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}

async function registerPayment(linkId: string, fromWallet: string, amount: number, signature: string) {
  await supabase.from('payments').insert({ payment_link_id: linkId, from_wallet: fromWallet, amount: amount, tx_signature: signature });
}