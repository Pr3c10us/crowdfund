'use client';

import React, { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Lock,
  Unlock,
  Shield,
  AlertTriangle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { CampaignData } from '@/lib/solana/campaign-data';
import { 
  createLockCampaignTransaction,
  getSystemConfig,
  checkSystemInitialized 
} from '@/lib/solana/admin-utils';

interface CampaignLockControlProps {
  campaign: CampaignData;
  onLockStatusChange?: (locked: boolean) => void;
}

export const CampaignLockControl: React.FC<CampaignLockControlProps> = ({
  campaign,
  onLockStatusChange
}) => {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [processing, setProcessing] = useState(false);
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [systemInitialized, setSystemInitialized] = useState(false);

  React.useEffect(() => {
    checkAdminStatus();
  }, [publicKey, connection]);

  const checkAdminStatus = async () => {
    if (!publicKey || !signTransaction) return;

    try {
      const initialized = await checkSystemInitialized(connection);
      setSystemInitialized(initialized);

      if (initialized) {
        const systemConfig = await getSystemConfig(connection, {
          publicKey,
          signTransaction,
          signAllTransactions: async (txs: any) => Promise.all(txs.map((tx: any) => signTransaction(tx))),
          payer: publicKey
        } as any);
        
        if (systemConfig && systemConfig.authority.equals(publicKey)) {
          setIsAdmin(true);
        }
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const handleLockCampaign = async (locked: boolean) => {
    if (!publicKey || !signTransaction) return;

    try {
      setProcessing(true);
      const campaignPubkey = new PublicKey(campaign.id);
      
      const tx = await createLockCampaignTransaction(
        connection,
        publicKey,
        campaignPubkey,
        locked,
        { publicKey, signTransaction, signAllTransactions: async (txs: any) => Promise.all(txs.map((tx: any) => signTransaction(tx))), payer: publicKey } as any
      );

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signedTx = await signTransaction(tx);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature, 'confirmed');

      toast.success(`Campaign ${locked ? 'locked' : 'unlocked'} successfully!`);
      setShowLockDialog(false);
      setShowUnlockDialog(false);
      
      if (onLockStatusChange) {
        onLockStatusChange(locked);
      }
    } catch (error: any) {
      console.error(`Error ${locked ? 'locking' : 'unlocking'} campaign:`, error);
      toast.error(error?.message || `Failed to ${locked ? 'lock' : 'unlock'} campaign`);
    } finally {
      setProcessing(false);
    }
  };

  if (!systemInitialized) {
    return null;
  }

  const isLocked = (campaign as any).locked || false;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Campaign Status</span>
        </div>
        <Badge variant={isLocked ? "destructive" : "default"}>
          {isLocked ? (
            <>
              <Lock className="w-3 h-3 mr-1" />
              Locked
            </>
          ) : (
            <>
              <Unlock className="w-3 h-3 mr-1" />
              Unlocked
            </>
          )}
        </Badge>
      </div>

      {/* Only show action buttons if user is admin */}
      {isAdmin && (
        <div className="flex space-x-2">
        {!isLocked ? (
          <Dialog open={showLockDialog} onOpenChange={setShowLockDialog}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Lock className="w-4 h-4 mr-2" />
                Lock Campaign
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Lock className="w-5 h-5 mr-2 text-destructive" />
                  Lock Campaign
                </DialogTitle>
                <DialogDescription>
                  Locking this campaign will prevent any milestone funds from being released until unlocked.
                </DialogDescription>
              </DialogHeader>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> This action will immediately prevent milestone releases. 
                  Campaign creators will not be able to access funds until the campaign is unlocked.
                </AlertDescription>
              </Alert>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowLockDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => handleLockCampaign(true)}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Locking...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Lock Campaign
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm">
                <Unlock className="w-4 h-4 mr-2" />
                Unlock Campaign
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Unlock className="w-5 h-5 mr-2 text-green-600" />
                  Unlock Campaign
                </DialogTitle>
                <DialogDescription>
                  Unlocking this campaign will allow milestone funds to be released again.
                </DialogDescription>
              </DialogHeader>
              
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  This action will restore normal milestone release functionality for the campaign creator.
                </AlertDescription>
              </Alert>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowUnlockDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleLockCampaign(false)}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Unlocking...
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4 mr-2" />
                      Unlock Campaign
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        </div>
      )}

      {isLocked && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription className="text-sm">
            This campaign is locked. Milestone funds cannot be released until unlocked by an admin.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
