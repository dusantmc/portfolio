'use client';

import { useEffect } from 'react';

const CustomMetaTags: React.FC = () => {
  useEffect(() => {
    // Add custom og:type meta tag
    const existingTypeMeta = document.querySelector('meta[property="og:type"]');
    if (existingTypeMeta) {
      existingTypeMeta.setAttribute('content', 'Portfolio');
    } else {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:type');
      meta.setAttribute('content', 'Portfolio');
      document.head.appendChild(meta);
    }

    // Ensure og:image meta tag is set correctly
    const existingImageMeta = document.querySelector('meta[property="og:image"]');
    if (existingImageMeta) {
      existingImageMeta.setAttribute('content', '/og-image.png');
    } else {
      const imageMeta = document.createElement('meta');
      imageMeta.setAttribute('property', 'og:image');
      imageMeta.setAttribute('content', '/og-image.png');
      document.head.appendChild(imageMeta);
    }
  }, []);

  return null;
};

export default CustomMetaTags;

