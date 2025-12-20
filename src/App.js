import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import UrlInputPanel from './UrlInputPanel';
import StatusDisplay from './StatusDisplay';
import PreviewPanel from './PreviewPanel';
import ControlsPanel from './ControlsPanel';
import { convertHtmlToMarkdownJS, getDOMParser } from './markdownUtils';

// Helper function to trigger browser download
function downloadFile(filename, content) {
  const element = document.createElement('a');
  const file = new Blob([content], {type: 'text/markdown;charset=utf-8'});
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element); // Required for this to work in FireFox
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(element.href); // Clean up
}

// Helper function to save HTML as PDF using browser print
function saveAsPDF(filename, htmlContent, url) {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  
  // Write styled HTML content
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename}</title>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
          }
          h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
          }
          h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
          h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
          h3 { font-size: 1.25em; }
          p { margin-bottom: 16px; }
          a { color: #0366d6; text-decoration: none; }
          a:hover { text-decoration: underline; }
          code {
            padding: 0.2em 0.4em;
            margin: 0;
            font-size: 85%;
            background-color: rgba(27,31,35,0.05);
            border-radius: 3px;
          }
          pre {
            padding: 16px;
            overflow: auto;
            font-size: 85%;
            line-height: 1.45;
            background-color: #f6f8fa;
            border-radius: 3px;
          }
          img { max-width: 100%; }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 16px;
          }
          table th, table td {
            padding: 6px 13px;
            border: 1px solid #dfe2e5;
          }
          table tr:nth-child(2n) {
            background-color: #f6f8fa;
          }
          .source-url {
            background: #f0f0f0;
            padding: 10px;
            margin-bottom: 20px;
            border-left: 4px solid #0366d6;
            font-size: 0.9em;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="source-url">
          <strong>Sumber:</strong> <a href="${url}">${url}</a>
        </div>
        ${htmlContent}
      </body>
    </html>
  `);
  
  printWindow.document.close();
  
  // Wait for content to load, then trigger print
  printWindow.onload = function() {
    setTimeout(() => {
      printWindow.print();
      // Note: Window will close automatically after print dialog is dismissed
      // or user can close it manually
    }, 250);
  };
}

// Helper to generate filename from URL (similar to Electron app)
function generateFilenameFromUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    let hostname = url.hostname;
    let pathname = url.pathname;
    pathname = pathname.replace(/^\/+|\/+$/g, ''); // remove leading/trailing slashes
    let filename = `${hostname}_${pathname}`;
    filename = filename.replace(/[/?%*:|"<>]/g, '_').replace(/__+/g, '_').replace(/^_|_$/g, '');
    if (filename.length > 200) filename = filename.substring(0, 200);
    return (filename || "untitled") + ".md";
  } catch (e) {
    // Fallback for invalid URLs
    return (urlStr.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50) || "url_tidak_valid") + ".md";
  }
}


function App() {
  const [wasmInitialized, setWasmInitialized] = useState(false);
  const [status, setStatus] = useState({ message: 'Menginisialisasi WASM...', type: 'info' });
  const [markdownResult, setMarkdownResult] = useState(''); // For single manual URL or last from file
  const [lastProcessedUrl, setLastProcessedUrl] = useState('');

  const [urlsFromFile, setUrlsFromFile] = useState([]);
  const [processedMarkdowns, setProcessedMarkdowns] = useState([]); // Array of {url, markdown, html, error?}
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(0);  const [isProcessingMultiple, setIsProcessingMultiple] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [saveMerged, setSaveMerged] = useState(true); // State for the checkbox
  const [splitMergedFiles, setSplitMergedFiles] = useState(false); // State for splitting merged files
  const [urlsPerFile, setUrlsPerFile] = useState(10); // URLs per file when splitting
  const [saveFormat, setSaveFormat] = useState('markdown'); // 'markdown' or 'pdf'
  const [maxRetries, setMaxRetries] = useState(3); // State for max retries
  const [maxCrawlLinks, setMaxCrawlLinks] = useState(5000); // State for max crawl links (increased default)
  const [maxCrawlDepth, setMaxCrawlDepth] = useState(3); // State for max crawl depth (increased to 3)
  const [concurrency, setConcurrency] = useState(5); // State for crawl concurrency
  const [discoveredPaths, setDiscoveredPaths] = useState([]); // Discovered paths from crawl
  const [selectedPaths, setSelectedPaths] = useState([]); // User-selected paths to process
  const [showPathSelection, setShowPathSelection] = useState(false); // Show path selection UI
  const [crawlProgress, setCrawlProgress] = useState({ current: 0, total: 0, depth: 0 }); // Crawl progress tracking
  const [crawlStats, setCrawlStats] = useState({ wasmCount: 0, domCount: 0, wasmTime: 0, domTime: 0 }); // Performance stats

  const processingPausedRef = useRef(isPaused);
  useEffect(() => { processingPausedRef.current = isPaused; }, [isPaused]);  useEffect(() => {
    // Load WASM module using dynamic import
    const loadWasm = async () => {
      try {
        setStatus({ message: 'Memuat modul WASM...', type: 'info' });
        
        // Use dynamic import to load the WASM module
        try {
          // For production build, we need to ensure the WASM files are accessible
          const wasmInit = await import(/* webpackIgnore: true */ `/rust_backend.js`);
          
          // Initialize the WASM module
          if (typeof wasmInit.default === 'function') {
            await wasmInit.default();
            
            // Check if our functions are available and bind them
            if (typeof wasmInit.process_html_to_markdown === 'function') {
              window.process_html_to_markdown = wasmInit.process_html_to_markdown;
              
              // Also bind the link extraction function
              if (typeof wasmInit.extract_links_from_html === 'function') {
                window.extract_links_from_html = wasmInit.extract_links_from_html;
                // console.log('WASM link extraction function loaded successfully');
              }
              
              setWasmInitialized(true);
              setStatus({ message: 'WASM berhasil diinisialisasi dengan fitur crawler. Siap memproses URL.', type: 'success' });
              return;
            }
          }
        } catch (dynamicImportError) {
          console.warn('Dynamic import failed, trying alternative approach:', dynamicImportError);
        }
          // Fallback: Load the WASM file manually and create a simple wrapper
        const wasmUrl = `${process.env.PUBLIC_URL || ''}/rust_backend_bg.wasm`;
        const wasmResponse = await fetch(wasmUrl);
        if (!wasmResponse.ok) {
          throw new Error(`Gagal mengambil WASM: ${wasmResponse.status}`);
        }
        
        // eslint-disable-next-line no-unused-vars
        const wasmBytes = await wasmResponse.arrayBuffer();
        
        // For now, let's use a JavaScript fallback since the WASM loading is complex
        // This will ensure the app works while we fix the WASM integration
        console.warn('Using JavaScript fallback for HTML to Markdown conversion');
        
        window.process_html_to_markdown = (html, url) => {
          return convertHtmlToMarkdownJS(html, url);
        };
        
        setWasmInitialized(true);
        setStatus({ message: 'Siap memproses URL (menggunakan fallback JavaScript).', type: 'warning' });} catch (err) {
        console.error("Error initializing WASM module:", err);
        // Fallback to JavaScript-based conversion
        window.process_html_to_markdown = (html, url) => {
          return convertHtmlToMarkdownJS(html, url);
        };
        
        setWasmInitialized(true);
        setStatus({ message: 'Menggunakan konversi JavaScript fallback. Siap memproses URL.', type: 'warning' });
      }
    };
    
    loadWasm();
  }, []);
  // Normalize URL for deduplication
  const normalizeUrl = (urlString) => {
    try {
      const url = new URL(urlString);

      // Remove hash/fragment
      url.hash = '';

      // Remove trailing slash except for root path
      if (url.pathname !== '/' && url.pathname.endsWith('/')) {
        url.pathname = url.pathname.slice(0, -1);
      }

      // Sort query parameters for consistency
      if (url.search) {
        const params = new URLSearchParams(url.search);
        const sortedParams = new URLSearchParams();
        [...params.keys()].sort().forEach(key => {
          params.getAll(key).forEach(value => sortedParams.append(key, value));
        });
        url.search = sortedParams.toString();
      }

      // Convert to lowercase for case-insensitive comparison
      const normalized = url.toString().toLowerCase();

      return normalized;
    } catch (e) {
      console.warn(`Failed to normalize URL: ${urlString}`, e);
      return urlString.toLowerCase();
    }
  };

  // Convert HTML to Markdown with WASM-first strategy
  // Optimized to avoid recreation on every render and reuse DOM elements
  const convertHtmlToMarkdown = (htmlContent, url) => {
    // Try WASM first
    if (typeof window.process_html_to_markdown === 'function') {
      try {
        const markdown = window.process_html_to_markdown(htmlContent, url);
        return markdown;
      } catch (wasmError) {
        console.warn(`WASM HTML conversion failed, falling back to JavaScript:`, wasmError);
        // Fall through to JavaScript fallback
      }
    }

    // JavaScript fallback with enhanced HTML entity decoding
    // Uses the shared function to avoid memory churn
    return convertHtmlToMarkdownJS(htmlContent, url);
  };

  // Extract links from a single page
  const extractLinksFromPage = async (url, baseOrigin) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`extractLinksFromPage: failed to fetch ${url}: ${response.status}`);
        return [];
      }
      const html = await response.text();

      // Try WASM first for better performance
      if (typeof window.extract_links_from_html === 'function') {
        try {
          // console.log(`Using WASM to extract links from ${url}`);
          const startTime = performance.now();

          const jsonResult = window.extract_links_from_html(html, url);
          const wasmLinks = JSON.parse(jsonResult);

          const endTime = performance.now();
          // console.log(`WASM extraction took ${(endTime - startTime).toFixed(2)}ms`);

          // Update stats
          setCrawlStats(prev => ({
            ...prev,
            wasmCount: prev.wasmCount + 1,
            wasmTime: prev.wasmTime + (endTime - startTime)
          }));

          // Filter by origin (WASM returns all same-origin links already)
          const filteredLinks = wasmLinks.filter(link => {
            try {
              return new URL(link).origin === baseOrigin;
            } catch (e) {
              return false;
            }
          });

          // Deduplicate using normalized URLs
          const seenNormalized = new Set();
          const uniqueLinks = [];

          for (const link of filteredLinks) {
            const normalized = normalizeUrl(link);
            if (!seenNormalized.has(normalized)) {
              seenNormalized.add(normalized);
              uniqueLinks.push(link);
            }
          }

          // console.log(`WASM: ${wasmLinks.length} links found, ${filteredLinks.length} after origin filter, ${uniqueLinks.length} after deduplication`);
          return uniqueLinks;

        } catch (wasmError) {
          console.warn(`WASM extraction failed for ${url}, falling back to DOM Parser:`, wasmError);
          // Fall through to DOM Parser fallback
        }
      } else {
        // console.log(`WASM not available, using DOM Parser for ${url}`);
      }

      // Fallback: Use DOM Parser (JavaScript)
      const startTime = performance.now();
      const parser = getDOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const anchors = Array.from(doc.querySelectorAll('a[href]'));

      // console.log(`DOM Parser: extracting links from ${url}: found ${anchors.length} anchor tags`);

      // Use Set to track normalized URLs for deduplication
      const seenNormalized = new Set();
      const uniqueLinks = [];

      const links = anchors
        .map(a => a.getAttribute('href'))
        .filter(href => {
          if (!href) return false;
          // Filter out non-navigational links
          const skipPrefixes = ['#', 'mailto:', 'tel:', 'javascript:', 'data:'];
          return !skipPrefixes.some(prefix => href.startsWith(prefix));
        })
        .map(href => {
          try {
            return new URL(href, url).toString();
          } catch (e) {
            console.warn(`Invalid URL: ${href} on page ${url}`);
            return null;
          }
        })
        .filter(u => u !== null)
        .filter(u => {
          try {
            const urlObj = new URL(u);
            // Only keep same-origin links
            return urlObj.origin === baseOrigin;
          } catch (e) {
            return false;
          }
        })
        .filter(u => {
          // Drop likely binary/non-HTML assets by extension (except PDF which we handle separately)
          const skipExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico',
                          '.css', '.js', '.json', '.xml',
                          '.zip', '.tar', '.gz', '.rar', '.7z',
                          '.exe', '.dmg', '.iso', '.app',
                          '.mp4', '.mp3', '.avi', '.mov', '.wav',
                          '.ttf', '.woff', '.woff2', '.eot'];
          const pathname = new URL(u).pathname.toLowerCase();
          return !skipExt.some(ext => pathname.endsWith(ext));
        });

      // Deduplicate using normalized URLs
      for (const link of links) {
        const normalized = normalizeUrl(link);
        if (!seenNormalized.has(normalized)) {
          seenNormalized.add(normalized);
          uniqueLinks.push(link); // Keep original URL format but track normalized
        }
      }

      const endTime = performance.now();
      // console.log(`DOM Parser: ${(endTime - startTime).toFixed(2)}ms, ${uniqueLinks.length} valid unique links from ${url}`);

      // Update stats
      setCrawlStats(prev => ({
        ...prev,
        domCount: prev.domCount + 1,
        domTime: prev.domTime + (endTime - startTime)
      }));

      return uniqueLinks;
    } catch (err) {
      console.error(`extractLinksFromPage error for ${url}:`, err);
      return [];
    }
  };

  // Deep crawl with maximum depth - crawls ALL links recursively
  const crawlUrlsDeep = async (startUrl, depth = maxCrawlDepth) => {
    const baseOrigin = new URL(startUrl).origin;
    const visited = new Set(); // Stores normalized URLs
    const allUrls = new Map(); // Maps normalized URL -> original URL
    const queued = new Set(); // Tracks normalized URLs already in queue
    const queue = [{ url: startUrl, currentDepth: 0 }];

    const startNormalized = normalizeUrl(startUrl);
    queued.add(startNormalized);
    setCrawlProgress({ current: 0, total: 1, depth: 0 });

    // console.log(`Starting deep crawl of ${startUrl} with max depth ${depth}`);

    while (queue.length > 0 && allUrls.size < maxCrawlLinks) {
      const { url, currentDepth } = queue.shift();
      const normalizedUrl = normalizeUrl(url);

      // Skip if already visited or exceeds depth
      if (visited.has(normalizedUrl) || currentDepth > depth) {
        continue;
      }

      visited.add(normalizedUrl);
      allUrls.set(normalizedUrl, url); // Store original URL format

      // Update progress
      setCrawlProgress({
        current: visited.size,
        total: visited.size + queue.length,
        depth: currentDepth
      });

      setStatus({
        message: `Crawling (kedalaman ${currentDepth}/${depth}): ${visited.size} halaman ditemukan, ${queue.length} dalam antrian...`,
        type: 'info'
      });

      // console.log(`Crawling [depth ${currentDepth}]: ${url} (${visited.size} visited, ${queue.length} queued)`);

      // If we haven't reached max depth, crawl this page for more links
      if (currentDepth < depth) {
        const links = await extractLinksFromPage(url, baseOrigin);
        // console.log(`Found ${links.length} links on ${url}`);

        // Add new links to queue
        let addedCount = 0;
        for (const link of links) {
          const linkNormalized = normalizeUrl(link);
          if (!visited.has(linkNormalized) && !queued.has(linkNormalized)) {
            queue.push({ url: link, currentDepth: currentDepth + 1 });
            queued.add(linkNormalized);
            addedCount++;
          }
        }
        // console.log(`Added ${addedCount} new unique links to queue (${links.length - addedCount} were duplicates)`);
      }

      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // console.log(`Crawl complete: visited ${visited.size} unique pages, found ${allUrls.size} total URLs`);

    // Log performance stats
    if (crawlStats.wasmCount > 0 || crawlStats.domCount > 0) {
      // const avgWasm = crawlStats.wasmCount > 0 ? (crawlStats.wasmTime / crawlStats.wasmCount).toFixed(2) : 0;
      // const avgDom = crawlStats.domCount > 0 ? (crawlStats.domTime / crawlStats.domCount).toFixed(2) : 0;
      // console.log(`Performance Stats - WASM: ${crawlStats.wasmCount} pages (avg ${avgWasm}ms), DOM: ${crawlStats.domCount} pages (avg ${avgDom}ms)`);

      if (crawlStats.wasmCount > 0 && crawlStats.domCount > 0) {
        // const speedup = (crawlStats.domTime / crawlStats.domCount) / (crawlStats.wasmTime / crawlStats.wasmCount);
        // console.log(`WASM is ${speedup.toFixed(2)}x faster than DOM Parser`);
      }
    }

    // Return original URLs (not normalized)
    const finalUrls = Array.from(allUrls.values());

    // Count PDFs
    const pdfCount = finalUrls.filter(u => u.toLowerCase().endsWith('.pdf')).length;

    return {
      urls: finalUrls.slice(0, maxCrawlLinks),
      pdfCount,
      totalFound: finalUrls.length,
      visited: visited.size
    };
  };

  // Legacy single-level crawl (kept for backward compatibility)
  const crawlUrls = async (origin) => {
    try {
      const response = await fetch(origin);
      if (!response.ok) {
        console.warn(`crawlUrls: failed to fetch ${origin}: ${response.status}`);
        return { urls: [], pdfCount: 0 };
      }
      const html = await response.text();
      // Parse and extract <a> hrefs
      const parser = getDOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const anchors = Array.from(doc.querySelectorAll('a[href]'));
      const urls = anchors.map(a => a.getAttribute('href'))
        .filter(href => href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:'))
        .map(href => {
          try {
            return new URL(href, origin).toString();
          } catch (e) {
            return null;
          }
        })
        .filter(u => u !== null)
        .filter(u => {
          try { return new URL(u).origin === origin; } catch (e) { return false; }
        })
        .filter(u => {
          // Drop likely binary/non-HTML assets by extension (except PDF which we handle separately)
          const skipExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.zip', '.tar', '.gz', '.exe', '.dmg', '.iso'];
          const path = new URL(u).pathname.toLowerCase();
          return !skipExt.some(ext => path.endsWith(ext));
        })
        .map(u => {
          // Normalize: remove fragment only
          const nu = new URL(u);
          nu.hash = '';
          return nu.toString();
        });

      // Reduce to unique and only sub-paths (path not equal '/'), stable order
      const unique = Array.from(new Set(urls)).filter(u => {
        const p = new URL(u).pathname;
        return p && p !== '/';
      });

      // Apply maxCrawlLinks limit
      const limited = unique.slice(0, maxCrawlLinks);

      // Count PDFs
      const pdfCount = limited.filter(u => u.toLowerCase().endsWith('.pdf')).length;

      return { urls: limited, pdfCount };
    } catch (err) {
      console.error('crawlUrls error', err);
      return { urls: [], pdfCount: 0 };
    }
  };

  // Enhanced error handling and retry mechanism (from renderer.js)
  const processSingleUrl = async (url, isFromFile = false, maxRetriesOverride = null) => {
    const retriesToUse = maxRetriesOverride !== null ? maxRetriesOverride : maxRetries;
    if (!wasmInitialized) {
      setStatus({ message: 'WASM belum diinisialisasi. Mohon tunggu.', type: 'error' });
      return null;
    }
    if (!url || !url.trim()) {
      if (!isFromFile) setStatus({ message: 'URL tidak valid.', type: 'error' });
      return { url, markdown: 'Error: URL tidak valid', error: 'URL tidak valid' };
    }

    setStatus({ message: `Mengambil: ${url}...`, type: 'info' });
    if (!isFromFile) setLastProcessedUrl(url);    let attempts = 0;
    let success = false;

    while (attempts < retriesToUse && !success) {
      try {
        attempts++;
        setStatus({ message: `Memproses: ${url} (percobaan ${attempts}/${retriesToUse})...`, type: 'info' });
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const htmlContent = await response.text();
        
        setStatus({ message: `Mengkonversi: ${url} ke markdown...`, type: 'info' });
        const markdown = convertHtmlToMarkdown(htmlContent, url);
        
        success = true;
        return { url, markdown, html: htmlContent };
      } catch (error) {
        console.error(`Error memproses ${url} (percobaan ${attempts}):`, error);
        let errorMessage = error.message;
        
        // Enhanced error categorization (from renderer.js)
        if (error instanceof TypeError && error.message === "Failed to fetch") {
            errorMessage = "Masalah CORS atau jaringan - mencoba dengan XMLHttpRequest...";
            
            // Try using XMLHttpRequest as a fallback for CORS issues
            if (attempts === retriesToUse - 1) {
            try {
              const xhrPromise = new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open('GET', url, true);
              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 400) {
                resolve(xhr.responseText);
                } else {
                reject(new Error(`XHR HTTP error! status: ${xhr.status}`));
                }
              };
              xhr.onerror = () => reject(new Error('XHR request failed'));
              xhr.send();
              });
              
              const htmlContent = await xhrPromise;
              const markdown = convertHtmlToMarkdown(htmlContent, url);
              success = true;
              return { url, markdown, html: htmlContent, usedXHR: true };
            } catch (xhrError) {
                console.error(`XHR fallback failed for ${url}:`, xhrError);
                
                // Try one more attempt with a CORS proxy service
                try {
                const proxyUrl = "https://api.codetabs.com/v1/proxy?quest=";
                const proxiedUrl = proxyUrl + encodeURIComponent(url);
                
                // console.log(`Trying CORS proxy service for ${url}`);
                const proxyResponse = await fetch(proxiedUrl);
                
                if (proxyResponse.ok) {
                  const htmlContent = await proxyResponse.text();
                  const markdown = window.process_html_to_markdown(htmlContent, url);
                  success = true;
                  return { url, markdown, html: htmlContent, usedProxy: true };
                } else {
                  throw new Error(`Proxy HTTP error! status: ${proxyResponse.status}`);
                }
                } catch (proxyError) {                console.error(`CORS proxy attempt failed for ${url}:`, proxyError);
                errorMessage = "Masalah CORS atau jaringan - menggunakan Service Worker sebagai fallback";
                
                // Try Service Worker approach which should handle CORS automatically
                try {
                  // console.log(`Using Service Worker to handle CORS for ${url}`);
                  const swResponse = await fetch(url);
                  
                  if (swResponse.ok) {
                    const htmlContent = await swResponse.text();
                    const markdown = window.process_html_to_markdown(htmlContent, url);
                    success = true;
                    return { url, markdown, html: htmlContent, usedServiceWorker: true };
                  } else {
                    throw new Error(`Service Worker fetch failed with status: ${swResponse.status}`);
                  }
                } catch (swError) {                console.error(`Service Worker approach failed for ${url}:`, swError);
                  errorMessage = "Masalah CORS atau jaringan - coba URL lain atau gunakan proxy";
                }
                }
            }
          }
        } else if (error.message.includes("HTTP error! status: 404")) {
          errorMessage = "Halaman tidak ditemukan (404)";
        } else if (error.message.includes("HTTP error! status: 403")) {
          errorMessage = "Akses dilarang (403)";
        } else if (error.message.includes("HTTP error! status: 500")) {
          errorMessage = "Error server (500)";        }
        
        if (attempts >= retriesToUse) {
          // Try a fallback using JavaScript-based conversion as last resort
          try {
            console.warn(`Using JavaScript fallback for URL ${url} after ${retriesToUse} failed attempts`);
            
            // Make one more request with the JavaScript fallback approach
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const htmlContent = await response.text();
            
            // Create a simplified HTML to markdown conversion
            const markdown = convertHtmlToMarkdownJS(htmlContent, url);
            
            return { url, markdown, html: htmlContent, usedFallback: true };
          } catch (fallbackError) {
            console.error(`Fallback conversion failed for ${url}:`, fallbackError);
            if (!isFromFile) setStatus({ message: `Error memproses ${url}: ${errorMessage}`, type: 'error' });
            return { url, markdown: `Error: ${errorMessage}`, error: errorMessage };
          }
        }
        
        // Add delay between retries (from renderer.js pattern)
        if (attempts < retriesToUse) {
          setStatus({ message: `Mencoba lagi ${url} dalam ${Math.pow(2, attempts)} detik... (${attempts}/${retriesToUse})`, type: 'warning' });
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
        }
      }
    }
  };

  // Enhanced file processing with progress tracking (from renderer.js)
  const startProcessingAll = async () => {
    if (currentProcessingIndex >= urlsFromFile.length && urlsFromFile.length > 0) {
        setStatus({ message: 'Semua URL sudah diproses.', type: 'info' });
        setIsProcessingMultiple(false);
        return;
    }
    if (urlsFromFile.length === 0) {
        setStatus({ message: 'Tidak ada URL dari file untuk diproses.', type: 'warning'});
        return;
    }

    setIsProcessingMultiple(true);
    setIsPaused(false);

    let tempProcessedMarkdowns = [...processedMarkdowns];
    if (currentProcessingIndex === 0) {
        tempProcessedMarkdowns = [];
        setProcessedMarkdowns([]);
    }

    for (let i = currentProcessingIndex; i < urlsFromFile.length; i++) {
      // Check pause state before each URL
      if (processingPausedRef.current) {
        setCurrentProcessingIndex(i);
        setStatus({ message: `Dijeda pada URL ${i + 1}/${urlsFromFile.length}: ${urlsFromFile[i]}`, type: 'warning' });
        return;
      }
      
      const url = urlsFromFile[i];
      setLastProcessedUrl(url);
      setCurrentProcessingIndex(i + 1); // Update progress
      
      setStatus({ message: `Memproses ${i + 1}/${urlsFromFile.length}: ${url}`, type: 'info' });
      
      const result = await processSingleUrl(url, true);
      tempProcessedMarkdowns.push(result);
      setProcessedMarkdowns([...tempProcessedMarkdowns]);
      setMarkdownResult(result.markdown);

      if (result.error) {
        setStatus({ message: `Error memproses ${url}: ${result.error}`, type: 'error' });
      } else {
        setStatus({ message: `Berhasil memproses ${url}`, type: 'success' });
      }

      // Small delay between URLs to prevent overwhelming servers
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Processing complete
    setCurrentProcessingIndex(urlsFromFile.length);
    setIsProcessingMultiple(false);
    setIsPaused(false);
    
    const successCount = tempProcessedMarkdowns.filter(item => !item.error).length;
    const errorCount = tempProcessedMarkdowns.length - successCount;
    
    let message = `Pemrosesan selesai! ${successCount}/${tempProcessedMarkdowns.length} URL berhasil diproses.`;
    if (errorCount > 0) {
      message += ` ${errorCount} URL gagal.`;
      setStatus({ message, type: 'warning' });
    } else {
      setStatus({ message, type: 'success' });
    }  };
  const handleToggleSaveMerged = useCallback(() => {
    setSaveMerged(prev => !prev);
  }, []);

  const handleToggleSplitMerged = useCallback(() => {
    setSplitMergedFiles(prev => !prev);
  }, []);

  const handleUrlsPerFileChange = useCallback((newUrlsPerFile) => {
    const value = parseInt(newUrlsPerFile, 10);
    if (value >= 1 && value <= 100) {
      setUrlsPerFile(value);
    }
  }, []);

  const handleMaxRetriesChange = useCallback((newMaxRetries) => {
    const value = parseInt(newMaxRetries, 10);
    if (value >= 1 && value <= 10) {
      setMaxRetries(value);
    }
  }, []);

  const handleMaxCrawlLinksChange = useCallback((newMaxCrawlLinks) => {
    const value = parseInt(newMaxCrawlLinks, 10);
    if (value >= 1 && value <= 5000) {
      setMaxCrawlLinks(value);
    }
  }, []);

  const handleMaxCrawlDepthChange = useCallback((newMaxCrawlDepth) => {
    const value = parseInt(newMaxCrawlDepth, 10);
    if (value >= 1 && value <= 10) {
      setMaxCrawlDepth(value);
    }
  }, []);

  const handleConcurrencyChange = useCallback((newConcurrency) => {
    const value = parseInt(newConcurrency, 10);
    if (value >= 1 && value <= 10) {
      setConcurrency(value);
    }
  }, []);

  const handleSaveFormatChange = useCallback((format) => {
    setSaveFormat(format);
  }, []);
  const handleSaveMarkdown = () => {
    const successfulMarkdowns = processedMarkdowns.filter(item => item && !item.error && item.markdown);

    if (urlsFromFile.length > 0 && processedMarkdowns.length > 0) {
      if (successfulMarkdowns.length === 0) {
        setStatus({ message: 'Tidak ada konten yang berhasil untuk disimpan.', type: 'warning' });
        return;
      }
      
      // Deduplicate by URL to prevent duplicate files
      const seenUrls = new Map();
      const uniqueMarkdowns = [];
      
      for (const item of successfulMarkdowns) {
        const normalizedUrl = normalizeUrl(item.url);
        if (!seenUrls.has(normalizedUrl)) {
          seenUrls.set(normalizedUrl, true);
          uniqueMarkdowns.push(item);
        } else {
          console.warn(`Duplicate URL found in processedMarkdowns: ${item.url} (normalized: ${normalizedUrl})`);
        }
      }
      
      // Save as PDF
      if (saveFormat === 'pdf') {
        if (saveMerged) {
          if (splitMergedFiles && urlsPerFile > 0) {
            // Split into multiple PDF files
            const totalFiles = Math.ceil(uniqueMarkdowns.length / urlsPerFile);
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            
            for (let i = 0; i < totalFiles; i++) {
              const startIdx = i * urlsPerFile;
              const endIdx = Math.min(startIdx + urlsPerFile, uniqueMarkdowns.length);
              const chunk = uniqueMarkdowns.slice(startIdx, endIdx);
              
              const mergedHtml = chunk
                .map(item => `<h2>${item.url}</h2>${item.html || item.markdown.replace(/^# .*\n\n/, '')}`)
                .join('<hr style="margin: 40px 0; border: 2px solid #ccc;">');
              
              const filename = `merged_urls_${timestamp}_part${i + 1}of${totalFiles}.pdf`;
              
              setTimeout(() => {
                saveAsPDF(filename, mergedHtml, `Merged URLs (Part ${i + 1}/${totalFiles})`);
              }, i * 500);
            }
            
            setStatus({ 
              message: `Menyimpan ${uniqueMarkdowns.length} URL unik sebagai ${totalFiles} file PDF (${urlsPerFile} URL per file)`, 
              type: 'success' 
            });
          } else {
            // Save all as one PDF
            const mergedHtml = uniqueMarkdowns
              .map(item => `<h2>${item.url}</h2>${item.html || item.markdown.replace(/^# .*\n\n/, '')}`)
              .join('<hr style="margin: 40px 0; border: 2px solid #ccc;">');
            
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `merged_urls_${timestamp}.pdf`;
            saveAsPDF(filename, mergedHtml, 'Merged URLs');
            setStatus({ message: `Menyimpan ${uniqueMarkdowns.length} URL unik sebagai file PDF gabungan`, type: 'success' });
          }
        } else {
          // Save each URL as separate PDF
          uniqueMarkdowns.forEach((item, index) => {
            const filename = generateFilenameFromUrl(item.url).replace('.md', '.pdf');
            const htmlContent = item.html || item.markdown.replace(/^# .*\n\n/, '');
            
            setTimeout(() => {
              saveAsPDF(filename, htmlContent, item.url);
            }, index * 500);
          });
          setStatus({ message: `Memulai unduhan ${uniqueMarkdowns.length} file PDF terpisah`, type: 'success' });
        }
      } else {
        // Save as Markdown (original behavior)
        if (saveMerged) {
          if (splitMergedFiles && urlsPerFile > 0) {
            // Split into multiple merged files
            const totalFiles = Math.ceil(uniqueMarkdowns.length / urlsPerFile);
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            
            for (let i = 0; i < totalFiles; i++) {
              const startIdx = i * urlsPerFile;
              const endIdx = Math.min(startIdx + urlsPerFile, uniqueMarkdowns.length);
              const chunk = uniqueMarkdowns.slice(startIdx, endIdx);
              
              const mergedContent = chunk
                .map(item => `## ${item.url}\n\n${item.markdown}`)
                .join('\n\n---\n\n');
              
              const filename = `merged_urls_${timestamp}_part${i + 1}of${totalFiles}.md`;
              
              setTimeout(() => {
                downloadFile(filename, mergedContent);
              }, i * 200);
            }
            
            setStatus({ 
              message: `Menyimpan ${uniqueMarkdowns.length} URL unik sebagai ${totalFiles} file gabungan (${urlsPerFile} URL per file)`, 
              type: 'success' 
            });
          } else {
            // Save all as one merged file
            const mergedContent = uniqueMarkdowns
              .map(item => `## ${item.url}\n\n${item.markdown}`)
              .join('\n\n---\n\n');
            
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `merged_urls_${timestamp}.md`;
            downloadFile(filename, mergedContent);
            setStatus({ message: `Menyimpan ${uniqueMarkdowns.length} URL unik sebagai file gabungan: ${filename}`, type: 'success' });
          }
        } else {
          // Save each URL as separate file
          uniqueMarkdowns.forEach((item, index) => {
            const filename = generateFilenameFromUrl(item.url);
            const content = `# ${item.url}\n\n${item.markdown}`;
            
            setTimeout(() => {
              downloadFile(filename, content);
            }, index * 200);
          });
          setStatus({ message: `Memulai unduhan ${uniqueMarkdowns.length} file terpisah`, type: 'success' });
        }
      }
    } else if (urlsFromFile.length === 0 && lastProcessedUrl && markdownResult && !markdownResult.startsWith("Error:")) {
      // Single manual URL result
      if (saveFormat === 'pdf') {
        const filename = generateFilenameFromUrl(lastProcessedUrl).replace('.md', '.pdf');
        const currentItem = processedMarkdowns.length > 0 ? processedMarkdowns[processedMarkdowns.length - 1] : null;
        const htmlContent = currentItem?.html || markdownResult.replace(/^# .*\n\n/, '');
        saveAsPDF(filename, htmlContent, lastProcessedUrl);
        setStatus({ message: `Tersimpan sebagai PDF: ${filename}`, type: 'success' });
      } else {
        const filename = generateFilenameFromUrl(lastProcessedUrl);
        const content = `# ${lastProcessedUrl}\n\n${markdownResult}`;
        downloadFile(filename, content);
        setStatus({ message: `Tersimpan: ${filename}`, type: 'success' });
      }
    } else {
      setStatus({ message: 'Tidak ada konten yang tersedia untuk disimpan.', type: 'warning' });
    }
  };

  // Handle manual URL processing (Process Only - no crawl)
  const handleProcessManualUrl = useCallback(async (url) => {
    const normalized = !/^https?:\/\//i.test(url) ? `https://${url}` : url;
    // Note: processSingleUrl is currently not memoized as it has many dependencies
    const result = await processSingleUrl(normalized, false);
    if (result) {
      setMarkdownResult(result.markdown);
      if (result.error) {
        setStatus({ message: `Error: ${result.error}`, type: 'error' });
      } else {
        setStatus({ message: `Berhasil memproses: ${normalized}`, type: 'success' });
      }
    }
  }, [processSingleUrl]);

  // Handle Crawl & Process
  const handleCrawlAndProcess = useCallback(async (url) => {
    try {
      let normalized = url;
      if (!/^https?:\/\//i.test(url)) normalized = `https://${url}`;
      const urlObj = new URL(normalized);
      
      // Reset stats
      setCrawlStats({ wasmCount: 0, domCount: 0, wasmTime: 0, domTime: 0 });
      
      setStatus({ message: `Mencari semua halaman di ${urlObj.origin} (kedalaman maksimal: ${maxCrawlDepth})...`, type: 'info' });
      // Note: crawlUrlsDeep uses state (maxCrawlLinks)
      const discovered = await crawlUrlsDeep(urlObj.origin, maxCrawlDepth);

      if (!discovered || !discovered.urls || discovered.urls.length === 0) {
        setStatus({ message: `Tidak menemukan halaman. Memproses root: ${normalized}`, type: 'info' });
        const result = await processSingleUrl(normalized, false);
        if (result) {
          setMarkdownResult(result.markdown);
          if (result.error) {
            setStatus({ message: `Error: ${result.error}`, type: 'error' });
          } else {
            setStatus({ message: `Berhasil memproses: ${normalized}`, type: 'success' });
          }
        }
        return;
      }

      // Show discovered paths for user selection
      setDiscoveredPaths(discovered.urls);
      setSelectedPaths(discovered.urls.map((_, idx) => idx)); // Select all by default
      setShowPathSelection(true);
      
      let message = `Ditemukan ${discovered.urls.length} halaman`;
      if (discovered.totalFound > discovered.urls.length) {
        message += ` (dibatasi dari ${discovered.totalFound} total)`;
      }
      if (discovered.pdfCount > 0) {
        message += ` termasuk ${discovered.pdfCount} PDF`;
      }
      message += `. Dikunjungi ${discovered.visited} halaman selama crawling.`;
      
      setStatus({ message: message + ' Silakan pilih untuk diproses.', type: 'success' });
    } catch (err) {
      console.warn('handleCrawlAndProcess: error', err);
      setStatus({ message: `Error: ${err.message}`, type: 'error' });
    }
  }, [maxCrawlDepth, crawlUrlsDeep, processSingleUrl]);

  // Start processing selected paths
  const handleProcessSelectedPaths = useCallback(async () => {
    const selectedUrls = selectedPaths.map(idx => discoveredPaths[idx]);
    
    // Separate PDFs and HTML pages
    const pdfUrls = selectedUrls.filter(url => url.toLowerCase().endsWith('.pdf'));
    const htmlUrls = selectedUrls.filter(url => !url.toLowerCase().endsWith('.pdf'));
    
    // Download PDFs directly
    if (pdfUrls.length > 0) {
      setStatus({ message: `Mengunduh ${pdfUrls.length} file PDF...`, type: 'info' });
      pdfUrls.forEach((pdfUrl, index) => {
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = pdfUrl;
          link.download = pdfUrl.split('/').pop() || `document_${index}.pdf`;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, index * 300);
      });
    }
    
    // Process HTML pages
    if (htmlUrls.length > 0) {
      setUrlsFromFile(htmlUrls);
      setProcessedMarkdowns([]);
      setCurrentProcessingIndex(0);
      setShowPathSelection(false);
      setStatus({ message: `Memproses ${htmlUrls.length} halaman HTML...`, type: 'info' });
      await startProcessingAll();
    } else if (pdfUrls.length > 0) {
      setShowPathSelection(false);
      setStatus({ message: `Selesai mengunduh ${pdfUrls.length} file PDF.`, type: 'success' });
    }
  }, [selectedPaths, discoveredPaths, startProcessingAll]);

  // Toggle path selection
  const handleTogglePathSelection = useCallback((index) => {
    setSelectedPaths(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index].sort((a, b) => a - b);
      }
    });
  }, []);

  // Select/deselect all paths
  const handleToggleAllPaths = useCallback(() => {
    if (selectedPaths.length === discoveredPaths.length) {
      setSelectedPaths([]);
    } else {
      setSelectedPaths(discoveredPaths.map((_, idx) => idx));
    }
  }, [selectedPaths.length, discoveredPaths.length, discoveredPaths]);


  // Handle file processing
  const handleProcessFile = useCallback((urls) => {
    setUrlsFromFile(urls);
    setProcessedMarkdowns([]);
    setCurrentProcessingIndex(0);
    setStatus({ message: `Memuat ${urls.length} URL dari file. Klik "Mulai Memproses Semua" untuk memulai.`, type: 'info' });
  }, []);

  const hasAnyProcessedContent = () => {
    if (urlsFromFile.length > 0 && processedMarkdowns.length > 0) {
        return processedMarkdowns.some(item => item && !item.error && item.markdown && !item.markdown.startsWith("Error:"));
    }
    return !!(markdownResult && !markdownResult.startsWith("Error:") && lastProcessedUrl);
  };

  // Enhanced pause/resume functionality (from renderer.js)
  const togglePauseResume = () => {
    if (!isProcessingMultiple && !(isPaused && urlsFromFile.length > 0 && currentProcessingIndex < urlsFromFile.length)) {
      return; // Can't pause if not processing
    }
    
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    if (!newPausedState && urlsFromFile.length > 0 && currentProcessingIndex < urlsFromFile.length) {
      setStatus({ message: 'Melanjutkan pemrosesan...', type: 'info' });
      startProcessingAll();
    } else if (newPausedState) {
      setStatus({ message: 'Pemrosesan dijeda. Klik Lanjutkan untuk melanjutkan.', type: 'warning' });
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Konverter URL ke Markdown</h1>
      </header>
      <main>
        <div className="controls-section">
          <StatusDisplay message={status.message} type={status.type} />
          <UrlInputPanel
            onProcessUrl={handleProcessManualUrl}
            onCrawlAndProcess={handleCrawlAndProcess}
            onProcessFile={handleProcessFile}
            disabled={!wasmInitialized || (isProcessingMultiple && !isPaused)}
          />
          
          {showPathSelection && discoveredPaths.length > 0 && (
            <div className="path-selection-panel">
              <h3>Halaman Ditemukan ({discoveredPaths.length} total)</h3>
              {crawlProgress.total > 0 && (
                <div className="crawl-progress">
                  <p>Progress Crawling: {crawlProgress.current} halaman di-crawl (kedalaman: {crawlProgress.depth})</p>
                </div>
              )}
              <div className="selection-controls">
                <button onClick={handleToggleAllPaths} className="toggle-all-button">
                  {selectedPaths.length === discoveredPaths.length ? 'Deselect All' : 'Select All'}
                </button>
                <button 
                  onClick={handleProcessSelectedPaths} 
                  disabled={selectedPaths.length === 0}
                  className="process-selected-button"
                >
                  Proses {selectedPaths.length} Terpilih
                </button>
                <button 
                  onClick={() => setShowPathSelection(false)}
                  className="cancel-button"
                >
                  Batal
                </button>
              </div>
              <div className="paths-list">
                {discoveredPaths.map((path, index) => (
                  <div key={index} className="path-item">
                    <input
                      type="checkbox"
                      checked={selectedPaths.includes(index)}
                      onChange={() => handleTogglePathSelection(index)}
                      id={`path-${index}`}
                    />
                    <label htmlFor={`path-${index}`}>
                      {path.endsWith('.pdf') && <span className="pdf-badge">PDF</span>}
                      {path}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <ControlsPanel
              isProcessing={isProcessingMultiple && urlsFromFile.length > 0 && currentProcessingIndex < urlsFromFile.length}
              isPaused={isPaused}
              onStartProcessingAll={startProcessingAll}
              onTogglePauseResume={togglePauseResume}
              canStartProcessing={urlsFromFile.length > 0 && !isProcessingMultiple && currentProcessingIndex === 0}
              onSaveMarkdown={handleSaveMarkdown}
              saveMerged={saveMerged}
              onToggleSaveMerged={handleToggleSaveMerged}
              splitMergedFiles={splitMergedFiles}
              onToggleSplitMerged={handleToggleSplitMerged}
              urlsPerFile={urlsPerFile}
              onUrlsPerFileChange={handleUrlsPerFileChange}
              hasProcessedContent={hasAnyProcessedContent()}
              maxRetries={maxRetries}
              onMaxRetriesChange={handleMaxRetriesChange}
              maxCrawlLinks={maxCrawlLinks}
              onMaxCrawlLinksChange={handleMaxCrawlLinksChange}
              maxCrawlDepth={maxCrawlDepth}
              onMaxCrawlDepthChange={handleMaxCrawlDepthChange}
              concurrency={concurrency}
              onConcurrencyChange={handleConcurrencyChange}
              saveFormat={saveFormat}
              onSaveFormatChange={handleSaveFormatChange}
          />
          {processedMarkdowns.length > 0 && urlsFromFile.length > 0 && (
            <div className="processed-list">
              <h3>URL dari File yang Diproses ({processedMarkdowns.filter(item => item && !item.error).length}/{urlsFromFile.length} berhasil):</h3>
              <ul>
                {processedMarkdowns.map((item, index) => (
                  <li key={index} className={item.error ? 'error-item' : 'success-item'}>
                    <strong>{item.url}</strong>: {item.error ? `Error - ${item.error}` : 'Berhasil'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="preview-section">
          <PreviewPanel
            markdownContent={markdownResult}
            lastProcessedUrl={lastProcessedUrl}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
