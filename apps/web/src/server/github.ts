import { z } from "zod";

const API_ORIGIN = "https://api.github.com";
const API_VERSION = "2026-03-10";
const MAX_RESPONSE_BYTES = 2_000_000;
export const MAX_CHANGED_FILES = 100;
export const MAX_CHANGED_LINES = 2_000;
export const MAX_PATCH_BYTES = 120_000;

const repositoryPart = /^[A-Za-z0-9_.-]{1,100}$/u;
const shaSchema = z.string().regex(/^[\da-f]{40}$/u);

const pullSchema = z.object({
  number: z.number().int().positive(),
  state: z.enum(["open", "closed"]),
  draft: z.boolean().nullable().default(false),
  merged: z.boolean().optional().default(false),
  title: z.string().max(1_000),
  body: z.string().nullable(),
  changed_files: z.number().int().nonnegative(),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  html_url: z.url(),
  base: z.object({ sha: shaSchema }),
  head: z.object({ sha: shaSchema }),
});

const fileSchema = z.object({
  sha: z.string(),
  filename: z.string().min(1).max(500),
  status: z.enum([
    "added",
    "removed",
    "modified",
    "renamed",
    "copied",
    "changed",
    "unchanged",
  ]),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  changes: z.number().int().nonnegative(),
  patch: z.string().optional(),
  blob_url: z.url(),
});

const checkRunsSchema = z.object({
  total_count: z.number().int().nonnegative(),
  check_runs: z.array(
    z.object({
      name: z.string().min(1).max(500),
      status: z.enum([
        "queued",
        "in_progress",
        "completed",
        "pending",
        "requested",
        "waiting",
      ]),
      conclusion: z
        .enum([
          "action_required",
          "cancelled",
          "failure",
          "neutral",
          "skipped",
          "stale",
          "startup_failure",
          "success",
          "timed_out",
        ])
        .nullable(),
      details_url: z.url().nullable(),
      head_sha: shaSchema,
    }),
  ),
});

export type GitHubPullReference = {
  owner: string;
  repository: string;
  pullNumber: number;
};
export type GitHubRepositoryReference = { owner: string; repository: string };
export type GitHubPullData = {
  owner: string;
  repository: string;
  pullNumber: number;
  state: "open" | "closed";
  draft: boolean;
  merged: boolean;
  title: string;
  body: string;
  url: string;
  baseSha: string;
  headSha: string;
  changedFileCount: number;
  additions: number;
  deletions: number;
  files: Array<z.infer<typeof fileSchema>>;
  checks: Array<z.infer<typeof checkRunsSchema>["check_runs"][number]>;
  truncated: boolean;
  patchBytes: number;
};

export type GitHubFailureCode =
  | "invalid_url"
  | "not_found"
  | "rate_limited"
  | "timeout"
  | "response_too_large"
  | "invalid_response"
  | "upstream_error";

export class GitHubError extends Error {
  constructor(
    public readonly code: GitHubFailureCode,
    message: string,
    public readonly retryAt?: number,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

export function parseGitHubPullUrl(value: string): GitHubPullReference {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new GitHubError("invalid_url", "Pull request URL is not a valid URL");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname.toLowerCase() !== "github.com" ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new GitHubError(
      "invalid_url",
      "Only public https://github.com pull requests are supported",
    );
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 4 || parts[2] !== "pull") {
    throw new GitHubError(
      "invalid_url",
      "Expected https://github.com/{owner}/{repo}/pull/{number}",
    );
  }
  const owner = parts[0];
  const rawRepository = parts[1];
  const pullPart = parts[3];
  if (!owner || !rawRepository || !pullPart) {
    throw new GitHubError("invalid_url", "Pull request URL is incomplete");
  }
  const repository = rawRepository.endsWith(".git")
    ? rawRepository.slice(0, -4)
    : rawRepository;
  const pullNumber = Number(pullPart);
  if (
    !repositoryPart.test(owner) ||
    !repositoryPart.test(repository) ||
    !Number.isSafeInteger(pullNumber) ||
    pullNumber < 1
  ) {
    throw new GitHubError(
      "invalid_url",
      "Pull request owner, repository, or number is invalid",
    );
  }
  return { owner, repository, pullNumber };
}

export function parseGitHubRepositoryUrl(
  value: string,
): GitHubRepositoryReference {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new GitHubError("invalid_url", "Repository URL is not a valid URL");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname.toLowerCase() !== "github.com" ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash
  ) {
    throw new GitHubError(
      "invalid_url",
      "Only public https://github.com repositories are supported",
    );
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new GitHubError(
      "invalid_url",
      "Expected https://github.com/{owner}/{repository}",
    );
  }
  const repository = parts[1].endsWith(".git")
    ? parts[1].slice(0, -4)
    : parts[1];
  if (!repositoryPart.test(parts[0]) || !repositoryPart.test(repository)) {
    throw new GitHubError("invalid_url", "Repository owner or name is invalid");
  }
  return { owner: parts[0], repository };
}

