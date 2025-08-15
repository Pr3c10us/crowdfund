export type PublicKeyString = string;

export interface Campaign {
  publicKey: PublicKeyString;
  creator: PublicKeyString;
  title: string;
  description: string;
  targetLamports: number;
  deadline: number; // unix timestamp (seconds)
  raisedLamports: number;
}
