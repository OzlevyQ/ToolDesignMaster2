import { useState, useEffect } from "react";
import ToolsSection from "@/components/ToolsSection";
import ChatSection from "@/components/ChatSection";
import ConnectionStatus from "@/components/ConnectionStatus";
import ErrorPopup from "@/components/ErrorPopup";
import { FileUpload } from "@/components/FileUpload";
import { ConnectionState, Tool, FileInfo } from "@/types";
import { fetchTools } from "@/lib/api";

export default function Home() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    server: "connecting",
    gemini: "connecting",
    toolsCount: 0,
    avgResponse: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);

  useEffect(() => {
    // Fetch tools on component mount
    const loadTools = async () => {
      try {
        const toolsData = await fetchTools();
        setTools(toolsData);
        setConnectionState(prevState => ({
          ...prevState,
          server: "connected",
          gemini: "ready",
          toolsCount: toolsData.length
        }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load tools");
        setConnectionState(prevState => ({
          ...prevState,
          server: "error"
        }));
      }
    };

    loadTools();
  }, []);

  const dismissError = () => setError(null);

  const updateAvgResponse = (latency: number) => {
    setConnectionState(prevState => ({
      ...prevState,
      avgResponse: prevState.avgResponse === 0 
        ? latency 
        : Math.round((prevState.avgResponse + latency) / 2)
    }));
  };

  return (
    <div className="bg-neutral-100 min-h-screen">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between py-4 border-b border-neutral-200">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-primary-foreground p-2 rounded-lg">
                <i className="fas fa-robot text-xl"></i>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-800">SmartTools Chat</h1>
                <p className="text-sm text-neutral-500">Powered by Google Gemini with Function Calling</p>
              </div>
            </div>
            <div>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                <i className="fas fa-circle text-xs text-green-500 mr-1"></i> Online
              </span>
            </div>
          </div>
        </header>

        <main className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-4/12 space-y-6">
            <ToolsSection tools={tools} />
            <div className="bg-white rounded-lg shadow p-4">
              <FileUpload onSelect={setSelectedFile} />
              {selectedFile && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="font-medium">קובץ נבחר:</h4>
                  <p className="text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    נסה לשאול: "אנלז את קובץ ה-Excel הזה: {selectedFile.fullPath}"
                  </p>
                </div>
              )}
            </div>
            <ConnectionStatus state={connectionState} />
          </div>
          <div className="w-full md:w-8/12">
            <ChatSection tools={tools} onError={setError} onLatencyUpdate={updateAvgResponse} />
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-neutral-500 py-4 border-t border-neutral-200">
          <p>SmartTools Chat - Powered by Model Context Protocol (MCP) and Google Gemini</p>
          <div className="flex justify-center mt-2 gap-3">
            <a href="https://modelcontextprotocol.org/docs" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition">Documentation</a>
            <span className="text-neutral-300">|</span>
            <a href="https://github.com/your-repo/smarttools-chat" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition">GitHub</a>
            <span className="text-neutral-300">|</span>
            <a href="https://github.com/your-repo/smarttools-chat/issues" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition">Report Issue</a>
          </div>
        </footer>
      </div>

      {error && <ErrorPopup message={error} onDismiss={dismissError} />}
    </div>
  );
}
