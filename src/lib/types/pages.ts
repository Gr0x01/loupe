/**
 * Shared types for pages and scan history
 */

export interface PageInfo {
  id: string;
  url: string;
  name: string | null;
  scan_frequency: string;
  repo_id: string | null;
  created_at: string;
  last_scan_id?: string | null;
}

export interface ScanHistoryItem {
  id: string;
  scan_number: number;
  status: string;
  progress: {
    validated?: number;
    watching?: number;
    open?: number;
    // Legacy fields for compatibility
    total_original?: number;
    resolved?: number;
    persisting?: number;
    new_issues?: number;
  } | null;
  created_at: string;
  is_baseline: boolean;
}

export interface PageHistoryResponse {
  page: PageInfo;
  history: ScanHistoryItem[];
  total_scans: number;
}
