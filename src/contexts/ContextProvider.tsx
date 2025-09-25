import { WalletAdapterNetwork, WalletError } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider as ReactUIWalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  SolletExtensionWalletAdapter,
  SolletWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { Cluster, clusterApiUrl } from "@solana/web3.js";
import { getConnection } from "../lib/rpc";
import { FC, ReactNode, useCallback, useMemo } from "react";
import { AutoConnectProvider, useAutoConnect } from "./AutoConnectProvider";
import { notify } from "../utils/notifications";
import {
  NetworkConfigurationProvider,
  useNetworkConfiguration,
} from "./NetworkConfigurationProvider";
import { CreateTokenModalProvider } from "./CreateTokenModalProvider";

const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { autoConnect } = useAutoConnect();
  const { networkConfiguration } = useNetworkConfiguration();
  const network = networkConfiguration as WalletAdapterNetwork;

  const originalEndpoint = useMemo(() => clusterApiUrl(network), [network]);
  let endpoint;

  // [STORE IN .ENV]
  // endpoint href
  if (network == "mainnet-beta") {
    endpoint = "https://solana-mainnet.g.alchemy.com/v2/BdasatJE2UYn8qoquRi-6B7jZcEfznT5";
  } else if (network == "devnet") {
    // Use the RPC fallback system for devnet
    endpoint = process.env.NEXT_PUBLIC_RPC_ENDPOINT || originalEndpoint;
    console.log("[ContextProvider] Using devnet endpoint:", endpoint);
  } else {
    endpoint = originalEndpoint;
  }

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new SolletWalletAdapter(),
      new SolletExtensionWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    [network]
  );

  const onError = useCallback((error: WalletError) => {
    notify({
      type: "error",
      message: error.message ? `${error.name}: ${error.message}` : error.name,
    });
    console.error(error);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        onError={onError}
        autoConnect={autoConnect}
      >
        <ReactUIWalletModalProvider>{children}</ReactUIWalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export const ContextProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  return (
    <>
      <NetworkConfigurationProvider>
        <AutoConnectProvider>
          <WalletContextProvider>
            <CreateTokenModalProvider>
              {children}
            </CreateTokenModalProvider>
          </WalletContextProvider>
        </AutoConnectProvider>
      </NetworkConfigurationProvider>
    </>
  );
};
