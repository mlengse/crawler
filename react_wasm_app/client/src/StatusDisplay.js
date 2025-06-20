import React from 'react';

function StatusDisplay({ message, type }) {
  return (
    <div className={`status-display status-${type}`}>
      {message}
    </div>
  );
}

export default StatusDisplay;
