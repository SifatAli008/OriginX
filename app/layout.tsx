import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "@/components/providers/Providers";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const themeInitializer = `
(function() {
  try {
    // Always set dark theme
    document.documentElement.classList.add('dark');
    // Remove any stored theme preference to prevent conflicts
    localStorage.removeItem('theme');
  } catch (err) {
    console.warn('Theme init failed', err);
  }
})();
`;

export const metadata: Metadata = {
  title: "OriginX — Anti‑Counterfeit Platform",
  description: "OriginX helps manufacturers and warehouses stop counterfeits with encrypted QR, movement tracking, and AI verification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitializer }} />
      </head>
      <body suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
