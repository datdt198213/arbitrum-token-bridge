import { http, createConfig } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
 
export const config = getDefaultConfig({
    appName: 'My RainbowKit App',
    projectId: 'YOUR_PROJECT_ID',
  chains: [arbitrumSepolia],
//   connectors: [
//     coinbaseWallet({ appName: 'Create Wagmi', preference: 'all' }),
//   ],
  transports: {
    [arbitrumSepolia.id]: http('https://sepolia-rollup.arbitrum.io/rpc'),
  },
});
 
declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}