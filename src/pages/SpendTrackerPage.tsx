import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../App";
import { useClient } from "../lib/clientContext";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { SpendLog } from "../types";
import Layout from "../components/Layout";
import {
  TrendingUp,
  Plus,
  Coins,
  Calculator,
  Calendar,
  FileText,
  Trash2,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  PiggyBank,
  Settings,
  Sparkles,
  Upload,
} from "lucide-react";
import { cn, formatDate } from "../lib/utils";

const CATEGORIES = [
  { value: "skills_development", label: "Skills Development", targetText: "6% of payroll", desc: "Training for black employees, bursaries, internships" },
  { value: "enterprise_development", label: "Enterprise Development (ED)", targetText: "1% of NPAT", desc: "Support for 51%+ black-owned EMEs or QSEs" },
  { value: "supplier_development", label: "Supplier Development (SD)", targetText: "2% of NPAT", desc: "Support for active black-owned suppliers" },
  { value: "socio_economic_development", label: "Socio-Economic Development (SED)", targetText: "1% of NPAT", desc: "Donations to NPOs with 75%+ black beneficiaries" },
] as const;

export default function SpendTrackerPage() {
  const { user } = useAuth();
  const { activeClient, activeClientId, clientsLoading } = useClient();
  const [spendLogs, setSpendLogs] = useState<SpendLog[]>([]);
  
  // Financial parameters
  const [payrollInput, setPayrollInput] = useState("");
  const [npatInput, setNpatInput] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [showConfigAlert, setShowConfigAlert] = useState(false);

  // Modal / Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState<SpendLog["category"]>("skills_development");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [isDummyUploading, setIsDummyUploading] = useState(false);

  // Sync inputs with business profile
  useEffect(() => {
    if (activeClient) {
      setPayrollInput(activeClient.annualPayroll?.toString() || "");
      setNpatInput(activeClient.npat?.toString() || "");
      if (!activeClient.annualPayroll || !activeClient.npat) {
        setShowConfigAlert(true);
      } else {
        setShowConfigAlert(false);
      }
    }
  }, [activeClient]);

  // Fetch spend logs
  useEffect(() => {
    if (!user || !activeClientId) return;

    const q = query(
      collection(db, "spendLogs"),
      where("businessId", "==", activeClientId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date,
      })) as SpendLog[];
      setSpendLogs(list.sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "spendLogs");
    });

    return unsubscribe;
  }, [user, activeClientId]);

  // Update business profile
  const handleUpdateFinance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeClientId) return;
    setIsUpdatingProfile(true);

    try {
      await updateDoc(doc(db, "businesses", activeClientId), {
        annualPayroll: Number(payrollInput),
        npat: Number(npatInput),
      });
      setShowConfigAlert(false);
    } catch (error) {
      console.error("Error updating business finances:", error);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Log new spend
  const handleSaveSpend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeClientId) return;

    const data = {
      userId: user.uid,
      businessId: activeClientId,
      category,
      description,
      amount: Number(amount),
      date: date ? Timestamp.fromDate(new Date(date)) : Timestamp.now(),
      evidenceUrl: evidenceUrl || "",
      createdAt: Timestamp.now(),
    };

    try {
      await addDoc(collection(db, "spendLogs"), data);
      setIsModalOpen(false);
      // Reset form
      setDescription("");
      setAmount("");
      setDate("");
      setEvidenceUrl("");
    } catch (error) {
      console.error("Error logging spend:", error);
    }
  };

  // Delete spend log
  const handleDeleteSpend = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this spend log?")) return;
    try {
      await deleteDoc(doc(db, "spendLogs", id));
    } catch (error) {
      console.error("Error deleting spend log:", error);
    }
  };

  // Simulated upload proof of payment
  const handleDummyUpload = () => {
    setIsDummyUploading(true);
    setTimeout(() => {
      const urls = [
        "https://firebasestorage.googleapis.com/v0/b/comply-b3bfe.firebasestorage.app/o/proof_of_payment_1.pdf",
        "https://firebasestorage.googleapis.com/v0/b/comply-b3bfe.firebasestorage.app/o/invoice_1203.pdf",
        "https://firebasestorage.googleapis.com/v0/b/comply-b3bfe.firebasestorage.app/o/donation_receipt.pdf",
      ];
      setEvidenceUrl(urls[Math.floor(Math.random() * urls.length)]);
      setIsDummyUploading(false);
    }, 1000);
  };

  // Math totals for dashboard
  const payroll = activeClient?.annualPayroll || 0;
  const npat = activeClient?.npat || 0;

  const targets = useMemo(() => {
    return {
      skills_development: payroll * 0.06,
      enterprise_development: npat * 0.01,
      supplier_development: npat * 0.02,
      socio_economic_development: npat * 0.01,
    };
  }, [payroll, npat]);

  const categoryTotals = useMemo(() => {
    const totals = {
      skills_development: 0,
      enterprise_development: 0,
      supplier_development: 0,
      socio_economic_development: 0,
    };
    spendLogs.forEach((log) => {
      if (totals[log.category] !== undefined) {
        totals[log.category] += log.amount;
      }
    });
    return totals;
  }, [spendLogs]);

  const totalActualSpend = useMemo(() => {
    return Object.values(categoryTotals).reduce((a: number, b: number) => a + b, 0);
  }, [categoryTotals]);

  const totalTargetSpend = useMemo(() => {
    return Object.values(targets).reduce((a: number, b: number) => a + b, 0);
  }, [targets]);

  if (clientsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500" />
        </div>
      </Layout>
    );
  }

  if (!activeClient) {
    return (
      <Layout>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 p-16 text-center max-w-2xl mx-auto my-12">
          <div className="mx-auto w-16 h-16 bg-sky-50 rounded-2xl border border-sky-100 flex items-center justify-center mb-6">
            <Coins className="h-8 w-8 text-sky-400" />
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">No Active Client Selected</h3>
          <p className="text-gray-500 font-medium text-sm mb-6">
            Please select a client business from the portfolio or create a new client to manage spend logs.
          </p>
          <a
            href="/clients"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg"
          >
            Go to Clients Portfolio
          </a>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Compliance Spend Tracker</h1>
            <p className="text-gray-500 font-medium mt-1">Track skills, ED, SD, and SED investment targets based on B-BBEE codes.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center space-x-2 bg-sky-600 text-white px-5 py-3 rounded-2xl shadow-lg shadow-sky-100 hover:bg-sky-700 hover:scale-[1.02] active:scale-95 transition-all font-bold text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Log Expenditure</span>
          </button>
        </div>

        {/* Setup finances alert */}
        {showConfigAlert && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl flex items-start space-x-3 text-amber-800 shadow-sm">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0 animate-bounce" />
            <div>
              <h5 className="font-bold text-sm">Financial Setup Incomplete</h5>
              <p className="text-xs text-amber-700 mt-0.5">
                Please configure your Annual Payroll and Net Profit After Tax (NPAT) below to calculate your B-BBEE spending targets accurately.
              </p>
            </div>
          </div>
        )}

        {/* Finance Configuration & Global Spend Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Finance Config */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/30 lg:col-span-2">
            <div className="flex items-center space-x-2 text-sky-600 mb-6">
              <Settings className="h-5 w-5" />
              <h4 className="font-extrabold text-gray-900">B-BBEE Base Targets Configuration</h4>
            </div>
            <form onSubmit={handleUpdateFinance} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Annual Payroll (ZAR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">R</span>
                  <input
                    type="number"
                    required
                    value={payrollInput}
                    onChange={(e) => setPayrollInput(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-sm font-semibold text-gray-700"
                    placeholder="e.g. 5000000"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Net Profit After Tax (NPAT, ZAR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">R</span>
                  <input
                    type="number"
                    required
                    value={npatInput}
                    onChange={(e) => setNpatInput(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-sm font-semibold text-gray-700"
                    placeholder="e.g. 1200000"
                  />
                </div>
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs py-3 px-6 rounded-2xl shadow-md transition-all disabled:bg-gray-400 flex items-center space-x-1.5"
                >
                  <Calculator className="h-4 w-4" />
                  <span>Update Targets</span>
                </button>
              </div>
            </form>
          </div>

          {/* Global Spend Monitor */}
          <div className="bg-gradient-to-br from-indigo-950 to-slate-900 p-6 rounded-3xl border border-indigo-900 shadow-xl shadow-indigo-950/20 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <Coins className="h-32 w-32" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-indigo-300">Total B-BBEE Investment</p>
              <h3 className="text-3xl font-black text-white mt-2">
                R {totalActualSpend.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}
              </h3>
              <p className="text-xs text-indigo-200/70 font-semibold mt-1">
                Target: R {totalTargetSpend.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}
              </p>
            </div>
            <div className="mt-6">
              <div className="flex justify-between items-center text-xs text-indigo-300 font-bold mb-2">
                <span>Progress against all targets</span>
                <span>{totalTargetSpend > 0 ? Math.round((totalActualSpend / totalTargetSpend) * 100) : 0}%</span>
              </div>
              <div className="overflow-hidden h-2.5 bg-white/10 rounded-full">
                <div
                  style={{ width: `${Math.min(100, totalTargetSpend > 0 ? (totalActualSpend / totalTargetSpend) * 100 : 0)}%` }}
                  className="h-full bg-sky-500 rounded-full transition-all duration-1000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Categories Targets Progress Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {CATEGORIES.map((cat) => {
            const actual = categoryTotals[cat.value] || 0;
            const target = targets[cat.value] || 0;
            const percent = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;
            const isCompleted = actual >= target && target > 0;

            return (
              <div key={cat.value} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col justify-between h-56 group">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                      {cat.targetText}
                    </span>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <PiggyBank className="h-5 w-5 text-gray-300 group-hover:text-sky-500 transition-colors" />
                    )}
                  </div>

                  <h4 className="font-extrabold text-gray-900 mt-4 tracking-tight leading-tight">{cat.label}</h4>
                  <p className="text-[10px] text-gray-400 font-medium mt-1 leading-snug line-clamp-2">{cat.desc}</p>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between items-center text-xs font-bold mb-1">
                    <span className="text-gray-900">R {actual.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</span>
                    <span className="text-gray-400">/ R {target.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="overflow-hidden h-2 bg-gray-100 rounded-full">
                    <div
                      style={{ width: `${percent}%` }}
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        isCompleted ? "bg-emerald-500" : "bg-sky-500"
                      )}
                    />
                  </div>
                  <span className="text-[10px] font-black text-gray-400 mt-1.5 block text-right">{percent}% Reached</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Spend Log CRM / Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900">Investment Ledger</h3>
            <span className="text-xs font-bold text-gray-400">{spendLogs.length} Transactions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-wider">Date</th>
                  <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-wider">Category</th>
                  <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-wider">Description</th>
                  <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-wider">Amount</th>
                  <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {spendLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-20 text-center text-gray-400">
                      <Coins className="h-12 w-12 mx-auto text-gray-200 mb-4" />
                      <p className="font-bold text-gray-800">No expenditures logged</p>
                      <p className="text-xs text-gray-400 mt-1">Start logging your skills development or enterprise support to reach your targets.</p>
                    </td>
                  </tr>
                ) : (
                  spendLogs.map((log) => {
                    const catMeta = CATEGORIES.find((c) => c.value === log.category);

                    return (
                      <tr key={log.id} className="hover:bg-gray-50/55 transition-colors group">
                        <td className="p-5 text-xs font-bold text-gray-600 flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(log.date.toDate())}</span>
                        </td>
                        <td className="p-5">
                          <span className="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                            {catMeta?.label || log.category}
                          </span>
                        </td>
                        <td className="p-5 font-bold text-gray-900 truncate max-w-xs">
                          {log.description}
                        </td>
                        <td className="p-5 font-black text-gray-950">
                          R {log.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex items-center justify-end space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {log.evidenceUrl && (
                              <a
                                href={log.evidenceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View Proof of Payment"
                                className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                              >
                                <FileText className="h-4 w-4" />
                              </a>
                            )}
                            <button
                              onClick={() => handleDeleteSpend(log.id)}
                              title="Delete Entry"
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Log Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-xl font-black text-gray-900">Log B-BBEE Expenditure</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-50 rounded-xl transition-all"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveSpend} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Spend Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-gray-50 border-0 rounded-2xl py-3 px-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="skills_development">Skills Development</option>
                    <option value="enterprise_development">Enterprise Development (ED)</option>
                    <option value="supplier_development">Supplier Development (SD)</option>
                    <option value="socio_economic_development">Socio-Economic Development (SED)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Amount (ZAR)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">R</span>
                    <input
                      type="number"
                      required
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 bg-gray-50 border-0 rounded-2xl py-3 px-4 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                      placeholder="e.g. 50000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Date</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-gray-50 border-0 rounded-2xl py-3 px-4 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-1 flex flex-col justify-end">
                    <button
                      type="button"
                      disabled={isDummyUploading}
                      onClick={handleDummyUpload}
                      className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs py-3 rounded-2xl shadow-md transition-all flex items-center justify-center space-x-1.5"
                    >
                      {isDummyUploading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          <span>Attach POP Proof</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Proof of Payment URL</label>
                  <input
                    type="text"
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    className="w-full bg-gray-50 border-0 rounded-2xl py-3 px-4 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Description</label>
                  <textarea
                    required
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-gray-50 border-0 rounded-2xl py-3 px-4 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                    placeholder="e.g. Paid for Java Training course invoice #104"
                  />
                </div>

                <div className="pt-4 flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-2xl hover:bg-gray-200 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-sky-600 text-white font-bold py-3 rounded-2xl hover:bg-sky-700 shadow-md shadow-sky-200 transition-colors text-sm"
                  >
                    Log Spend
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
