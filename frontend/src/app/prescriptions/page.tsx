
"use client";

import { Navigation } from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Share2, Search, Calendar, Stethoscope, ChevronRight } from "lucide-react";
import { PRESCRIPTIONS } from "@/lib/mock-data";

export default function PrescriptionsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 pt-8 pb-24 md:pt-24 min-h-screen bg-[#f6f8fa]">
      <Navigation />

      <header className="mb-8">
        <h1 className="text-2xl font-bold">My Prescriptions</h1>
        <p className="text-slate-500">Access your digital health records</p>
      </header>

      <div className="space-y-6">
        {PRESCRIPTIONS.map((prescription) => (
          <Card key={prescription.id} className="rounded-[2rem] border-none shadow-md overflow-hidden bg-white">
            <CardContent className="p-0">
              <div className="p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Digital Prescription</h3>
                      <p className="text-sm text-slate-500 flex items-center gap-1">
                        <Calendar className="w-4 h-4" /> {prescription.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="rounded-xl font-bold gap-2">
                      <Download className="w-4 h-4" /> PDF
                    </Button>
                    <Button className="rounded-xl font-bold gap-2 shadow-lg shadow-primary/10">
                      View Details <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs">
                      <Stethoscope className="w-4 h-4" /> Prescribed By
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-slate-800">
                      {prescription.doctorName}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-accent font-bold uppercase tracking-widest text-xs">
                      <FileText className="w-4 h-4" /> Diagnosis
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 italic">
                      {prescription.diagnosis}
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-dashed">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Medications</div>
                  <div className="flex flex-wrap gap-2">
                    {prescription.medicines.map((med, i) => (
                      <div key={i} className="px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-bold border border-blue-100">
                        {med.name} - {med.dosage}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {PRESCRIPTIONS.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-600">No prescriptions found</h3>
          <p className="text-slate-400">Digital prescriptions will appear here after your consultations.</p>
        </div>
      )}
    </div>
  );
}
