import { createClient } from '@supabase/supabase-js';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// Configuration keys for local storage
const URL_KEY = 'supabase_url';
const ANON_KEY = 'supabase_anon_key';
const PROVIDER_KEY = 'database_provider'; // 'firebase' or 'supabase'

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// Get config from Env first, fallback to localStorage
export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY || '';

  return {
    url: envUrl || localStorage.getItem(URL_KEY) || '',
    anonKey: envKey || localStorage.getItem(ANON_KEY) || ''
  };
}

export function saveSupabaseConfig(config: SupabaseConfig) {
  localStorage.setItem(URL_KEY, config.url);
  localStorage.setItem(ANON_KEY, config.anonKey);
}

export function getDatabaseProvider(): 'firebase' | 'supabase' {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY;
  const defaultProvider = (envUrl && envKey) ? 'supabase' : 'firebase';

  const provider = (localStorage.getItem(PROVIDER_KEY) as 'firebase' | 'supabase') || defaultProvider;
  if (provider === 'supabase') {
    const config = getSupabaseConfig();
    if (!config.url || !config.anonKey) {
      return 'firebase';
    }
  }
  return provider;
}

export function setDatabaseProvider(provider: 'firebase' | 'supabase') {
  localStorage.setItem(PROVIDER_KEY, provider);
}

// Initialize client lazily or safely
let supabaseClientInstance: any = null;

export function getSupabaseClient() {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }
  
  try {
    if (!supabaseClientInstance) {
      supabaseClientInstance = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
    }
    return supabaseClientInstance;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

// Helper to reset the cached client if credentials change
export function resetSupabaseClient() {
  supabaseClientInstance = null;
}

// Check connection stability
export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const tempClient = createClient(url, anonKey);
    const { data, error } = await tempClient.from('users').select('uid').limit(1);
    
    if (error) {
      // If table doesn't exist, the connection is still successful, but schema needs creation
      if (error.code === '42P01') {
        return { 
          success: true, 
          message: 'Connexion réussie ! Remarque : La table "users" n\'existe pas encore dans votre base Supabase. Veuillez copier et exécuter le script SQL d\'initialisation ci-dessous.' 
        };
      }
      return { success: false, message: `Erreur de connexion: ${error.message}` };
    }
    
    return { success: true, message: 'Connexion réussie et tables détectées ! Votre instance Supabase est prête.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : String(err) };
  }
}

// Deep clone serializer to clean up Firestore Timestamps, Dates, etc.
function serializeFirestoreData(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  // Handle Firestore Timestamp specifically
  if (typeof obj === 'object') {
    if (obj.seconds !== undefined && obj.nanoseconds !== undefined && typeof obj.toDate === 'function') {
      return obj.toDate().toISOString();
    }
    if (obj.seconds !== undefined && obj.nanoseconds !== undefined) {
      // Sometimes Timestamp object lost its methods but kept fields
      return new Date(obj.seconds * 1000).toISOString();
    }
    if (obj instanceof Date) {
      return obj.toISOString();
    }
    if (Array.isArray(obj)) {
      return obj.map(item => serializeFirestoreData(item));
    }
    
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = serializeFirestoreData(obj[key]);
    }
    return result;
  }
  
  return obj;
}

export const TABLES_INFO = [
  { collection: 'users', table: 'users', pk: 'uid', label: 'Utilisateurs' },
  { collection: 'issuers', table: 'issuers', pk: 'id', label: 'Entreprises émettrices' },
  { collection: 'clients', table: 'clients', pk: 'id', label: 'Clients' },
  { collection: 'articles', table: 'articles', pk: 'id', label: 'Articles' },
  { collection: 'purchases', table: 'purchases', pk: 'id', label: 'Dépenses / Achats' },
  { collection: 'invoices', table: 'invoices', pk: 'id', label: 'Factures / Devis / Reçus' },
  { collection: 'subscriptions', table: 'subscriptions', pk: 'id', label: 'Abonnements' },
  { collection: 'inventory', table: 'inventory', pk: 'id', label: 'Inventaire' },
  { collection: 'spaces', table: 'spaces', pk: 'id', label: 'Espaces Coworking' },
  { collection: 'buvetteItems', table: 'buvette_items', pk: 'id', label: 'Buvette - Articles' },
  { collection: 'buvetteSales', table: 'buvette_sales', pk: 'id', label: 'Buvette - Ventes' },
  { collection: 'buvetteClients', table: 'buvette_clients', pk: 'id', label: 'Buvette - Clients' },
  { collection: 'buvettePayments', table: 'buvette_payments', pk: 'id', label: 'Buvette - Paiements' },
  { collection: 'employees', table: 'employees', pk: 'id', label: 'Employés' },
  { collection: 'pointings', table: 'pointings', pk: 'id', label: 'Pointages' },
  { collection: 'operations', table: 'operations', pk: 'id', label: 'Opérations' },
  { collection: 'maintenanceTasks', table: 'maintenance_tasks', pk: 'id', label: 'Tâches de maintenance' },
];

