import { CampaignList } from '@/components/campaign/campaign-list';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <CampaignList showCreateButton={true} showFilters={true} />
      </div>
    </div>
  );
}
