export { Splox } from "./client.js";
export { Splox as default } from "./client.js";

// Services (for type imports)
export { WorkflowService } from "./workflows.js";
export { ChatService } from "./chats.js";
export { EventService } from "./events.js";
export { BillingService } from "./billing.js";
export { MemoryService } from "./memory.js";
export { MCPService, generateConnectionToken, generateConnectionLink } from "./mcp.js";

// Parameter types
export type { SploxOptions, RequestOptions } from "./client.js";
export type { ListWorkflowsParams, RunWorkflowParams, WorkflowHistoryParams } from "./workflows.js";
export type { CreateChatParams, ChatHistoryParams } from "./chats.js";
export type { SendEventParams } from "./events.js";
export type { TransactionHistoryParams, DailyActivityParams } from "./billing.js";
export type {
  MemoryListParams,
  MemoryGetParams,
  MemorySummarizeParams,
  MemoryTrimParams,
  MemoryClearParams,
  MemoryExportParams,
  MemoryDeleteParams,
} from "./memory.js";
export type { CatalogParams, ConnectionParams, ExecuteToolParams, SearchMCPParams } from "./mcp.js";

// SSE
export { SSEStream } from "./sse.js";

// Errors
export {
  SploxAPIError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  GoneError,
  RateLimitError,
  ConnectionError,
  TimeoutError,
  StreamError,
} from "./errors.js";

// Types
export type {
  Workflow,
  WorkflowVersion,
  Node,
  Edge,
  WorkflowRequestFile,
  WorkflowRequest,
  NodeExecution,
  ChildExecution,
  ExecutionNode,
  ExecutionTree,
  Chat,
  ChatMessageContent,
  ChatMessage,
  Pagination,
  SSEEvent,
  WorkflowListResponse,
  WorkflowFullResponse,
  StartNodesResponse,
  WorkflowVersionListResponse,
  RunResponse,
  ExecutionTreeResponse,
  HistoryResponse,
  ChatListResponse,
  ChatHistoryResponse,
  EventResponse,
  UserBalance,
  BalanceTransaction,
  TransactionPagination,
  TransactionHistoryResponse,
  ActivityStats,
  DailyActivity,
  DailyActivityResponse,
  MemoryMessage,
  MemoryInstance,
  MemoryListResponse,
  MemoryGetResponse,
  MemoryActionResponse,
  MCPCatalogItem,
  MCPCatalogResponse,
  MCPCatalogListResponse,
  MCPConnection,
  MCPConnectionListResponse,
  MCPExecuteToolResult,
  MCPExecuteToolResponse,
  MCPToolSummary,
  MCPConnectionRef,
  MCPUserConnectionGroup,
  MCPUserConnectionsResponse,
  MCPSearchResult,
  MCPSearchResponse,
} from "./types.js";
