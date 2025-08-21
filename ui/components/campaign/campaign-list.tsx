'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  SortAsc,
  Grid3X3,
  List,
  Plus,
  RefreshCw,
  TrendingUp,
  Clock,
  Target
} from 'lucide-react';
import { CampaignCard } from './campaign-card';
import { CampaignLoading, CampaignGridLoading } from './campaign-loading';
import { getCampaignDataService, CampaignData, CampaignFilters, mockCampaigns } from '@/lib/solana/campaign-data';
import Link from 'next/link';

interface CampaignListProps {
  showCreateButton?: boolean;
  showFilters?: boolean;
  maxItems?: number;
  layout?: 'grid' | 'list';
  compact?: boolean;
}

export const CampaignList: React.FC<CampaignListProps> = ({
  showCreateButton = true,
  showFilters = true,
  maxItems,
  layout = 'grid',
  compact = false
}) => {
  const { connection } = useConnection();
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(layout);

  const [filters, setFilters] = useState<CampaignFilters>({
    status: undefined,
    category: undefined,
    sortBy: 'newest',
    search: ''
  });

  // Load campaigns
  useEffect(() => {
    const loadCampaigns = async () => {
      setLoading(true);
      setError(null);

      try {
        const campaignService = getCampaignDataService(connection);
        const fetchedCampaigns = await campaignService.fetchAllCampaigns();

        // Use mock data if no campaigns found (for development)
        if (fetchedCampaigns.length === 0) {
          // setCampaigns(mockCampaigns);
        } else {
          setCampaigns(fetchedCampaigns);
        }
      } catch (err) {
        console.error('Error loading campaigns:', err);
        setError('Failed to load campaigns');
        // Fallback to mock data on error
        // setCampaigns(mockCampaigns);
      } finally {
        setLoading(false);
      }
    };

    loadCampaigns();
  }, [connection]);

  // Filter and sort campaigns
  const filteredCampaigns = useMemo(() => {
    const campaignService = getCampaignDataService(connection);
    const filtered = campaignService.filterAndSortCampaigns(campaigns, {
      ...filters,
      search: searchTerm
    });

    return maxItems ? filtered.slice(0, maxItems) : filtered;
  }, [campaigns, filters, searchTerm, maxItems, connection]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const campaignService = getCampaignDataService(connection);
      const freshCampaigns = await campaignService.fetchAllCampaigns();
      setCampaigns(freshCampaigns);
    } catch (err) {
      console.error('Error refreshing campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusCounts = () => {
    return {
      active: campaigns.filter(c => c.status === 'active').length,
      successful: campaigns.filter(c => c.status === 'successful').length,
      failed: campaigns.filter(c => c.status === 'failed').length,
      ended: campaigns.filter(c => c.status === 'ended').length,
    };
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="space-y-6">
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        )}
        {viewMode === 'grid' ? (
          <CampaignGridLoading count={maxItems || 6} compact={compact} />
        ) : (
          <CampaignLoading variant="list" />
        )}
      </div>
    );
  }

  if (error && campaigns.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="space-y-4">
          <Target className="w-12 h-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">Failed to Load Campaigns</h3>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <Button onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      {showFilters && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Campaigns</h2>
              <p className="text-muted-foreground">
                Discover and support innovative projects on Solana
              </p>
            </div>
            {showCreateButton && (
              <Button asChild>
                <Link href="/create">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Link>
              </Button>
            )}
          </div>

          {/* Stats Cards */}
          {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">{statusCounts.active}</div>
                    <div className="text-xs text-muted-foreground">Active</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{statusCounts.successful}</div>
                    <div className="text-xs text-muted-foreground">Successful</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <div>
                    <div className="text-2xl font-bold">{statusCounts.ended}</div>
                    <div className="text-xs text-muted-foreground">Ended</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 text-gray-600" />
                  <div>
                    <div className="text-2xl font-bold">{campaigns.length}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div> */}
        </div>
      )}

      {/* Filters and Search */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select
            value={filters.status || 'all'}
            onValueChange={(value) =>
              setFilters(prev => ({ ...prev, status: value === 'all' ? undefined : value as any }))
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="successful">Successful</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.sortBy || 'newest'}
            onValueChange={(value) =>
              setFilters(prev => ({ ...prev, sortBy: value as any }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="ending_soon">Ending Soon</SelectItem>
              <SelectItem value="most_funded">Most Funded</SelectItem>
              <SelectItem value="alphabetical">A-Z</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Active Filters Display */}
      {(filters.status || filters.category || searchTerm) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.status && (
            <Badge variant="secondary" className="capitalize">
              Status: {filters.status}
              <button
                onClick={() => setFilters(prev => ({ ...prev, status: undefined }))}
                className="ml-2 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          )}
          {filters.category && (
            <Badge variant="secondary" className="capitalize">
              Category: {filters.category}
              <button
                onClick={() => setFilters(prev => ({ ...prev, category: undefined }))}
                className="ml-2 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          )}
          {searchTerm && (
            <Badge variant="secondary">
              Search: "{searchTerm}"
              <button
                onClick={() => setSearchTerm('')}
                className="ml-2 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilters({ sortBy: 'newest' });
              setSearchTerm('');
            }}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Campaign Grid/List */}
      {filteredCampaigns.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <Target className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
            <div>
              <h3 className="text-xl font-semibold">No campaigns found</h3>
              <p className="text-muted-foreground">
                {searchTerm || filters.status || filters.category
                  ? 'Try adjusting your filters or search terms'
                  : 'Be the first to create a campaign!'}
              </p>
            </div>
            {showCreateButton && (
              <Button asChild>
                <Link href="/create">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Campaign
                </Link>
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className={`grid gap-6 ${viewMode === 'grid'
          ? `grid-cols-1 ${compact ? 'md:grid-cols-3 lg:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3'}`
          : 'grid-cols-1'
          }`}>
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              compact={compact || viewMode === 'list'}
              showCreator={!compact}
              onDataRefresh={handleRefresh}
            />
          ))}
        </div>
      )}

      {/* Load More Button (if maxItems is set and there are more items) */}
      {maxItems && campaigns.length > maxItems && (
        <div className="text-center pt-6">
          <Button variant="outline" asChild>
            <Link href="/">
              View All Campaigns
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};
