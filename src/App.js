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
    return (urlStr.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50) || "invalid_url") + ".md";
  }
}


function App() {
  const [wasmInitialized, setWasmInitialized] = useState(false);
  const [status, setStatus] = useState({ message: 'Initializing WASM...', type: 'info' });
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
        setStatus({ message: 'Loading WASM module...', type: 'info' });
        
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
              setStatus({ message: 'WASM initialized successfully. Ready to process URLs.', type: 'success' });
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
          throw new Error(`Failed to fetch WASM: ${wasmResponse.status}`);
        }
        
        // eslint-disable-next-line no-unused-vars
        const wasmBytes = await wasmResponse.arrayBuffer();
        
        // For now, let's use a JavaScript fallback since the WASM loading is complex
        // This will ensure the app works while we fix the WASM integration
        console.warn('Using JavaScript fallback for HTML to Markdown conversion');
        
        window.process_html_to_markdown = (html, url) => {
          // Enhanced JavaScript-based HTML to markdown conversion
          let markdown = `# Content from: ${url}\n\n`;
          
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
        setStatus({ message: 'Ready to process URLs (using JavaScript fallback).', type: 'warning' });} catch (err) {
        console.error("Error initializing WASM module:", err);
        // Fallback to JavaScript-based conversion
        window.process_html_to_markdown = (html, url) => {
          // Simple HTML to markdown conversion as fallback
          let markdown = `# Content from: ${url}\n\n`;
          
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
        setStatus({ message: 'Using fallback JavaScript conversion. Ready to process URLs.', type: 'warning' });
      }
    };
    
    loadWasm();
  }, []);
  // Enhanced error handling and retry mechanism (from renderer.js)
  const processSingleUrl = async (url, isFromFile = false, maxRetriesOverride = null) => {
    const retriesToUse = maxRetriesOverride !== null ? maxRetriesOverride : maxRetries;
    if (!wasmInitialized) {
      setStatus({ message: 'WASM not initialized yet. Please wait.', type: 'error' });
      return null;
    }
    if (!url || !url.trim()) {
      if (!isFromFile) setStatus({ message: 'Invalid URL provided.', type: 'error' });
      return { url, markdown: 'Error: Invalid URL', error: 'Invalid URL' };
    }

    setStatus({ message: `Fetching: ${url}...`, type: 'info' });
    if (!isFromFile) setLastProcessedUrl(url);    let attempts = 0;
    let success = false;

    while (attempts < retriesToUse && !success) {
      try {
        attempts++;
        setStatus({ message: `Processing: ${url} (attempt ${attempts}/${retriesToUse})...`, type: 'info' });
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const htmlContent = await response.text();
        
        setStatus({ message: `Converting: ${url} to markdown...`, type: 'info' });
        const markdown = window.process_html_to_markdown(htmlContent, url);
        
        success = true;
        return { url, markdown };
      } catch (error) {
        console.error(`Error processing ${url} (attempt ${attempts}):`, error);
        let errorMessage = error.message;
        
        // Enhanced error categorization (from renderer.js)
        if (error instanceof TypeError && error.message === "Failed to fetch") {
          errorMessage = "CORS issue or network problem - try a different URL or use a proxy";
        } else if (error.message.includes("HTTP error! status: 404")) {
          errorMessage = "Page not found (404)";
        } else if (error.message.includes("HTTP error! status: 403")) {
          errorMessage = "Access forbidden (403)";
        } else if (error.message.includes("HTTP error! status: 500")) {
          errorMessage = "Server error (500)";        }
        
        if (attempts >= retriesToUse) {
          if (!isFromFile) setStatus({ message: `Error processing ${url}: ${errorMessage}`, type: 'error' });
          return { url, markdown: `Error: ${errorMessage}`, error: errorMessage };
        }
        
        // Add delay between retries (from renderer.js pattern)
        if (attempts < retriesToUse) {
          setStatus({ message: `Retrying ${url} in ${Math.pow(2, attempts)} seconds... (${attempts}/${retriesToUse})`, type: 'warning' });
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
        }
      }
    }
  };

  // Enhanced file processing with progress tracking (from renderer.js)
  const startProcessingAll = async () => {
    if (currentProcessingIndex >= urlsFromFile.length && urlsFromFile.length > 0) {
        setStatus({ message: 'All URLs already processed.', type: 'info' });
        setIsProcessingMultiple(false);
        return;
    }
    if (urlsFromFile.length === 0) {
        setStatus({ message: 'No URLs loaded from file to process.', type: 'warning'});
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
        setStatus({ message: `Paused at URL ${i + 1}/${urlsFromFile.length}: ${urlsFromFile[i]}`, type: 'warning' });
        return;
      }
      
      const url = urlsFromFile[i];
      setLastProcessedUrl(url);
      setCurrentProcessingIndex(i + 1); // Update progress
      
      setStatus({ message: `Processing ${i + 1}/${urlsFromFile.length}: ${url}`, type: 'info' });
      
      const result = await processSingleUrl(url, true);
      tempProcessedMarkdowns.push(result);
      setProcessedMarkdowns([...tempProcessedMarkdowns]);
      setMarkdownResult(result.markdown);

      if (result.error) {
        setStatus({ message: `Error processing ${url}: ${result.error}`, type: 'error' });
      } else {
        setStatus({ message: `Successfully processed ${url}`, type: 'success' });
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
    
    let message = `Processing complete! ${successCount}/${tempProcessedMarkdowns.length} URLs processed successfully.`;
    if (errorCount > 0) {
      message += ` ${errorCount} URLs failed.`;
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
        setStatus({ message: 'No successful content to save.', type: 'warning' });
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
        setStatus({ message: `Saved ${successfulMarkdowns.length} URLs as merged file: ${filename}`, type: 'success' });
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
        setStatus({ message: `Initiated download of ${successfulMarkdowns.length} separate files`, type: 'success' });
      }
    } else if (urlsFromFile.length === 0 && lastProcessedUrl && markdownResult && !markdownResult.startsWith("Error:")) {
      // Single manual URL result
      const filename = generateFilenameFromUrl(lastProcessedUrl);
      const content = `# ${lastProcessedUrl}\n\n${markdownResult}`;
      downloadFile(filename, content);      setStatus({ message: `Saved: ${filename}`, type: 'success' });
    } else {
      setStatus({ message: 'No content available to save.', type: 'warning' });
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
        setStatus({ message: `Successfully processed: ${url}`, type: 'success' });
      }
    }
  };

  // Handle file processing
  const handleProcessFile = (urls) => {
    setUrlsFromFile(urls);
    setProcessedMarkdowns([]);
    setCurrentProcessingIndex(0);
    setStatus({ message: `Loaded ${urls.length} URLs from file. Click "Start Processing All" to begin.`, type: 'info' });
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
      setStatus({ message: 'Resuming processing...', type: 'info' });
      startProcessingAll();
    } else if (newPausedState) {
      setStatus({ message: 'Processing paused. Click Resume to continue.', type: 'warning' });
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>URL to Markdown Converter</h1>
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
              <h3>Processed URLs from File ({processedMarkdowns.filter(item => item && !item.error).length}/{urlsFromFile.length} successful):</h3>
              <ul>
                {processedMarkdowns.map((item, index) => (
                  <li key={index} className={item.error ? 'error-item' : 'success-item'}>
                    <strong>{item.url}</strong>: {item.error ? `Error - ${item.error}` : 'Success'}
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
