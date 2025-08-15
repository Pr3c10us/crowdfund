import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SolanaWalletProvider } from "@/components/wallet/WalletProvider";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Solana Crowdfunding",
  description: "Crowdfunding platform on Solana (Devnet)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SolanaWalletProvider>
          <AppNavbar />
          <main className="mx-auto w-full max-w-6xl px-4 py-6">
            {children}
          </main>
          <Toaster richColors />
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
