#!/bin/bash

# Build script for Vercel deployment
# This script builds the Rust WASM backend and then the React frontend

echo "🦀 Building Rust WASM backend..."

# Navigate to rust backend directory
cd rust_backend

# Install wasm-pack if not available
if ! command -v wasm-pack &> /dev/null; then
    echo "Installing wasm-pack..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

# Add wasm32 target if not available
rustup target add wasm32-unknown-unknown

# Build the WASM package
wasm-pack build --target web --out-dir pkg

echo "✅ WASM build complete"

# Navigate to client directory
cd ../client

echo "⚛️ Building React application..."

# Install dependencies
npm ci

# Build the React app
npm run build

echo "✅ React build complete"
echo "🚀 Ready for deployment!"
