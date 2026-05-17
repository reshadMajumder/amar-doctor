"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Send, User, Bot, Loader2, ArrowLeft, Info, FileText } from "lucide-react";
import { aiSymptomTriageChat } from "@/ai/flows/ai-symptom-triage-chat";
import { generateMedicalIntakeSummary } from "@/ai/flows/ai-medical-intake-summary";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "model";
  content: string;
};

export default function TriagePage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", content: "Hello! I am your AI medical assistant. I will ask you a few questions about your symptoms. This is not a diagnosis, but it will help your doctor. How are you feeling today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const chatHistory = newMessages.map(m => ({
        role: m.role,
        content: m.content
      }));
      
      const response = await aiSymptomTriageChat({
        message: userMessage,
        chatHistory: chatHistory.slice(0, -1)
      });

      setMessages([...newMessages, { role: "model", content: response.response }]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      const summaryInput = messages.map(m => ({
        role: m.role === 'model' ? 'ai' : 'patient' as 'ai' | 'patient',
        content: m.content
      }));
      
      const summary = await generateMedicalIntakeSummary({
        chatHistory: summaryInput
      });

      // Save summary to state/localstorage and navigate
      localStorage.setItem("latest_report", JSON.stringify(summary));
      router.push("/report/latest");
    } catch (error) {
      console.error(error);
    } finally {
      setFinishing(false);
    }
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
            <h1 className="font-bold text-lg">AI Symptom Checker</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Online Assistant</span>
            </div>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-full h-10 px-4 gap-2 text-primary border-primary/20 bg-primary/5 hover:bg-primary/10"
          onClick={handleFinish}
          disabled={messages.length < 3 || finishing}
        >
          {finishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Finish & Report
        </Button>
      </header>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 pb-24"
      >
        <div className="bg-primary/5 border border-primary/10 p-4 rounded-3xl flex items-start gap-3">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 leading-relaxed">
            Please describe your symptoms clearly. Mention how long you've been feeling this way. 
            <strong> Note: </strong> This tool helps prepare a report for your doctor and does not provide diagnosis.
          </p>
        </div>

        {messages.map((msg, i) => (
          <div key={i} className={cn(
            "flex w-full",
            msg.role === "user" ? "justify-end" : "justify-start"
          )}>
            <div className={cn(
              "flex gap-3 max-w-[85%]",
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}>
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border",
                msg.role === "user" ? "bg-primary text-white" : "bg-white text-primary"
              )}>
                {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={cn(
                "p-4 rounded-[1.5rem] text-sm leading-relaxed shadow-sm",
                msg.role === "user" 
                  ? "bg-primary text-white rounded-tr-none" 
                  : "bg-white text-slate-800 rounded-tl-none border"
              )}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white border flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div className="bg-white border p-4 rounded-[1.5rem] rounded-tl-none flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs text-slate-400 font-medium italic">Assistant is typing...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t sticky bottom-20 md:bottom-0">
        <form onSubmit={handleSend} className="flex gap-3 max-w-4xl mx-auto">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your symptoms here..."
            className="flex-1 h-14 rounded-2xl px-6 text-base border-slate-200 focus-visible:ring-primary shadow-sm"
          />
          <Button 
            type="submit" 
            size="icon" 
            className="w-14 h-14 rounded-2xl shrink-0 shadow-lg"
            disabled={!input.trim() || loading}
          >
            <Send className="w-6 h-6" />
          </Button>
        </form>
      </div>
    </div>
  );
}
