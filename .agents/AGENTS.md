# 🤖 Reglas del Workspace (`.agents/AGENTS.md`) - Solpagos

Este archivo contiene las directivas y reglas específicas para agentes de IA que trabajen en el workspace **Solpagos**.

> Para la documentación completa de la arquitectura y scripts del proyecto, consulta el archivo principal [AGENTS.md](file:///home/pmg/solana/sol-pagos/AGENTS.md).

## Directivas Principales

1. **Verificación Server-Side de Pagos:**
   - Todo pago debe confirmarse on-chain a través de `lib/solana-verifier.ts` en el backend (`app/api/payments`). Nunca confiar sólo en la confirmación del cliente.

2. **Autenticación Criptográfica:**
   - La autenticación se realiza mediante firmas Ed25519 con la wallet Solana usando `lib/auth.ts`.

3. **Capa de Datos:**
   - Toda interacción con la base de datos debe realizarse a través de las abstracciones en `lib/db.ts`. Preservar el soporte de fallback en memoria cuando `DATABASE_URL` no está definida.

4. **Calidad de Código y Validación:**
   - Ejecutar `npm run build` y `npm run lint` para validar cualquier cambio estructural antes de finalizar las tareas.
