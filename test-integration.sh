#!/bin/bash

# Integration Test Script
# Tests the full build pipeline: WASM -> Service Worker -> NPM -> Vercel

echo "================================================"
echo "  Integration Test: Build Pipeline"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

# Test 1: Check if Rust is installed
echo -n "Test 1/7: Checking Rust installation... "
if command -v rustc &> /dev/null; then
    echo -e "${GREEN}✓ PASSED${NC}"
    PASSED=$((PASSED + 1))
    rustc --version
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "  Rust is not installed. Install from: https://rustup.rs/"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 2: Check if wasm-pack is installed
echo -n "Test 2/7: Checking wasm-pack installation... "
if command -v wasm-pack &> /dev/null; then
    echo -e "${GREEN}✓ PASSED${NC}"
    PASSED=$((PASSED + 1))
    wasm-pack --version
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "  wasm-pack is not installed. Run: cargo install wasm-pack"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 3: Check if Cargo.toml exists
echo -n "Test 3/7: Checking Cargo.toml exists... "
if [ -f "src/Cargo.toml" ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "  src/Cargo.toml not found"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 4: Check if Service Worker exists
echo -n "Test 4/7: Checking Service Worker exists... "
if [ -f "public/sw.js" ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "  public/sw.js not found"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 5: Check if package.json has required scripts
echo -n "Test 5/7: Checking package.json scripts... "
if grep -q "build:wasm" package.json && grep -q "prebuild" package.json && grep -q "build:vercel" package.json; then
    echo -e "${GREEN}✓ PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "  Required scripts not found in package.json"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 6: Check if vercel.json is configured
echo -n "Test 6/7: Checking vercel.json configuration... "
if [ -f "vercel.json" ]; then
    if grep -q "build:vercel" vercel.json; then
        echo -e "${GREEN}✓ PASSED${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}⚠ WARNING${NC}"
        echo "  vercel.json exists but may need buildCommand update"
        PASSED=$((PASSED + 1))
    fi
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "  vercel.json not found"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 7: Try building WASM (optional, can be slow)
echo -n "Test 7/7: Testing WASM build... "
if command -v wasm-pack &> /dev/null && command -v rustc &> /dev/null; then
    echo ""
    echo "  Building WASM (this may take a minute)..."
    cd src
    if wasm-pack build --target web --out-dir ../public 2>&1 | tail -5; then
        cd ..
        if [ -f "public/rust_backend_bg.wasm" ]; then
            echo -e "${GREEN}✓ PASSED${NC}"
            PASSED=$((PASSED + 1))
            ls -lh public/rust_backend_bg.wasm
        else
            echo -e "${RED}✗ FAILED${NC}"
            echo "  WASM file not generated"
            FAILED=$((FAILED + 1))
            cd ..
        fi
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  WASM build failed"
        FAILED=$((FAILED + 1))
        cd ..
    fi
else
    echo -e "${YELLOW}⊘ SKIPPED${NC}"
    echo "  Rust or wasm-pack not installed"
fi
echo ""

# Summary
echo "================================================"
echo "  Test Summary"
echo "================================================"
echo -e "Passed: ${GREEN}${PASSED}${NC}"
echo -e "Failed: ${RED}${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Pipeline is ready.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. npm run build      - Build locally"
    echo "  2. npm run preview    - Preview build"
    echo "  3. npm run deploy     - Deploy to Vercel"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please fix the issues above.${NC}"
    exit 1
fi
