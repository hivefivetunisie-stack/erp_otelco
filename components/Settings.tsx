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
  Plus
} from 'lucide-react';

const compressBase64Image = (base64Str: string, maxDimension = 300): Promise<string> => {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image/')) {
      resolve(base64Str);
      return;
    }
    // If the base64 string is already very small (less than 100KB, which is approx 133,000 base64 characters), no need to compress
    if (base64Str.length < 133000) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDimension) {
          height *= maxDimension / width;
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width *= maxDimension / height;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        let finalDataUrl = canvas.toDataURL('image/png');
        if (finalDataUrl.length > 150000) {
          finalDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        }
        resolve(finalDataUrl);
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

interface SettingsProps {
  issuers: Issuer[];
  activeId: string;
  onSetActive: (id: string) => void;
  onSaveIssuer: (issuer: Issuer) => Promise<void> | void;
  onDeleteIssuer: (id: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ issuers, activeId, onSetActive, onSaveIssuer, onDeleteIssuer }) => {
  const [localActiveId, setLocalActiveId] = useState<string>(activeId);

  const activeIssuer = issuers.find(i => i.id === localActiveId) || {
    id: localActiveId.startsWith('new-') ? localActiveId.replace('new-', 'iss-') : (localActiveId || 'iss-' + Date.now()),
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

  // Sync localActiveId when parent activeId prop changes (except for transient new- items)
  useEffect(() => {
    if (activeId && !activeId.startsWith('new-')) {
      setLocalActiveId(activeId);
    }
  }, [activeId]);

  // Sync formData when localActiveId or issuers list changes
  useEffect(() => {
    setFormData(activeIssuer);
  }, [localActiveId, issuers]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_size = 300; // max size for logo width/height (plenty for high-quality invoice displays)
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            
            // Try PNG first (to keep transparency)
            let finalDataUrl = canvas.toDataURL('image/png');
            
            // If the PNG data URI is still larger than 150KB, let's compress it as JPEG with 0.8 quality to save space
            if (finalDataUrl.length > 150000) {
              finalDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            }
            
            setFormData({ ...formData, logoUrl: finalDataUrl });
          } else {
            setFormData({ ...formData, logoUrl: reader.result as string });
          }
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Veuillez saisir le nom ou raison sociale de l'entreprise.");
      return;
    }
    try {
      let finalData = { ...formData };
      if (finalData.logoUrl && finalData.logoUrl.startsWith('data:image/')) {
        // Compress the image to ensure it easily fits within Firestore's 1MB limit
        finalData.logoUrl = await compressBase64Image(finalData.logoUrl);
      }
      await onSaveIssuer(finalData);
      alert("Informations de l'entreprise enregistrées avec succès !");
    } catch (error: any) {
      console.error("Error saving issuer:", error);
      const detail = error instanceof Error ? error.message : String(error);
      alert(`Une erreur est survenue lors de l'enregistrement de l'entreprise.\nDétails: ${detail}`);
    }
  };

  const updateBankAccount = (type: 'dinars' | 'devises', field: keyof BankAccount, value: string) => {
    const accounts = { ...formData.bankAccounts };
    // @ts-ignore
    accounts[type] = { ...accounts[type], [field]: value };
    setFormData({ ...formData, bankAccounts: accounts as any });
  };

  const activeInputStyle = "w-full pl-10 pr-4 py-3 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl text-xs font-bold outline-none focus:border-[#1A56DB] transition-all";
  const labelStyle = "text-[10px] font-black text-[#7A776F] uppercase tracking-widest mb-1.5 block";

  return (
    <div className="flex flex-col min-h-[calc(100vh-100px)]">
      {/* Settings Header */}
      <div className="bg-white border-b border-[#E4E0D8] px-8 py-4 flex gap-4 items-center">
        <h2 className="text-sm font-black text-[#14120E] uppercase tracking-widest flex items-center gap-2">
          🏢 CONFIGURATION PROFIL
        </h2>
      </div>

      <div className="flex flex-col lg:flex-row flex-1">
        {/* Companies Sidebar */}
        <div className="w-full lg:w-80 bg-white border-r border-[#E4E0D8] p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-[#14120E] uppercase tracking-widest">Mes Entreprises</h3>
            <button 
              onClick={() => setLocalActiveId('new-' + Date.now())}
              className="p-1.5 bg-[#1A56DB] text-white rounded-lg hover:bg-[#1648C4] transition-all"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="space-y-3">
            {issuers.map(i => (
              <div 
                key={i.id}
                onClick={() => {
                  setLocalActiveId(i.id);
                  onSetActive(i.id);
                }}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between group ${localActiveId === i.id ? 'bg-[#EBF2FF] border-[#1A56DB]' : 'bg-white border-[#E4E0D8] hover:border-[#1A56DB]/30'}`}
              >
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-[#F1EDE5] flex items-center justify-center text-[10px] font-black text-[#1A56DB] overflow-hidden">
                      {i.logoUrl ? <img src={i.logoUrl} className="w-full h-full object-cover" /> : i.name.charAt(0)}
                   </div>
                   <div>
                      <p className={`text-[11px] font-black uppercase tracking-tight truncate max-w-[140px] ${localActiveId === i.id ? 'text-[#1A56DB]' : 'text-[#14120E]'}`}>{i.name || 'Nouvelle Entreprise'}</p>
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
                  <h2 className="text-2xl font-black text-[#14120E] uppercase tracking-tight">Configuration Profil</h2>
                  <p className="text-xs text-[#7A776F] font-medium italic mt-1">Gérez l'identité légale de votre entreprise et vos coordonnées de facturation.</p>
                </div>

                <button 
                  type="submit"
                  className="flex items-center gap-2 bg-[#14120E] hover:bg-black text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all"
                >
                  <Save size={16} />
                  Enregistrer
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-[#E4E0D8]">
                {/* Logo Uploader */}
                <div className="md:col-span-1 flex flex-col items-center p-6 bg-stone-50 border border-[#E4E0D8] rounded-[2rem] text-center space-y-4">
                   <span className="text-[10px] font-black text-[#7A776F] uppercase tracking-widest">Logo de l'Entreprise</span>
                   <div 
                     onClick={() => fileInputRef.current?.click()}
                     className="w-32 h-32 rounded-[2rem] border-2 border-dashed border-[#C2BEB7] hover:border-[#1A56DB] cursor-pointer transition-all flex flex-col items-center justify-center bg-white overflow-hidden group relative"
                   >
                     {formData.logoUrl ? (
                       <>
                         <img src={formData.logoUrl} className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white text-[10px] font-black uppercase tracking-widest">Modifier</div>
                       </>
                     ) : (
                       <div className="flex flex-col items-center text-[#A8A49E]">
                         <Camera size={24} className="mb-2" />
                         <span className="text-[9px] font-bold">1Mo Max</span>
                       </div>
                     )}
                   </div>
                   <input 
                     type="file" 
                     ref={fileInputRef} 
                     onChange={handleFileUpload} 
                     accept="image/*" 
                     className="hidden" 
                   />
                   <p className="text-[10px] text-[#7A776F] font-semibold leading-relaxed px-4">
                     Format recommandé : Carré PNG ou JPG avec fond transparent ou blanc.
                   </p>
                </div>

                {/* Main Legal Details */}
                <div className="md:col-span-2 space-y-6">
                   <div>
                      <label className={labelStyle}>Nom ou Raison Sociale</label>
                      <div className="relative">
                        <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1A56DB]" />
                        <input 
                          type="text"
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
    </div>
  );
};

export default Settings;
