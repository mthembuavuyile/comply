import { useState } from "react";
import { useAuth } from "../App";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, setDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Sector, BusinessStructure, VatStatus, EmployeeBand } from "../types";
import {
  COMMON_COMPLIANCE_ITEMS,
  SECTOR_SPECIFIC_ITEMS,
  SECTOR_OPTIONS,
  SECTOR_GROUP_LABELS,
  PROVINCES,
  BUSINESS_STRUCTURES,
  EMPLOYEE_BANDS,
  getSectorLabel,
} from "../constants";
import {
  Building2,
  Users,
  Briefcase,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  MapPin,
  Search,
  Landmark,
  FileCheck,
  Pencil,
  Rocket,
  HelpCircle,
} from "lucide-react";
import { cn } from "../lib/utils";

interface FormData {
  businessName: string;
  sector: Sector;
  customSectorText: string;
  province: string;
  vatRegistered: VatStatus;
  employeeBand: EmployeeBand;
  businessStructure: BusinessStructure;
  cipcRegistered: boolean;
}

const INITIAL_FORM: FormData = {
  businessName: "",
  sector: "general",
  customSectorText: "",
  province: "",
  vatRegistered: "not_sure",
  employeeBand: "0",
  businessStructure: "pty_ltd",
  cipcRegistered: false,
};

