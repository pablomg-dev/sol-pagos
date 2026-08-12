'use client';

import { useUserRegistration } from '../hooks/useUserRegistration';
import { WalletButton } from '../components/Solana/WalletButton';
import { User } from '../lib/types';
import Link from 'next/link';

/**
 * @description Página de inicio de Solpagos con diseño Premium.
 */
export default function Home() {
  const { user, error } = useUserRegistration();

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />

      <div className="z-10 w-full max-w-lg animate-premium">
        <div className="glass p-10 flex flex-col items-center text-center">
          <h1 className="text-5xl font-extrabold mb-4 pb-2 bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent leading-normal">
            Solpagos
          </h1>
          <p className="text-gray-400 text-lg mb-10 max-w-70">
            Cobrá en USDC en la red de Solana, <span className="text-white font-medium">fácil y rápido.</span>
          </p>

          <div className="w-full flex justify-center">
            <WalletButton />
          </div>

          <UserFeedback user={user} error={error} />
        </div>
        
        <p className="mt-8 text-center text-gray-500 text-xs tracking-widest uppercase">
          Powered by Solana & Neon
        </p>
      </div>
    </main>
  );
}

/**
 * @description Sub-componente para mensajes dinámicos de bienvenida o error.
 */
function UserFeedback({ user, error }: { user: User | null; error: string | null }) {
  if (error) return <p className="mt-6 text-red-400 text-sm font-medium animate-pulse pb-1">Error: {error}</p>;
  if (!user) return null;

  return (
    <div className="mt-8 pt-8 border-t border-white/5 w-full flex flex-col items-center animate-premium">
      <p className="text-green-400 text-sm font-medium mb-6">
        Wallet conectada: <span className="text-white font-mono">{user.wallet_address.slice(0, 4)}...{user.wallet_address.slice(-4)}</span>
      </p>

      <Link href="/dashboard" className="w-full">
        <button className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-bold border border-white/10 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
          Ir a mi Dashboard →
        </button>
      </Link>
    </div>
  );
}