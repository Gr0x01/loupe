/**
 * Google OAuth utilities for GA4 integration
 */

import { safeEncrypt, safeDecrypt } from "@/lib/crypto";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GA4_ADMIN_API_URL = "https://analyticsadmin.googleapis.com/v1beta";

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

export interface GA4Property {
  property_id: string;
  display_name: string;
  account_name: string;
}

/**
 * Exchange authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_ANALYTICS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ANALYTICS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google Analytics OAuth credentials not configured");
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    console.error("Google token exchange error:", data);
    throw new Error(data.error_description || data.error || "Token exchange failed");
  }

  return data as GoogleTokens;
}

/**
 * Refresh an expired access token using the refresh token
 */
export async function refreshGoogleToken(refreshToken: string): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_ANALYTICS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ANALYTICS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google Analytics OAuth credentials not configured");
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    console.error("Google token refresh error:", data);
    throw new Error(data.error_description || data.error || "Token refresh failed");
  }

  return data as GoogleTokens;
}

/**
 * Get Google user info for provider_account_id
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Google userinfo error:", text);
    throw new Error("Failed to fetch Google user info");
  }

  return res.json();
}

/**
 * List available GA4 properties for the authenticated user
 * Uses the Analytics Admin API accountSummaries endpoint
 */
export async function listGA4Properties(accessToken: string): Promise<GA4Property[]> {
  const res = await fetch(`${GA4_ADMIN_API_URL}/accountSummaries`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("GA4 Admin API error:", text);
    throw new Error("Failed to fetch GA4 properties");
  }

  const data = await res.json();
  const properties: GA4Property[] = [];

  // accountSummaries returns accounts with propertySummaries nested inside
  for (const account of data.accountSummaries || []) {
    const accountName = account.displayName || account.account;

    for (const property of account.propertySummaries || []) {
      // property.property is in format "properties/123456789"
      const propertyId = property.property?.replace("properties/", "") || "";
      properties.push({
        property_id: propertyId,
        display_name: property.displayName || propertyId,
        account_name: accountName,
      });
    }
  }

  return properties;
}

/**
 * Check if an access token is expired or will expire soon
 * Returns true if token needs refresh (expires in < 5 minutes)
 */
export function isTokenExpired(expiresAt: number): boolean {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  return now >= expiresAt - fiveMinutes;
}

/**
 * Revoke a Google OAuth token (best effort)
 */
export async function revokeGoogleToken(token: string): Promise<void> {
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
      method: "POST",
    });
  } catch {
    // Best effort - ignore errors
  }
}

/**
 * Get a valid access token, refreshing if needed
 * Shared helper to avoid duplicate refresh logic across routes
 */
export async function getValidAccessToken(
  integration: {
    id: string;
    access_token: string;
    metadata: { refresh_token?: string; token_expires_at?: number; [key: string]: unknown };
  },
  supabase: { from: (table: string) => unknown }
): Promise<{ accessToken: string; updated: boolean }> {
  const metadata = integration.metadata || {};

  // Check if token needs refresh
  if (!metadata.refresh_token || !isTokenExpired(metadata.token_expires_at || 0)) {
    // Decrypt token before returning (may be encrypted with enc: prefix)
    return { accessToken: safeDecrypt(integration.access_token), updated: false };
  }

  // Decrypt refresh token before using (may be encrypted)
  const decryptedRefreshToken = safeDecrypt(metadata.refresh_token);

  // Refresh the token
  const newTokens = await refreshGoogleToken(decryptedRefreshToken);
  const newExpiresAt = Date.now() + newTokens.expires_in * 1000;

  // Update stored tokens (encrypt before storing)
  const { error: updateError } = await (supabase.from("integrations") as {
    update: (data: object) => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
  })
    .update({
      access_token: safeEncrypt(newTokens.access_token),
      metadata: {
        ...metadata,
        token_expires_at: newExpiresAt,
        // Encrypt new refresh token if provided, otherwise keep existing encrypted one
        refresh_token: newTokens.refresh_token
          ? safeEncrypt(newTokens.refresh_token)
          : metadata.refresh_token,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", integration.id);

  if (updateError) {
    // Critical: If we fail to persist the new token, the old refresh token in DB
    // may already be invalidated by Google. Throwing prevents the caller from
    // using a token that won't be available on the next request.
    console.error("Failed to persist refreshed token:", updateError);
    throw new Error("Failed to save refreshed token - please reconnect GA4");
  }

  return { accessToken: newTokens.access_token, updated: true };
}
