import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    default: 'Jackaroo Online — a private table for friends',
    template: '%s · Jackaroo Online',
  },
  description:
    'Gather 4, 6 or 8 friends for a real-time game of Jackaroo. Private rooms, beautiful boards, teams and marbles.',
  applicationName: 'Jackaroo Online',
  authors: [{ name: 'Jackaroo Online' }],
  keywords: ['Jackaroo', 'board game', 'online multiplayer', 'private rooms', 'marbles'],
  openGraph: {
    title: 'Jackaroo Online',
    description: 'A private table for friends. Four marbles. One lap. No mercy.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jackaroo Online',
    description: 'A private table for friends. Four marbles. One lap. No mercy.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#071411' },
    { media: '(prefers-color-scheme: light)', color: '#f6efe4' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
