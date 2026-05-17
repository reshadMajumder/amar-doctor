"use client";

import { Navigation } from "@/components/layout/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Clock, Filter } from "lucide-react";
import { TRANSACTIONS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function WalletPage() {
  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-24 md:pt-24 min-h-screen">
        <header className="mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold">My Wallet</h1>
          <p className="text-xs md:text-sm text-slate-500">Manage your balance and consultation payments</p>
        </header>

        {/* Balance Card */}
        <Card className="rounded-[2rem] md:rounded-[2.5rem] border-none bg-primary text-white shadow-xl shadow-primary/20 overflow-hidden relative mb-8 md:mb-10">
          <div className="absolute -right-10 -top-10 w-32 h-32 md:w-40 md:h-40 bg-white/10 rounded-full blur-2xl md:blur-3xl" />
          <CardContent className="p-8 md:p-10 relative">
            <div className="flex justify-between items-start mb-8 md:mb-10">
              <div>
                <div className="text-[10px] md:text-xs font-bold text-white/70 uppercase tracking-widest mb-2">Available Balance</div>
                <div className="text-3xl md:text-5xl font-bold">৳ 700.00</div>
              </div>
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-white/20 flex items-center justify-center shrink-0">
                <Wallet className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 rounded-xl md:rounded-2xl h-12 md:h-14 flex-1 font-bold gap-2 text-sm md:text-base">
                <Plus className="w-5 h-5" /> Add Money
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-xl md:rounded-2xl h-12 md:h-14 flex-1 font-bold text-sm md:text-base">
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Section */}
        <section className="space-y-4 md:space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-bold">Recent Transactions</h2>
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
              <Filter className="w-5 h-5 text-slate-400" />
            </Button>
          </div>

          <div className="space-y-3 md:space-y-4">
            {TRANSACTIONS.map((tx) => (
              <Card key={tx.id} className="rounded-2xl md:rounded-[1.5rem] border-none shadow-sm hover:shadow-md transition-all bg-white">
                <CardContent className="p-4 md:p-6 flex items-center gap-4 md:gap-6">
                  <div className={cn(
                    "w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0",
                    tx.type === 'Credit' ? "bg-green-50 text-green-500" : "bg-red-50 text-red-500"
                  )}>
                    {tx.type === 'Credit' ? <ArrowDownLeft className="w-5 h-5 md:w-6 md:h-6" /> : <ArrowUpRight className="w-5 h-5 md:w-6 md:h-6" />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="font-bold text-sm md:text-base text-slate-900 truncate">{tx.description}</div>
                    <div className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium">
                      <Clock className="w-3 h-3" /> {tx.date}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={cn(
                      "font-bold text-sm md:text-lg",
                      tx.type === 'Credit' ? "text-green-600" : "text-slate-900"
                    )}>
                      {tx.type === 'Credit' ? '+' : '-'}{tx.amount}
                    </div>
                    <div className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{tx.status}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
