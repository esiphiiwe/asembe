import { createContext, useContext, type PropsWithChildren } from 'react';
import { useNetInfo } from '@react-native-community/netinfo';

interface NetworkContextValue {
  isConnected: boolean;
}

const NetworkContext = createContext<NetworkContextValue>({ isConnected: true });

export function NetworkProvider({ children }: PropsWithChildren) {
  const netInfo = useNetInfo();
  // Treat null/unknown as connected to avoid false positives on startup
  const isConnected = netInfo.isConnected !== false;

  return (
    <NetworkContext.Provider value={{ isConnected }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
