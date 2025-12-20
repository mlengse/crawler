import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

function PreviewPanel({ markdownContent, lastProcessedUrl }) {
  const [isRenderedMode, setIsRenderedMode] = useState(false);
  const [renderedHtml, setRenderedHtml] = useState('');

  useEffect(() => {
    if (markdownContent && isRenderedMode) {
      try {
        if (typeof markdownContent === 'string') {
          // Parse markdown and then sanitize the resulting HTML
          const rawHtml = marked.parse(markdownContent);
          const sanitizedHtml = DOMPurify.sanitize(rawHtml);
          setRenderedHtml(sanitizedHtml);
        } else {
          setRenderedHtml('<p style="color:red;">Error: Konten tidak valid untuk pratinjau.</p>');
        }
      } catch (err) {
        console.error("Error parsing markdown:", err);
        setRenderedHtml(`<p style="color:red;">Error rendering pratinjau: ${err.message}</p>`);
      }
    }
  }, [markdownContent, isRenderedMode]);

  const togglePreviewMode = () => {
    setIsRenderedMode(!isRenderedMode);
  };

  return (
    <div className="preview-panel">
      <div className="preview-header">        <h3>Pratinjau URL Terakhir Diproses</h3>
        <div className="preview-controls">
          <span className="url-display">
            {lastProcessedUrl || "Belum ada URL yang diproses"}
          </span>
          <button 
            onClick={togglePreviewMode} 
            className={`toggle-preview-btn ${isRenderedMode ? 'rendered' : ''}`}
          >
            {isRenderedMode ? '🖥️ Dirender' : '📝 Mentah'}
          </button>
        </div>
      </div>
      
      {isRenderedMode ? (
        <div 
          className="rendered-html-preview" 
          dangerouslySetInnerHTML={{ __html: renderedHtml || '<p style="color: #666; font-style: italic;">Tidak ada konten untuk ditampilkan</p>' }} 
        />
      ) : (        <textarea
          value={markdownContent || ''}
          readOnly
          placeholder="Pratinjau Markdown akan muncul di sini setelah memproses URL..."
          rows={20}
        />
      )}
    </div>
  );
}

export default React.memo(PreviewPanel);
