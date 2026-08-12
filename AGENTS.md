# 🤖 Guía para Agentes AI (`AGENTS.md`) - Solpagos

Este documento define la arquitectura, convenciones de código, stack tecnológico y reglas de desarrollo para cualquier Agente AI (o desarrollador) que trabaje en el proyecto **Solpagos**.

---

## 📌 1. Visión General del Proyecto

**Solpagos** es una plataforma web descentralizada construida con Next.js que permite a los usuarios:
1. Conectar su wallet de Solana (ej. Phantom).
2. Generar **links de pago** personalizados para cobrar en **USDC** (stablecoin en Solana).
3. Procesar pagos on-chain de forma directa wallet-to-wallet.
4. Verificación server-side de transacciones directamente en la red de Solana.
5. Gestionar un dashboard autenticado criptográficamente mediante firmas Ed25519.

---

## 🛠 2. Stack Tecnológico

| Capa | Tecnología / Librerías principales |
|---|---|
| **Framework Web** | Next.js 14 (App Router) |
| **UI & Estilos** | React 18, Tailwind CSS v4 |
| **Blockchain** | Solana Devnet (`@solana/web3.js`, `@solana/spl-token`) |
| **Integración Wallet** | Solana Wallet Adapter (`@solana/wallet-adapter-react`, `@solana/wallet-adapter-phantom`, `@solana/wallet-adapter-react-ui`) |
| **Autenticación** | Firmas criptográficas Ed25519 (`tweetnacl`, `bs58`) |
| **Base de Datos** | Neon (PostgreSQL Serverless via `@neondatabase/serverless`) con fallback in-memory en desarrollo/ausencia de DB |
| **Lenguaje** | TypeScript 5 |

---

## 📁 3. Estructura de Directorios

```
sol-pagos/
├── app/                      # Next.js App Router (Rutas de UI y APIs)
│   ├── api/                  # API routes (Backend en Next.js)
│   │   ├── dashboard/        # Endpoints protegidos por firma para métricas/historial
│   │   ├── links/            # Creación y consulta de payment links
│   │   └── payments/         # Verificación y registro de pagos on-chain
│   ├── crear/                # Vista para crear un nuevo link de pago
│   ├── dashboard/            # Panel de control de links y pagos recibidos
│   ├── pagar/[slug]/         # Página pública de pago por link
│   ├── layout.tsx            # Root layout con providers globales
│   ├── providers.tsx         # Context providers (Solana Wallet Connection, etc.)
│   └── page.tsx              # Landing page principal
├── components/               # Componentes UI reutilizables
│   └── Solana/               # Componentes específicos de interacción wallet (ej. WalletButton)
├── hooks/                    # Custom React Hooks (ej. useUserRegistration)
├── lib/                      # Lógica central del sistema
│   ├── auth.ts               # Verificación de firmas criptográficas ed25519
│   ├── db.ts                 # Capa de abstracción de Base de Datos (Neon DB + Fallback)
│   ├── solana-verifier.ts    # Verificación server-side de transacciones en Solana
│   └── types.ts              # Interfaces y definiciones de tipos globales
├── public/                   # Archivos estáticos (imágenes, favicons)
├── .env.example              # Plantilla de variables de entorno
└── package.json              # Dependencias y scripts de ejecución
```

---

## ⚡ 4. Scripts y Comandos Principales

- **Desarrollo:** `npm run dev` (Inicia servidor Next.js local en http://localhost:3000)
- **Build de producción:** `npm run build` (Compila el proyecto y valida tipos TypeScript)
- **Linter:** `npm run lint` (Ejecuta ESLint)
- **Tests de Integración/DB:** `npx tsx lib/__tests__/run_tests.ts`

---

## 🔑 5. Variables de Entorno

Asegurarse de mantener un archivo `.env.local` basado en `.env.example`:

```env
# URL de conexión a la base de datos Neon PostgreSQL
DATABASE_URL=postgres://usuario:password@ep-cool-name.us-east-2.aws.neon.tech/neondb?sslmode=require

# RPC de Solana (Devnet o Mainnet)
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Dirección del mint de USDC (o token objetivo) en Devnet
NEXT_PUBLIC_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

---

## 🎯 6. Reglas e Instrucciones Específicas para Agentes AI

### A. Seguridad & Blockchain
1. **Verificación Server-side OBLIGATORIA:** Nunca des por completado un pago basándote únicamente en la respuesta del cliente frontend. Siempre utiliza `lib/solana-verifier.ts` en las API routes para confirmar la transacción on-chain.
2. **Autenticación basada en Wallet:** Las peticiones al dashboard y acciones de usuario no utilizan JWT ni cookies tradicionalmente; verifican mensajes firmados mediante `lib/auth.ts` con la clave pública de la wallet. Preserva y respeta esta arquitectura criptográfica.

### B. Base de Datos y Persistencia
1. **Respetar la Capa de Abstracción `lib/db.ts`:** No realices consultas SQL directas esparcidas por las páginas o API routes. Toda consulta a la BD debe ir centralizada en `lib/db.ts` o a través de sus funciones exportadas.
2. **Manejar Fallbacks de DB:** `lib/db.ts` cuenta con un fallback en memoria cuando `DATABASE_URL` no está presente. Al agregar nuevas funciones de persistencia, asegúrate de soportar tanto Neon DB como el almacenamiento fallback.

### C. Tipado e Interfaces
1. **Tipos Centralizados:** Los modelos de datos principales (`User`, `PaymentLink`, `Payment`) están definidos en [lib/types.ts](file:///home/pmg/solana/sol-pagos/lib/types.ts). Mantén o extiende estas interfaces si agregas nuevas entidades.
2. **TypeScript Estricto:** Evita el uso de `any` implícito o explícito. Mantén comprobaciones de nulos y respuestas fuertemente tipadas en las rutas de API.

### D. Desarrollo UI / UX
1. **Estética Moderna y Receptiva:** Mantén una interfaz limpia y atractiva utilizando Tailwind CSS v4.
2. **Conexión de Wallets en Cliente:** Los componentes que interactúen con `@solana/wallet-adapter-react` deben incluir la directiva `'use client';` en la parte superior.

### E. Verificación de Cambios
1. **Validación tras edición:** Tras realizar cambios significativos en el código, ejecuta siempre `npm run build` y/o `npm run lint` para confirmar que no se han introducido errores de compilación ni de tipado.
2. **No ignorar fallos:** Ante errores de linter o compilación, diagnostica la causa raíz antes de dar la tarea por finalizada.
