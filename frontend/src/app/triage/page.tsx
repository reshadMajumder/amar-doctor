"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api, getAccessToken } from "@/lib/api";
import { 
  Send, User, Bot, Loader2, ArrowLeft, 
  Info, FileText, RefreshCw, ShieldAlert, CheckCircle2 
} from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "model" | "system";
  content: string;
};

export default function TriagePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", content: "Hello! I am your AI medical assistant. I will ask you a few questions about your symptoms to help prepare a clinical report. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [reconnectTrigger, setReconnectTrigger] = useState(0);

  // Active WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Auth Guard
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      toast({
        title: "Session Expired",
        description: "Please log in to use the AI symptom checker."
      });
      router.push("/auth");
    }
  }, [router, toast]);

  // Initialize Triage Session & WebSocket Connection
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    let socket: WebSocket | null = null;
    let isMounted = true;

    async function initSession() {
      try {
        setLoading(true);
        setProcessingStatus("Initializing safe medical session...");

        // 1. Create session via REST API
        const response = await api.post("/api/v1/triage/sessions/");
        const session = response.data;
        
        if (!isMounted) return;
        setSessionId(session.id);

        // 2. Open WebSocket connection
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const wsProtocol = apiBase.startsWith("https") ? "wss:" : "ws:";
        const wsHost = apiBase.replace(/^https?:\/\//, "");
        const socketUrl = `${wsProtocol}//${wsHost}/ws/triage/${session.id}/?token=${token}`;

        socket = new WebSocket(socketUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          if (!isMounted) return;
          setConnected(true);
          setLoading(false);
          setProcessingStatus("");
        };

        socket.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const packet = JSON.parse(event.data);
            const eventName = packet.event;
            const data = packet.data;

            if (eventName === "ai.processing") {
              setLoading(true);
              setProcessingStatus(data.status || "Assistant is thinking...");
            } else if (eventName === "ai.question") {
              setLoading(false);
              setProcessingStatus("");
              setMessages(prev => [...prev, { role: "model", content: data.question }]);
            } else if (eventName === "ai.emergency") {
              setLoading(false);
              setProcessingStatus("");
              setMessages(prev => [
                ...prev, 
                { role: "system", content: `🚨 EMERGENCY ALERT: ${data.reason}` }
              ]);
              toast({
                variant: "destructive",
                title: "Emergency Alert",
                description: data.message || "Emergency symptoms identified. Seek clinical care immediately.",
              });
            } else if (eventName === "report.generated") {
              setLoading(false);
              setProcessingStatus("");
              toast({
                title: "Clinical Report Complete",
                description: "Your triage details have been generated successfully.",
              });
              // Auto route to generated report page
              setTimeout(() => {
                router.push(`/report/${data.report_id}`);
              }, 1500);
            } else if (eventName === "system.error") {
              setLoading(false);
              setProcessingStatus("");
              toast({
                variant: "destructive",
                title: "AI Analysis Alert",
                description: data.message || "An unexpected error occurred."
              });
            }
          } catch (err) {
            console.error("Error parsing WebSocket event data:", err);
          }
        };

        socket.onerror = (err) => {
          console.error("WebSocket socket error:", err);
        };

        socket.onclose = () => {
          if (!isMounted) return;
          setConnected(false);
          setLoading(false);
          setProcessingStatus("");
        };

      } catch (err: any) {
        console.error("Session initialize failed:", err);
        if (isMounted) {
          toast({
            variant: "destructive",
            title: "Connection Failed",
            description: err.message || "Could not instantiate an AI session. Please reload."
          });
          setLoading(false);
        }
      }
    }

    initSession();

    return () => {
      isMounted = false;
      if (socket) {
        socket.close();
      }
    };
  }, [reconnectTrigger, router, toast]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const messageContent = input.trim();
    setInput("");

    // Identify if first patient message or follow-up
    const userMessageCount = messages.filter(m => m.role === "user").length;

    // Append to local state
    setMessages(prev => [...prev, { role: "user", content: messageContent }]);
    setLoading(true);
    setProcessingStatus("Symptom analyzer compiling responses...");

    const eventPayload = userMessageCount === 0 
      ? {
          event: "session.start",
          data: { symptoms: messageContent }
        }
      : {
          event: "patient.answer",
          data: { message: messageContent }
        };

    wsRef.current.send(JSON.stringify(eventPayload));
  };

  const handleManualFinish = async () => {
    if (!sessionId) return;
    setFinishing(true);

    try {
      // POST detail action to force report compilation
      const response = await api.post(`/api/v1/triage/sessions/${sessionId}/finish/`);
      const data = response.data;
      
      toast({
        title: "Report Finalized",
        description: "Intake report generated successfully. Redirecting..."
      });

      router.push(`/report/${data.data.report_id}`);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to generate report",
        description: err.message || "Please complete another follow-up question first."
      });
    } finally {
      setFinishing(false);
    }
  };

  const handleReconnect = () => {
    setMessages([
      { role: "model", content: "Hello! I am your AI medical assistant. I will ask you a few questions about your symptoms to help prepare a clinical report. How can I help you today?" }
    ]);
    setReconnectTrigger(prev => prev + 1);
  };

  return (
    <div className="flex flex-col h-screen bg-[#f6f8fa]">
      <Navigation />
      
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b shadow-sm z-10 sticky top-0 md:top-16">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-base md:text-lg">AI Symptom Checker</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={cn(
                "w-2 h-2 rounded-full transition-all",
                connected ? "bg-accent animate-pulse" : "bg-red-400"
              )} />
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                {connected ? "Live Assistant Online" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>

        {connected && (
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full h-10 px-4 gap-2 text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 font-bold text-xs"
            onClick={handleManualFinish}
            disabled={messages.length < 3 || finishing || loading}
          >
            {finishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Finish & Report
          </Button>
        )}
      </header>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-24"
      >
        <div className="bg-primary/5 border border-primary/10 p-4 rounded-3xl flex items-start gap-3 max-w-4xl mx-auto shadow-sm">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              Prepare a comprehensive clinical summary report for your telemedicine doctor.
            </p>
            <p className="text-[10px] text-slate-400 font-medium">
              Note: This automated triage prepares clinical summaries to optimize matches and does not act as a diagnosis.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg, i) => {
            const isSystem = msg.role === "system";
            if (isSystem) {
              return (
                <div key={i} className="flex justify-center my-4 animate-bounce">
                  <Card className="bg-rose-50 border border-rose-200 text-rose-800 p-5 rounded-[2rem] max-w-lg flex items-start gap-3 shadow-md shadow-rose-200/10">
                    <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="text-xs font-bold uppercase tracking-wide">Emergency Warning</div>
                      <p className="text-xs leading-relaxed font-semibold text-rose-950">{msg.content.replace("🚨 EMERGENCY ALERT: ", "")}</p>
                    </div>
                  </Card>
                </div>
              );
            }

            const isUser = msg.role === "user";
            return (
              <div key={i} className={cn(
                "flex w-full",
                isUser ? "justify-end" : "justify-start"
              )}>
                <div className={cn(
                  "flex gap-3 max-w-[85%] md:max-w-[75%]",
                  isUser ? "flex-row-reverse" : "flex-row"
                )}>
                  <div className={cn(
                    "w-9 h-9 md:w-10 md:h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm",
                    isUser 
                      ? "bg-primary text-white border-primary/20" 
                      : (user?.role === "doctor" ? "bg-accent text-white border-accent/20" : "bg-white text-primary")
                  )}>
                    {isUser ? <User className="w-4 h-4 md:w-5 md:h-5" /> : <Bot className="w-4 h-4 md:w-5 md:h-5" />}
                  </div>
                  <div className={cn(
                    "p-4 rounded-[1.5rem] text-xs md:text-sm leading-relaxed shadow-sm",
                    isUser 
                      ? "bg-primary text-white rounded-tr-none" 
                      : "bg-white text-slate-800 rounded-tl-none border border-slate-100 font-medium"
                  )}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white border flex items-center justify-center shadow-sm">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div className="bg-white border border-slate-100 p-4 rounded-[1.5rem] rounded-tl-none flex items-center gap-3 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    {processingStatus || "Assistant is analyzing..."}
                  </span>
                </div>
              </div>
            </div>
          )}

          {!connected && !loading && (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <Card className="p-6 rounded-[2rem] border-dashed border-2 max-w-sm text-center bg-white shadow-sm space-y-4">
                <ShieldAlert className="w-10 h-10 text-slate-400 mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 text-sm">Triage Connection Lost</h4>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">The clinical WebSocket channel was disconnected.</p>
                </div>
                <Button 
                  size="sm" 
                  className="rounded-full px-6 font-bold text-xs gap-2"
                  onClick={handleReconnect}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reconnect Triage
                </Button>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t sticky bottom-20 md:bottom-0">
        <form onSubmit={handleSend} className="flex gap-3 max-w-4xl mx-auto">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={connected ? "Describe your symptoms here..." : "WebSocket offline. Please reconnect above."}
            className="flex-1 h-14 rounded-2xl px-6 text-sm md:text-base border-slate-200 focus-visible:ring-primary shadow-sm"
            disabled={!connected || loading}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="w-14 h-14 rounded-2xl shrink-0 shadow-lg bg-primary hover:bg-primary/90 shadow-primary/20"
            disabled={!input.trim() || !connected || loading}
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
