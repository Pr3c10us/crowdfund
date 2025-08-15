'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/wallet/wallet-button';
import { NetworkSwitcher } from '@/components/wallet/network-switcher';
import { Plus, User, Settings } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">CF</span>
            </div>
            <span className="font-bold text-xl">CrowdFund</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/dashboard" className="flex items-center space-x-1 text-sm font-medium transition-colors hover:text-primary">
              <User className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
            <Link href="/admin" className="flex items-center space-x-1 text-sm font-medium transition-colors hover:text-primary">
              <Settings className="w-4 h-4" />
              <span>Admin</span>
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <NetworkSwitcher />
            <Button asChild size="sm" className="hidden sm:flex">
              <Link href="/create">
                <Plus className="w-4 h-4 mr-1" />
                Create Campaign
              </Link>
            </Button>
            <WalletButton />
          </div>
        </div>
      </div>
    </nav>
  );
};
