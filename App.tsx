
import React, { useState, useEffect, useCallback } from 'react';
import { GreetingTheme } from './types';
import { generateCreativeGreeting, getGreetingStats } from './services/geminiService';
import Button from './components/Button';
import StatsChart from './components/StatsChart';

const App: React.FC = () => {
  const [greeting, setGreeting] = useState<string>("Hallo Welt");
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<{name: string, value: number}[]>([]);
  const [activeTheme, setActiveTheme] = useState<GreetingTheme>(GreetingTheme.CLASSIC);

  const fetchGreeting = useCallback(async (theme: GreetingTheme) => {
    setLoading(true);
    const newGreeting = await generateCreativeGreeting(theme);
    setGreeting(newGreeting);
    setLoading(false);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
        const data = await getGreetingStats();
        setStats(data);
    };
    loadInitialData();
  }, []);

  const handleThemeChange = (theme: GreetingTheme) => {
    setActiveTheme(theme);
    fetchGreeting(theme);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">W</div>
          <span className="text-xl font-bold tracking-tight">HalloWelt<span className="text-blue-500">.</span></span>
        </div>
        <div className="hidden md:flex space-x-8 text-sm font-medium text-slate-400">
          <a href="#home" className="hover:text-white transition-colors">Start</a>
          <a href="#explorer" className="hover:text-white transition-colors">Explorer</a>
          <a href="#stats" className="hover:text-white transition-colors">Statistik</a>
        </div>
        <Button variant="outline" className="hidden sm:block">Kontakt</Button>
      </nav>

      <main className="flex-grow pt-24">
        {/* Hero Section */}
        <section id="home" className="relative px-6 md:px-12 py-20 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] -z-10"></div>
          
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-block py-1 px-4 rounded-full glass text-blue-400 text-xs font-semibold uppercase tracking-widest mb-4">
              Powered by Gemini AI
            </div>
            <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-none">
              Sag <span className="text-gradient">Hallo Welt</span> <br />auf eine neue Weise.
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Willkommen beim ultimativen One-Pager. Wir verbinden klassische Web-Entwicklung mit modernster KI, um den ersten Gruß jedes Programmierers neu zu definieren.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
              <Button onClick={() => document.getElementById('explorer')?.scrollIntoView()} className="w-full sm:w-auto">
                Jetzt Entdecken
              </Button>
              <Button variant="outline" className="w-full sm:w-auto">
                <i className="fa-brands fa-github mr-2"></i> GitHub
              </Button>
            </div>
          </div>
        </section>

        {/* Explorer Section */}
        <section id="explorer" className="px-6 md:px-12 py-24 bg-slate-900/50">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl font-bold tracking-tight">Der KI-Generator</h2>
              <p className="text-slate-400 text-lg">
                Wähle ein Thema und lass die Gemini-KI eine einzigartige "Hallo Welt" Nachricht für dich kreieren. Jede Generation ist ein Unikat.
              </p>
              
              <div className="flex flex-wrap gap-2">
                {Object.values(GreetingTheme).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => handleThemeChange(theme)}
                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                      activeTheme === theme 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-2xl rounded-3xl -z-10"></div>
              <div className="glass p-8 md:p-12 rounded-3xl text-center min-h-[300px] flex flex-col justify-center items-center">
                {loading ? (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="text-slate-400 animate-pulse">KI denkt nach...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-4xl md:text-5xl font-serif italic text-white animate-fade-in">
                      "{greeting}"
                    </div>
                    <div className="text-slate-500 text-sm">
                      Stil: <span className="text-blue-400 font-mono uppercase">{activeTheme}</span>
                    </div>
                  </div>
                )}
                <div className="mt-8">
                  <Button 
                    variant="secondary" 
                    onClick={() => fetchGreeting(activeTheme)}
                    disabled={loading}
                    className="group"
                  >
                    Neu Generieren
                    <i className="fa-solid fa-wand-magic-sparkles ml-2 group-hover:rotate-12 transition-transform"></i>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Statistics Section */}
        <section id="stats" className="px-6 md:px-12 py-24">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold tracking-tight">Sprachen der Welt</h2>
              <p className="text-slate-400">Verbreitung von Grußformeln in verschiedenen Sprachen.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2 glass p-8 rounded-3xl">
                <h3 className="text-xl font-semibold mb-8 flex items-center">
                  <i className="fa-solid fa-chart-simple mr-3 text-blue-500"></i>
                  Nutzungsintensität
                </h3>
                <StatsChart data={stats} />
              </div>
              
              <div className="space-y-6">
                <div className="glass p-6 rounded-2xl flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500">
                    <i className="fa-solid fa-globe text-xl"></i>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Regionen</div>
                    <div className="text-2xl font-bold">195+</div>
                  </div>
                </div>
                <div className="glass p-6 rounded-2xl flex items-center space-x-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-500">
                    <i className="fa-solid fa-code text-xl"></i>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Codelines</div>
                    <div className="text-2xl font-bold">1.2M</div>
                  </div>
                </div>
                <div className="glass p-6 rounded-2xl flex items-center space-x-4">
                  <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center text-pink-500">
                    <i className="fa-solid fa-microchip text-xl"></i>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">KI Aufrufe</div>
                    <div className="text-2xl font-bold">∞</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 px-6 md:px-12 py-12 text-slate-500 text-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center text-xs font-bold">W</div>
            <span className="font-bold text-slate-300 tracking-tight">HalloWelt Explorer</span>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-white transition-colors">Impressum</a>
            <a href="#" className="hover:text-white transition-colors">Datenschutz</a>
            <a href="#" className="hover:text-white transition-colors">Cookies</a>
          </div>
          <div className="flex space-x-4">
            <a href="#" className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center hover:bg-slate-800 transition-colors"><i className="fa-brands fa-twitter"></i></a>
            <a href="#" className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center hover:bg-slate-800 transition-colors"><i className="fa-brands fa-github"></i></a>
            <a href="#" className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center hover:bg-slate-800 transition-colors"><i className="fa-brands fa-linkedin-in"></i></a>
          </div>
        </div>
        <div className="text-center mt-12 opacity-50">
          &copy; {new Date().getFullYear()} HalloWelt Explorer. Made with Gemini AI.
        </div>
      </footer>
    </div>
  );
};

export default App;
