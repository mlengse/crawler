import React, { useState, useEffect } from 'react';
import { marked } from 'marked';

function PreviewPanel({ markdownContent, lastProcessedUrl }) {
  const [isRenderedMode, setIsRenderedMode] = useState(false);
  const [renderedHtml, setRenderedHtml] = useState('');

  useEffect(() => {
    if (markdownContent && isRenderedMode) {
      try {
        if (typeof markdownContent === 'string') {
          setRenderedHtml(marked.parse(markdownContent));
        } else {
          setRenderedHtml('<p style="color:red;">Error: Invalid content for preview.</p>');
        }
      } catch (err) {
        console.error("Error parsing markdown:", err);
        setRenderedHtml(`<p style="color:red;">Error rendering preview: ${err.message}</p>`);
      }
    }
  }, [markdownContent, isRenderedMode]);

  const togglePreviewMode = () => {
    setIsRenderedMode(!isRenderedMode);
  };

  return (
    <div className="preview-panel">
      <div className="preview-header">
        <h3>Last Crawled URL Preview</h3>
        <div className="preview-controls">
          <span className="url-display">
            {lastProcessedUrl || "No URL processed yet"}
          </span>
          <button 
            onClick={togglePreviewMode} 
            className={`toggle-preview-btn ${isRenderedMode ? 'rendered' : ''}`}
          >
            {isRenderedMode ? '🖥️ Rendered' : '📝 Raw'}
          </button>
        </div>
      </div>
      
      {isRenderedMode ? (
        <div 
          className="rendered-html-preview" 
          dangerouslySetInnerHTML={{ __html: renderedHtml || '<p style="color: #666; font-style: italic;">No content to preview</p>' }} 
        />
      ) : (        <textarea
          value={markdownContent || ''}
          readOnly
          placeholder="Markdown preview will appear here after processing URLs..."
          rows={20}
        />
      )}
    </div>
  );
}

export default PreviewPanel;
