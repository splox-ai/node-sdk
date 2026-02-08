export { Splox } from "./client.js";
export { Splox as default } from "./client.js";

// Services (for type imports)
export { WorkflowService } from "./workflows.js";
export { ChatService } from "./chats.js";
export { EventService } from "./events.js";

// Parameter types
export type { SploxOptions, RequestOptions } from "./client.js";
export type { ListWorkflowsParams, RunWorkflowParams, WorkflowHistoryParams } from "./workflows.js";
export type { CreateChatParams, ChatHistoryParams } from "./chats.js";
export type { SendEventParams } from "./events.js";

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
} from "./types.js";
