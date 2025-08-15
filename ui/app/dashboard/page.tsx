'use client';

import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { CreatorDashboard } from '@/components/creator/creator-dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet } from 'lucide-react';

export default function DashboardPage() {
  const { connected } = useWallet();

  if (!connected) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <Wallet className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
              <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
              <p className="text-muted-foreground mb-6">
                Connect your Solana wallet to view your dashboard and manage your campaigns.
              </p>
              <Button size="lg">
                Connect Wallet
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return <CreatorDashboard />;
}
