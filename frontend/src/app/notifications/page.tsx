
"use client";

import { Navigation } from "@/components/layout/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Calendar, CreditCard, FileText, Check, MoreVertical } from "lucide-react";
import { NOTIFICATIONS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 pt-8 pb-24 md:pt-24 min-h-screen bg-[#f6f8fa]">
      <Navigation />

      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-slate-500">Stay updated with your health activities</p>
        </div>
        <Button variant="ghost" size="sm" className="text-primary font-bold">Mark all as read</Button>
      </header>

      <div className="space-y-4">
        {NOTIFICATIONS.map((notif) => (
          <Card key={notif.id} className={cn(
            "rounded-[1.5rem] border-none shadow-sm transition-all hover:shadow-md",
            !notif.isRead ? "bg-white border-l-4 border-l-primary" : "bg-white/60"
          )}>
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                  notif.type === 'appointment' ? "bg-blue-50 text-blue-500" :
                  notif.type === 'payment' ? "bg-green-50 text-green-500" :
                  notif.type === 'report' ? "bg-purple-50 text-purple-500" : "bg-slate-50 text-slate-500"
                )}>
                  {notif.type === 'appointment' && <Calendar className="w-6 h-6" />}
                  {notif.type === 'payment' && <CreditCard className="w-6 h-6" />}
                  {notif.type === 'report' && <FileText className="w-6 h-6" />}
                  {notif.type === 'system' && <Bell className="w-6 h-6" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-slate-900">{notif.title}</h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{notif.time}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{notif.message}</p>
                </div>
                {!notif.isRead && (
                  <div className="flex flex-col justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {NOTIFICATIONS.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Bell className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-600">No new notifications</h3>
          <p className="text-slate-400">We'll notify you here for any updates.</p>
        </div>
      )}
    </div>
  );
}
