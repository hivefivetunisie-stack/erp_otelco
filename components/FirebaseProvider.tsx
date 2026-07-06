
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Loader2, LogIn, Lock, Mail, AlertCircle, Database } from 'lucide-react';
import { getDatabaseProvider, getSupabaseClient } from '../services/supabase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<'firebase' | 'supabase'>('firebase');

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const currentProvider = getDatabaseProvider();
    setProvider(currentProvider);

    let unsubscribeFirebase: (() => void) | null = null;
    let unsubscribeSupabase: (() => void) | null = null;

    if (currentProvider === 'supabase') {
      const supabase = getSupabaseClient();
      if (supabase) {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            const sbUser = session.user;
            setUser({
              uid: sbUser.id,
              email: sbUser.email || null,
              displayName: sbUser.user_metadata?.displayName || sbUser.email?.split('@')[0] || 'Utilisateur'
            });
          } else {
            setUser(null);
          }
          setLoading(false);
        }).catch(err => {
          console.error("Supabase getSession failed:", err);
          setLoading(false);
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (session) {
            const sbUser = session.user;
            setUser({
              uid: sbUser.id,
              email: sbUser.email || null,
              displayName: sbUser.user_metadata?.displayName || sbUser.email?.split('@')[0] || 'Utilisateur'
            });
          } else {
            setUser(null);
          }
        });

        unsubscribeSupabase = () => {
          subscription.unsubscribe();
        };
      } else {
        setUser(null);
        setLoading(false);
      }
    } else {
      // Firebase listener
      unsubscribeFirebase = onAuthStateChanged(auth, (fbUser) => {
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
    }

    return () => {
      if (unsubscribeFirebase) unsubscribeFirebase();
      if (unsubscribeSupabase) unsubscribeSupabase();
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
      const currentProvider = getDatabaseProvider();
      if (currentProvider === 'supabase') {
        const supabase = getSupabaseClient();
        if (!supabase) {
          throw new Error("Supabase n'est pas configuré. Veuillez d'abord ajouter votre configuration Supabase dans les paramètres de l'application ou utiliser Firebase.");
        }
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: passInput
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data?.user) {
          setUser({
            uid: data.user.id,
            email: data.user.email || null,
            displayName: data.user.user_metadata?.displayName || data.user.email?.split('@')[0] || 'Utilisateur'
          });
        }
      } else {
        // Firebase login
        const fbUserCredential = await signInWithEmailAndPassword(auth, email, passInput);
        if (fbUserCredential.user) {
          setUser({
            uid: fbUserCredential.user.uid,
            email: fbUserCredential.user.email,
            displayName: fbUserCredential.user.displayName || fbUserCredential.user.email?.split('@')[0] || 'Utilisateur'
          });
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      let errorMsg = "Échec de l'authentification.";
      if (
        error.message?.includes("Invalid login credentials") || 
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

  const logout = async () => {
    try {
      const currentProvider = getDatabaseProvider();
      if (currentProvider === 'supabase') {
        const supabase = getSupabaseClient();
        if (supabase) {
          await supabase.auth.signOut();
        }
      } else {
        await firebaseSignOut(auth);
      }
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

          <div className="mt-6 pt-5 border-t border-[#F1EFEA] text-left">
            <h3 className="flex items-center gap-1.5 text-[11px] font-black text-[#1A56DB] uppercase tracking-widest mb-2">
              <Database size={12} /> Mode de Connexion : {provider === 'supabase' ? 'Supabase' : 'Firebase'}
            </h3>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-[11px] leading-relaxed text-[#475569]">
              <span className="font-bold text-[#1e293b]">💡 Comment configurer vos accès :</span>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>
                  Sur votre tableau de bord <strong>Supabase</strong>, allez dans <strong>Authentication</strong> &gt; <strong>Users</strong>.
                </li>
                <li>
                  Ajoutez un utilisateur avec l'adresse email <code className="bg-[#EDF2F7] px-1.5 py-0.5 rounded font-mono text-[10px] text-red-600">admin@synergy.com</code> et le mot de passe <code className="bg-[#EDF2F7] px-1.5 py-0.5 rounded font-mono text-[10px] text-red-600">Synergy@2026</code>.
                </li>
                <li>
                  Ensuite, vous pourrez vous connecter en écrivant simplement <strong className="text-[#14120E]">Admin</strong> ou l'adresse email complète.
                </li>
              </ul>
            </div>
          </div>

          <p className="mt-6 text-center text-[10px] text-[#B0ADA5] font-bold uppercase tracking-widest leading-loose">
            Vos données sont chiffrées & stockées en Tunisie (Cloud Global).
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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
