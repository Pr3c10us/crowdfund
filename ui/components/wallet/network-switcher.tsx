'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Globe, TestTube, Zap } from 'lucide-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { useNetwork } from './wallet-provider';

const networkIcons = {
  [WalletAdapterNetwork.Mainnet]: Globe,
  [WalletAdapterNetwork.Devnet]: TestTube,
  [WalletAdapterNetwork.Testnet]: Zap,
};

const networkColors = {
  [WalletAdapterNetwork.Mainnet]: 'default' as const,
  [WalletAdapterNetwork.Devnet]: 'secondary' as const,
  [WalletAdapterNetwork.Testnet]: 'outline' as const,
};

export const NetworkSwitcher: React.FC = () => {
  const { network, setNetwork, networkName, isConnecting, connectionError } = useNetwork();

  const handleNetworkChange = (newNetwork: WalletAdapterNetwork) => {
    setNetwork(newNetwork);
  };

  const Icon = networkIcons[network];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-2 h-8"
          disabled={isConnecting}
        >
          <Badge 
            variant={connectionError ? 'destructive' : networkColors[network]}
            className="flex items-center gap-1 px-2 py-1"
          >
            <Icon className="w-3 h-3" />
            {networkName}
          </Badge>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {Object.values(WalletAdapterNetwork).map((net) => {
          const NetworkIcon = networkIcons[net];
          const isSelected = net === network;
          
          return (
            <DropdownMenuItem
              key={net}
              onClick={() => handleNetworkChange(net)}
              className={`flex items-center gap-2 ${isSelected ? 'bg-muted' : ''}`}
            >
              <NetworkIcon className="w-4 h-4" />
              <span className="flex-1">
                {net === WalletAdapterNetwork.Mainnet && 'Mainnet Beta'}
                {net === WalletAdapterNetwork.Devnet && 'Devnet'}
                {net === WalletAdapterNetwork.Testnet && 'Testnet'}
              </span>
              {isSelected && (
                <Badge variant="default" className="text-xs px-1 py-0">
                  Active
                </Badge>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
