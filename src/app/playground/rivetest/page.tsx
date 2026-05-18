'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DM_Sans } from 'next/font/google';
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-webgl2';
import './styles.css';

const SM_NAME = 'FAB_Machine';

const dmSans = DM_Sans({ subsets: ['latin'] });

const SIDE_ZONE = (393 - 126) / 2; // 133.5px

const SCREEN_BG = {
  light: [
    'linear-gradient(4deg, #F3F4F6 0%, rgba(255,255,255,0) 89%)',
    'linear-gradient(313deg, rgba(132,204,22,0.24) 0%, rgba(79,70,229,0.24) 100%)',
    '#ffffff',
  ].join(', '),
  dark: [
    'linear-gradient(175.46deg, #0A1628 1.14%, rgba(10,22,40,0) 87.22%)',
    'linear-gradient(-32.22deg, rgba(132,204,22,0.2) 19.71%, rgba(129,140,248,0.2) 72.22%)',
    '#0A1628',
  ].join(', '),
};

export default function RiveTestPage() {
  const [time, setTime] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [showStudyBuddy, setShowStudyBuddy] = useState(false);
  const [chatText, setChatText] = useState('');
  const [isChatFocused, setIsChatFocused] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [streakFireReady, setStreakFireReady] = useState(false);
  const [streakModalKey, setStreakModalKey] = useState(0);
  const [streakCount, setStreakCount] = useState(2);
  const [streakAnimKey, setStreakAnimKey] = useState(0);
  const [streakAnimating, setStreakAnimating] = useState(false);
  const [showSession, setShowSession] = useState(false);
  const [selectedConfidence, setSelectedConfidence] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [stepOneActive, setStepOneActive] = useState(false);

const { RiveComponent, rive } = useRive({
  src: '/playground/doorslam/fab.riv',
  stateMachines: SM_NAME,
  autoplay: true,
});

  const { RiveComponent: ThinkingRive } = useRive({
    src: '/playground/doorslam/thinking.riv',
    stateMachines: 'Thinking_Machine',
    autoplay: true,
  });

  const { RiveComponent: StudyBuddyAvatar, rive: avatarRive } = useRive({
    src: '/playground/doorslam/study_buddy_avatar.riv',
    stateMachines: 'Avatar_Machine',
    autoplay: true,
    layout: new Layout({ fit: Fit.Cover, alignment: Alignment.Center }),
  });

  const { RiveComponent: StreakFireRive } = useRive({
    src: '/playground/doorslam/streak_fire.riv',
    stateMachines: 'Streak Fire',
    autoplay: true,
  });

  const { RiveComponent: FocusRive, rive: focusRive } = useRive({
    src: '/playground/doorslam/focus.riv',
    stateMachines: 'Focus_On',
    autoplay: true,
  });

  useEffect(() => {
    if (!focusRive) return;
    try {
      const input = focusRive.stateMachineInputs('Focus_On')?.find(i => i.name === 'isDarkMode');
      if (input) input.value = isDark;
    } catch {}
  }, [focusRive, isDark]);


const { RiveComponent: StreakButtonRive, rive: streakButtonRive } = useRive({
  src: '/playground/doorslam/streak_fire.riv',
  stateMachines: 'Streak Increase',
  autoplay: true,
});



  useEffect(() => {
    if (streakAnimKey === 0) return;
    streakButtonRive?.reset({ stateMachines: 'Streak Increase' });
    streakButtonRive?.play('Streak Increase');
  }, [streakAnimKey, streakButtonRive]);





  
  const [avatarReady, setAvatarReady] = useState(false);

  useEffect(() => {
    if (!showStudyBuddy) { setAvatarReady(false); return; }
    const t = setTimeout(() => setAvatarReady(true), 100);
    return () => clearTimeout(t);
  }, [showStudyBuddy]);

  useEffect(() => {
    if (!showStreakModal) { setStreakFireReady(false); return; }
    const t = setTimeout(() => setStreakFireReady(true), 100);
    return () => clearTimeout(t);
  }, [showStreakModal]);

const scrollUpTrigger = useStateMachineInput(rive, SM_NAME, 'scrollUp');
const scrollDownTrigger = useStateMachineInput(rive, SM_NAME, 'scrollDown');

  const scrollUpRef   = useRef(scrollUpTrigger);
  const scrollDownRef = useRef(scrollDownTrigger);
  useEffect(() => { scrollUpRef.current   = scrollUpTrigger;   }, [scrollUpTrigger]);
  useEffect(() => { scrollDownRef.current = scrollDownTrigger; }, [scrollDownTrigger]);

  useEffect(() => {
    if (!rive) return;
    rive.play();
  }, [rive]);

  const lastScrollY = useRef(0);
  useEffect(() => {
  const handleScroll = () => {
    const currentY = window.scrollY;

    if (currentY > lastScrollY.current) {
      scrollDownTrigger?.fire();
    } else if (currentY < lastScrollY.current) {
      scrollUpTrigger?.fire();
    }

    lastScrollY.current = currentY;
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}, [scrollUpTrigger, scrollDownTrigger]);

  const cooldown    = useRef(false);



  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const current = (e.target as HTMLDivElement).scrollTop;
    const delta = current - lastScrollY.current;
    lastScrollY.current = current;

    if (cooldown.current || Math.abs(delta) < 1) return;
    cooldown.current = true;
    setTimeout(() => { cooldown.current = false; }, 350);

    if (delta > 0) scrollDownRef.current?.fire();
    else           scrollUpRef.current?.fire();
  }, []);

  const handleCloseStreakModal = () => {
    setShowStreakModal(false);
    setStreakAnimating(true);
    setStreakAnimKey(k => k + 1);
  };

  useEffect(() => {
    if (streakAnimKey === 0) return;
    const t = setTimeout(() => {
      setStreakCount(c => c + 1);
      setStreakAnimating(false);
    }, 724); // 324ms delay + 350ms animation + 50ms buffer
    return () => clearTimeout(t);
  }, [streakAnimKey]);

  useEffect(() => {
    if (showSession) {
      const t = setTimeout(() => setStepOneActive(true), 250);
      return () => clearTimeout(t);
    } else {
      setStepOneActive(false);
    }
  }, [showSession]);

  useEffect(() => {
    if (!showFocusModal) {
      const t = setTimeout(() => focusRive?.reset({ stateMachines: 'Focus_On' }), 300);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      if (!focusRive) return;
      focusRive.reset({ stateMachines: 'Focus_On' });
      focusRive.play('Focus_On');
      requestAnimationFrame(() => {
        try {
          const input = focusRive.stateMachineInputs('Focus_On')?.find(i => i.name === 'isDarkMode');
          if (input) input.value = isDark;
        } catch {}
      });
    }, 250);
    return () => clearTimeout(t);
  }, [showFocusModal, focusRive, isDark]);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = now.getHours() % 12 || 12;
      const m = now.getMinutes().toString().padStart(2, '0');
      setTime(`${h}:${m}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const fg = isDark ? '#E5E7EB' : '#1F2330';
  const accent = isDark ? '#818CF8' : '#4F46E5';
  const statusBarFg = (showStudyBuddy && !showSession) ? '#1F2330' : fg;
  const statusBarIconFilter = (showStudyBuddy && !showSession) ? 'none' : (isDark ? 'brightness(0) invert(1)' : 'none');

  const StatusIcons = () => (
    <svg width="96" height="22" viewBox="0 0 96 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M27.615 6.53302C27.615 5.89998 27.1375 5.3868 26.5484 5.3868H25.4817C24.8926 5.3868 24.415 5.89998 24.415 6.53302V16.467C24.415 17.1 24.8926 17.6132 25.4817 17.6132H26.5484C27.1375 17.6132 27.615 17.1 27.615 16.467V6.53302ZM20.1809 7.83208H21.2476C21.8367 7.83208 22.3143 8.35758 22.3143 9.00581V16.4395C22.3143 17.0877 21.8367 17.6132 21.2476 17.6132H20.1809C19.5918 17.6132 19.1143 17.0877 19.1143 16.4395V9.00581C19.1143 8.35758 19.5918 7.83208 20.1809 7.83208ZM15.8492 10.4811H14.7825C14.1934 10.4811 13.7158 11.0133 13.7158 11.6698V16.4245C13.7158 17.081 14.1934 17.6132 14.7825 17.6132H15.8492C16.4383 17.6132 16.9158 17.081 16.9158 16.4245V11.6698C16.9158 11.0133 16.4383 10.4811 15.8492 10.4811ZM10.5484 12.9264H9.48171C8.8926 12.9264 8.41504 13.451 8.41504 14.0981V16.4415C8.41504 17.0886 8.8926 17.6132 9.48171 17.6132H10.5484C11.1375 17.6132 11.615 17.0886 11.615 16.4415V14.0981C11.615 13.451 11.1375 12.9264 10.5484 12.9264Z" fill="#1F2330"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M43.1865 7.80213C45.6736 7.80223 48.0657 8.72432 49.8682 10.3778C50.0039 10.5054 50.2209 10.5038 50.3545 10.3742L51.652 9.11072C51.7197 9.04496 51.7575 8.95588 51.7569 8.8632C51.7563 8.77052 51.7175 8.68187 51.649 8.61688C46.918 4.24217 39.4543 4.24217 34.7233 8.61688C34.6548 8.68183 34.6159 8.77044 34.6152 8.86313C34.6146 8.95581 34.6523 9.04491 34.7199 9.11072L36.0178 10.3742C36.1514 10.504 36.3685 10.5056 36.5042 10.3778C38.3069 8.72421 40.6992 7.80212 43.1865 7.80213ZM43.1832 12.0224C44.5405 12.0223 45.8494 12.5341 46.8555 13.4582C46.9916 13.5893 47.2059 13.5865 47.3386 13.4518L48.6259 12.1325C48.6937 12.0633 48.7313 11.9694 48.7303 11.8718C48.7293 11.7743 48.6898 11.6812 48.6207 11.6134C45.5568 8.72257 40.8121 8.72257 37.7483 11.6134C37.6791 11.6812 37.6396 11.7743 37.6387 11.8719C37.6378 11.9695 37.6755 12.0634 37.7435 12.1325L39.0304 13.4518C39.163 13.5865 39.3774 13.5893 39.5135 13.4582C40.5189 12.5347 41.8268 12.023 43.1832 12.0224ZM45.7076 14.816C45.7095 14.9213 45.6725 15.0229 45.6052 15.0967L43.4285 17.5514C43.3647 17.6236 43.2777 17.6642 43.1869 17.6642C43.0962 17.6642 43.0092 17.6236 42.9454 17.5514L40.7683 15.0967C40.7011 15.0228 40.6641 14.9212 40.6661 14.8159C40.6681 14.7105 40.7089 14.6108 40.7789 14.5401C42.169 13.2262 44.2049 13.2262 45.595 14.5401C45.6649 14.6108 45.7057 14.7106 45.7076 14.816Z" fill="#1F2330"/>
      <rect opacity="0.35" x="59.2568" y="5.5" width="24" height="12" rx="3.8" stroke="#1F2330"/>
      <path opacity="0.4" d="M84.7568 9.5V13.5755C85.5616 13.2303 86.0849 12.4273 86.0849 11.5377C86.0849 10.6481 85.5616 9.84517 84.7568 9.5Z" fill="#1F2330"/>
      <rect x="60.7568" y="7" width="21" height="9" rx="2.5" fill="#1F2330"/>
    </svg>
  );

  return (
    <>
    <div className="phone-outer" style={{
      boxSizing: 'content-box',
      height: '100dvh',
      overflow: 'hidden',
      background: '#111',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      position: 'relative',
    }}>
{/* iPhone 16 frame */}
      <div className="phone-frame" style={{
        position: 'relative',
        width: 413,
        height: 872,
        background: 'linear-gradient(170deg, #2c2c2c 0%, #1c1c1c 40%, #212121 70%, #252525 100%)',
        borderRadius: 54,
        boxShadow: [
          '0 0 0 0.5px #444',
          'inset 0 0 0 0.5px #3c3c3c',
          '0 30px 70px rgba(0,0,0,0.9)',
          '0 8px 24px rgba(0,0,0,0.6)',
        ].join(', '),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {/* Left side: Action button */}
        <div className="phone-side-btn" style={{ position: 'absolute', left: -3, top: 118, width: 3, height: 36, background: 'linear-gradient(180deg, #2a2a2a 0%, #323232 50%, #2a2a2a 100%)', borderRadius: '3px 0 0 3px', boxShadow: '-1px 0 0 #111, -1px 1px 3px rgba(0,0,0,0.6)' }} />
        {/* Left side: Volume Up */}
        <div className="phone-side-btn" style={{ position: 'absolute', left: -3, top: 172, width: 3, height: 56, background: 'linear-gradient(180deg, #2a2a2a 0%, #323232 50%, #2a2a2a 100%)', borderRadius: '3px 0 0 3px', boxShadow: '-1px 0 0 #111, -1px 1px 3px rgba(0,0,0,0.6)' }} />
        {/* Left side: Volume Down */}
        <div className="phone-side-btn" style={{ position: 'absolute', left: -3, top: 240, width: 3, height: 56, background: 'linear-gradient(180deg, #2a2a2a 0%, #323232 50%, #2a2a2a 100%)', borderRadius: '3px 0 0 3px', boxShadow: '-1px 0 0 #111, -1px 1px 3px rgba(0,0,0,0.6)' }} />
        {/* Right side: Power button */}
        <div className="phone-side-btn" style={{ position: 'absolute', right: -3, top: 196, width: 3, height: 80, background: 'linear-gradient(180deg, #2a2a2a 0%, #323232 50%, #2a2a2a 100%)', borderRadius: '0 3px 3px 0', boxShadow: '1px 0 0 #111, 1px 1px 3px rgba(0,0,0,0.6)' }} />
        {/* Right side: Camera Control */}
        <div className="phone-side-btn" style={{ position: 'absolute', right: -3, top: 606, width: 3, height: 48, background: 'linear-gradient(180deg, #2a2a2a 0%, #323232 50%, #2a2a2a 100%)', borderRadius: '0 3px 3px 0', boxShadow: '1px 0 0 #111, 1px 1px 3px rgba(0,0,0,0.6)' }} />

        {/* Screen */}
        <div className={`${dmSans.className} phone-screen`} style={{
          width: 393,
          height: 852,
          borderRadius: 44,
          background: isDark ? SCREEN_BG.dark : SCREEN_BG.light,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          transition: 'background 0.2s ease',
        }}>

          {/* Persistent status bar + Dynamic Island — sits above all panels */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 40, pointerEvents: 'none' }}>
            <div className="phone-notch" style={{ position: 'absolute', top: 13, left: '50%', transform: 'translateX(-50%)', width: 126, height: 37, background: '#000', borderRadius: 20 }} />
            <div className="phone-status-bar" style={{ height: 59, position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, width: SIDE_ZONE, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: statusBarFg, letterSpacing: '-0.3px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', marginTop: 2, transition: 'color 0.2s ease' }}>{time}</span>
              </div>
              <div style={{ position: 'absolute', right: 0, width: SIDE_ZONE, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', filter: statusBarIconFilter, transition: 'filter 0.2s ease' }}>
                <StatusIcons />
              </div>
            </div>
          </div>

          {/* Main content — pushed left when session panel opens */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            transform: showSession ? 'translateX(-30%)' : 'translateX(0)',
            transition: 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}>

          {/* Header — top bar only, frosted glass */}
          <div style={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            background: isDark
              ? 'linear-gradient(to bottom, rgba(10,22,40,0.8) 0%, rgba(10,22,40,0) 100%)'
              : 'linear-gradient(to bottom, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%)',
            backdropFilter: 'blur(40px)',
            transition: 'background 0.2s ease',
            zIndex: 10,
          }}>

          {/* Status bar spacer */}
          <div className="phone-status-bar" style={{ height: 59 }} />

          {/* Top bar */}
          <div style={{
            height: 64,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 16,
            paddingRight: 16,
            position: 'relative',
          }}>
            <div
              onClick={() => setIsDark(d => !d)}
              className="pressable"
              style={{
                width: 36, height: 36, borderRadius: 18, overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDark ? '#1c2a40' : '#e5e7eb',
                flexShrink: 0, cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/playground/doorslam/avatar.jpg" alt="avatar" width={32} height={32}
                style={{ borderRadius: 16, objectFit: 'cover', display: 'block' }} />
            </div>

            <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={isDark ? '/playground/doorslam/logo-dark.svg' : '/playground/doorslam/logo.svg'}
                alt="logo" width={130} height={24} style={{ display: 'block' }} />
            </div>

            <div className="pressable" onClick={() => { setStreakModalKey(k => k + 1); setShowStreakModal(true); }} style={{ marginLeft: 'auto', flexShrink: 0, cursor: 'pointer' }}>
              <div style={{
                boxSizing: 'border-box',
                height: 36, borderRadius: 18,
                background: isDark ? 'rgba(255,255,255,0.08)' : '#fff',
                boxShadow: 'none',
                display: 'flex', alignItems: 'center',
                paddingLeft: 4, paddingRight: 12, paddingTop: 2, paddingBottom: 2, gap: 0,
                transition: 'background 0.2s ease',
              }}>
                <StreakButtonRive style={{ width: 28, height: 32, flexShrink: 0 }} />
                <div style={{ overflow: 'hidden', height: 14 }}>
                  {streakAnimating ? (
                    <div key={streakAnimKey} style={{
                      display: 'flex', flexDirection: 'column',
                      animation: 'streak-slot 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) 324ms both',
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: fg, lineHeight: '14px', display: 'block', transition: 'color 0.2s ease' }}>
                        {streakCount + 1}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: fg, lineHeight: '14px', display: 'block', transition: 'color 0.2s ease' }}>
                        {streakCount}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 700, color: fg, lineHeight: '14px', display: 'block', transition: 'color 0.2s ease' }}>
                      {streakCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>{/* end header wrapper */}

          {/* Scrollable screen content */}
          <div onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 16 }}>
            {[
              { label: "Today's Sessions",     h: 180 },
              { label: "This Week's Progress", h: 160 },
              { label: "Coming Up Next",        h: 200 },
              { label: "Recent Activity",       h: 140 },
            ].map(({ label, h }, si) => (
              <div key={label} style={{ marginTop: si === 0 ? 0 : 32 }}>
                <div style={{
                  fontSize: 16, lineHeight: '125%', fontWeight: 600,
                  color: isDark ? '#E5E7EB' : '#1F2330',
                  marginBottom: 16, transition: 'color 0.2s ease',
                }}>
                  {label}
                </div>
                <div
                  onClick={si === 0 ? () => { setSelectedConfidence(null); setFocusMode(false); setShowSession(true); } : undefined}
                  className={si === 0 ? 'pressable-card' : undefined}
                  style={{
                    borderRadius: 16,
                    background: isDark ? '#0A1628' : '#ffffff',
                    boxShadow: isDark
                      ? '0px 1px 2px -1px rgba(0,0,0,0.3), 0px 1px 3px 0px rgba(0,0,0,0.3)'
                      : '0px 1px 2px -1px rgba(0,0,0,0.10), 0px 1px 3px 0px rgba(0,0,0,0.10)',
                    ...(si === 0 ? {
                      padding: 16,
                      display: 'flex', flexDirection: 'column', gap: 12,
                      cursor: 'pointer',
                      transition: 'background 0.2s ease, transform 0.15s ease',
                    } : {
                      height: h,
                      transition: 'background 0.2s ease',
                    }),
                  }}
                >
                  {si === 0 && (
                    <>
                      <div style={{ height: 16, borderRadius: 10, background: isDark ? '#1B2840' : '#F3F4F6', transition: 'background 0.2s ease' }} />
                      <div style={{ height: 68, borderRadius: 10, background: isDark ? '#1B2840' : '#F3F4F6', transition: 'background 0.2s ease' }} />
                      <div style={{
                        boxSizing: 'border-box',
                        height: 40, borderRadius: 10,
                        background: '#4F46E5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: 16, lineHeight: '125%', fontWeight: 700, color: '#fff' }}>Start Session</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
            <div style={{ height: 16 }} />
          </div>

          {/* FAB */}
          <div
            onClick={() => {
              setMessages([]);
              setIsThinking(false);
              setChatText('');
              setIsChatFocused(false);
              avatarRive?.reset({ stateMachines: 'Avatar_Machine' });
              avatarRive?.play('Avatar_Machine');
              setShowStudyBuddy(true);
            }}
            className="pressable"
            style={{
              position: 'absolute', right: 20, bottom: 113,
              width: 56, height: 56, zIndex: 15, cursor: 'pointer',
              transformOrigin: 'center',
            }}
          >
            <div style={{
              position: 'absolute', left: -44, top: -44,
              width: 120, height: 120, pointerEvents: 'none',
            }}>
              <RiveComponent />
            </div>
          </div>

          {/* Tab bar + safe area */}
          <div style={{
            flexShrink: 0, display: 'flex', flexDirection: 'column',
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            background: isDark
              ? 'linear-gradient(to bottom, rgba(10,22,40,0) 0%, rgba(10,22,40,0.6) 100%)'
              : 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 100%)',
            backdropFilter: 'blur(40px)',
            transition: 'background 0.2s ease, border-color 0.2s ease',
          }}>
            <div style={{ boxSizing: 'border-box', height: 70, display: 'flex', alignItems: 'flex-start', paddingTop: 12, paddingLeft: 24, paddingRight: 24 }}>
              {[
                { label: 'Today',   icon: '/playground/doorslam/tab-home.svg',   active: true  },
                { label: 'Rewards', icon: '/playground/doorslam/tab-reward.svg', active: false },
                { label: 'Beats',   icon: '/playground/doorslam/tab-beats.svg',  active: false },
              ].map(({ label, icon, active }) => (
                <div key={label} className="pressable" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={icon} alt={label} width={24} height={24} style={{
                    display: 'block',
                    filter: (!active && isDark) ? 'brightness(0) invert(1) opacity(0.5)' : 'none',
                    transition: 'filter 0.2s ease',
                  }} />
                  <span style={{
                    fontSize: 10, fontWeight: 600, lineHeight: 1,
                    color: active ? accent : isDark ? 'rgba(255,255,255,0.4)' : '#6B7280',
                    transition: 'color 0.2s ease',
                  }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ height: 23 }} />
          </div>
          </div>{/* end main content wrapper */}

          {/* Streak modal backdrop */}
          <div
            onClick={handleCloseStreakModal}
            style={{
              position: 'absolute', inset: 0, zIndex: 30,
              background: 'rgba(0,0,0,0.25)',
              opacity: showStreakModal ? 1 : 0,
              pointerEvents: showStreakModal ? 'auto' : 'none',
              transition: 'opacity 0.25s ease',
            }}
          />

          {/* Streak modal */}
          <div style={{
            position: 'absolute', bottom: 40, left: 16, right: 16,
            zIndex: 31,
            background: isDark ? '#0A1628' : '#fff',
            borderRadius: 32,
            transform: showStreakModal ? 'translateY(0)' : 'translateY(120%)',
            opacity: showStreakModal ? 1 : 0,
            transition: 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.25s ease, background 0.2s ease',
            paddingBottom: 40,
          }}>
            {/* Notch */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 8 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.2)' : '#E5E7EB', transition: 'background 0.2s ease' }} />
            </div>

            {/* Content */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 28, paddingLeft: 24, paddingRight: 24 }}>
              {/* Avatar circle */}
              <div style={{
                width: 64, height: 64, borderRadius: 32, flexShrink: 0,
                background: 'linear-gradient(180deg, rgba(249,115,22,0.10) 0%, rgba(249,115,22,0.12) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {streakFireReady && <StreakFireRive style={{ width: 45.5, height: 52 }} />}
              </div>

              {/* Title */}
              <div style={{
                marginTop: 24, fontSize: 24, lineHeight: '125%', fontWeight: 700,
                color: isDark ? '#E5E7EB' : '#1F2330', textAlign: 'center', transition: 'color 0.2s ease',
              }}>
                {streakCount}-day streak – great momentum!
              </div>

              {/* Description */}
              <div style={{
                marginTop: 8, fontSize: 14, lineHeight: '150%',
                color: '#6B7280', textAlign: 'center',
              }}>
                You&apos;re building an amazing habit. Complete today&apos;s sessions to reach a {streakCount + 1}-day streak!
              </div>

              {/* Day circles */}
              {(() => {
                const isOverflow = streakCount >= 5;
                const greenCount = isOverflow ? 4 : streakCount;
                const opacities = isOverflow ? [0.32, 0.72, 1, 1] : Array(greenCount).fill(1);
                const lastGreenIdx = greenCount - 1;
                return (
                  <div key={streakModalKey} style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                    {Array.from({ length: greenCount }).map((_, i) => {
                      const isAnimated = i === lastGreenIdx;
                      return (
                        <div key={i} style={{
                          width: 40, height: 40, borderRadius: 20,
                          background: '#84CC16',
                          opacity: opacities[i],
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          animation: isAnimated ? 'circle-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) 200ms both' : undefined,
                        }}>
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M4 10l4.5 4.5L16 6" stroke={isDark ? '#0A1628' : '#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      );
                    })}
                    <div style={{
                      width: 40, height: 40, borderRadius: 20,
                      background: isDark ? 'rgba(129,140,248,0.10)' : 'rgba(79,70,229,0.10)',
                      border: `1.5px solid ${isDark ? '#818CF8' : '#4F46E5'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      animation: 'circle-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) 320ms both',
                      transition: 'background 0.2s ease, border-color 0.2s ease',
                    }}>
                      <span style={{ fontSize: 18, lineHeight: '125%', fontWeight: 700, color: isDark ? '#818CF8' : '#4F46E5', transition: 'color 0.2s ease' }}>{streakCount + 1}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Focus Mode modal backdrop */}
          <div
            onClick={() => setShowFocusModal(false)}
            style={{
              position: 'absolute', inset: 0, zIndex: 30,
              background: 'rgba(0,0,0,0.25)',
              opacity: showFocusModal ? 1 : 0,
              pointerEvents: showFocusModal ? 'auto' : 'none',
              transition: 'opacity 0.25s ease',
            }}
          />

          {/* Focus Mode modal */}
          <div style={{
            position: 'absolute', bottom: 40, left: 16, right: 16,
            zIndex: 31,
            background: isDark ? '#0A1628' : '#fff',
            borderRadius: 32,
            overflow: 'hidden',
            transform: showFocusModal ? 'translateY(0)' : 'translateY(120%)',
            opacity: showFocusModal ? 1 : 0,
            transition: 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.25s ease, background 0.2s ease',
          }}>
            {/* Pill handle */}
            <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 52, height: 6, borderRadius: 40, background: isDark ? 'rgba(255,255,255,0.2)' : '#E5E7EB', zIndex: 1, transition: 'background 0.2s ease' }} />

            {/* Top animation area */}
            <div style={{ position: 'relative', height: 144, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(107,114,128,0.15) 0%, rgba(107,114,128,0) 100%)' }} />
              <FocusRive style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            </div>

            {/* Content */}
            <div style={{ padding: '12px 20px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: accent, lineHeight: '125%', transition: 'color 0.2s ease' }}>Focus Mode</div>
              <div style={{ marginTop: 8, fontSize: 14, fontWeight: 500, color: '#6B7280', lineHeight: '150%' }}>
                Turn on Do Not Disturb to silence notifications and stay focused during your session.
              </div>
            </div>

            {/* Buttons */}
            <div style={{ padding: '24px 20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                onClick={() => { setFocusMode(true); setShowFocusModal(false); }}
                className="pressable"
                style={{ height: 52, borderRadius: 12, background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: '125%' }}>Turn On Focus Mode</span>
              </div>
              <div
                onClick={() => setShowFocusModal(false)}
                className="pressable-fade"
                style={{ height: 52, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <span style={{ fontSize: 16, fontWeight: 600, color: '#6B7280', lineHeight: '125%' }}>Skip for now</span>
              </div>
            </div>
          </div>

          {/* Session panel — slides in from right */}
          <div className="phone-panel" style={{
            position: 'absolute', top: 0, left: 0,
            width: 393, height: 852,
            background: isDark ? SCREEN_BG.dark : SCREEN_BG.light,
            zIndex: 26,
            display: 'flex', flexDirection: 'column',
            transform: showSession ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94), background 0.2s ease',
            borderRadius: 44,
            overflow: 'hidden',
          }}>
            {/* Header wrapper — frosted glass */}
            <div style={{
              flexShrink: 0, display: 'flex', flexDirection: 'column',
              background: isDark
                ? 'linear-gradient(to bottom, rgba(10,22,40,0.8) 0%, rgba(10,22,40,0) 100%)'
                : 'linear-gradient(to bottom, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%)',
              backdropFilter: 'blur(40px)',
              transition: 'background 0.2s ease',
              zIndex: 10,
            }}>
            {/* Status bar spacer */}
            <div className="phone-status-bar" style={{ height: 59, flexShrink: 0 }} />

            {/* Header nav */}
            <div style={{ height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', paddingLeft: 16, paddingRight: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: fg, lineHeight: '125%', letterSpacing: '-0.3px', transition: 'color 0.2s ease' }}>Mathematics A</div>
                <div style={{ fontSize: 14, fontWeight: 400, color: '#6B7280', lineHeight: '150%' }}>Fractional Distillation of Crude Oil</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {/* Timer badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: isDark ? '#1B2840' : '#fff', borderRadius: 18, paddingLeft: 10, paddingRight: 10, boxSizing: 'border-box', height: 36, transition: 'background 0.2s ease' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/playground/doorslam/timer.svg" alt="" width={16} height={16} style={{ display: 'block' }} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#6B7280', lineHeight: 1 }}>25m</span>
                </div>
                {/* Close */}
                <div onClick={() => setShowSession(false)} className="pressable" style={{ width: 36, height: 36, borderRadius: 18, background: isDark ? '#1B2840' : '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s ease' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M5 5l10 10M15 5L5 15" stroke={fg} strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
            </div>
            </div>{/* end header wrapper */}

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingLeft: 16, paddingRight: 16 }}>

              {/* Steps */}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 16 }}>
                {(['Preview','Recall','Revise','Practice','Summary','Complete'] as const).map((step, i) => (
                  <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 52 }}>
                    {i === 0 ? (
                      <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
                        {/* Inactive circle — shrinks away */}
                        <div style={{ position: 'absolute', inset: 0, borderRadius: 16, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)', animation: stepOneActive ? 'step-shrink 0.2s ease forwards' : undefined }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.4)' : '#6B7280', lineHeight: '125%' }}>1</span>
                        </div>
                        {/* Active circle — grows in */}
                        {stepOneActive && (
                          <div style={{ position: 'absolute', inset: 0, borderRadius: 16, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'step-grow 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.18s both', transition: 'background 0.2s ease' }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: '125%' }}>1</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: 16, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)', transition: 'background 0.2s ease' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.4)' : '#6B7280', lineHeight: '125%', transition: 'color 0.2s ease' }}>{i + 1}</span>
                      </div>
                    )}
                    <span style={{ fontSize: 12, fontWeight: i === 0 && stepOneActive ? 700 : 400, color: i === 0 && stepOneActive ? accent : '#6B7280', marginTop: 4, lineHeight: '125%', transition: 'color 0.2s ease, font-weight 0s' }}>{step}</span>
                  </div>
                ))}
              </div>

              {/* Focus Mode */}
              <div onClick={() => focusMode ? setFocusMode(false) : setShowFocusModal(true)} className="pressable-card" style={{ background: focusMode ? `linear-gradient(rgba(132,204,22,0.1), rgba(132,204,22,0.1)), ${isDark ? '#0A1628' : '#fff'}` : isDark ? '#0A1628' : '#fff', border: `1.5px solid ${focusMode ? '#84CC16' : 'transparent'}`, borderRadius: 16, boxShadow: isDark ? '0px 1px 2px -1px rgba(0,0,0,0.3), 0px 1px 3px 0px rgba(0,0,0,0.3)' : '0 1px 2px -1px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.1)', padding: '20px 20px 20px 24px', display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, marginBottom: 24, cursor: 'pointer', transition: 'background 0.2s ease, border-color 0.2s ease, transform 0.15s ease' }}>
                <div style={{ position: 'relative', width: 24, height: 24, flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/playground/doorslam/bell.svg" alt="" width={24} height={24} style={{ display: 'block', position: 'absolute', opacity: focusMode ? 0 : 1, transition: 'opacity 0.2s ease', filter: isDark ? 'brightness(0) invert(1)' : 'none' }} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/playground/doorslam/bell-off.svg" alt="" width={24} height={24} style={{ display: 'block', position: 'absolute', opacity: focusMode ? 1 : 0, transition: 'opacity 0.2s ease' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: fg, lineHeight: '125%', transition: 'color 0.2s ease' }}>Focus Mode</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: isDark ? '#9CA3AF' : '#6B7280', lineHeight: '150%', transition: 'color 0.2s ease' }}>{focusMode ? '+5 bonus points for focused revision' : 'Earn +5 bonus points for focused revision'}</div>
                </div>
                <div style={{ width: 56, height: 32, borderRadius: 16, background: focusMode ? '#84CC16' : isDark ? '#1B2840' : '#E5E7EB', position: 'relative', flexShrink: 0, transition: 'background 0.2s ease' }}>
                  <div style={{ position: 'absolute', top: 4, left: focusMode ? 28 : 4, width: 24, height: 24, borderRadius: 12, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'left 0.2s ease' }} />
                </div>
              </div>

              {/* Confidence heading */}
              <div style={{ paddingLeft: 4, marginBottom: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: fg, lineHeight: '125%', transition: 'color 0.2s ease' }}>How confident are you with this topic?</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#6B7280', lineHeight: '150%', marginTop: 2 }}>This helps us tailor the session to your needs</div>
              </div>

              {/* Confidence options */}
              <div style={{ opacity: showFocusModal ? 0.3 : 1, pointerEvents: showFocusModal ? 'none' : 'auto', transition: 'opacity 0.2s ease' }}>
              <div style={{ background: isDark ? '#0A1628' : '#fff', borderRadius: 16, padding: 8, boxShadow: isDark ? '0px 1px 2px -1px rgba(0,0,0,0.3), 0px 1px 3px 0px rgba(0,0,0,0.3)' : '0 1px 1px rgba(0,0,0,0.05)', transition: 'background 0.2s ease' }}>
                {([
                  { id: 'very-confident', title: 'Very confident', subtitle: 'I already know this topic well', color: '#84CC16', selectedBg: 'rgba(132,204,22,0.102)', icon: '/playground/doorslam/option-confident.svg' },
                  { id: 'fairly-confident', title: 'Fairly confident', subtitle: 'I know some of it but could use a refresher', color: '#4F46E5', selectedBg: 'rgba(59,130,246,0.102)', icon: '/playground/doorslam/option-fairly.svg' },
                  { id: 'unsure', title: 'A bit unsure', subtitle: "I've heard of it but don't know it well", color: '#F97316', selectedBg: 'rgba(249,115,22,0.102)', icon: '/playground/doorslam/option-unsure.svg' },
                  { id: 'new', title: 'New to me', subtitle: 'This topic is completely new or very unclear', color: '#EF4444', selectedBg: 'rgba(239,68,68,0.102)', icon: '/playground/doorslam/option-new.svg' },
                ] as const).map(({ id, title, subtitle, color, selectedBg, icon }) => (
                  <div key={id} onClick={() => setSelectedConfidence(id)} style={{ WebkitTapHighlightColor: 'transparent', display: 'flex', alignItems: 'center', gap: 16, padding: '13px 12px', borderRadius: 8, cursor: 'pointer', background: selectedConfidence === id ? selectedBg : selectedBg.replace('0.102', '0'), transition: 'background 0.2s ease' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={icon} alt="" width={24} height={24} style={{ flexShrink: 0, display: 'block' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: fg, lineHeight: '125%', transition: 'color 0.2s ease' }}>{title}</div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#6B7280', lineHeight: '150%' }}>{subtitle}</div>
                    </div>
                    <div style={{ width: 20, height: 20, borderRadius: 10, border: `2px solid ${selectedConfidence === id ? color : '#D1D5DB'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'border-color 0.15s ease' }}>
                      {selectedConfidence === id && <div style={{ width: 10, height: 10, borderRadius: 5, background: color, animation: 'scale-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both' }} />}
                    </div>
                  </div>
                ))}
              </div>

              </div>{/* end confidence section */}

            </div>

            {/* Footer */}
            <div style={{ flexShrink: 0, paddingTop: 0, paddingLeft: 16, paddingRight: 16, paddingBottom: 20, opacity: showFocusModal ? 0 : 1, pointerEvents: showFocusModal ? 'none' : 'auto', transition: 'opacity 0.2s ease' }}>
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: accent, lineHeight: '125%', transition: 'color 0.2s ease' }}>Ready to begin?</div>
                <div style={{ fontSize: 14, fontWeight: 400, color: '#6B7280', lineHeight: '150%' }}>Let&apos;s start your revision session</div>
              </div>
              <div className="pressable" style={{ boxSizing: 'border-box', height: 52, borderRadius: 12, background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: selectedConfidence ? 1 : 0.5, cursor: selectedConfidence ? 'pointer' : 'default', transition: 'opacity 0.2s ease' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: '125%' }}>Start Session</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/playground/doorslam/cta-arrow.svg" alt="" width={16} height={16} style={{ display: 'block' }} />
              </div>
            </div>
            <div style={{ height: 23, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 140, height: 5, borderRadius: 3, background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(31,35,48,0.2)' }} />
            </div>
          </div>

          {/* Study Buddy panel — slides in from right */}
          <div className="phone-panel" style={{
            position: 'absolute', top: 0, left: 0,
            width: 393, height: 852,
            background: '#F3F4F6',
            zIndex: 25,
            display: 'flex', flexDirection: 'column',
            transform: showStudyBuddy ? 'scale(1)' : 'scale(0)',
            transformOrigin: '333px 699px',
            opacity: showStudyBuddy ? 1 : 0,
            transition: 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.2s ease',
            borderRadius: 44,
            overflow: 'hidden',
          }}>

            {/* Status bar spacer */}
            <div className="phone-status-bar" style={{ height: 59, flexShrink: 0 }} />

            {/* Nav bar */}
            <div style={{
              height: 64, flexShrink: 0,
              display: 'flex', alignItems: 'center',
              paddingLeft: 16, paddingRight: 16,
              position: 'relative',
            }}>
              {/* Menu button */}
              <div className="pressable" style={{
                width: 36, height: 36, borderRadius: 18,
                background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5h14M3 10h14M3 15h14" stroke="#1F2330" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>

              {/* Title */}
              <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#1F2330', letterSpacing: '-0.3px' }}>
                  Study Buddy
                </span>
              </div>

              {/* Close button */}
              <div
                onClick={() => setShowStudyBuddy(false)}
                className="pressable"
                style={{
                  marginLeft: 'auto',
                  width: 36, height: 36, borderRadius: 18,
                  background: isDark ? '#1B2840' : '#fff',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                  transition: 'background 0.2s ease',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5l10 10M15 5L5 15" stroke="#1F2330" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            </div>

            {/* Content */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              paddingLeft: 16, paddingRight: 16, overflowY: 'auto',
            }}>
              {messages.length === 0 ? (
                /* Empty state — avatar + headline + tip */
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 4,
                  paddingLeft: 16, paddingRight: 16, paddingBottom: 64,
                }}>
                  <div style={{ width: 96, height: 96, flexShrink: 0 }}>
                    {avatarReady && <StudyBuddyAvatar style={{ width: 96, height: 96 }} />}
                  </div>
                  <div style={{
                    fontSize: 24, fontWeight: 600, color: '#1F2330',
                    textAlign: 'center', letterSpacing: '-0.3px',
                  }}>
                    Hi! I&apos;m your Study Buddy
                  </div>
                  <div style={{
                    fontSize: 16, lineHeight: '150%', color: '#6B7280',
                    textAlign: 'center', marginBottom: 20,
                  }}>
                    Ask me anything about what you&apos;re learning!
                  </div>
                  <div style={{ opacity: 0.9, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1.5C5.51 1.5 3.5 3.51 3.5 6c0 1.55.77 2.92 1.95 3.75.28.19.45.5.45.83V11h4.2v-.42c0-.33.17-.64.45-.83C11.73 8.92 12.5 7.55 12.5 6c0-2.49-2.01-4.5-4.5-4.5z" stroke="#4F46E5" strokeWidth="1.2" strokeLinejoin="round"/>
                      <path d="M6 11v.5A2 2 0 008 13.5a2 2 0 002-2V11" stroke="#4F46E5" strokeWidth="1.2" strokeLinecap="round"/>
                      <line x1="8" y1="1.5" x2="8" y2="0.5" stroke="#4F46E5" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    <span style={{ fontSize: 14, color: '#4F46E5' }}>
                      hold the mic button to ask with your voice
                    </span>
                  </div>
                </div>
              ) : (
                /* Chat view */
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 16 }}>
                  {messages.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                      <div style={{
                        background: 'rgba(79,70,229,0.10)',
                        borderRadius: 20,
                        paddingTop: 14, paddingBottom: 14,
                        paddingLeft: 16, paddingRight: 16,
                        minWidth: 52, maxWidth: '80%',
                        fontSize: 18, lineHeight: '136%', color: '#1F2330',
                      }}>
                        {msg}
                      </div>
                    </div>
                  ))}

                  {isThinking && (
                    <div style={{
                      marginTop: 20, display: 'flex', alignItems: 'center',
                      height: 44, gap: 8,
                    }}>
                      <div style={{ width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                        <ThinkingRive style={{ width: 28, height: 28 }} />
                      </div>
                      <span style={{
                        fontSize: 16,
                        lineHeight: '28px',
                        background: 'linear-gradient(90deg, #6B7280 20%, #F3F4F6 50%, #6B7280 80%)',
                        backgroundSize: '200% auto',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        animation: 'thinking-shimmer 3.5s linear infinite',
                      }}>Thinking...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom — chatbox + safe area */}
            <div style={{
              flexShrink: 0,
              paddingLeft: isChatFocused || isThinking || messages.length > 0 ? 16 : 24,
              paddingRight: isChatFocused || isThinking || messages.length > 0 ? 16 : 24,
              paddingBottom: 8,
              transition: 'padding 0.2s ease',
            }}>
              <div style={{
                height: 52, borderRadius: 26,
                background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                display: 'flex', alignItems: 'center',
                paddingLeft: 20, paddingRight: 8, gap: 8,
              }}>
                <input
                  type="text"
                  placeholder="Ask Study Buddy"
                  value={chatText}
                  onChange={e => setChatText(e.target.value)}
                  onFocus={() => setIsChatFocused(true)}
                  onBlur={() => setIsChatFocused(false)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && chatText.trim() && !isThinking) {
                      setMessages(prev => [...prev, chatText.trim()]);
                      setChatText('');
                      setIsThinking(true);
                    }
                  }}
                  style={{
                    flex: 1, border: 'none', outline: 'none',
                    fontSize: 18, fontFamily: 'inherit',
                    background: 'transparent',
                    color: '#1F2330',
                  }}
                />
                {/* Mic / Send / Stop button */}
                <div className="pressable" style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
                  {/* Mic — visible when no text and not thinking */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    borderRadius: 18, background: '#4F46E5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    opacity: chatText || isThinking ? 0 : 1,
                    transform: chatText || isThinking ? 'scale(0.5)' : 'scale(1)',
                    transition: 'opacity 0.1s ease, transform 0.2s ease',
                    pointerEvents: chatText || isThinking ? 'none' : 'auto',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <rect x="7" y="2" width="6" height="10" rx="3" stroke="white" strokeWidth="1.5"/>
                      <path d="M4 10a6 6 0 0012 0" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="10" y1="16" x2="10" y2="18" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="8" y1="18" x2="12" y2="18" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  {/* Send — visible when text present and not thinking */}
                  <div
                    onClick={() => {
                      if (!chatText.trim()) return;
                      setMessages(prev => [...prev, chatText.trim()]);
                      setChatText('');
                      setIsThinking(true);
                    }}
                    style={{
                      position: 'absolute', inset: 0,
                      borderRadius: 18, background: '#4F46E5',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                      opacity: chatText && !isThinking ? 1 : 0,
                      transform: chatText && !isThinking ? 'scale(1)' : 'scale(0.5)',
                      transition: 'opacity 0.1s ease, transform 0.2s ease',
                      pointerEvents: chatText && !isThinking ? 'auto' : 'none',
                    }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/playground/doorslam/send.svg" alt="send" width={20} height={20} style={{ display: 'block' }} />
                  </div>
                  {/* Stop — visible when thinking */}
                  <div
                    onClick={() => {
                      setMessages([]);
                      setIsThinking(false);
                      setChatText('');
                      setIsChatFocused(false);
                    }}
                    style={{
                      position: 'absolute', inset: 0,
                      borderRadius: 18, background: '#4F46E5',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                      opacity: isThinking ? 1 : 0,
                      transform: isThinking ? 'scale(1)' : 'scale(0.5)',
                      transition: 'opacity 0.1s ease, transform 0.2s ease',
                      pointerEvents: isThinking ? 'auto' : 'none',
                    }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/playground/doorslam/stop.svg" alt="stop" width={20} height={20} style={{ display: 'block' }} />
                  </div>
                </div>
              </div>
              <div style={{ height: 23 }} />
            </div>

          </div>

        </div>
      </div>
    </div>
    </>
  );
}
