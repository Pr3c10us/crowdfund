'use client';

import React, { useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  Clock,
  Play,
  Circle,
  Loader2,
  AlertTriangle,
  Calendar,
  DollarSign,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Milestone } from '@/lib/types';
import { CampaignData } from '@/lib/solana/campaign-data';
import {
  getMilestoneStatus,
  validateMilestoneRelease,
  createMilestoneReleaseTransaction,
  formatTimeRemaining,
  getTimeUntilRelease,
  MilestoneStatus,
  getEffectiveMilestoneAmount
} from '@/lib/solana/milestone-utils';
import {
  refreshMilestonesAfterRelease,
  createMilestoneNotifications,
  formatMilestoneChanges
} from '@/lib/solana/milestone-refresh';
import { convertLamportsToSol, getExplorerUrl } from '@/lib/solana/donation-utils';

interface MilestoneCardProps {
  milestone: Milestone;
  milestoneIndex: number;
  campaign: CampaignData;
  onReleaseSuccess?: (signature: string, milestoneIndex: number) => void;
  onMilestoneRefresh?: (refreshResult: any) => void;
  isCreator?: boolean;
  disputeWindowSeconds: number;
}

interface ReleaseState {
  status: 'idle' | 'preparing' | 'signing' | 'confirming' | 'success' | 'error';
  signature?: string;
  error?: string;
}

