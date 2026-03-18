'use client';

import dynamic from 'next/dynamic';
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * @description Importación dinámica del WalletMultiButton para evitar errores de hidratación
 * al asegurar que solo se renderiza en el lado del cliente (browser).
 */
const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

/**
 * @description Componente envoltorio para el WalletMultiButton de Solana.
 * @returns {JSX.Element} El botón de conexión de wallet configurado para CSR.
 */
export const WalletButton = (): JSX.Element => {
  return (
    <div className="wallet-button-container">
      <WalletMultiButtonDynamic />
    </div>
  );
};

export default WalletButton;
