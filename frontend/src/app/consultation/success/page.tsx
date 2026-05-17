
"use client";

import Link from "next/link";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Calendar, Clock, Video, ArrowRight, Share2, Download } from "lucide-react";

export default function BookingSuccessPage() {
  return (
    <div className="min-h-screen bg-[#f6f8fa] flex items-center justify-center p-6">
      <Navigation />
      
      <div className="max-w-md w-full text-center space-y-8">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-accent" />
          </div>
          <div className="absolute top-0 right-1/2 translate-x-12 w-4 h-4 bg-accent rounded-full animate-ping opacity-25" />
        </div>

        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Booking Confirmed!</h1>
          <p className="text-slate-500 font-medium">Your consultation has been successfully scheduled.</p>
        </div>

        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-left p-4 rounded-2xl bg-slate-50">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</div>
                  <div className="font-bold">Monday, 20 May 2026</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-left p-4 rounded-2xl bg-slate-50">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time</div>
                  <div className="font-bold">10:00 AM - 10:30 AM</div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-left p-4 rounded-2xl bg-slate-50">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</div>
                  <div className="font-bold">Video Call</div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-2">
              <Button variant="outline" className="flex-1 rounded-2xl h-12 font-bold gap-2">
                <Download className="w-4 h-4" /> Receipt
              </Button>
              <Button variant="outline" className="flex-1 rounded-2xl h-12 font-bold gap-2">
                <Share2 className="w-4 h-4" /> Share
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Link href="/dashboard" className="block">
            <Button className="w-full h-14 rounded-2xl text-lg font-bold gap-2 shadow-lg shadow-primary/10">
              Go to Dashboard <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <p className="text-xs text-slate-400 font-medium px-8">
            A confirmation SMS and notification has been sent to your registered phone number.
          </p>
        </div>
      </div>
    </div>
  );
}
