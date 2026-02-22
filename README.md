# Solpagos

App Next.js para cobrar en **USDC** con billetera Solana (Phantom) y persistencia en Supabase.

## Requisitos

- Node.js 18+
- Cuenta Supabase (tabla `users` con `wallet_address`)
- Billetera Phantom (o compatible)

## Uso

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Estructura

| Carpeta  | Contenido                          |
|----------|------------------------------------|
| `app/`   | Páginas (home, crear, pagar/[slug]) |
| `lib/`   | Cliente Supabase, helpers          |
| `public/`| Assets estáticos                   |

## Scripts

- `npm run dev` — Desarrollo
- `npm run build` — Build
- `npm run start` — Producción
- `npm run lint` — ESLint
