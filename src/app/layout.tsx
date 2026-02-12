import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Poker — AI-Powered Texas Hold\'em',
  description: 'Play Texas Hold\'em against AI opponents powered by different language models.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
