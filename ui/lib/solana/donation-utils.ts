import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { AnchorProvider, Program, BN, Wallet } from '@coral-xyz/anchor';
import { IDL } from './idl';
import { CROWDFUNDING_PROGRAM_ID } from './config';

// SOL to USD conversion (mock - in production, use real price API)
export const SOL_TO_USD_RATE = 100; // Mock rate

export const convertSolToUsd = (solAmount: number): number => {
  return solAmount * SOL_TO_USD_RATE;
};

export const convertUsdToSol = (usdAmount: number): number => {
  return usdAmount / SOL_TO_USD_RATE;
};

export const convertLamportsToSol = (lamports: BN | number | undefined | null): number => {
  if (lamports === undefined || lamports === null) {
    return 0;
  }
  const lamportsNum = typeof lamports === 'number' ? lamports : lamports.toNumber();
  return lamportsNum / LAMPORTS_PER_SOL;
};

export const convertSolToLamports = (sol: number): BN => {
  return new BN(Math.floor(sol * LAMPORTS_PER_SOL));
};

// Preset donation amounts in SOL
export const PRESET_AMOUNTS = [0.1, 0.5, 1, 2, 5, 10];

// Estimate transaction fee (approximate)
export const estimateTransactionFee = async (connection: Connection): Promise<number> => {
  try {
    const { feeCalculator } = await connection.getRecentBlockhash();
    return feeCalculator.lamportsPerSignature / LAMPORTS_PER_SOL;
  } catch (error) {
    console.warn('Failed to estimate transaction fee:', error);
    return 0.000005; // Default estimate in SOL
  }
};

// Validate donation amount
export const validateDonationAmount = (amount: number, walletBalance?: number): {
  isValid: boolean;
  error?: string;
} => {
  if (amount <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }

  if (amount < 0.001) {
    return { isValid: false, error: 'Minimum donation is 0.001 SOL' };
  }

  if (walletBalance !== undefined && amount > walletBalance) {
    return { isValid: false, error: 'Insufficient wallet balance' };
  }

  return { isValid: true };
};

// Get vault PDA for campaign
export const getVaultPda = (campaignPubkey: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), campaignPubkey.toBuffer()],
    CROWDFUNDING_PROGRAM_ID
  );
};

// Get receipt PDA for donation
export const getReceiptPda = (campaignPubkey: PublicKey, donorPubkey: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('receipt'), campaignPubkey.toBuffer(), donorPubkey.toBuffer()],
    CROWDFUNDING_PROGRAM_ID
  );
};

// Create donation transaction
export const createDonationTransaction = async (
  connection: Connection,
  donor: PublicKey,
  campaignPubkey: PublicKey,
  amount: BN,
  wallet: Wallet
): Promise<Transaction> => {
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(IDL as any, provider);
  
  const [vaultPda] = getVaultPda(campaignPubkey);
  const [receiptPda] = getReceiptPda(campaignPubkey, donor);

  const tx = await program.methods
    .donate(amount)
    .accounts({
      donor,
      campaign: campaignPubkey,
      vault: vaultPda,
      receipt: receiptPda,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return tx;
};

// Format transaction signature for explorer
export const getExplorerUrl = (signature: string, network: 'devnet' | 'mainnet' | 'testnet' = 'devnet'): string => {
  const cluster = network === 'mainnet' ? '' : `?cluster=${network}`;
  return `https://explorer.solana.com/tx/${signature}${cluster}`;
};

// Format wallet address for display
export const formatWalletAddress = (address: string, length: number = 8): string => {
  if (address.length <= length * 2) return address;
  return `${address.slice(0, length)}...${address.slice(-length)}`;
};

// Calculate donation impact
export const calculateDonationImpact = (donationAmount: number, targetAmount: number, currentAmount: number) => {
  const newTotal = currentAmount + donationAmount;
  const newProgress = Math.min((newTotal / targetAmount) * 100, 100);
  const progressIncrease = newProgress - (currentAmount / targetAmount) * 100;
  
  return {
    newTotal,
    newProgress,
    progressIncrease,
    willComplete: newTotal >= targetAmount,
  };
};
