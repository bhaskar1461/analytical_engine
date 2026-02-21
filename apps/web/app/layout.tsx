import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Anylical Engine - Trust-Driven Stock Intelligence',
  description:
    'India-first educational stock intelligence for Gen-Z investors. Trust score, news sentiment, social hype detection, portfolio and SIP suggestions.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="container-shell py-5 sm:py-8">{children}</div>
      </body>
    </html>
  );
}
