import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import VercelAnalytics from "../components/VercelAnalytics";
import "./globals.css";

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.dusantmc.com'),
  title: "Dusan Tomic - Senior Product Designer",
  description:
    "I design products that work. Specialized in SaaS platforms, mobile apps, and everything in between.",
  openGraph: {
    title: "Dusan Tomic - Senior Product Designer",
    description: "I design products that work. Specialized in SaaS platforms, mobile apps, and everything in between.",
    type: "website",
    siteName: "Dusan Tomic - Portfolio",
    images: [
      {
        url: "https://www.dusantmc.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Dusan Tomic - Senior Product Designer Portfolio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dusan Tomic - Senior Product Designer",
    description: "I design products that work. Specialized in SaaS platforms, mobile apps, and everything in between.",
    images: ["https://www.dusantmc.com/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/icons/favicon.ico" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
    other: [
      {
        rel: "android-chrome",
        url: "/icons/android-chrome-192x192.png",
        sizes: "192x192",
      },
      {
        rel: "android-chrome",
        url: "/icons/android-chrome-512x512.png",
        sizes: "512x512",
      },
    ],
  },
  manifest: "/icons/site.webmanifest", // optional, if you have it
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Critical inline CSS to prevent FOUC if external CSS fails to load */}
        <style dangerouslySetInnerHTML={{
          __html: `
          :root{--background:#fff;--foreground:#000;--font-sans:'Nunito Sans',system-ui,-apple-system,sans-serif}
          *{box-sizing:border-box;margin:0;padding:0}
          body{background:var(--background);color:var(--foreground);font-family:var(--font-sans);line-height:1.6}
          html,body{height:100%}
          .app-shell{min-height:100vh;display:flex;flex-direction:row}
          @media(max-width:1023px){.app-shell{flex-direction:column}}
        `}} />
      </head>
      <body className={`${nunitoSans.variable} antialiased`}>
        {children}
        <SpeedInsights />
        <VercelAnalytics />
      </body>
    </html>
  );
}
