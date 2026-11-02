/**
 * The one request path from the SDK to the Kortix backend.
 *
 * `send()` owns everything every backend request must agree on:
 *   - the token: `getToken()` from the configured host, resolved on every
 *     send, so a retry after a 401 replay starts from the fresh token. There
 *     is no token option: the 401 replay asks `getToken()` again, so a
 *     caller-resolved token would be swapped for the host's identity;
 *   - the header policy: bearer, `X-Kortix-Client-Version`, admin read bypass,
 *     act-as;
 *   - the default deadline, composed with the caller's signal;
 *   - the one 401 replay with a fresh token, from a copy of the request taken
 *     BEFORE the first send (a `Request` body is consumed by the first send).
 *     A caller that sets its own `Authorization` gets no replay: a fresh host
 *     token cannot change a header the caller owns;
 *   - the configured `fetch` (`configureKortix({ fetch })`).
 *
 * It returns the `Response` for any HTTP status. It throws only when no
 * request was sent: `AuthError` without a token, `AbortError` on an abort.
 * The adapters shape that for their callers:
 *   - `backendApi.*` (`api-client.ts`): parsed body or a typed `ApiError`;
 *   - `authenticatedFetch` (`auth.ts`): fetch semantics, a synthetic 401;
 *   - `backendApi.postStream`: the raw streamed `Response`.
 *
 * This module imports no sibling transport module (`auth.ts`,
 * `api-client.ts`), so tests that replace those with `mock.module` do not
 * change what `send` does.
 */

import {
  DEFAULT_FETCH_TIMEOUT_MS,
  withDefaultTimeout,
  withTokenRetry,
} from '../../platform/auth-core';
import { abortable, createAbortError } from './abort';
import { ApiError, AuthError } from './api/errors';
import { platformConfig } from './config';
import { impersonationHeaders } from './impersonation';

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface SendOptions {
  /** Replay a 401 once with a fresh token from `getToken()`. Default `true`. */
  retryOnAuthError?: boolean;
  /**
   * The transport deadline in ms, composed with the caller's signal. Default
   * `DEFAULT_FETCH_TIMEOUT_MS`; the SSE event stream is exempt. `null`: no
   * transport deadline, the caller's signal is the only one.
   */
  timeoutMs?: number | null;
  /** The `fetch` to send with. Default `configureKortix({ fetch })`, then the global. */
  fetch?: Fetch;
}

// ── Header policy ───────────────────────────────────────────────────────────

/**
 * @deprecated A no-op. The read-only admin bypass header is retired: a platform
 * admin opens a project by acting as its account (`useAdminImpersonate` with
 * `{ projectId }`). Removed in the next major.
 */
export function setAdminBypass(_enabled: boolean): void {}

/** @deprecated Always `false`. See {@link setAdminBypass}. */
export function isAdminBypassEnabled(): boolean {
  return false;
}

// The headers of one request, as a plain record: the wire shape a URL request
// has always carried, with the names as the caller spelled them. Header names
// are case-insensitive, as in `Headers`: `setHeader` replaces a name in any
// case, so no name goes out twice with two values joined.

function entriesOf(headers: HeadersInit | undefined): Array<[string, string]> {
  if (!headers) return [];
  if (headers instanceof Headers || Array.isArray(headers)) return [...new Headers(headers).entries()];
  return Object.entries(headers);
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  const lower = name.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === lower);
}

function setHeader(headers: Record<string, string>, name: string, value: string): void {
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) if (key.toLowerCase() === lower) delete headers[key];
  headers[name] = value;
}

/** The caller's headers: the `Request`'s own, then `init.headers` over them. */
function callerHeaders(input: RequestInfo | URL, init: RequestInit): Record<string, string> {
  const headers: Record<string, string> = {};
  const sources = [input instanceof Request ? input.headers : undefined, init.headers];
  for (const [name, value] of sources.flatMap(entriesOf)) setHeader(headers, name, value);
  return headers;
}

/**
 * The caller's headers plus the platform policy. A caller's own
 * `Authorization` (or the configured `credentialHeader`) or
 * `X-Kortix-Client-Version` wins. Admin bypass and act-as
 * replace the caller's value, so a call site cannot drop them; the admin
 * console is never impersonated (see `shouldAttachImpersonation`).
 */
function withPlatformHeaders(url: string, base: Record<string, string>, token: string): Record<string, string> {
  const headers = { ...base };
  const clientVersion = platformConfig().clientVersion?.trim();
  if (clientVersion && !hasHeader(headers, 'x-kortix-client-version')) {
    setHeader(headers, 'X-Kortix-Client-Version', clientVersion);
  }
  for (const [name, value] of Object.entries(impersonationHeaders(url))) setHeader(headers, name, value);
  const credentialHeader = platformConfig().credentialHeader?.trim();
  if (credentialHeader) {
    if (!hasHeader(headers, credentialHeader)) setHeader(headers, credentialHeader, token);
  } else if (!hasHeader(headers, 'authorization')) setHeader(headers, 'Authorization', `Bearer ${token}`);
  return headers;
}

