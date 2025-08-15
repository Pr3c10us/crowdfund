import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, BN, Wallet } from '@coral-xyz/anchor';
import { IDL } from './idl';
import { CROWDFUNDING_PROGRAM_ID } from './config';
import { Milestone } from '@/lib/types';

// Milestone status types
export type MilestoneStatus = 'pending' | 'available' | 'released' | 'disputed';

// Get milestone status based on campaign state and milestone data
export const getMilestoneStatus = (
  milestone: Milestone,
  milestoneIndex: number,
  campaignTotalDonated: BN,
  campaignTargetAmount: BN,
  lastReleaseTimestamp: BN,
  currentTimestamp: number,
  disputeWindowSeconds: number,
  campaignStartTimestamp?: BN,
  milestones?: Milestone[]
): MilestoneStatus => {
  // If already released
  if (milestone.released) {
    return 'released';
  }

  // Check if campaign has reached the milestone amount
  const milestoneThreshold = campaignTargetAmount.mul(new BN(milestoneIndex + 1)).div(new BN(5)); // Assuming 5 milestones max
  const hasReachedThreshold = campaignTotalDonated.gte(milestoneThreshold);

  if (!hasReachedThreshold) {
    return 'pending';
  }

  // Check if previous milestones are released (sequential release)
  if (milestones) {
    for (let i = 0; i < milestoneIndex; i++) {
      if (!milestones[i].released) {
        return 'pending';
      }
    }
  }

  // Calculate dispute window based on milestone position
  let disputeEndTimestamp: number;

  if (milestoneIndex === 0) {
    // First milestone: use campaign start timestamp + dispute window
    disputeEndTimestamp = campaignStartTimestamp
      ? campaignStartTimestamp.toNumber() + disputeWindowSeconds
      : lastReleaseTimestamp.toNumber() + disputeWindowSeconds;
  } else {
    // Subsequent milestones: find the last released milestone timestamp + dispute window
    // let lastReleasedTimestamp = 0;
    // if (milestones) {
    //   for (let i = milestoneIndex - 1; i >= 0; i--) {
    //     if (milestones[i].released) {
    //       lastReleasedTimestamp = milestones[i].releaseTs.toNumber();
    //       break;
    //     }
    //   }
    // }

    // // If no previous milestone found, use lastReleaseTimestamp
    // if (lastReleasedTimestamp === 0) {
    //   lastReleasedTimestamp = lastReleaseTimestamp.toNumber();
    // }

    disputeEndTimestamp = lastReleaseTimestamp.toNumber() + disputeWindowSeconds;
  }

  // Check if dispute window is still open
  const isDisputeWindowOpen = currentTimestamp < disputeEndTimestamp;
  console.log({ isDisputeWindowOpen, status: true });

  if (isDisputeWindowOpen) {
    return 'disputed';
  }

  return 'available';
};

// Calculate time remaining until milestone can be released
export const getTimeUntilRelease = (
  milestoneIndex: number,
  currentTimestamp: number,
  disputeWindowSeconds: number,
  campaignStartTimestamp?: BN,
  lastReleaseTimestamp?: BN,
  milestones?: Milestone[]
): number => {
  let disputeEndTimestamp: number;

  if (milestoneIndex === 0) {
    // First milestone: use campaign start timestamp + dispute window
    disputeEndTimestamp = campaignStartTimestamp
      ? campaignStartTimestamp.toNumber() + disputeWindowSeconds
      : (lastReleaseTimestamp?.toNumber() || 0) + disputeWindowSeconds;
  } else {
    // Subsequent milestones: find the last released milestone timestamp + dispute window
    // let lastReleasedTimestamp = 0;
    // if (milestones) {
    //   for (let i = milestoneIndex - 1; i >= 0; i--) {
    //     if (milestones[i].released) {
    //       lastReleasedTimestamp = milestones[i].releaseTs.toNumber();
    //       break;
    //     }
    //   }
    // }

    // // If no previous milestone found, use lastReleaseTimestamp
    // if (lastReleasedTimestamp === 0) {
    //   lastReleasedTimestamp = lastReleaseTimestamp?.toNumber() || 0;
    // }

    disputeEndTimestamp = lastReleaseTimestamp.toNumber() + disputeWindowSeconds;
  }

  const timeRemaining = disputeEndTimestamp - currentTimestamp;
  console.log('Time remaining:', timeRemaining);
  return Math.max(0, timeRemaining);
};

// Format time remaining for display
export const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return 'Available now';

  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);

  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else {
    return `${minutes}m remaining`;
  }
};

