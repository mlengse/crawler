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
      <form onSubmit={handleManualSubmit} className="manual-url-form">        <input
          type="text"
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
          placeholder="Masukkan URL secara manual"
          disabled={disabled}
        />
        <button type="submit" disabled={disabled || !manualUrl.trim()}>
          Proses URL Manual
        </button>
      </form>
      
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

export default UrlInputPanel;
