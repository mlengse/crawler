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
  hasProcessedContent,
  maxRetries,
  onMaxRetriesChange
}) {return (
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
      
      <div className="retry-controls">        <div className="input-container">
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
