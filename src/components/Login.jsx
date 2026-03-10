import React, { useState } from 'react';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [token, setToken] = useState('');
  const [fitFeedToken, setFitFeedToken] = useState('');
  const [showFitFeed, setShowFitFeed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim()) {
      alert('Please enter your bearer token');
      return;
    }
    setLoading(true);
    try {
      await onLogin(token, fitFeedToken.trim() || null);
    } catch (error) {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-200 font-sans relative overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-900/20 rounded-full blur-[120px] opacity-50"></div>
        <div className="absolute bottom-[0%] right-[-5%] w-[30vw] h-[30vw] bg-blue-900/10 rounded-full blur-[100px] opacity-50"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md">
          <div className="bg-gray-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-center mb-8">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10">
                  <Activity className="text-white" size={24} />
                </div>
                <span className="font-bold text-2xl tracking-tight text-white">
                  Pulse<span className="text-blue-500">Sync</span>
                </span>
              </div>
            </div>

            <h1 className="text-white font-bold text-2xl text-center mb-2">Welcome Back</h1>
            <p className="text-gray-400 text-center mb-8 text-sm">
              Enter your Peloton API bearer token to continue
            </p>

            <form onSubmit={handleSubmit}>
              {/* Peloton bearer token */}
              <div className="mb-4">
                <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">
                  Peloton Bearer Token
                </label>
                <textarea
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="eyJhbGci..."
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-blue-500/50 min-h-[100px] font-mono"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your token will be stored locally in your browser
                </p>
              </div>

              {/* Optional fit-feed token */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setShowFitFeed(!showFitFeed)}
                  className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors font-semibold uppercase tracking-wider mb-2"
                >
                  {showFitFeed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  Connected Device Token (optional)
                </button>

                {showFitFeed && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <textarea
                      value={fitFeedToken}
                      onChange={(e) => setFitFeedToken(e.target.value)}
                      placeholder="eyJhbGci... (Auth0 JWT from fit-feed.ge.onepeloton.com)"
                      className="w-full bg-black/20 border border-purple-500/20 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-purple-500/50 min-h-[100px] font-mono"
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Log in at{' '}
                      <a
                        href="https://fit-feed.ge.onepeloton.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-400 hover:text-purple-300 underline"
                      >
                        fit-feed.ge.onepeloton.com
                      </a>
                      , then copy the Auth0 JWT from{' '}
                      <span className="font-mono text-gray-400">
                        DevTools → Application → Local Storage
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-blue-500/20"
              >
                {loading ? 'Authenticating...' : 'Continue'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/5">
              <p className="text-xs text-gray-500 text-center">
                This is an internal tool for Peloton employees. Your token provides access to member data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
