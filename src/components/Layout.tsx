import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { useClient } from "../lib/clientContext";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { getSectorLabel } from "../constants";
import {
  LayoutDashboard,
  FileText,
  Bell,
  LogOut,
  Menu,
  X,
  Shield,
  Building2,
  ChevronRight,
  ChevronDown,
  Settings,
  Users,
  Coins,
  ClipboardList,
  Calculator,
  FolderOpen,
  Search,
  MessageSquare,
  Plus,
  Check,
} from "lucide-react";
import { cn } from "../lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const { clients, activeClient, activeClientId, setActiveClientId } = useClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClientSwitcherOpen, setIsClientSwitcherOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const desktopSwitcherRef = useRef<HTMLDivElement>(null);
  const mobileSwitcherRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/auth");
  };

  // Close client switcher when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const isOutsideDesktop = desktopSwitcherRef.current && !desktopSwitcherRef.current.contains(target);
      const isOutsideMobile = mobileSwitcherRef.current && !mobileSwitcherRef.current.contains(target);
      
      // Only close if the click is outside BOTH switchers
      if ((!desktopSwitcherRef.current || isOutsideDesktop) && (!mobileSwitcherRef.current || isOutsideMobile)) {
        setIsClientSwitcherOpen(false);
        setClientSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredClients = clients.filter(
    (c) => !clientSearch || c.businessName.toLowerCase().includes(clientSearch.toLowerCase())
  );

  // --- B-BBEE section (primary) ---
  const bbbeeItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Suppliers CRM", path: "/suppliers", icon: Users },
    { name: "Evidence Vault", path: "/documents", icon: FileText },
    { name: "Spend Tracker", path: "/spend", icon: Coins },
    { name: "Audit Projects", path: "/projects", icon: ClipboardList },
    { name: "Scorecard Calc", path: "/calculator", icon: Calculator },
  ];

  // --- Tools section ---
  const toolItems = [
    { name: "AI BEE Copilot", path: "/ai", icon: MessageSquare },
    { name: "Notifications", path: "/alerts", icon: Bell },
  ];

  // --- Practice section ---
  const practiceItems = [
    { name: "All Clients", path: "/clients", icon: FolderOpen },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  const sectorLabel = activeClient ? getSectorLabel(activeClient.sector) : "";

  // Renders a nav link item
  const renderNavItem = (item: { name: string; path: string; icon: typeof LayoutDashboard }, closeMobile = false) => (
    <Link
      key={item.path}
      to={item.path}
      onClick={closeMobile ? () => setIsMobileMenuOpen(false) : undefined}
      className={cn(
        "flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-semibold transition-all group",
        location.pathname === item.path
          ? "bg-sky-600 text-white shadow-lg "
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <div className="flex items-center">
        <item.icon
          className={cn(
            "h-5 w-5 mr-3",
            location.pathname === item.path ? "text-white" : "text-gray-400 group-hover:text-sky-500"
          )}
        />
        {item.name}
      </div>
      {location.pathname === item.path && <ChevronRight className="h-4 w-4" />}
    </Link>
  );

  // Client Switcher Widget
  const ClientSwitcher = ({ onClientSwitch, containerRef }: { onClientSwitch?: () => void, containerRef: React.RefObject<HTMLDivElement> }) => (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => {
          setIsClientSwitcherOpen(!isClientSwitcherOpen);
          setClientSearch("");
        }}
        className={cn(
          "w-full flex items-center space-x-3 p-4 rounded-lg border transition-all",
          isClientSwitcherOpen
            ? "bg-sky-100 border-sky-200"
            : "bg-sky-50 border-sky-100 hover:bg-sky-100"
        )}
      >
        <div className="bg-white p-2 rounded-xl shadow-sm">
          <Building2 className="h-5 w-5 text-sky-600" />
        </div>
        <div className="overflow-hidden flex-1 text-left">
          <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest truncate">
            {sectorLabel || "Business"}
          </p>
          <p className="text-sm font-bold text-sky-900 truncate">
            {activeClient?.businessName || "Select Client"}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-sky-400 transition-transform flex-shrink-0",
            isClientSwitcherOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {isClientSwitcherOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-lg border border-gray-200 shadow-lg  z-50 overflow-hidden">
          {/* Search */}
          {clients.length > 3 && (
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-200"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Client list */}
          <div className="max-h-[240px] overflow-y-auto">
            {filteredClients.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4 font-medium">No clients found</p>
            ) : (
              filteredClients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveClientId(c.id);
                    setIsClientSwitcherOpen(false);
                    setClientSearch("");
                    onClientSwitch?.();
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-sky-50 transition-colors",
                    c.id === activeClientId && "bg-sky-50"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{c.businessName}</p>
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider truncate">
                      {getSectorLabel(c.sector)} · {c.province || "—"}
                    </p>
                  </div>
                  {c.id === activeClientId && (
                    <Check className="h-4 w-4 text-sky-600 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer actions */}
          <div className="border-t border-gray-100 p-2 space-y-1">
            <button
              onClick={() => {
                setIsClientSwitcherOpen(false);
                setClientSearch("");
                onClientSwitch?.();
                navigate("/onboarding");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add New Client
            </button>
            <button
              onClick={() => {
                setIsClientSwitcherOpen(false);
                setClientSearch("");
                onClientSwitch?.();
                navigate("/clients");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              View All Clients
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Section heading for nav grouping
  const NavSection = ({ label }: { label: string }) => (
    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400 px-4 pt-5 pb-1.5">
      {label}
    </p>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-72 bg-white border-r border-gray-200 flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-gray-100">
          <Link to="/dashboard" className="flex items-center space-x-3">
            <div className="bg-sky-500 p-2 rounded-lg shadow-md ">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">ComplyOS</span>
          </Link>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* Client Switcher */}
          <div className="mb-6">
            {ClientSwitcher({ containerRef: desktopSwitcherRef })}
          </div>

          {/* B-BBEE Section */}
          <nav className="space-y-1">
            <NavSection label="B-BBEE" />
            {bbbeeItems.map((item) => renderNavItem(item))}

            <NavSection label="Tools" />
            {toolItems.map((item) => renderNavItem(item))}

            <NavSection label="Practice" />
            {practiceItems.map((item) => renderNavItem(item))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group"
          >
            <LogOut className="h-5 w-5 mr-3 text-gray-400 group-hover:text-red-500" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between sticky top-0 z-30">
        <Link to="/dashboard" className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-sky-500" />
          <span className="text-lg font-bold text-gray-900">ComplyOS</span>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 rounded-lg bg-gray-50 text-gray-600  transition-all"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {/* Mobile Sidebar Drawer Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 md:hidden",
          isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Sidebar Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out md:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-3">
            <div className="bg-sky-500 p-2 rounded-lg shadow-md ">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">ComplyOS</span>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500  transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Client Switcher (mobile) */}
          <div className="mb-6">
            {ClientSwitcher({ onClientSwitch: () => setIsMobileMenuOpen(false), containerRef: mobileSwitcherRef })}
          </div>

          <nav className="space-y-1">
            <NavSection label="B-BBEE" />
            {bbbeeItems.map((item) => renderNavItem(item, true))}

            <NavSection label="Tools" />
            {toolItems.map((item) => renderNavItem(item, true))}

            <NavSection label="Practice" />
            {practiceItems.map((item) => renderNavItem(item, true))}
          </nav>
        </div>

        <div className="p-6 border-t border-gray-100 mt-auto">
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              handleLogout();
            }}
            className="flex items-center w-full px-4 py-3 text-sm font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group"
          >
            <LogOut className="h-5 w-5 mr-3 text-gray-400 group-hover:text-red-500" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
