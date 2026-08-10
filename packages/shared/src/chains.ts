import { defineChain } from "viem";

export const xLayer = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.xlayer.tech", "https://xlayerrpc.okx.com"] },
  },
  blockExplorers: {
    default: {
      name: "OKX Explorer",
      url: "https://www.okx.com/web3/explorer/xlayer",
    },
  },
});

export const xLayerTestnet = defineChain({
  id: 1952,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        "https://testrpc.xlayer.tech/terigon",
        "https://xlayertestrpc.okx.com/terigon",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "OKX Explorer",
      url: "https://www.okx.com/web3/explorer/xlayer-test",
    },
  },
  testnet: true,
});

export const supportedChains = [xLayerTestnet, xLayer] as const;

export function explorerTransactionUrl(
  chainId: number,
  transactionHash: string,
): string | null {
  const chain = supportedChains.find((candidate) => candidate.id === chainId);
  return chain
    ? `${chain.blockExplorers.default.url}/tx/${transactionHash}`
    : null;
}

export function explorerAddressUrl(
  chainId: number,
  address: string,
): string | null {
  const chain = supportedChains.find((candidate) => candidate.id === chainId);
  return chain
    ? `${chain.blockExplorers.default.url}/address/${address}`
    : null;
}
