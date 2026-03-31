import { useState, useEffect } from "react";
import { useAuth } from "../App";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import Layout from "../components/Layout";
import {
  Sector,
  BusinessStructure,
  VatStatus,
  EmployeeBand,
} from "../types";
import {
  SECTOR_OPTIONS,
  PROVINCES,
  BUSINESS_STRUCTURES,
  EMPLOYEE_BANDS,
  getSectorLabel,
} from "../constants";
import {
  Building2,
  Bell,
  Link2,
  Users,
  CreditCard,
  Save,
  Loader2,
  CheckCircle2,
  MapPin,
  Landmark,
  AlertTriangle,
} from "lucide-react";
import { cn } from "../lib/utils";

type SettingsTab = 'profile' | 'notifications' | 'integrations' | 'team' | 'billing';

const TABS: { id: SettingsTab; label: string; icon: any }[] = [
  { id: 'profile', label: 'Business Profile', icon: Building2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'integrations', label: 'Connected Accounts', icon: Link2 },
  { id: 'team', label: 'Team Members', icon: Users },
  { id: 'billing', label: 'Subscription', icon: CreditCard },
];

export default function SettingsPage() {
  const { user, business, refreshBusiness } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Settings</h1>
          <p className="text-gray-500 font-medium mt-1">Manage your business profile and preferences.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Tab Nav */}
          <nav className="lg:w-56 flex-shrink-0">
            <div className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap",
                    activeTab === tab.id
                      ? "bg-sky-600 text-white shadow-lg shadow-sky-100"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <tab.icon className={cn("h-5 w-5 mr-3", activeTab === tab.id ? "text-white" : "text-gray-400")} />
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Tab Content */}
          <div className="flex-1 min-w-0">
            {activeTab === 'profile' && <BusinessProfileTab />}
            {activeTab === 'notifications' && <ComingSoonTab title="Notifications" description="Configure email preferences and reminder lead times (7 days, 30 days before deadline)." />}
            {activeTab === 'integrations' && <ComingSoonTab title="Connected Accounts" description="Connect your accounting software (Xero, Sage, QuickBooks) for automatic turnover tracking." />}
            {activeTab === 'team' && <ComingSoonTab title="Team Members" description="Invite colleagues with role-based access — Owner, Admin, or View Only." />}
            {activeTab === 'billing' && <BillingTab />}
          </div>
        </div>
      </div>
    </Layout>
  );
}

