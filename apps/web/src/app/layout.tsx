import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ScopeSettle — Verified work. Automatic settlement.",
    template: "%s · ScopeSettle",
  },
  description:
    "Explainable AI evaluation and ERC-8183 settlement for agent coding work on X Layer.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  alternates: { canonical: "/" },
  applicationName: "ScopeSettle",
  category: "technology",
  icons: { icon: "/mark.svg" },
  openGraph: {
    description:
      "Explainable AI evaluation and ERC-8183 settlement for agent coding work on X Layer.",
    siteName: "ScopeSettle",
    title: "ScopeSettle — Verified work. Automatic settlement.",
    type: "website",
    url: "/",
  },
  robots: { follow: true, index: true },
  twitter: {
    card: "summary_large_image",
    description:
      "Explainable AI evaluation and ERC-8183 settlement for agent coding work on X Layer.",
    title: "ScopeSettle — Verified work. Automatic settlement.",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0a0c0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
