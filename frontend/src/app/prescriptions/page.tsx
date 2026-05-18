"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/layout/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, Download, Calendar, 
  Stethoscope, ChevronRight, Loader2,
  ShieldAlert
} from "lucide-react";
import { api, getAccessToken } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type PrescriptionItem = {
  id: number;
  medicine_name: string;
  generic_name?: string;
  dosage: string;
  frequency: string;
  duration: string;
  instruction?: string;
};

type Prescription = {
  id: number;
  appointment?: {
    scheduled_start: string;
    consultation_type: string;
  };
  patient_name?: string;
  doctor_name?: string;
  diagnosis_notes: string;
  advice_notes: string;
  follow_up_instructions: string;
  status: string;
  items: PrescriptionItem[];
  created_at: string;
};

export default function PrescriptionsPage() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    async function fetchPrescriptions() {
      try {
        setLoading(true);
        // If doctor: fetch list of issued prescriptions. If patient: fetch patient list
        const url = user?.role === 'doctor' 
          ? '/api/v1/prescriptions/' 
          : '/api/v1/prescriptions/my-prescriptions/';
          
        const res = await api.get(url);
        const list = res.data || res;
        if (Array.isArray(list)) {
          setPrescriptions(list);
        }
      } catch (err) {
        console.error("Failed to load prescriptions", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPrescriptions();
  }, [user]);

  async function handleDownloadPDF(presId: number) {
    try {
      setDownloadingId(presId);
      const token = getAccessToken();
      const res = await fetch(`http://localhost:8000/api/v1/prescriptions/${presId}/pdf/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error("Could not download PDF");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Prescription_${presId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download PDF", err);
      alert("Failed to download prescription PDF. Ensure it has been finalized.");
    } finally {
      setDownloadingId(null);
    }
  }

  function formatDateTime(isoString: string) {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return "Health Record";
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Health Records...</p>
        </div>
      </div>
    );
  }

  const isDoctor = user?.role === 'doctor';

  return (
    <div className="max-w-4xl mx-auto px-4 pt-8 pb-24 md:pt-24 min-h-screen bg-[#f6f8fa] font-sans">
      <Navigation />

      <header className="mb-8 mt-6">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {isDoctor ? "Issued E-Prescriptions" : "My Health Records"}
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          {isDoctor ? "Review history of digital prescriptions provided to patients" : "Access and download your digital prescriptions"}
        </p>
      </header>

      <div className="space-y-6">
        {prescriptions.map((prescription) => (
          <Card key={prescription.id} className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-0">
              <div className="p-6 md:p-8">
                
                {/* Upper bar: header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                      <FileText className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-base md:text-lg font-extrabold text-slate-900">Digital Prescription</h3>
                      <p className="text-xs text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" /> {formatDateTime(prescription.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2.5 shrink-0">
                    {prescription.status === 'finalized' ? (
                      <Button 
                        onClick={() => handleDownloadPDF(prescription.id)}
                        disabled={downloadingId === prescription.id}
                        variant="outline" 
                        className="rounded-xl font-bold h-10 px-4 gap-2 border-slate-200 hover:bg-slate-50 text-xs shadow-sm"
                      >
                        {downloadingId === prescription.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        Download PDF
                      </Button>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-600 border border-amber-100 rounded-xl px-3 py-1 font-bold text-[10px]">
                        Draft Mode
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Patient/Doctor Diagnosis split details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-primary font-bold uppercase tracking-widest text-[10px]">
                      <Stethoscope className="w-3.5 h-3.5" /> 
                      {isDoctor ? "Patient Profile" : "Prescribed By"}
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-slate-800 text-xs md:text-sm">
                      {isDoctor ? `Patient File: #${prescription.id}` : (prescription.doctor_name || "Specialist Practitioner")}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-accent font-bold uppercase tracking-widest text-[10px]">
                      <FileText className="w-3.5 h-3.5" /> Diagnosis
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 text-xs italic font-medium leading-relaxed min-h-[50px]">
                      {prescription.diagnosis_notes || "Clinical checkup diagnostics."}
                    </div>
                  </div>
                </div>

                {/* Medicine Items List Section */}
                {Array.isArray(prescription.items) && prescription.items.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-dashed">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Medications</div>
                    <div className="flex flex-wrap gap-2">
                      {prescription.items.map((med, i) => (
                        <div key={med.id || i} className="px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                          {med.medicine_name} - {med.dosage} ({med.frequency} • {med.duration})
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {prescriptions.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border border-slate-200/50 p-6 max-w-lg mx-auto mt-12">
          <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-dashed shadow-inner">
            <FileText className="w-10 h-10 text-slate-300 animate-pulse" />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-1">No health records found</h3>
          <p className="text-slate-400 text-xs leading-relaxed max-w-[280px] mx-auto">Your finalized digital prescriptions and certified clinical checkups will be safely listed here.</p>
        </div>
      )}
    </div>
  );
}
