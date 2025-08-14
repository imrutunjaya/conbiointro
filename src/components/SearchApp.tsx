import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Mic, 
  ArrowRight, 
  Sun, 
  Moon, 
  BookmarkPlus, 
  CheckSquare,
  ExternalLink,
  Star,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

interface Shortcut {
  title: string;
  url: string;
  fixed?: boolean;
}

interface SearchResult {
  title: string;
  link: string;
  snippet?: string;
}

interface SearchData {
  items?: SearchResult[];
  queries?: {
    nextPage?: [{ startIndex: number }];
    previousPage?: [{ startIndex: number }];
  };
}

const SearchApp: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [startIndex, setStartIndex] = useState(1);
  const [nextPageStart, setNextPageStart] = useState<number | null>(null);
  const [prevPageStart, setPrevPageStart] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  
  const stripRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  
  const API_KEY = "AIzaSyD82IhYVKT5KSrMJ9Qy_5067wzl8fB6_fE";
  const CX = "d07f5fa4e5bd340d3";
  const TODO_URL = "https://example.com/todo";
  const DAILY_LIMIT = 100;

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('study_theme') as 'light' | 'dark' || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Initialize shortcuts
  useEffect(() => {
    const savedShortcuts = localStorage.getItem('study_shortcuts_v5');
    if (savedShortcuts) {
      try {
        setShortcuts(JSON.parse(savedShortcuts));
      } catch {
        setShortcuts([]);
      }
    }
  }, []);

  // Initialize daily counter
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const dailyData = localStorage.getItem('study_daily_v1');
    
    if (dailyData) {
      try {
        const parsed = JSON.parse(dailyData);
        if (parsed.date === today) {
          setDailyCount(parsed.count || 0);
        } else {
          setDailyCount(0);
          localStorage.setItem('study_daily_v1', JSON.stringify({ date: today, count: 0 }));
        }
      } catch {
        setDailyCount(0);
      }
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);
      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript || '';
        if (text) {
          setQuery(text);
          handleSearch(text);
        }
      };
      
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('study_theme', newTheme);
  };

  const getHostnameTitle = (url: string): string => {
    try {
      const { hostname } = new URL(url);
      const base = hostname.replace(/^www\./, '').split('.')[0];
      return base.charAt(0).toUpperCase() + base.slice(1);
    } catch {
      return url;
    }
  };

  const getFavicon = (url: string): string => {
    try {
      const u = new URL(url);
      return `${u.origin}/favicon.ico`;
    } catch {
      return '';
    }
  };

  const addShortcut = (url: string, title?: string) => {
    try {
      new URL(url);
    } catch {
      alert('Invalid URL');
      return;
    }

    if (shortcuts.some(s => s.url === url)) {
      alert('Already saved');
      return;
    }

    const newShortcuts = [...shortcuts, { 
      title: title || getHostnameTitle(url), 
      url 
    }];
    setShortcuts(newShortcuts);
    localStorage.setItem('study_shortcuts_v5', JSON.stringify(newShortcuts));
  };

  const removeShortcut = (url: string) => {
    const newShortcuts = shortcuts.filter(s => s.url !== url);
    setShortcuts(newShortcuts);
    localStorage.setItem('study_shortcuts_v5', JSON.stringify(newShortcuts));
  };

  const incrementDailyCount = (): number => {
    const today = new Date().toISOString().slice(0, 10);
    const newCount = dailyCount + 1;
    setDailyCount(newCount);
    localStorage.setItem('study_daily_v1', JSON.stringify({ date: today, count: newCount }));
    return newCount;
  };

  const handleSearch = async (searchQuery?: string, start: number = 1) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    if (dailyCount >= DAILY_LIMIT) {
      const ddgUrl = `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;
      window.open(ddgUrl, '_blank');
      return;
    }

    setIsLoading(true);
    setCurrentQuery(q);
    setStartIndex(start);
    
    const count = incrementDailyCount();
    
    try {
      const url = new URL('https://www.googleapis.com/customsearch/v1');
      url.searchParams.set('key', API_KEY);
      url.searchParams.set('cx', CX);
      url.searchParams.set('q', q);
      url.searchParams.set('start', start.toString());
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data: SearchData = await response.json();
      setResults(data.items || []);
      setNextPageStart(data.queries?.nextPage?.[0]?.startIndex || null);
      setPrevPageStart(data.queries?.previousPage?.[0]?.startIndex || null);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceSearch = () => {
    if (recognitionRef.current && !isRecording) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Speech recognition error:', error);
      }
    }
  };

  const handleAddShortcut = () => {
    const url = prompt('Paste full URL (https://…) to save as shortcut:');
    if (url) {
      addShortcut(url.trim());
    }
  };

  const allShortcuts = [
    { title: 'To-Do', url: TODO_URL, fixed: true },
    ...shortcuts
  ];

  const remainingSearches = Math.max(0, DAILY_LIMIT - dailyCount);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100' 
        : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50 text-slate-900'
    }`}>
      {/* Topbar */}
      <div className={`sticky top-0 z-10 flex justify-between items-center gap-3 px-6 py-4 border-b transition-all backdrop-blur-md ${
        theme === 'dark'
          ? 'bg-slate-900/80 border-slate-700/50'
          : 'bg-white/80 border-slate-200/50'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border-2 transition-colors shadow-lg ${
            theme === 'dark' 
              ? 'bg-gradient-to-br from-blue-600 to-purple-600 border-blue-500/30 text-white' 
              : 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400/30 text-white'
          }`}>
            BI
          </div>
          <a 
            href="https://conbio.netlify.app/" 
            target="_blank" 
            rel="noopener"
            className={`font-bold px-4 py-2.5 rounded-xl border-2 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] ${
              theme === 'dark'
                ? 'bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50 shadow-xl backdrop-blur-sm'
                : 'bg-white/70 border-slate-300/50 hover:bg-white/90 shadow-lg backdrop-blur-sm'
            }`}
          >
            bioinformatics.Sync
          </a>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => window.open(TODO_URL, '_blank')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] ${
              theme === 'dark'
                ? 'bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50 backdrop-blur-sm'
                : 'bg-white/70 border-slate-300/50 hover:bg-white/90 backdrop-blur-sm'
            }`}
            title="Open To-Do"
          >
            <CheckSquare className="w-5 h-5" />
            <span className="hidden sm:inline">To-Do</span>
          </button>
          
          <button
            onClick={handleAddShortcut}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] ${
              theme === 'dark'
                ? 'bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50 backdrop-blur-sm'
                : 'bg-white/70 border-slate-300/50 hover:bg-white/90 backdrop-blur-sm'
            }`}
            title="Add Shortcut"
          >
            <BookmarkPlus className="w-5 h-5" />
            <span className="hidden sm:inline">Add</span>
          </button>
          
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] ${
              theme === 'dark'
                ? 'bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50 backdrop-blur-sm'
                : 'bg-white/70 border-slate-300/50 hover:bg-white/90 backdrop-blur-sm'
            }`}
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span className="hidden sm:inline">Theme</span>
          </button>
        </div>
      </div>

      {/* Hero Search */}
      <div className={`flex justify-center items-center py-12 px-6 border-b ${
        theme === 'dark' 
          ? 'bg-slate-800/30 border-slate-700/50 backdrop-blur-sm' 
          : 'bg-white/60 border-slate-200/50 backdrop-blur-sm'
      }`}>
        <div className="w-full max-w-5xl flex flex-col items-center gap-6">
          <div className={`w-4 h-4 rounded-full shadow-xl ${
            theme === 'dark'
              ? 'bg-gradient-to-r from-blue-400 to-purple-500 shadow-blue-500/40'
              : 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-blue-500/30'
          }`}></div>
          
          <div className={`w-full max-w-3xl flex items-center gap-4 px-6 py-4 rounded-2xl border-2 transition-all duration-300 shadow-2xl ${
            theme === 'dark'
              ? 'bg-slate-800/70 border-slate-600/50 hover:border-slate-500/70 focus-within:border-blue-500/70 focus-within:ring-4 focus-within:ring-blue-500/20 backdrop-blur-md'
              : 'bg-white/80 border-slate-300/50 hover:border-slate-400/70 focus-within:border-blue-500/70 focus-within:ring-4 focus-within:ring-blue-500/20 backdrop-blur-md'
          } hover:shadow-3xl focus-within:shadow-3xl focus-within:-translate-y-2`}>
            <Search className="w-6 h-6 text-slate-400 flex-shrink-0" />
            
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search Google…"
              className="flex-1 bg-transparent outline-none text-lg placeholder-slate-400 font-medium"
            />
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleVoiceSearch}
                className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg ${
                  isRecording
                    ? 'border-red-500/70 bg-red-500/10 text-red-500 shadow-red-500/30 animate-pulse'
                    : theme === 'dark'
                      ? 'border-slate-600/50 hover:border-slate-500/70 hover:bg-slate-700/50 backdrop-blur-sm'
                      : 'border-slate-300/50 hover:border-slate-400/70 hover:bg-slate-50/70 backdrop-blur-sm'
                }`}
                title="Voice search"
              >
                <Mic className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => handleSearch()}
                className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg ${
                  theme === 'dark'
                    ? 'border-slate-600/50 hover:border-blue-500/70 hover:bg-blue-500/10 backdrop-blur-sm'
                    : 'border-slate-300/50 hover:border-blue-500/70 hover:bg-blue-500/10 backdrop-blur-sm'
                }`}
                title="Search"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="text-sm text-slate-500 text-center font-medium">
            {remainingSearches} Google searches left today → then auto-switches to DuckDuckGo (resets daily).
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex justify-center px-6 py-8">
        <div className="w-full max-w-6xl space-y-8">
          {/* Shortcuts */}
          <div
            ref={stripRef}
            className={`flex gap-4 p-4 border-2 border-dashed rounded-2xl overflow-x-auto scroll-smooth select-none shadow-lg ${
              theme === 'dark'
                ? 'bg-slate-800/40 border-slate-600/50 backdrop-blur-sm'
                : 'bg-white/70 border-slate-300/50 backdrop-blur-sm'
            }`}
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {allShortcuts.map((shortcut, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 px-4 py-3 border-2 rounded-2xl cursor-pointer transition-all hover:-translate-y-2 hover:shadow-xl relative flex-shrink-0 ${
                  theme === 'dark'
                    ? 'border-slate-600/50 hover:border-blue-500/70 bg-slate-800/60 backdrop-blur-sm'
                    : 'border-slate-300/50 hover:border-blue-500/70 bg-white/80 backdrop-blur-sm'
                }`}
                style={{ scrollSnapAlign: 'start' }}
                onClick={() => window.open(shortcut.url, '_blank')}
                title={shortcut.url}
              >
                <img
                  src={getFavicon(shortcut.url)}
                  alt=""
                  className="w-6 h-6 rounded-lg shadow-sm"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    const placeholder = document.createElement('div');
                    placeholder.className = `w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shadow-sm ${
                      theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
                    }`;
                    placeholder.textContent = shortcut.title.charAt(0).toUpperCase();
                    target.parentNode?.replaceChild(placeholder, target);
                  }}
                />
                <span className="font-semibold whitespace-nowrap max-w-52 overflow-hidden text-ellipsis">
                  {shortcut.title}
                </span>
                
                {!shortcut.fixed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeShortcut(shortcut.url);
                    }}
                    className={`absolute -top-2 -right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs transition-all hover:scale-110 shadow-lg ${
                      theme === 'dark'
                        ? 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-red-600 hover:border-red-500'
                        : 'bg-white border-slate-300 text-slate-600 hover:bg-red-500 hover:text-white hover:border-red-400'
                    }`}
                    title="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="text-center py-12">
              <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl border-2 ${
                theme === 'dark'
                  ? 'bg-slate-800/60 border-slate-600/50 text-slate-300'
                  : 'bg-white/80 border-slate-300/50 text-slate-600'
              } backdrop-blur-sm shadow-lg`}>
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-medium">Searching…</span>
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && !isLoading && (
            <div className="space-y-6">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`border-2 rounded-2xl p-6 transition-all hover:shadow-2xl hover:-translate-y-1 ${
                    theme === 'dark'
                      ? 'border-slate-600/50 bg-slate-800/40 backdrop-blur-sm'
                      : 'border-slate-300/50 bg-white/80 backdrop-blur-sm'
                  }`}
                  style={{
                    animation: `fadeIn 0.3s ease ${index * 0.1}s both`
                  }}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-1">
                      <a
                        href={result.link}
                        target="_blank"
                        rel="noopener"
                        className="font-bold text-xl hover:underline block mb-2 leading-tight"
                      >
                        {result.title}
                      </a>
                      <div className="text-sm text-slate-500 mb-3 break-all font-medium">
                        {result.link}
                      </div>
                      {result.snippet && (
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                          {result.snippet}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${new URL(result.link).hostname}&sz=64`}
                        alt=""
                        className="w-12 h-12 rounded-xl shadow-lg border-2 border-slate-200/50 dark:border-slate-600/50"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const placeholder = document.createElement('div');
                          placeholder.className = `w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shadow-lg border-2 ${
                            theme === 'dark' 
                              ? 'bg-slate-700 text-slate-300 border-slate-600/50' 
                              : 'bg-slate-200 text-slate-700 border-slate-300/50'
                          }`;
                          try {
                            const hostname = new URL(result.link).hostname;
                            placeholder.textContent = hostname.charAt(0).toUpperCase();
                          } catch {
                            placeholder.textContent = '?';
                          }
                          target.parentNode?.replaceChild(placeholder, target);
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => window.open(result.link, '_blank')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all hover:scale-105 shadow-md ${
                        theme === 'dark'
                          ? 'border-slate-600/50 hover:border-blue-500/70 hover:bg-blue-500/10 backdrop-blur-sm'
                          : 'border-slate-300/50 hover:border-blue-500/70 hover:bg-blue-500/10 backdrop-blur-sm'
                      }`}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </button>
                    <button
                      onClick={() => addShortcut(result.link, result.title)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all hover:scale-105 shadow-md ${
                        theme === 'dark'
                          ? 'border-slate-600/50 hover:border-yellow-500/70 hover:bg-yellow-500/10 backdrop-blur-sm'
                          : 'border-slate-300/50 hover:border-yellow-500/70 hover:bg-yellow-500/10 backdrop-blur-sm'
                      }`}
                    >
                      <Star className="w-4 h-4" />
                      Save
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {(nextPageStart || prevPageStart) && !isLoading && (
            <div className="flex gap-4 justify-center pt-4">
              <button
                onClick={() => {
                  if (prevPageStart) {
                    handleSearch(currentQuery, prevPageStart);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                disabled={!prevPageStart}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 font-medium transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg ${
                  theme === 'dark'
                    ? 'border-slate-600/50 hover:border-slate-500/70 hover:bg-slate-700/50 disabled:hover:bg-transparent backdrop-blur-sm'
                    : 'border-slate-300/50 hover:border-slate-400/70 hover:bg-slate-50/70 disabled:hover:bg-transparent backdrop-blur-sm'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
                Prev
              </button>
              
              <button
                onClick={() => {
                  if (nextPageStart) {
                    handleSearch(currentQuery, nextPageStart);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                disabled={!nextPageStart}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 font-medium transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg ${
                  theme === 'dark'
                    ? 'border-slate-600/50 hover:border-slate-500/70 hover:bg-slate-700/50 disabled:hover:bg-transparent backdrop-blur-sm'
                    : 'border-slate-300/50 hover:border-slate-400/70 hover:bg-slate-50/70 disabled:hover:bg-transparent backdrop-blur-sm'
                }`}
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-slate-500 py-8 px-6 text-sm font-medium">
        Shortcuts are saved locally • Theme persists • To-Do opens your link.
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        html[data-theme="dark"] {
          color-scheme: dark;
        }
        
        html[data-theme="light"] {
          color-scheme: light;
        }
        
        .shadow-3xl {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </div>
  );
};

export default SearchApp;