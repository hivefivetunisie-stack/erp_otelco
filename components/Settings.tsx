import React, { useState, useRef, useEffect } from 'react';
import { IssuerInfo as Issuer, BankAccount } from '../types';
import { 
  Save, 
  Camera, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Landmark, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  Database, 
  Cloud, 
  Key, 
  Copy, 
  Check, 
  Play, 
  RefreshCw, 
  AlertCircle, 
  ShieldCheck, 
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getSupabaseConfig, 
  saveSupabaseConfig, 
  getDatabaseProvider, 
  setDatabaseProvider, 
  testSupabaseConnection, 
  TABLES_INFO, 
  migrateCollection, 
  SUPABASE_SQL_SCHEMA,
  resetSupabaseClient
} from '../services/supabase';

interface SettingsProps {
  issuers: Issuer[];
  activeId: string;
  onSetActive: (id: string) => void;
  onSaveIssuer: (issuer: Issuer) => void;
  onDeleteIssuer: (id: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ issuers, activeId, onSetActive, onSaveIssuer, onDeleteIssuer }) => {
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'supabase'>('profile');

  // Supabase states
  const [sbConfig, setSbConfig] = useState(getSupabaseConfig());
  const [dbProvider, setDbProvider] = useState<'firebase' | 'supabase'>(getDatabaseProvider());
  const [connStatus, setConnStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });
  const [testingConn, setTestingConn] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Migration states
  const [migrationActive, setMigrationActive] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<{ 
    [key: string]: { status: 'idle' | 'loading' | 'success' | 'error'; count: number; error?: string } 
  }>(() => {
    const progress: any = {};
    TABLES_INFO.forEach(t => {
      progress[t.collection] = { status: 'idle', count: 0 };
    });
    return progress;
  });

  const activeIssuer = issuers.find(i => i.id === activeId) || {
    id: 'iss-' + Date.now(),
    name: '',
    address: '',
    mf: '',
    rc: '',
    phone: '',
    email: '',
    bankAccounts: {
        dinars: { label: 'Compte TND', bankName: '', rib: '', iban: '', swift: '', nature: 'Courant' },
        devises: { label: 'Compte Devises', bankName: '', rib: '', iban: '', swift: '', nature: 'Export' }
    }
  } as Issuer;

  const [formData, setFormData] = useState<Issuer>(activeIssuer);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync formData when activeId changes
  useEffect(() => {
    setFormData(activeIssuer);
  }, [activeId, issuers]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("L'image est trop lourde (max 1Mo)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveIssuer(formData);
    alert("Informations de l'entreprise enregistrées !");
  };

  const updateBankAccount = (type: 'dinars' | 'devises', field: keyof BankAccount, value: string) => {
    const accounts = { ...formData.bankAccounts };
    // @ts-ignore
    accounts[type] = { ...accounts[type], [field]: value };
    setFormData({ ...formData, bankAccounts: accounts as any });
  };

  const handleTestConnection = async () => {
    if (!sbConfig.url || !sbConfig.anonKey) {
      setConnStatus({ type: 'error', message: 'Veuillez renseigner le lien API URL et la clé de sécurité Anon Key.' });
      return;
    }
    setTestingConn(true);
    setConnStatus({ type: 'idle', message: 'Vérification de la connexion...' });
    
    // Refresh cached client instance
    saveSupabaseConfig(sbConfig);
    resetSupabaseClient();

    const res = await testSupabaseConnection(sbConfig.url, sbConfig.anonKey);
    if (res.success) {
      setConnStatus({ type: 'success', message: res.message });
    } else {
      setConnStatus({ type: 'error', message: res.message });
    }
    setTestingConn(false);
  };

  const handleSaveSbConfig = () => {
    saveSupabaseConfig(sbConfig);
    resetSupabaseClient();
    alert('Identifiants Supabase enregistrés avec succès !');
  };

  const handleToggleProvider = (prov: 'firebase' | 'supabase') => {
    if (prov === 'supabase') {
      const config = getSupabaseConfig();
      if (!config.url || !config.anonKey) {
        alert('Veuillez d\'abord configurer et enregistrer vos identifiants Supabase.');
        return;
      }
    }
    setDatabaseProvider(prov);
    setDbProvider(prov);
    alert(`Moteur de base de données configuré sur : ${prov === 'firebase' ? 'Firebase Firestore' : 'Supabase PostgreSQL'}. Veuillez rafraîchir l'application si nécessaire.`);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleStartMigration = async () => {
    const config = getSupabaseConfig();
    if (!config.url || !config.anonKey) {
      alert('Veuillez d\'abord renseigner vos identifiants Supabase.');
      return;
    }

    if (!window.confirm('Voulez-vous lancer la migration de toutes vos données Firebase vers Supabase ? Les données correspondantes dans Supabase seront mises à jour.')) {
      return;
    }

    setMigrationActive(true);
    
    // Reset migration progress states
    const initialProgress: any = {};
    TABLES_INFO.forEach(t => {
      initialProgress[t.collection] = { status: 'idle', count: 0 };
    });
    setMigrationProgress(initialProgress);

    // Run migration table by table
    for (const tableItem of TABLES_INFO) {
      setMigrationProgress(prev => ({
        ...prev,
        [tableItem.collection]: { ...prev[tableItem.collection], status: 'loading' }
      }));

      try {
        const count = await migrateCollection(
          tableItem.collection, 
          tableItem.table, 
          tableItem.pk, 
          (progCount) => {
            setMigrationProgress(prev => ({
              ...prev,
              [tableItem.collection]: { ...prev[tableItem.collection], count: progCount }
            }));
          }
        );

        setMigrationProgress(prev => ({
          ...prev,
          [tableItem.collection]: { status: 'success', count }
        }));
      } catch (err: any) {
        console.error(`Migration error on ${tableItem.collection}:`, err);
        setMigrationProgress(prev => ({
          ...prev,
          [tableItem.collection]: { 
            status: 'error', 
            count: prev[tableItem.collection].count, 
            error: err.message || 'Erreur inconnue' 
          }
        }));
      }
    }

    setMigrationActive(false);
    alert('Migration des données vers Supabase terminée ! Vérifiez le tableau des statuts ci-dessous pour confirmer les détails.');
  };

  const activeInputStyle = "w-full pl-10 pr-4 py-3 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl text-xs font-bold outline-none focus:border-[#1A56DB] transition-all";
  const labelStyle = "text-[10px] font-black text-[#7A776F] uppercase tracking-widest mb-1.5 block";

  return (
    <div className="flex flex-col min-h-[calc(100vh-100px)]">
      {/* Settings Tab Navigation header */}
      <div className="bg-white border-b border-[#E4E0D8] px-8 py-4 flex gap-4 items-center">
        <button
          onClick={() => setActiveSettingsTab('profile')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
            activeSettingsTab === 'profile' 
              ? 'bg-[#1A56DB] text-white shadow-md' 
              : 'bg-stone-50 hover:bg-stone-100 text-[#7A776F]'
          }`}
        >
          🏢 CONFIGURATION PROFIL
        </button>
        <button
          onClick={() => setActiveSettingsTab('supabase')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
            activeSettingsTab === 'supabase' 
              ? 'bg-[#1A56DB] text-white shadow-md' 
              : 'bg-stone-50 hover:bg-stone-100 text-[#7A776F]'
          }`}
        >
          ⚡ SUPABASE & DEPLOYMENT
        </button>
      </div>

      {activeSettingsTab === 'profile' ? (
        <div className="flex flex-col lg:flex-row flex-1">
          {/* Companies Sidebar */}
          <div className="w-full lg:w-80 bg-white border-r border-[#E4E0D8] p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-[#14120E] uppercase tracking-widest">Mes Entreprises</h3>
              <button 
                onClick={() => onSetActive('new-' + Date.now())}
                className="p-1.5 bg-[#1A56DB] text-white rounded-lg hover:bg-[#1648C4] transition-all"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {issuers.map(i => (
                <div 
                  key={i.id}
                  onClick={() => onSetActive(i.id)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between group ${activeId === i.id ? 'bg-[#EBF2FF] border-[#1A56DB]' : 'bg-white border-[#E4E0D8] hover:border-[#1A56DB]/30'}`}
                >
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-[#F1EDE5] flex items-center justify-center text-[10px] font-black text-[#1A56DB] overflow-hidden">
                        {i.logoUrl ? <img src={i.logoUrl} className="w-full h-full object-cover" /> : i.name.charAt(0)}
                     </div>
                     <div>
                        <p className={`text-[11px] font-black uppercase tracking-tight truncate max-w-[140px] ${activeId === i.id ? 'text-[#1A56DB]' : 'text-[#14120E]'}`}>{i.name || 'Nouvelle Entreprise'}</p>
                        <p className="text-[9px] text-[#7A776F] font-bold">MF: {i.mf || '—'}</p>
                     </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteIssuer(i.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-[#C0280F] hover:bg-[#FFF1EE] rounded-md transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Settings Form */}
          <div className="flex-1 p-8 lg:p-12 overflow-y-auto">
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-12">
               <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black text-[#14120E] uppercase tracking-tight">Configuration Profile</h2>
                    <p className="text-sm text-[#7A776F] mt-1 font-medium italic">Gérez les détails légaux et financiers de votre entreprise.</p>
                  </div>
                  <button 
                    type="submit"
                    className="flex items-center gap-2 px-8 py-3 bg-[#1A56DB] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-[#1648C4] transition-all active:scale-95"
                  >
                    <Save size={18} /> Sauvegarder
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div className="space-y-4">
                     <label className={labelStyle}>Identité Visuelle</label>
                     <div 
                       onClick={() => fileInputRef.current?.click()}
                       className="aspect-square bg-[#FAF8F4] border-2 border-dashed border-[#E4E0D8] rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:border-[#1A56DB] group relative overflow-hidden"
                     >
                        {formData.logoUrl ? (
                          <img src={formData.logoUrl} className="w-full h-full object-contain p-4" />
                        ) : (
                          <>
                            <Camera size={32} className="text-[#B0ADA5] group-hover:text-[#1A56DB] transition-colors mb-2" />
                            <span className="text-[10px] font-black text-[#7A776F] uppercase tracking-widest text-center px-4">Upload Logo</span>
                          </>
                        )}
                     </div>
                     <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                  </div>

                  <div className="md:col-span-2 space-y-6">
                     <div>
                        <label className={labelStyle}>Raison Sociale / Nom Commercial</label>
                        <div className="relative">
                          <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1A56DB]" />
                          <input 
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            placeholder="Ex: HiveFive IT Solutions"
                            className={activeInputStyle}
                          />
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelStyle}>Matricule Fiscal</label>
                          <input 
                            value={formData.mf}
                            onChange={e => setFormData({...formData, mf: e.target.value})}
                            placeholder="Ex: 1234567/A/M/000"
                            className="w-full px-4 py-3 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl text-xs font-mono font-bold outline-none focus:border-[#1A56DB]"
                          />
                        </div>
                        <div>
                          <label className={labelStyle}>Registre de Commerce (RC)</label>
                          <input 
                            value={formData.rc}
                            onChange={e => setFormData({...formData, rc: e.target.value})}
                            className="w-full px-4 py-3 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl text-xs font-bold outline-none focus:border-[#1A56DB]"
                          />
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelStyle}>Téléphone</label>
                          <div className="relative">
                            <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1A56DB]" />
                            <input 
                              value={formData.phone}
                              onChange={e => setFormData({...formData, phone: e.target.value})}
                              className={activeInputStyle}
                            />
                          </div>
                        </div>
                        <div>
                          <label className={labelStyle}>Email</label>
                          <div className="relative">
                            <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1A56DB]" />
                            <input 
                              value={formData.email}
                              onChange={e => setFormData({...formData, email: e.target.value})}
                              className={activeInputStyle}
                            />
                          </div>
                        </div>
                     </div>

                     <div>
                        <label className={labelStyle}>Adresse du Siège</label>
                        <div className="relative">
                          <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1A56DB]" />
                          <input 
                            value={formData.address}
                            onChange={e => setFormData({...formData, address: e.target.value})}
                            className={activeInputStyle}
                          />
                        </div>
                     </div>
                  </div>
               </div>

               <div className="pt-12 border-t border-[#E4E0D8] space-y-8">
                  <div className="flex items-center gap-3">
                    <Landmark className="text-[#1A56DB]" size={24} />
                    <h3 className="text-lg font-black text-[#14120E] uppercase tracking-tight">Coordonnées Bancaires</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* Local Account */}
                     <div className="bg-white p-6 rounded-3xl border border-[#E4E0D8] shadow-sm space-y-4">
                        <span className="px-3 py-1 bg-[#EBF2FF] text-[#1A56DB] text-[9px] font-black rounded-full uppercase tracking-widest">Compte TND</span>
                        <div className="space-y-4">
                           <div className="grid grid-cols-2 gap-3">
                              <div>
                                 <label className={labelStyle}>Banque</label>
                                 <input value={formData.bankAccounts?.dinars?.bankName || ''} onChange={e => updateBankAccount('dinars', 'bankName', e.target.value)} className="w-full px-3 py-2 bg-[#FAF8F4] border border-[#E4E0D8] rounded-lg text-xs outline-none" />
                              </div>
                              <div>
                                 <label className={labelStyle}>Nature</label>
                                 <input value={formData.bankAccounts?.dinars?.nature || ''} onChange={e => updateBankAccount('dinars', 'nature', e.target.value)} className="w-full px-3 py-2 bg-[#FAF8F4] border border-[#E4E0D8] rounded-lg text-xs outline-none" />
                              </div>
                           </div>
                           <div>
                              <label className={labelStyle}>RIB (20 Chiffres)</label>
                              <input value={formData.bankAccounts?.dinars?.rib || ''} onChange={e => updateBankAccount('dinars', 'rib', e.target.value)} className="w-full px-3 py-2 bg-[#FAF8F4] border border-[#E4E0D8] rounded-lg text-xs font-mono font-bold outline-none" />
                           </div>
                        </div>
                     </div>

                     {/* Export Account */}
                     <div className="bg-white p-6 rounded-3xl border border-[#E4E0D8] shadow-sm space-y-4">
                        <span className="px-3 py-1 bg-[#E6F8F4] text-[#0E7866] text-[9px] font-black rounded-full uppercase tracking-widest">Compte Devises</span>
                        <div className="space-y-4">
                           <div className="grid grid-cols-2 gap-3">
                              <div>
                                 <label className={labelStyle}>Banque</label>
                                 <input value={formData.bankAccounts?.devises?.bankName || ''} onChange={e => updateBankAccount('devises', 'bankName', e.target.value)} className="w-full px-3 py-2 bg-[#FAF8F4] border border-[#E4E0D8] rounded-lg text-xs outline-none" />
                              </div>
                              <div>
                                 <label className={labelStyle}>SWIFT</label>
                                 <input value={formData.bankAccounts?.devises?.swift || ''} onChange={e => updateBankAccount('devises', 'swift', e.target.value)} className="w-full px-3 py-2 bg-[#FAF8F4] border border-[#E4E0D8] rounded-lg text-xs font-mono outline-none" />
                              </div>
                           </div>
                           <div>
                              <label className={labelStyle}>IBAN</label>
                              <input value={formData.bankAccounts?.devises?.iban || ''} onChange={e => updateBankAccount('devises', 'iban', e.target.value)} className="w-full px-3 py-2 bg-[#FAF8F4] border border-[#E4E0D8] rounded-lg text-xs font-mono font-bold outline-none" />
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 p-8 lg:p-12 overflow-y-auto bg-stone-50">
          <div className="max-w-4xl mx-auto space-y-10">
            {/* Supabase Intro Banner */}
            <div className="bg-white p-8 rounded-3xl border border-[#E4E0D8] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#1A56DB]">
                  <Database size={24} />
                  <span className="font-black uppercase tracking-widest text-[10px]">Supabase Cloud Suite</span>
                </div>
                <h3 className="text-xl font-black text-[#14120E] uppercase tracking-tight">Associer l'application à Supabase</h3>
                <p className="text-xs text-[#7A776F] font-bold max-w-xl">
                  Préparez et migrez votre base de données locale/Firebase vers une infrastructure relationnelle PostgreSQL hébergée sur Supabase. 
                  Une fois configuré, vous pouvez basculer le moteur de stockage d'un simple clic !
                </p>
              </div>
              <div className="flex bg-[#F1EDE5] p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => handleToggleProvider('firebase')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                    dbProvider === 'firebase' 
                      ? 'bg-[#1A56DB] text-white shadow-md' 
                      : 'text-[#7A776F] hover:text-[#14120E]'
                  }`}
                >
                  Firebase Actif
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleProvider('supabase')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                    dbProvider === 'supabase' 
                      ? 'bg-[#1D4ED8] text-white shadow-md' 
                      : 'text-[#7A776F] hover:text-[#14120E]'
                  }`}
                >
                  Supabase Actif
                </button>
              </div>
            </div>

            {/* Supabase Credentials Card */}
            <div className="bg-white p-8 rounded-3xl border border-[#E4E0D8] shadow-sm space-y-6">
              <div className="flex items-center gap-2">
                <Key className="text-[#1A56DB]" size={20} />
                <h4 className="text-sm font-black text-[#14120E] uppercase tracking-wider">Identifiants de Connexion Supabase</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelStyle}>SUPABASE API URL</label>
                  <input
                    type="text"
                    value={sbConfig.url}
                    onChange={e => setSbConfig({ ...sbConfig, url: e.target.value })}
                    placeholder="https://your-project.supabase.co"
                    className="w-full px-4 py-3 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl text-xs font-mono font-bold outline-none focus:border-[#1A56DB] transition-all"
                  />
                </div>
                <div>
                  <label className={labelStyle}>SUPABASE ANON KEY</label>
                  <input
                    type="password"
                    value={sbConfig.anonKey}
                    onChange={e => setSbConfig({ ...sbConfig, anonKey: e.target.value })}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-key-here"
                    className="w-full px-4 py-3 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl text-xs font-mono font-bold outline-none focus:border-[#1A56DB] transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveSbConfig}
                  className="px-6 py-2.5 bg-[#FAF8F4] hover:bg-[#F1EDE5] text-[#14120E] border border-[#E4E0D8] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                >
                  Enregistrer les Clés
                </button>
                <button
                  type="button"
                  disabled={testingConn}
                  onClick={handleTestConnection}
                  className="px-6 py-2.5 bg-[#1A56DB] hover:bg-[#1648C4] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-1.5"
                >
                  {testingConn ? <RefreshCw size={12} className="animate-spin" /> : null}
                  Tester la connexion
                </button>
              </div>

              {connStatus.message && (
                <div className={`p-4 rounded-xl flex items-start gap-2.5 text-xs font-bold ${
                  connStatus.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : connStatus.type === 'error'
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-[#FAF8F4] text-stone-700 border border-[#E4E0D8]'
                }`}>
                  {connStatus.type === 'success' ? <ShieldCheck className="shrink-0 mt-0.5 text-emerald-600" size={16} /> : <AlertCircle className="shrink-0 mt-0.5 text-rose-600" size={16} />}
                  <div>{connStatus.message}</div>
                </div>
              )}
            </div>

            {/* SQL script Block */}
            <div className="bg-white p-8 rounded-3xl border border-[#E4E0D8] shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Layers className="text-[#1A56DB]" size={20} />
                  <h4 className="text-sm font-black text-[#14120E] uppercase tracking-wider">1. Initialisation des Tables (SQL Editor)</h4>
                </div>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="flex items-center gap-1.5 px-4 py-2 bg-stone-50 border border-[#E4E0D8] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-stone-100 transition-all text-[#14120E]"
                >
                  {copiedSql ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  {copiedSql ? 'Copié !' : 'Copier le SQL'}
                </button>
              </div>
              <p className="text-xs text-[#7A776F] font-bold">
                Pour que la base fonctionne sur Supabase, vous devez copier le script SQL ci-dessous, puis le coller et l'exécuter dans l'onglet **SQL Editor** de votre projet Supabase. 
                Ce script va créer les 17 tables et configurer la sécurité Row-Level (RLS).
              </p>
              <div className="max-h-60 overflow-y-auto bg-stone-900 rounded-2xl p-4 text-left font-mono text-[10px] text-stone-300 border border-stone-800">
                <pre>{SUPABASE_SQL_SCHEMA}</pre>
              </div>
            </div>

            {/* Data Migration Center */}
            <div className="bg-white p-8 rounded-3xl border border-[#E4E0D8] shadow-sm space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Cloud className="text-[#1A56DB]" size={20} />
                    <h4 className="text-sm font-black text-[#14120E] uppercase tracking-wider">2. Centre de Migration des Données</h4>
                  </div>
                  <p className="text-xs text-[#7A776F] font-bold">
                    Transférez l'ensemble des collections existantes de Firebase Firestore directement vers Supabase.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={migrationActive}
                  onClick={handleStartMigration}
                  className="flex items-center gap-2 px-6 py-3 bg-[#1A56DB] hover:bg-[#1648C4] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {migrationActive ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                  {migrationActive ? 'Migration en cours...' : 'Lancer la migration complète'}
                </button>
              </div>

              {/* Grid or Table of Collections Migration */}
              <div className="border border-[#E4E0D8] rounded-2xl overflow-hidden bg-[#FAF8F4]">
                <div className="grid grid-cols-3 bg-stone-100 px-6 py-3 border-b border-[#E4E0D8] text-[9px] font-black uppercase text-[#7A776F] tracking-widest">
                  <div>Collection Firestore</div>
                  <div>Table Supabase</div>
                  <div className="text-right">Statut Migration</div>
                </div>

                <div className="divide-y divide-[#E4E0D8] max-h-[400px] overflow-y-auto">
                  {TABLES_INFO.map(item => {
                    const prog = migrationProgress[item.collection];
                    return (
                      <div key={item.collection} className="grid grid-cols-3 px-6 py-3.5 items-center text-xs">
                        <div className="font-bold text-[#14120E]">{item.label}</div>
                        <div className="font-mono text-[10px] text-stone-500">"{item.table}"</div>
                        <div className="text-right flex items-center justify-end gap-1.5 font-bold">
                          {prog?.status === 'idle' && (
                            <span className="text-[#7A776F] bg-stone-100 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">En attente</span>
                          )}
                          {prog?.status === 'loading' && (
                            <span className="text-[#1A56DB] bg-[#EBF2FF] px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
                              <RefreshCw size={10} className="animate-spin" /> {prog.count} doc(s)
                            </span>
                          )}
                          {prog?.status === 'success' && (
                            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                              <Check size={10} /> {prog.count} migré(s)
                            </span>
                          )}
                          {prog?.status === 'error' && (
                            <span className="text-[#C0280F] bg-[#FFF1EE] px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1" title={prog.error}>
                              <AlertCircle size={10} /> Échec
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
