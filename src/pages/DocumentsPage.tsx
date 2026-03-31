import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../App";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { ComplianceItem, ComplianceCategory } from "../types";
import Layout from "../components/Layout";
import { 
  FileText, 
  Download, 
  Search, 
  Filter, 
  ExternalLink, 
  Calendar,
  Tag,
  FolderOpen,
  ChevronRight
} from "lucide-react";
import { cn, formatDate } from "../lib/utils";

interface DocumentRecord {
  url: string;
  itemTitle: string;
  category: ComplianceCategory;
  uploadedAt: Date;
  itemId: string;
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ComplianceCategory | "all">("all");

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "complianceItems"),
      where("userId", "==", user.uid)
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

    return unsubscribe;
  }, [user]);

  const documents = useMemo(() => {
    const docs: DocumentRecord[] = [];
    items.forEach((item) => {
      if (item.evidenceUrls && item.evidenceUrls.length > 0) {
        item.evidenceUrls.forEach((url) => {
          docs.push({
            url,
            itemTitle: item.title,
            category: item.category,
            uploadedAt: item.updatedAt?.toDate() || new Date(),
            itemId: item.id,
          });
        });
      }
    });
    return docs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }, [items]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = doc.itemTitle.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [documents, searchTerm, selectedCategory]);

  const categories: { value: ComplianceCategory | "all"; label: string }[] = [
    { value: "all", label: "All Categories" },
    { value: "cipc_annual_return", label: "CIPC Annual Return" },
    { value: "cipc_beneficial_ownership", label: "CIPC Beneficial Ownership" },
    { value: "sars_tcs", label: "SARS TCS" },
    { value: "sars_provisional_tax", label: "SARS Provisional Tax" },
    { value: "turnover_tax", label: "Turnover Tax" },
    { value: "uif", label: "UIF" },
    { value: "coida", label: "COIDA" },
    { value: "bbbee", label: "B-BBEE" },
    { value: "municipal_licence", label: "Municipal Licence" },
    { value: "popia", label: "POPIA" },
    { value: "paia", label: "PAIA" },
    { value: "fica", label: "FICA" },
  ];

  return (
    <Layout>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Document Vault</h1>
            <p className="text-gray-500 font-medium mt-1">All your compliance evidence in one secure place.</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-sky-100 px-4 py-2 rounded-2xl border border-sky-200">
              <FolderOpen className="h-5 w-5 text-sky-600" />
              <span className="text-sm font-bold text-sky-900">{documents.length} Total Documents</span>
            </div>
            <button className="flex items-center space-x-2 bg-sky-600 text-white px-4 py-2 rounded-2xl shadow-sm hover:bg-sky-700 transition-colors font-bold text-sm">
              <Download className="h-4 w-4" />
              <span>Generate Vendor Pack</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by compliance item name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all appearance-none cursor-pointer font-medium text-gray-700"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Document Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.length === 0 ? (
            <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center">
              <div className="bg-gray-50 p-6 rounded-full mb-4">
                <FileText className="h-12 w-12 text-gray-200" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No documents found</h3>
              <p className="text-gray-500 max-w-xs">
                {searchTerm || selectedCategory !== "all" 
                  ? "Try adjusting your filters or search terms." 
                  : "Upload evidence to your compliance items to see them here."}
              </p>
            </div>
          ) : (
            filteredDocuments.map((doc, idx) => (
              <div 
                key={idx} 
                className="group bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/30 hover:shadow-sky-100 hover:border-sky-200 transition-all flex flex-col"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="bg-sky-50 p-4 rounded-2xl shadow-sm group-hover:bg-sky-500 transition-colors">
                    <FileText className="h-8 w-8 text-sky-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                    >
                      <Download className="h-5 w-5" />
                    </a>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Tag className="h-3 w-3 text-sky-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-sky-600">
                      {doc.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight mb-2 group-hover:text-sky-600 transition-colors">
                    {doc.itemTitle}
                  </h3>
                  <div className="flex items-center text-gray-400 text-xs font-semibold">
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    Uploaded {formatDate(doc.uploadedAt)}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Evidence Doc_{idx + 1}
                  </span>
                  <button className="flex items-center text-sky-600 text-xs font-bold hover:text-sky-700 transition-colors">
                    View Item
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
