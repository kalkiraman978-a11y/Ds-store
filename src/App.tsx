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

  // Local State
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem("inventory_app_data");
    return saved ? JSON.parse(saved) : { 
      products: [], 
      transactions: [], 
      cashTransactions: [] 
    };
  });

  // Sync with Cloud
  const syncData = async () => {
    if (!apiUrl) return;
    setLoading(true);
    try {
      const response = await fetch(apiUrl);
      const cloudData = await response.json();
      const newData = {
        products: cloudData.products || [],
        transactions: cloudData.transactions || [],
        cashTransactions: cloudData.cashTransactions || data.cashTransactions // Keep local cash if not in cloud
      };
      setData(newData);
      localStorage.setItem("inventory_app_data", JSON.stringify(newData));
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
    if (!apiUrl) return;
    setLoading(true);
    try {
      await fetch(apiUrl, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(payload)
      });
      // Refresh after a delay since no-cors doesn't give us status
      setTimeout(syncData, 1500);
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
    const newData = { ...data, products: [...data.products, newProd] };
    setData(newData);
    sendToCloud({ action: "ADD_PRODUCT", ...newProd });
  };

  const handleAddInventory = (pid: string, type: "IN" | "OUT", qty: number, person: string) => {
    const newTrans = { pid, type, qty, person, date: new Date().toLocaleString() };
    const newData = { ...data, transactions: [...data.transactions, newTrans] };
    setData(newData);
    sendToCloud({ action: "ADD_TRANS", ...newTrans });
  };

  const handleAddCash = (amount: number, type: "INCOME" | "EXPENSE", note: string) => {
    const newTrans = { id: Date.now().toString(), amount, type, note, date: new Date().toISOString() };
    const newData = { ...data, cashTransactions: [...data.cashTransactions, newTrans] };
    setData(newData);
    // Cloud support for cash can be added to the script too
    sendToCloud({ action: "ADD_CASH", ...newTrans });
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <Dashboard stats={stats} data={data} />;
      case "accounts": return <AccountsView transactions={data.cashTransactions} balance={stats.cashBalance} onAdd={handleAddCash} />;
      case "inventory": return <InventoryView products={stats.productStocks} transactions={data.transactions} onAdd={handleAddInventory} />;
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
  const chartData = useMemo(() => {
    // Last 7 days balance history helper
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
      name: p.name,
      stock: p.stock
    }));
  }, [stats.productStocks]);

  return (
    <div className="grid gap-6">
      {/* Stats Cards */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        <Card className="bg-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500 uppercase tracking-widest">Master Balance</span>
            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-[#EFF6FF] text-[#1D4ED8]">
              <Wallet size={20} />
            </div>
          </div>
          <h3 className="text-3xl font-bold tracking-tight">{formatCurrency(stats.cashBalance)}</h3>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="flex items-center text-[#16A34A] font-medium bg-[#F0FDF4] px-2 py-1 rounded-full text-[10px]">
              <TrendingUp size={12} className="mr-1" /> ACTIVE
            </span>
            <span className="text-gray-400">Current liquidity</span>
          </div>
        </Card>

        <Card className="bg-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500 uppercase tracking-widest">Inventory Health</span>
            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-[#FFFBEB] text-[#D97706]">
              <Package size={20} />
            </div>
          </div>
          <h3 className="text-3xl font-bold tracking-tight">{stats.productStocks.length}</h3>
          <div className="mt-4 flex items-center gap-2 text-sm">
             <span className="text-gray-700 font-medium">SKUs tracked</span>
          </div>
        </Card>

        <Card className="bg-white overflow-hidden relative">
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-sm font-medium text-gray-500 uppercase tracking-widest">Recent Activity</span>
            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-[#F5F5F5] text-gray-500">
              <History size={20} />
            </div>
          </div>
          <div className="space-y-3 relative z-10">
            {stats.recentActivity.slice(0, 3).map((t: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 truncate mr-2">{data.products.find(p => p.id === t.pid)?.name || 'Unknown'}</span>
                <span className={cn("font-bold", t.type === 'IN' ? 'text-[#16A34A]' : 'text-red-500')}>
                  {t.type === 'IN' ? '+' : '-'}{t.qty}
                </span>
              </div>
            ))}
          </div>
          <div className="absolute -bottom-4 -right-4 opacity-5">
             <ArrowLeftRight size={120} />
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card title="Cash Flow Overview">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), 'Balance']}
                />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#1E40AF" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#1E40AF', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Primary Stock Levels">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#9CA3AF'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="stock" radius={[4, 4, 0, 0]}>
                  {stockChartData.map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={['#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function AccountsView({ transactions, balance, onAdd }: { transactions: CashTransaction[], balance: number, onAdd: (amount: number, type: "INCOME" | "EXPENSE", note: string) => void }) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [note, setNote] = useState("");

  return (
    <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Card title="Cash Ledger">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 italic text-[11px] text-gray-400 uppercase tracking-widest">
                  <th className="px-4 py-4 text-left font-normal">Date</th>
                  <th className="px-4 py-4 text-left font-normal">Details</th>
                  <th className="px-4 py-4 text-right font-normal">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...transactions].reverse().map((t) => (
                  <tr key={t.id} className="group hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium">{new Date(t.date).toLocaleDateString()}</div>
                      <div className="text-[10px] text-gray-400">{new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-semibold">{t.note}</div>
                      <div className={cn("text-[10px] font-bold uppercase", t.type === 'INCOME' ? 'text-[#16A34A]' : 'text-red-500')}>
                        {t.type}
                      </div>
                    </td>
                    <td className={cn("px-4 py-4 text-right font-mono font-bold text-sm", t.type === 'INCOME' ? 'text-[#16A34A]' : 'text-red-500')}>
                      {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card title="Quick Transaction">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
              <button 
                onClick={() => setType("INCOME")}
                className={cn("flex items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-all", type === 'INCOME' ? 'bg-white text-[#16A34A] shadow-sm' : 'text-gray-500')}
              >
                <TrendingUp size={16} /> Income
              </button>
              <button 
                onClick={() => setType("EXPENSE")}
                className={cn("flex items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-all", type === 'EXPENSE' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500')}
              >
                <TrendingDown size={16} /> Expense
              </button>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Amount (₹)</label>
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-all focus:ring-[#1E40AF]" 
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Note / Description</label>
              <input 
                type="text" 
                value={note} 
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-all focus:ring-[#1E40AF]" 
                placeholder="What is this for?"
              />
            </div>

            <button 
              onClick={() => {
                const val = parseFloat(amount);
                if (val > 0 && note) {
                  onAdd(val, type, note);
                  setAmount("");
                  setNote("");
                }
              }}
              className={cn(
                "w-full rounded-xl p-4 text-sm font-bold text-white shadow-lg transition-all active:scale-95",
                type === 'INCOME' ? 'bg-[#16A34A] shadow-[#16A34A]/20 hover:bg-[#15803D]' : 'bg-red-500 shadow-red-500/20 hover:bg-red-600'
              )}
            >
              Confirm Transaction
            </button>
          </div>
        </Card>

        <Card className="bg-[#1E40AF] text-white border-none shadow-xl shadow-[#1E40AF]/20">
           <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Total Liquidity</span>
           <h4 className="text-3xl font-bold mt-1">{formatCurrency(balance)}</h4>
           <p className="text-[10px] mt-4 opacity-50 italic">Calculated from all INCOME and EXPENSE entries recorded.</p>
        </Card>
      </div>
    </div>
  );
}

function InventoryView({ products, transactions, onAdd }: { products: any[], transactions: InventoryTransaction[], onAdd: (pid: string, type: "IN" | "OUT", qty: number, person: string) => void }) {
  const [pid, setPid] = useState(products[0]?.id || "");
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [qty, setQty] = useState("");
  const [person, setPerson] = useState("");
  const [search, setSearch] = useState("");

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.cat.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="grid gap-8 grid-cols-1 lg:grid-cols-4">
      {/* Search & List */}
      <div className="lg:col-span-3 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
           <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1E40AF] transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Filter stock by name or category..." 
                className="w-full rounded-2xl border-gray-100 bg-white pl-12 pr-4 py-4 text-sm shadow-sm focus:ring-[#1E40AF] transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>
        </div>

        <Card title="Current Stock Levels">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 italic text-[11px] text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4 text-left font-normal">Product Spec</th>
                  <th className="px-6 py-4 text-center font-normal">Status</th>
                  <th className="px-6 py-4 text-right font-normal">Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="group hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setPid(p.id)}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                         <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 group-hover:bg-[#EFF6FF] group-hover:text-[#1E40AF] transition-colors">
                            <Package size={20} />
                         </div>
                         <div>
                            <div className="font-bold text-gray-900">{p.name}</div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-wider">{p.cat}</div>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                       {p.stock > 10 ? (
                         <span className="inline-flex items-center rounded-full bg-[#F0FDF4] px-2.5 py-0.5 text-xs font-semibold text-[#16A34A]">In Stock</span>
                       ) : p.stock > 0 ? (
                         <span className="inline-flex items-center rounded-full bg-[#FFFBEB] px-2.5 py-0.5 text-xs font-semibold text-[#D97706]">Low Stock</span>
                       ) : (
                         <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-500">Out of Stock</span>
                       )}
                    </td>
                    <td className="px-6 py-5 text-right">
                       <span className="text-xl font-mono font-bold">{p.stock}</span>
                       <span className="text-[10px] text-gray-400 ml-1">units</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Activity Timeline">
           <div className="space-y-4">
              {[...transactions].reverse().slice(0, 10).map((t, i) => {
                const prod = products.find(p => p.id === t.pid);
                return (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all">
                     <div className="flex items-center gap-4">
                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", t.type === 'IN' ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-red-50 text-red-500')}>
                           {t.type === 'IN' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                        </div>
                        <div>
                           <div className="text-sm font-bold text-gray-900">{prod?.name || 'Unknown'} <span className="font-normal text-gray-400">by {t.person}</span></div>
                           <div className="text-[10px] text-gray-400">{t.date}</div>
                        </div>
                     </div>
                     <div className={cn("text-lg font-mono font-bold", t.type === 'IN' ? 'text-[#16A34A]' : 'text-red-500')}>
                        {t.type === 'IN' ? '+' : '-'}{t.qty}
                     </div>
                  </div>
                );
              })}
           </div>
        </Card>
      </div>

      {/* Movement Form */}
      <div className="space-y-6">
        <Card title="Movement Entry">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Direction</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                <button 
                  onClick={() => setType("IN")}
                  className={cn("flex items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-all", type === 'IN' ? 'bg-white text-[#16A34A] shadow-sm' : 'text-gray-500')}
                >
                  Inward (+)
                </button>
                <button 
                  onClick={() => setType("OUT")}
                  className={cn("flex items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-all", type === 'OUT' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500')}
                >
                  Outward (-)
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Select Product</label>
              <select 
                value={pid}
                onChange={(e) => setPid(e.target.value)}
                className="w-full rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-all focus:ring-[#1E40AF]"
              >
                <option value="" disabled>Choose an item...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Quantity</label>
              <input 
                type="number" 
                value={qty} 
                onChange={(e) => setQty(e.target.value)}
                className="w-full rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-all focus:ring-[#1E40AF]" 
                placeholder="0"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Responsible Person</label>
              <input 
                type="text" 
                value={person} 
                onChange={(e) => setPerson(e.target.value)}
                className="w-full rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-all focus:ring-[#1E40AF]" 
                placeholder="Receiver / Issuer"
              />
            </div>

            <button 
              onClick={() => {
                const q = parseInt(qty);
                if (pid && q > 0 && person) {
                  onAdd(pid, type, q, person);
                  setQty("");
                  setPerson("");
                }
              }}
              className="w-full rounded-xl bg-[#1E40AF] p-4 text-sm font-bold text-white shadow-lg shadow-[#1E40AF]/20 hover:bg-[#1D4ED8] transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <ArrowLeftRight size={18} /> Update Stock
            </button>
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

function Card({ children, title, className }: { children: React.ReactNode, title?: string, className?: string }) {
  return (
    <div className={cn("p-6 rounded-3xl bg-white border border-gray-100 shadow-sm transition-all hover:shadow-md", className)}>
      {title && <h4 className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-6 italic">{title}</h4>}
      {children}
    </div>
  );
}
