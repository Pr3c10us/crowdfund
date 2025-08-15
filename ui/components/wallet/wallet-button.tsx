'use client';

import React, { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Wallet, 
  ChevronDown, 
  Copy, 
  ExternalLink, 
  Power, 
  Wifi, 
  WifiOff,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useNetwork } from './wallet-provider';
import { formatSol } from '@/lib/solana/config';
import { toast } from 'sonner';

export const WalletButton: React.FC = () => {
  const { 
    connected, 
    connecting, 
    disconnecting,
    publicKey, 
    wallet,
    wallets,
    select,
    connect,
    disconnect
  } = useWallet();
  const { connection } = useConnection();
  const { network, networkName, isConnecting, connectionError } = useNetwork();
  const [isOpen, setIsOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Fetch wallet balance
  const fetchBalance = useCallback(async () => {
    if (!publicKey || !connection) return;
    
    setLoadingBalance(true);
    try {
      const balance = await connection.getBalance(publicKey);
      setBalance(balance);
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoadingBalance(false);
    }
  }, [publicKey, connection]);

  // Copy address to clipboard
  const copyAddress = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      await navigator.clipboard.writeText(publicKey.toBase58());
      toast.success('Address copied to clipboard');
    } catch (error) {
      console.error('Failed to copy address:', error);
      toast.error('Failed to copy address');
    }
  }, [publicKey]);

  // Handle wallet selection
  const handleWalletSelect = useCallback(async (walletName: string) => {
    const selectedWallet = wallets.find(w => w.adapter.name === walletName);
    if (selectedWallet) {
      try {
        // Only select if not already selected
        if (wallet?.adapter.name !== walletName) {
          select(selectedWallet.adapter.name);
        }
        
        // Only connect if not already connected or connecting
        if (!connected && !connecting) {
          await connect();
        }
        
        setIsOpen(false);
        toast.success(`Connected to ${walletName}`);
      } catch (error) {
        console.error('Connection failed:', error);
        toast.error(`Failed to connect to ${walletName}`);
      }
    }
  }, [wallets, select, connect, wallet, connected, connecting]);

  // Handle disconnect
  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
      setIsOpen(false);
      toast.info('Wallet disconnected');
    } catch (error) {
      console.error('Disconnect failed:', error);
      toast.error('Failed to disconnect wallet');
    }
  }, [disconnect]);

  // Fetch balance when dialog opens and wallet is connected
  React.useEffect(() => {
    if (isOpen && connected && publicKey) {
      fetchBalance();
    }
  }, [isOpen, connected, publicKey, fetchBalance]);

  // Connection status indicator
  const getConnectionStatus = () => {
    if (connectionError) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <WifiOff className="w-3 h-3" />
          Connection Error
        </Badge>
      );
    }
    if (isConnecting) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Connecting...
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <Wifi className="w-3 h-3" />
        {networkName}
      </Badge>
    );
  };

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        {getConnectionStatus()}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2 transition-all hover:shadow-md">
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">
                {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
              </span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Wallet Connected
              </DialogTitle>
              <DialogDescription>
                {wallet?.adapter.name} wallet is connected to {networkName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Wallet Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Address:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyAddress}
                    className="h-auto p-1 hover:bg-muted"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <div className="bg-muted p-2 rounded text-xs font-mono break-all">
                  {publicKey.toBase58()}
                </div>
              </div>

              {/* Balance */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Balance:</span>
                <div className="flex items-center gap-2">
                  {loadingBalance ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : balance !== null ? (
                    <span className="text-sm font-mono">{formatSol(balance)} SOL</span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchBalance}
                      className="text-xs"
                    >
                      Load Balance
                    </Button>
                  )}
                </div>
              </div>

              {/* Network Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Network:</span>
                {getConnectionStatus()}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://explorer.solana.com/address/${publicKey.toBase58()}?cluster=${network}`, '_blank')}
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Explorer
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="flex-1"
                >
                  {disconnecting ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Power className="w-4 h-4 mr-1" />
                  )}
                  Disconnect
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {getConnectionStatus()}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            className="flex items-center gap-2 transition-all hover:shadow-md"
            disabled={connecting}
          >
            {connecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wallet className="w-4 h-4" />
            )}
            {connecting ? 'Connecting...' : 'Connect Wallet'}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Wallet</DialogTitle>
            <DialogDescription>
              Choose a wallet to connect to {networkName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {wallets
              .filter(wallet => wallet.readyState === WalletReadyState.Installed || wallet.readyState === WalletReadyState.Loadable)
              .map((wallet) => (
                <Button
                  key={wallet.adapter.name}
                  variant="outline"
                  className="w-full justify-start gap-3 h-12 transition-all hover:shadow-md hover:scale-[1.02]"
                  onClick={() => handleWalletSelect(wallet.adapter.name)}
                >
                  <img
                    src={wallet.adapter.icon}
                    alt={wallet.adapter.name}
                    className="w-6 h-6"
                  />
                  <span className="font-medium">{wallet.adapter.name}</span>
                  {wallet.readyState === WalletReadyState.Installed && (
                    <CheckCircle2 className="w-4 h-4 ml-auto text-green-500" />
                  )}
                </Button>
              ))}
            
            {wallets
              .filter(wallet => wallet.readyState === WalletReadyState.NotDetected)
              .map((wallet) => (
                <Button
                  key={wallet.adapter.name}
                  variant="ghost"
                  className="w-full justify-start gap-3 h-12 opacity-50"
                  onClick={() => window.open(wallet.adapter.url, '_blank')}
                >
                  <img
                    src={wallet.adapter.icon}
                    alt={wallet.adapter.name}
                    className="w-6 h-6"
                  />
                  <span className="font-medium">{wallet.adapter.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">Not Installed</span>
                  <ExternalLink className="w-3 h-3" />
                </Button>
              ))}
          </div>
          
          {connectionError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-md">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <span className="text-sm text-destructive">{connectionError}</span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
