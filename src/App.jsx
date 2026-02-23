import React, { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

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

const IconLoader = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" style={{opacity:0.4}}/>
    <path d="M12 2v4" style={{opacity:1}}/>
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
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

// ─── Ad Placeholder ───────────────────────────────────────────────────────────
const AdBanner = ({ label = 'Advertisement' }) => (
  <div style={{
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    fontSize: '12px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    minHeight: '90px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    {label} · AdSense / AdMob Slot
  </div>
);

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = ({ size = 24, color = '#fe2c55' }) => {
  const spinnerStyle = {
    width: size,
    height: size,
    border: `3px solid rgba(255,255,255,0.1)`,
    borderTop: `3px solid ${color}`,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  };
  return <div style={spinnerStyle} />;
};

// ─── Progress Ring ────────────────────────────────────────────────────────────
const ProgressRing = ({ seconds, total = 15 }) => {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const progress = ((total - seconds) / total) * circ;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke="#fe2c55"
        strokeWidth="6"
        strokeDasharray={circ}
        strokeDashoffset={circ - progress}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 1s linear' }}
      />
      <text x="50" y="56" textAnchor="middle" fill="white" fontSize="22" fontWeight="700" fontFamily="'DM Mono', monospace">
        {seconds}
      </text>
    </svg>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TikTokDownloader() {
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | fetching | ad | downloading | done | error
  const [error, setError] = useState('');
  const [videoData, setVideoData] = useState(null);
  const [adTimer, setAdTimer] = useState(15);
  const [downloadingType, setDownloadingType] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState('');
  const adIntervalRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => () => clearInterval(adIntervalRef.current), []);

  const startAdCountdown = () => {
    setAdTimer(15);
    setPhase('ad');
    adIntervalRef.current = setInterval(() => {
      setAdTimer(prev => {
        if (prev <= 1) {
          clearInterval(adIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleFetch = async () => {
    const trimmed = url.trim();
    setError('');

    if (!trimmed) {
      setError('Paste a TikTok video URL to get started.');
      return;
    }
    if (!isValidTikTokUrl(trimmed)) {
      setError('That doesn\'t look like a valid TikTok URL. Try copying the link from the app.');
      return;
    }

    setPhase('fetching');
    setVideoData(null);

    try {
      const res = await fetch(`/api/tiktok/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || `Server error (${res.status})`);
      }

      setVideoData(data);
      startAdCountdown();

    } catch (err) {
      setError(err.message || 'Failed to fetch video. Please check the URL and try again.');
      setPhase('error');
    }
  };

  /**
   * THE KEY FIX:
   * We call /api/proxy/stream with the ORIGINAL TikTok page URL (not a CDN URL).
   * The backend re-runs yt-dlp at this exact moment to get a fresh signed CDN URL
   * and immediately streams it — so the token is always valid.
   *
   * We use a hidden <a> tag with the stream endpoint URL. The browser sends the
   * request, the server streams the video bytes, and the browser saves the file.
   */
const handleDownload = async (type) => {
  if (adTimer > 0 || !videoData) return;

  const nowatermark = type === 'nowatermark';
  const filename = nowatermark ? videoData.filename_nowatermark : videoData.filename_watermark;
  // Strip any accidental quotes from the URL
  const tiktokUrl = videoData.tiktok_url.replace(/^["']|["']$/g, ''); // <-- added

  setDownloadingType(type);
  setDownloadProgress('Extracting fresh download link…');
  setPhase('downloading');

  try {
    // Build the stream URL pointing to the ORIGINAL TikTok URL
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

  } catch (err) {
    setError(err.message || 'Download failed. Please try again.');
    setPhase('error');
    setDownloadingType(null);
    setDownloadProgress('');
  }
};

  const reset = () => {
    setUrl('');
    setPhase('idle');
    setError('');
    setVideoData(null);
    setAdTimer(15);
    setDownloadingType(null);
    setDownloadProgress('');
    clearInterval(adIntervalRef.current);
  };

  // ─── Styles ───────────────────────────────────────────────────────────────
  const styles = {
    root: {
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#e8e8f0',
      fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
      padding: '0 16px 60px',
    },
    grid: {
      maxWidth: '720px',
      margin: '0 auto',
    },
    header: {
      paddingTop: '52px',
      paddingBottom: '40px',
      textAlign: 'center',
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      background: 'rgba(254,44,85,0.12)',
      border: '1px solid rgba(254,44,85,0.3)',
      color: '#fe2c55',
      borderRadius: '100px',
      padding: '5px 14px',
      fontSize: '12px',
      fontWeight: '600',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      marginBottom: '20px',
    },
    h1: {
      fontSize: 'clamp(32px, 6vw, 52px)',
      fontWeight: '800',
      lineHeight: '1.1',
      margin: '0 0 14px',
      letterSpacing: '-0.03em',
      color: '#ffffff',
    },
    accent: {
      background: 'linear-gradient(135deg, #fe2c55, #ff006e, #8338ec)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    subtitle: {
      color: 'rgba(255,255,255,0.45)',
      fontSize: '16px',
      lineHeight: '1.6',
      margin: 0,
    },
    card: {
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '20px',
      padding: '28px',
      marginBottom: '16px',
    },
    inputWrap: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
    },
    input: {
      flex: 1,
      background: 'rgba(255,255,255,0.06)',
      border: '1.5px solid rgba(255,255,255,0.12)',
      borderRadius: '12px',
      padding: '14px 18px',
      color: '#fff',
      fontSize: '15px',
      outline: 'none',
      transition: 'border-color 0.2s',
      fontFamily: 'inherit',
    },
    btn: {
      background: 'linear-gradient(135deg, #fe2c55, #8338ec)',
      color: '#fff',
      border: 'none',
      borderRadius: '12px',
      padding: '14px 24px',
      fontSize: '15px',
      fontWeight: '700',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      whiteSpace: 'nowrap',
      transition: 'opacity 0.2s, transform 0.15s',
      fontFamily: 'inherit',
      flexShrink: 0,
    },
    btnDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
      transform: 'none',
    },
    errorBox: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      background: 'rgba(254,44,85,0.08)',
      border: '1px solid rgba(254,44,85,0.25)',
      borderRadius: '12px',
      padding: '14px 16px',
      marginTop: '14px',
      color: '#ff6b87',
      fontSize: '14px',
      lineHeight: '1.5',
    },
    videoCard: {
      display: 'flex',
      gap: '16px',
      alignItems: 'flex-start',
    },
    thumbnail: {
      width: '80px',
      height: '80px',
      borderRadius: '10px',
      objectFit: 'cover',
      flexShrink: 0,
      background: 'rgba(255,255,255,0.06)',
    },
    videoMeta: {
      flex: 1,
      minWidth: 0,
    },
    videoTitle: {
      fontWeight: '700',
      fontSize: '15px',
      margin: '0 0 4px',
      color: '#fff',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    videoAuthor: {
      color: '#fe2c55',
      fontSize: '13px',
      margin: '0 0 8px',
      fontWeight: '600',
    },
    videoStats: {
      display: 'flex',
      gap: '14px',
      color: 'rgba(255,255,255,0.4)',
      fontSize: '12px',
    },
    stat: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    modalOverlay: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.92)',
      backdropFilter: 'blur(12px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    },
    modal: {
      background: '#12121c',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '24px',
      padding: '40px 36px',
      maxWidth: '480px',
      width: '100%',
      textAlign: 'center',
    },
    modalTitle: {
      fontSize: '22px',
      fontWeight: '800',
      color: '#fff',
      margin: '0 0 6px',
    },
    modalSub: {
      color: 'rgba(255,255,255,0.4)',
      fontSize: '14px',
      margin: '0 0 28px',
    },
    adZone: {
      background: 'linear-gradient(135deg, #1a1a2e, #0f3460)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px',
      padding: '32px',
      marginBottom: '28px',
      minHeight: '120px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'rgba(255,255,255,0.2)',
      fontSize: '12px',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
    },
    timerSection: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
    },
    timerLabel: {
      color: 'rgba(255,255,255,0.5)',
      fontSize: '13px',
    },
    downloadGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
    },
    dlBtn: {
      borderRadius: '14px',
      padding: '18px 14px',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      fontFamily: 'inherit',
      transition: 'transform 0.15s, opacity 0.15s',
    },
    dlBtnLabel: {
      fontSize: '15px',
      fontWeight: '700',
    },
    dlBtnSub: {
      fontSize: '11px',
      opacity: 0.7,
    },
    featuresGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '12px',
      marginBottom: '16px',
    },
    featureCard: {
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '16px',
      padding: '20px',
    },
    featureIcon: {
      width: '36px',
      height: '36px',
      borderRadius: '10px',
      background: 'rgba(254,44,85,0.12)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '10px',
      color: '#fe2c55',
    },
    featureTitle: {
      fontWeight: '700',
      fontSize: '14px',
      margin: '0 0 4px',
      color: '#fff',
    },
    featureSub: {
      fontSize: '12px',
      color: 'rgba(255,255,255,0.4)',
      margin: 0,
      lineHeight: '1.5',
    },
    howStep: {
      display: 'flex',
      gap: '16px',
      alignItems: 'flex-start',
    },
    stepNum: {
      flexShrink: 0,
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #fe2c55, #8338ec)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '800',
      fontSize: '14px',
      color: '#fff',
    },
    faqQ: {
      fontWeight: '700',
      fontSize: '15px',
      color: '#fff',
      margin: '0 0 6px',
    },
    faqA: {
      fontSize: '14px',
      color: 'rgba(255,255,255,0.5)',
      margin: 0,
      lineHeight: '1.6',
    },
    disclaimer: {
      background: 'rgba(255,200,0,0.05)',
      border: '1px solid rgba(255,200,0,0.15)',
      borderRadius: '12px',
      padding: '16px 18px',
      fontSize: '12px',
      color: 'rgba(255,255,255,0.4)',
      lineHeight: '1.7',
    },
    footer: {
      textAlign: 'center',
      color: 'rgba(255,255,255,0.2)',
      fontSize: '12px',
      lineHeight: '2',
    },
    doneBox: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      padding: '12px 0',
    },
    checkCircle: {
      width: '52px',
      height: '52px',
      borderRadius: '50%',
      background: 'rgba(52,199,89,0.15)',
      border: '2px solid rgba(52,199,89,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#34c759',
    },
    downloadingBox: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '16px',
      background: 'rgba(131,56,236,0.1)',
      border: '1px solid rgba(131,56,236,0.2)',
      borderRadius: '12px',
      color: 'rgba(255,255,255,0.7)',
      fontSize: '14px',
    },
    sectionLabel: {
      fontSize: '11px',
      fontWeight: '700',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.25)',
      margin: '0 0 14px',
    },
  };

  const isFetching = phase === 'fetching';
  const isDownloading = phase === 'downloading';
  const isDone = phase === 'done';
  const isError = phase === 'error';
  const showAd = phase === 'ad';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0f; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        .fade-up { animation: fadeUp 0.4s ease forwards; }
        .fetch-btn:hover:not(:disabled) { opacity: 0.88; transform: scale(1.02); }
        .dl-btn-nw:hover:not(:disabled) { transform: scale(1.03); }
        .dl-btn-w:hover:not(:disabled) { transform: scale(1.03); }
        input:focus { border-color: rgba(254,44,85,0.6) !important; box-shadow: 0 0 0 3px rgba(254,44,85,0.1); }
        input::placeholder { color: rgba(255,255,255,0.2); }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>

      <div style={styles.root}>
        <div style={styles.grid}>

          {/* ── Header ── */}
          <header style={styles.header} className="fade-up">
            <div style={styles.badge}>
              <IconSparkle />
              Free · Fast · HD
            </div>
            <h1 style={styles.h1}>
              Download TikTok{' '}
              <span style={styles.accent}>Videos</span>
            </h1>
            <p style={styles.subtitle}>
              No watermark · Original quality · Works on all devices
            </p>
          </header>

          {/* ── Top Ad ── */}
          <div style={{ marginBottom: '16px' }}>
            <AdBanner label="Top Banner — AdSense Slot #1" />
          </div>

          {/* ── Input Card ── */}
          <div style={styles.card} className="fade-up">
            <p style={styles.sectionLabel}>Paste your TikTok link</p>

            <div style={styles.inputWrap}>
              <input
                style={styles.input}
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !isFetching && handleFetch()}
                placeholder="https://www.tiktok.com/@username/video/..."
                disabled={isFetching || isDownloading}
              />
              <button
                className="fetch-btn"
                style={{
                  ...styles.btn,
                  ...(isFetching || isDownloading ? styles.btnDisabled : {}),
                }}
                onClick={handleFetch}
                disabled={isFetching || isDownloading}
              >
                {isFetching ? <Spinner size={18} color="#fff" /> : <IconDownload />}
                {isFetching ? 'Fetching…' : 'Get Video'}
              </button>
            </div>

            {/* Error */}
            {(isError || error) && (
              <div style={styles.errorBox} className="fade-up">
                <IconAlert />
                <span>{error}</span>
              </div>
            )}

            {/* Fetching indicator */}
            {isFetching && (
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginTop:'16px', color:'rgba(255,255,255,0.4)', fontSize:'13px' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#fe2c55', animation:'pulse 1s ease infinite' }} />
                Extracting video info…
              </div>
            )}

            {/* Video preview (shown when ad is running or download is ready) */}
            {videoData && (showAd || isDownloading || isDone) && (
              <div style={{ ...styles.videoCard, marginTop: '20px', paddingTop: '18px', borderTop: '1px solid rgba(255,255,255,0.07)' }} className="fade-up">
                {videoData.thumbnail && (
                  <img src={videoData.thumbnail} alt="thumbnail" style={styles.thumbnail} />
                )}
                <div style={styles.videoMeta}>
                  <p style={styles.videoTitle}>{videoData.title}</p>
                  <p style={styles.videoAuthor}>@{videoData.author}</p>
                  <div style={styles.videoStats}>
                    <span style={styles.stat}><IconClock /> {formatDuration(videoData.duration)}</span>
                    {videoData.views && <span style={styles.stat}><IconEye /> {formatCount(videoData.views)}</span>}
                    {videoData.likes && <span style={styles.stat}><IconHeart /> {formatCount(videoData.likes)}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Downloading state */}
            {isDownloading && (
              <div style={{ ...styles.downloadingBox, marginTop: '16px' }} className="fade-up">
                <Spinner size={18} color="#8338ec" />
                <span>{downloadProgress || 'Preparing download…'}</span>
              </div>
            )}

            {/* Done state */}
            {isDone && (
              <div style={{ ...styles.doneBox, marginTop: '16px' }} className="fade-up">
                <div style={styles.checkCircle}><IconCheck /></div>
                <p style={{ color: '#34c759', fontWeight: '700', fontSize: '15px' }}>Download complete!</p>
                <button
                  style={{ ...styles.btn, background: 'rgba(255,255,255,0.08)', fontSize: '13px', padding: '10px 18px', marginTop: '4px', border: '1px solid rgba(255,255,255,0.12)' }}
                  className="fetch-btn"
                  onClick={reset}
                >
                  Download another video
                </button>
              </div>
            )}
          </div>

          {/* ── Disclaimer ── */}
          <div style={{ ...styles.disclaimer, marginBottom: '16px' }}>
            <strong style={{ color: 'rgba(255,200,0,0.7)' }}>Disclaimer:</strong> For personal use only. Users are responsible for complying with TikTok's Terms of Service and respecting creator copyright. Only download content you have permission to save.
          </div>

          {/* ── Features ── */}
          <div style={styles.featuresGrid}>
            {[
              { title: 'No Watermark', sub: 'Clean HD video without TikTok logo', icon: <IconSparkle /> },
              { title: 'HD Quality', sub: 'Original resolution up to 1080p', icon: <IconCheck /> },
              { title: 'Lightning Fast', sub: 'Fresh extraction in seconds', icon: <IconDownload /> },
              { title: '100% Free', sub: 'No signup or payment needed', icon: <IconHeart /> },
            ].map(f => (
              <div key={f.title} style={styles.featureCard}>
                <div style={styles.featureIcon}>{f.icon}</div>
                <p style={styles.featureTitle}>{f.title}</p>
                <p style={styles.featureSub}>{f.sub}</p>
              </div>
            ))}
          </div>

          {/* ── How to use ── */}
          <div style={{ ...styles.card, marginBottom: '16px' }}>
            <p style={styles.sectionLabel}>How to download</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {[
                { n: 1, title: 'Copy TikTok link', desc: 'Open TikTok → tap Share → Copy Link on any video.' },
                { n: 2, title: 'Paste & fetch', desc: 'Paste the link above and tap "Get Video".' },
                { n: 3, title: 'Choose format & download', desc: 'Pick HD No Watermark or Original, then save to your device.' },
              ].map(s => (
                <div key={s.n} style={styles.howStep}>
                  <div style={styles.stepNum}>{s.n}</div>
                  <div>
                    <p style={{ fontWeight: '700', fontSize: '14px', color: '#fff', margin: '0 0 2px' }}>{s.title}</p>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.5' }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Bottom Ad ── */}
          <div style={{ marginBottom: '16px' }}>
            <AdBanner label="Bottom Banner — AdMob Fallback Slot #2" />
          </div>

          {/* ── FAQ ── */}
          <div style={{ ...styles.card, marginBottom: '24px' }}>
            <p style={styles.sectionLabel}>FAQ</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                { q: 'Is this TikTok downloader free?', a: 'Yes, completely free with no hidden fees or registration.' },
                { q: 'Can I download without watermark?', a: 'Absolutely — we offer both watermark and clean HD downloads.' },
                { q: 'Does it work on mobile?', a: 'Yes, works on iPhone, Android, and all desktop browsers.' },
                { q: 'Why does download take a moment?', a: 'We re-extract a fresh download link each time to guarantee it works — TikTok CDN URLs expire in seconds.' },
              ].map(f => (
                <div key={f.q}>
                  <p style={styles.faqQ}>{f.q}</p>
                  <p style={styles.faqA}>{f.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Footer ── */}
          <footer style={styles.footer}>
            <p>© 2024 TikTok Video Downloader. Not affiliated with TikTok or ByteDance.</p>
            <p>Use downloaded content responsibly and respect creator rights.</p>
          </footer>
        </div>
      </div>

      {/* ── Ad Modal (15-second gate) ── */}
      {showAd && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal} className="fade-up">
            <p style={styles.modalTitle}>Almost there</p>
            <p style={styles.modalSub}>Please wait for the ad to finish</p>

            {/* Ad zone */}
            <div style={styles.adZone}>
              AdSense / AdMob Video Ad · 15 seconds · Supporting free service
            </div>

            {/* Timer or download buttons */}
            {adTimer > 0 ? (
              <div style={styles.timerSection}>
                <ProgressRing seconds={adTimer} />
                <p style={styles.timerLabel}>Your download will be ready in {adTimer}s</p>
              </div>
            ) : (
              <div className="fade-up">
                <p style={{ ...styles.timerLabel, marginBottom: '16px', color: '#34c759', fontWeight: '700', fontSize: '15px' }}>
                  ✓ Ready to download
                </p>
                <div style={styles.downloadGrid}>
                  <button
                    className="dl-btn-w"
                    style={{
                      ...styles.dlBtn,
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleDownload('watermark')}
                  >
                    <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2px' }}><IconWatermark /></div>
                    <span style={styles.dlBtnLabel}>With Watermark</span>
                    <span style={styles.dlBtnSub}>Original TikTok file</span>
                  </button>

                  <button
                    className="dl-btn-nw"
                    style={{
                      ...styles.dlBtn,
                      background: 'linear-gradient(135deg, #fe2c55, #8338ec)',
                      border: '2px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleDownload('nowatermark')}
                  >
                    <div style={{ marginBottom: '2px' }}><IconSparkle /></div>
                    <span style={styles.dlBtnLabel}>HD No Watermark</span>
                    <span style={styles.dlBtnSub}>⭐ Recommended</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}