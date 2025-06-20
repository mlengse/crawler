import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import init, { process_html_to_markdown } from 'rust_backend';
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
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(0);
  const [isProcessingMultiple, setIsProcessingMultiple] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [saveMerged, setSaveMerged] = useState(true); // State for the checkbox

  const processingPausedRef = useRef(isPaused);
  useEffect(() => { processingPausedRef.current = isPaused; }, [isPaused]);  useEffect(() => {
    init()
      .then(() => {
        setWasmInitialized(true);
        setStatus({ message: 'WASM initialized. Ready to process URLs.', type: 'success' });
      })
      .catch(err => {
        console.error("Error initializing WASM module:", err);
        setStatus({ message: `Error initializing WASM: ${err}`, type: 'error' });
      });
  }, []);

  const processSingleUrl = async (url, isFromFile = false) => {
    if (!wasmInitialized) {
      setStatus({ message: 'WASM not initialized yet. Please wait.', type: 'error' });
      return null;
    }
    if (!url || !url.trim()) {
      // Skip empty lines silently if from file, error if manual
      if (!isFromFile) setStatus({ message: 'Invalid URL provided.', type: 'error' });
      return { url, markdown: 'Error: Invalid URL', error: 'Invalid URL' };
    }

    setStatus({ message: `Fetching: ${url}...`, type: 'info' });
    if (!isFromFile) setLastProcessedUrl(url); // Only update this for manual or current in batch

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const htmlContent = await response.text();

      setStatus({ message: `Processing: ${url} with WASM...`, type: 'info' });
      const markdown = process_html_to_markdown(htmlContent, url);

      if (!isFromFile) setMarkdownResult(markdown);
      // setStatus({ message: `Successfully processed: ${url}`, type: 'success' }); // Status will be set by calling function
      return { url, markdown };
    } catch (error) {
      console.error(`Error processing ${url}:`, error);
      let errorMessage = error.message;
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        errorMessage = "CORS issue or network problem.";
      }
      if (!isFromFile) setMarkdownResult(`Error processing ${url}: ${errorMessage}`);
      // setStatus({ message: `Error processing ${url}: ${errorMessage}`, type: 'error' });
      return { url, markdown: `Error: ${errorMessage}`, error: errorMessage };
    }
  };

  const handleProcessManualUrl = async (url) => {
    setIsProcessingMultiple(false);
    setUrlsFromFile([]);
    setProcessedMarkdowns([]); // Clear previous batch results
    setMarkdownResult(''); // Clear previous single result
    setLastProcessedUrl(url);
    const result = await processSingleUrl(url, false);
    if (result && !result.error) {
        setMarkdownResult(result.markdown);
        setStatus({ message: `Successfully processed: ${url}`, type: 'success' });
    } else if (result && result.error) {
        setStatus({ message: `Error processing ${url}: ${result.error}`, type: 'error' });
    }
  };

  const handleProcessFile = async (file) => {
    setStatus({ message: `Reading file: ${file.name}...`, type: 'info' });
    setMarkdownResult(''); // Clear single result preview
    setLastProcessedUrl('');
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target.result;
      const urls = content.split(/\r?\n/).map(url => url.trim()).filter(url => url);
      if (urls.length === 0) {
        setStatus({ message: 'No URLs found in the file.', type: 'warning' });
        return;
      }
      setUrlsFromFile(urls);
      setProcessedMarkdowns([]);
      setCurrentProcessingIndex(0);
      setIsProcessingMultiple(false); // Not processing yet, just loaded
      setIsPaused(false);
      setStatus({ message: `Loaded ${urls.length} URLs from ${file.name}. Click 'Start Processing File URLs'.`, type: 'info' });
    };
    reader.onerror = () => {
      setStatus({ message: 'Failed to read file.', type: 'error' });
    };
    reader.readAsText(file);
  };

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
    // If starting from scratch, clear previous results for this batch
    if (currentProcessingIndex === 0 && tempProcessedMarkdowns.some(item => urlsFromFile.includes(item.url))) {
        tempProcessedMarkdowns = [];
        setProcessedMarkdowns([]);
    }


    for (let i = currentProcessingIndex; i < urlsFromFile.length; i++) {
      if (processingPausedRef.current) {
        setCurrentProcessingIndex(i);
        setStatus({ message: `Processing paused at URL ${i + 1}/${urlsFromFile.length}.`, type: 'warning' });
        return;
      }
      const url = urlsFromFile[i];
      setLastProcessedUrl(url); // Update preview for current URL
      const result = await processSingleUrl(url, true);
      tempProcessedMarkdowns.push(result); // Accumulate results
      setProcessedMarkdowns([...tempProcessedMarkdowns]); // Update state reactively
      setMarkdownResult(result.markdown); // Show current one in preview

      if (result.error) {
        setStatus({ message: `Error processing ${url}: ${result.error} (${i+1}/${urlsFromFile.length})`, type: 'error' });
      } else {
        setStatus({ message: `Successfully processed: ${url} (${i+1}/${urlsFromFile.length})`, type: 'success' });
      }

      if (i === urlsFromFile.length - 1) {
        setStatus({ message: 'All URLs from file processed.', type: 'success' });
        setIsProcessingMultiple(false);
        setCurrentProcessingIndex(0);
        return;
      }
      // Small delay between fetches if needed, e.g., await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  const togglePauseResume = () => {
    if (!isProcessingMultiple && !(isPaused && urlsFromFile.length > 0 && currentProcessingIndex < urlsFromFile.length) ) return; // Allow resume even if not currently "processing" but was paused mid-batch
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    if (!newPausedState && urlsFromFile.length > 0 && currentProcessingIndex < urlsFromFile.length) {
      setStatus({ message: 'Resuming processing...', type: 'info' });
      startProcessingAll();
    } else if (newPausedState) {
      setStatus({ message: `Processing paused. ${urlsFromFile.length - currentProcessingIndex} URLs remaining.`, type: 'warning' });
    }
  };

  const handleToggleSaveMerged = () => {
    setSaveMerged(prev => !prev);
  };

  const handleSaveMarkdown = () => {
    const successfulMarkdowns = processedMarkdowns.filter(item => item && !item.error && item.markdown);

    if (urlsFromFile.length > 0 && processedMarkdowns.length > 0) { // Processing from file and has results
      if (successfulMarkdowns.length === 0) {
        setStatus({ message: "No successful Markdown content from file to save.", type: 'warning' });
        return;
      }
      if (saveMerged) {
        const mergedContent = successfulMarkdowns.map(item => `## ${item.url}\n\n${item.markdown}`).join('\n\n---\n\n');
        downloadFile('merged_markdown.md', mergedContent);
        setStatus({ message: 'Merged Markdown saved.', type: 'success' });
      } else {
        successfulMarkdowns.forEach(item => {
          downloadFile(generateFilenameFromUrl(item.url), item.markdown);
        });
        setStatus({ message: `Saved ${successfulMarkdowns.length} separate Markdown files.`, type: 'success' });
      }
    } else if (urlsFromFile.length === 0 && lastProcessedUrl && markdownResult && !markdownResult.startsWith("Error:")) { // Processing single manual URL that was successful
      downloadFile(generateFilenameFromUrl(lastProcessedUrl), markdownResult);
      setStatus({ message: 'Markdown for single URL saved.', type: 'success' });
    } else {
       setStatus({ message: "No successful Markdown content to save.", type: 'warning' });
    }
  };

  const hasAnyProcessedContent = () => {
    if (urlsFromFile.length > 0 && processedMarkdowns.length > 0) { // Check if there are results from file processing
        return processedMarkdowns.some(item => item && !item.error && item.markdown);
    }
    // Check for single manual URL result
    return !!(markdownResult && !markdownResult.startsWith("Error:") && lastProcessedUrl);
  };


  return (
    <div className="App">
      <header className="App-header">
        <h1>URL to Markdown Converter (React + WASM)</h1>
      </header>
      <main>
        <StatusDisplay message={status.message} type={status.type} />
        <UrlInputPanel
          onProcessUrl={handleProcessManualUrl}
          onProcessFile={handleProcessFile}
          disabled={!wasmInitialized || (isProcessingMultiple && !isPaused)}
        />
        <ControlsPanel
            isProcessing={isProcessingMultiple && urlsFromFile.length > 0 && currentProcessingIndex < urlsFromFile.length} // More precise isProcessing
            isPaused={isPaused}
            onStartProcessingAll={startProcessingAll}
            onTogglePauseResume={togglePauseResume}
            canStartProcessing={urlsFromFile.length > 0 && !isProcessingMultiple && currentProcessingIndex === 0}
            onSaveMarkdown={handleSaveMarkdown}
            saveMerged={saveMerged}
            onToggleSaveMerged={handleToggleSaveMerged}
            hasProcessedContent={hasAnyProcessedContent()}
        />
        <PreviewPanel
          markdownContent={markdownResult}
          lastProcessedUrl={lastProcessedUrl}
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
      </main>
    </div>
  );
}
export default App;
