
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { License, SubscriptionStatus, Invoice, PlanTier, User, BillingAddress } from '../types';
import { Loader2, Download, CreditCard, FileText, Settings, Zap, Briefcase, LayoutDashboard, Building, Check, Calculator, BarChart3, Clapperboard, AlertCircle, ExternalLink, ChevronRight, Lock, RefreshCw, LogOut } from 'lucide-react';
import { Routes, Route, Navigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { STRIPE_LINKS } from '../config/stripe';

// --- SHARED COMPONENTS ---

const DashboardTabs = () => {
    const location = useLocation();
    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="flex flex-wrap justify-center border-b border-gray-200 mb-8">
             <Link 
                to="/dashboard" 
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    isActive('/dashboard')
                    ? 'border-brand-500 text-brand-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
                <LayoutDashboard className="w-4 h-4" /> Overview
            </Link>
            <Link 
                to="/dashboard/subscription" 
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    isActive('/dashboard/subscription') 
                    ? 'border-brand-500 text-brand-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
                <CreditCard className="w-4 h-4" /> Subscription & Invoices
            </Link>
            <Link 
                to="/dashboard/settings" 
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    isActive('/dashboard/settings') 
                    ? 'border-brand-500 text-brand-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
                <Settings className="w-4 h-4" /> Account Settings
            </Link>
        </div>
    );
};

