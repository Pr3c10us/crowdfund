'use client';

import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ExternalLink, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { CampaignData } from '@/lib/solana/campaign-data';
import { DonationReceiptWithPubkey } from '@/lib/types';
import { convertLamportsToSol } from '@/lib/solana/instructions';

interface RefundTransaction {
  signature: string;
  amount: number;
  timestamp: Date;
  status: 'confirmed' | 'pending' | 'failed';
  blockTime?: number;
}

interface RefundStatusProps {
  campaign: CampaignData;
  userDonations: DonationReceiptWithPubkey[];
  className?: string;
}

export const RefundStatus: React.FC<RefundStatusProps> = ({
  campaign,
  userDonations,
  className
}) => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate totals
  const totalDonated = userDonations.reduce((sum, donation) =>
    sum + convertLamportsToSol(donation.account.lamports), 0
  );

  const totalRefunded = userDonations
    .filter(donation => donation.account.refunded)
    .reduce((sum, donation) => sum + convertLamportsToSol(donation.account.lamports), 0);

  const availableForRefund = totalDonated - totalRefunded;


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default" className="bg-green-500">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const openTransaction = (signature: string) => {
    window.open(`https://explorer.solana.com/tx/${signature}?cluster=devnet`, '_blank');
  };

  if (!publicKey) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Refund History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Please connect your wallet to view refund history.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Refund History
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Total Donated</div>
            <div className="text-lg font-semibold">{totalDonated.toFixed(4)} SOL</div>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div className="text-sm text-green-700 dark:text-green-300">Total Refunded</div>
            <div className="text-lg font-semibold text-green-700 dark:text-green-300">
              {totalRefunded.toFixed(4)} SOL
            </div>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="text-sm text-blue-700 dark:text-blue-300">Available for Refund</div>
            <div className="text-lg font-semibold text-blue-700 dark:text-blue-300">
              {availableForRefund.toFixed(4)} SOL
            </div>
          </div>
        </div>

        {/* Campaign Information */}
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium mb-2">Campaign Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Campaign:</span>
              <div className="font-medium">{campaign.title}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={campaign.status === 'failed' ? 'destructive' : 'default'}>
                  {campaign.status}
                </Badge>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Target:</span>
              <div className="font-medium">{convertLamportsToSol(campaign.targetLamports).toFixed(2)} SOL</div>
            </div>
            <div>
              <span className="text-muted-foreground">Progress:</span>
              <div className="font-medium">{campaign.progress.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Donation Receipts */}
        {userDonations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Your Donation</h4>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Receipt ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userDonations.map((donation) => (
                    <TableRow key={donation.publicKey.toString()}>
                      <TableCell className="font-medium">
                        {convertLamportsToSol(donation.account.lamports).toFixed(4)} SOL
                      </TableCell>
                      <TableCell>
                        {donation.account.refunded ? (
                          <Badge variant="default" className="bg-green-500">Refunded</Badge>
                        ) : (
                          <Badge variant="secondary">Not Refunded</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {donation.publicKey.toString().slice(0, 8)}...{donation.publicKey.toString().slice(-4)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
