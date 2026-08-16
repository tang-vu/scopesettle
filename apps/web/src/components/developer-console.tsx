"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CircleAlert,
  Clipboard,
  Code2,
  KeyRound,
  RefreshCw,
  RotateCw,
  Send,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useConnection, useSignMessage } from "wagmi";

import { authenticateWallet } from "@/lib/wallet-auth";

type Organization = {
  id: string;
  name: string;
  role: "owner" | "member";
  createdAt: string;
};

type ApiKeyRecord = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

type WebhookEndpoint = {
  id: string;
  name: string;
  url: string;
  eventTypes: string[];
  chainId: number;
  jobId: string;
  active: boolean;
};

type Delivery = {
  id: string;
  endpointName: string;
  eventType: string;
  status: string;
  attemptCount: number;
  responseStatus: number | null;
  lastError: string | null;
  createdAt: string;
};

type AuditEvent = {
  id: string;
  actorType: string;
  action: string;
  targetType: string;
  createdAt: string;
};

type OneTimeSecret = {
  label: string;
  value: string;
  ownerAddress: string;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Request failed.");
  return result;
}

function dateLabel(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "Never";
}

function SecretNotice({ secret }: { readonly secret: OneTimeSecret }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(secret.value);
    setCopied(true);
  }
  return (
    <div className="secret-notice" role="status">
      <div>
        <strong>{secret.label}</strong>
        <p>Copy it now. ScopeSettle will not reveal this secret again.</p>
      </div>
      <code>{secret.value}</code>
      <button
        className="button button-secondary button-small"
        onClick={copy}
        type="button"
      >
        {copied ? (
          <Check aria-hidden="true" size={14} />
        ) : (
          <Clipboard aria-hidden="true" size={14} />
        )}
        {copied ? "Copied" : "Copy secret"}
      </button>
    </div>
  );
}

