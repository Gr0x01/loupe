"use client";

import { useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

// --- Types ---

export type ClaimModalType = "already_claimed" | "page_limit" | null;

interface ClaimModalProps {
  type: ClaimModalType;
  onClose: () => void;
  /** Domain being claimed, e.g. "acme.com" */
  domain?: string;
  /** Current page limit for the user */
  pageLimit?: number;
  /** Callback when user clicks "Share to unlock" */
  onShare?: () => void;
}

// --- Icons ---

function ShieldIcon() {
  return (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2l7 4v5c0 5.25-3.5 9.74-7 11-3.5-1.26-7-5.75-7-11V6l7-4z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function PagesIcon() {
  return (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Back page */}
      <rect x="6" y="3" width="12" height="16" rx="2" />
      {/* Front page offset */}
      <rect x="3" y="6" width="12" height="16" rx="2" />
      {/* Plus sign */}
      <line x1="9" y1="12" x2="9" y2="16" />
      <line x1="7" y1="14" x2="11" y2="14" />
    </svg>
  );
}

// --- Component ---

export function ClaimModal({
  type,
  onClose,
  domain,
  pageLimit = 1,
  onShare,
}: ClaimModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  // Close on Escape (only when modal is open)
  useEffect(() => {
    if (!type) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [type, handleClose]);

  // Prevent body scroll when open (only when modal is open)
  useEffect(() => {
    if (!type) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [type]);

  if (!type) return null;

  const handleShareClick = () => {
    if (onShare) {
      onShare();
    } else {
      // Fallback: copy current URL
      navigator.clipboard.writeText(window.location.href);
    }
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const content = (
    <div
      className={`claim-modal-overlay ${isClosing ? "closing" : ""}`}
      onClick={handleClose}
    >
      <div
        className={`claim-modal-content ${isClosing ? "closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-modal-title"
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-[rgba(0,0,0,0.04)] transition-colors"
          aria-label="Close"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>

        {type === "already_claimed" ? (
          /* ========== Already Claimed ========== */
          <div className="text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[rgba(0,0,0,0.04)] text-text-muted mb-5">
              <ShieldIcon />
            </div>

            {/* Headline */}
            <h2
              id="claim-modal-title"
              className="text-2xl font-bold text-text-primary mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Someone&apos;s already watching this
            </h2>

            {/* Body */}
            <p className="text-base text-text-secondary leading-relaxed mb-6 max-w-[300px] mx-auto">
              Another Loupe user is monitoring{" "}
              {domain ? (
                <span className="font-medium text-text-primary">{domain}</span>
              ) : (
                "this domain"
              )}
              . If this is your site, reach out and we&apos;ll sort it out.
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-2.5">
              <button onClick={handleClose} className="btn-primary w-full">
                Got it
              </button>
              <a
                href="mailto:support@getloupe.io?subject=Page%20claim%20request"
                className="btn-secondary w-full inline-flex items-center justify-center"
              >
                Contact support
              </a>
            </div>
          </div>
        ) : (
          /* ========== Page Limit ========== */
          <div className="text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[rgba(255,90,54,0.08)] text-accent mb-5">
              <PagesIcon />
            </div>

            {/* Headline */}
            <h2
              id="claim-modal-title"
              className="text-2xl font-bold text-text-primary mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              You&apos;re at your page limit
            </h2>

            {/* Body */}
            <p className="text-base text-text-secondary leading-relaxed mb-6 max-w-[300px] mx-auto">
              You can monitor{" "}
              <span className="font-medium text-text-primary">
                {pageLimit} page{pageLimit !== 1 ? "s" : ""}
              </span>{" "}
              right now. Share Loupe to unlock more slots, or remove an existing
              page to free one up.
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleShareClick}
                className="btn-primary w-full inline-flex items-center justify-center gap-2"
              >
                {shareCopied ? (
                  <>
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
                    Link copied
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 10l-2.5 2.5a1.77 1.77 0 01-2.5-2.5L3.5 7.5a1.77 1.77 0 012.5 0" />
                      <path d="M10 6l2.5-2.5a1.77 1.77 0 012.5 2.5L12.5 8.5a1.77 1.77 0 01-2.5 0" />
                      <path d="M6 10l4-4" />
                    </svg>
                    Share to unlock
                  </>
                )}
              </button>
              <Link
                href="/dashboard"
                className="btn-secondary w-full inline-flex items-center justify-center"
                onClick={handleClose}
              >
                Manage your pages
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
