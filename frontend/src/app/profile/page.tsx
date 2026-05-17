"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  User, Mail, Stethoscope, ShieldCheck, 
  DollarSign, Activity, CheckCircle2, AlertTriangle, 
  Loader2, Sparkles, Clock, ArrowLeft, Heart, Award
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { user, updateProfile, fetchFreshProfile, loading } = useAuth();
  const { toast } = useToast();
  
  const [updating, setUpdating] = useState(false);
  
  // Editable form states
  const [fullName, setFullName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [isAvailable, setIsAvailable] = useState(false);

  // Sync initial state from user object
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setSpecialization(user.specialization || "");
      setConsultationFee(user.consultation_fee ? parseFloat(user.consultation_fee).toString() : "");
      setIsAvailable(!!user.is_available);
    }
  }, [user]);

  // Load fresh details from API on mount
  useEffect(() => {
    fetchFreshProfile();
  }, [fetchFreshProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const payload: any = { full_name: fullName };

      if (user?.role === "doctor") {
        payload.specialization = specialization;
        payload.consultation_fee = parseFloat(consultationFee) || 0;
        payload.is_available = isAvailable;
      }

      await updateProfile(payload);
      toast({
        title: "Profile Updated",
        description: "Your changes have been saved successfully."
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error Saving Profile",
        description: err.message || "Failed to update profile details."
      });
    } finally {
      setUpdating(false);
    }
  };

  // Immediate toggle handler for availability
  const handleAvailabilityToggle = async (checked: boolean) => {
    setIsAvailable(checked);
    try {
      await updateProfile({ is_available: checked });
      toast({
        title: checked ? "You are now Online" : "You are now Offline",
        description: checked 
          ? "Patients can now book instant consultations." 
          : "You will not receive new consultation requests."
      });
    } catch (err: any) {
      setIsAvailable(!checked); // Revert on failure
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update availability status."
      });
    }
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <span className="text-sm font-semibold text-slate-500">Loading profile data...</span>
        </div>
      </div>
    );
  }

  const isDoctor = user?.role === "doctor";

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 md:pb-12">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 pt-6 md:pt-24">
        {/* Back Link */}
        <div className="mb-6">
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Profile Card Header */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-10 mb-8 flex flex-col md:flex-row items-center gap-6 justify-between overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left z-10">
            <div className={cn(
              "w-20 h-20 md:w-24 md:h-24 rounded-3xl flex items-center justify-center font-bold text-2xl md:text-4xl text-white shadow-lg",
              isDoctor ? "bg-accent shadow-accent/20" : "bg-primary shadow-primary/20"
            )}>
              {user?.full_name?.charAt(0) || "U"}
            </div>
            
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
                <h1 className="text-xl md:text-3xl font-bold text-slate-900 leading-tight">
                  {user?.full_name}
                </h1>
                <Badge className={cn(
                  "font-bold uppercase text-[9px] tracking-wider border-none px-2.5 py-0.5",
                  isDoctor ? "bg-accent text-white" : "bg-primary text-white"
                )}>
                  {user?.role}
                </Badge>
              </div>
              <p className="text-sm font-medium text-slate-400 flex items-center gap-1.5 justify-center md:justify-start">
                <Mail className="w-4 h-4" /> {user?.email}
              </p>
              
              {isDoctor && (
                <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start pt-1">
                  <Badge variant="outline" className="text-[10px] font-bold border-slate-200 text-slate-500 bg-slate-50">
                    BMDC: {user.bmdc_number || "N/A"}
                  </Badge>
                  
                  {/* Verification Status Badge */}
                  {user.verification_status === "approved" ? (
                    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200/50 flex items-center gap-1 text-[9px] font-bold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Clinical Verified
                    </Badge>
                  ) : user.verification_status === "pending" ? (
                    <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-200/50 flex items-center gap-1 text-[9px] font-bold animate-pulse">
                      <Clock className="w-3 h-3 text-amber-600" /> Awaiting Review
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border border-rose-200/50 flex items-center gap-1 text-[9px] font-bold">
                      <AlertTriangle className="w-3 h-3 text-rose-600" /> Unverified
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Doctor Available Toggle */}
          {isDoctor && (
            <Card className="w-full md:w-auto min-w-[200px] border-none bg-slate-50 p-4 rounded-2xl flex items-center justify-between shadow-inner gap-6 z-10">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Consultations</div>
                <div className={cn(
                  "text-sm font-bold",
                  isAvailable ? "text-accent" : "text-slate-400"
                )}>
                  {isAvailable ? "Online & Active" : "Offline / Idle"}
                </div>
              </div>
              <Switch 
                checked={isAvailable}
                onCheckedChange={handleAvailabilityToggle}
                className="data-[state=checked]:bg-accent"
              />
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-50 px-8 py-6">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
                  <User className={cn("w-5 h-5", isDoctor ? "text-accent" : "text-primary")} />
                  <span>Profile Information</span>
                </CardTitle>
                <CardDescription>Update your personal details below.</CardDescription>
              </CardHeader>
              
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    {/* Full Name */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-0.5">Full Name</Label>
                      <Input 
                        placeholder="John Doe" 
                        className="h-12 rounded-2xl border-slate-200"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>

                    {/* Email (Disabled) */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-0.5">Email Address</Label>
                      <div className="relative">
                        <Input 
                          type="email"
                          placeholder="name@example.com" 
                          className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 text-slate-400 cursor-not-allowed"
                          value={user?.email || ""}
                          disabled
                        />
                        <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      </div>
                    </div>

                    {/* Doctor Specific Info */}
                    {isDoctor && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {/* Specialization */}
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-0.5">Specialization</Label>
                          <div className="relative">
                            <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <Input 
                              placeholder="e.g. Cardiology" 
                              className="h-12 pl-11 rounded-2xl border-slate-200"
                              value={specialization}
                              onChange={(e) => setSpecialization(e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        {/* Consultation Fee */}
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-0.5">Consultation Fee (BDT)</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <Input 
                              type="number"
                              min="0"
                              placeholder="500" 
                              className="h-12 pl-11 rounded-2xl border-slate-200"
                              value={consultationFee}
                              onChange={(e) => setConsultationFee(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    size="lg" 
                    className={cn(
                      "w-full md:w-auto h-12 rounded-2xl font-bold px-8 shadow-lg shrink-0",
                      isDoctor 
                        ? "bg-accent hover:bg-accent/90 shadow-accent/20" 
                        : "bg-primary hover:bg-primary/90 shadow-primary/20"
                    )}
                    disabled={updating}
                  >
                    {updating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving changes...
                      </>
                    ) : "Save Settings"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
            {/* Account Metadata / Wallet */}
            <Card className="rounded-[2.2rem] border-none shadow-sm bg-white overflow-hidden p-6 md:p-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Account Overview</h3>
              
              {!isDoctor ? (
                <div className="space-y-6">
                  {/* Patient Wallet */}
                  <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
                    <div className="text-[10px] font-bold text-primary mb-1 uppercase tracking-widest">Active Wallet</div>
                    <div className="text-2xl font-bold text-slate-900">৳ 700.00</div>
                    <div className="text-[10px] text-slate-400 font-semibold mt-1">bKash, Nagad deposits active</div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-400 uppercase">Verification</span>
                      <span className="text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> VERIFIED
                      </span>
                    </div>
                    <div className="h-px bg-slate-50" />
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-400 uppercase">Consults done</span>
                      <span className="text-slate-700">12 Appointments</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Doctor Earning Card */}
                  <div className="p-5 rounded-2xl bg-accent/5 border border-accent/10">
                    <div className="text-[10px] font-bold text-accent mb-1 uppercase tracking-widest">Consultations Rate</div>
                    <div className="text-2xl font-bold text-slate-900">৳ {consultationFee || "0.00"}</div>
                    <div className="text-[10px] text-slate-400 font-semibold mt-1">Earned per appointment</div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-400 uppercase">Verification</span>
                      <span className={cn(
                        "flex items-center gap-1",
                        user.verification_status === "approved" ? "text-emerald-500" : "text-amber-500"
                      )}>
                        {user.verification_status === "approved" ? "APPROVED" : "PENDING"}
                      </span>
                    </div>
                    <div className="h-px bg-slate-50" />
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-400 uppercase">Consultations</span>
                      <span className="text-slate-700">{user.is_available ? "Active" : "Idle"}</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Health / Clinic Advice */}
            <Card className="rounded-[2.2rem] border-none bg-slate-950 text-white p-6 md:p-8 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-5 h-5 text-accent shrink-0" />
                <h3 className="text-xs font-bold uppercase tracking-widest">Medical Insights</h3>
              </div>
              
              <p className="text-xs text-slate-400 leading-relaxed font-medium mb-4">
                {!isDoctor 
                  ? "Describe your symptoms clearly using the AI Triage. Connecting doctors will review your AI report before beginning consultations to ensure high-fidelity diagnostic accuracy."
                  : "Keep your availability status updated in real-time. Online doctors are prioritized on the triage patient boards to ensure maximum clinical matching speed."}
              </p>

              <Badge className="bg-white/10 hover:bg-white/15 border-none font-bold text-[9px] uppercase tracking-wider py-1 px-3">
                {!isDoctor ? "Patient Guidelines" : "Doctor Guidelines"}
              </Badge>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
