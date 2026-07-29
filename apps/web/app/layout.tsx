import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { ThemeProvider } from "@/app/components/ThemeProvider";
import FloatingActions from "@/app/components/FloatingActions";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dhyana Stays — Curated Hospitality Experiences",
  description:
    "Discover handpicked, architect-designed stays across India. Farm stays, tiny houses, wellness retreats, and luxury villas — all curated for unforgettable experiences.",
  keywords: [
    "curated stays",
    "farm stays",
    "tiny houses",
    "luxury villas",
    "wellness retreats",
    "hospitality",
    "India travel",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <FloatingActions />
        </ThemeProvider>
      </body>
    </html>
  );
}
