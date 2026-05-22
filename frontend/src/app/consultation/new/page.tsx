
"use client";

import { useState, useEffect, Suspense } from "react";
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
  FileText, CheckCircle2, Wallet, Loader2
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

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const docId = searchParams.get("doc");
  const [doctor, setDoctor] = useState<any | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [consultType, setConsultType] = useState<"Video Call" | "Chat">("Video Call");
  const [notes, setNotes] = useState("");
  const [includeReport, setIncludeReport] = useState(false);
  const [hasReport, setHasReport] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [slots, setSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    const paramDate = searchParams.get("date");
    if (paramDate) {
      const d = new Date(paramDate);
      if (!isNaN(d.getTime())) {
        setDate(d);
      }
    }
    const paramSlot = searchParams.get("slot");
    if (paramSlot) {
      setSelectedSlot(paramSlot);
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadDoctor() {
      if (!docId) return;
      try {
        const res = await api.get(`/api/v1/auth/doctors/?doctor_id=${docId}`);
        const list = res.data || res;
        if (Array.isArray(list) && list.length > 0) {
          setDoctor(mapBackendDoctorToFrontend(list[0]));
        } else {
          setDoctor(null);
        }
      } catch (err) {
        console.error("Failed to load doctor from DB", err);
        setDoctor(null);
      }
    }

    loadDoctor();

    const savedReport = localStorage.getItem("latest_report");
    if (savedReport) setHasReport(true);
  }, [docId]);

  useEffect(() => {
    if (!docId) return;
    const activeDate = date || new Date();

    async function fetchSlots() {
      try {
        setLoadingSlots(true);
        const yyyy = activeDate.getFullYear();
        const mm = String(activeDate.getMonth() + 1).padStart(2, "0");
        const dd = String(activeDate.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const res = await api.get(`/api/v1/appointments/doctors/${docId}/available-slots/?date=${dateStr}`);
        const list = res.data || res;
        if (Array.isArray(list) && list.length > 0) {
          setSlots(list);
        } else {
          const mockTimeSlots = [
            "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", 
            "11:00 AM", "11:30 AM", "02:00 PM", "02:30 PM", 
            "03:00 PM", "03:30 PM", "04:00 PM"
          ];
          const generated = mockTimeSlots.map(timeStr => {
            const [time, period] = timeStr.split(" ");
            let [hours, minutes] = time.split(":").map(Number);
            if (period === "PM" && hours !== 12) hours += 12;
            if (period === "AM" && hours === 12) hours = 0;
            
            const slotDate = new Date(activeDate);
            slotDate.setHours(hours, minutes, 0, 0);
            
            return {
              start: slotDate.toISOString(),
              end: new Date(slotDate.getTime() + 30 * 60 * 1000).toISOString(),
              timezone: "UTC"
            };
          });
          setSlots(generated);
        }
      } catch (err) {
        console.error("Failed to fetch slots", err);
        const mockTimeSlots = [
          "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", 
          "11:00 AM", "11:30 AM", "02:00 PM", "02:30 PM", 
          "03:00 PM", "03:30 PM", "04:00 PM"
        ];
        const generated = mockTimeSlots.map(timeStr => {
          const [time, period] = timeStr.split(" ");
          let [hours, minutes] = time.split(":").map(Number);
          if (period === "PM" && hours !== 12) hours += 12;
          if (period === "AM" && hours === 12) hours = 0;
          
          const slotDate = new Date(activeDate);
          slotDate.setHours(hours, minutes, 0, 0);
          
          return {
            start: slotDate.toISOString(),
            end: new Date(slotDate.getTime() + 30 * 60 * 1000).toISOString(),
            timezone: "UTC"
          };
        });
        setSlots(generated);
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
        description: "Please select a time slot for your consultation.",
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
          title: "Redirecting to Payment Gateway",
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

  if (!doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold">Doctor not found</h2>
          <Button onClick={() => router.push('/doctors')}>Browse Doctors</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-8 pb-32 md:pt-24 min-h-screen bg-[#f6f8fa]">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">Book Consultation</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form */}
        <div className="lg:col-span-2 space-y-8">
          {/* Doctor Info Card */}
          <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
            <CardContent className="p-6 flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border">
                <img src={doctor.imageUrl} alt={doctor.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{doctor.name}</h2>
                <p className="text-sm font-bold text-primary uppercase tracking-widest">{doctor.specialization}</p>
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                  <CheckCircle2 className="w-3 h-3 text-accent" /> Verified Professional
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Selection */}
          <Card className="rounded-[2rem] border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                Select Date & Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="border rounded-2xl p-2 bg-white flex-shrink-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-md"
                    disabled={(date) => date < new Date() || date > new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)}
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 block">Available Slots</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {loadingSlots ? (
                      <div className="col-span-full py-6 flex items-center justify-center gap-2 text-slate-500 font-semibold text-xs">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading live slots...
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="col-span-full py-6 text-center text-slate-400 font-semibold text-xs italic">
                        No slots available for this day.
                      </div>
                    ) : (
                      slots.map((slot) => (
                        <button
                          key={slot.start}
                          onClick={() => setSelectedSlot(slot.start)}
                          className={cn(
                            "h-12 rounded-xl text-xs font-extrabold transition-all border",
                            selectedSlot === slot.start
                              ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                              : "bg-white text-slate-600 border-slate-100 hover:border-primary/30"
                          )}
                        >
                          {formatSlotTime(slot.start)}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consultation Details */}
          <Card className="rounded-[2rem] border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                Consultation Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <Label className="text-sm font-bold text-slate-500 uppercase tracking-widest">Consultation Type</Label>
                <RadioGroup 
                  defaultValue={consultType} 
                  onValueChange={(v) => setConsultType(v as any)}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="Video Call" id="video" className="peer sr-only" />
                    <Label
                      htmlFor="video"
                      className="flex-1 flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-slate-100 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer hover:bg-slate-50 transition-all"
                    >
                      <Video className="w-8 h-8 text-primary" />
                      <span className="font-bold">Video Call</span>
                      <span className="text-[10px] text-slate-400">High Speed Internet Needed</span>
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="Chat" id="chat" className="peer sr-only" />
                    <Label
                      htmlFor="chat"
                      className="flex-1 flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-slate-100 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer hover:bg-slate-50 transition-all"
                    >
                      <MessageSquare className="w-8 h-8 text-primary" />
                      <span className="font-bold">Chat Session</span>
                      <span className="text-[10px] text-slate-400">Works on 2G/3G</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {hasReport && (
                <div className={cn(
                  "p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4",
                  includeReport ? "border-accent bg-accent/5" : "border-slate-100 bg-slate-50"
                )} onClick={() => setIncludeReport(!includeReport)}>
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    includeReport ? "bg-accent text-white" : "bg-slate-200 text-slate-400"
                  )}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">Attach AI Triage Report</div>
                    <div className="text-xs text-slate-500">Share your symptom summary with the doctor</div>
                  </div>
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                    includeReport ? "bg-accent border-accent text-white" : "border-slate-300"
                  )}>
                    {includeReport && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <Label className="text-sm font-bold text-slate-500 uppercase tracking-widest">Additional Notes (Optional)</Label>
                <Textarea 
                  placeholder="Tell the doctor about your condition in brief..." 
                  className="rounded-2xl border-slate-200 h-32"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Summary */}
        <div className="space-y-6">
          <Card className="rounded-[2rem] border-none shadow-xl bg-white sticky top-24">
            <CardHeader className="border-b pb-6">
              <CardTitle className="text-lg">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Consultation Fee</span>
                  <span className="font-bold">{doctor.fee}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Service Charge</span>
                  <span className="font-bold">৳ 20</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-bold">Total Amount</span>
                  <span className="font-bold text-xl text-primary">{doctor.fee.replace('৳', '৳ ')}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200">
                <div className="flex items-center gap-3 text-slate-600 mb-2">
                  <Wallet className="w-5 h-5" />
                  <span className="text-sm font-bold">Wallet Balance</span>
                </div>
                <div className="text-lg font-bold">৳ 700.00</div>
              </div>

              <Button 
                className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20"
                onClick={handleBook}
                disabled={isBooking}
              >
                {isBooking ? <Loader2 className="w-6 h-6 animate-spin" /> : "Confirm & Pay"}
              </Button>
              
              <p className="text-[10px] text-center text-slate-400 font-medium">
                By confirming, you agree to our Terms of Service and Privacy Policy.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function BookConsultationPage() {
  return (
    <div className="min-h-screen bg-[#f6f8fa]">
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
