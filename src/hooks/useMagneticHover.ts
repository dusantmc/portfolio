import { useCallback, useRef, type MutableRefObject } from 'react';
import type { MouseEvent } from 'react';

interface MagneticOptions {
  stickyFactor?: number;
  scale?: number;
}

interface MagneticHandlers<T extends HTMLElement> {
  elementRef: MutableRefObject<T | null>;
  contentRef: MutableRefObject<HTMLElement | null>;
  handleMouseEnter: () => void;
  handleMouseMove: (event: MouseEvent<T>) => void;
  handleMouseLeave: () => void;
  handleMouseDown: () => void;
  handleMouseUp: (event: MouseEvent<T>) => void;
  handleFocus: () => void;
  handleBlur: () => void;
  reset: (withBounce?: boolean) => void;
  setShift: (x: number, y: number) => void;
  setDelay?: (ms: number) => void;
}

export const useMagneticHover = <T extends HTMLElement = HTMLElement>(
  options: MagneticOptions = {}
): MagneticHandlers<T> => {
  const { stickyFactor = 0.04, scale = 1.05 } = options;

  const elementRef = useRef<T | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const pressedRef = useRef(false);
  const shiftRef = useRef({ x: 0, y: 0 });
  const lastTransformRef = useRef({ scale: 1, moveX: 0, moveY: 0 });
  const delayRef = useRef(0);
  const delayTokenRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const applyTransform = useCallback(
    (element: HTMLElement, scaleValue: number, moveX: number, moveY: number) => {
      lastTransformRef.current = { scale: scaleValue, moveX, moveY };
      const { x, y } = shiftRef.current;
      element.style.transform = `scale(${scaleValue}) translate(${moveX + x}px, ${moveY + y}px)`;
    },
    []
  );

  const reset = useCallback(
    (withBounce = true) => {
      const element = elementRef.current;
      const content = contentRef.current;
      if (!element) return;

      element.style.transition = withBounce
        ? 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        : 'transform 0.1s linear';
      applyTransform(element, 1, 0, 0);

      if (content) {
        content.style.transition = withBounce ? 'opacity 0.3s ease-out' : 'opacity 0.1s linear';
        content.style.opacity = '1';
      }
    },
    [applyTransform]
  );

  const handleMouseEnter = useCallback(() => {
    const element = elementRef.current;
    const content = contentRef.current;
    if (!element) return;

    element.style.transition = 'transform 0.1s linear';
    if (content) {
      content.style.transition = 'opacity 0.1s linear';
      content.style.opacity = '1';
    }
  }, []);

  const handleMouseMove = useCallback(
    (event: MouseEvent<T>) => {
      const element = elementRef.current;
      if (!element || pressedRef.current) return;

      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const normX = (event.clientX - centerX) / (rect.width / 2);
      const normY = (event.clientY - centerY) / (rect.height / 2);

      const moveX = normX * rect.width * stickyFactor;
      const moveY = normY * rect.height * stickyFactor;

      applyTransform(element, scale, moveX, moveY);
    },
    [applyTransform, scale, stickyFactor]
  );

  const handleMouseDown = useCallback(() => {
    const element = elementRef.current;
    const content = contentRef.current;
    pressedRef.current = true;
    if (!element) return;

    element.style.transition = 'transform 0.05s ease';
    applyTransform(element, 1, 0, 0);
    if (content) {
      content.style.transition = 'opacity 0.05s ease';
      content.style.opacity = '0.9';
    }
  }, [applyTransform]);

  const handleMouseUp = useCallback(
    (event: MouseEvent<T>) => {
      const element = elementRef.current;
      const content = contentRef.current;
      pressedRef.current = false;
      if (!element) return;

      element.style.transition = 'transform 0.1s linear';
      if (content) {
        content.style.transition = 'opacity 0.1s linear';
        content.style.opacity = '1';
      }

      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const normX = (event.clientX - centerX) / (rect.width / 2);
      const normY = (event.clientY - centerY) / (rect.height / 2);

      const moveX = normX * rect.width * stickyFactor;
      const moveY = normY * rect.height * stickyFactor;

      applyTransform(element, scale, moveX, moveY);
    },
    [applyTransform, scale, stickyFactor]
  );

  const handleMouseLeave = useCallback(() => {
    pressedRef.current = false;
    if (delayTokenRef.current !== null) {
      window.clearTimeout(delayTokenRef.current);
      delayTokenRef.current = null;
    }
    reset(true);
  }, [reset]);

  const handleFocus = useCallback(() => {
    pressedRef.current = false;
    reset(false);
  }, [reset]);

  const handleBlur = useCallback(() => {
    pressedRef.current = false;
    if (delayTokenRef.current !== null) {
      window.clearTimeout(delayTokenRef.current);
      delayTokenRef.current = null;
    }
    reset(true);
  }, [reset]);

  const setShift = useCallback(
    (x: number, y: number) => {
      shiftRef.current = { x, y };
      const element = elementRef.current;
      if (!element) return;
      const { scale, moveX, moveY } = lastTransformRef.current;
      element.style.transition = 'transform 0.08s ease';
      applyTransform(element, scale, moveX, moveY);
    },
    [applyTransform]
  );

  const setDelay = useCallback((ms: number) => {
    delayRef.current = Math.max(0, ms);
  }, []);

  return {
    elementRef,
    contentRef,
    handleMouseEnter,
    handleMouseMove,
    handleMouseLeave,
    handleMouseDown,
    handleMouseUp,
    handleFocus,
    handleBlur,
    reset,
    setShift,
    setDelay
  };
};
