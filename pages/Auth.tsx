import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

// --- VISUAL COMPONENTS ---

const DotPattern = ({ className }: { className?: string }) => (
  <div className={`grid grid-cols-5 gap-2 opacity-20 ${className}`}>
    {[...Array(15)].map((_, i) => (
      <div key={i} className="w-2 h-2 rounded-full bg-brand-500" />
    ))}
  </div>
);

const AuthHeader = () => (
  <div className="w-full max-w-7xl mx-auto p-6 flex justify-between items-center">
    <Link to="/" className="text-2xl font-bold text-brand-500 tracking-tight">KOSMA</Link>
    <div className="flex items-center gap-6 text-sm font-medium">
      <Link to="#" className="text-brand-500 hover:underline hidden md:block">Download</Link>
      <Link to="/login" className="text-gray-900 hover:text-brand-500">Login</Link>
      <Link to="/signup" className="bg-gray-900 text-white px-5 py-2 rounded hover:bg-gray-800 transition-colors">
        Sign Up
      </Link>
    </div>
  </div>
);

const AuthFooter = () => (
  <div className="w-full bg-white border-t border-gray-100 pt-12 pb-6 text-sm text-gray-500">
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        {/* Column 1: Brand */}
        <div className="space-y-4">
          <span className="text-gray-900 font-medium">Headstart Media</span>
          <div className="flex items-center gap-1">
             {/* MEDIA Logo Simulation */}
             <div className="bg-blue-900 text-white px-2 py-1 text-[10px] font-bold tracking-widest flex items-center">
                <span className="text-yellow-400 mr-1">MEDIA</span>
                <span className="opacity-50 text-[8px] leading-none block">EUROPE LOVES CINEMA</span>
             </div>
          </div>
        </div>
        
        {/* Column 2: Product */}
        <div>
           <h4 className="font-bold text-gray-900 mb-4 uppercase text-xs tracking-wider">Product</h4>
           <ul className="space-y-2">
             <li><Link to="#" className="hover:text-brand-500">Download</Link></li>
             <li><Link to="/signup" className="hover:text-brand-500">Register</Link></li>
             <li><Link to="/#pricing" className="hover:text-brand-500">Pricing</Link></li>
           </ul>
        </div>

        {/* Column 3: Support */}
        <div>
           <h4 className="font-bold text-gray-900 mb-4 uppercase text-xs tracking-wider">Support</h4>
           <ul className="space-y-2">
             <li><Link to="#" className="hover:text-brand-500">Help</Link></li>
             <li><Link to="#" className="hover:text-brand-500">Learning Campus</Link></li>
             <li><Link to="#" className="hover:text-brand-500">Templates</Link></li>
             <li><Link to="/login?reset=true" className="hover:text-brand-500">Request New Password</Link></li>
           </ul>
        </div>

        {/* Column 4: Language */}
        <div>
           <h4 className="font-bold text-gray-900 mb-4 uppercase text-xs tracking-wider">Language</h4>
           <ul className="space-y-2">
             <li><button className="hover:text-brand-500 text-gray-900">English</button></li>
             <li><button className="hover:text-brand-500">German</button></li>
             <li><button className="hover:text-brand-500">French</button></li>
           </ul>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
         <div className="flex gap-2 text-xl text-gray-400">
            {/* Social Icons Placeholder */}
            <div className="w-6 h-6 bg-gray-800 text-white flex items-center justify-center text-[10px] font-bold rounded-sm">in</div>
         </div>
         <div className="flex flex-wrap gap-6 justify-center md:justify-end">
            <Link to="#" className="hover:text-brand-500">Imprint</Link>
            <Link to="#" className="hover:text-brand-500">Privacy Statement</Link>
            <Link to="#" className="hover:text-brand-500">GTC</Link>
            <Link to="#" className="hover:text-brand-500">Cookie Settings</Link>
            <Link to="#" className="hover:text-brand-500">Contact</Link>
            <span>© 2023</span>
         </div>
      </div>
    </div>
  </div>
);

