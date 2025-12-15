'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import parse from 'html-react-parser';
import MagneticSocialLink from './MagneticSocialLink';
import LottiePlayer from './LottiePlayer';

interface TeaserCardProps {
  handleCopy: () => void;
  copied: boolean;
}

type Edge = 'left' | 'right' | 'top' | 'bottom';

interface ModalSection {
  headline: string;
  body: string | React.ReactNode;
  imagePlaceholder?: string;
}

interface ModalData {
  imageSrcs: string[];
  headline: string;
  body: string;
  role: string;
  results: string;
  sections: ModalSection[];
  imageLayout?: 'mosaik'; // Special layout type
}

interface EdgeImageConfig {
  src: string;
  edge: Edge;
  baseOffset: number;
  delta: number;
  size: Pick<React.CSSProperties, 'width' | 'height'>;
}

const imageConfig: EdgeImageConfig[] = [
  {
    src: '/teaser/left.webp',
    edge: 'left',
    baseOffset: 0,
    delta: -180,
    size: { height: '115%' }
  },
  {
    src: '/teaser/right.webp',
    edge: 'right',
    baseOffset: 0,
    delta: -160,
    size: { height: '115%' }
  },
  {
    src: '/teaser/top.webp',
    edge: 'top',
    baseOffset: 0,
    delta: -280,
    size: { width: '115%' }
  },
  {
    src: '/teaser/bottom.webp',
    edge: 'bottom',
    baseOffset: 0,
    delta: -100,
    size: { width: '115%' }
  }
];

