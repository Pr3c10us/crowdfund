import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { CampaignData } from '@/lib/solana/campaign-data';
import {
    MilestoneAutoRefresh,
    CampaignRefreshResult,
    RefreshConfig,
    createMilestoneNotifications,
    formatMilestoneChanges
} from '@/lib/solana/milestone-refresh';

interface UseMilestoneRefreshOptions {
    config?: RefreshConfig;
    enableNotifications?: boolean;
    onRefresh?: (results: CampaignRefreshResult[]) => void;
}

interface MilestoneRefreshState {
    isActive: boolean;
    lastRefresh?: number;
    totalRefreshes: number;
    campaignCount: number;
}

export const useMilestoneRefresh = (options: UseMilestoneRefreshOptions = {}) => {
    const {
        config = {},
        enableNotifications = true,
        onRefresh
    } = options;

    const autoRefreshRef = useRef<MilestoneAutoRefresh | null>(null);
    const [state, setState] = useState<MilestoneRefreshState>({
        isActive: false,
        totalRefreshes: 0,
        campaignCount: 0
    });

    // Handle refresh results
    const handleRefresh = useCallback((results: CampaignRefreshResult[]) => {
        setState(prev => ({
            ...prev,
            lastRefresh: Date.now(),
            totalRefreshes: prev.totalRefreshes + 1
        }));

        // Show notifications if enabled
        if (enableNotifications) {
            results.forEach(result => {
                const notifications = createMilestoneNotifications(result);
                notifications.forEach(notification => {
                    switch (notification.type) {
                        case 'success':
                            toast.success(notification.message, {
                                description: notification.description
                            });
                            break;
                        case 'info':
                            toast.info(notification.message, {
                                description: notification.description
                            });
                            break;
                        case 'warning':
                            toast.warning(notification.message, {
                                description: notification.description
                            });
                            break;
                    }
                });

                // Log changes for debugging
                console.log(`Milestone refresh for campaign ${result.campaignId}:`, {
                    changes: formatMilestoneChanges(result),
                    newlyAvailable: result.newlyAvailable,
                    nextAvailable: result.nextAvailableMilestone
                });
            });
        }

        // Call custom refresh handler
        onRefresh?.(results);
    }, [enableNotifications, onRefresh]);

    // Initialize auto-refresh
    useEffect(() => {
        if (!autoRefreshRef.current) {
            autoRefreshRef.current = new MilestoneAutoRefresh(config, handleRefresh);
        }

        return () => {
            if (autoRefreshRef.current) {
                autoRefreshRef.current.stop();
                autoRefreshRef.current = null;
            }
        };
    }, [config, handleRefresh]);

    // Start auto-refresh
    const startAutoRefresh = useCallback(() => {
        if (autoRefreshRef.current && !state.isActive) {
            autoRefreshRef.current.start();
            setState(prev => ({ ...prev, isActive: true }));
        }
    }, [state.isActive]);

    // Stop auto-refresh
    const stopAutoRefresh = useCallback(() => {
        if (autoRefreshRef.current && state.isActive) {
            autoRefreshRef.current.stop();
            setState(prev => ({ ...prev, isActive: false }));
        }
    }, [state.isActive]);

    // Add campaign to auto-refresh
    const addCampaign = useCallback((campaign: CampaignData) => {
        if (autoRefreshRef.current) {
            autoRefreshRef.current.addCampaign(campaign);
            setState(prev => ({
                ...prev,
                campaignCount: autoRefreshRef.current!.getCampaigns().length
            }));
        }
    }, []);

    // Remove campaign from auto-refresh
    const removeCampaign = useCallback((campaignId: string) => {
        if (autoRefreshRef.current) {
            autoRefreshRef.current.removeCampaign(campaignId);
            setState(prev => ({
                ...prev,
                campaignCount: autoRefreshRef.current!.getCampaigns().length
            }));
        }
    }, []);

    // Update campaign data
    const updateCampaign = useCallback((campaign: CampaignData) => {
        if (autoRefreshRef.current) {
            autoRefreshRef.current.updateCampaign(campaign);
        }
    }, []);

    // Get current campaigns
    const getCampaigns = useCallback((): CampaignData[] => {
        return autoRefreshRef.current?.getCampaigns() || [];
    }, []);

    // Manual refresh for specific campaign
    const refreshCampaign = useCallback(async (campaign: CampaignData) => {
        try {
            const { refreshMilestonesAfterRelease } = await import('@/lib/solana/milestone-refresh');
            const result = await refreshMilestonesAfterRelease(campaign, -1, config);

            if (result.refreshedMilestones.some(m => m.statusChanged)) {
                handleRefresh([result]);
            }

            return result;
        } catch (error) {
            console.error('Manual campaign refresh failed:', error);
            throw error;
        }
    }, [config, handleRefresh]);

    return {
        // State
        isActive: state.isActive,
        lastRefresh: state.lastRefresh,
        totalRefreshes: state.totalRefreshes,
        campaignCount: state.campaignCount,

        // Actions
        startAutoRefresh,
        stopAutoRefresh,
        addCampaign,
        removeCampaign,
        updateCampaign,
        getCampaigns,
        refreshCampaign
    };
};
