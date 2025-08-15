'use client';

import React from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  Download,
  Share2,
  ExternalLink,
  Copy,
  Heart,
  Calendar,
  Wallet,
  Target
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getExplorerUrl,
  formatWalletAddress,
  convertSolToUsd
} from '@/lib/solana/donation-utils';
import { CampaignData } from '@/lib/solana/campaign-data';

interface DonationReceiptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  donation: {
    signature: string;
    amount: number; // in SOL
    timestamp: Date;
    campaign: CampaignData;
    donor: string; // wallet address
  };
}

export const DonationReceipt: React.FC<DonationReceiptProps> = ({
  open,
  onOpenChange,
  donation
}) => {
  const usdAmount = convertSolToUsd(donation.amount);
  const receiptId = `${donation.signature.slice(0, 8)}...${donation.signature.slice(-4)}`;

  const handleCopySignature = async () => {
    try {
      await navigator.clipboard.writeText(donation.signature);
      toast.success('Transaction signature copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy signature');
    }
  };

  const handleViewTransaction = () => {
    window.open(getExplorerUrl(donation.signature), '_blank');
  };

  const handleShare = async () => {
    const shareData = {
      title: `Donation Receipt - ${donation.campaign.title}`,
      text: `I just donated ${donation.amount} SOL to support "${donation.campaign.title}"! 🚀`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(
          `${shareData.text}\n\nTransaction: ${getExplorerUrl(donation.signature)}`
        );
        toast.success('Donation details copied to clipboard');
      }
    } catch (error) {
      toast.error('Failed to share donation');
    }
  };

  const handleDownloadReceipt = () => {
    const receiptData = {
      receiptId,
      donationAmount: `${donation.amount} SOL`,
      usdValue: `$${usdAmount.toFixed(2)} USD`,
      campaign: donation.campaign.title,
      campaignCreator: formatWalletAddress(donation.campaign.creator.toBase58()),
      donor: formatWalletAddress(donation.donor),
      timestamp: format(donation.timestamp, 'PPpp'),
      transactionSignature: donation.signature,
      explorerUrl: getExplorerUrl(donation.signature)
    };

    const receiptText = `
DONATION RECEIPT
================

Receipt ID: ${receiptData.receiptId}
Date: ${receiptData.timestamp}

DONATION DETAILS
----------------
Amount: ${receiptData.donationAmount}
USD Value: ${receiptData.usdValue}
Campaign: ${receiptData.campaign}
Creator: ${receiptData.campaignCreator}
Donor: ${receiptData.donor}

TRANSACTION
-----------
Signature: ${receiptData.transactionSignature}
Explorer: ${receiptData.explorerUrl}

Thank you for your contribution! 🙏
    `.trim();

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `donation-receipt-${receiptId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Receipt downloaded successfully');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[calc(100vh-10rem)] overflow-auto">
        <DialogHeader className="text-center flex flex-col items-center">
          <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <DialogTitle className="text-xl">Donation Successful!</DialogTitle>
          <DialogDescription>
            Thank you for supporting {donation.campaign.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Receipt Header */}
          <div className="text-center space-y-2">
            <Badge variant="secondary" className="text-xs">
              Receipt #{receiptId}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {format(donation.timestamp, 'PPpp')}
            </p>
          </div>

          {/* Donation Amount */}
          <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-lg border">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Heart className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-muted-foreground">Donation Amount</span>
            </div>
            <div className="text-3xl font-bold text-green-600 mb-1">
              {donation.amount} SOL
            </div>
            <div className="text-sm text-muted-foreground">
              ≈ ${usdAmount.toFixed(2)} USD
            </div>
          </div>

          {/* Transaction Details */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Transaction Details</h4>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Campaign</span>
                </div>
                <span className="text-sm font-medium truncate max-w-[200px]">
                  {donation.campaign.title}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-2">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Creator</span>
                </div>
                <span className="text-sm font-mono">
                  {formatWalletAddress(donation.campaign.creator.toBase58())}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-2">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Your Wallet</span>
                </div>
                <span className="text-sm font-mono">
                  {formatWalletAddress(donation.donor)}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Date</span>
                </div>
                <span className="text-sm">
                  {format(donation.timestamp, 'MMM dd, yyyy')}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Transaction Signature */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Transaction Signature</h4>
            <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
              <code className="text-xs font-mono flex-1 truncate">
                {donation.signature}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopySignature}
                className="flex-shrink-0"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleViewTransaction}
              className="flex items-center space-x-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View on Explorer</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadReceipt}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Receipt</span>
            </Button>
          </div>

          <Button
            onClick={handleShare}
            className="w-full flex items-center space-x-2"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Your Support</span>
          </Button>

          {/* Thank You Message */}
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Your contribution helps make this project a reality. Thank you for being part of the journey! 🚀
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
