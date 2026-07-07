import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Loader2, LogIn, Lock, Mail, AlertCircle } from 'lucide-react';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    // Firebase listener
    const unsubscribeFirebase = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Utilisateur'
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      if (unsubscribeFirebase) unsubscribeFirebase();
    };
  }, []);

  const login = async (idVal?: string, passVal?: string) => {
    const emailInput = idVal || identifier;
    const passInput = passVal || password;

    if (!emailInput || !passInput) {
      setFormError("Veuillez remplir tous les champs.");
      return;
    }

    setAuthLoading(true);
    setFormError(null);

    // Map Plain Username 'Admin' or 'admin' to 'admin@synergy.com'
    let email = emailInput.trim();
    if (!email.includes('@')) {
      if (email.toLowerCase() === 'admin') {
        email = 'admin@synergy.com';
      } else {
        email = `${email.toLowerCase()}@synergy.com`;
      }
    }

    try {
      // Firebase login
      const fbUserCredential = await signInWithEmailAndPassword(auth, email, passInput);
      if (fbUserCredential.user) {
        setUser({
          uid: fbUserCredential.user.uid,
          email: fbUserCredential.user.email,
          displayName: fbUserCredential.user.displayName || fbUserCredential.user.email?.split('@')[0] || 'Utilisateur'
        });
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      let errorMsg = "Échec de l'authentification.";
      if (
        error.message?.includes("user-not-found") || 
        error.message?.includes("wrong-password") || 
        error.message?.includes("invalid-credential") ||
        error.message?.includes("invalid_credentials")
      ) {
        errorMsg = "Identifiant ou mot de passe incorrect.";
      } else if (error.message) {
        errorMsg = error.message;
      }
      setFormError(errorMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setAuthLoading(true);
    setFormError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        setUser({
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || result.user.email?.split('@')[0] || 'Utilisateur'
        });
      }
    } catch (error: any) {
      console.error("Google Auth error:", error);
      let errorMsg = "Échec de l'authentification avec Google.";
      if (error.code === 'auth/popup-closed-by-user') {
        errorMsg = "La fenêtre de connexion Google a été fermée.";
      } else if (error.message) {
        errorMsg = error.message;
      }
      setFormError(errorMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-[#1A56DB] animate-spin mb-4" />
        <p className="text-sm font-black text-[#14120E] uppercase tracking-widest">Initialisation HiveFive...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-2xl border border-[#E4E0D8]">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[#1A56DB] rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-xl">
              🐝
            </div>
            <h1 className="text-2xl font-black text-[#14120E] uppercase tracking-tight">My Hive Five</h1>
            <p className="text-xs text-[#7A776F] mt-1 font-medium italic">Facturation Sécurisée Loi de Finances 2026</p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-[#14120E] uppercase tracking-widest mb-1">Identifiant ou Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#A8A49E]">
                  <Mail size={16} />
                </span>
                <input 
                  type="text"
                  placeholder="Ex: Admin ou admin@synergy.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl text-sm font-bold text-[#14120E] placeholder-[#C2BEB7] focus:outline-none focus:border-[#1A56DB] transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-[#14120E] uppercase tracking-widest mb-1">Mot de passe</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#A8A49E]">
                  <Lock size={16} />
                </span>
                <input 
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl text-sm font-bold text-[#14120E] placeholder-[#C2BEB7] focus:outline-none focus:border-[#1A56DB] transition-all"
                  required
                />
              </div>
            </div>

            {formError && (
              <div className="flex items-start gap-2 bg-[#FEF2F2] border border-[#FCA5A5] p-3 rounded-xl text-xs text-[#991B1B] font-bold">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <button 
              type="submit"
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-2 bg-[#14120E] text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {authLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <LogIn size={16} />
                  Se connecter
                </>
              )}
            </button>
          </form>

          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E4E0D8]"></div>
            </div>
            <span className="relative px-3 bg-white text-[10px] font-black text-[#A8A49E] uppercase tracking-widest">Ou</span>
          </div>

          <button 
            type="button"
            onClick={loginWithGoogle}
            disabled={authLoading}
            className="w-full flex items-center justify-center gap-3 bg-[#FAF8F4] text-[#14120E] border border-[#E4E0D8] py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#F1EFEA] transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {authLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
                Se connecter avec Google
              </>
            )}
          </button>

          <p className="mt-8 text-center text-[10px] text-[#B0ADA5] font-bold uppercase tracking-widest leading-loose">
            Vos données sont stockées de manière sécurisée sur Firebase.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a FirebaseProvider');
  }
  return context;
};
