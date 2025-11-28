import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Register Service Worker for CORS handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Use relative path for better compatibility with different deployment environments
    const swPath = `${process.env.PUBLIC_URL}/sw.js`;
    navigator.serviceWorker.register(swPath, { scope: '/' })
      .then(registration => {
        // console.log('Service Worker registered successfully:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
