import { useEffect, useRef } from 'react';

/**
 * ExoClick Banner Ad — Zone 5863000
 *
 * Injects the exact tags provided by ExoClick:
 *   <script async src="https://a.magsrv.com/ad-provider.js"></script>
 *   <ins class="eas6a97888e2" data-zoneid="5863000"></ins>
 *   <script>(AdProvider = window.AdProvider || []).push({"serve": {}});</script>
 *
 * The ad-provider.js is injected into <head> only once globally.
 * The <ins> and serve push are injected into this component's container.
 */
export default function AdBanner() {
  const containerRef = useRef(null);
  const injected = useRef(false);

  useEffect(() => {
    if (injected.current || !containerRef.current) return;
    injected.current = true;

    // Step 1 — inject ad-provider.js into <head> once
    if (!document.querySelector('script[src="https://a.magsrv.com/ad-provider.js"]')) {
      const providerScript = document.createElement('script');
      providerScript.async = true;
      providerScript.type = 'application/javascript';
      providerScript.src = 'https://a.magsrv.com/ad-provider.js';
      document.head.appendChild(providerScript);
    }

    // Step 2 — create the <ins> placeholder inside our container
    const ins = document.createElement('ins');
    ins.className = 'eas6a97888e2';
    ins.setAttribute('data-zoneid', '5863000');
    containerRef.current.appendChild(ins);

    // Step 3 — push the serve call so ExoClick fills the <ins>
    const serveScript = document.createElement('script');
    serveScript.type = 'application/javascript';
    serveScript.textContent = `(AdProvider = window.AdProvider || []).push({"serve": {}});`;
    containerRef.current.appendChild(serveScript);
  }, []);


  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '90px',
        overflow: 'hidden',          // ← prevents any absolute children from spilling out
        position: 'relative',         // ← creates a new stacking context
        zIndex: 1,                    // ← lower than the main content (optional, adjust if needed)
        pointerEvents: 'auto',         // ← keeps the ad clickable, but ensures it doesn't block elements outside
      }}
    />
  );
}