import type { Metadata } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { Providers } from '@/components/providers';
import { Analytics } from '@/components/analytics';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Poker — AI-Powered Texas Hold\'em | Jeremy Sarda',
  description: 'Texas Hold\'em Poker — Create tables, invite players, and play with AI opponents.',
  metadataBase: new URL('https://poker.jeremysarda.com'),
  openGraph: {
    title: 'AI Poker — Texas Hold\'em',
    description: 'Create tables, invite players, and play with AI opponents powered by language models.',
    url: 'https://poker.jeremysarda.com',
    siteName: 'AI Poker',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Poker — Texas Hold\'em',
    description: 'Create tables, invite players, and play with AI opponents.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`min-h-screen ${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
