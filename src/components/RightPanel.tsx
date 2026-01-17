'use client';

import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import parse from 'html-react-parser';
import MagneticSocialLink from './MagneticSocialLink';

const MC2CtaButton = () => {
  const [isHovered, setIsHovered] = useState(false);
  const { rive, RiveComponent } = useRive({
    src: '/icons/cta_background.riv',
    stateMachines: 'State Machine 1',
    autoplay: false,
    layout: new Layout({
      fit: Fit.Cover,
      alignment: Alignment.Center,
    }),
  });

  return (
    <MagneticSocialLink
      href="https://cal.com/dusantmc/intro-call"
      target="_blank"
      className={`cta-button lottie-button teaser-cta${isHovered ? ' is-hovered' : ''}`}
      onMouseEnter={() => {
        setIsHovered(true);
        rive?.play();
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        rive?.pause();
      }}
      onFocus={() => {
        setIsHovered(true);
        rive?.play();
      }}
      onBlur={() => {
        setIsHovered(false);
        rive?.pause();
      }}
    >
      <span className="cta-label">Let's talk</span>
      <RiveComponent
        className="cta-lottie cta-lottie--teaser"
        aria-hidden="true"
      />
    </MagneticSocialLink>
  );
};

// Video component that autoplays when visible in viewport
const ViewportVideo: React.FC<{ src: string; className?: string }> = ({ src, className }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Reset video to beginning and play
            video.currentTime = 0;
            video.play().catch(() => {
              // Autoplay may be blocked, that's okay
            });
          } else {
            // Pause when out of view
            video.pause();
          }
        });
      },
      { threshold: 0.5 } // Trigger when 50% visible
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      muted
      playsInline
      style={{ width: '100%', height: 'auto', borderRadius: '32px' }}
    />
  );
};

interface TeaserCardProps {
  handleCopy: () => void;
  copied: boolean;
}

type Edge = 'left' | 'right' | 'top' | 'bottom';

interface ModalSection {
  headline?: string;
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

  const { rive, RiveComponent } = useRive({
    src: '/icons/cta_background.riv',
    stateMachines: 'State Machine 1',
    autoplay: false,
    layout: new Layout({
      fit: Fit.Cover,
      alignment: Alignment.Center,
    }),
  });

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
          onMouseEnter={() => {
            setTeaserHover(true);
            rive?.play();
          }}
          onMouseLeave={() => {
            setTeaserHover(false);
            rive?.pause();
          }}
          onFocus={() => {
            setTeaserHover(true);
            rive?.play();
          }}
          onBlur={() => {
            setTeaserHover(false);
            rive?.pause();
          }}
        >
          <span className="cta-label">Let&apos;s talk</span>
          <RiveComponent
            className="cta-lottie cta-lottie--teaser"
            aria-hidden="true"
          />
        </a>
        <p className="teaser-text">Prefer email? Write me at</p>

