'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { CampaignData } from '@/lib/solana/campaign-data';
import { DonationReceiptWithPubkey } from '@/lib/types';
import { convertLamportsToSol } from '@/lib/solana/instructions';
import { useRefund } from '@/hooks/use-refund';

interface RefundInterfaceProps {
  campaign: CampaignData;
  userDonations: DonationReceiptWithPubkey[];
  onRefundSuccess?: (signature: string, amount: number) => void;
}

export const RefundInterface: React.FC<RefundInterfaceProps> = ({
  campaign,
  userDonations,
  onRefundSuccess
}) => {
  const { publicKey } = useWallet();
  const {
    refundAmount,
    isEligible,
    failureReason,
    isProcessing,
    error,
    disputePeriodEnds,
    disputePeriodSeconds,
    processRefund,
    checkEligibility
  } = useRefund(campaign, userDonations);

  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());

  useEffect(() => {
    if (publicKey) {
      checkEligibility();
    }
  }, [publicKey, campaign, userDonations, checkEligibility]);

  const handleRefund = async () => {
    if (!publicKey || !isEligible) return;

    try {
      const signature = await processRefund();
      if (signature && onRefundSuccess) {
        onRefundSuccess(signature, refundAmount);
      }
    } catch (err) {
      console.error('Refund failed:', err);
    }
  };

  const handleRefresh = () => {
    checkEligibility();
    setLastRefreshTime(new Date());
  };

  const getFailureReasonDisplay = () => {
    switch (failureReason) {
      case 'target_not_reached':
        return 'Campaign failed to reach its funding target';
      case 'deadline_passed':
        return 'Campaign deadline has passed without success';
      case 'dispute_resolved':
        return 'Campaign dispute was resolved in favor of refunds';
      default:
        return 'Campaign has failed';
    }
  };

  const getStatusIcon = () => {
    if (campaign.status === 'failed') {
      return <XCircle className="w-5 h-5 text-destructive" />;
    }
    if (campaign.status === 'successful') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
  };

  const getStatusBadge = () => {
    switch (campaign.status) {
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'successful':
        return <Badge variant="default" className="bg-green-500">Successful</Badge>;
      case 'ended':
        return <Badge variant="secondary">Ended</Badge>;
      default:
        return <Badge variant="outline">Active</Badge>;
    }
  };

  if (!publicKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Refund Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Please connect your wallet to check refund eligibility.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (userDonations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Refund Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              You have no donations to this campaign.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            Refund Interface
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isProcessing}
            >
              <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Campaign Status */}
        <div className="space-y-2">
          <h4 className="font-medium">Campaign Status</h4>
          <div className="text-sm text-muted-foreground">
            {campaign.status === 'failed' ? getFailureReasonDisplay() : 'Campaign is still active or successful'}
          </div>
        </div>

        {/* Refund Amount */}
        <div className="space-y-2">
          <h4 className="font-medium">Your Donations</h4>
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm">Total Donated:</span>
            <span className="font-semibold">{refundAmount.toFixed(4)} SOL</span>
          </div>
          {userDonations.some(d => d.account.refunded) && (
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <span className="text-sm text-green-700 dark:text-green-300">Already Refunded:</span>
              <span className="font-semibold text-green-700 dark:text-green-300">
                {userDonations
                  .filter(d => d.account.refunded)
                  .reduce((sum, d) => sum + convertLamportsToSol(d.account.lamports), 0)
                  .toFixed(4)} SOL
              </span>
            </div>
          )}
        </div>

        {/* Dispute Period Information */}
        {campaign.status === 'failed' && disputePeriodSeconds && (
          <div className="space-y-2">
            <h4 className="font-medium">Dispute Period Information</h4>
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Dispute Period Duration:</span>
                <span className="font-medium">
                  {disputePeriodSeconds >= 86400 
                    ? `${Math.floor(disputePeriodSeconds / 86400)} day${Math.floor(disputePeriodSeconds / 86400) !== 1 ? 's' : ''}`
                    : disputePeriodSeconds >= 3600
                    ? `${Math.floor(disputePeriodSeconds / 3600)} hour${Math.floor(disputePeriodSeconds / 3600) !== 1 ? 's' : ''}`
                    : `${Math.floor(disputePeriodSeconds / 60)} minute${Math.floor(disputePeriodSeconds / 60) !== 1 ? 's' : ''}`
                  }
                </span>
              </div>
              {disputePeriodEnds && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Dispute Period Ends:</span>
                  <span className="font-medium">{disputePeriodEnds.toLocaleDateString()} at {disputePeriodEnds.toLocaleTimeString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <span className={`font-medium ${
                  disputePeriodEnds && disputePeriodEnds > new Date() 
                    ? 'text-yellow-600' 
                    : 'text-green-600'
                }`}>
                  {disputePeriodEnds && disputePeriodEnds > new Date() 
                    ? 'Active (Refunds Blocked)' 
                    : 'Ended (Refunds Available)'
                  }
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Eligibility Status */}
        {campaign.status === 'failed' && (
          <Alert className={isEligible ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20'}>
            {isEligible ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
            )}
            <AlertDescription className={isEligible ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}>
              {isEligible 
                ? 'You are eligible for a refund. Click the button below to process your refund.'
                : disputePeriodEnds && disputePeriodEnds > new Date()
                ? `Dispute period is active until ${disputePeriodEnds.toLocaleDateString()}. Refunds will be available after this period ends.`
                : 'You are not currently eligible for a refund. This may be due to having no donations or all donations already being refunded.'
              }
            </AlertDescription>
          </Alert>
        )}

        {campaign.status !== 'failed' && (
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Refunds are only available for failed campaigns. This campaign is currently {campaign.status}.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Display 
        {error && (
          <Alert variant="destructive">
            <XCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
*/}
        {/* Refund Action */}
        <div className="pt-4 border-t">
          <Button
            onClick={handleRefund}
            disabled={!isEligible || isProcessing || refundAmount <= 0}
            className="w-full"
            variant={isEligible ? "default" : "secondary"}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing Refund...
              </>
            ) : isEligible ? (
              `Request Refund (${refundAmount.toFixed(4)} SOL)`
            ) : (
              'Refund Not Available'
            )}
          </Button>
        </div>

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground text-center">
          Last updated: {lastRefreshTime.toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};
