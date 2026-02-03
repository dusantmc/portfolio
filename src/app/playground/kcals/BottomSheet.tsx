"use client";

import {
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

const ANIM_MS = 250;

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  variant?: "sheet" | "center";
  className?: string;
  children: ReactNode;
}

export function BottomSheet({
  open,
  onClose,
  variant = "sheet",
  className,
  children,
}: BottomSheetProps) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const vpRef = useRef<HTMLDivElement>(null);
  const scrollYRef = useRef(0);

  // Mount/unmount + close animation
  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
    } else if (visible && !closing) {
      setClosing(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setClosing(false);
      }, ANIM_MS);
      return () => clearTimeout(timer);
    }
  }, [open, visible, closing]);

  // Scroll lock (overflow hidden + touch prevention for iOS)
  useEffect(() => {
    if (!visible) return;
    scrollYRef.current = window.scrollY;
    const html = document.documentElement;
    const body = document.body;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    // iOS: prevent scroll via touch on the overlay background
    const onTouchMove = (e: TouchEvent) => {
      let el = e.target as HTMLElement | null;
      while (el && el !== body) {
        const s = window.getComputedStyle(el);
        if (
          (s.overflowY === "auto" || s.overflowY === "scroll") &&
          el.scrollHeight > el.clientHeight
        ) return; // allow scroll inside scrollable modal content
        el = el.parentElement;
      }
      e.preventDefault();
    };
    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
      document.removeEventListener("touchmove", onTouchMove);
      window.scrollTo(0, scrollYRef.current);
    };
  }, [visible]);

  // Visual viewport tracking — direct inline styles on the wrapper ref
  useEffect(() => {
    if (!visible) return;
    const el = vpRef.current;
    if (!el) return;

    const update = () => {
      const vv = window.visualViewport;
      const top = vv?.offsetTop ?? 0;
      const height = vv?.height ?? window.innerHeight;
      el.style.top = `${top}px`;
      el.style.height = `${height}px`;
    };

    update();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);

    // Delayed updates for keyboard open/close animation
    let timers: ReturnType<typeof setTimeout>[] = [];
    const onFocusChange = () => {
      update();
      timers.forEach(clearTimeout);
      timers = [
        setTimeout(update, 50),
        setTimeout(update, 150),
        setTimeout(update, 300),
        setTimeout(update, 500),
      ];
    };
    document.addEventListener("focusin", onFocusChange);
    document.addEventListener("focusout", onFocusChange);

    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      document.removeEventListener("focusin", onFocusChange);
      document.removeEventListener("focusout", onFocusChange);
      timers.forEach(clearTimeout);
    };
  }, [visible]);

  if (!visible) return null;

  const isCenter = variant === "center";

  return (
    <div
      className={`kcals-modal-overlay${closing ? " kcals-closing" : ""}${isCenter ? " kcals-weekly-overlay" : ""}`}
      onClick={onClose}
    >
      <div
        ref={vpRef}
        className={`kcals-modal-vp${isCenter ? " kcals-modal-vp-center" : ""}`}
      >
        <div
          className={`${isCenter ? "kcals-weekly-modal" : "kcals-modal"}${className ? ` ${className}` : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
