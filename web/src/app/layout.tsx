import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/ui/Toast";
import { ClientThemeProvider } from "@/lib/theme-provider";

// Self-hosted (not next/font/google) so production builds never depend
// on network access to fonts.gstatic.com — see apps/web/src/fonts.
const body = localFont({
  src: [
    { path: "../fonts/Inter-400.ttf", weight: "400", style: "normal" },
    { path: "../fonts/Inter-500.ttf", weight: "500", style: "normal" },
    { path: "../fonts/Inter-600.ttf", weight: "600", style: "normal" },
  ],
  variable: "--body-font",
});
const display = localFont({
  src: [
    { path: "../fonts/SpaceGrotesk-500.ttf", weight: "500", style: "normal" },
    { path: "../fonts/SpaceGrotesk-600.ttf", weight: "600", style: "normal" },
    { path: "../fonts/SpaceGrotesk-700.ttf", weight: "700", style: "normal" },
  ],
  variable: "--display-font",
});
const mono = localFont({
  src: [
    { path: "../fonts/IBMPlexMono-400.ttf", weight: "400", style: "normal" },
    { path: "../fonts/IBMPlexMono-500.ttf", weight: "500", style: "normal" },
    { path: "../fonts/IBMPlexMono-600.ttf", weight: "600", style: "normal" },
  ],
  variable: "--mono-font",
});

// Without this, mobile browsers render at desktop width and then
// auto-zoom on input focus (iOS zooms any input styled below 16px) —
// the exact "page zooms in until you pinch it back out" symptom.
// maximumScale/userScalable are intentionally omitted so pinch-zoom
// for accessibility still works; this only stops the *automatic*
// zoom-on-focus behavior by giving the browser an explicit width.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "X2Factor - Earn 2x Faster",
    template: "%s - X2Factor",
  },
  description:
    "Join thousands of users earning rewards through tasks, referrals, and exclusive opportunities.",
  keywords: ["earn money", "tasks", "referrals", "rewards", "side income"],
  authors: [{ name: "X2Factor Team" }],
  creator: "X2Factor",
  publisher: "X2Factor",
  robots: "index, follow",
  metadataBase: new URL("https://x2factor.io"),
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://x2factor.io",
    siteName: "X2Factor",
    title: "X2Factor - Earn 2x Faster",
    description:
      "Join thousands of users earning rewards through tasks, referrals, and exclusive opportunities.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "X2Factor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "X2Factor - Earn 2x Faster",
    description:
      "Join thousands of users earning rewards through tasks, referrals, and exclusive opportunities.",
    images: ["/og-image.png"],
    creator: "@x2factor",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "X2Factor",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f2848" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${body.variable} ${display.variable} ${mono.variable} font-body antialiased`}
      >
        <ClientThemeProvider>
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </ClientThemeProvider>
      </body>
    </html>
  );
}
