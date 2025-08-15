'use client';

import { Connection, PublicKey } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';
import { createProgram } from './program';
import { Campaign, CampaignWithPubkey, DonationReceipt, DonationReceiptWithPubkey } from '../types';
import { convertLamportsToSol } from './instructions';

export interface CampaignData extends Campaign {
  id: string;
  title: string;
  shortDescription: string;
  imageUrl?: string;
  category: string;
  progress: number;
  timeRemaining: number;
  status: 'active' | 'ended' | 'successful' | 'failed';
  donorCount: number;
}

export interface CampaignFilters {
  status?: 'active' | 'ended' | 'successful' | 'failed';
  category?: string;
  sortBy?: 'newest' | 'ending_soon' | 'most_funded' | 'alphabetical';
  search?: string;
}

export class CampaignDataService {
  private connection: Connection;
  private program: Program | null = null;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  private async getProgram(): Promise<Program> {
    if (!this.program) {
      // Create a dummy wallet for read-only operations
      const dummyWallet = {
        publicKey: PublicKey.default,
        signTransaction: async () => { throw new Error('Read-only wallet'); },
        signAllTransactions: async () => { throw new Error('Read-only wallet'); },
      };
      this.program = createProgram(this.connection, dummyWallet);
    }
    return this.program;
  }

  // Fetch all campaigns
  async fetchAllCampaigns(): Promise<CampaignData[]> {
    try {
      const program = await this.getProgram();
      if (!program || !program.account) {
        console.warn('Program or account not available, using mock data');
        return mockCampaigns;
      }
      
      // Try to access the campaign account with proper typing
      const campaigns = await (program.account as any).campaign?.all();
      if (!campaigns) {
        console.warn('Campaign account not found, using mock data');
        return mockCampaigns;
      }
      
      return campaigns.map((campaign: any) => this.transformCampaignData(campaign));
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      // Return mock data as fallback
      return mockCampaigns;
    }
  }

  // Fetch single campaign by public key
  async fetchCampaign(campaignPubkey: PublicKey): Promise<CampaignData | null> {
    try {
      const program = await this.getProgram();
      if (!program || !program.account) {
        console.warn('Program or account not available, using mock data');
        return mockCampaigns.find(c => c.id === campaignPubkey.toString()) || null;
      }
      
      // Try to access the campaign account with proper typing
      const campaign = await (program.account as any).campaign?.fetch(campaignPubkey);
      if (!campaign) {
        console.warn('Campaign not found, using mock data');
        return mockCampaigns.find(c => c.id === campaignPubkey.toString()) || null;
      }
      
      return this.transformCampaignData({
        publicKey: campaignPubkey,
        account: campaign
      });
    } catch (error) {
      console.error('Error fetching campaign:', error);
      // Try to find in mock data as fallback
      return mockCampaigns.find(c => c.id === campaignPubkey.toString()) || null;
    }
  }

  // Fetch campaigns by creator
  async fetchCampaignsByCreator(creator: PublicKey): Promise<CampaignData[]> {
    try {
      const program = await this.getProgram();
      if (!program || !program.account) {
        console.warn('Program or account not available, using mock data');
        return mockCampaigns.filter(c => c.creator.toString() === creator.toString());
      }
      
      const campaigns = await (program.account as any).campaign?.all([
        {
          memcmp: {
            offset: 8, // Skip discriminator
            bytes: creator.toBase58(),
          }
        }
      ]);
      
      if (!campaigns) {
        console.warn('Campaign account not found, using mock data');
        return mockCampaigns.filter(c => c.creator.toString() === creator.toString());
      }
      
      return campaigns.map((campaign: any) => this.transformCampaignData(campaign));
    } catch (error) {
      console.error('Error fetching campaigns by creator:', error);
      return mockCampaigns.filter(c => c.creator.toString() === creator.toString());
    }
  }

  // Fetch donation receipts for a campaign
  async fetchCampaignDonations(campaignPubkey: PublicKey): Promise<DonationReceiptWithPubkey[]> {
    try {
      const program = await this.getProgram();
      if (!program || !program.account) {
        console.warn('Program or account not available, no donations available');
        return [];
      }
      
      const receipts = await (program.account as any).donationReceipt?.all([
        {
          memcmp: {
            offset: 8, // Skip discriminator
            bytes: campaignPubkey.toBase58(),
          }
        }
      ]);
      
      return receipts || [];
    } catch (error) {
      console.error('Error fetching campaign donations:', error);
      return [];
    }
  }

