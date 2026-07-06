
export interface MFParsed {
  number: string[]; // 7 digits
  control: string;  // 1 char (S, P, etc.)
  tva: string;      // 1 char (A, B, P, N, L...)
  category: string; // 1 char (M, C, P, N, E...)
  etab: string[];   // 3 digits
}

export const parseMF = (mfString: string): MFParsed => {
  // Format attendu: 1234567S/A/M/000 ou 1234567 S/A/M/000
  const clean = mfString.replace(/\s/g, '').replace(/\//g, '');
  
  return {
    number: clean.substring(0, 7).split('').concat(Array(7).fill('')).slice(0, 7),
    control: clean.substring(7, 8) || '',
    tva: clean.substring(8, 9) || '',
    category: clean.substring(9, 10) || '',
    etab: clean.substring(10, 13).split('').concat(Array(3).fill('')).slice(0, 3)
  };
};