export async function migrateCollection(
  collectionName: string,
  tableName: string,
  pkField: string,
  onProgress: (count: number) => void
): Promise<number> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase n\'est pas configuré.');
  }

  // 1. Lire depuis Firestore
  const colRef = collection(db, collectionName);
  const snapshot = await getDocs(colRef);
  const docs = snapshot.docs.map(doc => {
    const data = doc.data();
    // Ensure primary key is populated
    if (!data[pkField] && doc.id) {
      data[pkField] = doc.id;
    }
    return serializeFirestoreData(data);
  });

  if (docs.length === 0) {
    return 0;
  }

  // 2. Insérer/Upsert dans Supabase par lots (chunks) de 50 pour éviter les limites de payload
  const chunkSize = 50;
  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    
    const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: pkField });
    
    if (error) {
      console.error(`Error migrating chunk for ${tableName}:`, error);
      throw new Error(`Erreur lors de l'insertion dans la table "${tableName}": ${error.message}`);
    }
    
    onProgress(Math.min(i + chunkSize, docs.length));
  }

  return docs.length;
}

export const SUPABASE_SQL_SCHEMA = `-- Script d'initialisation de votre base de données Supabase
-- Copiez et collez ce script dans l'onglet SQL Editor de votre tableau de bord Supabase

-- 1. Table users
CREATE TABLE IF NOT EXISTS "users" (
  "uid" TEXT PRIMARY KEY,
  "email" TEXT,
  "displayName" TEXT,
  "role" TEXT,
  "employeeRole" TEXT,
  "status" TEXT,
  "permissions" JSONB,
  "issuerIds" JSONB
);

-- 2. Table issuers
CREATE TABLE IF NOT EXISTS "issuers" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "address" TEXT,
  "mf" TEXT,
  "rc" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "logoUrl" TEXT,
  "bankAccounts" JSONB,
  "isDefault" BOOLEAN
);

-- 3. Table clients
CREATE TABLE IF NOT EXISTS "clients" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "address" TEXT,
  "mf" TEXT,
  "rc" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "isProfessional" BOOLEAN,
  "ville" TEXT,
  "cp" TEXT,
  "defaultRS" NUMERIC,
  "logoUrl" TEXT,
  "issuerId" TEXT
);

-- 4. Table articles
CREATE TABLE IF NOT EXISTS "articles" (
  "id" TEXT PRIMARY KEY,
  "ref" TEXT,
  "name" TEXT,
  "price" NUMERIC,
  "tva" NUMERIC,
  "unit" TEXT,
  "category" TEXT
);

-- 5. Table purchases
CREATE TABLE IF NOT EXISTS "purchases" (
  "id" TEXT PRIMARY KEY,
  "vendor" TEXT,
  "date" TEXT,
  "dueDate" TEXT,
  "status" TEXT,
  "category" TEXT,
  "ht" NUMERIC,
  "tva" NUMERIC,
  "ttc" NUMERIC,
  "ref" TEXT,
  "issuerId" TEXT,
  "ownerId" TEXT,
  "imageUrl" TEXT,
  "driveFileUrl" TEXT,
  "driveFolderUrl" TEXT,
  "createdAt" TEXT
);

-- 6. Table invoices
CREATE TABLE IF NOT EXISTS "invoices" (
  "id" TEXT PRIMARY KEY,
  "number" TEXT,
  "documentType" TEXT,
  "date" TEXT,
  "dueDate" TEXT,
  "issuer" JSONB,
  "client" JSONB,
  "items" JSONB,
  "timbreFiscal" NUMERIC,
  "withholdingTaxRate" NUMERIC,
  "currency" TEXT,
  "bankAccountType" TEXT,
  "notes" TEXT,
  "status" TEXT,
  "ownerId" TEXT,
  "driveFileUrl" TEXT,
  "driveFolderUrl" TEXT,
  "paymentMethod" TEXT,
  "chequeNumber" TEXT,
  "dateReceived" TEXT,
  "remainingBalance" NUMERIC
);

-- 7. Table subscriptions
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" TEXT PRIMARY KEY,
  "clientId" TEXT,
  "clientName" TEXT,
  "officeType" TEXT,
  "monthlyPrice" NUMERIC,
  "startDate" TEXT,
  "endDate" TEXT,
  "status" TEXT,
  "issuerId" TEXT,
  "ownerId" TEXT,
  "notes" TEXT
);

-- 8. Table inventory
CREATE TABLE IF NOT EXISTS "inventory" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "totalQuantity" NUMERIC,
  "availableQuantity" NUMERIC,
  "category" TEXT,
  "issuerId" TEXT,
  "ownerId" TEXT
);

-- 9. Table spaces
CREATE TABLE IF NOT EXISTS "spaces" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "type" TEXT,
  "capacity" NUMERIC,
  "equipment" JSONB,
  "issuerId" TEXT,
  "ownerId" TEXT,
  "status" TEXT
);

-- 10. Table buvette_items
CREATE TABLE IF NOT EXISTS "buvette_items" (
  "id" TEXT PRIMARY KEY,
  "sku" TEXT,
  "name" TEXT,
  "price" NUMERIC,
  "stock" NUMERIC,
  "category" TEXT,
  "issuerId" TEXT,
  "ownerId" TEXT
);

-- 11. Table buvette_sales
CREATE TABLE IF NOT EXISTS "buvette_sales" (
  "id" TEXT PRIMARY KEY,
  "items" JSONB,
  "totalAmount" NUMERIC,
  "paymentMethod" TEXT,
  "clientId" TEXT,
  "date" TEXT,
  "issuerId" TEXT,
  "ownerId" TEXT
);

-- 12. Table buvette_clients
CREATE TABLE IF NOT EXISTS "buvette_clients" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "balance" NUMERIC,
  "issuerId" TEXT,
  "ownerId" TEXT,
  "createdAt" TEXT
);

-- 13. Table buvette_payments
CREATE TABLE IF NOT EXISTS "buvette_payments" (
  "id" TEXT PRIMARY KEY,
  "clientId" TEXT,
  "amount" NUMERIC,
  "paymentMethod" TEXT,
  "date" TEXT,
  "issuerId" TEXT,
  "ownerId" TEXT
);

-- 14. Table employees
CREATE TABLE IF NOT EXISTS "employees" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "email" TEXT,
  "role" TEXT,
  "issuerId" TEXT,
  "operationId" TEXT,
  "status" TEXT,
  "cin" TEXT,
  "cnss" TEXT,
  "hireDate" TEXT,
  "salary" NUMERIC,
  "phone" TEXT,
  "address" TEXT,
  "birthDate" TEXT,
  "contractType" TEXT
);

-- 15. Table pointings
CREATE TABLE IF NOT EXISTS "pointings" (
  "id" TEXT PRIMARY KEY,
  "employeeId" TEXT,
  "issuerId" TEXT,
  "date" TEXT,
  "type" TEXT,
  "hours" NUMERIC,
  "operationId" TEXT,
  "notes" TEXT
);

-- 16. Table operations
CREATE TABLE IF NOT EXISTS "operations" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "hourlyRate" NUMERIC,
  "roleRates" JSONB,
  "issuerId" TEXT
);

-- 17. Table maintenance_tasks
CREATE TABLE IF NOT EXISTS "maintenance_tasks" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT,
  "type" TEXT,
  "targetType" TEXT,
  "targetId" TEXT,
  "targetName" TEXT,
  "status" TEXT,
  "priority" TEXT,
  "date" TEXT,
  "notes" TEXT,
  "cost" NUMERIC,
  "issuerId" TEXT,
  "ownerId" TEXT,
  "createdAt" TEXT
);

-- Activer Row Level Security (RLS) sur toutes les tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "issuers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "articles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "spaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "buvette_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "buvette_sales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "buvette_clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "buvette_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pointings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "operations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_tasks" ENABLE ROW LEVEL SECURITY;

-- Autoriser un accès public complet ou pour les requêtes authentifiées à des fins de simplicité
-- Vous pouvez ensuite affiner ces politiques de sécurité dans Supabase directement.
CREATE POLICY "Full access on users" ON "users" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access on issuers" ON "issuers" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access on clients" ON "clients" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access on articles" ON "articles" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access on purchases" ON "purchases" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access on invoices" ON "invoices" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access on subscriptions" ON "subscriptions" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access on inventory" ON "inventory" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access on spaces" ON "spaces" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access on buvette_items" ON "buvette_items" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access on buvette_sales" ON "buvette_sales" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access on buvette_clients" ON "buvette_clients" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access on buvette_payments" ON "buvette_payments" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access on employees" ON "employees" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access on pointings" ON "pointings" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access on operations" ON "operations" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access on maintenance_tasks" ON "maintenance_tasks" FOR ALL USING (true) WITH CHECK (true);
`;
