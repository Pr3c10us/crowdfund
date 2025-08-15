import * as anchor from "@coral-xyz/anchor";
import { Crowdfunding } from "../target/types/crowdfunding";
import { assert } from "chai";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { BankrunProvider } from "anchor-bankrun";
import { startAnchor, Clock } from "solana-bankrun";
import { expect } from "chai";

const IDL = require("../target/idl/crowdfunding.json");
const PROGRAM_ID = new PublicKey(IDL.address);

describe("crowdfunding", () => {
  // Shared handles
  let provider: BankrunProvider;
  let program: anchor.Program<Crowdfunding>;

  // Test actors
  const authorithy = Keypair.generate();
  const creator = Keypair.generate();
  const donorA = Keypair.generate();
  const donorB = Keypair.generate();
  const donorC = Keypair.generate();
  let campaign: Keypair;
  let failedCampaign: Keypair;
  let expiredCampaign: Keypair;

  // Constants
  const TARGET_LAMPORTS = 10 * LAMPORTS_PER_SOL;
  const DONATION_A_AMOUNT = 6 * LAMPORTS_PER_SOL;
  const DONATION_B_AMOUNT = 5 * LAMPORTS_PER_SOL;
  const DONATION_C_AMOUNT = 2 * LAMPORTS_PER_SOL;
  const DURATION_SECONDS = 10;
  const DISPUTE_SECONDS = 60 * 60;
  const SHORT_DURATION = 1; // 1 second for testing expiration
  const MILESTONES = [
    new anchor.BN(TARGET_LAMPORTS * 0.2),
    new anchor.BN(TARGET_LAMPORTS * 0.3),
    new anchor.BN(TARGET_LAMPORTS * 0.5),
  ];
  const MILESTONES_DESCRIPTION = [
    "First Milestone",
    "Second Milestone",
    "Third Milestone",
  ];


  /** Fund a keypair with `sol` SOL */
  async function fund(keypair: Keypair, sol: number) {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: keypair.publicKey,
        lamports: sol * LAMPORTS_PER_SOL,
      })
    );
    await provider.sendAndConfirm(tx, [provider.wallet.payer]);
  }

  /** Get vault PDA for a campaign */
  function getVaultPDA(campaignKey: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), campaignKey.toBuffer()],
      PROGRAM_ID
    );
  }

  /** Get receipt PDA for a donor and campaign */
  function getReceiptPDA(campaignKey: PublicKey, donorKey: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("receipt"), campaignKey.toBuffer(), donorKey.toBuffer()],
      PROGRAM_ID
    );
  }

  /** Sleep for specified seconds */
  function sleep(seconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  // ---------- global setup ----------
  before(async () => {
    const context = await startAnchor(
      "",
      [{ name: "crowdfunding", programId: PROGRAM_ID }],
      []
    );
    provider = new BankrunProvider(context);
    program = new anchor.Program<Crowdfunding>(IDL, provider);

    // Seed accounts for fees/donations
    await fund(authorithy, 50);
    await fund(creator, 5);
    await fund(donorA, 10);
    await fund(donorB, 8);
    await fund(donorC, 5);
  });

  // ---------- Initialize Contract -----------
  describe("initialize_contract", () => {
    it("initialize_contract", async () => {
      await program.methods
        .initiateContract(
          new anchor.BN(DISPUTE_SECONDS),
        )
        .accounts({
          authority: authorithy.publicKey,
        })
        .signers([authorithy])
        .rpc();

      let systemConfigPDA = PublicKey.findProgramAddressSync(
        [Buffer.from("system_config")],
        PROGRAM_ID
      );

      const data = await program.account.systemConfig.fetch(systemConfigPDA[0]);
      console.log({ dispute: data.disputeSeconds.toNumber() });

      expect(data.authorithy.equals(authorithy.publicKey)).true;
      expect(data.disputeSeconds.toNumber()).equal(DISPUTE_SECONDS);
    })

    it("fails to initialize config again", async () => {
      try {
        await program.methods
          .initiateContract(
            new anchor.BN(DISPUTE_SECONDS),
          )
          .accounts({
            authority: authorithy.publicKey,
          })
          .signers([authorithy])
          .rpc();
        expect.fail("Should have failed");
      } catch (error) {
      }
    });

  })

  // ---------- create-campaign suite ----------
  describe("create_campaign", () => {
    it("creates a new campaign successfully", async () => {
      campaign = Keypair.generate();
      const [vaultPDA] = getVaultPDA(campaign.publicKey);

      await program.methods
        .createCampaign(
          new anchor.BN(DURATION_SECONDS),
          MILESTONES,
          MILESTONES_DESCRIPTION,
          "Test Campaign",
          "This should contain enough words to serve as a description",
          "demo_url"
        )
        .accounts({
          campaign: campaign.publicKey,
          creator: creator.publicKey,
        })
        .signers([campaign, creator])
        .rpc();

      const data = await program.account.campaign.fetch(campaign.publicKey);
      expect(data.creator.equals(creator.publicKey)).true;
      expect(data.vault.equals(vaultPDA)).true;
      expect(data.targetLamports.toNumber()).equal(TARGET_LAMPORTS);
      expect(data.totalDonated.toNumber()).equal(0);
      expect(data.milestoneCount).equal(MILESTONES.length);
      expect(data.milestones[0].released).false;
      expect(data.lastReleaseTs.toNumber()).equal(0);
      expect(data.title).equal("Test Campaign");
      expect(data.description).equal("This should contain enough words to serve as a description");
      expect(data.imageUrl).equal("demo_url");

      // Check milestones are properly initialized
      for (let i = 0; i < MILESTONES.length; i++) {
        expect(data.milestones[i].amount.toNumber()).equal(MILESTONES[i].toNumber());
        expect(data.milestones[i].description).equal(MILESTONES_DESCRIPTION[i]);
        expect(data.milestones[i].released).false;
      }
    });

    it("fails to create campaign with too many milestones", async () => {
      const tooManyMilestones = Array(6).fill(new anchor.BN(LAMPORTS_PER_SOL));
      const tooManyMilestonesDescription = Array(6).fill("empty");

      const badCampaign = Keypair.generate();

      try {
        await program.methods
          .createCampaign(
            new anchor.BN(DURATION_SECONDS),
            tooManyMilestones,
            tooManyMilestonesDescription,
            "Bad Campaign",
            "bad campaign description",
            "bad_campaign url"
          )
          .accounts({
            campaign: badCampaign.publicKey,
            creator: creator.publicKey,
          })
          .signers([badCampaign, creator])
          .rpc();
        expect.fail("Should have failed with too many milestones");
      } catch (error) {
        let msg = error.message as string
        expect(msg.includes('Error Code: BadMilestone')).true
      }
    });

    it("creates a failed campaign for refund testing", async () => {
      failedCampaign = Keypair.generate();
      const [vaultPDA] = getVaultPDA(failedCampaign.publicKey);

      await program.methods
        .createCampaign(
          new anchor.BN(SHORT_DURATION),
          MILESTONES,
          MILESTONES_DESCRIPTION,
          "Failed Campaign",
          "bad campaign description",
          "bad_campaign url"
        )
        .accounts({
          campaign: failedCampaign.publicKey,
          creator: creator.publicKey,
        })
        .signers([failedCampaign, creator])
        .rpc();

      const data = await program.account.campaign.fetch(failedCampaign.publicKey);
      expect(data.creator.equals(creator.publicKey)).true;
    });
  });

  // ---------- donate suite ----------
  describe("donate", () => {
    it("allows donations to active campaign", async () => {
      const [vaultPDA] = getVaultPDA(campaign.publicKey);
      const [receiptPDA] = getReceiptPDA(campaign.publicKey, donorA.publicKey);
      const vaultData = await provider.connection.getAccountInfo(vaultPDA)
      console.log({ vaultData });

      const vaultBalanceBefore = (vaultData).lamports;


      await program.methods
        .donate(new anchor.BN(DONATION_A_AMOUNT))
        .accounts({
          donor: donorA.publicKey,
          campaign: campaign.publicKey,
        })
        .signers([donorA])
        .rpc();

      // Check campaign state updated
      const campaignData = await program.account.campaign.fetch(campaign.publicKey);
      assert.equal(campaignData.totalDonated.toNumber(), DONATION_A_AMOUNT);

      // Check receipt created
      const receiptData = await program.account.donationReceipt.fetch(receiptPDA);
      expect(receiptData.campaign.equals(campaign.publicKey)).true;
      expect(receiptData.donor.equals(donorA.publicKey)).true;
      expect(receiptData.lamports.toNumber()).equal(DONATION_A_AMOUNT);
      expect(receiptData.refunded).false;

      // Check vault received funds
      const vaultBalanceAfter = (await provider.connection.getAccountInfo(vaultPDA)).lamports;

      expect(vaultBalanceAfter - vaultBalanceBefore).equal(DONATION_A_AMOUNT);
    });

    it("allows multiple donations from same donor", async () => {
      const [receiptPDA] = getReceiptPDA(campaign.publicKey, donorA.publicKey);

      const additionalAmount = 1 * LAMPORTS_PER_SOL;

      await program.methods
        .donate(new anchor.BN(additionalAmount))
        .accounts({
          donor: donorA.publicKey,
          campaign: campaign.publicKey,
        })
        .signers([donorA])
        .rpc();

      // Check receipt updated
      const receiptData = await program.account.donationReceipt.fetch(receiptPDA);
      expect(receiptData.lamports.toNumber()).equal(DONATION_A_AMOUNT + additionalAmount);

      // Check campaign total updated
      const campaignData = await program.account.campaign.fetch(campaign.publicKey);
      expect(campaignData.totalDonated.toNumber()).equal(DONATION_A_AMOUNT + additionalAmount);
    });

    it("allows donations from multiple donors", async () => {
      await program.methods
        .donate(new anchor.BN(DONATION_B_AMOUNT))
        .accounts({
          donor: donorB.publicKey,
          campaign: campaign.publicKey,
        })
        .signers([donorB])
        .rpc();

      // Check campaign reaches target
      const campaignData = await program.account.campaign.fetch(campaign.publicKey);
      const expectedTotal = DONATION_A_AMOUNT + LAMPORTS_PER_SOL + DONATION_B_AMOUNT;
      expect(campaignData.totalDonated.toNumber()).equal(expectedTotal);
      expect(campaignData.totalDonated.toNumber() >= TARGET_LAMPORTS).true;
    });

    it("fails to donate to expired campaign", async () => {
      const vaultData = await program.account.campaign.fetch(failedCampaign.publicKey);

      // Get the current context and advance the clock
      const currentClock = await provider.context.banksClient.getClock();
      provider.context.setClock(
        new Clock(
          currentClock.slot,
          currentClock.epochStartTimestamp,
          currentClock.epoch,
          currentClock.leaderScheduleEpoch,
          BigInt(vaultData.endTs.toNumber() + 2),
        ),
      );

      // Advance the clock by more than SHORT_DURATION (1 second)
      await provider.context.warpToSlot(
        currentClock.slot + BigInt(100) // Advance by 100 slots to ensure time passes
      );

      try {
        await program.methods
          .donate(new anchor.BN(DONATION_C_AMOUNT))
          .accounts({
            donor: donorC.publicKey,
            campaign: failedCampaign.publicKey,
          })
          .signers([donorC])
          .rpc();
        expect.fail("Should have failed to donate to expired campaign");
      } catch (error) {
        expect(error.message).to.include("Campaign not yet ended or already successful");
      }
    });


    it("allows donation to failed campaign before expiry", async () => {
      // Create fresh campaign that hasn't expired yet
      const freshCampaign = Keypair.generate();

      await program.methods
        .createCampaign(
          new anchor.BN(2), // 2 seconds
          MILESTONES,
          MILESTONES_DESCRIPTION,
          "Test Campaign",
          "This should contain enough words to serve as a description",
          "demo_url"

        )
        .accounts({
          campaign: freshCampaign.publicKey,
          creator: creator.publicKey,
        })
        .signers([freshCampaign, creator])
        .rpc();

      await program.methods
        .donate(new anchor.BN(DONATION_C_AMOUNT))
        .accounts({
          donor: donorC.publicKey,
          campaign: freshCampaign.publicKey,
        })
        .signers([donorC])
        .rpc();

      const campaignData = await program.account.campaign.fetch(freshCampaign.publicKey);
      expect(campaignData.totalDonated.toNumber()).equal(DONATION_C_AMOUNT);

      // Store for refund testing
      failedCampaign = freshCampaign;
    });
  });

  // // ---------- release suite ----------
  describe("release", () => {
    it("fails to release milestone before initial dispute period ends", async () => {
      try {
        await program.methods
          .release(0) // First milestone
          .accounts({
            creator: creator.publicKey,
            campaign: campaign.publicKey,
          })
          .signers([creator])
          .rpc();

        expect.fail("Should have failed due to dispute window");
      } catch (error) {
        assert.include(error.message, "DisputeWindowOpen");
      }
    });

    it("fails to release milestone after campaign is locked", async () => {
      const currentClock = await provider.context.banksClient.getClock();
      provider.context.setClock(
        new Clock(
          currentClock.slot,
          currentClock.epochStartTimestamp,
          currentClock.epoch,
          currentClock.leaderScheduleEpoch,
          currentClock.unixTimestamp + BigInt(+ DISPUTE_SECONDS + 2),
        ),
      );

      await program.methods.lockCampaign(true)
        .accounts({ authority: authorithy.publicKey, campaign: campaign.publicKey })
        .signers([authorithy])
        .rpc()

      try {
        await program.methods
          .release(0) // First milestone
          .accounts({
            creator: creator.publicKey,
            campaign: campaign.publicKey,
          })
          .signers([creator])
          .rpc();

        expect.fail("Should have failed due to dispute window");
      } catch (error) {
        console.log(error.message);

        assert.include(error.message, "CampaignLocked");
      }
    });

    it("allows creator to release first milestone after target reached", async () => {
      const [vaultPDA] = getVaultPDA(campaign.publicKey);
      const creatorBalanceBefore = (await provider.connection.getAccountInfo(creator.publicKey)).lamports
      const vaultBalanceBefore = (await provider.connection.getAccountInfo(vaultPDA)).lamports;

      const currentClock = await provider.context.banksClient.getClock();
      provider.context.setClock(
        new Clock(
          currentClock.slot,
          currentClock.epochStartTimestamp,
          currentClock.epoch,
          currentClock.leaderScheduleEpoch,
          currentClock.unixTimestamp + BigInt(+ DISPUTE_SECONDS + 2),
        ),
      );

      await program.methods.lockCampaign(false)
        .accounts({ authority: authorithy.publicKey, campaign: campaign.publicKey })
        .signers([authorithy])
        .rpc()

      await program.methods
        .release(0) // First milestone
        .accounts({
          creator: creator.publicKey,
          campaign: campaign.publicKey,
        })
        .signers([creator])
        .rpc();

      // Check milestone marked as released
      const campaignData = await program.account.campaign.fetch(campaign.publicKey);
      assert.isTrue(campaignData.milestones[0].released);
      assert.isAbove(campaignData.lastReleaseTs.toNumber(), 0);

      // Check funds transferred
      const creatorBalanceAfter = (await provider.connection.getAccountInfo(creator.publicKey)).lamports;
      const vaultBalanceAfter = (await provider.connection.getAccountInfo(vaultPDA)).lamports;

      const expectedAmount = MILESTONES[0].toNumber();
      assert.approximately(
        creatorBalanceAfter - creatorBalanceBefore,
        expectedAmount,
        1000 // Allow for small rounding errors
      );
      expect(vaultBalanceBefore - vaultBalanceAfter).equal(expectedAmount);
    });

    it("fails to release milestone before dispute period ends", async () => {
      try {
        await program.methods
          .release(1) // Second milestone
          .accounts({
            creator: creator.publicKey,
            campaign: campaign.publicKey,
          })
          .signers([creator])
          .rpc();
        expect.fail("Should have failed due to dispute window");
      } catch (error) {
        assert.include(error.message, "DisputeWindowOpen");
      }
    });

    it("fails to release already released milestone", async () => {
      try {
        await program.methods
          .release(0) // First milestone already released
          .accounts({
            creator: creator.publicKey,
            campaign: campaign.publicKey,
          })
          .signers([creator])
          .rpc();
        expect.fail("Expected an error but the instruction succeeded");
      } catch (error) {
        assert.include(error.message, "AlreadyReleased");
      }
    });

    it("fails to release milestone with invalid index", async () => {
      try {
        await program.methods
          .release(10) // Invalid index
          .accounts({
            creator: creator.publicKey,
            campaign: campaign.publicKey,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have failed with invalid milestone index");
      } catch (error) {
        assert.include(error.message, "InvalidMilestone");
      }
    });

    it("fails when non-creator tries to release milestone", async () => {
      try {
        await program.methods
          .release(1)
          .accounts({
            creator: donorA.publicKey,
            campaign: campaign.publicKey,
          })
          .signers([donorA])
          .rpc();
        assert.fail("Should have failed - not the creator");
      } catch (error) {
        assert.include(error.message, "UnAuthorized");
      }
    });

    it("fails to release milestone when target not reached", async () => {
      // Create new campaign with high target
      const highTargetCampaign = Keypair.generate();

      await program.methods
        .createCampaign(
          new anchor.BN(DURATION_SECONDS),
          MILESTONES.map(m => new anchor.BN(10 * LAMPORTS_PER_SOL)), // High milestone amounts
          MILESTONES_DESCRIPTION,
          "Test Campaign",
          "This should contain enough words to serve as a description",
          "demo_url"
        )
        .accounts({
          campaign: highTargetCampaign.publicKey,
          creator: creator.publicKey,
        })
        .signers([highTargetCampaign, creator])
        .rpc();

      try {
        await program.methods
          .release(0)
          .accounts({
            creator: creator.publicKey,
            campaign: highTargetCampaign.publicKey,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have failed - target not reached");
      } catch (error) {
        assert.include(error.message, "TargetNotReached");
      }
    });
  });

  // // ---------- refund suite ----------
  describe("refund", () => {
    before(async () => {
      const vaultData = await program.account.campaign.fetch(failedCampaign.publicKey);

      // Get the current context and advance the clock
      const currentClock = await provider.context.banksClient.getClock();
      provider.context.setClock(
        new Clock(
          currentClock.slot,
          currentClock.epochStartTimestamp,
          currentClock.epoch,
          currentClock.leaderScheduleEpoch,
          BigInt(vaultData.endTs.toNumber() + 2),
        ),
      );
    });

    it("allows refund for failed campaign", async () => {
      const [vaultPDA] = getVaultPDA(failedCampaign.publicKey);
      const [receiptPDA] = getReceiptPDA(failedCampaign.publicKey, donorC.publicKey);

      const donorBalanceBefore = (await provider.connection.getAccountInfo(donorC.publicKey)).lamports;
      const vaultBalanceBefore = (await provider.connection.getAccountInfo(vaultPDA)).lamports;

      await program.methods
        .refund()
        .accounts({
          donor: donorC.publicKey,
          campaign: failedCampaign.publicKey,
        })
        .signers([donorC])
        .rpc();

      // Check receipt marked as refunded
      const receiptData = await program.account.donationReceipt.fetch(receiptPDA);
      assert.isTrue(receiptData.refunded);

      // Check funds returned
      const donorBalanceAfter = (await provider.connection.getAccountInfo(donorC.publicKey)).lamports;
      const vaultBalanceAfter = (await provider.connection.getAccountInfo(vaultPDA)).lamports;

      assert.approximately(
        donorBalanceAfter - donorBalanceBefore,
        DONATION_C_AMOUNT,
        1000 // Allow for transaction fees
      );
      assert.equal(vaultBalanceBefore - vaultBalanceAfter, DONATION_C_AMOUNT);
    });

    it("fails to refund twice", async () => {
      try {
        await program.methods
          .refund()
          .accounts({
            donor: donorC.publicKey,
            campaign: failedCampaign.publicKey,
          })
          .signers([donorC])
          .rpc();
        assert.fail("Should have failed - already refunded");
      } catch (error) {
        assert.include(error.message, "NothingToRefund");
      }
    });

    it("fails to refund successful campaign", async () => {
      try {
        await program.methods
          .refund()
          .accounts({
            donor: donorA.publicKey,
            campaign: campaign.publicKey,
          })
          .signers([donorA])
          .rpc();
        assert.fail("Should have failed - campaign was successful");
      } catch (error) {
        assert.include(error.message, "NotFailed");
      }
    });

    it("fails to refund non-expired campaign", async () => {
      // Create a fresh campaign that's not expired
      const activeCampaign = Keypair.generate();
      const [vaultPDA] = getVaultPDA(activeCampaign.publicKey);

      await program.methods
        .createCampaign(
          new anchor.BN(100), // Long duration
          MILESTONES,
          MILESTONES_DESCRIPTION,
          "Test Campaign",
          "This should contain enough words to serve as a description",
          "demo_url"
        )
        .accounts({
          campaign: activeCampaign.publicKey,
          creator: creator.publicKey,
        })
        .signers([activeCampaign, creator])
        .rpc();

      // Make a small donation
      const [receiptPDA] = getReceiptPDA(activeCampaign.publicKey, donorA.publicKey);
      await program.methods
        .donate(new anchor.BN(LAMPORTS_PER_SOL))
        .accounts({
          donor: donorA.publicKey,
          campaign: activeCampaign.publicKey,
        })
        .signers([donorA])
        .rpc();

      try {
        await program.methods
          .refund()
          .accounts({
            donor: donorA.publicKey,
            campaign: activeCampaign.publicKey,
          })
          .signers([donorA])
          .rpc();
        assert.fail("Should have failed - campaign still active");
      } catch (error) {
        assert.include(error.message, "NotFailed");
      }
    });
  });

  // // ---------- integration tests ----------
  describe("integration", () => {
    it("complete campaign lifecycle - success path", async () => {
      // Create new campaign
      const integrationCampaign = Keypair.generate();

      await program.methods
        .createCampaign(
          new anchor.BN(10),
          [new anchor.BN(2 * LAMPORTS_PER_SOL), new anchor.BN(3 * LAMPORTS_PER_SOL)],
          ["First Milestone", "Second Milestone"],
          "Integration Test Campaign",
          "Integration Test Campaign Description",
          "demo_URL"
        )
        .accounts({
          campaign: integrationCampaign.publicKey,
          creator: creator.publicKey,
        })
        .signers([integrationCampaign, creator])
        .rpc();

      // Multiple donors contribute
      const donors = [donorA, donorB];
      const amounts = [3 * LAMPORTS_PER_SOL, 3 * LAMPORTS_PER_SOL];

      for (let i = 0; i < donors.length; i++) {
        await fund(donors[i], 5)
        const [receiptPDA] = getReceiptPDA(integrationCampaign.publicKey, donors[i].publicKey);
        await program.methods
          .donate(new anchor.BN(amounts[i]))
          .accounts({
            donor: donors[i].publicKey,
            campaign: integrationCampaign.publicKey,
          })
          .signers([donors[i]])
          .rpc();
      }
      const initCurrentClock = await provider.context.banksClient.getClock();
      provider.context.setClock(
        new Clock(
          initCurrentClock.slot,
          initCurrentClock.epochStartTimestamp,
          initCurrentClock.epoch,
          initCurrentClock.leaderScheduleEpoch,
          initCurrentClock.unixTimestamp + BigInt(+ DISPUTE_SECONDS + 2),
        ),
      );


      // Release first milestone
      await program.methods
        .release(0)
        .accounts({
          creator: creator.publicKey,
          campaign: integrationCampaign.publicKey,
        })
        .signers([creator])
        .rpc();

      // Wait for dispute period
      const campaignData = await program.account.campaign.fetch(integrationCampaign.publicKey);

      const currentClock = await provider.context.banksClient.getClock();
      provider.context.setClock(
        new Clock(
          currentClock.slot,
          currentClock.epochStartTimestamp,
          currentClock.epoch,
          currentClock.leaderScheduleEpoch,
          currentClock.unixTimestamp + BigInt(520000),
        ),
      );

      // Release second milestone
      await program.methods
        .release(1)
        .accounts({
          creator: creator.publicKey,
          campaign: integrationCampaign.publicKey,
        })
        .signers([creator])
        .rpc();

      // Verify final state
      const finalCampaignData = await program.account.campaign.fetch(integrationCampaign.publicKey);
      assert.isTrue(finalCampaignData.milestones[0].released);
      assert.isTrue(finalCampaignData.milestones[1].released);
      assert.equal(finalCampaignData.totalDonated.toNumber(), 6 * LAMPORTS_PER_SOL);
    });
  });
});