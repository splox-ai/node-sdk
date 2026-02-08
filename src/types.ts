// ── Workflow ──────────────────────────────────────────────────────────────────

export interface Workflow {
  id: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
  latest_version?: WorkflowVersion;
  is_public?: boolean;
}

export interface WorkflowVersion {
  id: string;
  workflow_id: string;
  version_number: number;
  name: string;
  status: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, unknown>;
}

export interface Node {
  id: string;
  workflow_version_id: string;
  node_type: string;
  label: string;
  pos_x?: number;
  pos_y?: number;
  parent_id?: string;
  extent?: string;
  data?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface Edge {
  id: string;
  workflow_version_id: string;
  source: string;
  target: string;
  edge_type: string;
  source_handle?: string;
  data?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

// ── Execution ────────────────────────────────────────────────────────────────

export interface WorkflowRequestFile {
  url: string;
  content_type?: string;
  file_name?: string;
  file_size?: number;
  metadata?: Record<string, unknown>;
}

export interface WorkflowRequest {
  id: string;
  workflow_version_id: string;
  start_node_id: string;
  status: string;
  created_at: string;
  user_id?: string;
  billing_user_id?: string;
  parent_node_execution_id?: string;
  parent_workflow_request_id?: string;
  chat_id?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  started_at?: string;
  completed_at?: string;
}

export interface NodeExecution {
  id: string;
  workflow_request_id: string;
  node_id: string;
  workflow_version_id: string;
  status: string;
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown>;
  attempt_count?: number;
  created_at?: string;
  completed_at?: string;
  failed_at?: string;
}

export interface ChildExecution {
  index: number;
  workflow_request_id: string;
  status: string;
  label?: string;
  target_node_label?: string;
  created_at?: string;
  completed_at?: string;
  nodes?: ExecutionNode[];
}

export interface ExecutionNode {
  id: string;
  node_id: string;
  status: string;
  node_label?: string;
  node_type?: string;
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown>;
  created_at?: string;
  completed_at?: string;
  failed_at?: string;
  attempt_count?: number;
  child_executions?: ChildExecution[];
  total_children?: number;
  has_more_children?: boolean;
}

export interface ExecutionTree {
  workflow_request_id: string;
  status: string;
  created_at: string;
  completed_at?: string;
  nodes?: ExecutionNode[];
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export interface Chat {
  id: string;
  name: string;
  user_id?: string;
  resource_type?: string;
  resource_id?: string;
  is_public?: boolean;
  public_share_token?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface ChatMessageContent {
  type: string;
  text?: string;
  toolCallId?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  reasoning?: string;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  role: string;
  content?: ChatMessageContent[];
  parent_id?: string;
  status?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  files?: Record<string, unknown>[];
  created_at?: string;
  updated_at?: string;
}

// ── Pagination ───────────────────────────────────────────────────────────────

export interface Pagination {
  limit: number;
  next_cursor?: string;
  has_more: boolean;
}

// ── SSE ──────────────────────────────────────────────────────────────────────

export interface SSEEvent {
  workflow_request?: WorkflowRequest;
  node_execution?: NodeExecution;
  /** True if this was a keepalive ping. */
  isKeepalive: boolean;
  /** Raw `data:` payload before parsing. */
  rawData: string;
}

// ── Response wrappers ────────────────────────────────────────────────────────

export interface WorkflowListResponse {
  workflows: Workflow[];
  pagination: Pagination;
}

export interface WorkflowFullResponse {
  workflow: Workflow;
  workflow_version: WorkflowVersion;
  nodes: Node[];
  edges: Edge[];
}

export interface StartNodesResponse {
  nodes: Node[];
}

export interface WorkflowVersionListResponse {
  versions: WorkflowVersion[];
}

export interface RunResponse {
  workflow_request_id: string;
}

export interface ExecutionTreeResponse {
  execution_tree: ExecutionTree;
}

export interface HistoryResponse {
  data: WorkflowRequest[];
  pagination: Pagination;
}

export interface ChatListResponse {
  chats: Chat[];
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
  has_more: boolean;
}

export interface EventResponse {
  ok: boolean;
  event_id: string;
}

// ── Billing / Cost Tracking ──────────────────────────────────────────────────

export interface UserBalance {
  balance_microdollars: number;
  balance_usd: number;
  currency: string;
}

export interface BalanceTransaction {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  description?: string;
  metadata?: Record<string, unknown>;
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionPagination {
  page: number;
  limit: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface TransactionHistoryResponse {
  transactions: BalanceTransaction[];
  pagination: TransactionPagination;
}

export interface ActivityStats {
  balance: number;
  total_requests: number;
  total_spending: number;
  avg_cost_per_request: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export interface DailyActivity {
  date: string;
  total_cost: number;
  request_count: number;
  node_count: number;
}

export interface DailyActivityResponse {
  data: DailyActivity[];
  days: number;
}
