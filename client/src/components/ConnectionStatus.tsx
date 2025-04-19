import { ConnectionState } from "@/types";

interface ConnectionStatusProps {
  state: ConnectionState;
}

export default function ConnectionStatus({ state }: ConnectionStatusProps) {
  // Helper to get status indicator based on connection state
  const getStatusIndicator = (status: string) => {
    switch (status) {
      case "connected":
      case "ready":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <section className="bg-neutral-50 rounded-lg border border-neutral-200 p-3">
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${getStatusIndicator(state.server)}`}></div>
            <span className="text-neutral-600">
              Server: {state.server === "connected" ? "Connected" : state.server === "connecting" ? "Connecting..." : "Error"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${getStatusIndicator(state.gemini)}`}></div>
            <span className="text-neutral-600">
              Gemini API: {state.gemini === "ready" ? "Ready" : state.gemini === "connecting" ? "Connecting..." : "Error"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${state.toolsCount > 0 ? "bg-green-500" : "bg-yellow-500"}`}></div>
            <span className="text-neutral-600">
              MCP Tools: {state.toolsCount} Available
            </span>
          </div>
        </div>
        <div className="text-neutral-500 text-xs">
          <span id="latencyIndicator">
            {state.avgResponse > 0 
              ? `Avg. Response: ${state.avgResponse}ms` 
              : "Waiting for response data..."}
          </span>
        </div>
      </div>
    </section>
  );
}
