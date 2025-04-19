// Implementation of the tools that can be called by Gemini

export class ToolExecutor {
  // Execute a function based on its name and arguments
  async executeFunction(name: string, args: Record<string, any>): Promise<any> {
    switch (name) {
      case "get_time":
        return this.getTime();
      case "add":
        return this.add(args.a, args.b);
      case "multiply":
        return this.multiply(args.a, args.b);
      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  // Get the current server time
  private getTime(): string {
    const now = new Date();
    return {
      iso: now.toISOString(),
      utc: now.toUTCString(),
      local: now.toString()
    };
  }

  // Add two numbers
  private add(a: number, b: number): number {
    if (typeof a !== "number" || typeof b !== "number") {
      throw new Error("Arguments must be numbers");
    }
    return a + b;
  }

  // Multiply two numbers
  private multiply(a: number, b: number): number {
    if (typeof a !== "number" || typeof b !== "number") {
      throw new Error("Arguments must be numbers");
    }
    return a * b;
  }
}
