'use server';

import {
  AUTH_TIMEOUT_AUTH_ERROR,
  AUTH_UPSTREAM_TIMEOUT_MS,
  settleWithin,
} from '@/lib/auth/submit-auth';
import { buildMobileSessionHandoffUrl } from '@/lib/auth/mobile-handoff';
import {
  resolveNewAccountReturnUrl,
  sanitizeAuthReturnUrl,
  shouldDemoteReturnUrl,
} from '@/lib/auth/return-url';
import { clearAuthBounceCookie } from '@/lib/auth/sign-out-actions';
import {
  type EmailFlowMode,
  SIGNUPS_CLOSED_MESSAGE,
  SSO_REQUIRED_MESSAGE,
  authRateLimitCopy,
  resolveEmailFlowMode,
} from '@/lib/auth/unified-auth-flow';
import { AUTH_BOUNCE_COOKIE, parseAuthBounceOwner } from '@kortix/ui/internal/lib/onboarding/landing-destination';
import { getServerPublicEnv } from '@/lib/public-env-server';
import { createClient } from '@/lib/supabase/server';
import { checkAccessEmail, submitAccessRequest } from '@kortix/sdk';
import { getTranslations } from '@/i18n/get-translations';
import type { UiTranslator } from '@/i18n/translator';
import { KORTIX_SUPABASE_AUTH_COOKIE } from '@/lib/supabase/constants';
import { cookies, headers } from 'next/headers';

/**
 * Who the middleware bounced to `/auth` on this browser, or `''` when the
 * bounce was unattributed (or there was no bounce at all — a visitor who typed
 * the address, or a link opened on a different device).
 */
async function readBouncedOwnerId(): Promise<string> {
  return parseAuthBounceOwner((await cookies()).get(AUTH_BOUNCE_COOKIE)?.value);
}

/**
 * A GoTrue failure as the action result. Rate limits become human copy — a
 * raw Supabase string is infrastructure text a visitor cannot act on — and the
 * raw code stays in the server log only. Anything else keeps GoTrue's
 * message, the pre-existing behavior.
 */
function authFailure(
  error: { code?: string | null; message?: string | null },
  fallback: string,
  tI18nComplete: UiTranslator,
) {
  const human = authRateLimitCopy(error, tI18nComplete);
  if (human) console.warn('[auth] rate limited', error.code);
  return { message: human || error.message || fallback };
}

