'use client';

import React, { useEffect, useRef, useState } from 'react';

type Edge = 'left' | 'right' | 'top' | 'bottom';

interface EdgeImageConfig {
  src: string;
  edge: Edge;
  baseOffset: number;
  delta: number;
  size: Pick<React.CSSProperties, 'width' | 'height'>;
}

const imageConfig: EdgeImageConfig[] = [
  {
    src: '/teaser/left.png',
    edge: 'left',
    baseOffset: 0,
    delta: -160,
    size: { height: '115%' }
  },
  {
    src: '/teaser/right.png',
    edge: 'right',
    baseOffset: 0,
    delta: -100,
    size: { height: '115%' }
  },
  {
    src: '/teaser/top.png',
    edge: 'top',
    baseOffset: 0,
    delta: -80,
    size: { width: '115%' }
  },
  {
    src: '/teaser/bottom.png',
    edge: 'bottom',
    baseOffset: 0,
    delta: -100,
    size: { width: '115%' }
  }
];

const TeaserCard = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textArea = document.createElement('textarea');
    textArea.value = 'dusantomic@gmail.com';
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    
    document.body.removeChild(textArea);
  };

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const scrollRange = { start: 0, end: 1 };
    const clamp = (value: number) => Math.max(0, Math.min(1, value));

    const updateProgress = () => {
      const { start, end } = scrollRange;
      if (end <= start) return;

      const rawProgress = (window.scrollY - start) / (end - start);
      setProgress(clamp(rawProgress));
    };

    const updateScrollRange = () => {
      const rect = card.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset;
      const windowHeight = window.innerHeight;

      scrollRange.start = scrollY + rect.top - windowHeight;
      scrollRange.end = scrollY + rect.bottom;

      // Keep the range positive so division above stays safe
      if (scrollRange.end <= scrollRange.start) {
        scrollRange.end = scrollRange.start + Math.max(rect.height, 1);
      }

      updateProgress();
    };

    updateScrollRange();

    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateScrollRange);

    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateScrollRange);
    };
  }, []);

  const getImageStyle = (config: EdgeImageConfig) => {
    const offset = config.baseOffset + config.delta * progress;
    const style: React.CSSProperties = {
      position: 'absolute',
      ...config.size,
      transition: 'none',
      pointerEvents: 'none',
      objectFit: 'contain'
    };

    switch (config.edge) {
      case 'left':
        style.left = `${offset}px`;
        style.top = '50%';
        style.transform = 'translateY(-50%)';
        style.willChange = 'left';
        break;
      case 'right':
        style.right = `${offset}px`;
        style.top = '50%';
        style.transform = 'translateY(-50%)';
        style.willChange = 'right';
        break;
      case 'top':
        style.top = `${offset}px`;
        style.left = '50%';
        style.transform = 'translateX(-50%)';
        style.willChange = 'top';
        break;
      case 'bottom':
      default:
        style.bottom = `${offset}px`;
        style.left = '50%';
        style.transform = 'translateX(-50%)';
        style.willChange = 'bottom';
        break;
    }

    return style;
  };

  return (
    <div ref={cardRef} className="teaser-card">
      <div className="teaser-images">
        {imageConfig.map((config) => (
          <React.Fragment key={config.src}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
            src={config.src}
            alt=""
            className="teaser-img"
            style={getImageStyle(config)}
            aria-hidden="true"
            />
          </React.Fragment>
        ))}
      </div>

      <div className="teaser-content">
        <h2 className="teaser-title">
          Curious to see<br />more work?
        </h2>

        <a
          className="cta-button"
          href="https://cal.com/dusantmc/intro-call"
          target="_blank"
          rel="noopener noreferrer"
        >
          Let&apos;s talk
        </a>
        <p className="teaser-text">Prefer email? Write me at</p>

        <div className="cta-email-wrapper">
          <button
            className="cta-email"
            onClick={() => window.open('mailto:dusantomic@gmail.com')}
          >
            dusantomic@gmail.com
          </button>

          <div className="copy-wrapper">
            <button className="copy-btn" onClick={handleCopy} aria-label="Copy Email">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <span className="copy-tooltip">
              {copied ? 'Copied!' : 'Copy Email'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeaserCard;
