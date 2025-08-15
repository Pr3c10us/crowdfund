import type { Idl } from "@coral-xyz/anchor";
// Import the generated IDL JSON from public (relative path)
import idlJson from "../../../public/crowdfunding.json";

export const CROWDFUNDING_IDL = idlJson as unknown as Idl & {
  address: string;
};

export const PROGRAM_ID = CROWDFUNDING_IDL.address;
