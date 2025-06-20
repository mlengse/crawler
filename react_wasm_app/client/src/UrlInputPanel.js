import React, { useState } from 'react';

function UrlInputPanel({ onProcessUrl, onProcessFile, disabled }) {
  const [manualUrl, setManualUrl] = useState('');

  const handleManualSubmit = (e) => {
    e.preventDefault();
    onProcessUrl(manualUrl);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onProcessFile(file);
      e.target.value = null; // Reset file input
    }
  };

  return (
    <div className="url-input-panel">
      <form onSubmit={handleManualSubmit} className="manual-url-form">
        <input
          type="text"
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
          placeholder="Enter URL (e.g., https://example.com)"
          disabled={disabled}
        />
        <button type="submit" disabled={disabled}>Process Single URL</button>
      </form>
      <div className="file-input-area">
        <label htmlFor="urlFile" className="file-label">Or select a .txt file with URLs (one per line):</label>
        <input
          type="file"
          id="urlFile"
          accept=".txt"
          onChange={handleFileChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export default UrlInputPanel;
