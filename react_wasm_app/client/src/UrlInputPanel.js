import React, { useState } from 'react';

function UrlInputPanel({ onProcessUrl, onProcessFile, disabled }) {
  const [manualUrl, setManualUrl] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualUrl.trim()) {
      onProcessUrl(manualUrl);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFileName(file.name);
      onProcessFile(file);
      e.target.value = null; // Reset file input
    } else {
      setSelectedFileName('');
    }
  };
  return (
    <div className="url-input-panel">
      <form onSubmit={handleManualSubmit} className="manual-url-form">
        <input
          type="text"
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
          placeholder="Enter URL manually"
          disabled={disabled}
        />
        <button type="submit" disabled={disabled || !manualUrl.trim()}>
          Process Manual URL
        </button>
      </form>
      
      <hr />
        <div className="file-input-area">
        <label htmlFor="urlFile" className="file-label">
          Select a .txt file with URLs (one per line):
        </label>
        <input
          type="file"
          id="urlFile"
          accept=".txt"
          onChange={handleFileChange}
          disabled={disabled}
        />
        {selectedFileName && (
          <p className="selected-file">Selected: {selectedFileName}</p>
        )}
      </div>
    </div>
  );
}

export default UrlInputPanel;
