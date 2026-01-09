
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, LayoutDashboard, Users, Calculator, BarChart3, Clapperboard } from 'lucide-react';
import { PlanTier } from '../types';
import { useAuth } from '../context/AuthContext';
import { STRIPE_LINKS } from '../config/stripe';

export const Landing: React.FC = () => {
  const [billingInterval, setBillingInterval] = useState<'yearly' | 'monthly'>('yearly');
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const handleSelectPlan = (planName: PlanTier) => {
    if (planName === PlanTier.FREE) {
        if (isAuthenticated) navigate('/dashboard');
        else navigate('/signup');
        return;
    }

    if (!isAuthenticated) {
        navigate('/signup?plan=' + planName + '&cycle=' + billingInterval);
        return;
    }

    const link = (STRIPE_LINKS as any)[planName]?.[billingInterval];
    if (link && user) {
        // FIX: Pass User ID and Email to Stripe
        const url = new URL(link);
        url.searchParams.set('client_reference_id', user.id);
        url.searchParams.set('prefilled_email', user.email);
        
        window.location.href = url.toString();
    } else {
        console.error("No Stripe link found for", planName, billingInterval);
        navigate('/dashboard/subscription');
    }
  };

  const plans = [
    {
      name: PlanTier.FREE,
      title: "Free",
      Icon: Users,
      subtitle: "For everyone who wants to try it out",
      price: 0,
      colorClass: "border-gray-800",
      textClass: "text-gray-800",
      btnClass: "border-gray-800 text-gray-900 hover:bg-gray-50",
      btnText: isAuthenticated ? "Current Plan" : "Get Started",
      save: null,
      features: [
        "14-day full feature trial",
        "View project data in all modules",
        "No printing",
        "No sharing"
      ]
    },
    {
      name: PlanTier.BUDGET,
      title: "Budget",
      Icon: Calculator,
      subtitle: "For production managers focused on budget creation.",
      price: billingInterval === 'yearly' ? 390 : 39,
      colorClass: "border-amber-500",
      textClass: "text-amber-500",
      btnClass: "border-amber-500 text-amber-600 bg-amber-50 hover:bg-amber-100",
      btnText: isAuthenticated ? "Switch to Budget" : "Get Started",
      save: billingInterval === 'yearly' ? 78 : null,
      features: [
        "Budgeting Module",
        "Tutorials",
        "Unlimited Projects",
        "Share Projects",
        "Email support"
      ]
    },
    {
      name: PlanTier.COST_CONTROL,
      title: "Cost Control",
      Icon: BarChart3,
      subtitle: "For production managers monitoring production costs.",
      price: billingInterval === 'yearly' ? 590 : 59,
      colorClass: "border-purple-600",
      textClass: "text-purple-600",
      btnClass: "border-purple-600 text-purple-700 bg-purple-50 hover:bg-purple-100",
      btnText: isAuthenticated ? "Switch to Cost Control" : "Get Started",
      save: billingInterval === 'yearly' ? 238 : null,
      features: [
        "Budgeting Module",
        "Cost Control Module",
        "Tutorials",
        "Unlimited Projects",
        "Share projects",
        "Email support"
      ]
    },
    {
      name: PlanTier.PRODUCTION,
      title: "Production",
      Icon: Clapperboard,
      subtitle: "For producers seeking full project control.",
      price: billingInterval === 'yearly' ? 690 : 69,
      colorClass: "border-green-600",
      textClass: "text-green-600",
      btnClass: "border-green-600 text-green-700 bg-green-50 hover:bg-green-100",
      btnText: isAuthenticated ? "Switch to Production" : "Get Started",
      save: billingInterval === 'yearly' ? 378 : null,
      features: [
        "Budgeting Module",
        "Cost Control Module",
        "Financing Module",
        "Cashflow Module",
        "Tutorials",
        "Unlimited Projects",
        "Share projects",
        "Email support"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* NAVBAR */}
      <nav className="bg-white py-4 px-6 md:px-12 flex items-center justify-between sticky top-0 z-50 shadow-sm border-b border-gray-100">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-2xl font-bold text-brand-500 tracking-wide">KOSMA</Link>
          <div className="hidden md:flex gap-6 text-sm font-medium text-gray-700">
            <a href="#pricing" className="hover:text-brand-500">Pricing</a>
            <Link to="#" className="hover:text-brand-500">Learning Campus</Link>
            <Link to="#" className="hover:text-brand-500">Help</Link>
          </div>
        </div>
        
        <div className="flex items-center gap-6 text-sm font-medium">
          {isAuthenticated ? (
            <>
               <span className="text-gray-500 hidden md:inline">Hello, {user?.name}</span>
               <Link to="/dashboard" className="bg-brand-500 text-white px-5 py-2 rounded hover:bg-brand-600 transition-colors flex items-center gap-2 font-bold shadow-lg shadow-brand-500/20">
                 <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
               </Link>
            </>
          ) : (
            <>
              <Link to="#" className="text-brand-500 hover:underline hidden md:block">Download</Link>
              <Link to="/login" className="text-gray-900 hover:text-brand-500">Log In</Link>
              <Link to="/signup" className="bg-gray-900 text-white px-5 py-2 rounded hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/20">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h1>
        <p className="text-xl text-gray-500 mb-12">Choose the plan that fits your production needs.</p>
        
        {/* TOGGLE */}
        <div className="flex justify-center mb-16" id="pricing">
          <div className="inline-flex bg-gray-100 rounded-full p-1 shadow-sm">
            <button onClick={() => setBillingInterval('yearly')} className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all ${billingInterval === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Yearly</button>
            <button onClick={() => setBillingInterval('monthly')} className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all ${billingInterval === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Monthly</button>
          </div>
        </div>

        {/* PRICING CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24 items-start">
          {plans.map((plan, idx) => (
            <div key={idx} className={`bg-white rounded-2xl shadow-sm border border-gray-100 border-t-[8px] ${plan.colorClass} p-8 flex flex-col h-full transform transition-all hover:-translate-y-1 hover:shadow-xl`}>
              
              <h3 className={`text-2xl font-bold ${plan.textClass} mb-4`}>{plan.title}</h3>
              
              <div className="flex justify-center mb-6">
                <plan.Icon className={`w-12 h-12 ${plan.textClass} opacity-90`} />
              </div>

              <p className="text-xs text-gray-500 h-10 mb-6 leading-relaxed px-2">{plan.subtitle}</p>
              
              <div className="mb-2">
                 <span className={`text-4xl font-bold ${plan.textClass}`}>{plan.price} €</span>
                 <span className="text-sm text-gray-400 font-medium">{billingInterval === 'yearly' ? '/year' : '/month'}</span>
              </div>

              <div className="h-6 mb-8">
                {plan.save && (
                    <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                        Save {plan.save}€ per year
                    </span>
                )}
              </div>

              <button 
                onClick={() => handleSelectPlan(plan.name)} 
                className={`w-full py-3 rounded-lg border-2 font-bold transition-all mb-8 ${plan.btnClass}`}
              >
                  {plan.btnText}
              </button>

              <div className="border-t border-gray-100 pt-6 flex-1">
                <ul className="space-y-3 text-left text-sm">
                    {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex gap-3 items-start">
                        <Check className={`w-4 h-4 ${plan.textClass} shrink-0 mt-0.5`} />
                        <span className="text-gray-600 leading-tight">{feat}</span>
                    </li>
                    ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </main>
      
      <footer className="bg-gray-50 border-t border-gray-200 py-12 text-sm text-gray-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
             <div className="flex gap-6">
                <Link to="/login?reset=true" className="text-brand-500 hover:underline">Passwort zurücksetzen</Link>
                <Link to="#" className="text-brand-500">Impressum</Link>
                <Link to="#" className="text-brand-500">Kontakt</Link>
             </div>
             <div>© 2023 KOSMA</div>
           </div>
        </div>
      </footer>
    </div>
  );
};
