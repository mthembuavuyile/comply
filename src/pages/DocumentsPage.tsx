import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../App";
import { db, handleFirestoreError, OperationType, storage } from "../lib/firebase";
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { EvidenceDoc } from "../types";
import Layout from "../components/Layout";
import {
  Folder,
  FolderOpen,
  FileText,
  Upload,
  Search,
  Filter,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock,
  X,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Brain,
  ShieldCheck,
  RefreshCw,
  FileCheck,
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

const ELEMENT_FOLDERS = [
  { value: "ownership", label: "Ownership", color: "from-blue-500 to-indigo-600", bg: "bg-blue-50", text: "text-blue-700", desc: "Share certificates, ID docs, CIPC records" },
  { value: "skills", label: "Skills Development", color: "from-emerald-500 to-teal-600", bg: "bg-emerald-50", text: "text-emerald-700", desc: "Payroll lists, training invoices, agreements" },
  { value: "procurement", label: "Procurement", color: "from-amber-500 to-orange-600", bg: "bg-amber-50", text: "text-amber-700", desc: "Supplier certificates, scorecards, spend records" },
  { value: "esd", label: "ESD (Enterprise & Supplier Dev)", color: "from-purple-500 to-pink-600", bg: "bg-purple-50", text: "text-purple-700", desc: "Development agreements, payment proofs, grants" },
  { value: "sed", label: "SED (Socio-Economic Dev)", color: "from-rose-500 to-red-600", bg: "bg-rose-50", text: "text-rose-700", desc: "Donation receipts, Section 18A, NPO certificates" },
] as const;

export default function DocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<EvidenceDoc[]>([]);
  const [selectedElement, setSelectedElement] = useState<EvidenceDoc["element"] | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [selectedDoc, setSelectedDoc] = useState<EvidenceDoc | null>(null);

  // Modals / AI states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  // Upload Form states
  const [docName, setDocName] = useState("");
  const [docElement, setDocElement] = useState<EvidenceDoc["element"]>("ownership");
  const [docTag, setDocTag] = useState<EvidenceDoc["tag"]>("pending_verification");
  const [docUrl, setDocUrl] = useState("");
  const [isDummyUploading, setIsDummyUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "evidenceVault"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt,
      })) as EvidenceDoc[];
      setDocuments(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "evidenceVault");
    });

    return unsubscribe;
  }, [user]);

  // Count docs in each element for folder badges
  const elementCounts = useMemo(() => {
    const counts: Record<string, number> = { ownership: 0, skills: 0, procurement: 0, esd: 0, sed: 0 };
    documents.forEach((d) => {
      if (counts[d.element] !== undefined) {
        counts[d.element]++;
      }
    });
    return counts;
  }, [documents]);

  // Filtered documents list
  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesElement = selectedElement === "all" || d.element === selectedElement;
      const matchesTag = filterTag === "all" || d.tag === filterTag;
      return matchesSearch && matchesElement && matchesTag;
    });
  }, [documents, searchTerm, selectedElement, filterTag]);

  // Helper to fetch files from Storage URL as Base64 for Gemini multimodal API
  const fetchUrlAsBase64 = async (url: string): Promise<{ data: string; mimeType: string }> => {
    try {
      const response = await fetch(url, { mode: "cors" });
      const blob = await response.blob();
      const mimeType = blob.type || "application/pdf";
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return { data: base64, mimeType };
    } catch (err) {
      console.warn("CORS or fetch error while retrieving document file: ", err);
      throw err;
    }
  };

  // Trigger real AI visual document analysis using Gemini 2.5 Flash
  const runAiAnalysis = async (docRecord: EvidenceDoc) => {
    if (!user) return;
    setIsAnalyzing(true);
    setAiReport(null);

    const aiInstance = getAIInstance();
    if (!aiInstance) {
      const missingKeyReport = `⚠️ **Gemini API Key is missing.**
Please configure your Gemini API key in **Settings -> Connected Accounts** or in your \`.env\` file (\`VITE_GEMINI_API_KEY\`) to enable real AI document auditing.`;
      setAiReport(missingKeyReport);
      setIsAnalyzing(false);
      return;
    }

    try {
      let fileData: { data: string; mimeType: string } | null = null;
      try {
        if (docRecord.url && docRecord.url.startsWith("http")) {
          fileData = await fetchUrlAsBase64(docRecord.url);
        }
      } catch (fetchErr) {
        console.warn("Falling back to metadata audit due to CORS/fetch block.");
      }

      if (fileData) {
        // Real Multi-Modal visual document audit
        const prompt = `You are a strict South African SANAS accredited B-BBEE verification auditor.
Analyze the attached document visually and verify its compliance.
- Document Name: ${docRecord.name}
- B-BBEE Element Category: ${docRecord.element.toUpperCase()}
- Current Status: ${docRecord.tag}

Please inspect this document and provide a formal audit report including:
1. **Completeness Check**: Are the typical legal contents present?
2. **Visual/Formatting Auditing**: Inspect the document structure, stamps, signatures, dates. Detect if the document is signed by all parties and/or Commissioner of Oaths where applicable.
3. **Audit Risk Rating**: Determine if risk is LOW, MEDIUM, or HIGH. (A missing signature or stamp on an affidavit/contract is HIGH risk).
4. **Actionable Remediation**: Provide exact instructions to fix any compliance issues.

Generate a report in clean Markdown format with bold highlights.`;

        const response = await aiInstance.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              inlineData: {
                data: fileData.data,
                mimeType: fileData.mimeType,
              },
            },
            prompt
          ],
          config: {
            systemInstruction: "You are an expert SANAS accredited B-BBEE verification auditor. You produce strict, highly accurate visual compliance audit briefs.",
          }
        });

        const report = response.text || "Failed to generate visual audit report.";
        setAiReport(report);

        // Update document in Firestore with AI review notes
        const aiStatus = report.toLowerCase().includes("high risk") ? "failed" : "passed";
        await updateDoc(doc(db, "evidenceVault", docRecord.id), {
          aiReview: {
            status: aiStatus,
            notes: report,
          },
          tag: aiStatus === "passed" ? "valid_for_audit" : "missing_signature",
        });

      } else {
        // Fallback: Metadata-based audit (when CORS blocks file fetch)
        const prompt = `You are a strict South African SANAS accredited B-BBEE verification auditor.
Note: Due to browser CORS restriction, we are performing a metadata-based compliance check on this document.
- Document Name: ${docRecord.name}
- B-BBEE Element Category: ${docRecord.element.toUpperCase()}
- Current Status: ${docRecord.tag}

Please provide a standard compliance audit report for this type of document:
1. **Compliance Requirements**: What are the typical SANAS audit requirements for this document name/category?
2. **Common Pitfalls & Warnings**: What visual elements (signatures, stamps, dates, company names) must the user double-check before submission?
3. **Audit Risk Rating**: General risk rating based on metadata.
4. **Actionable Remediation Checklist**: What steps the user should take next.

Provide a warning at the top noting: "⚠️ *Metadata-only audit performed due to browser CORS restriction.*"
Generate the report in clean Markdown format with bold highlights.`;

        const response = await aiInstance.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [prompt],
          config: {
            systemInstruction: "You are an expert SANAS accredited B-BBEE verification auditor. You produce strict compliance audit briefs.",
          }
        });

        const report = response.text || "Failed to generate audit report.";
        setAiReport(report);

        // Update document in Firestore with AI review notes
        const aiStatus = report.toLowerCase().includes("high risk") ? "failed" : "passed";
        await updateDoc(doc(db, "evidenceVault", docRecord.id), {
          aiReview: {
            status: aiStatus,
            notes: report,
          },
          tag: aiStatus === "passed" ? "valid_for_audit" : "pending_verification",
        });
      }

    } catch (error: any) {
      console.error("AI Analysis Error:", error);
      setAiReport(`Error running AI analysis: ${error.message || error}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOpenUploadModal = () => {
    setDocName("");
    setDocElement("ownership");
    setDocTag("pending_verification");
    setDocUrl("");
    setSelectedFile(null);
    setIsUploadModalOpen(true);
  };

  const handleDummyUpload = () => {
    setIsDummyUploading(true);
    setTimeout(() => {
      const mocks = [
        { name: "Shareholder Certificate - Vylex.pdf", element: "ownership" as const, url: "https://firebasestorage.googleapis.com/v0/b/comply-b3bfe.firebasestorage.app/o/shareholders.pdf" },
        { name: "Skills Training Invoice - Web Dev.pdf", element: "skills" as const, url: "https://firebasestorage.googleapis.com/v0/b/comply-b3bfe.firebasestorage.app/o/training_inv.pdf" },
        { name: "Siyakhula BEE Certificate 2026.pdf", element: "procurement" as const, url: "https://firebasestorage.googleapis.com/v0/b/comply-b3bfe.firebasestorage.app/o/siya_cert.pdf" },
        { name: "Enterprise Development Grant Proof.pdf", element: "esd" as const, url: "https://firebasestorage.googleapis.com/v0/b/comply-b3bfe.firebasestorage.app/o/grant_proof.pdf" },
      ];
      const selected = mocks[Math.floor(Math.random() * mocks.length)];
      setDocName(selected.name);
      setDocElement(selected.element);
      setDocUrl(selected.url);
      setDocTag("pending_verification");
      setIsDummyUploading(false);
    }, 1200);
  };

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsUploading(true);
    let finalUrl = docUrl;

    try {
      if (selectedFile) {
        // Upload selected file to Firebase Storage
        const fileRef = ref(storage, `documents/${user.uid}/${Date.now()}_${selectedFile.name}`);
        const uploadResult = await uploadBytes(fileRef, selectedFile);
        finalUrl = await getDownloadURL(uploadResult.ref);
      }

      const data = {
        userId: user.uid,
        name: docName || (selectedFile ? selectedFile.name : "Unnamed Document"),
        element: docElement,
        url: finalUrl || "https://firebasestorage.googleapis.com/v0/b/comply-b3bfe.firebasestorage.app/o/dummy_evidence.pdf",
        tag: docTag,
        aiReview: null,
        uploadedAt: Timestamp.now(),
      };

      await addDoc(collection(db, "evidenceVault"), data);
      
      // Reset upload modal states
      setSelectedFile(null);
      setDocName("");
      setDocUrl("");
      setIsUploadModalOpen(false);
    } catch (error) {
      console.error("Error uploading evidence doc:", error);
      alert("Failed to upload document. Please ensure your Firebase storage rules and bucket settings are correct.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this evidence document?")) return;
    try {
      await deleteDoc(doc(db, "evidenceVault", id));
      if (selectedDoc?.id === id) {
        setSelectedDoc(null);
        setAiReport(null);
      }
    } catch (error) {
      console.error("Error deleting evidence doc:", error);
    }
  };

  const getTagBadge = (tag: EvidenceDoc["tag"]) => {
    switch (tag) {
      case "valid_for_audit":
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Valid for Audit</span>;
      case "missing_signature":
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Action Required</span>;
      case "expired":
        return <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><X className="h-3 w-3" /> Expired</span>;
      case "pending_verification":
      default:
        return <span className="bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><Clock className="h-3 w-3" /> Pending Review</span>;
    }
  };

  return (
    <Layout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Evidence Vault</h1>
            <p className="text-gray-500 font-medium mt-1">Smart B-BBEE folders with built-in AI Document Checker for audit readiness.</p>
          </div>
          <button
            onClick={handleOpenUploadModal}
            className="flex items-center justify-center space-x-2 bg-sky-600 text-white px-5 py-3 rounded-2xl shadow-lg shadow-sky-100 hover:bg-sky-700 hover:scale-[1.02] active:scale-95 transition-all font-bold text-sm"
          >
            <Upload className="h-4 w-4" />
            <span>Upload Document</span>
          </button>
        </div>

        {/* B-BBEE Folder Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {ELEMENT_FOLDERS.map((folder) => {
            const isSelected = selectedElement === folder.value;
            const count = elementCounts[folder.value] || 0;

            return (
              <button
                key={folder.value}
                onClick={() => setSelectedElement(isSelected ? "all" : folder.value)}
                style={{
                  backgroundImage: isSelected ? `linear-gradient(to bottom right, var(--tw-gradient-stops))` : undefined,
                  backgroundColor: !isSelected ? "white" : undefined,
                }}
                className={cn(
                  "p-5 rounded-3xl border text-left transition-all duration-300 relative group flex flex-col justify-between h-36 shadow-sm overflow-hidden",
                  isSelected
                    ? `bg-gradient-to-br ${folder.color} text-white border-transparent scale-[1.02] shadow-lg`
                    : "bg-white border-gray-100 hover:border-gray-200 hover:scale-[1.01]"
                )}
              >
                <div className="flex items-start justify-between w-full">
                  <div className={cn(
                    "p-3 rounded-2xl transition-colors",
                    isSelected ? "bg-white/10" : folder.bg
                  )}>
                    {isSelected ? (
                      <FolderOpen className="h-6 w-6 text-white" />
                    ) : (
                      <Folder className={cn("h-6 w-6", folder.text)} />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-black px-2 py-0.5 rounded-full",
                    isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                  )}>
                    {count}
                  </span>
                </div>
                <div>
                  <h4 className="font-extrabold text-sm tracking-tight leading-tight">{folder.label}</h4>
                  <p className={cn(
                    "text-[10px] font-medium mt-1 truncate",
                    isSelected ? "text-white/80" : "text-gray-400"
                  )}>
                    {folder.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Documents List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filters */}
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-sm font-semibold text-gray-700"
                />
              </div>
              <div className="relative flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="bg-gray-50 border-0 rounded-2xl py-3 px-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  <option value="all">All Verification Statuses</option>
                  <option value="valid_for_audit">Valid for Audit</option>
                  <option value="pending_verification">Pending Review</option>
                  <option value="missing_signature">Action Required</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>

            {/* Document Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocs.length === 0 ? (
                <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center">
                  <FileText className="h-12 w-12 text-gray-200 mb-4" />
                  <h3 className="text-lg font-bold text-gray-900">No documents found</h3>
                  <p className="text-gray-400 text-xs mt-1 max-w-xs">
                    {searchTerm || filterTag !== "all" || selectedElement !== "all"
                      ? "Try adjusting filters or folder selection."
                      : "Upload audit evidence documents to compile your B-BBEE pack."}
                  </p>
                </div>
              ) : (
                filteredDocs.map((docItem) => {
                  const isSelected = selectedDoc?.id === docItem.id;
                  const folderMeta = ELEMENT_FOLDERS.find(f => f.value === docItem.element);

                  return (
                    <div
                      key={docItem.id}
                      onClick={() => {
                        setSelectedDoc(docItem);
                        setAiReport(docItem.aiReview?.notes || null);
                      }}
                      className={cn(
                        "bg-white p-5 rounded-3xl border cursor-pointer transition-all flex flex-col justify-between group shadow-sm hover:scale-[1.01]",
                        isSelected
                          ? "border-sky-500 shadow-md shadow-sky-100"
                          : "border-gray-100 hover:border-gray-200 hover:shadow-md"
                      )}
                    >
                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <div className={cn("p-2.5 rounded-xl", folderMeta?.bg || "bg-gray-50")}>
                            <FileText className={cn("h-5 w-5", folderMeta?.text || "text-gray-500")} />
                          </div>
                          {getTagBadge(docItem.tag)}
                        </div>

                        <h4 className="font-extrabold text-gray-900 group-hover:text-sky-600 transition-colors line-clamp-2">
                          {docItem.name}
                        </h4>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1 block">
                          Category: {folderMeta?.label}
                        </span>
                      </div>

                      <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 font-bold">
                          Uploaded {formatDate(docItem.uploadedAt?.toDate() || new Date())}
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <a
                            href={docItem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDoc(docItem.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* AI Checker Panel */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-950 to-slate-900 p-6 rounded-3xl border border-indigo-900 shadow-xl shadow-indigo-950/20 text-white h-full min-h-[500px] flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                <Brain className="h-48 w-48" />
              </div>

              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                  <div className="flex items-center space-x-2 text-indigo-400">
                    <Sparkles className="h-5 w-5" />
                    <span className="text-xs font-black uppercase tracking-widest">AI Document Checker</span>
                  </div>
                  <span className="text-[9px] bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                    Auditing Engine
                  </span>
                </div>

                {!selectedDoc ? (
                  <div className="py-20 text-center space-y-4">
                    <Brain className="h-12 w-12 mx-auto text-indigo-400 animate-pulse" />
                    <h5 className="font-bold text-lg text-white">Select a Document</h5>
                    <p className="text-xs text-indigo-200/60 max-w-xs mx-auto leading-relaxed">
                      Select any document in your vault to verify completeness, check formatting errors, and audit risk.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-extrabold text-lg text-white leading-snug">{selectedDoc.name}</h4>
                      <p className="text-xs text-indigo-300 font-bold uppercase tracking-wider mt-1">
                        Category: {selectedDoc.element.toUpperCase()}
                      </p>
                    </div>

                    {isAnalyzing ? (
                      <div className="py-16 text-center space-y-4">
                        <RefreshCw className="h-10 w-10 mx-auto text-indigo-400 animate-spin" />
                        <p className="text-xs font-bold text-indigo-200">Checking document signatures, dates, and SANAS requirements...</p>
                      </div>
                    ) : aiReport ? (
                      <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-xs font-medium text-indigo-100 leading-relaxed overflow-y-auto max-h-[350px] whitespace-pre-wrap select-text scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {aiReport}
                      </div>
                    ) : (
                      <div className="py-10 text-center space-y-4 bg-white/5 border border-white/10 rounded-2xl p-4">
                        <FileCheck className="h-8 w-8 mx-auto text-indigo-400" />
                        <p className="text-xs text-indigo-200/80">This document has not been audited by the AI system yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedDoc && !isAnalyzing && (
                <div className="pt-6 mt-6 border-t border-white/10">
                  <button
                    onClick={() => runAiAnalysis(selectedDoc)}
                    className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 px-4 rounded-2xl shadow-lg shadow-indigo-950 transition-all hover:scale-[1.01]"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{aiReport ? "Re-Run Audit Check" : "Run AI Audit Checker"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upload Modal */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-xl font-black text-gray-900">Upload Evidence Document</h3>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-50 rounded-xl transition-all"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveDoc} className="space-y-4">
                {/* File Upload Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Select Evidence File (PDF or Image)</label>
                  <div className="relative border border-dashed border-gray-200 hover:border-sky-300 rounded-2xl p-6 text-center transition-all bg-gray-50/50 group cursor-pointer">
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setSelectedFile(file);
                          setDocName(file.name);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isUploading}
                    />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Upload className="h-8 w-8 text-sky-600 group-hover:scale-110 transition-transform" />
                      {selectedFile ? (
                        <div>
                          <p className="text-xs font-bold text-gray-800 truncate max-w-[250px]">{selectedFile.name}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Click to change</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-bold text-gray-800">Drag & drop or click to choose file</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Supports PDF, PNG, JPG (Max 10MB)</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Document Name</label>
                  <input
                    type="text"
                    required
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    disabled={isUploading}
                    className="w-full bg-gray-50 border-0 rounded-2xl py-3 px-4 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                    placeholder="e.g. CIPC Shareholder Registry.pdf"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">B-BBEE Element</label>
                    <select
                      value={docElement}
                      onChange={(e) => setDocElement(e.target.value as any)}
                      disabled={isUploading}
                      className="w-full bg-gray-50 border-0 rounded-2xl py-3 px-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="ownership">Ownership</option>
                      <option value="skills">Skills Development</option>
                      <option value="procurement">Procurement (Spend)</option>
                      <option value="esd">ESD</option>
                      <option value="sed">SED (Donations)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Initial Tag</label>
                    <select
                      value={docTag}
                      onChange={(e) => setDocTag(e.target.value as any)}
                      disabled={isUploading}
                      className="w-full bg-gray-50 border-0 rounded-2xl py-3 px-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="pending_verification">Pending Review</option>
                      <option value="valid_for_audit">Valid for Audit</option>
                      <option value="missing_signature">Action Required</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Document URL (Optional Fallback)</label>
                  <input
                    type="text"
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    disabled={isUploading}
                    className="w-full bg-gray-50 border-0 rounded-2xl py-3 px-4 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                    placeholder="https://..."
                  />
                </div>

                <div className="pt-4 flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    disabled={isUploading}
                    className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-2xl hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="flex-1 bg-sky-600 text-white font-bold py-3 rounded-2xl hover:bg-sky-700 shadow-md shadow-sky-200 transition-colors text-sm disabled:bg-sky-400 flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <span>Save Document</span>
                    )}
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
