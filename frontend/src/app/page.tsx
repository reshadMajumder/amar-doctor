import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Stethoscope, ShieldCheck, Zap, ArrowRight, Activity, Clock, Phone, MessageSquare } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function LandingPage() {
  const heroImg = PlaceHolderImages.find(img => img.id === 'hero-mobile');

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 py-4 md:py-6 border-b sticky top-0 bg-white z-50">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-6 h-6 md:w-8 md:h-8 text-primary" />
          <span className="text-lg md:text-xl font-bold text-slate-900">GraminDoc AI</span>
        </div>
        <div className="flex gap-2 md:gap-4 items-center">
          <Button variant="ghost" className="bangla-text font-medium hidden sm:flex">English / বাংলা</Button>
          <Link href="/auth">
            <Button className="rounded-full px-4 md:px-6">Login</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 md:px-6 py-12 md:py-24 bg-gradient-to-b from-[#f0f7ff] to-white overflow-hidden">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 md:space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent font-semibold text-xs md:text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Trusted by 10,000+ rural patients</span>
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight bangla-text">
              ঘরে বসেই বিশেষজ্ঞ ডাক্তারের সেবা নিন
              <span className="text-primary block mt-2 font-body text-2xl md:text-4xl">AI-Assisted Telemedicine</span>
            </h1>
            <p className="text-base md:text-lg text-slate-600 max-w-lg mx-auto lg:mx-0">
              Describe your symptoms to our AI health assistant and get connected to a top doctor in minutes. Simple, fast, and secure.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/auth" className="w-full sm:w-auto">
                <Button size="lg" className="rounded-full w-full h-14 text-base md:text-lg gap-2">
                  Start AI Triage <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/doctors" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="rounded-full w-full h-14 text-base md:text-lg">
                  Find a Doctor
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative flex justify-center lg:justify-end mt-8 lg:mt-0">
            <div className="relative w-[260px] h-[520px] md:w-[320px] md:h-[650px] rounded-[2.5rem] md:rounded-[3rem] border-8 border-slate-900 bg-slate-900 shadow-2xl overflow-hidden">
              {heroImg && (
                <Image
                  src={heroImg.imageUrl}
                  alt={heroImg.description}
                  fill
                  className="object-cover opacity-90"
                  data-ai-hint={heroImg.imageHint}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent flex items-end p-6 md:p-8">
                <div className="bg-white/95 backdrop-blur p-4 rounded-2xl w-full shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Stethoscope className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-[10px] md:text-xs font-bold text-slate-500">AI Assistant</div>
                      <div className="text-xs md:text-sm font-bold">How can I help you today?</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency Notice */}
      <div className="bg-destructive/10 py-3 px-4 md:px-6 text-center text-xs md:text-sm font-medium text-destructive">
        ⚠️ <strong>Emergency?</strong> Please call 999 immediately if you have chest pain, severe bleeding, or difficulty breathing.
      </div>

      {/* How it works */}
      <section className="py-16 md:py-20 px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">How it Works</h2>
          <p className="text-slate-600 text-sm md:text-base">Three simple steps to better health</p>
        </div>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {[
            { title: "Chat with AI", desc: "Our AI asks simple questions to understand your symptoms.", icon: MessageSquare },
            { title: "Get Triage Report", desc: "A structured medical summary is generated for your doctor.", icon: Activity },
            { title: "Connect with Doctor", desc: "Consult a specialist over video or chat in minutes.", icon: Stethoscope }
          ].map((item, i) => (
            <div key={i} className="p-6 md:p-8 rounded-3xl bg-slate-50 border hover:shadow-xl transition-all group">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white border flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                <item.icon className="w-6 h-6 md:w-8 md:h-8 text-primary group-hover:text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2">{item.title}</h3>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-20 bg-slate-50 px-4 md:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-6">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold bangla-text text-center lg:text-left">Designed for Rural Bangladesh</h2>
            <p className="text-base md:text-lg text-slate-600 text-center lg:text-left">We understand the challenges of weak internet and accessibility.</p>
            <div className="space-y-4 max-w-md mx-auto lg:mx-0">
              {[
                { icon: Zap, text: "Optimized for 2G/3G low-speed internet" },
                { icon: Clock, text: "Available 24/7 for urgent consultations" },
                { icon: Phone, text: "Simple phone-based login (No email needed)" }
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-4 bg-white/50 p-3 rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0">
                    <benefit.icon className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-sm md:text-base text-slate-700">{benefit.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-lg border">
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <div className="text-[10px] md:text-sm font-bold text-primary mb-1 uppercase tracking-widest">Frequently Asked</div>
                <div className="text-base md:text-lg font-bold">Is my data secure?</div>
                <div className="text-sm md:text-base text-slate-600 mt-2">Yes, all patient records are encrypted and only accessible by your consulting doctor.</div>
              </div>
              <div className="p-4 rounded-2xl bg-accent/5 border border-accent/10">
                <div className="text-[10px] md:text-sm font-bold text-accent mb-1 uppercase tracking-widest">Payment</div>
                <div className="text-base md:text-lg font-bold">How do I pay?</div>
                <div className="text-sm md:text-base text-slate-600 mt-2">We support bKash, Nagad, and Rocket for easy local payments.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t px-4 md:px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-primary" />
            <span className="font-bold">GraminDoc AI</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-xs md:text-sm text-slate-500 font-medium">
            <Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-primary transition-colors">Contact Us</Link>
          </div>
          <div className="text-[10px] md:text-sm text-slate-400">© 2024 GraminDoc AI. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
