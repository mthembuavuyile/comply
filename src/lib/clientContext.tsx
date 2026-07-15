import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { collection, query, where, onSnapshot, doc, getDoc, getDocs, writeBatch } from "firebase/firestore";
import { User } from "firebase/auth";
import { Business } from "../types";

// --- Legacy Migration for single-business users ---
async function runLegacyMigration(userId: string) {
  try {
    console.log("Starting legacy migration for user:", userId);
    const batch = writeBatch(db);
    
    // 1. Update the business document to set ownerId
    const bizRef = doc(db, "businesses", userId);
    batch.update(bizRef, { ownerId: userId });

    // Helper to query and add updates to batch
    const migrateCollection = async (colName: string) => {
      const q = query(collection(db, colName), where("userId", "==", userId));
      const snap = await getDocs(q);
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.businessId) {
          batch.update(docSnap.ref, { businessId: userId });
        }
      });
    };

    // 2. Migrate related collections
    await Promise.all([
      migrateCollection("suppliers"),
      migrateCollection("spendLogs"),
      migrateCollection("complianceItems"),
      migrateCollection("alerts"),
      migrateCollection("scorecardProjects"),
      migrateCollection("evidenceDocs")
    ]);

    await batch.commit();
    console.log("Migration completed successfully for user:", userId);
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

// --- Client Context ---
// Manages the multi-client state: which businesses the user owns,
// which one is currently active, and switching between them.

interface ClientContextType {
  /** All businesses owned by the current user */
  clients: Business[];
  /** Whether the client list is still loading */
  clientsLoading: boolean;
  /** The currently active/selected business */
  activeClient: Business | null;
  /** ID of the active client (persisted to localStorage) */
  activeClientId: string | null;
  /** Switch to a different client by ID */
  setActiveClientId: (id: string) => void;
  /** Refresh the client list (e.g. after adding a new client) */
  refreshClients: () => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

interface ClientProviderProps {
  user: User | null;
  children: ReactNode;
}

const ACTIVE_CLIENT_KEY = "complyos_active_client";

export function ClientProvider({ user, children }: ClientProviderProps) {
  const [clients, setClients] = useState<Business[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [activeClientId, setActiveClientIdState] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load persisted active client from localStorage
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`${ACTIVE_CLIENT_KEY}_${user.uid}`);
      if (stored) {
        setActiveClientIdState(stored);
      }
    }
  }, [user]);

  // Listen to all businesses owned by this user (real-time)
  useEffect(() => {
    if (!user) {
      setClients([]);
      setClientsLoading(false);
      return;
    }

    setClientsLoading(true);

    // Query businesses where ownerId matches (new multi-client model)
    const q = query(
      collection(db, "businesses"),
      where("ownerId", "==", user.uid)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const businesses = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Business[];

        // Also check for legacy single-business model (businesses/{userId})
        // This handles backward compatibility for existing users
        const hasLegacy = businesses.some((b) => b.id === user.uid);

        if (businesses.length === 0 && !hasLegacy) {
          // Try to load the legacy document directly
          getDoc(doc(db, "businesses", user.uid)).then((docSnap) => {
            if (docSnap.exists()) {
              const legacyBiz = { id: docSnap.id, ...docSnap.data() } as Business;
              setClients([legacyBiz]);
              // Auto-select the legacy business
              if (!activeClientId) {
                setActiveClientIdState(legacyBiz.id);
                localStorage.setItem(`${ACTIVE_CLIENT_KEY}_${user.uid}`, legacyBiz.id);
              }
              // Run migration to update documents to new multi-client format
              runLegacyMigration(user.uid);
            } else {
              setClients([]);
            }
            setClientsLoading(false);
          }).catch(() => {
            setClients([]);
            setClientsLoading(false);
          });
        } else {
          setClients(businesses);

          // Auto-select first client if none selected or if selected doesn't exist
          if (!activeClientId || !businesses.find((b) => b.id === activeClientId)) {
            const firstId = businesses[0]?.id || null;
            if (firstId) {
              setActiveClientIdState(firstId);
              localStorage.setItem(`${ACTIVE_CLIENT_KEY}_${user.uid}`, firstId);
            }
          }
          setClientsLoading(false);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "businesses");
        setClientsLoading(false);
      }
    );

    return () => unsub();
  }, [user, refreshTrigger]);

  // Derive active client from the list
  const activeClient = clients.find((c) => c.id === activeClientId) || null;

  // Set active client and persist
  const setActiveClientId = useCallback(
    (id: string) => {
      setActiveClientIdState(id);
      if (user) {
        localStorage.setItem(`${ACTIVE_CLIENT_KEY}_${user.uid}`, id);
      }
    },
    [user]
  );

  const refreshClients = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <ClientContext.Provider
      value={{
        clients,
        clientsLoading,
        activeClient,
        activeClientId,
        setActiveClientId,
        refreshClients,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error("useClient must be used within a ClientProvider");
  }
  return context;
}
