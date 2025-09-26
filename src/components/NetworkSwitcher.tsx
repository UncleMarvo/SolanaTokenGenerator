import { FC } from "react";
import dynamic from "next/dynamic";
import { MdNetworkCheck } from "react-icons/md";

import { useNetworkConfiguration } from "../contexts/NetworkConfigurationProvider";

const NetworkSwitcher: FC = () => {
  const { networkConfiguration, setNetworkConfiguration } =
    useNetworkConfiguration();

  const getNetworkDisplayName = (network: string) => {
    switch (network) {
      case "mainnet-beta":
        return "Mainnet";
      case "devnet":
        return "Devnet";
      case "testnet":
        return "Testnet";
      default:
        return "Devnet";
    }
  };

  const getNetworkColor = (network: string) => {
    switch (network) {
      case "mainnet-beta":
        return "text-green-500";
      case "devnet":
        return "text-yellow-500";
      case "testnet":
        return "text-blue-500";
      default:
        return "text-yellow-500";
    }
  };

  const getNetworkBgColor = (network: string) => {
    switch (network) {
      case "mainnet-beta":
        return "bg-green-500";
      case "devnet":
        return "bg-yellow-500";
      case "testnet":
        return "bg-blue-500";
      default:
        return "bg-yellow-500";
    }
  };

  return (
    <div className="relative">
      <select
        value={networkConfiguration}
        onChange={(e) => setNetworkConfiguration(e.target.value || "devnet")}
        className="appearance-none bg-bg/40 backdrop-blur-2xl border border-muted/20 rounded-lg pl-8 pr-8 py-2 text-fg text-sm font-medium cursor-pointer hover:border-muted/40 transition-all duration-300 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        style={{
          background: 'var(--bg)',
          color: 'var(--fg)'
        }}
      >
        <option 
          value="mainnet-beta" 
          style={{ 
            background: 'var(--bg)', 
            color: 'var(--fg)' 
          }}
        >
          Mainnet
        </option>
        <option 
          value="devnet" 
          style={{ 
            background: 'var(--bg)', 
            color: 'var(--fg)' 
          }}
        >
          Devnet
        </option>
        <option 
          value="testnet" 
          style={{ 
            background: 'var(--bg)', 
            color: 'var(--fg)' 
          }}
        >
          Testnet
        </option>
      </select>
      
      {/* Custom dropdown arrow */}
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <svg 
          className="w-4 h-4 text-muted" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      {/* Network status icon */}
      {/*
      <div className="absolute ml-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <MdNetworkCheck className={`w-4 h-4 ${getNetworkBgColor(networkConfiguration)}`} />
      </div>
      */}
      
      {/* Network indicator dot */}
      <div className={`absolute ml-2 top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full ${getNetworkBgColor(networkConfiguration)}`}></div>
    </div>
  );
};

export default dynamic(() => Promise.resolve(NetworkSwitcher), { ssr: false });