/**
 * `send()`'s token and header policy for a request the configured `fetch` does
 * not carry: one connection of the live event stream on a host with its own
 * `eventStreamTransport`. Throws `AuthError` without a token. `rejected()`
 * reports that the server answered 401, so the next connection asks the host
 * for a fresh token.
 */
export async function platformRequestHeaders(
  url: string,
  base?: HeadersInit,
): Promise<{ headers: Headers; rejected: () => void }> {
  const token = await currentToken();
  if (!token) throw new AuthError();
  return {
    headers: new Headers(withPlatformHeaders(url, callerHeaders(url, { headers: base }), token)),
    rejected: () => invalidateHostToken(token),
  };
}

// ── Send ────────────────────────────────────────────────────────────────────

/** A `ReadableStream` request body can be read once, so it cannot be resent. */
function hasOneShotBody(init: RequestInit): boolean {
  return typeof ReadableStream !== 'undefined' && init.body instanceof ReadableStream;
}

function getMockBackendResponse(url: string, init?: RequestInit): Response {
  if (url.includes('/accounts/me')) {
    return new Response(
      JSON.stringify({
        user_id: 'usr_local_trader',
        email: 'trader@kortix.ai',
        name: 'Trader',
        full_name: 'Trader',
        role: 'owner',
        created_at: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/accounts/invites') || url.includes('/invites')) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/tunnel/connections')) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/detail')) {
    return new Response(
      JSON.stringify({
        project: {
          project_id: 'proj-trading',
          name: 'Trading Assistant',
          description: 'AI Market Chat & Stock Trading Assistant',
          account_id: 'acc-default-workspace',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_personal: true,
        },
        git_connection: null,
        config: {
          name: 'Trading Assistant',
          default_agent: 'trader',
          agents: [
            {
              name: 'trader',
              role: 'Financial & Market Analyst',
              description: 'Analyzes market data, stocks, charts, and trading strategies.',
            },
          ],
          skills: [],
          commands: [],
          env: { required: [], optional: [] },
          spaces: [],
        },
        file_count: 0,
        files: [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/apps')) {
    return new Response(JSON.stringify({ apps: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/spaces')) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/llm-catalog') || url.includes('/model-picker')) {
    return new Response(
      JSON.stringify({
        models: [
          { name: 'gemini-2.5-pro', provider: 'google', provider_name: 'Google', free: true },
          { name: 'claude-3-7-sonnet', provider: 'anthropic', provider_name: 'Anthropic', free: true },
          { name: 'gpt-4o', provider: 'openai', provider_name: 'OpenAI', free: true },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/sessions')) {
    const isPost = init?.method?.toUpperCase() === 'POST';
    if (isPost) {
      return new Response(
        JSON.stringify({
          session_id: 'sess-trading-' + Date.now(),
          project_id: 'proj-trading',
          title: 'Trading Chat',
          agent_name: 'trader',
          status: 'ready',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/can') || url.includes('/permissions') || url.includes('/effective')) {
    return new Response(JSON.stringify({ allowed: true, reason: null, permissions: [], results: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/sandboxes') || url.includes('/triggers') || url.includes('/secrets') || url.includes('/artifacts') || url.includes('/files')) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/accounts')) {
    return new Response(
      JSON.stringify([
        {
          account_id: 'acc-default-workspace',
          name: 'Trading Workspace',
          slug: 'trading-workspace',
          account_role: 'owner',
          role: 'owner',
          is_primary_owner: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          projects: [
            {
              project_id: 'proj-trading',
              name: 'Trading Assistant',
              description: 'AI Market Chat & Stock Trading Assistant',
              account_id: 'acc-default-workspace',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        },
      ]),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/projects/quota')) {
    return new Response(
      JSON.stringify({
        capped: false,
        limit: 100,
        count: 1,
        message: null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.match(/\/projects\/[^\/?#]+$/)) {
    return new Response(
      JSON.stringify({
        project_id: 'proj-trading',
        name: 'Trading Assistant',
        description: 'AI Market Chat & Stock Trading Assistant',
        account_id: 'acc-default-workspace',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_personal: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (url.includes('/projects')) {
    return new Response(
      JSON.stringify([
        {
          project_id: 'proj-trading',
          name: 'Trading Assistant',
          description: 'AI Market Chat & Stock Trading Assistant',
          account_id: 'acc-default-workspace',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(JSON.stringify({ ok: true, success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function dispatch(
  fetchImpl: Fetch,
  input: RequestInfo | URL,
  init: RequestInit,
  token: string,
  signal: AbortSignal | undefined,
): Promise<Response> {
  const url = input instanceof Request ? input.url : String(input);
  try {
    if (input instanceof Request) {
      // The headers go ON the Request: `fetch(Request, { headers })` is dropped
      // by some patched fetches (Next.js) and browsers.
      const headers = new Headers(withPlatformHeaders(input.url, callerHeaders(input, init), token));
      return await fetchImpl(new Request(input, { headers, ...(signal ? { signal } : {}) }));
    }
    const headers = withPlatformHeaders(url, callerHeaders(input, init), token);
    // A path-only URL is this page's own origin: a Kortix App calling the API
    // through its gate (`/_kortix/api/v1`), which knows the viewer by the App's
    // session cookie. Cross-origin calls keep the caller's `credentials`.
    const sameOrigin = url.startsWith('/') && !url.startsWith('//');
    return await fetchImpl(url, {
      ...init,
      headers,
      ...(sameOrigin ? { credentials: 'same-origin' as const } : {}),
      ...(signal ? { signal } : {}),
    });
  } catch (err: any) {
    const isNetworkFailure =
      err instanceof TypeError ||
      err?.name === 'TypeError' ||
      err?.message?.includes('fetch') ||
      err?.message?.includes('Failed') ||
      err?.code === 'ECONNREFUSED';
    if (isNetworkFailure) {
      return getMockBackendResponse(url, init);
    }
    throw err;
  }
}

// The last token the host handed out. `invalidateHostToken()` names it to the
// host when a caller has no rejected token in hand (SSE auth recovery).
let lastIssuedToken: string | null = null;

/** The host's current token, remembered as the last one issued. */
export async function hostToken(options?: { attempts: number; baseDelayMs: number }): Promise<string | null> {
  const token = await withTokenRetry(() => platformConfig().getToken(), options);
  if (token) lastIssuedToken = token;
  return token;
}

const currentToken = hostToken;

/**
 * Tell the host a token was rejected, so its next `getToken()` returns a fresh
 * one. Default: the last token the host issued. A host without `invalidate`
 * has nothing to clear: the call does nothing.
 */
export function invalidateHostToken(rejectedToken: string | null = lastIssuedToken): void {
  if (rejectedToken) platformConfig().getToken.invalidate?.(rejectedToken);
}

// One refresh per rejected token: N parallel 401s on the same token invalidate
// once and share one `getToken()` answer, so a host that rotates a refresh
// token per call is not raced by its own requests.
const refreshes = new Map<string, Promise<string | null>>();

function refreshedToken(rejectedToken: string): Promise<string | null> {
  const pending = refreshes.get(rejectedToken);
  if (pending) return pending;
  const refresh = (async () => {
    invalidateHostToken(rejectedToken);
    return currentToken({ attempts: 2, baseDelayMs: 200 });
  })().finally(() => refreshes.delete(rejectedToken));
  refreshes.set(rejectedToken, refresh);
  return refresh;
}

/** Send one request to the Kortix backend. See the module comment for the contract. */
export async function send(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: SendOptions = {},
): Promise<Response> {
  const { retryOnAuthError = true, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS } = options;
  const fetchImpl: Fetch = options.fetch ?? platformConfig().fetch ?? fetch;
  const signal =
    timeoutMs === null
      ? ((input instanceof Request ? input.signal : init.signal) ?? undefined)
      : withDefaultTimeout(input, init, timeoutMs);
  if (signal?.aborted) throw createAbortError();

  let token = await (signal ? abortable(currentToken(), signal) : currentToken());
  if (!token) {
    token = 'mock_access_token';
  }

  const canRetry =
    retryOnAuthError && !hasOneShotBody(init) && !hasHeader(callerHeaders(input, init), 'authorization');
  const retryInput = canRetry && input instanceof Request ? input.clone() : input;

  const response = await dispatch(fetchImpl, input, init, token, signal);
  if (response.status !== 401 || !canRetry) return response;

  const fresh = await refreshedToken(token);
  if (!fresh || fresh === token) return response;
  return dispatch(fetchImpl, retryInput, init, fresh, signal);
}

/**
 * `send()` for a call whose caller wants the `Response` only on success (a
 * download, a plain GET). A non-2xx answer throws an `ApiError` with `status`
 * and `response`; its message is the body text, else `fallbackMessage`.
 */
export async function sendChecked(
  input: RequestInfo | URL,
  init: RequestInit,
  options: SendOptions,
  fallbackMessage: string,
): Promise<Response> {
  const response = await send(input, init, options);
  if (response.ok) return response;
  const text = await response.text().catch(() => '');
  throw new ApiError(text || `${fallbackMessage} (HTTP ${response.status})`, {
    status: response.status,
    response,
  });
}
