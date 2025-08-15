import { CreateCampaignBreadcrumb } from '@/components/layout/page-breadcrumb';
import { CampaignCreateForm } from '@/components/campaign/campaign-create-form';

export default function CreateCampaignPage() {
    return (
        <div className="min-h-screen bg-background">
            <CreateCampaignBreadcrumb />

            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Create Your Campaign</h1>
                        <p className="text-muted-foreground">
                            Launch your crowdfunding campaign on the Solana blockchain
                        </p>
                    </div>

                    <CampaignCreateForm />
                </div>
            </div>
        </div>
    );
}
