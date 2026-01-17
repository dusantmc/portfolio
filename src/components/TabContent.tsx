'use client';
import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import Image from 'next/image';
import { useMagneticHover } from '@/hooks/useMagneticHover';
import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { spawnGreetingParticle, cleanupParticles } from '@/utils/particles';

interface TabContentProps {
  activeTab: string;
}

// Update these paths to your actual images
const aboutPhotos = [
  { src: '/about/helena3.webp', alt: 'Waikiki', caption: 'Me and my daughter' },
  { src: '/about/image3.webp', alt: 'Family', caption: 'Family photo' },
  { src: '/about/image1.webp', alt: 'Mauritius', caption: 'Catching (flat) waves in Mauritius' },
  { src: '/about/image4.webp', alt: 'Hollywood', caption: 'Posing in front of Hollywood sign' },
];

type ExperienceItem = {
  logo: string;
  logoAlt: string;
  dates: string;
  title: string;
  description: string;
};

const EXPERIENCE: ExperienceItem[] = [
  {
    logo: '/resume/mosaik.png',
    logoAlt: 'Mosaik',
    dates: 'November 2021 - December 2025',
    title: 'Lead Product Designer at Mosaik',
    description:
      'Led product design for an AI-powered real estate platform connecting agents, clients, and service providers. Oversaw UX for web and mobile apps and shaped the product\'s overall design direction.',
  },
  {
    logo: '/resume/kriptomat.png',
    logoAlt: 'Kriptomat',
    dates: 'May 2021 - November 2021',
    title: 'Senior Product Designer at Kriptomat',
    description:
      'Redesigned Kriptomat\'s mobile app and led UX improvements across its crypto exchange and wallet platform.',
  },
  {
    logo: '/resume/freelance.png',
    logoAlt: 'Freelance',
    dates: 'April 2020 - May 2021',
    title: 'Freelance Product Designer',
    description:
      'Worked with startups and small businesses on UX/UI design, app interfaces, and prototypes for digital products.',
  },
  {
    logo: '/resume/rebelmouse.png',
    logoAlt: 'RebelMouse',
    dates: 'February 2012 - April 2020',
    title: 'Senior Product Designer at RebelMouse',
    description:
      'Founding designer. Built a CMS from 0→1 and led enterprise solutions for United Airlines (+260% pageviews), CBS, and Penske.',
  },
];

const HAND_PARTICLES = [
  {
    dx: '0px',
    dy: '-38px',
    startDx: '0px',
    startDy: '-22px',
    asset: '/icons/emojistroke10.png',
    startRotation: '0deg',
    endRotation: '0deg',
    delay: '0ms',
  },
  {
    dx: '22px',
    dy: '-27px',
    startDx: '12px',
    startDy: '-17px',
    asset: '/icons/emojistroke11.png',
    startRotation: '54deg',
    endRotation: '54deg',
    delay: '40ms',
  },
  {
    dx: '34px',
    dy: '-10px',
    startDx: '22px',
    startDy: '-6px',
    asset: '/icons/emojistroke12.png',
    startRotation: '76deg',
    endRotation: '76deg',
    delay: '80ms',
  },
  {
    dx: '-23px',
    dy: '-27px',
    startDx: '-11px',
    startDy: '-16px',
    asset: '/icons/emojistroke12.png',
    startRotation: '-45deg',
    endRotation: '-45deg',
    delay: '40ms',
  },
  {
    dx: '-32px',
    dy: '-8px',
    startDx: '-16px',
    startDy: '-5px',
    asset: '/icons/emojistroke11.png',
    startRotation: '-76deg',
    endRotation: '-76deg',
    delay: '80ms',
  },
] as const;

const HAND_BURST_SPEEDS = [
  { burst: 240, splash: 260, handActive: 60, handHover: 160 },
] as const;

const HAND_TOOLTIP_MESSAGES = [
  'Keep going',
  'You are on fire!',
  'I like your energy',
  'This is getting emotional',
  'Now we’re best friends',
] as const;

type HandTooltipMessage = (typeof HAND_TOOLTIP_MESSAGES)[number];



