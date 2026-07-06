
export const getNextInvoiceNumber = (): string => {
  const now = new Date();
  const currentYear = now.getFullYear().toString();
  
  const lastYear = localStorage.getItem('factura_last_year');
  let lastCounter = parseInt(localStorage.getItem('factura_last_counter') || '0');

  // Si on change d'année, on repart de 1
  if (lastYear !== currentYear) {
    lastCounter = 1;
    localStorage.setItem('factura_last_year', currentYear);
  } else {
    lastCounter += 1;
  }

  // On ne sauvegarde pas encore définitivement ici pour éviter les sauts de numéro accidentels
  // On renvoie juste le format FAC-YYYY-NNNNN
  return `FAC-${currentYear}-${String(lastCounter).padStart(5, '0')}`;
};

export const confirmInvoiceNumber = (number: string) => {
  const parts = number.split('-');
  if (parts.length === 3) {
    const year = parts[1];
    const counter = parseInt(parts[2]);
    localStorage.setItem('factura_last_year', year);
    localStorage.setItem('factura_last_counter', counter.toString());
  }
};
