import React, { useState } from 'react';
import { LayoutDashboard, TrendingUp, Receipt, Users, Package, Calendar, Search } from 'lucide-react';
import { Invoice, Purchase, Subscription, BuvetteSale } from '../types';
import { formatCurrency, calculateInvoice } from '../utils/calculations';

interface DashboardProps {
  invoices: Invoice[];
  purchases: Purchase[];
  subscriptions: Subscription[];
  buvetteSales: BuvetteSale[];
  employees: any[];
  pointings: any[];
  operations?: any[];
  canViewFinancials?: boolean;
  issuerName?: string;
  dateRange: { start: string; end: string };
  onDateRangeChange: (range: { start: string; end: string }) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  invoices, 
  purchases, 
  subscriptions, 
  buvetteSales, 
  employees,
  pointings,
  operations,
  canViewFinancials = true, 
  issuerName, 
  dateRange, 
  onDateRangeChange 
}) => {
  const isSynergy = issuerName?.toLowerCase().includes('synergy');
  const isOtelco = issuerName?.toLowerCase().includes('otelco');

  const filteredBuvetteSales = (buvetteSales || []).filter(s => {
    if (!dateRange.start && !dateRange.end) return true;
    const sDate = new Date(s.date);
    const start = dateRange.start ? new Date(dateRange.start) : new Date(0);
    const end = dateRange.end ? new Date(dateRange.end) : new Date();
    return sDate >= start && sDate <= end;
  });

  const filteredPointings = (pointings || []).filter(p => {
    if (!dateRange.start && !dateRange.end) return true;
    const pDate = new Date(p.date);
    const start = dateRange.start ? new Date(dateRange.start) : new Date(0);
    const end = dateRange.end ? new Date(dateRange.end) : new Date();
    return pDate >= start && pDate <= end;
  });

  const totalBuvetteRevenue = filteredBuvetteSales.reduce((sum, s) => sum + s.totalAmount, 0);

  const filteredInvoices = invoices.filter(inv => {
    if (!dateRange.start && !dateRange.end) return true;
    const invDate = new Date(inv.date);
    const start = dateRange.start ? new Date(dateRange.start) : new Date(0);
    const end = dateRange.end ? new Date(dateRange.end) : new Date();
    return invDate >= start && invDate <= end;
  });

  const filteredPurchases = purchases.filter(p => {
    if (!dateRange.start && !dateRange.end) return true;
    const pDate = new Date(p.date);
    const start = dateRange.start ? new Date(dateRange.start) : new Date(0);
    const end = dateRange.end ? new Date(dateRange.end) : new Date();
    return pDate >= start && pDate <= end;
  });

  // Synergy Pointing Stats
  const pointingStats = {
    present: filteredPointings.filter(p => p.status === 'present' || p.status === 'late').length,
    late: filteredPointings.filter(p => p.status === 'late').length,
    absent: filteredPointings.filter(p => p.status === 'absent').length,
    totalExpected: (employees?.length || 0) * (dateRange.start ? 22 : 1) // Rough estimation if range provided
  };

  const presenceRate = pointingStats.totalExpected > 0 
    ? Math.round((pointingStats.present / pointingStats.totalExpected) * 100) 
    : 0;

  // Operation Costs
  const opCosts = (operations || []).map(op => {
    const opPoints = filteredPointings.filter(p => p.operationId === op.id && (p.type === 'work' || p.type === 'leave'));
    const totalHours = opPoints.reduce((acc, p) => acc + (p.hours || 0), 0);
    const totalCost = opPoints.reduce((sum, p) => {
      const emp = employees.find(e => e.id === p.employeeId);
      const rate = (op.roleRates?.[emp?.role || ''] ?? op.hourlyRate) || 0;
      return sum + (p.hours * rate);
    }, 0);
    return { ...op, totalHours, totalCost };
  }).filter(c => c.totalHours > 0);

  // Real stats calculation
  const stats = filteredInvoices.reduce((acc, inv) => {
    const totals = calculateInvoice(inv);
    acc.totalHT += totals.totalHT;
    acc.totalTVA += totals.totalTVA;
    acc.totalTTC += totals.totalTTC;
    
    Object.entries(totals.tvaBreakdown).forEach(([rate, amount]) => {
      acc.tvaBreakdown[Number(rate)] = (acc.tvaBreakdown[Number(rate)] || 0) + amount;
    });
    
    return acc;
  }, { 
    totalHT: 0, 
    totalTVA: 0, 
    totalTTC: 0, 
    tvaBreakdown: {} as { [key: number]: number } 
  });

  const totalSubscriptionRevenue = (subscriptions || [])
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + s.monthlyPrice, 0);

  const totalPurchaseTTC = filteredPurchases.reduce((sum, p) => sum + p.ttc, 0);
  const totalPurchaseTVA = filteredPurchases.reduce((sum, p) => sum + p.tva, 0);
  const totalPendingPurchases = filteredPurchases.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.ttc, 0);

  const tvaNet = stats.totalTVA - totalPurchaseTVA;

  // Calcul des échéances
  const monthlyMaturities = [
    ...filteredInvoices
      .filter(inv => inv.status !== 'paid')
      .map(inv => ({ 
        id: inv.id, 
        type: 'Vente', 
        name: inv.client.name, 
        amount: calculateInvoice(inv).totalTTC, 
        date: inv.dueDate, 
        number: inv.number,
        currency: inv.currency
      })),
    ...filteredPurchases
      .filter(p => p.status !== 'paid')
      .map(p => ({ 
        id: p.id, 
        type: 'Achat', 
        name: p.vendor, 
        amount: p.ttc, 
        date: p.dueDate || p.date, 
        number: p.ref || '—',
        currency: 'DT'
      }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const labelStyle = "block text-[9px] font-black text-[#7A776F] mb-1 uppercase tracking-widest";
  const inputStyle = "px-3 py-1.5 bg-white border border-[#E4E0D8] rounded-lg text-[11px] font-bold text-[#14120E] outline-none focus:border-[#1A56DB]";

  return (
    <div className="p-7 space-y-7 pb-20">
      {/* Search & Filter Bar */}
      <div className="bg-white p-6 rounded-2xl border border-[#E4E0D8] shadow-sm flex flex-col md:flex-row gap-6 items-end text-left">
        <div className="flex-1 space-y-2">
          <h2 className="text-sm font-black text-[#14120E] uppercase tracking-widest flex items-center gap-2">
            <LayoutDashboard size={16} className="text-[#1A56DB]" />
            Tableau de Bord {isSynergy ? 'Call Center' : (isOtelco ? 'Coworking' : '')} 
            {issuerName && <span className="text-[#1A56DB] ml-2">/ {issuerName}</span>}
          </h2>
          <p className="text-[10px] text-[#7A776F] font-medium italic text-left">
            {isSynergy 
              ? "Suivi du personnel, facturation et indicateurs de performance call center." 
              : (isOtelco 
                  ? "Suivi des abonnements, occupation de l'espace et ventes buvette." 
                  : "Suivi des performances et échéances de paiement.")
            }
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className={labelStyle}>Du</label>
            <input 
              type="date" 
              value={dateRange.start} 
              onChange={e => onDateRangeChange({...dateRange, start: e.target.value})}
              className={inputStyle}
            />
          </div>
          <div>
            <label className={labelStyle}>Au</label>
            <input 
              type="date" 
              value={dateRange.end} 
              onChange={e => onDateRangeChange({...dateRange, end: e.target.value})}
              className={inputStyle}
            />
          </div>
          <button 
            onClick={() => onDateRangeChange({ start: '', end: '' })}
            className="px-4 py-2 bg-[#F1EDE5] text-[#7A776F] rounded-lg text-[10px] font-black uppercase hover:bg-[#E4E0D8] transition-all"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {isSynergy ? (
          <>
            <StatCard 
              label="Présences" 
              value={`${pointingStats.present}`} 
              subText={`${presenceRate}% Taux présence`} 
              color="blue" 
            />
            <StatCard 
              label="Retards" 
              value={`${pointingStats.late}`} 
              subText="Sur la période" 
              color="amber" 
            />
            <StatCard 
              label="Absences" 
              value={`${pointingStats.absent}`} 
              subText="Total personnel" 
              color="red" 
            />
            <StatCard 
              label="CA Factures HT" 
              value={formatCurrency(stats.totalHT, 'DT')} 
              subText={`${filteredInvoices.length} facture(s)`} 
              color="blue" 
            />
            <StatCard 
              label="Achats TTC" 
              value={formatCurrency(totalPurchaseTTC, 'DT')} 
              subText={`${filteredPurchases.length} achat(s)`} 
              color="red" 
            />
            <StatCard 
              label="Dettes Fourn." 
              value={formatCurrency(totalPendingPurchases, 'DT')} 
              subText="En attente" 
              color="amber" 
            />
          </>
        ) : isOtelco ? (
          <>
            <StatCard 
              label="CA Abonnements" 
              value={formatCurrency(totalSubscriptionRevenue, 'DT')} 
              subText={`${subscriptions.filter(s => s.status === 'active').length} locataires`} 
              color="blue" 
            />
             <StatCard 
              label="Revenu Buvette" 
              value={formatCurrency(totalBuvetteRevenue, 'DT')} 
              subText={`${filteredBuvetteSales.length} ticket(s)`} 
              color="teal" 
            />
            <StatCard 
              label="CA Factures HT" 
              value={formatCurrency(stats.totalHT, 'DT')} 
              subText={`${filteredInvoices.length} facture(s)`} 
              color="blue" 
            />
            <StatCard 
              label="Total TTC Émis" 
              value={formatCurrency(stats.totalTTC + totalBuvetteRevenue, 'DT')} 
              subText="Ventes + Buvette" 
              color="teal" 
            />
            <StatCard 
              label="Achats TTC" 
              value={formatCurrency(totalPurchaseTTC, 'DT')} 
              subText={`${filteredPurchases.length} achat(s)`} 
              color="red" 
            />
            <StatCard 
              label="Dettes Fourn." 
              value={formatCurrency(totalPendingPurchases, 'DT')} 
              subText="En attente" 
              color="amber" 
            />
          </>
        ) : (
          <>
            <StatCard 
              label="CA Factures HT" 
              value={formatCurrency(stats.totalHT, 'DT')} 
              subText={`${filteredInvoices.length} facture(s)`} 
              color="blue" 
            />
            <StatCard 
              label="Revenu Buvette" 
              value={formatCurrency(totalBuvetteRevenue, 'DT')} 
              subText={`${filteredBuvetteSales.length} ticket(s)`} 
              color="teal" 
            />
            <StatCard 
              label="Achats TTC" 
              value={formatCurrency(totalPurchaseTTC, 'DT')} 
              subText={`${filteredPurchases.length} achat(s)`} 
              color="red" 
            />
            <StatCard 
              label="Dettes Fourn." 
              value={formatCurrency(totalPendingPurchases, 'DT')} 
              subText="En attente" 
              color="amber" 
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-7">
        <div className="xl:col-span-2 space-y-7">
          {/* Échéances Section */}
          <div className="bg-white rounded-2xl border border-[#E4E0D8] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#E4E0D8] flex justify-between items-center bg-[#FAF8F4]/30">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#14120E]">Suivi des Échéances</h3>
              <span className="px-2 py-1 bg-[#1A56DB] text-white text-[9px] font-black rounded-lg uppercase">{monthlyMaturities.length} Dossiers</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-[#FAF8F4] text-[#7A776F] uppercase text-[9px] font-bold">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Tiers</th>
                    {canViewFinancials && <th className="px-4 py-3">Montant</th>}
                    <th className="px-4 py-3">Échéance</th>
                    <th className="px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E0D8]">
                  {monthlyMaturities.length > 0 ? monthlyMaturities.map(item => {
                    const isOverdue = new Date(item.date) < new Date() && item.date !== 'Immédiat';
                    return (
                      <tr key={item.id} className="hover:bg-[#FAF8F4] transition-colors">
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${item.type === 'Vente' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-left">
                          {item.name}
                          <p className="text-[8px] text-[#ACA9A2] font-bold font-mono">Ref: {item.number}</p>
                        </td>
                        {canViewFinancials && (
                          <td className="px-4 py-3 font-mono font-bold">
                            {formatCurrency(item.amount, item.currency)}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <span className={`${isOverdue ? 'text-red-600 font-black' : 'text-[#7A776F] font-bold'}`}>
                            {item.date === 'Immédiat' ? 'Immédiat' : new Date(item.date).toLocaleDateString('fr-FR')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                           <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${isOverdue ? 'bg-red-500 animate-ping' : 'bg-amber-400'}`} />
                              <span className="text-[8px] font-black uppercase tracking-wider">{isOverdue ? 'En retard' : 'À venir'}</span>
                           </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-[#7A776F] italic font-medium">Aucune échéance à afficher sur cette période.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {canViewFinancials && (
          <div className="space-y-7">
            {isSynergy && opCosts.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E4E0D8] shadow-sm p-6 text-left">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#14120E]/40 mb-6">Bilan Heures Production</h3>
                <div className="space-y-4">
                  {opCosts.map(op => (
                    <div key={op.id} className="flex justify-between items-center pb-3 border-b border-[#E4E0D8] last:border-0">
                      <div>
                        <span className="text-[11px] font-bold text-[#14120E] block">{op.name}</span>
                        <span className="text-[9px] text-[#7A776F] font-medium">{op.totalHours} heures accumulées</span>
                      </div>
                      <span className="text-[11px] font-mono font-black text-[#0E7866]">{formatCurrency(op.totalCost, 'DT')}</span>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-[#E4E0D8] flex justify-between items-center">
                    <span className="text-[10px] font-black text-[#14120E] uppercase tracking-widest">Coût Total Production</span>
                    <span className="text-sm font-black font-mono text-[#C0280F]">
                      {formatCurrency(opCosts.reduce((sum, c) => sum + c.totalCost, 0), 'DT')}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl border border-[#E4E0D8] shadow-sm p-6 text-left">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#14120E]/40 mb-6">Récupération TVA</h3>
              <div className="space-y-4">
                <TvaItem label="TVA Collectée (Ventes)" value={formatCurrency(stats.totalTVA, 'DT')} />
                <TvaItem label="TVA Déductible (Achats)" value={formatCurrency(totalPurchaseTVA, 'DT')} color="text-red-600" />
                
                <div className="pt-4 border-t border-[#E4E0D8] flex flex-col gap-3">
                  <p className="text-[10px] font-black text-[#7A776F] uppercase tracking-widest">Détail TVA Collectée :</p>
                  {Object.entries(stats.tvaBreakdown).map(([rate, amount]) => (
                    <div key={rate} className="flex justify-between items-center px-4 py-2 bg-[#FAF8F4] rounded-lg text-left">
                      <span className="text-[10px] font-bold text-[#14120E]">TVA {rate}%</span>
                      <span className="text-[10px] font-mono font-bold">{formatCurrency(amount as number, 'DT')}</span>
                    </div>
                  ))}
                </div>

                <div className={`p-5 rounded-2xl flex justify-between items-center mt-6 ${tvaNet >= 0 ? 'bg-[#EBF2FF] border border-[#1A56DB]/10' : 'bg-[#E6F8F4] border border-[#0E7866]/10'}`}>
                  <div className="text-left">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${tvaNet >= 0 ? 'text-[#1A56DB]' : 'text-[#0E7866]'}`}>
                      {tvaNet >= 0 ? 'TVA NETTE À PAYER' : 'REPORT CRÉDIT TVA'}
                    </span>
                    <p className="text-[9px] text-[#7A776F] mt-0.5 italic">Calcul basé sur les documents filtrés</p>
                  </div>
                  <span className={`text-xl font-black font-mono tracking-tighter ${tvaNet >= 0 ? 'text-[#1A56DB]' : 'text-[#0E7866]'}`}>
                    {formatCurrency(Math.abs(tvaNet), 'DT')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ label, value, subText, color }: { label: string, value: string, subText: string, color: 'blue' | 'teal' | 'red' | 'amber' }) => {
  const colors = {
    blue: 'border-t-[#1A56DB]',
    teal: 'border-t-[#0E7866]',
    red: 'border-t-[#C0280F]',
    amber: 'border-t-[#92400E]'
  };

  return (
    <div className={`bg-white border border-[#E4E0D8] border-t-2 ${colors[color]} rounded-xl p-5 shadow-sm text-left`}>
      <div className="text-[10px] font-bold text-[#7A776F] uppercase tracking-widest mb-2">{label}</div>
      <div className="text-2xl font-black text-[#14120E] font-mono tracking-tighter mb-1">{value}</div>
      <div className="text-[11px] text-[#B0ADA5] font-medium">{subText}</div>
    </div>
  );
};

const TvaItem = ({ label, value, color = 'text-[#14120E]' }: { label: string, value: string, color?: string }) => (
  <div className="flex justify-between items-center pb-3 border-b border-[#E4E0D8] last:border-0 text-left">
    <span className="text-[11px] font-medium text-[#7A776F]">{label}</span>
    <span className={`text-[11px] font-mono font-semibold ${color}`}>{value}</span>
  </div>
);

export default Dashboard;
