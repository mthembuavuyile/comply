import React, { useEffect, useState, useRef, useMemo } from "react";
import { useAuth } from "../App";
import { useClient } from "../lib/clientContext";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, onSnapshot, addDoc, Timestamp } from "firebase/firestore";
import { Supplier, SpendLog, EvidenceDoc } from "../types";
import Layout from "../components/Layout";
import {
  Send,
  Brain,
  Paperclip,
  Upload,
  User,
  Bot,
  RefreshCw,
  FileCheck,
  CheckCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  PlusCircle,
  FileText,
} from "lucide-react";
import { cn } from "../lib/utils";
import { GoogleGenAI } from "@google/genai";

// Dynamic helper to retrieve configured Gemini API key
function getAIInstance() {
  const savedKey = localStorage.getItem("comply_gemini_api_key");
  const envKey = (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '') || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
  const apiKey = savedKey || envKey || '';
  return apiKey ? new GoogleGenAI({ apiKey }) : null;
}

interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: Date;
}

const SUGGESTED_PROMPTS = [
  "How can I quickly improve my Procurement score?",
  "What is the target spend for Skills Development?",
  "How does Black Women Ownership affect my points?",
  "What is the difference between ED and SD?",
];

export default function AIAssistantPage() {
  const { user } = useAuth();
  const { activeClient, activeClientId, clientsLoading } = useClient();
  
  // Chat States
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      content: "Hello! I am your AI B-BBEE Copilot. I can help you formulate compliance strategies, explain scorecard points rules, analyze supplier recognition, and assist in SANAS audit preparation. Ask me any compliance question!",
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // OCR States
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<{
    docType: "BEE Certificate" | "Skills Invoice" | "SED Donation";
    extractedFields: Record<string, string | number>;
  } | null>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // Handle Send Chat Message
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    e?.preventDefault();
    const textToSend = customText || chatInput.trim();
    if (!textToSend || isSending) return;

    if (!customText) setChatInput("");

    // Append user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    const aiInstance = getAIInstance();

    // Call Gemini API or fallback
    try {
      if (aiInstance) {
        // Construct chat history
        const history = messages.map((m) => ({
          role: m.role,
          parts: [{ text: m.content }],
        }));
        history.push({
          role: "user",
          parts: [{ text: textToSend }],
        });

        // B-BBEE System Context
        const systemInstruction = `You are ComplyOS's AI B-BBEE Copilot, a leading Broad-Based Black Economic Empowerment strategist in South Africa.
Your objective is to help businesses optimize their BEE scorecard points and levels under the South African B-BBEE Codes of Good Practice.
Ground rules:
- Always use South African terms.
- Be highly detailed about points allocations: Ownership (25 pts), Skills Development (20 pts), Procurement (25 pts), Enterprise & Supplier Development (15 pts), Socio-Economic Development (5 pts).
- Frame advice within the user's business context: ${activeClient ? `${activeClient.businessName} operating in the ${activeClient.sector} sector.` : "A South African enterprise."}
- Point out priority elements and sub-minimums (Ownership, Skills Development, and ESD are priority elements. Under-achieving 40% of their targets results in a B-BBEE level drop penalty).
- Keep formatting clean, using bold points and brief summaries.`;

        const response = await aiInstance.models.generateContent({
          model: "gemini-2.5-flash",
          contents: history,
          config: {
            systemInstruction,
          },
        });

        const reply: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "model",
          content: response.text || "I was unable to formulate a strategy. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, reply]);
      } else {
        // Warning that API key is missing
        await new Promise((resolve) => setTimeout(resolve, 800));
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "model",
            content: "⚠️ **Gemini API Key is missing.** Please configure your API key in **Settings -> Connected Accounts** or in your `.env` file (`VITE_GEMINI_API_KEY`) to enable the B-BBEE Copilot chat.",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error("AI Assistant Chat Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "model",
          content: "❌ **API connection failed.** Please ensure you have a valid internet connection or ask a different question.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Run real multi-modal OCR analysis
  const handleOcrFileAnalysis = async (file: File) => {
    const aiInstance = getAIInstance();
    if (!aiInstance) {
      alert("Please configure your Gemini API Key in Settings (Connected Accounts) or env files first.");
      return;
    }

    setIsOcrProcessing(true);
    setOcrResult(null);

    try {
      const base64Data = await readFileAsBase64(file);
      const mimeType = file.type || "application/pdf";

      const prompt = `Analyze the attached compliance document and extract key B-BBEE verification fields.
First, classify it into one of these document types: "BEE Certificate", "Skills Invoice", or "SED Donation".

Return a JSON object conforming exactly to this structure:
{
  "docType": "BEE Certificate" | "Skills Invoice" | "SED Donation",
  "extractedFields": {
    // If B-BBEE Certificate (or Sworn Affidavit):
    "Supplier Name": "Official company name",
    "B-BBEE Level": "BEE level as a number from 1 to 9 (where 9 is non-compliant)",
    "Recognition Factor": "e.g. 135%",
    "Black Ownership": "e.g. 51%",
    "Black Women Ownership": "e.g. 30%",
    "Category": "EME" | "QSE" | "Generic",
    "Expiry Date": "YYYY-MM-DD"
    
    // If training invoice / Skills Development invoice:
    "Vendor": "Name of vendor / supplier / institution",
    "Description": "Details of what training/course was conducted",
    "Amount (ZAR)": "R X,XXX.XX",
    "Date": "YYYY-MM-DD"
    
    // If SED (Socio-Economic Development) donation receipt / letter:
    "Beneficiary NPO": "Name of charity / NPO",
    "NPO Number": "NPO registration number if available",
    "Contribution Type": "e.g. monetary grant",
    "Amount (ZAR)": "R X,XXX.XX",
    "Date": "YYYY-MM-DD",
    "PBO Section 18A Status": "Yes" | "No"
  }
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
      if (!result.docType || !result.extractedFields) {
        throw new Error("Extracted JSON is missing required fields");
      }
      setOcrResult(result);
    } catch (err: any) {
      console.error("Gemini OCR Analysis Error:", err);
      alert(`OCR Extraction Failed: ${err.message || err}`);
    } finally {
      setIsOcrProcessing(false);
    }
  };

  // Add OCR extracted data to Firestore dynamically
  const handleOcrAddToSystem = async () => {
    if (!user || !activeClientId || !ocrResult) return;

    try {
      if (ocrResult.docType === "BEE Certificate") {
        const fields = ocrResult.extractedFields;
        const expiry = fields["Expiry Date"] as string;

        // Parse extracted values dynamically
        const rawLevel = String(fields["B-BBEE Level"] || "4");
        const levelNum = Number(rawLevel.replace(/[^\d]/g, "")) || 4;

        const rawBlackOwn = String(fields["Black Ownership"] || "0");
        const blackOwnNum = Number(rawBlackOwn.replace(/[^\d.]/g, "")) || 0;

        const rawBlackWomenOwn = String(fields["Black Women Ownership"] || "0");
        const blackWomenOwnNum = Number(rawBlackWomenOwn.replace(/[^\d.]/g, "")) || 0;

        await addDoc(collection(db, "suppliers"), {
          userId: user.uid,
          businessId: activeClientId,
          name: (fields["Supplier Name"] as string) || "New Supplier",
          beeLevel: levelNum,
          blackOwnershipPercent: blackOwnNum,
          blackWomenOwnershipPercent: blackWomenOwnNum,
          annualSpend: 0, 
          category: (fields["Category"] as any) || "EME",
          certificateUrl: "https://firebasestorage.googleapis.com/v0/b/comply-b3bfe.firebasestorage.app/o/ocr_siya_cert.pdf",
          certificateExpiry: expiry ? Timestamp.fromDate(new Date(expiry)) : null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        alert(`Success! "${fields["Supplier Name"] || "Supplier"}" added to your Suppliers CRM.`);
      } else if (ocrResult.docType === "Skills Invoice") {
        const fields = ocrResult.extractedFields;
        const amountStr = (String(fields["Amount (ZAR)"] || "0")).replace(/[^\d.]/g, "");
        await addDoc(collection(db, "spendLogs"), {
          userId: user.uid,
          businessId: activeClientId,
          category: "skills_development",
          description: (fields["Description"] as string) || (fields["Vendor"] ? `Training with ${fields["Vendor"]}` : "Training course"),
          amount: Number(amountStr) || 0,
          date: Timestamp.fromDate(fields["Date"] ? new Date(fields["Date"] as string) : new Date()),
          evidenceUrl: "https://firebasestorage.googleapis.com/v0/b/comply-b3bfe.firebasestorage.app/o/ocr_invoice.pdf",
          createdAt: Timestamp.now(),
        });
        alert("Success! Training expenditure logged in your Spend Tracker ledger.");
      } else {
        const fields = ocrResult.extractedFields;
        const amountStr = (String(fields["Amount (ZAR)"] || "0")).replace(/[^\d.]/g, "");
        await addDoc(collection(db, "spendLogs"), {
          userId: user.uid,
          businessId: activeClientId,
          category: "socio_economic_development",
          description: `Donation to ${fields["Beneficiary NPO"] || "NPO"}`,
          amount: Number(amountStr) || 0,
          date: Timestamp.fromDate(fields["Date"] ? new Date(fields["Date"] as string) : new Date()),
          evidenceUrl: "https://firebasestorage.googleapis.com/v0/b/comply-b3bfe.firebasestorage.app/o/ocr_donation.pdf",
          createdAt: Timestamp.now(),
        });
        alert("Success! SED Donation logged in your Spend Tracker ledger.");
      }
      setOcrResult(null);
      setSelectedFile(null);
    } catch (err) {
      console.error("Error writing OCR data:", err);
      alert("Failed to integrate OCR data.");
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-md  p-16 text-center max-w-2xl mx-auto my-12">
          <div className="mx-auto w-16 h-16 bg-sky-50 rounded-lg border border-sky-100 flex items-center justify-center mb-6">
            
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">No Active Client Selected</h3>
          <p className="text-gray-500 font-medium text-sm mb-6">
            Please select a client business from the portfolio or create a new client to access the AI B-BBEE Copilot.
          </p>
          <a
            href="/clients"
            className="inline-flex items-center gap-2 px-5 py-2.5  bg-sky-600  hover:bg-sky-700 hover: text-white text-sm font-bold rounded-xl shadow-lg"
          >
            Go to Clients Portfolio
          </a>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 max-w-7xl mx-auto h-[calc(100vh-160px)] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">AI B-BBEE Copilot</h1>
            <p className="text-gray-500 font-medium mt-1">
              Ask compliance strategies or process invoices and certificates with AI OCR.
            </p>
          </div>
        </div>

        {/* Main Grid split */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Panel */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-md  flex flex-col min-h-0">
            {/* Chat header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-gray-50/50 rounded-t-3xl">
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-sky-600 " />
                <span className="font-extrabold text-gray-900">B-BBEE Consulting Chat</span>
              </div>
              <span className="text-[10px] bg-sky-100 text-sky-800 border border-sky-200 font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                Gemini-powered
              </span>
            </div>

            {/* Chat Messages scroll area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-100 scrollbar-track-transparent">
              {messages.map((msg) => {
                const isUser = msg.role === "user";

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex items-start gap-3 max-w-[85%] animate-in fade-in duration-200",
                      isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-xl flex-shrink-0 shadow-sm",
                      isUser ? "bg-sky-600 text-white" : "bg-indigo-50 text-indigo-700"
                    )}>
                      {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>

                    <div className={cn(
                      "p-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap select-text",
                      isUser
                        ? "bg-sky-600 text-white shadow-md  rounded-tr-none"
                        : "bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-none"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}

              {isSending && (
                <div className="flex items-start gap-3 max-w-[80%]">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 flex-shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-gray-400 text-sm flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>AI B-BBEE strategist is formulating a response...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggested prompts list */}
            {messages.length === 1 && (
              <div className="p-4 border-t border-gray-50 flex flex-wrap gap-2 justify-center flex-shrink-0">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSendMessage(undefined, prompt)}
                    className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 font-semibold py-2 px-3.5 rounded-xl border border-gray-200/50 transition-all active:scale-[0.98]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Chat Input form */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about priority elements, targets, points calculations..."
                className="flex-1 bg-gray-50 border-0 rounded-lg py-3.5 px-4 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all outline-none"
              />
              <button
                type="submit"
                disabled={isSending || !chatInput.trim()}
                className="bg-sky-600 hover:bg-sky-700 text-white p-3.5 rounded-lg shadow-md disabled:bg-gray-300 transition-all active:scale-[0.97]"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>

          {/* AI OCR side panel */}
          <div className=" bg-indigo-950  p-6 rounded-xl border border-indigo-900 shadow-md  text-white flex flex-col justify-between min-h-[500px]">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center space-x-2 text-indigo-400">
                  
                  <span className="text-xs font-black uppercase tracking-widest">AI Document OCR Extractor</span>
                </div>
              </div>

              <p className="text-xs text-indigo-200/80 leading-relaxed mb-6">
                Upload B-BBEE certificates, training invoices, or SED donation letters. Our OCR engine parses levels, dates, and amounts.
              </p>

              {/* Upload actions / Drag boxes */}
              <div className="space-y-4">
                <h5 className="text-[10px] font-black uppercase tracking-wider text-indigo-300">Upload real document (PDF or Image)</h5>
                
                <div className="relative border border-white/10 hover:border-white/20 rounded-xl p-6 text-center transition-all bg-white/5 group">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                        setOcrResult(null);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Upload className="h-8 w-8 text-indigo-400 group-hover:scale-105 transition-transform" />
                    {selectedFile ? (
                      <div>
                        <p className="text-xs font-bold text-white truncate max-w-[200px]">{selectedFile.name}</p>
                        <p className="text-[10px] text-indigo-300 mt-1">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Click to change</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-white">Drag & drop or click to upload</p>
                        <p className="text-[10px] text-indigo-300/70 mt-1">Accepts PDF, PNG, JPG (Max 10MB)</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedFile && (
                  <button
                    onClick={() => handleOcrFileAnalysis(selectedFile)}
                    disabled={isOcrProcessing}
                    className="w-full flex items-center justify-center space-x-2 bg-sky-600 hover:bg-sky-700 disabled:bg-gray-600 text-white font-bold text-xs py-3 px-4 rounded-lg shadow-lg transition-all active:scale-[0.98]"
                  >
                    {isOcrProcessing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        <span>AI OCR processing...</span>
                      </>
                    ) : (
                      <>
                        
                        <span>Analyze Document with Gemini</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Results area */}
              <div className="mt-8">
                {isOcrProcessing ? (
                  <div className="py-12 text-center space-y-4">
                    <RefreshCw className="h-8 w-8 mx-auto text-indigo-400 animate-spin" />
                    <p className="text-xs text-indigo-200">AI is parsing OCR blocks and validating entities...</p>
                  </div>
                ) : ocrResult ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                      <CheckCircle className="h-4 w-4" />
                      <span>Extracted: {ocrResult.docType}</span>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2 text-xs font-semibold">
                      {Object.entries(ocrResult.extractedFields).map(([key, val]) => (
                        <div key={key} className="flex justify-between py-1 border-b border-white/5">
                          <span className="text-indigo-300">{key}</span>
                          <span className="text-white truncate max-w-[150px]">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center border border-dashed border-white/15 rounded-xl p-6 flex flex-col items-center justify-center">
                    <Paperclip className="h-10 w-10 text-white/20 mb-3" />
                    <p className="text-xs text-white/40">Upload a compliance document above to extract details</p>
                  </div>
                )}
              </div>
            </div>

            {/* Save to System Button */}
            {ocrResult && !isOcrProcessing && (
              <div className="pt-6 mt-6 border-t border-white/10">
                <button
                  onClick={handleOcrAddToSystem}
                  className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 px-4 rounded-lg shadow-lg  transition-all active:scale-[0.98]"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Integrate into System</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
