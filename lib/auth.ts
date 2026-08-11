import nacl from 'tweetnacl';
import bs58 from 'bs58';

export interface AuthVerificationResult {
  valid: boolean;
  error?: string;
  walletAddress?: string;
}

// Caché en memoria para evitar el reuso de firmas (Single-use Signature Nonce Cache)
const usedSignatures = new Set<string>();

// Limpieza periódica de firmas expiraradas cada 10 minutos
setInterval(() => {
  usedSignatures.clear();
}, 10 * 60 * 1000);

/**
 * @description Genera el mensaje estándar que el usuario debe firmar en su wallet, vinculado a una acción específica.
 */
export function getAuthMessage(walletAddress: string, timestamp: number, action: string = 'AUTHENTICATE'): string {
  return `Solpagos Auth [${action}]: ${walletAddress} at ${timestamp}`;
}

/**
 * @description Verifica de forma criptográfica si una firma corresponde a la wallet e impide el reuso de firmas.
 * @param walletAddress Dirección pública en formato base58.
 * @param signatureBase58 Firma devuelta por wallet.signMessage() en formato base58.
 * @param timestampStr Timestamp unix en milisegundos cuando se generó el mensaje.
 * @param action Acción específica que se está autorizando (ej: 'CREATE_LINK', 'GET_DASHBOARD').
 * @param maxAgeMs Tiempo máximo de validez del mensaje en ms (por defecto 5 minutos).
 */
export function verifyWalletSignature(
  walletAddress: string,
  signatureBase58: string,
  timestampStr: string,
  action: string = 'AUTHENTICATE',
  maxAgeMs: number = 5 * 60 * 1000
): AuthVerificationResult {
  if (!walletAddress || !signatureBase58 || !timestampStr) {
    return { valid: false, error: 'Faltan parámetros requeridos de autenticación (wallet, firma o timestamp).' };
  }

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return { valid: false, error: 'Timestamp inválido.' };
  }

  // 1. Verificar expiración del timestamp
  const now = Date.now();
  if (Math.abs(now - timestamp) > maxAgeMs) {
    return { valid: false, error: 'La firma ha expirado (validez máxima de 5 minutos).' };
  }

  // 2. Prevención de Replay Attack de Firmas (Single-Use Check)
  const signatureKey = `${walletAddress}:${signatureBase58}`;
  if (usedSignatures.has(signatureKey)) {
    return { valid: false, error: 'REPLAY_ATTACK: Esta firma de autenticación ya fue utilizada anteriormente.' };
  }

  try {
    // 3. Reconstruir mensaje exacto con la acción vinculada
    const messageText = getAuthMessage(walletAddress, timestamp, action);
    const messageBytes = new TextEncoder().encode(messageText);

    // 4. Decodificar firma y clave pública
    const signatureBytes = bs58.decode(signatureBase58);
    const publicKeyBytes = bs58.decode(walletAddress);

    // 5. Verificación ed25519 con tweetnacl
    const isVerified = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

    if (!isVerified) {
      return { valid: false, error: 'Firma criptográfica inválida. La clave no coincide con el mensaje.' };
    }

    // Marcar la firma como utilizada
    usedSignatures.add(signatureKey);

    return { valid: true, walletAddress };
  } catch (err: any) {
    return { valid: false, error: `Error durante la verificación criptográfica: ${err.message}` };
  }
}
