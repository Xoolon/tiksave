import { useEffect, useRef } from 'react';

export default function AdBanner({ scriptSrc, containerId }) {
  const scriptAdded = useRef(false);

  useEffect(() => {
    // Avoid duplicate script injection
    if (scriptAdded.current) return;
    if (document.querySelector(`script[src="${scriptSrc}"]`)) return;

    const script = document.createElement('script');
    script.src = scriptSrc;
    script.async = true;
    script.setAttribute('data-cfasync', 'false'); // recommended by PropellerAds
    script.onload = () => {
      // Some ad networks need a re‑initialization call; PropellerAds usually auto‑runs
    };
    document.head.appendChild(script);
    scriptAdded.current = true;

    // Optional cleanup – rarely needed for these scripts
    return () => {
      // If you ever remove the component, you might want to remove the script
      // but it's usually safe to leave it.
    };
  }, [scriptSrc]);

  return (
    <div
      id={containerId}
      style={{
        width: '100%',
        minHeight: '100px',          // prevents layout shift while ad loads
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    />
  );
}