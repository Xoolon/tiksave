import { useEffect, useRef, useState } from 'react';

/**
 * ExoClick Sticky / Anchor Ad — Zone 5863002
 * Ad dimensions: 300 × 250
 *
 * - Container sized exactly to fit the 300×250 ad
 * - Collapses smoothly, resets to open on every page load (state is in-memory only)
 * - "Advertisement" label + close button sit above the ad content
 */
export default function AnchorAd() {
  const containerRef = useRef(null);
  const injected     = useRef(false);

  // collapsed = false on every fresh page load (no persistence)
  const [collapsed, setCollapsed] = useState(false);
  const [visible,   setVisible]   = useState(false);

  // Slight delay so it doesn't flash during initial paint
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  // Inject ExoClick tags once the bar becomes visible
  useEffect(() => {
    if (!visible || injected.current || !containerRef.current) return;
    injected.current = true;

    // ad-provider.js — injected into <head> once (shared with banner)
    if (!document.querySelector('script[src="https://a.magsrv.com/ad-provider.js"]')) {
      const providerScript = document.createElement('script');
      providerScript.async = true;
      providerScript.type  = 'application/javascript';
      providerScript.src   = 'https://a.magsrv.com/ad-provider.js';
      document.head.appendChild(providerScript);
    }

    // <ins> placeholder
    const ins = document.createElement('ins');
    ins.className = 'eas6a97888e17';
    ins.setAttribute('data-zoneid', '5863002');
    // Explicitly size the ins so ExoClick knows the slot dimensions
    ins.style.display = 'inline-block';
    ins.style.width   = '300px';
    ins.style.height  = '250px';
    containerRef.current.appendChild(ins);

    // serve push
    const serveScript = document.createElement('script');
    serveScript.type        = 'application/javascript';
    serveScript.textContent = `(AdProvider = window.AdProvider || []).push({"serve": {}});`;
    containerRef.current.appendChild(serveScript);
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        /* ── Outer positioner ── */
        .anch-positioner {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          display: flex;
          justify-content: center;
          pointer-events: none;
        }

        /* ── The card itself ── */
        .anch-card {
          pointer-events: all;
          background: rgba(10, 10, 15, 0.97);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-bottom: none;
          border-radius: 14px 14px 0 0;
          box-shadow: 0 -6px 32px rgba(0, 0, 0, 0.55);
          overflow: hidden;
          /* width = ad width + side padding (12px × 2) */
          width: 324px;
          /* transition the height for smooth collapse */
          transition: max-height 0.38s cubic-bezier(0.4, 0, 0.2, 1),
                      opacity    0.25s ease;
          /* expanded: header (32px) + ad (250px) + bottom pad (12px) = 294px */
          max-height: ${collapsed ? '0px' : '310px'};
          opacity: ${collapsed ? 0 : 1};
        }

        /* ── Header row ── */
        .anch-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 7px 10px 5px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .anch-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.22);
          font-family: 'DM Sans', sans-serif;
        }
        .anch-close {
          background: rgba(255,255,255,0.06);
          border: none;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          color: rgba(255,255,255,0.38);
          cursor: pointer;
          font-size: 11px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, color 0.15s;
          font-family: inherit;
        }
        .anch-close:hover { background: rgba(255,255,255,0.13); color: #fff; }

        /* ── Ad slot — fixed 300×250 ── */
        .anch-ad-slot {
          width: 300px;
          height: 250px;
          margin: 8px auto 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        /* ── Reopen tab (shown when collapsed) ── */
        .anch-tab {
          position: fixed;
          bottom: 0;
          /* align to the right edge of where the card sits:
             card is centered, width 324px → right edge = 50% + 162px - 16px margin */
          right: calc(50% - 162px + 8px);
          z-index: 9999;
          background: linear-gradient(135deg, #fe2c55, #8338ec);
          color: #fff;
          border: none;
          border-radius: 8px 8px 0 0;
          padding: 5px 14px 4px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: opacity 0.22s ease;
          opacity: ${collapsed ? 1 : 0};
          pointer-events: ${collapsed ? 'all' : 'none'};
        }
        .anch-tab:hover { filter: brightness(1.1); }

        /* mobile: keep card centered but slightly narrower if needed */
        @media (max-width: 340px) {
          .anch-card { width: 100%; border-radius: 0; }
          .anch-ad-slot { width: 100%; }
          .anch-tab { right: 8px; }
        }
      `}</style>

      {/* Collapsed reopen tab */}
      <button
        className="anch-tab"
        onClick={() => setCollapsed(false)}
        aria-label="Show advertisement"
      >
        Ad ▲
      </button>

      {/* Main sticky card */}
      <div className="anch-positioner">
        <div className="anch-card">

          <div className="anch-header">
            <span className="anch-label">Advertisement</span>
            <button
              className="anch-close"
              onClick={() => setCollapsed(true)}
              aria-label="Close advertisement"
            >✕</button>
          </div>

          {/* 300×250 ad slot — ExoClick renders into the <ins> inside here */}
          <div className="anch-ad-slot">
            <div ref={containerRef} style={{ lineHeight: 0 }} />
          </div>

        </div>
      </div>
    </>
  );
}