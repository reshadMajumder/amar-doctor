
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, ArrowLeft, Clock, Activity, AlertTriangle, 
  CheckCircle, Stethoscope, Share2, Download 
} from "lucide-react";
import { AiMedicalIntakeSummaryOutput } from "@/ai/flows/ai-medical-intake-summary";
import { cn } from "@/lib/utils";

export default function ReportPage() {
  const [report, setReport] = useState<AiMedicalIntakeSummaryOutput | null>(null);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("latest_report");
    if (saved) {
      setReport(JSON.parse(saved));
    }
  }, []);

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Activity className="w-12 h-12 text-primary animate-pulse mx-auto" />
          <p className="text-slate-500 font-medium">Loading your health report...</p>
        </div>
      </div>
    );
  }

  const riskColors = {
    Low: "bg-accent/10 text-accent",
    Moderate: "bg-yellow-100 text-yellow-700",
    High: "bg-orange-100 text-orange-700",
    Critical: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-8 pb-24 md:pt-24 min-h-screen bg-[#f6f8fa]">
      <Navigation />
      
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" className="rounded-full gap-2" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="rounded-full"><Share2 className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" className="rounded-full"><Download className="w-4 h-4" /></Button>
        </div>
      </div>

      <header className="mb-8 text-center">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20">
          <FileText className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Medical Intake Summary</h1>
        <p className="text-slate-500">Prepared for your consultation</p>
      </header>

      {report.emergencyWarning && (
        <div className="bg-destructive text-white p-6 rounded-[2rem] mb-8 shadow-lg shadow-destructive/20 flex gap-4 items-start">
          <AlertTriangle className="w-8 h-8 shrink-0" />
          <div>
            <h2 className="font-bold text-lg mb-1">Emergency Alert</h2>
            <p className="text-sm opacity-90">{report.emergencyMessage || "Based on your symptoms, please seek immediate medical attention."}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="rounded-[1.5rem] border-none shadow-sm text-center py-6">
          <Clock className="w-6 h-6 text-slate-400 mx-auto mb-2" />
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Duration</div>
          <div className="text-lg font-bold">{report.duration}</div>
        </Card>
        <Card className="rounded-[1.5rem] border-none shadow-sm text-center py-6">
          <Activity className="w-6 h-6 text-slate-400 mx-auto mb-2" />
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Severity</div>
          <div className="text-lg font-bold">{report.severity}</div>
        </Card>
        <Card className="rounded-[1.5rem] border-none shadow-sm text-center py-6">
          <Badge className={cn("mx-auto mb-2 rounded-full px-4", riskColors[report.riskLevel])}>
            {report.riskLevel} Risk
          </Badge>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Risk Level</div>
          <div className="text-lg font-bold">{report.riskLevel}</div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-white border-b px-8 py-6">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-accent" />
              Symptoms Identified
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex flex-wrap gap-2 mb-6">
              {report.extractedSymptoms.map((s, i) => (
                <Badge key={i} variant="secondary" className="rounded-full px-4 py-1.5 text-sm">
                  {s}
                </Badge>
              ))}
            </div>
            <p className="text-slate-600 leading-relaxed italic">
              "{report.symptomsSummary}"
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-white border-b px-8 py-6">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Detailed Medical Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
              {report.medicalSummary}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-primary/20 shadow-lg bg-primary/5 p-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center shrink-0">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-bold text-xl mb-1">Recommendation</h3>
              <p className="text-slate-600 mb-6">{report.recommendation}</p>
              <Button size="lg" className="rounded-full px-10 h-14 text-lg" onClick={() => router.push('/doctors')}>
                Book a Doctor Now
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-12 text-center p-6 border border-dashed rounded-[2rem] text-slate-400 text-xs">
        Disclaimer: This AI-generated report is for information purposes only. It is not a diagnosis. 
        Please share this report with a licensed medical professional.
      </div>
    </div>
  );
}
