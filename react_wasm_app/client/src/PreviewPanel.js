import React, { useState, useEffect } from 'react';
import { marked } from 'marked'; // Import marked

function PreviewPanel({ markdownContent, lastProcessedUrl }) {
  const [showRendered, setShowRendered] = useState(false);
  const [renderedHtml, setRenderedHtml] = useState('');

  useEffect(() => {
    if (markdownContent && showRendered) {
      try {
        // Ensure that `markdownContent` is a string.
        // The WASM function might return something else on error, or it might be initially undefined.
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
  }, [markdownContent, showRendered]);

  return (
    <div className="preview-panel">
      <div className="preview-header">
        <h3>Preview for: {lastProcessedUrl || "No URL processed"}</h3>
        <button onClick={() => setShowRendered(!showRendered)} className="toggle-preview-btn">
          {showRendered ? 'Raw Markdown' : 'Rendered HTML'}
        </button>
      </div>
      {showRendered ? (
        <div className="rendered-html-preview" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
      ) : (
        <textarea
          value={markdownContent}
          readOnly
          placeholder="Markdown preview will appear here..."
          rows={15}
        />
      )}
    </div>
  );
}

export default PreviewPanel;
