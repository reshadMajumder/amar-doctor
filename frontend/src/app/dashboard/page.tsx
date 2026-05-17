
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Stethoscope, MessageSquare, Calendar, 
  Bell, ChevronRight, Activity, Plus, Wallet, 
  FileText, ShieldCheck, ArrowRight, Video,
  Clock, Loader2, Check, X
} from "lucide-react";
import { api } from "@/lib/api";
import { CONSULTATIONS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const { user } = useAuth();
  const [hasReport, setHasReport] = useState(false);

  const [doctors, setDoctors] = useState<any[]>([]);

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

  const upcomingConsultations = CONSULTATIONS.filter(c => c.status === 'Upcoming' || c.status === 'Pending Approval');

  const [appointments, setAppointments] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'history'>('pending');

  useEffect(() => {
    if (user?.role !== 'doctor') return;

    async function fetchAppointments() {
      try {
        setLoadingAppointments(true);
        const res = await api.get('/api/v1/appointments/');
        const list = res.data || res;
        if (Array.isArray(list)) {
          setAppointments(list);
        }
      } catch (err) {
        console.error("Failed to fetch doctor appointments", err);
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

    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <Navigation />
        
        <div className="max-w-5xl mx-auto px-4 pt-4 pb-24 md:pt-24 min-h-screen">
          {/* Header */}
          <header className="flex justify-between items-center mb-6 md:mb-10">
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
            <div className="flex gap-2">
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="rounded-xl relative w-10 h-10 md:w-12 md:h-12 bg-white border shadow-sm">
                  <Bell className="w-5 h-5 md:w-6 md:h-6 text-slate-500" />
                  {pendingAppointments.length > 0 && (
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-destructive border-2 border-white rounded-full" />
                  )}
                </Button>
              </Link>
            </div>
          </header>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card className="rounded-2xl border-none bg-white p-6 shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pending Reviews</div>
                <div className="text-2xl md:text-3xl font-extrabold text-slate-950">{pendingAppointments.length}</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
            </Card>

            <Card className="rounded-2xl border-none bg-white p-6 shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Active Consults</div>
                <div className="text-2xl md:text-3xl font-extrabold text-slate-950">{activeAppointments.length}</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                <Activity className="w-6 h-6" />
              </div>
            </Card>

            <Card className="rounded-2xl border-none bg-white p-6 shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Completed Cases</div>
                <div className="text-2xl md:text-3xl font-extrabold text-slate-950">{historyAppointments.length}</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                <FileText className="w-6 h-6" />
              </div>
            </Card>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mb-6 bg-slate-100 p-1.5 rounded-2xl w-full max-w-md shadow-inner">
            <button
              onClick={() => setActiveTab('pending')}
              className={cn(
                "flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all",
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
                "flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all",
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
                "flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all",
                activeTab === 'history'
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              History ({historyAppointments.length})
            </button>
          </div>

          {/* Appointments List */}
          <div className="space-y-4">
            {loadingAppointments ? (
              <div className="bg-white rounded-3xl p-12 text-center border-none shadow-sm flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
                <p className="text-slate-400 font-bold text-sm uppercase tracking-wider">Synchronizing clinical schedules...</p>
              </div>
            ) : displayedAppointments.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border-none shadow-sm flex flex-col items-center justify-center space-y-4">
                <Stethoscope className="w-12 h-12 text-slate-200" />
                <h3 className="font-bold text-slate-800 text-lg">No appointments found</h3>
                <p className="text-slate-400 text-sm max-w-xs mx-auto">There are no consultations matching the selected status filter in your records.</p>
              </div>
            ) : (
              displayedAppointments.map((app) => (
                <Card key={app.id} className="rounded-3xl border-none shadow-sm hover:shadow-md transition-all bg-white p-5 md:p-6 overflow-hidden relative">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Patient Initials and Info */}
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-700 font-extrabold border border-slate-100 text-base">
                        {app.patient_name?.charAt(0) || "P"}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-950 text-base flex items-center gap-2">
                          {app.patient_name || "Anonymous Patient"}
                        </div>
                        <div className="text-xs text-slate-400 font-medium">{app.patient_email || "No contact info"}</div>
                        {app.notes && (
                          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100/50 rounded-lg p-2 mt-2 italic max-w-lg">
                            " {app.notes} "
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Middle: Slot Details */}
                    <div className="grid grid-cols-2 md:flex md:items-center gap-3 md:gap-6">
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Start</div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-700 text-xs md:text-sm">
                          <Calendar className="w-3.5 h-3.5 text-accent" /> {formatDateTime(app.scheduled_start)}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consult Type</div>
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase",
                          app.consultation_type === 'video'
                            ? "bg-purple-50 text-purple-600"
                            : "bg-blue-50 text-blue-600"
                        )}>
                          {app.consultation_type === 'video' ? <Video className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                          {app.consultation_type}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</div>
                        <span className={cn(
                          "inline-flex px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase",
                          app.status === 'pending' ? "bg-amber-50 text-amber-600" :
                          ['doctor_approved', 'confirmed', 'in_progress'].includes(app.status) ? "bg-emerald-50 text-emerald-600" :
                          "bg-slate-50 text-slate-600"
                        )}>
                          {app.status}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment</div>
                        <span className={cn(
                          "inline-flex px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase",
                          app.payment_status === 'paid' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {app.payment_status}
                        </span>
                      </div>
                    </div>

                    {/* Right: AI intake report link */}
                    {app.ai_report && (
                      <Link href={`/report/${app.ai_report}`} target="_blank">
                        <Button variant="outline" size="sm" className="h-10 rounded-xl gap-2 font-bold text-xs shrink-0 bg-accent/5 border-accent/10 hover:bg-accent/10 text-accent transition-all">
                          <FileText className="w-4 h-4" /> View AI Intake
                        </Button>
                      </Link>
                    )}
                  </div>

                  {/* Actions Section (only for pending reviews) */}
                  {app.status === 'pending' && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={() => handleReject(app.id)}
                        disabled={actionInProgress !== null}
                        className="h-10 rounded-xl font-bold text-xs gap-1.5 border-rose-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition-all px-4"
                      >
                        {actionInProgress === String(app.id) ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                        Reject Request
                      </Button>
                      <Button
                        onClick={() => handleApprove(app.id)}
                        disabled={actionInProgress !== null}
                        className={cn(
                          "h-10 rounded-xl font-bold text-xs gap-1.5 shadow-md px-5 transition-all",
                          app.payment_status !== 'paid'
                            ? "bg-slate-100 text-slate-400 shadow-none border-none cursor-not-allowed"
                            : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/10"
                        )}
                      >
                        {actionInProgress === String(app.id) ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        {app.payment_status !== 'paid' ? "Awaiting Payment" : "Approve & Schedule"}
                      </Button>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (user?.role === 'doctor') {
    return renderDoctorDashboard();
  }

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
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="rounded-xl relative w-10 h-10 md:w-12 md:h-12 bg-white border shadow-sm">
                <Bell className="w-5 h-5 md:w-6 md:h-6 text-slate-500" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-destructive border-2 border-white rounded-full" />
              </Button>
            </Link>
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
                    ৳ 700
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
                  {upcomingConsultations.length}
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
          <section className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4 md:mb-6 px-1">
              <h2 className="text-xs md:text-lg font-bold uppercase md:capitalize tracking-widest md:tracking-normal text-slate-400 md:text-slate-900">Next Appointments</h2>
              <Link href="/consultations" className="text-[10px] md:text-sm font-bold text-primary hover:underline">View Schedule</Link>
            </div>
            
            <div className="space-y-2 md:space-y-4">
              {upcomingConsultations.map(item => (
                <div key={item.id} className="bg-white p-3 md:p-5 rounded-2xl border-none shadow-sm flex items-center justify-between gap-3 md:hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 md:gap-5 min-w-0">
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border">
                      <Calendar className="w-4 h-4 md:w-6 md:h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm md:text-lg text-slate-900 truncate">{item.doctorName}</div>
                      <div className="text-[10px] md:text-sm text-slate-400 font-medium truncate">{item.date} • {item.time}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-4">
                    <div className={cn("text-[8px] md:text-xs font-bold uppercase tracking-tight px-2 py-0.5 md:px-3 md:py-1 rounded-md", 
                      item.status === 'Upcoming' ? "bg-accent/10 text-accent" : "bg-orange-50 text-orange-600"
                    )}>
                      {item.status.split(' ')[0]}
                    </div>
                    {item.status === 'Upcoming' && (
                      <Button size="sm" className="h-8 md:h-10 rounded-lg md:rounded-xl px-3 md:px-5 text-[10px] md:text-sm font-bold">Join</Button>
                    )}
                  </div>
                </div>
              ))}
              {upcomingConsultations.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs md:text-base text-slate-400 font-bold md:font-medium uppercase md:capitalize">No active bookings for this week</p>
                  <Link href="/doctors" className="inline-block mt-4">
                    <Button variant="outline" className="rounded-xl">Find a Doctor</Button>
                  </Link>
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
