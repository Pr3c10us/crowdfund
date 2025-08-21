'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Users, Target, Clock, TrendingUp, Heart, RefreshCw } from 'lucide-react';
import { CampaignData } from '@/lib/solana/campaign-data';
import { convertLamportsToSol } from '@/lib/solana/instructions';
import { DonateDialog } from './donate-dialog';
import { DonationReceipt } from './donation-receipt';
import { useDonations, DonationData } from '@/hooks/use-donations';

interface CampaignCardProps {
  campaign: CampaignData;
  showCreator?: boolean;
  compact?: boolean;
  onDataRefresh?: () => void;
}

export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  showCreator = true,
  compact = false,
  onDataRefresh
}) => {
  const [showDonateDialog, setShowDonateDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [lastDonation, setLastDonation] = useState<DonationData | null>(null);
  const { handleDonationSuccess } = useDonations();

  const currentAmountSol = convertLamportsToSol(campaign.totalDonated);
  const targetAmountSol = convertLamportsToSol(campaign.targetLamports);

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'Ended';

    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));

    if (days > 0) {
      return `${days}d ${hours}h left`;
    } else if (hours > 0) {
      return `${hours}h left`;
    } else {
      return 'Less than 1h left';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'successful': return 'default';
      case 'failed': return 'destructive';
      case 'ended': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'successful': return 'Successful';
      case 'failed': return 'Failed';
      case 'ended': return 'Ended';
      default: return 'Unknown';
    }
  };

  const onDonationSuccess = (signature: string, amount: number) => {
    const donation: DonationData = {
      signature,
      amount,
      timestamp: new Date(),
      campaign,
      donor: 'wallet-address' // This will be populated by the dialog
    };
    setLastDonation(donation);
    setShowReceiptDialog(true);
    handleDonationSuccess(signature, amount, campaign);
    
    // Refresh campaign data after successful donation
    if (onDataRefresh) {
      setTimeout(() => {
        onDataRefresh();
      }, 2000); // 2-second delay to allow blockchain state to update
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group">
      {/* Campaign Image */}
      <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10">
        {campaign.imageUrl ? (
          <Image
            src={campaign.imageUrl}
            alt={campaign.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
            <Target className="w-12 h-12 opacity-40" />
          </div>
        )}

        {/* Status Badge Overlay */}
        <div className="absolute top-3 right-3">
          <Badge variant={getStatusBadgeVariant(campaign.status)} className="shadow-sm">
            {getStatusText(campaign.status)}
          </Badge>
        </div>

        {/* Progress Badge Overlay */}
        {campaign.status === 'active' && (
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="shadow-sm bg-white/90 text-gray-900">
              {campaign.progress.toFixed(0)}%
            </Badge>
          </div>
        )}
      </div>

      <CardHeader className={`space-y-3 ${compact ? 'pb-3' : 'pb-4'}`}>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="capitalize">
            {campaign.category}
          </Badge>
          {/* {campaign.status === 'active' && (
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 mr-1" />
              <span>{campaign.donorCount} backers</span>
            </div>
          )} */}
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {campaign.title}
          </h3>
          {!compact && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {campaign.shortDescription}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Progress</span>
            <span className="font-semibold text-primary">{campaign.progress.toFixed(1)}%</span>
          </div>
          <Progress value={campaign.progress} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-foreground">
                {currentAmountSol.toFixed(2)} SOL
              </div>
              <div className="text-xs text-muted-foreground">
                of {targetAmountSol.toFixed(2)} SOL
              </div>
            </div>
          </div>

          {campaign.status === 'active' && (
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-foreground">
                  {formatTimeRemaining(campaign.timeRemaining)}
                </div>
                <div className="text-xs text-muted-foreground">
                  remaining
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Creator Info */}
        {showCreator && !compact && (
          <div className="flex items-center space-x-2 pt-2 border-t">
            <Avatar className="w-6 h-6">
              <AvatarImage src={`https://api.dicebear.com/7.x/identicon/svg?seed=${campaign.creator.toBase58()}`} />
              <AvatarFallback className="text-xs">
                {campaign.creator.toBase58().slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted-foreground">Created by</div>
              <div className="text-sm font-medium truncate">
                {campaign.creator.toBase58().slice(0, 8)}...{campaign.creator.toBase58().slice(-4)}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 space-y-2">
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button asChild variant="outline" className="group-hover:bg-primary/5 transition-colors w-full">
            <Link href={`/${campaign.id}`}>
              View Details
            </Link>
          </Button>
          {campaign.status === 'failed' ? (
            <Button asChild variant="secondary" className="w-full">
              <Link href={`/${campaign.id}?tab=refunds`}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Check Refund
              </Link>
            </Button>
          ) : (
            <Button
              onClick={() => setShowDonateDialog(true)}
              className="group-hover:bg-primary/90 transition-colors"
              disabled={campaign.status !== 'active'}
            >
              <Heart className="w-4 h-4 mr-1" />
              Donate
            </Button>
          )}
        </div>
      </CardFooter>

      {/* Donation Dialog */}
      <DonateDialog
        open={showDonateDialog}
        onOpenChange={setShowDonateDialog}
        campaign={campaign}
        onDonationSuccess={onDonationSuccess}
      />

      {/* Donation Receipt Dialog */}
      {lastDonation && (
        <DonationReceipt
          open={showReceiptDialog}
          onOpenChange={setShowReceiptDialog}
          donation={lastDonation}
        />
      )}
    </Card>
  );
};

