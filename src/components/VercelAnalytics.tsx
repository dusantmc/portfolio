"use client";

import { Analytics } from "@vercel/analytics/next";

const EXCLUDED_PATHS = ["/playground/kcals"];

const getPathname = (url: string) => {
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return new URL(url).pathname;
    }

    return new URL(url, window.location.origin).pathname;
  } catch {
    return url;
  }
};

const shouldExclude = (url: string) => {
  const pathname = getPathname(url);

  return EXCLUDED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
};

export default function VercelAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => (shouldExclude(event.url) ? null : event)}
    />
  );
}
