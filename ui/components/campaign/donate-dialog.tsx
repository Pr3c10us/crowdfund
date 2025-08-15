'use client';

import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { BN, AnchorProvider } from '@coral-xyz/anchor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Heart,
  Loader2,
  DollarSign,
  Wallet,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PRESET_AMOUNTS,
  convertSolToUsd,
  convertSolToLamports,
  convertLamportsToSol,
  validateDonationAmount,
  estimateTransactionFee,
  createDonationTransaction,
  calculateDonationImpact,
  getExplorerUrl,
  formatWalletAddress
} from '@/lib/solana/donation-utils';
import { CampaignData } from '@/lib/solana/campaign-data';

interface DonateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: CampaignData;
  onDonationSuccess?: (signature: string, amount: number) => void;
}

interface TransactionState {
  status: 'idle' | 'preparing' | 'signing' | 'confirming' | 'success' | 'error';
  signature?: string;
  error?: string;
}

export const DonateDialog: React.FC<DonateDialogProps> = ({
  open,
  onOpenChange,
  campaign,
  onDonationSuccess
}) => {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [amount, setAmount] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [transactionFee, setTransactionFee] = useState<number>(0);
  const [transactionState, setTransactionState] = useState<TransactionState>({ status: 'idle' });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch wallet balance and transaction fee
  useEffect(() => {
    const fetchWalletData = async () => {
      if (!publicKey || !connection) return;

      try {
        const balance = await connection.getBalance(publicKey);
        setWalletBalance(balance / LAMPORTS_PER_SOL);

        const fee = await estimateTransactionFee(connection);
        setTransactionFee(fee);
      } catch (error) {
        console.error('Failed to fetch wallet data:', error);
      }
    };

    if (open) {
      fetchWalletData();
    }
  }, [publicKey, connection, open]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setAmount('');
      setCustomAmount('');
      setSelectedPreset(null);
      setTransactionState({ status: 'idle' });
      setShowAdvanced(false);
    }
  }, [open]);

  const handlePresetSelect = (presetAmount: number) => {
    setSelectedPreset(presetAmount);
    setAmount(presetAmount.toString());
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setAmount(value);
    setSelectedPreset(null);
  };

  const donationAmount = parseFloat(amount) || 0;
  const validation = validateDonationAmount(donationAmount, walletBalance - transactionFee);
  const usdAmount = convertSolToUsd(donationAmount);
  const totalCost = donationAmount + transactionFee;

  const currentAmountSol = convertLamportsToSol(campaign.totalDonated);
  const targetAmountSol = convertLamportsToSol(campaign.targetLamports);
  const impact = calculateDonationImpact(donationAmount, targetAmountSol, currentAmountSol);

  const handleDonate = async () => {
    if (!publicKey || !signTransaction || !validation.isValid) return;

    setTransactionState({ status: 'preparing' });

    try {
      // Create wallet interface for Anchor
      const wallet = {
        publicKey,
        signTransaction,
        signAllTransactions: async (txs: any[]) => {
          return Promise.all(txs.map(tx => signTransaction(tx)));
        }
      };

      // Create transaction
      const campaignPubkey = new PublicKey(campaign.id);
      const amountBN = convertSolToLamports(donationAmount);

      setTransactionState({ status: 'signing' });

      const transaction = await createDonationTransaction(
        connection,
        publicKey,
        campaignPubkey,
        amountBN,
        wallet as any
      );

      // Get recent blockhash and set fee payer
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Sign transaction
      const signedTx = await signTransaction(transaction);

      setTransactionState({ status: 'confirming' });

      // Send and confirm transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize());

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      setTransactionState({
        status: 'success',
        signature
      });

      toast.success('Donation successful!', {
        description: `You donated ${donationAmount} SOL to ${campaign.title}`,
        action: {
          label: 'View Transaction',
          onClick: () => window.open(getExplorerUrl(signature), '_blank')
        }
      });

      onDonationSuccess?.(signature, donationAmount);

      // Close dialog after success
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);

    } catch (error: any) {
      console.error('Donation failed:', error);

      setTransactionState({
        status: 'error',
        error: error.message || 'Transaction failed'
      });

      toast.error('Donation failed', {
        description: error.message || 'Please try again'
      });
    }
  };

  const getStatusContent = () => {
    switch (transactionState.status) {
      case 'preparing':
        return (
          <div className="flex items-center space-x-2 text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Preparing transaction...</span>
          </div>
        );
      case 'signing':
        return (
          <div className="flex items-center space-x-2 text-orange-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Please sign the transaction in your wallet</span>
          </div>
        );
      case 'confirming':
        return (
          <div className="flex items-center space-x-2 text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Confirming transaction...</span>
          </div>
        );
      case 'success':
        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              <span>Donation successful!</span>
            </div>
            {transactionState.signature && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(getExplorerUrl(transactionState.signature!), '_blank')}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Transaction
              </Button>
            )}
          </div>
        );
      case 'error':
        return (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              {transactionState.error}
            </AlertDescription>
          </Alert>
        );
      default:
        return null;
    }
  };

  const isProcessing = ['preparing', 'signing', 'confirming'].includes(transactionState.status);
  const isSuccess = transactionState.status === 'success';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-red-500" />
            <span>Support this Campaign</span>
          </DialogTitle>
          <DialogDescription>
            Help {formatWalletAddress(campaign.creator.toBase58())} reach their goal of {targetAmountSol.toFixed(2)} SOL
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Current Progress</span>
              <span className="font-medium">{campaign.progress.toFixed(1)}%</span>
            </div>
            <Progress value={campaign.progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{currentAmountSol.toFixed(2)} SOL raised</span>
              <span>{targetAmountSol.toFixed(2)} SOL goal</span>
            </div>
          </div>

          {/* Preset Amounts */}
          <div className="space-y-3">
            <Label>Quick Select Amount</Label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <Button
                  key={preset}
                  variant={selectedPreset === preset ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePresetSelect(preset)}
                  disabled={isProcessing}
                  className="text-xs"
                >
                  {preset} SOL
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div className="space-y-2">
            <Label htmlFor="custom-amount">Custom Amount (SOL)</Label>
            <div className="relative">
              <Input
                id="custom-amount"
                type="number"
                placeholder="Enter amount in SOL"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                disabled={isProcessing}
                min="0"
                step="0.001"
                className={validation.isValid ? '' : 'border-red-500'}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                SOL
              </div>
            </div>
            {donationAmount > 0 && (
              <div className="text-xs text-muted-foreground">
                ≈ ${usdAmount.toFixed(2)} USD
              </div>
            )}
            {!validation.isValid && validation.error && (
              <p className="text-xs text-red-500">{validation.error}</p>
            )}
          </div>

          {/* Transaction Summary */}
          {donationAmount > 0 && validation.isValid && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span>Donation Amount</span>
                <span className="font-medium">{donationAmount.toFixed(4)} SOL</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Transaction Fee</span>
                <span className="font-medium">{transactionFee.toFixed(6)} SOL</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between font-medium">
                <span>Total Cost</span>
                <span>{totalCost.toFixed(4)} SOL</span>
              </div>

              {/* Impact Preview */}
              {impact.progressIncrease > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center space-x-2 text-sm text-green-600">
                    <TrendingUp className="w-4 h-4" />
                    <span>Your Impact</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Progress will increase by {impact.progressIncrease.toFixed(1)}%
                    {impact.willComplete && (
                      <Badge variant="default" className="ml-2 text-xs">
                        Campaign Complete!
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Wallet Balance */}
          <div className="flex items-center justify-between text-sm p-3 bg-muted/30 rounded">
            <div className="flex items-center space-x-2">
              <Wallet className="w-4 h-4" />
              <span>Wallet Balance</span>
            </div>
            <span className="font-medium">{walletBalance.toFixed(4)} SOL</span>
          </div>

          {/* Transaction Status */}
          {transactionState.status !== 'idle' && (
            <div className="space-y-2">
              {getStatusContent()}
            </div>
          )}
        </div>

        <DialogFooter className="grid grid-cols-2 space-y-2">
          <Button
            onClick={handleDonate}
            disabled={!validation.isValid || isProcessing || isSuccess || !publicKey}
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
                Donation Complete
              </>
            ) : (
              <>
                <Heart className="w-4 h-4 mr-2" />
                Donate {donationAmount > 0 ? `${donationAmount} SOL` : ''}
              </>
            )}
          </Button>

          {!isProcessing && !isSuccess && (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
