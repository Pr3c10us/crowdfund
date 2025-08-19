import { Connection, PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { Milestone } from '@/lib/types';
import { CampaignData } from '@/lib/solana/campaign-data';
import { getMilestoneStatus, MilestoneStatus } from '@/lib/solana/milestone-utils';

// Interface for milestone refresh result
export interface MilestoneRefreshResult {
    milestoneIndex: number;
    previousStatus: MilestoneStatus;
    newStatus: MilestoneStatus;
    statusChanged: boolean;
    timeUntilAvailable?: number;
}

// Interface for complete refresh result
export interface CampaignRefreshResult {
    campaignId: string;
    totalMilestones: number;
    refreshedMilestones: MilestoneRefreshResult[];
    newlyAvailable: number[];
    nextAvailableMilestone?: number;
    refreshTimestamp: number;
}

// Configuration for milestone refresh
export interface RefreshConfig {
    disputeWindowSeconds?: number;
    autoRefreshInterval?: number; // in milliseconds
    enableNotifications?: boolean;
}

// Default configuration
const DEFAULT_REFRESH_CONFIG: Required<RefreshConfig> = {
    disputeWindowSeconds: 7 * 24 * 60 * 60, // 7 days
    autoRefreshInterval: 30000, // 30 seconds
    enableNotifications: true,
};

/**
 * Refresh milestone statuses for a campaign after a release
 */
export const refreshMilestonesAfterRelease = async (
    campaign: CampaignData,
    releasedMilestoneIndex: number,
    config: RefreshConfig = {}
): Promise<CampaignRefreshResult> => {
    const refreshConfig = { ...DEFAULT_REFRESH_CONFIG, ...config };
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const refreshedMilestones: MilestoneRefreshResult[] = [];
    const newlyAvailable: number[] = [];

    // Refresh all milestones to check for status changes
    for (let i = 0; i < campaign.milestones.length; i++) {
        const milestone = campaign.milestones[i];

        // Get previous status (before refresh)
        const previousStatus = getMilestoneStatus(
            milestone,
            i,
            campaign.totalDonated,
            campaign.targetLamports,
            campaign.lastReleaseTs,
            currentTimestamp - 1, // Use previous timestamp to get old status
            refreshConfig.disputeWindowSeconds,
            campaign.startTs,
            campaign.milestones
        );

        // Get new status (after refresh)
        const newStatus = getMilestoneStatus(
            milestone,
            i,
            campaign.totalDonated,
            campaign.targetLamports,
            campaign.lastReleaseTs,
            currentTimestamp,
            refreshConfig.disputeWindowSeconds,
            campaign.startTs,
            campaign.milestones
        );

        const statusChanged = previousStatus !== newStatus;

        // Track newly available milestones
        if (statusChanged && newStatus === 'available') {
            newlyAvailable.push(i);
        }

        refreshedMilestones.push({
            milestoneIndex: i,
            previousStatus,
            newStatus,
            statusChanged,
            timeUntilAvailable: newStatus === 'disputed' ?
                getTimeUntilMilestoneAvailable(milestone, i, campaign, refreshConfig.disputeWindowSeconds) :
                undefined
        });
    }

    // Find next available milestone
    const nextAvailableMilestone = findNextAvailableMilestone(campaign, refreshConfig.disputeWindowSeconds);

    return {
        campaignId: campaign.id,
        totalMilestones: campaign.milestones.length,
        refreshedMilestones,
        newlyAvailable,
        nextAvailableMilestone,
        refreshTimestamp: currentTimestamp
    };
};

/**
 * Get time until a milestone becomes available
 */
const getTimeUntilMilestoneAvailable = (
    milestone: Milestone,
    milestoneIndex: number,
    campaign: CampaignData,
    disputeWindowSeconds: number
): number => {
    const currentTimestamp = Math.floor(Date.now() / 1000);

    let disputeEndTimestamp: number;

    if (milestoneIndex === 0) {
        // First milestone: use campaign start timestamp + dispute window
        disputeEndTimestamp = campaign.startTs.toNumber() + disputeWindowSeconds;
    } else {
        // Subsequent milestones: use last release timestamp + dispute window
        disputeEndTimestamp = campaign.lastReleaseTs.toNumber() + disputeWindowSeconds;
    }

    return Math.max(0, disputeEndTimestamp - currentTimestamp);
};

/**
 * Find the next milestone that can be released
 */
const findNextAvailableMilestone = (
    campaign: CampaignData,
    disputeWindowSeconds: number
): number | undefined => {
    const currentTimestamp = Math.floor(Date.now() / 1000);

    for (let i = 0; i < campaign.milestones.length; i++) {
        const milestone = campaign.milestones[i];
        const status = getMilestoneStatus(
            milestone,
            i,
            campaign.totalDonated,
            campaign.targetLamports,
            campaign.lastReleaseTs,
            currentTimestamp,
            disputeWindowSeconds,
            campaign.startTs,
            campaign.milestones
        );

        if (status === 'available') {
            return i;
        }
    }

    return undefined;
};

/**
 * Auto-refresh milestones at regular intervals
 */
export class MilestoneAutoRefresh {
    private intervalId: NodeJS.Timeout | null = null;
    private campaigns: Map<string, CampaignData> = new Map();
    private config: Required<RefreshConfig>;
    private onRefresh?: (results: CampaignRefreshResult[]) => void;

    constructor(config: RefreshConfig = {}, onRefresh?: (results: CampaignRefreshResult[]) => void) {
        this.config = { ...DEFAULT_REFRESH_CONFIG, ...config };
        this.onRefresh = onRefresh;
    }

    /**
     * Add a campaign to auto-refresh
     */
    addCampaign(campaign: CampaignData): void {
        this.campaigns.set(campaign.id, campaign);
    }

    /**
     * Remove a campaign from auto-refresh
     */
    removeCampaign(campaignId: string): void {
        this.campaigns.delete(campaignId);
    }

    /**
     * Update campaign data
     */
    updateCampaign(campaign: CampaignData): void {
        if (this.campaigns.has(campaign.id)) {
            this.campaigns.set(campaign.id, campaign);
        }
    }

    /**
     * Start auto-refresh
     */
    start(): void {
        if (this.intervalId) {
            this.stop();
        }

        this.intervalId = setInterval(async () => {
            const results: CampaignRefreshResult[] = [];

            for (const [campaignId, campaign] of this.campaigns) {
                try {
                    const result = await refreshMilestonesAfterRelease(campaign, -1, this.config);

                    // Only include campaigns with status changes
                    if (result.refreshedMilestones.some(m => m.statusChanged)) {
                        results.push(result);
                    }
                } catch (error) {
                    console.error(`Error refreshing milestones for campaign ${campaignId}:`, error);
                }
            }

            if (results.length > 0 && this.onRefresh) {
                this.onRefresh(results);
            }
        }, this.config.autoRefreshInterval);
    }

    /**
     * Stop auto-refresh
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Get current campaigns being tracked
     */
    getCampaigns(): CampaignData[] {
        return Array.from(this.campaigns.values());
    }
}

/**
 * Create notification messages for milestone status changes
 */
export const createMilestoneNotifications = (
    refreshResult: CampaignRefreshResult
): Array<{ type: 'success' | 'info' | 'warning'; message: string; description?: string }> => {
    const notifications: Array<{ type: 'success' | 'info' | 'warning'; message: string; description?: string }> = [];

    // Notify about newly available milestones
    if (refreshResult.newlyAvailable.length > 0) {
        refreshResult.newlyAvailable.forEach(milestoneIndex => {
            notifications.push({
                type: 'success',
                message: `Milestone ${milestoneIndex + 1} is now available for release!`,
                description: 'The dispute window has ended and funds can now be released.'
            });
        });
    }

    // Notify about next available milestone
    if (refreshResult.nextAvailableMilestone !== undefined) {
        const nextMilestone = refreshResult.refreshedMilestones[refreshResult.nextAvailableMilestone];
        if (nextMilestone?.newStatus === 'disputed' && nextMilestone.timeUntilAvailable) {
            const hours = Math.ceil(nextMilestone.timeUntilAvailable / 3600);
            notifications.push({
                type: 'info',
                message: `Next milestone available in ${hours} hours`,
                description: `Milestone ${refreshResult.nextAvailableMilestone + 1} will be available for release soon.`
            });
        }
    }

    return notifications;
};

/**
 * Utility function to format milestone status changes for logging
 */
export const formatMilestoneChanges = (refreshResult: CampaignRefreshResult): string => {
    const changes = refreshResult.refreshedMilestones
        .filter(m => m.statusChanged)
        .map(m => `Milestone ${m.milestoneIndex + 1}: ${m.previousStatus} → ${m.newStatus}`)
        .join(', ');

    return changes || 'No status changes';
};
