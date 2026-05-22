"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { 
  Stethoscope, Calendar as CalendarIcon, Clock, 
  Video, MessageSquare, ChevronRight, ArrowLeft,
  FileText, CheckCircle2, Wallet, Loader2, AlertCircle, ShieldCheck
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

function formatSlotTime(isoString: string): string {
  const d = new Date(isoString);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${period}`;
}

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
  return {
    id: String(backendDoc.user.id),
    name: backendDoc.user.full_name.startsWith("Dr.") ? backendDoc.user.full_name : `Dr. ${backendDoc.user.full_name}`,
    specialization: backendDoc.specialization,
    fee: `৳ ${parseFloat(backendDoc.consultation_fee).toFixed(0)}`,
    availability: backendDoc.is_available ? "Available Today" : "Offline",
    bmdcNumber: backendDoc.bmdc_number
  };
}

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const docId = searchParams.get("doc");
  const [doctor, setDoctor] = useState<any | null>(null);
  const [loadingDoctor, setLoadingDoctor] = useState(true);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [consultType, setConsultType] = useState<"Video Call" | "Chat">("Video Call");
  const [notes, setNotes] = useState("");
  const [includeReport, setIncludeReport] = useState(false);
  const [hasReport, setHasReport] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  
  const [slots, setSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  
  // Track whether this is the first slot fetch (from URL params) so we don't clear preselected slot
  const isInitialLoad = useRef(true);

  useEffect(() => {
    const paramDate = searchParams.get("date");
    const paramSlot = searchParams.get("slot");
    if (paramDate) {
      // Parse date in a timezone-safe way — treat YYYY-MM-DD as local noon
      const [y, m, d] = paramDate.split("-").map(Number);
      const parsed = new Date(y, m - 1, d, 12, 0, 0);
      if (!isNaN(parsed.getTime())) {
        setDate(parsed);
      }
    }
    if (paramSlot) {
      setSelectedSlot(paramSlot);
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadDoctorAndWallet() {
      if (!docId) {
        setLoadingDoctor(false);
        return;
      }
      try {
        setLoadingDoctor(true);
        
        // Fetch doctor info
        const doctorRes = await api.get(`/api/v1/auth/doctors/?doctor_id=${docId}`);
        const list = doctorRes.data || doctorRes;
        if (Array.isArray(list) && list.length > 0) {
          setDoctor(mapBackendDoctorToFrontend(list[0]));
        } else {
          setDoctor(null);
        }

        // Fetch wallet balance
        const walletRes = await api.get("/api/v1/wallets/me/");
        const walletData = walletRes.data || walletRes;
        if (walletData && walletData.available_balance !== undefined) {
          setWalletBalance(parseFloat(walletData.available_balance).toFixed(2));
        }
      } catch (err) {
        console.error("Failed to load consultation page data", err);
        setDoctor(null);
      } finally {
        setLoadingDoctor(false);
      }
    }

    loadDoctorAndWallet();

    const savedReport = localStorage.getItem("latest_report");
    if (savedReport) setHasReport(true);
  }, [docId]);

  useEffect(() => {
    if (!docId) return;
    const activeDate = date || new Date();
    // Only reset slot selection on user-initiated date changes (not initial URL param load)
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
    } else {
      setSelectedSlot(null);
    }

    async function fetchSlots() {
      try {
        setLoadingSlots(true);
        setSlots([]);
        // Build date string from local calendar date components (not UTC)
        const yyyy = activeDate.getFullYear();
        const mm = String(activeDate.getMonth() + 1).padStart(2, "0");
        const dd = String(activeDate.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const res = await api.get(`/api/v1/appointments/doctors/${docId}/available-slots/?date=${dateStr}`);
        const list = res.data || res;
        setSlots(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Failed to fetch slots", err);
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }

    fetchSlots();
  }, [docId, date]);

  const handleBook = async () => {
    if (!selectedSlot) {
      toast({
        title: "Selection Required",
        description: "Please select an available time slot for your consultation.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsBooking(true);

      let reportIdToAttach = null;
      if (includeReport) {
        reportIdToAttach = localStorage.getItem("latest_report_id");
      }

      const apptPayload = {
        doctor: Number(docId),
        scheduled_start: selectedSlot,
        consultation_type: consultType === "Video Call" ? "video" : "text",
        ai_report: reportIdToAttach ? Number(reportIdToAttach) : null,
        notes: notes || ""
      };

      const apptResponse = await api.post("/api/v1/appointments/", apptPayload);
      const appointment = apptResponse.data || apptResponse;

      if (!appointment || !appointment.id) {
        throw new Error("Invalid response received from appointment creation.");
      }

      const paymentPayload = {
        appointment_id: appointment.id
      };

      const paymentResponse = await api.post("/api/v1/payments/", paymentPayload);
      const payment = paymentResponse.data || paymentResponse;

      if (payment && payment.payment_url) {
        toast({
          title: "Redirecting to Payment",
          description: "Please complete your payment securely via SSLCommerz."
        });
        
        setTimeout(() => {
          window.location.href = payment.payment_url;
        }, 1000);
      } else {
        throw new Error("Payment session initialization failed.");
      }

    } catch (err: any) {
      console.error("Booking process failed:", err);
      toast({
        title: "Booking Failed",
        description: err.message || err.detail || "An unexpected error occurred during checkout.",
        variant: "destructive"
      });
    } finally {
      setIsBooking(false);
    }
  };

  if (loadingDoctor) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <Stethoscope className="w-7 h-7 text-primary absolute top-[18px] animate-pulse" />
          <h2 className="text-xl font-bold text-slate-800 mt-2">Setting Up Your Consultation</h2>
          <p className="text-sm text-slate-500 max-w-xs">Connecting securely to fetch doctor profile, availability slots, and wallet details...</p>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
        <div className="space-y-5 max-w-sm bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Doctor Profile Not Found</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            The requested doctor profile might be suspended, pending verification, or unavailable at this moment.
          </p>
          <Button onClick={() => router.push('/doctors')} className="w-full h-12 rounded-xl font-bold">
            Browse Approved Doctors
          </Button>
        </div>
      </div>
    );
  }

  const initials = doctor.name
    .replace("Dr. ", "")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6 pb-24 md:pt-16 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="icon" className="rounded-full bg-white hover:bg-slate-50 border-slate-100 shadow-sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 text-slate-700" />
        </Button>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Consultation Checkout</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Form Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Doctor Info Card */}
          <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white relative">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Stethoscope className="w-40 h-40" />
            </div>
            <CardContent className="p-6 md:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl bg-indigo-50 flex items-center justify-center text-indigo-700 font-extrabold text-2xl shrink-0">
                {initials}
              </div>
              <div className="text-center sm:text-left flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
                  <h2 className="text-2xl font-black tracking-tight">{doctor.name}</h2>
                  {doctor.bmdcNumber && (
                    <span className="inline-flex items-center self-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur-md">
                      BMDC: {doctor.bmdcNumber}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-indigo-200 mt-1 uppercase tracking-widest">{doctor.specialization}</p>
                
                <div className="flex flex-wrap gap-4 items-center justify-center sm:justify-start mt-4 text-xs font-bold text-white/90">
                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Verified Professional</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                    <div className={cn("w-2 h-2 rounded-full shrink-0 animate-pulse", doctor.availability === "Available Today" ? "bg-emerald-400" : "bg-slate-300")} />
                    <span>{doctor.availability}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Selection */}
          <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2.5 font-extrabold text-slate-800">
                <CalendarIcon className="w-5 h-5 text-primary" />
                Select Date & Time
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Select your convenient date and choose from the live available slots.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-8 justify-start items-center md:items-start">
                <div className="border border-slate-100 rounded-2xl p-3 bg-slate-50 shadow-inner flex-shrink-0 w-full sm:w-auto flex justify-center">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-md border-0 bg-transparent text-slate-800"
                    disabled={(date) => date < new Date() || date > new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)}
                  />
                </div>
                
                <div className="flex-1 w-full">
                  <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 block flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-primary" /> Available Slots
                  </Label>
                  
                  {loadingSlots ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400 border border-dashed rounded-2xl bg-slate-50/30">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-xs font-bold text-slate-500">Loading real-time availability...</span>
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="py-12 text-center border border-dashed border-slate-100 rounded-2xl bg-slate-50/50 space-y-3">
                      <div className="text-3xl">📅</div>
                      <div className="text-sm font-bold text-slate-700">No Slots Available</div>
                      <p className="text-xs text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                        The doctor has not scheduled availability for this date.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                      {slots.map((slot) => {
                        const isSelected = selectedSlot === slot.start;
                        return (
                          <button
                            key={slot.start}
                            onClick={() => setSelectedSlot(slot.start)}
                            className={cn(
                              "h-12 rounded-xl text-xs font-extrabold transition-all border flex items-center justify-center gap-2 whitespace-nowrap px-3",
                              isSelected
                                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                                : "bg-white text-slate-600 border-slate-100 hover:border-primary/30 hover:bg-primary/5 active:scale-95 shadow-sm"
                            )}
                          >
                            <Clock className={cn("w-3.5 h-3.5", isSelected ? "text-white" : "text-slate-400")} />
                            <span>{formatSlotTime(slot.start)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  
                  {selectedSlot && (
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-primary bg-primary/5 border border-primary/10 rounded-xl px-4 py-3">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" />
                      <span>Selected Schedule: {formatSlotTime(selectedSlot)}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consultation Details */}
          <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2.5 font-extrabold text-slate-800">
                <Video className="w-5 h-5 text-primary" />
                Consultation Details
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Choose your consultation format and provide medical symptoms context.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Connection Method</Label>
                <RadioGroup 
                  defaultValue={consultType} 
                  onValueChange={(v) => setConsultType(v as any)}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="Video Call" id="video" className="peer sr-only" />
                    <Label
                      htmlFor="video"
                      className="flex-1 flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-slate-100 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer hover:bg-slate-50/50 transition-all select-none shadow-sm"
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                        <Video className="w-6 h-6 text-blue-600" />
                      </div>
                      <span className="font-extrabold text-slate-800">Video Consultation</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Requires camera & mic</span>
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="Chat" id="chat" className="peer sr-only" />
                    <Label
                      htmlFor="chat"
                      className="flex-1 flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-slate-100 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer hover:bg-slate-50/50 transition-all select-none shadow-sm"
                    >
                      <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-indigo-600" />
                      </div>
                      <span className="font-extrabold text-slate-800">Chat Consultation</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Perfect for text & reports</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {hasReport && (
                <div className={cn(
                  "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 select-none shadow-sm hover:shadow-md",
                  includeReport ? "border-emerald-500 bg-emerald-50/30" : "border-slate-100 bg-slate-50/50"
                )} onClick={() => setIncludeReport(!includeReport)}>
                  <div className={cn(
                     "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                     includeReport ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-slate-200 text-slate-400"
                  )}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="font-extrabold text-slate-800">Attach AI Triage Report</div>
                    <div className="text-xs text-slate-500">Provide automatically generated symptom details</div>
                  </div>
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    includeReport ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300"
                  )}>
                    {includeReport && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Additional Context (Optional)</Label>
                <Textarea 
                  placeholder="Describe your symptoms, medical history, or ask specific questions..." 
                  className="rounded-2xl border-slate-200 h-28 focus-visible:ring-primary shadow-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Checkout Invoice Summary */}
        <div className="space-y-6 lg:sticky lg:top-24">
          <Card className="rounded-3xl border-none shadow-md bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-50 bg-slate-50/50 pb-5">
              <CardTitle className="text-lg font-extrabold text-slate-800">Booking Summary</CardTitle>
              <CardDescription className="text-xs text-slate-400">Review fees before redirection.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between text-sm font-bold text-slate-600">
                  <span>Consultation Fee</span>
                  <span>{doctor.fee}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-600">
                  <span>Service Fee</span>
                  <span>৳ 20</span>
                </div>
                <div className="border-t border-slate-50 pt-4 flex justify-between items-center">
                  <span className="font-extrabold text-slate-800">Total Bill</span>
                  <span className="font-black text-2xl text-primary">{doctor.fee.replace('৳', '৳ ')}</span>
                </div>
              </div>

              <div className="bg-slate-50/80 border border-slate-100 p-4 rounded-2xl flex flex-col justify-center gap-1.5 shadow-inner">
                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <Wallet className="w-3.5 h-3.5 text-slate-400" />
                  <span>Wallet Balance</span>
                </div>
                <div className="text-lg font-black text-slate-800">
                  {walletBalance === null ? (
                    <span className="text-slate-400 text-xs font-medium animate-pulse">Loading wallet balance...</span>
                  ) : (
                    `৳ ${walletBalance}`
                  )}
                </div>
              </div>

              <Button 
                className="w-full h-14 rounded-2xl text-md font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/95 text-white flex items-center justify-center gap-2 group transition-all"
                onClick={handleBook}
                disabled={isBooking}
              >
                {isBooking ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Confirm & Pay</span>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
              
              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold tracking-tight">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>SSL Secured Transaction</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function BookConsultationPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navigation />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }>
        <BookingContent />
      </Suspense>
    </div>
  );
}
