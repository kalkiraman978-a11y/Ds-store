/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { 
  LayoutDashboard, 
  Package, 
  ArrowLeftRight, 
  Settings, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  History,
  Wallet,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  Users,
  ChevronRight,
  PackagePlus,
  IndianRupee
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { cn, formatDate, formatCurrency } from "./lib/utils";
import { Product, InventoryTransaction, CashTransaction, AppData } from "./types";

const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbzvMWU_yHSyz_oN0lG7Ja-nqLlFZfr8EYqE-UKzW3snNPOYZQmUuSC1xmw6aJa5ySmB/exec";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [apiUrl, setApiUrl] = useState(localStorage.getItem("cloud_api_url") || DEFAULT_API_URL);
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");

  // Local State
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem("inventory_app_data");
    const defaultData = { 
      products: [], 
      transactions: [], 
      cashTransactions: [] 
    };
    if (!saved) return defaultData;
    try {
      return JSON.parse(saved);
    } catch {
      return defaultData;
    }
  });

  // Sync with Cloud
  const syncData = async () => {
    if (!apiUrl) return;
    setLoading(true);
    try {
      const response = await fetch(apiUrl);
      const cloudData = await response.json();
      
      setData(prev => ({
        ...prev,
        products: cloudData.products || [],
        transactions: cloudData.transactions || [],
        // Cash transactions are local-only as per request
      }));
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem("inventory_app_data", JSON.stringify(data));
  }, [data]);

  const sendToCloud = async (payload: any) => {
    // Only send non-cash actions to cloud
    if (payload.action === "ADD_CASH" || payload.action === "EDIT_CASH" || payload.action === "DELETE_CASH") {
      return; 
    }

    if (!apiUrl) return;
    setLoading(true);
    try {
      await fetch(apiUrl, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(payload)
      });
      setTimeout(syncData, 1000);
    } catch (error) {
      console.error("Cloud update failed:", error);
      setLoading(false);
    }
  };

  // Calculations
  const stats = useMemo(() => {
    const cashBalance = data.cashTransactions.reduce((acc, t) => 
      t.type === "INCOME" ? acc + t.amount : acc - t.amount, 0
    );

    const productStocks = data.products.map(p => {
      const stock = data.transactions
        .filter(t => String(t.pid) === String(p.id))
        .reduce((acc, t) => t.type === 'IN' ? acc + t.qty : acc - t.qty, 0);
      return { ...p, stock };
    });

    const recentActivity = [...data.transactions].reverse().slice(0, 5);

    return { cashBalance, productStocks, recentActivity };
  }, [data]);

  // Actions
  const handleAddProduct = (name: string, cat: string) => {
    const newProd = { id: Date.now().toString(), name, cat };
    setData(prev => ({ ...prev, products: [...prev.products, newProd] }));
    sendToCloud({ action: "ADD_PRODUCT", ...newProd });
  };

  const handleAddInventory = (pid: string, type: "IN" | "OUT", qty: number, person: string, date: string) => {
    const newTrans = { id: Date.now().toString(), pid, type, qty, person, date: date || new Date().toLocaleString() };
    setData(prev => ({ ...prev, transactions: [...prev.transactions, newTrans] }));
    sendToCloud({ action: "ADD_TRANS", ...newTrans });
  };

  const handleEditInventory = (updatedTrans: InventoryTransaction) => {
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === updatedTrans.id ? updatedTrans : t)
    }));
    sendToCloud({ action: "EDIT_TRANS", ...updatedTrans });
  };

  const handleDeleteInventory = (id: string) => {
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id)
    }));
    sendToCloud({ action: "DELETE_TRANS", id });
  };

  const handleAddCash = (amount: number, type: "INCOME" | "EXPENSE", note: string, date: string) => {
    const newTrans = { id: Date.now().toString(), amount, type, note, date: date || new Date().toISOString() };
    setData(prev => ({ ...prev, cashTransactions: [...prev.cashTransactions, newTrans] }));
    // No cloud send for cash as requested
  };

  const handleEditCash = (updatedTrans: CashTransaction) => {
    setData(prev => ({
      ...prev,
      cashTransactions: prev.cashTransactions.map(t => t.id === updatedTrans.id ? updatedTrans : t)
    }));
  };

  const handleDeleteCash = (id: string) => {
    setData(prev => ({
      ...prev,
      cashTransactions: prev.cashTransactions.filter(t => t.id !== id)
    }));
  };

  const secureTabs = ["accounts", "inventory", "products"];

  const renderContent = () => {
    if (secureTabs.includes(activeTab) && !isAuthenticated) {
      return (
        <Card className="max-w-md mx-auto mt-20">
          <div className="flex flex-col items-center gap-6 p-4">
             <div className="p-4 rounded-full bg-blue-50 text-blue-600">
                <Settings size={32} />
             </div>
             <div className="text-center">
                <h3 className="text-xl font-bold">Authenticated Access Only</h3>
                <p className="text-sm text-gray-500 mt-2">Please enter the security password to manage data.</p>
             </div>
             <input 
               type="password"
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && password === '123456' && setIsAuthenticated(true)}
               placeholder="Enter Password"
               className="w-full rounded-xl border-gray-200 text-center p-3 focus:ring-[#1E40AF]"
             />
             <button 
               onClick={() => {
                 if(password === "123456") setIsAuthenticated(true);
                 else alert("Incorrect Password");
               }}
               className="w-full rounded-xl bg-[#1E40AF] p-4 text-sm font-bold text-white shadow-lg"
             >
               Unlock Section
             </button>
          </div>
        </Card>
      );
    }

    switch (activeTab) {
      case "dashboard": return <Dashboard stats={stats} data={data} />;
      case "accounts": return <AccountsView transactions={data.cashTransactions} balance={stats.cashBalance} onAdd={handleAddCash} onEdit={handleEditCash} onDelete={handleDeleteCash} />;
      case "inventory": return <InventoryView products={stats.productStocks} transactions={data.transactions} onAdd={handleAddInventory} onEdit={handleEditInventory} onDelete={handleDeleteInventory} />;
      case "products": return <ProductSetup products={data.products} onAdd={handleAddProduct} />;
      default: return <Dashboard stats={stats} data={data} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F5F5F5] font-sans text-[#1A1A1A] overflow-hidden">
      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white shadow-xl">
              <Loader2 className="h-8 w-8 animate-spin text-[#1E40AF]" />
              <p className="font-medium text-gray-600 text-sm">Syncing with Cloud...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar (Desktop) */}
      <aside className="w-64 border-r border-[#E5E5E5] bg-white p-6 hidden lg:flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E40AF] text-white">
            <IndianRupee className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Cloud Ledger DS Store</h1>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<Wallet size={20} />} label="Accounts" active={activeTab === 'accounts'} onClick={() => setActiveTab('accounts')} />
          <NavItem icon={<ArrowLeftRight size={20} />} label="Inventory" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
          <NavItem icon={<Package size={20} />} label="Products" active={activeTab === 'products'} onClick={() => setActiveTab('products')} />
        </nav>

        <div className="mt-auto">
          <button 
            onClick={() => setShowApiSettings(!showApiSettings)}
            className="flex w-full items-center gap-3 rounded-lg p-3 text-sm text-gray-500 hover:bg-gray-50 hover:text-[#1E40AF] transition-colors"
          >
            <Settings size={18} />
            Cloud Settings
          </button>
          <button 
            onClick={syncData}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gray-50 p-3 text-sm font-medium text-[#1E40AF] hover:bg-gray-100 transition-colors"
          >
            <RefreshCw size={16} className={cn(loading && "animate-spin")} />
            Sync Now
          </button>
          <div className="mt-6 border-t border-gray-100 pt-4 px-2">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest text-center">Design by</p>
            <p className="text-xs font-bold text-gray-600 text-center mt-1">Deepjyoti Roy</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-[#E5E5E5] bg-white/80 p-4 md:p-6 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1E40AF] text-white">
              <IndianRupee className="h-5 w-5" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">DS Store</h1>
          </div>
          <h2 className="text-xl md:text-2xl font-semibold capitalize hidden lg:block">{activeTab}</h2>
          
          <div className="flex items-center gap-3 md:gap-4">
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Cash Balance</span>
                <span className="text-sm md:text-lg font-bold text-[#16A34A]">{formatCurrency(stats.cashBalance)}</span>
             </div>
             <button 
               onClick={() => setShowApiSettings(true)}
               className="lg:hidden p-2 rounded-lg bg-gray-50 text-gray-500 hover:text-[#1E40AF]"
             >
               <Settings size={20} />
             </button>
             <div className="h-8 w-8 md:h-10 md:h-10 rounded-full bg-[#E5E5E5] flex items-center justify-center overflow-hidden border-2 border-white shadow-sm shrink-0">
                <Users size={16} className="text-gray-500" />
             </div>
          </div>
        </header>

        {/* Dynamic Content Scroll Area */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-8">
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5E5E5] px-2 py-3 flex justify-around items-center shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
          <MobileNavItem icon={<LayoutDashboard size={20} />} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <MobileNavItem icon={<Wallet size={20} />} active={activeTab === 'accounts'} onClick={() => setActiveTab('accounts')} />
          <MobileNavItem icon={<ArrowLeftRight size={20} />} active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
          <MobileNavItem icon={<Package size={20} />} active={activeTab === 'products'} onClick={() => setActiveTab('products')} />
          <MobileNavItem icon={<RefreshCw size={20} className={cn(loading && "animate-spin")} />} active={false} onClick={syncData} />
        </nav>
      </div>

      {/* API Settings Modal */}
      {showApiSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Settings size={20} />
              </div>
              <h3 className="text-lg font-bold">Cloud Settings</h3>
            </div>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">Paste your Google Apps Script Web App URL below to enable cloud synchronization for all your devices.</p>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">API Endpoint URL</label>
              <input 
                type="text" 
                value={apiUrl} 
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full rounded-xl border-gray-200 p-3 text-sm focus:ring-[#1E40AF] bg-gray-50 focus:bg-white transition-all"
                placeholder="https://script.google.com/..."
              />
            </div>
            <div className="mt-8 flex flex-col gap-2">
              <button 
                onClick={() => {
                  localStorage.setItem("cloud_api_url", apiUrl);
                  syncData();
                  setShowApiSettings(false);
                }}
                className="w-full rounded-xl bg-[#1E40AF] p-4 text-sm font-bold text-white shadow-lg shadow-[#1E40AF]/20 active:scale-95 transition-all"
              >
                Apply & Save
              </button>
              <button 
                onClick={() => setShowApiSettings(false)}
                className="w-full rounded-xl p-3 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
            <div className="mt-8 pt-4 border-t border-gray-100 italic text-center">
               <p className="text-[10px] text-gray-400">Cloud Ledger DS Store • v1.0</p>
               <p className="text-[10px] text-[#1E40AF] font-bold mt-1">Design by Deepjyoti Roy</p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
        active 
          ? "bg-[#1E40AF] text-white shadow-lg shadow-[#1E40AF]/20" 
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function MobileNavItem({ icon, active, onClick, className }: { icon: React.ReactNode, active: boolean, onClick: () => void, className?: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-3 rounded-xl transition-all duration-200",
        active 
          ? "bg-[#1E40AF] text-white shadow-md shadow-[#1E40AF]/20 scale-110" 
          : "text-gray-400 hover:text-gray-900",
        className
      )}
    >
      {icon}
    </button>
  );
}

// --- VIEWS ---

function Dashboard({ stats, data }: { stats: any, data: AppData }) {
  const [viewState, setViewState] = useState<{ type: 'overview' | 'category' | 'product', id: string }>({ type: 'overview', id: '' });

  const categories = useMemo(() => {
    const cats = new Set(data.products.map(p => p.cat));
    return Array.from(cats);
  }, [data.products]);

  const filteredInCategories = useMemo(() => {
    if (viewState.type !== 'category') return [];
    return stats.productStocks.filter((p: any) => p.cat === viewState.id);
  }, [viewState, stats.productStocks]);

  const productHistory = useMemo(() => {
    if (viewState.type !== 'product') return [];
    return data.transactions.filter(t => t.pid === viewState.id).reverse();
  }, [viewState, data.transactions]);

  const selectedProduct = useMemo(() => {
    if (viewState.type !== 'product') return null;
    return stats.productStocks.find((p: any) => p.id === viewState.id);
  }, [viewState, stats.productStocks]);

  const chartData = useMemo(() => {
    const result = [];
    for(let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayEndBalance = data.cashTransactions
        .filter(t => t.date.split('T')[0] <= dateStr)
        .reduce((acc, t) => t.type === 'INCOME' ? acc + t.amount : acc - t.amount, 0);
      result.push({
        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
        balance: dayEndBalance
      });
    }
    return result;
  }, [data.cashTransactions]);

  const stockChartData = useMemo(() => {
    return stats.productStocks.slice(0, 6).map((p: any) => ({
      name: p.name.substring(0, 10),
      stock: p.stock
    }));
  }, [stats.productStocks]);

  return (
    <div className="grid gap-4 md:gap-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
        <Card className="bg-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Master Balance</span>
            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-[#EFF6FF] text-[#1D4ED8]">
              <Wallet size={20} />
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight">{formatCurrency(stats.cashBalance)}</h3>
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
             <TrendingUp size={14} className="text-[#16A34A]" /> Liquidity Available
          </div>
        </Card>

        {/* Drill-down Inventory Card */}
        <Card className="bg-white group cursor-pointer" onClick={() => setViewState({ type: 'overview', id: '' })}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inventory Status</span>
            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-[#FFFBEB] text-[#D97706]">
              <Package size={20} />
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight">{stats.productStocks.length}</h3>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-[#D97706]">
             Click to Reset Drill-down
          </div>
        </Card>

        <Card className="bg-white hidden md:block border-none bg-gradient-to-br from-[#1E40AF] to-[#1D4ED8] text-white">
           <div className="flex flex-col h-full justify-between">
              <div>
                 <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Business Health</p>
                 <p className="text-sm mt-1">Status: Operational</p>
              </div>
              <div className="flex items-end justify-between">
                 <div className="text-2xl font-bold">100%</div>
                 <div className="text-[10px] opacity-40">AUTO-SYNC ACTIVE</div>
              </div>
           </div>
        </Card>
      </div>

      {/* Drill-down Display Area */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
         <div className="lg:col-span-2">
            <Card title={viewState.type === 'overview' ? "Select Category" : viewState.type === 'category' ? `Products in ${viewState.id}` : `History: ${selectedProduct?.name}`}>
               <div className="min-h-[300px]">
                  <AnimatePresence mode="wait">
                     {viewState.type === 'overview' && (
                        <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           {categories.map(cat => (
                              <button 
                                key={cat} 
                                onClick={() => setViewState({ type: 'category', id: cat })}
                                className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md transition-all group"
                              >
                                 <span className="font-bold text-gray-700">{cat}</span>
                                 <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-600 transform group-hover:translate-x-1 transition-all" />
                              </button>
                           ))}
                        </motion.div>
                     )}
                     {viewState.type === 'category' && (
                        <motion.div key="category" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                           <button onClick={() => setViewState({ type: 'overview', id: '' })} className="text-xs font-bold text-blue-600 mb-4 block underline">← Back to Categories</button>
                           {filteredInCategories.map((p: any) => (
                              <button 
                                key={p.id} 
                                onClick={() => setViewState({ type: 'product', id: p.id })}
                                className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-50 bg-white hover:bg-blue-50 transition-all"
                              >
                                 <div className="text-left">
                                    <div className="font-bold text-gray-900">{p.name}</div>
                                    <div className="text-[10px] text-gray-400">ID: {p.id}</div>
                                 </div>
                                 <div className="text-right">
                                    <div className="text-lg font-mono font-bold text-blue-700">{p.stock}</div>
                                    <div className="text-[10px] text-gray-400">AVAILABLE</div>
                                 </div>
                              </button>
                           ))}
                        </motion.div>
                     )}
                     {viewState.type === 'product' && selectedProduct && (
                        <motion.div key="product" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                           <button onClick={() => setViewState({ type: 'category', id: selectedProduct.cat })} className="text-xs font-bold text-blue-600 mb-2 block underline">← Back to Products</button>
                           <div className="relative overflow-x-auto rounded-xl border border-gray-100">
                              <table className="w-full text-sm">
                                 <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400">
                                    <tr>
                                       <th className="px-4 py-3 text-left">Date</th>
                                       <th className="px-4 py-3 text-center">Type</th>
                                       <th className="px-4 py-3 text-right">Qty</th>
                                       <th className="px-4 py-3 text-left">Person</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-50">
                                    {productHistory.map((t, i) => (
                                       <tr key={i} className="hover:bg-gray-50">
                                          <td className="px-4 py-3 text-[11px] font-medium">{t.date}</td>
                                          <td className="px-4 py-3 text-center">
                                             <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold", t.type === 'IN' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600')}>
                                                {t.type}
                                             </span>
                                          </td>
                                          <td className={cn("px-4 py-3 text-right font-mono font-bold", t.type === 'IN' ? 'text-green-600' : 'text-red-600')}>
                                             {t.type === 'IN' ? '+' : '-'}{t.qty}
                                          </td>
                                          <td className="px-4 py-3 text-gray-500 italic">{t.person}</td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        </motion.div>
                     )}
                  </AnimatePresence>
               </div>
            </Card>
         </div>
         <div className="space-y-6">
            <Card title="Revenue Trends">
               <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={chartData}>
                        <Line type="monotone" dataKey="balance" stroke="#1E40AF" strokeWidth={3} dot={false} />
                     </LineChart>
                  </ResponsiveContainer>
               </div>
            </Card>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                     <Settings size={20} />
                  </div>
                  <div>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Store</p>
                     <p className="font-bold text-gray-900">DS Store Global</p>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function AccountsView({ 
  transactions, 
  balance, 
  onAdd, 
  onEdit, 
  onDelete 
}: { 
  transactions: CashTransaction[], 
  balance: number, 
  onAdd: (amount: number, type: "INCOME" | "EXPENSE", note: string, date: string) => void,
  onEdit: (updated: CashTransaction) => void,
  onDelete: (id: string) => void
}) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const startEdit = (t: CashTransaction) => {
    setEditingId(t.id);
    setAmount(t.amount.toString());
    setType(t.type);
    setNote(t.note);
    setDate(t.date.split('T')[0]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAmount("");
    setNote("");
  };

  return (
    <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Card title="Local Cash Ledger">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 italic text-[11px] text-gray-400 uppercase tracking-widest">
                  <th className="px-4 py-4 text-left font-normal">Date</th>
                  <th className="px-4 py-4 text-left font-normal">Details</th>
                  <th className="px-4 py-4 text-right font-normal">Amount</th>
                  <th className="px-4 py-4 text-right font-normal">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...transactions].reverse().map((t) => (
                  <tr key={t.id} className="group hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium">{new Date(t.date).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-semibold">{t.note}</div>
                      <div className={cn("text-[9px] font-bold uppercase", t.type === 'INCOME' ? 'text-[#16A34A]' : 'text-red-500')}>
                        {t.type}
                      </div>
                    </td>
                    <td className={cn("px-4 py-4 text-right font-mono font-bold text-sm", t.type === 'INCOME' ? 'text-[#16A34A]' : 'text-red-500')}>
                      {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                    <td className="px-4 py-4 text-right">
                       <div className="flex items-center justify-end gap-2">
                          <button onClick={() => startEdit(t)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                             <Settings size={14} />
                          </button>
                          <button onClick={() => onDelete(t.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                             <TrendingDown size={14} />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card title={editingId ? "Edit Transaction" : "Quick Entry"}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
              <button 
                onClick={() => setType("INCOME")}
                className={cn("flex items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-all", type === 'INCOME' ? 'bg-white text-[#16A34A] shadow-sm' : 'text-gray-500')}
              >
                Income
              </button>
              <button 
                onClick={() => setType("EXPENSE")}
                className={cn("flex items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-all", type === 'EXPENSE' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500')}
              >
                Expense
              </button>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Date</label>
              <input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Amount (₹)</label>
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm focus:bg-white" 
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Note</label>
              <input 
                type="text" 
                value={note} 
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm focus:bg-white" 
                placeholder="Description"
              />
            </div>

            <div className="flex gap-2">
               {editingId && (
                 <button onClick={cancelEdit} className="flex-1 rounded-xl bg-gray-200 p-3 text-sm font-bold">Cancel</button>
               )}
               <button 
                onClick={() => {
                  const val = parseFloat(amount);
                  if (val > 0 && note) {
                    if (editingId) {
                      onEdit({ id: editingId, amount: val, type, note, date: new Date(date).toISOString() });
                      setEditingId(null);
                    } else {
                      onAdd(val, type, note, new Date(date).toISOString());
                    }
                    setAmount("");
                    setNote("");
                  }
                }}
                className={cn(
                  "flex-[2] rounded-xl p-3 text-sm font-bold text-white shadow-lg",
                  type === 'INCOME' ? 'bg-[#16A34A]' : 'bg-red-500'
                )}
               >
                 {editingId ? "Update Item" : "Save Entry"}
               </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function InventoryView({ 
  products, 
  transactions, 
  onAdd, 
  onEdit, 
  onDelete 
}: { 
  products: any[], 
  transactions: InventoryTransaction[], 
  onAdd: (pid: string, type: "IN" | "OUT", qty: number, person: string, date: string) => void,
  onEdit: (updated: InventoryTransaction) => void,
  onDelete: (id: string) => void
}) {
  const [pid, setPid] = useState("");
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [qty, setQty] = useState("");
  const [person, setPerson] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const startEdit = (t: InventoryTransaction) => {
    setEditingId(t.id);
    setPid(t.pid);
    setType(t.type);
    setQty(t.qty.toString());
    setPerson(t.person);
    // Try to normalize date from "toLocaleString" format or ISO
    setDate(new Date(t.date).toISOString().split('T')[0]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setQty("");
    setPerson("");
  };

  return (
    <div className="grid gap-8 grid-cols-1 lg:grid-cols-4">
      <div className="lg:col-span-3 space-y-6">
        <Card title="Cloud Movement Journal">
           <div className="space-y-3">
              {[...transactions].reverse().map((t) => {
                const prod = products.find(p => p.id === t.pid);
                return (
                  <div key={t.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-transparent hover:border-gray-200 transition-all">
                     <div className="flex items-center gap-4 flex-1">
                        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold", t.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                           {t.type}
                        </div>
                        <div>
                           <div className="text-sm font-bold text-gray-900 leading-none">{prod?.name || 'Item Not Found'}</div>
                           <div className="text-[10px] text-gray-400 mt-1 uppercase">{t.date}</div>
                        </div>
                     </div>
                     <div className="flex items-center gap-6">
                        <div className={cn("text-lg font-mono font-bold", t.type === 'IN' ? 'text-green-600' : 'text-red-600')}>
                           {t.type === 'IN' ? '+' : '-'}{t.qty}
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => startEdit(t)} className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                              <Settings size={14}/>
                           </button>
                           <button onClick={() => onDelete(t.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                              <TrendingDown size={14}/>
                           </button>
                        </div>
                     </div>
                  </div>
                );
              })}
           </div>
        </Card>
      </div>

      <div>
        <Card title={editingId ? "Edit Entry" : "New Entry"}>
           <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                 <button onClick={() => setType("IN")} className={cn("py-2 rounded-md text-xs font-bold", type==='IN'?'bg-white text-green-600 shadow-sm':'text-gray-400')}>STOCK IN</button>
                 <button onClick={() => setType("OUT")} className={cn("py-2 rounded-md text-xs font-bold", type==='OUT'?'bg-white text-red-600 shadow-sm':'text-gray-400')}>STOCK OUT</button>
              </div>
              <div>
                 <label className="text-[9px] font-bold text-gray-400 mb-1 block">DATE</label>
                 <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full text-sm border-gray-200 rounded-lg bg-gray-50 focus:bg-white p-2" />
              </div>
              <div>
                 <label className="text-[9px] font-bold text-gray-400 mb-1 block">PRODUCT</label>
                 <select value={pid} onChange={e=>setPid(e.target.value)} className="w-full text-sm border-gray-200 rounded-lg bg-gray-50 p-2">
                    <option value="">Select Item...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                 </select>
              </div>
              <div>
                 <label className="text-[9px] font-bold text-gray-400 mb-1 block">QUANTITY</label>
                 <input type="number" value={qty} onChange={e=>setQty(e.target.value)} className="w-full text-sm border-gray-200 rounded-lg p-2" placeholder="0" />
              </div>
              <div>
                 <label className="text-[9px] font-bold text-gray-400 mb-1 block">PERSON</label>
                 <input type="text" value={person} onChange={e=>setPerson(e.target.value)} className="w-full text-sm border-gray-200 rounded-lg p-2" placeholder="Name" />
              </div>
              <div className="flex gap-2">
                 {editingId && <button onClick={cancelEdit} className="flex-1 bg-gray-100 p-3 rounded-lg text-xs font-bold">CANCEL</button>}
                 <button 
                  onClick={() => {
                    const q = parseInt(qty);
                    if (pid && q > 0 && person) {
                      const finalDate = new Date(date).toLocaleString();
                      if (editingId) {
                        onEdit({ id: editingId, pid, type, qty: q, person, date: finalDate });
                        setEditingId(null);
                      } else {
                        onAdd(pid, type, q, person, finalDate);
                      }
                      setQty("");
                      setPerson("");
                    }
                  }}
                  className="flex-[2] bg-blue-600 text-white p-3 rounded-lg text-xs font-bold"
                 >
                    {editingId ? "SAVE CHANGES" : "RECORD MOVE"}
                 </button>
              </div>
           </div>
        </Card>
      </div>
    </div>
  );
}

function ProductSetup({ products, onAdd }: { products: Product[], onAdd: (name: string, cat: string) => void }) {
  const [name, setName] = useState("");
  const [cat, setCat] = useState("General Hardware");

  return (
    <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
       <Card title="Add New Definition" className="h-fit">
          <div className="space-y-4">
             <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Reference Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-all focus:ring-[#1E40AF]" 
                  placeholder="e.g. Rungta 12mm Rod"
                />
             </div>
             <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Category</label>
                <select 
                  value={cat}
                  onChange={(e) => setCat(e.target.value)}
                  className="w-full rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-all focus:ring-[#1E40AF]"
                >
                  <option value="Rungta TMT Bar">Rungta TMT Bar</option>
                  <option value="Sika CIM">Sika CIM</option>
                  <option value="General Hardware">General Hardware</option>
                  <option value="Cement">Cement</option>
                  <option value="Sanitary">Sanitary</option>
                </select>
             </div>
             <button 
              onClick={() => {
                if (name && cat) {
                  onAdd(name, cat);
                  setName("");
                }
              }}
              className="w-full rounded-xl bg-[#1E40AF] p-4 text-sm font-bold text-white shadow-lg shadow-[#1E40AF]/20 hover:bg-[#1D4ED8] transition-all flex items-center justify-center gap-2"
            >
              <PackagePlus size={18} /> Register Product
            </button>
          </div>
       </Card>

       <div className="lg:col-span-2">
          <Card title="Registered Master List">
             <div className="grid gap-4 sm:grid-cols-2">
                {products.map(p => (
                  <div key={p.id} className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                     <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{p.cat}</div>
                     <div className="text-lg font-bold text-gray-900 flex justify-between items-center">
                        {p.name}
                        <ChevronRight size={18} className="text-gray-300 group-hover:text-[#1E40AF] transform group-hover:translate-x-1 transition-all" />
                     </div>
                     <div className="mt-3 text-[10px] text-gray-300 font-mono">ID: {p.id}</div>
                  </div>
                ))}
             </div>
             {products.length === 0 && (
               <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-100 rounded-3xl">
                  <Package size={48} className="mx-auto mb-4 opacity-10" />
                  <p className="font-medium">No products defined yet.</p>
                  <p className="text-xs">Add your first item using the form on the left.</p>
               </div>
             )}
          </Card>
       </div>
    </div>
  );
}

function Card({ children, title, className, onClick }: { children: React.ReactNode, title?: string, className?: string, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={cn("p-6 rounded-3xl bg-white border border-gray-100 shadow-sm transition-all hover:shadow-md", className)}
    >
      {title && <h4 className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-6 italic">{title}</h4>}
      {children}
    </div>
  );
}
