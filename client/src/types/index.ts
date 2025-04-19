// Message types
export type MessageRole = "system" | "user" | "assistant";

export interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
}

export interface Message {
  role: MessageRole;
  content: string;
  examples?: string[];
  functionCall?: FunctionCall;
  executionTime?: number;
}

// Tool types
export interface Tool {
  name: string;
  description: string;
  parameters?: Record<string, string>;
}

// Connection state
export interface ConnectionState {
  server: "connected" | "connecting" | "error";
  gemini: "ready" | "connecting" | "error";
  toolsCount: number;
  avgResponse: number;
}

// API response types
export interface ChatResponse {
  functionCall?: FunctionCall;
  finalResponse?: string;
}

// File upload types
export interface FileInfo {
  name: string;
  filename: string;
  path: string;
  fullPath: string;
  size: number;
}
