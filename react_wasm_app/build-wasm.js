const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🦀 Building Rust WASM backend...');

// Navigate to rust backend directory (relative to this script location)
const rustBackendDir = path.join(__dirname, 'rust_backend');
console.log('Switching to directory:', rustBackendDir);
process.chdir(rustBackendDir);

try {
  // Check if wasm-pack is available
  try {
    execSync('wasm-pack --version', { stdio: 'ignore' });
  } catch (error) {
    console.log('Installing wasm-pack...');
    // Try to install wasm-pack
    execSync('cargo install wasm-pack', { stdio: 'inherit' });
  }

  // Add wasm32 target
  execSync('rustup target add wasm32-unknown-unknown', { stdio: 'inherit' });

  // Build the WASM package
  execSync('wasm-pack build --target web --out-dir pkg', { stdio: 'inherit' });

  console.log('✅ WASM build complete');

  // Verify pkg directory exists
  const pkgDir = path.join(rustBackendDir, 'pkg');
  if (fs.existsSync(pkgDir)) {
    console.log('✅ WASM package generated successfully');
  } else {
    throw new Error('WASM package directory not found');
  }

} catch (error) {
  console.error('❌ WASM build failed:', error.message);
  process.exit(1);
}
