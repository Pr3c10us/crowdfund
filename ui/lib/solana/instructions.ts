import { Program, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import {
  getCampaignPDA,
  getVaultPDA,
  getReceiptPDA,
  createProgram
} from './program';
import {
  CreateCampaignParams,
  DonateParams,
  ReleaseParams,
  Milestone
} from '../types';
import { CROWDFUNDING_PROGRAM_ID } from './config';

// Error handling for custom program errors
export const PROGRAM_ERRORS = {
  6000: 'Campaign already active – config locked',
  6001: 'Campaign not yet ended or already successful',
  6002: 'Campaign still in dispute period',
  6003: 'Milestone already released or index out of bounds',
  6004: 'Target not reached',
  6005: 'Nothing to refund',
  6006: 'Invalid milestone index or already released',
  6007: 'Dispute window is still open',
  6008: 'Milestone already released',
  6009: 'Unauthorized to release funds',
};

export const handleProgramError = (error: any): string => {
  if (error?.code && PROGRAM_ERRORS[error.code as keyof typeof PROGRAM_ERRORS]) {
    return PROGRAM_ERRORS[error.code as keyof typeof PROGRAM_ERRORS];
  }
  return error?.message || 'Unknown program error';
};

// Create Campaign Instruction
export const createCampaignInstruction = async (
  program: Program,
  creator: PublicKey,
  campaignKeypair: PublicKey,
  params: CreateCampaignParams
): Promise<TransactionInstruction> => {
  try {
    const [vaultPDA] = getVaultPDA(campaignKeypair);

    return await (program.methods as any)
      .createCampaign(
        // params.targetAmount, // target_lamports
        params.deadline, // duration_seconds
        params.milestoneAmounts, // milestone_amounts
        params.milestoneDescriptions, // milestone_description
        params.title, // title
        params.description, // description
        params.imageUrl // image_url
      )
      .accounts({
        creator: creator,
        campaign: campaignKeypair,
        vault: vaultPDA,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  } catch (error) {
    throw new Error(`Failed to create campaign instruction: ${handleProgramError(error)}`);
  }
};

// Donate Instruction
export const donateInstruction = async (
  program: Program,
  donor: PublicKey,
  campaignPDA: PublicKey,
  params: DonateParams
): Promise<TransactionInstruction> => {
  try {
    const [vaultPDA] = getVaultPDA(campaignPDA);
    const [receiptPDA] = getReceiptPDA(campaignPDA, donor);

    return await (program.methods as any)
      .donate(params.amount)
      .accounts({
        donor: donor,
        campaign: campaignPDA,
        vault: vaultPDA,
        receipt: receiptPDA,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  } catch (error) {
    throw new Error(`Failed to create donate instruction: ${handleProgramError(error)}`);
  }
};

// Refund Instruction
export const refundInstruction = async (
  program: Program,
  donor: PublicKey,
  campaignPDA: PublicKey
): Promise<TransactionInstruction> => {
  try {
    const [vaultPDA] = getVaultPDA(campaignPDA);
    const [receiptPDA] = getReceiptPDA(campaignPDA, donor);

    return await (program.methods as any)
      .refund()
      .accounts({
        donor: donor,
        campaign: campaignPDA,
        vault: vaultPDA,
        receipt: receiptPDA,
      })
      .instruction();
  } catch (error) {
    throw new Error(`Failed to create refund instruction: ${handleProgramError(error)}`);
  }
};

// Release Funds Instruction
export const releaseInstruction = async (
  program: Program,
  creator: PublicKey,
  campaignPDA: PublicKey,
  params: ReleaseParams
): Promise<TransactionInstruction> => {
  try {
    const [vaultPDA] = getVaultPDA(campaignPDA);

    return await (program.methods as any)
      .release(params.milestoneIndex)
      .accounts({
        creator: creator,
        campaign: campaignPDA,
        vault: vaultPDA,
      })
      .instruction();
  } catch (error) {
    throw new Error(`Failed to create release instruction: ${handleProgramError(error)}`);
  }
};

// High-level instruction builders
export class InstructionBuilder {
  constructor(private program: Program) { }

  // Create a complete campaign creation transaction
  async buildCreateCampaignTransaction(
    creator: PublicKey,
    campaignKeypair: PublicKey,
    params: CreateCampaignParams
  ): Promise<Transaction> {
    try {
      const instruction = await createCampaignInstruction(this.program, creator, campaignKeypair, params);
      const transaction = new Transaction().add(instruction);
      return transaction;
    } catch (error) {
      throw new Error(`Failed to build create campaign transaction: ${handleProgramError(error)}`);
    }
  }

  // Create a complete donation transaction
  async buildDonateTransaction(
    donor: PublicKey,
    campaignPDA: PublicKey,
    params: DonateParams
  ): Promise<Transaction> {
    try {
      const instruction = await donateInstruction(this.program, donor, campaignPDA, params);
      const transaction = new Transaction().add(instruction);
      return transaction;
    } catch (error) {
      throw new Error(`Failed to build donate transaction: ${handleProgramError(error)}`);
    }
  }

  // Create a complete refund transaction
  async buildRefundTransaction(
    donor: PublicKey,
    campaignPDA: PublicKey
  ): Promise<Transaction> {
    try {
      const instruction = await refundInstruction(this.program, donor, campaignPDA);
      const transaction = new Transaction().add(instruction);
      return transaction;
    } catch (error) {
      throw new Error(`Failed to build refund transaction: ${handleProgramError(error)}`);
    }
  }

  // Create a complete release funds transaction
  async buildReleaseTransaction(
    creator: PublicKey,
    campaignPDA: PublicKey,
    params: ReleaseParams
  ): Promise<Transaction> {
    try {
      const instruction = await releaseInstruction(this.program, creator, campaignPDA, params);
      const transaction = new Transaction().add(instruction);
      return transaction;
    } catch (error) {
      throw new Error(`Failed to build release transaction: ${handleProgramError(error)}`);
    }
  }
}

// Helper function to create instruction builder
export const createInstructionBuilder = (program: Program): InstructionBuilder => {
  return new InstructionBuilder(program);
};

// Utility functions for parameter conversion
export const convertMilestonesToProgram = (milestones: Array<{
  description: string;
  targetAmount: number; // SOL amount from UI
}>): Milestone[] => {
  return milestones.map(milestone => ({
    amount: new BN(milestone.targetAmount * 1_000_000_000), // Convert SOL to lamports
    description: milestone.description,
    releaseTs: new BN(0), // Will be set when released
    released: false,
  }));
};

export const convertSolToLamports = (solAmount: number): BN => {
  return new BN(solAmount * 1_000_000_000);
};

export const convertLamportsToSol = (lamports: BN): number => {
  return lamports.toNumber() / 1_000_000_000;
};
