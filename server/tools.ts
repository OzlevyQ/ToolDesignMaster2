// Implementation of the tools that can be called by Gemini
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the directory name in ESM
const __dirname = path.dirname(new URL(import.meta.url).pathname);

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
      case "analyze_excel":
        return this.analyzeExcel(args.file_path);
      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  // Get the current server time
  private getTime(): Record<string, string> {
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
  
  // Analyze Excel file using Python
  private async analyzeExcel(filePath: string): Promise<any> {
    console.log(`Analyzing Excel file: ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Get path to Python script
    const scriptPath = path.resolve(process.cwd(), 'server/analyze_excel.py');
    console.log(`Python script path: ${scriptPath}`);
    
    // Make sure script is executable
    try {
      fs.chmodSync(scriptPath, '755');
    } catch (error) {
      console.error('Error making script executable:', error);
    }
    
    return new Promise((resolve, reject) => {
      // Spawn Python process
      const python = spawn('python3', [scriptPath, filePath]);
      
      let outputData = '';
      let errorData = '';
      
      // Collect stdout data
      python.stdout.on('data', (data) => {
        outputData += data.toString();
      });
      
      // Collect stderr data
      python.stderr.on('data', (data) => {
        errorData += data.toString();
        console.error(`Python stderr: ${data}`);
      });
      
      // Handle process completion
      python.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`Python process exited with code ${code}: ${errorData}`));
        }
        
        try {
          // Parse JSON output from Python script
          const result = JSON.parse(outputData);
          resolve(result);
        } catch (error) {
          console.error('Error parsing Python output:', error);
          console.error('Raw output:', outputData);
          reject(new Error(`Failed to parse Python output: ${error instanceof Error ? error.message : String(error)}`));
        }
      });
    });
  }
}
