'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { WalletButton } from '../../components/Solana/WalletButton';
import { User } from '../../lib/types';
import Link from 'next/link';

/**
 * @description Página para crear un nuevo enlace de pago con diseño Premium.
 */
export default function Crear() {
  const { publicKey } = useWallet();
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkGenerado, setLinkGenerado] = useState('');

  const generarSlug = (): string => Math.random().toString(36).substring(2, 10);

  /**
   * @description Maneja la creación del link en la base de datos.
   */
  const handleCrear = async (): Promise<void> => {
    if (!publicKey) return alert('Conectá tu wallet primero');
    if (!monto || !descripcion) return alert('Completá todos los campos');

    setLoading(true);
    const user: User | null = await fetchUser(publicKey.toBase58());

    if (!user) {
      setLoading(false);
      return alert('Usuario no encontrado. Asegúrate de haberte registrado en el Home.');
    }

    const slug = generarSlug();
    const isSuccess = await savePaymentLink(user.id, slug, monto, descripcion);

    if (isSuccess) {
      setLinkGenerado(`${window.location.origin}/pagar/${slug}`);
    } else {
      alert('Error creando el link');
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full -z-10" />

      <div className="w-full max-w-lg animate-premium">
        <div className="glass p-8 md:p-12">
          <Link href="/dashboard" className="text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest mb-6 inline-block transition-colors">
            ← Volver al Dashboard
          </Link>
          <h1 className="text-3xl font-black mb-2 pb-1 text-white tracking-tight leading-normal">Crear Link de Pago</h1>
          <p className="text-gray-400 text-sm mb-10">Generá una URL única para recibir USDC al instante.</p>

          <div className="flex flex-col gap-6">
            <div className="w-full flex justify-center">
              <WalletButton />
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <InputGroup 
                label="Monto solicitado" 
                placeholder="0.00" 
                type="number" 
                value={monto} 
                onChange={setMonto} 
                suffix="USDC"
              />

              <InputGroup 
                label="Descripción del cobro" 
                placeholder="Ej: Logo Design Services" 
                value={descripcion} 
                onChange={setDescripcion} 
              />

              <button
                onClick={handleCrear}
                disabled={loading || !publicKey}
                className="w-full cursor-pointer bg-gradient-to-r from-purple-600 to-blue-600 hover:scale-[1.02] active:scale-[0.98] text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-purple-500/20 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                {loading ? 'Procesando Protocolo...' : 'Generar Solana Link'}
              </button>
            </div>
          </div>

          {linkGenerado && <GeneratedLinkDisplay link={linkGenerado} />}
        </div>
      </div>
    </main>
  );
}

// --- Sub-componentes ---

function InputGroup({ label, placeholder, value, onChange, type = "text", suffix }: any) {
  const inputId = label.replace(/\s+/g, '-').toLowerCase();
  return (
    <div className="space-y-1.5 px-1">
      <label htmlFor={inputId} className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">
        {label}
      </label>
      <div className="relative group">
        <input
          id={inputId}
          name={inputId}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all font-medium"
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-black text-xs tracking-widest">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

async function fetchUser(walletAddress: string): Promise<User | null> {
  const { data } = await supabase.from('users').select('*').eq('wallet_address', walletAddress).single();
  return data as User | null;
}

async function savePaymentLink(userId: string, slug: string, amount: string, description: string): Promise<boolean> {
  const { error } = await supabase.from('payment_links').insert({
    user_id: userId,
    slug,
    amount: parseFloat(amount),
    description,
  });
  return !error;
}

function GeneratedLinkDisplay({ link }: { link: string }) {
  return (
    <div className="mt-8 p-6 bg-purple-500/10 border border-purple-500/20 rounded-2xl animate-premium">
      <p className="text-purple-400 text-[10px] font-black uppercase tracking-wider mb-2">¡Transacción preparada!</p>
      <p className="text-sm break-all text-white font-mono bg-black/30 p-3 rounded-lg border border-white/5 select-all">
        {link}
      </p>
      <button
        onClick={() => navigator.clipboard.writeText(link)}
        className="mt-4 w-full cursor-pointer py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs font-bold rounded-xl transition-all border border-purple-500/20"
      >
        Copiar Link al Portapapeles
      </button>
    </div>
  );
}