  // Transform raw campaign data to UI-friendly format
  private transformCampaignData(campaignWithPubkey: CampaignWithPubkey): CampaignData {
    const { publicKey, account } = campaignWithPubkey;
    const campaign = account as any; // Use any to handle IDL type issues
    
    // Use the new IDL structure with separate title, description, and imageUrl fields
    const title = campaign.title || 'Untitled Campaign';
    const shortDescription = campaign.description || 'No description available';
    const imageUrl = campaign.imageUrl || '';
    
    // Calculate progress percentage
    const targetSol = convertLamportsToSol(campaign.targetLamports);
    const currentSol = convertLamportsToSol(campaign.totalDonated);
    const progress = targetSol > 0 ? Math.min((currentSol / targetSol) * 100, 100) : 0;
    
    // Calculate time remaining
    const now = Math.floor(Date.now() / 1000);
    const endTime = campaign.endTs.toNumber();
    const timeRemaining = Math.max(0, endTime - now);
    
    // Determine status
    let status: 'active' | 'ended' | 'successful' | 'failed' = 'active';
    if (timeRemaining === 0) {
      status = progress >= 100 ? 'successful' : 'failed';
    } else {
      status = 'active';
    }
    
    return {
      ...campaign,
      id: publicKey.toBase58(),
      title: title.length > 60 ? title.substring(0, 60) + '...' : title,
      shortDescription: shortDescription.length > 120 ? shortDescription.substring(0, 120) + '...' : shortDescription,
      imageUrl,
      category: 'general', // Default category since not in IDL
      progress,
      timeRemaining,
      status,
      donorCount: 0, // Will be updated when fetching donations
    };
  }

  // Filter and sort campaigns
  filterAndSortCampaigns(campaigns: CampaignData[], filters: CampaignFilters): CampaignData[] {
    let filtered = [...campaigns];

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(campaign => campaign.status === filters.status);
    }

    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter(campaign => campaign.category === filters.category);
    }

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(campaign => 
        campaign.title.toLowerCase().includes(searchTerm) ||
        campaign.shortDescription.toLowerCase().includes(searchTerm)
      );
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'newest':
        filtered.sort((a, b) => b.startTs.toNumber() - a.startTs.toNumber());
        break;
      case 'ending_soon':
        filtered.sort((a, b) => {
          if (a.status === 'active' && b.status === 'active') {
            return a.timeRemaining - b.timeRemaining;
          }
          return a.status === 'active' ? -1 : 1;
        });
        break;
      case 'most_funded':
        filtered.sort((a, b) => b.progress - a.progress);
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        // Default to newest
        filtered.sort((a, b) => b.startTs.toNumber() - a.startTs.toNumber());
    }

    return filtered;
  }

  // Format time remaining for display
  formatTimeRemaining(seconds: number): string {
    if (seconds <= 0) return 'Ended';
    
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Subscribe to campaign account changes
  subscribeToCampaign(campaignPubkey: PublicKey, callback: (campaign: CampaignData | null) => void): number {
    return this.connection.onAccountChange(
      campaignPubkey,
      async (accountInfo) => {
        try {
          const program = await this.getProgram();
          const campaign = (program.coder.accounts as any).decode('Campaign', accountInfo.data);
          const campaignData = this.transformCampaignData({
            publicKey: campaignPubkey,
            account: campaign
          });
          callback(campaignData);
        } catch (error) {
          console.error('Error processing campaign update:', error);
          callback(null);
        }
      }
    );
  }

  // Unsubscribe from account changes
  unsubscribe(subscriptionId: number): void {
    this.connection.removeAccountChangeListener(subscriptionId);
  }
}

// Create singleton instance
let campaignDataService: CampaignDataService | null = null;

export const getCampaignDataService = (connection: Connection): CampaignDataService => {
  if (!campaignDataService) {
    campaignDataService = new CampaignDataService(connection);
  }
  return campaignDataService;
};

// Mock data for development/testing
export const mockCampaigns: CampaignData[] = [
  {
    id: 'mock-1',
    creator: new PublicKey('11111111111111111111111111111112'),
    vault: new PublicKey('11111111111111111111111111111113'),
    targetLamports: new BN(10_000_000_000), // 10 SOL
    startTs: new BN(Date.now() / 1000 - 86400), // Started 1 day ago
    endTs: new BN(Date.now() / 1000 + 2592000), // Ends in 30 days
    totalDonated: new BN(3_500_000_000), // 3.5 SOL donated
    milestones: [],
    milestoneCount: 3,
    lastReleaseTs: new BN(0),
    bump: 255,
    title: 'Revolutionary DeFi Protocol',
    shortDescription: 'Building the next generation of decentralized finance tools on Solana with advanced yield farming capabilities.',
    category: 'technology',
    progress: 35,
    timeRemaining: 2592000,
    status: 'active',
    donorCount: 12,
    imageUrl: '/api/placeholder/400/300'
  },
  {
    id: 'mock-2',
    creator: new PublicKey('11111111111111111111111111111114'),
    vault: new PublicKey('11111111111111111111111111111115'),
    targetLamports: new BN(5_000_000_000), // 5 SOL
    startTs: new BN(Date.now() / 1000 - 172800), // Started 2 days ago
    endTs: new BN(Date.now() / 1000 + 1209600), // Ends in 14 days
    totalDonated: new BN(4_200_000_000), // 4.2 SOL donated
    milestones: [],
    milestoneCount: 2,
    lastReleaseTs: new BN(0),
    bump: 254,
    title: 'Community Art Gallery',
    shortDescription: 'Creating a physical and digital space for emerging artists to showcase their work and connect with collectors.',
    category: 'art',
    progress: 84,
    timeRemaining: 1209600,
    status: 'active',
    donorCount: 28,
    imageUrl: '/api/placeholder/400/300'
  }
];
