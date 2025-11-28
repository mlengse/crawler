#!/bin/bash

echo "Starting deployment build process..."

# Step 1: Build WASM from Rust
echo "Step 1/4: Building WASM from Rust..."
cd src
wasm-pack build --target web --out-dir ../public
if [ $? -ne 0 ]; then
    echo "Error: WASM build failed!"
    exit 1
fi
cd ..

# Step 2: Make sure build directory exists
echo "Step 2/4: Creating build directory..."
mkdir -p build

# Step 3: Run npm build (React app)
echo "Step 3/4: Building React application..."
npm run build

# Step 4: Ensure sw.js is copied properly
echo "Step 4/4: Copying Service Worker..."
cp public/sw.js build/

echo "✅ Build completed successfully for Vercel deployment!"
echo ""
echo "WASM files generated in public/"
echo "React build completed in build/"
echo "Service Worker copied to build/"
echo ""
echo "Ready to deploy with: npm run deploy"
