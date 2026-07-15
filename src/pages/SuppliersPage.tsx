import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../App";
import { useClient } from "../lib/clientContext";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { Supplier } from "../types";
import Layout from "../components/Layout";
import { SUPPLIER_RECOGNITION_MAPPINGS } from "../constants";
import {
  Users,
  Plus,
  Search,
  Filter,
  TrendingDown,
  Building2,
  Trash2,
  Edit2,
  Eye,
  FileSpreadsheet,
  AlertTriangle,
  FileCheck,
  CheckCircle,
  HelpCircle,
  Brain,
  Sparkles,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Upload,
} from "lucide-react";
import { cn, formatDate } from "../lib/utils";
import { GoogleGenAI } from "@google/genai";

// Dynamic helper to retrieve configured Gemini API key
function getAIInstance() {
  const savedKey = localStorage.getItem("comply_gemini_api_key");
  const envKey = (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '') || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
  const apiKey = savedKey || envKey || '';
  return apiKey ? new GoogleGenAI({ apiKey }) : null;
}


export default function SuppliersPage() {
  const { user } = useAuth();
  const { activeClient, activeClientId, clientsLoading } = useClient();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [beeLevel, setBeeLevel] = useState(4);
  const [blackOwnership, setBlackOwnership] = useState(0);
  const [blackWomenOwnership, setBlackWomenOwnership] = useState(0);
  const [annualSpend, setAnnualSpend] = useState(0);
  const [category, setCategory] = useState<'EME' | 'QSE' | 'Generic'>("EME");
  const [expiryDate, setExpiryDate] = useState("");
  const [certificateUrl, setCertificateUrl] = useState("");
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);

  useEffect(() => {
    if (!user || !activeClientId) return;

    const q = query(
      collection(db, "suppliers"),
      where("businessId", "==", activeClientId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Supplier[];
      setSuppliers(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "suppliers");
    });

    return unsubscribe;
  }, [user, activeClientId]);

  // Filtered suppliers list
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLevel = filterLevel === "all" || s.beeLevel.toString() === filterLevel;
      return matchesSearch && matchesLevel;
    });
  }, [suppliers, searchTerm, filterLevel]);

  // Procurement metrics
  const totalSpend = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + (s.annualSpend || 0), 0);
  }, [suppliers]);

  const totalWeightedSpend = useMemo(() => {
    return suppliers.reduce((sum, s) => {
      const recognition = SUPPLIER_RECOGNITION_MAPPINGS[s.beeLevel]?.percent || 0;
      return sum + (s.annualSpend || 0) * recognition;
    }, 0);
  }, [suppliers]);

  const effectiveRecognitionRate = useMemo(() => {
    if (totalSpend === 0) return 0;
    return Math.round((totalWeightedSpend / totalSpend) * 100);
  }, [totalSpend, totalWeightedSpend]);

  // AI suggestions for score impact
  const scoreKillers = useMemo(() => {
    return suppliers
      .filter(s => s.beeLevel >= 6 && s.annualSpend > 0) // Level 6-9 and has spend
      .map(s => {
        const impact = (s.annualSpend / (totalSpend || 1)) * 100;
        return {
          ...s,
          impact: Math.round(impact * 10) / 10,
        };
      })
      .sort((a, b) => b.annualSpend - a.annualSpend)
      .slice(0, 3);
  }, [suppliers, totalSpend]);

  const handleOpenAddModal = () => {
    setEditingSupplier(null);
    setName("");
    setBeeLevel(4);
    setBlackOwnership(0);
    setBlackWomenOwnership(0);
    setAnnualSpend(0);
    setCategory("EME");
    setExpiryDate("");
    setCertificateUrl("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setName(supplier.name);
    setBeeLevel(supplier.beeLevel);
    setBlackOwnership(supplier.blackOwnershipPercent);
    setBlackWomenOwnership(supplier.blackWomenOwnershipPercent);
    setAnnualSpend(supplier.annualSpend);
    setCategory(supplier.category);
    setExpiryDate(supplier.certificateExpiry ? supplier.certificateExpiry.toDate().toISOString().substring(0, 10) : "");
    setCertificateUrl(supplier.certificateUrl || "");
    setIsModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeClientId) return;

    const data = {
      userId: user.uid,
      businessId: activeClientId,
      name,
      beeLevel: Number(beeLevel),
      blackOwnershipPercent: Number(blackOwnership),
      blackWomenOwnershipPercent: Number(blackWomenOwnership),
      annualSpend: Number(annualSpend),
      category,
      certificateUrl,
      certificateExpiry: expiryDate ? Timestamp.fromDate(new Date(expiryDate)) : null,
      updatedAt: Timestamp.now(),
    };

    try {
      if (editingSupplier) {
        await updateDoc(doc(db, "suppliers", editingSupplier.id), data);
      } else {
        await addDoc(collection(db, "suppliers"), {
          ...data,
          createdAt: Timestamp.now(),
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving supplier:", error);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this supplier?")) return;
    try {
      await deleteDoc(doc(db, "suppliers", id));
    } catch (error) {
      console.error("Error deleting supplier:", error);
    }
  };

  // Real OCR analysis using Gemini 2.5 Flash
  const handleRealOcr = async (file: File) => {
    const aiInstance = getAIInstance();
    if (!aiInstance) {
      alert("Please configure your Gemini API Key in Settings (Connected Accounts) or env files first.");
      return;
    }

    setIsOcrProcessing(true);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      const mimeType = file.type || "application/pdf";

      const prompt = `Analyze the attached South African B-BBEE compliance document (e.g. B-BBEE Certificate or Sworn Affidavit) and extract key verification fields.
Return a JSON object conforming exactly to this structure:
{
  "Supplier Name": "Official company name",
  "B-BBEE Level": "BEE level as a number from 1 to 9 (where 9 is non-compliant)",
  "Black Ownership": "e.g. 51 (return only the number, or 0 if not found/applicable)",
  "Black Women Ownership": "e.g. 30 (return only the number, or 0 if not found/applicable)",
  "Category": "EME" | "QSE" | "Generic",
  "Expiry Date": "YYYY-MM-DD"
}`;

      const response = await aiInstance.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          prompt
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text;
      if (!text) throw new Error("No text response received from Gemini");

      const result = JSON.parse(text);
      
      // Auto-fill form fields
      if (result["Supplier Name"]) setName(result["Supplier Name"]);
      
      const rawLevel = String(result["B-BBEE Level"] || "4");
      const levelNum = Number(rawLevel.replace(/[^\d]/g, "")) || 4;
      setBeeLevel(levelNum);

      const rawBlackOwn = String(result["Black Ownership"] || "0");
      const blackOwnNum = Number(rawBlackOwn.replace(/[^\d.]/g, "")) || 0;
      setBlackOwnership(blackOwnNum);

      const rawBlackWomenOwn = String(result["Black Women Ownership"] || "0");
      const blackWomenOwnNum = Number(rawBlackWomenOwn.replace(/[^\d.]/g, "")) || 0;
      setBlackWomenOwnership(blackWomenOwnNum);

      if (result["Category"] && ["EME", "QSE", "Generic"].includes(result["Category"])) {
        setCategory(result["Category"]);
      }
      
      if (result["Expiry Date"]) {
        setExpiryDate(result["Expiry Date"]);
      }
      
      setCertificateUrl("https://firebasestorage.googleapis.com/v0/b/comply-b3bfe.firebasestorage.app/o/ocr_siya_cert.pdf");
      
    } catch (err: any) {
      console.error("Gemini OCR Analysis Error:", err);
      alert(`OCR Extraction Failed: ${err.message || err}`);
    } finally {
      setIsOcrProcessing(false);
    }
  };

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
            <Building2 className="h-8 w-8 text-sky-400" />
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">No Active Client Selected</h3>
          <p className="text-gray-500 font-medium text-sm mb-6">
            Please select a client business from the portfolio or create a new client to manage suppliers.
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
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Suppliers CRM</h1>
            <p className="text-gray-500 font-medium mt-1">Manage and audit vendor B-BBEE status to optimize your procurement score.</p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center space-x-2 bg-sky-600 text-white px-5 py-3 rounded-2xl shadow-lg shadow-sky-100 hover:bg-sky-700 hover:scale-[1.02] active:scale-95 transition-all font-bold text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Supplier</span>
          </button>
        </div>

        {/* Procurement Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/30 flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Procurement Spend</p>
              <h3 className="text-3xl font-black text-gray-900 mt-2">
                R {totalSpend.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <p className="text-xs text-gray-400 font-semibold mt-4">Across {suppliers.length} active suppliers</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/30 flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">BEE Weighted Recognition Spend</p>
              <h3 className="text-3xl font-black text-sky-600 mt-2">
                R {totalWeightedSpend.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="overflow-hidden h-2 bg-gray-100 rounded-full mt-4">
              <div
                style={{ width: `${Math.min(100, effectiveRecognitionRate)}%` }}
                className="h-full bg-sky-500 rounded-full transition-all duration-1000"
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/30 flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Effective Recognition Rate</p>
              <h3 className="text-3xl font-black text-emerald-600 mt-2">{effectiveRecognitionRate}%</h3>
            </div>
            <p className="text-xs text-gray-500 font-semibold mt-4 flex items-center">
              <TrendingUp className="h-4 w-4 mr-1 text-emerald-500" />
              Target is 80% recognition rate
            </p>
          </div>
        </div>

        {/* Main Grid: Left CRM list / Right AI Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Filters */}
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-sm font-semibold text-gray-700"
                />
              </div>
              <div className="relative flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="bg-gray-50 border-0 rounded-2xl py-3 px-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  <option value="all">All BEE Levels</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl === 9 ? "Non-compliant (Level 9)" : `BEE Level ${lvl}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-wider">Supplier Name</th>
                      <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-wider">BEE Level</th>
                      <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-wider">Recognition %</th>
                      <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-wider">Annual Spend</th>
                      <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredSuppliers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-20 text-center text-gray-400">
                          <Building2 className="h-12 w-12 mx-auto text-gray-200 mb-4" />
                          <p className="font-bold text-gray-800">No suppliers found</p>
                          <p className="text-xs text-gray-400 mt-1">Get started by adding a vendor or uploading a BEE certificate.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredSuppliers.map((supplier) => {
                        const rec = SUPPLIER_RECOGNITION_MAPPINGS[supplier.beeLevel];
                        const isExpired = supplier.certificateExpiry && supplier.certificateExpiry.toDate() < new Date();

                        return (
                          <tr key={supplier.id} className="hover:bg-gray-50/55 transition-colors group">
                            <td className="p-5">
                              <div className="flex items-center space-x-3">
                                <div className="p-2.5 bg-sky-50 rounded-xl">
                                  <Building2 className="h-5 w-5 text-sky-600" />
                                </div>
                                <div>
                                  <p className="font-extrabold text-gray-900 group-hover:text-sky-600 transition-colors">{supplier.name}</p>
                                  <div className="flex items-center space-x-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                                    <span>{supplier.category}</span>
                                    <span>•</span>
                                    <span>{supplier.blackOwnershipPercent}% Black Owned</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-5">
                              <span className={cn(
                                "px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border",
                                supplier.beeLevel === 1 ? "bg-green-50 text-green-700 border-green-200" :
                                supplier.beeLevel <= 4 ? "bg-sky-50 text-sky-700 border-sky-200" :
                                supplier.beeLevel <= 8 ? "bg-amber-50 text-amber-700 border-amber-200" :
                                "bg-red-50 text-red-700 border-red-200"
                              )}>
                                {supplier.beeLevel === 9 ? "Level 9" : `Level ${supplier.beeLevel}`}
                              </span>
                            </td>
                            <td className="p-5 font-bold text-gray-700">
                              {Math.round((rec?.percent || 0) * 100)}%
                            </td>
                            <td className="p-5 font-black text-gray-900">
                              R {supplier.annualSpend.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}
                            </td>
                            <td className="p-5 text-right">
                              <div className="flex items-center justify-end space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {supplier.certificateUrl && (
                                  <a
                                    href={supplier.certificateUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="View Certificate"
                                    className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </a>
                                )}
                                <button
                                  onClick={() => handleOpenEditModal(supplier)}
                                  title="Edit Supplier"
                                  className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSupplier(supplier.id)}
                                  title="Delete Supplier"
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
          </div>

          {/* AI Scorecard Analysis Panel */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-950 to-slate-900 p-6 rounded-3xl border border-indigo-900 shadow-xl shadow-indigo-950/20 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <Brain className="h-32 w-32" />
              </div>
              <div className="flex items-center space-x-2 text-indigo-400 mb-4">
                <Sparkles className="h-5 w-5" />
                <span className="text-xs font-black uppercase tracking-widest">Procurement Copilot</span>
              </div>
              <h4 className="text-xl font-bold mb-2">Score Optimization Insights</h4>
              <p className="text-sm text-indigo-200/80 leading-relaxed">
                We've analyzed your supplier matrix. The biggest opportunity to increase your B-BBEE Level is replacing low-recognition high-spend suppliers.
              </p>

              {scoreKillers.length > 0 && (
                <div className="mt-6 space-y-4">
                  <p className="text-xs font-black uppercase tracking-widest text-indigo-300">Suppliers Hurting Your Score</p>
                  {scoreKillers.map((s) => (
                    <div key={s.id} className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white truncate max-w-[150px]">{s.name}</p>
                        <p className="text-[10px] text-indigo-300 font-medium">
                          Spend: R{s.annualSpend.toLocaleString("en-ZA", { maximumFractionDigits: 0 })} · Level {s.beeLevel}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-rose-400">-{s.impact}% Impact</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-indigo-900 flex justify-between items-center">
                <p className="text-xs text-indigo-300 font-bold">Ask AI Copilot for replacements</p>
                <ArrowRight className="h-4 w-4 text-indigo-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Dialog Form */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-xl font-black text-gray-900">
                  {editingSupplier ? "Edit Supplier Info" : "Register Supplier"}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-50 rounded-xl transition-all"
                >
                  ✕
                </button>
              </div>

              {/* OCR Import Box */}
              {!editingSupplier && (
                <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sky-700">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-xs font-black uppercase tracking-wider">Fast-track with AI OCR</span>
                    </div>
                    <span className="text-[9px] bg-sky-200/70 text-sky-800 font-black uppercase tracking-wider px-1.5 py-0.5 rounded">
                      Real AI
                    </span>
                  </div>
                  <p className="text-xs text-sky-800 font-medium">
                    Upload a vendor B-BBEE certificate. Our AI extracts levels, ownership, and structure in seconds.
                  </p>
                  
                  <div className="relative border border-sky-200 hover:border-sky-300 rounded-xl p-4 text-center transition-all bg-white group cursor-pointer">
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleRealOcr(e.target.files[0]);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isOcrProcessing}
                    />
                    <div className="flex flex-col items-center justify-center space-y-1.5">
                      {isOcrProcessing ? (
                        <>
                          <RefreshCw className="h-5 w-5 text-sky-600 animate-spin" />
                          <p className="text-xs font-bold text-sky-800">Processing B-BBEE Certificate...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 text-sky-600 group-hover:scale-110 transition-transform" />
                          <p className="text-xs font-bold text-sky-800">Upload B-BBEE Certificate (PDF/Image)</p>
                          <p className="text-[10px] text-sky-600/70">AI will automatically populate form fields below</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveSupplier} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Supplier Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50 border-0 rounded-2xl py-3 px-4 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                    placeholder="Enter supplier name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">BEE Level</label>
                    <select
                      value={beeLevel}
                      onChange={(e) => setBeeLevel(Number(e.target.value))}
                      className="w-full bg-gray-50 border-0 rounded-2xl py-3 px-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => (
                        <option key={lvl} value={lvl}>
                          {lvl === 9 ? "Level 9 (Non-compliant)" : `Level ${lvl}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full bg-gray-50 border-0 rounded-2xl py-3 px-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="EME">EME (Exempt Micro)</option>
                      <option value="QSE">QSE (Qualifying Small)</option>
                      <option value="Generic">Generic (Large Enterprise)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Black Ownership %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={blackOwnership}
                      onChange={(e) => setBlackOwnership(Number(e.target.value))}
                      className="w-full bg-gray-50 border-0 rounded-2xl py-3 px-4 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Black Women %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={blackWomenOwnership}
                      onChange={(e) => setBlackWomenOwnership(Number(e.target.value))}
                      className="w-full bg-gray-50 border-0 rounded-2xl py-3 px-4 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Annual Procurement Spend (ZAR)</label>
                  <input
                    type="number"
                    min="0"
                    value={annualSpend}
                    onChange={(e) => setAnnualSpend(Number(e.target.value))}
                    className="w-full bg-gray-50 border-0 rounded-2xl py-3 px-4 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                    placeholder="Spend in Rands"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Expiry Date</label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full bg-gray-50 border-0 rounded-2xl py-3 px-4 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Certificate Link</label>
                    <input
                      type="text"
                      value={certificateUrl}
                      onChange={(e) => setCertificateUrl(e.target.value)}
                      className="w-full bg-gray-50 border-0 rounded-2xl py-3 px-4 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                      placeholder="https://..."
                    />
                  </div>
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
                    Save Supplier
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
