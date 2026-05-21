import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../App";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Supplier, SpendLog, ScorecardProject, Alert } from "../types";
import Layout from "../components/Layout";
import { calculateScorecard } from "../lib/scorecardEngine";
import { getSectorLabel } from "../constants";
import {
  Award,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle,
  Bell,
  Sparkles,
  TrendingUp,
  FileCheck,
  Users,
  Info,
  Settings,
  ChevronRight,
  TrendingDown,
  Building2,
  Coins,
  ArrowRight,
  ArrowUpRight,
  ListTodo,
  CheckSquare,
  Square,
  HelpCircle,
  FlameKindling,
  UserCheck
} from "lucide-react";
import { cn, formatDate } from "../lib/utils";

// Checklist tasks structure
interface ChecklistItem {
  id: string;
  label: string;
  category: string;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "supplier_certs", label: "Request updated B-BBEE certificates from all active suppliers", category: "procurement" },
  { id: "voting_rights", label: "Verify company black ownership & voting rights documentation", category: "ownership" },
  { id: "skills_audit", label: "Audit training spend invoices & payroll data against the 6% target", category: "skills" },
  { id: "esd_agreements", label: "Gather Enterprise & Supplier Development (ESD) contribution agreements", category: "esd" },
  { id: "sed_receipts", label: "Collect Socio-Economic Development (SED) donation receipts & NPO letters", category: "sed" },
  { id: "auditor_pack", label: "Generate and export auditor-ready ZIP evidence pack", category: "general" },
];

