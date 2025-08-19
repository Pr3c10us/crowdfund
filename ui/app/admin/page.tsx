'use client';

import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Settings,
  Shield,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Key,
  Timer,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { WalletButton } from '@/components/wallet/wallet-button';
import {
  checkSystemInitialized,
  getSystemConfig,
  createInitiateContractTransaction,
  createUpdateAuthorityTransaction,
  createUpdateDisputeSecondsTransaction,
  formatDisputeWindow,
  validateDisputeWindow,
  timeToSeconds,
  daysToSeconds,
  secondsToMinutes,
  secondsToHours,
  secondsToDays
} from '@/lib/solana/admin-utils';

interface SystemConfig {
  authority: PublicKey;
  disputeSeconds: number;
}

export default function AdminPage() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Form states
  const [newAuthority, setNewAuthority] = useState('');
  const [newDisputeValue, setNewDisputeValue] = useState(7);
  const [newDisputeUnit, setNewDisputeUnit] = useState<'minutes' | 'hours' | 'days'>('days');
  const [initDisputeValue, setInitDisputeValue] = useState(7);
  const [initDisputeUnit, setInitDisputeUnit] = useState<'minutes' | 'hours' | 'days'>('days');

  // Dialog states
  const [showInitDialog, setShowInitDialog] = useState(false);
  const [showAuthorityDialog, setShowAuthorityDialog] = useState(false);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);

  const isAdmin = systemConfig && publicKey && systemConfig.authority.equals(publicKey);

  useEffect(() => {
    loadSystemConfig();
  }, [connection, publicKey]);

  const loadSystemConfig = async () => {
    if (!publicKey || !signTransaction) return;

    try {
      setLoading(true);
      const initialized = await checkSystemInitialized(connection);
      setIsInitialized(initialized);

      if (initialized) {
        const config = await getSystemConfig(connection, {
          publicKey,
          signTransaction,
          signAllTransactions: async (txs: any) => Promise.all(txs.map((tx: any) => signTransaction(tx))),
          payer: publicKey
        } as any);

        if (config) {
          setSystemConfig({
            authority: config.authority,
            disputeSeconds: config.disputeSeconds.toNumber()
          });
        }
      }
    } catch (error) {
      console.error('Error loading system config:', error);
      toast.error('Failed to load system configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeSystem = async () => {
    if (!publicKey || !signTransaction) return;

    const validation = validateDisputeWindow(timeToSeconds(initDisputeValue, initDisputeUnit));
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    try {
      setProcessing(true);
      const tx = await createInitiateContractTransaction(
        connection,
        publicKey,
        timeToSeconds(initDisputeValue, initDisputeUnit),
        { publicKey, signTransaction, signAllTransactions: async (txs: any) => Promise.all(txs.map((tx: any) => signTransaction(tx))), payer: publicKey } as any
      );

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signedTx = await signTransaction(tx);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature, 'confirmed');

      toast.success('System initialized successfully!');
      setShowInitDialog(false);
      await loadSystemConfig();
    } catch (error: any) {
      console.error('Error initializing system:', error);
      toast.error(error?.message || 'Failed to initialize system');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateAuthority = async () => {
    if (!publicKey || !signTransaction || !systemConfig) return;

    let newAuthorityPubkey: PublicKey;
    try {
      newAuthorityPubkey = new PublicKey(newAuthority);
    } catch {
      toast.error('Invalid authority address');
      return;
    }

    try {
      setProcessing(true);
      const tx = await createUpdateAuthorityTransaction(
        connection,
        publicKey,
        newAuthorityPubkey,
        { publicKey, signTransaction, signAllTransactions: async (txs: any) => Promise.all(txs.map((tx: any) => signTransaction(tx))), payer: publicKey } as any
      );

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signedTx = await signTransaction(tx);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature, 'confirmed');

      toast.success('Authority updated successfully!');
      setShowAuthorityDialog(false);
      setNewAuthority('');
      await loadSystemConfig();
    } catch (error: any) {
      console.error('Error updating authority:', error);
      toast.error(error?.message || 'Failed to update authority');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateDisputeWindow = async () => {
    if (!publicKey || !signTransaction) return;

    const validation = validateDisputeWindow(timeToSeconds(newDisputeValue, newDisputeUnit));
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    try {
      setProcessing(true);
      const tx = await createUpdateDisputeSecondsTransaction(
        connection,
        publicKey,
        timeToSeconds(newDisputeValue, newDisputeUnit),
        { publicKey, signTransaction, signAllTransactions: async (txs: any) => Promise.all(txs.map((tx: any) => signTransaction(tx))), payer: publicKey } as any
      );

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signedTx = await signTransaction(tx);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature, 'confirmed');

      toast.success('Dispute window updated successfully!');
      setShowDisputeDialog(false);
      await loadSystemConfig();
    } catch (error: any) {
      console.error('Error updating dispute window:', error);
      toast.error(error?.message || 'Failed to update dispute window');
    } finally {
      setProcessing(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-12 flex flex-col items-center">
              <Shield className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
              <h2 className="text-2xl font-bold mb-4">Admin Access Required</h2>
              <p className="text-muted-foreground mb-6">
                Connect your wallet to access the admin panel.
              </p>
              <WalletButton />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading system configuration...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
              <Settings className="mr-3 h-8 w-8" />
              System Administration
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage system configuration and campaign controls
            </p>
          </div>
          <Button onClick={loadSystemConfig} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* System Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <p className="text-sm text-muted-foreground">System State</p>
                <Badge variant={isInitialized ? "default" : "destructive"} className="">
                  {isInitialized ? "Initialized" : "Not Initialized"}
                </Badge>
              </div>
              {systemConfig && (
                <>
                  <div className="text-center">
                    <Badge variant={isAdmin ? "default" : "secondary"} className="mb-2">
                      {isAdmin ? "Admin" : "Read Only"}
                    </Badge>
                    <p className="text-sm text-muted-foreground">Access Level</p>
                  </div>
                  <div className="text-center">
                    <Badge variant="outline" className="mb-2">
                      {formatDisputeWindow(systemConfig.disputeSeconds)}
                    </Badge>
                    <p className="text-sm text-muted-foreground">Dispute Window</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {!isInitialized ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-orange-600">
                <AlertTriangle className="mr-2 h-5 w-5" />
                System Not Initialized
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  The system must be initialized before campaigns can be created. Only the deployer can initialize the system.
                </AlertDescription>
              </Alert>

              <Dialog open={showInitDialog} onOpenChange={setShowInitDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Settings className="mr-2 h-4 w-4" />
                    Initialize System
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Initialize System</DialogTitle>
                    <DialogDescription>
                      Set the initial dispute window for milestone releases.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="initDisputeValue">Dispute Window</Label>
                      <div className="flex gap-2">
                        <Input
                          id="initDisputeValue"
                          type="number"
                          min="1"
                          value={initDisputeValue}
                          onChange={(e) => setInitDisputeValue(Number(e.target.value))}
                          className="flex-1"
                        />
                        <Select value={initDisputeUnit} onValueChange={(value: 'minutes' | 'hours' | 'days') => setInitDisputeUnit(value)}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minutes">Min</SelectItem>
                            <SelectItem value="hours">Hrs</SelectItem>
                            <SelectItem value="days">Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Time window for disputing milestone releases (minimum 1 minute)
                      </p>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowInitDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleInitializeSystem} disabled={processing}>
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Initializing...
                        </>
                      ) : (
                        'Initialize'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="config" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="campaigns">Campaign Management</TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-6">
              {/* Current Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="mr-2 h-5 w-5" />
                    Current Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">System Authority</Label>
                      <div className="mt-1 p-2 bg-muted rounded text-sm font-mono overflow-auto">
                        {systemConfig?.authority.toString()}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Dispute Window</Label>
                      <div className="mt-1 p-2 bg-muted rounded text-sm">
                        {systemConfig && formatDisputeWindow(systemConfig.disputeSeconds)}
                        ({systemConfig && secondsToDays(systemConfig.disputeSeconds).toFixed(1)} days)
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Admin Actions */}
              {isAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Update Authority */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Key className="mr-2 h-5 w-5" />
                        Update Authority
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Transfer admin privileges to a new wallet address.
                      </p>
                      <Dialog open={showAuthorityDialog} onOpenChange={setShowAuthorityDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full">
                            <User className="mr-2 h-4 w-4" />
                            Change Authority
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Update System Authority</DialogTitle>
                            <DialogDescription>
                              Enter the new authority wallet address. This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="newAuthority">New Authority Address</Label>
                              <Input
                                id="newAuthority"
                                placeholder="Enter wallet address..."
                                value={newAuthority}
                                onChange={(e) => setNewAuthority(e.target.value)}
                              />
                            </div>
                          </div>

                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowAuthorityDialog(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleUpdateAuthority} disabled={processing || !newAuthority}>
                              {processing ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                'Update Authority'
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>

                  {/* Update Dispute Window */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Timer className="mr-2 h-5 w-5" />
                        Update Dispute Window
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Modify the time window for disputing milestone releases.
                      </p>
                      <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full">
                            <Clock className="mr-2 h-4 w-4" />
                            Update Dispute Window
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Update Dispute Window</DialogTitle>
                            <DialogDescription>
                              Set the new dispute window for milestone releases.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="newDisputeValue">Dispute Window</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="newDisputeValue"
                                  type="number"
                                  min="1"
                                  value={newDisputeValue}
                                  onChange={(e) => setNewDisputeValue(Number(e.target.value))}
                                  className="flex-1"
                                />
                                <Select value={newDisputeUnit} onValueChange={(value: 'minutes' | 'hours' | 'days') => setNewDisputeUnit(value)}>
                                  <SelectTrigger className="w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="minutes">Min</SelectItem>
                                    <SelectItem value="hours">Hrs</SelectItem>
                                    <SelectItem value="days">Days</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Current: {systemConfig && formatDisputeWindow(systemConfig.disputeSeconds)}
                              </p>
                            </div>
                          </div>

                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDisputeDialog(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleUpdateDisputeWindow} disabled={processing}>
                              {processing ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                'Update Window'
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                </div>
              )}

              {!isAdmin && systemConfig && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You are not the system authority. Only the authority ({systemConfig.authority.toString().slice(0, 8)}...) can modify system configuration.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="campaigns">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Campaign lock/unlock functionality will be integrated into individual campaign pages.
                    Admins can lock campaigns to prevent milestone fund releases.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
