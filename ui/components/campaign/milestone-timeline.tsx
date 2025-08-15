'use client';

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  Clock,
  Play,
  Circle,
  Target,
  TrendingUp,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Milestone } from '@/lib/types';
import { CampaignData } from '@/lib/solana/campaign-data';
import { MilestoneCard } from './milestone-card';
import {
  getMilestoneStatus,
  calculateTotalReleased,
  calculateAvailableToRelease,
  MilestoneStatus
} from '@/lib/solana/milestone-utils';
import { convertLamportsToSol } from '@/lib/solana/donation-utils';

interface MilestoneTimelineProps {
  campaign: CampaignData;
  isCreator?: boolean;
  onMilestoneRelease?: (signature: string, milestoneIndex: number) => void;
  showCards?: boolean;
  disputeWindowSeconds: number;
}

export const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({
  campaign,
  isCreator = false,
  onMilestoneRelease,
  showCards = true,
  disputeWindowSeconds
}) => {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const milestones = campaign.milestones?.slice(0, campaign.milestoneCount) || [];

  const totalReleased = calculateTotalReleased(milestones);
  const availableToRelease = calculateAvailableToRelease(
    milestones,
    campaign.totalDonated,
    campaign.targetLamports,
    campaign.lastReleaseTs,
    currentTimestamp,
    disputeWindowSeconds,
    campaign.startTs
  );

  const totalReleasedSol = convertLamportsToSol(totalReleased);
  const availableToReleaseSol = convertLamportsToSol(availableToRelease);
  const totalTargetSol = convertLamportsToSol(campaign.targetLamports);

  // Calculate milestone statistics
  const releasedCount = milestones.filter(m => m.released).length;
  const availableCount = milestones.filter((m, index) => {
    const status = getMilestoneStatus(
      m,
      index,
      campaign.totalDonated,
      campaign.targetLamports,
      campaign.lastReleaseTs,
      currentTimestamp,
      disputeWindowSeconds,
      campaign.startTs,
      milestones
    );
    return status === 'available';
  }).length;

  const getTimelineIcon = (status: MilestoneStatus, isActive: boolean) => {
    const baseClasses = "w-6 h-6";

    switch (status) {
      case 'released':
        return <CheckCircle2 className={`${baseClasses} text-green-600`} />;
      case 'available':
        return <Play className={`${baseClasses} text-blue-600 ${isActive ? 'animate-pulse' : ''}`} />;
      case 'disputed':
        return <Clock className={`${baseClasses} text-orange-600`} />;
      case 'pending':
      default:
        return <Circle className={`${baseClasses} text-gray-400`} />;
    }
  };

  const getTimelineColor = (status: MilestoneStatus) => {
    switch (status) {
      case 'released':
        return 'bg-green-500';
      case 'available':
        return 'bg-blue-500';
      case 'disputed':
        return 'bg-orange-500';
      case 'pending':
      default:
        return 'bg-gray-300';
    }
  };

  if (milestones.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Target className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Milestones Defined</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            This campaign doesn't have specific milestones. All funds will be released directly upon successful completion.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Milestone Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Milestone Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Total Released */}
            <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  Total Released
                </span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {totalReleasedSol.toFixed(2)} SOL
              </div>
              <div className="text-xs text-green-600/80">
                {releasedCount} of {milestones.length} milestones
              </div>
            </div>

            {/* Available to Release */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <Play className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  Available to Release
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {availableToReleaseSol.toFixed(2)} SOL
              </div>
              <div className="text-xs text-blue-600/80">
                {availableCount} milestones ready
              </div>
            </div>

            {/* Total Target */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/10 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-400">
                  Total Target
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-600">
                {totalTargetSol.toFixed(2)} SOL
              </div>
              <div className="text-xs text-gray-600/80">
                Campaign goal
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Release Progress</span>
              <span>{((releasedCount / milestones.length) * 100).toFixed(0)}%</span>
            </div>
            <Progress value={(releasedCount / milestones.length) * 100} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{releasedCount} released</span>
              <span>{milestones.length} total milestones</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Milestone Timeline</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {milestones.map((milestone, index) => {
              const status = getMilestoneStatus(
                milestone,
                index,
                campaign.totalDonated,
                campaign.targetLamports,
                campaign.lastReleaseTs,
                currentTimestamp,
                disputeWindowSeconds,
                campaign.startTs,
                milestones
              );

              const isActive = status === 'available';
              const milestoneAmountSol = convertLamportsToSol(milestone.amount);

              return (
                <div key={index} className="relative">
                  {/* Timeline Line */}
                  {index < milestones.length - 1 && (
                    <div className={`absolute left-6 top-12 w-0.5 h-16 ${getTimelineColor(status)}`} />
                  )}

                  <div className="flex items-start space-x-4">
                    {/* Timeline Dot */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full border-4 flex items-center justify-center ${status === 'released'
                      ? 'bg-green-500 border-green-200'
                      : status === 'available'
                        ? 'bg-blue-500 border-blue-200'
                        : status === 'disputed'
                          ? 'bg-orange-500 border-orange-200'
                          : 'bg-gray-300 border-gray-200'
                      } ${isActive ? 'animate-pulse' : ''}`}>
                      {getTimelineIcon(status, isActive)}
                    </div>

                    {/* Timeline Content */}
                    <div className="flex-1 min-w-0">
                      <div className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-lg">Milestone {index + 1}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge variant={
                              status === 'released' ? 'default' :
                                status === 'available' ? 'default' :
                                  status === 'disputed' ? 'secondary' : 'outline'
                            }>
                              {status === 'released' ? 'Released' :
                                status === 'available' ? 'Available' :
                                  status === 'disputed' ? 'Dispute Window' : 'Pending'}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                          {milestone.description || `Milestone ${index + 1} - Release ${milestoneAmountSol.toFixed(2)} SOL when conditions are met`}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">Amount:</span>
                            <span className="font-semibold text-primary">
                              {milestoneAmountSol.toFixed(2)} SOL
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Target className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">Progress:</span>
                            <span className="font-semibold">
                              {((milestoneAmountSol / totalTargetSol) * 100).toFixed(1)}% of goal
                            </span>
                          </div>
                        </div>

                        {milestone.released && (
                          <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/10 rounded border border-green-200">
                            <div className="text-xs text-green-600 dark:text-green-400">
                              Released on {new Date(milestone.releaseTs.toNumber() * 1000).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Milestone Cards */}
      {showCards && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Milestone Management</h3>
          <div className="grid gap-4">
            {milestones.map((milestone, index) => (
              <MilestoneCard
                key={index}
                milestone={milestone}
                milestoneIndex={index}
                campaign={campaign}
                onReleaseSuccess={onMilestoneRelease}
                isCreator={isCreator}
                disputeWindowSeconds={disputeWindowSeconds}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
