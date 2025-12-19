import React from 'react';

function StatusDisplay({ message, type }) {
  return (
    <div
      className={`status-display status-${type}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}

export default React.memo(StatusDisplay);
