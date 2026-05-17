'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  resetKey: number;
}

/**
 * Error boundary that wraps the R3F Canvas.
 *
 * React 19 StrictMode mounts → disposes → remounts the Canvas, which can
 * cause transient WebGL errors on the second mount. We catch the error and
 * immediately increment resetKey, which unmounts and remounts the Canvas
 * with a clean WebGL context.
 */
export default class CanvasErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, resetKey: 0 };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch() {
    // Reset immediately — gives React one tick to flush, then remounts cleanly
    setTimeout(() => {
      this.setState((s) => ({ hasError: false, resetKey: s.resetKey + 1 }));
    }, 0);
  }

  render() {
    // Pass resetKey as a React key so the child tree fully remounts on reset
    return (
      <React.Fragment key={this.state.resetKey}>
        {this.state.hasError ? null : this.props.children}
      </React.Fragment>
    );
  }
}
