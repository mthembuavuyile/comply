import { useState, useMemo } from "react";
import { useAuth } from "../App";
import { useClient } from "../lib/clientContext";
import Layout from "../components/Layout";
import { getSectorLabel } from "../constants";
import { Business } from "../types";
import { useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import {
  Building2,
  Search,
  Plus,
  Award,
  AlertTriangle,
  Users,
  TrendingUp,
  ChevronRight,
  Filter,
  LayoutGrid,
  MapPin,
  Shield,
  Trash2,
} from "lucide-react";
import { cn } from "../lib/utils";

// Simplified B-BBEE level badge color
function levelColor(level: number | undefined) {
  if (!level || level === 9) return "bg-rose-50 text-rose-700 border-rose-200";
  if (level <= 2) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (level <= 4) return "bg-sky-50 text-sky-700 border-sky-200";
  if (level <= 6) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-orange-50 text-orange-700 border-orange-200";
}

function levelLabel(level: number | undefined) {
  if (!level || level === 9) return "Non-Compliant";
  return `Level ${level}`;
}

export default function ClientsPage() {
  const { user } = useAuth();
  const { clients, clientsLoading, setActiveClientId, activeClientId } = useClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [provinceFilter, setProvinceFilter] = useState<string>("all");

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchSearch =
        !searchQuery ||
        c.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.contactEmail && c.contactEmail.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchSector = sectorFilter === "all" || c.sector === sectorFilter;
      const matchProvince = provinceFilter === "all" || c.province === provinceFilter;
      return matchSearch && matchSector && matchProvince;
    });
  }, [clients, searchQuery, sectorFilter, provinceFilter]);

  // Portfolio stats
  const stats = useMemo(() => {
    return {
      totalClients: clients.length,
      sectors: new Set(clients.map((c) => c.sector)).size,
      provinces: new Set(clients.map((c) => c.province)).size,
    };
  }, [clients]);

  // Unique values for filters
  const uniqueSectors = useMemo(() => [...new Set(clients.map((c) => c.sector))].sort(), [clients]);
  const uniqueProvinces = useMemo(() => [...new Set(clients.map((c) => c.province))].sort(), [clients]);

  const handleSelectClient = (client: Business) => {
    setActiveClientId(client.id);
    navigate("/dashboard");
  };

  const handleAddClient = () => {
    navigate("/onboarding");
  };

  const handleDeleteClient = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation(); // prevent card click
    if (!window.confirm(`Are you sure you want to delete the client "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "businesses", id));
      // active client will be handled automatically by ClientContext if the active one is deleted
    } catch (error) {
      console.error("Failed to delete client", error);
      alert("Failed to delete client. Please try again.");
    }
  };

  return (
    <Layout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Client Portfolio
            </h1>
            <p className="text-gray-500 font-medium mt-1">
              Manage all your B-BBEE clients from one dashboard.
            </p>
          </div>
          <button
            onClick={handleAddClient}
            className="flex items-center gap-2 px-5 py-2.5  bg-sky-600  hover:bg-sky-700 hover: text-white text-sm font-bold rounded-xl transition-all shadow-lg "
          >
            <Plus className="h-4 w-4" />
            Add Client
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-lg  flex items-center gap-4">
            <div className="p-3 bg-sky-50 rounded-lg border border-sky-100">
              <Building2 className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Clients</p>
              <p className="text-2xl font-black text-gray-900">{stats.totalClients}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-lg  flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <LayoutGrid className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sectors</p>
              <p className="text-2xl font-black text-gray-900">{stats.sectors}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-lg  flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <MapPin className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Provinces</p>
              <p className="text-2xl font-black text-gray-900">{stats.provinces}</p>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-lg ">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 appearance-none cursor-pointer"
              >
                <option value="all">All Sectors</option>
                {uniqueSectors.map((s) => (
                  <option key={s} value={s}>
                    {getSectorLabel(s)}
                  </option>
                ))}
              </select>
              <select
                value={provinceFilter}
                onChange={(e) => setProvinceFilter(e.target.value)}
                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 appearance-none cursor-pointer"
              >
                <option value="all">All Provinces</option>
                {uniqueProvinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Client Cards Grid */}
        {clientsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500" />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-md  p-16 text-center">
            <div className="mx-auto w-16 h-16 bg-sky-50 rounded-lg border border-sky-100 flex items-center justify-center mb-6">
              <Building2 className="h-8 w-8 text-sky-400" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">
              {clients.length === 0 ? "No Clients Yet" : "No Matching Clients"}
            </h3>
            <p className="text-gray-500 font-medium text-sm mb-6 max-w-md mx-auto">
              {clients.length === 0
                ? "Add your first client to start managing their B-BBEE compliance from this portfolio."
                : "Try adjusting your search or filter criteria."}
            </p>
            {clients.length === 0 && (
              <button
                onClick={handleAddClient}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg "
              >
                <Plus className="h-4 w-4" />
                Add Your First Client
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredClients.map((client) => {
              const isActive = client.id === activeClientId;
              const sectorLabel = getSectorLabel(client.sector);

              return (
                <button
                  key={client.id}
                  onClick={() => handleSelectClient(client)}
                  className={cn(
                    "group text-left bg-white p-6 rounded-lg border shadow-lg transition-all hover:scale-[1.02] hover:shadow-md",
                    isActive
                      ? "border-sky-300  ring-2 ring-sky-100"
                      : "border-gray-100  hover:border-sky-200"
                  )}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "p-2.5 rounded-xl border flex-shrink-0",
                          isActive
                            ? "bg-sky-50 border-sky-200 text-sky-600"
                            : "bg-gray-50 border-gray-200 text-gray-500 group-hover:bg-sky-50 group-hover:border-sky-200 group-hover:text-sky-600"
                        )}
                      >
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-gray-900 text-sm truncate">
                          {client.businessName}
                        </h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 truncate">
                          {sectorLabel}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleDeleteClient(e, client.id, client.businessName)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete Client"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-sky-500 flex-shrink-0 transition-colors" />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs font-semibold text-gray-500">{client.province || "—"}</span>
                    </div>
                    {client.contactEmail && (
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-xs font-semibold text-gray-500 truncate">{client.contactEmail}</span>
                      </div>
                    )}
                    {client.registrationNumber && (
                      <div className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-xs font-semibold text-gray-500">CIPC: {client.registrationNumber}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer badges */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-50">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border bg-sky-50 text-sky-700 border-sky-100">
                      {client.employeeBand === "0" ? "Solo" : `${client.employeeBand} staff`}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border bg-gray-50 text-gray-600 border-gray-200">
                      {client.businessStructure}
                    </span>
                    {isActive && (
                      <span className="ml-auto text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border bg-sky-600 text-white border-sky-600">
                        Active
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Add Client card */}
            <button
              onClick={handleAddClient}
              className="group text-left bg-gray-50/50 p-6 rounded-lg border-2 border-dashed border-gray-200 hover:border-sky-300 hover:bg-sky-50/30 transition-all flex flex-col items-center justify-center min-h-[200px]"
            >
              <div className="p-3 bg-white rounded-lg border border-gray-200 group-hover:border-sky-200 group-hover:bg-sky-50 transition-all mb-3 shadow-sm">
                <Plus className="h-6 w-6 text-gray-400 group-hover:text-sky-600 transition-colors" />
              </div>
              <p className="font-bold text-sm text-gray-500 group-hover:text-sky-700 transition-colors">
                Add New Client
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Onboard a new business
              </p>
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
