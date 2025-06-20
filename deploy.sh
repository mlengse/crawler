#!/bin/bash

# Make sure build directory exists
mkdir -p build

# Copy public assets to build directory
cp -r public/* build/

# Run npm build
npm run build

# Ensure sw.js is copied properly
cp public/sw.js build/

echo "Build completed for Vercel deployment!"
