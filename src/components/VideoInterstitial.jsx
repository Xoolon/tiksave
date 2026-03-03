import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * VideoInterstitial — ExoClick VAST In-Stream Ad
 *
 * VAST tag: https://s.magsrv.com/v1/vast.php?idzone=5863004&ex_av=name
 *
 * Uses the Google IMA SDK (industry standard VAST player) loaded via CDN.
 * - Shows every AD_FREQUENCY downloads (default: every 2)
 * - 10s total duration, skip button appears after 5s
 * - Falls back to countdown-only UI if IMA fails to load
 *
 * Props:
 *   show      – boolean, controls visibility
 *   onClose   – callback when ad is skipped or finishes
 */

const VAST_TAG     = 'https://s.magsrv.com/v1/vast.php?idzone=5863004&ex_av=name';
const AD_DURATION  = 10;   // seconds shown in countdown
const SKIP_AFTER   = 5;    // seconds until skip button appears
const IMA_SDK_URL  = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';

export default function VideoInterstitial({ show, onClose }) {
  const overlayRef    = useRef(null);
  const videoRef      = useRef(null);
  const adContainerRef= useRef(null);
  const adsManagerRef = useRef(null);
  const imaLoadedRef  = useRef(false);
  const timerRef      = useRef(null);

  const [countdown, setCountdown]   = useState(AD_DURATION);
  const [canSkip, setCanSkip]       = useState(false);
  const [adDone, setAdDone]         = useState(false);
  const [imaReady, setImaReady]     = useState(false);

  // ── Close / cleanup ──────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    clearInterval(timerRef.current);
    if (adsManagerRef.current) {
      try { adsManagerRef.current.destroy(); } catch(_) {}
      adsManagerRef.current = null;
    }
    setAdDone(true);
    onClose?.();
  }, [onClose]);

  // ── Countdown fallback (used when IMA isn't controlling duration) ────────
  const startCountdown = useCallback(() => {
    clearInterval(timerRef.current);
    setCountdown(AD_DURATION);
    setCanSkip(false);

    let elapsed = 0;
    timerRef.current = setInterval(() => {
      elapsed += 1;
      setCountdown(AD_DURATION - elapsed);
      if (elapsed >= SKIP_AFTER) setCanSkip(true);
      if (elapsed >= AD_DURATION) {
        clearInterval(timerRef.current);
        handleClose();
      }
    }, 1000);
  }, [handleClose]);

  // ── Load IMA SDK once ────────────────────────────────────────────────────
  useEffect(() => {
    if (imaLoadedRef.current) return;
    if (document.querySelector(`script[src="${IMA_SDK_URL}"]`)) {
      imaLoadedRef.current = true;
      setImaReady(true);
      return;
    }
    const s = document.createElement('script');
    s.src = IMA_SDK_URL;
    s.async = true;
    s.onload  = () => { imaLoadedRef.current = true; setImaReady(true); };
    s.onerror = () => { imaLoadedRef.current = true; setImaReady(false); }; // fallback
    document.head.appendChild(s);
  }, []);

  // ── Initialize IMA when modal opens ─────────────────────────────────────
  useEffect(() => {
    if (!show || adDone) return;

    // Reset state each time modal opens
    setCountdown(AD_DURATION);
    setCanSkip(false);

    if (!imaReady || !window.google?.ima) {
      // IMA not available — run countdown only
      startCountdown();
      return;
    }

    // Small delay to ensure DOM refs are mounted
    const initTimer = setTimeout(() => {
      if (!videoRef.current || !adContainerRef.current) {
        startCountdown();
        return;
      }

      try {
        const adDisplayContainer = new window.google.ima.AdDisplayContainer(
          adContainerRef.current,
          videoRef.current
        );
        adDisplayContainer.initialize();

        const adsLoader = new window.google.ima.AdsLoader(adDisplayContainer);

        adsLoader.addEventListener(
          window.google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
          (e) => {
            const adsManager = e.getAdsManager(videoRef.current);
            adsManagerRef.current = adsManager;

            adsManager.addEventListener(window.google.ima.AdEvent.Type.STARTED,    startCountdown);
            adsManager.addEventListener(window.google.ima.AdEvent.Type.COMPLETE,   handleClose);
            adsManager.addEventListener(window.google.ima.AdEvent.Type.SKIPPED,    handleClose);
            adsManager.addEventListener(window.google.ima.AdEvent.Type.ALL_ADS_COMPLETED, handleClose);

            try {
              adsManager.init(640, 360, window.google.ima.ViewMode.NORMAL);
              adsManager.start();
            } catch (err) {
              startCountdown(); // fallback
            }
          }
        );

        adsLoader.addEventListener(
          window.google.ima.AdErrorEvent.Type.AD_ERROR,
          () => startCountdown() // fallback on error
        );

        const adsRequest = new window.google.ima.AdsRequest();
        adsRequest.adTagUrl = VAST_TAG;
        adsRequest.linearAdSlotWidth  = 640;
        adsRequest.linearAdSlotHeight = 360;
        adsLoader.requestAds(adsRequest);

      } catch (_) {
        startCountdown(); // fallback
      }
    }, 120);

    return () => {
      clearTimeout(initTimer);
      clearInterval(timerRef.current);
    };
  }, [show, adDone, imaReady, startCountdown, handleClose]);

  // ── Reset adDone when show goes false→true ───────────────────────────────
  useEffect(() => {
    if (show) setAdDone(false);
  }, [show]);

  if (!show || adDone) return null;

  const progress = ((AD_DURATION - countdown) / AD_DURATION) * 100;

  return (
    <>
      <style>{`
        .vi-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: rgba(0,0,0,0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: viIn 0.2s ease;
          backdrop-filter: blur(6px);
          padding: 16px;
        }
        @keyframes viIn { from { opacity:0; } to { opacity:1; } }

        .vi-modal {
          width: 100%;
          max-width: 600px;
          background: #0e0e18;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 24px 80px rgba(0,0,0,0.85);
        }

        .vi-video-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          background: #000;
          overflow: hidden;
        }

        .vi-video-wrap video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .vi-ad-container {
          position: absolute;
          inset: 0;
          z-index: 2;
        }

        .vi-ad-label {
          position: absolute;
          top: 10px;
          left: 12px;
          z-index: 3;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.4);
          background: rgba(0,0,0,0.55);
          padding: 2px 8px;
          border-radius: 4px;
          pointer-events: none;
          font-family: 'DM Sans', sans-serif;
        }

        .vi-progress-bar {
          height: 3px;
          background: rgba(255,255,255,0.08);
        }
        .vi-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #fe2c55, #8338ec);
          transition: width 0.95s linear;
        }

        .vi-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
        }

        .vi-countdown {
          font-size: 12px;
          color: rgba(255,255,255,0.35);
          font-family: 'DM Mono', monospace;
        }

        .vi-skip-btn {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.18);
          color: #fff;
          border-radius: 8px;
          padding: 7px 16px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: background 0.15s, transform 0.1s;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .vi-skip-btn:hover:not(:disabled) { background: rgba(255,255,255,0.18); }
        .vi-skip-btn:active:not(:disabled) { transform: scale(0.97); }
        .vi-skip-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .vi-timer-chip {
          font-size: 11px;
          font-family: 'DM Mono', monospace;
          background: rgba(254,44,85,0.2);
          color: #fe2c55;
          border-radius: 5px;
          padding: 1px 6px;
        }
      `}</style>

      <div className="vi-overlay" ref={overlayRef}>
        <div className="vi-modal">

          <div className="vi-video-wrap">
            {/* Hidden video element — IMA SDK renders into ad-container on top */}
            <video ref={videoRef} style={{ display: 'none' }} />
            <div ref={adContainerRef} className="vi-ad-container" />
            <span className="vi-ad-label">Advertisement</span>
          </div>

          <div className="vi-progress-bar">
            <div className="vi-progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="vi-controls">
            <span className="vi-countdown">
              {countdown > 0 ? `Ad ends in ${countdown}s` : 'Finishing…'}
            </span>

            <button
              className="vi-skip-btn"
              onClick={handleClose}
              disabled={!canSkip}
            >
              {canSkip
                ? 'Skip Ad ›'
                : <>Skip in <span className="vi-timer-chip">{Math.max(0, SKIP_AFTER - (AD_DURATION - countdown))}s</span></>
              }
            </button>
          </div>

        </div>
      </div>
    </>
  );
}