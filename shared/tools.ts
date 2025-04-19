// Tool definitions shared between client and server

export interface ToolParameter {
  type: string;
  description: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters?: Record<string, ToolParameter>;
}

// Convert tool definitions to JSON schema for function calling
export function toolsToJsonSchema(tools: ToolDefinition[]) {
  return tools.map(tool => {
    const parameters: Record<string, any> = {
      type: "object",
      properties: {},
      required: []
    };

    if (tool.parameters) {
      for (const [key, param] of Object.entries(tool.parameters)) {
        parameters.properties[key] = {
          type: param.type,
          description: param.description
        };
        parameters.required.push(key);
      }
    }

    return {
      name: tool.name,
      description: tool.description,
      parameters: parameters
    };
  });
}

// Format tools for client display
export function formatToolsForClient(tools: ToolDefinition[]) {
  return tools.map(tool => {
    const parameters: Record<string, string> = {};
    
    if (tool.parameters) {
      for (const [key, param] of Object.entries(tool.parameters)) {
        parameters[key] = param.type;
      }
    }
    
    return {
      name: tool.name,
      description: tool.description,
      parameters: Object.keys(parameters).length > 0 ? parameters : undefined
    };
  });
}
