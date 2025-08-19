"use client"
import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Keypair } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createProgram } from '@/lib/solana/program';
import { createInstructionBuilder, convertMilestonesToProgram, handleProgramError } from '@/lib/solana/instructions';
import { CreateCampaignParams } from '@/lib/types';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Trash2,
  Eye,
  Loader2,
  Target,
  Calendar,
  FileText,
  Milestone,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

// Form validation schema
const milestoneSchema = z.object({
  amount: z
    .number()
    .min(0.001, 'Milestone amount must be at least 0.1 SOL')
    .max(1000, 'Milestone amount cannot exceed 1000 SOL'),
  description: z
    .string()
    .min(10, 'Milestone description must be at least 10 characters')
    .max(150, 'Milestone description cannot exceed 150 characters'),
});

const campaignSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title cannot exceed 100 characters'),
  description: z
    .string()
    .min(5, 'Description must be at least 50 characters')
    .max(500, 'Description cannot exceed 500 characters'),
  imageUrl: z
    .string()
    .url('Please enter a valid image URL')
    .max(200, 'Image url cannot exceed 200 characters')
    .optional()
    .or(z.literal('')),
  // targetAmount: z
  //   .number()
  //   .min(0.01, 'Target amount must be at least 0.01 SOL')
  //   .max(10000, 'Target amount cannot exceed 10,000 SOL'),
  duration: z
    .number()
    .min(1, 'Duration must be at least 1 day')
    .max(365, 'Duration cannot exceed 365 days'),
  milestones: z
    .array(milestoneSchema)
    .min(1, 'At least one milestone is required')
    .max(3, 'Maximum 3 milestones allowed')
    .refine(
      (milestones) => {
        const totalMilestoneAmount = milestones.reduce((sum, m) => sum + m.amount, 0);
        return totalMilestoneAmount <= milestones.length * 1000; // reasonable check
      },
      'Total milestone amounts seem unreasonable'
    ),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

interface CampaignCreateFormProps {
  onSuccess?: () => void;
}

