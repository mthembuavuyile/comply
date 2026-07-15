import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "./lib/firebase";
import { doc, getDocFromServer } from "firebase/firestore";
import { ClientProvider, useClient } from "./lib/clientContext";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import DashboardPage from "./pages/DashboardPage";
import DocumentsPage from "./pages/DocumentsPage";
import AlertsPage from "./pages/AlertsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFoundPage from "./pages/NotFoundPage";
import SuppliersPage from "./pages/SuppliersPage";
import SpendTrackerPage from "./pages/SpendTrackerPage";
import ScorecardProjectsPage from "./pages/ScorecardProjectsPage";
import ScorecardCalculatorPage from "./pages/ScorecardCalculatorPage";
import AIAssistantPage from "./pages/AIAssistantPage";
import ClientsPage from "./pages/ClientsPage";

// --- Connection Test ---
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

// --- Auth Context ---
// AuthProvider now ONLY manages Firebase auth state.
// Business/client state is managed by ClientProvider (clientContext.tsx).
interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// --- Protected Route ---
// Uses useClient() from clientContext to check if user has at least one business.
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { clients, clientsLoading, activeClient } = useClient();
  const location = useLocation();

  // Show loading spinner if auth is loading OR client list is still loading
  if (loading || (user && clientsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If no businesses exist, or the active client hasn't completed onboarding → send to onboarding
  // But skip redirect if onboarding was JUST completed this session (guards against cache lag)
  const onboardingJustCompleted = sessionStorage.getItem('vylex_onboarding_done') === 'true';
  if (
    (clients.length === 0 || (activeClient && !activeClient.onboardingCompleted)) &&
    !onboardingJustCompleted &&
    location.pathname !== "/onboarding"
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

import LandingPage from "./pages/LandingPage";

// --- App Shell ---
// AuthProvider → ClientProvider → BrowserRouter → Routes
// ClientProvider receives the user from AuthProvider to scope business queries.
function AppShell() {
  const { user } = useAuth();

  return (
    <ClientProvider user={user}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <ClientsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <DocumentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers"
            element={
              <ProtectedRoute>
                <SuppliersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/spend"
            element={
              <ProtectedRoute>
                <SpendTrackerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <ScorecardProjectsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calculator"
            element={
              <ProtectedRoute>
                <ScorecardCalculatorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai"
            element={
              <ProtectedRoute>
                <AIAssistantPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <AlertsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ClientProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}