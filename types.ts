
export interface IssuerInfo {
  id: string;
  name: string;
  address: string;
  mf: string; 
  rc: string;  
  phone: string;
  email: string;
  logoUrl?: string; 
  bankAccounts?: {
    devises: BankAccount;
    dinars: BankAccount;
  };
  isDefault?: boolean;
}

export interface ClientInfo {
  id: string;
  name: string;
  address: string;
  mf: string;
  rc: string;    
  phone: string;
  email: string;
  isProfessional: boolean;
  ville?: string;
  cp?: string;
  defaultRS?: number;
  logoUrl?: string;
  issuerId?: string; 
}

export interface Article {
  id: string;
  ref: string;
  name: string;
  description?: string;
  price: number;
  tva: number;
  unit: string;
  category?: string;
}

export interface UserPermissions {
  canViewFinancials: boolean;
  canManageInvoices: boolean;
  canManagePurchases: boolean;
  canManageInventory: boolean;
  canManageSpaces: boolean;
  canManageSales: boolean;
  canManageBuvette: boolean;
  canManageClients: boolean;
  canManageArticles: boolean;
  canManageSubscriptions: boolean;
  canManageAttendance: boolean;
  canManageEmployees: boolean;
  canManageOperations: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'manager' | 'editor';
  employeeRole?: string;
  status: 'pending' | 'active' | 'suspended';
  permissions: UserPermissions;
  issuerIds: string[]; // Companies this user can access
}

export interface Purchase {
  id: string;
  vendor: string;
  date: string;
  dueDate?: string;
  status: 'pending' | 'paid';
  category: string;
  ht: number;
  tva: number;
  ttc: number;
  ref?: string;
  issuerId: string;
  ownerId: string;
  imageUrl?: string;
  driveFileUrl?: string;
  driveFolderUrl?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRate: number; 
}

export interface BankAccount {
  label: string;
  bankName: string;
  rib: string;
  iban: string;
  swift: string;
  nature: string;
}

export interface Invoice {
  id: string;
  number: string;
  documentType: 'facture' | 'devis' | 'recu' | 'vente_espece';
  date: string;
  dueDate: string; 
  issuer: IssuerInfo;
  client: ClientInfo;
  items: InvoiceItem[];
  timbreFiscal: number;
  withholdingTaxRate: number; 
  currency: string;
  bankAccountType: 'dinars' | 'devises';
  notes?: string;
  status: 'draft' | 'pending' | 'paid' | 'cancelled';
  ownerId: string;
  driveFileUrl?: string;
  driveFolderUrl?: string;
  paymentMethod?: 'especes' | 'virement' | 'carte' | 'cheque';
  chequeNumber?: string;
  dateReceived?: string;
  remainingBalance?: number;
}

export interface CalculationResult {
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  withholdingAmount: number;
  netToPay: number;
  tvaBreakdown: { [key: number]: number };
}

export type PointingType = 'work' | 'absence' | 'holiday' | 'off' | 'leave';

export interface ProductionOperation {
  id: string;
  name: string;
  hourlyRate: number;
  roleRates?: { [role: string]: number };
  issuerId: string;
}

export interface Employee {
  id: string;
  name: string;
  email?: string;
  role: string;
  issuerId: string;
  operationId?: string;
  status: 'active' | 'inactive';
  // Detailed metadata
  cin?: string;
  cnss?: string;
  hireDate?: string;
  salary?: number;
  phone?: string;
  address?: string;
  birthDate?: string;
  contractType?: 'SIVP' | 'CDD' | 'CDI' | 'Karama' | 'Autre';
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  issuerId: string;
  startDate: string;
  endDate: string;
  type: 'payé' | 'maladie' | 'maternité' | 'sans_solde' | 'exceptionnel';
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  createdAt: string;
}

export interface Pointing {
  id: string;
  employeeId: string;
  issuerId: string;
  date: string;
  type: PointingType;
  hours: number;
  operationId?: string;
  notes?: string;
}

export interface MonthlyAdjustment {
  id: string;
  employeeId: string;
  issuerId: string;
  month: string; // YYYY-MM
  bonus: number;
  advance: number;
  delay?: number;
  notes?: string;
}

export type SubscriptionStatus = 'active' | 'cancelled' | 'suspended' | 'archived';

export interface Subscription {
  id: string;
  clientId: string;
  clientName: string;
  officeType: string;
  monthlyPrice: number;
  startDate: string;
  endDate?: string;
  status: SubscriptionStatus;
  issuerId: string;
  ownerId: string;
  notes?: string;
}

export interface Equipment {
  id: string;
  name: string;
  status: 'functional' | 'broken' | 'maintenance';
  serialNumber?: string;
  lastMaintenance?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  totalQuantity: number;
  availableQuantity: number; // calculated or stored: total - assigned
  category: 'Mobilier' | 'Informatique' | 'Accessoires' | 'Réseau' | 'Autres';
  issuerId: string;
  ownerId: string;
}

export interface Space {
  id: string;
  name: string;
  type: string;
  capacity: number;
  equipment: {
    inventoryItemId: string;
    quantity: number;
    name: string;
  }[];
  issuerId: string;
  ownerId: string;
  status: 'available' | 'occupied' | 'maintenance';
}

export interface BuvetteItem {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  issuerId: string;
  ownerId: string;
}

export interface BuvetteSale {
  id: string;
  items: {
    itemId: string;
    itemName: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'client_account';
  clientId?: string; // Optional: sale can be linked to a client
  date: string;
  issuerId: string;
  ownerId: string;
}

export interface BuvetteClient {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  balance: number; // Amount they owe the business (tab)
  issuerId: string;
  ownerId: string;
  createdAt: string;
}

export interface BuvettePayment {
  id: string;
  clientId: string;
  amount: number;
  paymentMethod: 'cash' | 'card';
  date: string;
  issuerId: string;
  ownerId: string;
}

export interface MeetingReservation {
  id: string;
  spaceId: string;
  spaceName: string;
  clientId?: string;
  clientName: string;
  clientEmail: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g., "14:00"
  endTime: string; // e.g., "15:00"
  gcalEventId?: string; // stored google calendar event ID
  issuerId: string;
  ownerId: string;
  createdAt: string;
}

export interface MaintenanceTask {
  id: string;
  title: string;
  type: 'repair' | 'maintenance' | 'work' | 'other'; // 'Réparation' | 'Entretien' | 'Travaux' | 'Autre'
  targetType: 'equipment' | 'space' | 'general';
  targetId?: string; // spaceId or inventoryItemId, or null/empty for general
  targetName: string; // name of room or equipment or General
  status: 'planned' | 'todo' | 'in_progress' | 'done'; // 'Prévu' | 'À faire' | 'En cours' | 'Terminé'
  priority: 'low' | 'medium' | 'high'; // 'Basse' | 'Moyenne' | 'Haute'
  date: string; // YYYY-MM-DD
  notes?: string;
  cost?: number;
  issuerId: string;
  ownerId: string;
  createdAt: string;
}


