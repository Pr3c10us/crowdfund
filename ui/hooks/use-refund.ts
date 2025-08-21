'use client';

import { useState, useCallback, useMemo } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { CampaignData } from '@/lib/solana/campaign-data';
import { DonationReceiptWithPubkey } from '@/lib/types';
import { convertLamportsToSol } from '@/lib/solana/instructions';
import { createProgram } from '@/lib/solana/program';
import { createInstructionBuilder, handleProgramError } from '@/lib/solana/instructions';
import { getSystemConfig } from '@/lib/solana/admin-utils';

export type FailureReason = 'target_not_reached' | 'deadline_passed' | 'dispute_resolved' | null;

export interface RefundState {
  refundAmount: number;
  isEligible: boolean;
  failureReason: FailureReason;
  isProcessing: boolean;
  error: string | null;
  disputePeriodEnds: Date | null;
  disputePeriodSeconds: number | null;
}

export const useRefund = (campaign: CampaignData, userDonations: DonationReceiptWithPubkey[]) => {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  
  const [state, setState] = useState<RefundState>({
    refundAmount: 0,
    isEligible: false,
    failureReason: null,
    isProcessing: false,
    error: null,
    disputePeriodEnds: null,
    disputePeriodSeconds: null,
  });

  // Calculate refundable amount
  const refundAmount = useMemo(() => {
    return userDonations
      .filter(donation => !donation.account.refunded)
      .reduce((sum, donation) => sum + convertLamportsToSol(donation.account.lamports), 0);
  }, [userDonations]);

  // Check if campaign has failed
  const checkCampaignFailure = useCallback((): { failed: boolean; reason: FailureReason } => {
    const now = Math.floor(Date.now() / 1000);
    const endTime = campaign.endTs.toNumber();
    const targetReached = campaign.progress >= 100;

    // Campaign is still active
    if (now < endTime && campaign.status === 'active') {
      return { failed: false, reason: null };
    }

    // Campaign ended successfully
    if (targetReached || campaign.status === 'successful') {
      return { failed: false, reason: null };
    }

    // Campaign failed - deadline passed without reaching target
    if (now >= endTime && !targetReached) {
      return { failed: true, reason: 'deadline_passed' };
    }

    // Campaign explicitly marked as failed
    if (campaign.status === 'failed') {
      return { failed: true, reason: 'target_not_reached' };
    }

    return { failed: false, reason: null };
  }, [campaign]);

  // Fetch dispute period from blockchain
  const fetchDisputePeriod = useCallback(async (): Promise<number> => {
    try {
      const config = await getSystemConfig(connection, {
        publicKey,
        signTransaction,
        signAllTransactions: async (txs: any) => {
          if (!signTransaction) {
            throw new Error('Wallet not connected');
          }
          return Promise.all(txs.map((tx: any) => signTransaction(tx)));
        },
        payer: publicKey
      } as any);
      
      if (config && config.disputeSeconds) {
        return config.disputeSeconds.toNumber();
      }
      
      // Fallback to 7 days if config not available
      return 7 * 24 * 60 * 60;
    } catch (error) {
      console.warn('Failed to fetch dispute period from blockchain, using default:', error);
      return 7 * 24 * 60 * 60; // 7 days fallback
    }
  }, [connection, publicKey, signTransaction]);

  // Check dispute period
  const checkDisputePeriod = useCallback((disputePeriodSeconds: number): { inDispute: boolean; endsAt: Date | null } => {
    const now = Math.floor(Date.now() / 1000);
    const endTime = campaign.endTs.toNumber();
    const disputeEndTime = endTime + disputePeriodSeconds;
    
    if (now < disputeEndTime) {
      return { 
        inDispute: true, 
        endsAt: new Date(disputeEndTime * 1000) 
      };
    }
    
    return { inDispute: false, endsAt: null };
  }, [campaign]);

  // Check refund eligibility
  const checkEligibility = useCallback(async () => {
    setState(prev => ({ ...prev, error: null }));

    try {
      // Fetch dispute period from blockchain
      const disputePeriodSeconds = await fetchDisputePeriod();
      
      const { failed, reason } = checkCampaignFailure();
      const { inDispute, endsAt } = checkDisputePeriod(disputePeriodSeconds);

      // Campaign must have failed
      if (!failed) {
        setState(prev => ({
          ...prev,
          isEligible: false,
          failureReason: null,
          refundAmount,
          disputePeriodEnds: null,
          disputePeriodSeconds,
        }));
        return;
      }

      // Must have donations to refund
      if (refundAmount <= 0) {
        setState(prev => ({
          ...prev,
          isEligible: false,
          failureReason: reason,
          refundAmount: 0,
          disputePeriodEnds: endsAt,
          disputePeriodSeconds,
          error: 'No donations available for refund',
        }));
        return;
      }

      // Dispute period must have passed
      if (inDispute) {
        setState(prev => ({
          ...prev,
          isEligible: false,
          failureReason: reason,
          refundAmount,
          disputePeriodEnds: endsAt,
          disputePeriodSeconds,
          error: `Dispute period active until ${endsAt?.toLocaleDateString()}`,
        }));
        return;
      }

      // All conditions met - eligible for refund
      setState(prev => ({
        ...prev,
        isEligible: true,
        failureReason: reason,
        refundAmount,
        disputePeriodEnds: null,
        disputePeriodSeconds,
        error: null,
      }));

    } catch (error) {
      console.error('Error checking refund eligibility:', error);
      setState(prev => ({
        ...prev,
        isEligible: false,
        error: 'Failed to check refund eligibility',
      }));
    }
  }, [campaign, refundAmount, checkCampaignFailure, checkDisputePeriod, fetchDisputePeriod]);

  // Process refund transaction
  const processRefund = useCallback(async (): Promise<string | null> => {
    if (!publicKey || !signTransaction || !state.isEligible) {
      throw new Error('Wallet not connected or not eligible for refund');
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      // Create program instance
      const program = createProgram(connection, { publicKey, signTransaction, signAllTransactions: async () => { throw new Error('Not implemented'); } });
      const instructionBuilder = createInstructionBuilder(program);

      // Get campaign PDA
      const campaignPDA = new PublicKey(campaign.id);

      // Build refund transaction
      const transaction = await instructionBuilder.buildRefundTransaction(
        publicKey,
        campaignPDA
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Sign transaction
      const signedTransaction = await signTransaction(transaction);

      // Send transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());

      // Confirm transaction
      await connection.confirmTransaction(signature, 'confirmed');

      setState(prev => ({ 
        ...prev, 
        isProcessing: false,
        refundAmount: 0, // Reset after successful refund
        isEligible: false,
      }));

      return signature;

    } catch (error: any) {
      console.error('Refund transaction failed:', error);
      
      let errorMessage = 'Refund transaction failed';
      if (error?.code) {
        errorMessage = handleProgramError(error);
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setState(prev => ({ 
        ...prev, 
        isProcessing: false,
        error: errorMessage,
      }));

      throw error;
    }
  }, [publicKey, signTransaction, connection, campaign.id, state.isEligible]);

  return {
    ...state,
    refundAmount,
    checkEligibility,
    processRefund,
    fetchDisputePeriod,
  };
};
