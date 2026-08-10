import { xLayer, xLayerTestnet } from "@scopesettle/shared";
import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [xLayerTestnet, xLayer],
  connectors: [injected()],
  multiInjectedProviderDiscovery: true,
  ssr: true,
  transports: {
    [xLayerTestnet.id]: http(xLayerTestnet.rpcUrls.default.http[0], {
      timeout: 8_000,
    }),
    [xLayer.id]: http(xLayer.rpcUrls.default.http[0], { timeout: 8_000 }),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