const TeaserCardParallax: React.FC<TeaserCardProps> = ({ handleCopy, copied }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

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

  const getImageStyle = (config: EdgeImageConfig): React.CSSProperties => {
    const offset = config.baseOffset + config.delta * progress;
    const style: React.CSSProperties = {
      ...config.size,
      position: 'absolute',
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

  useEffect(() => {
    import('@lottielab/lottie-player');
  }, []);

  const [isTeaserHovered, setTeaserHover] = useState(false);

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
          href="https://cal.com/dusantmc/intro-call"
          target="_blank"
          rel="noopener noreferrer"
          className={`cta-button lottie-button teaser-cta${isTeaserHovered ? ' is-hovered' : ''}`}
          onMouseEnter={() => setTeaserHover(true)}
          onMouseLeave={() => setTeaserHover(false)}
          onFocus={() => setTeaserHover(true)}
          onBlur={() => setTeaserHover(false)}
        >
          <span className="cta-label">Let&apos;s talk</span>
          <LottiePlayer
            src="/icons/lottiebg.json"
            className="cta-lottie cta-lottie--teaser"
            renderer="svg"
            background="transparent"
            autoplay
            loop
            aria-hidden="true"
          />
        </a>
        <p className="teaser-text">Prefer email? Write me at</p>

        <div className="cta-email-wrapper">
          <button className="cta-email" onClick={() => window.open('mailto:dusantomic@gmail.com')}>
            dusantomic@gmail.com
          </button>

          <div className="copy-wrapper">
            <button className="copy-btn" onClick={handleCopy} aria-label="Copy Email">
              <Image src="/icons/copybtn.svg" alt="Copy" width={20} height={20} />
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

// Modal data mapping
const getModalData = (imageSrcs: string[], projectId?: string): ModalData => {
  // MyFlexHelper specific data
  if (projectId === 'myflexhelper' || imageSrcs[0] === '/portfolio/mfh.webp') {
    return {
      imageSrcs: ['/portfolio/mfh-start.png', '/portfolio/mfh.png', '/portfolio/mfh-filters.png'],
      headline: 'MyFlexHelper',
      body: 'End-to-end design of a gig-driver automation PWA that scaled to $100k+ MRR.',
      role: 'Product Designer',
      results: 'Award Winner 2024',
      sections: [
      ]
    };
  }

  // Mosaik - unified modal for all Mosaik projects
  if (imageSrcs[0] === '/portfolio/mosaikapp.png' || 
      imageSrcs[0] === '/portfolio/mosaik-landing.jpg' || 
      imageSrcs[0] === '/portfolio/mosaikapp1.png' || 
      imageSrcs[0] === '/portfolio/mosaikapp2.png' || 
      imageSrcs[0] === '/portfolio/mosaikapp3.png' || 
      projectId === 'mosaik' || 
      projectId === 'mosaik-mobile') {
    return {
      imageSrcs: [
        '/portfolio/mosaikapp.png',
        '/portfolio/mosaikapp1.png',
        '/portfolio/mosaikapp2.png',
        '/portfolio/mosaikapp3.png',
        '/portfolio/mosaik-landing.jpg'
      ],
      headline: 'Mosaik',
      body: 'Led product design across Mosaik\'s web, mobile, and marketing platforms as the company grew from a stealth startup to a $100M business.',
      role: 'Product Designer',
      results: '',
      sections: [],
      imageLayout: 'mosaik'
    };
  }

  // MC2 Finance
  if (imageSrcs[0] === '/portfolio/mc2.webp') {
    return {
      imageSrcs,
      headline: 'MC2 Finance',
      body: 'Redesigned and improved the app and its crypto purchase flow, helping the platform scale to $50M AUM.',
      role: 'Product Designer',
      results: '',
      sections: []
    };
  }

  // LevelUp Mobile App (3 images)
  if (imageSrcs[0] === '/portfolio/level-1.webp' || projectId === 'levelup-mobile') {
    return {
      imageSrcs: ['/portfolio/level-1.webp', '/portfolio/level-2.webp', '/portfolio/level-3.webp'],
      headline: 'LevelUp Mobile App',
      body: 'Designed the entire messaging app, branding, and design system, including an investor demo for the paid-messaging platform that helped secure funding.',
      role: 'Product Designer',
      results: '',
      sections: []
    };
  }

  // E-Commerce Editor
  if (imageSrcs[0] === '/portfolio/hmeditor.webp') {
    return {
      imageSrcs,
      headline: 'E-Commerce Editor',
      body: 'Designed a full e-commerce editor from scratch, including a library of reusable templates and components.',
      role: 'Product Designer',
      results: '',
      sections: []
    };
  }

  // Kriptomat Mobile App (3 images)
  if (imageSrcs[0] === '/portfolio/kripto-1.webp' || projectId === 'kriptomat-mobile') {
    return {
      imageSrcs: ['/portfolio/kripto-1.webp', '/portfolio/kripto-2.webp', '/portfolio/kripto-3.webp'],
      headline: 'Kriptomat Mobile App',
      body: 'Led the full redesign of the mobile app, resulting in significantly higher usage and crypto purchases across the platform.',
      role: 'Product Designer',
      results: '',
      sections: []
    };
  }

  // Default modal data
  return {
    imageSrcs,
    headline: 'Project Title',
    body: 'Project description.',
    role: 'Product Designer',
    results: '',
    sections: []
  };
};

const RightPanel: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [modalData, setModalData] = useState<ModalData | null>(null);

  const fallbackCopy = () => {
    const textArea = document.createElement('textarea');
    textArea.value = 'dusantomic@gmail.com';
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
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

  const handleCopy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText('dusantomic@gmail.com')
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
        .catch(() => {
          fallbackCopy();
        });
    } else {
      fallbackCopy();
    }
  };

  const openModal = (imageSrc: string | string[], projectId?: string) => {
    const imageSrcs = Array.isArray(imageSrc) ? imageSrc : [imageSrc];
    setModalData(getModalData(imageSrcs, projectId));
  };

  const closeModal = () => setModalData(null);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeModal();
  };

  // Close modal on ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modalData) closeModal();
    };
    if (modalData) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [modalData]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (modalData) {
      // Save current overflow value
      const originalOverflow = document.body.style.overflow;
      // Disable body scroll
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore original overflow when modal closes
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [modalData]);

  return (
    <div className="right-panel">
      {/* Mosaik Web App 
      <div className="card card-full">
        <div className="landing-container" onClick={() => openModal('/portfolio/mosaikapp.png', 'mosaik')}>
          <Image
            src="/portfolio/mosaikapp80.webp"
            alt="Mosaik Web App"
            width={800}
            height={468}
            className="portfolio-image"
          />
        </div>
        <div className="portfolio-footer">
          <Image
            src="/portfolio/ico-mosaik.png"
            alt="Mosaik"
            width={96}
            height={96}
            className="portfolio-icon"
          />
          <span className="portfolio-label">Mosaik Web App</span>
        </div>
      </div>
*/}




      {/* MC2 */}
      <div className="card card-full">
        <div className="landing-container" onClick={() => openModal('/portfolio/mc2.webp')}>
          <Image
            src="/portfolio/mc2.webp"
            alt="MC2 Finance"
            width={800}
            height={468}
            className="portfolio-image"
          />
        </div>
        <div className="portfolio-footer">
          <Image
            src="/portfolio/ico-mc2.png"
            alt="MC2"
            width={96}
            height={96}
            className="portfolio-icon"
          />
          <span className="portfolio-label">MC2 Finance</span>
        </div>
      </div>

      {/* LevelUp */}
      <div className="card card-full">
        <div className="mobile-container">
          <div className="mobile-box" onClick={() => openModal('/portfolio/level-1.webp', 'levelup-mobile')}>
            <Image
              src="/portfolio/level-1.webp"
              alt="Level Up"
              width={240}
              height={520}
              className="portfolio-image"
            />
          </div>
          <div className="mobile-box" onClick={() => openModal('/portfolio/level-2.webp', 'levelup-mobile')}>
            <Image
              src="/portfolio/level-2.webp"
              alt="Level Up"
              width={240}
              height={520}
              className="portfolio-image"
            />
          </div>
          <div className="mobile-box" onClick={() => openModal('/portfolio/level-3.webp', 'levelup-mobile')}>
            <Image
              src="/portfolio/level-3.webp"
              alt="Level Up"
              width={240}
              height={520}
              className="portfolio-image"
            />
          </div>
        </div>
        <div className="portfolio-footer">
          <Image
            src="/portfolio/ico-levelup.png"
            alt="Level Up"
            width={96}
            height={96}
            className="portfolio-icon"
          />
          <span className="portfolio-label">LevelUp Mobile App</span>
        </div>
      </div>

      {/* E-Commerce Editor */}
      <div className="card card-full">
        <div className="landing-container" onClick={() => openModal('/portfolio/hmeditor.webp')}>
          <Image
            src="/portfolio/hmeditor.webp"
            alt="E-Commerce Editor"
            width={800}
            height={468}
            className="portfolio-image"
          />
        </div>
        <div className="portfolio-footer">
          <Image
            src="/portfolio/ico-ecommerce.png"
            alt="HM Editor"
            width={96}
            height={96}
            className="portfolio-icon"
          />
          <span className="portfolio-label">E-Commerce Editor</span>
        </div>
      </div>

      {/* Kriptomat Mobile App */}
      <div className="card card-full">
        <div className="mobile-container">
          <div className="mobile-box" onClick={() => openModal('/portfolio/kripto-1.webp', 'kriptomat-mobile')}>
            <Image
              src="/portfolio/kripto-1.webp"
              alt="Kriptomat"
              width={240}
              height={520}
              className="portfolio-image"
            />
          </div>
          <div className="mobile-box" onClick={() => openModal('/portfolio/kripto-2.webp', 'kriptomat-mobile')}>
            <Image
              src="/portfolio/kripto-2.webp"
              alt="Kriptomat"
              width={240}
              height={520}
              className="portfolio-image"
            />
          </div>
          <div className="mobile-box" onClick={() => openModal('/portfolio/kripto-3.webp', 'kriptomat-mobile')}>
            <Image
              src="/portfolio/kripto-3.webp"
              alt="Kriptomat"
              width={240}
              height={520}
              className="portfolio-image"
            />
          </div>
        </div>
        <div className="portfolio-footer">
          <Image
            src="/portfolio/ico-kripto.png"
            alt="Kriptomat"
            width={96}
            height={96}
            className="portfolio-icon"
          />
          <span className="portfolio-label">Kriptomat Mobile App</span>
        </div>
      </div>

      {/* Row 5: teaser card */}
      <div className="card-row">
        <div className="card card-half">
          <div className="mobile-container-single">
            <div className="mobile-box" onClick={() => openModal('/portfolio/mfh.webp', 'myflexhelper')}>
              <Image
                src="/portfolio/mfh.webp"
                alt="MyFlexHelper"
                width={240}
                height={520}
                className="portfolio-image"
              />
            </div>
          </div>
          <div className="portfolio-footer">
            <Image src="/portfolio/ico-mfh.png" alt="MyFlexHelper" width={96} height={96} className="portfolio-icon" />
            <span className="portfolio-label">MyFlexHelper</span>
          </div>
        </div>

        {/* 🔥 Parallax teaser card */}
        <div className="card card-half teaser-card-wrapper">
          <TeaserCardParallax handleCopy={handleCopy} copied={copied} />
        </div>
      </div>
      {/* End Row 5 */}

      {/* Mobile Footer - Only visible on mobile */}
      <div className="mobile-footer">
        <span className="mobile-footer-copy">© Dusan Tomic 2025</span>
        <div className="mobile-footer-social">
          <div className="mobile-footer-buttons">
            <MagneticSocialLink href="https://www.linkedin.com/in/dusantmc/" target="_blank" rel="noopener noreferrer" className="social-button" aria-label="LinkedIn">
              <Image src="/icons/linkedin.svg" alt="LinkedIn" width={26} height={26} />
            </MagneticSocialLink>
            <MagneticSocialLink href="https://x.com/dusantomic" target="_blank" rel="noopener noreferrer" className="social-button" aria-label="Twitter">
              <Image src="/icons/twitter.svg" alt="Twitter" width={26} height={26} />
            </MagneticSocialLink>
            <MagneticSocialLink href="https://contra.com/dusantomic/work" target="_blank" rel="noopener noreferrer" className="social-button" aria-label="Contra">
              <Image src="/icons/contra.svg" alt="Contra" width={26} height={26} />
            </MagneticSocialLink>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalData && (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
          <button className="modal-close" onClick={closeModal}>
            <Image
              src="/icons/close.svg"
              alt="Close"
              width={20}
              height={20}
            />
          </button>
          <div className="modal-content">
            {/* Header */}
            <div className="modal-header">
              <h1 className="modal-headline">{modalData.headline}</h1>
              <p className="modal-body">{modalData.body}</p>
            </div>

            {/* Main Image(s) */}
            {modalData.imageLayout === 'mosaik' ? (
              <div className="modal-images-mosaik">
                {/* First single image: mosaikapp.png */}
                <div className="modal-image-group">
                  <div className="modal-image-wrapper">
                    <Image
                      src={modalData.imageSrcs[0]}
                      alt={`${modalData.headline} - Web App`}
                      width={1200}
                      height={800}
                      className="modal-image"
                    />
                  </div>
                  <p className="modal-image-description">Mosaik Web App</p>
                </div>
                {/* Second: 3 mobile images in grid */}
                <div className="modal-image-group">
                  <div className="modal-image-wrapper modal-image-wrapper--multiple">
                    <div className="modal-images-grid">
                      {modalData.imageSrcs.slice(1, 4).map((src, idx) => (
                        <div key={idx} className="modal-image-item">
                          <Image
                            src={src}
                            alt={`${modalData.headline} - Mobile App ${idx + 1}`}
                            width={400}
                            height={800}
                            className="modal-image"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="modal-image-description">Mosaik Mobile App</p>
                </div>
                {/* Third single image: mosaik-landing.jpg */}
                <div className="modal-image-group">
                  <div className="modal-image-wrapper">
                    <Image
                      src={modalData.imageSrcs[4]}
                      alt={`${modalData.headline} - Landing Page`}
                      width={1200}
                      height={800}
                      className="modal-image"
                    />
                  </div>
                  <p className="modal-image-description">MosaikLanding Page</p>
                </div>
              </div>
            ) : (
              <div className={`modal-image-wrapper ${modalData.imageSrcs.length > 1 ? 'modal-image-wrapper--multiple' : ''}`}>
                {modalData.imageSrcs.length > 1 ? (
                  <div className="modal-images-grid">
                    {modalData.imageSrcs.map((src, idx) => (
                      <div key={idx} className="modal-image-item">
                        <Image
                          src={src}
                          alt={`${modalData.headline} - Image ${idx + 1}`}
                          width={400}
                          height={800}
                          className="modal-image"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Image
                    src={modalData.imageSrcs[0]}
                    alt={modalData.headline}
                    width={1200}
                    height={800}
                    className="modal-image"
                  />
                )}
              </div>
            )}

            {/* Content Sections */}
            {modalData.sections.map((section, index) => {
              const hasImage = section.imagePlaceholder && section.imagePlaceholder.trim() !== '';
              const isStacked = !hasImage || index === 0 || index === 4; // Sections without images, Section 1 and 5 are stacked
              const isAlternate = hasImage && index === 2; // Section 3 is alternate (image left, text right)
              
              return (
                <div 
                  key={index} 
                  className={`modal-section ${isAlternate ? 'modal-section--alternate' : ''} ${isStacked ? 'modal-section--stacked' : ''}`}
                >
                  <div className="modal-section-content">
                    <div className="modal-section-text">
                      <h2 className="modal-section-headline">{section.headline}</h2>
                      <div className="modal-section-body">
                        {typeof section.body === 'string' ? (
                          (() => {
                            // Check if body contains HTML tags
                            const hasHTML = /<[^>]+>/.test(section.body);
                            
                            if (hasHTML) {
                              // If HTML is present, parse it directly
                              // Split by double newlines to handle multiple blocks
                              const blocks = section.body.split('\n\n').filter(block => block.trim());
                              return (
                                <>
                                  {blocks.map((block, idx) => {
                                    const trimmed = block.trim();
                                    if (!trimmed) return null;
                                    
                                    // If it's already HTML (contains tags), parse it
                                    if (/<[^>]+>/.test(trimmed)) {
                                      return <div key={idx}>{parse(trimmed)}</div>;
                                    }
                                    
                                    // Otherwise treat as plain text paragraph
                                    return <p key={idx}>{trimmed}</p>;
                                  })}
                                </>
                              );
                            }
                            
                            // Original logic for plain text with markdown-style lists
                            const paragraphs = section.body.split('\n\n');
                            return (
                              <>
                                {paragraphs.map((paragraph, idx) => {
                                  const trimmed = paragraph.trim();
                                  if (!trimmed) return null;
                                  
                                  // Check if it's a bullet list (starts with "- ")
                                  if (trimmed.startsWith('- ')) {
                                    const lines = trimmed.split('\n');
                                    const bulletItems = lines
                                      .filter(line => line.trim().startsWith('- '))
                                      .map(line => line.trim().substring(2).trim())
                                      .filter(item => item);
                                    
                                    if (bulletItems.length > 0) {
                                      return (
                                        <ul key={idx}>
                                          {bulletItems.map((item, i) => (
                                            <li key={i}>{item}</li>
                                          ))}
                                        </ul>
                                      );
                                    }
                                  }
                                  
                                  // Check if it's a numbered list (starts with "1. ", "2. ", etc.)
                                  if (/^\d+\.\s/.test(trimmed)) {
                                    const lines = trimmed.split('\n');
                                    const numberedItems = lines
                                      .filter(line => /^\d+\.\s/.test(line.trim()))
                                      .map(line => {
                                        const match = line.trim().match(/^\d+\.\s(.+)$/);
                                        return match ? match[1].trim() : '';
                                      })
                                      .filter(item => item);
                                    
                                    if (numberedItems.length > 0) {
                                      return (
                                        <ol key={idx}>
                                          {numberedItems.map((item, i) => (
                                            <li key={i}>{item}</li>
                                          ))}
                                        </ol>
                                      );
                                    }
                                  }
                                  
                                  // Regular paragraph
                                  return (
                                    <p key={idx}>{trimmed}</p>
                                  );
                                })}
                              </>
                            );
                          })()
                        ) : (
                          section.body
                        )}
                      </div>
                    </div>
                    {hasImage && section.imagePlaceholder && (
                      <div className="modal-section-image">
                        <Image 
                          src={section.imagePlaceholder} 
                          alt={section.headline}
                          width={600}
                          height={400}
                          className="modal-section-img"
                          unoptimized={section.imagePlaceholder.startsWith('http')}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default RightPanel;