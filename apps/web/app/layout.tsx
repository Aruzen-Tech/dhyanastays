import type { Metadata } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { FeatureProvider } from '../context/FeatureContext';
import Navbar from '../components/navbar/Navbar';
import Footer from '../components/footer/Footer';
import SosFab from '../components/SosFab';
import AssistantLauncher from '../components/assistant/AssistantLauncher';

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
            <FeatureProvider>
            <Navbar />
            <main className="flex-1 animate-fade-in">{children}</main>

            <Footer />
            <SosFab />
            <AssistantLauncher />
            </FeatureProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
