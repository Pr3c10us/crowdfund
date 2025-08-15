import { CampaignsBreadcrumb } from '@/components/layout/page-breadcrumb';
import { CampaignList } from '@/components/campaign/campaign-list';

export default function CampaignsPage() {
  return (
    <div className="min-h-screen bg-background">
      <CampaignsBreadcrumb />
      
      <div className="container mx-auto px-4 py-8">
        <CampaignList showCreateButton={true} showFilters={true} />
      </div>
    </div>
  );
}
