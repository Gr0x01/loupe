"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Finding {
  type: "strength" | "issue" | "suggestion";
  title: string;
  detail: string;
}

interface Category {
  name: string;
  score: number;
  findings: Finding[];
}

interface StructuredOutput {
  overallScore: number;
  categories: Category[];
  summary: string;
  topActions: string[];
}

interface Analysis {
  id: string;
  url: string;
  status: "pending" | "processing" | "complete" | "failed";
  screenshot_url: string | null;
  structured_output: StructuredOutput | null;
  error_message: string | null;
  created_at: string;
}

const LOADING_STEPS = [
  "Capturing screenshot...",
  "Analyzing headline and messaging...",
  "Checking visual hierarchy...",
  "Evaluating calls to action...",
  "Reviewing trust signals...",
  "Assessing design quality...",
  "Generating recommendations...",
];

function FindingBadge({ type }: { type: Finding["type"] }) {
  const styles = {
    strength: "bg-green-50 text-green-700 border-green-200",
    issue: "bg-red-50 text-red-700 border-red-200",
    suggestion: "bg-blue-50 text-blue-700 border-blue-200",
  };
  const labels = {
    strength: "Strength",
    issue: "Issue",
    suggestion: "Suggestion",
  };
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded text-xs font-medium border ${styles[type]}`}
    >
      {labels[type]}
    </span>
  );
}

function ScoreDisplay({ score }: { score: number }) {
  const color =
    score >= 80
      ? "text-green-700"
      : score >= 60
        ? "text-amber-700"
        : "text-red-700";
  return <span className={`${color} font-bold`}>{score}</span>;
}

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState("");

  const fetchAnalysis = useCallback(async () => {
    try {
      const res = await fetch(`/api/analysis/${id}`);
      if (!res.ok) {
        setError("Analysis not found");
        return null;
      }
      const data: Analysis = await res.json();
      setAnalysis(data);
      return data;
    } catch {
      setError("Failed to load analysis");
      return null;
    }
  }, [id]);

  // Poll for results
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    async function poll() {
      const data = await fetchAnalysis();
      if (data && (data.status === "complete" || data.status === "failed")) {
        clearInterval(interval);
      }
    }

    poll();
    interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [fetchAnalysis]);

  // Cycle loading steps
  useEffect(() => {
    if (
      analysis?.status === "pending" ||
      analysis?.status === "processing"
    ) {
      const timer = setInterval(() => {
        setLoadingStep((s) => (s + 1) % LOADING_STEPS.length);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [analysis?.status]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-500 text-lg">{error}</p>
          <Link
            href="/"
            className="text-gray-900 font-medium underline mt-4 inline-block"
          >
            Try another URL
          </Link>
        </div>
      </div>
    );
  }

  if (
    !analysis ||
    analysis.status === "pending" ||
    analysis.status === "processing"
  ) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto" />
          <p className="text-gray-900 font-medium mt-6">
            Analyzing your page
          </p>
          <p className="text-sm text-gray-400 mt-2 animate-pulse">
            {LOADING_STEPS[loadingStep]}
          </p>
          {analysis?.url && (
            <p className="text-xs text-gray-400 mt-4 font-mono truncate">
              {analysis.url}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (analysis.status === "failed") {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-gray-900 font-medium text-lg">
            Analysis failed
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {analysis.error_message ||
              "Something went wrong analyzing this page."}
          </p>
          <Link
            href="/"
            className="inline-block mt-6 px-5 py-2.5 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-colors"
          >
            Try again
          </Link>
        </div>
      </div>
    );
  }

  const s = analysis.structured_output!;

  return (
    <div className="min-h-screen bg-[#FAFAFA] px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="min-w-0">
            <p className="text-sm text-gray-400 font-mono truncate">
              {analysis.url}
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0"
          >
            Analyze another page
          </Link>
        </div>

        {/* Overall Score */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 mb-8 text-center">
          <p className="text-sm text-gray-400 uppercase tracking-wide font-medium mb-2">
            Overall Score
          </p>
          <p className="text-6xl md:text-7xl font-bold text-gray-900 tracking-tight">
            <ScoreDisplay score={s.overallScore} />
            <span className="text-2xl text-gray-300 font-normal">/100</span>
          </p>
          <p className="text-gray-600 mt-4 max-w-2xl mx-auto leading-relaxed">
            {s.summary}
          </p>
        </div>

        {/* Screenshot */}
        {analysis.screenshot_url && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-8">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">
              Page Screenshot
            </p>
            <img
              src={analysis.screenshot_url}
              alt={`Screenshot of ${analysis.url}`}
              className="w-full rounded-md border border-gray-100"
            />
          </div>
        )}

        {/* Category Scores */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {s.categories.map((cat) => (
            <div
              key={cat.name}
              className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm text-center"
            >
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                {cat.name}
              </p>
              <p className="text-3xl font-bold mt-1">
                <ScoreDisplay score={cat.score} />
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {cat.findings.length} finding
                {cat.findings.length !== 1 ? "s" : ""}
              </p>
            </div>
          ))}
        </div>

        {/* Top Actions */}
        {s.topActions.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-8">
            <p className="text-sm font-semibold text-gray-900 mb-4">
              Top actions to improve this page
            </p>
            <ol className="space-y-3">
              {s.topActions.map((action, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <span className="text-gray-300 font-medium flex-shrink-0">
                    {i + 1}.
                  </span>
                  {action}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Detailed Findings */}
        {s.categories.map((cat) => (
          <div key={cat.name} className="mb-8">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              {cat.name}
            </h2>
            <div className="space-y-3">
              {cat.findings.map((finding, i) => (
                <div
                  key={i}
                  className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <FindingBadge type={finding.type} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {finding.title}
                      </p>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                        {finding.detail}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Footer CTA */}
        <div className="border-t border-gray-200 pt-8 mt-12 text-center">
          <p className="text-gray-500 text-sm">
            Want to track changes to this page over time?
          </p>
          <p className="text-gray-900 font-medium text-sm mt-1">
            Driftwatch monitoring is coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
