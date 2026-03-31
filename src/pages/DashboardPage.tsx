import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../App";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { ComplianceItem, ComplianceStatus, ComplianceGroup, Alert } from "../types";
import Layout from "../components/Layout";
import {
  COMPLIANCE_GROUP_LABELS,
  COMPLIANCE_GROUP_ORDER,
  getSectorLabel,
} from "../constants";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  ArrowRight,
  Bell,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  FileWarning,
  Info,
  LucideIcon,
  Settings2,
  Upload,
  BellRing,
} from "lucide-react";
import { cn, formatDate } from "../lib/utils";
import { differenceInDays, isBefore, addDays } from "date-fns";
import DetailModal from "../components/DetailModal";

// --- Health Score State ---
type HealthState = 'not_configured' | 'setting_up' | 'at_risk' | 'critical' | 'healthy';

interface HealthConfig {
  label: string;
  color: string;
  ringColor: string;
  bgColor: string;
  description: string;
}

const HEALTH_STATES: Record<HealthState, HealthConfig> = {
  not_configured: {
    label: "Not Yet Configured",
    color: "text-gray-400",
    ringColor: "text-gray-300",
    bgColor: "bg-gray-50",
    description: "Complete setup to get your health score.",
  },
  setting_up: {
    label: "Setting Up",
    color: "text-sky-500",
    ringColor: "text-sky-400",
    bgColor: "bg-sky-50",
    description: "Configure deadlines to activate monitoring.",
  },
  at_risk: {
    label: "At Risk",
    color: "text-amber-500",
    ringColor: "text-amber-400",
    bgColor: "bg-amber-50",
    description: "Some items are expiring within 60 days.",
  },
  critical: {
    label: "Critical",
    color: "text-red-500",
    ringColor: "text-red-500",
    bgColor: "bg-red-50",
    description: "You have overdue compliance items.",
  },
  healthy: {
    label: "Healthy",
    color: "text-green-500",
    ringColor: "text-green-500",
    bgColor: "bg-green-50",
    description: "All items are compliant or tracked.",
  },
};

