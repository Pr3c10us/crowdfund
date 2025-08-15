import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, BN, Wallet } from '@coral-xyz/anchor';
import { IDL } from './idl';
import { CROWDFUNDING_PROGRAM_ID } from './config';

// Get system config PDA
export const getSystemConfigPda = (): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('system_config')],
    CROWDFUNDING_PROGRAM_ID
  );
};

// Check if system is initialized
export const checkSystemInitialized = async (
  connection: Connection
): Promise<boolean> => {
  try {
    const [systemConfigPda] = getSystemConfigPda();
    const accountInfo = await connection.getAccountInfo(systemConfigPda);
    return accountInfo !== null;
  } catch (error) {
    console.error('Error checking system initialization:', error);
    return false;
  }
};

// Get system config data
export const getSystemConfig = async (
  connection: Connection,
  wallet: Wallet
): Promise<{
  authority: PublicKey;
  disputeSeconds: BN;
} | null> => {
  try {
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    const program = new Program(IDL as any, provider);

    const [systemConfigPda] = getSystemConfigPda();
    const systemConfig = await (program.account as any).systemConfig.fetch(systemConfigPda);

    return {
      authority: systemConfig.authorithy, // Note: typo in IDL
      disputeSeconds: systemConfig.disputeSeconds
    };
  } catch (error) {
    console.error('Error fetching system config:', error);
    return null;
  }
};

// Initialize system contract
export const createInitiateContractTransaction = async (
  connection: Connection,
  authority: PublicKey,
  disputeSeconds: number,
  wallet: Wallet
): Promise<Transaction> => {
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(IDL as any, provider);

  const [systemConfigPda] = getSystemConfigPda();

  const tx = await program.methods
    .initiateContract(new BN(disputeSeconds))
    .accounts({
      authority,
    })
    .transaction();

  return tx;
};

// Update authority
export const createUpdateAuthorityTransaction = async (
  connection: Connection,
  currentAuthority: PublicKey,
  newAuthority: PublicKey,
  wallet: Wallet
): Promise<Transaction> => {
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(IDL as any, provider);

  const [systemConfigPda] = getSystemConfigPda();

  const tx = await program.methods
    .updateAuthorithy(newAuthority) // Note: typo in IDL
    .accounts({
      authority: currentAuthority,
      systemConfig: systemConfigPda,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return tx;
};

// Update dispute window
export const createUpdateDisputeSecondsTransaction = async (
  connection: Connection,
  authority: PublicKey,
  disputeSeconds: number,
  wallet: Wallet
): Promise<Transaction> => {
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(IDL as any, provider);

  const [systemConfigPda] = getSystemConfigPda();

  const tx = await program.methods
    .updateDisputeSeconds(new BN(disputeSeconds))
    .accounts({
      authority,
      systemConfig: systemConfigPda,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return tx;
};

// Lock/unlock campaign
export const createLockCampaignTransaction = async (
  connection: Connection,
  authority: PublicKey,
  campaignPubkey: PublicKey,
  locked: boolean,
  wallet: Wallet
): Promise<Transaction> => {
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(IDL as any, provider);

  const [systemConfigPda] = getSystemConfigPda();

  const tx = await program.methods
    .lockCampaign(locked)
    .accounts({
      authority,
      campaign: campaignPubkey,
    })
    .transaction();

  return tx;
};

// Format dispute seconds for display
export const formatDisputeWindow = (seconds: number): string => {
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
};

// Validate dispute window (in seconds)
export const validateDisputeWindow = (seconds: number): {
  isValid: boolean;
  error?: string;
} => {
  if (seconds < 0) {
    return { isValid: false, error: 'Dispute window cannot be negative' };
  }

  if (seconds < 60) { // Less than 1 minute
    return { isValid: false, error: 'Dispute window must be at least 1 minute' };
  }

  if (seconds > 30 * 24 * 60 * 60) { // More than 30 days
    return { isValid: false, error: 'Dispute window cannot exceed 30 days' };
  }

  return { isValid: true };
};

// Time conversion utilities
export const minutesToSeconds = (minutes: number): number => {
  return Math.floor(minutes * 60);
};

export const hoursToSeconds = (hours: number): number => {
  return Math.floor(hours * 60 * 60);
};

export const daysToSeconds = (days: number): number => {
  return Math.floor(days * 24 * 60 * 60);
};

export const secondsToMinutes = (seconds: number): number => {
  return seconds / 60;
};

export const secondsToHours = (seconds: number): number => {
  return seconds / (60 * 60);
};

export const secondsToDays = (seconds: number): number => {
  return seconds / (24 * 60 * 60);
};

// Convert time with unit to seconds
export const timeToSeconds = (value: number, unit: 'minutes' | 'hours' | 'days'): number => {
  switch (unit) {
    case 'minutes':
      return minutesToSeconds(value);
    case 'hours':
      return hoursToSeconds(value);
    case 'days':
      return daysToSeconds(value);
    default:
      return value;
  }
};
