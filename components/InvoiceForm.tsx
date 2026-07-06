import React, { useRef, useState } from 'react';
import { DollarSign, Search, Check } from 'lucide-react';
import { Plus, Trash2, Building2, User, Info, ShieldCheck, Upload, X, Hash, Mail, Phone, MapPin, HelpCircle, Users, CalendarClock, Clock, Calendar, MessageSquare, Tag } from 'lucide-react';
import { Invoice, InvoiceItem, ClientInfo, Article, IssuerInfo } from '../types';
import { TVA_RATES, WITHHOLDING_RATES, CURRENCIES, PREDEFINED_ARTICLES } from '../constants';
import { motion, AnimatePresence } from 'motion/react';

interface InvoiceFormProps {
  invoice: Invoice;
  onChange: (invoice: Invoice) => void;
  onCheckCompliance: () => void;
  complianceResult: string | null;
  isChecking: boolean;
  clients: ClientInfo[];
  articles: Article[];
  issuers: IssuerInfo[];
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ 
  invoice, 
  onChange, 
  onCheckCompliance,
  complianceResult,
  isChecking,
  clients,
  articles,
  issuers
}) => {
  const [showClientList, setShowClientList] = useState(false);
  const [showArticleList, setShowArticleList] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientCategory, setSelectedClientCategory] = useState<'all' | 'enterprise' | 'private'>('all');
  const [selectedArticleCategory, setSelectedArticleCategory] = useState<string>('all');
  const [articleSearch, setArticleSearch] = useState('');

  // Merge database articles with predefined ones, avoiding duplicates by code/ref
  const allAvailableArticles: Article[] = [...articles];
  PREDEFINED_ARTICLES.forEach(pa => {
    const exists = allAvailableArticles.some(a => a.ref.toLowerCase() === pa.ref.toLowerCase());
    if (!exists) {
      allAvailableArticles.push({
        id: pa.id,
        ref: pa.ref,
        name: pa.name,
        price: pa.price,
        tva: pa.tva,
        unit: pa.unit || 'U',
        category: pa.category
      });
    }
  });

  const addDaysLocally = (dateStr: string, days: number): string => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    dateObj.setDate(dateObj.getDate() + days);
    
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getDaysDifference = (issueDate: string, dueDate: string): number | null => {
    if (!issueDate || !dueDate || dueDate === 'Immédiat') return null;
    const [y1, m1, d1] = issueDate.split('-').map(Number);
    const [y2, m2, d2] = dueDate.split('-').map(Number);
    const date1 = new Date(y1, m1 - 1, d1);
    const date2 = new Date(y2, m2 - 1, d2);
    const diffTime = date2.getTime() - date1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return isNaN(diffDays) ? null : diffDays;
  };

  const updateClient = (client: ClientInfo) => {
    onChange({ 
      ...invoice, 
      client: { ...client },
      withholdingTaxRate: client.defaultRS || invoice.withholdingTaxRate
    });
    setShowClientList(false);
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: "",
      quantity: 1,
      unitPrice: 0,
      tvaRate: 19
    };
    onChange({ ...invoice, items: [...invoice.items, newItem] });
  };

  const selectArticleForItem = (itemId: string, article: Article) => {
    const newItems = invoice.items.map(item => 
      item.id === itemId ? { 
        ...item, 
        description: article.name, 
        unitPrice: article.price, 
        tvaRate: article.tva 
      } : item
    );
    onChange({ ...invoice, items: newItems });
    setShowArticleList(null);
    setArticleSearch('');
  };

  const updateItem = (id: string, field: string, value: any) => {
    const newItems = invoice.items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    onChange({ ...invoice, items: newItems });
  };

  const removeItem = (id: string) => {
    onChange({ ...invoice, items: invoice.items.filter(item => item.id !== id) });
  };

  const inputStyle = "w-full px-4 py-3 bg-[#FAF8F4] text-[#14120E] border border-[#E4E0D8] rounded-xl focus:border-[#1A56DB] outline-none transition-all placeholder:text-[#B0ADA5] font-medium text-xs";
  const labelStyle = "block text-[10px] font-black text-[#7A776F] mb-1.5 uppercase tracking-widest flex items-center gap-2";

  const filteredClients = clients.filter(c => {
    const belongsToSelectedIssuer = (!c.issuerId && invoice.issuer.name.toLowerCase().includes('synergy')) || (c.issuerId === invoice.issuer.id);
    if (!belongsToSelectedIssuer) return false;

    const matchesSearch = c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
                          (c.mf && c.mf.toLowerCase().includes(clientSearch.toLowerCase()));
    if (selectedClientCategory === 'enterprise') {
      return matchesSearch && c.isProfessional === true;
    }
    if (selectedClientCategory === 'private') {
      return matchesSearch && c.isProfessional === false;
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Basic Info */}
      <section className="bg-white p-8 rounded-3xl shadow-sm border border-[#E4E0D8]">
        <h3 className="text-sm font-black mb-6 flex items-center gap-2 text-[#14120E] uppercase tracking-widest">
          <Info className="text-[#1A56DB]" size={18} />
          Informations Générales
        </h3>
        <div className="mb-8 p-4 bg-[#FAF8F4] border border-[#E4E0D8] rounded-2xl">
           <label className={labelStyle}><Building2 size={14} /> Société émettrice</label>
           <div className="flex gap-4 items-center">
              <div className="w-12 h-12 bg-white rounded-xl border border-[#E4E0D8] p-2 flex-shrink-0 flex items-center justify-center">
                 {invoice.issuer.logoUrl ? (
                   <img src={invoice.issuer.logoUrl} className="w-full h-full object-contain" />
                 ) : (
                   <Building2 size={24} className="text-[#B0ADA5]" />
                 )}
              </div>
              <select 
                value={invoice.issuer.id}
                onChange={(e) => {
                  const selected = issuers.find(i => i.id === e.target.value);
                  if (selected) onChange({...invoice, issuer: selected});
                }}
                className={`${inputStyle} h-12 font-bold text-sm`}
              >
                {issuers.map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
           </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className={labelStyle}>Type de Document</label>
            <select 
              value={invoice.documentType}
              onChange={(e) => onChange({...invoice, documentType: e.target.value as any})}
              className={`${inputStyle} h-11 font-black bg-white`}
            >
              <option value="facture">FACTURE</option>
              <option value="devis">DEVIS</option>
              <option value="recu">REÇU DE PAIEMENT</option>
              <option value="vente_espece">VENTE ESPÈCES</option>
            </select>
          </div>
          <div>
            <label className={labelStyle}>Numéro</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0ADA5]" size={14} />
              <input 
                type="text" 
                value={invoice.number}
                onChange={(e) => onChange({...invoice, number: e.target.value})}
                className={`${inputStyle} pl-10 h-11`}
                placeholder="Ex: 2024-001"
              />
            </div>
          </div>
          <div>
            <label className={labelStyle}>Date d'émission</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0ADA5]" size={14} />
              <input 
                type="date" 
                value={invoice.date}
                onChange={(e) => {
                  const newDate = e.target.value;
                  const diff = getDaysDifference(invoice.date, invoice.dueDate || '');
                  const updatedInvoice = { ...invoice, date: newDate };
                  if (diff !== null && invoice.dueDate !== 'Immédiat') {
                    updatedInvoice.dueDate = addDaysLocally(newDate, diff);
                  }
                  onChange(updatedInvoice);
                }}
                className={`${inputStyle} pl-10 h-11`}
              />
            </div>
          </div>
          
          <div className="flex flex-col">
            <label className={labelStyle}>{(invoice.documentType === 'recu' || invoice.documentType === 'vente_espece') ? 'Mode de Règlement' : 'Échéance'}</label>
            {(invoice.documentType === 'recu' || invoice.documentType === 'vente_espece') ? (
              <div className="flex items-center h-11 px-4 bg-[#E6F8F4] text-[#0E7866] border border-[#0E7866]/20 rounded-xl text-[10px] font-black uppercase tracking-widest">
                <Check size={14} className="mr-2" /> PAIEMENT EFFECTUÉ
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={
                    invoice.dueDate === 'Immédiat'
                      ? 'Immédiat'
                      : String(getDaysDifference(invoice.date, invoice.dueDate || '') ?? 'custom')
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Immédiat') {
                      onChange({ ...invoice, dueDate: 'Immédiat' });
                    } else if (val === 'custom') {
                      onChange({ ...invoice, dueDate: invoice.dueDate === 'Immédiat' ? invoice.date : (invoice.dueDate || invoice.date) });
                    } else {
                      const days = parseInt(val, 10);
                      onChange({ ...invoice, dueDate: addDaysLocally(invoice.date, days) });
                    }
                  }}
                  className={`${inputStyle} h-11 font-bold bg-white`}
                >
                  <option value="Immédiat">À réception (Immédiat)</option>
                  <option value="15">+15 Jours (Défaut)</option>
                  <option value="30">+30 Jours</option>
                  <option value="45">+45 Jours</option>
                  <option value="60">+60 Jours</option>
                  <option value="custom">Date spécifique...</option>
                </select>

                {invoice.dueDate !== 'Immédiat' && (
                  <div className="relative">
                    <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A56DB]" size={14} />
                    <input 
                      type="date"
                      value={invoice.dueDate}
                      onChange={(e) => onChange({ ...invoice, dueDate: e.target.value })}
                      className={`${inputStyle} pl-10 h-11 border-[#1A56DB]/40 focus:border-[#1A56DB] bg-white`}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelStyle}><DollarSign size={14} /> Devise & Compte</label>
            <div className="grid grid-cols-2 gap-3">
              <select 
                value={invoice.currency}
                onChange={(e) => onChange({...invoice, currency: e.target.value})}
                className={`${inputStyle} h-11`}
              >
                {CURRENCIES.map(curr => (
                  <option key={curr.code} value={curr.code}>{curr.name} ({curr.symbol})</option>
                ))}
              </select>
              <select 
                value={invoice.bankAccountType}
                onChange={(e) => onChange({...invoice, bankAccountType: e.target.value as any})}
                className={`${inputStyle} h-11 font-bold`}
              >
                <option value="dinars">DINARS (Local)</option>
                <option value="devises">DEVISES (Export)</option>
              </select>
            </div>
          </div>
          <div>
             <label className={labelStyle}><MessageSquare size={14} /> Notes</label>
             <input 
               value={invoice.notes}
               onChange={(e) => onChange({...invoice, notes: e.target.value})}
               placeholder="Instructions de paiement..."
               className={`${inputStyle} h-11`}
             />
          </div>
        </div>
      </section>

      {/* Client Selection */}
      <section className="bg-white p-8 rounded-3xl shadow-sm border border-[#E4E0D8] relative">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-black flex items-center gap-2 text-[#14120E] uppercase tracking-widest">
            <User className="text-[#0E7866]" size={18} />
            Sélection du Client
          </h3>
          <button 
            type="button"
            onClick={() => setShowClientList(!showClientList)}
            className="flex items-center gap-2 px-4 py-2 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl text-[10px] font-black uppercase text-[#1A56DB] hover:bg-[#EBF2FF] transition-all"
          >
            <Users size={14} /> Liste des Clients
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className={labelStyle}>Nom du Client</label>
              <input 
                value={invoice.client.name}
                readOnly
                placeholder="Sélectionnez un client..."
                className={`${inputStyle} h-11 bg-[#F1EDE5]/30 cursor-default`}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className={labelStyle}>MF</label>
                <input value={invoice.client.mf} readOnly className={`${inputStyle} h-11 bg-[#F1EDE5]/30 font-mono`} />
              </div>
              <div>
                <label className={labelStyle}>Ville</label>
                <input value={invoice.client.ville || ''} readOnly className={`${inputStyle} h-11 bg-[#F1EDE5]/30`} />
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#FAF8F4] rounded-2xl border border-[#E4E0D8] flex items-center gap-4">
             <div className="w-20 h-20 bg-white rounded-xl border border-[#E4E0D8] flex items-center justify-center overflow-hidden">
                {invoice.client.logoUrl ? (
                  <img src={invoice.client.logoUrl} className="w-full h-full object-contain" />
                ) : (
                  <User size={32} className="text-[#B0ADA5]" />
                )}
             </div>
             <div>
               <p className="text-[10px] font-black text-[#7A776F] uppercase">Adresse de facturation :</p>
               <p className="text-xs text-[#14120E] mt-1 italic leading-tight">
                 {invoice.client.address || "Aucune adresse renseignée"}
               </p>
             </div>
          </div>
        </div>

        <AnimatePresence>
          {showClientList && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute z-[100] left-8 right-8 top-20 bg-white border border-[#E4E0D8] rounded-2xl shadow-2xl overflow-hidden max-h-[400px] flex flex-col"
            >
              <div className="p-4 border-b border-[#E4E0D8] bg-[#FAF8F4] space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0ADA5]" size={14} />
                  <input 
                    type="text" 
                    placeholder="Rechercher un client ou matricule..." 
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-[#E4E0D8] rounded-xl text-xs outline-none focus:border-[#1A56DB]"
                    autoFocus
                  />
                </div>
                {/* Client Category Tabs */}
                <div className="flex gap-1.5 p-0.5 bg-[#FAF8F4] border border-[#E4E0D8]/50 rounded-lg">
                  {[
                    { id: 'all' as const, label: 'Tous' },
                    { id: 'enterprise' as const, label: 'Entreprises' },
                    { id: 'private' as const, label: 'Particuliers' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedClientCategory(tab.id)}
                      className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                        selectedClientCategory === tab.id
                          ? 'bg-white text-[#1A56DB] border border-[#E4E0D8]/30 shadow-sm'
                          : 'text-[#7A776F] hover:text-[#14120E] hover:bg-white/30'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-[#E4E0D8]">
                {filteredClients.map(client => (
                  <div 
                    key={client.id}
                    onClick={() => updateClient(client)}
                    className="p-4 flex items-center gap-4 hover:bg-[#FAF8F4] cursor-pointer transition-colors"
                  >
                    <div className="w-10 h-10 bg-white border border-[#E4E0D8] rounded-lg overflow-hidden flex items-center justify-center text-[10px] font-bold">
                      {client.logoUrl ? <img src={client.logoUrl} className="w-full h-full object-contain" /> : client.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#14120E]">{client.name}</h4>
                      <p className="text-[10px] text-[#7A776F] font-mono">{client.mf}</p>
                    </div>
                    {invoice.client.id === client.id && <Check size={16} className="ml-auto text-[#1A56DB]" />}
                  </div>
                ))}
                {filteredClients.length === 0 && (
                  <div className="p-10 text-center text-[#B0ADA5] italic text-xs">
                    Aucun client trouvé...
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Articles Table */}
      <section className="bg-white p-8 rounded-3xl shadow-sm border border-[#E4E0D8] overflow-x-auto">
        <h3 className="text-sm font-black mb-6 text-[#14120E] uppercase tracking-widest">
          {(invoice.documentType === 'recu' || invoice.documentType === 'vente_espece') ? 'Détails du Paiement' : 'Articles / Services'}
        </h3>
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="text-left text-[10px] font-black text-[#7A776F] uppercase tracking-widest border-b border-[#E4E0D8] pb-4">
              <th className="pb-4 px-2 w-1/2">{(invoice.documentType === 'recu' || invoice.documentType === 'vente_espece') ? 'Objet du versement' : 'Désignation'}</th>
              <th className="pb-4 px-2 text-center w-24">Qté</th>
              <th className="pb-4 px-2 text-center w-32">P.U (DT)</th>
              <th className="pb-4 px-2 text-center w-24">TVA (%)</th>
              <th className="pb-4 px-2 text-right w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4E0D8]">
            {invoice.items.map((item) => (
              <tr key={item.id} className="group relative">
                <td className="py-4 px-2 relative">
                  <div className="relative">
                    <input 
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Désignation..."
                      className="w-full px-4 py-2.5 bg-[#FAF8F4] text-[#14120E] border border-[#E4E0D8] rounded-xl text-xs outline-none focus:border-[#1A56DB]"
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        const nextState = showArticleList === item.id ? null : item.id;
                        setShowArticleList(nextState);
                        setArticleSearch('');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#B0ADA5] hover:text-[#1A56DB]"
                    >
                      <Tag size={14} />
                    </button>
                    {showArticleList === item.id && (
                      <div className="absolute left-0 right-0 top-full mt-2 z-[90] bg-white border border-[#E4E0D8] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[300px]">
                        {/* Search input for articles */}
                        <div className="p-2.5 border-b border-[#E4E0D8] bg-[#FAF8F4] shrink-0">
                          <div className="relative font-sans">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0ADA5]" size={12} />
                            <input
                              type="text"
                              placeholder="Rechercher par désignation ou réf..."
                              value={articleSearch}
                              onChange={(e) => setArticleSearch(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 bg-white border border-[#E4E0D8] rounded-lg text-xs outline-none focus:border-[#1A56DB] font-medium placeholder:text-[#B0ADA5]"
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          </div>
                        </div>

                        {/* Category filter tabs inside article search */}
                        <div className="flex gap-1 p-1 bg-[#FAF8F4] border-b border-[#E4E0D8] overflow-x-auto shrink-0">
                          {['all', 'Coworking', 'Call Center', 'Autres'].map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedArticleCategory(cat);
                              }}
                              className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-md transition-all ${
                                selectedArticleCategory === cat
                                  ? 'bg-white text-[#1A56DB] border border-[#E4E0D8]/40 shadow-sm'
                                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                              }`}
                            >
                              {cat === 'all' ? 'Tous' : cat}
                            </button>
                          ))}
                        </div>
                        {/* Scrollable list */}
                        <div className="overflow-y-auto divide-y divide-[#E4E0D8] max-h-[180px]">
                          {allAvailableArticles.filter(art => {
                            const artCat = art.category || 'Autres';
                            const matchesCat = selectedArticleCategory === 'all' || artCat.toLowerCase() === selectedArticleCategory.toLowerCase();
                            const matchesSearch = art.name.toLowerCase().includes(articleSearch.toLowerCase()) || 
                                                  art.ref.toLowerCase().includes(articleSearch.toLowerCase());
                            return matchesCat && matchesSearch;
                          }).map(art => (
                            <div 
                              key={art.id}
                              onClick={() => selectArticleForItem(item.id, art)}
                              className="p-3 text-[10px] hover:bg-[#FAF8F4] cursor-pointer flex justify-between items-center"
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-[#14120E]">{art.name}</span>
                                <span className="text-[8px] font-mono text-[#7A776F]">{art.ref} • {art.category || 'Autres'}</span>
                              </div>
                              <div className="text-[#1A56DB] font-mono font-bold">{art.price.toFixed(3)} DT</div>
                            </div>
                          ))}
                          {allAvailableArticles.filter(art => {
                            const artCat = art.category || 'Autres';
                            const matchesCat = selectedArticleCategory === 'all' || artCat.toLowerCase() === selectedArticleCategory.toLowerCase();
                            const matchesSearch = art.name.toLowerCase().includes(articleSearch.toLowerCase()) || 
                                                  art.ref.toLowerCase().includes(articleSearch.toLowerCase());
                            return matchesCat && matchesSearch;
                          }).length === 0 && (
                            <div className="p-4 text-center text-[#B0ADA5] italic text-[10px]">
                              Aucun article dans cette catégorie.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-4 px-2">
                  <input 
                    type="number"
                    value={item.quantity ?? 1}
                    onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-full text-center px-4 py-2.5 bg-[#FAF8F4] text-[#14120E] border border-[#E4E0D8] rounded-xl text-xs font-black outline-none"
                  />
                </td>
                <td className="py-4 px-2">
                  <input 
                    type="number"
                    step="0.001"
                    value={item.unitPrice ?? 0}
                    onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="w-full text-center px-4 py-2.5 bg-[#FAF8F4] text-[#14120E] border border-[#E4E0D8] rounded-xl text-xs font-mono font-bold outline-none"
                  />
                </td>
                <td className="py-4 px-2">
                  <select 
                    value={item.tvaRate}
                    onChange={(e) => updateItem(item.id, 'tvaRate', parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 bg-[#FAF8F4] text-[#14120E] border border-[#E4E0D8] rounded-xl text-xs font-bold outline-none"
                  >
                    {TVA_RATES.map(rate => <option key={rate} value={rate}>{rate}%</option>)}
                  </select>
                </td>
                <td className="py-4 px-2 text-right">
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-[#B0ADA5] hover:text-[#C0280F] hover:bg-[#FFF1EE] rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button 
          onClick={addItem}
          className="mt-6 flex items-center gap-2 bg-[#FAF8F4] text-[#7A776F] px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[#E4E0D8] hover:bg-[#1A56DB] hover:text-white hover:border-transparent transition-all active:scale-95"
        >
          <Plus size={16} /> Ajouter une ligne
        </button>
      </section>

      {/* Advanced Config */}
      {!(invoice.documentType === 'recu' || invoice.documentType === 'vente_espece') && (
        <section className="bg-white p-8 rounded-3xl shadow-sm border border-[#E4E0D8]">
          <h3 className="text-sm font-black mb-6 text-[#14120E] uppercase tracking-widest">Calcul & Conformité</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between p-5 bg-[#FAF8F4] rounded-2xl border border-[#E4E0D8]">
                <div className="pr-4">
                  <span className="font-black text-[#14120E] uppercase text-[10px] tracking-widest">Timbre Fiscal (1.000 DT)</span>
                  <p className="text-[9px] text-[#7A776F] mt-0.5">Obligatoire pour les factures papier locales.</p>
                </div>
                <input 
                  type="checkbox"
                  checked={invoice.timbreFiscal > 0}
                  onChange={(e) => onChange({...invoice, timbreFiscal: e.target.checked ? 1.000 : 0})}
                  className="w-6 h-6 rounded-lg accent-[#1A56DB] border-[#E4E0D8]"
                />
              </div>
              <div>
                <label className={labelStyle}>Taux Retenue à la Source (%)</label>
                <select 
                  value={invoice.withholdingTaxRate ?? 0}
                  onChange={(e) => onChange({...invoice, withholdingTaxRate: parseFloat(e.target.value) || 0})}
                  className={`${inputStyle} h-11 font-bold`}
                >
                  {WITHHOLDING_RATES.map(rate => <option key={rate} value={rate}>{rate}%</option>)}
                </select>
              </div>
            </div>

            <div className="bg-[#14120E] p-8 rounded-3xl shadow-xl flex flex-col justify-center items-center text-center">
               <button 
                onClick={onCheckCompliance}
                disabled={isChecking}
                className="w-full flex items-center justify-center gap-3 bg-[#1A56DB] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#1648C4] transition-all shadow-xl disabled:opacity-50 active:scale-95"
               >
                 <ShieldCheck size={20} />
                 {isChecking ? "ANALYSE EN COURS..." : "VÉRIFIER CONFORMITÉ IA"}
               </button>
               {complianceResult && (
                 <div className="mt-6 p-5 bg-white/5 rounded-2xl text-[10px] text-white/70 border border-white/10 leading-relaxed text-left font-medium">
                   <span className="text-[#1A56DB] font-black block mb-2 uppercase tracking-widest">ANALYSE :</span>
                   {complianceResult}
                 </div>
               )}
            </div>
          </div>
        </section>
      )}

      {invoice.documentType === 'recu' && (
        <section className="bg-white p-8 rounded-3xl border border-[#E4E0D8] shadow-sm space-y-6">
          <h3 className="text-sm font-black text-[#14120E] uppercase tracking-widest flex items-center gap-2 border-b border-[#E4E0D8] pb-4">
            <ShieldCheck size={18} className="text-[#1A56DB]" />
            Configuration du Reçu de Paiement
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className={labelStyle}>Mode de paiement</label>
              <select
                value={invoice.paymentMethod || 'especes'}
                onChange={(e) => onChange({ ...invoice, paymentMethod: e.target.value as any })}
                className={`${inputStyle} h-11 bg-white font-bold`}
              >
                <option value="especes">Espèces</option>
                <option value="virement">Virement bancaire</option>
                <option value="carte">Carte bancaire</option>
                <option value="cheque">Chèque</option>
              </select>
            </div>

            {invoice.paymentMethod === 'cheque' && (
              <div>
                <label className={labelStyle}>Numéro de chèque</label>
                <input
                  type="text"
                  value={invoice.chequeNumber || ''}
                  onChange={(e) => onChange({ ...invoice, chequeNumber: e.target.value })}
                  placeholder="Ex: 582910"
                  className={`${inputStyle} h-11`}
                />
              </div>
            )}

            <div>
              <label className={labelStyle}>Date de réception des fonds</label>
              <input
                type="date"
                value={invoice.dateReceived || invoice.date}
                onChange={(e) => onChange({ ...invoice, dateReceived: e.target.value })}
                className={`${inputStyle} h-11`}
              />
            </div>

            <div>
              <label className={labelStyle}>Solde restant dû</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={invoice.remainingBalance === undefined ? 0 : invoice.remainingBalance}
                  onChange={(e) => onChange({ ...invoice, remainingBalance: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className={`${inputStyle} h-11 pr-12`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#7A776F] uppercase">
                  {invoice.currency}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {(invoice.documentType === 'recu' || invoice.documentType === 'vente_espece') && (
        <section className="bg-[#FAF8F4] p-8 rounded-3xl border border-[#E4E0D8] text-center">
           <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#E6F8F4] text-[#0E7866] rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
              <ShieldCheck size={14} /> Document Validé par défaut
           </div>
           <p className="text-sm font-bold text-[#14120E]">Ce document est finalisé suite au règlement.</p>
           <p className="text-[10px] text-[#7A776F] mt-2 italic">Les retenues à la source et analyses de conformité ne sont pas applicables aux reçus.</p>
        </section>
      )}
    </div>
  );
};

export default InvoiceForm;
