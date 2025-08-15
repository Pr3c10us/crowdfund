import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

// Network configuration
export const NETWORKS = {
  [WalletAdapterNetwork.Devnet]: {
    name: 'Devnet',
    endpoint: clusterApiUrl(WalletAdapterNetwork.Devnet),
    commitment: 'confirmed' as const,
  },
  [WalletAdapterNetwork.Mainnet]: {
    name: 'Mainnet Beta',
    endpoint: clusterApiUrl(WalletAdapterNetwork.Mainnet),
    commitment: 'confirmed' as const,
  },
  [WalletAdapterNetwork.Testnet]: {
    name: 'Testnet',
    endpoint: clusterApiUrl(WalletAdapterNetwork.Testnet),
    commitment: 'confirmed' as const,
  },
} as const;

// Default network
export const DEFAULT_NETWORK = WalletAdapterNetwork.Devnet;
export const NETWORK = DEFAULT_NETWORK;
export const ENDPOINT = NETWORKS[NETWORK].endpoint;

// Create connection with auto-reconnection
export const createConnection = (network: WalletAdapterNetwork = DEFAULT_NETWORK) => {
  const config = NETWORKS[network];
  return new Connection(config.endpoint, {
    commitment: config.commitment,
    confirmTransactionInitialTimeout: 60000,
    wsEndpoint: config.endpoint.replace('https://', 'wss://').replace('http://', 'ws://'),
  });
};

export const connection = createConnection(NETWORK);

// Program ID for the crowdfunding smart contract
export const CROWDFUNDING_PROGRAM_ID = new PublicKey('6jzv4ApJTAWKWu8puDgMpzwV2pMGLp1nvDUoYrpMUjVM');

// Constants
export const LAMPORTS_PER_SOL = 1000000000;

// Helper functions
export const formatSol = (lamports: number): string => {
  return (lamports / LAMPORTS_PER_SOL).toFixed(4);
};

export const parseInputToLamports = (solAmount: string): number => {
  return Math.floor(parseFloat(solAmount) * LAMPORTS_PER_SOL);
};
