import type { Page } from "@playwright/test";
import { agenticCommerceAbi, erc20Abi } from "@scopesettle/shared";
import {
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionResult,
  parseAbiParameters,
  zeroAddress,
} from "viem";

export const accounts = {
  client: "0x000000000000000000000000000000000000cafe",
  provider: "0x000000000000000000000000000000000000beef",
  reviewer: "0x0000000000000000000000000000000000004444",
} as const;

const commerce = "0x1111111111111111111111111111111111111111";
const evaluator = "0x2222222222222222222222222222222222222222";
const paymentToken = "0x3333333333333333333333333333333333333333";

export async function installMockWallet(
  page: Page,
  options: {
    account?: `0x${string}`;
    chainId?: number;
    rejectTransactionAt?: number;
  } = {},
): Promise<void> {
  await page.addInitScript(
    ({ account, initialChainId, rejectTransactionAt }) => {
      type Listener = (value: unknown) => void;
      const listeners = new Map<string, Set<Listener>>();
      const state = {
        chainId: initialChainId,
        rejectionUsed: false,
        sentTransactions: [] as Array<Record<string, unknown>>,
      };
      const emit = (event: string, value: unknown) => {
        for (const listener of listeners.get(event) ?? []) listener(value);
      };
      const provider = {
        async request({
          method,
          params,
        }: {
          method: string;
          params?: readonly unknown[];
        }) {
          if (method === "eth_accounts" || method === "eth_requestAccounts") {
            return [account];
          }
          if (method === "eth_chainId")
            return `0x${state.chainId.toString(16)}`;
          if (method === "wallet_switchEthereumChain") {
            const requested = params?.[0] as { chainId?: string } | undefined;
            state.chainId = Number.parseInt(requested?.chainId ?? "0x0", 16);
            emit("chainChanged", requested?.chainId);
            return null;
          }
          if (method === "wallet_addEthereumChain") return null;
          if (method === "personal_sign" || method === "eth_signTypedData_v4") {
            return `0x${"77".repeat(65)}`;
          }
          if (method === "eth_sendTransaction") {
            const transaction = (params?.[0] ?? {}) as Record<string, unknown>;
            state.sentTransactions.push(transaction);
            if (
              rejectTransactionAt === state.sentTransactions.length &&
              !state.rejectionUsed
            ) {
              state.rejectionUsed = true;
              const error = new Error("User rejected the request") as Error & {
                code: number;
              };
              error.code = 4001;
              throw error;
            }
            return `0x${state.sentTransactions.length.toString(16).padStart(64, "0")}`;
          }
          if (method === "eth_estimateGas") return "0x5208";
          if (method === "eth_getTransactionCount") return "0x0";
          if (
            method === "eth_gasPrice" ||
            method === "eth_maxPriorityFeePerGas"
          ) {
            return "0x1";
          }
          if (method === "wallet_getCapabilities") return {};
          throw new Error(`Unsupported mock wallet method: ${method}`);
        },
        on(event: string, listener: Listener) {
          const eventListeners = listeners.get(event) ?? new Set<Listener>();
          eventListeners.add(listener);
          listeners.set(event, eventListeners);
        },
        removeListener(event: string, listener: Listener) {
          listeners.get(event)?.delete(listener);
        },
      };
      Object.defineProperty(window, "ethereum", {
        configurable: true,
        value: provider,
      });
      Object.defineProperty(window, "__scopeSettleMockWallet", {
        configurable: true,
        value: state,
      });
    },
    {
      account: options.account ?? accounts.client,
      initialChainId: options.chainId ?? 1952,
      rejectTransactionAt: options.rejectTransactionAt ?? 0,
    },
  );
}

export async function mockAuthentication(page: Page): Promise<void> {
  await page.route("**/api/auth/nonce", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        domain: "localhost:3418",
        expiresAt: "2099-01-01T00:00:00.000Z",
        nonce: "scope1234",
        uri: "http://localhost:3418",
      },
      status: 200,
    });
  });
  await page.route("**/api/auth/verify", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { address: accounts.client, chainId: 1952 },
      status: 200,
    });
  });
}

type RpcRequest = {
  id: number;
  jsonrpc: "2.0";
  method: string;
  params?: unknown[];
};

