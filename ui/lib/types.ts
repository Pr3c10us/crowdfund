import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

// Milestone interface matching IDL
export interface Milestone {
  amount: BN;
  description: string;
  releaseTs: BN;
  released: boolean;
}

// Campaign interface matching IDL structure
export interface Campaign {
  creator: PublicKey;
  vault: PublicKey;
  targetLamports: BN;
  startTs: BN;
  endTs: BN;
  totalDonated: BN;
  milestones: Milestone[];
  milestoneCount: number;
  lastReleaseTs: BN;
  bump: number;
}

// DonationReceipt interface matching IDL structure
export interface DonationReceipt {
  campaign: PublicKey;
  donor: PublicKey;
  lamports: BN;
  refunded: boolean;
}

// Event types matching IDL events
export interface CampaignCreatedEvent {
  campaign: PublicKey;
  creator: PublicKey;
  title: string;
  targetAmount: BN;
}

export interface DonationReceivedEvent {
  campaign: PublicKey;
  donor: PublicKey;
  amount: BN;
}

export interface RefundIssuedEvent {
  campaign: PublicKey;
  donor: PublicKey;
  amount: BN;
}

export interface FundsReleasedEvent {
  campaign: PublicKey;
  milestoneIndex: number;
  amount: BN;
}

// UI-specific interfaces
export interface CampaignWithPubkey {
  publicKey: PublicKey;
  account: Campaign;
}

export interface DonationReceiptWithPubkey {
  publicKey: PublicKey;
  account: DonationReceipt;
}

// Form data interfaces for UI components
export interface CampaignFormData {
  title: string;
  description: string;
  category: string;
  targetAmount: number; // In SOL
  deadline: Date;
  milestones: Array<{
    title: string;
    description: string;
    targetAmount: number; // In SOL
  }>;
}

export interface MilestoneFormData {
  title: string;
  description: string;
  targetAmount: number; // In SOL for UI
}

export interface DonationFormData {
  amount: number; // In SOL for UI
}

// Legacy interfaces for backward compatibility
export interface Contribution {
  id: string;
  campaignId: string;
  contributor: PublicKey;
  amount: number;
  timestamp: Date;
  transactionSignature: string;
}

export interface WalletContextType {
  connected: boolean;
  publicKey: PublicKey | null;
  connecting: boolean;
  disconnect: () => Promise<void>;
}

// Status and utility types
export type CampaignStatus = 'active' | 'completed' | 'expired' | 'failed' | 'cancelled';

export type ProgramError = 
  | 'ConfigLocked'
  | 'NotFailed'
  | 'AlreadyRefunded'
  | 'CampaignNotActive'
  | 'DeadlinePassed'
  | 'InsufficientFunds'
  | 'UnauthorizedAccess'
  | 'MilestoneAlreadyReleased'
  | 'InvalidMilestone'
  | 'TargetNotReached';

// Helper type for instruction parameters
export interface CreateCampaignParams {
  title: string;
  description: string;
  imageUrl: string;
  // targetAmount: BN;
  deadline: BN;
  milestoneAmounts: BN[];
  milestoneDescriptions: string[];
}

export interface DonateParams {
  amount: BN;
}

export interface ReleaseParams {
  milestoneIndex: number;
}
