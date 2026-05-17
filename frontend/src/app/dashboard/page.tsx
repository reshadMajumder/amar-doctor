
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Stethoscope, MessageSquare, Calendar, 
  Bell, ChevronRight, Activity, Plus, Wallet, 
  FileText, ShieldCheck, ArrowRight, Video
} from "lucide-react";
import { CONSULTATIONS, DOCTORS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [hasReport, setHasReport] = useState(false);

  useEffect(() => {
    const report = localStorage.getItem("latest_report");
    if (report) setHasReport(true);
  }, []);

  const upcomingConsultations = CONSULTATIONS.filter(c => c.status === 'Upcoming' || c.status === 'Pending Approval');

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navigation />
      
      <div className="max-w-5xl mx-auto px-4 pt-4 pb-24 md:pt-24 min-h-screen">
        {/* Header */}
        <header className="flex justify-between items-center mb-6 md:mb-10">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 md:text-xl">A</div>
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-slate-900 leading-tight">Ariful Islam</h1>
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
              {DOCTORS.map(doc => (
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
