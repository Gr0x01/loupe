import { SignJWT, importSPKI, importPKCS8 } from "jose";
import { createPrivateKey } from "crypto";

const APP_ID = process.env.GITHUB_APP_ID!;
const PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY!;

/**
 * Create a JWT for GitHub App authentication.
 * Used to get installation access tokens.
 */
export async function createAppJWT(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Parse the private key (handle \n in env var)
  const privateKeyPem = PRIVATE_KEY.replace(/\\n/g, "\n");

  // GitHub provides PKCS#1 keys, convert to KeyObject
  const privateKey = createPrivateKey(privateKeyPem);

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt(now - 60) // 60 seconds in the past to account for clock drift
    .setExpirationTime(now + 600) // 10 minutes max
    .setIssuer(APP_ID)
    .sign(privateKey);

  return jwt;
}

/**
 * Get an installation access token for a specific installation.
 * This token is used to make API calls on behalf of the app.
 */
export async function getInstallationToken(installationId: number): Promise<string> {
  const jwt = await createAppJWT();

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get installation token: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.token;
}

/**
 * List repositories accessible to an installation.
 */
export async function listInstallationRepos(installationId: number): Promise<{
  id: number;
  full_name: string;
  default_branch: string;
  private: boolean;
}[]> {
  const token = await getInstallationToken(installationId);

  const response = await fetch(
    "https://api.github.com/installation/repositories?per_page=100",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list repos: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.repositories.map((repo: {
    id: number;
    full_name: string;
    default_branch: string;
    private: boolean;
  }) => ({
    id: repo.id,
    full_name: repo.full_name,
    default_branch: repo.default_branch,
    private: repo.private,
  }));
}

/**
 * Create a webhook on a repository.
 */
export async function createRepoWebhook(
  installationId: number,
  repoFullName: string,
  webhookUrl: string,
  webhookSecret: string
): Promise<number> {
  const token = await getInstallationToken(installationId);

  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}/hooks`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "web",
        active: true,
        events: ["push"],
        config: {
          url: webhookUrl,
          content_type: "json",
          secret: webhookSecret,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create webhook: ${response.status} ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Delete a webhook from a repository.
 */
export async function deleteRepoWebhook(
  installationId: number,
  repoFullName: string,
  webhookId: number
): Promise<void> {
  const token = await getInstallationToken(installationId);

  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}/hooks/${webhookId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(`Failed to delete webhook: ${response.status} ${error}`);
  }
}
