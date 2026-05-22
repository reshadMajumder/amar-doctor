"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  FileText, Activity, Stethoscope, Plus, 
  Trash2, ArrowLeft, Loader2, Check, AlertCircle,
  HelpCircle, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type MedicineItem = {
  id: number;
  medicine_name: string;
  generic_name?: string;
  dosage: string;
  frequency: string;
  duration: string;
  instruction?: string;
};

type AppointmentDetails = {
  id: number;
  patient_name: string;
  doctor_name: string;
  scheduled_start: string;
  notes: string;
  chat_room_id?: number | null;
  ai_report_details?: {
    risk_category: string;
    ai_summary: string;
  };
};

function PrescriptionNewForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apptId = searchParams.get("appt");

  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [prescriptionId, setPrescriptionId] = useState<number | null>(null);
  
  // Clinical notes states
  const [diagnosisNotes, setDiagnosisNotes] = useState("");
  const [adviceNotes, setAdviceNotes] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [items, setItems] = useState<MedicineItem[]>([]);

  // Medication form inputs
  const [medName, setMedName] = useState("");
  const [medGeneric, setMedGeneric] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFrequency, setMedFrequency] = useState("1+0+1");
  const [medDuration, setMedDuration] = useState("7 days");
  const [medInstruction, setMedInstruction] = useState("after meals");

  const [loading, setLoading] = useState(true);
  const [savingItem, setSavingItem] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    if (!apptId) {
      setLoading(false);
      return;
    }

    async function initializePrescription() {
      try {
        setLoading(true);
        // 1. Fetch appointment details to get patient identity
        const apptRes = await api.get(`/api/v1/appointments/${apptId}/`);
        setAppointment(apptRes);

        // 2. Initialize or fetch existing draft prescription
        const presRes = await api.post("/api/v1/prescriptions/", {
          appointment_id: Number(apptId)
        });
        const presData = presRes;
        
        setPrescriptionId(presData.id);
        setDiagnosisNotes(presData.diagnosis_notes || "");
        setAdviceNotes(presData.advice_notes || "");
        setFollowUpNotes(presData.follow_up_instructions || "");
        setItems(presData.items || []);
      } catch (err) {
        console.error("Failed to initialize prescription", err);
      } finally {
        setLoading(false);
      }
    }

    initializePrescription();
  }, [apptId]);

  async function handleAddMedicine() {
    if (!medName.trim() || !prescriptionId) return;

    try {
      setSavingItem(true);
      const payload = {
        medicine_name: medName.trim(),
        generic_name: medGeneric.trim(),
        dosage: medDosage.trim() || "500mg",
        frequency: medFrequency,
        duration: medDuration.trim(),
        instruction: medInstruction,
        quantity: 1
      };

      const res = await api.post(`/api/v1/prescriptions/${prescriptionId}/items/`, payload);
      setItems((prev) => [...prev, res]);

      // Reset item inputs
      setMedName("");
      setMedGeneric("");
      setMedDosage("");
    } catch (err) {
      console.error("Failed to add medicine item", err);
      alert("Failed to add medicine item to draft.");
    } finally {
      setSavingItem(false);
    }
  }

  async function handleFinalize() {
    if (!prescriptionId) return;

    try {
      setActionInProgress(true);
      // 1. Save all textual notes first via PATCH
      await api.patch(`/api/v1/prescriptions/${prescriptionId}/`, {
        diagnosis_notes: diagnosisNotes.trim(),
        advice_notes: adviceNotes.trim(),
        follow_up_instructions: followUpNotes.trim()
      });

      // 2. Call Finalize endpoint to lock prescription & release Escrow
      await api.post(`/api/v1/prescriptions/${prescriptionId}/finalize/`);

      alert("E-Prescription has been finalized successfully! The patient has been notified.");
      if (appointment?.chat_room_id) {
        router.push(`/chat/${appointment.chat_room_id}`);
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error("Failed to finalize prescription", err);
      alert(err.raw?.error || err.message || "Failed to finalize prescription.");
    } finally {
      setActionInProgress(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Prescription Console...</p>
        </div>
      </div>
    );
  }

  if (!apptId || !appointment || !prescriptionId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-black text-slate-900 mb-2">Invalid Session</h2>
        <p className="text-slate-500 mb-6 max-w-sm">No valid appointment ID was provided for this E-Prescription session.</p>
        <Link href="/dashboard">
          <Button className="rounded-xl"><ArrowLeft className="w-4 h-4 mr-2" /> Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/20 py-8 px-4 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header navigation bar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full bg-white hover:bg-slate-50 shadow-sm"
              onClick={() => {
                if (appointment?.chat_room_id) {
                  router.push(`/chat/${appointment.chat_room_id}`);
                } else {
                  router.push("/dashboard");
                }
              }}
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Prescription Creator</h1>
              <p className="text-sm text-slate-500">Formulating medical guidance for <span className="font-bold text-slate-800">{appointment.patient_name}</span></p>
            </div>
          </div>

          <Button 
            onClick={handleFinalize}
            disabled={actionInProgress || items.length === 0}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl px-6 h-12 shadow-lg shadow-emerald-500/10 gap-2 shrink-0 disabled:bg-slate-100 disabled:text-slate-400"
          >
            {actionInProgress ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Finalize & Lock Prescription
          </Button>
        </header>

        {/* Info panel grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Patient Card info */}
          <Card className="rounded-[2rem] border-none shadow-sm bg-white p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-primary" /> Case Intake File
            </h3>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Patient Name</div>
              <div className="text-base font-extrabold text-slate-800 mt-0.5">{appointment.patient_name}</div>
            </div>
            {appointment.ai_report_details && (
              <div className="bg-amber-50/50 border border-amber-100/50 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">AI Clinical Note</span>
                  <Badge className="text-[8px] uppercase tracking-tighter bg-amber-100 text-amber-700 px-1 py-0">{appointment.ai_report_details.risk_category} Risk</Badge>
                </div>
                <p className="text-[10px] leading-relaxed text-amber-800 italic">
                  "{appointment.ai_report_details.ai_summary}"
                </p>
              </div>
            )}
            <div className="pt-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Consultation Notes</div>
              <div className="text-xs text-slate-500 font-semibold mt-1 bg-slate-50 rounded-xl p-3 border leading-relaxed">
                {appointment.notes || "Direct booking. (No patient complaints logged.)"}
              </div>
            </div>
          </Card>

          {/* Right workspace: Creator Editor inputs */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Medications Builder */}
            <Card className="rounded-[2.2rem] border-none shadow-sm bg-white p-6 md:p-8 space-y-6">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-primary" />
                Medications Rx List
              </h3>

              {/* Added Medicine List */}
              <div className="space-y-2.5">
                {items.map((med, idx) => (
                  <div key={med.id || idx} className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">{med.medicine_name}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                        {med.dosage} • {med.frequency} • {med.duration} • {med.instruction}
                      </div>
                    </div>
                    {med.generic_name && (
                      <Badge variant="secondary" className="text-[9px] font-semibold bg-slate-100 text-slate-500 rounded-md">
                        {med.generic_name}
                      </Badge>
                    )}
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-center py-10 bg-slate-50 rounded-2.5xl border border-dashed text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold uppercase tracking-wider">No medications added yet.</p>
                  </div>
                )}
              </div>

              {/* Add Medicine Inline Form */}
              <div className="bg-slate-50/50 border border-slate-200/50 rounded-[2rem] p-5 space-y-4">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Add Medicine</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Medicine Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Napa Extra" 
                      value={medName}
                      onChange={(e) => setMedName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Generic Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Paracetamol" 
                      value={medGeneric}
                      onChange={(e) => setMedGeneric(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Dosage/Strength</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 500mg" 
                      value={medDosage}
                      onChange={(e) => setMedDosage(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Frequency</label>
                    <select 
                      value={medFrequency}
                      onChange={(e) => setMedFrequency(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    >
                      <option value="1+0+1">1+0+1 (Twice Daily)</option>
                      <option value="1+1+1">1+1+1 (Thrice Daily)</option>
                      <option value="1+0+0">1+0+0 (Morning Only)</option>
                      <option value="0+0+1">0+0+1 (Bedtime Only)</option>
                      <option value="1+1+1+1">1+1+1+1 (Four Times)</option>
                      <option value="as needed">As needed (PRN)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Duration</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 7 days" 
                      value={medDuration}
                      onChange={(e) => setMedDuration(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Instructions</label>
                    <select 
                      value={medInstruction}
                      onChange={(e) => setMedInstruction(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    >
                      <option value="after meals">After Meals</option>
                      <option value="before meals">Before Meals</option>
                      <option value="empty stomach">Empty Stomach</option>
                      <option value="at bedtime">At Bedtime</option>
                    </select>
                  </div>
                </div>

                <Button 
                  onClick={handleAddMedicine}
                  disabled={savingItem || !medName.trim()}
                  className="w-full bg-primary hover:bg-primary/95 text-white font-bold h-9 rounded-xl text-xs gap-1 shadow-sm mt-2 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {savingItem ? (
                    <Loader2 className="w-3 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  Add to Rx List
                </Button>
              </div>

            </Card>

            {/* Diagnostics, Diet, Advices */}
            <Card className="rounded-[2.2rem] border-none shadow-sm bg-white p-6 md:p-8 space-y-6">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" /> Clinical Directives
              </h3>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Diagnosis / Clinical Findings</label>
                  <textarea 
                    rows={3} 
                    placeholder="Enter diagnosis notes..."
                    value={diagnosisNotes}
                    onChange={(e) => setDiagnosisNotes(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary leading-relaxed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dietary / General Advice</label>
                  <textarea 
                    rows={3} 
                    placeholder="Enter dietary or general lifestyle advices..."
                    value={adviceNotes}
                    onChange={(e) => setAdviceNotes(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary leading-relaxed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Follow Up / Emergency Instructions</label>
                  <textarea 
                    rows={2} 
                    placeholder="e.g. Consult after 7 days, or immediately in case of severe symptoms."
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary leading-relaxed"
                  />
                </div>
              </div>
            </Card>

          </div>

        </div>

      </div>
    </div>
  );
}

export default function PrescriptionNewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <PrescriptionNewForm />
    </Suspense>
  );
}
