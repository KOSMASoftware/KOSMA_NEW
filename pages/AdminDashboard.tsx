
import React, { useEffect, useState, useMemo } from 'react';
import { Routes, Route, useNavigate, useSearchParams, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { liveSystemService, SystemCheckResult } from '../services/liveSystemService';
import { License, SubscriptionStatus, User, UserRole, PlanTier, Project, Invoice } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, LineChart } from 'recharts';
import { Users, CreditCard, TrendingUp, Search, X, Download, Monitor, FolderOpen, Calendar, AlertCircle, CheckCircle, Clock, UserX, Mail, ArrowRight, Briefcase, Activity, Server, Database, Shield, Lock, Zap, LayoutDashboard, LineChart as LineChartIcon, ShieldCheck, RefreshCw, AlertTriangle, ChevronUp, ChevronDown, Filter, ArrowUpDown, ExternalLink, Code, Terminal, Copy, Megaphone, Target, ArrowUpRight, CalendarPlus, History, Building, CalendarMinus, Plus, Minus, Check, Bug, Key, Globe, Info, Play, Wifi, Edit } from 'lucide-react';

const TIER_COLORS = {
  [PlanTier.FREE]: '#1F2937',
  [PlanTier.BUDGET]: '#F59E0B',
  [PlanTier.COST_CONTROL]: '#A855F7',
  [PlanTier.PRODUCTION]: '#22C55E'
};

const CYCLE_COLORS = {
  'yearly': '#0ea5e9',
  'monthly': '#64748b',
  'none': '#e2e8f0'
};

// --- SHARED ADMIN COMPONENTS ---

const AdminTabs = () => {
    const location = useLocation();
    
    return (
        <div className="flex flex-wrap justify-center border-b border-gray-200 mb-8 bg-white sticky top-0 z-10 pt-2">
            <Link 
                to="/admin" 
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    location.pathname === '/admin' 
                    ? 'border-brand-500 text-brand-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
                <LayoutDashboard className="w-4 h-4" /> Overview
            </Link>
             <Link 
                to="/admin/users" 
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    location.pathname === '/admin/users' 
                    ? 'border-brand-500 text-brand-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
                <ShieldCheck className="w-4 h-4" /> Users & Licenses
            </Link>
            <Link 
                to="/admin/marketing" 
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    location.pathname === '/admin/marketing' 
                    ? 'border-brand-500 text-brand-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
                <LineChartIcon className="w-4 h-4" /> Marketing
            </Link>
             <Link 
                to="/admin/system" 
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    location.pathname === '/admin/system' 
                    ? 'border-brand-500 text-brand-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
                <Server className="w-4 h-4" /> System
            </Link>
            <Link 
                to="/admin/debug" 
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    location.pathname === '/admin/debug' 
                    ? 'border-brand-500 text-brand-600 bg-brand-50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
                <Bug className="w-4 h-4" /> Debug Stripe
            </Link>
        </div>
    );
};

