# Build script for Vercel deployment (PowerShell)
# This script builds the Rust WASM backend and then the React frontend

Write-Host "🦀 Building Rust WASM backend..." -ForegroundColor Green

# Navigate to rust backend directory
Set-Location rust_backend

# Add wasm32 target if not available
rustup target add wasm32-unknown-unknown

# Build the WASM package
wasm-pack build --target web --out-dir pkg

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ WASM build complete" -ForegroundColor Green
} else {
    Write-Host "❌ WASM build failed" -ForegroundColor Red
    exit 1
}

# Navigate to client directory
Set-Location ..\client

Write-Host "⚛️ Building React application..." -ForegroundColor Green

# Install dependencies
npm ci

# Build the React app
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ React build complete" -ForegroundColor Green
    Write-Host "🚀 Ready for deployment!" -ForegroundColor Yellow
} else {
    Write-Host "❌ React build failed" -ForegroundColor Red
    exit 1
}
