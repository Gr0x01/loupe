import type { GitHubConnectedRepo, GitHubIntegration } from "./types";

function GitHubIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

function RepoCard({
  repo,
  onDisconnect,
  disconnecting,
}: {
  repo: GitHubConnectedRepo;
  onDisconnect: (id: string) => void;
  disconnecting: boolean;
}) {
  return (
    <div className="glass-card p-4 flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-text-primary truncate">{repo.full_name}</p>
        <p className="text-sm text-text-muted">Branch: {repo.default_branch}</p>
        {repo.webhook_active === false && (
          <p className="text-xs text-score-low mt-1">
            Webhook missing — auto-repair runs daily, or remove and re-add now
          </p>
        )}
      </div>
      <button
        onClick={() => onDisconnect(repo.id)}
        disabled={disconnecting}
        className="text-sm text-text-muted hover:text-score-low transition-colors disabled:opacity-50"
      >
        {disconnecting ? "Removing..." : "Remove"}
      </button>
    </div>
  );
}

export function GitHubSection({
  github,
  onConnect,
  onDisconnect,
  disconnectingGitHub,
  onAddRepo,
  onDisconnectRepo,
  disconnectingRepoId,
}: {
  github: GitHubIntegration | null;
  onConnect: () => void;
  onDisconnect: () => void;
  disconnectingGitHub: boolean;
  onAddRepo: () => void;
  onDisconnectRepo: (id: string) => void;
  disconnectingRepoId: string | null;
}) {
  return (
    <section className="mb-4">
      <div className="glass-card-elevated p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#24292e] flex items-center justify-center flex-shrink-0">
              <GitHubIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-semibold text-text-primary">GitHub</h3>
              <p className="text-sm text-text-secondary">
                Auto-scan pages when you push to main
              </p>
            </div>
          </div>

          {!github ? (
            <button onClick={onConnect} className="btn-primary w-full sm:w-auto">
              Connect
            </button>
          ) : (
            <button
              onClick={onDisconnect}
              disabled={disconnectingGitHub}
              className="text-sm text-text-muted hover:text-score-low transition-colors disabled:opacity-50 self-end sm:self-auto"
            >
              {disconnectingGitHub ? "Disconnecting..." : "Disconnect"}
            </button>
          )}
        </div>

        {github && (
          <div className="mt-6 pt-6 border-t border-border-subtle">
            {/* Connected account */}
            <div className="flex items-center gap-3 mb-6">
              {github.avatar_url && (
                <img
                  src={github.avatar_url}
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div>
                <p className="font-medium text-text-primary">
                  @{github.username}
                </p>
                <p className="text-xs text-text-muted">Connected</p>
              </div>
            </div>

            {/* Connected repos */}
            <div className="mb-4">
              {github.repos.length > 0 && (
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
                    Connected repo
                  </h3>
                </div>
              )}

              {github.repos.length === 0 ? (
                <div className="glass-card p-6 text-center">
                  <p className="text-text-secondary mb-4">
                    No repos connected yet. Add one to start auto-scanning.
                  </p>
                  <button
                    onClick={onAddRepo}
                    className="btn-secondary"
                  >
                    Add a repository
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {github.repos.map((repo) => (
                    <RepoCard
                      key={repo.id}
                      repo={repo}
                      onDisconnect={onDisconnectRepo}
                      disconnecting={disconnectingRepoId === repo.id}
                    />
                  ))}
                </div>
              )}
            </div>

            <p className="text-sm text-text-muted">
              <span className="font-medium">How it works:</span>{" "}
              When you push to the default branch, we wait 45 seconds for your deploy to finish, then scan all pages linked to the repo.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
