import type { Metadata } from 'next';
import './globals.css';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: 'SpendLens - AI Spend Audit',
  description:
    'Instantly audit your AI tool spend, uncover plan mismatches, and quantify savings in minutes.',
  openGraph: {
    title: 'SpendLens - AI Spend Audit',
    description:
      'Instantly audit your AI tool spend, uncover plan mismatches, and quantify savings in minutes.',
    url: appUrl,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpendLens - AI Spend Audit',
    description:
      'Instantly audit your AI tool spend, uncover plan mismatches, and quantify savings in minutes.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
