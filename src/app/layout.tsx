import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { Analytics } from '@/components/analytics';
import './globals.css';

export const metadata: Metadata = {
  title: 'Poker — AI-Powered Texas Hold\'em | Jeremy Sarda',
  description: 'Play Texas Hold\'em against AI opponents powered by different language models. A portfolio demo by Jeremy Sarda.',
  metadataBase: new URL('https://poker.jeremysarda.com'),
  openGraph: {
    title: 'AI Poker — Texas Hold\'em',
    description: 'Play against AI opponents with distinct personalities. Built by Jeremy Sarda.',
    url: 'https://poker.jeremysarda.com',
    siteName: 'AI Poker',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Poker — Texas Hold\'em',
    description: 'Play against AI opponents with distinct personalities.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#1a1a1a]">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
