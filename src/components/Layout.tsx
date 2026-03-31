import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
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
  Settings,
} from "lucide-react";
import { cn } from "../lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { business } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/auth");
  };

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Document Vault", path: "/documents", icon: FileText },
    { name: "Notifications", path: "/alerts", icon: Bell },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  const sectorLabel = business ? getSectorLabel(business.sector) : '';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-72 bg-white border-r border-gray-200 flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-gray-100">
          <Link to="/dashboard" className="flex items-center space-x-3">
            <div className="bg-sky-500 p-2 rounded-lg shadow-md shadow-sky-100">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Vylex Comply</span>
          </Link>
        </div>

        <div className="p-6">
          <div className="flex items-center space-x-3 p-4 bg-sky-50 rounded-2xl border border-sky-100 mb-8">
            <div className="bg-white p-2 rounded-xl shadow-sm">
              <Building2 className="h-5 w-5 text-sky-600" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest truncate">
                {sectorLabel || 'Business'}
              </p>
              <p className="text-sm font-bold text-sky-900 truncate">
                {business?.businessName || "My Business"}
              </p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-semibold transition-all group",
                  location.pathname === item.path
                    ? "bg-sky-600 text-white shadow-lg shadow-sky-100"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <div className="flex items-center">
                  <item.icon className={cn("h-5 w-5 mr-3", location.pathname === item.path ? "text-white" : "text-gray-400 group-hover:text-sky-500")} />
                  {item.name}
                </div>
                {location.pathname === item.path && <ChevronRight className="h-4 w-4" />}
              </Link>
            ))}
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
      <header className="md:hidden bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between sticky top-0 z-50">
        <Link to="/dashboard" className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-sky-500" />
          <span className="text-lg font-bold text-gray-900">Vylex Comply</span>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-gray-50 text-gray-600"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white pt-20 px-6 animate-in fade-in duration-200">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center px-4 py-4 rounded-2xl text-lg font-bold transition-all",
                  location.pathname === item.path
                    ? "bg-sky-600 text-white shadow-lg shadow-sky-100"
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <item.icon className="h-6 w-6 mr-4" />
                {item.name}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-4 text-lg font-bold text-red-600 hover:bg-red-50 rounded-2xl transition-all"
            >
              <LogOut className="h-6 w-6 mr-4" />
              Sign Out
            </button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
