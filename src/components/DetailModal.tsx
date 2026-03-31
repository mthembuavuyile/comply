import React, { useState, useEffect } from "react";
import { ComplianceItem, ComplianceStatus } from "../types";
import { db, storage, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import {
  X,
  Calendar,
  FileText,
  Upload,
  Trash2,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  AlertTriangle,
  Info,
  Save,
  Settings2,
} from "lucide-react";
import { cn, formatDate } from "../lib/utils";

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ComplianceItem;
}

export default function DetailModal({ isOpen, onClose, item }: DetailModalProps) {
  const [status, setStatus] = useState<ComplianceStatus>(item.status);
  const [dueDate, setDueDate] = useState<string>(item.dueDate && item.dueDate.toDate ? item.dueDate.toDate().toISOString().split('T')[0] : "");
  const [expiryDate, setExpiryDate] = useState<string>(item.expiryDate && item.expiryDate.toDate ? item.expiryDate.toDate().toISOString().split('T')[0] : "");
  const [notes, setNotes] = useState(item.notes || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>(item.evidenceUrls || []);

  useEffect(() => {
    setStatus(item.status);
    setDueDate(item.dueDate && item.dueDate.toDate ? item.dueDate.toDate().toISOString().split('T')[0] : "");
    setExpiryDate(item.expiryDate && item.expiryDate.toDate ? item.expiryDate.toDate().toISOString().split('T')[0] : "");
    setNotes(item.notes || "");
    setEvidenceUrls(item.evidenceUrls || []);
  }, [item]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const itemRef = doc(db, "complianceItems", item.id);
      await updateDoc(itemRef, {
        status,
        dueDate: dueDate ? new Date(dueDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        notes,
        evidenceUrls,
        updatedAt: serverTimestamp(),
        completedAt: status === "compliant" ? serverTimestamp() : null,
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `complianceItems/${item.id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `documents/${item.userId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setEvidenceUrls([...evidenceUrls, url]);
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileDelete = async (url: string) => {
    try {
      const storageRef = ref(storage, url);
      await deleteObject(storageRef);
      setEvidenceUrls(evidenceUrls.filter((u) => u !== url));
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  const statusOptions: { value: ComplianceStatus; label: string; icon: any; color: string }[] = [
    { value: "compliant", label: "Compliant", icon: CheckCircle2, color: "text-green-600 bg-green-50 border-green-200" },
    { value: "pending_setup", label: "Pending Setup", icon: Settings2, color: "text-sky-600 bg-sky-50 border-sky-200" },
    { value: "action_required", label: "Action Required", icon: AlertCircle, color: "text-red-600 bg-red-50 border-red-200" },
    { value: "expiring_soon", label: "Expiring Soon", icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200" },
    { value: "overdue", label: "Overdue", icon: AlertTriangle, color: "text-red-600 bg-red-50 border-red-200" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl shadow-black/20 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-sky-50/50">
          <div className="flex items-center space-x-3">
            <div className="bg-sky-500 p-2 rounded-xl shadow-lg shadow-sky-100">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">{item.title}</h2>
              <p className="text-xs font-bold text-sky-600 uppercase tracking-widest">{item.legalReference}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
            <X className="h-6 w-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Description Box */}
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-sky-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-1">Plain English Explanation</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            </div>
          </div>

          {/* Status Selector */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Current Status</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all",
                    status === opt.value
                      ? cn(opt.color, "ring-2 ring-offset-2 ring-sky-500")
                      : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                  )}
                >
                  <opt.icon className="h-5 w-5 mb-1.5" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-center leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dates & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wider">Due Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wider">Expiry Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wider">Compliance Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
              placeholder="Add any internal notes or reminders here..."
            />
          </div>

          {/* Document Upload */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-bold text-gray-900 uppercase tracking-wider">Evidence Documents</label>
              <label className="cursor-pointer">
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                <div className="flex items-center text-sky-600 text-sm font-bold hover:text-sky-700 transition-colors">
                  {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Upload Document
                </div>
              </label>
            </div>

            <div className="space-y-2">
              {evidenceUrls.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-2xl">
                  <FileText className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No documents uploaded yet.</p>
                </div>
              ) : (
                evidenceUrls.map((url, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 group">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="bg-white p-2 rounded-lg shadow-sm">
                        <FileText className="h-5 w-5 text-sky-500" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                        Document_{idx + 1}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-sky-600 hover:bg-white rounded-lg transition-all"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => handleFileDelete(url)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center px-8 py-2.5 bg-sky-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-sky-200 hover:bg-sky-700 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
