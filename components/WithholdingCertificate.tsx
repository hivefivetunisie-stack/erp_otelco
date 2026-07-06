
import React from 'react';
import { Invoice } from '../types';
import { calculateInvoice, formatCurrency } from '../utils/calculations';
import { parseMF } from '../utils/mfHelper';

interface WithholdingCertificateProps {
  invoice: Invoice;
}

const Box: React.FC<{ children?: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
  <div className={`border border-black w-7 h-9 flex items-center justify-center font-bold text-sm bg-white text-black ${className}`}>
    {children}
  </div>
);

const MFGrid: React.FC<{ parsed: any }> = ({ parsed }) => (
  <div className="flex items-center">
    <div className="flex border-r-2 border-black mr-1 shadow-sm">
      {parsed.number.map((n: string, i: number) => (
        <Box key={i} className="border-r-0 last:border-r">{n}</Box>
      ))}
      <Box className="ml-1 bg-slate-50 border-l border-black font-serif italic text-blue-800">{parsed.control}</Box>
    </div>
    <Box className="mr-3 bg-slate-50 font-serif italic text-blue-800">{parsed.tva}</Box>
    <Box className="mr-3 bg-slate-50 font-serif italic text-blue-800">{parsed.category}</Box>
    <div className="flex shadow-sm">
      {parsed.etab.map((n: string, i: number) => (
        <Box key={i} className="border-r-0 last:border-r bg-slate-50">{n}</Box>
      ))}
    </div>
  </div>
);

