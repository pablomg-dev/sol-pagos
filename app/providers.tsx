"use client";

import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { WalletError } from "@solana/wallet-adapter-base";
import { useCallback } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";

/**
 * @description Proveedor de contexto global para Solana y Wallet.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  const endpoint = clusterApiUrl("devnet");

  // Silenciamos o manejamos errores de la wallet de forma controlada
  const onError = useCallback((error: WalletError) => {
    // Si el usuario simplemente canceló, no lo mostramos como error crítico
    if (error.name === "WalletConnectionError") {
      console.warn("[Solana] Conexión cancelada por el usuario.");
      return;
    }
    console.error("[Solana Wallet Error]:", error.name, error.message);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect={true} onError={onError}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