// ======================================================================
// BUSINESS PROFILE TAB
// ======================================================================
function BusinessProfileTab() {
  const { user, business, refreshBusiness } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sectorChanged, setSectorChanged] = useState(false);

  const [form, setForm] = useState({
    businessName: "",
    sector: "general" as Sector,
    customSectorText: "",
    province: "",
    vatRegistered: "not_sure" as VatStatus,
    employeeBand: "0" as EmployeeBand,
    businessStructure: "pty_ltd" as BusinessStructure,
    cipcRegistered: false,
  });

  useEffect(() => {
    if (business) {
      const biz = business as any;
      setForm({
        businessName: biz.businessName || "",
        sector: biz.sector || "general",
        customSectorText: biz.customSectorText || "",
        province: biz.province || "",
        vatRegistered: biz.vatRegistered || (biz.vatRegistered === true ? "yes" : biz.vatRegistered === false ? "no" : "not_sure"),
        employeeBand: biz.employeeBand || "0",
        businessStructure: biz.businessStructure || "pty_ltd",
        cipcRegistered: biz.cipcRegistered ?? false,
      });
    }
  }, [business]);

  const update = (patch: Partial<typeof form>) => {
    if (patch.sector && patch.sector !== form.sector) {
      setSectorChanged(true);
    }
    setForm((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "businesses", user.uid), {
        businessName: form.businessName.trim(),
        sector: form.sector,
        customSectorText: form.sector === "other" ? form.customSectorText.trim() : "",
        province: form.province,
        vatRegistered: form.vatRegistered,
        employeeBand: form.employeeBand,
        businessStructure: form.businessStructure,
        cipcRegistered: form.cipcRegistered,
        updatedAt: serverTimestamp(),
      });
      await refreshBusiness();
      setSaved(true);
      setSectorChanged(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `businesses/${user.uid}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">Business Profile</h2>
        <p className="text-sm text-gray-500 mt-1">Update your business details. Changes may affect your compliance roadmap.</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Sector change warning */}
        {sectorChanged && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3 animate-in fade-in duration-300">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-900">Sector Change Detected</p>
              <p className="text-xs text-amber-700 mt-1">Changing your sector will update your compliance requirements. New sector-specific items will be added on next login.</p>
            </div>
          </div>
        )}

        {/* Business Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Business Name</label>
          <div className="relative">
            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => update({ businessName: e.target.value })}
              className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Sector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Industry Sector</label>
            <select
              value={form.sector}
              onChange={(e) => update({ sector: e.target.value as Sector })}
              className="block w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-sm appearance-none bg-white cursor-pointer"
            >
              {SECTOR_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
              <option value="other">Other — My industry isn't listed</option>
            </select>
            {form.sector === "other" && (
              <input
                type="text"
                value={form.customSectorText}
                onChange={(e) => update({ customSectorText: e.target.value })}
                className="mt-2 block w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                placeholder="Your industry..."
              />
            )}
          </div>

          {/* Province */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Province</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={form.province}
                onChange={(e) => update({ province: e.target.value })}
                className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-sm appearance-none bg-white cursor-pointer"
              >
                <option value="">Select province</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* VAT */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">VAT Registered</label>
            <select
              value={form.vatRegistered}
              onChange={(e) => update({ vatRegistered: e.target.value as VatStatus })}
              className="block w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-sm appearance-none bg-white cursor-pointer"
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="not_sure">Not Sure</option>
            </select>
          </div>

          {/* Employees */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Employees</label>
            <div className="relative">
              <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={form.employeeBand}
                onChange={(e) => update({ employeeBand: e.target.value as EmployeeBand })}
                className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-sm appearance-none bg-white cursor-pointer"
              >
                {EMPLOYEE_BANDS.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Business Structure */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Business Structure</label>
            <div className="relative">
              <Landmark className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={form.businessStructure}
                onChange={(e) => update({ businessStructure: e.target.value as BusinessStructure })}
                className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-sm appearance-none bg-white cursor-pointer"
              >
                {BUSINESS_STRUCTURES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* CIPC */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 self-end">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">CIPC Registered</h3>
            </div>
            <button
              onClick={() => update({ cipcRegistered: !form.cipcRegistered })}
              className={cn(
                "relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none",
                form.cipcRegistered ? "bg-sky-500" : "bg-gray-200"
              )}
            >
              <span
                className={cn(
                  "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform",
                  form.cipcRegistered ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <div>
          {saved && (
            <div className="flex items-center text-green-600 text-sm font-semibold animate-in fade-in duration-300">
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Profile saved successfully
            </div>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !form.businessName.trim()}
          className="flex items-center px-8 py-2.5 bg-sky-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-sky-200 hover:bg-sky-700 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}

// ======================================================================
// BILLING TAB
// ======================================================================
function BillingTab() {
  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">Subscription & Billing</h2>
      </div>
      <div className="p-8 text-center">
        <div className="inline-flex items-center px-4 py-1.5 bg-green-100 text-green-700 text-xs font-black uppercase tracking-widest rounded-full mb-4">
          Free Plan
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">You're on the Free Plan</h3>
        <p className="text-gray-500 max-w-md mx-auto mb-8">
          Track your core compliance requirements at no cost. Upgrade for advanced features, team access, and integrations.
        </p>
        <button className="px-8 py-3 bg-sky-600 text-white font-bold rounded-xl shadow-lg shadow-sky-200 hover:bg-sky-700 transition-all text-sm">
          Upgrade to Pro — Coming Soon
        </button>
      </div>
    </div>
  );
}

// ======================================================================
// COMING SOON PLACEHOLDER
// ======================================================================
function ComingSoonTab({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      <div className="p-12 text-center">
        <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Bell className="h-8 w-8 text-sky-300" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Coming Soon</h3>
        <p className="text-gray-500 max-w-md mx-auto text-sm">{description}</p>
      </div>
    </div>
  );
}