const BookCallButton: React.FC = () => {
  const magnetic = useMagneticHover<HTMLAnchorElement>({ stickyFactor: 0.02, scale: 1.02 });

  const { rive, RiveComponent } = useRive({
    src: '/icons/cta_background.riv',
    stateMachines: 'State Machine 1',
    autoplay: false,
    layout: new Layout({
      fit: Fit.Cover,
      alignment: Alignment.Center,
    }),
  });

  const handleMouseEnter = () => {
    magnetic.handleMouseEnter();
    rive?.play();
  };

  const handleMouseLeave = () => {
    magnetic.handleMouseLeave();
    rive?.pause();
  };

  const handleBlur = () => {
    magnetic.handleBlur();
    rive?.pause();
  };

  const handleFocus = () => {
    magnetic.handleFocus();
    rive?.play();
  };

  return (
    <a
      href="https://cal.com/dusantmc/intro-call"
      target="_blank"
      rel="noopener noreferrer"
      className="cta-button lottie-button"
      ref={magnetic.elementRef}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      onMouseLeave={handleMouseLeave}
      onBlur={handleBlur}
      onMouseMove={magnetic.handleMouseMove}
      onMouseDown={magnetic.handleMouseDown}
      onMouseUp={magnetic.handleMouseUp}
    >
      <span ref={magnetic.contentRef} className="cta-button__label">Book a call</span>
      <RiveComponent
        className="cta-lottie cta-lottie--primary"
        aria-hidden="true"
      />
    </a>
  );
};


