'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Home, ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface PageBreadcrumbProps {
  items?: BreadcrumbItem[];
  showHome?: boolean;
  maxItems?: number;
}

export const PageBreadcrumb: React.FC<PageBreadcrumbProps> = ({
  items,
  showHome = true,
  maxItems = 4,
}) => {
  const pathname = usePathname();

  // Generate breadcrumb items from pathname if not provided
  const generateBreadcrumbItems = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbItems: BreadcrumbItem[] = [];

    segments.forEach((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/');
      const isLast = index === segments.length - 1;

      // Convert segment to readable label
      let label = segment.charAt(0).toUpperCase() + segment.slice(1);

      // Handle special cases
      if (segment === 'campaigns') {
        label = 'Campaigns';
      } else if (segment === 'create') {
        label = 'Create Campaign';
      } else if (segment === 'dashboard') {
        label = 'Dashboard';
      } else if (segment.length > 20) {
        // Truncate long segments (likely IDs)
        label = segment.substring(0, 20) + '...';
      }

      breadcrumbItems.push({
        label,
        href: isLast ? undefined : href,
      });
    });

    return breadcrumbItems;
  };

  const breadcrumbItems = items || generateBreadcrumbItems();

  // Don't show breadcrumb on home page unless items are explicitly provided
  if (pathname === '/' && !items) {
    return null;
  }

  // Handle ellipsis for long breadcrumb chains
  const shouldShowEllipsis = breadcrumbItems.length > maxItems;
  const visibleItems = shouldShowEllipsis
    ? [
      ...breadcrumbItems.slice(0, 1),
      ...breadcrumbItems.slice(-(maxItems - 2))
    ]
    : breadcrumbItems;

  return (
    <div className="border-b bg-muted/30">
      <div className="container mx-auto px-4 py-3">
        <Breadcrumb>
          <BreadcrumbList>
            {showHome && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/" className="flex items-center">
                      <Home className="h-4 w-4" />
                      <span className="sr-only">Home</span>
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbItems.length > 0 && <BreadcrumbSeparator />}
              </>
            )}

            {shouldShowEllipsis && breadcrumbItems.length > maxItems && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={breadcrumbItems[0].href || '#'}>
                      {breadcrumbItems[0].label}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbEllipsis />
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}

            {visibleItems.map((item, index) => {
              const isLast = index === visibleItems.length - 1;
              const shouldSkipFirst = shouldShowEllipsis && breadcrumbItems.length > maxItems && index === 0;

              if (shouldSkipFirst) return null;

              return (
                <React.Fragment key={`${item.label}-${index}`}>
                  <BreadcrumbItem>
                    {item.href && !isLast ? (
                      <BreadcrumbLink asChild>
                        <Link href={item.href} className="flex items-center">
                          {item.icon && <item.icon className="mr-1 h-4 w-4" />}
                          {item.label}
                        </Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="flex items-center">
                        {item.icon && <item.icon className="mr-1 h-4 w-4" />}
                        {item.label}
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
};

// Preset breadcrumb configurations for common pages
export const CampaignsBreadcrumb: React.FC = () => (
  <PageBreadcrumb
    items={[
      { label: 'Campaigns', href: '/' }
    ]}
  />
);

export const CreateCampaignBreadcrumb: React.FC = () => (
  <PageBreadcrumb
    items={[
      { label: 'Campaigns', href: '/' },
      { label: 'Create Campaign' }
    ]}
  />
);

export const DashboardBreadcrumb: React.FC = () => (
  <PageBreadcrumb
    items={[
      { label: 'Dashboard' }
    ]}
  />
);

interface CampaignDetailBreadcrumbProps {
  campaignTitle: string;
  campaignId: string;
}

export const CampaignDetailBreadcrumb: React.FC<CampaignDetailBreadcrumbProps> = ({
  campaignTitle,
  campaignId,
}) => (
  <PageBreadcrumb
    items={[
      { label: 'Campaigns', href: '/' },
      { label: campaignTitle.length > 30 ? campaignTitle.substring(0, 30) + '...' : campaignTitle }
    ]}
  />
);
