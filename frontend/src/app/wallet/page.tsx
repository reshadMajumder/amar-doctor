"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/layout/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Clock, Filter, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function WalletPage() {
  const [balance, setBalance] = useState<string>("0.00");
  const [pendingBalance, setPendingBalance] = useState<string>("0.00");
  const [walletType, setWalletType] = useState<string>("patient");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Deposit modal state
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);

  useEffect(() => {
    async function loadWalletData() {
      try {
        setLoading(true);
        // Fetch wallet details
        const walletRes = await api.get("/api/v1/wallets/me/");
        if (walletRes) {
          setBalance(walletRes.available_balance || "0.00");
          setPendingBalance(walletRes.pending_balance || "0.00");
          setWalletType(walletRes.wallet_type || "patient");
        }
        
        // Fetch transactions
        const txRes = await api.get("/api/v1/wallets/transactions/");
        if (Array.isArray(txRes)) {
          setTransactions(txRes);
        }
      } catch (err) {
        console.error("Failed to load wallet details", err);
      } finally {
        setLoading(false);
      }
    }
    loadWalletData();
  }, []);

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    try {
      setIsDepositing(true);
      const res = await api.post("/api/v1/wallets/deposit/", { amount: amount.toString() });
      if (res && res.payment_url) {
        setIsDepositOpen(false);
        window.location.href = res.payment_url;
      } else {
        alert("Failed to initialize deposit gateway.");
      }
    } catch (err: any) {
      console.error("Deposit error:", err);
      alert(err.message || "Failed to process deposit.");
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-24 md:pt-24 min-h-screen">
        <header className="mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold">My Wallet</h1>
          <p className="text-xs md:text-sm text-slate-500">Manage your balance and consultation payments</p>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Accessing secure ledger...</p>
          </div>
        ) : (
          <>
            {/* Balance Card */}
            <Card className="rounded-[2rem] md:rounded-[2.5rem] border-none bg-primary text-white shadow-xl shadow-primary/20 overflow-hidden relative mb-8 md:mb-10">
              <div className="absolute -right-10 -top-10 w-32 h-32 md:w-40 md:h-40 bg-white/10 rounded-full blur-2xl md:blur-3xl" />
              <CardContent className="p-8 md:p-10 relative">
                <div className="flex justify-between items-start mb-8 md:mb-10">
                  <div>
                    <div className="text-[10px] md:text-xs font-bold text-white/70 uppercase tracking-widest mb-2">Available Balance</div>
                    <div className="text-3xl md:text-5xl font-bold">৳ {parseFloat(balance).toFixed(2)}</div>
                    {parseFloat(pendingBalance) > 0 && (
                      <div className="text-[10px] md:text-xs font-bold text-white/50 uppercase tracking-widest mt-2">
                        Pending: ৳ {parseFloat(pendingBalance).toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-white/20 flex items-center justify-center shrink-0">
                    <Wallet className="w-6 h-6 md:w-8 md:h-8 text-white" />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                  {walletType !== 'doctor' && (
                    <Button 
                      size="lg" 
                      onClick={() => {
                        setDepositAmount("");
                        setIsDepositOpen(true);
                      }}
                      className="bg-white text-primary hover:bg-white/90 rounded-xl md:rounded-2xl h-12 md:h-14 flex-1 font-bold gap-2 text-sm md:text-base"
                    >
                      <Plus className="w-5 h-5" /> Add Money
                    </Button>
                  )}
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
                {transactions.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-slate-100/50 text-slate-400 text-sm font-semibold">
                    No transactions found
                  </div>
                ) : (
                  transactions.map((tx) => {
                    const isCredit = tx.direction === 'credit';
                    const txTypeLabels: Record<string, string> = {
                      'consultation_payment_hold': 'Consultation Hold',
                      'consultation_release': 'Consultation Payment Released',
                      'consultation_refund': 'Refund Credited',
                      'platform_commission': 'Platform Commission',
                      'withdrawal': 'Withdrawal',
                      'deposit': 'Wallet Deposit',
                      'adjustment': 'Adjustment'
                    };
                    const dateStr = new Date(tx.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    });
                    return (
                      <Card key={tx.id} className="rounded-2xl md:rounded-[1.5rem] border-none shadow-sm hover:shadow-md transition-all bg-white">
                        <CardContent className="p-4 md:p-6 flex items-center gap-4 md:gap-6">
                          <div className={cn(
                            "w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0",
                            isCredit ? "bg-green-50 text-green-500" : "bg-red-50 text-red-500"
                          )}>
                            {isCredit ? <ArrowDownLeft className="w-5 h-5 md:w-6 md:h-6" /> : <ArrowUpRight className="w-5 h-5 md:w-6 md:h-6" />}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <div className="font-bold text-sm md:text-base text-slate-900 truncate">
                              {txTypeLabels[tx.transaction_type] || tx.transaction_type}
                            </div>
                            <div className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium">
                              <Clock className="w-3 h-3" /> {dateStr}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={cn(
                              "font-bold text-sm md:text-lg",
                              isCredit ? "text-green-600" : "text-slate-900"
                            )}>
                              {isCredit ? '+' : '-'}৳ {parseFloat(tx.amount).toFixed(2)}
                            </div>
                            <div className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{tx.status}</div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </section>
          </>
        )}
      </div>

      {/* Deposit Dialog */}
      <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-6 bg-white border-none shadow-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Add Money to Wallet
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">
              Enter the amount you wish to deposit. You will be redirected to a secure payment gateway (SSLCommerz) to complete the transaction.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDepositSubmit} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Deposit Amount (BDT)
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-extrabold text-slate-400 text-lg">৳</span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="500"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="h-14 pl-8 rounded-2xl border-slate-200 focus-visible:ring-primary font-bold text-lg"
                  min="10"
                  required
                  disabled={isDepositing}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDepositOpen(false)}
                className="h-12 rounded-xl flex-1 font-bold text-slate-500"
                disabled={isDepositing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-12 rounded-xl flex-1 font-bold shadow-lg shadow-primary/10"
                disabled={isDepositing}
              >
                {isDepositing ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  "Proceed to Pay"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
