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
    <div className="controls-panel">
      <button
        onClick={onStartProcessingAll}
        disabled={!canStartProcessing || isProcessing}
        className="action-button"
      >
        Start Processing File
      </button>
      
      <button
        onClick={onTogglePauseResume}
        disabled={!isProcessing}
        className={`action-button ${isPaused ? 'resume-button' : 'pause-button'}`}
      >
        {isPaused ? 'Resume' : 'Pause'}
      </button>
        <hr />
      
      <div className="retry-controls">
        <div className="input-container">
          <label htmlFor="maxRetriesInput">Max Retries per URL:</label>
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
      
      <div className="save-controls">
        <div className="checkbox-container">
          <input
            type="checkbox"
            id="saveMergedCheckbox"
            checked={saveMerged}
            onChange={onToggleSaveMerged}
            disabled={isProcessing}
          />
          <label htmlFor="saveMergedCheckbox">Save merged into single file</label>
        </div>
        
        <button
          onClick={onSaveMarkdown}
          disabled={isProcessing || !hasProcessedContent}
          className="save-button"
        >
          Save Markdown
        </button>
      </div>
    </div>
  );
}

export default ControlsPanel;
