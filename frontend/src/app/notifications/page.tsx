"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/layout/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Calendar, CreditCard, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchNotifications() {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/notifications/');
      const data = res.data || res;
      if (data && Array.isArray(data.results)) {
        setNotifications(data.results);
      } else if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications();
  }, []);

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

  const formatNotifDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-4xl mx-auto px-4 pt-8 pb-24 md:pt-24 min-h-screen bg-[#f6f8fa]">
      <Navigation />

      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-slate-500">Stay updated with your health activities</p>
        </div>
        {unreadCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleMarkAllRead}
            className="text-primary font-bold hover:bg-primary/5 rounded-xl h-10 px-4"
          >
            Mark all as read
          </Button>
        )}
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Retrieving alerts...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif) => (
            <Card 
              key={notif.id} 
              onClick={() => !notif.is_read && handleReadNotif(notif.id)}
              className={cn(
                "rounded-[1.5rem] border-none shadow-sm transition-all hover:shadow-md cursor-pointer",
                !notif.is_read ? "bg-white border-l-4 border-l-primary" : "bg-white/60"
              )}
            >
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                    notif.notification_type === 'booking' ? "bg-blue-50 text-blue-500" :
                    notif.notification_type === 'payment' ? "bg-green-50 text-green-500" : "bg-slate-50 text-slate-500"
                  )}>
                    {notif.notification_type === 'booking' ? <Calendar className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h3 className={cn("font-bold text-slate-900", !notif.is_read ? "text-primary-dark" : "")}>
                        {notif.title}
                      </h3>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                        {formatNotifDate(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{notif.message}</p>
                  </div>
                  {!notif.is_read && (
                    <div className="flex flex-col justify-center">
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && notifications.length === 0 && (
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