export const CampaignCreateForm: React.FC<CampaignCreateFormProps> = ({
  onSuccess,
}) => {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: '',
      description: '',
      imageUrl: '',
      // targetAmount: 0.1,
      duration: 30,
      milestones: [
        { amount: 0.05, description: 'Initial milestone to get started' },
      ],
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'milestones',
  });

  // Calculate form completion progress
  const watchedFields = form.watch();
  const calculateProgress = () => {
    let completedFields = 0;
    const totalFields = 3; // title, description, targetAmount, duration

    if (watchedFields.title && watchedFields.title.length >= 5) completedFields++;
    if (watchedFields.description && watchedFields.description.length >= 5) completedFields++;
    // if (watchedFields.targetAmount && watchedFields.targetAmount >= 0.01) completedFields++;
    if (watchedFields.duration && watchedFields.duration >= 1) completedFields++;

    return Math.round((completedFields / totalFields) * 100);
  };

  const addMilestone = () => {
    if (fields.length < 3) {
      append({ amount: 0.05, description: '' });
    }
  };

  const removeMilestone = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const onSubmit = async (data: CampaignFormData) => {
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmedSubmit = async () => {
    const data = form.getValues();
    setIsSubmitting(true);
    setShowConfirmDialog(false);

    try {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected or does not support signing');
      }

      // Generate campaign keypair
      const campaignKeypair = Keypair.generate();

      // Convert form data to blockchain format
      const durationSeconds = data.duration * 24 * 60 * 60; // Duration in seconds as number

      // Validate milestone data
      const validMilestones = data.milestones.filter(m => m.amount > 0 && m.description.trim().length > 0);
      if (validMilestones.length === 0) {
        throw new Error('At least one valid milestone is required');
      }

      // Pad milestone arrays to exactly 3 elements (required by IDL)
      const paddedMilestoneAmounts: BN[] = [];
      const paddedMilestoneDescriptions: string[] = [];

      for (let i = 0; i < 3; i++) {
        if (i < validMilestones.length) {
          paddedMilestoneAmounts.push(new BN(Math.floor(validMilestones[i].amount * 1_000_000_000)));
          paddedMilestoneDescriptions.push(validMilestones[i].description.trim());
        } else {
          // Fill empty slots with zero amounts and empty descriptions
          paddedMilestoneAmounts.push(new BN(0));
          paddedMilestoneDescriptions.push('');
        }
      }

      const campaignParams: CreateCampaignParams = {
        title: data.title.trim(),
        description: data.description.trim(),
        imageUrl: data.imageUrl?.trim() || '',
        // targetAmount: new BN(Math.floor(data.targetAmount * 1_000_000_000)), // Convert SOL to lamports
        deadline: new BN(durationSeconds), // Convert to BN for consistency
        milestoneAmounts: paddedMilestoneAmounts,
        milestoneDescriptions: paddedMilestoneDescriptions,
      };

      // Log parameters for debugging
      console.log('Campaign creation parameters:', {
        title: campaignParams.title,
        description: campaignParams.description,
        imageUrl: campaignParams.imageUrl,
        // targetAmount: campaignParams.targetAmount.toString(),
        deadline: campaignParams.deadline.toString(),
        milestoneAmounts: campaignParams.milestoneAmounts.map(m => m.toString()),
        milestoneDescriptions: campaignParams.milestoneDescriptions,
      });

      // Create program instance
      const program = createProgram(connection, { publicKey, signTransaction });
      const instructionBuilder = createInstructionBuilder(program);

      // Build transaction
      const transaction = await instructionBuilder.buildCreateCampaignTransaction(
        publicKey,
        campaignKeypair.publicKey,
        campaignParams
      );

      // Get recent blockhash and set fee payer first
      const { blockhash } = await program.provider.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Add campaign keypair as signer after setting blockhash
      transaction.partialSign(campaignKeypair);

      // Sign and send transaction
      const signedTransaction = await signTransaction(transaction);
      const signature = await program.provider.connection.sendRawTransaction(
        signedTransaction.serialize()
      );

      // Confirm transaction
      await program.provider.connection.confirmTransaction(signature, 'confirmed');

      toast.success('Campaign created successfully!', {
        description: `Transaction: ${signature.slice(0, 20)}...`,
        action: {
          label: 'View',
          onClick: () => window.open(`https://explorer.solana.com/tx/${signature}`, '_blank'),
        },
      });

      // Reset form and redirect
      form.reset();
      onSuccess?.();
      router.push('/');
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign', {
        description: handleProgramError(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = calculateProgress();

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Campaign Creation Progress</CardTitle>
            <Badge variant={progress === 100 ? 'default' : 'secondary'}>
              {progress}% Complete
            </Badge>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter a compelling campaign title"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A clear, descriptive title for your campaign (5-100 characters)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your campaign, its goals, and how the funds will be used..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Detailed description of your campaign (50-2000 characters)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Image URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/image.jpg"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional: Add an image URL to showcase your campaign
                    </FormDescription>
                    <FormMessage />
                    {field.value && (
                      <div className="mt-2">
                        <div className="relative w-full max-w-md mx-auto">
                          <img
                            src={field.value}
                            alt="Campaign preview"
                            className="w-full h-48 object-cover rounded-lg border"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                            onLoad={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'block';
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Campaign Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Campaign Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* <FormField
                  control={form.control}
                  name="targetAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Amount (SOL)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="10000"
                          placeholder="0.1"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Funding goal in SOL (1-10,000)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                /> */}

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (Days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          placeholder="30"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Campaign duration (1-365 days)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Milestones */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Milestone className="h-5 w-5" />
                  Campaign Milestones
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMilestone}
                  disabled={fields.length >= 3}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Milestone
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id} className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium">Milestone {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMilestone(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name={`milestones.${index}.amount`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (SOL)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.001"
                              min="0.001"
                              max="10000"
                              placeholder="0.02"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name={`milestones.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Describe what this milestone achieves..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </Card>
              ))}

              <FormDescription>
                Add milestones to show backers how funds will be used (1-5 milestones)
              </FormDescription>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPreview(true)}
              disabled={progress < 100}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview Campaign
            </Button>

            <Button
              type="submit"
              disabled={!publicKey || progress < 100 || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Campaign...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create Campaign
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Campaign Preview</DialogTitle>
            <DialogDescription>
              Review your campaign before creating it
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Title</h3>
              <p className="text-muted-foreground">{watchedFields.title || 'No title set'}</p>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {watchedFields.description || 'No description set'}
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              {/* <div>
                <h3 className="font-semibold mb-2">Target Amount</h3>
                <p className="text-muted-foreground">{watchedFields.targetAmount} SOL</p>
              </div> */}
              <div>
                <h3 className="font-semibold mb-2">Duration</h3>
                <p className="text-muted-foreground">{watchedFields.duration} days</p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">Milestones</h3>
              <div className="space-y-2">
                {watchedFields.milestones?.map((milestone, index) => (
                  <div key={index} className="flex justify-between items-start p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">Milestone {index + 1}</p>
                      <p className="text-sm text-muted-foreground">{milestone.description}</p>
                    </div>
                    <Badge variant="secondary">{milestone.amount} SOL</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Confirm Campaign Creation
            </DialogTitle>
            <DialogDescription>
              You are about to create a new crowdfunding campaign. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {/* <div className="flex justify-between">
              <span>Target Amount:</span>
              <span className="font-medium">{watchedFields.targetAmount} SOL</span>
            </div> */}
            <div className="flex justify-between">
              <span>Duration:</span>
              <span className="font-medium">{watchedFields.duration} days</span>
            </div>
            <div className="flex justify-between">
              <span>Milestones:</span>
              <span className="font-medium">{watchedFields.milestones?.length}</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmedSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Confirm & Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
