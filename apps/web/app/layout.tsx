import type { Metadata } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import Navbar from '../components/Navbar';

export const metadata: Metadata = {
  title: {
    default: 'Dhyana Stays — Curated Wellness Retreats',
    template: '%s | Dhyana Stays',
  },
  description:
    'Discover and book handpicked wellness retreats, spiritual sanctuaries, and nature escapes across India.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dhyanastays.in'),
  openGraph: {
    type: 'website',
    siteName: 'Dhyana Stays',
    title: 'Dhyana Stays — Curated Wellness Retreats',
    description:
      'Discover and book handpicked wellness retreats, spiritual sanctuaries, and nature escapes across India.',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dhyana Stays — Curated Wellness Retreats',
    description: 'Discover and book handpicked wellness retreats across India.',
  },
  icons: { icon: '/favicon.ico' },
  robots: { index: true, follow: true },
};

/** Injected before React hydrates — prevents flash of wrong theme */
const FOUC_SCRIPT = `(function(){try{var t=localStorage.getItem('ds-theme');var d=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t===null&&d))document.documentElement.classList.add('dark');}catch(e){}})();`;

const COPYRIGHT_YEAR = 2026;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* FOUC prevention — must be first script */}
        <script dangerouslySetInnerHTML={{ __html: FOUC_SCRIPT }} />

        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface flex flex-col">
        <ThemeProvider>
          <AuthProvider>
            <Navbar />
            <main className="flex-1 animate-fade-in">{children}</main>

            <footer className="border-t border-gray-200 bg-white mt-16">
              <div className="container-page py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🏡</span>
                  <span className="font-semibold text-brand-700 tracking-tight"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                    Dhyana Stays
                  </span>
                </div>
                <p className="text-gray-500 text-sm">
                  © {COPYRIGHT_YEAR} Dhyana Stays. Curated wellness retreats across India.
                </p>
                <div className="flex gap-4 text-sm text-gray-400">
                  <span>INR · India</span>
                  <span>English</span>
                </div>
              </div>
            </footer>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
