import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/ui/Toast";

const display = Space_Grotesk({
  subsets: ["latin"],
  // Named to avoid colliding with Tailwind v4's own --font-display theme
  // variable (defined in globals.css @theme inline, which references
  // this one) — see the note at the top of globals.css.
  variable: "--display-font",
  weight: ["500", "600", "700"],
});
const body = Inter({ subsets: ["latin"], variable: "--body-font" });
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--mono-font",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "2xFactor",
  description: "Invest, complete tasks, earn — the 2xFactor ledger.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${display.variable} ${body.variable} ${mono.variable} font-body bg-base text-ink antialiased`}>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
