import { Program, AnchorProvider, Idl, BN } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { IDL } from './idl';
import { CROWDFUNDING_PROGRAM_ID } from './config';

// Create program instance
export const createProgram = (connection: Connection, wallet: any): Program => {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });

  return new Program(IDL, provider);
};

// PDA Seeds
export const CAMPAIGN_SEED = 'campaign';
export const VAULT_SEED = 'vault';
export const RECEIPT_SEED = 'receipt';

// PDA Helper Functions
export const getCampaignPDA = (creator: PublicKey, title: string): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(CAMPAIGN_SEED),
      creator.toBuffer(),
      Buffer.from(title.slice(0, 32)), // Limit title to 32 bytes for PDA
    ],
    CROWDFUNDING_PROGRAM_ID
  );
};

export const getVaultPDA = (campaign: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(VAULT_SEED),
      campaign.toBuffer(),
    ],
    CROWDFUNDING_PROGRAM_ID
  );
};

export const getReceiptPDA = (campaign: PublicKey, donor: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(RECEIPT_SEED),
      campaign.toBuffer(),
      donor.toBuffer(),
    ],
    CROWDFUNDING_PROGRAM_ID
  );
};

// Account Fetching Utilities
export class CrowdfundingClient {
  constructor(
    public program: Program,
    public connection: Connection
  ) { }

  // Fetch a single campaign
  async getCampaign(campaignPubkey: PublicKey) {
    try {
      return await (this.program.account as any).campaign.fetch(campaignPubkey);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      return null;
    }
  }

  // Fetch all campaigns
  async getAllCampaigns() {
    try {
      return await (this.program.account as any).campaign.all();
    } catch (error) {
      console.error('Error fetching all campaigns:', error);
      return [];
    }
  }

  // Fetch campaigns by creator
  async getCampaignsByCreator(creator: PublicKey) {
    try {
      return await (this.program.account as any).campaign.all([
        {
          memcmp: {
            offset: 8, // Discriminator offset
            bytes: creator.toBase58(),
          },
        },
      ]);
    } catch (error) {
      console.error('Error fetching campaigns by creator:', error);
      return [];
    }
  }

  // Fetch donation receipt
  async getDonationReceipt(receiptPubkey: PublicKey) {
    try {
      return await (this.program.account as any).donationReceipt.fetch(receiptPubkey);
    } catch (error) {
      console.error('Error fetching donation receipt:', error);
      return null;
    }
  }

  // Fetch all donation receipts for a campaign
  async getDonationReceiptsForCampaign(campaign: PublicKey) {
    try {
      return await (this.program.account as any).donationReceipt.all([
        {
          memcmp: {
            offset: 8, // Discriminator offset
            bytes: campaign.toBase58(),
          },
        },
      ]);
    } catch (error) {
      console.error('Error fetching donation receipts for campaign:', error);
      return [];
    }
  }

  // Fetch donation receipts by donor
  async getDonationReceiptsByDonor(donor: PublicKey) {
    try {
      return await (this.program.account as any).donationReceipt.all([
        {
          memcmp: {
            offset: 40, // Offset for donor field (8 + 32 bytes)
            bytes: donor.toBase58(),
          },
        },
      ]);
    } catch (error) {
      console.error('Error fetching donation receipts by donor:', error);
      return [];
    }
  }

  // Check if campaign exists
  async campaignExists(campaignPubkey: PublicKey): Promise<boolean> {
    try {
      const campaign = await this.getCampaign(campaignPubkey);
      return campaign !== null;
    } catch (error) {
      return false;
    }
  }

  // Check if donation receipt exists
  async receiptExists(receiptPubkey: PublicKey): Promise<boolean> {
    try {
      const receipt = await this.getDonationReceipt(receiptPubkey);
      return receipt !== null;
    } catch (error) {
      return false;
    }
  }

  // Get campaign vault balance
  async getVaultBalance(vaultPubkey: PublicKey): Promise<number> {
    try {
      return await this.connection.getBalance(vaultPubkey);
    } catch (error) {
      console.error('Error fetching vault balance:', error);
      return 0;
    }
  }

  // Utility function to convert BN to number safely
  static bnToNumber(bn: BN): number {
    return bn.toNumber();
  }

  // Utility function to convert number to BN
  static numberToBN(num: number): BN {
    return new BN(num);
  }
}

// Helper function to create client instance
export const createCrowdfundingClient = (
  connection: Connection,
  wallet: any
): CrowdfundingClient => {
  const program = createProgram(connection, wallet);
  return new CrowdfundingClient(program, connection);
};
