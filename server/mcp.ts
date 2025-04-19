import fetch from "node-fetch";
import { toolsToJsonSchema } from "@shared/tools";
import { ToolExecutor } from "./tools";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { 
  tools as toolsTable, 
  messages, 
  chatSessions, 
  functionCalls 
} from "@shared/schema";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
}

export class MCPServer {
  private toolExecutor: ToolExecutor;
  private currentSessionId: number | null = null;
  
  constructor(toolExecutor: ToolExecutor) {
    this.toolExecutor = toolExecutor;
    // Note: We'll call ensureSessionExists in processMessage
    // to avoid async issues in constructor
  }
  
  // Make sure we have a valid session ID for storing messages
  private async ensureSessionExists() {
    if (this.currentSessionId === null) {
      // Create a new chat session
      const [session] = await db.insert(chatSessions)
        .values({})
        .returning();
      
      this.currentSessionId = session.id;
    }
  }
  
  // Get tool ID by name
  private async getToolId(toolName: string): Promise<number> {
    const [tool] = await db.select().from(toolsTable)
      .where(sql`${toolsTable.name} = ${toolName}`);
    
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    
    return tool.id;
  }
  
  async processMessage(message: string) {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    
    await this.ensureSessionExists();
    
    try {
      // Step 1: Save user message to database
      const [userMessage] = await db.insert(messages)
        .values({
          role: 'user',
          content: message,
          session_id: this.currentSessionId!
        })
        .returning();
      
      // Step 2: Call Gemini with function definitions
      const startTime = Date.now();
      const initialResponse = await this.callGeminiAPI(message);
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Step 3: Check if there's a function call
      if (initialResponse.functionCall) {
        const functionCall = initialResponse.functionCall;
        
        // Save assistant message with function call
        const [assistantMessage] = await db.insert(messages)
          .values({
            role: 'assistant',
            content: initialResponse.content || '',
            function_call: functionCall,
            execution_time: executionTime,
            session_id: this.currentSessionId!
          })
          .returning();
        
        // Step 4: Execute the function
        const funcStartTime = Date.now();
        const functionResult = await this.toolExecutor.executeFunction(
          functionCall.name,
          functionCall.arguments
        );
        const funcEndTime = Date.now();
        const funcExecutionTime = funcEndTime - funcStartTime;
        
        // Save function call details
        const toolId = await this.getToolId(functionCall.name);
        await db.insert(functionCalls)
          .values({
            message_id: assistantMessage.id,
            tool_id: toolId,
            arguments: functionCall.arguments,
            result: functionResult,
            execution_time: funcExecutionTime
          });
        
        // Step 5: Call Gemini again with the function result
        const finalStartTime = Date.now();
        const finalResponse = await this.callGeminiWithFunctionResult(
          message,
          functionCall,
          functionResult
        );
        const finalEndTime = Date.now();
        const finalExecutionTime = finalEndTime - finalStartTime;
        
        // Save final assistant response
        await db.insert(messages)
          .values({
            role: 'assistant',
            content: finalResponse.content,
            session_id: this.currentSessionId!,
            execution_time: finalExecutionTime
          });
        
        return {
          functionCall,
          finalResponse: finalResponse.content
        };
      }
      
      // No function call, just save the assistant message
      await db.insert(messages)
        .values({
          role: 'assistant',
          content: initialResponse.content,
          session_id: this.currentSessionId!,
          execution_time: executionTime
        });
      
      // If no function call, just return the content
      return {
        finalResponse: initialResponse.content
      };
    } catch (error) {
      console.error("Error in processMessage:", error);
      throw error;
    }
  }
  
  private async callGeminiAPI(message: string) {
    // Fetch tools from database
    const dbTools = await db.select().from(toolsTable);
    
    // Convert DB tool format to the format needed for Gemini
    const toolsForGemini = dbTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as Record<string, any>
    }));
    
    // Convert tools to JSON schema
    const tools = toolsToJsonSchema(toolsForGemini);
    
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: message }]
        }
      ],
      tools: [
        {
          function_declarations: tools
        }
      ],
      tool_config: {
        function_calling_config: {
          mode: "auto"
        }
      },
      generationConfig: {
        temperature: 0.2
      }
    };
    
    const response = await fetch(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json() as any;
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response from Gemini API");
    }
    
    const candidate = data.candidates[0];
    const content = candidate.content;
    
    // Check if there's a function call
    let functionCall = null;
    if (content.parts && content.parts.length > 0) {
      for (const part of content.parts) {
        if (part.functionCall) {
          // Handle the case when args is already an object or a string
          let args = part.functionCall.args;
          if (typeof args === 'string') {
            try {
              args = JSON.parse(args);
            } catch (error) {
              console.error('Error parsing function call arguments:', error);
              throw new Error(`Invalid function call arguments: ${args}`);
            }
          }
          
          functionCall = {
            name: part.functionCall.name,
            arguments: args
          };
          break;
        }
      }
    }
    
    // Extract text content
    let textContent = "";
    if (content.parts && content.parts.length > 0) {
      for (const part of content.parts) {
        if (part.text) {
          textContent += part.text;
        }
      }
    }
    
    return {
      content: textContent,
      functionCall
    };
  }
  
  private async callGeminiWithFunctionResult(
    originalMessage: string,
    functionCall: FunctionCall,
    functionResult: any
  ) {
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: originalMessage }]
        },
        {
          role: "model",
          parts: [
            {
              functionCall: {
                name: functionCall.name,
                args: typeof functionCall.arguments === 'string' 
                  ? JSON.parse(functionCall.arguments) // Parse string to object
                  : functionCall.arguments // Pass as direct object
              }
            }
          ]
        },
        {
          role: "function",
          parts: [
            {
              functionResponse: {
                name: functionCall.name,
                response: { result: functionResult }
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2
      }
    };
    
    const response = await fetch(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json() as any;
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response from Gemini API");
    }
    
    const candidate = data.candidates[0];
    const content = candidate.content;
    
    // Extract text content
    let textContent = "";
    if (content.parts && content.parts.length > 0) {
      for (const part of content.parts) {
        if (part.text) {
          textContent += part.text;
        }
      }
    }
    
    return {
      content: textContent
    };
  }
}