import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from '@/components/wallet/wallet-provider';
import { Header } from '@/components/layout/header';
import { Toaster } from '@/components/ui/sonner';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "solfundme - Decentralized Crowdfunding on Solana",
  description: "Launch and support crowdfunding campaigns on the Solana blockchain. Transparent, secure, and community-driven fundraising.",
  keywords: ["solana", "crowdfunding", "blockchain", "fundraising", "crypto", "web3"],
  authors: [{ name: "solfundme Team" }],
  openGraph: {
    title: "solfundme - Decentralized Crowdfunding on Solana",
    description: "Launch and support crowdfunding campaigns on the Solana blockchain.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "solfundme - Decentralized Crowdfunding on Solana",
    description: "Launch and support crowdfunding campaigns on the Solana blockchain.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <WalletContextProvider>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Toaster />
        </WalletContextProvider>
      </body>
    </html>
  );
}