// --- DATA FETCHING HELPER ---
const useAdminData = () => {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<User[]>([]);
    const [licenses, setLicenses] = useState<License[]>([]);
    const [stats, setStats] = useState({ totalUsers: 0, activeLicenses: 0, inactiveLicenses: 0, revenue: 0 });
    const [refreshIndex, setRefreshIndex] = useState(0);

    const refreshData = () => setRefreshIndex(prev => prev + 1);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                // RLS: Admin can see all profiles and licenses
                const { data: profiles } = await supabase.from('profiles').select('*');
                const { data: licData } = await supabase.from('licenses').select('*');
                const { data: invData } = await supabase.from('invoices').select('amount, status');

                let realUsers: User[] = [];
                let realLicenses: License[] = [];
                let realRevenue = 0;

                if (profiles) {
                    realUsers = profiles.map((p: any) => ({
                        id: p.id, email: p.email || 'N/A', name: p.full_name || 'User', role: p.role === 'admin' ? UserRole.ADMIN : UserRole.CUSTOMER,
                        registeredAt: p.created_at || new Date().toISOString(), stripeCustomerId: p.stripe_customer_id, billingAddress: p.billing_address
                    }));
                }
                if (licData) {
                    realLicenses = licData.map((l: any) => ({
                        id: l.id, userId: l.user_id, productName: l.product_name, planTier: l.plan_tier as PlanTier, billingCycle: l.billing_cycle || 'none',
                        status: l.status as SubscriptionStatus, validUntil: l.admin_valid_until_override || l.current_period_end || l.valid_until,
                        licenseKey: l.license_key, billingProjectName: l.billing_project_name, stripeSubscriptionId: l.stripe_subscription_id,
                        stripeCustomerId: l.stripe_customer_id, cancelAtPeriodEnd: l.cancel_at_period_end, adminValidUntilOverride: l.admin_valid_until_override, adminOverrideReason: l.admin_override_reason
                    }));
                }
                if (invData) {
                     realRevenue = invData.filter((i: any) => i.status === 'paid').reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);
                }

                setUsers(realUsers);
                setLicenses(realLicenses);
                setStats({ totalUsers: realUsers.length, activeLicenses: realLicenses.filter(l => l.status === SubscriptionStatus.ACTIVE).length, inactiveLicenses: realLicenses.filter(l => l.status !== SubscriptionStatus.ACTIVE).length, revenue: realRevenue });
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchAll();
    }, [refreshIndex]);
    return { loading, users, licenses, stats, refreshData };
};

// --- VIEW 1: OVERVIEW ---
const DashboardOverview: React.FC = () => {
    const { loading, stats, users } = useAdminData();

    // Mock growth data based on total users
    const data = [
      { name: 'Jan', users: Math.floor(stats.totalUsers * 0.2) },
      { name: 'Feb', users: Math.floor(stats.totalUsers * 0.35) },
      { name: 'Mar', users: Math.floor(stats.totalUsers * 0.45) },
      { name: 'Apr', users: Math.floor(stats.totalUsers * 0.6) },
      { name: 'May', users: Math.floor(stats.totalUsers * 0.75) },
      { name: 'Jun', users: Math.floor(stats.totalUsers * 0.9) },
      { name: 'Jul', users: stats.totalUsers },
    ];

    if (loading) return <div className="p-8 text-center"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400"/></div>;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <AdminTabs />
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Users</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.totalUsers}</h3>
                        </div>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Licenses</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.activeLicenses}</h3>
                        </div>
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Revenue (Est.)</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.revenue.toFixed(2)} €</h3>
                        </div>
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                            <CreditCard className="w-5 h-5" />
                        </div>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Churn / Inactive</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.inactiveLicenses}</h3>
                        </div>
                        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
                <h3 className="font-bold text-gray-900 mb-6">User Growth (Mock)</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0093D0" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#0093D0" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Area type="monotone" dataKey="users" stroke="#0093D0" fillOpacity={1} fill="url(#colorUsers)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

// --- VIEW 2: USERS MANAGEMENT ---

