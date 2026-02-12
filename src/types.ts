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

/**
 * A Server-Sent Event from a listen stream.
 *
 * For chat events, check `eventType`:
 * - "text_delta": `textDelta` contains the streamed text chunk
 * - "reasoning_delta": `reasoningDelta` contains thinking text
 * - "tool_call_start": Tool call initiated (`toolCallId`, `toolName`)
 * - "tool_call_delta": Tool call args delta (`toolCallId`, `toolArgsDelta`)
 * - "tool_start": Tool execution started (`toolName`, `toolCallId`)
 * - "tool_complete": Tool finished (`toolName`, `toolCallId`, `toolResult`)
 * - "tool_error": Tool failed (`toolName`, `toolCallId`, `error`)
 * - "tool_approval_request": Approval needed (`toolName`, `toolCallId`, `toolArgs`)
 * - "tool_approval_response": Approval result (`toolName`, `toolCallId`, `approved`)
 * - "user_message": Voice transcript (`text`)
 * - "done": Iteration complete
 * - "stopped": User stopped workflow
 * - "error": Error occurred (`error`)
 */
export interface SSEEvent {
  workflow_request?: WorkflowRequest;
  node_execution?: NodeExecution;
  /** True if this was a keepalive ping. */
  isKeepalive: boolean;
  /** Raw `data:` payload before parsing. */
  rawData: string;

  // Event type and metadata
  /** The type of chat event. */
  eventType?: string;
  /** The iteration number within the agent loop. */
  iteration?: number;
  /** The workflow request ID for this run. */
  runId?: string;

  // Text streaming
  /** Streamed text chunk (for "text_delta" events). */
  textDelta?: string;

  // Reasoning/thinking
  /** Reasoning/thinking text (for "reasoning_delta" events). */
  reasoningDelta?: string;
  /** Type of reasoning: "thinking" or "redacted_thinking". */
  reasoningType?: string;

  // Tool calls
  /** Tool call ID. */
  toolCallId?: string;
  /** Tool name. */
  toolName?: string;
  /** Tool arguments delta (incremental JSON). */
  toolArgsDelta?: string;
  /** Tool arguments (for approval requests). */
  toolArgs?: unknown;
  /** Tool result (for "tool_complete" events). */
  toolResult?: unknown;

  // Tool approval
  /** Whether the tool was approved (for "tool_approval_response"). */
  approved?: boolean;

  // Messages and errors
  /** Text content (for "user_message" events). */
  text?: string;
  /** Status message (for "stopped" events). */
  message?: string;
  /** Error message (for "error" events). */
  error?: string;
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

// ── Memory ───────────────────────────────────────────────────────────────────

export interface MemoryMessage {
  id: string;
  role: string;
  content?: unknown;
  context_memory_id?: string;
  agent_node_id?: string;
  workflow_version_id?: string;
  tool_calls?: Record<string, unknown>[];
  tool_call_id?: string;
  files?: Record<string, unknown>[];
  created_at?: string;
  updated_at?: string;
}

export interface MemoryInstance {
  id: string;
  name: string;
  workflow_version_id: string;
  chat_id: string;
  memory_node_id: string;
  memory_node_label: string;
  context_size: number;
  message_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface MemoryListResponse {
  chats: MemoryInstance[];
  next_cursor?: string;
  has_more: boolean;
}

export interface MemoryGetResponse {
  messages: MemoryMessage[];
  next_cursor?: string;
  has_more: boolean;
  limit: number;
}

export interface MemoryActionResponse {
  action: string;
  message: string;
  deleted_count?: number;
  summary?: string;
  messages?: MemoryMessage[];
  remaining_count?: number;
}

// ── MCP Catalog ──────────────────────────────────────────────────────────────

export interface MCPCatalogItem {
  id: string;
  name: string;
  description?: string;
  url: string;
  transport_type: string;
  auth_type: string;
  auth_config?: Record<string, unknown>;
  image_url?: string;
  category?: string;
  is_featured: boolean;
  display_order?: number;
  created_at: string;
  updated_at: string;
}

export interface MCPCatalogResponse {
  mcp_server: MCPCatalogItem;
}

export interface MCPCatalogListResponse {
  mcp_servers: MCPCatalogItem[];
  current_page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
}

// ── MCP Connections ──────────────────────────────────────────────────────────

export interface MCPConnection {
  id: string;
  user_id: string;
  name: string;
  url: string;
  image_url?: string;
  transport_type: string;
  auth_type: string;
  auth_config?: Record<string, unknown>;
  end_user_id?: string;
  created_at: string;
}

export interface MCPConnectionListResponse {
  connections: MCPConnection[];
  total: number;
}

export interface MCPExecuteToolResult {
  content?: unknown[];
  structuredContent?: unknown;
  isError?: boolean;
}

export interface MCPExecuteToolResponse {
  result: MCPExecuteToolResult;
  is_error: boolean;
}

export interface MCPServerToolOption {
  label: string;
  value: string;
}

export interface MCPServerToolsResponse {
  options: MCPServerToolOption[];
  total: number;
  limit: number;
}
