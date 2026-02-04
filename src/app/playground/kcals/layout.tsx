import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import "./kcals.css";

export const metadata: Metadata = {
  title: "Kcals",
  description: "Simple calorie tracker",
  manifest: "/kcals/manifest.json",
  icons: {
    icon: [
      { url: "/kcals/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/kcals/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/kcals/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kcals",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#fefdfb",
};

export default function KcalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${GeistSans.className} kcals-app`}>
      {children}
    </div>
  );
}
