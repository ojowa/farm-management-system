/**
 * Reporting module — reports, scheduled reports and weather.
 * Mirrors the admin portal's `reporting` plan-module (Sidebar: "Reports";
 * "Weather" sits in the same Insights section but is plan-module-free, so its
 * API is re-exported here rather than from a module of its own).
 */
export { reportsAPI, scheduledReportsAPI, weatherAPI } from '../../services/api';
export type { Report, ScheduledReport } from '../../services/types';
