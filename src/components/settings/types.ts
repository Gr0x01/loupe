/** GitHub API repo (numeric ID from GitHub) */
export interface GitHubAvailableRepo {
  id: number;
  full_name: string;
  default_branch: string;
  private: boolean;
  connected: boolean;
}

/** Connected repo stored in our DB (string UUID) */
export interface GitHubConnectedRepo {
  id: string;
  full_name: string;
  default_branch: string;
  webhook_active: boolean;
}

export interface GitHubIntegration {
  connected: boolean;
  username: string;
  avatar_url: string;
  connected_at: string;
  repos: GitHubConnectedRepo[];
}

export interface PostHogIntegration {
  connected: boolean;
  project_id: string;
  host: string;
  connected_at: string;
}

export interface GA4Integration {
  connected: boolean;
  property_id: string | null;
  property_name: string | null;
  pending_property_selection: boolean;
  connected_at: string;
}

/** Mirrors GA4Property in lib/google-oauth.ts (can't import server module in client) */
export interface GA4Property {
  property_id: string;
  display_name: string;
  account_name: string;
}

export interface SupabaseIntegration {
  connected: boolean;
  project_name: string;
  key_type: "anon" | "service_role";
  has_schema_access: boolean;
  tables: string[];
  connected_at: string;
}

export interface IntegrationsData {
  github: GitHubIntegration | null;
  posthog: PostHogIntegration | null;
  ga4: GA4Integration | null;
  supabase: SupabaseIntegration | null;
}
