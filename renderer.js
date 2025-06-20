// State Variables
let selectedFilePath = null;
let statusMessageText = "Welcome!";
let statusMessageType = "status-info"; // 'status-info', 'status-success', 'status-error', 'status-warning'
let urlsToProcess = [];
let processedMarkdowns = []; // Stores {url: originalUrl, markdown: contentOrError}
let isProcessing = false;
let currentProcessingUrlIndex = 0;
let aggregatedMarkdown = null;
let isPaused = false;
let lastMarkdownPreview = "";
let saveMerged = true;
let manualUrlText = "";
let isRenderedMode = false; // Toggle between raw markdown and rendered HTML

// DOM Element References
const openFileBtn = document.getElementById('openFileBtn');
const filePathDisplay = document.getElementById('filePath');
const startProcessingBtn = document.getElementById('startProcessingBtn');
const manualUrlInput = document.getElementById('manualUrlInput');
const processManualUrlBtn = document.getElementById('processManualUrlBtn');
const pauseResumeBtn = document.getElementById('pauseResumeBtn');
const saveMergedCheckbox = document.getElementById('saveMergedCheckbox');
const saveMarkdownBtn = document.getElementById('saveMarkdownBtn');
const markdownPreview = document.getElementById('markdownPreview');
const statusMessageDisplay = document.getElementById('statusMessage');
const lastCrawledUrlDisplay = document.getElementById('lastCrawledUrl');
const togglePreviewBtn = document.getElementById('togglePreviewBtn');
const renderedPreview = document.getElementById('renderedPreview');

// --- UI Update Function ---
function updateUI() {
  statusMessageDisplay.textContent = statusMessageText;
  statusMessageDisplay.className = statusMessageType; // Apply class for styling

  filePathDisplay.textContent = selectedFilePath ? selectedFilePath : "No file selected.";
    // Update preview to show only the last crawled URL's content
  if (processedMarkdowns.length > 0) {
    const lastProcessed = processedMarkdowns[processedMarkdowns.length - 1];
    markdownPreview.value = lastProcessed.markdown;
    lastCrawledUrlDisplay.textContent = lastProcessed.url;
  } else {
    markdownPreview.value = lastMarkdownPreview;
    lastCrawledUrlDisplay.textContent = "No URL processed yet";
  }
  
  // Update preview display based on current mode
  updatePreviewDisplay();

  openFileBtn.disabled = isProcessing;
  startProcessingBtn.disabled = isProcessing || !selectedFilePath || urlsToProcess.length === 0;

  processManualUrlBtn.disabled = isProcessing || manualUrlText.trim() === "";

  const hasContentToSave = processedMarkdowns.filter(item => !item.markdown.startsWith("Error processing")).length > 0;
  saveMarkdownBtn.disabled = isProcessing || !hasContentToSave;

  saveMergedCheckbox.checked = saveMerged;
  saveMergedCheckbox.disabled = isProcessing;
  manualUrlInput.disabled = isProcessing;

  if (isProcessing) {
    pauseResumeBtn.disabled = false;
    pauseResumeBtn.textContent = isPaused ? "Resume" : "Pause";
    pauseResumeBtn.classList.toggle('resume', isPaused); // Add/remove 'resume' class
    // Add 'processing' class to buttons that should indicate activity
    startProcessingBtn.classList.add('processing');
    processManualUrlBtn.classList.add('processing');
  } else {
    pauseResumeBtn.disabled = true;
    pauseResumeBtn.textContent = "Pause";
    pauseResumeBtn.classList.remove('resume');
    startProcessingBtn.classList.remove('processing');
    processManualUrlBtn.classList.remove('processing');
  }

  // Update last crawled URL display
  if (urlsToProcess.length > 0 && currentProcessingUrlIndex > 0) {
    const lastCrawledUrl = urlsToProcess[currentProcessingUrlIndex - 1];
    lastCrawledUrlDisplay.textContent = `Last Crawled URL: ${lastCrawledUrl}`;
    lastCrawledUrlDisplay.classList.remove('hidden');
  } else {
    lastCrawledUrlDisplay.classList.add('hidden');
  }
}

