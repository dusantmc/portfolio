import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Dusan Tomic - Product Designer",
  description:
    "I design products that work. Specialized in SaaS platforms, mobile apps, and everything in between.",
  openGraph: {
    title: "Dusan Tomic - Product Designer",
    description: "I design products that work. Specialized in SaaS platforms, mobile apps, and everything in between.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dusan Tomic - Product Designer",
    description: "I design products that work. Specialized in SaaS platforms, mobile apps, and everything in between.",
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
      <body className={`${nunitoSans.variable} antialiased`}>
        {children}
        <SpeedInsights />
        <Analytics/>
      </body>
    </html>
  );
}
