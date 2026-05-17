
"use client";

import { useState } from "react";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, Clock, FileText, Activity, 
  CheckCircle, Bell, DollarSign,
  Video, MessageSquare, Check, X,
  TrendingUp, Calendar
} from "lucide-react";
import { CONSULTATIONS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function DoctorDashboard() {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState(CONSULTATIONS);

  const pendingReports = [
    { id: '1', patient: 'Rahima Khatun', symptoms: 'Severe Headache', risk: 'High', time: '10m' },
    { id: '2', patient: 'Abdur Rahman', symptoms: 'Fever, Cough', risk: 'Mod', time: '25m' },
  ];

  const handleApprove = (id: string) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'Upcoming' } : a));
    toast({ title: "Approved", description: "Patient notified." });
  };

  const handleCancel = (id: string) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'Cancelled' } : a));
    toast({ variant: "destructive", title: "Cancelled", description: "Patient notified." });
  };

  const pendingApprovals = appointments.filter(a => a.status === 'Pending Approval');
  const upcomingToday = appointments.filter(a => a.status === 'Upcoming');

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex w-64 lg:w-72 bg-white border-r flex-col p-6 lg:p-8 space-y-6 lg:space-y-8 h-screen sticky top-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">GraminDoc</span>
        </div>
        
        <nav className="space-y-2 flex-1">
          {[
            { label: 'Overview', icon: Activity, active: true },
            { label: 'Queue', icon: Users },
            { label: 'AI Reports', icon: FileText },
            { label: 'Schedule', icon: Calendar },
            { label: 'Earnings', icon: DollarSign },
          ].map((item, i) => (
            <button key={i} className={cn(
              "w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
              item.active ? "bg-primary text-white shadow-md" : "text-slate-500 hover:bg-slate-50 hover:text-primary"
            )}>
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary border border-primary/20">DR</div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-bold truncate">Dr. Ariful Islam</div>
              <div className="text-[10px] text-accent font-bold uppercase tracking-widest">Active Session</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-10 pb-24 md:pb-10 max-w-[1400px] mx-auto w-full">
        <header className="flex items-center justify-between mb-8 md:mb-12">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-slate-900">Doctor Overview</h1>
            <p className="text-[10px] md:text-sm text-slate-500 font-bold md:font-medium uppercase md:capitalize tracking-widest md:tracking-normal mt-1">Monday, 20 May 2026</p>
          </div>
          <div className="flex gap-2 md:gap-4">
            <Button variant="outline" size="icon" className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white border-slate-200 relative shadow-sm">
              <Bell className="w-5 h-5 md:w-6 md:h-6 text-slate-500" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-destructive rounded-full border-2 border-white" />
            </Button>
            <div className="hidden sm:flex bg-accent/10 text-accent px-5 py-2.5 rounded-2xl border border-accent/20 items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="font-bold text-xs uppercase tracking-widest">System Online</span>
            </div>
          </div>
        </header>

        {/* Compact Stats Grid - Mobile only layout vs Desktop spacious */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8 mb-10">
          {[
            { label: 'Total Revenue', value: '৳12,400', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50' },
            { label: 'Appointments', value: upcomingToday.length.toString(), icon: Users, color: 'text-primary', bg: 'bg-primary/5' },
            { label: 'Pending Task', value: pendingApprovals.length.toString(), icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
            { label: 'Monthly Growth', value: '+12.5%', icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/5' },
          ].map((stat, i) => (
            <Card key={i} className="rounded-2xl md:rounded-[2rem] border-none shadow-sm md:hover:shadow-md transition-shadow">
              <CardContent className="p-4 md:p-8 flex items-center gap-3 md:gap-6">
                <div className={cn("w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-3xl flex items-center justify-center shrink-0 shadow-sm", stat.bg, stat.color)}>
                  <stat.icon className="w-5 h-5 md:w-8 md:h-8" />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] md:text-sm font-bold text-slate-400 uppercase md:capitalize tracking-tight md:tracking-normal mb-0.5 md:mb-1 truncate">{stat.label}</div>
                  <div className="text-lg md:text-3xl font-bold truncate">{stat.value}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Area */}
          <div className="lg:col-span-2 space-y-10">
            {/* Pending Approvals */}
            {pendingApprovals.length > 0 && (
              <section className="space-y-6">
                <h2 className="text-sm md:text-xl font-bold flex items-center gap-3 text-slate-900 uppercase md:capitalize tracking-widest md:tracking-normal px-1">
                  <Clock className="w-5 h-5 text-orange-500" />
                  Needs Your Approval
                </h2>
                <div className="space-y-3">
                  {pendingApprovals.map((item) => (
                    <Card key={item.id} className="rounded-2xl border-none shadow-sm md:hover:shadow-md transition-all">
                      <CardContent className="p-3 md:p-6 flex items-center gap-4 md:gap-6">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 text-slate-300 border">
                          <Users className="w-6 h-6 md:w-8 md:h-8" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm md:text-xl truncate text-slate-900">{item.patientName}</h3>
                          <div className="text-[10px] md:text-sm text-slate-500 flex items-center gap-2 mt-1 font-medium">
                            {item.type === 'Video Call' ? <Video className="w-3 h-3 md:w-4 md:h-4" /> : <MessageSquare className="w-3 h-3 md:w-4 md:h-4" />}
                            {item.time} • ৳ {item.fee}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-10 h-10 md:w-12 md:h-12 rounded-xl text-destructive hover:bg-destructive/10"
                            onClick={() => handleCancel(item.id)}
                          >
                            <X className="w-5 h-5 md:w-6 md:h-6" />
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-10 md:h-12 rounded-xl bg-accent hover:bg-accent/90 px-4 md:px-8 text-[10px] md:text-sm font-bold shadow-lg shadow-accent/20"
                            onClick={() => handleApprove(item.id)}
                          >
                            Approve
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Schedule */}
            <section className="space-y-6">
              <h2 className="text-sm md:text-xl font-bold flex items-center gap-3 text-slate-900 uppercase md:capitalize tracking-widest md:tracking-normal px-1">
                <Calendar className="w-5 h-5 text-primary" />
                Live Consultation Queue
              </h2>
              <div className="space-y-3">
                {upcomingToday.map((item) => (
                  <Card key={item.id} className="rounded-2xl border-none shadow-sm group md:hover:shadow-lg transition-all">
                    <CardContent className="p-4 md:p-8 flex items-center gap-4 md:gap-8">
                      <div className="w-12 h-12 md:w-20 md:h-20 rounded-2xl md:rounded-3xl overflow-hidden shrink-0 border-2 border-slate-50 group-hover:border-primary/20 transition-colors">
                        <img src={`https://picsum.photos/seed/pat_${item.id}/160/160`} alt="Patient" className="object-cover w-full h-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-sm md:text-2xl truncate text-slate-900">{item.patientName}</h3>
                          <Badge className="bg-primary text-white border-none text-[8px] md:text-xs font-bold h-4 md:h-6 px-2 md:px-3">TODAY</Badge>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-6">
                          <div className="text-[10px] md:text-base text-slate-500 font-medium flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" /> {item.time}
                          </div>
                          <div className="text-[10px] md:text-base text-slate-400 font-medium italic truncate max-w-[200px] md:max-w-xs">
                            "{item.notes || 'Routine follow-up'}"
                          </div>
                        </div>
                      </div>
                      <Button className="h-10 md:h-14 rounded-xl md:rounded-2xl font-bold text-[10px] md:text-base px-5 md:px-10 shadow-lg shadow-primary/20 gap-2 md:gap-3 shrink-0">
                        {item.type === 'Video Call' ? <Video className="w-4 h-4 md:w-6 md:h-6" /> : <MessageSquare className="w-4 h-4 md:w-6 md:h-6" />}
                        Start Session
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>

          {/* AI Insights & Tools */}
          <div className="space-y-10">
            <section className="space-y-5">
              <h2 className="text-xs md:text-base font-bold text-slate-400 md:text-slate-900 uppercase md:capitalize tracking-widest md:tracking-normal px-1">AI Triage Insights</h2>
              <div className="space-y-4">
                {pendingReports.map((report) => (
                  <Card key={report.id} className="rounded-2xl border-none shadow-sm border-l-4 border-l-accent overflow-hidden md:hover:shadow-md transition-shadow">
                    <CardContent className="p-5 md:p-6">
                      <div className="flex justify-between items-start mb-3">
                        <div className="min-w-0">
                          <div className="font-bold text-sm md:text-lg truncate text-slate-900">{report.patient}</div>
                          <div className="text-[10px] md:text-xs text-slate-400 font-bold">{report.time} ago</div>
                        </div>
                        <Badge className={cn("text-[8px] md:text-xs font-bold rounded-lg px-2 h-5 md:h-7", 
                          report.risk === 'High' ? 'bg-destructive/10 text-destructive' : 'bg-orange-100 text-orange-700'
                        )}>
                          {report.risk} RISK
                        </Badge>
                      </div>
                      <p className="text-[10px] md:text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">{report.symptoms}</p>
                      <Button variant="outline" size="sm" className="w-full rounded-xl text-[10px] md:text-sm font-bold h-10 border-slate-200 hover:bg-slate-50 transition-colors">Review Case Data</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <Card className="rounded-[2rem] border-none bg-slate-900 text-white p-6 lg:p-8 shadow-2xl">
              <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest mb-6 opacity-60 text-center">Clinical Toolkit</h3>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {[
                  { label: 'Set Hours', icon: Clock, color: 'text-primary' },
                  { label: 'E-Prescription', icon: FileText, color: 'text-accent' },
                  { label: 'Patients', icon: Users, color: 'text-blue-400' },
                  { label: 'Withdraw', icon: DollarSign, color: 'text-emerald-400' }
                ].map((tool, i) => (
                  <Button key={i} variant="ghost" className="flex-col h-auto py-5 md:py-8 bg-white/5 hover:bg-white/10 rounded-2xl md:rounded-3xl gap-3 border-none transition-all">
                    <tool.icon className={cn("w-6 h-6 md:w-8 md:h-8", tool.color)} />
                    <span className="text-[10px] md:text-sm font-bold">{tool.label}</span>
                  </Button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Mobile nav already handled in Navigation component */}
    </div>
  );
}
