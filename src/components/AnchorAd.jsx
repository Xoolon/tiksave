import { useEffect, useRef, useState } from 'react';

/**
 * ExoClick Sticky / Anchor Ad — Zone 5863002
 *
 * Injects the exact tags provided by ExoClick:
 *   <script async src="https://a.magsrv.com/ad-provider.js"></script>
 *   <ins class="eas6a97888e17" data-zoneid="5863002"></ins>
 *   <script>(AdProvider = window.AdProvider || []).push({"serve": {}});</script>
 *
 * Rendered as a collapsible sticky footer bar.
 * - Appears 1.8s after page load (avoids layout flash)
 * - Collapses smoothly with ✕ button
 * - Small "Ad ▲" tab lets user re-expand
 */
export default function AnchorAd() {
  const containerRef = useRef(null);
  const injected = useRef(false);
  const [collapsed, setCollapsed] = useState(false);
  const [visible, setVisible] = useState(false);

  // Delay appearance to avoid flash on first paint
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible || injected.current || !containerRef.current) return;
    injected.current = true;

    // Step 1 — inject ad-provider.js into <head> once (shared with banner)
    if (!document.querySelector('script[src="https://a.magsrv.com/ad-provider.js"]')) {
      const providerScript = document.createElement('script');
      providerScript.async = true;
      providerScript.type = 'application/javascript';
      providerScript.src = 'https://a.magsrv.com/ad-provider.js';
      document.head.appendChild(providerScript);
    }

    // Step 2 — <ins> placeholder
    const ins = document.createElement('ins');
    ins.className = 'eas6a97888e17';
    ins.setAttribute('data-zoneid', '5863002');
    containerRef.current.appendChild(ins);

    // Step 3 — serve push
    const serveScript = document.createElement('script');
    serveScript.type = 'application/javascript';
    serveScript.textContent = `(AdProvider = window.AdProvider || []).push({"serve": {}});`;
    containerRef.current.appendChild(serveScript);
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        .anchor-ad-wrap {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          pointer-events: none;
        }
        .anchor-ad-bar {
          width: 100%;
          max-width: 720px;
          pointer-events: all;
          background: rgba(10,10,15,0.97);
          border-top: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px 14px 0 0;
          overflow: hidden;
          transition: max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease;
          max-height: ${collapsed ? '0px' : '130px'};
          opacity: ${collapsed ? 0 : 1};
          box-shadow: 0 -8px 32px rgba(0,0,0,0.5);
        }
        .anchor-ad-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px 4px;
        }
        .anchor-ad-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.2);
          font-family: 'DM Sans', sans-serif;
        }
        .anchor-ad-close {
          background: rgba(255,255,255,0.07);
          border: none;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
          font-family: inherit;
          pointer-events: all;
          line-height: 1;
        }
        .anchor-ad-close:hover { background: rgba(255,255,255,0.14); color: #fff; }
        .anchor-ad-content {
          padding: 0 12px 10px;
          display: flex;
          justify-content: center;
          min-height: 60px;
          align-items: center;
        }
        .anchor-reopen {
          position: fixed;
          bottom: 0;
          right: 20px;
          z-index: 9999;
          background: linear-gradient(135deg, #fe2c55, #8338ec);
          color: #fff;
          border: none;
          border-radius: 8px 8px 0 0;
          padding: 5px 12px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          pointer-events: ${collapsed ? 'all' : 'none'};
          opacity: ${collapsed ? 1 : 0};
          transition: opacity 0.2s;
        }
        .anchor-reopen:hover { opacity: 0.85 !important; }
      `}</style>

      <div className="anchor-ad-wrap">
        <div className="anchor-ad-bar">
          <div className="anchor-ad-header">
            <span className="anchor-ad-label">Advertisement</span>
            <button
              className="anchor-ad-close"
              onClick={() => setCollapsed(true)}
              aria-label="Close ad"
            >✕</button>
          </div>
          <div className="anchor-ad-content">
            <div ref={containerRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }} />
          </div>
        </div>
      </div>

      <button
        className="anchor-reopen"
        onClick={() => setCollapsed(false)}
        aria-label="Reopen ad"
      >Ad ▲</button>
    </>
  );
}