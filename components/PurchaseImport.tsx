import React, { useState, useRef } from 'react';
import { Upload, Camera, FileText, Loader2, Save, Trash2, Check, AlertCircle, Cloud, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Purchase, IssuerInfo as Issuer } from '../types';

interface PurchaseImportProps {
  onSave: (purchase: Purchase, syncToDrive: boolean) => void;
  activeIssuerId: string;
  issuers: Issuer[];
  isDriveConnected: boolean;
  onConnectDrive: () => void;
  isConnectingDrive?: boolean;
}

const PurchaseImport: React.FC<PurchaseImportProps> = ({ 
  onSave, 
  activeIssuerId, 
  issuers,
  isDriveConnected,
  onConnectDrive,
  isConnectingDrive = false
}) => {
  const [selectedIssuerId, setSelectedIssuerId] = useState(activeIssuerId);
  const [file, setFile] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [extractedData, setExtractedData] = useState<Partial<Purchase> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncToDrive, setSyncToDrive] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFile(reader.result as string);
        scanInvoice(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const scanInvoice = async (base64: string) => {
    setIsScanning(true);
    setError(null);
    try {
      const response = await fetch("/api/extract-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });

      if (!response.ok) throw new Error("Erreur serveur lors de l'extraction.");
      
      const data = await response.json();
      const resultObj = data.result || {};
      
      setExtractedData({
        id: 'purch-' + Date.now(),
        issuerId: selectedIssuerId,
        imageUrl: base64 || '',
        vendor: resultObj.vendor || '',
        date: resultObj.date || new Date().toISOString().split('T')[0],
        dueDate: resultObj.dueDate || resultObj.date || new Date().toISOString().split('T')[0],
        status: 'pending',
        category: resultObj.category || 'Achats',
        ht: typeof resultObj.ht === 'number' ? resultObj.ht : parseFloat(resultObj.ht) || 0,
        tva: typeof resultObj.tva === 'number' ? resultObj.tva : parseFloat(resultObj.tva) || 0,
        ttc: typeof resultObj.ttc === 'number' ? resultObj.ttc : parseFloat(resultObj.ttc) || 0,
        ref: resultObj.ref || '',
      });
    } catch (err) {
      setError("Impossible d'extraire les données. Veuillez saisir manuellement.");
      setExtractedData({
        id: 'purch-' + Date.now(),
        issuerId: selectedIssuerId,
        imageUrl: base64 || '',
        vendor: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        status: 'pending',
        ht: 0,
        tva: 0,
        ttc: 0,
        category: 'Achats',
        ref: ''
      });
    } finally {
      setIsScanning(false);
    }
  };

  const activeInputStyle = "w-full px-4 py-3 bg-white border border-[#E4E0D8] rounded-xl text-sm font-bold outline-none focus:border-[#1A56DB]";
  const labelStyle = "block text-[10px] font-black text-[#7A776F] mb-1.5 uppercase tracking-widest";

  return (
    <div className="p-7 max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-[#14120E] uppercase tracking-tight">Scanner ou Saisie Manuelle d'Achat</h2>
        <p className="text-sm text-[#7A776F] font-medium italic">Enregistrez vos dépenses avec ou sans facture.</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-[#E4E0D8] shadow-sm">
        <label className={labelStyle}>Entreprise Concernée</label>
        <select 
          value={selectedIssuerId}
          onChange={(e) => {
            const id = e.target.value;
            setSelectedIssuerId(id);
            if (extractedData) {
              setExtractedData({...extractedData, issuerId: id});
            }
          }}
          className={activeInputStyle}
        >
          {issuers.map(issuer => (
            <option key={issuer.id} value={issuer.id}>{issuer.name}</option>
          ))}
        </select>
      </div>

      {!file && !extractedData ? (
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => fileInputRef.current?.click()}
            className="aspect-video bg-white border-4 border-dashed border-[#E4E0D8] rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:border-[#1A56DB] hover:bg-[#F1EDE5]/30 transition-all group"
          >
            <div className="w-20 h-20 bg-[#F1EDE5] rounded-[2rem] flex items-center justify-center text-[#1A56DB] mb-6 group-hover:scale-110 transition-transform">
              <Camera size={32} />
            </div>
            <p className="text-sm font-black text-[#14120E] uppercase tracking-widest">Prendre une photo ou Importer</p>
            <p className="text-xs text-[#7A776F] mt-2 italic">Laissez l'IA extraire les données pour vous</p>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,application/pdf" className="hidden" />
          </motion.div>

          <div className="flex items-center gap-4">
             <div className="flex-1 h-px bg-[#E4E0D8]"></div>
             <span className="text-[10px] font-black text-[#B0ADA5] uppercase tracking-widest">Ou bien</span>
             <div className="flex-1 h-px bg-[#E4E0D8]"></div>
          </div>

          <button 
            onClick={() => {
              setExtractedData({
                id: 'purch-' + Date.now(),
                issuerId: selectedIssuerId,
                vendor: '',
                date: new Date().toISOString().split('T')[0],
                dueDate: new Date().toISOString().split('T')[0],
                status: 'pending',
                ht: 0,
                tva: 0,
                ttc: 0,
                category: 'Achats',
                ref: '',
                imageUrl: ''
              });
            }}
            className="w-full bg-[#FAF8F4] border border-[#E4E0D8] text-[#14120E] py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F1EDE5] transition-all flex items-center justify-center gap-2"
          >
            <FileText size={18} className="text-[#1A56DB]" /> Saisie Manuelle sans Facture
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
             {file ? (
               <div className="aspect-[3/4] bg-white rounded-3xl border border-[#E4E0D8] overflow-hidden relative shadow-lg">
                  <img src={file} className="w-full h-full object-cover" alt="Scan" />
                  <button 
                    onClick={() => { setFile(null); setExtractedData(null); }}
                    className="absolute top-4 right-4 p-2 bg-[#C0280F] text-white rounded-xl shadow-lg hover:bg-red-700 transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
               </div>
             ) : (
               <div className="aspect-[3/4] bg-[#F1EDE5] rounded-3xl border-4 border-dashed border-[#E4E0D8] flex flex-col items-center justify-center text-[#B0ADA5] p-8 text-center italic">
                  <FileText size={48} className="mb-4 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest">Saisie Manuelle</p>
                  <p className="text-[10px] mt-2">Aucune image associée à cette dépense.</p>
                  <button 
                    onClick={() => { setFile(null); setExtractedData(null); }}
                    className="mt-6 px-4 py-2 bg-white text-[#C0280F] rounded-xl shadow-sm text-[10px] font-black uppercase border border-[#E4E0D8]"
                  >
                    Annuler
                  </button>
               </div>
             )}
          </div>

          <div className="bg-white p-8 rounded-3xl border border-[#E4E0D8] shadow-sm relative overflow-hidden">
            {isScanning && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-[#1A56DB] animate-spin mb-4" />
                <p className="text-xs font-black text-[#14120E] uppercase tracking-widest animate-pulse">Analyse IA par Gemini...</p>
              </div>
            )}

            <h3 className="text-sm font-black mb-6 text-[#14120E] uppercase tracking-widest flex items-center gap-2">
              <FileText className="text-[#1A56DB]" size={18} />
              Détails de la Facture
            </h3>

            {extractedData && (
              <div className="space-y-5">
                {error && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800 text-xs font-bold italic">
                    <AlertCircle size={16} /> {error}
                  </div>
                )}
                
                <div>
                  <label className={labelStyle}>Fournisseur</label>
                  <input 
                    value={extractedData.vendor}
                    onChange={e => setExtractedData({...extractedData, vendor: e.target.value})}
                    className={activeInputStyle}
                  />
                </div>

                  <div>
                    <label className={labelStyle}>Status</label>
                    <select 
                      value={extractedData.status}
                      onChange={e => setExtractedData({...extractedData, status: e.target.value as 'pending' | 'paid'})}
                      className={activeInputStyle}
                    >
                      <option value="pending">En attente</option>
                      <option value="paid">Payé</option>
                    </select>
                  </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelStyle}>Date Facture</label>
                    <input 
                      type="date"
                      value={extractedData.date}
                      onChange={e => setExtractedData({...extractedData, date: e.target.value})}
                      className={activeInputStyle}
                    />
                  </div>
                  <div>
                    <label className={labelStyle}>Due Date (Échéance)</label>
                    <input 
                      type="date"
                      value={extractedData.dueDate}
                      onChange={e => setExtractedData({...extractedData, dueDate: e.target.value})}
                      className={activeInputStyle}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelStyle}>Catégorie</label>
                    <select 
                      value={extractedData.category}
                      onChange={e => setExtractedData({...extractedData, category: e.target.value})}
                      className={activeInputStyle}
                    >
                      <option value="Achats">Achats</option>
                      <option value="Services">Services</option>
                      <option value="Materiel">Materiel</option>
                      <option value="Divers">Divers</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelStyle}>HT (DT)</label>
                    <input 
                      type="number"
                      step="0.001"
                      value={extractedData.ht ?? 0}
                      onChange={e => setExtractedData({...extractedData, ht: parseFloat(e.target.value) || 0, ttc: (parseFloat(e.target.value) || 0) + (extractedData.tva || 0)})}
                      className={activeInputStyle}
                    />
                  </div>
                  <div>
                    <label className={labelStyle}>TVA (DT)</label>
                    <input 
                      type="number"
                      step="0.001"
                      value={extractedData.tva ?? 0}
                      onChange={e => setExtractedData({...extractedData, tva: parseFloat(e.target.value) || 0, ttc: (extractedData.ht || 0) + (parseFloat(e.target.value) || 0)})}
                      className={activeInputStyle}
                    />
                  </div>
                  <div className="bg-[#FAF8F4] p-2 rounded-xl border border-[#E4E0D8]">
                    <label className={labelStyle}>TTC</label>
                    <p className="text-sm font-black text-[#14120E] mt-1 font-mono">{extractedData.ttc?.toFixed(3)}</p>
                  </div>
                </div>

                {/* Google Drive Integration */}
                <div className="p-4 bg-[#FAF8F4] rounded-2xl border border-[#E4E0D8]/60 space-y-3 mt-6">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-[#7A776F] uppercase tracking-widest flex items-center gap-1.5">
                      <Cloud size={14} className="text-[#1A56DB]" />
                      Sauvegarde Google Drive
                    </span>
                    {isDriveConnected ? (
                      <span className="px-2 py-0.5 bg-[#E6F8F4] text-[#0E7866] border border-[#0E7866]/10 rounded text-[9px] font-black uppercase tracking-wider">
                        Connecté
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded text-[9px] font-black uppercase tracking-wider">
                        Non configuré
                      </span>
                    )}
                  </div>

                  {isDriveConnected ? (
                    <label className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-all">
                      <input 
                        type="checkbox" 
                        checked={syncToDrive} 
                        onChange={e => setSyncToDrive(e.target.checked)} 
                        className="w-5 h-5 rounded-md accent-[#0E7866] border-[#E4E0D8]"
                      />
                      <span className="text-xs text-[#14120E] font-medium italic">
                        Stocker automatiquement le scan de la facture dans l'espace Drive ({extractedData.date ? extractedData.date.slice(0, 7) : new Date().toISOString().slice(0, 7)})
                      </span>
                    </label>
                  ) : (
                    <div className="p-3 bg-white rounded-xl border border-[#E4E0D8]/30 space-y-2 text-left">
                      <p className="text-[10px] text-[#7A776F] leading-relaxed">
                        Connectez votre compte Google Drive pour ranger automatiquement cette facture dans un dossier daté accessible par toute l'équipe via l'ERP.
                      </p>
                      <button
                        type="button"
                        onClick={onConnectDrive}
                        disabled={isConnectingDrive}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#1A56DB] text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-[#1648C4] transition-all disabled:opacity-50"
                      >
                        {isConnectingDrive ? <RefreshCw size={10} className="animate-spin" /> : <Cloud size={10} />} Connecter Google Drive
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => onSave(extractedData as Purchase, syncToDrive && isDriveConnected)}
                  className="w-full bg-[#0E7866] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-[#085a4d] transition-all flex items-center justify-center gap-2 mt-8"
                >
                  <Save size={18} /> Enregistrer l'achat
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseImport;
