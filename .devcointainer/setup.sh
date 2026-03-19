#!/bin/bash
# Configuración de entorno para sol-pagos

# 1. Instalar Solana CLI (v1.18.x es estable)
sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# 2. Instalar Anchor vía AVM (Versión recomendada para 2026)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# 3. Preparar Node.js
nvm install 20
nvm use 20
npm install

# 4. Crear wallet de pruebas local
solana-keygen new --no-passphrase --force

echo "Ready for Solana WayLearn Hackathon!"