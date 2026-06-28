"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Stethoscope, MessageSquare, Send, Calendar, 
  Activity, FileText, CheckCheck, Loader2, 
  ArrowLeft, Check, LogOut, Clock, ShieldAlert,
  AlertCircle, PlusCircle, Image, Smile, Mic,
  Phone, Video, Info, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

type MedicineItem = {
  id: number;
  medicine_name: string;
  generic_name?: string;
  dosage: string;
  frequency: string;
  duration: string;
  instruction?: string;
};

type Prescription = {
  id: number;
  appointment_id: number;
  patient: number;
  doctor: number;
  diagnosis_notes: string;
  advice_notes: string;
  follow_up_instructions: string;
  status: 'draft' | 'finalized';
  items: MedicineItem[];
  issued_at?: string;
  finalized_at?: string;
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
    has_prescription?: boolean;
    prescription_id?: number | null;
    no_prescription_required?: boolean;
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
  const isDoctor = user?.role === "doctor";
  const roomId = params.roomId as string;

  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // WebRTC Video Call State
  const [callState, setCallState] = useState<"idle" | "calling" | "incoming" | "connected">("idle");
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  // Prescription and Session integration states
  const [activeTab, setActiveTab] = useState<"intake" | "prescription">("intake");
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  const [savingPrescriptionNotes, setSavingPrescriptionNotes] = useState(false);
  const [addingMedicineItem, setAddingMedicineItem] = useState(false);

  // Form states for medicine addition
  const [medName, setMedName] = useState("");
  const [medGeneric, setMedGeneric] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFrequency, setMedFrequency] = useState("1+0+1");
  const [medDuration, setMedDuration] = useState("7 days");
  const [medInstruction, setMedInstruction] = useState("after meals");

  // Form states for prescription notes
  const [diagnosisNotes, setDiagnosisNotes] = useState("");
  const [adviceNotes, setAdviceNotes] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const offerRef = useRef<any>(null);

  const pcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" }
    ]
  };

  const sendCallSignal = (signal: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        event: "call.signal",
        data: { signal }
      }));
    }
  };

  const cleanupCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    offerRef.current = null;
    pendingIceCandidatesRef.current = [];
    setCallState("idle");
    setIsAudioMuted(false);
    setIsVideoMuted(false);
  };

  const startCall = async () => {
    if (room?.status === "ended") return;
    setCallState("calling");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(pcConfig);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendCallSignal({ type: "candidate", candidate: event.candidate });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendCallSignal({ type: "offer", sdp: offer });
    } catch (err) {
      console.error("Failed to start call:", err);
      cleanupCall();
    }
  };

  const acceptCall = async () => {
    if (!offerRef.current) return;
    setCallState("connected");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(pcConfig);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendCallSignal({ type: "candidate", candidate: event.candidate });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offerRef.current));
      while (pendingIceCandidatesRef.current.length > 0) {
        const candidate = pendingIceCandidatesRef.current.shift();
        if (candidate) {
          await pc.addIceCandidate(candidate);
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendCallSignal({ type: "answer", sdp: answer });
    } catch (err) {
      console.error("Failed to accept call:", err);
      cleanupCall();
    }
  };

  const declineCall = () => {
    sendCallSignal({ type: "reject" });
    cleanupCall();
  };

  const endCall = () => {
    sendCallSignal({ type: "hangup" });
    cleanupCall();
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

  const handleIncomingCallSignal = async (signal: any) => {
    if (!signal) return;
    if (signal.type === "offer") {
      setCallState("incoming");
      offerRef.current = signal.sdp;
    } else if (signal.type === "answer") {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        setCallState("connected");
        while (pendingIceCandidatesRef.current.length > 0) {
          const candidate = pendingIceCandidatesRef.current.shift();
          if (candidate) {
            await peerConnectionRef.current.addIceCandidate(candidate);
          }
        }
      }
    } else if (signal.type === "candidate") {
      const candidate = new RTCIceCandidate(signal.candidate);
      if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
        await peerConnectionRef.current.addIceCandidate(candidate);
      } else {
        pendingIceCandidatesRef.current.push(candidate);
      }
    } else if (signal.type === "reject" || signal.type === "hangup") {
      cleanupCall();
    }
  };

  useEffect(() => {
    async function fetchRoomAndMessages() {
      try {
        setLoading(true);
        // 1. Fetch Room Details
        const roomRes = await api.get(`/api/v1/chat/rooms/${roomId}/`);
        setRoom(roomRes);

        // Fetch prescription if already exists
        if (roomRes.appointment?.prescription_id) {
          try {
            const presRes = await api.get(`/api/v1/prescriptions/${roomRes.appointment.prescription_id}/`);
            setPrescription(presRes);
            setDiagnosisNotes(presRes.diagnosis_notes || "");
            setAdviceNotes(presRes.advice_notes || "");
            setFollowUpNotes(presRes.follow_up_instructions || "");
          } catch (presErr) {
            console.error("Failed to load initial prescription", presErr);
          }
        }

        // 2. Fetch Message History
        const messagesRes = await api.get(`/api/v1/chat/rooms/${roomId}/messages/`);
        const list = messagesRes.results || messagesRes || [];
        if (Array.isArray(list)) {
          const normalized = list.map((msg: any) => {
            if (typeof msg.sender === "number" || typeof msg.sender === "string") {
              return {
                ...msg,
                sender: {
                  id: Number(msg.sender),
                  name: msg.sender_name || "User",
                  role: ""
                }
              };
            }
            return msg;
          });
          // MessageCursorPagination returns list in reverse-chronological order, reverse it for presentation
          setMessages([...normalized].reverse());
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

  async function initializePrescription() {
    if (!room || user?.role !== "doctor" || prescriptionLoading) return;
    
    try {
      setPrescriptionLoading(true);
      const presRes = await api.post("/api/v1/prescriptions/", {
        appointment_id: room.appointment.id
      });
      setPrescription(presRes);
      setDiagnosisNotes(presRes.diagnosis_notes || "");
      setAdviceNotes(presRes.advice_notes || "");
      setFollowUpNotes(presRes.follow_up_instructions || "");
      
      // Update room state to sync prescription_id
      setRoom(prev => {
        if (!prev) return null;
        return {
          ...prev,
          appointment: {
            ...prev.appointment,
            has_prescription: true,
            prescription_id: presRes.id
          }
        };
      });
    } catch (err) {
      console.error("Failed to initialize draft prescription", err);
      alert("Failed to initialize draft prescription.");
    } finally {
      setPrescriptionLoading(false);
    }
  }

  const handleTabChange = (tab: "intake" | "prescription") => {
    setActiveTab(tab);
    if (tab === "prescription" && !prescription && isDoctor && room?.status !== "ended") {
      initializePrescription();
    }
  };

  async function handleAddMedicine() {
    const prescriptionId = room?.appointment?.prescription_id || prescription?.id;
    if (!medName.trim() || !prescriptionId) return;

    try {
      setAddingMedicineItem(true);
      const payload = {
        medicine_name: medName.trim(),
        generic_name: medGeneric.trim(),
        dosage: medDosage.trim() || "500mg",
        frequency: medFrequency,
        duration: medDuration.trim(),
        instruction: medInstruction,
        quantity: 1
      };

      const res = await api.post(`/api/v1/prescriptions/${prescriptionId}/items/`, payload);
      setPrescription((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: [...(prev.items || []), res]
        };
      });

      setMedName("");
      setMedGeneric("");
      setMedDosage("");
    } catch (err) {
      console.error("Failed to add medicine item", err);
      alert("Failed to add medicine item.");
    } finally {
      setAddingMedicineItem(false);
    }
  }

  async function handleSaveNotes() {
    const prescriptionId = room?.appointment?.prescription_id || prescription?.id;
    if (!prescriptionId) return;

    try {
      setSavingPrescriptionNotes(true);
      const res = await api.patch(`/api/v1/prescriptions/${prescriptionId}/`, {
        diagnosis_notes: diagnosisNotes.trim(),
        advice_notes: adviceNotes.trim(),
        follow_up_instructions: followUpNotes.trim()
      });
      setPrescription((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          diagnosis_notes: res.diagnosis_notes,
          advice_notes: res.advice_notes,
          follow_up_instructions: res.follow_up_instructions
        };
      });
      alert("Clinical notes saved successfully.");
    } catch (err) {
      console.error("Failed to save prescription notes", err);
      alert("Failed to save prescription notes.");
    } finally {
      setSavingPrescriptionNotes(false);
    }
  }

  async function handleFinalizePrescription() {
    const prescriptionId = room?.appointment?.prescription_id || prescription?.id;
    if (!prescriptionId || !room) return;

    try {
      setActionInProgress(true);
      // 1. Save all notes first
      await api.patch(`/api/v1/prescriptions/${prescriptionId}/`, {
        diagnosis_notes: diagnosisNotes.trim(),
        advice_notes: adviceNotes.trim(),
        follow_up_instructions: followUpNotes.trim()
      });

      // 2. Call Finalize endpoint to lock prescription & release Escrow
      const res = await api.post(`/api/v1/prescriptions/${prescriptionId}/finalize/`);
      setPrescription(res);
      
      // Update room state
      setRoom(prev => {
        if (!prev) return null;
        return {
          ...prev,
          status: "ended",
          appointment: {
            ...prev.appointment,
            has_prescription: true
          }
        };
      });

      // 3. Emit websocket lifecycle change
      if (socketRef.current && connectionStatus === "connected") {
        socketRef.current.send(JSON.stringify({
          event: "consultation.end"
        }));
      }

      // 4. Transition DB record to completed
      await api.patch(`/api/v1/appointments/${room.appointment.id}/complete_session/`);

      alert("E-Prescription finalized and consultation completed successfully!");
      setIsEndSessionDialogOpen(false);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Failed to finalize prescription", err);
      alert(err.raw?.error || err.message || "Failed to finalize prescription.");
    } finally {
      setActionInProgress(false);
    }
  }

  async function handleDownloadPDF() {
    const prescriptionId = room?.appointment?.prescription_id || prescription?.id;
    if (!prescriptionId) return;

    try {
      const token = getAccessToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
      const cleanBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
      const res = await fetch(`${cleanBase || window.location.origin}/api/v1/prescriptions/${prescriptionId}/pdf/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error("Could not download PDF");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Prescription_${prescriptionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download PDF", err);
      alert("Failed to download prescription PDF. Ensure it has been finalized.");
    }
  }

  // Poll prescription details if we have a prescriptionId and session is active
  useEffect(() => {
    const prescriptionId = room?.appointment?.prescription_id || prescription?.id;
    if (!prescriptionId || room?.status === "ended") return;

    const interval = setInterval(async () => {
      try {
        const presRes = await api.get(`/api/v1/prescriptions/${prescriptionId}/`);
        setPrescription(presRes);
        // Only update local notes input state if user is not actively editing
        if (user?.role !== "doctor") {
          setDiagnosisNotes(presRes.diagnosis_notes || "");
          setAdviceNotes(presRes.advice_notes || "");
          setFollowUpNotes(presRes.follow_up_instructions || "");
        }
      } catch (err) {
        console.error("Error polling prescription:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [room?.appointment?.prescription_id, prescription?.id, room?.status, user?.role]);

  useEffect(() => {
    if (!room || !user) return;

    // Connect to django channels websocket
    const token = getAccessToken();
    if (!token) {
      setConnectionStatus("disconnected");
      return;
    }

    // Derive WS URL from NEXT_PUBLIC_API_URL if present, otherwise fallback dynamically
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
    let wsScheme = window.location.protocol === "https:" ? "wss:" : "ws:";
    let wsHost = window.location.host;

    if (apiBase.startsWith("http://") || apiBase.startsWith("https://")) {
      const url = new URL(apiBase);
      wsHost = url.host;
      wsScheme = url.protocol === "https:" ? "wss:" : "ws:";
    } else {
      // Fallback support for direct Next.js development server on port 9002
      if (wsHost === "localhost:9002" || wsHost === "127.0.0.1:9002") {
        wsHost = "localhost:8000";
      }
    }
    const wsUrl = `${wsScheme}//${wsHost}/ws/chat/${roomId}/?token=${token}`;


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
          const msg = data;
          const normalized = (typeof msg.sender === "number" || typeof msg.sender === "string") ? {
            ...msg,
            sender: {
              id: Number(msg.sender),
              name: msg.sender_name || "User",
              role: ""
            }
          } : msg;
          setMessages((prev) => [...prev, normalized]);
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
        } else if (eventType === "call.signal") {
          handleIncomingCallSignal(data.signal);
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
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
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

  const [isEndSessionDialogOpen, setIsEndSessionDialogOpen] = useState(false);
  const [noPrescriptionToggle, setNoPrescriptionToggle] = useState(false);

  const handleOpenEndSessionDialog = () => {
    if (!room) return;
    setNoPrescriptionToggle(!!room.appointment.no_prescription_required);
    setIsEndSessionDialogOpen(true);
  };

  async function confirmCompleteSession() {
    if (!room) return;

    try {
      setActionInProgress(true);

      // 1. If noPrescriptionToggle differs from backend, save it first
      if (noPrescriptionToggle !== room.appointment.no_prescription_required) {
        await api.patch(`/api/v1/appointments/${room.appointment.id}/`, {
          no_prescription_required: noPrescriptionToggle
        });
        
        // Optimistically update local room details in state so they are in sync
        setRoom(prev => {
          if (!prev) return null;
          return {
            ...prev,
            appointment: {
              ...prev.appointment,
              no_prescription_required: noPrescriptionToggle
            }
          };
        });
      }

      // 2. Emit websocket lifecycle change
      if (socketRef.current && connectionStatus === "connected") {
        socketRef.current.send(JSON.stringify({
          event: "consultation.end"
        }));
      }

      // 3. Transition DB record to completed
      await api.patch(`/api/v1/appointments/${room.appointment.id}/complete_session/`);
      
      alert("Consultation completed successfully! Funds have been released to your wallet.");
      setIsEndSessionDialogOpen(false);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Failed to complete session", err);
      alert(err.raw?.error || err.message || "Failed to complete consultation.");
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

  const partnerName = isDoctor ? room.patient.full_name : room.doctor.full_name;
  const partnerRole = isDoctor ? "PATIENT" : "CLINICAL SPECIALIST";
  const partnerInitials = partnerName
    ? partnerName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : "U";
  const aiReport = room.appointment.ai_report_details;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/20 flex flex-col font-sans">
      {/* Premium Glass Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100/80 w-9 h-9">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            {/* Dynamic visual avatar in header */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-sm text-white select-none shadow-sm shadow-blue-500/10 shrink-0">
              {partnerInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight max-w-[100px] sm:max-w-[180px] md:max-w-none truncate">{partnerName}</h1>
                <Badge className="text-[9px] font-black tracking-widest uppercase rounded bg-blue-50 text-blue-600 border-none px-1.5 py-0.5">{partnerRole}</Badge>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn("w-2 h-2 rounded-full", 
                  connectionStatus === "connected" ? "bg-emerald-500 animate-pulse" :
                  connectionStatus === "connecting" ? "bg-amber-400" : "bg-rose-500"
                )} />
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  {connectionStatus === "connected" ? "Active Now" : 
                   connectionStatus === "connecting" ? "Connecting..." : "Offline"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Aesthetic Call Icons for Premium Telemedicine UI */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 mr-0.5 sm:mr-3 md:border-r md:border-slate-100 md:pr-3">
            <Button variant="ghost" size="icon" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full text-blue-500 hover:text-blue-600 hover:bg-blue-50/50">
              <Phone className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={startCall}
              disabled={room.status === "ended" || connectionStatus !== "connected" || callState !== "idle"}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full text-blue-500 hover:text-blue-600 hover:bg-blue-50/50 disabled:opacity-50"
            >
              <Video className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowSidebarMobile(true)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full text-blue-500 hover:text-blue-600 hover:bg-blue-50/50"
            >
              <Info className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </Button>
          </div>

          {/* Status Indicator */}
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Consultation Status</span>
            <span className={cn("text-xs font-extrabold capitalize mt-0.5",
              room.status === "active" ? "text-emerald-500" :
              room.status === "waiting" ? "text-amber-500 animate-pulse" : "text-slate-400"
            )}>
              {room.status === "active" ? "Ongoing Live" : 
               room.status === "waiting" ? "Awaiting Partner..." : "Completed"}
            </span>
          </div>

          {isDoctor && room.status !== "ended" && (
            <Button 
              onClick={handleOpenEndSessionDialog}
              disabled={actionInProgress}
              className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl h-10 px-3 md:px-4 gap-1.5 shadow-md shadow-rose-500/10"
            >
              {actionInProgress ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span className="hidden md:inline">End Consultation</span>
            </Button>
          )}

          {!isDoctor && room.status === "ended" && (
            <Link href="/dashboard">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl h-10 px-3 md:px-4 gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Return to Dashboard</span>
                <span className="md:hidden">Done</span>
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-0 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        
        {/* Left Section: Active Chat Room */}
        <div className="lg:col-span-2 flex flex-col bg-white border-0 md:border md:border-slate-200/60 rounded-none md:rounded-[2rem] overflow-hidden shadow-none md:shadow-sm h-[calc(100dvh-70px)] md:h-[calc(100vh-160px)] min-h-[450px]">
          
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
              if (isMine) {
                return (
                  <div key={msg.id || idx} className="flex flex-col items-end max-w-[80%] ml-auto group">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-[20px] rounded-tr-[4px] text-[14px] leading-relaxed shadow-sm transition-all duration-200">
                      {msg.content}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 px-1 flex items-center gap-1 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      <CheckCheck className="w-3 h-3 text-blue-500" />
                    </span>
                  </div>
                );
              } else {
                return (
                  <div key={msg.id || idx} className="flex items-end gap-2.5 max-w-[80%] mr-auto group">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 flex items-center justify-center font-black text-[10px] text-blue-700 shrink-0 select-none shadow-sm border border-blue-50">
                      {partnerInitials}
                    </div>
                    <div className="flex flex-col items-start">
                      <div className="bg-slate-100 text-slate-800 px-4 py-2.5 rounded-[20px] rounded-tl-[4px] text-[14px] leading-relaxed shadow-sm hover:bg-slate-200/80 transition-colors">
                        {msg.content}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1 px-1 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                );
              }
            })}

            {/* Typing Indicator */}
            {isPartnerTyping && (
              <div className="flex items-end gap-2.5 mr-auto max-w-[80%]">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 flex items-center justify-center font-black text-[10px] text-blue-700 shrink-0 select-none shadow-sm border border-blue-50">
                  {partnerInitials}
                </div>
                <div className="flex flex-col items-start">
                  <div className="px-4 py-2.5 bg-slate-100 text-slate-500 rounded-[20px] rounded-tl-[4px] text-xs flex items-center gap-1.5 border border-slate-200/30">
                    <span className="flex gap-1 items-center py-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Footer controls: Messenger style */}
          <div className="p-3 bg-white border-t border-slate-100 flex gap-2 items-center">
            <div className="flex items-center gap-1 text-blue-500 shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                disabled={room.status === "ended"} 
                className="w-9 h-9 rounded-full text-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <PlusCircle className="w-5.5 h-5.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                disabled={room.status === "ended"} 
                className="w-9 h-9 rounded-full text-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Image className="w-5.5 h-5.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                disabled={room.status === "ended"} 
                className="w-9 h-9 rounded-full text-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Mic className="w-5.5 h-5.5" />
              </Button>
            </div>

            <div className="flex-1 relative flex items-center">
              <input 
                type="text" 
                placeholder={room.status === "ended" ? "Consultation closed" : "Aa"}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={room.status === "ended" || connectionStatus !== "connected"}
                className="w-full bg-slate-100 border-none rounded-full pl-4 pr-11 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-slate-50 transition-all disabled:bg-slate-100/50 disabled:text-slate-400 text-slate-800"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                disabled={room.status === "ended"} 
                className="absolute right-1.5 w-8 h-8 rounded-full text-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Smile className="w-5 h-5" />
              </Button>
            </div>

            <Button 
              onClick={handleSend}
              disabled={room.status === "ended" || !inputText.trim() || connectionStatus !== "connected"}
              className={cn(
                "w-9 h-9 rounded-full shrink-0 flex items-center justify-center transition-all shadow-sm",
                inputText.trim() && connectionStatus === "connected"
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10 scale-105" 
                  : "bg-slate-100 text-slate-400 hover:bg-slate-200 border-none shadow-none cursor-not-allowed"
              )}
            >
              <Send className="w-4 h-4 ml-0.5" />
            </Button>
          </div>

        </div>

        {/* Right Section: Tabbed Clinical Intake / E-Prescription */}
        <div className="hidden lg:block space-y-6">
          
          {/* Elegant Pill Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100/80 backdrop-blur rounded-2xl border border-slate-200/40">
            <button 
              onClick={() => handleTabChange("intake")}
              className={cn(
                "py-2.5 text-xs font-black tracking-wide rounded-xl transition-all duration-200",
                activeTab === "intake" 
                  ? "bg-white text-blue-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
              )}
            >
              Intake Summary
            </button>
            <button 
              onClick={() => handleTabChange("prescription")}
              className={cn(
                "py-2.5 text-xs font-black tracking-wide rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5",
                activeTab === "prescription" 
                  ? "bg-white text-blue-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              E-Prescription
              {(room?.appointment?.has_prescription || prescription) && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </button>
          </div>

          {activeTab === "intake" ? (
            <>
              {/* AI Clinical Sidebar */}
              {aiReport ? (
                <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white relative">
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

                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clinical Summary</h4>
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-[11px] leading-relaxed text-slate-600 font-medium italic relative">
                        <span className="absolute -top-3 left-3 text-3xl text-accent/25 select-none font-serif">“</span>
                        {aiReport.ai_summary || "Symptoms logged but summary details not generated."}
                      </div>
                    </div>

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
                </ul>
              </Card>
            </>
          ) : (
            /* E-Prescription Panel */
            <div className="space-y-6">
              {prescriptionLoading ? (
                <Card className="p-8 text-center rounded-[2rem] border-none bg-white shadow-sm flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Accessing Prescription Draft...</p>
                </Card>
              ) : !prescription ? (
                <Card className="p-8 text-center rounded-[2rem] border-none bg-white shadow-sm flex flex-col items-center justify-center min-h-[250px]">
                  <div className="w-12 h-12 rounded-full bg-slate-50 border flex items-center justify-center text-slate-400 mb-3">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-black text-slate-800 mb-1">No Prescription Drafted</h4>
                  <p className="text-slate-400 text-[10px] leading-relaxed max-w-[200px] mx-auto">
                    {isDoctor
                      ? "Initializing the draft prescription..."
                      : "The doctor has not started drafting a prescription yet."}
                  </p>
                </Card>
              ) : (
                /* Active Prescription Workspace */
                <div className="space-y-6">
                  {/* Status & Control Console */}
                  <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden relative">
                    <div className={cn(
                      "h-1.5 absolute top-0 left-0 right-0",
                      prescription.status === "finalized" ? "bg-emerald-500" : "bg-amber-400"
                    )} />
                    <CardContent className="p-6 space-y-4">
                      <div className="flex justify-between items-center pt-1">
                        <div>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Prescription Status</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={cn(
                              "w-2 h-2 rounded-full",
                              prescription.status === "finalized" ? "bg-emerald-500" : "bg-amber-400 animate-pulse"
                            )} />
                            <span className="text-xs font-extrabold capitalize text-slate-700">
                              {prescription.status}
                            </span>
                          </div>
                        </div>
                        {prescription.status === "finalized" && (
                          <Button 
                            onClick={handleDownloadPDF} 
                            size="sm"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] h-8 rounded-lg gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download PDF
                          </Button>
                        )}
                      </div>

                      {/* Doctor End Session Controls embedded directly inside the tab */}
                      {isDoctor && room.status !== "ended" && (
                        <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                          <Button
                            onClick={handleFinalizePrescription}
                            disabled={actionInProgress || prescription.items.length === 0}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl h-11 shadow-sm gap-1.5 disabled:opacity-50"
                          >
                            {actionInProgress ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            Finalize Rx & End Consultation
                          </Button>
                          {prescription.items.length === 0 && (
                            <p className="text-[9px] text-center text-slate-400 font-semibold italic">
                              Add at least 1 medicine to finalize, or use the header button if no prescription is needed.
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Medications list */}
                  <Card className="rounded-[2rem] border-none shadow-sm bg-white p-6 space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-blue-500" /> Medications (Rx)
                    </h3>
                    
                    <div className="space-y-2">
                      {prescription.items && prescription.items.map((med, idx) => (
                        <div key={med.id || idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="text-xs font-black text-slate-800">{med.medicine_name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 leading-normal font-semibold">
                            {med.dosage} • {med.frequency} • {med.duration} • {med.instruction}
                          </div>
                          {med.generic_name && (
                            <div className="text-[9px] text-slate-400 italic mt-0.5">({med.generic_name})</div>
                          )}
                        </div>
                      ))}
                      {(!prescription.items || prescription.items.length === 0) && (
                        <div className="text-center py-6 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-50 rounded-xl border border-dashed">
                          No medications added yet
                        </div>
                      )}
                    </div>

                    {/* Inline Form to add medicine (Doctor Only and Draft Only) */}
                    {isDoctor && prescription.status === "draft" && (
                      <div className="pt-4 border-t border-slate-100 space-y-3.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Add Medication</span>
                        
                        <div className="space-y-2">
                          <input 
                            type="text" 
                            placeholder="Medicine Name (e.g. Napa Extra)" 
                            value={medName}
                            onChange={(e) => setMedName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white text-slate-800"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input 
                              type="text" 
                              placeholder="Generic Name" 
                              value={medGeneric}
                              onChange={(e) => setMedGeneric(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white text-slate-800"
                            />
                            <input 
                              type="text" 
                              placeholder="Dosage (e.g. 500mg)" 
                              value={medDosage}
                              onChange={(e) => setMedDosage(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white text-slate-800"
                            />
                          </div>
                          
                          <div className="grid grid-cols-3 gap-1.5">
                            <select 
                              value={medFrequency}
                              onChange={(e) => setMedFrequency(e.target.value)}
                              className="bg-slate-50 border border-slate-200/60 rounded-xl px-2 py-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary text-slate-700"
                            >
                              <option value="1+0+1">1+0+1 (Twice)</option>
                              <option value="1+1+1">1+1+1 (Thrice)</option>
                              <option value="1+0+0">1+0+0 (Morning)</option>
                              <option value="0+0+1">0+0+1 (Bedtime)</option>
                              <option value="as needed">As needed (PRN)</option>
                            </select>
                            <input 
                              type="text" 
                              placeholder="7 days" 
                              value={medDuration}
                              onChange={(e) => setMedDuration(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-2 py-2 text-[10px] text-center focus:outline-none focus:ring-1 focus:ring-primary text-slate-800"
                            />
                            <select 
                              value={medInstruction}
                              onChange={(e) => setMedInstruction(e.target.value)}
                              className="bg-slate-50 border border-slate-200/60 rounded-xl px-1.5 py-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary text-slate-700"
                            >
                              <option value="after meals">After Meals</option>
                              <option value="before meals">Before Meals</option>
                              <option value="empty stomach">Empty Stomach</option>
                            </select>
                          </div>
                        </div>

                        <Button 
                          onClick={handleAddMedicine}
                          disabled={addingMedicineItem || !medName.trim()}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 rounded-xl text-xs gap-1 shadow-sm disabled:opacity-50"
                        >
                          {addingMedicineItem ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <PlusCircle className="w-3.5 h-3.5" />
                          )}
                          Add Medicine
                        </Button>
                      </div>
                    )}
                  </Card>

                  {/* Directives Section */}
                  <Card className="rounded-[2rem] border-none shadow-sm bg-white p-6 space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-accent" /> Clinical Directives
                    </h3>
                    
                    {isDoctor && prescription.status === "draft" ? (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Diagnosis / Clinical Findings</label>
                          <textarea 
                            rows={3} 
                            placeholder="Enter diagnosis notes..."
                            value={diagnosisNotes}
                            onChange={(e) => setDiagnosisNotes(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white text-slate-800 leading-relaxed"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Dietary / General Advice</label>
                          <textarea 
                            rows={3} 
                            placeholder="Enter advices..."
                            value={adviceNotes}
                            onChange={(e) => setAdviceNotes(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white text-slate-800 leading-relaxed"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Follow Up / Emergency</label>
                          <textarea 
                            rows={2} 
                            placeholder="Follow up instructions..."
                            value={followUpNotes}
                            onChange={(e) => setFollowUpNotes(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white text-slate-800 leading-relaxed"
                          />
                        </div>

                        <Button 
                          onClick={handleSaveNotes}
                          disabled={savingPrescriptionNotes}
                          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold h-9 rounded-xl text-xs gap-1.5 shadow-sm"
                        >
                          {savingPrescriptionNotes ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          Save Directives Draft
                        </Button>
                      </div>
                    ) : (
                      /* Read-Only Directives view for patients or completed sessions */
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Diagnosis / Clinical Findings</div>
                          <div className="p-3 bg-slate-50 border rounded-xl text-xs text-slate-600 font-semibold italic min-h-[40px]">
                            {prescription.diagnosis_notes || "No diagnosis logged."}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Dietary / General Advice</div>
                          <div className="p-3 bg-slate-50 border rounded-xl text-xs text-slate-600 font-semibold italic min-h-[40px]">
                            {prescription.advice_notes || "No dietary advices logged."}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Follow Up / Emergency</div>
                          <div className="p-3 bg-slate-50 border rounded-xl text-xs text-slate-600 font-semibold italic min-h-[30px]">
                            {prescription.follow_up_instructions || "No follow-up instructions."}
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </div>
          )}

        </div>
    </div>

      {/* Mobile Info Drawer Overlay */}
      {showSidebarMobile && (
        <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200" onClick={() => setShowSidebarMobile(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-slate-50 p-6 overflow-y-auto flex flex-col space-y-6 shadow-2xl animate-in slide-in-from-right duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-500" />
                Consultation Info
              </h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowSidebarMobile(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200"
              >
                ✕
              </Button>
            </div>

            {/* Mobile Tab Selectors */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/80 backdrop-blur rounded-xl border border-slate-200/40">
              <button 
                onClick={() => handleTabChange("intake")}
                className={cn(
                  "py-2 text-[11px] font-black tracking-wide rounded-lg transition-all duration-200",
                  activeTab === "intake" 
                    ? "bg-white text-blue-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
                )}
              >
                Intake
              </button>
              <button 
                onClick={() => handleTabChange("prescription")}
                className={cn(
                  "py-2 text-[11px] font-black tracking-wide rounded-lg transition-all duration-200 flex items-center justify-center gap-1",
                  activeTab === "prescription" 
                    ? "bg-white text-blue-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
                )}
              >
                <FileText className="w-3 h-3" />
                Prescription
                {(room?.appointment?.has_prescription || prescription) && (
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />
                )}
              </button>
            </div>

            <div className="space-y-6">
              {activeTab === "intake" ? (
                <>
                  {aiReport ? (
                    <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 space-y-4 shadow-sm relative overflow-hidden">
                      <div className="h-1.5 bg-gradient-to-r from-accent to-emerald-400 absolute top-0 left-0 right-0" />
                      <div className="flex justify-between items-center pt-1">
                        <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <Activity className="w-4 h-4 text-accent animate-pulse" />
                          AI Intake Report
                        </h4>
                        <Badge className={cn("text-[9px] font-black tracking-widest px-2 py-0.5 rounded",
                          aiReport.risk_category?.toLowerCase() === 'high' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                          'bg-amber-50 text-amber-600 border border-amber-100'
                        )}>
                          {aiReport.risk_category || "MEDIUM"} RISK
                        </Badge>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Clinical Summary</span>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] leading-relaxed text-slate-600 font-semibold italic relative">
                          {aiReport.ai_summary || "Symptoms logged but summary details not generated."}
                        </div>
                      </div>

                      {Array.isArray(aiReport.extracted_symptoms) && aiReport.extracted_symptoms.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Extracted Symptoms</span>
                          <div className="flex flex-wrap gap-1">
                            {aiReport.extracted_symptoms.map((symptom, idx) => (
                              <Badge key={idx} variant="secondary" className="text-[9px] font-extrabold bg-slate-100 text-slate-600 rounded px-2 py-0.5 border-none">
                                {symptom}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {aiReport.recommended_specialization && (
                        <div className="bg-blue-50/50 border border-blue-100/50 rounded-xl p-3 flex items-center gap-2">
                          <div className="w-7 h-7 bg-blue-100/80 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                            <Stethoscope className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-[8px] font-bold text-blue-400 uppercase tracking-widest">Route</div>
                            <div className="text-[10px] font-bold text-blue-900 leading-tight">{aiReport.recommended_specialization}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white border rounded-[2rem] p-6 text-center flex flex-col items-center justify-center shadow-sm">
                      <div className="w-12 h-12 rounded-full bg-slate-50 border flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                        <FileText className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 mb-1">Direct consultation</h4>
                      <p className="text-slate-400 text-[10px] leading-relaxed mb-3">No pre-triage logged.</p>
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 w-full text-[10px] text-slate-500 font-semibold italic text-left">
                        Notes: "{room.appointment.notes || "No patient notes provided."}"
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 text-white space-y-4 shadow-xl relative overflow-hidden">
                    <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-400 text-center">Consultation Guide</h4>
                    <ul className="space-y-3 text-[11px] text-slate-300 font-medium">
                      <li className="flex gap-2">
                        <div className="w-4 h-4 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center shrink-0 border border-emerald-500/20">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                        <span>Verify identity & state BMDC approval.</span>
                      </li>
                      <li className="flex gap-2">
                        <div className="w-4 h-4 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center shrink-0 border border-emerald-500/20">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                        <span>Discuss logged symptoms directly.</span>
                      </li>
                    </ul>
                  </div>
                </>
              ) : (
                /* Mobile E-Prescription View */
                <div className="space-y-4">
                  {prescriptionLoading ? (
                    <div className="p-6 text-center bg-white rounded-2xl shadow-sm border flex flex-col items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Loading draft...</span>
                    </div>
                  ) : !prescription ? (
                    <div className="p-6 text-center bg-white rounded-2xl shadow-sm border flex flex-col items-center justify-center">
                      <FileText className="w-8 h-8 text-slate-300 mb-2" />
                      <h4 className="text-xs font-bold text-slate-800">No Prescription Drafted</h4>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {isDoctor
                          ? "Initializing prescription draft..."
                          : "The practitioner has not started a draft yet."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Mobile prescription status */}
                      <div className="bg-white border rounded-2xl p-4 space-y-3 relative overflow-hidden">
                        <div className={cn(
                          "absolute top-0 left-0 right-0 h-1",
                          prescription.status === "finalized" ? "bg-emerald-500" : "bg-amber-400"
                        )} />
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                prescription.status === "finalized" ? "bg-emerald-500" : "bg-amber-400 animate-pulse"
                              )} />
                              <span className="text-[10px] font-extrabold capitalize text-slate-700">{prescription.status}</span>
                            </div>
                          </div>
                          {prescription.status === "finalized" && (
                            <Button 
                              onClick={handleDownloadPDF} 
                              size="sm"
                              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[9px] h-7 px-2.5 rounded-lg gap-1"
                            >
                              <Download className="w-3 h-3" />
                              Download
                            </Button>
                          )}
                        </div>

                        {isDoctor && room.status !== "ended" && (
                          <Button
                            onClick={handleFinalizePrescription}
                            disabled={actionInProgress || prescription.items.length === 0}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-xl h-10 shadow-sm gap-1 disabled:opacity-50 mt-1"
                          >
                            {actionInProgress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Finalize & End Consultation
                          </Button>
                        )}
                      </div>

                      {/* Medications list */}
                      <div className="bg-white border rounded-2xl p-4 space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Stethoscope className="w-3.5 h-3.5 text-blue-500" /> Medications
                        </h4>
                        
                        <div className="space-y-2">
                          {prescription.items && prescription.items.map((med, idx) => (
                            <div key={med.id || idx} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px]">
                              <div className="font-extrabold text-slate-800">{med.medicine_name}</div>
                              <div className="text-[9px] text-slate-400 mt-0.5">
                                {med.dosage} • {med.frequency} • {med.duration} • {med.instruction}
                              </div>
                            </div>
                          ))}
                          {(!prescription.items || prescription.items.length === 0) && (
                            <div className="text-center py-4 text-[9px] font-bold text-slate-400 bg-slate-50 rounded-xl border border-dashed uppercase">
                              No medications added
                            </div>
                          )}
                        </div>

                        {/* Add medicine for doctor */}
                        {isDoctor && prescription.status === "draft" && (
                          <div className="pt-3 border-t space-y-2">
                            <input 
                              type="text" 
                              placeholder="Medicine Name" 
                              value={medName}
                              onChange={(e) => setMedName(e.target.value)}
                              className="w-full bg-slate-50 border rounded-xl px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary text-slate-800"
                            />
                            <div className="grid grid-cols-2 gap-1.5">
                              <input 
                                type="text" 
                                placeholder="Generic" 
                                value={medGeneric}
                                onChange={(e) => setMedGeneric(e.target.value)}
                                className="w-full bg-slate-50 border rounded-xl px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary text-slate-800"
                              />
                              <input 
                                type="text" 
                                placeholder="Dosage" 
                                value={medDosage}
                                onChange={(e) => setMedDosage(e.target.value)}
                                className="w-full bg-slate-50 border rounded-xl px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary text-slate-800"
                              />
                            </div>
                            <Button 
                              onClick={handleAddMedicine}
                              disabled={addingMedicineItem || !medName.trim()}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-8 rounded-xl text-[10px] gap-1 disabled:opacity-50"
                            >
                              Add Medicine
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Directives */}
                      <div className="bg-white border rounded-2xl p-4 space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-accent" /> Directives
                        </h4>

                        {isDoctor && prescription.status === "draft" ? (
                          <div className="space-y-3">
                            <textarea 
                              rows={2} 
                              placeholder="Diagnosis Notes"
                              value={diagnosisNotes}
                              onChange={(e) => setDiagnosisNotes(e.target.value)}
                              className="w-full bg-slate-50 border rounded-xl p-2.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary text-slate-800 leading-normal"
                            />
                            <textarea 
                              rows={2} 
                              placeholder="Dietary Advice"
                              value={adviceNotes}
                              onChange={(e) => setAdviceNotes(e.target.value)}
                              className="w-full bg-slate-50 border rounded-xl p-2.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary text-slate-800 leading-normal"
                            />
                            <textarea 
                              rows={1} 
                              placeholder="Follow Up Instructions"
                              value={followUpNotes}
                              onChange={(e) => setFollowUpNotes(e.target.value)}
                              className="w-full bg-slate-50 border rounded-xl p-2.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary text-slate-800 leading-normal"
                            />
                            <Button 
                              onClick={handleSaveNotes}
                              disabled={savingPrescriptionNotes}
                              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold h-8 rounded-xl text-[10px]"
                            >
                              Save Directives
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <div className="text-[8px] font-bold text-slate-400 uppercase">Diagnosis</div>
                              <div className="p-2 bg-slate-50 border rounded-lg text-[10px] text-slate-600 italic font-semibold">{prescription.diagnosis_notes || "None."}</div>
                            </div>
                            <div>
                              <div className="text-[8px] font-bold text-slate-400 uppercase">Advice</div>
                              <div className="p-2 bg-slate-50 border rounded-lg text-[10px] text-slate-600 italic font-semibold">{prescription.advice_notes || "None."}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WebRTC Video Call Overlay */}
      {callState !== "idle" && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-white animate-in fade-in zoom-in-95 duration-200">
          
          {/* Ringing / Incoming screen */}
          {(callState === "calling" || callState === "incoming") && (
            <div className="flex flex-col items-center justify-center max-w-md w-full text-center space-y-8">
              <div className="relative">
                {/* Pulsing visual circles */}
                <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping scale-150 opacity-75 animate-duration-1000" />
                <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-pulse scale-125" />
                <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-extrabold text-3xl select-none shadow-2xl relative border-2 border-white/10">
                  {partnerInitials}
                </div>
              </div>
              
              <div>
                <h2 className="text-2xl font-black tracking-tight">{partnerName}</h2>
                <Badge className="mt-1 bg-white/10 hover:bg-white/20 text-blue-300 font-bold uppercase tracking-wider text-[10px]">
                  {partnerRole}
                </Badge>
                <p className="text-slate-400 text-sm font-semibold tracking-wide mt-4 uppercase animate-pulse">
                  {callState === "calling" ? "Calling..." : "Incoming Video Call..."}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-6 pt-4">
                {callState === "incoming" ? (
                  <>
                    <Button 
                      onClick={declineCall} 
                      className="bg-rose-500 hover:bg-rose-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg shadow-rose-500/20 transition-all hover:scale-105"
                    >
                      <Phone className="w-6 h-6 rotate-[135deg]" />
                    </Button>
                    <Button 
                      onClick={acceptCall} 
                      className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 animate-bounce"
                    >
                      <Video className="w-7 h-7" />
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={endCall} 
                    className="bg-rose-500 hover:bg-rose-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg shadow-rose-500/20 transition-all hover:scale-105"
                  >
                    <Phone className="w-6 h-6 rotate-[135deg]" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Connected Video Screen */}
          {callState === "connected" && (
            <div className="relative w-full h-full max-w-5xl flex flex-col justify-between items-center rounded-3xl overflow-hidden bg-slate-900 border border-white/5 shadow-2xl">
              
              {/* Remote Video (Full Screen) */}
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="absolute inset-0 w-full h-full object-cover rounded-3xl"
              />

              {/* Local Video (Floating Thumbnail) */}
              <div className="absolute top-4 right-4 w-32 md:w-44 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-10 bg-slate-950">
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className={cn("w-full h-full object-cover", isVideoMuted && "hidden")}
                />
                {isVideoMuted && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-500 text-[10px] font-bold">
                    Camera Off
                  </div>
                )}
              </div>

              {/* Header Info */}
              <div className="w-full bg-gradient-to-b from-black/80 to-transparent p-6 z-10 flex justify-between items-start">
                <div>
                  <h3 className="font-extrabold text-white text-lg drop-shadow-md">{partnerName}</h3>
                  <Badge className="bg-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider text-[9px] border border-emerald-500/20">
                    Live Call Secured
                  </Badge>
                </div>
              </div>

              {/* Floating Action Controls */}
              <div className="w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent p-8 z-10 flex justify-center items-center gap-4">
                <Button 
                  onClick={toggleAudio}
                  variant="ghost" 
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center border transition-all text-white",
                    isAudioMuted 
                      ? "bg-rose-500 hover:bg-rose-600 border-rose-500" 
                      : "bg-white/10 hover:bg-white/20 border-white/10"
                  )}
                >
                  {isAudioMuted ? <Mic className="w-5 h-5 opacity-50" /> : <Mic className="w-5 h-5" />}
                </Button>

                <Button 
                  onClick={endCall} 
                  className="bg-rose-500 hover:bg-rose-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg shadow-rose-500/30 transition-all hover:scale-105"
                >
                  <Phone className="w-6 h-6 rotate-[135deg]" />
                </Button>

                <Button 
                  onClick={toggleVideo}
                  variant="ghost" 
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center border transition-all text-white",
                    isVideoMuted 
                      ? "bg-rose-500 hover:bg-rose-600 border-rose-500" 
                      : "bg-white/10 hover:bg-white/20 border-white/10"
                  )}
                >
                  {isVideoMuted ? <Video className="w-5 h-5 opacity-50" /> : <Video className="w-5 h-5" />}
                </Button>
              </div>

            </div>
          )}

        </div>
      )}

      {/* End Consultation Dialog */}
      <Dialog open={isEndSessionDialogOpen} onOpenChange={setIsEndSessionDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-[2.2rem] border-none bg-white p-6 md:p-8 shadow-2xl font-sans overflow-hidden">
          {room.appointment.has_prescription ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 shadow-sm">
                  <Check className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">End Consultation Session</DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-semibold max-w-sm">
                    A finalized prescription is already attached to this consultation.
                  </DialogDescription>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2.5xl p-4 text-xs text-slate-600 font-semibold leading-relaxed">
                Ending this consultation will officially close the chat room and release the escrow payment of <span className="font-extrabold text-slate-900">${room.appointment.consultation_fee}</span> to your wallet.
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEndSessionDialogOpen(false)} 
                  className="rounded-2xl h-12 text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={confirmCompleteSession}
                  disabled={actionInProgress}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-2xl h-12 px-6 shadow-lg shadow-emerald-500/10 gap-1.5"
                >
                  {actionInProgress ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Complete Consultation
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shadow-sm animate-pulse">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">Prescription Status Warning</DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-semibold max-w-sm">
                    No prescription is currently created for <span className="font-extrabold text-slate-800">{room.patient.full_name}</span>.
                  </DialogDescription>
                </div>
              </div>

              <div className="bg-amber-50/50 border border-amber-100/50 rounded-2.5xl p-4 text-xs text-amber-800 leading-relaxed font-medium">
                Medical compliance guidelines require a prescription to complete consultations. If clinical guidance or medication is needed, please write an E-Prescription now.
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2.5xl">
                <div className="space-y-1 pr-4">
                  <Label htmlFor="no-prescription-switch" className="text-xs font-extrabold text-slate-800 cursor-pointer select-none">
                    No Prescription Needed
                  </Label>
                  <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                    Manually bypass the prescription check for this consultation.
                  </p>
                </div>
                <Switch 
                  id="no-prescription-switch" 
                  checked={noPrescriptionToggle} 
                  onCheckedChange={setNoPrescriptionToggle}
                />
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEndSessionDialogOpen(false)} 
                  className="rounded-2xl h-12 text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                {noPrescriptionToggle ? (
                  <Button 
                    onClick={confirmCompleteSession}
                    disabled={actionInProgress}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-2xl h-12 px-6 shadow-lg shadow-emerald-500/10 gap-1.5"
                  >
                    {actionInProgress ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Complete Consultation
                  </Button>
                ) : (
                  <Link href={`/prescriptions/new?appt=${room.appointment.id}`} className="w-full sm:w-auto">
                    <Button 
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-2xl h-12 px-6 shadow-lg shadow-blue-500/10 gap-1.5"
                    >
                      <FileText className="w-4 h-4" />
                      Write E-Prescription
                    </Button>
                  </Link>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
