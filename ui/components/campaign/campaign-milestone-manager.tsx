'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, Play, Pause, Activity } from 'lucide-react';
import { CampaignData } from '@/lib/solana/campaign-data';
import { MilestoneCard } from './milestone-card';
import { useMilestoneRefresh } from '@/hooks/use-milestone-refresh';
import { CampaignRefreshResult } from '@/lib/solana/milestone-refresh';

interface CampaignMilestoneManagerProps {
    campaign: CampaignData;
    isCreator?: boolean;
    disputeWindowSeconds?: number;
    onCampaignUpdate?: (campaign: CampaignData) => void;
}

export const CampaignMilestoneManager: React.FC<CampaignMilestoneManagerProps> = ({
    campaign,
    isCreator = false,
    disputeWindowSeconds = 7 * 24 * 60 * 60, // 7 days default
    onCampaignUpdate
}) => {
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
    const [refreshHistory, setRefreshHistory] = useState<CampaignRefreshResult[]>([]);

    // Initialize milestone refresh hook
    const {
        isActive,
        lastRefresh,
        totalRefreshes,
        campaignCount,
        startAutoRefresh,
        stopAutoRefresh,
        addCampaign,
        removeCampaign,
        updateCampaign,
        refreshCampaign
    } = useMilestoneRefresh({
        config: {
            disputeWindowSeconds,
            autoRefreshInterval: 30000, // 30 seconds
            enableNotifications: true
        },
        onRefresh: (results) => {
            // Store refresh history for display
            setRefreshHistory(prev => [...results, ...prev].slice(0, 10)); // Keep last 10 refreshes

            // Update campaign data if needed
            results.forEach(result => {
                if (result.campaignId === campaign.id && onCampaignUpdate) {
                    // In a real app, you'd fetch updated campaign data here
                    console.log('Campaign needs update after milestone refresh');
                }
            });
        }
    });

    // Add campaign to auto-refresh on mount
    useEffect(() => {
        addCampaign(campaign);

        if (autoRefreshEnabled) {
            startAutoRefresh();
        }

        return () => {
            removeCampaign(campaign.id);
            stopAutoRefresh();
        };
    }, [campaign.id]);

    // Handle auto-refresh toggle
    useEffect(() => {
        if (autoRefreshEnabled && !isActive) {
            startAutoRefresh();
        } else if (!autoRefreshEnabled && isActive) {
            stopAutoRefresh();
        }
    }, [autoRefreshEnabled, isActive]);

    // Update campaign data when it changes
    useEffect(() => {
        updateCampaign(campaign);
    }, [campaign, updateCampaign]);

    // Handle manual refresh
    const handleManualRefresh = async () => {
        try {
            await refreshCampaign(campaign);
        } catch (error) {
            console.error('Manual refresh failed:', error);
        }
    };

    // Handle milestone release success
    const handleMilestoneReleaseSuccess = (signature: string, milestoneIndex: number) => {
        console.log(`Milestone ${milestoneIndex + 1} released successfully:`, signature);
        // The refresh will be automatically triggered by the MilestoneCard component
    };

    // Handle milestone refresh from individual cards
    const handleMilestoneRefresh = (refreshResult: CampaignRefreshResult) => {
        setRefreshHistory(prev => [refreshResult, ...prev].slice(0, 10));
    };

    const formatLastRefresh = (timestamp?: number) => {
        if (!timestamp) return 'Never';
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);

        if (minutes > 0) {
            return `${minutes}m ${seconds}s ago`;
        }
        return `${seconds}s ago`;
    };

    return (
        <div className="space-y-6">
            {/* Milestone Refresh Control Panel */}
            {isCreator && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Activity className="w-5 h-5" />
                            <span>Milestone Auto-Refresh</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium">Auto-refresh milestones</span>
                                    <Badge variant={isActive ? 'default' : 'secondary'}>
                                        {isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Automatically check for milestone status changes every 30 seconds
                                </p>
                            </div>
                            <Switch
                                checked={autoRefreshEnabled}
                                onCheckedChange={setAutoRefreshEnabled}
                            />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground">Status:</span>
                                <div className="flex items-center space-x-1">
                                    {isActive ? (
                                        <Play className="w-3 h-3 text-green-600" />
                                    ) : (
                                        <Pause className="w-3 h-3 text-gray-400" />
                                    )}
                                    <span>{isActive ? 'Running' : 'Stopped'}</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Last refresh:</span>
                                <div>{formatLastRefresh(lastRefresh)}</div>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Total refreshes:</span>
                                <div>{totalRefreshes}</div>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Campaigns:</span>
                                <div>{campaignCount}</div>
                            </div>
                        </div>

                        <Button
                            onClick={handleManualRefresh}
                            variant="outline"
                            size="sm"
                            className="w-full"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Manual Refresh
                        </Button>

                        {/* Refresh History */}
                        {refreshHistory.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">Recent Activity</h4>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {refreshHistory.slice(0, 5).map((refresh, index) => (
                                        <div key={`${refresh.campaignId}-${refresh.refreshTimestamp}-${index}`}
                                            className="text-xs p-2 bg-muted/50 rounded">
                                            <div className="flex justify-between">
                                                <span>
                                                    {refresh.newlyAvailable.length > 0
                                                        ? `${refresh.newlyAvailable.length} milestone(s) now available`
                                                        : 'No changes'
                                                    }
                                                </span>
                                                <span className="text-muted-foreground">
                                                    {new Date(refresh.refreshTimestamp * 1000).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Milestone Cards */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Campaign Milestones</h3>
                <div className="grid gap-4">
                    {campaign.milestones.map((milestone, index) => (
                        <MilestoneCard
                            key={`milestone-${index}`}
                            milestone={milestone}
                            milestoneIndex={index}
                            campaign={campaign}
                            onReleaseSuccess={handleMilestoneReleaseSuccess}
                            onMilestoneRefresh={handleMilestoneRefresh}
                            isCreator={isCreator}
                            disputeWindowSeconds={disputeWindowSeconds}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
