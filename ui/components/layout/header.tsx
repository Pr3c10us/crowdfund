'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { WalletButton } from '@/components/wallet/wallet-button';
import { NetworkSwitcher } from '@/components/wallet/network-switcher';
import { Menu, Coins, Plus, UserCog, BarChart3, Home, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigationItems = [
  // {
  //   title: 'Home',
  //   href: '/',
  //   icon: Home,
  // },
  {
    title: 'Campaigns',
    href: '/',
    icon: Search,
    description: 'Browse all active campaigns',
  },
  {
    title: 'Create',
    href: '/create',
    icon: Plus,
    description: 'Start your own campaign',
  },

  {
    title: 'Admin',
    href: '/admin',
    icon: UserCog,
    description: 'Admin Dashboard',
  },
  // {
  //   title: 'Dashboard',
  //   href: '/dashboard',
  //   icon: BarChart3,
  //   description: 'Manage your campaigns and donations',
  // },
];


export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActiveLink = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Coins className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold">solfundme</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="flex-1 flex ml-4">
          <div className="hidden lg:flex items-center space-x-6">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:bg-accent hover:text-accent-foreground",
                  isActiveLink(item.href) && "bg-accent text-accent-foreground font-semibold"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Wallet and Network Controls */}
        <div className="flex items-center space-x-2">
          <div className="hidden sm:block">
            <NetworkSwitcher />
          </div>
          <WalletButton />

          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden hover:bg-accent transition-colors"
                aria-label="Open mobile menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="flex items-center space-x-2">
                  <Coins className="h-5 w-5" />
                  <span>solfundme</span>
                </SheetTitle>
                <SheetDescription>
                  Decentralized crowdfunding on Solana
                </SheetDescription>
              </SheetHeader>

              <nav className="mt-6 space-y-2">
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 hover:bg-accent hover:text-accent-foreground active:scale-95",
                      isActiveLink(item.href) && "bg-accent text-accent-foreground font-medium border-l-2 border-primary"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">{item.title}</span>
                      {item.description && (
                        <span className="text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </nav>

              <div className="mt-6 space-y-4 border-t pt-4">
                <div className="sm:hidden">
                  <NetworkSwitcher />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