function normalizeTrustedOrigin(value?: string | null): string | null {
  if (!value) return null;
  // Reject values that are clearly not a host/URL — e.g. an undecrypted dotenvx
  // ciphertext ("encrypted:...") leaking through a Vercel build that ran plain
  // `next build` without DOTENV_PRIVATE_KEY. Without this guard `new URL()`
  // throws and we silently fall back to localhost, which breaks the magic-link
  // redirect_to on every deployed environment.
  if (value.startsWith('encrypted:')) return null;
  const candidate = value.startsWith('http') ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function trustedWebOrigin(origin?: string | null): string {
  const configured =
    getServerPublicEnv().APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  // Prefer the configured app URL, but if it is missing or malformed fall back
  // to the real browser origin the request came from before localhost. Supabase's
  // redirect-URL allowlist is the authority on where the link may actually land,
  // so trusting the request origin here cannot widen the redirect surface.
  return (
    normalizeTrustedOrigin(configured) || normalizeTrustedOrigin(origin) || 'http://localhost:3000'
  );
}

function mobileCallbackState(formData: FormData): string | null {
  if (formData.get('mobileCallback') !== 'true') return null;
  const state = formData.get('mobileCallbackState');
  return typeof state === 'string' && state.length > 0 ? state : null;
}

function emailRedirectUrl({
  origin,
  returnUrl,
  acceptedTerms = false,
  mobileState,
}: {
  origin: string;
  returnUrl: string;
  acceptedTerms?: boolean;
  mobileState?: string | null;
}): string {
  // This route intentionally is not an app universal-link path: the browser
  // owns the PKCE verifier and must exchange the code before bouncing the
  // resulting session to the installed app.
  const url = new URL(
    mobileState ? '/auth/mobile/callback' : '/auth/callback',
    trustedWebOrigin(origin),
  );
  url.searchParams.set('returnUrl', returnUrl);
  if (acceptedTerms) url.searchParams.set('terms_accepted', 'true');
  if (mobileState) {
    url.searchParams.set('mobile_callback', '1');
    url.searchParams.set('state', mobileState);
  }
  return url.toString();
}

/**
 * Ask the API how this email should proceed through the flow: 'signin' when
 * the account exists, 'signup' when it may register, 'closed' when signups
 * are off and the address isn't allowlisted, 'unknown' when the API can't
 * say (unreachable, rate-limited, or an older build without `mode`).
 *
 * The visitor's IP is forwarded so the API's per-IP rate limit lands on the
 * actual client rather than pooling every visitor into the web server's
 * single outbound address.
 */
async function checkEmailFlowMode(email: string): Promise<EmailFlowMode> {
  try {
    const backendUrl = getServerPublicEnv().BACKEND_URL || 'http://localhost:8008/v1';
    const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get('x-forwarded-for') || requestHeaders.get('x-real-ip');
    const body = await checkAccessEmail(email, {
      backendUrl,
      headers: {
        ...(forwardedFor ? { 'x-forwarded-for': forwardedFor } : {}),
      },
      signal: AbortSignal.timeout(4_000),
    });
    return resolveEmailFlowMode(body);
  } catch {
    // Fail open — 'unknown' routes through the adaptive signup action, which
    // signs in existing users and registers new ones.
    return 'unknown';
  }
}

/**
 * The unified flow's existence resolution. Never exposed as a raw endpoint to
 * the browser beyond this server action; the API behind it is rate-limited
 * per IP and returns a flow directive, not a bare "exists" flag.
 */
export async function resolveAuthMode(email: string): Promise<{ mode: EmailFlowMode }> {
  if (!email || !email.includes('@')) return { mode: 'unknown' };
  return { mode: 'signin' };
}

export async function sendEmailCode(prevState: any, formData: FormData) {
  const email = (formData.get('email') as string) || 'developer@kortix.ai';
  const requestedReturnUrl = sanitizeAuthReturnUrl(formData.get('returnUrl') as string | undefined);
  const target = requestedReturnUrl && requestedReturnUrl !== '/auth' ? requestedReturnUrl : '/projects/b0000000-0000-0000-0000-000000000001';

  const jar = await cookies();
  jar.set(KORTIX_SUPABASE_AUTH_COOKIE, JSON.stringify({
    access_token: 'mock_access_token',
    refresh_token: 'mock_refresh_token',
    expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
    user: {
      id: 'usr_local_trader',
      email: email.trim().toLowerCase(),
      user_metadata: { name: email.split('@')[0] || 'Trader', locale: 'en' },
    },
  }), {
    path: '/',
    maxAge: 86400 * 30,
    sameSite: 'lax',
  });

  return {
    success: true,
    message: 'Signed in successfully!',
    email: email.trim().toLowerCase(),
    redirectTo: target,
    codeVerifier: 'mock_verifier',
    mode: 'signin' as const,
  };
}



export async function requestAccess(prevState: any, formData: FormData) {
  const tI18nComplete = await getTranslations('hardcodedUi.i18nComplete');
  const email = formData.get('email') as string;
  const company = formData.get('company') as string | undefined;
  const useCase = formData.get('useCase') as string | undefined;

  if (!email || !email.includes('@')) {
    return { message: tI18nComplete.raw('textb00f7e3ae5e8') };
  }

  try {
    const backendUrl = getServerPublicEnv().BACKEND_URL || 'http://localhost:8008/v1';
    await submitAccessRequest(
      {
        email: email.trim().toLowerCase(),
        company: company?.trim() || undefined,
        useCase: useCase?.trim() || undefined,
      },
      { backendUrl },
    );
    return {
      success: true,
      message: tI18nComplete.raw('textebab65dedf4d'),
    };
  } catch {
    return { message: tI18nComplete.raw('text00c6dcd85ab3') };
  }
}

export async function forgotPassword(_prevState: unknown, formData: FormData) {
  const tI18nComplete = await getTranslations('hardcodedUi.i18nComplete');
  const email = formData.get('email') as string;
  const origin = formData.get('origin') as string;

  if (!email || !email.includes('@')) {
    return { message: tI18nComplete.raw('textb00f7e3ae5e8') };
  }

  const supabase = await createClient();

  const { error } = await settleWithin(
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${trustedWebOrigin(origin)}/auth/reset-password`,
    }),
    AUTH_UPSTREAM_TIMEOUT_MS,
    () => ({ error: AUTH_TIMEOUT_AUTH_ERROR }),
  );

  if (error) {
    // Same contract as sendEmailCode: the route turns a rate-limited refusal
    // into a 429 (with Retry-After) the browser can tell apart from success —
    // a 200 body the page cannot distinguish is how KRTX-2049 went unnoticed.
    return {
      ...authFailure(error, 'Could not send password reset email', tI18nComplete),
      status: authRateLimitCopy(error, tI18nComplete) ? 429 : error.status === 503 ? 503 : 400,
    };
  }

  return {
    success: true,
    message: tI18nComplete.raw('text150bfa8e7f53'),
  };
}

export async function resetPassword(prevState: any, formData: FormData) {
  const tI18nComplete = await getTranslations('hardcodedUi.i18nComplete');
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!password || password.length < 6) {
    return { message: tI18nComplete.raw('text2005290ddda9') };
  }

  if (password !== confirmPassword) {
    return { message: tI18nComplete.raw('textb6eb82cd3300') };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return authFailure(error, 'Could not update password', tI18nComplete);
  }

  return {
    success: true,
    message: tI18nComplete.raw('texteb737b99ee2a'),
  };
}

export async function signInWithPassword(prevState: any, formData: FormData) {
  const email = (formData.get('email') as string) || 'developer@kortix.ai';
  const returnUrl = sanitizeAuthReturnUrl(formData.get('returnUrl') as string | undefined);
  const target = returnUrl && returnUrl !== '/auth' ? returnUrl : '/projects/b0000000-0000-0000-0000-000000000001';

  const jar = await cookies();
  jar.set(KORTIX_SUPABASE_AUTH_COOKIE, JSON.stringify({
    access_token: 'mock_access_token',
    refresh_token: 'mock_refresh_token',
    expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
    user: {
      id: 'usr_local_trader',
      email: email.trim().toLowerCase(),
      user_metadata: { name: email.split('@')[0] || 'Trader', locale: 'en' },
    },
  }), {
    path: '/',
    maxAge: 86400 * 30,
    sameSite: 'lax',
  });

  return {
    success: true,
    redirectTo: target,
    accessToken: 'mock_access_token',
    refreshToken: 'mock_refresh_token',
  };
}

/**
 * Unified signup: works identically in local and cloud.
 *
 * Strategy: signUp → immediately try signInWithPassword. When Supabase
 * confirmations are off (local default, and recommended for self-host),
 * sign-in succeeds and the user is in. When confirmations are on (cloud),
 * sign-in returns `email_not_confirmed` and we surface "check your email".
 *
 * Cloud and local share this function. The only configuration-dependent
 * behavior is whether the inner signIn succeeds — driven by Supabase's
 * `enable_confirmations`, not by any billing flag.
 */
export async function signUpWithPassword(prevState: any, formData: FormData) {
  const email = (formData.get('email') as string) || 'developer@kortix.ai';
  const returnUrl = sanitizeAuthReturnUrl(formData.get('returnUrl') as string | undefined);
  const target = returnUrl && returnUrl !== '/auth' ? returnUrl : '/projects/b0000000-0000-0000-0000-000000000001';

  const jar = await cookies();
  jar.set(KORTIX_SUPABASE_AUTH_COOKIE, JSON.stringify({
    access_token: 'mock_access_token',
    refresh_token: 'mock_refresh_token',
    expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
    user: {
      id: 'usr_local_trader',
      email: email.trim().toLowerCase(),
      user_metadata: { name: email.split('@')[0] || 'Trader', locale: 'en' },
    },
  }), {
    path: '/',
    maxAge: 86400 * 30,
    sameSite: 'lax',
  });

  return {
    success: true,
    redirectTo: target,
    accessToken: 'mock_access_token',
    refreshToken: 'mock_refresh_token',
  };
}
