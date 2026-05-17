import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '3D Badge Studio',
  description: 'Design premium metallic badges from uploaded SVG icons.',
};

export default function BadgesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
