use anchor_lang::prelude::*;

declare_id!("21eoeoxSMhCR4vHwf7aAiZLCyVSHsmLrCZMPTBS7MM9U");

const MAX_MILESTONES: usize = 3;
// const AUTHORITHY: Pubkey = pubkey!("3AwdYohZksUuatMoLmK8CGo7zuNJsEPRPCREVvMNVw2f");
// const DISPUTE_SECONDS: i64 = 3 * 24 * 60 * 60; // 3 days

#[error_code]
pub enum CrowdfundError {
    #[msg("Campaign already active – config locked")]
    ConfigLocked,
    #[msg("Campaign not yet ended or already successful")]
    NotFailed,
    #[msg("Campaign still in dispute period")]
    InDispute,
    #[msg("Milestone already released or index out of bounds")]
    BadMilestone,
    #[msg("All milestone have been completed")]
    MilestoneComplete,
    #[msg("Target not reached")]
    TargetNotReached,
    #[msg("Nothing to refund")]
    NothingToRefund,
    #[msg("Invalid milestone index or already released")]
    InvalidMilestone,
    #[msg("Dispute window is still open")]
    DisputeWindowOpen,
    #[msg("Milestone already released")]
    AlreadyReleased,
    #[msg("previous milestone has not been realesed")]
    MilestoneNotReady,
    #[msg("Unauthorized to release funds")]
    UnAuthorized,
    #[msg("The funds in the campaign has been locked")]
    CampaignLocked,
    #[msg("System config not initialized")]
    ConfigNotInitialized,
    #[msg("System config already initialized")]
    ConfigInitialized,
}

#[program]
pub mod crowdfunding {
    use super::*;

