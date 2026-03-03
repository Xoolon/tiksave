import React, { useState, useEffect, useRef, useCallback } from 'react';
import AdBanner from './components/AdBanner';
import AnchorAd from './components/AnchorAd';
import VideoInterstitial from './components/VideoInterstitial';

// ─── Ad frequency config ──────────────────────────────────────────────────────
const AD_FREQUENCY = 2; // show video interstitial every N completed downloads

// ─── Utility ─────────────────────────────────────────────────────────────────
const TIKTOK_PATTERNS = [
  /^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/,
  /^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/.*\/video\/\d+/,
  /^https?:\/\/vm\.tiktok\.com\/[A-Za-z0-9]+/,
  /^https?:\/\/vt\.tiktok\.com\/[A-Za-z0-9]+/,
  /^https?:\/\/(www\.)?tiktok\.com\/t\/[A-Za-z0-9]+/,
];

function isValidTikTokUrl(url) {
  return TIKTOK_PATTERNS.some(p => p.test(url.trim()));
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatCount(n) {
  if (!n) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconDownload = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const IconSparkle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.88 5.76a2 2 0 0 0 1.36 1.36L21 12l-5.76 1.88a2 2 0 0 0-1.36 1.36L12 21l-1.88-5.76a2 2 0 0 0-1.36-1.36L3 12l5.76-1.88a2 2 0 0 0 1.36-1.36L12 3z"/>
  </svg>
);

const IconWatermark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const IconCheck = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconAlert = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const IconClock = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const IconEye = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const IconHeart = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = ({ size = 24, color = '#fe2c55' }) => (
  <div style={{
    width: size,
    height: size,
    border: `3px solid rgba(255,255,255,0.1)`,
    borderTop: `3px solid ${color}`,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  }} />
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TikTokDownloader() {
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | fetching | ready | downloading | done | error
  const [error, setError] = useState('');
  const [videoData, setVideoData] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState('');

  // Ad state
  const downloadCountRef = useRef(0);
  const [showVideoAd, setShowVideoAd] = useState(false);
  const pendingResetRef = useRef(false); // reset after ad closes

  useEffect(() => {
    document.title = 'TikTSave – Download TikTok Videos Without Watermark For Free';
  }, []);

  const handleFetch = async () => {
    const trimmed = url.trim();
    setError('');
    if (!trimmed) { setError('Paste a TikTok video URL to get started.'); return; }
    if (!isValidTikTokUrl(trimmed)) { setError("That doesn't look like a valid TikTok URL. Try copying the link from the app."); return; }

    setPhase('fetching');
    setVideoData(null);

    try {
      const res = await fetch(`/api/tiktok/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Server error (${res.status})`);
      setVideoData(data);
      setPhase('ready');
    } catch (err) {
      setError(err.message || 'Failed to fetch video. Please check the URL and try again.');
      setPhase('error');
    }
  };

  // Called after every successful download to handle video ad frequency
  const handlePostDownload = useCallback(() => {
    downloadCountRef.current += 1;
    if (downloadCountRef.current % AD_FREQUENCY === 0) {
      // Show video interstitial; actual reset happens after ad closes
      pendingResetRef.current = true;
      setShowVideoAd(true);
    }
  }, []);

  const handleVideoAdClose = useCallback(() => {
    setShowVideoAd(false);
  }, []);

  const handleDownload = async (type) => {
    if (!videoData) return;
    const nowatermark = type === 'nowatermark';
    const filename = nowatermark ? videoData.filename_nowatermark : videoData.filename_watermark;
    const tiktokUrl = videoData.tiktok_url.replace(/^["']|["']$/g, '');

    setDownloadProgress('Extracting fresh download link…');
    setPhase('downloading');

    try {
      const streamUrl = `/api/proxy/stream?url=${encodeURIComponent(tiktokUrl)}&filename=${encodeURIComponent(filename)}&nowatermark=${nowatermark}`;
      setDownloadProgress('Downloading video…');
      const response = await fetch(streamUrl);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Download failed (${response.status})`);
      }
      setDownloadProgress('Saving file…');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      setPhase('done');
      setDownloadProgress('');
      handlePostDownload(); // ← triggers ad logic after success
    } catch (err) {
      setError(err.message || 'Download failed. Please try again.');
      setPhase('error');
      setDownloadProgress('');
    }
  };

  const reset = () => {
    setUrl('');
    setPhase('idle');
    setError('');
    setVideoData(null);
    setDownloadProgress('');
  };

  const isFetching   = phase === 'fetching';
  const isReady      = phase === 'ready';
  const isDownloading= phase === 'downloading';
  const isDone       = phase === 'done';
  const isError      = phase === 'error';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { -webkit-text-size-adjust: 100%; }
        body { background: #0a0a0f; overflow-x: hidden; }

        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:0.5; } }

        .fade-up { animation: fadeUp 0.4s ease forwards; }

        .tts-root {
          min-height: 100vh;
          background: #0a0a0f;
          color: #e8e8f0;
          font-family: 'DM Sans', 'Helvetica Neue', Arial, sans-serif;
          padding: 0 16px 120px; /* extra bottom padding for anchor ad */
          -webkit-font-smoothing: antialiased;
        }

        .tts-grid {
          max-width: 720px;
          margin: 0 auto;
          width: 100%;
        }

        .tts-header {
          padding-top: 40px;
          padding-bottom: 32px;
          text-align: center;
        }
        @media (min-width: 480px) {
          .tts-header { padding-top: 52px; padding-bottom: 40px; }
        }

        .tts-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(254,44,85,0.12);
          border: 1px solid rgba(254,44,85,0.3);
          color: #fe2c55;
          border-radius: 100px;
          padding: 5px 14px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }
        @media (min-width: 480px) {
          .tts-badge { font-size: 12px; margin-bottom: 20px; }
        }

        .tts-h1 {
          font-size: clamp(26px, 8vw, 52px);
          font-weight: 800;
          line-height: 1.1;
          margin: 0 0 12px;
          letter-spacing: -0.03em;
          color: #ffffff;
        }

        .tts-accent {
          background: linear-gradient(135deg, #fe2c55, #ff006e, #8338ec);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .tts-subtitle {
          color: rgba(255,255,255,0.45);
          font-size: 14px;
          line-height: 1.6;
          margin: 0;
        }
        @media (min-width: 480px) {
          .tts-subtitle { font-size: 16px; }
        }

        .tts-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 12px;
        }
        @media (min-width: 480px) {
          .tts-card { border-radius: 20px; padding: 28px; margin-bottom: 16px; }
        }

        .tts-input-wrap {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        @media (min-width: 540px) {
          .tts-input-wrap { flex-direction: row; align-items: center; }
        }

        .tts-input {
          width: 100%;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          padding: 14px 16px;
          color: #fff;
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: inherit;
          -webkit-appearance: none;
        }
        .tts-input:focus {
          border-color: rgba(254,44,85,0.6);
          box-shadow: 0 0 0 3px rgba(254,44,85,0.1);
        }
        .tts-input::placeholder { color: rgba(255,255,255,0.2); }

        .tts-btn {
          width: 100%;
          background: linear-gradient(135deg, #fe2c55, #8338ec);
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 14px 20px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          white-space: nowrap;
          transition: opacity 0.2s, transform 0.15s;
          font-family: inherit;
          flex-shrink: 0;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        @media (min-width: 540px) { .tts-btn { width: auto; } }
        .tts-btn:hover:not(:disabled) { opacity: 0.88; transform: scale(1.02); }
        .tts-btn:active:not(:disabled) { transform: scale(0.98); }
        .tts-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .tts-section-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.25);
          margin: 0 0 14px;
          display: block;
        }

        .tts-error {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: rgba(254,44,85,0.08);
          border: 1px solid rgba(254,44,85,0.25);
          border-radius: 12px;
          padding: 14px 16px;
          margin-top: 14px;
          color: #ff6b87;
          font-size: 14px;
          line-height: 1.5;
        }

        .tts-video-card {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.07);
        }

        .tts-thumbnail {
          width: 68px;
          height: 68px;
          border-radius: 10px;
          object-fit: cover;
          flex-shrink: 0;
          background: rgba(255,255,255,0.06);
        }
        @media (min-width: 400px) {
          .tts-thumbnail { width: 80px; height: 80px; }
        }

        .tts-video-title {
          font-weight: 700;
          font-size: 14px;
          margin: 0 0 4px;
          color: #fff;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        @media (min-width: 400px) { .tts-video-title { font-size: 15px; } }

        .tts-video-author {
          color: #fe2c55;
          font-size: 12px;
          margin: 0 0 8px;
          font-weight: 600;
        }

        .tts-video-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          color: rgba(255,255,255,0.4);
          font-size: 12px;
        }

        .tts-stat {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .tts-fetching-indicator {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 16px;
          color: rgba(255,255,255,0.4);
          font-size: 13px;
        }

        .tts-pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #fe2c55;
          animation: pulse 1s ease infinite;
          flex-shrink: 0;
        }

        .tts-downloading-box {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(131,56,236,0.1);
          border: 1px solid rgba(131,56,236,0.2);
          border-radius: 12px;
          color: rgba(255,255,255,0.7);
          font-size: 14px;
          margin-top: 16px;
        }

        .tts-done-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 12px 0;
          margin-top: 16px;
        }

        .tts-check-circle {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(52,199,89,0.15);
          border: 2px solid rgba(52,199,89,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #34c759;
        }

        .tts-reset-btn {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          color: #fff;
          border-radius: 10px;
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          transition: opacity 0.2s;
        }
        .tts-reset-btn:hover { opacity: 0.8; }

        /* ── Banner Ad slot ── */
        .tts-banner-ad-wrap {
          margin-bottom: 12px;
          display: flex;
          justify-content: center;
        }
        @media (min-width: 480px) {
          .tts-banner-ad-wrap { margin-bottom: 16px; }
        }

        .tts-disclaimer {
          background: rgba(255,200,0,0.05);
          border: 1px solid rgba(255,200,0,0.15);
          border-radius: 12px;
          padding: 14px 16px;
          font-size: 12px;
          color: rgba(255,255,255,0.4);
          line-height: 1.7;
          margin-bottom: 12px;
        }
        @media (min-width: 480px) {
          .tts-disclaimer { margin-bottom: 16px; padding: 16px 18px; }
        }

        .tts-features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 12px;
        }
        @media (min-width: 480px) {
          .tts-features-grid { gap: 12px; margin-bottom: 16px; }
        }

        .tts-feature-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 16px;
        }
        @media (min-width: 480px) {
          .tts-feature-card { border-radius: 16px; padding: 20px; }
        }

        .tts-feature-icon {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          background: rgba(254,44,85,0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
          color: #fe2c55;
        }
        @media (min-width: 480px) {
          .tts-feature-icon { width: 36px; height: 36px; border-radius: 10px; }
        }

        .tts-feature-title {
          font-weight: 700;
          font-size: 13px;
          margin: 0 0 4px;
          color: #fff;
        }
        @media (min-width: 480px) { .tts-feature-title { font-size: 14px; } }

        .tts-feature-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          margin: 0;
          line-height: 1.5;
        }
        @media (min-width: 480px) { .tts-feature-sub { font-size: 12px; } }

        .tts-steps { display: flex; flex-direction: column; gap: 16px; }
        @media (min-width: 480px) { .tts-steps { gap: 18px; } }

        .tts-step { display: flex; gap: 14px; align-items: flex-start; }

        .tts-step-num {
          flex-shrink: 0;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg, #fe2c55, #8338ec);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 13px;
          color: #fff;
        }
        @media (min-width: 480px) { .tts-step-num { width: 32px; height: 32px; font-size: 14px; } }

        .tts-step-title { font-weight: 700; font-size: 13px; color: #fff; margin: 0 0 2px; }
        @media (min-width: 480px) { .tts-step-title { font-size: 14px; } }

        .tts-step-desc { font-size: 12px; color: rgba(255,255,255,0.45); line-height: 1.5; }
        @media (min-width: 480px) { .tts-step-desc { font-size: 13px; } }

        .tts-faq { display: flex; flex-direction: column; gap: 18px; }
        @media (min-width: 480px) { .tts-faq { gap: 20px; } }

        .tts-faq-q { font-weight: 700; font-size: 14px; color: #fff; margin: 0 0 5px; }
        @media (min-width: 480px) { .tts-faq-q { font-size: 15px; margin: 0 0 6px; } }

        .tts-faq-a { font-size: 13px; color: rgba(255,255,255,0.5); margin: 0; line-height: 1.6; }
        @media (min-width: 480px) { .tts-faq-a { font-size: 14px; } }

        .tts-footer {
          text-align: center;
          color: rgba(255,255,255,0.2);
          font-size: 11px;
          line-height: 2;
          margin-top: 8px;
        }
        @media (min-width: 480px) { .tts-footer { font-size: 12px; } }

        .tts-download-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 16px;
        }
        @media (min-width: 480px) { .tts-download-grid { gap: 12px; } }

        .tts-dl-btn {
          border-radius: 14px;
          padding: 16px 12px;
          border: none;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 7px;
          font-family: inherit;
          transition: transform 0.15s, opacity 0.15s;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          min-height: 88px;
        }
        @media (min-width: 480px) { .tts-dl-btn { padding: 18px 14px; min-height: auto; } }
        .tts-dl-btn:hover:not(:disabled) { transform: scale(1.03); }
        .tts-dl-btn:active:not(:disabled) { transform: scale(0.97); }

        .tts-dl-btn-label { font-size: 13px; font-weight: 700; color: #fff; }
        @media (min-width: 480px) { .tts-dl-btn-label { font-size: 15px; } }

        .tts-dl-btn-sub { font-size: 10px; opacity: 0.7; color: #fff; }
        @media (min-width: 480px) { .tts-dl-btn-sub { font-size: 11px; } }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>

      {/* ── Video Interstitial Ad (modal, every 2 downloads) ── */}
      <VideoInterstitial
        show={showVideoAd}
        onClose={handleVideoAdClose}
      />

      {/* ── Anchor / Sticky Footer Ad ── */}
      <AnchorAd />

      <div className="tts-root">
        <div className="tts-grid">

          <header className="tts-header fade-up">
            <div className="tts-badge">
              <IconSparkle />
              Free · Fast · HD
            </div>
            <h1 className="tts-h1">
              Download TikTok{' '}
              <span className="tts-accent">Videos</span>
            </h1>
            <p className="tts-subtitle">
              No watermark · Original quality · Works on all devices
            </p>
          </header>

          {/* ── Main Input Card ── */}
          <div className="tts-card fade-up">
            <span className="tts-section-label">Paste your TikTok link</span>

            <div className="tts-input-wrap">
              <input
                className="tts-input"
                type="url"
                inputMode="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !isFetching && handleFetch()}
                placeholder="https://www.tiktok.com/@user/video/..."
                disabled={isFetching || isDownloading}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              <button
                className="tts-btn"
                onClick={handleFetch}
                disabled={isFetching || isDownloading}
              >
                {isFetching ? <Spinner size={18} color="#fff" /> : <IconDownload />}
                {isFetching ? 'Fetching…' : 'Get Video'}
              </button>
            </div>

            {(isError || error) && (
              <div className="tts-error fade-up">
                <IconAlert />
                <span>{error}</span>
              </div>
            )}

            {isFetching && (
              <div className="tts-fetching-indicator">
                <div className="tts-pulse-dot" />
                Extracting video info…
              </div>
            )}

            {videoData && (isReady || isDownloading || isDone) && (
              <>
                <div className="tts-video-card fade-up">
                  {videoData.thumbnail && (
                    <img src={videoData.thumbnail} alt="thumbnail" className="tts-thumbnail" />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="tts-video-title">{videoData.title}</p>
                    <p className="tts-video-author">@{videoData.author}</p>
                    <div className="tts-video-stats">
                      <span className="tts-stat"><IconClock /> {formatDuration(videoData.duration)}</span>
                      {videoData.views && <span className="tts-stat"><IconEye /> {formatCount(videoData.views)}</span>}
                      {videoData.likes && <span className="tts-stat"><IconHeart /> {formatCount(videoData.likes)}</span>}
                    </div>
                  </div>
                </div>

                {isReady && (
                  <div className="tts-download-grid fade-up">
                    <button
                      className="tts-dl-btn"
                      style={{
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.12)',
                      }}
                      onClick={() => handleDownload('watermark')}
                    >
                      <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}><IconWatermark /></div>
                      <span className="tts-dl-btn-label">With Watermark</span>
                      <span className="tts-dl-btn-sub">Original TikTok file</span>
                    </button>

                    <button
                      className="tts-dl-btn"
                      style={{
                        background: 'linear-gradient(135deg, #fe2c55, #8338ec)',
                        border: '2px solid rgba(255,255,255,0.15)',
                      }}
                      onClick={() => handleDownload('nowatermark')}
                    >
                      <div style={{ marginBottom: 2 }}><IconSparkle /></div>
                      <span className="tts-dl-btn-label">HD No Watermark</span>
                      <span className="tts-dl-btn-sub">⭐ Recommended</span>
                    </button>
                  </div>
                )}
              </>
            )}

            {isDownloading && (
              <div className="tts-downloading-box fade-up">
                <Spinner size={18} color="#8338ec" />
                <span>{downloadProgress || 'Preparing download…'}</span>
              </div>
            )}

            {isDone && (
              <div className="tts-done-box fade-up">
                <div className="tts-check-circle"><IconCheck /></div>
                <p style={{ color: '#34c759', fontWeight: 700, fontSize: '15px' }}>Download complete!</p>
                <button className="tts-reset-btn" onClick={reset}>
                  Download another video
                </button>
              </div>
            )}
          </div>

          {/* ── ExoClick Banner Ad (below card, above disclaimer) ── */}
          <div className="tts-banner-ad-wrap fade-up">
            <AdBanner />
          </div>

          <div className="tts-disclaimer">
            <strong style={{ color: 'rgba(255,200,0,0.7)' }}>Disclaimer:</strong> For personal use only. Users are responsible for complying with TikTok's Terms of Service and respecting creator copyright. Only download content you have permission to save.
          </div>

          <div className="tts-features-grid">
            {[
              { title: 'No Watermark', sub: 'Clean HD video without TikTok logo', icon: <IconSparkle /> },
              { title: 'HD Quality',   sub: 'Original resolution up to 1080p',    icon: <IconCheck />   },
              { title: 'Lightning Fast',sub: 'Fresh extraction in seconds',        icon: <IconDownload />},
              { title: '100% Free',    sub: 'No signup or payment needed',         icon: <IconHeart />   },
            ].map(f => (
              <div key={f.title} className="tts-feature-card">
                <div className="tts-feature-icon">{f.icon}</div>
                <p className="tts-feature-title">{f.title}</p>
                <p className="tts-feature-sub">{f.sub}</p>
              </div>
            ))}
          </div>

          <div className="tts-card">
            <span className="tts-section-label">How to download</span>
            <div className="tts-steps">
              {[
                { n: 1, title: 'Copy TikTok link',         desc: 'Open TikTok → tap Share → Copy Link on any video.' },
                { n: 2, title: 'Paste & fetch',            desc: 'Paste the link above and tap "Get Video".' },
                { n: 3, title: 'Choose format & download', desc: 'Pick HD No Watermark or Original, then save to your device.' },
              ].map(s => (
                <div key={s.n} className="tts-step">
                  <div className="tts-step-num">{s.n}</div>
                  <div>
                    <p className="tts-step-title">{s.title}</p>
                    <p className="tts-step-desc">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="tts-card">
            <span className="tts-section-label">FAQ</span>
            <div className="tts-faq">
              {[
                { q: 'Is this TikTok downloader free?',    a: 'Yes, completely free with no hidden fees or registration.' },
                { q: 'Can I download without watermark?',  a: 'Absolutely — we offer both watermark and clean HD downloads.' },
                { q: 'Does it work on mobile?',            a: 'Yes, works on iPhone, Android, and all desktop browsers.' },
                { q: 'Why does download take a moment?',   a: 'We re-extract a fresh download link each time to guarantee it works — TikTok CDN URLs expire in seconds.' },
              ].map(f => (
                <div key={f.q}>
                  <p className="tts-faq-q">{f.q}</p>
                  <p className="tts-faq-a">{f.a}</p>
                </div>
              ))}
            </div>
          </div>

          <footer className="tts-footer">
            <p>© 2025 TikTok Video Downloader. Not affiliated with TikTok or ByteDance.</p>
            <p>© 2025 A Product Of Cyntax LLC</p>
            <p>Use downloaded content responsibly and respect creator rights.</p>
          </footer>

        </div>
      </div>
    </>
  );
}