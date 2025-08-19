'use client';

import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Target,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Play,
  AlertTriangle,
  ExternalLink,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { CampaignData, getCampaignDataService, mockCampaigns } from '@/lib/solana/campaign-data';
import { MilestoneTimeline } from '@/components/campaign/milestone-timeline';
import {
  calculateTotalReleased,
  calculateAvailableToRelease,
  getMilestoneStatus
} from '@/lib/solana/milestone-utils';
import { convertLamportsToSol } from '@/lib/solana/donation-utils';

interface CreatorStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalRaised: number;
  totalReleased: number;
  availableToRelease: number;
  totalMilestones: number;
  releasedMilestones: number;
  availableMilestones: number;
}

export const CreatorDashboard: React.FC = () => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CreatorStats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalRaised: 0,
    totalReleased: 0,
    availableToRelease: 0,
    totalMilestones: 0,
    releasedMilestones: 0,
    availableMilestones: 0
  });

  // Load creator campaigns
  useEffect(() => {
    const loadCreatorCampaigns = async () => {
      if (!publicKey) return;

      setLoading(true);
      try {
        // For now, use mock data filtered by creator
        // In production, this would query the blockchain for campaigns created by this wallet
        const creatorCampaigns = mockCampaigns.filter(campaign =>
          campaign.creator.equals(publicKey)
        );

        setCampaigns(creatorCampaigns);
        calculateStats(creatorCampaigns);
      } catch (error) {
        console.error('Error loading creator campaigns:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCreatorCampaigns();
  }, [publicKey, connection]);

  const calculateStats = (campaigns: CampaignData[]) => {
    const currentTimestamp = Math.floor(Date.now() / 1000);

    let totalRaised = 0;
    let totalReleased = 0;
    let availableToRelease = 0;
    let totalMilestones = 0;
    let releasedMilestones = 0;
    let availableMilestones = 0;

    campaigns.forEach(campaign => {
      totalRaised += convertLamportsToSol(campaign.totalDonated);

      if (campaign.milestones && campaign.milestones.length > 0) {
        const milestones = campaign.milestones.slice(0, campaign.milestoneCount);
        totalMilestones += milestones.length;

        const released = calculateTotalReleased(milestones);
        const available = calculateAvailableToRelease(
          milestones,
          campaign.totalDonated,
          campaign.targetLamports,
          campaign.lastReleaseTs,
          currentTimestamp
        );

        totalReleased += convertLamportsToSol(released);
        availableToRelease += convertLamportsToSol(available);

        milestones.forEach((milestone, index) => {
          if (milestone.released) {
            releasedMilestones++;
          } else {
            const status = getMilestoneStatus(
              milestone,
              index,
              campaign.totalDonated,
              campaign.targetLamports,
              campaign.lastReleaseTs,
              currentTimestamp,
              7 * 24 * 60 * 60, // disputeWindowSeconds (7 days in seconds)
              campaign.startTs, // campaignStartTimestamp (optional)
              milestones // milestones array (optional)
            );
            if (status === 'available') {
              availableMilestones++;
            }
          }
        });
      }
    });

    setStats({
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      totalRaised,
      totalReleased,
      availableToRelease,
      totalMilestones,
      releasedMilestones,
      availableMilestones
    });
  };

  const handleMilestoneRelease = (signature: string, milestoneIndex: number) => {
    // Refresh campaigns after milestone release
    if (publicKey) {
      const creatorCampaigns = mockCampaigns.filter(campaign =>
        campaign.creator.equals(publicKey)
      );
      setCampaigns(creatorCampaigns);
      calculateStats(creatorCampaigns);
    }
  };

  if (!publicKey) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-4">Wallet Not Connected</h2>
            <p className="text-muted-foreground mb-6">
              Please connect your wallet to access the creator dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Creator Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your campaigns and milestone releases
          </p>
        </div>
        <Button asChild>
          <Link href="/create">
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </Link>
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Total Campaigns</span>
            </div>
            <div className="text-2xl font-bold mt-2">{stats.totalCampaigns}</div>
            <div className="text-xs text-muted-foreground">
              {stats.activeCampaigns} active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Total Raised</span>
            </div>
            <div className="text-2xl font-bold mt-2 text-green-600">
              {stats.totalRaised.toFixed(2)} SOL
            </div>
            <div className="text-xs text-muted-foreground">
              Across all campaigns
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Total Released</span>
            </div>
            <div className="text-2xl font-bold mt-2 text-blue-600">
              {stats.totalReleased.toFixed(2)} SOL
            </div>
            <div className="text-xs text-muted-foreground">
              {stats.releasedMilestones} milestones
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Play className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Available</span>
            </div>
            <div className="text-2xl font-bold mt-2 text-orange-600">
              {stats.availableToRelease.toFixed(2)} SOL
            </div>
            <div className="text-xs text-muted-foreground">
              {stats.availableMilestones} milestones ready
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="campaigns" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="campaigns">My Campaigns</TabsTrigger>
          <TabsTrigger value="milestones">Milestone Management</TabsTrigger>
          <TabsTrigger value="earnings">Earnings History</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Target className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Campaigns Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first campaign to start raising funds for your project.
                </p>
                <Button asChild>
                  <Link href="/create">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Campaign
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {campaigns.map((campaign) => {
                const currentAmountSol = convertLamportsToSol(campaign.totalDonated);
                const targetAmountSol = convertLamportsToSol(campaign.targetLamports);
                const progress = campaign.progress;

                return (
                  <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg mb-2 truncate">
                            {campaign.title}
                          </h3>
                          <p className="text-muted-foreground text-sm line-clamp-2">
                            {campaign.shortDescription}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Badge variant={
                            campaign.status === 'active' ? 'default' :
                              campaign.status === 'successful' ? 'default' :
                                campaign.status === 'failed' ? 'destructive' : 'secondary'
                          }>
                            {campaign.status}
                          </Badge>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/campaigns/${campaign.id}`}>
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span className="font-medium">{progress.toFixed(1)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Raised</div>
                            <div className="font-semibold">{currentAmountSol.toFixed(2)} SOL</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Goal</div>
                            <div className="font-semibold">{targetAmountSol.toFixed(2)} SOL</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Donors</div>
                            <div className="font-semibold">{campaign.donorCount}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Milestones</div>
                            <div className="font-semibold">
                              {campaign.milestones?.filter(m => m.released).length || 0} / {campaign.milestoneCount}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="space-y-4">
          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Milestones to Manage</h3>
                <p className="text-muted-foreground">
                  Create campaigns with milestones to manage fund releases.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{campaign.title}</span>
                      <Badge variant="outline">{campaign.status}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MilestoneTimeline
                      campaign={campaign}
                      isCreator={true}
                      onMilestoneRelease={handleMilestoneRelease}
                      showCards={true}
                      disputeWindowSeconds={7 * 24 * 60 * 60}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Earnings Tab */}
        <TabsContent value="earnings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5" />
                <span>Earnings Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200">
                  <div className="text-sm text-green-700 dark:text-green-400 mb-1">
                    Total Earnings
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.totalReleased.toFixed(2)} SOL
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-700 dark:text-blue-400 mb-1">
                    Available to Release
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.availableToRelease.toFixed(2)} SOL
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900/10 rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-700 dark:text-gray-400 mb-1">
                    Pending Release
                  </div>
                  <div className="text-2xl font-bold text-gray-600">
                    {(stats.totalRaised - stats.totalReleased - stats.availableToRelease).toFixed(2)} SOL
                  </div>
                </div>
              </div>

              {stats.totalReleased === 0 && stats.availableToRelease === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h4 className="font-semibold mb-2">No Earnings Yet</h4>
                  <p className="text-muted-foreground text-sm">
                    Your earnings will appear here once you start releasing milestones.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-semibold">Recent Releases</h4>
                  <div className="text-sm text-muted-foreground">
                    Release history will be displayed here once milestone releases are tracked.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
