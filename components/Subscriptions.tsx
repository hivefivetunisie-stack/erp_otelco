
import React, { useState } from 'react';
import { PlusCircle, Search, User, Building, DollarSign, Calendar, Trash2, Filter, TrendingUp, Sparkles } from 'lucide-react';
import { Subscription, ClientInfo, SubscriptionStatus, Space } from '../types';
import { formatCurrency } from '../utils/calculations';
import { motion, AnimatePresence } from 'framer-motion';

interface SubscriptionsProps {
  subscriptions: Subscription[];
  clients: ClientInfo[];
  spaces: Space[];
  onAdd: (sub: Subscription) => void;
  onUpdate: (sub: Subscription) => void;
  onDelete: (id: string) => void;
  onAddClient: (client: ClientInfo) => Promise<string>;
  issuerId: string;
}

const Subscriptions: React.FC<SubscriptionsProps> = ({ 
  subscriptions, 
  clients, 
  spaces,
  onAdd, 
  onUpdate, 
  onDelete,
  onAddClient,
  issuerId 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(clients.length === 0);
  const [statusFilter, setStatusFilter] = useState<'all' | SubscriptionStatus>('all');
  
  const [form, setForm] = useState<Partial<Subscription>>({
    clientName: '',
    clientId: '',
    officeType: '',
    monthlyPrice: 0,
    startDate: new Date().toISOString().split('T')[0],
    status: 'active',
  });

  // Reset adding client state if modal opens and clients are empty
  React.useEffect(() => {
    if (showAddForm && clients.length === 0) {
      setIsAddingClient(true);
    }
  }, [showAddForm, clients.length]);

  const [newClient, setNewClient] = useState<Partial<ClientInfo>>({
    name: '',
    mf: '',
    address: '',
    email: '',
  });

  const filtered = subscriptions
    .filter(s => s.issuerId === issuerId)
    .filter(s => s.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(s => statusFilter === 'all' || s.status === statusFilter);

  const monthlyForecast = filtered
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + s.monthlyPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let clientId = form.clientId;
    let clientName = form.clientName;

    if (isAddingClient) {
      if (!newClient.name) return;
      const id = 'cl-' + Date.now();
      await onAddClient({
        ...newClient,
        id,
        issuerId,
      } as ClientInfo);
      clientId = id;
      clientName = newClient.name;
    }

    if (!clientId || !form.monthlyPrice) return;

    if (!clientName) {
      const selectedClient = clients.find(c => c.id === clientId);
      clientName = selectedClient?.name || 'Inconnu';
    }
    
    onAdd({
      ...form,
      id: 'sub-' + Date.now(),
      clientId,
      clientName,
      issuerId,
    } as Subscription);
    
    setShowAddForm(false);
    setIsAddingClient(false);
    setForm({
      clientName: '',
      clientId: '',
      officeType: '',
      monthlyPrice: 0,
      startDate: new Date().toISOString().split('T')[0],
      status: 'active',
    });
  };

  const toggleStatus = (sub: Subscription) => {
    onUpdate({
      ...sub,
      status: sub.status === 'active' ? 'cancelled' : 'active'
    });
  };

  const seedData = async () => {
    const demoClients = [
      { id: 'cl-demo-1', name: 'TECH SOLUTIONS SARL', mf: '1234567/A/P/M/000', address: 'Tunis, Berges du Lac', email: 'contact@techsol.tn' },
      { id: 'cl-demo-2', name: 'CREATIVE HUB', mf: '7654321/B/N/000', address: 'Sousse, Kantaoui', email: 'hello@creativehub.tn' },
      { id: 'cl-demo-3', name: 'GLOBAL TRADING', mf: '1122334/C/P/M/000', address: 'Tunis, Centre Urbain Nord', email: 'admin@globaltrading.tn' }
    ];

    for (const client of demoClients) {
      if (!clients.find(c => c.id === client.id)) {
        await onAddClient(client as ClientInfo);
      }
    }

    const demoSubs: Subscription[] = [
      {
        id: 'sub-demo-1',
        clientId: 'cl-demo-1',
        clientName: 'TECH SOLUTIONS SARL',
        officeType: 'Bureau Privé (2-4 Postes)',
        monthlyPrice: 1500,
        startDate: '2026-01-01',
        status: 'active',
        issuerId,
      },
      {
        id: 'sub-demo-2',
        clientId: 'cl-demo-2',
        clientName: 'CREATIVE HUB',
        officeType: 'Open Space (Fixe)',
        monthlyPrice: 450,
        startDate: '2026-02-15',
        status: 'active',
        issuerId,
      },
      {
        id: 'sub-demo-3',
        clientId: 'cl-demo-3',
        clientName: 'GLOBAL TRADING',
        officeType: 'Bureau Privé (1 Poste)',
        monthlyPrice: 850,
        startDate: '2026-03-01',
        status: 'active',
        issuerId,
      }
    ];

    for (const sub of demoSubs) {
      if (!subscriptions.find(s => s.id === sub.id)) {
        onAdd(sub);
      }
    }
  };

  const labelStyle = "text-[10px] font-black uppercase text-[#ACA9A2] mb-1.5 block tracking-widest";
  const inputStyle = "w-full h-11 px-4 rounded-xl bg-[#FAF8F4] border border-[#E4E0D8] font-bold text-xs focus:ring-2 focus:ring-[#1A56DB]/20 outline-none transition-all";

  return (
    <div className="p-7 space-y-7">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-[#14120E] uppercase tracking-tighter flex items-center gap-2">
             <Building size={24} className="text-[#1A56DB]" />
             Gestion des Abonnements
          </h2>
          <p className="text-xs text-[#7A776F] font-medium italic mt-1">Suivi des locations bureau et prévisions mensuelles Otelco.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={async () => {
              await seedData();
              alert("Données de démonstration ajoutées !");
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-[#FAF8F4] text-[#1A56DB] border border-[#1A56DB]/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#1A56DB] hover:text-white hover:border-[#1A56DB] transition-all"
          >
            <Sparkles size={14} /> Démo
          </button>
          <button 
            onClick={() => setShowAddForm(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#1A56DB] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#1648C4] transition-all shadow-xl active:scale-95"
          >
            <PlusCircle size={18} /> Nouveau
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#EBF2FF] p-6 rounded-3xl border border-[#1A56DB]/10 shadow-sm">
          <p className="text-[10px] font-black text-[#1A56DB] uppercase tracking-widest mb-1">Revenu Mensuel Prévu</p>
          <p className="text-3xl font-black text-[#1A56DB] font-mono tracking-tighter">{formatCurrency(monthlyForecast, 'DT')}</p>
          <div className="flex items-center gap-1.5 mt-2">
             <TrendingUp size={12} className="text-[#1A56DB]" />
             <span className="text-[9px] font-bold text-[#1A56DB]/60 uppercase">Chiffre d'Affaires Récurrent</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#E4E0D8] shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-[#7A776F] uppercase tracking-widest mb-1">Abonnés Actifs</p>
          <p className="text-2xl font-black text-[#14120E] font-mono">{filtered.filter(s => s.status === 'active').length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#E4E0D8] shadow-sm md:col-span-2 flex items-center gap-4">
           <div className="flex-1 relative">
             <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0ADA5]" />
             <input 
               placeholder="Rechercher un locataire..."
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full pl-11 pr-4 py-3 bg-[#FAF8F4] border border-[#E4E0D8] rounded-2xl text-xs font-bold focus:border-[#1A56DB] outline-none"
             />
           </div>
           <select 
             value={statusFilter}
             onChange={e => setStatusFilter(e.target.value as any)}
             className="px-4 py-3 bg-[#FAF8F4] border border-[#E4E0D8] rounded-2xl text-xs font-black uppercase tracking-widest outline-none"
           >
             <option value="all">Satus</option>
             <option value="active">Actifs</option>
             <option value="cancelled">Résiliés</option>
           </select>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-[#E4E0D8] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#FAF8F4] border-b border-[#E4E0D8]">
                <th className="px-7 py-5 text-[10px] font-black text-[#7A776F] uppercase tracking-widest">Locataire</th>
                <th className="px-7 py-5 text-[10px] font-black text-[#7A776F] uppercase tracking-widest">Type de Bureau</th>
                <th className="px-7 py-5 text-[10px] font-black text-[#7A776F] uppercase tracking-widest">Prix Mensuel</th>
                <th className="px-7 py-5 text-[10px] font-black text-[#7A776F] uppercase tracking-widest">Statut</th>
                <th className="px-7 py-5 text-[10px] font-black text-[#7A776F] uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E0D8]">
              {filtered.map(sub => (
                <tr key={sub.id} className="hover:bg-[#FAF8F4] transition-colors group">
                  <td className="px-7 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#FAF8F4] rounded-xl flex items-center justify-center text-[#1A56DB] group-hover:bg-[#1A56DB]/5">
                        <User size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-[#14120E] uppercase">{sub.clientName}</p>
                        <p className="text-[10px] text-[#7A776F] font-mono mt-0.5">Démarré le: {new Date(sub.startDate).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-7 py-5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF8F4] text-[#7A776F] text-[9px] font-black uppercase tracking-wider border border-[#E4E0D8]">
                      {sub.officeType}
                    </span>
                  </td>
                  <td className="px-7 py-5">
                    <p className="text-xs font-black text-[#14120E] font-mono">{formatCurrency(sub.monthlyPrice, 'DT')}</p>
                  </td>
                  <td className="px-7 py-5">
                    <button 
                      onClick={() => toggleStatus(sub)}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] transition-all ${
                        sub.status === 'active' 
                          ? 'bg-[#E6F8F4] text-[#0E7866] border border-[#0E7866]/10' 
                          : 'bg-[#FFF1EE] text-[#C0280F] border border-[#C0280F]/10'
                      }`}
                    >
                      {sub.status === 'active' ? 'ACTIF' : 'RÉSILIÉ'}
                    </button>
                  </td>
                  <td className="px-7 py-5">
                    <div className="flex justify-center">
                       <button 
                         onClick={() => onDelete(sub.id)}
                         className="p-2.5 text-[#ACA9A2] hover:text-[#C0280F] hover:bg-[#FFF1EE] rounded-xl transition-all"
                       >
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-7 py-24 text-center">
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                       <div className="w-20 h-20 bg-[#FAF8F4] rounded-3xl flex items-center justify-center text-[#E4E0D8] mb-6">
                         <Building size={40} />
                       </div>
                       <p className="text-sm font-black text-[#14120E] uppercase tracking-widest mb-2">Aucun contrat trouvé</p>
                       <p className="text-xs text-[#7A776F] mb-8 leading-relaxed">Commencez par ajouter un nouveau contrat de location ou générez des données de démonstration pour voir le rendu.</p>
                       
                       <button 
                         onClick={seedData}
                         className="flex items-center gap-2 px-6 py-3 bg-[#FAF8F4] text-[#1A56DB] border border-[#1A56DB]/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#1A56DB]/5 transition-all"
                       >
                         <Sparkles size={14} /> Générer des exemples visuels
                       </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Form Modal */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               onClick={() => setShowAddForm(false)}
               className="absolute inset-0 bg-[#3D3A34]/40 backdrop-blur-md" 
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl border border-[#E4E0D8] overflow-hidden"
             >
                <div className="p-8 border-b border-[#E4E0D8] flex justify-between items-center bg-[#FAF8F4]/30">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#14120E]">Nouveau Contrat de Location</h3>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                   <div className="grid grid-cols-1 gap-6">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-[10px] font-black uppercase text-[#ACA9A2] tracking-widest">Client / Locataire</label>
                          <button 
                            type="button"
                            onClick={() => setIsAddingClient(!isAddingClient)}
                            className="text-[9px] font-black text-[#1A56DB] uppercase tracking-tighter bg-[#1A56DB]/5 px-2 py-1 rounded-lg hover:bg-[#1A56DB]/10 transition-all"
                          >
                            {isAddingClient ? "Annuler et choisir existant" : "+ Nouveau Client"}
                          </button>
                        </div>
                        
                        {!isAddingClient ? (
                          <select 
                            required={!isAddingClient}
                            value={form.clientId}
                            onChange={e => setForm({...form, clientId: e.target.value})}
                            className={inputStyle}
                          >
                            <option value="">Sélectionner un client</option>
                            {clients.filter(c => c.issuerId === issuerId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        ) : (
                          <div className="space-y-3 p-4 bg-[#FAF8F4] rounded-2xl border border-[#E4E0D8]">
                             <input 
                               placeholder="Nom du locataire (ex: SARL OTELCO)"
                               value={newClient.name}
                               onChange={e => setNewClient({...newClient, name: e.target.value})}
                               className="w-full h-10 px-4 rounded-xl bg-white border border-[#E4E0D8] font-bold text-xs outline-none"
                               required
                             />
                             <div className="grid grid-cols-2 gap-2">
                               <input 
                                 placeholder="Matricule Fiscal"
                                 value={newClient.mf}
                                 onChange={e => setNewClient({...newClient, mf: e.target.value})}
                                 className="h-10 px-4 rounded-xl bg-white border border-[#E4E0D8] font-bold text-xs outline-none"
                               />
                               <input 
                                 placeholder="Email"
                                 value={newClient.email}
                                 onChange={e => setNewClient({...newClient, email: e.target.value})}
                                 className="h-10 px-4 rounded-xl bg-white border border-[#E4E0D8] font-bold text-xs outline-none"
                               />
                             </div>
                             <input 
                               placeholder="Adresse complète"
                               value={newClient.address}
                               onChange={e => setNewClient({...newClient, address: e.target.value})}
                               className="w-full h-10 px-4 rounded-xl bg-white border border-[#E4E0D8] font-bold text-xs outline-none"
                             />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelStyle}>Espace Loué</label>
                          <select 
                            required
                            value={form.officeType}
                            onChange={e => setForm({...form, officeType: e.target.value})}
                            className={inputStyle}
                          >
                            <option value="">Choisir une salle...</option>
                            {spaces.map(s => (
                              <option key={s.id} value={s.name}>
                                {s.name} ({s.type}) - {s.status === 'available' ? 'LIBRE' : 'OCCUPÉ'}
                              </option>
                            ))}
                            <option value="Autre">Autre / Non listée</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelStyle}>Prix Mensuel (DT)</label>
                          <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ACA9A2]" size={14} />
                            <input 
                              required
                              type="number"
                              step="0.001"
                              value={form.monthlyPrice || ''}
                              onChange={e => setForm({...form, monthlyPrice: parseFloat(e.target.value)})}
                              className={`${inputStyle} pl-10`}
                              placeholder="0.000"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className={labelStyle}>Date de Début</label>
                          <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ACA9A2]" size={14} />
                            <input 
                              required
                              type="date"
                              value={form.startDate}
                              onChange={e => setForm({...form, startDate: e.target.value})}
                              className={`${inputStyle} pl-10`}
                            />
                          </div>
                        </div>
                      </div>
                   </div>

                   <div className="flex gap-4 pt-4">
                      <button 
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="flex-1 px-8 py-4 bg-[#FAF8F4] text-[#14120E] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F1EDE5] transition-all"
                      >
                        Annuler
                      </button>
                      <button 
                        type="submit"
                        className="flex-3 px-8 py-4 bg-[#1A56DB] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#1648C4] transition-all shadow-xl"
                      >
                        Valider le Contrat
                      </button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Subscriptions;
