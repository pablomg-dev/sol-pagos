'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { use, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';

const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

export default function PagarPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const { publicKey, sendTransaction } = useWallet();
    const { connection } = useConnection();
    const [link, setLink] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [pagando, setPagando] = useState(false);
    const [pagado, setPagado] = useState(false);
    const [txSignature, setTxSignature] = useState('');

    useEffect(() => {
        const fetchLink = async () => {
            const { data, error } = await supabase
                .from('payment_links')
                .select('*, users(wallet_address)')
                .eq('slug', slug)
                .single();

            if (error || !data) {
                setLink(null);
            } else {
                setLink(data);
            }
            setLoading(false);
        };

        fetchLink();
    }, [slug]);

    const handlePagar = async () => {
        if (!publicKey) return alert('Conectá tu wallet primero');
        setPagando(true);

        try {
            const destinatario = new PublicKey(link.users.wallet_address);
            const monto = link.amount * 1_000_000;

            const fromTokenAccount = await getAssociatedTokenAddress(USDC_MINT, publicKey);
            const toTokenAccount = await getAssociatedTokenAddress(USDC_MINT, destinatario);

            const transaction = new Transaction().add(
                createTransferInstruction(
                    fromTokenAccount,
                    toTokenAccount,
                    publicKey,
                    monto
                )
            );

            const signature = await sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, 'confirmed');

            await supabase.from('payments').insert({
                payment_link_id: link.id,
                from_wallet: publicKey.toBase58(),
                amount: link.amount,
                tx_signature: signature,
            });

            setTxSignature(signature);
            setPagado(true);
        } catch (error: any) {
            console.error(error);
            alert('Error al procesar el pago: ' + error.message);
        }

        setPagando(false);
    };

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
                <p>Cargando...</p>
            </main>
        );
    }

    if (!link) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
                <p>Link no encontrado</p>
            </main>
        );
    }

    const explorerUrl = "https://explorer.solana.com/tx/" + txSignature + "?cluster=devnet";

    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white p-6">
            <div className="w-full max-w-md bg-gray-800 rounded-2xl p-8 flex flex-col gap-6">
                <div>
                    <p className="text-gray-400 text-sm mb-1">Descripción</p>
                    <p className="text-xl font-semibold">{link.description}</p>
                </div>
                <div>
                    <p className="text-gray-400 text-sm mb-1">Monto</p>
                    <p className="text-4xl font-bold text-purple-400">{link.amount} USDC</p>
                </div>
                <div>
                    <p className="text-gray-400 text-sm mb-1">Para</p>
                    <p className="text-sm font-mono">{link.users.wallet_address.slice(0, 12)}...</p>
                </div>

                <WalletMultiButton />

                {publicKey && !pagado && (
                    <button
                        onClick={handlePagar}
                        disabled={pagando}
                        className="bg-purple-600 hover:bg-purple-700 rounded-lg p-3 font-semibold disabled:opacity-50"
                    >
                        {pagando ? 'Procesando...' : 'Pagar ' + link.amount + ' USDC'}
                    </button>
                )}

                {pagado && <p className="text-green-400 text-center font-semibold">Pago enviado! TX: {txSignature.slice(0, 8)}...</p>}

            </div>
        </main>
    );
}