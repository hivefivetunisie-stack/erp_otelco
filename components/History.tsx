import React, { useState } from 'react';
import { Invoice } from '../types';
import { formatCurrency, calculateInvoice } from '../utils/calculations';
import { Eye, Clock, CheckCircle, XCircle, FileEdit, Trash2, Search, Calendar, Cloud, FolderOpen } from 'lucide-react';

interface HistoryProps {
  invoices: Invoice[];
  onViewInvoice: (invoice: Invoice) => void;
  onEditInvoice?: (invoice: Invoice) => void;
  onUpdateInvoice?: (invoice: Invoice) => void;
  onDeleteInvoice?: (id: string) => void;
}

const History: React.FC<HistoryProps> = ({ invoices, onViewInvoice, onEditInvoice, onUpdateInvoice, onDeleteInvoice }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const getDocTypeBadge = (type: string) => {
    switch (type) {
      case 'devis': return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black rounded uppercase tracking-tighter">DEVIS</span>;
      case 'recu': return <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[8px] font-black rounded uppercase tracking-tighter">REÇU</span>;
      case 'vente_espece': return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[8px] font-black rounded uppercase tracking-tighter">ESPÈCES</span>;
      default: return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-black rounded uppercase tracking-tighter">FACTURE</span>;
    }
  };

  const toggleInvoiceStatus = (inv: Invoice) => {
    if (!onUpdateInvoice) return;
    const nextStatus = inv.status === 'paid' ? 'pending' : 'paid';
    onUpdateInvoice({
      ...inv,
      status: nextStatus
    });
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.number.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         inv.client.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const invoiceDate = new Date(inv.date);
    const matchesStart = startDate ? invoiceDate >= new Date(startDate) : true;
    const matchesEnd = endDate ? invoiceDate <= new Date(endDate) : true;
    
    return matchesSearch && matchesStart && matchesEnd;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E6F8F4] text-[#0E7866] text-[10px] font-bold">
            <CheckCircle size={12} /> PAYÉ
          </span>
        );
      case 'cancelled':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFF1EE] text-[#C0280F] text-[10px] font-bold">
            <XCircle size={12} /> ANNULÉ
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EBF2FF] text-[#1A56DB] text-[10px] font-bold">
            <Clock size={12} /> EN ATTENTE
          </span>
        );
    }
  };

  return (
    <div className="p-7">
      <div className="bg-white rounded-2xl border border-[#E4E0D8] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E4E0D8] bg-white space-y-4 md:space-y-0 md:flex md:justify-between md:items-center">
           <h3 className="text-xs font-bold uppercase tracking-widest text-[#14120E]/40">Historique des Ventes</h3>
           <div className="flex flex-wrap gap-3">
             <div className="relative">
               <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#B0ADA5]" size={14} />
               <input 
                 type="text" 
                 placeholder="Rechercher..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="pl-9 pr-3 py-2 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl text-xs outline-none focus:border-[#1A56DB] min-w-[200px]" 
               />
             </div>
             <div className="flex items-center gap-2 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl px-2.5 py-1">
               <Calendar size={14} className="text-[#B0ADA5]" />
               <input 
                 type="date" 
                 value={startDate}
                 onChange={(e) => setStartDate(e.target.value)}
                 className="bg-transparent text-[10px] font-bold text-[#14120E] outline-none" 
               />
               <span className="text-[#B0ADA5] text-[10px]">→</span>
               <input 
                 type="date" 
                 value={endDate}
                 onChange={(e) => setEndDate(e.target.value)}
                 className="bg-transparent text-[10px] font-bold text-[#14120E] outline-none" 
               />
             </div>
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-[#F1EDE5] text-[#7A776F] uppercase text-[9px] font-bold">
              <tr>
                <th className="px-5 py-4">N° Facture</th>
                <th className="px-5 py-4">Client</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Montant TTC</th>
                <th className="px-5 py-4">Statut</th>
                <th className="px-5 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E0D8]">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-[#B0ADA5] italic">
                    Aucune facture trouvée.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => {
                  const totals = calculateInvoice(inv);
                  return (
                    <tr key={inv.id} className="hover:bg-[#FAF8F4] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-[#1A56DB] font-bold uppercase">{inv.number}</span>
                          {getDocTypeBadge(inv.documentType)}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-[#14120E]">{inv.client.name}</div>
                        <div className="text-[10px] text-[#7A776F]">{inv.client.mf}</div>
                      </td>
                      <td className="px-5 py-4 text-[#7A776F] font-mono">{inv.date}</td>
                      <td className="px-5 py-4 font-mono font-bold text-[#14120E]">
                        {formatCurrency(totals.totalTTC, inv.currency)}
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => toggleInvoiceStatus(inv)} className="hover:scale-105 transition-transform">
                          {getStatusBadge(inv.status)}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {inv.driveFileUrl && (
                            <a 
                              href={inv.driveFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-[#4285F4] hover:bg-[#EBF2FF] hover:text-[#1A56DB] rounded-lg transition-all"
                              title="Ouvrir sur Google Drive"
                            >
                              <Cloud size={16} />
                            </a>
                          )}
                          {inv.driveFolderUrl && (
                            <a 
                              href={inv.driveFolderUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-[#FBBC05] hover:bg-amber-50 hover:text-amber-500 rounded-lg transition-all"
                              title="Dossier Google Drive"
                            >
                              <FolderOpen size={16} />
                            </a>
                          )}
                          <button 
                            onClick={() => onViewInvoice(inv)}
                            className="p-2 text-[#7A776F] hover:bg-[#F1EDE5] hover:text-[#14120E] rounded-lg transition-all"
                            title="Voir"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => onEditInvoice?.(inv)}
                            className="p-2 text-[#7A776F] hover:bg-[#F1EDE5] hover:text-[#14120E] rounded-lg transition-all"
                            title="Modifier"
                          >
                            <FileEdit size={16} />
                          </button>
                          <button 
                            onClick={() => onDeleteInvoice?.(inv.id)}
                            className="p-2 text-[#C0280F]/60 hover:bg-[#FFF1EE] hover:text-[#C0280F] rounded-lg transition-all"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
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
    </div>
  );
};

export default History;