export async function mockRpc(page: Page): Promise<void> {
  const topics = encodeEventTopics({
    abi: agenticCommerceAbi,
    args: { client: accounts.client, jobId: 7n, provider: accounts.provider },
    eventName: "JobCreated",
  });
  const eventData = encodeAbiParameters(
    parseAbiParameters("address evaluator, uint256 expiredAt, address hook"),
    [evaluator, 4_102_444_800n, zeroAddress],
  );
  const blockHash = `0x${"ab".repeat(32)}`;
  const respond = (request: RpcRequest) => {
    const hash = String(request.params?.[0] ?? `0x${"00".repeat(32)}`);
    const transactionNumber = Number.parseInt(hash.slice(2), 16);
    let result: unknown;
    if (request.method === "eth_chainId") result = "0x7a0";
    else if (request.method === "eth_blockNumber") result = "0x64";
    else if (request.method === "eth_getTransactionReceipt") {
      result = {
        blockHash,
        blockNumber: "0x64",
        contractAddress: null,
        cumulativeGasUsed: "0x5208",
        effectiveGasPrice: "0x1",
        from: accounts.client,
        gasUsed: "0x5208",
        logs:
          transactionNumber === 1
            ? [
                {
                  address: commerce,
                  blockHash,
                  blockNumber: "0x64",
                  data: eventData,
                  logIndex: "0x0",
                  removed: false,
                  topics,
                  transactionHash: hash,
                  transactionIndex: "0x0",
                },
              ]
            : [],
        logsBloom: `0x${"00".repeat(256)}`,
        status: "0x1",
        to: commerce,
        transactionHash: hash,
        transactionIndex: "0x0",
        type: "0x2",
      };
    } else if (request.method === "eth_getBlockByNumber") {
      result = {
        baseFeePerGas: "0x1",
        hash: blockHash,
        number: "0x64",
        timestamp: "0x7fffffff",
      };
    } else if (request.method === "eth_call") {
      const call = request.params?.[0] as
        { data?: `0x${string}`; to?: string } | undefined;
      if (call?.to?.toLowerCase() === commerce && call.data) {
        const decoded = decodeFunctionData({
          abi: agenticCommerceAbi,
          data: call.data,
        });
        if (decoded.functionName !== "getJob")
          throw new Error(`Unsupported commerce call: ${decoded.functionName}`);
        result = encodeFunctionResult({
          abi: agenticCommerceAbi,
          functionName: "getJob",
          result: {
            budget: 0n,
            client: accounts.client,
            deliverable: `0x${"00".repeat(32)}`,
            description: "fixture",
            evaluator,
            expiredAt: 4_102_444_800n,
            hook: zeroAddress,
            id: 7n,
            policy: {
              challengeWindow: 86_400,
              minimumConfidence: 7_500,
              minimumScore: 8_000,
              rubricHash: `0x${"00".repeat(32)}`,
              specificationHash: `0x${"00".repeat(32)}`,
            },
            provider: accounts.provider,
            status: 0,
          },
        });
      } else if (call?.to?.toLowerCase() === paymentToken && call.data) {
        const decoded = decodeFunctionData({ abi: erc20Abi, data: call.data });
        if (decoded.functionName !== "allowance")
          throw new Error(`Unsupported token call: ${decoded.functionName}`);
        result = encodeFunctionResult({
          abi: erc20Abi,
          functionName: "allowance",
          result: 0n,
        });
      } else {
        throw new Error("Unsupported mock eth_call target");
      }
    } else if (request.method === "eth_getCode") result = "0x6000";
    else if (request.method === "eth_estimateGas") result = "0x5208";
    else throw new Error(`Unsupported mock RPC method: ${request.method}`);
    return { id: request.id, jsonrpc: "2.0", result };
  };

  await page.route("https://testrpc.xlayer.tech/**", async (route) => {
    const payload = route.request().postDataJSON() as RpcRequest | RpcRequest[];
    const response = Array.isArray(payload)
      ? payload.map((request) => respond(request))
      : respond(payload);
    await route.fulfill({
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      json: response,
      status: 200,
    });
  });
}

export async function connectWallet(
  page: Page,
  addressSuffix = "cafe",
): Promise<void> {
  await page
    .getByRole("button", { exact: true, name: "Connect wallet" })
    .click();
  await page
    .getByRole("button", {
      name: new RegExp(`0x0000.*${addressSuffix}`, "iu"),
    })
    .waitFor();
}