        <div className="cta-email-wrapper">
          <button className="cta-email" onClick={() => window.open('mailto:hey@dusantmc.com')}>
            hey@dusantmc.com
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
  if (projectId === 'myflexhelper' || imageSrcs[0] === '/portfolio/mfh-1.webp') {
    return {
      imageSrcs: ['/portfolio/mfh-1.webp', '/portfolio/mfh-2.webp', '/portfolio/mfh-3.webp'],
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
  if (imageSrcs[0] === '/portfolio/mc2-final.webp') {
    return {
      imageSrcs,
      headline: 'MC2 Finance',
      body: 'Elevating a crypto trading platform to institutional standards in 4 weeks, <br/>' +
        'helping scale to $50M AUM',
      role: 'Product Designer',
      results: '',
      sections: [
        {
          headline: 'Project Overview',
          body: `
          <div className="modal-section-text">
          <p><strong>MC² Finance</strong> provides institutional-grade digital asset ETFs and ETPs. It is a decentralized platform allowing users to trade tokens and crypto assets with the rigor expected by professional investors.</p>
          <div className="modal-info-grid">
            <div className="modal-info-cell">
              <span className="modal-info-label">ROLE:</span>
              <span className="modal-info-value">Lead Product Designer (Freelance)</span>
            </div>
            <div className="modal-info-cell">
              <span className="modal-info-label">Timeline:</span>
              <span className="modal-info-value">4 Weeks (Sprint)</span>
            </div>
            <div className="modal-info-cell">
              <span className="modal-info-label">Team:</span>
              <span className="modal-info-value">Collaborated directly with Owners, PM, and Engineers</span>
            </div>
          </div>
          `
        },

        {
          headline: 'The Challenge',
          body: `
          <div className="modal-section-text">
          <p><strong>The "Trust Gap" and a Mental Model Mismatch.</strong> When I joined, the product was fully functional but suffered from low user confidence. The interface felt "amateur" compared to competitors, and the data tables, the heart of any trading platform, were cluttered and hard to scan.</p>
          <p>Furthermore, the purchase flow presented a unique friction point. Unlike standard crypto "swaps" (e.g., Uniswap), the platform used an e-commerce style "Shopping Cart" model. Users were confused by adding tokens to a cart rather than buying them instantly.</p>
          <p><strong>My Goal: </strong> With a strict 4-week deadline, I couldn't rebuild the entire backend logic. My mission was to bridge the gap between the existing "Shopify-style" mechanics and the expectations of crypto traders, while polishing the UI to be investor-ready.</p>
          </div>
          `
        },
        {
          headline: 'Strategy: Quick Wins & Componentizing',
          body: `
          <div className="modal-section-text">
          <p>With only a month to deliver, I had to be pragmatic. I conducted a rapid audit of competitors (CoinMarketCap, Coingecko) and e-commerce leaders to find a hybrid UI pattern that worked.</p>
          <p>I started by breaking the UI into <strong>reusable components</strong>. This wasn't just for consistency; it allowed me to quickly mock up different table layouts and gave the engineers a system that was much faster to implement.</p>
          </div>
          `
        },

        {
          headline: 'Key Improvements',
          body: `
          <div className="modal-section-text">
          <h3>1. Redesigning the Data Tables</h3>
          <p>The original tables were dense and cluttered with too much visual noise. Cells were aligned inconsistently, and the table overall looked cheap and unprofessional—lacking the critical trust required for purchasing cryptocurrencies.</p>
          </div>
<div className="before-after-wrapper">
              <div className="modal-case-study-label">BEFORE</div>
              <img src="/portfolio/mc2-table-before.webp" alt="Data Tables Redesign" className="modal-case-study-image" />
              <div className="modal-case-study-label">AFTER</div>
              <img src="/portfolio/mc2-table-after.webp" alt="Data Tables Redesign" className="modal-case-study-image" />
              <div className="modal-section-text modal-section-text-gap">
                <ul className="custom-bullet-list">
                  <li>
                    <img src="/portfolio/ul1.svg" className="custom-bullet-marker" alt="" />
                    <span><strong>Enhanced Accessibility: </strong> I updated the star buttons and improved accessibility by establishing higher contrast ratios on table elements.</span>
                  </li>
                  <li>
                    <img src="/portfolio/ul2.svg" className="custom-bullet-marker" alt="" />
                    <span><strong>Reduced Visual Noise: </strong> I applied progressive disclosure, hiding low-priority data and displaying elements like sorting arrows only on hover to reduce clutter.</span>
                  </li>
                  <li>
                    <img src="/portfolio/ul3.svg" className="custom-bullet-marker" alt="" />
                    <span><strong>Optimized Data Density: </strong> I simplified the columns, removing low-priority data to save horizontal space, and introduced intuitive filtering.</span>
                  </li>
                   <li>
                    <img src="/portfolio/ul4.svg" className="custom-bullet-marker" alt="" />
                    <span><strong>Clear Call-to-Action: </strong> The ambiguous "Cart" icon was replaced with clear, prominent "BUY" buttons. This reduced cognitive load and made the primary call-to-action unmistakable.</span>
                  </li>
                </ul>
              </div>
            </div>
<div className="modal-section-text">
            <h3>2. Fixing the "Cart" Friction</h3>
            <p>Since technical constraints required keeping the "shopping cart" model, I focused on transforming it from a point of friction into a transparent, additive experience.</p>
            <ul style="padding-left: 20px; list-style-type: disc; margin-bottom: 16px;">
              <li><strong>System Status Visibility: </strong> I implemented toast notifications and micro-interactions to provide immediate feedback, ensuring users instantly understood when assets were successfully added to their bundle.</li>
              <li><strong>Active Discovery: </strong> I utilized the cart view to introduce dynamic "Top Gainer" suggestions, turning a passive holding area into an active feature that encourages portfolio diversification.</li>
              <li><strong>Elevated Visual Hierarchy: </strong> I redesigned the drawer with a strict financial aesthetic - using clean spacing and clear summaries - to ensure it felt like a professional trading tool rather than a generic e-commerce checkout.</li>
            </ul></div>
            <img src="/portfolio/mc2-cart.webp" alt="Cart Redesign" className="modal-content-image" />
<div className="modal-section-text">
            <h3>3. Solving Navigation Scalability</h3>
            <p>The original sidebar suffered from vertical overflow issues. On smaller laptops, critical menu items disappeared below the fold, forcing users to scroll to access basic navigation.</p><p>This issue became urgent when a new business requirement emerged: we needed to permanently display a "Supported by" trust badge in the footer prior to a major industry event.</p>
            <ul style="padding-left: 20px; list-style-type: disc; margin-bottom: 16px;">
              <li><strong>Vertical Optimization: </strong> I redesigned the navigation architecture to be denser and more efficient. By consolidating actions—such as converting the large "Create Portfolio" button into a subtle inline action—I reclaimed valuable vertical real estate.</li>
              <li><strong>Strategic Real Estate: </strong> This layout optimization ensured that all primary navigation points remained visible within the average viewport.</li>
              <li><strong>Trust Integration: </strong> The new spacing strategy created a permanent "safe zone" at the bottom of the sidebar, allowing us to prominently display the "Supported by" badge without cluttering the navigation flow.</li>
            </ul></div>
            <div className="before-after-narrow-wrapper">
              <div className="before-after-narrow-col">
                <div className="modal-case-study-label">BEFORE</div>
              <img src="/portfolio/mc2-nav-before.webp" alt="Data Tables Redesign" className="modal-case-study-narrow-image" /></div>
              <div className="before-after-narrow-col"><div className="modal-case-study-label">AFTER</div>
              <img src="/portfolio/mc2-nav-after.webp" alt="Data Tables Redesign" className="modal-case-study-narrow-image" /></div>
            </div>
          `
        },
        {
          headline: 'The Outcome',
          body: `
          <div className="modal-section-text">
          <p>The impact was immediate and measurable. The engineering team began implementing the component-based designs during the project, accelerating their development velocity.</p>
          <ul style="padding-left: 20px; list-style-type: disc;">
            <li><strong>Scaled to $50M AUM: </strong>By reducing friction in the purchase flow and upgrading the UI to build trust, the platform successfully scaled to over <strong>$50 Million in Assets Under Management.</strong></li>
            <li><strong>Secured Funding: </strong>The "institutional-grade" redesign was a key factor in building investor confidence, directly helping the company secure their next round of funding.</li>
            <li><strong>Developer Efficiency: </strong>The move to a component-based system meant the engineers could maintain consistency and build faster long after my contract ended.</li>
          </ul>
          </div>
          `
        },

        {
          headline: 'Retrospective',
          body: `
          <div className="modal-section-text">
            <p><strong>What I learned & What I’d do differently.</strong> This project reinforced the value of constraints. Not being able to change the "Cart logic" forced me to find creative UI solutions to make it work for the user.</p>
            <p>If I had 8 weeks instead of 4, I would have focused heavily on the mobile experience. While I updated the main tables for mobile, a complex trading platform requires dedicated mobile flows to be truly competitive. I also would have loved to run A/B tests on the purchase flow to see if the "Trending Tokens" in the cart significantly boosted order value.</p>
          </div>
          `
        }

      ]
    };
  }

  // Loop - Built for the next generation of homeowners
  if (imageSrcs[0] === '/portfolio/level-1.webp' && projectId === 'loop-mobile') {
    return {
      imageSrcs: ['/portfolio/loop-1b.webp', '/portfolio/loop-2b.webp', '/portfolio/loop-3b.webp'],
      headline: 'Loop',
      body: 'Disrupting the real estate industry with a dopamine-driven <br/>' +
        'discovery experience for Gen Z',
      role: 'Product Designer',
      results: '',
      sections: [
        {
          headline: 'Project Overview',
          body: `
          <div className="modal-section-text">
          <p><strong>Loop</strong> is a mobile app designed to break the monotony of traditional home buying. While legacy platforms like Zillow require users to know exactly where they want to look, Loop focuses on <strong>discovery</strong>. It gamifies the experience, allowing users to browse homes nationwide using swipe mechanics, creating an engaging "dopamine loop" similar to modern dating apps.</p>
          <div className="modal-info-grid">
            <div className="modal-info-cell">
              <span className="modal-info-label">ROLE:</span>
              <span className="modal-info-value">Founding Product Designer (Solo)</span>
            </div>
            <div className="modal-info-cell">
              <span className="modal-info-label">Timeline:</span>
              <span className="modal-info-value">2 Weeks (MVP Sprint)</span>
            </div>
            <div className="modal-info-cell">
              <span className="modal-info-label">Team:</span>
              <span className="modal-info-value">Worked directly with Founder & Lead Developer</span>
            </div>
          </div>
          `
        },
        {
          headline: 'The Challenge',
          body: `
          <div className="modal-section-text">
          <p><strong>Zillow is for your parents. Gen Z needs discovery.</strong> Leading real estate apps (Redfin, Zillow) are built on a "Search" mental model. They are data-heavy, map-reliant, and visually overwhelming. For a Gen Z user who might just be casually browsing or "dreaming," these platforms feel like work.</p>
          <p><strong>The Goal:</strong> I was brought in to design the entire MVP from scratch in just <strong>2 weeks</strong>. The objective was to strip away the complexity of real estate data and replace it with an interface that felt as addictive as TikTok or Tinder, focusing on visual impact, micro-interactions, and ease of use.</p>
          </div>
          `
        },
        {
          headline: 'The Solution',
          body: `
          <div className="modal-section-text">
          <p><strong>"Tinder for Homes."</strong> I designed Loop to be a <strong>discovery-first</strong> platform. Instead of a map view, the core experience is a deck of cards.</p>
          <h3>1. The Swipe Mechanic (Core Loop)</h3>
          <p>The primary interaction is simple: Swipe Right to "Love," Swipe Left to "Pass."</p>
          <ul style="padding-left: 20px; list-style-type: disc; margin-bottom: 16px;">
            <li><strong>Dopamine Triggers: </strong> Unlike a static list, swiping requires active decision-making. This physical interaction keeps the user engaged longer.</li>
            <li><strong>National Scale: </strong> We removed the friction of "select a zip code." Users can swipe through homes across the entire country, broadening their horizons.</li>
          </ul>
          </div>
          <div className="modal-image-wrapper modal-image-wrapper--multiple" style="margin: 40px 0 72px 0;">
            <div className="modal-images-grid">
              <div className="modal-image-item">
                <img src="/portfolio/loop-4.webp" alt="Loop Swipe Screen 1" className="modal-image" />
              </div>
              <div className="modal-image-item">
                <img src="/portfolio/loop-5.webp" alt="Loop Swipe Screen 2" className="modal-image" />
              </div>
              <div className="modal-image-item">
                <img src="/portfolio/loop-6.webp" alt="Loop Swipe Screen 3" className="modal-image" />
              </div>
            </div>
          </div>
          <div className="modal-section-text">
            <h3>2. The "Perfect Match" Moment</h3>
            <p>To make the experience rewarding, I designed a specific "Perfect Match" state. When a home meets 100% of the user's hard filters, the app celebrates the moment.</p>
            <ul style="padding-left: 20px; list-style-type: disc; margin-bottom: 16px;">
              <li><strong>Visual Delight: </strong> I implemented a distinct success state featuring an <strong>animated "Perfect Match" badge</strong> and a <strong>warm orange gradient overlay</strong>. This immediate visual cue creates a moment of delight, distinguishing high-value matches from standard listings without disrupting the browsing flow.</li>
              </ul></div>
            <img src="/portfolio/video1placeholder.webp" alt="Perfect Match Video" className="modal-content-image" />
<div className="modal-section-text">
            <h3>3. Social Collections</h3>
            <p>Gen Z rarely makes decisions in isolation. I designed the "Favorites" tab to organize successful swipes into Collections.</p>
            <ul style="padding-left: 20px; list-style-type: disc; margin-bottom: 16px;">
              <li><strong>Organization: </strong> Users can create mood boards (e.g., "Miami Properties," "Pool Homes"), setting the stage for future social sharing features.</li>
            </ul></div>
          <div className="modal-image-wrapper modal-image-wrapper--multiple" style="margin: 40px 0 72px 0;">
            <div className="modal-images-grid">
              <div className="modal-image-item">
                <img src="/portfolio/loop-7.webp" alt="Loop Swipe Screen 1" className="modal-image" />
              </div>
              <div className="modal-image-item">
                <img src="/portfolio/loop-8.webp" alt="Loop Swipe Screen 2" className="modal-image" />
              </div>
              <div className="modal-image-item">
                <img src="/portfolio/loop-9.webp" alt="Loop Swipe Screen 3" className="modal-image" />
              </div>
            </div>
          `
        },
        {
          headline: 'Going Beyond UI: Motion & Branding',
          body: `
          <div className="modal-section-text">
          <p>As the sole designer, I wore multiple hats. I didn't just deliver screens; I built the brand identity and the motion system to ensure the app felt alive.</p>
          <ul style="padding-left: 20px; list-style-type: disc;">
            <li><strong>Rive Animations: </strong> I created custom animations for the filter interactions and empty states. Even running out of properties was designed to be a playful "Oops!" moment rather than a dead end.</li>
            <li><strong>Branding & Marketing: </strong> Working with the founder's initial concept, I refined the logo and developed a suite of marketing assets, including Instagram Stories and social posts, to prepare for the go-to-market strategy.</li>
          </ul>
          </div>
          <img src="/portfolio/video2placeholder.webp" alt="Oops Animation" className="modal-content-image" />
          <div className="modal-image-wrapper modal-image-wrapper--multiple" style="margin: 40px 0 72px 0;">
            <div className="modal-images-grid">
              <div className="modal-image-item">
                <img src="/portfolio/loop-insta-1.webp" alt="Loop Swipe Screen 1" className="modal-image" />
              </div>
              <div className="modal-image-item">
                <img src="/portfolio/loop-insta-2.webp" alt="Loop Swipe Screen 2" className="modal-image" />
              </div>
              <div className="modal-image-item">
                <img src="/portfolio/loop-insta-3.webp" alt="Loop Swipe Screen 3" className="modal-image" />
              </div>
            </div>
          </div>
          `
        },
        {
          headline: 'The Outcome',
          body: `
          <div className="modal-section-text">
          <p><strong>From Idea to MVP in 14 Days.</strong> This project was a testament to rapid execution. By working closely with the developer and using tools like Rive for animation handoff, we moved from zero to a fully designed application in two weeks.</p>
          <ul style="padding-left: 20px; list-style-type: disc;">
            <li><strong>Deliverables:</strong> Delivered 40+ high-fidelity screens, a comprehensive component library, brand guidelines, and production-ready animation assets.</li>
            <li><strong>Implementation:</strong> Conducted QA directly with the engineer to ensure the "swipe physics" and micro-interactions felt native and smooth.</li>
            <li><strong>Next Steps:</strong> The MVP is currently in development with a planned public launch in January 2026.</li>
          </ul>
          </div>
          `
        }
      ]
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
  if (imageSrcs[0] === '/portfolio/kripto-1b.webp' || projectId === 'kriptomat-mobile') {
    return {
      imageSrcs: ['/portfolio/kripto-1b.webp', '/portfolio/kripto-2b.webp', '/portfolio/kripto-3b.webp'],
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
    textArea.value = 'hey@dusantmc.com';
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
      navigator.clipboard.writeText('hey@dusantmc.com')
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
    <div className="right-panel">{/* Loop */}
      <div className="card card-full">
        <div className="mobile-container">
          <div className="mobile-box" onClick={() => openModal('/portfolio/level-1.webp', 'loop-mobile')}>
            <Image
              src="/portfolio/loop-1b.webp"
              alt="Loop"
              width={240}
              height={520}
              className="portfolio-image"
            />
          </div>
          <div className="mobile-box" onClick={() => openModal('/portfolio/level-1.webp', 'loop-mobile')}>
            <Image
              src="/portfolio/loop-2b.webp"
              alt="Loop"
              width={240}
              height={520}
              className="portfolio-image"
            />
          </div>
          <div className="mobile-box" onClick={() => openModal('/portfolio/level-1.webp', 'loop-mobile')}>
            <Image
              src="/portfolio/loop-3b.webp"
              alt="Loop"
              width={240}
              height={520}
              className="portfolio-image"
            />
          </div>
        </div>
        <div className="portfolio-footer">
          <Image
            src="/portfolio/ico-loop.png"
            alt="Loop"
            width={96}
            height={96}
            className="portfolio-icon"
          />
          <span className="portfolio-label">Loop - Built for the next generation of homeowners</span>
        </div>
      </div>

      {/* MC2 */}
      <div className="card card-full">
        <div className="landing-container" onClick={() => openModal('/portfolio/mc2-final.webp')}>
          <Image
            src="/portfolio/mc2-final.webp"
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
          <div className="mobile-box" onClick={() => openModal('/portfolio/kripto-1b.webp', 'kriptomat-mobile')}>
            <Image
              src="/portfolio/kripto-1b.webp"
              alt="Kriptomat"
              width={240}
              height={520}
              className="portfolio-image"
            />
          </div>
          <div className="mobile-box" onClick={() => openModal('/portfolio/kripto-2b.webp', 'kriptomat-mobile')}>
            <Image
              src="/portfolio/kripto-2b.webp"
              alt="Kriptomat"
              width={240}
              height={520}
              className="portfolio-image"
            />
          </div>
          <div className="mobile-box" onClick={() => openModal('/portfolio/kripto-3b.webp', 'kriptomat-mobile')}>
            <Image
              src="/portfolio/kripto-3b.webp"
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
            <div className="mobile-box" onClick={() => openModal('/portfolio/mfh-1.webp', 'myflexhelper')}>
              <Image
                src="/portfolio/mfh-1.webp"
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

      {/* Modal - Extracted to separate component for performance */}
      {modalData && (
        <ProjectModal
          modalData={modalData}
          handleBackdropClick={handleBackdropClick}
          closeModal={closeModal}
        />
      )}
    </div>
  );
};

// Sub-component for the modal to handle deferred rendering
const ProjectModal: React.FC<{
  modalData: ModalData;
  handleBackdropClick: (e: React.MouseEvent) => void;
  closeModal: () => void;
}> = ({ modalData, handleBackdropClick, closeModal }) => {
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  const fallbackCopy = () => {
    const textArea = document.createElement('textarea');
    textArea.value = 'hey@dusantmc.com';
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
      navigator.clipboard.writeText('hey@dusantmc.com')
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

  useEffect(() => {
    // Defer the rendering of heavy content to allow the enter animation to start smoothly
    const info = requestAnimationFrame(() => {
      setIsContentVisible(true);
    });
    return () => cancelAnimationFrame(info);
  }, []);

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <button className="modal-close" onClick={closeModal}>
        <Image
          src="/icons/close.svg"
          alt="Close"
          width={20}
          height={20}
        />
      </button>
      <div className={`modal-content ${modalData.headline === 'MC2 Finance' ? 'modal-content--mc2' : ''}`}>
        {/* Header */}
        <div className="modal-header">
          <h1 className="modal-headline">{modalData.headline}</h1>
          <div className={`modal-body-transition ${isContentVisible ? 'is-visible' : ''}`}>
            <p className="modal-body">{parse(modalData.body)}</p>
          </div>
        </div>

        {/* Defer heavy content rendering */}
        {isContentVisible && (
          <div className="modal-heavy-content">
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
                  className={`modal-section ${index === 0 ? 'modal-section--first' : ''} ${isAlternate ? 'modal-section--alternate' : ''} ${isStacked ? 'modal-section--stacked' : ''}`}
                >
                  <div className="modal-section-content">
                    {section.headline && <h2 className="modal-section-headline">{section.headline}</h2>}
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

                                  // If it's already HTML (contains tags), parse it with video replacement
                                  if (/<[^>]+>/.test(trimmed)) {
                                    return <div key={idx}>{parse(trimmed, {
                                      replace: (domNode: unknown) => {
                                        const node = domNode as { name?: string; attribs?: Record<string, string> };
                                        if (node.name === 'img' && node.attribs?.src === '/portfolio/video1placeholder.webp') {
                                          return <ViewportVideo src="/icons/match.webm" className="modal-content-image" />;
                                        }
                                        if (node.name === 'img' && node.attribs?.src === '/portfolio/video2placeholder.webp') {
                                          return <ViewportVideo src="/icons/oops.webm" className="modal-content-image" />;
                                        }
                                      }
                                    })}</div>;
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
                    {hasImage && section.imagePlaceholder && (
                      <div className="modal-section-image">
                        <Image
                          src={section.imagePlaceholder}
                          alt={section.headline || ''}
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

            {/* CTA Section - For MC2 Finance and Loop */}
            {(modalData.headline === 'MC2 Finance' || modalData.headline === 'Loop') && (
              <>
                <div className="modal-cta-section">
                  <h2 className="teaser-title" style={{ marginBottom: '32px' }}>Curious to see more work?</h2>
                  <MC2CtaButton />
                  <div className="modal-cta-contact">
                    <p className="teaser-text">Prefer email? Write me at</p>
                    <div className="cta-email-wrapper">
                      <button className="cta-email ctwhite" onClick={() => window.open('mailto:hey@dusantmc.com')}>
                        hey@dusantmc.com
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

                {/* Footer - Reusing lp-footer structure */}
                <div className="modal-footer">
                  <span className="modal-footer-copy">© Dusan Tomic 2026</span>
                  <div className="modal-footer-social">
                    <span className="modal-footer-copy modal-footer-label">Let’s connect</span>
                    <div className="modal-footer-buttons">
                      <div className="tooltip-wrapper">
                        <MagneticSocialLink
                          href="https://www.linkedin.com/in/dusantmc/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="social-button"
                          aria-label="LinkedIn"
                        >
                          <Image src="/icons/linkedin.svg" alt="LinkedIn" width={26} height={26} />
                        </MagneticSocialLink>
                        <div className="copy-tooltip">Connect with me on LinkedIn</div>
                      </div>

                      <div className="tooltip-wrapper">
                        <MagneticSocialLink
                          href="https://x.com/dusantomic"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="social-button"
                          aria-label="Twitter"
                        >
                          <Image src="/icons/twitter.svg" alt="Twitter" width={26} height={26} />
                        </MagneticSocialLink>
                        <div className="copy-tooltip">Follow me on Twitter</div>
                      </div>

                      <div className="tooltip-wrapper">
                        <MagneticSocialLink
                          href="https://contra.com/dusantomic/work"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="social-button"
                          aria-label="Contra"
                        >
                          <Image src="/icons/contra.svg" alt="Contra" width={26} height={26} />
                        </MagneticSocialLink>
                        <div className="copy-tooltip">Hire me on Contra</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RightPanel;