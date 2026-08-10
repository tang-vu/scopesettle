import { parseAbi } from "viem";

export const agenticCommerceAbi = parseAbi([
  "function paymentToken() view returns (address)",
  "function jobCounter() view returns (uint256)",
  "function escrowedTotal() view returns (uint256)",
  "function createScopedJob(address provider,address evaluator,uint64 expiredAt,string description,(bytes32 specificationHash,bytes32 rubricHash,uint16 minimumScore,uint16 minimumConfidence,uint32 challengeWindow) policy) returns (uint256 jobId)",
  "function setProvider(uint256 jobId,address provider,bytes optParams)",
  "function setBudget(uint256 jobId,uint256 amount,bytes optParams)",
  "function fund(uint256 jobId,uint256 expectedBudget,bytes optParams)",
  "function submit(uint256 jobId,bytes32 deliverable,bytes optParams)",
  "function complete(uint256 jobId,bytes32 reason,bytes optParams)",
  "function reject(uint256 jobId,bytes32 reason,bytes optParams)",
  "function claimRefund(uint256 jobId)",
  "function getJob(uint256 jobId) view returns ((uint256 id,address client,address provider,address evaluator,string description,uint256 budget,uint64 expiredAt,uint8 status,address hook,bytes32 deliverable,(bytes32 specificationHash,bytes32 rubricHash,uint16 minimumScore,uint16 minimumConfidence,uint32 challengeWindow) policy) job)",
  "function settlementContext(uint256 jobId) view returns ((address client,address provider,address evaluator,uint64 expiredAt,uint8 status,bytes32 deliverable,uint16 minimumScore,uint16 minimumConfidence,uint32 challengeWindow) context)",
  "event JobCreated(uint256 indexed jobId,address indexed client,address indexed provider,address evaluator,uint256 expiredAt,address hook)",
  "event ScopeCommitted(uint256 indexed jobId,bytes32 indexed specificationHash,bytes32 indexed rubricHash,uint16 minimumScore,uint16 minimumConfidence,uint32 challengeWindow)",
  "event BudgetSet(uint256 indexed jobId,uint256 amount)",
  "event JobFunded(uint256 indexed jobId,address indexed client,uint256 amount)",
  "event JobSubmitted(uint256 indexed jobId,address indexed provider,bytes32 deliverable)",
  "event JobCompleted(uint256 indexed jobId,address indexed evaluator,bytes32 reason)",
  "event JobRejected(uint256 indexed jobId,address indexed rejector,bytes32 reason)",
  "event JobExpired(uint256 indexed jobId)",
  "event PaymentReleased(uint256 indexed jobId,address indexed provider,uint256 amount)",
  "event Refunded(uint256 indexed jobId,address indexed client,uint256 amount)",
]);

export const scopeSettleEvaluatorAbi = parseAbi([
  "function verdictSigner() view returns (address)",
  "function reviewer() view returns (address)",
  "function proposeVerdict((uint256 jobId,bytes32 deliverableHash,bytes32 reportHash,uint16 score,uint16 confidence,uint8 outcome,uint256 nonce,uint64 deadline) verdict,bytes signature)",
  "function challenge(uint256 jobId,bytes32 reasonHash)",
  "function finalize(uint256 jobId)",
  "function resolveManualReview(uint256 jobId,bool approved,bytes32 resolutionReasonHash)",
  "function getProposal(uint256 jobId) view returns ((bytes32 deliverableHash,bytes32 reportHash,bytes32 verdictDigest,uint64 proposedAt,uint64 challengeUntil,uint16 score,uint16 confidence,uint8 outcome,bool challenged,bool finalized,bool exists) proposal)",
  "function hashVerdict((uint256 jobId,bytes32 deliverableHash,bytes32 reportHash,uint16 score,uint16 confidence,uint8 outcome,uint256 nonce,uint64 deadline) verdict) view returns (bytes32)",
  "event VerdictProposed(uint256 indexed jobId,bytes32 indexed reportHash,bytes32 indexed verdictDigest,bytes32 deliverableHash,uint16 score,uint16 confidence,uint8 outcome,uint64 challengeUntil)",
  "event VerdictChallenged(uint256 indexed jobId,address indexed challenger,bytes32 indexed reasonHash)",
  "event VerdictFinalized(uint256 indexed jobId,bytes32 indexed reportHash,uint8 indexed outcome)",
]);

export const erc20Abi = parseAbi([
  "function allowance(address owner,address spender) view returns (uint256)",
  "function approve(address spender,uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]);

export const jobStatusNames = [
  "Open",
  "Funded",
  "Submitted",
  "Completed",
  "Rejected",
  "Expired",
] as const;
