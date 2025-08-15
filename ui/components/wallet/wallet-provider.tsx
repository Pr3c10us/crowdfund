'use client';

import React, { FC, ReactNode, useMemo, createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
  useConnection,
  useWallet,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { getAllWallets } from '@/lib/solana/wallet';
import { NETWORKS, DEFAULT_NETWORK, createConnection } from '@/lib/solana/config';
import { toast } from 'sonner';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface NetworkContextType {
  network: WalletAdapterNetwork;
  setNetwork: (network: WalletAdapterNetwork) => void;
  endpoint: string;
  networkName: string;
  isConnecting: boolean;
  connectionError: string | null;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

interface WalletContextProviderProps {
  children: ReactNode;
}

const NetworkProvider: FC<{ children: ReactNode; network: WalletAdapterNetwork; setNetwork: (network: WalletAdapterNetwork) => void }> = ({
  children,
  network,
  setNetwork,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const { connection } = useConnection();
  const { connected, disconnect } = useWallet();

  const endpoint = NETWORKS[network].endpoint;
  const networkName = NETWORKS[network].name;

  // Test connection when network changes
  useEffect(() => {
    const testConnection = async () => {
      if (!connection) return;
      
      setIsConnecting(true);
      setConnectionError(null);
      
      try {
        await connection.getLatestBlockhash();
        if (connectionError) {
          toast.success(`Connected to ${networkName}`);
        }
      } catch (error) {
        const errorMessage = `Failed to connect to ${networkName}`;
        setConnectionError(errorMessage);
        toast.error(errorMessage);
        console.error('Connection test failed:', error);
      } finally {
        setIsConnecting(false);
      }
    };

    testConnection();
  }, [connection, network, networkName, connectionError]);

  // Handle network switching
  const handleSetNetwork = useCallback(async (newNetwork: WalletAdapterNetwork) => {
    if (connected) {
      try {
        await disconnect();
        toast.info('Wallet disconnected due to network change');
      } catch (error) {
        console.error('Error disconnecting wallet:', error);
      }
    }
    setNetwork(newNetwork);
  }, [connected, disconnect, setNetwork]);

  const contextValue: NetworkContextType = {
    network,
    setNetwork: handleSetNetwork,
    endpoint,
    networkName,
    isConnecting,
    connectionError,
  };

  return (
    <NetworkContext.Provider value={contextValue}>
      {children}
    </NetworkContext.Provider>
  );
};

export const WalletContextProvider: FC<WalletContextProviderProps> = ({
  children,
}) => {
  const [network, setNetwork] = useState<WalletAdapterNetwork>(DEFAULT_NETWORK);
  
  const walletAdapters = useMemo(() => getAllWallets(network), [network]);
  const connection = useMemo(() => createConnection(network), [network]);

  return (
    <ConnectionProvider endpoint={NETWORKS[network].endpoint}>
      <WalletProvider 
        wallets={walletAdapters} 
        autoConnect
        onError={(error) => {
          console.error('Wallet error:', error);
          toast.error(`Wallet error: ${error.message}`);
        }}
      >
        <WalletModalProvider>
          <NetworkProvider network={network} setNetwork={setNetwork}>
            {children}
          </NetworkProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
