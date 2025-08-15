"use client";

import { useMemo } from "react";
import * as anchor from "@coral-xyz/anchor";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { getProgram } from "@/lib/solana/client";

export function useProgram() {
  const wallet = useAnchorWallet();

  return useMemo(() => {
    if (!wallet) return null;
    return getProgram(wallet as unknown as anchor.Wallet);
  }, [wallet]);
}
