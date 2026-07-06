import React, { useState } from 'react';
import { ShoppingBag, Search, Calendar, Tag, FileDown, Trash2, Filter, PlusCircle, Cloud, FolderOpen, RefreshCw } from 'lucide-react';
import { Purchase } from '../types';
import { formatCurrency } from '../utils/calculations';

interface PurchasesProps {
  purchases: Purchase[];
  onDelete: (id: string) => void;
  onUpdate: (purchase: Purchase) => void;
  onExport: () => void;
  onAddManual: () => void;
  onSyncDrive?: (purchase: Purchase) => void;
  isSyncingDriveId?: string | null;
  issuerId: string;
  issuers: any[];
}

const Purchases: React.FC<PurchasesProps> = ({ 
  purchases, 
  onDelete, 
  onUpdate, 
  onExport, 
  onAddManual, 
  onSyncDrive,
  isSyncingDriveId,
  issuerId, 
  issuers 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  
  const filtered = purchases
    .filter(p => !issuerId || p.issuerId === issuerId || (issuerId === 'all' && purchases.some(px => px.id === p.id))) // If issuerId is provided, filter by it. Actually issuerId here comes from primaryIssuer in App.tsx
    .filter(p => p.vendor.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(p => statusFilter === 'all' || p.status === statusFilter);

  const totalTTC = filtered.reduce((sum, p) => sum + p.ttc, 0);
  const totalPending = filtered.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.ttc, 0);

  const toggleStatus = (p: Purchase) => {
    onUpdate({
      ...p,
      status: p.status === 'paid' ? 'pending' : 'paid'
    });
  };

  return (
    <div className="p-7 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-[#14120E] uppercase tracking-tight">Journal des Achats</h2>
          <p className="text-sm text-[#7A776F] mt-1 font-medium italic">Historique de vos dépenses et factures fournisseurs.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onAddManual}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1A56DB] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#1648C4] transition-all shadow-lg active:scale-95"
          >
            <PlusCircle size={16} /> Saisie Manuelle
          </button>
          <button 
            onClick={onExport}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#FAF8F4] text-[#7A776F] border border-[#E4E0D8] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#F1EDE5] transition-all active:scale-95"
          >
            <FileDown size={16} /> Exporter .CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-[#E4E0D8] shadow-sm">
          <p className="text-[10px] font-black text-[#7A776F] uppercase tracking-widest mb-1">Total TTC</p>
          <p className="text-2xl font-black text-[#14120E] font-mono tracking-tighter">{formatCurrency(totalTTC, 'DT')}</p>
        </div>
        <div className="bg-[#FFF1EE] p-6 rounded-2xl border border-[#C0280F]/10 shadow-sm">
          <p className="text-[10px] font-black text-[#C0280F] uppercase tracking-widest mb-1">À Payer</p>
          <p className="text-2xl font-black text-[#C0280F] font-mono tracking-tighter">{formatCurrency(totalPending, 'DT')}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#E4E0D8] shadow-sm md:col-span-2 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0ADA5]" />
            <input 
              placeholder="Rechercher un fournisseur..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl text-xs font-bold focus:border-[#1A56DB] outline-none"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-4 py-3 bg-[#FAF8F4] text-[#7A776F] border border-[#E4E0D8] rounded-xl text-xs font-black uppercase tracking-widest outline-none"
          >
            <option value="all">Tous</option>
            <option value="pending">En attente</option>
            <option value="paid">Payés</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-[#E4E0D8] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF8F4] border-b border-[#E4E0D8]">
                <th className="px-6 py-4 text-[10px] font-black text-[#7A776F] uppercase tracking-widest">Date / Échéance</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#7A776F] uppercase tracking-widest">Fournisseur</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#7A776F] uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#7A776F] uppercase tracking-widest">Catégorie</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#7A776F] uppercase tracking-widest">Total TTC</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-[#7A776F] uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E0D8]">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-[#FAF8F4]/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#14120E]">
                      <Calendar size={14} className="text-[#1A56DB]" />
                      {new Date(p.date).toLocaleDateString('fr-FR')}
                    </div>
                    {p.dueDate && (
                      <p className="text-[10px] text-[#C0280F] font-bold mt-1">Échéance: {new Date(p.dueDate).toLocaleDateString('fr-FR')}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-black text-[#14120E] uppercase">{p.vendor}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-[#7A776F] font-bold">Réf: {p.ref || '—'}</span>
                      {issuers.find(i => i.id === p.issuerId) && (
                        <span className="px-1.5 py-0.5 bg-[#FAF8F4] text-[#7A776F] border border-[#E4E0D8] rounded text-[8px] font-black uppercase">
                          {issuers.find(i => i.id === p.issuerId)?.name.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => toggleStatus(p)}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                        p.status === 'paid' 
                          ? 'bg-[#E6F8F4] text-[#0E7866] border border-[#0E7866]/10' 
                          : 'bg-[#FFF1EE] text-[#C0280F] border border-[#C0280F]/10 animate-pulse'
                      }`}
                    >
                      {p.status === 'paid' ? 'Payé' : 'En attente'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EBF2FF] text-[#1A56DB] text-[9px] font-black uppercase tracking-wider">
                      <Tag size={10} /> {p.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-black font-mono text-[#14120E]">{formatCurrency(p.ttc, 'DT')}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {p.driveFileUrl && (
                        <a 
                          href={p.driveFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-[#4285F4] hover:bg-[#EBF2FF] hover:text-[#1A56DB] rounded-lg transition-all"
                          title="Voir sur Google Drive"
                        >
                          <Cloud size={16} />
                        </a>
                      )}
                      {p.driveFolderUrl && (
                        <a 
                          href={p.driveFolderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-[#FBBC05] hover:bg-amber-50 hover:text-amber-500 rounded-lg transition-all"
                          title="Dossier Google Drive"
                        >
                          <FolderOpen size={16} />
                        </a>
                      )}
                      {!p.driveFileUrl && p.imageUrl && onSyncDrive && (
                        <button 
                          onClick={() => onSyncDrive(p)}
                          disabled={isSyncingDriveId === p.id}
                          className="p-2 text-gray-400 hover:text-[#0E7866] hover:bg-[#E6F8F4] rounded-lg transition-all disabled:opacity-50"
                          title="Synchroniser sur Google Drive"
                        >
                          {isSyncingDriveId === p.id ? (
                            <RefreshCw size={16} className="animate-spin" />
                          ) : (
                            <Cloud size={16} />
                          )}
                        </button>
                      )}
                      <button 
                        onClick={() => onDelete(p.id)}
                        className="p-2 text-[#C0280F]/60 hover:bg-[#FFF1EE] hover:text-[#C0280F] rounded-lg transition-all"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <ShoppingBag size={48} className="mx-auto text-[#E4E0D8] mb-4" />
                    <p className="text-sm font-black text-[#14120E] uppercase tracking-widest">Aucun achat trouvé</p>
                    <p className="text-xs text-[#7A776F] mt-1 font-medium italic">Commencez par scanner vos factures d'achat.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Purchases;
