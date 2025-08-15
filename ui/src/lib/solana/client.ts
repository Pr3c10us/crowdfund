"use client";

import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { CROWDFUNDING_IDL, PROGRAM_ID } from "./idl";

export function getConnection(): Connection {
  const endpoint =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SOLANA_RPC_URL) ||
    anchor.web3.clusterApiUrl("devnet");
  return new Connection(endpoint, "confirmed");
}

export function getAnchorProvider(wallet: anchor.Wallet) {
  const connection = getConnection();
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);
  return provider;
}

export function getProgram(wallet: anchor.Wallet) {
  const provider = getAnchorProvider(wallet);
  const programId = new PublicKey(PROGRAM_ID);
  // Anchor's Program constructor overloads vary by version. Use a safe any-cast here.
  const ProgramCtor: any = anchor.Program as any;
  return new ProgramCtor(CROWDFUNDING_IDL as anchor.Idl, programId, provider);
}
