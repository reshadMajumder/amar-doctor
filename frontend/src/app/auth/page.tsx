"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { 
  Stethoscope, Mail, Lock, User, 
  ArrowRight, Loader2, ShieldCheck, 
  Smartphone, Award, KeyRound
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type AuthMode = "login" | "register" | "forgot";
type UserRole = "patient" | "doctor";
type LoginMethod = "password" | "otp";
type Step = "form" | "otp-verify" | "reset-password";

export default function AuthPage() {
  const { 
    login, 
    requestLoginOtp, 
    registerPatient, 
    registerDoctor, 
    verifyRegistrationOtp,
    requestPasswordReset,
    verifyPasswordResetOtp,
    confirmPasswordReset
  } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>("login");
  const [role, setRole] = useState<UserRole>("patient");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("password");
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [bmdcNumber, setBmdcNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetToken, setResetToken] = useState("");

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. REGISTRATION SUBMIT
      if (mode === "register" && step === "form") {
        if (role === "patient") {
          await registerPatient({
            email,
            password,
            confirm_password: password, // patient endpoint requires confirm
            full_name: fullName
          });
        } else {
          await registerDoctor({
            email,
            password,
            full_name: fullName,
            specialization,
            bmdc_number: bmdcNumber
          });
        }
        setStep("otp-verify");
        toast({ 
          title: "Verification Code Sent", 
          description: `A 6-digit registration code has been sent to ${email}` 
        });
        setLoading(false);
        return;
      }

      // 2. REGISTRATION OTP VERIFICATION
      if (mode === "register" && step === "otp-verify") {
        await verifyRegistrationOtp(email, otp);
        toast({ 
          title: "Welcome to GraminDoc AI!", 
          description: "Your email has been verified successfully." 
        });
        return;
      }

      // 3. LOGIN SUBMIT (PASSWORD)
      if (mode === "login" && loginMethod === "password") {
        await login(email, password, undefined, "password");
        toast({ 
          title: "Welcome Back!", 
          description: "Logged in successfully." 
        });
        return;
      }

      // 4. LOGIN REQUEST (OTP)
      if (mode === "login" && loginMethod === "otp" && step === "form") {
        await requestLoginOtp(email);
        setStep("otp-verify");
        toast({ 
          title: "OTP Sent", 
          description: `Verification code sent to ${email}` 
        });
        setLoading(false);
        return;
      }

      // 5. LOGIN OTP VERIFICATION
      if (mode === "login" && loginMethod === "otp" && step === "otp-verify") {
        await login(email, undefined, otp, "otp");
        toast({ 
          title: "Welcome Back!", 
          description: "Logged in successfully with OTP." 
        });
        return;
      }

      // 6. PASSWORD RESET REQUEST
      if (mode === "forgot" && step === "form") {
        await requestPasswordReset(email);
        setStep("otp-verify");
        toast({
          title: "Password Reset Sent",
          description: `A password reset code has been sent to ${email}`
        });
        setLoading(false);
        return;
      }

      // 7. PASSWORD RESET OTP VERIFY
      if (mode === "forgot" && step === "otp-verify") {
        const res = await verifyPasswordResetOtp(email, otp);
        if (res && res.reset_token) {
          setResetToken(res.reset_token);
          setStep("reset-password");
          toast({
            title: "Code Verified",
            description: "Please enter your new password."
          });
        }
        setLoading(false);
        return;
      }

      // 8. PASSWORD RESET CONFIRM
      if (mode === "forgot" && step === "reset-password") {
        await confirmPasswordReset(email, resetToken, newPassword);
        toast({
          title: "Success",
          description: "Password reset completed! You can now log in."
        });
        setMode("login");
        setStep("form");
        setLoginMethod("password");
        setPassword("");
        setLoading(false);
        return;
      }

    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "An error occurred during authentication."
      });
    } finally {
      // In success redirect flows, loading state persists until routing takes over
      if (step !== "otp-verify" && !(mode === "login" && loginMethod === "password")) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8fa] flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center mb-4 shadow-lg">
          <Stethoscope className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">GraminDoc AI</h1>
        <p className="text-slate-500 font-medium bangla-text">সহজ এবং দ্রুত টেলিমেডিসিন</p>
      </div>

      <Card className="w-full max-w-md rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
        <CardHeader className="text-center pt-8 pb-4">
          <Tabs 
            value={mode} 
            onValueChange={(v) => { 
              setMode(v as AuthMode); 
              setStep("form"); 
              setLoginMethod("password"); 
            }} 
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 rounded-2xl h-12 bg-slate-100 p-1">
              <TabsTrigger value="login" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold">Login</TabsTrigger>
              <TabsTrigger value="register" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold">Register</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="px-8 pb-10">
          {step === "form" && (mode === "login" || mode === "register") ? (
            <form onSubmit={handleAuthAction} className="space-y-6">
              {/* Role Selection */}
              <div className="grid grid-cols-2 gap-3 p-1 bg-slate-50 rounded-2xl border border-slate-100">
                <button
                  type="button"
                  onClick={() => setRole("patient")}
                  className={cn(
                    "flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
                    role === "patient" ? "bg-white shadow-sm text-primary" : "text-slate-400"
                  )}
                >
                  <User className="w-4 h-4" /> Patient
                </button>
                <button
                  type="button"
                  onClick={() => setRole("doctor")}
                  className={cn(
                    "flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
                    role === "doctor" ? "bg-white shadow-sm text-accent" : "text-slate-400"
                  )}
                >
                  <Award className="w-4 h-4" /> Doctor
                </button>
              </div>

              <div className="space-y-4">
                {mode === "register" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <Input 
                        placeholder="John Doe" 
                        className="h-12 pl-12 rounded-2xl border-slate-200"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <Input 
                      type="email"
                      placeholder="name@example.com" 
                      className="h-12 pl-12 rounded-2xl border-slate-200"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {role === "doctor" && mode === "register" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Specialization</Label>
                      <div className="relative">
                        <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                        <Input 
                          placeholder="e.g. Cardiology" 
                          className="h-12 pl-12 rounded-2xl border-slate-200"
                          value={specialization}
                          onChange={(e) => setSpecialization(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">BMDC Number</Label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                        <Input 
                          placeholder="BMDC-123456" 
                          className="h-12 pl-12 rounded-2xl border-slate-200"
                          value={bmdcNumber}
                          onChange={(e) => setBmdcNumber(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {(mode === "register" || (mode === "login" && loginMethod === "password")) && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <Input 
                        type="password"
                        placeholder="••••••••" 
                        className="h-12 pl-12 rounded-2xl border-slate-200"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              {mode === "login" && (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-end">
                    <button 
                      type="button" 
                      onClick={() => { setMode("forgot"); setStep("form"); }}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-slate-100" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Or</span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-12 rounded-2xl border-slate-200 font-bold gap-2"
                    onClick={() => setLoginMethod(loginMethod === "password" ? "otp" : "password")}
                  >
                    {loginMethod === "password" ? <Smartphone className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    {loginMethod === "password" ? "Login with OTP" : "Login with Password"}
                  </Button>
                </div>
              )}

              <Button size="lg" className={cn("w-full h-14 rounded-2xl text-lg gap-2 shadow-lg", role === "doctor" ? "bg-accent hover:bg-accent/90 shadow-accent/20" : "bg-primary shadow-primary/20")} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : (mode === "login" ? "Login" : "Register")} 
                {!loading && <ArrowRight className="w-5 h-5" />}
              </Button>
            </form>
          ) : step === "otp-verify" ? (
            <div className="space-y-8 py-4">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Enter Verification Code</h3>
                <p className="text-sm text-slate-500 mt-2">We've sent a 6-digit code to {email}.</p>
              </div>

              <div className="space-y-4">
                <Input 
                  className="h-14 text-center text-2xl font-bold tracking-[0.75em] rounded-2xl border-slate-200 pl-4"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                />

                <Button size="lg" className="w-full h-14 rounded-2xl text-lg font-bold" onClick={handleAuthAction} disabled={loading || otp.length < 6}>
                  {loading ? <Loader2 className="animate-spin" /> : "Verify & Continue"}
                </Button>
                
                <button 
                  type="button" 
                  onClick={() => { setStep("form"); setOtp(""); }}
                  className="w-full text-center text-primary font-bold text-sm hover:underline"
                >
                  Change Email or Options
                </button>
              </div>
            </div>
          ) : mode === "forgot" && step === "form" ? (
            <form onSubmit={handleAuthAction} className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Reset Password</h3>
                <p className="text-sm text-slate-500 mt-2">Enter your email and we'll send you an OTP code to reset.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <Input 
                    type="email"
                    placeholder="name@example.com" 
                    className="h-12 pl-12 rounded-2xl border-slate-200"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Button size="lg" className="w-full h-14 rounded-2xl text-lg font-bold" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : "Send Reset Code"}
                </Button>
                <button 
                  type="button" 
                  onClick={() => { setMode("login"); setStep("form"); }}
                  className="w-full text-center text-slate-400 font-bold text-sm hover:underline"
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : mode === "forgot" && step === "reset-password" ? (
            <form onSubmit={handleAuthAction} className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold">New Password</h3>
                <p className="text-sm text-slate-500 mt-2">Enter your new secure password below.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <Input 
                    type="password"
                    placeholder="••••••••" 
                    className="h-12 pl-12 rounded-2xl border-slate-200"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Button size="lg" className="w-full h-14 rounded-2xl text-lg font-bold" disabled={loading || newPassword.length < 8}>
                  {loading ? <Loader2 className="animate-spin" /> : "Reset & Log In"}
                </Button>
              </div>
            </form>
          ) : null}

          <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" />
            <span>Secure 256-bit encryption</span>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 flex gap-4">
        <button className="text-sm font-bold text-slate-600 px-4 py-2 bg-white rounded-full shadow-sm">English</button>
        <button className="text-sm font-bold text-primary px-4 py-2 bg-white rounded-full shadow-sm bangla-text">বাংলা</button>
      </div>
    </div>
  );
}