const AuthLayout: React.FC<{ children: React.ReactNode; title: string; subtitle?: string }> = ({ children, title, subtitle }) => (
  <div className="min-h-screen bg-white flex flex-col font-sans text-gray-900">
    <AuthHeader />

    {/* Main Content */}
    <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden my-12">
      {/* Decorative Dots Left */}
      <div className="absolute left-10 lg:left-20 top-1/2 -translate-y-1/2 hidden xl:block">
        <DotPattern />
      </div>
      {/* Decorative Dots Right */}
      <div className="absolute right-10 lg:right-20 top-1/2 -translate-y-1/2 hidden xl:block">
        <DotPattern />
      </div>

      <div className="w-full max-w-[520px] z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">{title}</h1>
          {subtitle && <p className="text-gray-500 text-lg">{subtitle}</p>}
        </div>
        
        {children}
      </div>
    </div>

    <AuthFooter />
  </div>
);

// --- MAIN PAGE COMPONENT ---

export const AuthPage: React.FC<{ mode: 'login' | 'signup' | 'update-password' }> = ({ mode }) => {
  const { login, signup, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // State
  const [step, setStep] = useState<'initial' | 'details' | 'success'>('initial');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const isResetRequest = searchParams.get('reset') === 'true';

  useEffect(() => {
    // Reset state on mode change
    setStep('initial');
    setError('');
  }, [mode]);

  const handleAction = async () => {
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      // 1. UPDATE PASSWORD
      if (mode === 'update-password') {
        await updatePassword(password);
        setStep('success');
        return;
      } 
      
      // 2. RESET PASSWORD
      if (isResetRequest) {
        await resetPassword(email);
        setStep('success');
        return;
      } 
      
      // 3. LOGIN
      if (mode === 'login') {
        await login(email, password);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Robust Navigation: use maybeSingle and fallback to customer
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

          const role = profile?.role || 'customer';
          navigate(role === 'admin' ? '/admin' : '/dashboard');
        }
        return;
      } 
      
      // 4. SIGNUP FLOW
      if (mode === 'signup') {
        if (step === 'initial') {
           // Validate Email visually
           if (!email.includes('@') || email.length < 5) {
             throw new Error("Please enter a valid email address.");
           }
           setLoading(false);
           setStep('details');
           return;
        }

        if (step === 'details') {
           if (!firstName || !lastName || !password) {
             throw new Error("Please fill in all fields.");
           }
           const fullName = `${firstName} ${lastName}`.trim();
           await signup(email, fullName, password);
           setStep('success');
           return;
        }
      }
    } catch (err: any) {
      console.error("Auth action error:", err);
      setError(err.message || "An error occurred.");
    } finally {
      if (mode !== 'signup' || step !== 'initial') {
          setLoading(false);
      }
    }
  };

  // --- RENDER: SUCCESS STATE ---
  if (step === 'success') {
    return (
      <AuthLayout 
        title={mode === 'signup' ? "Successfully registered" : "Check your inbox"} 
        subtitle={mode === 'signup' ? "Start Your Free Trial!" : undefined}
      >
         <div className="text-center">
            {mode === 'signup' && (
              <h3 className="text-brand-500 font-medium text-lg mb-6 uppercase tracking-widest">
                WAITING FOR EMAIL CONFIRMATION
              </h3>
            )}
            
            <p className="text-gray-600 mb-2">
              {mode === 'update-password' 
                ? 'Your password has been updated successfully.'
                : 'A verification link has been sent to:'}
            </p>
            
            {mode !== 'update-password' && (
              <p className="font-bold text-xl text-gray-900 mb-8">{email}</p>
            )}

            {mode === 'signup' && (
               <div className="text-sm text-gray-500 space-y-4">
                 <p>Please verify your email to unlock the full potential of our software.</p>
                 <p>Check your inbox to proceed.<br/>Not there? It might be hiding in the spam folder!</p>
               </div>
            )}

            <div className="mt-10">
               {mode === 'update-password' ? (
                 <a href="/#/login" className="text-brand-500 font-bold hover:underline">Go to Login</a>
               ) : (
                 <button onClick={() => {}} className="text-brand-500 font-bold hover:underline">
                   Resend verification email
                 </button>
               )}
            </div>
         </div>
      </AuthLayout>
    );
  }

  // --- RENDER: FORM STATE ---
  
  const pageTitle = mode === 'update-password' ? 'Reset Password' : isResetRequest ? 'Forgot Password?' : mode === 'signup' ? 'Register' : 'Login';
  const pageSubtitle = mode === 'signup' ? "Let's get you started!" : mode === 'login' ? "Welcome to KOSMA" : undefined;

  return (
    <AuthLayout title={pageTitle} subtitle={pageSubtitle}>
      <div className="space-y-6 text-left w-full">
        
        {/* ERROR MESSAGE */}
        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* --- SIGNUP STEP 1 & LOGIN & RESET: EMAIL --- */}
        {(mode === 'login' || isResetRequest || (mode === 'signup' && step === 'initial')) && (
           <div className="space-y-2">
             <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Email</label>
             <input 
               type="email" 
               value={email} 
               onChange={e => setEmail(e.target.value)} 
               placeholder="max@mustermann.de" 
               autoFocus
               className="w-full p-4 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-gray-900 placeholder:text-gray-300" 
             />
           </div>
        )}

        {/* --- LOGIN & UPDATE PASSWORD: PASSWORD --- */}
        {(mode === 'login' && !isResetRequest) || mode === 'update-password' ? (
            <div className="space-y-2">
             <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                {mode === 'update-password' ? 'New Password' : 'Password'}
             </label>
             <input 
               type="password" 
               value={password} 
               onChange={e => setPassword(e.target.value)} 
               placeholder="••••••••"
               className="w-full p-4 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-gray-900 placeholder:text-gray-300" 
             />
           </div>
        ) : null}

        {/* --- SIGNUP STEP 2: NAMES & PASSWORD --- */}
        {mode === 'signup' && step === 'details' && (
           <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="space-y-2 relative">
                 <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Password</label>
                 <div className="flex flex-col md:flex-row gap-4 items-start">
                     <div className="w-full">
                        <input 
                           type="password" 
                           value={password} 
                           onChange={e => setPassword(e.target.value)} 
                           placeholder="••••••••"
                           autoFocus
                           className="w-full p-4 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-gray-900 placeholder:text-gray-300" 
                         />
                     </div>
                     {/* Hints positioned to the right on desktop, bottom on mobile */}
                     <ul className="text-[10px] text-gray-500 space-y-1 mt-1 md:mt-0 md:pt-2 md:w-64 shrink-0">
                        <li>• 8 characters minimum.</li>
                        <li>• At least 1 uppercase letter.</li>
                        <li>• At least 1 lowercase letter.</li>
                     </ul>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">First Name</label>
                     <input 
                       type="text" 
                       value={firstName} 
                       onChange={e => setFirstName(e.target.value)} 
                       className="w-full p-4 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-gray-900" 
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Last Name</label>
                     <input 
                       type="text" 
                       value={lastName} 
                       onChange={e => setLastName(e.target.value)} 
                       className="w-full p-4 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-gray-900" 
                     />
                  </div>
              </div>
           </div>
        )}

        {/* --- ACTIONS --- */}
        <button 
          onClick={handleAction} 
          disabled={loading}
          className="w-full py-4 mt-2 bg-white border-2 border-brand-500 text-brand-500 hover:bg-brand-50 rounded-xl font-bold text-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin w-5 h-5" /> : null}
          {mode === 'signup' && step === 'initial' ? 'Continue' : 
           mode === 'signup' ? 'Create Account' : 
           isResetRequest ? 'Send Reset Link' : 
           mode === 'update-password' ? 'Save Password' :
           'Log In'}
        </button>

        {/* --- LINKS --- */}
        <div className="text-center space-y-4 pt-2">
           {mode === 'login' && !isResetRequest && (
              <>
                  <div className="text-center">
                    <span className="text-sm text-gray-500">Not having a KOSMA account? </span>
                    <Link to="/signup" className="text-sm text-brand-500 hover:underline">Register now</Link>
                  </div>
                  <Link to="/login?reset=true" className="block text-sm text-gray-400 hover:text-brand-500">
                     Forgot password?
                  </Link>
              </>
           )}
           
           {mode === 'signup' && step === 'initial' && (
              <div className="text-center">
                <span className="text-sm text-gray-500">Already have an account? </span>
                <Link to="/login" className="text-sm text-brand-500 hover:underline">Log In</Link>
              </div>
           )}

           {(isResetRequest || (mode === 'signup' && step !== 'initial')) && (
              <button 
                onClick={() => isResetRequest ? navigate('/login') : setStep('initial')}
                className="text-sm text-brand-500 hover:underline flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
           )}
        </div>

      </div>
    </AuthLayout>
  );
};