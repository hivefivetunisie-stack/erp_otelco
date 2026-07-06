
import React from 'react';
import { Invoice } from '../types';
import { formatCurrency, calculateInvoice, numberToLetters, CURRENCIES } from '../utils/calculations';
import { DEFAULT_ISSUER } from '../constants';

interface InvoicePreviewProps {
  invoice: Invoice;
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ invoice }) => {
  const results = calculateInvoice(invoice);
  const currency = CURRENCIES.find(c => c.code === invoice.currency) || CURRENCIES[0];

  // Dimensions A4 Standard International (210mm x 297mm)
  // Marge de 1cm demandée (10mm)
  const a4Style: React.CSSProperties = {
    width: '210mm',
    height: '297mm',
    padding: '10mm',
    backgroundColor: 'white',
    margin: '0 auto',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    color: '#1e293b',
    position: 'relative',
    fontFamily: '"Inter", sans-serif',
    fontSize: '11px',
    lineHeight: '1.2'
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'Immédiat') return dateStr;
    try {
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }).format(new Date(dateStr));
    } catch (e) {
      return dateStr;
    }
  };

  if (invoice.documentType === 'recu') {
    return (
      <div style={a4Style} id="document-to-print" className="pdf-stable overflow-hidden flex flex-col justify-between font-sans text-[#14120E] text-[11px] leading-relaxed">
        <div>
          {/* Header */}
          <div className="text-center mb-6 mt-4">
            <h1 className="text-2xl font-black text-black tracking-tight uppercase mb-2">REÇU DE PAIEMENT</h1>
            <p className="text-[12px] font-bold text-slate-800">
              N° de reçu : <span className="font-mono">{invoice.number}</span>
            </p>
            <p className="text-[12px] font-bold text-slate-800 mt-1">
              Date d'émission : <span>{formatDate(invoice.date)}</span>
            </p>
          </div>

          {/* 1. Informations Parties */}
          <div className="mb-6">
            <h3 className="text-[12px] font-extrabold border-b border-stone-200 pb-1 mb-3 text-black">1. Informations Parties</h3>
            
            <div className="grid grid-cols-2 gap-8">
              {/* Emetteur */}
              <div className="space-y-1">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wide mb-1.5">ÉMETTEUR (Prestataire / Vendeur)</h4>
                <ul className="space-y-1 text-[11px]">
                  <li className="flex items-start gap-1.5">
                    <span className="text-slate-400">•</span>
                    <span><strong className="font-bold">Nom / Entreprise :</strong> {invoice.issuer.name}</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-slate-400">•</span>
                    <span><strong className="font-bold">Adresse :</strong> {invoice.issuer.address}</span>
                  </li>
                  {invoice.issuer.phone && (
                    <li className="flex items-start gap-1.5">
                      <span className="text-slate-400">•</span>
                      <span><strong className="font-bold">Téléphone :</strong> {invoice.issuer.phone}</span>
                    </li>
                  )}
                  {invoice.issuer.email && (
                    <li className="flex items-start gap-1.5">
                      <span className="text-slate-400">•</span>
                      <span><strong className="font-bold">Email :</strong> {invoice.issuer.email}</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Client */}
              <div className="space-y-1">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wide mb-1.5">CLIENT (Payeur)</h4>
                <ul className="space-y-1 text-[11px]">
                  <li className="flex items-start gap-1.5">
                    <span className="text-slate-400">•</span>
                    <span><strong className="font-bold">Nom / Entreprise :</strong> {invoice.client.name}</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-slate-400">•</span>
                    <span><strong className="font-bold">Adresse :</strong> {invoice.client.address || "Non communiquée"}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* 2. Détails du Paiement */}
          <div className="mb-6">
            <h3 className="text-[12px] font-extrabold border-b border-stone-200 pb-1 mb-2.5 text-black">2. Détails du Paiement</h3>
            <p className="text-[11px] mb-3 text-slate-700 italic">
              Le soussigné <strong className="font-bold text-black">{invoice.issuer.name}</strong>, atteste avoir reçu de la part de <strong className="font-bold text-black">{invoice.client.name}</strong>, la somme détaillée ci-dessous.
            </p>

            <table className="w-full border-collapse border border-slate-300 text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-700 border-b border-slate-300">
                  <th className="py-2 px-3 border border-slate-300 w-[50%]">Description de la prestation / du produit</th>
                  <th className="py-2 px-3 border border-slate-300 text-center w-[15%]">Montant HT</th>
                  <th className="py-2 px-3 border border-slate-300 text-center w-[15%]">TVA [Si applicable]</th>
                  <th className="py-2 px-3 border border-slate-300 text-right w-[20%] font-black text-black">Montant TTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.items.map((item, idxx) => {
                  const itemHT = item.unitPrice * item.quantity;
                  const itemTVA = itemHT * (item.tvaRate / 100);
                  const itemTTC = itemHT + itemTVA;
                  return (
                    <tr key={idxx} className="text-[11px] text-slate-800">
                      <td className="py-2 px-3 border border-slate-300 font-medium">
                        {item.description}
                      </td>
                      <td className="py-2 px-3 border border-slate-300 text-center font-mono">
                        {formatCurrency(itemHT, invoice.currency)}
                      </td>
                      <td className="py-2 px-3 border border-slate-300 text-center font-mono">
                        {item.tvaRate > 0 ? `${item.tvaRate}%` : '0%'}
                      </td>
                      <td className="py-2 px-3 border border-slate-300 text-right font-mono font-bold text-black">
                        {formatCurrency(itemTTC, invoice.currency)}
                      </td>
                    </tr>
                  );
                })}
                {/* Empty buffer rows to replicate template aesthetic if list is short */}
                {invoice.items.length < 2 && (
                  <tr className="text-[11px] h-8">
                    <td className="py-2 px-3 border border-slate-300"></td>
                    <td className="py-2 px-3 border border-slate-300"></td>
                    <td className="py-2 px-3 border border-slate-300"></td>
                    <td className="py-2 px-3 border border-slate-300"></td>
                  </tr>
                )}
                {/* Total Row */}
                <tr className="bg-slate-50 text-[11px] font-black">
                  <td colSpan={3} className="py-2.5 px-3 border border-slate-300 uppercase tracking-wider text-black font-[900]">
                    MONTANT TOTAL PAYÉ
                  </td>
                  <td className="py-2.5 px-3 border border-slate-300 text-right font-mono text-[12px] text-black font-[900] bg-slate-100">
                    {formatCurrency(results.netToPay, invoice.currency)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="mt-3.5 flex items-start gap-1.5 text-[11px]">
              <span className="text-[#1A56DB] font-extrabold">•</span>
              <span>
                <strong className="font-bold text-slate-700">Montant en toutes lettres :</strong> <span className="uppercase font-black text-black">{numberToLetters(results.netToPay, invoice.currency)}</span>
              </span>
            </div>
          </div>

          {/* 3. Mode de Règlement */}
          <div className="mb-6">
            <h3 className="text-[12px] font-extrabold border-b border-stone-200 pb-1 mb-3 text-black">3. Mode de Règlement</h3>
            <ul className="space-y-2 text-[11px]">
              <li className="flex items-start gap-1.5">
                <span className="text-[#1A56DB] font-extrabold">•</span>
                <div className="flex items-baseline gap-1">
                  <strong className="font-bold text-slate-700 mr-2 shrink-0">Mode de paiement :</strong>
                  <div className="inline-flex flex-wrap items-center gap-3 text-black font-semibold">
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center font-mono text-[8px] ${(!invoice.paymentMethod || invoice.paymentMethod === 'especes') ? 'bg-black text-white border-black font-bold' : 'border-slate-300'}`}>
                        {(!invoice.paymentMethod || invoice.paymentMethod === 'especes') ? '✓' : ' '}
                      </span>
                      <span>Espèces</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center font-mono text-[8px] ${(invoice.paymentMethod === 'virement') ? 'bg-black text-white border-black font-bold' : 'border-slate-300'}`}>
                        {(invoice.paymentMethod === 'virement') ? '✓' : ' '}
                      </span>
                      <span>Virement</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center font-mono text-[8px] ${(invoice.paymentMethod === 'carte') ? 'bg-black text-white border-black font-bold' : 'border-slate-300'}`}>
                        {(invoice.paymentMethod === 'carte') ? '✓' : ' '}
                      </span>
                      <span>Carte bancaire</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center font-mono text-[8px] ${(invoice.paymentMethod === 'cheque') ? 'bg-black text-white border-black font-bold' : 'border-slate-300'}`}>
                        {(invoice.paymentMethod === 'cheque') ? '✓' : ' '}
                      </span>
                      <span>
                        Chèque {invoice.paymentMethod === 'cheque' && invoice.chequeNumber ? `(N° ${invoice.chequeNumber})` : '(N°_______)'}
                      </span>
                    </span>
                  </div>
                </div>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-[#1A56DB] font-extrabold">•</span>
                <span>
                  <strong className="font-bold text-slate-700">Date de réception des fonds :</strong> <span className="font-semibold text-black">{formatDate(invoice.dateReceived || invoice.date)}</span>
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#1A56DB] font-extrabold">•</span>
                <span>
                  <strong className="font-bold text-slate-700">Solde restant dû :</strong> <span className="font-bold text-black">{formatCurrency(invoice.remainingBalance || 0, invoice.currency)}</span> <span className="text-slate-500 font-medium italic text-[10px] ml-1">(Sauf indication contraire, ce document atteste du paiement intégral de la somme due)</span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Signature bottom section */}
        <div className="border-t border-slate-150 pt-4 mt-auto flex justify-between items-end">
          <div className="text-left">
            <h4 className="text-[11px] font-extrabold text-black mb-1">Signature</h4>
            <p className="text-[10px] text-slate-500 italic">Pour faire valoir ce que de droit.</p>
          </div>
          <div className="w-[180px] text-center">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wide mb-2">Signature de l'émetteur :</p>
            <div className="h-14 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center bg-slate-50/50">
               {invoice.issuer.logoUrl ? (
                 <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{invoice.issuer.name}</span>
               ) : (
                 <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Cachet & Signature</span>
               )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getDocTitle = () => {
    switch (invoice.documentType) {
      case 'devis': return 'DEVIS';
      case 'recu': return 'REÇU DE PAIEMENT';
      case 'vente_espece': return 'VENTE ESPÈCES';
      default: return 'FACTURE';
    }
  };

  const getDocSubTitle = () => {
    switch (invoice.documentType) {
      case 'devis': return 'Proposition Commerciale';
      case 'recu': return 'Justificatif de Règlement';
      case 'vente_espece': return 'Ticket de Vente';
      default: return 'Document Officiel';
    }
  };

  return (
    <div style={a4Style} id="document-to-print" className="pdf-stable overflow-hidden">
      
      {/* 1. HEADER : IDENTITÉ ÉMETTEUR */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
           {invoice.issuer.logoUrl ? (
             <img src={invoice.issuer.logoUrl} alt="Logo" className="h-14 object-contain" />
           ) : (
             <div className="h-14 w-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-sm">
               {invoice.issuer.name.charAt(0)}
             </div>
           )}
        </div>
        <div className="text-right">
           <h1 className="text-2xl font-[900] text-slate-900 mb-1 tracking-tighter uppercase">
             {invoice.issuer.name}
           </h1>
           <div className="text-[10px] text-slate-400 font-bold leading-tight uppercase tracking-wider">
              <p>{invoice.issuer.address}</p>
              <p className="text-slate-900 mt-0.5 font-black">Tunisie • {invoice.issuer.phone}</p>
              <div className="mt-2 inline-block bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200 text-[9px] font-mono font-bold tracking-widest">
                MF: {invoice.issuer.mf}
              </div>
           </div>
        </div>
      </div>

      {/* 2. RÉFÉRENCES & CLIENT */}
      <div className="grid grid-cols-2 gap-10 mb-8 items-start border-t border-slate-100 pt-5">
        <div className="space-y-3">
           <div>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">{getDocSubTitle()}</span>
              <h2 className="text-xl font-black text-slate-900 flex items-baseline gap-1 mt-0.5">
                {getDocTitle()} <span className="text-slate-300">#</span>{invoice.number}
              </h2>
           </div>
           
           <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Date d'émission</p>
                <p className="font-black text-slate-900 text-[11px] whitespace-nowrap">{formatDate(invoice.date)}</p>
              </div>
              <div className={`p-2.5 rounded-xl border ${invoice.dueDate === 'Immédiat' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Échéance de paiement</p>
                <p className={`font-black text-[11px] whitespace-nowrap ${invoice.dueDate === 'Immédiat' ? 'text-red-600' : 'text-slate-900'}`}>
                  {invoice.documentType === 'devis' ? 'VALIDITÉ 30 JOURS' : (invoice.dueDate === 'Immédiat' ? 'À RÉCEPTION' : formatDate(invoice.dueDate))}
                </p>
              </div>
           </div>
        </div>

        <div className="text-right flex flex-col items-end">
           <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1.5">Destinataire</span>
           <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 text-right w-full max-w-[260px] shadow-sm">
              <p className="text-[13px] font-black text-slate-900 uppercase leading-tight mb-1">{invoice.client.name}</p>
              <p className="text-[10px] text-slate-500 font-medium leading-snug mb-2">{invoice.client.address}</p>
               <div className="flex justify-end pt-1 border-t border-slate-200/50">
                <span className="text-[9px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                  M.F / S.I.R.E.T: {invoice.client.mf}
                </span>
              </div>
           </div>
        </div>
      </div>

      {/* 3. TABLEAU + TOTAUX */}
      <div className="mb-6 flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900">
              <th className="py-3 px-1 w-[55%] text-[9px] font-black uppercase tracking-[0.2em] text-slate-900">Désignation des services</th>
              <th className="py-3 px-1 text-center text-[9px] font-black uppercase tracking-[0.2em] text-slate-900">Qté</th>
              <th className="py-3 px-1 text-center text-[9px] font-black uppercase tracking-[0.2em] text-slate-900">P.U HT</th>
              <th className="py-3 px-1 text-right text-[9px] font-black uppercase tracking-[0.2em] text-slate-900">Montant HT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.items.map((item, idx) => (
              <tr key={idx} className="group">
                <td className="py-3 px-1">
                  <p className="text-[11px] font-bold text-slate-800">{item.description}</p>
                  <span className="inline-block mt-1 text-[8px] font-black bg-slate-50 text-slate-400 px-2 py-0.5 rounded-full uppercase">TVA {item.tvaRate}%</span>
                </td>
                <td className="py-3 px-1 text-center text-[11px] font-bold text-slate-900">{item.quantity.toFixed(2).replace('.', ',')}</td>
                <td className="py-3 px-1 text-center text-[10px] font-mono text-slate-500">{item.unitPrice.toFixed(invoice.currency === 'DT' ? 3 : 2).replace('.', ',')}</td>
                <td className="py-3 px-1 text-right text-[11px] font-black text-slate-900">
                  {formatCurrency(item.unitPrice * item.quantity, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
          {/* FOOTER : TOTAUX AVEC TAILLES RÉDUITES */}
          <tfoot>
            <tr>
              <td colSpan={2} rowSpan={6} className="pt-[15mm] align-top pr-12">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4 shadow-inner">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Note au client</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed italic">
                    {invoice.notes || "Nous vous remercions pour votre collaboration. Règlement par virement ou chèque à l'ordre de la société."}
                  </p>
                </div>
                <div className="border-l-4 border-slate-900 pl-4 py-1">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mb-1">Arrêté la présente facture à la somme de :</p>
                  <p className="text-[10px] font-black text-slate-900 leading-tight uppercase">
                    {numberToLetters(results.netToPay, invoice.currency)}
                  </p>
                </div>
              </td>
              <td className="pt-[15mm] pb-1.5 px-1 text-right text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total HT</td>
              <td className="pt-[15mm] pb-1.5 px-1 text-right text-[10px] font-mono font-bold text-slate-900 border-b border-slate-100">{formatCurrency(results.totalHT, invoice.currency)}</td>
            </tr>
            <tr>
              <td className="py-1 px-1 text-right text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total TVA</td>
              <td className="py-1 px-1 text-right text-[10px] font-mono font-bold text-slate-900 border-b border-slate-100">{formatCurrency(results.totalTVA, invoice.currency)}</td>
            </tr>
            {invoice.timbreFiscal > 0 && (
              <tr>
                <td className="py-1 px-1 text-right text-[9px] font-bold text-slate-400 uppercase tracking-wider">Timbre Fiscal</td>
                <td className="py-1 px-1 text-right text-[10px] font-mono font-bold text-slate-900 border-b border-slate-100">{formatCurrency(invoice.timbreFiscal, invoice.currency)}</td>
              </tr>
            )}
            <tr>
              <td className="py-2 px-1 text-right text-[10px] font-black text-slate-900 uppercase">Total TTC</td>
              <td className="py-2 px-1 text-right text-[13px] font-black text-slate-900 bg-slate-50 rounded-bl-xl border-b border-slate-100">
                {formatCurrency(results.totalTTC, invoice.currency)} <span className="text-[8px] font-bold">{currency.symbol}</span>
              </td>
            </tr>
            {invoice.withholdingTaxRate > 0 && (
              <tr>
                <td className="py-1 px-1 text-right text-[9px] font-bold text-red-600 uppercase tracking-wider">Retenue ({invoice.withholdingTaxRate}%)</td>
                <td className="py-1 px-1 text-right text-[10px] font-mono font-bold text-red-600 border-b border-slate-100">-{formatCurrency(results.withholdingAmount, invoice.currency)}</td>
              </tr>
            )}
            <tr>
              <td className="py-3 px-1 text-right text-[11px] font-black text-slate-900 uppercase">Net à Payer</td>
              <td className="py-3 px-1 text-right text-[18px] font-[900] text-slate-900 tracking-tighter bg-slate-100 rounded-b-2xl border-t-2 border-slate-900">
                {formatCurrency(results.netToPay, invoice.currency)} <span className="text-[10px] font-bold">{currency.symbol}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 4. BAS DE PAGE : BANQUE & SIGNATURE */}
      <div className="mt-auto">
        <div className="flex justify-between items-end gap-10 mb-6">
           <div className="flex-1">
             <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col gap-3 shadow-lg">
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-50">Règlement Bancaire ({invoice.bankAccountType === 'dinars' ? 'DINARS' : 'DEVISES'})</span>
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-black">{invoice.issuer.bankAccounts?.[invoice.bankAccountType].bankName || DEFAULT_ISSUER.bankName}</span>
                    <span className="h-4 w-px bg-white/20"></span>
                    <span className="text-[11px] font-mono font-bold tracking-widest">{invoice.issuer.bankAccounts?.[invoice.bankAccountType].rib || DEFAULT_ISSUER.rib}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 border-t border-white/10 pt-2">
                  <div className="flex items-center gap-4 text-[9px]">
                    <span className="opacity-50 uppercase font-bold">IBAN:</span>
                    <span className="font-mono font-bold tracking-wider">{invoice.issuer.bankAccounts?.[invoice.bankAccountType].iban || DEFAULT_ISSUER.iban}</span>
                    <span className="opacity-50 uppercase font-bold ml-2">Swift:</span>
                    <span className="font-mono font-bold tracking-wider">{invoice.issuer.bankAccounts?.[invoice.bankAccountType].swift || DEFAULT_ISSUER.swift}</span>
                  </div>
                  <div className="text-[8px] opacity-70 italic">
                    Nature: {invoice.issuer.bankAccounts?.[invoice.bankAccountType].nature}
                  </div>
                </div>
             </div>
           </div>

           <div className="w-[180px] text-center">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">Cachet et Signature</p>
             <div className="h-20 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center bg-slate-50/30">
                <span className="text-[9px] font-black text-slate-200 uppercase tracking-widest">Validation Émetteur</span>
             </div>
           </div>
        </div>

        <div className="pt-4 border-t border-slate-100 text-center">
          <div className="inline-flex items-center gap-6 text-[9px] font-bold text-slate-300 uppercase tracking-widest">
            <span>Cap. Soc: {DEFAULT_ISSUER.capital} DT</span>
            {invoice.issuer.rc && (
              <>
                <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                <span>R.C: {invoice.issuer.rc}</span>
              </>
            )}
            <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
            <span className="text-slate-500">Tunis, Tunisie • Certification LF 2026 • FacturaTN Pro</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default InvoicePreview;
