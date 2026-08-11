# 💸 Solpagos

> **Cobrá en USDC, fácil y rápido.** Generá links de pago en la red Solana y recibí pagos con tu billetera.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF?logo=solana)](https://solana.com)
[![Neon](https://img.shields.io/badge/Neon-PostgreSQL-00E599?logo=postgresql)](https://neon.tech)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css)](https://tailwindcss.com)

---

## 📖 ¿Qué es Solpagos?

**Solpagos** es una app web para crear **links de pago** y cobrar en **USDC** (stablecoin en Solana). Conectás tu billetera (por ejemplo Phantom), creás un link con monto y descripción, lo compartís y quien paga lo hace desde su wallet. Todo queda verificado on-chain y registrado en tu dashboard.

### ✨ Funcionalidades

| Funcionalidad | Descripción |
|---------------|-------------|
| 🔗 **Payment links** | Creás un link con monto (USDC) y descripción; lo copiás y lo compartís |
| 💳 **Pago con wallet** | Quien recibe el link paga con Phantom (o wallet compatible) en un solo click |
| 🛡 **Verificación Server-Side** | El servidor verifica la transacción en la blockchain de Solana antes de confirmarla |
| 📊 **Dashboard seguro** | Ves tus links creados, pagos recibidos y total cobrado con autenticación criptográfica |

### 🛠 Stack

- **Frontend:** [Next.js](https://nextjs.org) 14, React 18, Tailwind CSS
- **Blockchain:** [Solana](https://solana.com) (devnet), [@solana/web3.js](https://solana-labs.github.io/solana-web3.js/), [SPL Token](https://spl.solana.com/token) (USDC)
- **Wallet:** [Wallet Adapter](https://github.com/solana-labs/wallet-adapter) (Phantom y compatibles)
- **Backend / DB:** [Neon](https://neon.tech) (PostgreSQL Serverless) o Adaptador DB Abstraído

---

## 🚀 Empezar

### Requisitos

- **Node.js** 18 o superior  
- **Base de datos Neon / PostgreSQL** (opcional para desarrollo local con fallback in-memory)
- **Billetera** Phantom (o compatible con Wallet Adapter) en devnet

### Instalación

```bash
# Clonar e instalar dependencias
git clone https://github.com/pablomg-dev/sol-pagos.git
cd sol-pagos
npm install
```

### Variables de entorno

Creá un archivo `.env.local` en la raíz guiándote con `.env.example`:

```env
DATABASE_URL=postgres://usuario:password@ep-cool-name.us-east-2.aws.neon.tech/neondb?sslmode=require
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

### Ejecutar en desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) y conectá tu wallet.

---

## 📁 Estructura del proyecto

```
solpagos/
├── app/
│   ├── api/
│   │   ├── dashboard/    # API autenticada del dashboard
│   │   ├── links/        # API de links de pago
│   │   └── payments/     # API de verificación de transacciones
│   ├── page.tsx          # Inicio + conexión wallet
│   ├── crear/page.tsx    # Crear payment link
│   ├── pagar/[slug]/     # Página de pago por link
│   ├── dashboard/        # Links creados + pagos recibidos
│   ├── layout.tsx
│   └── providers.tsx     # Wallet + contexto
├── lib/
│   ├── auth.ts           # Verificación de firmas criptográficas ed25519
│   ├── db.ts             # Capa de abstracción de base de datos
│   └── solana-verifier.ts# Verificación on-chain en Solana
├── public/
└── package.json
```

---

## 📜 Scripts disponibles

| Comando | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo (Next.js) |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | Ejecutar ESLint |

---

*Hecho con Solana y Next.js.*
