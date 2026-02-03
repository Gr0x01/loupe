"use client";

import { useState } from "react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SHARE_URL = "https://getloupe.io";
const SHARE_TEXT = "I'm using Loupe to monitor my site for changes. It catches the stuff I miss when shipping fast.";

export default function ShareModal({ isOpen, onClose, onSuccess }: ShareModalProps) {
  const [crediting, setCrediting] = useState(false);
  const [credited, setCredited] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const claimCredit = async () => {
    if (crediting || credited) return;

    setCrediting(true);
    setError("");

    try {
      const res = await fetch("/api/share-credit", { method: "POST" });
      if (!res.ok) {
        setError("Failed to claim credit");
        setCrediting(false);
        return;
      }

      setCredited(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch {
      setError("Failed to claim credit");
      setCrediting(false);
    }
  };

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}`;
    window.open(url, "_blank", "width=550,height=450");
    claimCredit();
  };

  const shareToLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_URL)}`;
    window.open(url, "_blank", "width=550,height=450");
    claimCredit();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      claimCredit();
    } catch {
      setError("Failed to copy link");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="glass-card-elevated p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {credited ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-[rgba(26,140,91,0.1)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-score-high" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2
              className="text-2xl font-bold text-text-primary"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Page unlocked
            </h2>
            <p className="text-text-secondary mt-2">
              You can now add one more page to monitor.
            </p>
          </div>
        ) : (
          <>
            <h2
              className="text-2xl font-bold text-text-primary mb-2"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Share to unlock +1 page
            </h2>
            <p className="text-text-secondary mb-6">
              Share Loupe to unlock space for another monitored page.
            </p>

            <div className="space-y-3">
              {/* Twitter */}
              <button
                onClick={shareToTwitter}
                disabled={crediting}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl
                           bg-[#1DA1F2] text-white font-medium
                           hover:bg-[#1a8cd8] active:scale-[0.98] transition-all duration-150
                           disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Share on X
              </button>

              {/* LinkedIn */}
              <button
                onClick={shareToLinkedIn}
                disabled={crediting}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl
                           bg-[#0A66C2] text-white font-medium
                           hover:bg-[#004182] active:scale-[0.98] transition-all duration-150
                           disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z" />
                </svg>
                Share on LinkedIn
              </button>

              {/* Copy link */}
              <button
                onClick={copyLink}
                disabled={crediting}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl
                           bg-[rgba(255,255,255,0.6)] text-text-primary font-medium
                           border border-border-subtle
                           hover:bg-[rgba(255,255,255,0.8)] active:scale-[0.98] transition-all duration-150
                           disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy link
              </button>
            </div>

            {error && (
              <p className="text-sm text-score-low mt-3 text-center">{error}</p>
            )}

            <button
              onClick={onClose}
              className="w-full text-text-muted text-sm font-medium mt-4 py-2
                         hover:text-text-secondary transition-colors"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
