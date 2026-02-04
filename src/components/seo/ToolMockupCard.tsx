"use client";

import { type AITool, toolPageData, toolLogos } from "@/lib/seo/page-data";

// Evaluation status icons
const CheckIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
  </svg>
);

const DownArrowIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 4l-4 4-4 4" />
    <path d="M12 4H4" />
  </svg>
);

const PlusIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="8" y1="3" x2="8" y2="13" />
    <line x1="3" y1="8" x2="13" y2="8" />
  </svg>
);

interface ToolMockupCardProps {
  tool: AITool;
}

export default function ToolMockupCard({ tool }: ToolMockupCardProps) {
  const data = toolPageData[tool];
  const changes = data.mockChanges;
  const LogoComponent = toolLogos[tool];

  const statusConfig = {
    resolved: {
      icon: <CheckIcon />,
      iconClass: "evaluation-icon-resolved",
      badgeClass: "evaluation-badge-resolved",
      label: "Resolved",
    },
    regressed: {
      icon: <DownArrowIcon />,
      iconClass: "evaluation-icon-regressed",
      badgeClass: "evaluation-badge-regressed",
      label: "Regressed",
    },
    new: {
      icon: <PlusIcon />,
      iconClass: "evaluation-icon-new",
      badgeClass: "evaluation-badge-new",
      label: "New",
    },
  };

  return (
    <div className="glass-card-elevated p-5 sm:p-6 max-w-md w-full">
      {/* Header — tool context */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className="element-badge flex items-center gap-1.5">
          <LogoComponent className="w-4 h-4" />
          <span>{data.name}</span>
        </span>
        <span className="text-text-muted">&middot;</span>
        <span className="text-xs text-text-muted">Just now</span>
      </div>

      {/* Section label */}
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
        Changes detected
      </p>

      {/* Changes list */}
      <div className="space-y-2">
        {changes.map((change, i) => {
          const config = statusConfig[change.type];
          return (
            <div key={i} className="evaluation-card p-3">
              <div className="flex items-center gap-3">
                <span className={`evaluation-icon ${config.iconClass}`}>
                  {config.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">
                    {change.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="element-badge text-xs">{change.element}</span>
                    <span className="text-xs text-text-muted truncate">
                      {change.detail}
                    </span>
                  </div>
                </div>
                <span
                  className={`evaluation-badge ${config.badgeClass} flex-shrink-0`}
                >
                  {config.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer question */}
      <div className="mt-5 pt-4 border-t border-border-subtle">
        <p className="text-sm text-text-muted text-center">
          Your AI said{" "}
          <span className="font-semibold text-text-secondary">&ldquo;Done!&rdquo;</span>
        </p>
        <p className="text-sm text-accent font-medium text-center mt-1">
          But what did your visitors see?
        </p>
      </div>
    </div>
  );
}
