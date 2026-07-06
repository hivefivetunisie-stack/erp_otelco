import React, { useState, useRef, useEffect } from 'react';
import { ClientInfo, Subscription, Space, IssuerInfo as Issuer, Invoice } from '../types';
import { 
  Plus, User, Phone, Mail, MapPin, Edit2, Trash2, Camera, X, Check, 
  Search, Briefcase, Monitor, Key, DollarSign, Calendar, Sliders, ShieldCheck, HelpCircle, Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, calculateInvoice } from '../utils/calculations';

interface ClientsProps {
  clients: ClientInfo[];
  onAddClient: (client: ClientInfo) => Promise<string | void>;
  onDeleteClient: (id: string) => void;
  onUpdateClient: (client: ClientInfo) => void;
  // Extended subscription capabilities
  subscriptions?: Subscription[];
  spaces?: Space[];
  issuers?: Issuer[];
  onAddSubscription?: (sub: Subscription) => void;
  onUpdateSubscription?: (sub: Subscription) => void;
  onDeleteSubscription?: (id: string) => void;
  invoices?: Invoice[];
}

const Clients: React.FC<ClientsProps> = ({ 
  clients, 
  onAddClient, 
  onDeleteClient, 
  onUpdateClient,
  subscriptions = [],
  spaces = [],
  issuers = [],
  onAddSubscription,
  onUpdateSubscription,
  onDeleteSubscription,
  invoices = []
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'synergy' | 'coworking'>('synergy');
  const [clientSubTab, setClientSubTab] = useState<'synergy' | 'otelco'>('synergy');
  const [subStatusFilter, setSubStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  
  // Search & Filters
  const [clientSearchText, setClientSearchText] = useState('');
  const [subSearchText, setSubSearchText] = useState('');
  
  // Standard Client Form States
  const [isClientFormOpen, setIsClientFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientInfo | null>(null);
  const [clientFormData, setClientFormData] = useState<Partial<ClientInfo>>({});
  const clientLogoInputRef = useRef<HTMLInputElement>(null);

  // Coworking Subscriber Form States
  const [isSubFormOpen, setIsSubFormOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [subFormData, setSubFormData] = useState<Partial<Subscription>>({});
  
  // Custom states inside Subscription form
  const [isAddingNewClientForSub, setIsAddingNewClientForSub] = useState(false);
  const [subNewClientFormData, setSubNewClientFormData] = useState<Partial<ClientInfo>>({
    name: '',
    mf: '',
    phone: '',
    email: '',
    address: ''
  });

  // Automatically fetch default prices of formulas
  const getFormulaDefaultPrice = (plan?: 'hour' | 'day' | 'month' | '3_months' | '6_months' | '12_months') => {
    switch(plan) {
      case 'hour': return 5;
      case 'day': return 25;
      case 'month': return 250;
      case '3_months': return 700;
      case '6_months': return 1300;
      case '12_months': return 2400;
      default: return 0;
    }
  };

  const getFormulaLabel = (plan?: string) => {
    switch(plan) {
      case 'hour': return 'Par Heure 🕐';
      case 'day': return 'Par Journée 📅';
      case 'month': return 'Par Mois 🗓️';
      case '3_months': return 'Trimestriel (3 Mois) 🏢';
      case '6_months': return 'Semestriel (6 Mois) 🏰';
      case '12_months': return 'Annuel (12 Mois) 🏛️';
      default: return plan || '—';
    }
  };

  // Find primary Coworking issuer and Synergy Growth issuer for context labelling
  const coworkingIssuer = issuers.find(i => i.name.toLowerCase().includes('coworking') || i.name.toLowerCase().includes('otelco')) || issuers[0];
  const synergyIssuer = issuers.find(i => i.name.toLowerCase().includes('synergy')) || issuers[0];

  // Filters
  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(clientSearchText.toLowerCase()) || 
                          c.mf.toLowerCase().includes(clientSearchText.toLowerCase());
    if (!matchesSearch) return false;

    // Standard clients list strictly represents Synergy Growth clients
    return !c.issuerId || c.issuerId === synergyIssuer?.id;
  });

  const filteredSubs = subscriptions
    .filter(s => s.issuerId === coworkingIssuer?.id)
    .filter(s => {
      if (subStatusFilter === 'active') return s.status !== 'archived';
      if (subStatusFilter === 'archived') return s.status === 'archived';
      return true;
    })
    .filter(s => 
      s.clientName.toLowerCase().includes(subSearchText.toLowerCase()) ||
      (s.officeType && s.officeType.toLowerCase().includes(subSearchText.toLowerCase()))
    );

  // Consistent computed metrics for Coworking (Otelco) - should represent absolute totals instead of search-filtered
  const otelcoActiveSubs = subscriptions.filter(s => s.issuerId === coworkingIssuer?.id && s.status === 'active');
  const activeSubs = otelcoActiveSubs;
  const totalSubRevenue = otelcoActiveSubs.reduce((sum, s) => sum + (s.monthlyPrice || 0), 0);
  const totalCautions = otelcoActiveSubs.reduce((sum, s) => sum + (s.depositAmount || 0), 0);

  // Calculate total billing CA HT for a given client (from invoices)
  const getClientTotalCA = (clientId: string) => {
    const clientInvoices = (invoices || []).filter(inv => inv.client.id === clientId);
    const invoiceCA = clientInvoices.reduce((sum, inv) => {
      const totals = calculateInvoice(inv);
      return sum + totals.totalHT;
    }, 0);
    return {
      revenue: invoiceCA,
      count: clientInvoices.length
    };
  };

  // Client image upload
  const handleClientLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("L'image est trop lourde (max 1Mo)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setClientFormData({ ...clientFormData, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // Open forms
  const handleOpenClientForm = (client?: ClientInfo) => {
    if (client) {
      setEditingClient(client);
      setClientFormData(client);
    } else {
      setEditingClient(null);
      setClientFormData({
        isProfessional: true,
        defaultRS: 0,
        issuerId: synergyIssuer?.id || ''
      });
    }
    setIsClientFormOpen(true);
  };

  const handleCloseClientForm = () => {
    setIsClientFormOpen(false);
    setEditingClient(null);
    setClientFormData({});
  };

  const handleClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...clientFormData,
      id: editingClient?.id || 'clt-' + Date.now(),
      issuerId: clientFormData.issuerId || synergyIssuer?.id || ''
    } as ClientInfo;

    if (editingClient) {
      onUpdateClient(data);
    } else {
      onAddClient(data);
    }
    handleCloseClientForm();
  };

  // Subscriptions management
  const handleOpenSubForm = (sub?: Subscription) => {
    if (sub) {
      setEditingSub(sub);
      setSubFormData(sub);
      setIsAddingNewClientForSub(false);
    } else {
      setEditingSub(null);
      setSubFormData({
        status: 'active',
        durationPlan: 'month',
        monthlyPrice: 250,
        hasDeposit: false,
        depositAmount: 0,
        startDate: new Date().toISOString().split('T')[0]
      });
      setIsAddingNewClientForSub(false);
      setSubNewClientFormData({
        name: '',
        mf: '',
        phone: '',
        email: '',
        address: ''
      });
    }
    setIsSubFormOpen(true);
  };

  const handleCloseSubForm = () => {
    setIsSubFormOpen(false);
    setEditingSub(null);
    setSubFormData({});
  };

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddSubscription || !onUpdateSubscription) return;

    let targetClientId = subFormData.clientId || '';
    let targetClientName = subFormData.clientName || '';

    // Quick add new client first if requested
    if (isAddingNewClientForSub) {
      if (!subNewClientFormData.name?.trim()) {
        alert("Le nom de l'abonné est requis");
        return;
      }
      const generatedClientId = 'clt-sub-' + Date.now();
      const nClient: ClientInfo = {
        id: generatedClientId,
        name: subNewClientFormData.name.toUpperCase(),
        mf: subNewClientFormData.mf || '—',
        phone: subNewClientFormData.phone || '—',
        email: subNewClientFormData.email || '—',
        address: subNewClientFormData.address || '—',
        isProfessional: true,
        rc: '—',
        defaultRS: 0,
        issuerId: coworkingIssuer?.id || ''
      };
      
      const resId = await onAddClient(nClient);
      targetClientId = resId || generatedClientId;
      targetClientName = nClient.name;
    } else {
      const selectedClt = clients.find(c => c.id === targetClientId);
      if (selectedClt) {
        targetClientName = selectedClt.name;
      }
    }

    if (!targetClientId) {
      alert("Sélectionnez ou créez un abonné");
      return;
    }

    const subData: Subscription = {
      ...subFormData,
      id: editingSub?.id || 'sub-' + Date.now(),
      clientId: targetClientId,
      clientName: targetClientName,
      officeType: subFormData.officeType || 'Autre',
      monthlyPrice: Number(subFormData.monthlyPrice) || 0,
      startDate: subFormData.startDate || new Date().toISOString().split('T')[0],
      status: subFormData.status || 'active',
      issuerId: coworkingIssuer?.id || 'default-coworking-id',
      durationPlan: subFormData.durationPlan as any,
      hasDeposit: !!subFormData.hasDeposit,
      depositAmount: subFormData.hasDeposit ? (Number(subFormData.depositAmount) || 0) : 0,
      spaceId: subFormData.spaceId || '',
      ownerId: subFormData.ownerId || ''
    } as Subscription;

    if (editingSub) {
      onUpdateSubscription(subData);
    } else {
      onAddSubscription(subData);
    }
    handleCloseSubForm();
  };

  // Fast trigger status change
  const handleToggleSubStatus = (sub: Subscription) => {
    if (!onUpdateSubscription) return;
    const nextStatus = sub.status === 'active' ? 'cancelled' : 'active';
    onUpdateSubscription({
      ...sub,
      status: nextStatus
    });
  };

  const handleArchiveSub = (sub: Subscription) => {
    if (!onUpdateSubscription) return;
    const nextStatus = sub.status === 'archived' ? 'active' : 'archived';
    onUpdateSubscription({
      ...sub,
      status: nextStatus
    });
  };

  return (
    <div className="p-7 space-y-7">
      {/* Upper Title and Beautiful Minimal Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#14120E] tracking-tighter flex items-center gap-2">
             <Briefcase size={28} className="text-[#1A56DB]" />
             Annuaire Clients & Abonnés
          </h2>
          <p className="text-xs text-[#7A776F] font-medium italic mt-1 pb-1">
             Gestion centralisée des clients Synergy Growth et des abonnements Coworking unifiés.
          </p>
        </div>
        
        {/* Switch Control Tabs */}
        <div className="flex bg-[#FAF8F4] p-1.5 rounded-2xl border border-[#E4E0D8] shrink-0 self-stretch md:self-auto shadow-sm gap-1">
          <button 
            onClick={() => setActiveTab('synergy')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${activeTab === 'synergy' ? 'bg-white text-[#1A56DB] shadow-md border-b-2 border-[#1A56DB]' : 'text-[#7A776F] hover:text-[#14120E]'}`}
          >
             <Briefcase size={14} /> Synergy Growth (Clients)
          </button>
          <button 
            onClick={() => setActiveTab('coworking')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${activeTab === 'coworking' ? 'bg-white text-emerald-600 shadow-md border-b-2 border-emerald-600' : 'text-[#7A776F] hover:text-[#14120E]'}`}
          >
             <Monitor size={14} /> Coworking (Abonnés)
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'synergy' ? (
          <motion.div 
            key="synergy-tab"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            {/* Header Synergy Client controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
               <div className="relative w-full sm:w-80">
                 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0ADA5]" size={15} />
                 <input 
                   type="text" 
                   placeholder="Rechercher par nom ou MF..." 
                   value={clientSearchText}
                   onChange={(e) => setClientSearchText(e.target.value)}
                   className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E0D8] rounded-xl text-xs font-bold outline-none focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/5 transition-all"
                 />
               </div>
               <button 
                 onClick={() => handleOpenClientForm()}
                 className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#1A56DB] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#1648C4] transition-all shadow-md active:scale-95 shrink-0"
               >
                 <Plus size={16} /> Nouveau Client
               </button>
            </div>



            {/* Client input Form display integrated if open */}
            {isClientFormOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-[#E4E0D8] p-6 shadow-xl"
              >
                <form onSubmit={handleClientSubmit} className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-[#E4E0D8]">
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#14120E]">
                      {editingClient ? 'Modifier la Fiche Client (Synergy)' : 'Ajouter un Client Standard (Synergy)'}
                    </h3>
                    <button type="button" onClick={handleCloseClientForm} className="text-[#B0ADA5] hover:text-[#C0280F] transition-colors">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Logo */}
                    <div className="flex flex-col items-center justify-center p-6 bg-[#FAF8F4] rounded-2xl border-2 border-dashed border-[#E4E0D8]">
                      <div 
                        onClick={() => clientLogoInputRef.current?.click()}
                        className="relative w-24 h-24 bg-white rounded-2xl border border-[#E4E0D8] shadow-sm flex items-center justify-center cursor-pointer group overflow-hidden"
                      >
                        {clientFormData.logoUrl ? (
                          <img src={clientFormData.logoUrl} alt="Logo preview" className="w-full h-full object-contain" />
                        ) : (
                          <Camera size={32} className="text-[#B0ADA5] group-hover:text-[#1A56DB] transition-colors" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold uppercase">
                          Changer
                        </div>
                      </div>
                      <input 
                        type="file" 
                        ref={clientLogoInputRef} 
                        onChange={handleClientLogoUpload} 
                        className="hidden" 
                        accept="image/*"
                      />
                      <p className="mt-3 text-[10px] font-bold text-[#7A776F] uppercase tracking-tighter">Logo Optionnel</p>
                    </div>

                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#7A776F] uppercase tracking-widest">Nom / Raison Sociale *</label>
                        <input 
                          required
                          value={clientFormData.name || ''}
                          onChange={e => setClientFormData({ ...clientFormData, name: e.target.value })}
                          placeholder="Nom de l'entreprise"
                          className="w-full px-4 py-2.5 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl text-xs outline-none focus:border-[#1A56DB]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#7A776F] uppercase tracking-widest">Matricule Fiscal</label>
                        <input 
                          value={clientFormData.mf || ''}
                          onChange={e => setClientFormData({ ...clientFormData, mf: e.target.value })}
                          placeholder="Ex: 1234567/A/P/C/000"
                          className="w-full px-4 py-2.5 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl text-xs outline-none focus:border-[#1A56DB] font-mono font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#7A776F] uppercase tracking-widest">Téléphone</label>
                        <input 
                          value={clientFormData.phone || ''}
                          onChange={e => setClientFormData({ ...clientFormData, phone: e.target.value })}
                          placeholder="+216 -- --- ---"
                          className="w-full px-4 py-2.5 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl text-xs outline-none focus:border-[#1A56DB]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#7A776F] uppercase tracking-widest">Email</label>
                        <input 
                          type="email"
                          value={clientFormData.email || ''}
                          onChange={e => setClientFormData({ ...clientFormData, email: e.target.value })}
                          placeholder="contact@synergy.tn"
                          className="w-full px-4 py-2.5 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl text-xs outline-none focus:border-[#1A56DB]"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] font-bold text-[#7A776F] uppercase tracking-widest">Adresse complète</label>
                        <input 
                          value={clientFormData.address || ''}
                          onChange={e => setClientFormData({ ...clientFormData, address: e.target.value })}
                          placeholder="Adresse de facturation..."
                          className="w-full px-4 py-2.5 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl text-xs outline-none focus:border-[#1A56DB]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#7A776F] uppercase tracking-widest">Ville</label>
                        <input 
                          value={clientFormData.ville || ''}
                          onChange={e => setClientFormData({ ...clientFormData, ville: e.target.value })}
                          placeholder="Tunis, etc."
                          className="w-full px-4 py-2.5 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl text-xs outline-none focus:border-[#1A56DB]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#7A776F] uppercase tracking-widest">Retenue à la Source (%)</label>
                        <select 
                          value={clientFormData.defaultRS || 0}
                          onChange={e => setClientFormData({ ...clientFormData, defaultRS: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-2.5 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl text-xs outline-none focus:border-[#1A56DB]"
                        >
                          <option value={0}>Aucune (0%)</option>
                          <option value={1.5}>1.5% (Ventes standard)</option>
                          <option value={3}>3% (Honoraires)</option>
                          <option value={10}>10% (Loyer bureau)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#7A776F] uppercase tracking-widest text-[#1A56DB]">Entreprise Rattachée</label>
                        <input 
                          type="text"
                          readOnly
                          value={issuers.find(i => i.id === (clientFormData.issuerId || (clientSubTab === 'otelco' ? coworkingIssuer?.id : synergyIssuer?.id)))?.name || ''}
                          className="w-full px-4 py-2.5 bg-gray-100 border border-[#E4E0D8] rounded-xl text-xs font-bold text-[#7A776F] outline-none cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-6 border-t border-[#E4E0D8]">
                    <button 
                      type="button" 
                      onClick={handleCloseClientForm}
                      className="px-6 py-2.5 rounded-xl border border-[#E4E0D8] text-xs font-bold text-[#7A776F] hover:bg-[#FAF8F4] transition-all"
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit"
                      className="px-10 py-2.5 bg-[#1A56DB] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#1648C4] transition-all shadow-lg flex items-center gap-2"
                    >
                      <Check size={16} /> {editingClient ? 'Enregistrer' : 'Ajouter'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Standard Clients Table */}
            <div className="bg-white rounded-[2rem] border border-[#E4E0D8] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F4] border-b border-[#E4E0D8] text-[#7A776F] uppercase text-[9px] font-black tracking-widest">
                    <tr>
                      <th className="px-6 py-4.5">Opérateur / Raison Sociale</th>
                      <th className="px-6 py-4.5">Matricule Fiscal</th>
                      <th className="px-6 py-4.5">Téléphone & Email</th>
                      <th className="px-6 py-4.5">Volume CA (HT)</th>
                      <th className="px-6 py-4.5">Localisation</th>
                      <th className="px-6 py-4.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E0D8]">
                    {filteredClients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center text-[#B0ADA5] italic font-medium">
                          Aucun client standard répertorié.
                        </td>
                      </tr>
                    ) : (
                      filteredClients.map(client => {
                        const clientCA = getClientTotalCA(client.id);
                        return (
                          <tr key={client.id} className="hover:bg-[#FAF8F4]/30 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white border border-[#E4E0D8] text-[#1A56DB] flex items-center justify-center font-black text-xs overflow-hidden shadow-sm">
                                  {client.logoUrl ? (
                                    <img src={client.logoUrl} alt={client.name} className="w-full h-full object-contain" />
                                  ) : (
                                    client.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <span className="font-extrabold text-[#14120E] text-xs uppercase">{client.name}</span>
                                  {client.defaultRS && client.defaultRS > 0 ? (
                                    <span className="block text-[8px] text-emerald-600 font-extrabold uppercase mt-0.5">Retenue: {client.defaultRS}% default</span>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-gray-500">{client.mf || '—'}</td>
                            <td className="px-6 py-4">
                              <div className="space-y-0.5">
                                <p className="text-gray-600 font-medium flex items-center gap-1"><Phone size={10} /> {client.phone || '—'}</p>
                                <p className="text-[#1A56DB] font-semibold flex items-center gap-1"><Mail size={10} /> {client.email || '—'}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-0.5">
                                <span className={`text-xs font-mono font-extrabold ${clientSubTab === 'otelco' ? 'text-emerald-600' : 'text-[#1A56DB]'}`}>
                                  {formatCurrency(clientCA.revenue, 'DT')}
                                </span>
                                {clientCA.count > 0 ? (
                                  <span className="block text-[8px] text-[#7A776F] font-bold uppercase">
                                    {clientCA.count} facture(s) HT
                                  </span>
                                ) : (
                                  <span className="block text-[8px] text-[#B0ADA5] font-bold">
                                    —
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-500 font-medium flex items-center gap-1 mt-2.5">
                              <MapPin size={11} className="text-[#B0ADA5]" /> {client.ville || '—'}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-1.5">
                                <button 
                                  onClick={() => handleOpenClientForm(client)}
                                  className="p-2 text-[#7A776F] hover:bg-gray-100 rounded-xl transition-all"
                                  title="Modifier"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button 
                                  onClick={() => onDeleteClient(client.id)}
                                  className="p-2 text-[#C0280F] hover:bg-red-50 rounded-xl transition-all"
                                  title="Supprimer"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="coworking-tab"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-6"
          >
            {/* KPI Cards section for subscribers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-[#EBF2FF] p-6 rounded-3xl border border-[#1A56DB]/10 shadow-sm">
                <span className="text-[10px] font-black text-[#1A56DB] uppercase tracking-widest block mb-1">Total Abonnements Actifs (CA)</span>
                <span className="text-3xl font-black text-[#1A56DB] font-mono">{formatCurrency(totalSubRevenue, 'DT')}</span>
                <p className="text-[9px] font-semibold text-[#1A56DB]/60 uppercase mt-2">Revenus mensuels récurrents cumulés</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-[#E4E0D8] shadow-sm">
                <span className="text-[10px] font-black text-[#7A776F] uppercase tracking-widest block mb-1">Abonnés Actifs</span>
                <span className="text-3xl font-black text-gray-900 font-mono">{activeSubs.length}</span>
                <p className="text-[9px] font-semibold text-[#7A776F] uppercase mt-2">Contrats de location en cours</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-[#E4E0D8] shadow-sm">
                <span className="text-[10px] font-black text-[#7A776F] uppercase tracking-widest block mb-1 font-mono">Cautions Encaissées</span>
                <span className="text-3xl font-black text-[#0E7866] font-mono">{formatCurrency(totalCautions, 'DT')}</span>
                <p className="text-[9px] font-semibold text-[#0E7866]/70 uppercase mt-2">Dépôts de garantie détenus</p>
              </div>
            </div>

            {/* Subscriber Header Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0ADA5]" size={15} />
                  <input 
                    type="text" 
                    placeholder="Rechercher un abonné ou bureau..." 
                    value={subSearchText}
                    onChange={(e) => setSubSearchText(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E0D8] rounded-xl text-xs font-bold outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/5 transition-all"
                  />
                </div>
                
                {/* Subscription Status Filters */}
                <div className="flex bg-[#FAF8F4]/80 p-1 rounded-xl border border-[#E4E0D8] inline-flex gap-1 shadow-sm shrink-0">
                  <button 
                    type="button"
                    onClick={() => setSubStatusFilter('active')}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${subStatusFilter === 'active' ? 'bg-emerald-600 text-white shadow-sm' : 'text-[#7A776F] hover:text-[#121110]'}`}
                  >
                    🟢 Actifs ({subscriptions.filter(s => s.issuerId === coworkingIssuer?.id && s.status !== 'archived').length})
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSubStatusFilter('archived')}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${subStatusFilter === 'archived' ? 'bg-amber-600 text-white shadow-sm' : 'text-[#7A776F] hover:text-[#121110]'}`}
                  >
                    📁 Archivés ({subscriptions.filter(s => s.issuerId === coworkingIssuer?.id && s.status === 'archived').length})
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSubStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${subStatusFilter === 'all' ? 'bg-[#1A56DB] text-white shadow-sm' : 'text-[#7A776F] hover:text-[#121110]'}`}
                  >
                    Tous ({subscriptions.filter(s => s.issuerId === coworkingIssuer?.id).length})
                  </button>
                </div>
              </div>

              <button 
                onClick={() => handleOpenSubForm()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md active:scale-95 shrink-0"
              >
                <Plus size={16} /> Nouvel Abonné
              </button>
            </div>

            {/* Subscription Form integration inline if open */}
            {isSubFormOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border-2 border-emerald-600/20 p-6 shadow-xl"
              >
                <form onSubmit={handleSubSubmit} className="space-y-5">
                  <div className="flex justify-between items-center pb-4 border-b border-[#E4E0D8]">
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#14120E]">
                      {editingSub ? "Modifier le contrat de l'abonné" : "Créer un nouveau Dossier d'Abonnement Coworking"}
                    </h3>
                    <button type="button" onClick={handleCloseSubForm} className="text-[#B0ADA5] hover:text-[#C0280F] transition-colors">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Subscriber Selector / Quick Add */}
                    <div className="p-4 bg-[#FAF8F4] rounded-xl border border-[#E4E0D8] space-y-3">
                      <div className="flex justify-between items-center">
                         <label className="text-[10px] font-black uppercase text-[#7A776F] tracking-widest">Abonné (Client)</label>
                         {!editingSub && (
                           <button 
                             type="button"
                             onClick={() => setIsAddingNewClientForSub(!isAddingNewClientForSub)}
                             className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase hover:bg-emerald-100 transition-all font-mono"
                           >
                             {isAddingNewClientForSub ? "Sélectionner Existant" : "✏️ Créer Nouveau"}
                           </button>
                         )}
                      </div>

                      {isAddingNewClientForSub ? (
                        <div className="space-y-2.5">
                           <input 
                             placeholder="Nom Complet / Raison Sociale *"
                             required
                             value={subNewClientFormData.name || ''}
                             onChange={e => setSubNewClientFormData({...subNewClientFormData, name: e.target.value})}
                             className="w-full px-3 py-2 bg-white border border-[#E4E0D8] rounded-lg text-xs font-bold outline-none"
                           />
                           <input 
                             placeholder="Matricule Fiscal (Optionnel)"
                             value={subNewClientFormData.mf || ''}
                             onChange={e => setSubNewClientFormData({...subNewClientFormData, mf: e.target.value})}
                             className="w-full px-3 py-2 bg-white border border-[#E4E0D8] rounded-lg text-xs outline-none font-mono"
                           />
                           <div className="grid grid-cols-2 gap-2">
                             <input 
                               placeholder="Téléphone"
                               value={subNewClientFormData.phone || ''}
                               onChange={e => setSubNewClientFormData({...subNewClientFormData, phone: e.target.value})}
                               className="px-3 py-2 bg-white border border-[#E4E0D8] rounded-lg text-xs outline-none"
                             />
                             <input 
                               placeholder="Email"
                               type="email"
                               value={subNewClientFormData.email || ''}
                               onChange={e => setSubNewClientFormData({...subNewClientFormData, email: e.target.value})}
                               className="px-3 py-2 bg-white border border-[#E4E0D8] rounded-lg text-xs outline-none"
                             />
                           </div>
                        </div>
                      ) : (
                        <select 
                          required
                          value={subFormData.clientId || ''}
                          onChange={e => setSubFormData({ ...subFormData, clientId: e.target.value, clientName: clients.find(c => c.id === e.target.value)?.name || '' })}
                          className="w-full h-10 px-3 bg-white border border-[#E4E0D8] rounded-lg text-xs font-bold outline-none focus:border-emerald-600"
                        >
                          <option value="">-- Choisir un client dans la liste --</option>
                          {clients.filter(c => c.issuerId === coworkingIssuer?.id).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Target Room / Space allocation */}
                    <div className="space-y-3 p-4 bg-[#FAF8F4] rounded-xl border border-[#E4E0D8]">
                      <div>
                        <label className="text-[10px] font-black uppercase text-[#7A776F] tracking-widest block mb-1.5">Bureau / Espace Attribué</label>
                        <select 
                          value={subFormData.officeType || ''}
                          onChange={e => {
                            const selectedName = e.target.value;
                            const spObj = spaces.find(s => s.name === selectedName);
                            setSubFormData({
                              ...subFormData,
                              officeType: selectedName,
                              spaceId: spObj?.id || ''
                            });
                          }}
                          className="w-full h-10 px-3 bg-white border border-[#E4E0D8] rounded-lg text-xs font-bold outline-none"
                        >
                          <option value="">Sélectionner une salle / bureau disponible...</option>
                          {spaces.map(s => (
                            <option key={s.id} value={s.name}>
                              {s.name} ({s.type}) — {s.status === 'available' ? '🟢 LIBRE' : '🔴 OCCUPÉ'}
                            </option>
                          ))}
                          <option value="Open Space (Fixe)">Open Space (Poste Fixe)</option>
                          <option value="Open Space (Flexible)">Open Space (Poste Flexible)</option>
                          <option value="Bureau Partagé">Bureau Partagé (Coworking)</option>
                          <option value="Autre">Autre espace non listé</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-[#FAF8F4]/50 p-5 rounded-2xl border border-[#E4E0D8]">
                    {/* Plan Duration Category */}
                    <div>
                      <label className="text-[10px] font-black uppercase text-[#7A776F] tracking-widest block mb-1">Formule / Durée</label>
                      <select 
                        value={subFormData.durationPlan || 'month'}
                        onChange={e => {
                          const plan = e.target.value as any;
                          const calculatedPrice = getFormulaDefaultPrice(plan);
                          setSubFormData({
                            ...subFormData,
                            durationPlan: plan,
                            monthlyPrice: calculatedPrice
                          });
                        }}
                        className="w-full h-10 px-3 bg-white border border-[#E4E0D8] rounded-lg text-xs font-bold outline-none"
                      >
                        <option value="hour">Par Heure 🕐</option>
                        <option value="day">Par Journée 📅</option>
                        <option value="month">Par Mois 🗓️</option>
                        <option value="3_months">Trimestriel (3 Mois) 🏢</option>
                        <option value="6_months">Semestriel (6 Mois) 🏰</option>
                        <option value="12_months">Annuel (12 Mois) 🏛️</option>
                      </select>
                    </div>

                    {/* Custom Pricing defined */}
                    <div>
                      <label className="text-[10px] font-black uppercase text-[#7A776F] tracking-widest block mb-1">Tarif Défini (DT)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-xs">DT</span>
                        <input 
                          type="number"
                          step="0.001"
                          required
                          value={subFormData.monthlyPrice !== undefined ? subFormData.monthlyPrice : ''}
                          onChange={e => setSubFormData({ ...subFormData, monthlyPrice: parseFloat(e.target.value) || 0 })}
                          placeholder="0.000"
                          className="w-full h-10 pl-8 pr-3 bg-white border border-[#E4E0D8] rounded-lg text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Caution Option Toggle */}
                    <div>
                      <label className="text-[10px] font-black uppercase text-[#7A776F] tracking-widest block mb-1">Caution (Garantie)</label>
                      <select 
                        value={subFormData.hasDeposit ? 'yes' : 'no'}
                        onChange={e => {
                          const hasDep = e.target.value === 'yes';
                          // Default caution is same amount as subscription price
                          const depAmt = hasDep ? (Number(subFormData.monthlyPrice) || 250) : 0;
                          setSubFormData({
                            ...subFormData,
                            hasDeposit: hasDep,
                            depositAmount: depAmt
                          });
                        }}
                        className="w-full h-10 px-3 bg-white border border-[#E4E0D8] rounded-lg text-xs font-bold outline-none"
                      >
                        <option value="no">Sans Caution ❌</option>
                        <option value="yes">Avec Caution 🔒</option>
                      </select>
                    </div>

                    {/* Deposit Amount */}
                    <div>
                      <label className="text-[10px] font-black uppercase text-[#7A776F] tracking-widest block mb-1">Montant Caution (DT)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-xs">DT</span>
                        <input 
                          type="number"
                          step="0.001"
                          disabled={!subFormData.hasDeposit}
                          value={subFormData.hasDeposit ? (subFormData.depositAmount || '') : 0}
                          onChange={e => setSubFormData({ ...subFormData, depositAmount: parseFloat(e.target.value) || 0 })}
                          className={`w-full h-10 pl-8 pr-3 border rounded-lg text-xs font-mono font-bold outline-none ${subFormData.hasDeposit ? 'bg-white border-[#E4E0D8]' : 'bg-gray-100 border-gray-200 cursor-not-allowed text-gray-400'}`}
                          placeholder="0.000"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Date ranges and status */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <div>
                       <label className="text-[10px] font-bold text-[#7A776F] uppercase tracking-widest block mb-1 bg-white">Date de Début</label>
                       <input 
                         type="date"
                         required
                         value={subFormData.startDate || ''}
                         onChange={e => setSubFormData({ ...subFormData, startDate: e.target.value })}
                         className="w-full h-10 px-3 bg-[#FAF8F4] border border-[#E4E0D8] rounded-lg text-xs font-bold outline-none font-mono"
                       />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-[#7A776F] uppercase tracking-widest block mb-1">Date d'Expiration (Fin)</label>
                       <input 
                         type="date"
                         value={subFormData.endDate || ''}
                         onChange={e => setSubFormData({ ...subFormData, endDate: e.target.value })}
                         className="w-full h-10 px-3 bg-[#FAF8F4] border border-[#E4E0D8] rounded-lg text-xs font-bold outline-none font-mono"
                       />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-[#7A776F] uppercase tracking-widest block mb-1">Statut d'Abonnement</label>
                       <select 
                         value={subFormData.status || 'active'}
                         onChange={e => setSubFormData({ ...subFormData, status: e.target.value as any })}
                         className="w-full h-10 px-3 bg-[#FAF8F4] border border-[#E4E0D8] rounded-lg text-xs font-bold outline-none"
                       >
                         <option value="active">Actif</option>
                         <option value="suspended">Suspendu</option>
                         <option value="cancelled">Résilié</option>
                         <option value="archived">Archivé 📁</option>
                       </select>
                     </div>
                  </div>

                  {/* Notes & Actions */}
                  <div>
                    <label className="text-[10px] font-bold text-[#7A776F] uppercase tracking-widest block mb-1">Notes / Instructions particulières</label>
                    <textarea 
                      value={subFormData.notes || ''}
                      onChange={e => setSubFormData({ ...subFormData, notes: e.target.value })}
                      placeholder="Commentaires ou accords complémentaires..."
                      className="w-full px-4 py-2 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl text-xs outline-none focus:border-emerald-600 min-h-[60px]"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-[#E4E0D8]">
                    <button 
                      type="button" 
                      onClick={handleCloseSubForm}
                      className="px-6 py-2.5 rounded-xl border border-[#E4E0D8] text-xs font-bold text-[#7A776F] hover:bg-[#FAF8F4] transition-all"
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit"
                      className="px-10 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg flex items-center gap-2"
                    >
                      <Check size={16} /> Enregistrer l'Abonnement
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Subscribers Table List */}
            <div className="bg-white rounded-[2rem] border border-[#E4E0D8] shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-xs">
                   <thead className="bg-[#FAF8F4] border-b border-[#E4E0D8] text-[#7A776F] uppercase text-[9px] font-black tracking-widest">
                     <tr>
                       <th className="px-6 py-4.5">Abonné (Coworker)</th>
                       <th className="px-6 py-4.5">Bureau / Espace</th>
                       <th className="px-6 py-4.5">Formule & Tarifs</th>
                       <th className="px-6 py-4.5">Caution & Garantie</th>
                       <th className="px-6 py-4.5">Statut</th>
                       <th className="px-6 py-4.5 text-center">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-[#E4E0D8]">
                     {filteredSubs.length === 0 ? (
                       <tr>
                         <td colSpan={6} className="px-6 py-16 text-center text-[#B0ADA5] italic font-medium">
                           Aucun dossier d'abonné trouvé.
                         </td>
                       </tr>
                     ) : (
                       filteredSubs.map(sub => {
                         const planText = getFormulaLabel(sub.durationPlan);
                         return (
                           <tr key={sub.id} className="hover:bg-[#FAF8F4]/30 transition-colors group">
                             {/* Customer info */}
                             <td className="px-6 py-4 font-extrabold text-[#14120E] text-xs">
                               <div className="flex items-center gap-2">
                                 <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                   <User size={15} />
                                 </div>
                                 <div>
                                   <p className="uppercase text-xs font-black text-[#14120E]">{sub.clientName}</p>
                                   <p className="text-[9px] text-[#7A776F] mt-0.5 font-bold">Début: {new Date(sub.startDate).toLocaleDateString('fr-FR')}</p>
                                 </div>
                               </div>
                             </td>

                             {/* Office assigned */}
                             <td className="px-6 py-4">
                               <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                                 <Monitor size={10} /> {sub.officeType || 'Autre'}
                               </span>
                             </td>

                             {/* Pricing and range */}
                             <td className="px-6 py-4">
                               <div className="space-y-0.5">
                                 <span className="text-[10px] font-black text-gray-500 block uppercase">{planText}</span>
                                 <span className="text-xs font-mono font-extrabold text-[#14120E] block">{formatCurrency(sub.monthlyPrice, 'DT')}</span>
                               </div>
                             </td>

                             {/* Caution Deposit */}
                             <td className="px-6 py-4">
                               {sub.hasDeposit ? (
                                 <div className="text-xs space-y-0.5">
                                   <span className="text-[9px] font-extrabold text-emerald-600 uppercase flex items-center gap-1"><ShieldCheck size={10} /> OUI</span>
                                   <span className="font-mono font-bold text-gray-500">{formatCurrency(sub.depositAmount || 0, 'DT')}</span>
                                 </div>
                               ) : (
                                 <span className="text-[9px] font-black text-[#B0ADA5] uppercase">Aucune ❌</span>
                               )}
                             </td>

                             {/* Status */}
                             <td className="px-6 py-4">
                               <button 
                                 onClick={() => handleToggleSubStatus(sub)}
                                 className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all shadow-sm ${
                                   sub.status === 'active' 
                                     ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                     : sub.status === 'suspended'
                                     ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                     : sub.status === 'archived'
                                     ? 'bg-gray-100 text-gray-500 border border-gray-200'
                                     : 'bg-red-50 text-red-700 border border-red-200'
                                 }`}
                               >
                                 {sub.status === 'active' ? 'ACTIF 🟢' : sub.status === 'suspended' ? 'SUSPENDU 🟡' : sub.status === 'archived' ? 'ARCHIVÉ 📁' : 'RÉSILIÉ 🔴'}
                               </button>
                             </td>

                             {/* Actions */}
                             <td className="px-6 py-4 text-center">
                               <div className="flex items-center justify-center gap-1">
                                 <button 
                                   onClick={() => handleOpenSubForm(sub)}
                                   className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                   title="Modifier l'Abonnement"
                                 >
                                   <Edit2 size={13} />
                                 </button>
                                 <button 
                                   type="button"
                                   onClick={() => handleArchiveSub(sub)}
                                   title={sub.status === 'archived' ? "Désarchiver l'Abonné" : "Archiver l'Abonné"}
                                   className={`p-2 rounded-xl transition-all ${sub.status === 'archived' ? 'text-amber-600 hover:bg-amber-100/50' : 'text-[#7A776F] hover:text-amber-500 hover:bg-amber-50/10'}`}
                                 >
                                   <Archive size={13} />
                                 </button>

                                 {onDeleteSubscription && (
                                   <button 
                                     onClick={() => onDeleteSubscription(sub.id)}
                                     className="p-2 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all"
                                     title="Supprimer la Fiche"
                                   >
                                     <Trash2 size={13} />
                                   </button>
                                 )}
                               </div>
                             </td>
                           </tr>
                         );
                       })
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Clients;
