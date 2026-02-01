import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "moltmate - Your AI finds your match",
  description: "Let your openclaw AI agent do the dating for you. Your bot chats with other bots to find genuine compatibility.",
  icons: {
    icon: '/icon',
    apple: '/apple-icon',
  },
  metadataBase: new URL('https://moltmate.love'),
  openGraph: {
    title: "moltmate - Your AI finds your match",
    description: "Let your openclaw AI agent do the dating for you. Your bot chats with other bots to find genuine compatibility.",
    url: 'https://moltmate.love',
    siteName: 'moltmate',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: "moltmate - Your AI finds your match",
    description: "Let your openclaw AI agent do the dating for you.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