export const MilestoneCard: React.FC<MilestoneCardProps> = ({
  milestone,
  milestoneIndex,
  campaign,
  onReleaseSuccess,
  onMilestoneRefresh,
  isCreator = false,
  disputeWindowSeconds
}) => {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [releaseState, setReleaseState] = useState<ReleaseState>({ status: 'idle' });

  const currentTimestamp = Math.floor(Date.now() / 1000);
  const status = getMilestoneStatus(
    milestone,
    milestoneIndex,
    campaign.totalDonated,
    campaign.targetLamports,
    campaign.lastReleaseTs,
    currentTimestamp,
    disputeWindowSeconds,
    campaign.startTs,
    campaign.milestones
  );

  const validation = publicKey ? validateMilestoneRelease(
    milestone,
    milestoneIndex,
    campaign.milestones,
    campaign.lastReleaseTs,
    currentTimestamp,
    disputeWindowSeconds,
    campaign.startTs,
    (campaign as any).locked || false,
    campaign.totalDonated,
    campaign.targetLamports
  ) : { isValid: false, error: 'Wallet not connected' };

  const timeUntilRelease = getTimeUntilRelease(
    milestoneIndex,
    currentTimestamp,
    disputeWindowSeconds,
    campaign.startTs,
    campaign.lastReleaseTs,
    campaign.milestones
  );

  // Use effective amount for display (last milestone shows remaining donated amount)
  const effectiveAmount = getEffectiveMilestoneAmount(
    milestone,
    milestoneIndex,
    campaign.milestones,
    campaign.totalDonated
  );
  const milestoneAmountSol = convertLamportsToSol(effectiveAmount);
  const isLastMilestone = milestone.isLast;

  // Debug logging for last milestone
  useEffect(() => {
    if (isLastMilestone) {
      console.log('Last milestone debug:', {
        milestoneIndex,
        originalAmount: convertLamportsToSol(milestone.amount),
        effectiveAmount: milestoneAmountSol,
        totalDonated: convertLamportsToSol(campaign.totalDonated),
        totalMilestones: campaign.milestones.length
      });
    }
  }, [isLastMilestone, milestoneIndex, milestoneAmountSol, milestone.amount, campaign.totalDonated]);

  const getStatusIcon = (status: MilestoneStatus) => {
    switch (status) {
      case 'released':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'available':
        return <Play className="w-5 h-5 text-blue-600" />;
      case 'disputed':
        return <Clock className="w-5 h-5 text-orange-600" />;
      case 'pending':
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: MilestoneStatus) => {
    switch (status) {
      case 'released':
        return 'default';
      case 'available':
        return 'default';
      case 'disputed':
        return 'secondary';
      case 'pending':
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: MilestoneStatus) => {
    switch (status) {
      case 'released':
        return 'Released';
      case 'available':
        return 'Available';
      case 'disputed':
        return 'Dispute Window';
      case 'pending':
      default:
        return 'Pending';
    }
  };

  const handleRelease = async () => {
    if (!publicKey || !signTransaction || !validation.isValid) return;

    setReleaseState({ status: 'preparing' });

    try {
      // Create wallet interface for Anchor
      const wallet = {
        publicKey,
        signTransaction,
        signAllTransactions: async (txs: any[]) => {
          return Promise.all(txs.map(tx => signTransaction(tx)));
        }
      };

      setReleaseState({ status: 'signing' });

      const campaignPubkey = new PublicKey(campaign.id);
      const transaction = await createMilestoneReleaseTransaction(
        connection,
        publicKey,
        campaignPubkey,
        milestoneIndex,
        wallet as any
      );

      // Get recent blockhash and set fee payer
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Sign transaction
      const signedTx = await signTransaction(transaction);

      setReleaseState({ status: 'confirming' });

      // Send and confirm transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize());

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      setReleaseState({
        status: 'success',
        signature
      });

      toast.success('Milestone released successfully!', {
        description: `Released ${milestoneAmountSol.toFixed(2)} SOL from milestone ${milestoneIndex + 1}`,
        action: {
          label: 'View Transaction',
          onClick: () => window.open(getExplorerUrl(signature), '_blank')
        }
      });

      // Trigger milestone refresh after successful release
      try {
        const refreshResult = await refreshMilestonesAfterRelease(
          campaign,
          milestoneIndex,
          { disputeWindowSeconds }
        );

        // Log milestone changes
        console.log('Milestone refresh result:', {
          campaignId: refreshResult.campaignId,
          changes: formatMilestoneChanges(refreshResult),
          newlyAvailable: refreshResult.newlyAvailable,
          nextAvailable: refreshResult.nextAvailableMilestone
        });

        // Create and show notifications for milestone status changes
        const notifications = createMilestoneNotifications(refreshResult);
        notifications.forEach(notification => {
          switch (notification.type) {
            case 'success':
              toast.success(notification.message, {
                description: notification.description
              });
              break;
            case 'info':
              toast.info(notification.message, {
                description: notification.description
              });
              break;
            case 'warning':
              toast.warning(notification.message, {
                description: notification.description
              });
              break;
          }
        });

        // Notify parent component about the refresh
        onMilestoneRefresh?.(refreshResult);

      } catch (refreshError) {
        console.error('Failed to refresh milestones:', refreshError);
        // Don't show error toast for refresh failure as the main transaction succeeded
      }

      onReleaseSuccess?.(signature, milestoneIndex);

      // Close dialog after success
      setTimeout(() => {
        setShowReleaseDialog(false);
        setReleaseState({ status: 'idle' });
      }, 2000);

    } catch (error: any) {
      console.error('Milestone release failed:', error);

      setReleaseState({
        status: 'error',
        error: error.message || 'Transaction failed'
      });

      toast.error('Milestone release failed', {
        description: error.message || 'Please try again'
      });
    }
  };

  const getActionButton = () => {
    if (!isCreator) return null;

    if (status === 'released') {
      return (
        <Button variant="outline" disabled className="w-full">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Released
        </Button>
      );
    }

    if (status === 'available' && validation.isValid) {
      return (
        <Button
          onClick={() => setShowReleaseDialog(true)}
          className="w-full"
        >
          <Play className="w-4 h-4 mr-2" />
          Release Funds
        </Button>
      );
    }

    const fundingPercentage = campaign.totalDonated.mul(new BN(100)).div(campaign.targetLamports).toNumber();
    const hasReached100Percent = fundingPercentage >= 100;
    
    return (
      <Button variant="outline" disabled className="w-full">
        {status === 'pending' && !hasReached100Percent && `100% Funding Required (${fundingPercentage.toFixed(1)}%)`}
        {status === 'pending' && hasReached100Percent && 'Previous Milestones Required'}
        {status === 'disputed' && 'Dispute Window Open'}
      </Button>
    );
  };

  const isProcessing = ['preparing', 'signing', 'confirming'].includes(releaseState.status);
  const isSuccess = releaseState.status === 'success';

  useEffect(() => {
    console.log({ disputeWindowSeconds });
  }, [disputeWindowSeconds]);

  return (
    <>
      <Card className={`transition-all duration-200 ${status === 'available' ? 'ring-2 ring-blue-200 shadow-md' : ''
        }`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center space-x-2">
              {getStatusIcon(status)}
              <span>Milestone {milestoneIndex + 1}</span>
            </CardTitle>
            <Badge variant={getStatusBadgeVariant(status)}>
              {getStatusText(status)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Milestone Description */}
          <div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {milestone.description ||
                (isLastMilestone
                  ? `Final milestone - Release remaining donated funds (${milestoneAmountSol.toFixed(2)} SOL)`
                  : `Milestone ${milestoneIndex + 1} - Release funds when campaign reaches target`
                )
              }
            </p>
          </div>

          {/* Amount and Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Release Amount</span>
              </div>
              <span className="text-lg font-bold text-primary">
                {milestoneAmountSol.toFixed(2)} SOL
              </span>
            </div>

            {/* Progress indicator for milestone threshold */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Campaign Progress</span>
                <span>{campaign.progress.toFixed(1)}%</span>
              </div>
              <Progress value={campaign.progress} className="h-2" />
            </div>
          </div>

          {/* Release Information */}
          {milestone.released && (
            <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2 text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-medium">Released</span>
              </div>
              <div className="text-xs text-green-600 dark:text-green-500 mt-1">
                {format(new Date(milestone.releaseTs.toNumber() * 1000), 'PPp')}
              </div>
            </div>
          )}

          {/* Dispute Window Information */}
          {status === 'disputed' && (
            <div className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200">
              <div className="flex items-center space-x-2 text-sm text-orange-700 dark:text-orange-400">
                <Clock className="w-4 h-4" />
                <span className="font-medium">Dispute Window Active</span>
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-500 mt-1">
                {formatTimeRemaining(timeUntilRelease)}
              </div>
            </div>
          )}

          {/* Validation Error */}
          {!validation.isValid && isCreator && (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="text-xs">
                {validation.error}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Button */}
          {getActionButton()}
        </CardContent>
      </Card>

      {/* Release Confirmation Dialog */}
      <Dialog open={showReleaseDialog} onOpenChange={setShowReleaseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Release Milestone Funds</DialogTitle>
            <DialogDescription>
              You're about to release {milestoneAmountSol.toFixed(2)} SOL from milestone {milestoneIndex + 1}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Release Summary */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Milestone:</span>
                <span className="font-medium">#{milestoneIndex + 1}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Release Amount:</span>
                <span className="font-medium">{milestoneAmountSol.toFixed(2)} SOL</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Status:</span>
                <Badge variant="default" className="text-xs">Available</Badge>
              </div>
            </div>

            {/* Transaction Status */}
            {releaseState.status !== 'idle' && (
              <div className="space-y-2">
                {releaseState.status === 'preparing' && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Preparing transaction...</span>
                  </div>
                )}
                {releaseState.status === 'signing' && (
                  <div className="flex items-center space-x-2 text-orange-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Please sign the transaction in your wallet</span>
                  </div>
                )}
                {releaseState.status === 'confirming' && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Confirming transaction...</span>
                  </div>
                )}
                {releaseState.status === 'success' && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm">Milestone released successfully!</span>
                    </div>
                    {releaseState.signature && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getExplorerUrl(releaseState.signature!), '_blank')}
                        className="w-full"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Transaction
                      </Button>
                    )}
                  </div>
                )}
                {releaseState.status === 'error' && (
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription className="text-sm">
                      {releaseState.error}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="grid grid-cols-2 space-y-2">
            <Button
              onClick={handleRelease}
              disabled={isProcessing || isSuccess || !validation.isValid}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Release Complete
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Release {milestoneAmountSol.toFixed(2)} SOL
                </>
              )}
            </Button>

            {!isProcessing && !isSuccess && (
              <Button
                variant="outline"
                onClick={() => setShowReleaseDialog(false)}
                className="w-full"
              >
                Cancel
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
