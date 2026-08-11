'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';
import { WalletButton } from '../../../components/Solana/WalletButton';
import { PaymentLink } from '../../../lib/types';

const USDC_MINT = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

/**
 * @description Página de pago para un link específico con verificación de transacciones on-chain.
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
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchLink = async () => {
      try {
        const res = await fetch(`/api/links?slug=${slug}`);
        const data = await res.json();
        if (data.success && data.link) {
          setLink(data.link);
        } else {
          setLink(null);
        }
      } catch (err) {
        console.error('Error fetching link:', err);
        setLink(null);
      } finally {
        setLoading(false);
      }
    };
    fetchLink();
  }, [slug]);

  const handlePagar = async () => {
    if (!publicKey || !link) return alert('Conectá tu wallet primero');
    setPagando(true);
    setErrorMessage('');

    try {
      // 1. Ejecutar la transferencia SPL Token en la blockchain de Solana
      const signature = await executePaymentOnChain(publicKey, link, connection, sendTransaction);

      // 2. Solicitar al SERVIDOR la verificación on-chain del pago antes de darlo por válido
      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: link.slug,
          fromWallet: publicKey.toBase58(),
          txSignature: signature,
        }),
      });

      const verifyData = await response.json();

      if (verifyData.success) {
        setTxSignature(signature);
        setPagado(true);
      } else {
        const errorMsg = verifyData.error || 'No se pudo verificar el pago en el servidor.';
        setErrorMessage(errorMsg);
        alert(`Verificación Fallida: ${errorMsg}`);
      }
    } catch (error: any) {
      const msg = error.message || 'Error al procesar la transacción.';
      setErrorMessage(msg);
      alert('Error procesando el pago: ' + msg);
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
          errorMessage={errorMessage}
          onPay={handlePagar}
        />
      </div>
    </main>
  );
}

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
  errorMessage: string;
  onPay: () => Promise<void>;
}

const PaymentCard = ({ link, pagando, pagado, txSignature, publicKey, errorMessage, onPay }: PaymentCardProps) => (
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
        <span className="text-xs font-mono text-gray-300">
          {link.users?.wallet_address ? `${link.users.wallet_address.slice(0, 8)}...${link.users.wallet_address.slice(-6)}` : 'Desconocido'}
        </span>
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
          {pagando ? 'Verificando On-Chain...' : `Pagar ${link.amount} USDC`}
        </button>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs text-center">
          {errorMessage}
        </div>
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
    <p className="text-green-400 font-black mb-2 uppercase tracking-tight">¡Pago Verificado On-Chain!</p>
    <p className="text-[10px] text-gray-500 mb-4 uppercase font-bold tracking-widest">Confirmado en Solana Devnet</p>
    <a
      href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
      target="_blank"
      rel="noreferrer"
      className="inline-block text-xs font-bold text-purple-400 hover:text-white border-b border-purple-400/30 transition-all uppercase tracking-widest"
    >
      Ver en Explorer
    </a>
  </div>
);

async function executePaymentOnChain(
  publicKey: PublicKey,
  link: PaymentLink,
  connection: any,
  sendTransaction: any
): Promise<string> {
  const recipientAddress = link.users?.wallet_address;
  if (!recipientAddress) throw new Error('No se pudo determinar la wallet del destinatario.');

  const destinatario = new PublicKey(recipientAddress);
  const monto = Math.round(link.amount * 1_000_000); // 6 decimales USDC

  const fromTokenAccount = await getAssociatedTokenAddress(USDC_MINT, publicKey);
  const toTokenAccount = await getAssociatedTokenAddress(USDC_MINT, destinatario);

  const transaction = new Transaction().add(
    createTransferInstruction(fromTokenAccount, toTokenAccount, publicKey, monto)
  );

  const signature = await sendTransaction(transaction, connection);
  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}