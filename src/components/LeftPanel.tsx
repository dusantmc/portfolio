'use client';

import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import TabContent from './TabContent';
import MagneticSocialLink from './MagneticSocialLink';

interface LeftPanelProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const LeftPanel: React.FC<LeftPanelProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'intro', label: 'Intro' },
    { id: 'resume', label: 'Resume' },
    { id: 'about', label: 'About me' },
  ];

  const prevTab = useRef(activeTab);

  const handleTabClick = (tabId: string) => {
    prevTab.current = activeTab;
    setActiveTab(tabId);
  };

  type TransitionPhases = {
    initial: { opacity: number; x: number };
    animate: { opacity: number; x: number };
    exit: { opacity: number; x: number };
  };

  // Define all 6 transitions
  const transitionAnimations: Record<string, TransitionPhases> = {
    // --- INTRO to others ---
    'intro->resume': {
      initial: { opacity: 0, x: 12 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -12 },
    },
    'intro->about': {
      initial: { opacity: 0, x: 12 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -12 },
    },

    // --- RESUME to others ---
    'resume->intro': {
      initial: { opacity: 0, x: 12 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -12 },
    },
    'resume->about': {
      initial: { opacity: 0, x: 12 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -12 },
    },

    // --- ABOUT to others ---
    'about->intro': {
      initial: { opacity: 0, x: 12 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -12 },
    },
    'about->resume': {
      initial: { opacity: 0, x: 12 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x:  -12 },
    },

    // --- Default (fallback) ---
    default: {
      initial: { opacity: 0, x: 12 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -12 },
    },
  };

  // Determine current transition
  const transitionKey = `${prevTab.current}->${activeTab}`;
  const { initial, animate, exit } =
    transitionAnimations[transitionKey] || transitionAnimations.default;

  return (
    <div className="left-panel">
      {/* Header */}
      <div className="lp-header">
        <div className="lp-header-row">
          <button
            aria-label="Home"
            onClick={() => handleTabClick('intro')}
            className="logo-button shrink-0"
          >
            <Image src="/icons/logo.svg" alt="Logo" width={32} height={32} priority />
          </button>

          <nav className="lp-nav">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`lp-tab ${activeTab === tab.id ? 'is-active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Animated content */}
      <div className="lp-content flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={initial}
            animate={animate}
            exit={exit}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="h-full"
          >
            <TabContent activeTab={activeTab} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="lp-footer">
        <span className="lp-footer-copy">© Dusan Tomic 2025</span>
        <div className="lp-footer-social">
          <span className="lp-footer-copy lp-footer-label">Let’s connect</span>
          <div className="lp-footer-buttons">
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
    </div>
  );
};

export default LeftPanel;
