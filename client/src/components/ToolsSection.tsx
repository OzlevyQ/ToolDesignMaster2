import { useState } from "react";
import { Tool } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Clock, Plus, X } from "lucide-react";

interface ToolsSectionProps {
  tools: Tool[];
}

export default function ToolsSection({ tools }: ToolsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleTools = () => {
    setIsOpen(!isOpen);
  };

  // Map tool names to their respective icons
  const getToolIcon = (name: string) => {
    switch (name) {
      case "get_time":
        return <Clock className="h-4 w-4" />;
      case "add":
        return <Plus className="h-4 w-4" />;
      case "multiply":
        return <X className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-neutral-800">Available Tools</CardTitle>
          <Button 
            variant="ghost" 
            className="text-primary text-sm font-medium p-0 h-auto"
            onClick={toggleTools}
          >
            {isOpen ? (
              <>
                <ChevronUp className="mr-1 h-4 w-4" /> Hide Tools
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-4 w-4" /> Show Tools
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      {isOpen && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            {tools.map((tool) => (
              <div 
                key={tool.name}
                className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 hover:bg-neutral-100 transition cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                    {getToolIcon(tool.name)}
                  </div>
                  <h3 className="font-medium text-neutral-800">{tool.name}</h3>
                </div>
                <p className="text-xs text-neutral-600">{tool.description}</p>
                <div className="mt-2 text-xs font-mono bg-neutral-100 p-1.5 rounded border border-neutral-200 text-neutral-700">
                  {tool.name}({tool.parameters ? Object.entries(tool.parameters).map(([name, type]) => `${name}: ${type}`).join(", ") : ""})
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
