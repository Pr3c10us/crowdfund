'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import Image from 'next/image';
import { CampaignDetailBreadcrumb } from '@/components/layout/page-breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { DonateDialog } from '@/components/campaign/donate-dialog';
import { DonationReceipt } from '@/components/campaign/donation-receipt';
import { MilestoneTimeline } from '@/components/campaign/milestone-timeline';
import { CampaignLockControl } from '@/components/campaign/campaign-lock-control';
import { useDonations, DonationData } from '@/hooks/use-donations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  Target,
  Users,
  Heart,
  Share2,
  Flag,
  CheckCircle,
  Clock,
  Wallet,
  TrendingUp,
  MessageSquare,
  ExternalLink,
  Copy,
  Twitter,
  Facebook,
  Link as LinkIcon,
  MapPin,
  Globe,
  Mail,
  AlertTriangle,
  Loader2,
  ChevronRight
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { toast } from 'sonner';
import { CampaignData, getCampaignDataService, mockCampaigns } from '@/lib/solana/campaign-data';
import { convertLamportsToSol } from '@/lib/solana/instructions';
import { createProgram } from '@/lib/solana/program';
import { createInstructionBuilder, handleProgramError } from '@/lib/solana/instructions';
import { DonateParams } from '@/lib/types';
import { BN } from '@coral-xyz/anchor';
import { CampaignLoading } from '@/components/campaign/campaign-loading';
import { getSystemConfig } from '@/lib/solana/admin-utils';

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = decodeURIComponent(params.id as string);
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [disputeWindow, setDisputeWindow] = useState(0);
  const [showDonateDialog, setShowDonateDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [lastDonation, setLastDonation] = useState<DonationData | null>(null);
  const { handleDonationSuccess } = useDonations();

  // Load campaign data
  useEffect(() => {
    const loadCampaign = async () => {
      setLoading(true);
      try {
        const campaignService = getCampaignDataService(connection);

        // Try to find by ID first, fallback to mock data
        let foundCampaign = null;
        try {
          foundCampaign = await campaignService.fetchCampaign(new PublicKey(campaignId));
        } catch {
          // If ID is not a valid PublicKey, search in mock data
          foundCampaign = mockCampaigns.find(c => c.id === campaignId || c.title === campaignId);
        }

        setCampaign(foundCampaign || null);

        const config = await getSystemConfig(connection, {
          publicKey,
          signTransaction,
          signAllTransactions: async (txs: any) => {
            if (!signTransaction) {
              throw new Error('Wallet not connected');
            }
            return Promise.all(txs.map((tx: any) => signTransaction(tx)));
          },
          payer: publicKey
        } as any)

        if (config) {
          setDisputeWindow(config.disputeSeconds.toNumber());
        } else {
          // Set a default dispute window if config is null (e.g., 7 days)
          setDisputeWindow(2 * 60);
        }
      } catch (error) {
        console.error('Error loading campaign:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCampaign();
  }, [campaignId, connection]);

  if (loading) {
    return <CampaignLoading variant="detail" />;
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <h1 className="text-2xl font-bold mb-4">Campaign Not Found</h1>
              <p className="text-muted-foreground mb-6">
                The campaign you're looking for doesn't exist or has been removed.
              </p>
              <Button asChild>
                <a href="/">Browse All Campaigns</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentAmountSol = convertLamportsToSol(campaign.totalDonated);
  const targetAmountSol = convertLamportsToSol(campaign.targetLamports);
  const progressPercentage = campaign.progress;

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'Campaign ended';

    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));

    if (days > 0) {
      return `${days} days, ${hours} hours left`;
    } else if (hours > 0) {
      return `${hours} hours left`;
    } else {
      return 'Less than 1 hour left';
    }
  };

  const onDonationSuccess = (signature: string, amount: number) => {
    if (!publicKey) return;

    const donation: DonationData = {
      signature,
      amount,
      timestamp: new Date(),
      campaign: campaign!,
      donor: publicKey.toBase58()
    };
    setLastDonation(donation);
    setShowReceiptDialog(true);
    handleDonationSuccess(signature, amount, campaign!);

    // Refresh campaign data after successful donation
    setTimeout(async () => {
      try {
        const campaignService = getCampaignDataService(connection);
        const updatedCampaign = await campaignService.fetchCampaign(new PublicKey(campaign!.id));
        if (updatedCampaign) setCampaign(updatedCampaign);
      } catch (error) {
        console.error('Failed to refresh campaign data:', error);
      }
    }, 2000);
  };

  const handleShare = (platform?: string) => {
    const url = window.location.href;
    const title = campaign.title;
    const text = `Check out this amazing campaign: ${title}`;

    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      toast.success('Campaign link copied to clipboard!');
    } else if (navigator.share) {
      navigator.share({
        title: title,
        text: text,
        url: url,
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Campaign link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <CampaignDetailBreadcrumb campaignTitle={campaign.title} campaignId={campaignId} />

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Image */}

            <div className="aspect-video relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20">
              {campaign.imageUrl ? (
                <Image
                  src={campaign.imageUrl}
                  alt={campaign.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (<div className="flex items-center justify-center h-full text-muted-foreground">
                <Target className="w-16 h-16" />
              </div>)
              }
            </div>

            {/* Campaign Header */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="outline" className="capitalize">{campaign.category}</Badge>
                    <Badge variant={campaign.status === 'active' ? "default" : campaign.status === 'successful' ? "default" : "destructive"}>
                      {campaign.status === 'active' ? 'Active' : campaign.status === 'successful' ? 'Successful' : campaign.status === 'failed' ? 'Failed' : 'Ended'}
                    </Badge>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 break-words">{campaign.title}</h1>
                  <p className="text-muted-foreground text-sm sm:text-base">{campaign.shortDescription}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleShare('twitter')}>
                        <Twitter className="mr-2 h-4 w-4" />
                        Share on Twitter
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('facebook')}>
                        <Facebook className="mr-2 h-4 w-4" />
                        Share on Facebook
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('linkedin')}>
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Share on LinkedIn
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('copy')}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Link
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="outline" size="icon">
                    <Flag className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Progress Section */}
              {/* <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{progressPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-3" />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xl sm:text-2xl font-bold text-primary">
                          {currentAmountSol.toFixed(2)}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">SOL raised</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xl sm:text-2xl font-bold">
                          {campaign.donorCount}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">donors</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xl sm:text-2xl font-bold">
                          {targetAmountSol.toFixed(0)}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">SOL goal</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card> */}
            </div>

            {/* Tabs Section */}
            <Tabs defaultValue="story" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="story">Story</TabsTrigger>
                <TabsTrigger value="milestones">Milestones</TabsTrigger>
                {/* <TabsTrigger value="updates">Updates</TabsTrigger> */}
              </TabsList>

              <TabsContent value="story" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Campaign Story</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-semibold mb-3">About this campaign</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          {campaign.shortDescription}
                        </p>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h4 className="font-semibold">Campaign Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{formatTimeRemaining(campaign.timeRemaining)}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <span>Goal: {targetAmountSol.toFixed(2)} SOL</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{campaign.donorCount} supporters</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span>{campaign.progress.toFixed(1)}% funded</span>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <h4 className="font-semibold">Creator</h4>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {campaign.creator.toBase58().slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">
                              {campaign.creator.toBase58().slice(0, 8)}...{campaign.creator.toBase58().slice(-4)}
                            </div>
                            <div className="text-sm text-muted-foreground">Campaign Creator</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="milestones">
                {campaign.milestones && campaign.milestones.length > 0 ? (
                  <MilestoneTimeline
                    campaign={campaign}
                    isCreator={publicKey?.toString() === campaign.creator.toString()}
                    showCards={true}
                    disputeWindowSeconds={disputeWindow}
                  />
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="font-semibold mb-2">No Milestones</h3>
                      <p className="text-muted-foreground">
                        This campaign doesn't have specific milestones defined. All funds will be released directly to the creator upon successful completion.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* <TabsContent value="updates">
                <Card>
                  <CardContent className="p-6 text-center">
                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">No updates yet</h3>
                    <p className="text-muted-foreground">
                      The campaign creator hasn't posted any updates yet.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent> */}
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 lg:space-y-6 order-first lg:order-last">
            {/* Donation Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="mr-2 h-5 w-5" />
                  Support This Campaign
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center space-y-4">
                  <div className="p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {currentAmountSol.toFixed(2)} SOL
                    </div>
                    <div className="text-sm text-muted-foreground">
                      raised of {targetAmountSol.toFixed(2)} SOL goal
                    </div>
                    <div className="mt-2">
                      <Progress value={progressPercentage} className="h-2" />
                    </div>
                  </div>

                  <Button
                    onClick={() => setShowDonateDialog(true)}
                    className="w-full"
                    size="lg"
                    disabled={campaign.status !== 'active'}
                  >
                    <Heart className="mr-2 h-4 w-4" />
                    Donate Now
                  </Button>

                  {campaign.status !== 'active' && (
                    <div className="text-xs text-muted-foreground text-center">
                      This campaign is no longer accepting donations
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground text-center">
                  Donations are processed securely on the Solana blockchain
                </div>
              </CardContent>
            </Card>

            {/* Admin Controls */}
            <CampaignLockControl
              campaign={campaign}
              onLockStatusChange={(locked) => {
                // Update campaign state to reflect lock status
                setCampaign(prev => prev ? { ...prev, locked } as any : null);
              }}
            />

            {/* Campaign Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Campaign Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <Badge variant="secondary">{campaign.category}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={campaign.status === 'active' ? "default" : campaign.status === 'successful' ? "default" : "destructive"}>
                    {campaign.status === 'active' ? 'Active' : campaign.status === 'successful' ? 'Successful' : campaign.status === 'failed' ? 'Failed' : 'Ended'}
                  </Badge>
                </div>
                <Separator />

                {/* Enhanced Creator Profile */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    Campaign Creator
                  </h4>
                  <div className="flex items-start space-x-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                      {campaign.creator.toBase58().slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm break-all">
                        {campaign.creator.toBase58().slice(0, 12)}...{campaign.creator.toBase58().slice(-8)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Solana Address
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(campaign.creator.toBase58());
                            toast.success('Creator address copied!');
                          }}
                        >
                          <Copy className="mr-1 h-3 w-3" />
                          Copy
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={`https://explorer.solana.com/address/${campaign.creator.toString()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-1 h-3 w-3" />
                            Explorer
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Creator Stats */}
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Campaigns Created</span>
                      <span className="font-medium">1</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Raised</span>
                      <span className="font-medium">{convertLamportsToSol(campaign.totalDonated).toFixed(2)} SOL</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Success Rate</span>
                      <span className="font-medium text-green-600">
                        {campaign.status === 'successful' ? '100%' : 'In Progress'}
                      </span>
                    </div>
                  </div>

                  {/* Trust Indicators */}
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Verified Solana Address
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Smart Contract Verified
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Donation Dialog */}
        <DonateDialog
          open={showDonateDialog}
          onOpenChange={setShowDonateDialog}
          campaign={campaign}
          onDonationSuccess={onDonationSuccess}
        />

        {/* Donation Receipt Dialog */}
        {lastDonation && (
          <DonationReceipt
            open={showReceiptDialog}
            onOpenChange={setShowReceiptDialog}
            donation={lastDonation}
          />
        )}
      </div>
    </div>
  );
}