    pub fn initiate_contract(ctx: Context<InitiateContract>, dispute_seconds: i64) -> Result<()> {
        require!(
            ctx.accounts.system_config.authorithy == Pubkey::default(),
            CrowdfundError::ConfigInitialized
        );
        let config = &mut ctx.accounts.system_config;
        config.authorithy = *ctx.accounts.authority.key;
        config.dispute_seconds = dispute_seconds;
        Ok(())
    }
    pub fn update_authorithy(ctx: Context<UpdateSystemConfig>, authority: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.system_config;
        config.authorithy = authority;
        Ok(())
    }
    pub fn update_dispute_seconds(
        ctx: Context<UpdateSystemConfig>,
        dispute_seconds: i64,
    ) -> Result<()> {
        let config = &mut ctx.accounts.system_config;
        config.dispute_seconds = dispute_seconds;
        Ok(())
    }
    pub fn lock_campaign(ctx: Context<LockCampaign>, status: bool) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        campaign.locked = status;
        Ok(())
    }

    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        duration_seconds: i64,
        milestone_amounts: Vec<u64>,
        milestone_description: Vec<String>,
        title: String,
        description: String,
        image_url: String,
    ) -> Result<()> {
        require!(
            ctx.accounts.system_config.authorithy != Pubkey::default(),
            CrowdfundError::ConfigNotInitialized
        );
        require!(
            milestone_amounts.len() <= MAX_MILESTONES && milestone_amounts.len() > 0,
            CrowdfundError::BadMilestone
        );
        require!(
            milestone_amounts.len() == milestone_description.len(),
            CrowdfundError::BadMilestone
        );

        let clock = Clock::get()?;
        let campaign = &mut ctx.accounts.campaign;
        campaign.creator = ctx.accounts.creator.key();
        campaign.vault = ctx.accounts.vault.key();
        campaign.target_lamports = milestone_amounts.iter().sum();
        campaign.start_ts = clock.unix_timestamp;
        campaign.end_ts = clock.unix_timestamp + duration_seconds;
        campaign.total_donated = 0;
        campaign.title = title;
        campaign.description = description;
        campaign.image_url = image_url;
        campaign.locked = false;
        campaign.milestone_count = milestone_amounts.len() as u8;
        for i in 0..milestone_amounts.len() {
            let last_milestone_index = milestone_amounts.len() - 1;
            let mut is_last = false;
            if i as usize == last_milestone_index {
                is_last = true;
            };
            let desc: String = milestone_description[i].to_string();
            campaign.milestones[i] = Milestone {
                amount: milestone_amounts[i],
                description: desc,
                release_ts: clock.unix_timestamp
                    + (i as i64 * duration_seconds / campaign.milestone_count as i64),
                released: false,
                is_last,
            };
        }
        campaign.last_release_ts = 0;
        campaign.bump = ctx.bumps.vault;
        emit!(CampaignCreated {
            campaign: campaign.key(),
            creator: campaign.creator
        });
        Ok(())
    }
    #[access_control(donate_guard(&ctx))]
    pub fn donate(ctx: Context<Donate>, amount: u64) -> Result<()> {
        let donor = &ctx.accounts.donor;
        let vault = &ctx.accounts.vault;
        let system_program = &ctx.accounts.system_program;
        let last_milestone: Option<&Milestone> =
            ctx.accounts.campaign.milestones.iter().find(|f| f.is_last);
        match last_milestone {
            Some(milestone) => {
                require!(!milestone.released, CrowdfundError::BadMilestone);
            }
            _ => {}
        }

        // Transfer lamports to vault PDA
        anchor_lang::system_program::transfer(
            CpiContext::new(
                system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: donor.to_account_info(),
                    to: vault.to_account_info(),
                },
            ),
            amount,
        )?;

        // Update campaign state
        let campaign = &mut ctx.accounts.campaign;
        campaign.total_donated = campaign.total_donated.checked_add(amount).unwrap();

        // Create / update donation receipt
        let mut receipt = &mut ctx.accounts.receipt;
        if receipt.donor == Pubkey::default() {
            receipt.campaign = campaign.key();
            receipt.donor = donor.key();
            receipt.lamports = amount;
            receipt.refunded = false;
        } else {
            receipt.lamports = receipt.lamports.checked_add(amount).unwrap();
        }

        emit!(DonationReceived {
            campaign: campaign.key(),
            donor: donor.key(),
            amount
        });
        Ok(())
    }
    pub fn release(ctx: Context<Release>, index: u8) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        let clock = Clock::get()?;

        require!(campaign.locked == false, CrowdfundError::CampaignLocked);

        require!(
            (index as usize) < campaign.milestones.len(),
            CrowdfundError::InvalidMilestone
        );
        require!(
            campaign.total_donated >= campaign.target_lamports,
            CrowdfundError::TargetNotReached
        );

        let amount: u64 = {
            if index != 0 {
                let previous_index = index - 1;
                let previous_milestone = &campaign.milestones[previous_index as usize];
                require!(
                    previous_milestone.released,
                    CrowdfundError::MilestoneNotReady
                )
            }

            let milestone = &mut campaign.milestones[index as usize];
            require!(!milestone.released, CrowdfundError::AlreadyReleased);

            milestone.released = true;
            if milestone.is_last {
                ctx.accounts.vault.lamports()
            } else {
                milestone.amount
            }
        };

        if campaign.last_release_ts != 0 {
            require!(
                clock.unix_timestamp - campaign.last_release_ts
                    >= ctx.accounts.system_config.dispute_seconds,
                CrowdfundError::DisputeWindowOpen
            );
        } else {
            require!(
                clock.unix_timestamp - campaign.start_ts
                    >= ctx.accounts.system_config.dispute_seconds,
                CrowdfundError::DisputeWindowOpen
            );
        }

        campaign.last_release_ts = clock.unix_timestamp;

        let campaign_key = campaign.key();
        // let seeds: &[&[u8]] = &[b"vault", campaign_key.as_ref(), &[campaign.bump]];
        // let signer: &[&[&[u8]]] = &[seeds];

        **ctx
            .accounts
            .vault
            .to_account_info()
            .try_borrow_mut_lamports()? -= amount;
        **ctx
            .accounts
            .creator
            .to_account_info()
            .try_borrow_mut_lamports()? += amount;
        emit!(MilestoneReleased {
            campaign: campaign_key,
            index,
            amount,
        });

        Ok(())
    }
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let campaign = &ctx.accounts.campaign;
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp > campaign.end_ts
                && campaign.total_donated < campaign.target_lamports,
            CrowdfundError::NotFailed
        );

        let receipt = &mut ctx.accounts.receipt;
        require!(
            !receipt.refunded && receipt.lamports > 0,
            CrowdfundError::NothingToRefund
        );

        receipt.refunded = true;
        let binding = campaign.key();
        // let seeds = &[b"vault", binding.as_ref(), &[campaign.bump]];
        // let signer = &[&seeds[..]];
        **ctx
            .accounts
            .vault
            .to_account_info()
            .try_borrow_mut_lamports()? -= receipt.lamports;
        **ctx
            .accounts
            .donor
            .to_account_info()
            .try_borrow_mut_lamports()? += receipt.lamports;

        emit!(RefundIssued {
            campaign: campaign.key(),
            donor: receipt.donor,
            amount: receipt.lamports
        });
        Ok(())
    }
}

fn donate_guard(ctx: &Context<Donate>) -> Result<()> {
    let clock = Clock::get()?;
    let campaign = &ctx.accounts.campaign;
    require!(
        clock.unix_timestamp < campaign.end_ts,
        CrowdfundError::NotFailed
    );
    Ok(())
}

