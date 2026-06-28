
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Stethoscope, MessageSquare, Calendar, 
  Bell, ChevronRight, Activity, Plus, Wallet, 
  FileText, ShieldCheck, ArrowRight, Video,
  Clock, Loader2, Check, X, Users, DollarSign,
  TrendingUp, Trash2, Phone
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [hasReport, setHasReport] = useState(false);

  const [doctors, setDoctors] = useState<any[]>([]);

  // Availability management states
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [loadingAvailabilities, setLoadingAvailabilities] = useState(false);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);

  // Form states
  const [newWeekday, setNewWeekday] = useState<number>(0);
  const [newStartTime, setNewStartTime] = useState<string>("09:00");
  const [newEndTime, setNewEndTime] = useState<string>("17:00");
  const [newSlotDuration, setNewSlotDuration] = useState<number>(30);
  const [newBreakStartTime, setNewBreakStartTime] = useState<string>("");
  const [newBreakEndTime, setNewBreakEndTime] = useState<string>("");

  async function fetchAvailabilities() {
    try {
      setLoadingAvailabilities(true);
      const res = await api.get("/api/v1/appointments/availability/");
      setAvailabilities(res.data || res);
    } catch (err) {
      console.error("Failed to fetch availabilities", err);
    } finally {
      setLoadingAvailabilities(false);
    }
  }

  async function handleAddAvailability(e: React.FormEvent) {
    e.preventDefault();
    try {
      setIsSavingAvailability(true);
      const formatTime = (t: string) => t ? `${t}:00` : null;
      
      const payload = {
        weekday: Number(newWeekday),
        start_time: formatTime(newStartTime),
        end_time: formatTime(newEndTime),
        slot_duration_minutes: Number(newSlotDuration),
        break_start_time: formatTime(newBreakStartTime),
        break_end_time: formatTime(newBreakEndTime),
        timezone: "UTC"
      };

      await api.post("/api/v1/appointments/availability/", payload);
      await fetchAvailabilities();
      setNewBreakStartTime("");
      setNewBreakEndTime("");
      alert("Availability added successfully!");
    } catch (err: any) {
      console.error("Failed to add availability", err);
      let errorMsg = "Failed to add availability. End time must be after start time and breaks must be within the availability range.";
      if (err.response?.data) {
        if (typeof err.response.data === "string") {
          errorMsg = err.response.data;
        } else if (err.response.data.non_field_errors) {
          errorMsg = err.response.data.non_field_errors.join(" ");
        } else if (typeof err.response.data === "object") {
          errorMsg = Object.entries(err.response.data)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(" ") : msgs}`)
            .join(" | ");
        }
      }
      alert(errorMsg);
    } finally {
      setIsSavingAvailability(false);
    }
  }

  async function handleDeleteAvailability(id: number) {
    if (!confirm("Are you sure you want to delete this availability rule?")) return;
    try {
      await api.delete(`/api/v1/appointments/availability/${id}/`);
      setAvailabilities(prev => prev.filter(item => item.id !== id));
      alert("Availability rule deleted successfully.");
    } catch (err) {
      console.error("Failed to delete availability", err);
      alert("Failed to delete availability.");
    }
  }

  useEffect(() => {
    if (isAvailabilityOpen && user?.role === 'doctor') {
      fetchAvailabilities();
    }
  }, [isAvailabilityOpen, user]);

  useEffect(() => {
    const report = localStorage.getItem("latest_report");
    if (report) setHasReport(true);
  }, []);

  type BackendDoctor = {
    id: number;
    user: {
      id: number;
      email: string;
      full_name: string;
      role: string;
    };
    specialization: string;
    bmdc_number: string;
    consultation_fee: string;
    is_available: boolean;
    verification_status: string;
  };

  function mapBackendDoctorToFrontend(backendDoc: BackendDoctor): any {
    const mockMapping: Record<string, { rating: number; reviews: number; experience: string; languages: string[]; location: string; imageUrl: string }> = {
      "cardiology": {
        rating: 4.9,
        reviews: 142,
        experience: "15 Years",
        languages: ["Bengali", "English"],
        location: "Sylhet",
        imageUrl: "https://picsum.photos/seed/doc3/400/400"
      },
      "pediatrics": {
        rating: 4.8,
        reviews: 96,
        experience: "8 Years",
        languages: ["Bengali", "English"],
        location: "Chittagong",
        imageUrl: "https://picsum.photos/seed/doc2/400/400"
      },
      "general physician": {
        rating: 4.7,
        reviews: 110,
        experience: "12 Years",
        languages: ["Bengali", "English"],
        location: "Dhaka",
        imageUrl: "https://picsum.photos/seed/doc1/400/400"
      }
    };

    const key = backendDoc.specialization.toLowerCase();
    const mockDetails = mockMapping[key] || {
      rating: 4.6,
      reviews: 45,
      experience: "5 Years",
      languages: ["Bengali"],
      location: "Dhaka",
      imageUrl: "https://picsum.photos/seed/docgeneric/400/400"
    };

    return {
      id: String(backendDoc.user.id),
      name: backendDoc.user.full_name.startsWith("Dr.") ? backendDoc.user.full_name : `Dr. ${backendDoc.user.full_name}`,
      specialization: backendDoc.specialization,
      experience: mockDetails.experience,
      rating: mockDetails.rating,
      reviews: mockDetails.reviews,
      fee: `৳ ${parseFloat(backendDoc.consultation_fee).toFixed(0)}`,
      availability: backendDoc.is_available ? "Available Today" : "Offline",
      imageUrl: mockDetails.imageUrl,
      languages: mockDetails.languages,
      location: mockDetails.location,
      bmdcNumber: backendDoc.bmdc_number
    };
  }

  useEffect(() => {
    async function fetchTopDoctors() {
      try {
        const res = await api.get('/api/v1/auth/doctors/');
        const list = res.data || res;
        if (Array.isArray(list)) {
          setDoctors(list.slice(0, 4).map(mapBackendDoctorToFrontend));
        }
      } catch (err) {
        console.error("Failed to fetch top doctors", err);
      }
    }
    fetchTopDoctors();
  }, []);


  const [appointments, setAppointments] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'history'>('pending');
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [pendingBalance, setPendingBalance] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function fetchWallet() {
      try {
        const res = await api.get("/api/v1/wallets/me/");
        const data = res.data || res;
        if (data) {
          setWalletBalance(data.available_balance || "0.00");
          setPendingBalance(data.pending_balance || "0.00");
        }
      } catch (err) {
        console.error("Failed to load wallet balance", err);
      }
    }
    fetchWallet();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    async function fetchNotifications() {
      try {
        const res = await api.get('/api/v1/notifications/');
        const data = res.data || res;
        if (data && Array.isArray(data.results)) {
          setNotifications(data.results);
        } else if (Array.isArray(data)) {
          setNotifications(data);
        }
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    }
    fetchNotifications();

    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await api.post('/api/v1/notifications/read-all/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const handleReadNotif = async (id: number) => {
    try {
      await api.patch(`/api/v1/notifications/${id}/read/`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  function renderNotificationsDropdown() {
    const unreadCount = notifications.filter(n => !n.is_read).length;
    return (
      <div className="relative">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsNotifOpen(!isNotifOpen)}
          className="rounded-xl relative w-10 h-10 md:w-12 md:h-12 bg-white border shadow-sm"
        >
          <Bell className="w-5 h-5 md:w-6 md:h-6 text-slate-500" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-destructive text-[8px] font-extrabold text-white flex items-center justify-center rounded-full border border-white">
              {unreadCount}
            </span>
          )}
        </Button>

        {isNotifOpen && (
          <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-3xl border border-slate-100 shadow-2xl z-50 overflow-hidden py-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-5 pb-3 border-b border-slate-50 flex justify-between items-center">
              <span className="font-extrabold text-sm text-slate-900">Recent Notifications</span>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-bold text-primary uppercase tracking-wider hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            
            <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-50">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                  No notifications yet
                </div>
              ) : (
                notifications.map((notif) => {
                  const dateStr = new Date(notif.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  return (
                    <div 
                      key={notif.id} 
                      onClick={() => {
                        if (!notif.is_read) handleReadNotif(notif.id);
                      }}
                      className={cn(
                        "p-4 flex gap-3 hover:bg-slate-50/85 transition-all cursor-pointer text-left",
                        !notif.is_read ? "bg-primary/[0.02]" : ""
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                        notif.notification_type === 'booking' ? "bg-blue-50 text-blue-500" :
                        notif.notification_type === 'payment' ? "bg-green-50 text-green-500" : "bg-slate-50 text-slate-500"
                      )}>
                        {notif.notification_type === 'booking' ? <Calendar className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5 gap-2">
                          <span className={cn(
                            "text-xs block font-bold text-slate-900 truncate",
                            !notif.is_read ? "text-primary-dark" : "font-semibold"
                          )}>
                            {notif.title}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 shrink-0 uppercase tracking-widest">
                            {dateStr}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 leading-normal line-clamp-2">
                          {notif.message}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 self-center" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-5 pt-3 border-t border-slate-50 text-center">
              <Link 
                href="/notifications" 
                onClick={() => setIsNotifOpen(false)}
                className="text-xs font-bold text-primary hover:underline block"
              >
                View All Notifications
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  useEffect(() => {
    if (!user) return;

    async function fetchAppointments() {
      try {
        setLoadingAppointments(true);
        const res = await api.get('/api/v1/appointments/');
        const list = res.data || res;
        if (Array.isArray(list)) {
          setAppointments(list);
        }
      } catch (err) {
        console.error("Failed to fetch appointments", err);
      } finally {
        setLoadingAppointments(false);
      }
    }
    fetchAppointments();
  }, [user]);

  async function handleApprove(appointmentId: number) {
    try {
      setActionInProgress(String(appointmentId));
      await api.patch(`/api/v1/appointments/${appointmentId}/approve/`);
      // Update local state
      setAppointments(prev => prev.map(app => 
        app.id === appointmentId ? { ...app, status: 'doctor_approved' } : app
      ));
      alert("Appointment approved successfully!");
    } catch (err: any) {
      console.error("Failed to approve appointment", err);
      alert(err.response?.data?.error || "Failed to approve appointment. Ensure appointment is paid first.");
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleReject(appointmentId: number) {
    if (!confirm("Are you sure you want to reject this appointment?")) return;
    try {
      setActionInProgress(String(appointmentId));
      await api.patch(`/api/v1/appointments/${appointmentId}/reject/`);
      // Update local state
      setAppointments(prev => prev.map(app => 
        app.id === appointmentId ? { ...app, status: 'rejected' } : app
      ));
      alert("Appointment rejected successfully.");
    } catch (err: any) {
      console.error("Failed to reject appointment", err);
      alert(err.response?.data?.error || "Failed to reject appointment.");
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleStartSession(appointmentId: number) {
    try {
      setActionInProgress(String(appointmentId));
      const res = await api.patch(`/api/v1/appointments/${appointmentId}/start_session/`);
      const { room_id } = res.data || res;
      if (room_id) {
        router.push(`/chat/${room_id}`);
      } else {
        alert("Could not start consultation. Chat room ID not found.");
      }
    } catch (err: any) {
      console.error("Failed to start session", err);
      alert(err.response?.data?.error || "Failed to start consultation session.");
    } finally {
      setActionInProgress(null);
    }
  }

  function formatDateTime(isoString: string) {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return isoString;
    }
  }

  function renderDoctorDashboard() {
    const pendingAppointments = appointments.filter(app => app.status === 'pending');
    const activeAppointments = appointments.filter(app => ['doctor_approved', 'confirmed', 'in_progress'].includes(app.status));
    const historyAppointments = appointments.filter(app => ['completed', 'cancelled', 'rejected', 'missed'].includes(app.status));

    const displayedAppointments = 
      activeTab === 'pending' ? pendingAppointments :
      activeTab === 'active' ? activeAppointments :
      historyAppointments;


    const liveTriageReports = appointments
      .filter(app => app.status === 'pending' && app.ai_report_details)
      .map(app => {
        const details = app.ai_report_details;
        const riskVal = details?.risk_category || details?.severity_level || 'Low';
        const formattedRisk = riskVal.charAt(0).toUpperCase() + riskVal.slice(1).toLowerCase();
        return {
          id: String(app.id),
          patient: app.patient_name || 'Anonymous Patient',
          symptoms: details?.ai_summary || app.notes || 'Intake completed, awaiting review.',
          risk: formattedRisk,
          time: '5m',
          ai_report: app.ai_report
        };
      });

    const staticTriageReports: { id: string; patient: string; symptoms: string; risk: string; time: string; ai_report?: string }[] = [
      { id: 't1', patient: 'Rahima Khatun', symptoms: 'Severe headache spreading behind the eyes, onset 3 hours ago, accompanied by nausea.', risk: 'High', time: '10m', ai_report: undefined },
      { id: 't2', patient: 'Abdur Rahman', symptoms: 'Continuous high fever (102F), dry cough, and mild shortness of breath.', risk: 'Mod', time: '25m', ai_report: undefined },
    ];

    const displayedTriageReports = liveTriageReports.length > 0 ? liveTriageReports : staticTriageReports;

    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <Navigation />
        
        <div className="max-w-7xl mx-auto px-4 pt-6 pb-24 md:pt-24 min-h-screen">
          {/* Header */}
          <header className="flex justify-between items-center mb-8 md:mb-12">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold border border-accent/20 md:text-xl relative">
                {user?.full_name?.charAt(0) || "D"}
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-slate-900 leading-tight">
                  {user?.full_name?.startsWith("Dr.") ? user.full_name : `Dr. ${user?.full_name || "Doctor"}`}
                </h1>
                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent fill-accent/10" /> GraminDoc Medical Practitioner
                </p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Button
                onClick={() => setIsAvailabilityOpen(true)}
                className="h-10 md:h-12 px-3 md:px-5 rounded-xl font-bold text-xs md:text-sm gap-2 shadow-sm shadow-primary/20 bg-primary hover:bg-primary/90"
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Set Availability</span>
              </Button>
              {renderNotificationsDropdown()}
            </div>
          </header>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-10">
            <Card className="rounded-2xl border-none bg-white p-4 md:p-6 shadow-sm border border-slate-100 flex items-center gap-3 md:gap-4 group hover:shadow-md transition-all">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                <DollarSign className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Wallet Balance</div>
                <div className="text-sm md:text-xl font-extrabold text-slate-950 truncate">৳ {parseFloat(walletBalance || "0.00").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </Card>

            <Card className="rounded-2xl border-none bg-white p-4 md:p-6 shadow-sm border border-slate-100 flex items-center gap-3 md:gap-4 group hover:shadow-md transition-all">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
                <Users className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Appointments</div>
                <div className="text-sm md:text-xl font-extrabold text-slate-950 truncate">{activeAppointments.length} Active</div>
              </div>
            </Card>

            <Card className="rounded-2xl border-none bg-white p-4 md:p-6 shadow-sm border border-slate-100 flex items-center gap-3 md:gap-4 group hover:shadow-md transition-all">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                <Clock className="w-5 h-5 md:w-6 md:h-6 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Task</div>
                <div className="text-sm md:text-xl font-extrabold text-slate-950 truncate">{pendingAppointments.length} Reviews</div>
              </div>
            </Card>

            <Card className="rounded-2xl border-none bg-white p-4 md:p-6 shadow-sm border border-slate-100 flex items-center gap-3 md:gap-4 group hover:shadow-md transition-all">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-accent/5 flex items-center justify-center text-accent shrink-0">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Payout</div>
                <div className="text-sm md:text-xl font-extrabold text-slate-950 truncate">৳ {parseFloat(pendingBalance || "0.00").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </Card>
          </div>

          {/* Two-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Live Queue / Tab Actions */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-sm md:text-lg font-bold flex items-center gap-2 text-slate-900">
                  <Calendar className="w-5 h-5 text-primary" /> Live Consultation Queue
                </h2>
              </div>

              {/* Navigation Tabs */}
              <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-full max-w-sm shadow-inner">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    activeTab === 'pending'
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  Pending ({pendingAppointments.length})
                </button>
                <button
                  onClick={() => setActiveTab('active')}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    activeTab === 'active'
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  Active ({activeAppointments.length})
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    activeTab === 'history'
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  History ({historyAppointments.length})
                </button>
              </div>

              {/* Queue List */}
              <div className="space-y-4">
                {loadingAppointments ? (
                  <div className="bg-white rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Synchronizing clinical schedules...</p>
                  </div>
                ) : displayedAppointments.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center space-y-4">
                    <Stethoscope className="w-12 h-12 text-slate-200" />
                    <h3 className="font-bold text-slate-800 text-base">No appointments found</h3>
                    <p className="text-slate-400 text-xs max-w-xs mx-auto">There are no consultations matching this filter in your records.</p>
                  </div>
                ) : (
                  displayedAppointments.map((app) => (
                    <Card key={app.id} className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all bg-white p-4 md:p-6 overflow-hidden relative">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Left Info */}
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 font-extrabold border border-slate-100 text-base">
                            {app.patient_name?.charAt(0) || "P"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-base">
                              {app.patient_name || "Anonymous Patient"}
                            </div>
                            <div className="text-xs text-slate-400 font-semibold">{app.patient_email || "No contact info"}</div>
                            {app.notes && (
                              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100/50 rounded-lg p-2 mt-2 italic max-w-lg">
                                " {app.notes} "
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Mid Info */}
                        <div className="grid grid-cols-2 md:flex md:items-center gap-4">
                          <div className="space-y-0.5">
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Start</div>
                            <div className="flex items-center gap-1 font-bold text-slate-700 text-xs">
                              <Calendar className="w-3.5 h-3.5 text-accent" /> {formatDateTime(app.scheduled_start)}
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Consult Type</div>
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase",
                              app.consultation_type === 'video'
                                ? "bg-purple-50 text-purple-600"
                                : app.consultation_type === 'voice'
                                ? "bg-amber-50 text-amber-600"
                                : "bg-blue-50 text-blue-600"
                            )}>
                              {app.consultation_type === 'video' ? <Video className="w-3 h-3" /> : app.consultation_type === 'voice' ? <Phone className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                              {app.consultation_type === 'video' ? 'Video' : app.consultation_type === 'voice' ? 'Voice' : app.consultation_type === 'text' ? 'Text' : app.consultation_type}
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Payment</div>
                            <span className={cn(
                              "inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                              ['paid_held', 'released'].includes(app.payment_status) ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                            )}>
                              {app.payment_status === 'paid_held' ? 'Paid (Escrow)' :
                               app.payment_status === 'released' ? 'Released' :
                               app.payment_status === 'refunded' ? 'Refunded' :
                               app.payment_status === 'disputed' ? 'Disputed' :
                               app.payment_status === 'unpaid' ? 'Unpaid' :
                               app.payment_status || 'Unpaid'}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          {app.ai_report && (
                            <Link href={`/report/${app.ai_report}`} target="_blank">
                              <Button variant="outline" size="sm" className="h-9 rounded-lg gap-1 text-[10px] font-bold shrink-0 bg-accent/5 border-accent/10 hover:bg-accent/10 text-accent">
                                <FileText className="w-3.5 h-3.5" /> View AI Intake
                              </Button>
                            </Link>
                          )}
                          {['doctor_approved', 'confirmed', 'in_progress'].includes(app.status) && (
                            <Button 
                              onClick={() => handleStartSession(app.id)}
                              disabled={actionInProgress !== null}
                              className="h-9 rounded-lg font-bold text-[10px] px-4 shadow-sm gap-1 bg-primary hover:bg-primary/95 text-white shrink-0"
                            >
                              {actionInProgress === String(app.id) ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Video className="w-3.5 h-3.5" />
                              )}
                              {app.status === 'in_progress' ? "Join Consultation" : "Start Session"}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* AI Triage Insight section directly inside the card */}
                      {app.ai_report_details ? (
                        <div className="mt-4 p-4 rounded-xl bg-accent/5 border border-accent/10 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Activity className="w-4 h-4 text-accent animate-pulse" />
                              <span className="text-xs font-bold text-slate-800">AI Symptom Triage Analysis</span>
                            </div>
                            <Badge className={cn("text-[9px] font-bold px-2 py-0.5 rounded-md",
                              app.ai_report_details.risk_category?.toLowerCase() === 'high' || app.ai_report_details.severity_level?.toLowerCase() === 'high'
                                ? "bg-rose-50 text-rose-600 border border-rose-100"
                                : "bg-amber-50 text-amber-600 border border-amber-100"
                            )}>
                              {app.ai_report_details.risk_category || app.ai_report_details.severity_level || 'Low'} Risk
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-slate-600 leading-relaxed italic">
                            " {app.ai_report_details.ai_summary} "
                          </p>

                          {app.ai_report_details.extracted_symptoms && Array.isArray(app.ai_report_details.extracted_symptoms) && (
                            <div className="flex flex-wrap gap-1">
                              {app.ai_report_details.extracted_symptoms.map((symptom: string, idx: number) => (
                                <span key={idx} className="text-[9px] font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                                  {symptom}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <ShieldCheck className="w-4 h-4" />
                              <span className="text-xs font-bold">Intake Form Notes</span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Direct Booking</span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed italic">
                            " Patient direct request note: '{app.notes || 'General health consultation checkup'}' "
                          </p>
                        </div>
                      )}

                      {/* Actions Footer */}
                      {app.status === 'pending' && (
                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                          <Button
                            variant="outline"
                            onClick={() => handleReject(app.id)}
                            disabled={actionInProgress !== null}
                            className="h-9 rounded-lg font-bold text-[10px] gap-1.5 border-rose-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 px-3"
                          >
                            {actionInProgress === String(app.id) ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                            Reject
                          </Button>
                          <Button
                            onClick={() => handleApprove(app.id)}
                            disabled={actionInProgress !== null || !['paid_held', 'released'].includes(app.payment_status)}
                            className={cn(
                              "h-9 rounded-lg font-bold text-[10px] gap-1.5 shadow-sm px-4",
                              !['paid_held', 'released'].includes(app.payment_status)
                                ? "bg-slate-100 text-slate-400 shadow-none border-none cursor-not-allowed"
                                : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/10"
                            )}
                          >
                            {actionInProgress === String(app.id) ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            {!['paid_held', 'released'].includes(app.payment_status) ? "Awaiting Payment" : "Approve & Schedule"}
                          </Button>
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Right Column: AI Triage & Toolkit */}
            <div className="space-y-8">
              
              {/* AI Triage Insights */}
              <section className="space-y-4">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-accent" /> AI Triage Insights
                </h2>
                <div className="space-y-3">
                  {displayedTriageReports.map((report) => (
                    <Card key={report.id} className="rounded-2xl border-none shadow-sm border-l-4 border-l-accent overflow-hidden hover:shadow-md transition-all bg-white p-5">
                      <div className="flex justify-between items-start mb-2">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-sm truncate">{report.patient}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{report.time} ago</div>
                        </div>
                        <Badge className={cn("text-[9px] font-bold rounded-md px-2 py-0.5", 
                          report.risk === 'High' ? 'bg-destructive/10 text-destructive' : 'bg-orange-50 text-orange-600'
                        )}>
                          {report.risk} RISK
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                        {report.symptoms}
                      </p>
                      {report.ai_report ? (
                        <Link href={`/report/${report.ai_report}`} target="_blank" className="w-full">
                          <Button variant="outline" size="sm" className="w-full rounded-xl text-[10px] font-bold h-9 border-slate-200 hover:bg-slate-50">
                            Review Case Data
                          </Button>
                        </Link>
                      ) : (
                        <Button variant="outline" size="sm" className="w-full rounded-xl text-[10px] font-bold h-9 border-slate-200 hover:bg-slate-50" onClick={() => alert("Mock Case Intake Data has been pre-reviewed.")}>
                          Review Case Data
                        </Button>
                      )}
                    </Card>
                  ))}
                </div>
              </section>

              {/* Clinical Toolkit */}
              <Card className="rounded-[2rem] border-none bg-slate-950 text-white p-6 md:p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/15 rounded-full blur-2xl pointer-events-none" />
                <h3 className="text-xs font-bold uppercase tracking-widest mb-6 opacity-60 text-slate-400 text-center">Clinical Toolkit</h3>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {[
                    { label: 'Set Hours', icon: Clock, color: 'text-primary' },
                    { label: 'E-Prescription', icon: FileText, color: 'text-accent' },
                    { label: 'Patients', icon: Users, color: 'text-blue-400' },
                    { label: 'Withdraw', icon: DollarSign, color: 'text-emerald-400' }
                  ].map((tool, i) => (
                    <Button 
                      key={i} 
                      variant="ghost" 
                      onClick={() => {
                        if (tool.label === 'Set Hours') {
                          setIsAvailabilityOpen(true);
                        } else {
                          alert(`Clinical tool: ${tool.label} is currently integrated. (Available under certified practitioner license.)`);
                        }
                      }}
                      className="flex-col h-auto py-5 md:py-6 bg-white/5 hover:bg-white/10 rounded-2xl gap-2 border-none transition-all"
                    >
                      <tool.icon className={cn("w-6 h-6", tool.color)} />
                      <span className="text-[10px] font-bold text-white/90">{tool.label}</span>
                    </Button>
                  ))}
                </div>
              </Card>

            </div>

          </div>

        </div>

        <Dialog open={isAvailabilityOpen} onOpenChange={setIsAvailabilityOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white border border-slate-100">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900">
                <Clock className="w-5 h-5 text-primary" /> Manage Weekly Availability
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Define the days and times when you are available for consultations. Slots will be auto-generated based on these rules.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Create New Rule Form */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Add Availability</h3>
                <form onSubmit={handleAddAvailability} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Weekday</label>
                    <select
                      value={newWeekday}
                      onChange={(e) => setNewWeekday(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800"
                    >
                      <option value={0}>Monday</option>
                      <option value={1}>Tuesday</option>
                      <option value={2}>Wednesday</option>
                      <option value={3}>Thursday</option>
                      <option value={4}>Friday</option>
                      <option value={5}>Saturday</option>
                      <option value={6}>Sunday</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Start Time</label>
                      <input
                        type="time"
                        value={newStartTime}
                        onChange={(e) => setNewStartTime(e.target.value)}
                        required
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-1">End Time</label>
                      <input
                        type="time"
                        value={newEndTime}
                        onChange={(e) => setNewEndTime(e.target.value)}
                        required
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Slot Duration (Minutes)</label>
                    <input
                      type="number"
                      min={10}
                      max={180}
                      value={newSlotDuration}
                      onChange={(e) => setNewSlotDuration(Number(e.target.value))}
                      required
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800"
                    />
                  </div>

                  <div className="border-t border-slate-200/60 pt-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Break Period (Optional)</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Break Start</label>
                        <input
                          type="time"
                          value={newBreakStartTime}
                          onChange={(e) => setNewBreakStartTime(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Break End</label>
                        <input
                          type="time"
                          value={newBreakEndTime}
                          onChange={(e) => setNewBreakEndTime(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSavingAvailability}
                    className="w-full h-11 rounded-xl font-bold mt-4 shadow-sm"
                  >
                    {isSavingAvailability ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Rule"}
                  </Button>
                </form>
              </div>

              {/* Right Column: Existing Rules List */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Current Hours</h3>
                {loadingAvailabilities ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400 text-xs font-semibold">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" /> Loading rules...
                  </div>
                ) : availabilities.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs italic bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    No availability rules defined yet.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                    {availabilities.map((item) => {
                      const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
                      const formatTimeDisplay = (t: string) => {
                        if (!t) return "";
                        return t.substring(0, 5); // display HH:MM
                      };
                      return (
                        <div
                          key={item.id}
                          className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-3 hover:border-slate-200 transition-all text-slate-800"
                        >
                          <div>
                            <div className="font-bold text-sm text-slate-850">{weekdays[item.weekday]}</div>
                            <div className="text-xs text-slate-500 font-semibold mt-0.5">
                              {formatTimeDisplay(item.start_time)} - {formatTimeDisplay(item.end_time)} ({item.slot_duration_minutes}m slots)
                            </div>
                            {item.break_start_time && (
                              <div className="text-[10px] text-amber-600 bg-amber-50 rounded-md px-1.5 py-0.5 mt-1.5 inline-block font-semibold">
                                Break: {formatTimeDisplay(item.break_start_time)} - {formatTimeDisplay(item.break_end_time)}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => handleDeleteAvailability(item.id)}
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 shrink-0 w-8 h-8 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    );
  }

  if (user?.role === 'doctor') {
    return renderDoctorDashboard();
  }

  const pendingPatientApps = appointments.filter(app => app.status === 'pending');
  const activePatientApps = appointments.filter(app => ['doctor_approved', 'confirmed', 'in_progress'].includes(app.status));
  const historyPatientApps = appointments.filter(app => ['completed', 'cancelled', 'rejected', 'missed'].includes(app.status));

  const displayedPatientAppointments = 
    activeTab === 'pending' ? pendingPatientApps :
    activeTab === 'active' ? activePatientApps :
    historyPatientApps;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navigation />
      
      <div className="max-w-5xl mx-auto px-4 pt-4 pb-24 md:pt-24 min-h-screen">
        {/* Header */}
        <header className="flex justify-between items-center mb-6 md:mb-10">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 md:text-xl">
              {user?.full_name?.charAt(0) || "U"}
            </div>
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-slate-900 leading-tight">
                {user?.full_name || "Patient User"}
              </h1>
              <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Premium Member</p>
            </div>
          </div>
          <div className="flex gap-2">
            {renderNotificationsDropdown()}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Stats & AI Action */}
          <div className="md:col-span-2 space-y-4 md:space-y-6">
            <div className="grid grid-cols-2 gap-3 md:gap-6">
              <Card className="rounded-2xl md:rounded-[2rem] border-none bg-primary text-white p-4 md:p-8 shadow-lg shadow-primary/20 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="text-[9px] md:text-xs font-bold text-white/70 uppercase tracking-tighter md:tracking-widest mb-1 md:mb-2">Wallet Balance</div>
                  <div className="text-xl md:text-4xl font-bold flex items-center justify-between">
                    ৳ {walletBalance !== null ? parseFloat(walletBalance).toFixed(2) : "..."}
                    <Link href="/wallet">
                      <Plus className="w-4 h-4 md:w-8 md:h-8 bg-white/20 rounded-md p-0.5" />
                    </Link>
                  </div>
                </div>
                <div className="absolute -right-4 -bottom-4 w-24 h-24 md:w-40 md:h-40 bg-white/10 rounded-full blur-2xl" />
              </Card>
              <Card className="rounded-2xl md:rounded-[2rem] border-none bg-accent text-white p-4 md:p-8 shadow-lg shadow-accent/20">
                <div className="text-[9px] md:text-xs font-bold text-white/70 uppercase tracking-tighter md:tracking-widest mb-1 md:mb-2">Active Consults</div>
                <div className="text-xl md:text-4xl font-bold flex items-center justify-between">
                  {appointments.filter(app => ['pending', 'doctor_approved', 'confirmed', 'in_progress'].includes(app.status)).length}
                  <Activity className="w-4 h-4 md:w-8 md:h-8 opacity-50" />
                </div>
              </Card>
            </div>

            {/* AI Action Strip */}
            {hasReport ? (
              <div className="bg-white border-l-4 border-l-accent p-4 md:p-6 rounded-xl md:rounded-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                    <FileText className="w-4 h-4 md:w-6 md:h-6" />
                  </div>
                  <div>
                    <div className="text-xs md:text-base font-bold text-slate-900">Health Report Ready</div>
                    <div className="text-[10px] md:text-sm text-slate-500">Share with a doctor to get personalized care.</div>
                  </div>
                </div>
                <Link href="/doctors">
                  <Button size="sm" className="bg-accent hover:bg-accent/90 h-8 md:h-10 text-[10px] md:text-xs font-bold rounded-lg md:rounded-xl px-3 md:px-6">Consult Now</Button>
                </Link>
              </div>
            ) : (
              <div className="bg-white border-l-4 border-l-primary p-4 md:p-6 rounded-xl md:rounded-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <MessageSquare className="w-4 h-4 md:w-6 md:h-6" />
                  </div>
                  <div>
                    <div className="text-xs md:text-base font-bold text-slate-900">AI Symptom Checker</div>
                    <div className="text-[10px] md:text-sm text-slate-500">Quickly analyze your symptoms with AI.</div>
                  </div>
                </div>
                <Link href="/triage">
                  <Button size="sm" className="bg-primary h-8 md:h-10 text-[10px] md:text-xs font-bold rounded-lg md:rounded-xl px-3 md:px-6">Start Chat</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Quick Access Grid - Sidebar feel on Desktop */}
          <div className="grid grid-cols-4 md:grid-cols-2 gap-2 md:gap-4">
            {[
              { label: "Doctors", icon: Stethoscope, href: "/doctors", color: "text-blue-500", bg: "bg-blue-50" },
              { label: "Records", icon: FileText, href: "/prescriptions", color: "text-purple-500", bg: "bg-purple-50" },
              { label: "Wallet", icon: Wallet, href: "/wallet", color: "text-green-500", bg: "bg-green-50" },
              { label: "Alerts", icon: Bell, href: "/notifications", color: "text-orange-500", bg: "bg-orange-50" }
            ].map((action, i) => (
              <Link key={i} href={action.href}>
                <div className="flex flex-col items-center p-2 md:p-4 bg-white md:border md:rounded-2xl md:hover:shadow-md transition-all">
                  <div className={cn("w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-1 md:mb-3 shadow-sm border border-white", action.bg)}>
                    <action.icon className={cn("w-5 h-5 md:w-8 md:h-8", action.color)} />
                  </div>
                  <span className="text-[10px] md:text-sm font-bold text-slate-600">{action.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Appointments */}
          <section id="consultations" className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-sm md:text-lg font-bold flex items-center gap-2 text-slate-900">
                <Calendar className="w-5 h-5 text-primary" /> Consultations
              </h2>
              <Link href="#consultations" className="text-[10px] md:text-sm font-bold text-primary hover:underline">View Schedule</Link>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-full max-w-sm shadow-inner">
              <button
                onClick={() => setActiveTab('pending')}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                  activeTab === 'pending'
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                Pending ({pendingPatientApps.length})
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                  activeTab === 'active'
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                Active ({activePatientApps.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                  activeTab === 'history'
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                History ({historyPatientApps.length})
              </button>
            </div>
            
            <div className="space-y-3 md:space-y-4">
              {displayedPatientAppointments.map(app => (
                <div key={app.id} className="bg-white p-4 md:p-6 rounded-2xl border-none shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 md:hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm md:text-lg text-slate-900 truncate">
                        {app.doctor_name || "Doctor Practitioner"}
                      </div>
                      <div className="text-[10px] md:text-sm text-slate-400 font-medium truncate mt-0.5">
                        {formatDateTime(app.scheduled_start)} • {
                          app.consultation_type === 'video' ? 'Video' :
                          app.consultation_type === 'voice' ? 'Voice' :
                          app.consultation_type === 'text' ? 'Text' :
                          app.consultation_type?.toUpperCase() || 'TEXT'
                        }
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-4 shrink-0 justify-between md:justify-end">
                    <div className={cn("text-[8px] md:text-xs font-bold uppercase tracking-tight px-2.5 py-1 rounded-md", 
                      app.status === 'in_progress' ? "bg-emerald-50 text-emerald-600 animate-pulse border border-emerald-100" :
                      app.status === 'doctor_approved' ? "bg-accent/10 text-accent border border-accent/20" : 
                      app.status === 'confirmed' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                      app.status === 'pending' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                      app.status === 'completed' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                      "bg-rose-50 text-rose-600 border border-rose-100"
                    )}>
                      {app.status === 'doctor_approved' ? 'Approved' : app.status}
                    </div>
                    {['doctor_approved', 'confirmed', 'in_progress'].includes(app.status) ? (
                      <Button 
                        onClick={() => handleStartSession(app.id)}
                        disabled={actionInProgress !== null}
                        className="h-8 md:h-10 bg-primary hover:bg-primary/95 text-white rounded-xl px-4 text-[10px] md:text-xs font-bold shadow-sm gap-1.5 flex items-center shrink-0"
                      >
                        {actionInProgress === String(app.id) ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Video className="w-3.5 h-3.5" />
                        )}
                        {app.status === 'in_progress' ? "Join Chat" : "Start Chat"}
                      </Button>
                    ) : app.status === 'pending' ? (
                      app.payment_status === 'unpaid' ? (
                        <Link href={`/consultation/success?appt=${app.id}`}>
                          <Button size="sm" variant="outline" className="h-8 md:h-10 rounded-xl px-4 text-[10px] md:text-xs font-bold border-slate-200 hover:bg-slate-50 text-slate-700">
                            Pay Now
                          </Button>
                        </Link>
                      ) : (
                        <Button size="sm" disabled className="h-8 md:h-10 bg-slate-50 text-slate-400 rounded-xl px-4 text-[10px] md:text-xs font-bold border-none cursor-not-allowed">
                          Awaiting Approval
                        </Button>
                      )
                    ) : (
                      <Button size="sm" disabled className="h-8 md:h-10 bg-slate-50 text-slate-400 rounded-xl px-4 text-[10px] md:text-xs font-bold border-none cursor-not-allowed uppercase">
                        {app.status}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {displayedPatientAppointments.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
                  <p className="text-xs md:text-sm text-slate-400 font-bold uppercase tracking-wider">No {activeTab} consultations found</p>
                  {activeTab === 'pending' && (
                    <Link href="/doctors" className="inline-block mt-4">
                      <Button variant="outline" className="rounded-xl font-bold">Find a Doctor</Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Suggested Doctors */}
          <section>
            <div className="flex justify-between items-center mb-4 md:mb-6 px-1">
              <h2 className="text-xs md:text-lg font-bold uppercase md:capitalize tracking-widest md:tracking-normal text-slate-400 md:text-slate-900">Top Rated</h2>
              <Link href="/doctors" className="text-[10px] md:text-sm font-bold text-primary">Browse All</Link>
            </div>
            <div className="flex md:grid md:grid-cols-1 overflow-x-auto gap-4 pb-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
              {doctors.map(doc => (
                <div key={doc.id} className="min-w-[160px] md:min-w-0 bg-white rounded-2xl border-none shadow-sm flex-shrink-0 group overflow-hidden border border-transparent hover:border-primary/10 hover:shadow-md transition-all">
                  <div className="h-20 md:h-32 bg-slate-100 relative">
                    <img src={doc.imageUrl} alt={doc.name} className="object-cover w-full h-full" />
                  </div>
                  <div className="p-3 md:p-5">
                    <div className="font-bold text-[11px] md:text-base text-slate-900 truncate mb-0.5">{doc.name}</div>
                    <div className="text-[9px] md:text-xs text-slate-400 font-bold uppercase truncate mb-2 md:mb-4">{doc.specialization}</div>
                    <div className="flex justify-between items-center">
                      <div className="text-primary font-bold text-[10px] md:text-base">{doc.fee}</div>
                      <Link href={`/consultation/new?doc=${doc.id}`}>
                        <Button size="sm" className="h-7 md:h-9 rounded-lg px-3 md:px-4 text-[9px] md:text-xs font-bold">Book</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
