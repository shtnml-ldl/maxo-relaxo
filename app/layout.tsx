import './globals.css';
import type { Metadata } from 'next';
import { Space_Grotesk, Work_Sans } from 'next/font/google';

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display'
});

const body = Work_Sans({
  subsets: ['latin'],
  variable: '--font-body'
});

export const metadata: Metadata = {
  title: 'Maxo Relaxo',
  description: 'Account pacing and optimization dashboard'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>
        {children}
      </body>
    </html>
  );
}
