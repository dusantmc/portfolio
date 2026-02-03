import type { ReactNode } from "react";
import "./globals.css";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";

export const metadata = {
  title: "Taste AI Playground",
  description: "Interactive Taste artwork playground by Dusan Tomic",
};

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${instrumentSerif.variable}`}
    >
      <body className={instrumentSans.className}>{children}</body>
    </html>
  );
}


