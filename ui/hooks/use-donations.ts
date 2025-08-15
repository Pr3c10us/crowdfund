'use client';

import { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'sonner';
import { CampaignData } from '@/lib/solana/campaign-data';

export interface DonationData {
  signature: string;
  amount: number; // in SOL
  timestamp: Date;
  campaign: CampaignData;
  donor: string;
}

export const useDonations = () => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [recentDonations, setRecentDonations] = useState<DonationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addDonation = useCallback((donation: DonationData) => {
    setRecentDonations(prev => [donation, ...prev.slice(0, 9)]); // Keep last 10 donations
  }, []);

  const handleDonationSuccess = useCallback((
    signature: string, 
    amount: number, 
    campaign: CampaignData
  ) => {
    if (!publicKey) return;

    const donation: DonationData = {
      signature,
      amount,
      timestamp: new Date(),
      campaign,
      donor: publicKey.toBase58()
    };

    addDonation(donation);
    
    // Show success toast
    toast.success('Donation successful!', {
      description: `You donated ${amount} SOL to ${campaign.title}`
    });
  }, [publicKey, addDonation]);

  const refreshCampaignData = useCallback(async (campaignId: string) => {
    if (!connection) return null;

    setIsLoading(true);
    try {
      // In a real implementation, you would fetch updated campaign data from the blockchain
      // For now, we'll just simulate a refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // This would typically involve:
      // 1. Fetching the campaign account from Solana
      // 2. Parsing the account data
      // 3. Returning updated campaign information
      
      return null;
    } catch (error) {
      console.error('Failed to refresh campaign data:', error);
      toast.error('Failed to refresh campaign data');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [connection]);

  return {
    recentDonations,
    isLoading,
    handleDonationSuccess,
    refreshCampaignData,
    addDonation
  };
};