#[derive(Accounts)]
#[instruction(target_lamports: u64, duration_seconds: i64)]
pub struct CreateCampaign<'info> {
    /// CHECK: Use owner constraint to check account is owned by our program
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init,
        payer = creator,
        space = 8 + Campaign::INIT_SPACE,
    )]
    pub campaign: Account<'info, Campaign>,
    /// CHECK: vault PDA
    #[account(
        init,
        payer  = creator,
        space  = 0,                                    // just a SystemAccount, no data
        seeds  = [b"vault", campaign.key().as_ref()],
        bump
    )]
    pub vault: UncheckedAccount<'info>,
    #[account(
        seeds = [b"system_config"], 
        bump
    )]
    pub system_config: Account<'info, SystemConfig>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct CampaignCreated {
    pub campaign: Pubkey,
    pub creator: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct Campaign {
    pub creator: Pubkey,
    pub vault: Pubkey, // PDA holding SOL
    pub target_lamports: u64,
    pub start_ts: i64,
    pub end_ts: i64,
    pub total_donated: u64,
    pub milestones: [Milestone; MAX_MILESTONES],
    pub milestone_count: u8,
    pub last_release_ts: i64,
    pub bump: u8,
    #[max_len(100)]
    pub title: String,
    #[max_len(500)]
    pub description: String,
    #[max_len(200)]
    pub image_url: String,
    pub locked: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, Default)]
pub struct Milestone {
    pub amount: u64,
    #[max_len(200)]
    pub description: String,
    pub release_ts: i64,
    pub released: bool,
    pub is_last: bool,
}

#[derive(Accounts)]
pub struct Donate<'info> {
    #[account(mut)]
    pub donor: Signer<'info>,
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    /// CHECK: vault PDA
    #[account(mut, seeds = [b"vault", campaign.key().as_ref()], bump = campaign.bump)]
    pub vault: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = donor,
        space = 8 + DonationReceipt::INIT_SPACE,
        seeds = [b"receipt", campaign.key().as_ref(), donor.key().as_ref()],
        bump,
    )]
    pub receipt: Account<'info, DonationReceipt>,
    pub system_program: Program<'info, System>,
}
#[event]
pub struct DonationReceived {
    pub campaign: Pubkey,
    pub donor: Pubkey,
    pub amount: u64,
}
#[account]
#[derive(InitSpace)]
pub struct DonationReceipt {
    pub campaign: Pubkey,
    pub donor: Pubkey,
    pub lamports: u64,
    pub refunded: bool,
}

#[derive(Accounts)]
pub struct Release<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        mut,
        constraint = campaign.creator == creator.key() @ CrowdfundError::UnAuthorized
    )]
    pub campaign: Account<'info, Campaign>,
    /// CHECK: vault PDA
    #[account(mut, seeds = [b"vault", campaign.key().as_ref()], bump = campaign.bump)]
    pub vault: UncheckedAccount<'info>,
    #[account(
        seeds = [b"system_config"], 
        bump
    )]
    pub system_config: Account<'info, SystemConfig>,
}
#[event]
pub struct MilestoneReleased {
    pub campaign: Pubkey,
    pub index: u8,
    pub amount: u64,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub donor: Signer<'info>,
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    /// CHECK: vault PDA
    #[account(mut, seeds = [b"vault", campaign.key().as_ref()], bump = campaign.bump)]
    pub vault: UncheckedAccount<'info>,
    #[account(mut, seeds = [b"receipt", campaign.key().as_ref(), donor.key().as_ref()], bump)]
    pub receipt: Account<'info, DonationReceipt>,
}
#[event]
pub struct RefundIssued {
    pub campaign: Pubkey,
    pub donor: Pubkey,
    pub amount: u64,
}

#[derive(Accounts)]
pub struct UpdateSystemConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        constraint = system_config.authorithy == authority.key() @ CrowdfundError::UnAuthorized,
        seeds = [b"system_config"], 
        bump
    )]
    pub system_config: Account<'info, SystemConfig>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct InitiateContract<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<SystemConfig>(),
        seeds = [b"system_config"],
        bump,
    )]
    pub system_config: Account<'info, SystemConfig>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct SystemConfig {
    pub authorithy: Pubkey,
    pub dispute_seconds: i64,
}

#[derive(Accounts)]
pub struct LockCampaign<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    #[account(
        constraint = system_config.authorithy == authority.key() @ CrowdfundError::UnAuthorized,
        seeds = [b"system_config"], 
        bump
    )]
    pub system_config: Account<'info, SystemConfig>,
}
