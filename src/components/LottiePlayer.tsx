'use client';

import React from 'react';

export interface LottiePlayerElement extends HTMLElement {
  play?: () => void;
  pause?: () => void;
  stop?: () => void;
  seek?: (value: number | string) => void;
  loopBetween?: (startSeconds: number, endSeconds: number) => void;
  loop?: boolean | number;
  duration?: number;
}

export type LottiePlayerProps = React.DetailedHTMLProps<
  React.HTMLAttributes<LottiePlayerElement>,
  LottiePlayerElement
> & {
  src?: string;
  loop?: boolean | '';
  autoplay?: boolean | '';
  mode?: string;
  renderer?: string;
  background?: string;
  speed?: number | string;
};

const LottiePlayer = React.forwardRef<LottiePlayerElement, LottiePlayerProps>(
  ({ children, ...rest }, ref) =>
    React.createElement('lottie-player', { ...rest, ref }, children)
);

LottiePlayer.displayName = 'LottiePlayer';

export default LottiePlayer;
