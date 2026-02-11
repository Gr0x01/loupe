"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

interface ScanPickerProps {
  currentScanNumber: number;
  totalScans: number;
  pageId: string;
  currentAnalysisId: string;
}

interface ScanHistoryItem {
  id: string;
  created_at: string;
  trigger_type: "manual" | "daily" | "weekly" | "deploy" | null;
  status: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getTriggerLabel(type: string | null): string {
  switch (type) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "deploy":
      return "Deploy";
    case "manual":
      return "Manual";
    default:
      return "";
  }
}

export function ScanPicker({
  currentScanNumber,
  totalScans,
  pageId,
  currentAnalysisId,
}: ScanPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<ScanHistoryItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef<ScanHistoryItem[] | null>(null);

  // Fetch history when dropdown opens (lazy-load)
  const fetchHistory = useCallback(async () => {
    // Use cached data if available
    if (cacheRef.current) {
      setHistory(cacheRef.current);
      return;
    }

    setLoading(true);
    setError(false);

    try {
      const res = await fetch(`/api/pages/${pageId}/history?limit=5`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      cacheRef.current = data.history || [];
      setHistory(cacheRef.current);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  // Handle dropdown open
  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (newState && !history && !loading) {
      fetchHistory();
    }
  };

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  return (
    <div className="scan-picker" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="scan-picker-trigger"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="scan-picker-label">
          Scan {currentScanNumber} of {totalScans}
        </span>
        <svg
          className={`scan-picker-chevron ${isOpen ? "scan-picker-chevron-open" : ""}`}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="scan-picker-dropdown">
          {loading && (
            <div className="scan-picker-loading">
              <div className="scan-picker-skeleton" />
              <div className="scan-picker-skeleton" />
              <div className="scan-picker-skeleton" />
            </div>
          )}

          {error && (
            <div className="scan-picker-error">
              <p>Failed to load history</p>
              <button onClick={fetchHistory} className="scan-picker-retry">
                Retry
              </button>
            </div>
          )}

          {history && !loading && (
            <>
              <div className="scan-picker-list">
                {history.map((scan, index) => {
                  const scanNumber = totalScans - index;
                  const isCurrent = scan.id === currentAnalysisId;

                  return (
                    <Link
                      key={scan.id}
                      href={`/analysis/${scan.id}`}
                      className={`scan-picker-item ${isCurrent ? "scan-picker-item-current" : ""}`}
                      onClick={() => setIsOpen(false)}
                    >
                      <span className="scan-picker-item-number">#{scanNumber}</span>
                      <span className="scan-picker-item-date">{formatDate(scan.created_at)}</span>
                      {scan.trigger_type && (
                        <span className="scan-picker-item-type">{getTriggerLabel(scan.trigger_type)}</span>
                      )}
                      {isCurrent && (
                        <svg
                          className="scan-picker-item-check"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="3 8 6 11 13 4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </Link>
                  );
                })}
              </div>

              {totalScans > 5 && (
                <Link
                  href={`/pages/${pageId}`}
                  className="scan-picker-view-all"
                  onClick={() => setIsOpen(false)}
                >
                  View all {totalScans} scans
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
