'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const MetaRobots: React.FC = () => {
  const searchParams = useSearchParams();
  const isPrivate = searchParams.get('private') === 'true';

  useEffect(() => {
    if (isPrivate) {
      // Add meta robots noindex tag when private=true
      const metaRobots = document.querySelector('meta[name="robots"]');
      if (metaRobots) {
        metaRobots.setAttribute('content', 'noindex');
      } else {
        const meta = document.createElement('meta');
        meta.name = 'robots';
        meta.content = 'noindex';
        document.head.appendChild(meta);
      }
    } else {
      // Remove or update meta robots tag when not private
      const metaRobots = document.querySelector('meta[name="robots"]');
      if (metaRobots) {
        metaRobots.setAttribute('content', 'index, follow');
      }
    }
  }, [isPrivate]);

  return null;
};

export default MetaRobots;
