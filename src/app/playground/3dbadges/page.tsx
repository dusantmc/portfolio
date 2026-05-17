'use client';

/**
 * Route entry point — client shell.
 * BadgeApp contains all Three.js / WebGL code and is loaded
 * with SSR disabled to avoid canvas hydration issues.
 * Turbopack requires 'use client' when ssr: false is used with next/dynamic.
 */
import dynamic from 'next/dynamic';

const BadgeApp = dynamic(() => import('./components/BadgeApp'), { ssr: false });

export default function BadgesPage() {
  return <BadgeApp />;
}