// Helper to set status
function setStatus(message, type = 'status-info') {
    statusMessageText = message;
    statusMessageType = type;
    updateUI();
}

// Function to update preview display based on mode
function updatePreviewDisplay() {
  if (isRenderedMode) {
    markdownPreview.style.display = 'none';
    renderedPreview.style.display = 'block';
    togglePreviewBtn.textContent = '🖥️ Rendered';
    togglePreviewBtn.classList.add('rendered');
    
    // Convert markdown to HTML
    const markdownContent = markdownPreview.value;
    if (markdownContent.trim()) {
      try {
        const htmlContent = marked.parse(markdownContent);
        renderedPreview.innerHTML = htmlContent;
      } catch (error) {
        renderedPreview.innerHTML = '<p style="color: red;">Error rendering markdown: ' + error.message + '</p>';
      }
    } else {
      renderedPreview.innerHTML = '<p style="color: #666; font-style: italic;">No content to preview</p>';
    }
  } else {
    markdownPreview.style.display = 'block';
    renderedPreview.style.display = 'none';
    togglePreviewBtn.textContent = '📝 Raw';
    togglePreviewBtn.classList.remove('rendered');
  }
}

// --- Event Listeners ---

togglePreviewBtn.addEventListener('click', () => {
  isRenderedMode = !isRenderedMode;
  updatePreviewDisplay();
});

manualUrlInput.addEventListener('input', (event) => {
  manualUrlText = event.target.value;
  updateUI();
});

saveMergedCheckbox.addEventListener('change', (event) => {
  saveMerged = event.target.checked;
  if (!isProcessing && processedMarkdowns.length > 0) {
    const successfulMarkdowns = processedMarkdowns.filter(item => !item.markdown.startsWith("Error processing"));
    if (saveMerged) {
      aggregatedMarkdown = successfulMarkdowns.map(item => `## ${item.url}\n\n${item.markdown}`).join('\n\n---\n\n');
      // Preview still shows last individual URL, not merged content
    } else {
      aggregatedMarkdown = null;
      // Preview still shows last individual URL
    }
  }
  updateUI();
});

// --- Core URL Processing Logic ---

function generateFilenameFromUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    let hostname = url.hostname;
    let pathname = url.pathname;
    pathname = pathname.replace(/^\/+|\/+$/g, '');
    let filename = `${hostname}_${pathname}`;
    filename = filename.replace(/[\/\?%*:|"<>]/g, '_').replace(/__+/g, '_').replace(/^_|_$/g, '');
    if (filename.length > 200) filename = filename.substring(0, 200);
    return (filename || "default_filename") + ".md"; // Ensure .md extension
  } catch (e) {
    return (urlStr.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50) || "invalid_url") + ".md";
  }
}

