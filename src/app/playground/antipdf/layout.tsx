import { GeistSans } from 'geist/font/sans';

export default function AntiPDFLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={GeistSans.className}>{children}</div>;
}