const EditLicenseModal: React.FC<{ user: User, license: License | undefined, onClose: () => void, onUpdate: () => void }> = ({ user, license, onClose, onUpdate }) => {
    const [tier, setTier] = useState<PlanTier>(license?.planTier || PlanTier.FREE);
    const [status, setStatus] = useState<SubscriptionStatus>(license?.status || SubscriptionStatus.NONE);
    
    // Logic for Override
    const initialOverride = license?.adminValidUntilOverride 
        ? new Date(license.adminValidUntilOverride).toISOString().split('T')[0] 
        : '';
    const [overrideDate, setOverrideDate] = useState(initialOverride);
    
    const [updating, setUpdating] = useState(false);
    
    // Day calculation
    const currentValidUntil = useMemo(() => {
        if (overrideDate) return new Date(overrideDate);
        if (license?.validUntil) return new Date(license.validUntil);
        return new Date();
    }, [overrideDate, license]);

    const hasStripeSub = license?.stripeSubscriptionId?.startsWith('sub_');

    const handleAddDays = (days: number) => {
        const newDate = new Date(currentValidUntil);
        newDate.setDate(newDate.getDate() + days);
        setOverrideDate(newDate.toISOString().split('T')[0]);
    };

    const handleSave = async () => {
        setUpdating(true);
        try {
            // CALL ADMIN EDGE FUNCTION
            const { data: { session } } = await supabase.auth.getSession();
            const { data, error } = await supabase.functions.invoke('admin-action', {
                body: { 
                    action: 'update_license', 
                    userId: user.id,
                    payload: {
                        plan_tier: tier,
                        status: status,
                        admin_override_date: overrideDate || null
                    }
                },
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });

            if (error || !data.success) throw new Error(data?.error || error?.message);
            
            if (data.message) {
                alert(data.message); // Feedback from backend (e.g. "Stripe cycle shifted")
            }
            
            onUpdate();
            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to update license. Check console.");
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Edit License</h3>
                        <p className="text-sm text-gray-500">{user.name} ({user.email})</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Plan Tier</label>
                        <select value={tier} onChange={e => setTier(e.target.value as PlanTier)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none">
                            {Object.values(PlanTier).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value as SubscriptionStatus)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none">
                            {Object.values(SubscriptionStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-4 mb-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Extend / Reduce Access</label>
                    <div className="flex items-center gap-2 mb-4">
                         <div className="relative flex-1">
                             <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                             <input 
                                type="date" 
                                value={overrideDate} 
                                onChange={e => setOverrideDate(e.target.value)} 
                                className="w-full pl-9 pr-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                             />
                         </div>
                         <button onClick={() => setOverrideDate('')} className="text-xs text-gray-400 hover:text-gray-600 underline px-2">
                             Reset to Stripe
                         </button>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => handleAddDays(7)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold text-gray-700">+ 7 Days</button>
                        <button onClick={() => handleAddDays(30)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold text-gray-700">+ 30 Days</button>
                        <button onClick={() => handleAddDays(365)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold text-gray-700">+ 1 Year</button>
                        <div className="w-px bg-gray-300 mx-1"></div>
                        <button onClick={() => handleAddDays(-7)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded text-xs font-bold text-red-600">- 7 Days</button>
                    </div>
                    
                    {overrideDate && (
                         <div className={`mt-3 border p-3 rounded-lg text-sm flex items-start gap-2 ${
                             hasStripeSub ? 'bg-blue-50 border-blue-100 text-blue-800' : 'bg-orange-50 border-orange-100 text-orange-800'
                         }`}>
                             {hasStripeSub ? <RefreshCw className="w-4 h-4 shrink-0 mt-0.5 animate-spin-slow" /> : <Info className="w-4 h-4 shrink-0 mt-0.5" />}
                             <span>
                                 {hasStripeSub 
                                     ? `This will also shift the Stripe billing cycle to ${new Date(overrideDate).toLocaleDateString()}.` 
                                     : `Only database updated. No Stripe subscription found to sync.`}
                             </span>
                         </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-bold">Cancel</button>
                    <button onClick={handleSave} disabled={updating} className="px-4 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600 flex items-center gap-2 font-bold shadow-sm">
                        {updating && <RefreshCw className="w-3 h-3 animate-spin"/>} Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

const UsersManagement: React.FC = () => {
    const { loading, users, licenses, refreshData } = useAdminData();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | SubscriptionStatus>('ALL');
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const filteredUsers = users.filter(u => {
        const license = licenses.find(l => l.userId === u.id);
        
        // Text Search (Name, Email, Company)
        const lowerTerm = searchTerm.toLowerCase();
        const matchesText = 
            u.email.toLowerCase().includes(lowerTerm) || 
            u.name.toLowerCase().includes(lowerTerm) || 
            (u.billingAddress?.companyName || '').toLowerCase().includes(lowerTerm);

        // Status Filter
        const matchesStatus = statusFilter === 'ALL' 
            ? true 
            : license?.status === statusFilter || (!license && statusFilter === SubscriptionStatus.NONE);

        return matchesText && matchesStatus;
    });

    const getLicenseForUser = (userId: string) => licenses.find(l => l.userId === userId);

    const getDaysRemaining = (dateStr: string | null | undefined) => {
        if (!dateStr) return null;
        const now = new Date();
        const target = new Date(dateStr);
        const diff = target.getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 3600 * 24));
    };

    if (loading) return <div className="p-8 text-center"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400"/></div>;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <AdminTabs />
            
            {editingUser && (
                <EditLicenseModal 
                    user={editingUser} 
                    license={getLicenseForUser(editingUser.id)} 
                    onClose={() => setEditingUser(null)} 
                    onUpdate={refreshData} 
                />
            )}

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                 <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search name, email, company..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                    </div>
                    <div className="relative">
                         <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                         <select 
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as any)}
                            className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none bg-white"
                         >
                             <option value="ALL">All Status</option>
                             <option value={SubscriptionStatus.ACTIVE}>Active</option>
                             <option value={SubscriptionStatus.PAST_DUE}>Past Due</option>
                             <option value={SubscriptionStatus.TRIAL}>Trial</option>
                             <option value={SubscriptionStatus.CANCELED}>Canceled</option>
                             <option value={SubscriptionStatus.NONE}>None</option>
                         </select>
                    </div>
                 </div>
                 <div className="text-sm text-gray-500 font-medium">
                    Showing <span className="text-gray-900">{filteredUsers.length}</span> records
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Company</th>
                                <th className="px-6 py-4">Plan & Source</th>
                                <th className="px-6 py-4">Validity (Duration)</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.map(user => {
                                const license = getLicenseForUser(user.id);
                                const hasStripe = license?.stripeSubscriptionId?.startsWith('sub_');
                                const daysRemaining = getDaysRemaining(license?.validUntil);

                                return (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{user.name}</div>
                                            <div className="text-xs text-gray-500">{user.email}</div>
                                        </td>
                                        
                                        {/* COMPANY COLUMN */}
                                        <td className="px-6 py-4">
                                            {user.billingAddress?.companyName ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Building className="w-3 h-3 text-gray-400" />
                                                    <span className="font-medium text-gray-700">{user.billingAddress.companyName}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-300 italic">-</span>
                                            )}
                                        </td>

                                        {/* PLAN & SOURCE */}
                                        <td className="px-6 py-4">
                                            {license ? (
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-gray-900">{license.planTier}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {hasStripe ? (
                                                            <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100 flex items-center gap-1 w-fit">
                                                                <CreditCard className="w-3 h-3" /> Stripe
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 w-fit">
                                                                Manual
                                                            </span>
                                                        )}
                                                        {license.billingCycle !== 'none' && (
                                                            <span className="text-[10px] text-gray-400 capitalize">{license.billingCycle}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic">No license</span>
                                            )}
                                        </td>

                                        {/* VALIDITY (TWO BADGES) */}
                                        <td className="px-6 py-4">
                                            {license?.validUntil ? (
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    {/* Badge 1: Date */}
                                                    <div className="flex items-center gap-1.5 text-gray-700 text-xs bg-gray-50 px-2 py-1 rounded border border-gray-200">
                                                        <Calendar className="w-3 h-3 text-gray-400" />
                                                        {new Date(license.validUntil).toLocaleDateString()}
                                                    </div>

                                                    {/* Badge 2: Duration */}
                                                    {daysRemaining !== null && (
                                                        <div className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded border ${
                                                            daysRemaining > 30 ? 'bg-green-50 text-green-700 border-green-100' :
                                                            daysRemaining > 7 ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                                            'bg-red-50 text-red-700 border-red-100'
                                                        }`}>
                                                            <Clock className="w-3 h-3" />
                                                            {daysRemaining} Days left
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4">
                                            {license ? (
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                    license.status === SubscriptionStatus.ACTIVE ? 'bg-green-100 text-green-700' :
                                                    license.status === SubscriptionStatus.TRIAL ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {license.status}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => setEditingUser(user)} className="text-brand-500 hover:bg-brand-50 p-2 rounded-lg transition-colors border border-transparent hover:border-brand-100">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- VIEW 3: MARKETING INSIGHTS ---
const MarketingInsights: React.FC = () => {
    const { loading, licenses } = useAdminData();

    // Prepare Pie Data
    const tierData = [
        { name: PlanTier.FREE, value: 0 },
        { name: PlanTier.BUDGET, value: 0 },
        { name: PlanTier.COST_CONTROL, value: 0 },
        { name: PlanTier.PRODUCTION, value: 0 },
    ];

    licenses.forEach(l => {
        const idx = tierData.findIndex(t => t.name === l.planTier);
        if (idx > -1) tierData[idx].value++;
    });

    // Prepare Cycle Data
    const cycleData = [
        { name: 'Yearly', value: licenses.filter(l => l.billingCycle === 'yearly').length },
        { name: 'Monthly', value: licenses.filter(l => l.billingCycle === 'monthly').length },
    ];

    if (loading) return <div className="p-8 text-center"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400"/></div>;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <AdminTabs />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center">
                    <h3 className="font-bold text-gray-900 mb-4 w-full text-left">Plan Distribution</h3>
                    <div className="w-full h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={tierData}
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {tierData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={TIER_COLORS[entry.name as PlanTier]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center">
                    <h3 className="font-bold text-gray-900 mb-4 w-full text-left">Billing Preferences</h3>
                    <div className="w-full h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={cycleData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Bar dataKey="value" fill="#0093D0" radius={[4, 4, 0, 0]} barSize={50}>
                                    {cycleData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CYCLE_COLORS[entry.name.toLowerCase() as keyof typeof CYCLE_COLORS] || '#0093D0'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- VIEW 4: SYSTEM HEALTH ---
const SystemHealthView: React.FC = () => {
    const [checks, setChecks] = useState<SystemCheckResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastWebhook, setLastWebhook] = useState<string | null>(null);

    const runChecks = async () => {
        setLoading(true);
        try {
            const results = await Promise.all([
                liveSystemService.checkDatabaseConnection(),
                liveSystemService.checkAuthService(),
                liveSystemService.checkRealtime(),
                liveSystemService.checkStripe(),
                liveSystemService.checkEmail()
            ]);
            setChecks(results);

             // Check last webhook for "Heartbeat" display
             // This is the ONLY Stripe check we keep here.
             const { data } = await supabase
                .from('stripe_events')
                .select('created_at')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            if (data) setLastWebhook(data.created_at);

        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { runChecks(); }, []);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <AdminTabs />
            
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">System Status</h3>
                    <p className="text-sm text-gray-500">Real-time operational checks.</p>
                </div>
                <button onClick={runChecks} disabled={loading} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* STRIPE HEARTBEAT CARD */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-50 text-brand-600 rounded-full">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900">Stripe Webhook Heartbeat</h4>
                        <p className="text-sm text-gray-500">
                            {lastWebhook 
                                ? `Last signal received: ${new Date(lastWebhook).toLocaleString()}` 
                                : "No webhooks received yet."}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-mono">LIVE</span>
                    <div className={`w-3 h-3 rounded-full ${lastWebhook ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-100">
                    {checks.map((check, idx) => (
                        <div key={idx} className="p-6 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                            <div className={`p-2 rounded-lg shrink-0 ${
                                check.status === 'operational' ? 'bg-green-50 text-green-600' :
                                check.status === 'degraded' ? 'bg-orange-50 text-orange-600' :
                                'bg-red-50 text-red-600'
                            }`}>
                                {check.status === 'operational' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-gray-900">{check.service}</h4>
                                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                                        check.status === 'operational' ? 'bg-green-100 text-green-700' : 
                                        check.status === 'configuring' ? 'bg-blue-100 text-blue-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                        {check.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {check.latency}ms</span>
                                </div>
                                {check.details && (
                                    <div className="mt-3 text-xs font-mono bg-gray-900 text-gray-300 p-3 rounded-lg whitespace-pre-wrap">
                                        {check.details}
                                    </div>
                                )}
                                {check.actionLink && (
                                    <a href={check.actionLink} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-500 hover:underline">
                                        Fix Issue <ExternalLink className="w-3 h-3"/>
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                    {!loading && checks.length === 0 && (
                        <div className="p-8 text-center text-gray-400">Initializing checks...</div>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- VIEW 5: DEBUG VIEW (SIMPLIFIED TO STRIPE ONLY) ---
const DebugView: React.FC = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState<any[]>([]);
    
    // Error States
    const [stripeError, setStripeError] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [copying, setCopying] = useState(false);

    const refresh = async () => {
        setLoading(true);
        setStripeError(null);

        try {
            // 1. Stripe Events (Limit 20)
            const { data: eData, error: eError } = await supabase
                .from('stripe_events')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (eError) {
                 if (eError.code === '42P01') setStripeError("MISSING_TABLE");
                 else setStripeError(eError.message);
            } else if (eData) {
                setEvents(eData);
            }
        } catch (err) {
            console.error("Refresh Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyAll = async () => {
        setCopying(true);
        const dump = {
            timestamp: new Date().toISOString(),
            environment: 'production',
            currentUser: user?.email,
            data: { stripeEvents: events }
        };
        try {
            await navigator.clipboard.writeText(JSON.stringify(dump, null, 2));
            setTimeout(() => setCopying(false), 2000);
        } catch (err) { setCopying(false); }
    };

    useEffect(() => { refresh(); }, []);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
            <AdminTabs />
            <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                   <h1 className="text-2xl font-bold text-gray-900 mb-2">Stripe Event Log</h1>
                   <p className="text-gray-500">Live view of incoming webhooks from the payment provider.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleCopyAll} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-50">
                         {copying ? <Check className="w-4 h-4 text-green-600"/> : <Copy className="w-4 h-4"/>} Copy JSON
                    </button>
                    <button onClick={refresh} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white border border-gray-900 rounded-lg text-sm font-bold hover:bg-gray-800">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                </div>
            </div>

            {/* SQL SETUP INSTRUCTION BOX (Visible only on STRIPE ERROR) */}
            {stripeError && !loading && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8 text-sm text-amber-900">
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Database className="w-5 h-5"/> Stripe Table Missing</h3>
                    <p className="mb-4">
                        The 'stripe_events' table is missing. Run this script in Supabase:
                    </p>
                    <div className="bg-white border border-amber-300 rounded p-4 font-mono text-xs overflow-x-auto text-gray-600 select-all">
<pre>{`create table if not exists public.stripe_events (
  id text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  type text not null,
  payload jsonb,
  processing_error text
);
alter table public.stripe_events enable row level security;
create policy "Admins can view stripe events" on public.stripe_events for select to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Service role can insert stripe events" on public.stripe_events for insert to service_role with check (true);
create policy "Service role can update stripe events" on public.stripe_events for update to service_role using (true);`}</pre>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in">
                 <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-700">
                     <span>Stripe Webhooks (stripe_events)</span>
                 </div>
                 <div className="overflow-y-auto max-h-[600px]">
                     {stripeError ? (
                         <div className="p-12 text-center text-red-500">Error: {stripeError === "MISSING_TABLE" ? "Table 'stripe_events' is missing." : stripeError}</div>
                     ) : events.length === 0 ? (
                         <div className="p-12 text-center text-gray-400">No events found yet.</div> 
                     ) : (
                         <div className="divide-y divide-gray-100">
                             {events.map(ev => (
                                 <div key={ev.id} className="p-4 hover:bg-gray-50 text-sm">
                                     <div className="flex justify-between items-start mb-1">
                                         <span className="font-mono font-bold text-brand-600">{ev.type}</span>
                                         <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${ev.processing_error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                             {ev.processing_error ? 'ERROR' : 'OK'}
                                         </span>
                                     </div>
                                     <div className="text-xs text-gray-500 mb-2">{new Date(ev.created_at).toLocaleString()}</div>
                                     <pre className="text-[10px] bg-gray-900 text-gray-300 p-2 rounded overflow-x-auto">
                                         {JSON.stringify(ev.payload, null, 2)}
                                     </pre>
                                     {ev.processing_error && (
                                          <div className="mt-2 text-xs text-red-600 font-mono bg-red-50 p-2 rounded border border-red-100">
                                              Error: {ev.processing_error}
                                          </div>
                                     )}
                                 </div>
                             ))}
                         </div>
                     )}
                 </div>
            </div>
        </div>
    );
};

// --- MAIN ROUTING COMPONENT ---
export const AdminDashboard: React.FC = () => {
    return (
        <div className="pb-20">
            <Routes>
                <Route index element={<DashboardOverview />} />
                <Route path="users" element={<UsersManagement />} />
                <Route path="marketing" element={<MarketingInsights />} />
                <Route path="system" element={<SystemHealthView />} />
                <Route path="debug" element={<DebugView />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
        </div>
    );
};
