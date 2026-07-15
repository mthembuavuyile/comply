import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../App";
import { useClient } from "../lib/clientContext";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { ScorecardProject, Supplier, SpendLog } from "../types";
import Layout from "../components/Layout";
import { calculateScorecard } from "../lib/scorecardEngine";
import {
  Calendar,
  Plus,
  ChevronRight,
  ClipboardList,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  FileCheck,
  Award,
  Zap,
  Trash2,
} from "lucide-react";
import { cn, formatDate } from "../lib/utils";

const PIPELINE_STAGES = [
  { value: "data_collection", label: "Data Collection", desc: "Collecting payroll, ownership, and financial data" },
  { value: "supplier_verification", label: "Supplier Verification", desc: "Auditing supplier levels and verifying certificates" },
  { value: "evidence_upload", label: "Evidence Upload", desc: "Compiling and uploading documents in the vault" },
  { value: "internal_review", label: "Internal Review", desc: "Evaluating scorecard points and identifying risks" },
  { value: "auditor_ready", label: "Auditor Ready", desc: "Evidence pack ready for SANAS auditor submission" },
  { value: "certified", label: "Certified", desc: "B-BBEE certificate issued and scorecard final" },
] as const;

export default function ScorecardProjectsPage() {
  const { user } = useAuth();
  const { activeClient, activeClientId, clientsLoading } = useClient();
  const [projects, setProjects] = useState<ScorecardProject[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [spendLogs, setSpendLogs] = useState<SpendLog[]>([]);

  // Create Project Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [financialYear, setFinancialYear] = useState("2026");

  // Fetch projects
  useEffect(() => {
    if (!user || !activeClientId) return;

    const q = query(
      collection(db, "scorecardProjects"),
      where("businessId", "==", activeClientId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ScorecardProject[];
      setProjects(list.sort((a, b) => b.financialYear.localeCompare(a.financialYear)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "scorecardProjects");
    });

    return unsubscribe;
  }, [user, activeClientId]);

  // Fetch suppliers & spend logs to calculate live scorecard projection
  useEffect(() => {
    if (!user || !activeClientId) return;

    const unsubSuppliers = onSnapshot(
      query(collection(db, "suppliers"), where("businessId", "==", activeClientId)),
      (snapshot) => {
        setSuppliers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Supplier[]);
      }
    );

    const unsubSpend = onSnapshot(
      query(collection(db, "spendLogs"), where("businessId", "==", activeClientId)),
      (snapshot) => {
        setSpendLogs(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as SpendLog[]);
      }
    );

    return () => {
      unsubSuppliers();
      unsubSpend();
    };
  }, [user, activeClientId]);

  // Live Scorecard calculation
  const liveScorecard = useMemo(() => {
    return calculateScorecard(activeClient, suppliers, spendLogs);
  }, [activeClient, suppliers, spendLogs]);

  // Handle Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeClientId) return;

    // Use current live scorecard projection as starting point for project
    const newProject = {
      userId: user.uid,
      businessId: activeClientId,
      financialYear,
      status: "data_collection" as const,
      points: {
        ownership: liveScorecard.points.ownership,
        skills: liveScorecard.points.skills,
        procurement: liveScorecard.points.procurement,
        esd: liveScorecard.points.esdSubtotal,
        sed: liveScorecard.points.sed,
        total: liveScorecard.points.total,
      },
      projectedLevel: liveScorecard.projectedLevel,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    try {
      await addDoc(collection(db, "scorecardProjects"), newProject);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  // Sync Project Points with Current Live Engine
  const handleSyncProject = async (projectId: string) => {
    try {
      await updateDoc(doc(db, "scorecardProjects", projectId), {
        points: {
          ownership: liveScorecard.points.ownership,
          skills: liveScorecard.points.skills,
          procurement: liveScorecard.points.procurement,
          esd: liveScorecard.points.esdSubtotal,
          sed: liveScorecard.points.sed,
          total: liveScorecard.points.total,
        },
        projectedLevel: liveScorecard.projectedLevel,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error syncing project scorecard:", error);
    }
  };

  // Advance Pipeline Stage
  const handleAdvanceStage = async (project: ScorecardProject) => {
    const currentIndex = PIPELINE_STAGES.findIndex((s) => s.value === project.status);
    if (currentIndex === -1 || currentIndex === PIPELINE_STAGES.length - 1) return;

    const nextStage = PIPELINE_STAGES[currentIndex + 1].value;
    try {
      await updateDoc(doc(db, "scorecardProjects", project.id), {
        status: nextStage,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error advancing pipeline stage:", error);
    }
  };

  // Revert Pipeline Stage
  const handleRevertStage = async (project: ScorecardProject) => {
    const currentIndex = PIPELINE_STAGES.findIndex((s) => s.value === project.status);
    if (currentIndex <= 0) return;

    const prevStage = PIPELINE_STAGES[currentIndex - 1].value;
    try {
      await updateDoc(doc(db, "scorecardProjects", project.id), {
        status: prevStage,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error reverting pipeline stage:", error);
    }
  };

  // Delete project
  const handleDeleteProject = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this project?")) return;
    try {
      await deleteDoc(doc(db, "scorecardProjects", id));
    } catch (error) {
      console.error("Error deleting project:", error);
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
            <ClipboardList className="h-8 w-8 text-sky-400" />
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">No Active Client Selected</h3>
          <p className="text-gray-500 font-medium text-sm mb-6">
            Please select a client business from the portfolio or create a new client to manage scorecard projects.
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
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Audit preparation projects</h1>
            <p className="text-gray-500 font-medium mt-1">
              Prepare, audit, and track B-BBEE compliance submissions through standard verification cycles.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center space-x-2 bg-sky-600 text-white px-5 py-3 rounded-2xl shadow-lg shadow-sky-100 hover:bg-sky-700 hover:scale-[1.02] active:scale-95 transition-all font-bold text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Audit Project</span>
          </button>
        </div>

        {/* Project Pipeline List */}
        <div className="space-y-8">
          {projects.length === 0 ? (
            <div className="py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center">
              <ClipboardList className="h-12 w-12 text-gray-200 mb-4" />
              <h3 className="text-lg font-bold text-gray-900">No active B-BBEE audit projects</h3>
              <p className="text-gray-400 text-xs mt-1 max-w-xs">
                Start a new audit project to track data collection, verify evidence, and prep for SANAS accreditation.
              </p>
            </div>
          ) : (
            projects.map((project) => {
              const currentStageIndex = PIPELINE_STAGES.findIndex((s) => s.value === project.status);
              const isCertified = project.status === "certified";

              return (
                <div
                  key={project.id}
                  className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 space-y-8 relative overflow-hidden group"
                >
                  {/* Decorative background logo */}
                  <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover:scale-105 transition-transform duration-500">
                    <Award className="h-64 w-64" />
                  </div>

                  {/* Project Info Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-100">
                    <div className="flex items-start space-x-4">
                      <div className="p-4 bg-sky-50 rounded-2xl">
                        <Award className="h-8 w-8 text-sky-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-extrabold text-gray-900">
                          FY{project.financialYear} B-BBEE Compliance Audit
                        </h3>
                        <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" /> Updated {project.updatedAt ? formatDate(project.updatedAt.toDate()) : "Just now"}
                        </p>
                      </div>
                    </div>

                    {/* Scores & Sync action */}
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <span className="text-xs font-black uppercase text-gray-400 tracking-wider">Projected Score</span>
                        <div className="flex items-baseline space-x-1 justify-end mt-1">
                          <span className="text-2xl font-black text-gray-900">{project.points.total}</span>
                          <span className="text-xs font-bold text-gray-400">/ 100</span>
                        </div>
                      </div>

                      <div className={cn(
                        "px-4 py-2 rounded-2xl border text-center flex flex-col justify-center min-w-[100px]",
                        project.projectedLevel === 9 ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      )}>
                        <span className="text-[10px] font-black uppercase tracking-wider">Projected</span>
                        <span className="text-lg font-black mt-0.5">
                          {project.projectedLevel === 9 ? "Non-Compliant" : `Level ${project.projectedLevel}`}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => handleSyncProject(project.id)}
                          title="Sync project scorecard with active CRM and log data"
                          className="flex items-center space-x-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-xs py-2 px-3.5 rounded-xl border border-gray-100 transition-colors"
                        >
                          <Zap className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                          <span>Sync Score</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          title="Delete Project"
                          className="flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs p-2 rounded-xl border border-red-100 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Timeline Pipeline */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Audit Preparation Pipeline</h4>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 relative">
                      {PIPELINE_STAGES.map((stage, idx) => {
                        const isPast = idx < currentStageIndex;
                        const isCurrent = idx === currentStageIndex;
                        const isFuture = idx > currentStageIndex;

                        return (
                          <div
                            key={stage.value}
                            className={cn(
                              "p-4 rounded-3xl border transition-all flex flex-col justify-between relative h-28",
                              isCurrent ? "bg-sky-50 text-sky-900 border-sky-200 scale-[1.01] shadow-sm shadow-sky-50" :
                              isPast ? "bg-emerald-50/50 text-emerald-900 border-emerald-100" :
                              "bg-gray-50/50 text-gray-400 border-gray-100"
                            )}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[10px] font-black text-gray-400">0{idx + 1}</span>
                              {isPast && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                              {isCurrent && <Clock className="h-4 w-4 text-sky-600 animate-spin" />}
                            </div>

                            <div>
                              <h5 className="font-extrabold text-sm tracking-tight leading-tight">{stage.label}</h5>
                              <p className="text-[9px] font-medium leading-snug mt-1 line-clamp-2">
                                {stage.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Timeline Actions / Advancement & Detail breakdown */}
                  <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Points breakdown list */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-gray-500">
                      <span>Points Breakdown:</span>
                      <span className="bg-gray-50 px-2.5 py-1 rounded-xl">Ownership: {project.points.ownership}</span>
                      <span className="bg-gray-50 px-2.5 py-1 rounded-xl">Skills: {project.points.skills}</span>
                      <span className="bg-gray-50 px-2.5 py-1 rounded-xl">Procurement: {project.points.procurement}</span>
                      <span className="bg-gray-50 px-2.5 py-1 rounded-xl">ESD: {project.points.esd}</span>
                      <span className="bg-gray-50 px-2.5 py-1 rounded-xl">SED: {project.points.sed}</span>
                    </div>

                    {/* Stage controller */}
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleRevertStage(project)}
                        disabled={currentStageIndex <= 0}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-4 rounded-xl disabled:opacity-50 text-xs transition-colors"
                      >
                        Revert Stage
                      </button>
                      <button
                        onClick={() => handleAdvanceStage(project)}
                        disabled={isCertified}
                        className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 px-4 rounded-xl disabled:opacity-50 text-xs transition-colors flex items-center space-x-1 shadow-md shadow-sky-100"
                      >
                        <span>Advance Stage</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Dialog Form */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-6 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-xl font-black text-gray-900">New Audit Project</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-50 rounded-xl transition-all"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Financial Audit Year</label>
                  <select
                    value={financialYear}
                    onChange={(e) => setFinancialYear(e.target.value)}
                    className="w-full bg-gray-50 border-0 rounded-2xl py-3 px-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all cursor-pointer"
                  >
                    {["2025", "2026", "2027", "2028"].map((year) => (
                      <option key={year} value={year}>
                        {year} B-BBEE Audit Cycle
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-4 bg-sky-50 rounded-2xl text-[11px] text-sky-800 leading-relaxed flex items-start space-x-2">
                  <Sparkles className="h-4 w-4 text-sky-600 mt-0.5 flex-shrink-0" />
                  <span>
                    Creating a project snapshots your current CRM and spend ledger points as a starting benchmark. You can sync points with live data at any time.
                  </span>
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
                    Start Project
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
