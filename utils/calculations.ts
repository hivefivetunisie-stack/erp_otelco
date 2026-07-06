
import { Invoice, CalculationResult } from '../types';

export const calculateInvoice = (invoice: Invoice): CalculationResult => {
  let totalHT = 0;
  const tvaBreakdown: { [key: number]: number } = {};

  invoice.items.forEach(item => {
    const lineHT = item.quantity * item.unitPrice;
    totalHT += lineHT;
    
    const lineTVA = lineHT * (item.tvaRate / 100);
    tvaBreakdown[item.tvaRate] = (tvaBreakdown[item.tvaRate] || 0) + lineTVA;
  });

  const totalTVA = Object.values(tvaBreakdown).reduce((acc, val) => acc + val, 0);
  const totalTTC_NoTimbre = totalHT + totalTVA;
  
  // Le timbre fiscal est inclus dans le TTC final
  const totalTTC = totalTTC_NoTimbre + invoice.timbreFiscal;
  
  // La retenue à la source se calcule sur le HT
  const withholdingAmount = totalHT * (invoice.withholdingTaxRate / 100);
  const netToPay = totalTTC - withholdingAmount;

  return {
    totalHT,
    totalTVA,
    totalTTC,
    withholdingAmount,
    netToPay,
    tvaBreakdown
  };
};

import { CURRENCIES } from '../constants';
export { CURRENCIES };

export const formatCurrency = (amount: number, currencyCode: string = 'DT'): string => {
  const currency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
  return amount.toLocaleString('fr-FR', {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals
  });
};

export const numberToLetters = (amount: number, currencyCode: string = 'DT'): string => {
  const currency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
  const integerPart = Math.floor(amount);
  const factor = Math.pow(10, currency.decimals);
  const fractionalPart = Math.round((amount - integerPart) * factor);
  
  let unitName = "Dinars";
  let subUnitName = "Millimes";

  if (currencyCode === 'EUR') {
    unitName = "Euros";
    subUnitName = "Cents";
  } else if (currencyCode === 'USD' || currencyCode === 'CAD') {
    unitName = "Dollars";
    subUnitName = "Cents";
  }

  return `Arrêté la présente facture à la somme de : ${integerPart} ${unitName} et ${fractionalPart} ${subUnitName}.`;
};