export default function DashboardPage() {
  const { user, business } = useAuth();
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedItem, setSelectedItem] = useState<ComplianceItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<ComplianceGroup>>(new Set());

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "complianceItems"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newItems = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ComplianceItem[];
      setItems(newItems);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "complianceItems");
    });

    const alertsQ = query(
      collection(db, "alerts"),
      where("userId", "==", user.uid),
      where("read", "==", false)
    );

    const alertsUnsubscribe = onSnapshot(alertsQ, (snapshot) => {
      const newAlerts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Alert[];
      setAlerts(newAlerts);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "alerts");
    });

    return () => {
      unsubscribe();
      alertsUnsubscribe();
    };
  }, [user]);

  // --- DEDUPLICATION: Only keep the most recently updated item per category ---
  const deduplicatedItems = useMemo(() => {
    const categoryMap = new Map<string, ComplianceItem>();
    items.forEach((item) => {
      const existing = categoryMap.get(item.category);
      if (!existing) {
        categoryMap.set(item.category, item);
      } else {
        // Keep the more recently updated one
        const existingTime = existing.updatedAt?.toDate?.()?.getTime() || 0;
        const currentTime = item.updatedAt?.toDate?.()?.getTime() || 0;
        if (currentTime > existingTime) {
          categoryMap.set(item.category, item);
        }
      }
    });
    return Array.from(categoryMap.values());
  }, [items]);

  // --- Auto-Status Logic (visual, based on dates) ---
  const processedItems = useMemo(() => {
    const today = new Date();
    return deduplicatedItems.map(item => {
      // Don't override compliant or pending_setup items
      if (item.status === 'compliant') return item;
      if (item.status === 'pending_setup') {
        // If user has set a date but status is still pending_setup, keep it pending
        if (!item.dueDate && !item.expiryDate) return item;
      }

      let newStatus: ComplianceStatus = item.status;
      const expiryDate = item.expiryDate?.toDate?.();
      const dueDate = item.dueDate?.toDate?.();

      if (expiryDate) {
        if (isBefore(expiryDate, today)) newStatus = 'overdue';
        else if (isBefore(expiryDate, addDays(today, 30))) newStatus = 'expiring_soon';
      }

      if (dueDate) {
        if (isBefore(dueDate, today)) newStatus = 'overdue';
        else if (isBefore(dueDate, addDays(today, 30))) newStatus = 'expiring_soon';
      }

      return { ...item, status: newStatus };
    }).sort((a, b) => {
      const order: Record<ComplianceStatus, number> = {
        overdue: 0,
        action_required: 1,
        expiring_soon: 2,
        pending_setup: 3,
        compliant: 4
      };
      return order[a.status] - order[b.status];
    });
  }, [deduplicatedItems]);

  // --- Stats ---
  const stats = useMemo(() => {
    const s = { compliant: 0, due_soon: 0, overdue: 0, pending_setup: 0 };
    const today = new Date();

    processedItems.forEach((item) => {
      if (item.status === 'compliant') {
        s.compliant++;
      } else if (item.status === 'overdue') {
        s.overdue++;
      } else if (item.status === 'pending_setup') {
        s.pending_setup++;
      } else if (item.status === 'expiring_soon') {
        s.due_soon++;
      } else {
        // action_required — check if due within 30 days
        const targetDate = item.expiryDate?.toDate?.() || item.dueDate?.toDate?.();
        if (targetDate && differenceInDays(targetDate, today) <= 30) {
          s.due_soon++;
        } else {
          s.pending_setup++; // unconfigured action_required → pending_setup visually
        }
      }
    });
    return s;
  }, [processedItems]);

  // --- Health State ---
  const healthState: HealthState = useMemo(() => {
    if (processedItems.length === 0) return 'not_configured';
    if (stats.overdue > 0) return 'critical';

    const today = new Date();
    const hasAtRisk = processedItems.some((item) => {
      const targetDate = item.expiryDate?.toDate?.() || item.dueDate?.toDate?.();
      return targetDate && differenceInDays(targetDate, today) <= 60 && item.status !== 'compliant';
    });
    if (hasAtRisk) return 'at_risk';

    const allPending = processedItems.every(item => item.status === 'pending_setup');
    if (allPending) return 'not_configured';

    const allCompliant = processedItems.every(item => item.status === 'compliant');
    if (allCompliant) return 'healthy';

    return 'setting_up';
  }, [processedItems, stats]);

  const healthConfig = HEALTH_STATES[healthState];

  // --- Score ---
  const score = useMemo(() => {
    if (processedItems.length === 0) return 0;
    let weight = 0;
    processedItems.forEach((item) => {
      if (item.status === 'compliant') weight += 1.0;
      else if (item.status === 'expiring_soon') weight += 0.5;
      else if (item.status === 'pending_setup') weight += 0; // Don't penalize, just not counted
    });
    // Exclude pending_setup from denominator for meaningful score
    const configuredCount = processedItems.filter(i => i.status !== 'pending_setup').length;
    if (configuredCount === 0) return 0;
    return Math.round((weight / configuredCount) * 100);
  }, [processedItems]);

  // --- Grouped Items ---
  const groupedItems = useMemo(() => {
    const groups = new Map<ComplianceGroup, ComplianceItem[]>();
    COMPLIANCE_GROUP_ORDER.forEach(g => groups.set(g, []));

    processedItems.forEach((item) => {
      const group = item.complianceGroup || 'licensing'; // Fallback for legacy items without group
      const list = groups.get(group) || [];
      list.push(item);
      groups.set(group, list);
    });

    return COMPLIANCE_GROUP_ORDER.map(g => ({
      group: g,
      label: COMPLIANCE_GROUP_LABELS[g],
      items: groups.get(g) || [],
    })).filter(g => g.items.length > 0);
  }, [processedItems]);

  const toggleGroup = (group: ComplianceGroup) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const urgentCount = stats.overdue;
  const sectorLabel = business ? getSectorLabel(business.sector) : '';

  return (
    <Layout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {business?.businessName}
              </h1>
              {sectorLabel && (
                <span className="px-3 py-1 bg-sky-100 text-sky-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-sky-200">
                  {sectorLabel}
                </span>
              )}
            </div>
            <p className="text-gray-500 font-medium">
              {new Intl.DateTimeFormat("en-ZA", { dateStyle: "full" }).format(new Date())}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
                <Bell className="h-6 w-6 text-gray-600" />
                {alerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white ring-2 ring-red-100">
                    {alerts.length}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Health Score & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={cn("lg:col-span-1 p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col items-center justify-center text-center", healthConfig.bgColor)}>
            <div className="relative w-44 h-44 mb-5">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="88" cy="88" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-200/50" />
                <circle
                  cx="88"
                  cy="88"
                  r="80"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray={502.65}
                  strokeDashoffset={502.65 - (502.65 * score) / 100}
                  className={cn("transition-all duration-1000 ease-out", healthConfig.ringColor)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn("text-5xl font-black", healthState === 'not_configured' ? "text-gray-300" : "text-gray-900")}>
                  {healthState === 'not_configured' ? '—' : `${score}%`}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Health Score</span>
              </div>
            </div>
            <div className="space-y-1">
              <h3 className={cn("text-lg font-bold", healthConfig.color)}>{healthConfig.label}</h3>
              <p className="text-sm text-gray-500">{healthConfig.description}</p>
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard label="Compliant" value={stats.compliant} icon={ShieldCheck} color="green" description="Items fully up to date" />
            <StatCard label="Due Soon" value={stats.due_soon} icon={Clock} color="amber" description="Expiring within 30 days" />
            <StatCard label="Overdue" value={stats.overdue} icon={FileWarning} color="red" description="Past legal deadlines" />
            <StatCard label="Pending Setup" value={stats.pending_setup} icon={Settings2} color="blue" description="Configure deadlines to activate" />
          </div>
        </div>

        {/* Urgent Banner */}
        {urgentCount > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center space-x-4">
              <div className="bg-red-500 p-2 rounded-xl shadow-lg shadow-red-200">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-red-900">
                  {urgentCount} overdue {urgentCount === 1 ? 'item' : 'items'} require{urgentCount === 1 ? 's' : ''} immediate attention
                </p>
                <p className="text-sm text-red-700">
                  Non-compliance may result in significant fines or legal action from regulators.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Turnover Tax Tracker */}
        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Turnover Tax Tracker</h2>
              <p className="text-sm text-gray-500 mt-1">Monitor your revenue against the new R2.3M threshold (Effective April 2026)</p>
            </div>
            <button className="px-4 py-2 bg-sky-50 text-sky-600 text-sm font-bold rounded-xl hover:bg-sky-100 transition-colors border border-sky-100">
              Connect Accounting Software
            </button>
          </div>
          <div className="relative pt-4">
            <div className="flex mb-2 items-center justify-between">
              <span className="text-xs font-bold inline-block py-1 px-2 uppercase rounded-full text-sky-600 bg-sky-100">Current Turnover</span>
              <span className="text-xs font-bold inline-block text-gray-600">R2,300,000 Threshold</span>
            </div>
            <div className="overflow-hidden h-4 mb-4 text-xs flex rounded-full bg-gray-100">
              <div style={{ width: "45%" }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-sky-500 transition-all duration-1000 rounded-full"></div>
            </div>
            <div className="flex justify-between text-sm font-bold text-gray-900">
              <span>R 1,035,000</span>
              <span className="text-gray-400">R 1,265,000 remaining</span>
            </div>
          </div>
        </div>

        {/* Compliance Roadmap — Grouped */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Compliance Roadmap</h2>
            <div className="flex items-center space-x-2 text-sm font-semibold text-gray-400">
              <Info className="h-4 w-4" />
              <span>{processedItems.length} items · Grouped by category</span>
            </div>
          </div>

          {groupedItems.map(({ group, label, items: groupItems }) => {
            const isCollapsed = collapsedGroups.has(group);
            const groupCompliant = groupItems.filter(i => i.status === 'compliant').length;
            const groupOverdue = groupItems.filter(i => i.status === 'overdue').length;

            return (
              <div key={group} className="bg-white rounded-3xl shadow-xl shadow-gray-200/30 border border-gray-100 overflow-hidden">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "w-2 h-8 rounded-full",
                      groupOverdue > 0 ? "bg-red-500" : groupCompliant === groupItems.length ? "bg-green-500" : "bg-sky-500"
                    )} />
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-gray-900">{label}</h3>
                      <p className="text-xs text-gray-400 font-medium">
                        {groupCompliant}/{groupItems.length} compliant
                        {groupOverdue > 0 && <span className="text-red-500 ml-2">· {groupOverdue} overdue</span>}
                      </p>
                    </div>
                  </div>
                  {isCollapsed ? (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </button>

                {/* Group Items */}
                {!isCollapsed && (
                  <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupItems.map((item) => (
                      <ComplianceCard
                        key={item.id}
                        item={item}
                        onClick={() => {
                          setSelectedItem(item);
                          setIsModalOpen(true);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedItem && (
        <DetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          item={selectedItem}
        />
      )}
    </Layout>
  );
}

// ======================================================================
// STAT CARD
// ======================================================================
function StatCard({ label, value, icon: Icon, color, description }: {
  label: string;
  value: number;
  icon: LucideIcon;
  color: 'green' | 'red' | 'amber' | 'blue';
  description: string;
}) {
  const colors = {
    green: "bg-green-50 text-green-600 border-green-100 shadow-green-100/50",
    red: "bg-red-50 text-red-600 border-red-100 shadow-red-100/50",
    amber: "bg-amber-50 text-amber-600 border-amber-100 shadow-amber-100/50",
    blue: "bg-sky-50 text-sky-600 border-sky-100 shadow-sky-100/50",
  };

  const iconColors = {
    green: "bg-green-500",
    red: "bg-red-500",
    amber: "bg-amber-500",
    blue: "bg-sky-500",
  };

  return (
    <div className={cn("p-6 rounded-3xl border shadow-lg transition-all hover:scale-[1.02]", colors[color])}>
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2.5 rounded-xl shadow-lg", iconColors[color])}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <span className="text-3xl font-black">{value}</span>
      </div>
      <h4 className="font-bold text-gray-900">{label}</h4>
      <p className="text-xs font-medium text-gray-500 mt-1">{description}</p>
    </div>
  );
}

// ======================================================================
// COMPLIANCE CARD
// ======================================================================
function ComplianceCard({ item, onClick }: { key?: string | number; item: ComplianceItem; onClick: () => void }) {
  const statusConfig: Record<ComplianceStatus, { bg: string; label: string }> = {
    compliant: { bg: "bg-green-100 text-green-700 border-green-200", label: "Compliant" },
    overdue: { bg: "bg-red-100 text-red-700 border-red-200", label: "Overdue" },
    action_required: { bg: "bg-red-100 text-red-700 border-red-200", label: "Action Required" },
    expiring_soon: { bg: "bg-amber-100 text-amber-700 border-amber-200", label: "Expiring Soon" },
    pending_setup: { bg: "bg-sky-100 text-sky-700 border-sky-200", label: "Pending Setup" },
  };

  const config = statusConfig[item.status];

  const daysRemaining = useMemo(() => {
    const targetDate = item.expiryDate?.toDate?.() || item.dueDate?.toDate?.();
    if (!targetDate) return null;
    return differenceInDays(targetDate, new Date());
  }, [item]);

  return (
    <div
      onClick={onClick}
      className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-sky-200 transition-all cursor-pointer relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="h-4 w-4 text-sky-500" />
      </div>

      <div className="flex items-start justify-between mb-3">
        <div className={cn("px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", config.bg)}>
          {config.label}
        </div>
      </div>

      <h3 className="text-sm font-bold text-gray-900 leading-tight mb-1 group-hover:text-sky-600 transition-colors">
        {item.title}
      </h3>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
        {item.legalReference}
      </p>

      <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
        <div className="flex items-center text-gray-500">
          <Calendar className="h-3.5 w-3.5 mr-1.5" />
          <span className="text-[11px] font-semibold">
            {item.expiryDate && item.expiryDate.toDate
              ? `Expires: ${formatDate(item.expiryDate.toDate())}`
              : item.dueDate && item.dueDate.toDate
              ? `Due: ${formatDate(item.dueDate.toDate())}`
              : "Set Deadline →"}
          </span>
        </div>
        {daysRemaining !== null && item.status !== 'compliant' && item.status !== 'pending_setup' && (
          <div className={cn(
            "text-[10px] font-black px-2 py-1 rounded-lg",
            daysRemaining < 0 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-600"
          )}>
            {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d Overdue` : `${daysRemaining}d Left`}
          </div>
        )}
      </div>
    </div>
  );
}
