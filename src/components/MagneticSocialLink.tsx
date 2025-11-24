import { useMagneticHover } from '@/hooks/useMagneticHover';
import type { AnchorHTMLAttributes, ReactNode, MouseEvent as ReactMouseEvent, FocusEvent } from 'react';

interface MagneticSocialLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
}

const MagneticSocialLink = ({
  children,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
  onMouseDown,
  onMouseUp,
  onFocus,
  onBlur,
  ...rest
}: MagneticSocialLinkProps) => {
  const magnetic = useMagneticHover<HTMLAnchorElement>({ stickyFactor: 0.02, scale: 1.05 });

  const handleMouseEnter = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    magnetic.handleMouseEnter();
    onMouseEnter?.(event);
  };

  const handleMouseMove = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    magnetic.handleMouseMove(event);
    onMouseMove?.(event);
  };

  const handleMouseLeave = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    magnetic.handleMouseLeave();
    onMouseLeave?.(event);
  };

  const handleMouseDown = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    magnetic.handleMouseDown();
    onMouseDown?.(event);
  };

  const handleMouseUp = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    magnetic.handleMouseUp(event);
    onMouseUp?.(event);
  };

  const handleFocus = (event: FocusEvent<HTMLAnchorElement>) => {
    magnetic.handleFocus();
    onFocus?.(event);
  };

  const handleBlur = (event: FocusEvent<HTMLAnchorElement>) => {
    magnetic.handleBlur();
    onBlur?.(event);
  };

  return (
    <a
      {...rest}
      ref={magnetic.elementRef}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
    </a>
  );
};

export default MagneticSocialLink;
