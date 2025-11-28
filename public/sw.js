// Service Worker for handling CORS issues
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Only intercept requests that are likely to have CORS issues (external URLs)
  // Skip requests to our own origin and static assets
  if (!url.hostname.includes('localhost') && 
      !url.hostname.includes('127.0.0.1') && 
      !url.hostname.includes('vercel.app') &&
      !url.pathname.endsWith('.js') && 
      !url.pathname.endsWith('.css') && 
      !url.pathname.endsWith('.wasm') &&
      !url.pathname.endsWith('.json')) {
    
    // console.log('Service Worker intercepting request for:', event.request.url);
    
    // Use the CORS proxy for external URLs
    event.respondWith(
      fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(event.request.url)}`)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Proxy response failed with status: ${response.status}`);
          }
          // Clone the response so it can be used in the app
          return response;
        })
        .catch(error => {
          console.error('Service Worker proxy fetch failed:', error);
          // Try an alternative proxy if the first one fails
          return fetch(`https://corsproxy.io/?${encodeURIComponent(event.request.url)}`)
            .catch(altError => {
              console.error('Alternative proxy fetch failed:', altError);
              // Fall back to original request if all proxies fail
              return fetch(event.request);
            });
        })
    );
  }
});

// Service Worker installation
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Service Worker activation
self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});
