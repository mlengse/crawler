# 🚀 Deploying URL to Markdown Converter to Vercel

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally
   ```bash
   npm install -g vercel
   ```
3. **GitHub Repository**: Your code should be in a GitHub repository

## Deployment Methods

### Method 1: Vercel CLI (Recommended)

1. **Login to Vercel**:
   ```bash
   vercel login
   ```

2. **Navigate to project root**:
   ```bash
   cd react_wasm_app
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

### Method 2: GitHub Integration

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add Vercel deployment config"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Configure project settings:
     - **Framework Preset**: Create React App
     - **Root Directory**: `react_wasm_app`
     - **Build Command**: `cd client && npm run build:vercel`
     - **Output Directory**: `client/build`

## Configuration Files

The following files have been created for deployment:

### `vercel.json`
- Configures build settings and routing
- Sets proper MIME types for WASM files
- Handles SPA routing

### `build.sh` / `build.ps1`
- Build scripts that ensure WASM is compiled before React
- Can be used for local testing

### `.vercelignore`
- Excludes unnecessary files from deployment
- Reduces bundle size

## Build Process

The deployment follows this process:

1. **Install Rust toolchain** (if not available)
2. **Build WASM package**:
   ```bash
   cd rust_backend
   wasm-pack build --target web --out-dir pkg
   ```
3. **Build React app**:
   ```bash
   cd client
   npm ci
   npm run build
   ```

## Environment Variables

If you need environment variables:

1. **Local development**:
   ```bash
   # In client/.env.local
   REACT_APP_API_URL=your_api_url
   ```

2. **Vercel dashboard**:
   - Go to Project Settings → Environment Variables
   - Add your variables

## Troubleshooting

### Common Issues:

1. **WASM MIME Type Error**:
   - Fixed by `vercel.json` configuration
   - Ensures WASM files are served with correct headers

2. **Build Fails**:
   ```bash
   # Check if wasm-pack is available
   wasm-pack --version
   
   # Reinstall if needed
   curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
   ```

3. **Routing Issues**:
   - SPA routing handled by `vercel.json`
   - All routes redirect to `index.html`

4. **Large Bundle Size**:
   - WASM files are automatically optimized
   - Consider code splitting for large apps

## Performance Optimization

1. **Enable Compression**:
   - Vercel automatically enables gzip/brotli
   - WASM files are served optimally

2. **CDN Caching**:
   - Static assets cached at edge
   - WASM files have proper cache headers

3. **Cold Start Optimization**:
   - WASM initializes quickly
   - No server-side rendering needed

## Monitoring

After deployment:

1. **Check deployment status**:
   ```bash
   vercel ls
   ```

2. **View logs**:
   ```bash
   vercel logs
   ```

3. **Test WASM functionality**:
   - Open deployed URL
   - Try converting a URL to markdown
   - Check browser console for errors

## Domain Configuration

1. **Custom Domain**:
   ```bash
   vercel domains add yourdomain.com
   ```

2. **SSL Certificate**:
   - Automatically provisioned by Vercel
   - No additional configuration needed

## Success Checklist

- [ ] ✅ App builds locally with `npm run build:vercel`
- [ ] ✅ WASM files are generated in `rust_backend/pkg/`
- [ ] ✅ Vercel CLI is installed and authenticated
- [ ] ✅ Repository is pushed to GitHub (if using GitHub integration)
- [ ] ✅ Deployment completes without errors
- [ ] ✅ App loads and WASM initializes properly
- [ ] ✅ URL conversion functionality works

## Support

If you encounter issues:
1. Check [Vercel documentation](https://vercel.com/docs)
2. Review build logs in Vercel dashboard
3. Test locally first with the build scripts
