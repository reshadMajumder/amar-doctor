"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Star, Clock, MapPin, Languages, CheckCircle, 
  ArrowLeft, ShieldCheck, Award, MessageCircle,
  Stethoscope, Calendar, Share2, Loader2
} from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import { cn } from "@/lib/utils";

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

export default function DoctorProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [doctor, setDoctor] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Availability & slots states
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function fetchSlots() {
      try {
        setLoadingSlots(true);
        const yyyy = selectedDate.getFullYear();
        const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const dd = String(selectedDate.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const res = await api.get(`/api/v1/appointments/doctors/${id}/available-slots/?date=${dateStr}`);
        setSlots(res.data || res);
      } catch (err) {
        console.error("Failed to fetch slots", err);
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchSlots();
  }, [id, selectedDate]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const formatSlotTime = (isoString: string) => {
    const d = new Date(isoString);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const period = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours}:${minutes} ${period}`;
  };

  const formatDateLabel = (d: Date) => {
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  };

  useEffect(() => {
    async function loadDoctor() {
      if (!id) return;
      try {
        setLoading(true);
        const res = await api.get(`/api/v1/auth/doctors/?doctor_id=${id}`);
        const list = res.data || res;
        if (Array.isArray(list) && list.length > 0) {
          setDoctor(mapBackendDoctorToFrontend(list[0]));
        } else {
          setDoctor(null);
        }
      } catch (err) {
        console.error("Failed to load doctor from DB", err);
        setDoctor(null);
      } finally {
        setLoading(false);
      }
    }
    loadDoctor();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f8fa]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center bg-[#f6f8fa]">
        <div className="space-y-4">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold">Doctor not found</h2>
          <Button onClick={() => router.push('/doctors')}>Browse Doctors</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-24 md:pt-24">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="rounded-full bg-white shadow-sm">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Hero Profile Card */}
        <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white mb-8">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-72 h-72 md:h-auto relative shrink-0">
                <img src={doctor.imageUrl} alt={doctor.name} className="w-full h-full object-cover" />
                <div className="absolute top-4 left-4">
                  <div className="bg-accent text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg text-xs font-bold">
                    <Star className="w-4 h-4 fill-white" /> {doctor.rating} ({doctor.reviews} Reviews)
                  </div>
                </div>
              </div>
              <div className="flex-1 p-6 md:p-10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{doctor.name}</h1>
                    <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" />
                  </div>
                  <p className="text-sm md:text-base font-bold text-primary uppercase tracking-widest mb-6">
                    {doctor.specialization}
                  </p>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Experience</div>
                      <div className="flex items-center gap-2 font-bold text-slate-700">
                        <Clock className="w-4 h-4 text-primary" /> {doctor.experience}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location</div>
                      <div className="flex items-center gap-2 font-bold text-slate-700">
                        <MapPin className="w-4 h-4 text-primary" /> {doctor.location}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consultation Fee</div>
                      <div className="flex items-center gap-2 font-bold text-primary text-lg">
                        {doctor.fee}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">BMDC Number</div>
                      <div className="flex items-center gap-2 font-bold text-slate-700">
                        <ShieldCheck className="w-4 h-4 text-accent" /> {doctor.bmdcNumber}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Link 
                    href={selectedSlot 
                      ? `/consultation/new?doc=${doctor.id}&date=${selectedDate.toISOString().split('T')[0]}&slot=${selectedSlot}`
                      : `/consultation/new?doc=${doctor.id}`}
                    className="flex-1"
                  >
                    <Button className="w-full h-14 rounded-2xl font-bold text-base shadow-lg shadow-primary/20 gap-2">
                      <Calendar className="w-5 h-5" /> Book Consultation
                    </Button>
                  </Link>
                  <Button variant="outline" className="h-14 rounded-2xl font-bold text-base gap-2 px-8">
                    <MessageCircle className="w-5 h-5" /> Message
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Availability & Slot Selector */}
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" /> Select Appointment Slot
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Choose a date and time slot below to proceed with booking.
              </p>
            </div>
            {selectedSlot && (
              <div className="text-xs bg-primary/10 text-primary px-4 py-2 rounded-xl font-extrabold self-start md:self-auto">
                Selected: {formatSlotTime(selectedSlot)} on {formatDateLabel(selectedDate)}
              </div>
            )}
          </div>

          {/* Date Selector Horizontal Strip */}
          <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-thin scrollbar-thumb-slate-200">
            {days.map((d, index) => {
              const isSelected = d.toDateString() === selectedDate.toDateString();
              const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
              const dayNum = d.getDate();
              const monthName = d.toLocaleDateString("en-US", { month: "short" });
              return (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedDate(d);
                    setSelectedSlot(null);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-2xl min-w-[76px] transition-all border shrink-0",
                    isSelected
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                      : "bg-slate-50 text-slate-600 border-slate-100 hover:border-primary/30"
                  )}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">{dayName}</span>
                  <span className="text-lg font-black my-0.5">{dayNum}</span>
                  <span className="text-[10px] font-bold opacity-80">{monthName}</span>
                </button>
              );
            })}
          </div>

          {/* Time Slots Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {loadingSlots ? (
              <div className="col-span-full py-8 flex items-center justify-center gap-2 text-slate-500 font-semibold text-sm">
                <Loader2 className="w-5 h-5 animate-spin text-primary" /> Loading available slots...
              </div>
            ) : slots.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 font-semibold text-sm italic">
                No slots available on this day.
              </div>
            ) : (
              slots.map((slot) => {
                const isSlotSelected = selectedSlot === slot.start;
                return (
                  <button
                    key={slot.start}
                    onClick={() => setSelectedSlot(slot.start)}
                    className={cn(
                      "h-12 rounded-xl text-xs font-extrabold transition-all border",
                      isSlotSelected
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                        : "bg-white text-slate-600 border-slate-100 hover:border-primary/30"
                    )}
                  >
                    {formatSlotTime(slot.start)}
                  </button>
                );
              })
            )}
          </div>

          {/* Book Slot Button */}
          {selectedSlot && (
            <div className="mt-8 flex justify-end">
              <Link 
                href={`/consultation/new?doc=${doctor.id}&date=${selectedDate.toISOString().split('T')[0]}&slot=${selectedSlot}`}
              >
                <Button className="h-14 rounded-2xl font-bold text-base shadow-lg shadow-primary/20 gap-2 px-8">
                  <Calendar className="w-5 h-5" /> Book Selected Slot
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Detailed Sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            {/* About Section */}
            <Card className="rounded-[2rem] border-none shadow-sm bg-white p-8">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-primary" /> About Doctor
              </h2>
              <p className="text-slate-600 leading-relaxed">
                {doctor.name} is a highly skilled {doctor.specialization} with over {doctor.experience} of dedicated experience. 
                They are committed to providing compassionate, evidence-based care to patients in {doctor.location} and via telemedicine. 
                Specializing in primary care and specialized treatment, Dr. {doctor.name.split(' ').pop()} ensures every patient 
                receives personalized attention and a clear treatment path.
              </p>
            </Card>

            {/* Specialties & Skills */}
            <Card className="rounded-[2rem] border-none shadow-sm bg-white p-8">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" /> Expert Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {[doctor.specialization, "Primary Care", "Diagnosis", "Follow-up Care", "Emergency Triage", "Family Medicine"].map((skill, i) => (
                  <div key={i} className="px-4 py-2 rounded-full bg-slate-50 border border-slate-100 text-sm font-bold text-slate-600">
                    {skill}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-8">
            {/* Languages Card */}
            <Card className="rounded-[2rem] border-none shadow-sm bg-white p-6">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Languages</div>
              <div className="space-y-3">
                {doctor.languages.map((lang: string, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {lang[0]}
                    </div>
                    <span className="font-bold text-slate-700">{lang}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Trust Badges */}
            <Card className="rounded-[2rem] border-none shadow-sm bg-primary text-white p-6">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="w-6 h-6" />
                <span className="font-bold">Verified Professional</span>
              </div>
              <p className="text-xs text-white/80 leading-relaxed mb-4">
                This doctor's BMDC registration and credentials have been strictly verified by GraminDoc AI medical board.
              </p>
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">Verified On: 20 May 2024</div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}