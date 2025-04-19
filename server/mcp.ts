import fetch from "node-fetch";
import { toolDefinitions, toolsToJsonSchema } from "@shared/tools";
import { ToolExecutor } from "./tools";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
}

export class MCPServer {
  private toolExecutor: ToolExecutor;
  
  constructor(toolExecutor: ToolExecutor) {
    this.toolExecutor = toolExecutor;
  }
  
  async processMessage(message: string) {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    
    try {
      // Step 1: Call Gemini with function definitions
      const initialResponse = await this.callGeminiAPI(message);
      
      // Step 2: Check if there's a function call
      if (initialResponse.functionCall) {
        const functionCall = initialResponse.functionCall;
        
        // Step 3: Execute the function
        const functionResult = await this.toolExecutor.executeFunction(
          functionCall.name,
          functionCall.arguments
        );
        
        // Step 4: Call Gemini again with the function result
        const finalResponse = await this.callGeminiWithFunctionResult(
          message,
          functionCall,
          functionResult
        );
        
        return {
          functionCall,
          finalResponse: finalResponse.content
        };
      }
      
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
    const tools = toolsToJsonSchema(toolDefinitions);
    
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
    
    const data = await response.json();
    
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
          functionCall = {
            name: part.functionCall.name,
            arguments: JSON.parse(part.functionCall.args)
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
                args: functionCall.arguments
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
    
    const data = await response.json();
    
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