// Validate milestone release eligibility
export const validateMilestoneRelease = (
  milestone: Milestone,
  milestoneIndex: number,
  milestones: Milestone[],
  lastReleaseTimestamp: BN,
  currentTimestamp: number,
  disputeWindowSeconds: number,
  campaignStartTimestamp?: BN,
  isLocked: boolean = false
): {
  isValid: boolean;
  error?: string;
} => {
  // Check if campaign is locked
  if (isLocked) {
    return { isValid: false, error: 'Campaign is locked by admin - funds cannot be released' };
  }

  // Check if milestone is already released
  if (milestone.released) {
    return { isValid: false, error: 'Milestone already released' };
  }

  // Check if previous milestones are released (sequential release)
  for (let i = 0; i < milestoneIndex; i++) {
    if (!milestones[i].released) {
      return { isValid: false, error: `Previous milestone ${i + 1} must be released first` };
    }
  }

  // Check dispute window based on milestone position
  let disputeEndTimestamp: number;

  if (milestoneIndex === 0) {
    // First milestone: use campaign start timestamp + dispute window
    disputeEndTimestamp = campaignStartTimestamp
      ? campaignStartTimestamp.toNumber() + disputeWindowSeconds
      : lastReleaseTimestamp.toNumber() + disputeWindowSeconds;
  } else {
    // Subsequent milestones: find the last released milestone timestamp + dispute window
    // let lastReleasedTimestamp = 0;
    // for (let i = milestoneIndex - 1; i >= 0; i--) {
    //   if (milestones[i].released) {
    //     lastReleasedTimestamp = milestones[i].releaseTs.toNumber();
    //     break;
    //   }
    // }

    // // If no previous milestone found, use lastReleaseTimestamp
    // if (lastReleasedTimestamp === 0) {
    //   lastReleasedTimestamp = lastReleaseTimestamp.toNumber();
    // }

    disputeEndTimestamp = lastReleaseTimestamp.toNumber() + disputeWindowSeconds;
  }

  // Check if dispute window is still open
  if (currentTimestamp < disputeEndTimestamp) {
    const remainingTime = disputeEndTimestamp - currentTimestamp;
    const remainingDays = Math.ceil(remainingTime / (24 * 60 * 60));
    console.log({ remainingDays, currentTimestamp, disputeEndTimestamp, remainingTime, validateMilestoneRelease: true });
    return {
      isValid: false,
      error: `Must wait ${remainingDays} more day(s) from ${milestoneIndex === 0 ? 'campaign start' : 'last milestone release'}`
    };
  }

  return { isValid: true };
};

// Create milestone release transaction
export const createMilestoneReleaseTransaction = async (
  connection: Connection,
  creator: PublicKey,
  campaignPubkey: PublicKey,
  milestoneIndex: number,
  wallet: Wallet
): Promise<Transaction> => {
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(IDL as any, provider);

  // Get vault PDA
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), campaignPubkey.toBuffer()],
    CROWDFUNDING_PROGRAM_ID
  );

  const tx = await program.methods
    .release(milestoneIndex)
    .accounts({
      creator,
      campaign: campaignPubkey,
      vault: vaultPda,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return tx;
};

// Calculate milestone progress percentage
export const calculateMilestoneProgress = (
  milestoneIndex: number,
  totalMilestones: number,
  releasedMilestones: number
): number => {
  const expectedProgress = ((milestoneIndex + 1) / totalMilestones) * 100;
  const actualProgress = (releasedMilestones / totalMilestones) * 100;
  return Math.min(expectedProgress, actualProgress);
};

// Get milestone color based on status
export const getMilestoneStatusColor = (status: MilestoneStatus): string => {
  switch (status) {
    case 'released':
      return 'text-green-600 bg-green-100 border-green-200';
    case 'available':
      return 'text-blue-600 bg-blue-100 border-blue-200';
    case 'disputed':
      return 'text-orange-600 bg-orange-100 border-orange-200';
    case 'pending':
    default:
      return 'text-gray-600 bg-gray-100 border-gray-200';
  }
};

// Get milestone icon based on status
export const getMilestoneStatusIcon = (status: MilestoneStatus): string => {
  switch (status) {
    case 'released':
      return 'CheckCircle2';
    case 'available':
      return 'Play';
    case 'disputed':
      return 'Clock';
    case 'pending':
    default:
      return 'Circle';
  }
};

// Calculate total released amount
export const calculateTotalReleased = (milestones: Milestone[]): BN => {
  return milestones.reduce((total, milestone) => {
    if (milestone.released) {
      return total.add(milestone.amount);
    }
    return total;
  }, new BN(0));
};

// Calculate available to release amount
export const calculateAvailableToRelease = (
  milestones: Milestone[],
  campaignTotalDonated: BN,
  campaignTargetAmount: BN,
  lastReleaseTimestamp: BN,
  currentTimestamp: number,
  disputeWindowSeconds: number = 7 * 24 * 60 * 60,
  campaignStartTimestamp?: BN
): BN => {
  let availableAmount = new BN(0);

  milestones.forEach((milestone, index) => {
    const status = getMilestoneStatus(
      milestone,
      index,
      campaignTotalDonated,
      campaignTargetAmount,
      lastReleaseTimestamp,
      currentTimestamp,
      disputeWindowSeconds,
      campaignStartTimestamp,
      milestones
    );

    if (status === 'available') {
      availableAmount = availableAmount.add(milestone.amount);
    }
  });

  return availableAmount;
};