export default function DashboardPage() {
  const { user, business } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [spendLogs, setSpendLogs] = useState<SpendLog[]>([]);
  const [projects, setProjects] = useState<ScorecardProject[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});

  // Fetch Firestore collections
  useEffect(() => {
    if (!user) return;

    const unsubSuppliers = onSnapshot(
      query(collection(db, "suppliers"), where("userId", "==", user.uid)),
      (snapshot) => {
        setSuppliers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Supplier[]);
      },
      (error) => handleFirestoreError(error, OperationType.GET, "suppliers")
    );

    const unsubSpend = onSnapshot(
      query(collection(db, "spendLogs"), where("userId", "==", user.uid)),
      (snapshot) => {
        setSpendLogs(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as SpendLog[]);
      },
      (error) => handleFirestoreError(error, OperationType.GET, "spendLogs")
    );

    const unsubProjects = onSnapshot(
      query(collection(db, "scorecardProjects"), where("userId", "==", user.uid)),
      (snapshot) => {
        setProjects(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ScorecardProject[]);
      },
      (error) => handleFirestoreError(error, OperationType.GET, "scorecardProjects")
    );

    const unsubAlerts = onSnapshot(
      query(collection(db, "alerts"), where("userId", "==", user.uid), where("read", "==", false)),
      (snapshot) => {
        setAlerts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Alert[]);
      },
      (error) => handleFirestoreError(error, OperationType.GET, "alerts")
    );

    return () => {
      unsubSuppliers();
      unsubSpend();
      unsubProjects();
      unsubAlerts();
    };
  }, [user]);

  // Load interactive checklist state from localStorage
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`vylex_bbbee_checklist_${user.uid}`);
      if (stored) {
        try {
          setCheckedTasks(JSON.parse(stored));
        } catch (e) {
          console.error("Error reading checklist storage:", e);
        }
      } else {
        setCheckedTasks({});
      }
    }
  }, [user]);

  // Toggle checklist tasks
  const handleToggleTask = (taskId: string) => {
    if (!user) return;
    const nextState = { ...checkedTasks, [taskId]: !checkedTasks[taskId] };
    setCheckedTasks(nextState);
    localStorage.setItem(`vylex_bbbee_checklist_${user.uid}`, JSON.stringify(nextState));
  };

  // Calculate live scorecard
  const liveScorecard = useMemo(() => {
    return calculateScorecard(business, suppliers, spendLogs);
  }, [business, suppliers, spendLogs]);

  // Active Project Timeline (latest year)
  const activeProject = useMemo(() => {
    if (projects.length === 0) return null;
    // Sort descending by financialYear
    return [...projects].sort((a, b) => b.financialYear.localeCompare(a.financialYear))[0];
  }, [projects]);

  // Recognition rate label matching level
  const recognitionRatePercent = useMemo(() => {
    const mappings: Record<number, number> = {
      1: 135,
      2: 125,
      3: 110,
      4: 100,
      5: 80,
      6: 60,
      7: 50,
      8: 10,
      9: 0,
    };
    return mappings[liveScorecard.projectedLevel] ?? 0;
  }, [liveScorecard.projectedLevel]);

  // Dynamic Risk Alerts computation
  const dynamicRisks = useMemo(() => {
    const list: {
      id: string;
      severity: "critical" | "warning" | "info";
      title: string;
      message: string;
      actionUrl: string;
      actionLabel: string;
    }[] = [];

    const today = new Date();

    // 1. Missing Financial Config
    if (!business?.annualPayroll || !business?.npat) {
      list.push({
        id: "missing_finance_config",
        severity: "critical",
        title: "Financial Targets Not Configured",
        message: "Configure your annual payroll and Net Profit After Tax (NPAT) to accurately model B-BBEE spending targets.",
        actionUrl: "/spend",
        actionLabel: "Configure Now",
      });
    }

    // 2. Expired Supplier Certificates
    const expiredSuppliers = suppliers.filter(s => {
      if (!s.certificateExpiry) return false;
      const expiry = s.certificateExpiry.toDate();
      return expiry < today;
    });

    if (expiredSuppliers.length > 0) {
      list.push({
        id: "expired_certs",
        severity: "critical",
        title: `${expiredSuppliers.length} Expired Supplier Certificate${expiredSuppliers.length === 1 ? "" : "s"}`,
        message: `${expiredSuppliers.length === 1 ? "A supplier certificate has" : `${expiredSuppliers.length} supplier certificates have`} expired. This invalidates their recognition weighting until updated.`,
        actionUrl: "/suppliers",
        actionLabel: "Update Suppliers",
      });
    }

    // 3. Expiring Soon Supplier Certificates (within 30 days)
    const expiringSoonSuppliers = suppliers.filter(s => {
      if (!s.certificateExpiry) return false;
      const expiry = s.certificateExpiry.toDate();
      const diffMs = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 30;
    });

    if (expiringSoonSuppliers.length > 0) {
      list.push({
        id: "expiring_soon_certs",
        severity: "warning",
        title: `${expiringSoonSuppliers.length} Certificate${expiringSoonSuppliers.length === 1 ? "" : "s"} Expiring Soon`,
        message: `${expiringSoonSuppliers.length === 1 ? "A supplier certificate expires" : `${expiringSoonSuppliers.length} certificates expire`} within 30 days. Request updated verification packs immediately.`,
        actionUrl: "/suppliers",
        actionLabel: "View Certificates",
      });
    }

    // 4. Skills Spend Gap
    if (liveScorecard.targets.skillsGap > 0) {
      list.push({
        id: "skills_spend_gap",
        severity: "warning",
        title: "Skills Development Target Gap",
        message: `You are R ${liveScorecard.targets.skillsGap.toLocaleString("en-ZA", { maximumFractionDigits: 0 })} short of the 6% payroll investment target (R ${liveScorecard.targets.skillsTarget.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}).`,
        actionUrl: "/spend",
        actionLabel: "Log Training Spend",
      });
    }

    // 5. ED Spend Gap
    if (liveScorecard.targets.edGap > 0) {
      list.push({
        id: "ed_spend_gap",
        severity: "info",
        title: "Enterprise Development (ED) Gap",
        message: `Invest R ${liveScorecard.targets.edGap.toLocaleString("en-ZA", { maximumFractionDigits: 0 })} more in qualified black EMEs or QSEs to secure full ED points.`,
        actionUrl: "/spend",
        actionLabel: "Log ED Support",
      });
    }

    // 6. SD Spend Gap
    if (liveScorecard.targets.sdGap > 0) {
      list.push({
        id: "sd_spend_gap",
        severity: "info",
        title: "Supplier Development (SD) Gap",
        message: `Invest R ${liveScorecard.targets.sdGap.toLocaleString("en-ZA", { maximumFractionDigits: 0 })} more in black-owned suppliers to meet your 2% NPAT SD target.`,
        actionUrl: "/spend",
        actionLabel: "Log SD Support",
      });
    }

    // 7. SED Spend Gap
    if (liveScorecard.targets.sedGap > 0) {
      list.push({
        id: "sed_spend_gap",
        severity: "info",
        title: "Socio-Economic Development (SED) Gap",
        message: `You are R ${liveScorecard.targets.sedGap.toLocaleString("en-ZA", { maximumFractionDigits: 0 })} away from your 1% NPAT SED charitable contribution target.`,
        actionUrl: "/spend",
        actionLabel: "Log Donations",
      });
    }

    // 8. Low Ownership Warning
    if (business && (business.blackOwnershipPercent || 0) < 25.1) {
      list.push({
        id: "low_black_ownership",
        severity: "warning",
        title: "Sub-Optimal Ownership points",
        message: `Black economic interest is currently ${(business.blackOwnershipPercent || 0)}%. A minimum of 25.1% is required to maximize points and avoid sub-minimum penalties.`,
        actionUrl: "/calculator",
        actionLabel: "Simulate Ownership",
      });
    }

    return list;
  }, [business, suppliers, liveScorecard]);

  // Scorecard categories formatted nicely for horizontal progression bars
  const scorecardCategories = useMemo(() => {
    const { points } = liveScorecard;
    return [
      {
        name: "Ownership",
        desc: "Equity ownership, voting rights & economic interest of black shareholders",
        actual: points.ownership,
        max: 25.00,
        colorClass: "bg-amber-500",
        badge: points.ownership >= 20 ? "Optimal" : points.ownership >= 10 ? "Moderate" : "Low",
        badgeColor: points.ownership >= 20 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : points.ownership >= 10 ? "bg-sky-50 text-sky-700 border-sky-100" : "bg-red-50 text-red-700 border-red-100",
      },
      {
        name: "Skills Development",
        desc: "Training spend on black employees, bursaries, and work learnerships",
        actual: points.skills,
        max: 20.00,
        colorClass: "bg-indigo-500",
        badge: points.skills >= 16 ? "Target Reached" : points.skills >= 8 ? "Partial" : "Critical Gap",
        badgeColor: points.skills >= 16 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : points.skills >= 8 ? "bg-sky-50 text-sky-700 border-sky-100" : "bg-red-50 text-red-700 border-red-100",
      },
      {
        name: "Procurement Weighting",
        desc: "B-BBEE recognition spend percentage across all active suppliers",
        actual: points.procurement,
        max: 25.00,
        colorClass: "bg-rose-500",
        badge: points.procurement >= 20 ? "On Target" : points.procurement >= 10 ? "Satisfactory" : "Low Recognition",
        badgeColor: points.procurement >= 20 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : points.procurement >= 10 ? "bg-sky-50 text-sky-700 border-sky-100" : "bg-red-50 text-red-700 border-red-100",
      },
      {
        name: "Enterprise & Supplier Dev (ED & SD)",
        desc: "Contributions supporting suppliers & independent black businesses",
        actual: points.esdSubtotal,
        max: 15.00,
        colorClass: "bg-emerald-500",
        badge: points.esdSubtotal >= 12 ? "Optimized" : points.esdSubtotal >= 6 ? "Progressing" : "Under-invested",
        badgeColor: points.esdSubtotal >= 12 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : points.esdSubtotal >= 6 ? "bg-sky-50 text-sky-700 border-sky-100" : "bg-red-50 text-red-700 border-red-100",
      },
      {
        name: "Socio-Economic Development (SED)",
        desc: "Grants & donations aligned with local community empowerment",
        actual: points.sed,
        max: 5.00,
        colorClass: "bg-sky-500",
        badge: points.sed >= 4.5 ? "Full Points" : points.sed >= 2.5 ? "Partial" : "Action Required",
        badgeColor: points.sed >= 4.5 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : points.sed >= 2.5 ? "bg-sky-50 text-sky-700 border-sky-100" : "bg-red-50 text-red-700 border-red-100",
      },
    ];
  }, [liveScorecard]);

  // Summary counts for dashboard metrics
  const checklistTotalCount = DEFAULT_CHECKLIST.length;
  const checklistCheckedCount = Object.values(checkedTasks).filter(Boolean).length;
  const checklistPercentage = Math.round((checklistCheckedCount / checklistTotalCount) * 100);

  const sectorLabel = business ? getSectorLabel(business.sector) : "";

  return (
    <Layout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {business?.businessName || "Vylex Comply"}
              </h1>
              {sectorLabel && (
                <span className="px-3 py-1 bg-sky-100 text-sky-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-sky-200 shadow-sm shadow-sky-50/50">
                  {sectorLabel}
                </span>
              )}
            </div>
            <p className="text-gray-500 font-medium">
              B-BBEE Compliance Health Monitor · {new Intl.DateTimeFormat("en-ZA", { dateStyle: "full" }).format(new Date())}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <a
              href="/ai"
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-sky-100"
            >
              <Sparkles className="h-4 w-4" />
              <span>Ask AI BEE Copilot</span>
            </a>
          </div>
        </div>

        {/* Level Radial Wheel & Score Summary cockpit */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Circular Wheel Gauge Card */}
          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <a href="/calculator" className="p-1.5 text-gray-400 hover:text-sky-600 transition-colors">
                <ArrowUpRight className="h-5 w-5" />
              </a>
            </div>
            <div className="relative w-48 h-48 mb-5">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="84"
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="transparent"
                  className="text-gray-100"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="84"
                  stroke="url(#beeGrad)"
                  strokeWidth="12"
                  fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray={527.78}
                  strokeDashoffset={527.78 - (527.78 * liveScorecard.points.total) / 100}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="beeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black text-gray-900 tracking-tighter">
                  {liveScorecard.points.total.toFixed(1)}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                  of 100 Points
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className={cn(
                "px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-wider inline-block border",
                liveScorecard.projectedLevel === 9
                  ? "bg-rose-50 text-rose-700 border-rose-100"
                  : "bg-emerald-50 text-emerald-700 border-emerald-100"
              )}>
                {liveScorecard.projectedLevel === 9 ? "Non-Compliant" : `Level ${liveScorecard.projectedLevel} Contributor`}
              </div>
              <p className="text-xs text-gray-400 font-bold mt-1">
                Client Recognition Rate: <span className="text-gray-700 font-black">{recognitionRatePercent}%</span>
              </p>
            </div>
          </div>

          {/* Quick Metrics Cockpit cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col justify-between group hover:scale-[1.01] transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-amber-500">
                  <Coins className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Ownership Weight</p>
                  <p className="text-xl font-black text-gray-900 mt-0.5">
                    {business?.blackOwnershipPercent || 0}%
                  </p>
                </div>
              </div>
              <div>
                <h4 className="font-extrabold text-gray-900">Black Equity Interest</h4>
                <p className="text-xs text-gray-400 font-medium mt-1">
                  Women ownership matches: <span className="font-bold text-gray-700">{business?.blackWomenOwnershipPercent || 0}%</span>
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col justify-between group hover:scale-[1.01] transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-500">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Total Spend</p>
                  <p className="text-xl font-black text-gray-900 mt-0.5">
                    R {spendLogs.reduce((sum, s) => sum + s.amount, 0).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="font-extrabold text-gray-900">Skills, ED, SD & SED Spend</h4>
                <p className="text-xs text-gray-400 font-medium mt-1">
                  Across <span className="font-bold text-gray-700">{spendLogs.length} logged ledger entries</span>
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col justify-between group hover:scale-[1.01] transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 text-rose-500">
                  <Users className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Suppliers Registered</p>
                  <p className="text-xl font-black text-gray-900 mt-0.5">
                    {suppliers.length}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="font-extrabold text-gray-900">Procurement Base CRM</h4>
                <p className="text-xs text-gray-400 font-medium mt-1">
                  Weighted recognition: <span className="font-bold text-gray-700">
                    R {suppliers.reduce((sum, s) => {
                      const rec = s.beeLevel === 1 ? 1.35 : s.beeLevel === 2 ? 1.25 : s.beeLevel === 3 ? 1.10 : s.beeLevel === 4 ? 1.00 : s.beeLevel === 5 ? 0.80 : s.beeLevel === 6 ? 0.60 : s.beeLevel === 7 ? 0.50 : s.beeLevel === 8 ? 0.10 : 0;
                      return sum + s.annualSpend * rec;
                    }, 0).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}
                  </span>
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col justify-between group hover:scale-[1.01] transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-500">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Audit Prep Tasks</p>
                  <p className="text-xl font-black text-gray-900 mt-0.5">
                    {checklistPercentage}%
                  </p>
                </div>
              </div>
              <div>
                <h4 className="font-extrabold text-gray-900">Checklist Completion</h4>
                <p className="text-xs text-gray-400 font-medium mt-1">
                  {checklistCheckedCount} of {checklistTotalCount} actions finalized
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 5 Elements Scorecard Progress bars */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Scorecard Element Progress</h3>
              <p className="text-xs text-gray-400 font-medium mt-1">Points breakdown calculated directly via current recorded evidence and targets.</p>
            </div>
            <a
              href="/calculator"
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 bg-sky-50 px-3.5 py-2 rounded-xl transition-all"
            >
              <span>Scenario Calculator</span>
              <ChevronRight className="h-4.5 w-4.5" />
            </a>
          </div>

          <div className="space-y-6">
            {scorecardCategories.map((cat) => {
              const pct = Math.min(100, Math.round((cat.actual / cat.max) * 100));
              return (
                <div key={cat.name} className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-gray-900">{cat.name}</h4>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border",
                          cat.badgeColor
                        )}>
                          {cat.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium leading-tight mt-0.5">{cat.desc}</p>
                    </div>
                    <div className="flex items-baseline space-x-1 sm:text-right">
                      <span className="text-sm font-black text-gray-800">{cat.actual.toFixed(2)}</span>
                      <span className="text-xs font-bold text-gray-400">/ {cat.max.toFixed(2)} pts</span>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="overflow-hidden h-2.5 bg-gray-50 rounded-full border border-gray-100">
                      <div
                        style={{ width: `${pct}%` }}
                        className={cn("h-full rounded-full transition-all duration-1000", cat.colorClass)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Risks Alert Board & Audit Checklist */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dynamic B-BBEE Risks Card */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-rose-600 mb-4">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Active Scorecard Risks</h3>
              </div>
              <p className="text-xs text-gray-400 font-medium mb-6">Real-time alerts highlighting actions required to preserve or boost B-BBEE points.</p>

              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-100">
                {dynamicRisks.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 flex flex-col items-center justify-center">
                    <ShieldCheck className="h-12 w-12 text-emerald-500 mb-3" />
                    <h5 className="font-bold text-gray-800">No Immediate Scorecard Risks</h5>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">Your business parameters, supplier certificates, and spend targets are fully aligned.</p>
                  </div>
                ) : (
                  dynamicRisks.map((risk) => (
                    <div
                      key={risk.id}
                      className={cn(
                        "p-4 rounded-2xl border flex gap-3.5 transition-all hover:scale-[1.01] items-start",
                        risk.severity === "critical"
                          ? "bg-rose-50 border-rose-100 text-rose-900"
                          : risk.severity === "warning"
                          ? "bg-amber-50 border-amber-100 text-amber-900"
                          : "bg-sky-50 border-sky-100 text-sky-900"
                      )}
                    >
                      <div className="mt-0.5">
                        {risk.severity === "critical" ? (
                          <div className="p-1.5 bg-rose-500 text-white rounded-xl">
                            <FlameKindling className="h-4 w-4" />
                          </div>
                        ) : risk.severity === "warning" ? (
                          <div className="p-1.5 bg-amber-500 text-white rounded-xl">
                            <AlertTriangle className="h-4 w-4" />
                          </div>
                        ) : (
                          <div className="p-1.5 bg-sky-500 text-white rounded-xl">
                            <Info className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-extrabold text-sm tracking-tight">{risk.title}</h4>
                        <p className={cn(
                          "text-xs font-semibold leading-relaxed",
                          risk.severity === "critical" ? "text-rose-700" : risk.severity === "warning" ? "text-amber-700" : "text-sky-700"
                        )}>
                          {risk.message}
                        </p>
                        <div className="pt-2 flex justify-start">
                          <a
                            href={risk.actionUrl}
                            className={cn(
                              "text-[10px] font-black uppercase tracking-wider flex items-center gap-1 px-2.5 py-1 rounded-lg border",
                              risk.severity === "critical"
                                ? "bg-rose-100/50 hover:bg-rose-100 border-rose-200"
                                : risk.severity === "warning"
                                ? "bg-amber-100/50 hover:bg-amber-100 border-amber-200"
                                : "bg-sky-100/50 hover:bg-sky-100 border-sky-200"
                            )}
                          >
                            <span>{risk.actionLabel}</span>
                            <ArrowRight className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="mt-6 border-t border-gray-50 pt-4 flex items-center space-x-1.5 text-[11px] text-gray-400">
              <Info className="h-3.5 w-3.5" />
              <span>Risks recalculate instantly when you alter spend ledger records or supplier details.</span>
            </div>
          </div>

          {/* Interactive Checklist Tracker */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-sky-600 mb-4">
                <ListTodo className="h-5 w-5" />
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Audit Preparation Tasks</h3>
              </div>
              <p className="text-xs text-gray-400 font-medium mb-4">Step-by-step checklist to organize documents and verification requirements for SANAS audit agents.</p>

              {/* Progress Bar for Checklist */}
              <div className="bg-sky-50/50 border border-sky-100 p-3 rounded-2xl flex items-center justify-between gap-4 mb-6">
                <span className="text-xs font-bold text-sky-900">
                  {checklistCheckedCount} of {checklistTotalCount} actions complete
                </span>
                <div className="flex-1 max-w-[150px]">
                  <div className="overflow-hidden h-2 bg-sky-200/40 rounded-full">
                    <div
                      style={{ width: `${checklistPercentage}%` }}
                      className="h-full bg-sky-600 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
                <span className="text-xs font-black text-sky-600">{checklistPercentage}%</span>
              </div>

              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                {DEFAULT_CHECKLIST.map((task) => {
                  const isChecked = !!checkedTasks[task.id];
                  return (
                    <button
                      key={task.id}
                      onClick={() => handleToggleTask(task.id)}
                      className={cn(
                        "w-full text-left p-3.5 rounded-2xl border transition-all flex items-start space-x-3 cursor-pointer",
                        isChecked
                          ? "bg-emerald-50/30 border-emerald-100 text-gray-500 line-through decoration-gray-300"
                          : "bg-gray-50/30 border-gray-100 text-gray-800 hover:bg-gray-50/80"
                      )}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {isChecked ? (
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <div className="h-5 w-5 rounded-md border-2 border-gray-300 bg-white" />
                        )}
                      </div>
                      <span className="text-xs font-semibold leading-relaxed flex-1">
                        {task.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-6 border-t border-gray-50 pt-4 text-center">
              <a
                href="/documents"
                className="text-xs font-bold text-sky-600 hover:text-sky-700 inline-flex items-center gap-1 hover:underline"
              >
                <span>Go to Evidence Vault to upload certificates</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Audit Timeline / Pipeline Project tracker */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Active Audit Pipeline Timeline</h3>
              <p className="text-xs text-gray-400 font-medium mt-1">Audit readiness stages for your B-BBEE submission cycles.</p>
            </div>
            <a
              href="/projects"
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 bg-sky-50 px-3.5 py-2 rounded-xl transition-all"
            >
              <span>Manage Audit Projects</span>
              <ChevronRight className="h-4.5 w-4.5" />
            </a>
          </div>

          {activeProject ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-sky-50 border border-sky-100 rounded-xl text-sky-600">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900">
                      FY{activeProject.financialYear} Compliance Project
                    </h4>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                      Last synchronized on {activeProject.updatedAt ? formatDate(activeProject.updatedAt.toDate()) : "Just now"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-gray-400">Projected score:</span>
                  <span className="text-sm font-black text-gray-800">{activeProject.points.total} pts</span>
                  <span className={cn(
                    "px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border",
                    activeProject.projectedLevel === 9 ? "bg-red-50 text-red-700 border-red-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                  )}>
                    {activeProject.projectedLevel === 9 ? "Non-Compliant" : `Level ${activeProject.projectedLevel}`}
                  </span>
                </div>
              </div>

              {/* Steps timeline representation */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                {[
                  { value: "data_collection", label: "Data Collection" },
                  { value: "supplier_verification", label: "Supplier Verification" },
                  { value: "evidence_upload", label: "Evidence Upload" },
                  { value: "internal_review", label: "Internal Review" },
                  { value: "auditor_ready", label: "Auditor Ready" },
                  { value: "certified", label: "Certified" },
                ].map((stage, idx) => {
                  const stagesOrder = [
                    "data_collection",
                    "supplier_verification",
                    "evidence_upload",
                    "internal_review",
                    "auditor_ready",
                    "certified",
                  ];
                  const currentIdx = stagesOrder.indexOf(activeProject.status);
                  const isCurrent = activeProject.status === stage.value;
                  const isPast = stagesOrder.indexOf(stage.value) < currentIdx;

                  return (
                    <div
                      key={stage.value}
                      className={cn(
                        "p-4 rounded-2xl border transition-all flex flex-col justify-between h-20",
                        isCurrent
                          ? "bg-sky-50 border-sky-200 text-sky-900"
                          : isPast
                          ? "bg-emerald-50/50 border-emerald-100 text-emerald-900"
                          : "bg-gray-50/40 border-gray-100 text-gray-400"
                      )}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span>Step {idx + 1}</span>
                        {isPast && <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />}
                        {isCurrent && <Clock className="h-3.5 w-3.5 text-sky-600 animate-pulse" />}
                      </div>
                      <span className="font-extrabold text-xs tracking-tight">{stage.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center justify-center">
              <Calendar className="h-10 w-10 text-gray-200 mb-3" />
              <h5 className="font-bold text-gray-800">No B-BBEE Audit Project Initialized</h5>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto mb-4">Initialize an audit timeline to snap benchmark scorecards and track verification cycles.</p>
              <a
                href="/projects"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
              >
                <span>Create Audit Project</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
