# 💸 Solpagos

> **Cobrá en USDC, fácil y rápido.** Generá links de pago en la red Solana y recibí pagos con tu billetera.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF?logo=solana)](https://solana.com)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css)](https://tailwindcss.com)

---

## 📖 ¿Qué es Solpagos?

**Solpagos** es una app web para crear **links de pago** y cobrar en **USDC** (stablecoin en Solana). Conectás tu billetera (por ejemplo Phantom), creás un link con monto y descripción, lo compartís y quien paga lo hace desde su wallet. Todo queda registrado en tu dashboard.

### ✨ Funcionalidades

| Funcionalidad | Descripción |
|---------------|-------------|
| 🔗 **Payment links** | Creás un link con monto (USDC) y descripción; lo copiás y lo compartís |
| 💳 **Pago con wallet** | Quien recibe el link paga con Phantom (o wallet compatible) en un solo click |
| 📊 **Dashboard** | Ves tus links creados, pagos recibidos y total cobrado |
| 👤 **Usuarios por wallet** | Se identifica por dirección de Solana; los datos se guardan en Supabase |

### 🛠 Stack

- **Frontend:** [Next.js](https://nextjs.org) 16, React 19, Tailwind CSS
- **Blockchain:** [Solana](https://solana.com) (devnet), [@solana/web3.js](https://solana-labs.github.io/solana-web3.js/), [SPL Token](https://spl.solana.com/token) (USDC)
- **Wallet:** [Wallet Adapter](https://github.com/solana-labs/wallet-adapter) (Phantom y compatibles)
- **Backend / DB:** [Supabase](https://supabase.com) (PostgreSQL + API)

---

## 🚀 Empezar

### Requisitos

- **Node.js** 18 o superior  
- **Cuenta en Supabase** con tablas: `users`, `payment_links`, `payments`  
- **Billetera** Phantom (o compatible con Wallet Adapter) en devnet

### Instalación

```bash
# Clonar e instalar dependencias
git clone https://github.com/pablomg-dev/sol-pagos.git
cd sol-pagos
npm install
```

### Variables de entorno

Creá un archivo `.env.local` en la raíz con:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
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
│   ├── page.tsx          # Inicio + conexión wallet
│   ├── crear/page.tsx    # Crear payment link
│   ├── pagar/[slug]/     # Página de pago por link
│   ├── dashboard/       # Links creados + pagos recibidos
│   ├── layout.tsx
│   └── providers.tsx     # Wallet + contexto
├── lib/
│   └── supabase.ts       # Cliente Supabase
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

## 🔗 Enlaces

- [Solana (devnet)](https://explorer.solana.com/?cluster=devnet)
- [Supabase](https://supabase.com/docs)
- [Next.js](https://nextjs.org/docs)

---

*Hecho con Solana y Next.js.*