const TabContent: React.FC<TabContentProps> = ({ activeTab }) => {
  const [copied, setCopied] = useState(false);
  const [handBurstActive, setHandBurstActive] = useState(false);
  const [handBurstDurations, setHandBurstDurations] = useState(HAND_BURST_SPEEDS[0]);
  const [handTooltipVisible, setHandTooltipVisible] = useState(false);
  const [handTooltipMessage, setHandTooltipMessage] = useState<HandTooltipMessage>(HAND_TOOLTIP_MESSAGES[0]);
  const emailMagnetic = useMagneticHover<HTMLDivElement>({ stickyFactor: 0.01, scale: 1.02 });
  const downloadMagnetic = useMagneticHover<HTMLAnchorElement>({ stickyFactor: 0.01, scale: 1.02 });
  const handBurstTimeoutRef = useRef<number | null>(null);
  const handBurstSpeedIndexRef = useRef(0);
  const handTooltipTimeoutRef = useRef<number | null>(null);
  const handClickCountRef = useRef(0);
  const handTooltipMessageIndexRef = useRef(0);

  useEffect(() => {
    emailMagnetic.setDelay?.(200);
    downloadMagnetic.setDelay?.(200);
  }, [emailMagnetic, downloadMagnetic]);

  useEffect(() => {
    return () => {
      if (handBurstTimeoutRef.current !== null) {
        window.clearTimeout(handBurstTimeoutRef.current);
        handBurstTimeoutRef.current = null;
      }
      if (handTooltipTimeoutRef.current !== null) {
        window.clearTimeout(handTooltipTimeoutRef.current);
        handTooltipTimeoutRef.current = null;
      }
      // Cleanup particles on unmount
    };
  }, []);



  const showHandTooltip = () => {
    if (typeof window === 'undefined') return;
    if (handTooltipTimeoutRef.current !== null) {
      window.clearTimeout(handTooltipTimeoutRef.current);
      handTooltipTimeoutRef.current = null;
    }
    const nextIndex = handTooltipMessageIndexRef.current;
    setHandTooltipMessage(HAND_TOOLTIP_MESSAGES[nextIndex]);
    handTooltipMessageIndexRef.current = (nextIndex + 1) % HAND_TOOLTIP_MESSAGES.length;
    setHandTooltipVisible(true);
    handTooltipTimeoutRef.current = window.setTimeout(() => {
      setHandTooltipVisible(false);
      handTooltipTimeoutRef.current = null;
    }, 1200);
  };

  const triggerHandBurst = (event?: React.PointerEvent) => {
    if (typeof window === 'undefined') return;
    if (handBurstTimeoutRef.current !== null) {
      window.clearTimeout(handBurstTimeoutRef.current);
      handBurstTimeoutRef.current = null;
    }

    const nextIndex = handBurstSpeedIndexRef.current;
    const nextDurations = HAND_BURST_SPEEDS[nextIndex];
    handBurstSpeedIndexRef.current = (nextIndex + 1) % HAND_BURST_SPEEDS.length;
    setHandBurstDurations(nextDurations);
    const resetDelay = Math.max(nextDurations.burst, nextDurations.splash) + 80;

    handClickCountRef.current += 1;
    if (handClickCountRef.current % 10 === 0) {
      showHandTooltip();
    } else if (handTooltipVisible) {
      setHandTooltipVisible(false);
      if (handTooltipTimeoutRef.current !== null) {
        window.clearTimeout(handTooltipTimeoutRef.current);
        handTooltipTimeoutRef.current = null;
      }
    }
    setHandBurstActive(false);
    window.requestAnimationFrame(() => {
      setHandBurstActive(true);
      handBurstTimeoutRef.current = window.setTimeout(() => {
        setHandBurstActive(false);
        handBurstTimeoutRef.current = null;
      }, resetDelay);
    });
  };

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
    emailMagnetic.setShift(0, 0);
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

  const renderIntroContent = () => (
    <div className="intro-section">
      <div className="top-content">
        {/* Greeting */}


        <div className="greeting">
          <h2 className="section-title greeting-title">Hi, I&apos;m Dusan!<span
            className="greeting-hand-wrapper"
            onPointerDown={triggerHandBurst}
            style={
              {
                '--hand-burst-duration': `${handBurstDurations.burst}ms`,
                '--hand-splash-duration': `${handBurstDurations.splash}ms`,
                '--hand-active-duration': `${handBurstDurations.handActive}ms`,
                '--hand-hover-duration': `${handBurstDurations.handHover}ms`,
              } as CSSProperties
            }
          >
            <Image
              src="/icons/emojihand3.png"
              alt=""
              width={32}
              height={32}
              className="greeting-hand"
              aria-hidden="true"
            />
            <span
              className={`greeting-hand-splash${handBurstActive ? ' greeting-hand-splash--active' : ''}`}
              aria-hidden="true"
            />
            <span
              className={`hand-tooltip greeting-hand-click-tooltip${handTooltipVisible ? ' is-visible' : ''}`}
              role="status"
            >
              {handTooltipMessage}
            </span>
            <span
              className={`greeting-hand-burst${handBurstActive ? ' greeting-hand-burst--active' : ''}`}
              aria-hidden="true"
            >
              {HAND_PARTICLES.map((particle, index) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={`greeting-hand-particle-${index}`}
                  src={particle.asset}
                  alt=""
                  width={20}
                  height={20}
                  className="greeting-hand-particle"
                  aria-hidden="true"
                  loading="lazy"
                  style={
                    {
                      '--dx': particle.dx,
                      '--dy': particle.dy,
                      '--start-dx': particle.startDx,
                      '--start-dy': particle.startDy,
                      '--start-rot': particle.startRotation,
                      '--end-rot': particle.endRotation,
                      '--delay': particle.delay,
                    } as CSSProperties
                  }
                />
              ))}
            </span>
          </span>
          </h2>
          <div className="about-copy">
            <p className="intro-subtext">
              I&apos;m a product designer focused on turning complex ideas into simple, intuitive web and mobile experiences.
            </p>
            <p className="intro-subtext">
              Currently based in Serbia, I&apos;ve spent over a decade collaborating remotely with startups and global teams across the U.S.
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="cta-section">
          <BookCallButton />

          <div
            className="cta-email-wrapper"
            ref={emailMagnetic.elementRef}
            onMouseEnter={emailMagnetic.handleMouseEnter}
            onMouseMove={emailMagnetic.handleMouseMove}
            onMouseLeave={() => {
              emailMagnetic.setShift(0, 0);
              emailMagnetic.handleMouseLeave();
            }}
            onMouseDown={emailMagnetic.handleMouseDown}
            onMouseUp={(event) => {
              emailMagnetic.setShift(0, 0);
              emailMagnetic.handleMouseUp(event);
            }}
          >
            <button
              className="cta-email"
              type="button"
              onClick={() => window.open('mailto:hey@dusantmc.com')}
              onFocus={emailMagnetic.handleFocus}
              onBlur={() => {
                emailMagnetic.setShift(0, 0);
                emailMagnetic.handleBlur();
              }}
              ref={(node) => {
                emailMagnetic.contentRef.current = node;
              }}
            >
              <span className="cta-email__label">hey@dusantmc.com</span>
            </button>

            <div className="copy-wrapper">
              <button
                className="copy-btn"
                onClick={handleCopy}
                aria-label="Copy Email"
                onMouseDown={() => emailMagnetic.setShift(2, 0)}
                onMouseUp={() => emailMagnetic.setShift(0, 0)}
                onMouseLeave={() => emailMagnetic.setShift(0, 0)}
                onTouchStart={() => emailMagnetic.setShift(2, 0)}
                onTouchEnd={() => emailMagnetic.setShift(0, 0)}
                onTouchCancel={() => emailMagnetic.setShift(0, 0)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    emailMagnetic.setShift(2, 0);
                  }
                }}
                onKeyUp={() => emailMagnetic.setShift(0, 0)}
              >
                <Image
                  src="/icons/copybtn.svg"
                  alt="Copy"
                  width={20}
                  height={20}
                />
              </button>
              <span className="copy-tooltip">
                {copied ? 'Copied!' : 'Copy Email'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Trusted by Section */}
      <div className="trusted-by">
        <p className="trusted-by-text">
          Trusted by startups and global brands in crypto, real estate, and beyond.
        </p>

        <div className="trusted-logos">
          <div className="logos-slide">
            <Image src="/icons/logo-kripto.svg" alt="Kriptomat" width={111} height={32} />
            <Image src="/icons/logo-rebelmouse.svg" alt="RebelMouse" width={106} height={32} />
            <Image src="/icons/logo-united.svg" alt="United Airlines" width={114} height={32} />
            <Image src="/icons/logo-cbs.svg" alt="CBS Watch! Magazine" width={63} height={32} />
            <Image src="/icons/logo-mc2.svg" alt="MC2 Finance" width={57} height={32} />

            {/* duplicate for seamless loop */}
            <Image src="/icons/logo-kripto.svg" alt="Kriptomat" width={111} height={32} />
            <Image src="/icons/logo-rebelmouse.svg" alt="RebelMouse" width={106} height={32} />
            <Image src="/icons/logo-united.svg" alt="United Airlines" width={114} height={32} />
            <Image src="/icons/logo-cbs.svg" alt="CBS Watch! Magazine" width={63} height={32} />
            <Image src="/icons/logo-mc2.svg" alt="MC2 Finance" width={57} height={32} />
            {/* duplicate for seamless loop */}
            <Image src="/icons/logo-kripto.svg" alt="Kriptomat" width={111} height={32} />
            <Image src="/icons/logo-rebelmouse.svg" alt="RebelMouse" width={106} height={32} />
            <Image src="/icons/logo-united.svg" alt="United Airlines" width={114} height={32} />
            <Image src="/icons/logo-cbs.svg" alt="CBS Watch! Magazine" width={63} height={32} />
            <Image src="/icons/logo-mc2.svg" alt="MC2 Finance" width={57} height={32} />
            {/* duplicate for seamless loop */}
            <Image src="/icons/logo-kripto.svg" alt="Kriptomat" width={111} height={32} />
            <Image src="/icons/logo-rebelmouse.svg" alt="RebelMouse" width={106} height={32} />
            <Image src="/icons/logo-united.svg" alt="United Airlines" width={114} height={32} />
            <Image src="/icons/logo-cbs.svg" alt="CBS Watch! Magazine" width={63} height={32} />
            <Image src="/icons/logo-mc2.svg" alt="MC2 Finance" width={57} height={32} />
            {/* duplicate for seamless loop */}
            <Image src="/icons/logo-kripto.svg" alt="Kriptomat" width={111} height={32} />
            <Image src="/icons/logo-rebelmouse.svg" alt="RebelMouse" width={106} height={32} />
            <Image src="/icons/logo-united.svg" alt="United Airlines" width={114} height={32} />
            <Image src="/icons/logo-cbs.svg" alt="CBS Watch! Magazine" width={63} height={32} />
            <Image src="/icons/logo-mc2.svg" alt="MC2 Finance" width={57} height={32} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderResumeContent = () => (
    <div className="resume-section">
      <h2 className="section-title">Experience</h2>

      <div className="resume-list">
        {EXPERIENCE.map((item) => (
          <div key={item.title + item.dates} className="resume-row">
            <div className="resume-logo">
              <Image
                src={item.logo}
                alt={item.logoAlt}
                width={28}
                height={28}
                sizes="28px"
              />
            </div>

            <div className="resume-body">
              <div className="resume-date">{item.dates}</div>
              <div className="resume-title">{item.title}</div>
              <p className="resume-desc">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAboutContent = () => (
    <div className="about-section">
      <h2 className="section-title">Beyond work</h2>

      <div className="about-copy">
        <p className="about-text">
          When I’m not drawing rectangles in Figma, I’m usually at the gym, running, or cooking something that could pass for healthy (my family swears by my salmon–avocado toast).
        </p>

        <p className="about-text">
          I&apos;m addicted to turquoise water and white sand beaches, and still chasing the dream of standing up on a surfboard for longer than five seconds.
        </p>
      </div>

      {/* --- Photo stack gallery --- */}
      <div className="about-gallery" aria-label="Personal photo gallery">
        {aboutPhotos.map((p, i) => (
          <div key={p.src} className={`about-photo about-photo--${i + 1}`}>
            <div className="about-photo-frame">
              <Image
                src={p.src}
                alt={p.alt}
                width={92}
                height={92}
                priority
                sizes="92px"
              />
            </div>

            <div className="about-tooltip">
              <span className="about-tooltip-text">{p.caption}</span>
            </div>
          </div>
        ))}
      </div>
      {/* --- /Photo stack gallery --- */}
    </div>
  );

  switch (activeTab) {
    case 'intro':
      return renderIntroContent();
    case 'resume':
      return renderResumeContent();
    case 'about':
      return renderAboutContent();
    default:
      return renderIntroContent();
  }
};

export default TabContent;
