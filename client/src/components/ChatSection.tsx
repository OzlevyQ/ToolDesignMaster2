import { useState, useRef, useEffect } from "react";
import { Tool, Message, MessageRole } from "@/types";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Send, Trash2, Bot, User, Cog, CheckCircle } from "lucide-react";
import { sendChatMessage } from "@/lib/api";

interface ChatSectionProps {
  tools: Tool[];
  onError: (error: string) => void;
  onLatencyUpdate: (latency: number) => void;
}

export default function ChatSection({ tools, onError, onLatencyUpdate }: ChatSectionProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content: "Welcome to SmartTools Chat! I can help you with various tasks using built-in tools. Try asking me:",
      examples: [
        "What time is it?",
        "Can you add 134 and 456?",
        "Multiply 12 by 7.5 please"
      ]
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto resize textarea based on content
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    // Add user message
    const userMessage: Message = {
      role: "user",
      content: input
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    
    setIsLoading(true);
    const startTime = Date.now();
    
    try {
      // Send message to server
      const response = await sendChatMessage(userMessage.content, tools);
      
      // Calculate response time
      const latency = Date.now() - startTime;
      onLatencyUpdate(latency);
      
      // Add responses to chat
      if (response.functionCall) {
        // Add tool call message
        setMessages(prev => [
          ...prev, 
          {
            role: "assistant",
            content: "",
            functionCall: response.functionCall
          }
        ]);
        
        // Add final response with tool result
        if (response.finalResponse) {
          setMessages(prev => [
            ...prev, 
            {
              role: "assistant",
              content: response.finalResponse,
              executionTime: latency
            }
          ]);
        }
      } else if (response.finalResponse) {
        // Just add the final response if no function call
        setMessages(prev => [
          ...prev, 
          {
            role: "assistant",
            content: response.finalResponse
          }
        ]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to get response. Please try again.";
      
      onError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "system",
        content: "Welcome to SmartTools Chat! I can help you with various tasks using built-in tools. Try asking me:",
        examples: [
          "What time is it?",
          "Can you add 134 and 456?",
          "Multiply 12 by 7.5 please"
        ]
      }
    ]);
  };

  return (
    <Card className="flex flex-col" style={{ height: "60vh", minHeight: "400px" }}>
      <CardHeader className="p-3 border-b border-neutral-200 bg-neutral-50 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <h2 className="font-medium text-neutral-800">Chat Session</h2>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={clearChat}
          className="text-neutral-500 hover:text-neutral-700 text-sm h-auto p-0"
        >
          <Trash2 className="h-4 w-4 mr-1" /> Clear Chat
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => {
          if (message.role === "system") {
            return (
              <div key={index} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-neutral-100 rounded-lg p-3 max-w-[80%]">
                  <p className="text-neutral-800">{message.content}</p>
                  {message.examples && (
                    <ul className="mt-2 text-sm text-neutral-600 list-disc list-inside space-y-1">
                      {message.examples.map((example, idx) => (
                        <li key={idx}>{example}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          } else if (message.role === "user") {
            return (
              <div key={index} className="flex items-start gap-3 justify-end">
                <div className="bg-primary/10 text-primary-foreground rounded-lg p-3 max-w-[80%]">
                  <p className="text-neutral-800">{message.content}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-neutral-300 text-neutral-600 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
              </div>
            );
          } else if (message.role === "assistant") {
            // Function call message
            if (message.functionCall) {
              return (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-neutral-100 rounded-lg p-3 max-w-[80%]">
                    <div className="mb-2 text-xs font-medium text-neutral-500 flex items-center gap-1">
                      <Cog className="h-3 w-3 animate-spin" />
                      Calling <span className="font-mono bg-neutral-200 px-1 py-0.5 rounded">{message.functionCall.name}()</span>
                    </div>
                    <div className="font-mono text-xs bg-neutral-200 p-2 rounded border border-neutral-300 text-neutral-700">
                      {JSON.stringify(message.functionCall)}
                    </div>
                  </div>
                </div>
              );
            }
            
            // Regular response or response after tool execution
            return (
              <div key={index} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-neutral-100 rounded-lg p-3 max-w-[80%]">
                  <p className="text-neutral-800 whitespace-pre-line">{message.content}</p>
                  {message.executionTime && (
                    <div className="mt-2 text-xs font-medium text-neutral-500 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Tool execution completed in {message.executionTime}ms
                    </div>
                  )}
                </div>
              </div>
            );
          }
          
          return null;
        })}
        
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-neutral-100 rounded-lg p-3 max-w-[80%]">
              <div className="flex items-center gap-2">
                <Cog className="h-4 w-4 animate-spin" />
                <p className="text-neutral-600">Thinking...</p>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </CardContent>
      
      <CardFooter className="border-t border-neutral-200 p-3 bg-neutral-50">
        <form onSubmit={handleSubmit} className="flex gap-2 w-full">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 resize-none border border-neutral-300 focus:ring-2 focus:ring-primary focus:border-primary"
            style={{ minHeight: "60px" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="flex flex-col justify-end">
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="bg-primary hover:bg-primary/90 text-white rounded-lg px-4 py-3 font-medium transition"
            >
              {isLoading ? (
                <>
                  <span>Sending</span>
                  <Cog className="ml-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                <>
                  <span>Send</span>
                  <Send className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </CardFooter>
    </Card>
  );
}
