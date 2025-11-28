# Vercel Deployment Instructions

This document explains how to deploy the Konverter URL ke Markdown application to Vercel with full WASM integration.

## Build Pipeline Overview

```
Rust (src/src/lib.rs) 
  → wasm-pack build 
  → WASM files (public/*.wasm, *.js) 
  → React Build 
  → Service Worker Integration 
  → Vercel Deployment
```

## Prerequisites

1. **Install Rust and wasm-pack:**
   ```bash
   # Install Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   
   # Install wasm-pack
   cargo install wasm-pack
   ```

2. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

3. **Login to Vercel:**
   ```bash
   vercel login
   ```

## Automated Build Process

The build process is now fully integrated:

### Local Development Build

```bash
# Build WASM + React app
npm run build

# Or use the deploy script
./deploy.sh
```

This will automatically:
1. ✅ Compile Rust to WASM (`wasm-pack build`)
2. ✅ Copy WASM files to `public/`
3. ✅ Build React application
4. ✅ Copy Service Worker to `build/`

### Vercel Deployment

```bash
# Deploy to production
npm run deploy

# Or directly
vercel --prod
```

## Build Scripts Explained

### package.json Scripts

- **`build:wasm`** - Compiles Rust to WASM and outputs to `public/`
- **`prebuild`** - Runs automatically before `build`, compiles WASM
- **`build`** - Builds React app and copies Service Worker
- **`build:vercel`** - Special build command for Vercel (includes WASM build)
- **`deploy`** - Deploys to Vercel production

### vercel.json Configuration

```json
{
  "buildCommand": "npm run build:vercel",
  "installCommand": "npm install && curl ... | sh -s -- -y && ... cargo install wasm-pack"
}
```

This ensures Vercel installs Rust and wasm-pack during build.

## Manual Build Steps (if needed)

If you need to build manually:

```bash
# 1. Build WASM
cd src
wasm-pack build --target web --out-dir ../public
cd ..

# 2. Build React
npm run build

# 3. Deploy
vercel --prod
```

## Vercel Environment Setup

Vercel will automatically:
1. Install Node.js dependencies
2. Install Rust toolchain
3. Install wasm-pack
4. Build WASM from Rust source
5. Build React application
6. Deploy to CDN

## File Structure After Build

```
public/
  ├── rust_backend.js          (WASM bindings)
  ├── rust_backend_bg.wasm     (WASM binary)
  ├── rust_backend.d.ts        (TypeScript definitions)
  └── sw.js                    (Service Worker)

build/
  ├── static/
  │   ├── js/
  │   └── css/
  ├── rust_backend*.js         (copied from public)
  ├── rust_backend_bg.wasm     (copied from public)
  └── sw.js                    (Service Worker)
```

## Testing Your Deployment

1. **After deployment, verify:**
   ```bash
   # Open deployed URL
   vercel --prod
   ```

2. **Check in browser:**
   - Open Developer Tools (F12)
   - Console tab: Look for "Processing HTML to markdown" (WASM loaded)
   - Application tab > Service Workers: Verify active
   - Network tab: Check WASM file loads correctly

3. **Test crawler features:**
   - Input a domain URL
   - Click "Crawl & Process"
   - Verify sub-paths are discovered
   - Test PDF download
   - Test HTML to Markdown conversion

## Troubleshooting

### WASM Build Fails on Vercel

**Problem:** Rust or wasm-pack not installed

**Solution:** Check `vercel.json` has correct `installCommand`:
```json
"installCommand": "npm install && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && export PATH=\"$HOME/.cargo/bin:$PATH\" && cargo install wasm-pack || true"
```

### WASM File Not Loading

**Problem:** CORS or Content-Type headers

**Solution:** Check `vercel.json` headers:
```json
{
  "source": "/(.*\\.wasm)",
  "headers": [
    { "key": "Content-Type", "value": "application/wasm" }
  ]
}
```

### Service Worker Not Registered

**Problem:** sw.js not copied to build

**Solution:** Run:
```bash
cp public/sw.js build/
vercel --prod --force
```

### Local vs Production Differences

**Problem:** Works locally but not on Vercel

**Solution:** 
1. Clear Vercel cache: `vercel --prod --force`
2. Check build logs in Vercel dashboard
3. Verify all WASM files are in build output

## CI/CD Integration

For automated deployments, add to `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install Rust
        run: |
          curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
          source $HOME/.cargo/env
          cargo install wasm-pack
      
      - name: Build WASM
        run: npm run build:wasm
      
      - name: Deploy to Vercel
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

## Performance Tips

1. **WASM file size:** Current build ~200KB (gzipped)
2. **CDN caching:** Vercel automatically caches WASM files
3. **Service Worker:** Enables offline functionality after first load

## Verification Checklist

Before deploying to production:

- [ ] Rust code compiles without errors
- [ ] WASM files generated in `public/`
- [ ] React build succeeds
- [ ] Service Worker copied to `build/`
- [ ] Local preview works: `npm run preview`
- [ ] All crawler features tested locally
- [ ] PDF download works
- [ ] CORS proxy functional

## Contact & Support

For deployment issues:
1. Check Vercel build logs
2. Review this documentation
3. Test locally first with `npm run build`
4. Contact developer if issues persist

---

**Last Updated:** November 28, 2025  
**Pipeline Status:** ✅ Fully Integrated (WASM → Service Worker → NPM → Vercel)
