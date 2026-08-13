# Verified research

Verified on 2026-08-12 from primary sources. Links are retained so facts can be rechecked
immediately before deployment and submission.

## Hackathon

- The official AI Season runs August 7–21, 2026 and ends at **23:59 UTC on August 21**.
- A project must incorporate AI and deploy on X Layer Testnet, then launch on Mainnet.
- A dedicated project X account and a submission post mentioning `@XLayerOfficial` are required.
- Judging includes AI application, innovation, completeness, user value, X Layer integration,
  growth potential, ecosystem contribution, onchain data, code quality, and market potential.
- The Launch Grant volume rules are irrelevant to ScopeSettle and explicitly warn against
  wash trading and manipulation.
- The form currently asks for project name, description, URL, GitHub, email, Telegram,
  X handle, and X post URL.

Sources: [official hackathon page](https://web3.okx.com/xlayer/build-x-series),
[official submission form](https://docs.google.com/forms/d/e/1FAIpQLSfgU_3zcXdxK0GJQxj33QeUWdEcAaYnieVe9p5cFDb2JFQa4Q/viewform?usp=publish-editor).

The August 20 internal release target is a ScopeSettle planning decision, not an official rule.

## X Layer

| Property         |                                    Mainnet |                                         Testnet |
| ---------------- | -----------------------------------------: | ----------------------------------------------: |
| Chain ID         |                                      `196` |                                          `1952` |
| Native gas token |                                      `OKB` |                                           `OKB` |
| RPC              |                  `https://rpc.xlayer.tech` |           `https://testrpc.xlayer.tech/terigon` |
| Alternate RPC    |                `https://xlayerrpc.okx.com` |         `https://xlayertestrpc.okx.com/terigon` |
| Explorer         | `https://www.okx.com/web3/explorer/xlayer` | `https://www.okx.com/web3/explorer/xlayer-test` |

The official documentation describes X Layer as an EVM-equivalent Ethereum L2 using an
enhanced OP Stack. The faucet states that Testnet provides OKB, USDG, and other valueless
test assets. No USDG contract address is stated on the inspected network page or faucet;
therefore no address will be invented. `MockUSDG` is the local default and may be deployed
to Testnet only if an official usable address cannot be verified at deployment time.

Sources: [network information](https://web3.okx.com/onchainos/dev-docs/xlayer/developer/build-on-xlayer/network-information),
[X Layer developer overview](https://web3.okx.com/onchainos/dev-docs/xlayer/developer/build-on-xlayer/about-xlayer),
[official faucet](https://web3.okx.com/xlayer/faucet).

The official X Layer documentation repository identifies native Mainnet USDC as
`0x74b7f16337b8972027f6196a17a631ac6de26d22`. On 2026-08-12, both official Mainnet RPCs returned
chain ID `196`, identical non-empty runtime code for this address, symbol `USDC`, and `6` decimals.
It is the current payment-token candidate; the exact immutable deployment inputs still require
fresh owner confirmation before broadcast.

Source: [official X Layer contract-address table](https://github.com/okx/xlayer-docs/blob/main/developer/build-on-xlayer/contracts.mdx).

Official X Layer documentation confirms Foundry verification through OKLink and requires waiting at
least one minute after deployment. OKLink's current supported-chain list includes
`XLAYER_TESTNET`, making the verifier endpoint
`https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER_TESTNET`.
The deployment workflow derives constructor arguments from the immutable deployment inputs and
uses `--watch` for all three contracts.

Sources: [X Layer Foundry verification](https://web3.okx.com/onchainos/dev-docs/xlayer/developer/verify-a-smart-contract/verify-with-foundry),
[OKLink verification plugin documentation](https://www.oklink.com/docs/en/).

## ERC-8183

ERC-8183 is currently a **Draft** ERC titled “Agentic Commerce.” The inspected specification
defines six states: Open, Funded, Submitted, Completed, Rejected, and Expired. It requires
client/provider/evaluator roles, a single ERC-20 payment path, front-running protection on
funding through `expectedBudget`, a `bytes32` deliverable commitment, evaluator-only terminal
decisions after submission, and permissionless expiry refunds as the recommended behavior.
At the exact expiry boundary, both evaluator settlement and `claimRefund` remain permitted from
`Submitted`; normal EVM transaction ordering makes the first terminal transition win.

The EIP explicitly identifies the evaluator as trusted, provides no dispute court, recommends
SafeERC20 and reentrancy protection, and supports reason hashes as audit commitments. Its
reference implementation is broader and upgradeable; ScopeSettle intentionally implements
the smaller allowed non-hooked, zero-fee, non-upgradeable form and pins compatibility to the
draft reviewed on 2026-08-10.

Sources: [official EIP-8183](https://eips.ethereum.org/EIPS/eip-8183),
[OKX ERC-8183 article](https://web3.okx.com/learn/erc-8183).

## GitHub and model APIs

GitHub ingestion uses the official REST pull-request, changed-files, and check-runs endpoints. It
pins check runs to the exact PR head SHA, caps responses/diffs, handles rate limits, and sends the
current documented `X-GitHub-Api-Version: 2026-03-10` header. Authentication is optional for public
repositories and only increases the documented rate limit.

Sources: [GitHub pull requests API](https://docs.github.com/en/rest/pulls/pulls),
[GitHub check runs API](https://docs.github.com/en/rest/checks/runs),
[GitHub REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).

The production evaluator uses the official server-side OpenAI JavaScript SDK and Responses API.
Structured output is supplied through a JSON-schema text format and validated again with Zod;
`store: false` is explicit. The model name and key are environment configuration, never hardcoded.

Sources: [OpenAI API quickstart](https://platform.openai.com/docs/quickstart),
[Responses API reference](https://platform.openai.com/docs/api-reference/responses).

## Facts still requiring deployment-time verification

- Whether faucet USDG is a standard ERC-20 usable by the escrow and its exact Testnet address.
- Final RPC health, fee estimates, deployer balance, and chain ID immediately before broadcasting.
- Hosted AI-backed app URL, dedicated X account/post, and demo video. The Mainnet contracts are
  deployed and source-verified, but no Mainnet job or user activity is claimed.
- The EIP’s draft text may change; compatibility must be re-diffed before public deployment.
