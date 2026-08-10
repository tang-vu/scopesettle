import { describe, expect, it, vi } from "vitest";

import { GitHubClient, GitHubError, parseGitHubPullUrl } from "./github";

const pullResponse = {
  number: 7,
  state: "open",
  draft: false,
  merged: false,
  title: "Change",
  body: "Description",
  changed_files: 1,
  additions: 2,
  deletions: 1,
  html_url: "https://github.com/acme/repo/pull/7",
  base: { sha: "1111111111111111111111111111111111111111" },
  head: { sha: "2222222222222222222222222222222222222222" },
};

function jsonResponse(value: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("GitHub URL boundary", () => {
  it("accepts only exact public pull-request URLs", () => {
    expect(parseGitHubPullUrl("https://github.com/acme/repo/pull/7")).toEqual({
      owner: "acme",
      repository: "repo",
      pullNumber: 7,
    });
    for (const unsafe of [
      "http://github.com/acme/repo/pull/7",
      "https://github.com.evil.test/acme/repo/pull/7",
      "https://127.0.0.1/acme/repo/pull/7",
      "https://github.com@evil.test/acme/repo/pull/7",
      "https://github.com/acme/repo/issues/7",
    ]) {
      expect(() => parseGitHubPullUrl(unsafe), unsafe).toThrow(GitHubError);
    }
  });
});

describe("GitHub client", () => {
  it("pins check-run lookup to the immutable head SHA", async () => {
    const seen: string[] = [];
    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      const url = input.toString();
      seen.push(url);
      if (url.includes("/files")) {
        return jsonResponse([
          {
            sha: "a",
            filename: "src/a.ts",
            status: "modified",
            additions: 2,
            deletions: 1,
            changes: 3,
            patch: "+safe",
            blob_url: "https://github.com/acme/repo/blob/222/src/a.ts",
          },
        ]);
      }
      if (url.includes("/check-runs"))
        return jsonResponse({ total_count: 0, check_runs: [] });
      return jsonResponse(pullResponse);
    }) as typeof fetch;
    const result = await new GitHubClient(undefined, fetcher).getPullRequest(
      "https://github.com/acme/repo/pull/7",
    );
    expect(result.headSha).toBe("2222222222222222222222222222222222222222");
    expect(seen[2]).toContain(
      "/commits/2222222222222222222222222222222222222222/check-runs",
    );
  });

  it("surfaces rate limits without retrying", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response("rate limited", {
          status: 429,
          headers: { "x-ratelimit-reset": "1800000000" },
        }),
    ) as typeof fetch;
    const request = new GitHubClient(undefined, fetcher).getPullRequest(
      "https://github.com/acme/repo/pull/7",
    );
    await expect(request).rejects.toMatchObject({
      code: "rate_limited",
      retryAt: 1_800_000_000,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("rejects oversized responses before parsing", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response("{}", {
          status: 200,
          headers: { "content-length": "2000001" },
        }),
    ) as typeof fetch;
    await expect(
      new GitHubClient(undefined, fetcher).getPullRequest(
        "https://github.com/acme/repo/pull/7",
      ),
    ).rejects.toMatchObject({ code: "response_too_large" });
  });
});