async function processNextUrl() {
  if (isPaused) {
    setStatus(`Paused. Waiting to resume processing of ${urlsToProcess[currentProcessingUrlIndex] || 'next URL'}.`, 'status-warning');
    return;
  }

  if (currentProcessingUrlIndex < urlsToProcess.length) {
    const originalUrl = urlsToProcess[currentProcessingUrlIndex];
    setStatus(`Processing URL (${currentProcessingUrlIndex + 1}/${urlsToProcess.length}): ${originalUrl}`, 'status-info');

    const apiUrl = `https://urltomarkdown.herokuapp.com/?url=${encodeURIComponent(originalUrl)}&title=true&links=true&clean=true`;
    let attempts = 0;
    const maxRetries = 10;
    let success = false;

    while (attempts < maxRetries && !success) {
      try {
        const response = await fetch(apiUrl);
        if (response.ok) {
          const text = await response.text();
          processedMarkdowns.push({ url: originalUrl, markdown: text });
          success = true;
        } else if (response.status === 429 || response.status >= 500) {
          attempts++;
          setStatus(`Error ${response.status} for ${originalUrl}. Attempt ${attempts}/${maxRetries}. Retrying...`, 'status-warning');
          if (attempts < maxRetries) await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
          else throw new Error(`Failed after ${maxRetries} retries. Status: ${response.status}`);
        } else {
           processedMarkdowns.push({ url: originalUrl, markdown: `Error processing ${originalUrl}: HTTP status ${response.status}` });
           throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (error) {
        attempts++;
        setStatus(`Fetch error for ${originalUrl}: ${error.message}. Attempt ${attempts}/${maxRetries}.`, 'status-error');
        if (attempts >= maxRetries) {
          // Check if already pushed an error markdown for this URL
          if (!processedMarkdowns.find(pm => pm.url === originalUrl && pm.markdown.startsWith("Error processing"))) {
             processedMarkdowns.push({ url: originalUrl, markdown: `Error processing ${originalUrl}: ${error.message}` });
          }
          break;
        }
        if (attempts < maxRetries) await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }    }
    lastMarkdownPreview = processedMarkdowns.map(p => `## ${p.url}\n\n${p.markdown}`).join("\n\n---\n\n");
    updateUI(); // Update preview after each URL is processed to show the latest

    currentProcessingUrlIndex++;
    if (!isPaused) processNextUrl();
    else {
        setStatus(`Paused after processing ${originalUrl}.`, 'status-warning');
    }
  } else {
    processingComplete();
  }
}

function processingComplete() {
  isProcessing = false;
  isPaused = false;
  const successfulCount = processedMarkdowns.filter(item => !item.markdown.startsWith("Error processing")).length;
  const errorCount = processedMarkdowns.length - successfulCount;

  let message = `Processing complete. ${successfulCount} URL(s) processed successfully.`;
  if (errorCount > 0) {
    message += ` ${errorCount} URL(s) failed.`;
    setStatus(message, 'status-warning');
  } else {
    setStatus(message, 'status-success');
  }

  const successfulMarkdowns = processedMarkdowns.filter(item => !item.markdown.startsWith("Error processing"));
  if (saveMerged) {
    aggregatedMarkdown = successfulMarkdowns.map(item => `## ${item.url}\n\n${item.markdown}`).join('\n\n---\n\n');
    // Keep the last processed URL in preview for individual view
  } else {
     lastMarkdownPreview = processedMarkdowns.map(p => `## ${p.url}\n\n${p.markdown}`).join("\n\n---\n\n");
  }
  updateUI();
}

function startProcessing(isManual = false) {
  if (isProcessing) return;

  isProcessing = true;
  isPaused = false;
  processedMarkdowns = [];
  aggregatedMarkdown = null;
  lastMarkdownPreview = "";
  currentProcessingUrlIndex = 0;

  if (isManual) {
    if (manualUrlText.trim() !== "") {
      urlsToProcess = [manualUrlText.trim()];
      selectedFilePath = null;
      setStatus("Starting manual URL processing...", 'status-info');
    } else {
      setStatus("Error: Manual URL input is empty.", 'status-error');
      isProcessing = false;
      updateUI();
      return;
    }
  } else {
    if (!selectedFilePath || urlsToProcess.length === 0) {
      setStatus("Error: No URLs loaded from file to process.", 'status-error');
      isProcessing = false;
      updateUI();
      return;
    }
    setStatus(`Starting processing for file: ${selectedFilePath}`, 'status-info');
  }

  processNextUrl();
  updateUI();
}

pauseResumeBtn.addEventListener('click', () => {
  isPaused = !isPaused;
  if (isPaused) {
    setStatus("Processing paused.", 'status-warning');
  } else {
    setStatus("Resuming processing...", 'status-info');
    if (isProcessing) processNextUrl();
  }
  updateUI();
});

// --- IPC-based File Operations ---

openFileBtn.addEventListener('click', async () => {
  setStatus("Opening file dialog...", 'status-info');
  try {
    const result = await window.electronAPI.openFileDialog();
    if (result.canceled) {
      setStatus("File open canceled.", 'status-warning');
    } else if (result.error) {
      setStatus(`Error opening file: ${result.error}`, 'status-error');
      selectedFilePath = result.filePath;
      urlsToProcess = [];
    } else {
      selectedFilePath = result.filePath;
      urlsToProcess = result.content || [];
      if (urlsToProcess.length > 0) {
        setStatus(`File selected: ${selectedFilePath}. ${urlsToProcess.length} URLs loaded. Click 'Start Processing File'.`, 'status-success');
      } else {
        setStatus(`File selected: ${selectedFilePath}, but it contains no processable URLs.`, 'status-warning');
      }      processedMarkdowns = [];
      aggregatedMarkdown = null;
      lastMarkdownPreview = "";
      currentProcessingUrlIndex = 0;
      isProcessing = false;
      isPaused = false;
    }
  } catch (error) {
    console.error('Error in openFileDialog IPC:', error);
    setStatus(`Error opening file: ${error.message}`, 'status-error');
    selectedFilePath = null;
    urlsToProcess = [];
  }
  updateUI();
});

startProcessingBtn.addEventListener('click', () => {
  if (selectedFilePath && urlsToProcess.length > 0) {
    startProcessing(false);
  } else {
    setStatus("Please open a file with URLs first.", 'status-error');
  }
  updateUI();
});

processManualUrlBtn.addEventListener('click', () => {
  startProcessing(true);
});

saveMarkdownBtn.addEventListener('click', async () => {
  let suggestedFilename;
  const successfulMarkdowns = processedMarkdowns.filter(item => !item.markdown.startsWith("Error processing"));

  if (successfulMarkdowns.length === 0) {
    setStatus("No successful Markdown content to save.", 'status-warning');
    return;
  }

  if (saveMerged) {
    if (selectedFilePath) {
      const baseName = selectedFilePath.split(/[\\/]/).pop().split('.').slice(0, -1).join('.') || "output";
      suggestedFilename = `${baseName}_merged.md`;
    } else if (urlsToProcess.length === 1 && successfulMarkdowns.length === 1) {
        suggestedFilename = `${generateFilenameFromUrl(successfulMarkdowns[0].url)}`;
    }
    else {
      suggestedFilename = "merged_markdown.md";
    }

    const contentToSave = aggregatedMarkdown || successfulMarkdowns.map(item => `## ${item.url}\n\n${item.markdown}`).join('\n\n---\n\n');
    if (!contentToSave.trim()){
        setStatus("No content to save for merged file.", 'status-warning');
        return;
    }

    setStatus("Saving merged file...", 'status-info');
    try {
      const result = await window.electronAPI.saveMergedDialog(suggestedFilename, contentToSave);
      if (result.canceled) {
        setStatus("Save merged file canceled.", 'status-warning');
      } else if (result.error) {
        setStatus(`Error saving merged file: ${result.error}`, 'status-error');
      } else {
        setStatus(`Merged file saved to: ${result.filePath}`, 'status-success');
      }
    } catch (error) {
      console.error('Error in saveMergedDialog IPC:', error);
      setStatus(`Error saving merged file: ${error.message}`, 'status-error');
    }
  } else {
    const filesToSave = successfulMarkdowns.map(item => ({
      filename: `${generateFilenameFromUrl(item.url)}`,
      content: `## ${item.url}\n\n${item.markdown}`
    }));

    if (filesToSave.length === 0) {
      setStatus("No individual Markdown files to save.", 'status-warning');
      return;
    }
    setStatus(`Attempting to save ${filesToSave.length} separate file(s)...`, 'status-info');
    try {
      const result = await window.electronAPI.saveSeparateDialog(filesToSave);
      if (result.canceled) {
        setStatus("Save separate files canceled.", 'status-warning');
      } else if (result.errors && result.errors.length > 0) {
        setStatus(`Saved to ${result.directoryPath} with ${result.errors.length} error(s). Check console for details.`, 'status-warning');
        result.errors.forEach(err => console.error(`Error saving ${err.filename}: ${err.error}`));
      } else if (result.directoryPath) {
        setStatus(`All files saved successfully to: ${result.directoryPath}`, 'status-success');
      } else {
        // This case might indicate cancellation before directory selection or an unexpected issue
        setStatus("Save separate files operation concluded without saving.", 'status-warning');
      }
    } catch (error) {
      console.error('Error in saveSeparateDialog IPC:', error);
      setStatus(`Error saving separate files: ${error.message}`, 'status-error');
    }
  }
  updateUI();
});

// Initial UI setup
setStatus("Welcome! Please open a URL file or enter a URL manually.", "status-info");
updatePreviewDisplay(); // Initialize preview display mode
