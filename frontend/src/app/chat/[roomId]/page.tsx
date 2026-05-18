"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Stethoscope, MessageSquare, Send, Calendar, 
  Activity, FileText, CheckCheck, Loader2, 
  ArrowLeft, Check, LogOut, Clock, ShieldAlert,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, getAccessToken } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Message = {
  id: number;
  sender: {
    id: number;
    name: string;
    role: string;
  };
  content: string;
  message_type: string;
  created_at: string;
};

type RoomDetails = {
  id: number;
  consultation_type: string;
  status: string;
  patient: {
    id: number;
    email: string;
    full_name: string;
  };
  doctor: {
    id: number;
    email: string;
    full_name: string;
  };
  appointment: {
    id: number;
    notes: string;
    consultation_fee: string;
    scheduled_start: string;
    ai_report_details?: {
      id: number;
      ai_summary: string;
      risk_category: string;
      extracted_symptoms: string[];
      recommended_specialization: string;
    };
  };
};

export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const roomId = params.roomId as string;

  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

  const socketRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    async function fetchRoomAndMessages() {
      try {
        setLoading(true);
        // 1. Fetch Room Details
        const roomRes = await api.get(`/api/v1/chat/rooms/${roomId}/`);
        setRoom(roomRes);

        // 2. Fetch Message History
        const messagesRes = await api.get(`/api/v1/chat/rooms/${roomId}/messages/`);
        const list = messagesRes.results || messagesRes || [];
        if (Array.isArray(list)) {
          // MessageCursorPagination returns list in reverse-chronological order, reverse it for presentation
          setMessages([...list].reverse());
        }
      } catch (err) {
        console.error("Failed to load chat data", err);
      } finally {
        setLoading(false);
      }
    }

    if (roomId) {
      fetchRoomAndMessages();
    }
  }, [roomId]);

  useEffect(() => {
    if (!room || !user) return;

    // Connect to django channels websocket
    const token = getAccessToken();
    if (!token) {
      setConnectionStatus("disconnected");
      return;
    }

    const wsScheme = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Fallback/standard host targeting port 8000
    const wsUrl = `${wsScheme}//localhost:8000/ws/chat/${roomId}/?token=${token}`;

    setConnectionStatus("connecting");
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnectionStatus("connected");
      console.log("WebSocket connected to chat room:", roomId);
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { event: eventType, data } = payload;

        if (eventType === "chat.message") {
          setMessages((prev) => [...prev, data]);
          setIsPartnerTyping(false);
          scrollToBottom();
        } else if (eventType === "typing.status") {
          if (data.user_id !== user.id) {
            setIsPartnerTyping(data.is_typing);
          }
        } else if (eventType === "consultation.started") {
          setRoom((prev) => prev ? { ...prev, status: "active" } : null);
        } else if (eventType === "consultation.completed") {
          setRoom((prev) => prev ? { ...prev, status: "ended" } : null);
        }
      } catch (e) {
        console.error("Error parsing websocket frame", e);
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
      setConnectionStatus("disconnected");
    };

    socket.onclose = () => {
      setConnectionStatus("disconnected");
      console.log("WebSocket disconnected from chat room:", roomId);
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };
  }, [room?.id, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPartnerTyping]);

  function scrollToBottom() {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function handleSend() {
    if (!inputText.trim() || !socketRef.current || connectionStatus !== "connected") return;

    // Send via socket
    socketRef.current.send(JSON.stringify({
      event: "chat.message",
      data: {
        message: inputText.trim(),
        message_type: "text"
      }
    }));

    setInputText("");
    stopTyping();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputText(e.target.value);

    if (!socketRef.current || connectionStatus !== "connected") return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socketRef.current.send(JSON.stringify({
        event: "typing.start"
      }));
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  }

  function stopTyping() {
    if (isTypingRef.current && socketRef.current && connectionStatus === "connected") {
      isTypingRef.current = false;
      socketRef.current.send(JSON.stringify({
        event: "typing.stop"
      }));
    }
  }

  async function handleCompleteSession() {
    if (!room || !confirm("Are you sure you want to end this consultation? This will release the escrow payment to your wallet.")) return;

    try {
      setActionInProgress(true);
      // Emit websocket lifecycle change
      if (socketRef.current && connectionStatus === "connected") {
        socketRef.current.send(JSON.stringify({
          event: "consultation.end"
        }));
      }

      // Transition DB record to completed
      await api.patch(`/api/v1/appointments/${room.appointment.id}/complete_session/`);
      
      alert("Consultation completed successfully! Funds have been released to your wallet.");
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Failed to complete session", err);
      alert(err.message || "Failed to complete consultation.");
    } finally {
      setActionInProgress(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Initializing Chat Session...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4 animate-bounce" />
        <h2 className="text-2xl font-black text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500 mb-6 max-w-sm">This consultation room does not exist or you do not have permission to join it.</p>
        <Link href="/dashboard">
          <Button className="rounded-xl px-6"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const isDoctor = user?.role === "doctor";
  const partnerName = isDoctor ? room.patient.full_name : room.doctor.full_name;
  const partnerRole = isDoctor ? "PATIENT" : "CLINICAL SPECIALIST";
  const aiReport = room.appointment.ai_report_details;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/20 flex flex-col font-sans">
      {/* Premium Glass Header */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-slate-900 text-base md:text-lg tracking-tight">{partnerName}</h1>
              <Badge className="text-[9px] font-black tracking-widest uppercase rounded bg-slate-100 text-slate-500 border-none px-1.5 py-0.5">{partnerRole}</Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn("w-2 h-2 rounded-full", 
                connectionStatus === "connected" ? "bg-emerald-500 animate-pulse" :
                connectionStatus === "connecting" ? "bg-amber-400" : "bg-rose-500"
              )} />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {connectionStatus === "connected" ? "REAL-TIME SECURED" : 
                 connectionStatus === "connecting" ? "ESTABLISHING SIGNAL..." : "DISCONNECTED"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Consultation Status</span>
            <span className={cn("text-xs font-extrabold capitalize mt-0.5",
              room.status === "active" ? "text-emerald-500" :
              room.status === "waiting" ? "text-amber-500 animate-pulse" : "text-slate-400"
            )}>
              {room.status === "active" ? "Ongoing Live Consultation" : 
               room.status === "waiting" ? "Awaiting Partner..." : "Completed / Closed"}
            </span>
          </div>

          {isDoctor && room.status !== "ended" && (
            <Button 
              onClick={handleCompleteSession}
              disabled={actionInProgress}
              className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl h-10 gap-1.5 shadow-md shadow-rose-500/10"
            >
              {actionInProgress ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              End Consultation
            </Button>
          )}

          {!isDoctor && room.status === "ended" && (
            <Link href="/dashboard">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl h-10 gap-1.5">
                <Check className="w-3.5 h-3.5" />
                Return to Dashboard
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        
        {/* Left Section: Active Chat Room */}
        <div className="lg:col-span-2 flex flex-col bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm h-[calc(100vh-180px)] min-h-[500px]">
          
          {/* Waiting Banner */}
          {room.status === "waiting" && (
            <div className="bg-amber-50 border-b border-amber-200/50 p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-500 shrink-0 animate-spin" />
              <p className="text-xs text-amber-800 font-semibold leading-relaxed">
                {isDoctor ? "Waiting for the patient to connect. You can write messages in the meantime to welcome them." : 
                           "Awaiting practitioner. Please hold tight, your consulting session will begin shortly."}
              </p>
            </div>
          )}

          {/* Ended Banner */}
          {room.status === "ended" && (
            <div className="bg-slate-100 border-b border-slate-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-slate-500 shrink-0" />
                <p className="text-xs text-slate-600 font-semibold">
                  This consulting room is now officially closed. Prescriptions are finalized.
                </p>
              </div>
              {!isDoctor && (
                <Link href="/prescriptions">
                  <Button variant="outline" size="sm" className="rounded-xl text-[10px] font-bold h-8 border-slate-200">
                    <FileText className="w-3.5 h-3.5 mr-1" /> View Prescription
                  </Button>
                </Link>
              )}
            </div>
          )}

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
            {messages.map((msg, idx) => {
              const isMine = msg.sender.id === user?.id;
              return (
                <div key={msg.id || idx} className={cn("flex flex-col max-w-[75%]", 
                  isMine ? "ml-auto items-end" : "mr-auto items-start"
                )}>
                  {/* Sender Name */}
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 px-1">
                    {isMine ? "You" : msg.sender.name}
                  </span>
                  
                  {/* Bubble */}
                  <div className={cn("p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm",
                    isMine ? "bg-primary text-white rounded-br-none" : "bg-slate-100 text-slate-800 rounded-bl-none"
                  )}>
                    {msg.content}
                  </div>

                  {/* Sent Date / Indicator */}
                  <span className="text-[9px] text-slate-400 mt-1 px-1 flex items-center gap-1 font-semibold">
                    {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    {isMine && <CheckCheck className="w-3 h-3 text-emerald-500" />}
                  </span>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isPartnerTyping && (
              <div className="flex flex-col items-start mr-auto max-w-[75%] animate-pulse">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 px-1">
                  {partnerName}
                </span>
                <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl rounded-bl-none text-xs flex items-center gap-2 border">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                  typing...
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Footer controls: text inputs */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 items-center">
            <input 
              type="text" 
              placeholder={room.status === "ended" ? "Consultation closed." : "Type your message here..."}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={room.status === "ended" || connectionStatus !== "connected"}
              className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-slate-100 disabled:text-slate-400"
            />
            <Button 
              onClick={handleSend}
              disabled={room.status === "ended" || !inputText.trim() || connectionStatus !== "connected"}
              className="bg-primary hover:bg-primary/95 text-white w-12 h-12 rounded-2xl shadow-md shadow-primary/10 shrink-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>

        </div>

        {/* Right Section: Clinical AI Triage Summary */}
        <div className="space-y-6">
          
          {/* AI Clinical Sidebar */}
          {aiReport ? (
            <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white relative">
              {/* Premium Gradient Header Accent */}
              <div className="h-2 bg-gradient-to-r from-accent to-emerald-400" />
              <CardContent className="p-6 md:p-8 space-y-6">
                
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Activity className="w-4.5 h-4.5 text-accent animate-pulse" />
                    AI Symptom Intake
                  </h3>
                  <Badge className={cn("text-[9px] font-black tracking-widest px-2 py-0.5 rounded",
                    aiReport.risk_category?.toLowerCase() === 'high' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                    'bg-amber-50 text-amber-600 border border-amber-100'
                  )}>
                    {aiReport.risk_category || "MEDIUM"} RISK
                  </Badge>
                </div>

                {/* AI clinical Summary Box */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clinical Summary</h4>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-[11px] leading-relaxed text-slate-600 font-medium italic relative">
                    <span className="absolute -top-3 left-3 text-3xl text-accent/25 select-none font-serif">“</span>
                    {aiReport.ai_summary || "Symptoms logged but summary details not generated."}
                  </div>
                </div>

                {/* Symptoms Pill Tags */}
                {Array.isArray(aiReport.extracted_symptoms) && aiReport.extracted_symptoms.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Extracted Symptoms</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {aiReport.extracted_symptoms.map((symptom, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg px-2.5 py-0.5 border-none">
                          {symptom}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Specialization */}
                {aiReport.recommended_specialization && (
                  <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100/80 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                      <Stethoscope className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Recommended Route</div>
                      <div className="text-[11px] font-bold text-blue-900 mt-0.5">{aiReport.recommended_specialization} Specialist</div>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
              <div className="w-16 h-16 rounded-full bg-slate-50 border flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-800 mb-1">Direct Intake consultation</h3>
              <p className="text-slate-400 text-xs max-w-[200px] leading-relaxed mb-4">The patient booked an direct booking consultation bypass pre-triage checks.</p>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 w-full text-[11px] text-slate-500 font-semibold italic">
                Notes: "{room.appointment.notes || "No patient notes provided."}"
              </div>
            </Card>
          )}

          {/* Quick Care Checklist */}
          <Card className="rounded-[2.2rem] border-none bg-slate-900 text-white p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none" />
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 text-center">Consultation Guide</h4>
            <ul className="space-y-3.5 text-xs text-slate-300 font-medium">
              <li className="flex gap-2">
                <div className="w-4.5 h-4.5 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <Check className="w-3 h-3" />
                </div>
                <span>Verify patient identity & state BMDC approval rules.</span>
              </li>
              <li className="flex gap-2">
                <div className="w-4.5 h-4.5 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <Check className="w-3 h-3" />
                </div>
                <span>Discuss logged AI triage findings directly.</span>
              </li>
              {isDoctor && (
                <li className="flex gap-3 items-center">
                  <div className="w-4.5 h-4.5 bg-accent/10 text-accent rounded-full flex items-center justify-center shrink-0 border border-accent/20">
                    <Activity className="w-3 h-3" />
                  </div>
                  <Link href={`/prescriptions/new?appt=${room.appointment.id}`} className="hover:underline text-accent">
                    Generate E-Prescription
                  </Link>
                </li>
              )}
            </ul>
          </Card>

        </div>

      </div>
    </div>
  );
}
