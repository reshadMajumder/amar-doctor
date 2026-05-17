"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

import { 
  FileText, ArrowLeft, Clock, Activity, AlertTriangle, 
  CheckCircle, Stethoscope, Share2, Download, Loader2, Star 
} from "lucide-react";
import { cn } from "@/lib/utils";

type DjangoReport = {
  id: number;
  extracted_symptoms: string[];
  symptom_duration: string;
  severity_level: string;
  follow_up_answers: Record<string, string>;
  emergency_flags: string[];
  ai_summary: string;
  risk_category: string;
  recommended_specialization: string;
  triage_score: number | null;
  ai_confidence_score: number | null;
  generated_at: string;
  session: number;
  patient: number;
};

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

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<DjangoReport | null>(null);
  const [suggestedDoctors, setSuggestedDoctors] = useState<any[]>([]);

  useEffect(() => {
    if (!reportId) return;

    async function fetchReport() {
      try {
        setLoading(true);
        const data = await api.get(`/api/v1/triage/reports/${reportId}/`);
        setReport(data);
        localStorage.setItem("latest_report_id", String(data.id));
        localStorage.setItem("latest_report", JSON.stringify(data));
      } catch (err: any) {
        console.error("Failed to load report", err);
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [reportId]);

  // Fetch Recommended Specialists from the DB
  useEffect(() => {
    if (!report) return;
    const rawSpec = report.recommended_specialization || "General Physician";
    const isEmergencySpec = ['er', 'emergency', 'emergency room', 'icu', 'ccu'].includes(rawSpec.toLowerCase().trim());
    const recSpec = isEmergencySpec ? "General Physician" : rawSpec;

    async function fetchSpecialists() {
      try {
        const res = await api.get(`/api/v1/auth/doctors/?specialization=${encodeURIComponent(recSpec)}`);
        const list = res.data || res;
        
        if (Array.isArray(list)) {
          setSuggestedDoctors(list.map(mapBackendDoctorToFrontend));
        } else {
          setSuggestedDoctors([]);
        }
      } catch (err) {
        console.error("Failed to fetch backend doctors", err);
        setSuggestedDoctors([]);
      }
    }

    fetchSpecialists();
  }, [report]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <p className="text-slate-500 font-bold text-sm uppercase tracking-wider">Compiling clinical results...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="p-8 rounded-[2.5rem] border-none shadow-xl text-center max-w-sm bg-white space-y-6">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-800">Report Not Found</h2>
            <p className="text-sm text-slate-400 font-semibold leading-relaxed">We could not retrieve the clinical details for this session.</p>
          </div>
          <Button className="rounded-full px-8" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const recommendedSpec = report.recommended_specialization || "General Physician";

  // Adapter mapping Django REST payload to existing props
  const mappedReport = {
    emergencyWarning: report.risk_category === "emergency" || (report.emergency_flags && report.emergency_flags.length > 0),
    emergencyMessage: report.emergency_flags && report.emergency_flags.length > 0 
      ? report.emergency_flags.join(", ") 
      : "Based on identified high-risk symptoms, seek emergency clinical care immediately.",
    duration: report.symptom_duration || "Unknown duration",
    severity: report.severity_level || "Unknown",
    riskLevel: report.risk_category 
      ? (report.risk_category.charAt(0).toUpperCase() + report.risk_category.slice(1)) 
      : "Low",
    extractedSymptoms: report.extracted_symptoms || [],
    symptomsSummary: report.ai_summary ? (report.ai_summary.substring(0, 150) + "...") : "No symptoms summary available.",
    medicalSummary: report.ai_summary || "No detailed summary available.",
    recommendation: `We recommend booking a consultation with a specialist in ${recommendedSpec}.`
  };

  const riskColors: Record<string, string> = {
    Low: "bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200/50",
    Medium: "bg-yellow-50 text-yellow-700 hover:bg-yellow-50 border border-yellow-200/50",
    High: "bg-orange-50 text-orange-700 hover:bg-orange-50 border border-orange-200/50",
    Emergency: "bg-red-50 text-red-700 hover:bg-red-50 border border-red-200/50",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-8 pb-24 md:pt-24 min-h-screen bg-[#f6f8fa]">
      <Navigation />
      
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" className="rounded-full gap-2 font-bold text-slate-500" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="rounded-full bg-white"><Share2 className="w-4 h-4 text-slate-500" /></Button>
          <Button variant="outline" size="icon" className="rounded-full bg-white"><Download className="w-4 h-4 text-slate-500" /></Button>
        </div>
      </div>

      <header className="mb-8 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20 relative z-10">
          <FileText className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 relative z-10">Medical Intake Summary</h1>
        <p className="text-sm font-semibold text-slate-400 mt-1 relative z-10">Prepared via AI Clinical Triage System</p>
      </header>

      {mappedReport.emergencyWarning && (
        <Card className="bg-red-50 border border-red-200 p-6 rounded-[2rem] mb-8 shadow-md shadow-red-200/5 flex gap-4 items-start animate-pulse">
          <AlertTriangle className="w-8 h-8 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="font-bold text-lg text-red-950">Emergency Clinical Alert</h2>
            <p className="text-sm font-medium text-red-800 leading-relaxed">{mappedReport.emergencyMessage}</p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="rounded-[1.8rem] border-none shadow-sm text-center py-6 bg-white">
          <Clock className="w-6 h-6 text-slate-400 mx-auto mb-2" />
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Duration</div>
          <div className="text-base md:text-lg font-bold text-slate-800">{mappedReport.duration}</div>
        </Card>
        <Card className="rounded-[1.8rem] border-none shadow-sm text-center py-6 bg-white">
          <Activity className="w-6 h-6 text-slate-400 mx-auto mb-2" />
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Severity</div>
          <div className="text-base md:text-lg font-bold text-slate-800 uppercase tracking-wider">{mappedReport.severity}</div>
        </Card>
        <Card className="rounded-[1.8rem] border-none shadow-sm text-center py-6 bg-white flex flex-col justify-center items-center">
          <Badge className={cn("mx-auto mb-2 rounded-full px-4 border text-[10px] font-bold uppercase", riskColors[mappedReport.riskLevel] || "bg-slate-50 text-slate-700")}>
            {mappedReport.riskLevel}
          </Badge>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Risk Category</div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-white border-b border-slate-50 px-8 py-6">
            <CardTitle className="text-base md:text-lg flex items-center gap-2 text-slate-900 font-bold">
              <CheckCircle className="w-5 h-5 text-accent" />
              Symptoms Identified
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex flex-wrap gap-2 mb-6">
              {mappedReport.extractedSymptoms.map((s, i) => (
                <Badge key={i} variant="secondary" className="rounded-full px-4 py-1.5 text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-100">
                  {s}
                </Badge>
              ))}
              {mappedReport.extractedSymptoms.length === 0 && (
                <span className="text-xs text-slate-400 italic">No symptoms extracted.</span>
              )}
            </div>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed italic font-medium">
              "{mappedReport.symptomsSummary}"
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-white border-b border-slate-50 px-8 py-6">
            <CardTitle className="text-base md:text-lg flex items-center gap-2 text-slate-900 font-bold">
              <FileText className="w-5 h-5 text-primary" />
              Detailed Medical Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <p className="text-xs md:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
              {mappedReport.medicalSummary}
            </p>
          </CardContent>
        </Card>

        {/* Dynamic Specialist suggestion block */}
        <Card className="rounded-[2.2rem] border-primary/20 shadow-lg bg-primary/5 p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row items-center gap-6 pb-6 border-b border-primary/10">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/10">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 text-center md:text-left space-y-1">
              <h3 className="font-bold text-base md:text-lg text-slate-900">AI Medical Routing Advice</h3>
              <p className="text-xs md:text-sm text-slate-600 font-semibold leading-relaxed">{mappedReport.recommendation}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-xs md:text-sm text-slate-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary shrink-0" />
              Suggested {recommendedSpec} Specialists
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestedDoctors.map((doc) => (
                <Card key={doc.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-all flex gap-3 relative overflow-hidden">
                  <div className="absolute top-2.5 right-2.5 bg-accent/10 text-accent text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 fill-accent stroke-accent" /> {doc.rating}
                  </div>
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-slate-100 bg-slate-50">
                    <img src={doc.imageUrl} alt={doc.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs md:text-sm text-slate-800 truncate">{doc.name}</span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{doc.specialization}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-extrabold text-primary">{doc.fee}</span>
                      <div className="flex gap-1">
                        <Link href={`/doctors/${doc.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 rounded-lg px-2.5 text-[10px] font-bold text-slate-500">Profile</Button>
                        </Link>
                        <Link href={`/consultation/new?doc=${doc.id}`}>
                          <Button size="sm" className="h-8 rounded-lg px-3 text-[10px] font-bold shadow-sm shadow-primary/5">Book</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-12 text-center p-6 border border-dashed rounded-[2rem] text-slate-400 text-[10px] uppercase font-bold tracking-wider">
        Disclaimer: This AI-generated report is for intake information purposes only. It is not a formal diagnosis. 
        Please share this report with your licensed medical professional.
      </div>
    </div>
  );
}