export class GitHubClient {
  constructor(
    private readonly token = process.env.GITHUB_TOKEN,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async getPullRequest(pullUrl: string): Promise<GitHubPullData> {
    const reference = parseGitHubPullUrl(pullUrl);
    const prefix = `/repos/${encodeURIComponent(reference.owner)}/${encodeURIComponent(reference.repository)}`;
    const pull = pullSchema.parse(
      await this.getJson(`${prefix}/pulls/${reference.pullNumber}`),
    );

    // Requests are intentionally serial to respect GitHub's secondary-limit guidance.
    const files = z
      .array(fileSchema)
      .parse(
        await this.getJson(
          `${prefix}/pulls/${reference.pullNumber}/files?per_page=100&page=1`,
        ),
      );
    const checkRuns = checkRunsSchema.parse(
      await this.getJson(
        `${prefix}/commits/${pull.head.sha}/check-runs?per_page=100&page=1`,
      ),
    );
    const patchBytes = files.reduce(
      (total, file) =>
        total + new TextEncoder().encode(file.patch ?? "").byteLength,
      0,
    );

    return {
      ...reference,
      state: pull.state,
      draft: pull.draft ?? false,
      merged: pull.merged,
      title: pull.title,
      body: pull.body ?? "",
      url: pull.html_url,
      baseSha: pull.base.sha,
      headSha: pull.head.sha,
      changedFileCount: pull.changed_files,
      additions: pull.additions,
      deletions: pull.deletions,
      files,
      checks: checkRuns.check_runs,
      truncated: pull.changed_files > files.length,
      patchBytes,
    };
  }

  private async getJson(path: string): Promise<unknown> {
    const url = new URL(path, API_ORIGIN);
    if (url.origin !== API_ORIGIN)
      throw new GitHubError("invalid_url", "Blocked non-GitHub API origin");
    let response: Response;
    try {
      response = await this.fetcher(url, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "ScopeSettle/0.1",
          "X-GitHub-Api-Version": API_VERSION,
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
        redirect: "error",
        signal: AbortSignal.timeout(12_000),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new GitHubError(
          "timeout",
          "GitHub did not respond before the timeout",
        );
      }
      throw new GitHubError(
        "upstream_error",
        "GitHub request failed before receiving a response",
      );
    }

    const length = Number(response.headers.get("content-length") ?? "0");
    if (length > MAX_RESPONSE_BYTES) {
      throw new GitHubError(
        "response_too_large",
        "GitHub response exceeded the metadata limit",
      );
    }
    if (response.status === 404)
      throw new GitHubError("not_found", "Public pull request was not found");
    if (response.status === 403 || response.status === 429) {
      const reset = Number(response.headers.get("x-ratelimit-reset") ?? "0");
      throw new GitHubError(
        "rate_limited",
        "GitHub API rate limit reached",
        reset || undefined,
      );
    }
    if (!response.ok) {
      throw new GitHubError(
        "upstream_error",
        `GitHub returned HTTP ${response.status}`,
      );
    }

    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) {
      throw new GitHubError(
        "response_too_large",
        "GitHub response exceeded the metadata limit",
      );
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new GitHubError(
        "invalid_response",
        "GitHub returned malformed JSON",
      );
    }
  }
}