export function DeveloperConsole() {
  const connection = useConnection();
  const { signMessageAsync } = useSignMessage();
  const queryClient = useQueryClient();
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("");
  const [organizationName, setOrganizationName] = useState("");
  const [keyName, setKeyName] = useState("Production verifier");
  const [webhookName, setWebhookName] = useState("Evaluation events");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookJobId, setWebhookJobId] = useState("");
  const [secret, setSecret] = useState<OneTimeSecret | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const organizations = useQuery({
    enabled: connection.status === "connected",
    queryFn: () =>
      api<{ organizations: Organization[] }>("/api/developer/organizations"),
    queryKey: ["developer-organizations", connection.address],
    retry: false,
  });

  const organizationRecords = organizations.data?.organizations ?? [];
  const organizationId = organizationRecords.some(
    (organization) => organization.id === selectedOrganizationId,
  )
    ? selectedOrganizationId
    : (organizationRecords[0]?.id ?? "");

  const keys = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () =>
      api<{ keys: ApiKeyRecord[] }>(
        `/api/developer/api-keys?organizationId=${encodeURIComponent(organizationId)}`,
      ),
    queryKey: ["developer-api-keys", organizationId],
    retry: false,
  });
  const webhooks = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () =>
      api<{ endpoints: WebhookEndpoint[] }>(
        `/api/developer/webhooks?organizationId=${encodeURIComponent(organizationId)}`,
      ),
    queryKey: ["developer-webhooks", organizationId],
    retry: false,
  });
  const deliveries = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () =>
      api<{ deliveries: Delivery[] }>(
        `/api/developer/webhook-deliveries?organizationId=${encodeURIComponent(organizationId)}`,
      ),
    queryKey: ["developer-deliveries", organizationId],
    retry: false,
  });
  const audit = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () =>
      api<{ events: AuditEvent[] }>(
        `/api/developer/audit?organizationId=${encodeURIComponent(organizationId)}`,
      ),
    queryKey: ["developer-audit", organizationId],
    retry: false,
  });

  async function run(label: string, operation: () => Promise<void>) {
    setBusy(label);
    setActionError(null);
    try {
      await operation();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Request failed.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function unlock() {
    if (!connection.address || !connection.chainId) return;
    const address = connection.address;
    const chainId = connection.chainId;
    await run("unlock", async () => {
      await authenticateWallet({
        address,
        chainId,
        signMessage: (message) => signMessageAsync({ message }),
      });
      await queryClient.invalidateQueries({
        queryKey: ["developer-organizations"],
      });
    });
  }

  async function createOrganization(event: FormEvent) {
    event.preventDefault();
    await run("organization", async () => {
      const result = await api<{ organization: Organization }>(
        "/api/developer/organizations",
        { method: "POST", body: JSON.stringify({ name: organizationName }) },
      );
      setOrganizationName("");
      setSelectedOrganizationId(result.organization.id);
      await queryClient.invalidateQueries({
        queryKey: ["developer-organizations"],
      });
    });
  }

  async function createKey(event: FormEvent) {
    event.preventDefault();
    await run("key", async () => {
      const result = await api<{ key: ApiKeyRecord & { token: string } }>(
        "/api/developer/api-keys",
        {
          method: "POST",
          body: JSON.stringify({
            organizationId,
            name: keyName,
            scopes: ["jobs:read", "reports:read"],
          }),
        },
      );
      setSecret({
        label: `API key · ${result.key.name}`,
        value: result.key.token,
        ownerAddress: connection.address ?? "",
      });
      await queryClient.invalidateQueries({
        queryKey: ["developer-api-keys", organizationId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["developer-audit", organizationId],
      });
    });
  }

  async function keyAction(key: ApiKeyRecord, action: "rotate" | "revoke") {
    await run(`${action}-${key.id}`, async () => {
      if (action === "rotate") {
        const result = await api<{ key: { token: string; name: string } }>(
          `/api/developer/api-keys/${key.id}/rotate`,
          { method: "POST" },
        );
        setSecret({
          label: `Rotated API key · ${result.key.name}`,
          value: result.key.token,
          ownerAddress: connection.address ?? "",
        });
      } else {
        await api(`/api/developer/api-keys/${key.id}`, { method: "DELETE" });
      }
      await queryClient.invalidateQueries({
        queryKey: ["developer-api-keys", organizationId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["developer-audit", organizationId],
      });
    });
  }

  async function createWebhook(event: FormEvent) {
    event.preventDefault();
    const chainId = Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || 1952);
    await run("webhook", async () => {
      const result = await api<{
        endpoint: WebhookEndpoint & { secret: string };
      }>("/api/developer/webhooks", {
        method: "POST",
        body: JSON.stringify({
          organizationId,
          name: webhookName,
          url: webhookUrl,
          eventTypes: ["deliverable.submitted", "evaluation.completed"],
          chainId,
          jobId: webhookJobId,
        }),
      });
      setSecret({
        label: `Webhook signing secret · ${result.endpoint.name}`,
        value: result.endpoint.secret,
        ownerAddress: connection.address ?? "",
      });
      setWebhookUrl("");
      await queryClient.invalidateQueries({
        queryKey: ["developer-webhooks", organizationId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["developer-audit", organizationId],
      });
    });
  }

  async function webhookAction(
    endpoint: WebhookEndpoint,
    action: "test" | "rotate" | "toggle",
  ) {
    await run(`${action}-${endpoint.id}`, async () => {
      if (action === "test") {
        await api(`/api/developer/webhooks/${endpoint.id}/test`, {
          method: "POST",
        });
      } else if (action === "rotate") {
        const result = await api<{ secret: string }>(
          `/api/developer/webhooks/${endpoint.id}/rotate`,
          { method: "POST" },
        );
        setSecret({
          label: `Rotated webhook secret · ${endpoint.name}`,
          value: result.secret,
          ownerAddress: connection.address ?? "",
        });
      } else {
        await api(`/api/developer/webhooks/${endpoint.id}`, {
          method: "PATCH",
          body: JSON.stringify({ active: !endpoint.active }),
        });
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["developer-webhooks", organizationId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["developer-deliveries", organizationId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["developer-audit", organizationId],
        }),
      ]);
    });
  }

  async function retryDelivery(delivery: Delivery) {
    await run(`retry-${delivery.id}`, async () => {
      await api(`/api/developer/webhook-deliveries/${delivery.id}/retry`, {
        method: "POST",
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["developer-deliveries", organizationId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["developer-audit", organizationId],
        }),
      ]);
    });
  }

  if (connection.status !== "connected") {
    return (
      <div className="shell developer-shell">
        <section className="panel empty-state">
          <div>
            <Code2 aria-hidden="true" size={30} />
            <h2>Connect the owner wallet</h2>
            <p>
              The console is wallet-owned. No email account or custodial key is
              created.
            </p>
          </div>
        </section>
      </div>
    );
  }

  if (organizations.isError) {
    return (
      <div className="shell developer-shell">
        <section className="panel empty-state">
          <div>
            <ShieldCheck aria-hidden="true" size={30} />
            <h2>Unlock developer access</h2>
            <p>
              Sign a short-lived SIWE challenge. This creates no transaction and
              costs no gas.
            </p>
            <button
              className="button button-primary"
              disabled={busy === "unlock"}
              onClick={unlock}
              type="button"
            >
              <KeyRound aria-hidden="true" size={15} />
              {busy === "unlock"
                ? "Waiting for signature…"
                : "Sign in with wallet"}
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="shell developer-shell">
      {actionError ? (
        <div className="notice notice-error" role="alert">
          <CircleAlert aria-hidden="true" size={15} /> {actionError}
        </div>
      ) : null}
      {secret && secret.ownerAddress === connection.address ? (
        <SecretNotice secret={secret} />
      ) : null}

      <section
        className="panel developer-toolbar"
        aria-labelledby="organizations-title"
      >
        <div>
          <h2 id="organizations-title">Organization</h2>
          <p>
            Every credential, webhook, delivery, and audit event stays in this
            boundary.
          </p>
        </div>
        {organizations.data?.organizations.length ? (
          <label className="field developer-organization-select">
            <span>Active organization</span>
            <select
              className="select"
              onChange={(event) =>
                setSelectedOrganizationId(event.target.value)
              }
              value={organizationId}
            >
              {organizations.data.organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <form className="developer-inline-form" onSubmit={createOrganization}>
          <label className="field">
            <span>New organization</span>
            <input
              className="input"
              maxLength={80}
              minLength={2}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Acme Agents"
              required
              value={organizationName}
            />
          </label>
          <button
            className="button button-secondary"
            disabled={busy === "organization"}
            type="submit"
          >
            Create
          </button>
        </form>
      </section>

      {organizationId ? (
        <div className="developer-grid">
          <section
            className="panel developer-section"
            aria-labelledby="api-keys-title"
          >
            <div className="panel-header">
              <h2 id="api-keys-title">API keys</h2>
              <span>Hash-only storage</span>
            </div>
            <form className="developer-form" onSubmit={createKey}>
              <label className="field">
                <span>Key name</span>
                <input
                  className="input"
                  maxLength={80}
                  minLength={2}
                  onChange={(event) => setKeyName(event.target.value)}
                  required
                  value={keyName}
                />
              </label>
              <p className="field-help">
                Scopes: jobs:read, reports:read. The secret is shown once.
              </p>
              <button
                className="button button-primary button-small"
                disabled={busy === "key"}
                type="submit"
              >
                <KeyRound aria-hidden="true" size={14} />
                Issue key
              </button>
            </form>
            <div className="developer-list">
              {keys.isLoading ? (
                <p className="developer-muted">Loading keys…</p>
              ) : null}
              {keys.isError ? (
                <p className="developer-error" role="alert">
                  {keys.error.message}
                </p>
              ) : null}
              {keys.data?.keys.length === 0 ? (
                <p className="developer-muted">No API keys issued.</p>
              ) : null}
              {keys.data?.keys.map((key) => (
                <article className="developer-record" key={key.id}>
                  <div>
                    <strong>{key.name}</strong>
                    <code>ss_live_{key.prefix}_…</code>
                    <p>
                      {key.revokedAt
                        ? `Revoked ${dateLabel(key.revokedAt)}`
                        : `Last used: ${dateLabel(key.lastUsedAt)}`}
                    </p>
                  </div>
                  {!key.revokedAt ? (
                    <div className="developer-actions">
                      <button
                        aria-label={`Rotate ${key.name}`}
                        className="icon-button"
                        disabled={busy !== null}
                        onClick={() => keyAction(key, "rotate")}
                        title="Rotate key"
                        type="button"
                      >
                        <RotateCw aria-hidden="true" size={14} />
                      </button>
                      <button
                        className="button button-quiet button-small"
                        disabled={busy !== null}
                        onClick={() => keyAction(key, "revoke")}
                        type="button"
                      >
                        Revoke
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section
            className="panel developer-section"
            aria-labelledby="webhooks-title"
          >
            <div className="panel-header">
              <h2 id="webhooks-title">Signed webhooks</h2>
              <span>HMAC · durable outbox</span>
            </div>
            <form className="developer-form" onSubmit={createWebhook}>
              <div className="field-grid">
                <label className="field">
                  <span>Name</span>
                  <input
                    className="input"
                    maxLength={80}
                    minLength={2}
                    onChange={(event) => setWebhookName(event.target.value)}
                    required
                    value={webhookName}
                  />
                </label>
                <label className="field">
                  <span>Job ID</span>
                  <input
                    className="input"
                    inputMode="numeric"
                    onChange={(event) => setWebhookJobId(event.target.value)}
                    pattern="\d+"
                    placeholder="3"
                    required
                    value={webhookJobId}
                  />
                </label>
              </div>
              <label className="field">
                <span>HTTPS endpoint URL</span>
                <input
                  className="input"
                  onChange={(event) => setWebhookUrl(event.target.value)}
                  placeholder="https://api.example.com/scopesettle"
                  required
                  type="url"
                  value={webhookUrl}
                />
              </label>
              <p className="field-help">
                Subscribes to deliverable.submitted and evaluation.completed for
                this exact X Layer job.
              </p>
              <button
                className="button button-primary button-small"
                disabled={busy === "webhook"}
                type="submit"
              >
                <Webhook aria-hidden="true" size={14} />
                Create endpoint
              </button>
            </form>
            <div className="developer-list">
              {webhooks.isLoading ? (
                <p className="developer-muted">Loading endpoints…</p>
              ) : null}
              {webhooks.isError ? (
                <p className="developer-error" role="alert">
                  {webhooks.error.message}
                </p>
              ) : null}
              {webhooks.data?.endpoints.length === 0 ? (
                <p className="developer-muted">
                  No webhook endpoints configured.
                </p>
              ) : null}
              {webhooks.data?.endpoints.map((endpoint) => (
                <article className="developer-record" key={endpoint.id}>
                  <div>
                    <strong>
                      {endpoint.name}{" "}
                      <span
                        className={
                          endpoint.active ? "record-live" : "record-off"
                        }
                      >
                        {endpoint.active ? "Active" : "Paused"}
                      </span>
                    </strong>
                    <code>{endpoint.url}</code>
                    <p>
                      Job {endpoint.chainId}:{endpoint.jobId} ·{" "}
                      {endpoint.eventTypes.join(", ")}
                    </p>
                  </div>
                  <div className="developer-actions">
                    <button
                      className="icon-button"
                      disabled={busy !== null || !endpoint.active}
                      onClick={() => webhookAction(endpoint, "test")}
                      title="Send test"
                      type="button"
                    >
                      <Send aria-hidden="true" size={14} />
                    </button>
                    <button
                      className="icon-button"
                      disabled={busy !== null}
                      onClick={() => webhookAction(endpoint, "rotate")}
                      title="Rotate signing secret"
                      type="button"
                    >
                      <RefreshCw aria-hidden="true" size={14} />
                    </button>
                    <button
                      className="button button-quiet button-small"
                      disabled={busy !== null}
                      onClick={() => webhookAction(endpoint, "toggle")}
                      type="button"
                    >
                      {endpoint.active ? "Pause" : "Activate"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section
            className="panel developer-section"
            aria-labelledby="deliveries-title"
          >
            <div className="panel-header">
              <h2 id="deliveries-title">Delivery evidence</h2>
              <span>Latest 100</span>
            </div>
            <div className="developer-list">
              {deliveries.isLoading ? (
                <p className="developer-muted">Loading deliveries…</p>
              ) : null}
              {deliveries.isError ? (
                <p className="developer-error" role="alert">
                  {deliveries.error.message}
                </p>
              ) : null}
              {deliveries.data?.deliveries.length === 0 ? (
                <p className="developer-muted">
                  No deliveries yet. Send a test from an active endpoint.
                </p>
              ) : null}
              {deliveries.data?.deliveries.map((delivery) => (
                <article className="developer-record" key={delivery.id}>
                  <div>
                    <strong>
                      {delivery.eventType}{" "}
                      <span className={`delivery-${delivery.status}`}>
                        {delivery.status}
                      </span>
                    </strong>
                    <code>
                      {delivery.endpointName} · {delivery.id}
                    </code>
                    <p>
                      Attempts {delivery.attemptCount} · HTTP{" "}
                      {delivery.responseStatus ?? "—"} ·{" "}
                      {dateLabel(delivery.createdAt)}
                    </p>
                    {delivery.lastError ? (
                      <p className="developer-error">{delivery.lastError}</p>
                    ) : null}
                  </div>
                  {delivery.status === "retry" || delivery.status === "dead" ? (
                    <button
                      className="button button-quiet button-small"
                      disabled={busy !== null}
                      onClick={() => retryDelivery(delivery)}
                      type="button"
                    >
                      <RefreshCw aria-hidden="true" size={13} />
                      Retry now
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section
            className="panel developer-section"
            aria-labelledby="audit-title"
          >
            <div className="panel-header">
              <h2 id="audit-title">Audit trail</h2>
              <span>Wallet + API actors</span>
            </div>
            <div className="developer-list">
              {audit.isLoading ? (
                <p className="developer-muted">Loading audit events…</p>
              ) : null}
              {audit.isError ? (
                <p className="developer-error" role="alert">
                  {audit.error.message}
                </p>
              ) : null}
              {audit.data?.events.length === 0 ? (
                <p className="developer-muted">No audit events recorded.</p>
              ) : null}
              {audit.data?.events.map((event) => (
                <article className="developer-record" key={event.id}>
                  <div>
                    <strong>{event.action}</strong>
                    <code>
                      {event.actorType} → {event.targetType}
                    </code>
                    <p>{dateLabel(event.createdAt)}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
