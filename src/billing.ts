import type { Transport } from "./transport.js";
import { addParams } from "./transport.js";
import type { RequestOptions } from "./client.js";
import type {
  UserBalance,
  TransactionHistoryResponse,
  ActivityStats,
  DailyActivityResponse,
} from "./types.js";

// ── Parameter types ──────────────────────────────────────────────────────────

export interface TransactionHistoryParams {
  page?: number;
  limit?: number;
  /** Comma-separated: "credit", "debit", "refund" */
  types?: string;
  /** Comma-separated: "pending", "completed", "failed" */
  statuses?: string;
  /** Format: YYYY-MM-DD */
  start_date?: string;
  /** Format: YYYY-MM-DD */
  end_date?: string;
  /** Minimum amount in dollars */
  min_amount?: number;
  /** Maximum amount in dollars */
  max_amount?: number;
  search?: string;
}

export interface DailyActivityParams {
  /** Number of days to look back (default 30). */
  days?: number;
}

// ── Service ──────────────────────────────────────────────────────────────────

export class BillingService {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /** Get the authenticated user's current balance. */
  async getBalance(options?: RequestOptions): Promise<UserBalance> {
    return this.transport.request({
      method: "GET",
      path: "/billing/balance",
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Get paginated, filterable transaction history. */
  async getTransactionHistory(
    params?: TransactionHistoryParams,
    options?: RequestOptions,
  ): Promise<TransactionHistoryResponse> {
    return this.transport.request({
      method: "GET",
      path: addParams("/billing/transactions", {
        page: params?.page,
        limit: params?.limit,
        types: params?.types,
        statuses: params?.statuses,
        start_date: params?.start_date,
        end_date: params?.end_date,
        min_amount: params?.min_amount,
        max_amount: params?.max_amount,
        search: params?.search,
      }),
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Get aggregate activity statistics (balance, spending, requests, tokens). */
  async getActivityStats(options?: RequestOptions): Promise<ActivityStats> {
    return this.transport.request({
      method: "GET",
      path: "/activity/stats",
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Get daily aggregated spending and usage data. */
  async getDailyActivity(
    params?: DailyActivityParams,
    options?: RequestOptions,
  ): Promise<DailyActivityResponse> {
    return this.transport.request({
      method: "GET",
      path: addParams("/activity/daily", {
        days: params?.days,
      }),
      signal: options?.signal,
      headers: options?.headers,
    });
  }
}