export default function OnboardingPage() {
  const { user, refreshBusiness } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sectorSearch, setSectorSearch] = useState("");
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);

  const update = (patch: Partial<FormData>) => setFormData((prev) => ({ ...prev, ...patch }));

  // --- Sector filtering ---
  const filteredSectors = SECTOR_OPTIONS.filter((s) =>
    s.label.toLowerCase().includes(sectorSearch.toLowerCase())
  );
  const groupedSectors = (['core', 'professional', 'regulated'] as const).map((group) => ({
    group,
    label: SECTOR_GROUP_LABELS[group],
    items: filteredSectors.filter((s) => s.group === group),
  })).filter((g) => g.items.length > 0);

  // --- Step validation ---
  const canProceed = () => {
    if (step === 1) {
      return formData.businessName.trim().length > 0 && formData.province.length > 0;
    }
    return true;
  };

  // --- Completion ---
  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Save business profile
      const businessData = {
        businessName: formData.businessName.trim(),
        sector: formData.sector,
        customSectorText: formData.sector === "other" ? formData.customSectorText.trim() : "",
        province: formData.province,
        vatRegistered: formData.vatRegistered,
        employeeBand: formData.employeeBand,
        businessStructure: formData.businessStructure,
        cipcRegistered: formData.cipcRegistered,
        onboardingCompleted: true,
        createdAt: serverTimestamp(),
        ownerId: user.uid,
      };

      try {
        await setDoc(doc(db, "businesses", user.uid), businessData);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `businesses/${user.uid}`);
      }

      // 2. Guard against duplicate seeding — check if items already exist
      const existingQ = query(
        collection(db, "complianceItems"),
        where("userId", "==", user.uid)
      );
      const existingSnap = await getDocs(existingQ);
      const existingCategories = new Set(existingSnap.docs.map((d) => d.data().category));

      // 3. Seed compliance items (only those not already present)
      const sectorItems = SECTOR_SPECIFIC_ITEMS[formData.sector] || [];
      const itemsToSeed = [...COMMON_COMPLIANCE_ITEMS, ...sectorItems].filter(
        (item) => !existingCategories.has(item.category)
      );

      const batch = itemsToSeed.map(async (item) => {
        try {
          return await addDoc(collection(db, "complianceItems"), {
            ...item,
            userId: user.uid,
            businessId: user.uid,
            status: "pending_setup",
            dueDate: null,
            expiryDate: null,
            evidenceUrls: [],
            notes: "",
            completedAt: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, "complianceItems");
        }
      });

      await Promise.all(batch);

      // 4. Mark onboarding as done in session (prevents redirect race condition)
      sessionStorage.setItem('vylex_onboarding_done', 'true');

      // 5. Refresh business context and navigate
      await refreshBusiness();
      navigate("/dashboard");
    } catch (error) {
      console.error("Error during onboarding:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Step label for progress ---
  const stepLabels = ["Business Identity", "Compliance Triggers", "Review & Confirm"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="bg-sky-600 p-2.5 rounded-xl shadow-lg shadow-sky-200/50 mr-3">
            <Briefcase className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">Vylex Comply</span>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          {/* Progress Bar */}
          <div className="px-8 pt-8 pb-0">
            <div className="flex items-center justify-between mb-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center flex-1 last:flex-none">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300",
                      step > s
                        ? "bg-green-500 text-white shadow-lg shadow-green-200"
                        : step === s
                        ? "bg-sky-500 text-white shadow-lg shadow-sky-200"
                        : "bg-gray-100 text-gray-400"
                    )}
                  >
                    {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                  </div>
                  {s < 3 && (
                    <div
                      className={cn(
                        "h-1 flex-1 mx-3 rounded-full transition-all duration-500",
                        step > s ? "bg-green-500" : "bg-gray-100"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mb-6">
              {stepLabels.map((label, i) => (
                <span
                  key={label}
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-widest transition-colors",
                    step === i + 1 ? "text-sky-600" : step > i + 1 ? "text-green-500" : "text-gray-300"
                  )}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="px-8 pb-8">
            {/* =================== STEP 1 =================== */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-400 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Tell us about your business</h2>
                  <p className="text-gray-500 text-sm">We'll use this to build your custom compliance roadmap.</p>
                </div>

                {/* Business Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Business Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Building2 className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => update({ businessName: e.target.value })}
                      className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-sm"
                      placeholder="e.g. Vylex Solutions (Pty) Ltd"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Province */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Province</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      value={formData.province}
                      onChange={(e) => update({ province: e.target.value })}
                      className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-sm appearance-none bg-white cursor-pointer"
                    >
                      <option value="">Select your province</option>
                      {PROVINCES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Industry Sector</label>
                  <div className="relative mb-3">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={sectorSearch}
                      onChange={(e) => setSectorSearch(e.target.value)}
                      className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                      placeholder="Search industries..."
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                    {groupedSectors.map(({ group, label, items }) => (
                      <div key={group}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 px-1">{label}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {items.map((s) => (
                            <button
                              key={s.value}
                              onClick={() => update({ sector: s.value })}
                              className={cn(
                                "flex items-center p-3 border-2 rounded-xl text-left transition-all text-sm",
                                formData.sector === s.value
                                  ? "border-sky-500 bg-sky-50 ring-1 ring-sky-500"
                                  : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                              )}
                            >
                              <Briefcase className={cn("w-4 h-4 mr-2 flex-shrink-0", formData.sector === s.value ? "text-sky-500" : "text-gray-400")} />
                              <span className={cn("font-medium text-xs leading-tight", formData.sector === s.value ? "text-sky-900" : "text-gray-600")}>
                                {s.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Catch-all */}
                    <div>
                      <button
                        onClick={() => update({ sector: "other" })}
                        className={cn(
                          "flex items-center w-full p-3 border-2 rounded-xl text-left transition-all text-sm",
                          formData.sector === "other"
                            ? "border-sky-500 bg-sky-50 ring-1 ring-sky-500"
                            : "border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        <HelpCircle className={cn("w-4 h-4 mr-2", formData.sector === "other" ? "text-sky-500" : "text-gray-400")} />
                        <span className={cn("font-medium text-xs", formData.sector === "other" ? "text-sky-900" : "text-gray-500")}>
                          My industry isn't listed
                        </span>
                      </button>
                      {formData.sector === "other" && (
                        <input
                          type="text"
                          value={formData.customSectorText}
                          onChange={(e) => update({ customSectorText: e.target.value })}
                          className="mt-2 block w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                          placeholder="Tell us your industry..."
                          autoFocus
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =================== STEP 2 =================== */}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-400 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Compliance triggers</h2>
                  <p className="text-gray-500 text-sm">Almost there! These help us determine your tax and labor obligations.</p>
                </div>

                {/* VAT Status */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">VAT Registered?</label>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: 'yes' as VatStatus, label: 'Yes', icon: CheckCircle2 },
                      { value: 'no' as VatStatus, label: 'No', icon: null },
                      { value: 'not_sure' as VatStatus, label: 'Not Sure', icon: HelpCircle },
                    ]).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => update({ vatRegistered: opt.value })}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all text-sm",
                          formData.vatRegistered === opt.value
                            ? "border-sky-500 bg-sky-50 ring-1 ring-sky-500"
                            : "border-gray-100 hover:border-gray-200"
                        )}
                      >
                        {opt.icon && <opt.icon className={cn("w-5 h-5 mb-1", formData.vatRegistered === opt.value ? "text-sky-500" : "text-gray-400")} />}
                        <span className={cn("font-semibold", formData.vatRegistered === opt.value ? "text-sky-900" : "text-gray-600")}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Employee Band */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Number of Employees</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Users className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      value={formData.employeeBand}
                      onChange={(e) => update({ employeeBand: e.target.value as EmployeeBand })}
                      className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-sm appearance-none bg-white cursor-pointer"
                    >
                      {EMPLOYEE_BANDS.map((b) => (
                        <option key={b.value} value={b.value}>{b.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Business Structure */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Business Structure</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {BUSINESS_STRUCTURES.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => update({ businessStructure: s.value })}
                        className={cn(
                          "flex items-center justify-center p-3.5 border-2 rounded-xl transition-all text-sm",
                          formData.businessStructure === s.value
                            ? "border-sky-500 bg-sky-50 ring-1 ring-sky-500"
                            : "border-gray-100 hover:border-gray-200"
                        )}
                      >
                        <Landmark className={cn("w-4 h-4 mr-2 flex-shrink-0", formData.businessStructure === s.value ? "text-sky-500" : "text-gray-400")} />
                        <span className={cn("font-semibold text-xs", formData.businessStructure === s.value ? "text-sky-900" : "text-gray-600")}>
                          {s.shortLabel}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* CIPC Registered */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">CIPC Registered?</h3>
                    <p className="text-xs text-gray-500">Is your company registered with CIPC?</p>
                  </div>
                  <button
                    onClick={() => update({ cipcRegistered: !formData.cipcRegistered })}
                    className={cn(
                      "relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2",
                      formData.cipcRegistered ? "bg-sky-500" : "bg-gray-200"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform",
                        formData.cipcRegistered ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* =================== STEP 3 =================== */}
            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-400 space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileCheck className="w-8 h-8 text-sky-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Here's your compliance profile</h2>
                  <p className="text-gray-500 text-sm">Review your details, then we'll build your personalised roadmap.</p>
                </div>

                {/* Summary Card */}
                <div className="space-y-4">
                  {/* Business Identity Section */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Business Identity</h4>
                      <button onClick={() => setStep(1)} className="flex items-center text-sky-600 text-xs font-bold hover:text-sky-700 transition-colors">
                        <Pencil className="w-3 h-3 mr-1" /> Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <SummaryField label="Business Name" value={formData.businessName} />
                      <SummaryField label="Industry" value={formData.sector === 'other' ? (formData.customSectorText || 'Other') : getSectorLabel(formData.sector)} />
                      <SummaryField label="Province" value={formData.province} />
                    </div>
                  </div>

                  {/* Compliance Triggers Section */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Compliance Triggers</h4>
                      <button onClick={() => setStep(2)} className="flex items-center text-sky-600 text-xs font-bold hover:text-sky-700 transition-colors">
                        <Pencil className="w-3 h-3 mr-1" /> Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <SummaryField label="VAT Registered" value={formData.vatRegistered === 'yes' ? 'Yes' : formData.vatRegistered === 'no' ? 'No' : 'Not Sure'} />
                      <SummaryField label="Employees" value={EMPLOYEE_BANDS.find(b => b.value === formData.employeeBand)?.label || formData.employeeBand} />
                      <SummaryField label="Structure" value={BUSINESS_STRUCTURES.find(s => s.value === formData.businessStructure)?.shortLabel || formData.businessStructure} />
                      <SummaryField label="CIPC" value={formData.cipcRegistered ? "Registered" : "Not Registered"} />
                    </div>
                  </div>

                  {/* Items Preview */}
                  <div className="bg-sky-50 rounded-2xl border border-sky-100 p-5">
                    <h4 className="text-xs font-black text-sky-900 uppercase tracking-widest mb-3">
                      Your Compliance Roadmap Will Include:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {[...COMMON_COMPLIANCE_ITEMS, ...(SECTOR_SPECIFIC_ITEMS[formData.sector] || [])].map((item) => (
                        <span key={item.category} className="px-3 py-1.5 bg-white text-sky-700 text-xs font-semibold rounded-lg border border-sky-200">
                          {item.title}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex justify-between items-center pt-6 border-t border-gray-100">
              {step > 1 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex items-center text-gray-500 font-semibold hover:text-gray-700 transition-colors text-sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Back
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={() => {
                  if (step < 3) setStep(step + 1);
                  else handleComplete();
                }}
                disabled={loading || !canProceed()}
                className={cn(
                  "flex items-center px-8 py-3 font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 text-sm",
                  step === 3
                    ? "bg-green-600 text-white shadow-green-200 hover:bg-green-700"
                    : "bg-sky-600 text-white shadow-sky-200 hover:bg-sky-700"
                )}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {step === 3 ? (
                      <>
                        <Rocket className="w-4 h-4 mr-2" />
                        Build My Roadmap
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value || "—"}</p>
    </div>
  );
}
