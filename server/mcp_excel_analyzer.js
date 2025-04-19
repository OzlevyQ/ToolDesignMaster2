#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const server = new McpServer({ name: 'ExcelAnalyzerServer', version: '1.0.0' });

  server.tool(
    'analyze_excel',
    { file_path: z.string() },
    async ({ file_path }) => {
      console.error(`Analyzing Excel file: ${file_path}`);
      
      // Validate that the file exists
      if (!fs.existsSync(file_path)) {
        return {
          content: [
            { 
              type: 'text', 
              text: `Error: File not found at path ${file_path}` 
            }
          ]
        };
      }

      // 1) מריצים את התסריט Python לניתוח
      const scriptPath = path.join(__dirname, 'analyze_excel.py');
      console.error(`Running Python script: ${scriptPath}`);
      
      // Make the script executable
      fs.chmodSync(scriptPath, '755');
      
      const py = spawn('python3', [scriptPath, file_path], { 
        stdio: ['ignore', 'pipe', 'pipe'] 
      });

      // 2) קוראים stdout של התסריט
      let output = '';
      let errorOutput = '';
      
      py.stdout.on('data', (data) => {
        output += data.toString('utf8');
      });
      
      py.stderr.on('data', (data) => {
        errorOutput += data.toString('utf8');
      });
      
      // Wait for the process to complete
      const exitCode = await new Promise((resolve) => {
        py.on('close', resolve);
      });
      
      if (exitCode !== 0) {
        console.error(`Python script failed with exit code ${exitCode}`);
        console.error(`Error output: ${errorOutput}`);
        return {
          content: [
            { 
              type: 'text', 
              text: `Error analyzing Excel file: ${errorOutput || 'Unknown error'}` 
            }
          ]
        };
      }
      
      try {
        // Parse the JSON output from Python
        const analysisResult = JSON.parse(output);
        
        // 3) Build the MCP response
        let content = [];
        
        // Add text summaries
        if (analysisResult.summaries) {
          content = content.concat(analysisResult.summaries);
        }
        
        // Add images for plots
        if (analysisResult.plots) {
          for (const [plotName, plotData] of Object.entries(analysisResult.plots)) {
            content.push({
              type: 'image',
              image_url: {
                url: `data:image/png;base64,${plotData}`
              },
              title: plotName.replace('_', ' ')
            });
          }
        }
        
        return { content };
      } catch (error) {
        console.error('Error parsing Python output:', error);
        console.error('Raw output:', output);
        return {
          content: [
            { 
              type: 'text', 
              text: `Error parsing analysis results: ${error.message}` 
            }
          ]
        };
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🔧 Excel Analyzer Server ready on STDIO: analyze_excel tool available');
}

main().catch(err => {
  console.error('Server error:', err);
  process.exit(1);
});