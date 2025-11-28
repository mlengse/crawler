import React from 'react';

function ControlsPanel({
  isProcessing,
  isPaused,
  onStartProcessingAll,
  onTogglePauseResume,
  canStartProcessing,
  onSaveMarkdown,
  saveMerged,
  onToggleSaveMerged,
  splitMergedFiles,
  onToggleSplitMerged,
  urlsPerFile,
  onUrlsPerFileChange,
  hasProcessedContent,
  maxRetries,
  onMaxRetriesChange,
  maxCrawlLinks,
  onMaxCrawlLinksChange,
  maxCrawlDepth,
  onMaxCrawlDepthChange
}) {
  return (
    <div className="controls-panel">      <button
      onClick={onStartProcessingAll}
      disabled={!canStartProcessing || isProcessing}
      className="action-button"
    >
      Mulai Memproses Semua
    </button>

      <button
        onClick={onTogglePauseResume}
        disabled={!isProcessing}
        className={`action-button ${isPaused ? 'resume-button' : 'pause-button'}`}
      >
        {isPaused ? 'Lanjutkan' : 'Jeda'}
      </button>
      <hr />

      <div className="retry-controls">
        <div className="input-container">
          <label htmlFor="maxRetriesInput">Percobaan Ulang per URL:</label>
          <input
            type="number"
            id="maxRetriesInput"
            min="1"
            max="10"
            value={maxRetries}
            onChange={(e) => onMaxRetriesChange(e.target.value)}
            disabled={isProcessing}
            className="retry-input"
          />
        </div>
        <br />
        <div className="input-container">
          <label htmlFor="maxCrawlLinksInput">Maksimal Link Crawl:</label>
          <input
            type="number"
            id="maxCrawlLinksInput"
            min="1"
            max="5000"
            value={maxCrawlLinks}
            onChange={(e) => onMaxCrawlLinksChange(e.target.value)}
            disabled={isProcessing}
            className="retry-input"
          />
        </div>
        <br />
        <div className="input-container">
          <label htmlFor="maxCrawlDepthInput">Kedalaman Crawl Maksimal:</label>
          <input
            type="number"
            id="maxCrawlDepthInput"
            min="1"
            max="10"
            value={maxCrawlDepth}
            onChange={(e) => onMaxCrawlDepthChange(e.target.value)}
            disabled={isProcessing}
            className="retry-input"
            title="Level kedalaman crawling (1 = hanya halaman pertama, 2 = halaman + link di dalamnya, dst)"
          />
        </div>
      </div>

      <hr />

      <div className="save-controls">        <div className="checkbox-container">
        <input
          type="checkbox"
          id="saveMergedCheckbox"
          checked={saveMerged}
          onChange={onToggleSaveMerged}
          disabled={isProcessing}
        />
        <label htmlFor="saveMergedCheckbox">Simpan gabungan dalam satu file</label>
      </div>

        {saveMerged && (
          <div className="split-config">
            <div className="checkbox-container">
              <input
                type="checkbox"
                id="splitMergedCheckbox"
                checked={splitMergedFiles}
                onChange={onToggleSplitMerged}
                disabled={isProcessing}
              />
              <label htmlFor="splitMergedCheckbox">Bagi menjadi beberapa file</label>
            </div>

            {splitMergedFiles && (
              <div className="input-container">
                <label htmlFor="urlsPerFileInput">URL per File:</label>
                <input
                  type="number"
                  id="urlsPerFileInput"
                  min="1"
                  max="100"
                  value={urlsPerFile}
                  onChange={(e) => onUrlsPerFileChange(e.target.value)}
                  disabled={isProcessing}
                  className="retry-input"
                  title="Jumlah URL yang akan disimpan dalam setiap file"
                />
              </div>
            )}
          </div>
        )}

        <button
          onClick={onSaveMarkdown}
          disabled={isProcessing || !hasProcessedContent}
          className="save-button"
        >
          Simpan Markdown
        </button>
      </div>
    </div>
  );
}

export default ControlsPanel;
