import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export const metadata: Metadata = {
  title: 'Dhyana Stays — Curated Wellness Retreats',
  description:
    'Discover and book handpicked wellness retreats, spiritual sanctuaries, and nature escapes across India.',
};

const COPYRIGHT_YEAR = 2026;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface flex flex-col">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-gray-100 bg-white mt-16">
            <div className="container-page py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏡</span>
                <span className="font-semibold text-brand-700">Dhyana Stays</span>
              </div>
              <p className="text-gray-400 text-sm">
                © {COPYRIGHT_YEAR} Dhyana Stays. Curated wellness retreats across India.
              </p>
              <div className="flex gap-4 text-sm text-gray-400">
                <span>INR · India</span>
                <span>English</span>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
