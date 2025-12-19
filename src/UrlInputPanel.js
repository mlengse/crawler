import React, { useState } from 'react';

function UrlInputPanel({ onProcessUrl, onCrawlAndProcess, onProcessFile, disabled }) {
  const [manualUrl, setManualUrl] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');

  const handleCrawlAndProcess = (e) => {
    e.preventDefault();
    if (manualUrl.trim()) {
      onCrawlAndProcess(manualUrl);
    }
  };

  const handleProcessOnly = (e) => {
    e.preventDefault();
    if (manualUrl.trim()) {
      onProcessUrl(manualUrl);
    }
  };
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const urls = text.split('\n')
          .map(url => url.trim())
          .filter(url => url.length > 0);
        onProcessFile(urls);
      };
      reader.readAsText(file);
      e.target.value = null; // Reset file input
    } else {
      setSelectedFileName('');
    }
  };
  return (
    <div className="url-input-panel">
      <div className="manual-url-form">
        <input
          type="text"
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
          placeholder="Masukkan URL secara manual"
          aria-label="Masukkan URL secara manual"
          disabled={disabled}
        />
        <div className="button-group">
          <button onClick={handleCrawlAndProcess} disabled={disabled || !manualUrl.trim()} className="crawl-button">
            Crawl & Process
          </button>
          <button onClick={handleProcessOnly} disabled={disabled || !manualUrl.trim()} className="process-button">
            Process Only
          </button>
        </div>
      </div>
      
      <hr />        <div className="file-input-area">
        <label htmlFor="urlFile" className="file-label">
          Pilih file .txt dengan URL (satu per baris):
        </label>
        <input
          type="file"
          id="urlFile"
          accept=".txt"
          onChange={handleFileChange}
          disabled={disabled}
        />
        {selectedFileName && (
          <p className="selected-file">Dipilih: {selectedFileName}</p>
        )}
      </div>
    </div>
  );
}

export default React.memo(UrlInputPanel);
