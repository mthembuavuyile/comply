import { useEffect, useState } from "react";
import { useAuth } from "../App";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Alert } from "../types";
import Layout from "../components/Layout";
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Trash2, 
  ExternalLink, 
  Calendar,
  Info,
  ChevronRight,
  MailOpen
} from "lucide-react";
import { cn, formatDate } from "../lib/utils";

export default function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "alerts"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newAlerts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Alert[];
      setAlerts(newAlerts);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "alerts");
    });

    return unsubscribe;
  }, [user]);

  const markAsRead = async (alertId: string) => {
    try {
      const alertRef = doc(db, "alerts", alertId);
      await updateDoc(alertRef, { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `alerts/${alertId}`);
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      const alertRef = doc(db, "alerts", alertId);
      await deleteDoc(alertRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `alerts/${alertId}`);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadAlerts = alerts.filter(a => !a.read);
      const batch = unreadAlerts.map(a => updateDoc(doc(db, "alerts", a.id), { read: true }));
      await Promise.all(batch);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "alerts");
    }
  };

  const alertIcons = {
    due_soon: Clock,
    overdue: AlertTriangle,
    expiring: AlertTriangle,
  };

  const alertColors = {
    due_soon: "text-amber-600 bg-amber-50 border-amber-100 shadow-amber-100/50",
    overdue: "text-red-600 bg-red-50 border-red-100 shadow-red-100/50",
    expiring: "text-red-600 bg-red-50 border-red-100 shadow-red-100/50",
  };

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <Layout>
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-4 px-3 py-1 bg-sky-500 text-white text-xs font-black rounded-full shadow-lg shadow-sky-100">
                  {unreadCount} NEW
                </span>
              )}
            </h1>
            <p className="text-gray-500 font-medium mt-1">Stay updated on your compliance deadlines.</p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center px-4 py-2 bg-white text-sky-600 text-sm font-bold rounded-xl border border-sky-100 shadow-sm hover:bg-sky-50 transition-colors"
            >
              <MailOpen className="h-4 w-4 mr-2" />
              Mark all as read
            </button>
          )}
        </div>

        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center">
              <div className="bg-gray-50 p-6 rounded-full mb-4">
                <Bell className="h-12 w-12 text-gray-200" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">All caught up!</h3>
              <p className="text-gray-500 max-w-xs">
                You don't have any notifications at the moment. We'll alert you when deadlines approach.
              </p>
            </div>
          ) : (
            alerts.map((alert) => {
              const Icon = alertIcons[alert.type] || Info;
              return (
                <div 
                  key={alert.id} 
                  className={cn(
                    "group p-5 rounded-3xl border transition-all flex items-start space-x-4",
                    alert.read 
                      ? "bg-white border-gray-100 opacity-75" 
                      : "bg-white border-sky-200 shadow-xl shadow-sky-100/50 ring-1 ring-sky-50"
                  )}
                >
                  <div className={cn("p-3 rounded-2xl shadow-lg", alertColors[alert.type] || "bg-gray-50 text-gray-500")}>
                    <Icon className="h-6 w-6" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          {alert.type.replace('_', ' ')}
                        </span>
                        {!alert.read && (
                          <div className="w-2 h-2 bg-sky-500 rounded-full animate-pulse" />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-gray-400">
                        {formatDate(alert.createdAt.toDate())}
                      </span>
                    </div>
                    <p className={cn("text-sm leading-relaxed", alert.read ? "text-gray-600" : "text-gray-900 font-bold")}>
                      {alert.message}
                    </p>
                    <div className="mt-4 flex items-center space-x-4">
                      <button className="flex items-center text-sky-600 text-xs font-bold hover:text-sky-700 transition-colors">
                        View Item
                        <ChevronRight className="ml-1 h-3.5 w-3.5" />
                      </button>
                      {!alert.read && (
                        <button 
                          onClick={() => markAsRead(alert.id)}
                          className="text-gray-400 hover:text-sky-600 text-xs font-bold transition-colors"
                        >
                          Mark as read
                        </button>
                      )}
                      <button 
                        onClick={() => deleteAlert(alert.id)}
                        className="text-gray-400 hover:text-red-600 text-xs font-bold transition-colors opacity-0 group-hover:opacity-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
