import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../App";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Supplier, SpendLog, Business } from "../types";
import Layout from "../components/Layout";
import { calculateScorecard, ScorecardResult } from "../lib/scorecardEngine";
import {
  FileSpreadsheet,
  Sliders,
  Download,
  Award,
  Zap,
  HelpCircle,
  PlusCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Info,
} from "lucide-react";
import { cn } from "../lib/utils";

export default function ScorecardCalculatorPage() {
  const { user, business } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [spendLogs, setSpendLogs] = useState<SpendLog[]>([]);

  // What-If Sliders / Scenario Modeling States
  const [isScenarioMode, setIsScenarioMode] = useState(false);
  const [scenarioOwnership, setScenarioOwnership] = useState(0);
  const [scenarioWomenOwnership, setScenarioWomenOwnership] = useState(0);
  const [scenarioAdditionalSkills, setScenarioAdditionalSkills] = useState(0);
  const [scenarioAdditionalED, setScenarioAdditionalED] = useState(0);
  const [scenarioAdditionalSD, setScenarioAdditionalSD] = useState(0);
  const [scenarioAdditionalSED, setScenarioAdditionalSED] = useState(0);
  const [scenarioAdditionalL1Spend, setScenarioAdditionalL1Spend] = useState(0);

  // Initialize sliders from actual values
  useEffect(() => {
    if (business) {
      setScenarioOwnership(business.blackOwnershipPercent || 0);
      setScenarioWomenOwnership(business.blackWomenOwnershipPercent || 0);
    }
  }, [business, isScenarioMode]);

  // Fetch actual data
  useEffect(() => {
    if (!user) return;

    const unsubSuppliers = onSnapshot(
      query(collection(db, "suppliers"), where("userId", "==", user.uid)),
      (snapshot) => {
        setSuppliers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Supplier[]);
      }
    );

    const unsubSpend = onSnapshot(
      query(collection(db, "spendLogs"), where("userId", "==", user.uid)),
      (snapshot) => {
        setSpendLogs(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as SpendLog[]);
      }
    );

    return () => {
      unsubSuppliers();
      unsubSpend();
    };
  }, [user]);

  // Calculate actual live scorecard
  const actualScorecard = useMemo(() => {
    return calculateScorecard(business, suppliers, spendLogs);
  }, [business, suppliers, spendLogs]);

  // Calculate what-if scenario scorecard
  const scenarioScorecard = useMemo(() => {
    if (!isScenarioMode) return actualScorecard;

    // 1. Clone & adjust business details
    const simulatedBusiness: Business = {
      ...(business || {
        id: "",
        businessName: "",
        sector: "general",
        province: "",
        vatRegistered: "no",
        employeeBand: "0",
        businessStructure: "pty_ltd",
        cipcRegistered: false,
        onboardingCompleted: true,
        createdAt: null as any,
        ownerId: "",
      }),
      blackOwnershipPercent: scenarioOwnership,
      blackWomenOwnershipPercent: scenarioWomenOwnership,
    };

    // 2. Clone & adjust suppliers (add L1 spend)
    const simulatedSuppliers = [...suppliers];
    if (scenarioAdditionalL1Spend > 0) {
      simulatedSuppliers.push({
        id: "simulated_l1",
        userId: "",
        name: "Simulated Level 1 Supplier",
        beeLevel: 1,
        blackOwnershipPercent: 51,
        blackWomenOwnershipPercent: 30,
        certificateUrl: "",
        certificateExpiry: null,
        category: "EME",
        annualSpend: scenarioAdditionalL1Spend,
        createdAt: null as any,
        updatedAt: null as any,
      });
    }

    // 3. Clone & adjust spend logs
    const simulatedSpend = [...spendLogs];
    if (scenarioAdditionalSkills > 0) {
      simulatedSpend.push({
        id: "sim_skills",
        userId: "",
        category: "skills_development",
        description: "Simulated Skills Spend",
        amount: scenarioAdditionalSkills,
        date: null as any,
        createdAt: null as any,
      });
    }
    if (scenarioAdditionalED > 0) {
      simulatedSpend.push({
        id: "sim_ed",
        userId: "",
        category: "enterprise_development",
        description: "Simulated ED Spend",
        amount: scenarioAdditionalED,
        date: null as any,
        createdAt: null as any,
      });
    }
    if (scenarioAdditionalSD > 0) {
      simulatedSpend.push({
        id: "sim_sd",
        userId: "",
        category: "supplier_development",
        description: "Simulated SD Spend",
        amount: scenarioAdditionalSD,
        date: null as any,
        createdAt: null as any,
      });
    }
    if (scenarioAdditionalSED > 0) {
      simulatedSpend.push({
        id: "sim_sed",
        userId: "",
        category: "socio_economic_development",
        description: "Simulated SED Spend",
        amount: scenarioAdditionalSED,
        date: null as any,
        createdAt: null as any,
      });
    }

    return calculateScorecard(simulatedBusiness, simulatedSuppliers, simulatedSpend);
  }, [
    isScenarioMode,
    actualScorecard,
    business,
    suppliers,
    spendLogs,
    scenarioOwnership,
    scenarioWomenOwnership,
    scenarioAdditionalSkills,
    scenarioAdditionalED,
    scenarioAdditionalSD,
    scenarioAdditionalSED,
    scenarioAdditionalL1Spend,
  ]);

  // Export ZIP Audit Pack simulation
  const handleExportAuditPack = () => {
    const csvContent = [
      "B-BBEE Scorecard Export Spreadsheet",
      `Business Name,${business?.businessName || "Vylex Member"}`,
      `Black Ownership %,${business?.blackOwnershipPercent || 0}%`,
      `Black Women Ownership %,${business?.blackWomenOwnershipPercent || 0}%`,
      "",
      "Element,Projected Points,Max Points",
      `Ownership,${actualScorecard.points.ownership},25.00`,
      `Skills Development,${actualScorecard.points.skills},20.00`,
      `Procurement,${actualScorecard.points.procurement},25.00`,
      `Enterprise & Supplier Dev (ESD),${actualScorecard.points.esdSubtotal},15.00`,
      `Socio-Economic Dev (SED),${actualScorecard.points.sed},5.00`,
      `Total Score,${actualScorecard.points.total},100.00`,
      `Projected BEE Level,Level ${actualScorecard.projectedLevel},`,
    ].join("\n");

    const blob = new Blob([csvContent], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VylexComply_B-BBEE_Audit_Pack_${business?.businessName || "FY2026"}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getBeeLevelClass = (level: number) => {
    if (level === 9) return "bg-red-50 text-red-700 border-red-200";
    if (level === 1) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    return "bg-sky-50 text-sky-700 border-sky-200";
  };

  // Reset Sliders
  const handleResetSliders = () => {
    if (business) {
      setScenarioOwnership(business.blackOwnershipPercent || 0);
      setScenarioWomenOwnership(business.blackWomenOwnershipPercent || 0);
    }
    setScenarioAdditionalSkills(0);
    setScenarioAdditionalED(0);
    setScenarioAdditionalSD(0);
    setScenarioAdditionalSED(0);
    setScenarioAdditionalL1Spend(0);
  };

  return (
    <Layout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Scorecard Calculator</h1>
            <p className="text-gray-500 font-medium mt-1">
              Live B-BBEE spreadsheet calculations and interactive scenario simulator.
            </p>
          </div>
          <button
            onClick={handleExportAuditPack}
            className="flex items-center justify-center space-x-2 bg-sky-600 text-white px-5 py-3 rounded-2xl shadow-lg shadow-sky-100 hover:bg-sky-700 hover:scale-[1.02] active:scale-95 transition-all font-bold text-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export Audit Pack ZIP</span>
          </button>
        </div>

        {/* Global Level Projections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Actual Score Card */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/30 flex flex-col justify-between h-44">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Current B-BBEE Level</span>
              <h3 className="text-4xl font-black text-gray-900 mt-2">
                {actualScorecard.projectedLevel === 9 ? "Non-Compliant" : `Level ${actualScorecard.projectedLevel}`}
              </h3>
            </div>
            <p className="text-xs text-gray-400 font-bold">Based on actual recorded logs and suppliers</p>
          </div>

          {/* Actual Points Card */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/30 flex flex-col justify-between h-44">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Projected Points Total</span>
              <h3 className="text-4xl font-black text-sky-600 mt-2">
                {actualScorecard.points.total} <span className="text-sm font-bold text-gray-400">/ 100</span>
              </h3>
            </div>
            <p className="text-xs text-gray-400 font-bold">Ownership, Skills, ESD, SED combined</p>
          </div>

          {/* Scenario Comparison Card */}
          <div className={cn(
            "p-6 rounded-3xl border shadow-xl shadow-gray-200/30 flex flex-col justify-between h-44 transition-all duration-500",
            isScenarioMode
              ? "bg-gradient-to-br from-indigo-950 to-slate-900 text-white border-indigo-950"
              : "bg-gray-50 border-gray-100 text-gray-400"
          )}>
            {isScenarioMode ? (
              <>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> What-If Level Projection</span>
                  <h3 className="text-4xl font-black text-white mt-2">
                    {scenarioScorecard.projectedLevel === 9 ? "Non-Compliant" : `Level ${scenarioScorecard.projectedLevel}`}
                  </h3>
                </div>
                <div className="flex justify-between items-center text-xs font-bold mt-2">
                  <span>Score: {scenarioScorecard.points.total} pts</span>
                  <span className={cn(
                    "font-black",
                    scenarioScorecard.points.total > actualScorecard.points.total ? "text-emerald-400" :
                    scenarioScorecard.points.total < actualScorecard.points.total ? "text-rose-400" : "text-indigo-200"
                  )}>
                    {scenarioScorecard.points.total > actualScorecard.points.total ? `+${(scenarioScorecard.points.total - actualScorecard.points.total).toFixed(2)}` : ""}
                    {scenarioScorecard.points.total < actualScorecard.points.total ? `${(scenarioScorecard.points.total - actualScorecard.points.total).toFixed(2)}` : ""}
                    {scenarioScorecard.points.total === actualScorecard.points.total ? "0.00" : ""} pts change
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                <Sliders className="h-8 w-8 text-gray-300 animate-pulse" />
                <span className="text-xs font-bold">Activate Scenario Modeling Mode to project changes</span>
              </div>
            )}
          </div>
        </div>

        {/* Spreadsheet View & Sliders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Detailed Scorecard Sheet */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-gray-900">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-black">B-BBEE Scorecard Ledger</h3>
              </div>
              <span className="text-xs font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-1 rounded">
                General Codes
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-wider">Element</th>
                    <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-wider text-right">Actual Score</th>
                    {isScenarioMode && <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-wider text-right text-indigo-600">Simulated Score</th>}
                    <th className="p-5 text-xs font-black uppercase text-gray-400 tracking-wider text-right">Max points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-medium">
                  {/* Ownership */}
                  <tr className="hover:bg-gray-50/30 transition-colors">
                    <td className="p-5">
                      <p className="font-extrabold text-gray-900">Ownership</p>
                      <p className="text-[10px] text-gray-400">Equity interest and voting rights of black shareholders</p>
                    </td>
                    <td className="p-5 text-right font-bold text-gray-700">{actualScorecard.points.ownership.toFixed(2)}</td>
                    {isScenarioMode && <td className="p-5 text-right font-black text-indigo-600">{scenarioScorecard.points.ownership.toFixed(2)}</td>}
                    <td className="p-5 text-right text-gray-400">25.00</td>
                  </tr>

                  {/* Skills */}
                  <tr className="hover:bg-gray-50/30 transition-colors">
                    <td className="p-5">
                      <p className="font-extrabold text-gray-900">Skills Development</p>
                      <p className="text-[10px] text-gray-400">Training investments and learnership initiatives</p>
                    </td>
                    <td className="p-5 text-right font-bold text-gray-700">{actualScorecard.points.skills.toFixed(2)}</td>
                    {isScenarioMode && <td className="p-5 text-right font-black text-indigo-600">{scenarioScorecard.points.skills.toFixed(2)}</td>}
                    <td className="p-5 text-right text-gray-400">20.00</td>
                  </tr>

                  {/* Procurement */}
                  <tr className="hover:bg-gray-50/30 transition-colors">
                    <td className="p-5">
                      <p className="font-extrabold text-gray-900">Enterprise & Supplier Dev: Procurement</p>
                      <p className="text-[10px] text-gray-400">BEE recognition spent on qualified suppliers</p>
                    </td>
                    <td className="p-5 text-right font-bold text-gray-700">{actualScorecard.points.procurement.toFixed(2)}</td>
                    {isScenarioMode && <td className="p-5 text-right font-black text-indigo-600">{scenarioScorecard.points.procurement.toFixed(2)}</td>}
                    <td className="p-5 text-right text-gray-400">25.00</td>
                  </tr>

                  {/* ESD (ED + SD) */}
                  <tr className="hover:bg-gray-50/30 transition-colors">
                    <td className="p-5">
                      <p className="font-extrabold text-gray-900">Enterprise & Supplier Dev: ED & SD</p>
                      <p className="text-[10px] text-gray-400">Development contributions to suppliers and enterprises</p>
                    </td>
                    <td className="p-5 text-right font-bold text-gray-700">{actualScorecard.points.esdSubtotal.toFixed(2)}</td>
                    {isScenarioMode && <td className="p-5 text-right font-black text-indigo-600">{scenarioScorecard.points.esdSubtotal.toFixed(2)}</td>}
                    <td className="p-5 text-right text-gray-400">15.00</td>
                  </tr>

                  {/* SED */}
                  <tr className="hover:bg-gray-50/30 transition-colors">
                    <td className="p-5">
                      <p className="font-extrabold text-gray-900">Socio-Economic Development (SED)</p>
                      <p className="text-[10px] text-gray-400">Community development grants and donations</p>
                    </td>
                    <td className="p-5 text-right font-bold text-gray-700">{actualScorecard.points.sed.toFixed(2)}</td>
                    {isScenarioMode && <td className="p-5 text-right font-black text-indigo-600">{scenarioScorecard.points.sed.toFixed(2)}</td>}
                    <td className="p-5 text-right text-gray-400">5.00</td>
                  </tr>

                  {/* Total */}
                  <tr className="bg-gray-50 font-black border-t border-gray-100">
                    <td className="p-5 text-gray-900">Total Scorecard Points</td>
                    <td className="p-5 text-right text-gray-900">{actualScorecard.points.total.toFixed(2)}</td>
                    {isScenarioMode && <td className="p-5 text-right text-indigo-700">{scenarioScorecard.points.total.toFixed(2)}</td>}
                    <td className="p-5 text-right text-gray-900">100.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Scenario Modeler Sidebar */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-950 to-slate-900 p-6 rounded-3xl border border-indigo-900 shadow-xl shadow-indigo-950/20 text-white relative overflow-hidden flex flex-col justify-between min-h-[500px]">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                <Sliders className="h-48 w-48" />
              </div>

              <div>
                {/* Header controls */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                  <div className="flex items-center space-x-2 text-indigo-400">
                    <Sliders className="h-5 w-5" />
                    <span className="text-xs font-black uppercase tracking-widest">Scenario Simulator</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsScenarioMode(!isScenarioMode);
                      handleResetSliders();
                    }}
                    className={cn(
                      "text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full border transition-all cursor-pointer",
                      isScenarioMode
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                        : "bg-indigo-500/20 text-indigo-200 border-indigo-500/30 hover:bg-indigo-500/30"
                    )}
                  >
                    {isScenarioMode ? "Deactivate" : "Activate"}
                  </button>
                </div>

                {!isScenarioMode ? (
                  <div className="py-20 text-center space-y-4">
                    <Sliders className="h-10 w-10 mx-auto text-indigo-400 animate-pulse" />
                    <h5 className="font-bold text-lg">Scenario Modeling Offline</h5>
                    <p className="text-xs text-indigo-200/60 max-w-xs mx-auto leading-relaxed">
                      Toggle the simulator to model "What-If" scenarios, like increasing Black ownership or injecting training budgets, to see point updates instantly.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5 overflow-y-auto max-h-[400px] pr-1 scrollbar-thin scrollbar-thumb-white/10">
                    {/* Ownership */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span>Black Ownership: {scenarioOwnership}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={scenarioOwnership}
                        onChange={(e) => setScenarioOwnership(Number(e.target.value))}
                        className="w-full h-1.5 bg-indigo-900 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>

                    {/* Black Women Ownership */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span>Black Women Ownership: {scenarioWomenOwnership}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={scenarioWomenOwnership}
                        onChange={(e) => setScenarioWomenOwnership(Number(e.target.value))}
                        className="w-full h-1.5 bg-indigo-900 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>

                    {/* Additional Skills spend */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span>Add Skills Spend: R {scenarioAdditionalSkills.toLocaleString()}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="500000"
                        step="5000"
                        value={scenarioAdditionalSkills}
                        onChange={(e) => setScenarioAdditionalSkills(Number(e.target.value))}
                        className="w-full h-1.5 bg-indigo-900 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>

                    {/* Additional ED spend */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span>Add ED Spend: R {scenarioAdditionalED.toLocaleString()}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="150000"
                        step="2500"
                        value={scenarioAdditionalED}
                        onChange={(e) => setScenarioAdditionalED(Number(e.target.value))}
                        className="w-full h-1.5 bg-indigo-900 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>

                    {/* Additional SD spend */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span>Add SD Spend: R {scenarioAdditionalSD.toLocaleString()}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="150000"
                        step="2500"
                        value={scenarioAdditionalSD}
                        onChange={(e) => setScenarioAdditionalSD(Number(e.target.value))}
                        className="w-full h-1.5 bg-indigo-900 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>

                    {/* Additional SED spend */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span>Add SED Spend: R {scenarioAdditionalSED.toLocaleString()}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100000"
                        step="1000"
                        value={scenarioAdditionalSED}
                        onChange={(e) => setScenarioAdditionalSED(Number(e.target.value))}
                        className="w-full h-1.5 bg-indigo-900 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>

                    {/* Additional Level 1 Supplier spend */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span>Add Level 1 Supplier Spend: R {scenarioAdditionalL1Spend.toLocaleString()}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1000000"
                        step="10000"
                        value={scenarioAdditionalL1Spend}
                        onChange={(e) => setScenarioAdditionalL1Spend(Number(e.target.value))}
                        className="w-full h-1.5 bg-indigo-900 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              {isScenarioMode && (
                <div className="pt-4 border-t border-white/10 flex items-center space-x-3 mt-6">
                  <button
                    onClick={handleResetSliders}
                    className="flex-1 bg-white/5 border border-white/10 text-white font-bold py-2.5 rounded-xl hover:bg-white/10 text-xs transition-colors"
                  >
                    Reset Simulation
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