const WithholdingCertificate: React.FC<WithholdingCertificateProps> = ({ invoice }) => {
  const results = calculateInvoice(invoice);
  const payerMF = parseMF(invoice.issuer.mf);
  const beneficiaryMF = parseMF(invoice.client.mf);

  const a4Style: React.CSSProperties = {
    width: '794px',
    height: '1122px',
    padding: '50px',
    backgroundColor: 'white',
    margin: '0 auto',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    color: 'black',
    fontFamily: 'serif'
  };

  const honorairesKeywords = /honoraire|commission|loyer|vacation|courtage|expertise|audit|conseil/i;
  
  const honorairesTotalHT = invoice.items
    .filter(item => honorairesKeywords.test(item.description))
    .reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  const marchesTotalHT = results.totalHT - honorairesTotalHT;

  return (
    <div style={a4Style} className="leading-relaxed border border-slate-200 text-black">
      
      {/* HEADER OFFICIEL */}
      <div className="flex justify-between items-start mb-10">
        <div className="text-[10px] font-bold space-y-1 uppercase tracking-tight">
          <p>REPUBLIQUE TUNISIENNE</p>
          <p>MINISTERE DES FINANCES</p>
          <p>DIRECTION GENERALE DU CONTROLE FISCAL</p>
        </div>
        <div className="text-center flex-1 px-4">
          <h1 className="text-xl font-black underline decoration-2 underline-offset-8 uppercase leading-tight mb-4">
            CERTIFICAT DE RETENUE D'IMPOT<br/>SUR LE REVENU OU SUR LES SOCIETES
          </h1>
        </div>
      </div>

      {/* SECTION A - PAYEUR */}
      <div className="border-2 border-black p-8 mb-8 relative">
        <div className="flex justify-between items-start mb-6">
          <h2 className="font-bold text-base border-b-2 border-black pb-1 uppercase text-black">A. - PERSONNE OU ORGANISME PAYEUR</h2>
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-black uppercase mb-2 text-black">IDENTIFIANT FISCAL</span>
            <MFGrid parsed={payerMF} />
          </div>
        </div>
        <div className="space-y-5 text-sm text-black">
          <p className="flex items-baseline gap-3">
            <span className="font-bold whitespace-nowrap">Dénomination :</span>
            <span className="flex-1 border-b-2 border-dotted border-black font-sans font-black text-base uppercase px-4">{invoice.issuer.name}</span>
          </p>
          <p className="flex items-baseline gap-3">
            <span className="font-bold whitespace-nowrap">Adresse du siège :</span>
            <span className="flex-1 border-b-2 border-dotted border-black font-sans px-4 italic">{invoice.issuer.address}</span>
          </p>
        </div>
      </div>

      {/* SECTION B - TABLEAU DES RETENUES */}
      <div className="mb-8">
        <table className="w-full border-collapse border-2 border-black text-black">
          <thead>
            <tr className="font-black text-center bg-gray-100 text-[10px] text-black">
              <th className="border-2 border-black p-4 text-left w-1/2 uppercase">B. - RETENUES EFFECTUEES SUR :</th>
              <th className="border-2 border-black p-4 w-[15%]">MONTANT BRUT ({invoice.currency})</th>
              <th className="border-2 border-black p-4 w-[15%]">TAUX (%)</th>
              <th className="border-2 border-black p-4 w-[15%]">MONTANT RETENU ({invoice.currency})</th>
            </tr>
          </thead>
          <tbody className="font-sans font-bold text-[12px]">
            <tr className="h-14">
              <td className="border-2 border-black p-4 text-[10px] text-black">- Marchés, travaux, fournitures</td>
              <td className="border-2 border-black p-4 text-right font-mono text-sm text-black">{marchesTotalHT > 0 ? formatCurrency(marchesTotalHT, invoice.currency) : "---"}</td>
              <td className="border-2 border-black p-4 text-center text-black">{marchesTotalHT > 0 ? (invoice.withholdingTaxRate + "%") : "0%"}</td>
              <td className="border-2 border-black p-4 text-right font-mono text-sm text-black">{marchesTotalHT > 0 ? formatCurrency(marchesTotalHT * (invoice.withholdingTaxRate / 100), invoice.currency) : "0,000"}</td>
            </tr>
            <tr className="h-14">
              <td className="border-2 border-black p-4 text-[10px] text-black">- Honoraires, commissions, loyers, vacations</td>
              <td className="border-2 border-black p-4 text-right font-mono text-sm text-black">{honorairesTotalHT > 0 ? formatCurrency(honorairesTotalHT, invoice.currency) : "---"}</td>
              <td className="border-2 border-black p-4 text-center text-black">{honorairesTotalHT > 0 ? (invoice.withholdingTaxRate + "%") : "---"}</td>
              <td className="border-2 border-black p-4 text-right font-mono text-sm text-black">{honorairesTotalHT > 0 ? formatCurrency(honorairesTotalHT * (invoice.withholdingTaxRate / 100), invoice.currency) : "0,000"}</td>
            </tr>
            <tr className="h-16 bg-gray-50">
              <td className="border-2 border-black p-4 text-right font-black uppercase text-[12px] text-black">Total Général de la retenue</td>
              <td className="border-2 border-black p-4 text-right font-mono text-base text-black">{formatCurrency(results.totalHT, invoice.currency)}</td>
              <td className="border-2 border-black p-4 text-center text-black">---</td>
              <td className="border-2 border-black p-4 text-right font-black font-mono text-base bg-yellow-50 text-black">{formatCurrency(results.withholdingAmount, invoice.currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* SECTION C - BENEFICIAIRE */}
      <div className="border-2 border-black p-8 mb-8 relative">
        <div className="flex justify-between items-start mb-6">
          <h2 className="font-bold text-base border-b-2 border-black pb-1 uppercase text-black">C. - BENEFICIAIRE DE LA RETENUE</h2>
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-black uppercase mb-2 text-black">IDENTIFIANT FISCAL BENEFICIAIRE</span>
            <MFGrid parsed={beneficiaryMF} />
          </div>
        </div>
        <div className="space-y-5 text-sm text-black">
          <p className="flex items-baseline gap-3">
            <span className="font-bold whitespace-nowrap">Nom ou raison sociale :</span>
            <span className="flex-1 border-b-2 border-dotted border-black font-sans font-black text-base uppercase px-4">{invoice.client.name}</span>
          </p>
          <p className="flex items-baseline gap-3">
            <span className="font-bold whitespace-nowrap">Adresse complète :</span>
            <span className="flex-1 border-b-2 border-dotted border-black font-sans px-4 italic">{invoice.client.address}</span>
          </p>
          <p className="flex items-baseline gap-3">
            <span className="font-bold whitespace-nowrap">Motif du règlement :</span>
            <span className="flex-1 border-b-2 border-dotted border-black font-sans px-4 italic">Facture N° {invoice.number} — {new Date(invoice.date).toLocaleDateString('fr-FR')}</span>
          </p>
        </div>
      </div>

      {/* SIGNATURE SECTION */}
      <div className="mt-auto flex justify-between items-end pb-10 text-black">
        <div className="text-[10px] max-w-[40%] italic font-bold">
          <p>* Ce certificat est délivré pour servir de justificatif de la retenue effectuée.</p>
        </div>
        <div className="text-center w-[50%] space-y-4">
          <p className="font-black text-xs uppercase">Fait à Tunis, le {new Date().toLocaleDateString('fr-FR')}</p>
          <div className="h-32 border-4 border-double border-black rounded-2xl flex flex-col items-center justify-center bg-slate-50">
            <span className="text-[8px] uppercase font-black text-slate-300 tracking-[0.3em]">Signature et Cachet du Payeur</span>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="pt-4 border-t border-gray-100 text-[8px] font-bold text-gray-400 uppercase tracking-widest flex justify-between">
        <span>Généré par FACTURATN PRO 2.0</span>
        <span>Réf : {invoice.id}</span>
      </div>
    </div>
  );
};

export default WithholdingCertificate;
