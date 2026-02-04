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
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const vpRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollYRef = useRef(0);
  const startYRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef(0);

  const resetDrag = () => {
    setDragOffset(0);
    setDragging(false);
    draggingRef.current = false;
    dragOffsetRef.current = 0;
    startYRef.current = null;
    pointerIdRef.current = null;
  };

  // Mount/unmount + close animation
  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
      resetDrag();
    } else if (visible && !closing) {
      setClosing(true);
      resetDrag();
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
  const dragStyle =
    dragOffset > 0
      ? {
          transform: `translateY(${dragOffset}px)`,
          transition: dragging ? "none" : undefined,
        }
      : undefined;

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
          ref={modalRef}
          className={`${isCenter ? "kcals-weekly-modal" : "kcals-modal"}${className ? ` ${className}` : ""}`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            if (e.pointerType === "mouse") return;
            const modal = modalRef.current;
            if (!modal || modal.scrollTop > 0) return;
            const target = e.target as HTMLElement;
            if (target.closest("input, textarea, select, button, a")) return;
            startYRef.current = e.clientY;
            pointerIdRef.current = e.pointerId;
            draggingRef.current = true;
            setDragging(true);
            dragOffsetRef.current = 0;
            setDragOffset(0);
            try {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            } catch {
              // ignore
            }
          }}
          onPointerMove={(e) => {
            if (!draggingRef.current || pointerIdRef.current !== e.pointerId) return;
            const startY = startYRef.current ?? e.clientY;
            const delta = e.clientY - startY;
            if (delta <= 0) {
              dragOffsetRef.current = 0;
              setDragOffset(0);
              return;
            }
            e.preventDefault();
            dragOffsetRef.current = delta;
            setDragOffset(delta);
          }}
          onPointerUp={(e) => {
            if (pointerIdRef.current !== e.pointerId) return;
            const shouldClose = dragOffsetRef.current > 110;
            resetDrag();
            if (shouldClose) onClose();
          }}
          onPointerCancel={(e) => {
            if (pointerIdRef.current !== e.pointerId) return;
            resetDrag();
          }}
          style={dragStyle}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
