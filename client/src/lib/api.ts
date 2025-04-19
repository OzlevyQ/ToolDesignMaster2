import { apiRequest } from "./queryClient";
import { Tool, ChatResponse } from "@/types";

// Fetch available tools from the server
export async function fetchTools(): Promise<Tool[]> {
  try {
    const response = await apiRequest("GET", "/api/tools", undefined);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch tools:", error);
    throw new Error("Failed to load available tools. Please try again.");
  }
}

// Send a chat message and get the response
export async function sendChatMessage(
  message: string,
  tools: Tool[]
): Promise<ChatResponse> {
  try {
    // We don't need to send the tools back to the server
    // Server fetches them directly from database
    const response = await apiRequest("POST", "/api/chat", {
      message
    });
    return await response.json();
  } catch (error) {
    console.error("Failed to send chat message:", error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : "Failed to get a response. Please try again."
    );
  }
}
