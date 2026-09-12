import type { Metadata } from "next";
import { Inter, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/ui/Toast";
import { ClientThemeProvider } from "@/lib/theme-provider";

const body = Inter({ subsets: ["latin"], variable: "--body-font" });
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--display-font",
  weight: ["500", "600", "700"],
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--mono-font",
  weight: ["400", "500", "600"],
});

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
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${body.variable} ${display.variable} ${mono.variable} font-body bg-white dark:bg-gray-950 text-gray-900 dark:text-white antialiased`}
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
