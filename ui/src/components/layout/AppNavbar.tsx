"use client";

import Link from "next/link";
import { WalletButton } from "@/components/wallet/WalletButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppNavbar() {
  return (
    <header className={cn("w-full border-b bg-background/80 backdrop-blur")}> 
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold">Crowdfunding</Link>
          <nav className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <Link href="/create" className="hover:text-foreground">Create</Link>
            <Link href="/explore" className="hover:text-foreground">Explore</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/create">
            <Button size="sm">New Campaign</Button>
          </Link>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
