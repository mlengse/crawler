# Simple setup for React + WASM app
# Only run this once to setup development environment

Write-Host "Setting up React + WASM development environment..." -ForegroundColor Green

# Check if Rust is installed
try {
    $rustVersion = & rustc --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Rust found: $rustVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Rust not found. Please install from https://rustup.rs/" -ForegroundColor Red
    exit 1
}

# Add wasm32 target
Write-Host "Adding wasm32 target..." -ForegroundColor Yellow
& rustup target add wasm32-unknown-unknown

# Install wasm-pack if needed
try {
    $wasmPackVersion = & wasm-pack --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ wasm-pack found: $wasmPackVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "Installing wasm-pack..." -ForegroundColor Yellow
    & cargo install wasm-pack
}

# Install Node dependencies
Write-Host "Installing React dependencies..." -ForegroundColor Yellow
Set-Location client
npm install
Set-Location ..

Write-Host "✓ Setup complete! Use 'npm run dev' to start development" -ForegroundColor Green
