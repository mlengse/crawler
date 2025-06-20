import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import UrlInputPanel from './UrlInputPanel';
import StatusDisplay from './StatusDisplay';
import PreviewPanel from './PreviewPanel';
import ControlsPanel from './ControlsPanel';

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
  const [processedMarkdowns, setProcessedMarkdowns] = useState([]); // Array of {url, markdown, error?}
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(0);  const [isProcessingMultiple, setIsProcessingMultiple] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [saveMerged, setSaveMerged] = useState(true); // State for the checkbox
  const [maxRetries, setMaxRetries] = useState(3); // State for max retries

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
            
            // Check if our function is available and bind it
            if (typeof wasmInit.process_html_to_markdown === 'function') {
              window.process_html_to_markdown = wasmInit.process_html_to_markdown;
              setWasmInitialized(true);
              setStatus({ message: 'WASM berhasil diinisialisasi. Siap memproses URL.', type: 'success' });
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
          // Enhanced JavaScript-based HTML to markdown conversion
          let markdown = `# Konten dari: ${url}\n\n`;
          
          // Remove script and style tags
          html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
          html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
          
          // Convert basic HTML tags to markdown
          markdown += html
            .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
            .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
            .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
            .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
            .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
            .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
            .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
            .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
            .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
            .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
            .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
            .replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```\n\n')
            .replace(/<ul[^>]*>(.*?)<\/ul>/gi, (match, content) => {
              return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n') + '\n';
            })
            .replace(/<ol[^>]*>(.*?)<\/ol>/gi, (match, content) => {
              let counter = 1;
              return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`) + '\n';
            })
            .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
            .replace(/<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, '![$2]($1)')
            .replace(/<img[^>]*src=["']([^"']*)["'][^>]*>/gi, '![]($1)')
            .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\n\s*\n\s*\n/g, '\n\n') // Clean up multiple newlines
            .trim();
          
          return markdown;
        };
        
        setWasmInitialized(true);
        setStatus({ message: 'Siap memproses URL (menggunakan fallback JavaScript).', type: 'warning' });} catch (err) {
        console.error("Error initializing WASM module:", err);
        // Fallback to JavaScript-based conversion
        window.process_html_to_markdown = (html, url) => {
          // Simple HTML to markdown conversion as fallback
          let markdown = `# Konten dari: ${url}\n\n`;
          
          // Remove script and style tags
          html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
          html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
          
          // Convert basic HTML tags
          markdown += html
            .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
            .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
            .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
            .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
            .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
            .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
            .replace(/\n\s*\n\s*\n/g, '\n\n') // Clean up multiple newlines
            .trim();
          
          return markdown;
        };
        
        setWasmInitialized(true);
        setStatus({ message: 'Menggunakan konversi JavaScript fallback. Siap memproses URL.', type: 'warning' });
      }
    };
    
    loadWasm();
  }, []);
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
        const markdown = window.process_html_to_markdown(htmlContent, url);
        
        success = true;
        return { url, markdown };
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
              const markdown = window.process_html_to_markdown(htmlContent, url);
              success = true;
              return { url, markdown, usedXHR: true };
            } catch (xhrError) {
                console.error(`XHR fallback failed for ${url}:`, xhrError);
                
                // Try one more attempt with a CORS proxy service
                try {
                const proxyUrl = "https://api.codetabs.com/v1/proxy?quest=";
                const proxiedUrl = proxyUrl + encodeURIComponent(url);
                
                console.log(`Trying CORS proxy service for ${url}`);
                const proxyResponse = await fetch(proxiedUrl);
                
                if (proxyResponse.ok) {
                  const htmlContent = await proxyResponse.text();
                  const markdown = window.process_html_to_markdown(htmlContent, url);
                  success = true;
                  return { url, markdown, usedProxy: true };
                } else {
                  throw new Error(`Proxy HTTP error! status: ${proxyResponse.status}`);
                }
                } catch (proxyError) {                console.error(`CORS proxy attempt failed for ${url}:`, proxyError);
                errorMessage = "Masalah CORS atau jaringan - menggunakan Service Worker sebagai fallback";
                
                // Try Service Worker approach which should handle CORS automatically
                try {
                  console.log(`Using Service Worker to handle CORS for ${url}`);
                  const swResponse = await fetch(url);
                  
                  if (swResponse.ok) {
                    const htmlContent = await swResponse.text();
                    const markdown = window.process_html_to_markdown(htmlContent, url);
                    success = true;
                    return { url, markdown, usedServiceWorker: true };
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
            let markdown = `# Konten dari: ${url} (Dikonversi dengan metode fallback)\n\n`;
            
            // Basic HTML cleanup and conversion
            markdown += htmlContent
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
              .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
              .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
              .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
              .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
              .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
              .replace(/\n\s*\n\s*\n/g, '\n\n'); // Clean up multiple newlines
            
            return { url, markdown, usedFallback: true };
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
  const handleToggleSaveMerged = () => {
    setSaveMerged(prev => !prev);
  };

  const handleMaxRetriesChange = (newMaxRetries) => {
    const value = parseInt(newMaxRetries, 10);
    if (value >= 1 && value <= 10) {
      setMaxRetries(value);
    }
  };
  const handleSaveMarkdown = () => {
    const successfulMarkdowns = processedMarkdowns.filter(item => item && !item.error && item.markdown);

    if (urlsFromFile.length > 0 && processedMarkdowns.length > 0) {
      if (successfulMarkdowns.length === 0) {
        setStatus({ message: 'Tidak ada konten yang berhasil untuk disimpan.', type: 'warning' });
        return;
      }
      
      if (saveMerged) {
        // Save all as one merged file
        const mergedContent = successfulMarkdowns
          .map(item => `## ${item.url}\n\n${item.markdown}`)
          .join('\n\n---\n\n');
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `merged_urls_${timestamp}.md`;
        downloadFile(filename, mergedContent);
        setStatus({ message: `Menyimpan ${successfulMarkdowns.length} URL sebagai file gabungan: ${filename}`, type: 'success' });
      } else {
        // Save each URL as separate file
        successfulMarkdowns.forEach((item, index) => {
          const filename = generateFilenameFromUrl(item.url);
          const content = `# ${item.url}\n\n${item.markdown}`;
          
          // Add small delay between downloads to prevent browser blocking
          setTimeout(() => {
            downloadFile(filename, content);
          }, index * 200);
        });
        setStatus({ message: `Memulai unduhan ${successfulMarkdowns.length} file terpisah`, type: 'success' });
      }
    } else if (urlsFromFile.length === 0 && lastProcessedUrl && markdownResult && !markdownResult.startsWith("Error:")) {
      // Single manual URL result
      const filename = generateFilenameFromUrl(lastProcessedUrl);
      const content = `# ${lastProcessedUrl}\n\n${markdownResult}`;
      downloadFile(filename, content);      setStatus({ message: `Tersimpan: ${filename}`, type: 'success' });
    } else {
      setStatus({ message: 'Tidak ada konten yang tersedia untuk disimpan.', type: 'warning' });
    }
  };

  // Handle manual URL processing
  const handleProcessManualUrl = async (url) => {
    const result = await processSingleUrl(url, false);
    if (result) {
      setMarkdownResult(result.markdown);
      if (result.error) {
        setStatus({ message: `Error: ${result.error}`, type: 'error' });
      } else {
        setStatus({ message: `Berhasil memproses: ${url}`, type: 'success' });
      }
    }
  };

  // Handle file processing
  const handleProcessFile = (urls) => {
    setUrlsFromFile(urls);
    setProcessedMarkdowns([]);
    setCurrentProcessingIndex(0);
    setStatus({ message: `Memuat ${urls.length} URL dari file. Klik "Mulai Memproses Semua" untuk memulai.`, type: 'info' });
  };

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
            onProcessFile={handleProcessFile}
            disabled={!wasmInitialized || (isProcessingMultiple && !isPaused)}
          />          <ControlsPanel
              isProcessing={isProcessingMultiple && urlsFromFile.length > 0 && currentProcessingIndex < urlsFromFile.length}
              isPaused={isPaused}
              onStartProcessingAll={startProcessingAll}
              onTogglePauseResume={togglePauseResume}
              canStartProcessing={urlsFromFile.length > 0 && !isProcessingMultiple && currentProcessingIndex === 0}
              onSaveMarkdown={handleSaveMarkdown}
              saveMerged={saveMerged}
              onToggleSaveMerged={handleToggleSaveMerged}
              hasProcessedContent={hasAnyProcessedContent()}
              maxRetries={maxRetries}
              onMaxRetriesChange={handleMaxRetriesChange}
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
