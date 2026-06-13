import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ==========================================
// SEAMLESS NETLIFY DEPLOYMENT ADAPTER
// ==========================================
// Automatically intercepts and routes all /api and /uploads traffic directly 
// to the high-performance Google Cloud Run backend. Bypasses proxy, CORS, 
// and Host SNI routing limitations under all custom domains.
if (typeof window !== 'undefined') {
  const BACKEND_URL = 'https://ais-pre-6uyqdapffx4i4uapjnq7rt-117172139055.asia-southeast1.run.app';
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isOfficialContainer = window.location.hostname.includes('run.app');
  const isRender = window.location.hostname.includes('onrender.com') || window.location.hostname.includes('render.com');

  if (!isOfficialContainer && !isLocalHost && !isRender) {
    // 1. Intercept all global fetch requests
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
      let url = typeof input === 'string' ? input : (input as any).url;
      
      if (url.startsWith('/api/') || url.startsWith('/uploads/')) {
        url = `${BACKEND_URL}${url}`;
        
        // Auto-configure credentials for session cookie synchronization
        if (init) {
          init.credentials = 'include';
        } else {
          init = { credentials: 'include' };
        }
      }
      
      if (typeof input === 'string') {
        return originalFetch(url, init);
      } else {
        const reqInput = input as any;
        const newRequest = new Request(url, {
          method: reqInput.method,
          headers: reqInput.headers,
          body: reqInput.body,
          mode: reqInput.mode,
          credentials: init?.credentials || reqInput.credentials,
          cache: reqInput.cache,
          redirect: reqInput.redirect,
          referrer: reqInput.referrer,
          integrity: reqInput.integrity,
          keepalive: reqInput.keepalive,
          signal: reqInput.signal,
        });
        return originalFetch(newRequest, init);
      }
    };

    // 2. Intercept and rewrite static resource paths dynamically in the DOM
    const rewriteMediaSrc = (el: HTMLElement) => {
      const srcAttr = el.getAttribute('src');
      if (srcAttr && srcAttr.startsWith('/uploads/') && !srcAttr.startsWith('http')) {
        el.setAttribute('src', `${BACKEND_URL}${srcAttr}`);
      }
      
      if (el.tagName === 'VIDEO' || el.tagName === 'AUDIO') {
        el.querySelectorAll('source').forEach(source => {
          const sSrc = source.getAttribute('src');
          if (sSrc && sSrc.startsWith('/uploads/') && !sSrc.startsWith('http')) {
            source.setAttribute('src', `${BACKEND_URL}${sSrc}`);
          }
        });
      }
    };

    // Scan initial layout
    document.querySelectorAll('img, video, audio, source').forEach(el => rewriteMediaSrc(el as HTMLElement));

    // Observe changes for dynamic client routers and asynchronous components
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (node.tagName === 'IMG' || node.tagName === 'VIDEO' || node.tagName === 'AUDIO' || node.tagName === 'SOURCE') {
              rewriteMediaSrc(node);
            }
            node.querySelectorAll('img, video, audio, source').forEach((el) => rewriteMediaSrc(el as HTMLElement));
          }
        });
        if (mutation.type === 'attributes' && mutation.attributeName === 'src' && mutation.target instanceof HTMLElement) {
          rewriteMediaSrc(mutation.target);
        }
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src']
    });

    console.log('[Netlify Support] Active: Dynamic fetch interceptor and media rewriter mapped to backend.');
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
