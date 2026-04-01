import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "./lib/firebase";
import { doc, getDocFromServer } from "firebase/firestore";
import { Business } from "./types";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import DashboardPage from "./pages/DashboardPage";
import DocumentsPage from "./pages/DocumentsPage";
import AlertsPage from "./pages/AlertsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFoundPage from "./pages/NotFoundPage";

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
interface AuthContextType {
  user: User | null;
  business: Business | null | undefined; // Allow undefined to represent 'fetching'
  loading: boolean;
  refreshBusiness: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null | undefined>(undefined); // Start as undefined
  const [loading, setLoading] = useState(true);

  const fetchBusiness = async (uid: string, forceServer = false) => {
    try {
      const docRef = doc(db, "businesses", uid);
      // Always read from server to avoid stale cache issues
      const docSnap = await getDocFromServer(docRef);
      if (docSnap.exists()) {
        setBusiness({ id: docSnap.id, ...docSnap.data() } as Business);
      } else {
        setBusiness(null);
      }
    } catch (error) {
      console.error("Error fetching business:", error);
      // Fallback to null ONLY if it was undefined to prevent infinite loading. 
      // If we already have data, keep it to avoid kicking users on transient connection loss.
      setBusiness((prev) => prev === undefined ? null : prev);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        setBusiness(undefined); // Mark as fetching to prevent router race condition during login
        await fetchBusiness(user.uid);
      } else {
        setBusiness(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const refreshBusiness = async () => {
    if (user) await fetchBusiness(user.uid, true);
  };

  return (
    <AuthContext.Provider value={{ user, business, loading, refreshBusiness }}>
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
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, business } = useAuth();
  const location = useLocation();

  // Show loading spinner if auth is loading OR if user is logged in but business data is still fetching
  if (loading || (user && business === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If no business doc exists, or onboarding wasn't completed → send to onboarding
  // But skip redirect if onboarding was JUST completed this session (guards against cache lag)
  const onboardingJustCompleted = sessionStorage.getItem('vylex_onboarding_done') === 'true';
  if (
    (!business || !business.onboardingCompleted) &&
    !onboardingJustCompleted &&
    location.pathname !== "/onboarding"
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

import LandingPage from "./pages/LandingPage";

export default function App() {
  return (
    <AuthProvider>
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
            path="/documents"
            element={
              <ProtectedRoute>
                <DocumentsPage />
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
    </AuthProvider>
  );
}