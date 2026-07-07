
export const TVA_RATES = [0, 7, 13, 19];
export const WITHHOLDING_RATES = [0, 1, 1.5, 5, 10, 15];
export const TIMBRE_FISCAL_VALUE = 1.000;
export const CURRENCIES = [
  { code: 'DT', name: 'Dinar Tunisien', symbol: 'DT', decimals: 3 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  { code: 'USD', name: 'Dollar US', symbol: '$', decimals: 2 },
  { code: 'CAD', name: 'Dollar Canadien', symbol: 'C$', decimals: 2 }
];

export const DEFAULT_ISSUER: any = {
  id: 'iss-default',
  name: "SYNERGY GROWTH",
  address: "RUE DU LAC CONCTANCE IMM DU LAC CONSTANCE BLOC A, BERGE DE LAC",
  mf: "1927630J",
  rc: "",
  phone: "+216 22 828 957",
  email: "hivefivetunisie@gmail.com",
  logoUrl: "",
  bankAccounts: {
    devises: {
      label: "Compte en Devises",
      bankName: "ZITOUNA",
      rib: "25127000000147115258",
      iban: "TN59 2512 7000 0001 4711 5258",
      swift: "BZITTNTTXXX",
      nature: "COMPTE PROFESSIONNEL EN DEVISES"
    },
    dinars: {
      label: "Compte en Dinars",
      bankName: "ZITOUNA",
      rib: "25127000000147035621",
      iban: "TN59 2512 7000 0001 4703 5621",
      swift: "BZITTNTTXXX",
      nature: "COMPTES CHEQUES ENTREPRISES"
    }
  },
  isDefault: true
};

export const FIXED_CLIENTS = [
  {
    name: "SASU SH",
    address: "25 RUE DE PONTHIEU, 75008 PARIS",
    mf: "905 149 738",
    rc: "",
    phone: "",
    email: "",
    isProfessional: true
  },
  {
    name: "Dictalive SAL",
    address: "Jounieh, Sarba, Immeuble St. Georges 961, Liban",
    mf: "1803748",
    rc: "",
    phone: "",
    email: "",
    isProfessional: true
  },
  {
    name: "QUALICONTACT",
    address: "38 rue Mozart – 92 110 Clichy France",
    mf: "394573497",
    rc: "",
    phone: "",
    email: "",
    isProfessional: true
  },
  {
    name: "Phone vision",
    address: "Avenue Habib Bourguiba, Tunis",
    mf: "1452637/A/M/000",
    rc: "B0112342023",
    phone: "+216 71 123 456",
    email: "contact@phonevision.tn",
    isProfessional: true
  },
  {
    name: "Itphoneserve",
    address: "Technopole El Ghazala, Ariana",
    mf: "0987654/B/C/001",
    rc: "B0298762022",
    phone: "+216 70 987 654",
    email: "info@itphoneserve.com",
    isProfessional: true
  }
];

export const DEFAULT_CLIENT: any = FIXED_CLIENTS[0];

export const DEFAULT_USER_PERMISSIONS = {
  canViewFinancials: false,
  canManageInvoices: false,
  canManagePurchases: false,
  canManageInventory: false,
  canManageSpaces: false,
  canManageSales: false,
  canManageBuvette: false,
  canManageClients: false,
  canManageArticles: false,
  canManageSubscriptions: false,
  canManageAttendance: false,
  canManageEmployees: false,
  canManageOperations: false,
  canManageUsers: false,
  canManageSettings: false
};

export const SERVEUR_USER_PERMISSIONS = {
  canViewFinancials: false,
  canManageInvoices: false,
  canManagePurchases: false,
  canManageInventory: true,
  canManageSpaces: false,
  canManageSales: true,
  canManageBuvette: true,
  canManageClients: true,
  canManageArticles: false,
  canManageSubscriptions: false,
  canManageAttendance: false,
  canManageEmployees: false,
  canManageOperations: false,
  canManageUsers: false,
  canManageSettings: false
};

export const PREDEFINED_ARTICLES = [
  // Coworking Category - Space details for OTELCO Coworking Space
  { id: 'pa-co01', ref: 'OTELCO-NOM', name: 'Desk Nomade (Coworking OTELCO - Bureau Partagé)', description: 'Accès libre à un poste de travail partagé avec internet THD en Wi-Fi, thé/café inclus.', price: 25.000, tva: 19, unit: 'Jour', category: 'Coworking' },
  { id: 'pa-co02', ref: 'OTELCO-FIX', name: 'Desk Fixe (Coworking OTELCO - Bureau Dédié)', description: 'Poste de travail personnel réservé, casier sécurisé, quota d\'impressions et d\'heures de salle de réunion inclus.', price: 350.000, tva: 19, unit: 'Mois', category: 'Coworking' },
  { id: 'pa-co03', ref: 'OTELCO-PRIV', name: 'Bureau Privatif Équipé (Coworking OTELCO)', description: 'Bureau fermé clé en main de 1 à 4 personnes, mobilier ergonomique, entretien quotidien, accès 24/7.', price: 1200.000, tva: 19, unit: 'Mois', category: 'Coworking' },
  { id: 'pa-co04', ref: 'OTELCO-MEET', name: 'Salle de Réunion Équipée (Coworking OTELCO)', description: 'Salle climatisée, écran de projection 4K, pieuvre d\'audioconférence, tableau blanc interactif.', price: 45.000, tva: 19, unit: 'Heure', category: 'Coworking' },
  { id: 'pa-co05', ref: 'OTELCO-DOM', name: 'Domiciliation d\'Entreprise Prestige (OTELCO)', description: 'Adresse de siège social prestigieuse, gestion et numérisation quotidienne du courrier avec alertes email.', price: 50.000, tva: 19, unit: 'Mois', category: 'Coworking' },
  { id: 'pa-co06', ref: 'OTELCO-BEV', name: 'Pack Cafétéria & Buvette Premium (Mensuel)', description: 'Boissons chaudes illimitées (café expresso, thé) et accès à la sélection de collations sucrées/salées.', price: 35.000, tva: 19, unit: 'Mois', category: 'Coworking' },

  // Call Center Category - Service provision details for Synergy Growth
  { id: 'pa-cc01', ref: 'SYNERGY-EMIS', name: 'Service d\'Émission d\'Appels - Prospection & Télévente', description: 'Prospection téléphonique ciblée, télévente d\'offres de services et relances commerciales par des téléconseillers qualifiés.', price: 15.500, tva: 19, unit: 'Heure', category: 'Call Center' },
  { id: 'pa-cc02', ref: 'SYNERGY-RECEP', name: 'Service de Réception d\'Appels - Support Client & SAV', description: 'Gestion de la relation client multicanale, hotline d\'assistance technique et service après-vente dédié.', price: 14.000, tva: 19, unit: 'Heure', category: 'Call Center' },
  { id: 'pa-cc03', ref: 'SYNERGY-QUALIF', name: 'Qualification de Fichiers & enrichissement de bases de données', description: 'Mise à jour et qualification de fiches prospects B2B/B2C, validation des informations de contact et d\'intention d\'achat.', price: 0.950, tva: 19, unit: 'Fiche', category: 'Call Center' },
  { id: 'pa-cc04', ref: 'SYNERGY-RDV', name: 'Prise de Rendez-vous Qualifiés B2B', description: 'Planification d\'entretiens d\'affaires ou de démonstrations avec des décideurs qualifiés selon votre cahier des charges.', price: 45.000, tva: 19, unit: 'RDV', category: 'Call Center' },
  { id: 'pa-cc05', ref: 'SYNERGY-FORFAIT', name: 'Prestation Forfaitaire Campagne Outsourcing Call Center', description: 'Lancement et gestion complète de campagne d\'externalisation comprenant script, tests d\'appels, reporting régulier et KPI.', price: 2500.000, tva: 19, unit: 'Forfait', category: 'Call Center' },
  { id: 'pa-cc06', ref: 'SYNERGY-AUDIT', name: 'Audit de script, formation d\'agents & supervision experte', description: 'Analyse et amélioration de vos guides d\'entretien, coaching continu de vos équipes internes et rapports de performance.', price: 450.000, tva: 19, unit: 'Jour', category: 'Call Center' },
];

