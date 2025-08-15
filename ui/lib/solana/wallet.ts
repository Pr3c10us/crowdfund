import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
  MathWalletAdapter,
  Coin98WalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { GlowWalletAdapter } from '@solana/wallet-adapter-glow';

// Primary wallets (most popular)
export const getPrimaryWallets = (network: WalletAdapterNetwork) => [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter({ network }),
  new BackpackWalletAdapter(),
  new GlowWalletAdapter(),
];

// Secondary wallets (additional options)
export const getSecondaryWallets = (network: WalletAdapterNetwork) => [
  new TorusWalletAdapter(),
  new LedgerWalletAdapter(),
  new MathWalletAdapter(),
  new Coin98WalletAdapter(),
];

// Get all wallets
export const getAllWallets = (network: WalletAdapterNetwork) => [
  ...getPrimaryWallets(network),
  ...getSecondaryWallets(network),
];

// Default export for backward compatibility
export const wallets = getAllWallets(WalletAdapterNetwork.Devnet);

export { WalletAdapterNetwork };