// --- DATA HOOK ---
const useCustomerData = (user: User) => {
    const [loading, setLoading] = useState(true);
    const [licenses, setLicenses] = useState<License[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [billingAddress, setBillingAddress] = useState<BillingAddress | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const refresh = () => setRefreshTrigger(prev => prev + 1);

    useEffect(() => {
        const fetchData = async (retryCount = 0) => {
            if (retryCount === 0) setLoading(true);
            try {
                // 1. Licenses (RLS ensures we only get our own)
                const { data: licData, error: licError } = await supabase
                    .from('licenses')
                    .select('*')
                    .eq('user_id', user.id);

                if (licError) console.error("License Fetch Error:", licError);
                
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('billing_address')
                    .eq('id', user.id)
                    .single();

                if (profileData?.billing_address) setBillingAddress(profileData.billing_address);

                if (licData && licData.length > 0) {
                     const mappedLicenses = licData.map((l: any) => {
                        // Effective Valid Until Logic matches SQL: Coalesce(Admin, Stripe, DB)
                        const effectiveValidUntil = l.admin_valid_until_override || l.current_period_end || l.valid_until;
                        return {
                            id: l.id,
                            userId: l.user_id,
                            productName: l.product_name,
                            planTier: l.plan_tier as PlanTier,
                            billingCycle: l.billing_cycle || 'none',
                            status: l.status as SubscriptionStatus,
                            validUntil: effectiveValidUntil,
                            licenseKey: l.license_key,
                            billingProjectName: l.billing_project_name,
                            stripeSubscriptionId: l.stripe_subscription_id,
                            stripeCustomerId: l.stripe_customer_id,
                            cancelAtPeriodEnd: l.cancel_at_period_end,
                            currentPeriodEnd: l.current_period_end
                        };
                    });
                    setLicenses(mappedLicenses);
                } else {
                    setLicenses([{
                        id: 'temp', userId: user.id, productName: 'KOSMA', 
                        planTier: PlanTier.FREE, billingCycle: 'none', 
                        status: SubscriptionStatus.NONE, validUntil: null, 
                        licenseKey: null 
                    }]);
                }

                // 2. Invoices
                const { data: invData } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                 if (invData) {
                    setInvoices(invData.map((i: any) => ({
                        id: i.id,
                        date: i.created_at, 
                        amount: i.amount,
                        currency: 'EUR',
                        status: i.status,
                        pdfUrl: i.invoice_pdf_url || i.invoice_hosted_url || '#',
                        projectName: i.project_name
                    })));
                 }

            } catch (err: any) {
                console.error("Critical Data Load Error:", err);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchData();
    }, [user, refreshTrigger]);

    return { loading, licenses, invoices, billingAddress, refresh };
};


// --- VIEW COMPONENTS ---

const BillingAddressCard: React.FC<{ initialAddress: BillingAddress | null }> = ({ initialAddress }) => {
    const address = initialAddress || { street: '', city: '', zip: '', country: 'Germany', companyName: '', vatId: '' };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Building className="w-5 h-5 text-gray-400" /> Billing Address
                </h3>
                <span className="bg-gray-100 text-gray-500 text-[10px] uppercase font-bold px-2 py-0.5 rounded">Read Only</span>
            </div>

            <div className="text-sm text-gray-600 space-y-1 flex-1">
                {address.companyName ? (
                    <p className="font-bold text-gray-900">{address.companyName}</p>
                ) : (
                    <p className="italic text-gray-400">No company name stored</p>
                )}
                {address.vatId && <p className="text-xs text-gray-400 mb-2">VAT: {address.vatId}</p>}
                
                {address.street ? (
                    <>
                        <p>{address.street}</p>
                        <p>{address.zip} {address.city}</p>
                        <p>{address.country}</p>
                    </>
                ) : (
                    <p className="text-gray-400 italic mt-2">No address details synchronized yet.</p>
                )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-50">
                 <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Managed via Payment Provider
                 </p>
            </div>
        </div>
    );
};

const PricingSection: React.FC<{ user: User, currentTier: PlanTier, currentCycle: string, status: SubscriptionStatus, hasStripeId: boolean }> = ({ user, currentTier, currentCycle, status, hasStripeId }) => {
    const [loadingPortal, setLoadingPortal] = useState(false);
    
    // Logic: If user has an active Stripe subscription (or past_due), 
    // we MUST send them to the Portal for any changes.
    // We only show direct Payment Links if they are strictly on FREE/NONE.
    const isManagedViaPortal = hasStripeId && (status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.PAST_DUE || status === SubscriptionStatus.TRIAL);

    const handlePortalRedirect = async () => {
        setLoadingPortal(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            
            const returnUrl = window.location.href;
            const { data, error } = await supabase.functions.invoke('rapid-handler', {
                body: { returnUrl },
                headers: { Authorization: `Bearer ${session.access_token}` }
            });

            if (data?.url) window.location.href = data.url;
            else throw new Error(error?.message || "No URL returned");
        } catch (e) {
            console.error(e);
            alert("Could not open settings. Please try again.");
        } finally {
            setLoadingPortal(false);
        }
    };

    const handlePurchase = (planName: PlanTier, cycle: 'yearly' | 'monthly') => {
        try {
            const link = STRIPE_LINKS[planName]?.[cycle];
            if (!link) {
                alert("Payment link configuration missing.");
                return;
            }
            const url = new URL(link);
            url.searchParams.set('client_reference_id', user.id);
            url.searchParams.set('prefilled_email', user.email);
            window.location.href = url.toString();
        } catch (e) {
            console.error(e);
        }
    };

    const [billingInterval, setBillingInterval] = useState<'yearly' | 'monthly'>('yearly');

    // PLANS DEFINITION
    const plans = [
        {
          name: PlanTier.BUDGET,
          title: "Budget",
          Icon: Calculator,
          price: billingInterval === 'yearly' ? 390 : 39,
          colorClass: "border-amber-500",
          textClass: "text-amber-500",
          features: ["Budgeting Module", "Unlimited Projects"]
        },
        {
          name: PlanTier.COST_CONTROL,
          title: "Cost Control",
          Icon: BarChart3,
          price: billingInterval === 'yearly' ? 590 : 59,
          colorClass: "border-purple-600",
          textClass: "text-purple-600",
          features: ["Budgeting + Cost Control", "Share projects"]
        },
        {
          name: PlanTier.PRODUCTION,
          title: "Production",
          Icon: Clapperboard,
          price: billingInterval === 'yearly' ? 690 : 69,
          colorClass: "border-green-600",
          textClass: "text-green-600",
          features: ["All Modules", "Financing & Cashflow"]
        }
    ];

    return (
        <div className="mt-16 border-t border-gray-100 pt-12">
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                <div>
                    <h3 className="text-2xl font-bold text-gray-900">Available Plans</h3>
                    <p className="text-gray-500 mt-1">
                        {isManagedViaPortal 
                            ? "Manage your upgrade or downgrade in the customer portal." 
                            : "Choose a plan to get started."}
                    </p>
                </div>
                {!isManagedViaPortal && (
                    <div className="inline-flex bg-gray-100 rounded-full p-1">
                        <button onClick={() => setBillingInterval('yearly')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${billingInterval === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Yearly</button>
                        <button onClick={() => setBillingInterval('monthly')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${billingInterval === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Monthly</button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan) => {
                    const isCurrent = plan.name === currentTier;

                    return (
                        <div key={plan.name} className={`relative bg-white rounded-2xl shadow-sm border border-gray-100 border-t-[8px] ${plan.colorClass} p-8 flex flex-col text-center`}>
                            {isCurrent && (
                                <div className="absolute top-0 right-0 bg-gray-900 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                                    CURRENT
                                </div>
                            )}
                            <h4 className={`text-2xl font-bold ${plan.textClass} mb-4`}>{plan.title}</h4>
                            <div className="flex justify-center mb-6"><plan.Icon className={`w-12 h-12 ${plan.textClass} opacity-90`} /></div>
                            <div className="mb-2">
                                <span className={`text-4xl font-bold ${plan.textClass}`}>{plan.price} €</span>
                                <span className="text-sm text-gray-400">/{billingInterval === 'yearly' ? 'year' : 'month'}</span>
                            </div>

                            {/* ACTION BUTTON */}
                            {isManagedViaPortal ? (
                                <button
                                    onClick={handlePortalRedirect}
                                    disabled={loadingPortal}
                                    className="w-full py-3 rounded-lg border-2 border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 flex items-center justify-center gap-2 mb-8"
                                >
                                    {loadingPortal ? <Loader2 className="w-4 h-4 animate-spin"/> : <Settings className="w-4 h-4"/>}
                                    Manage in Portal
                                </button>
                            ) : (
                                <button
                                    onClick={() => handlePurchase(plan.name, billingInterval)}
                                    disabled={isCurrent}
                                    className={`w-full py-3 rounded-lg border-2 text-sm font-bold transition-all mb-8 ${isCurrent ? 'border-gray-100 text-gray-300 cursor-not-allowed' : `border-gray-900 text-gray-900 hover:bg-gray-50`}`}
                                >
                                    {isCurrent ? "Active Plan" : "Choose Plan"}
                                </button>
                            )}
                            
                            <div className="border-t border-gray-100 pt-6 flex-1">
                                <ul className="space-y-3 text-left text-sm text-gray-600">
                                    {plan.features.map((f, i) => (
                                        <li key={i} className="flex gap-3 items-start"><Check className={`w-4 h-4 ${plan.textClass} shrink-0 mt-0.5`} /> <span className="leading-tight">{f}</span></li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- VIEW 1: OVERVIEW ---
const OverviewView: React.FC<{ 
    user: User, 
    licenses: License[], 
    invoices: Invoice[]
}> = ({ user, licenses, invoices }) => {
    const activeLicense = licenses[0];

    const daysRemaining = useMemo(() => {
        if (!activeLicense?.validUntil) return null;
        
        const validUntil = new Date(activeLicense.validUntil);
        const now = new Date();

        const diff = validUntil.getTime() - now.getTime();
        return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
    }, [activeLicense]);

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome, {user.name}</h1>
                <p className="text-gray-500">Your production hub overview.</p>
            </div>
            
            <DashboardTabs />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Current License</h3>
                    {activeLicense ? (
                        <>
                            <div className="flex items-center gap-4">
                                <div className={`p-4 rounded-xl ${activeLicense.status === SubscriptionStatus.TRIAL ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                                    <Zap className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="font-bold text-xl text-gray-900">{activeLicense.planTier}</p>
                                    <div className="flex gap-2 items-center mt-1">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                            activeLicense.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {activeLicense.status}
                                        </span>
                                        {activeLicense.cancelAtPeriodEnd && (
                                            <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded-full">Expir.</span>
                                        )}
                                    </div>
                                    
                                    {/* TRIAL SPECIFIC DISPLAY */}
                                    {activeLicense.status === SubscriptionStatus.TRIAL && activeLicense.validUntil && (
                                        <p className="text-xs font-bold text-blue-600 mt-2">
                                            Trial ends: {new Date(activeLicense.validUntil).toLocaleDateString()}
                                        </p>
                                    )}
                                    
                                    {activeLicense.status !== SubscriptionStatus.TRIAL && (
                                         <p className="text-xs text-gray-500 mt-2">
                                            {activeLicense.validUntil ? `Valid until ${new Date(activeLicense.validUntil).toLocaleDateString()}` : 'No expiration'}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between gap-4">
                                <div className="bg-gray-50 rounded-lg p-3 text-center min-w-[120px] border border-gray-100">
                                     <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">
                                        Remaining
                                     </span>
                                     <span className="block text-xl font-black text-gray-900 leading-none">
                                         {daysRemaining !== null ? `${daysRemaining} days` : '—'}
                                     </span>
                                </div>
                                
                                <Link to="/dashboard/subscription" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold bg-gray-900 text-white hover:bg-gray-800 transition-colors">
                                    View Subscription Details <ChevronRight className="w-4 h-4"/>
                                </Link>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-6">
                            <p className="text-sm text-gray-500 mb-4">No active license found.</p>
                            <Link to="/dashboard/subscription" className="inline-flex items-center text-brand-500 font-bold text-sm hover:underline">
                                Get Started
                            </Link>
                        </div>
                    )}
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Latest Invoices</h3>
                    {invoices.length > 0 ? (
                        <ul className="space-y-4 flex-1">
                            {invoices.slice(0, 2).map(inv => (
                                <li key={inv.id} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 border border-gray-100">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500">{new Date(inv.date).toLocaleDateString()}</span>
                                        <span className="font-bold text-gray-900">{inv.amount.toFixed(2)} €</span>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                                            inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {inv.status}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-sm text-gray-400 italic">
                            No invoices yet.
                        </div>
                    )}
                    <Link to="/dashboard/subscription" className="mt-6 block text-center py-2 border border-gray-200 rounded-lg font-bold text-sm hover:bg-gray-50 text-gray-600">
                        View All Invoices
                    </Link>
                </div>
            </div>
        </div>
    );
};

// --- VIEW 2: SUBSCRIPTION & INVOICES ---
const SubscriptionView: React.FC<{ 
    user: User, 
    licenses: License[], 
    invoices: Invoice[], 
    refresh: () => void,
}> = ({ user, licenses, invoices, refresh }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [isPolling, setIsPolling] = useState(false);
    const [canceling, setCanceling] = useState(false);

    const activeLicense = licenses[0];
    const hasStripeId = activeLicense?.stripeSubscriptionId && activeLicense.stripeSubscriptionId.startsWith('sub_');

    // Handle Return from Stripe Purchase
    useEffect(() => {
        const stripeSuccess = searchParams.get('stripe_success');
        const checkoutStatus = searchParams.get('checkout');
        const isSuccess = stripeSuccess === 'true' || checkoutStatus === 'success';

        if (isSuccess) {
            setIsPolling(true);
             const { data: { session } } = supabase.auth.getSession().then(({data}) => {
                 if(data.session) {
                    supabase.functions.invoke('dynamic-endpoint', {
                        body: { tier: 'na', cycle: 'na' }, // Dummy
                        headers: { Authorization: `Bearer ${data.session.access_token}` }
                    });
                 }
             });
        }
    }, [searchParams]);

    useEffect(() => {
        if (!isPolling) return;
        const intervalId = setInterval(async () => {
            refresh();
            if (activeLicense?.status === 'active' && activeLicense.stripeSubscriptionId?.startsWith('sub_')) {
                setIsPolling(false);
                setSearchParams({});
            }
        }, 3000);
        const timeoutId = setTimeout(() => setIsPolling(false), 120000);
        return () => { clearInterval(intervalId); clearTimeout(timeoutId); };
    }, [isPolling, refresh, activeLicense, setSearchParams]);

    const handleCancel = async () => {
        if (!confirm("Are you sure you want to cancel? Your access will remain until the end of the billing period.")) return;
        setCanceling(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session");
            const { data, error } = await supabase.functions.invoke('cancel-subscription', { // Maps to 'swift-action'
                body: {},
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            if (error || !data.success) throw new Error(data?.error || "Cancellation failed");
            alert("Subscription canceled. You retain access until the end of the period.");
            refresh();
        } catch (err: any) {
            console.error(err);
            alert("Could not cancel subscription. Please try again.");
        } finally {
            setCanceling(false);
        }
    };

    const isActive = activeLicense?.status === SubscriptionStatus.ACTIVE;
    const isScheduled = activeLicense?.cancelAtPeriodEnd;
    
    let cancelBtnText = "Cancel Subscription";
    let cancelBtnDisabled = false;

    if (isScheduled) {
        cancelBtnText = "Cancellation Scheduled";
        cancelBtnDisabled = true;
    } else if (!hasStripeId || !isActive) {
        cancelBtnText = isActive ? "Syncing..." : "No active subscription";
        cancelBtnDisabled = true;
    }

    return (
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-10 text-center md:text-left">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription & Invoices</h1>
                <p className="text-gray-500">Manage your plan and view payment history.</p>
            </div>

            <DashboardTabs />

            {/* Syncing Banner */}
            {isPolling && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 p-6 rounded-xl mb-12 flex items-center gap-4 animate-in zoom-in-95 shadow-sm">
                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                    <div>
                        <h3 className="font-bold text-lg">Payment Successful</h3>
                        <p className="text-sm">We are syncing your data from Stripe. This may take a few seconds...</p>
                    </div>
                </div>
            )}

            {/* Active Plan Card */}
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm mb-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div>
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Active Plan</h2>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-gray-900">{activeLicense?.planTier || 'Free'}</span>
                            {activeLicense?.status === SubscriptionStatus.ACTIVE && (
                                <span className="text-sm text-gray-500">{activeLicense?.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}</span>
                            )}
                        </div>
                        
                        <div className="mt-3 flex flex-wrap gap-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                                activeLicense?.status === SubscriptionStatus.ACTIVE ? 'bg-green-100 text-green-800' :
                                activeLicense?.status === SubscriptionStatus.TRIAL ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                                {activeLicense?.status === SubscriptionStatus.ACTIVE ? 'Active Subscription' :
                                 activeLicense?.status === SubscriptionStatus.TRIAL ? 'Free Trial' : 'Free Tier'}
                            </span>
                        </div>
                        
                        {/* Cancellation State */}
                        {activeLicense?.cancelAtPeriodEnd && (
                            <div className="mt-4 p-3 bg-orange-50 border border-orange-100 rounded-lg flex items-start gap-2 max-w-md">
                                <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-orange-800">Canceled</p>
                                    <p className="text-xs text-orange-700">
                                        Access remains valid until {activeLicense.validUntil ? new Date(activeLicense.validUntil).toLocaleDateString() : 'period end'}.
                                    </p>
                                </div>
                            </div>
                        )}

                        {!activeLicense?.cancelAtPeriodEnd && (
                            <p className="text-sm text-gray-500 mt-2">
                                {activeLicense?.validUntil 
                                    ? `Renewing on: ${new Date(activeLicense.validUntil).toLocaleDateString()}`
                                    : 'No expiry date.'
                                }
                            </p>
                        )}
                    </div>
                    
                    <button 
                            onClick={handleCancel}
                            disabled={canceling || cancelBtnDisabled}
                            className={`px-6 py-2 border rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
                            (!cancelBtnDisabled)
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-gray-100 text-gray-400 cursor-not-allowed bg-gray-50'
                            }`}
                    >
                        {canceling ? <Loader2 className="w-4 h-4 animate-spin"/> : null}
                        {cancelBtnText}
                    </button>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-12">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-gray-400" /> Invoice History
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Invoice</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {invoices.length > 0 ? invoices.map(inv => (
                                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-gray-600">{new Date(inv.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 font-bold">{inv.amount.toFixed(2)} {inv.currency}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                            inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {inv.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => window.open(inv.pdfUrl, '_blank')}
                                            className="text-brand-500 hover:text-brand-700 font-bold flex items-center gap-1 ml-auto"
                                        >
                                            <Download className="w-4 h-4" /> PDF
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                        No invoices found yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <PricingSection 
                user={user}
                currentTier={activeLicense?.planTier || PlanTier.FREE} 
                currentCycle={activeLicense?.billingCycle || 'none'}
                status={activeLicense?.status}
                hasStripeId={!!hasStripeId}
            />
        </div>
    );
};

// --- VIEW 3: SETTINGS VIEW ---
const SettingsView: React.FC<{ user: User, billingAddress: BillingAddress | null, refresh: () => void }> = ({ user, billingAddress, refresh }) => {
    const [loadingPortal, setLoadingPortal] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();

    // Trigger data refresh if returning from Stripe Portal
    useEffect(() => {
        if (searchParams.get('portal_return') === '1') {
            refresh();
            searchParams.delete('portal_return');
            setSearchParams(searchParams, { replace: true });
        }
    }, [searchParams, setSearchParams, refresh]);

    const handleManagePaymentMethods = async () => {
        setLoadingPortal(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert("Please log in again.");
                return;
            }

            const returnUrl = new URL(window.location.href);
            returnUrl.searchParams.set('portal_return', '1');

            const { data, error } = await supabase.functions.invoke('rapid-handler', {
                body: { returnUrl: returnUrl.toString() },
                headers: { Authorization: `Bearer ${session.access_token}` }
            });

            if (error || !data?.url) {
                console.error("Portal Error:", error || data);
                alert("Could not open payment settings. You might not have an active Stripe customer account yet.");
                return;
            }
            window.location.href = data.url;
        } catch (err) {
            console.error(err);
            alert("Something went wrong. Please try again later.");
        } finally {
            setLoadingPortal(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-10 text-center md:text-left">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
                <p className="text-gray-500">Manage your address and payment methods.</p>
            </div>

            <DashboardTabs />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Billing Address (READ ONLY) */}
                <div className="h-full">
                    <BillingAddressCard initialAddress={billingAddress} />
                </div>

                {/* Account & Payment Info */}
                <div className="space-y-8">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                            <Briefcase className="w-5 h-5 text-gray-400" /> Account Info
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between border-b border-gray-50 pb-2">
                                <span className="text-gray-500">Name</span>
                                <span className="font-medium text-gray-900">{user.name}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-50 pb-2">
                                <span className="text-gray-500">Email</span>
                                <span className="font-medium text-gray-900">{user.email}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Role</span>
                                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{user.role}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-2">
                            <CreditCard className="w-5 h-5 text-gray-400" /> Billing & Payment
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Securely update your payment methods and billing address via our payment provider.
                        </p>

                        <button 
                            onClick={handleManagePaymentMethods}
                            disabled={loadingPortal}
                            className="w-full py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                        >
                            {loadingPortal ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                            Manage Billing in Portal
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="h-20"></div>
        </div>
    );
};

// --- MAIN ROUTER COMPONENT ---
export const CustomerDashboard: React.FC = () => {
    const { user } = useAuth();
    const { loading, licenses, invoices, billingAddress, refresh } = useCustomerData(user!);

    if (!user) return <Navigate to="/login" />;
    if (loading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

    return (
        <div className="pb-20">
            <Routes>
                <Route index element={<OverviewView user={user} licenses={licenses} invoices={invoices} />} />
                <Route 
                    path="subscription" 
                    element={
                        <SubscriptionView 
                            user={user} 
                            licenses={licenses} 
                            invoices={invoices} 
                            refresh={refresh} 
                        />
                    } 
                />
                <Route path="settings" element={<SettingsView user={user} billingAddress={billingAddress} refresh={refresh} />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </div>
    );
};
