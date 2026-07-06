import { 
  collection as realCollection, 
  onSnapshot as realOnSnapshot, 
  setDoc as realSetDoc, 
  doc as realDoc, 
  deleteDoc as realDeleteDoc, 
  updateDoc as realUpdateDoc, 
  getDoc as realGetDoc,
  query as realQuery,
  where as realWhere
} from 'firebase/firestore';
import { db as firebaseDb } from './firebase';
import { getSupabaseClient, getDatabaseProvider } from './supabase';

const COLLECTION_TO_TABLE: { [key: string]: { table: string, pk: string } } = {
  'users': { table: 'users', pk: 'uid' },
  'issuers': { table: 'issuers', pk: 'id' },
  'clients': { table: 'clients', pk: 'id' },
  'articles': { table: 'articles', pk: 'id' },
  'purchases': { table: 'purchases', pk: 'id' },
  'invoices': { table: 'invoices', pk: 'id' },
  'subscriptions': { table: 'subscriptions', pk: 'id' },
  'coworking_inventory': { table: 'inventory', pk: 'id' },
  'spaces': { table: 'spaces', pk: 'id' },
  'buvette_items': { table: 'buvette_items', pk: 'id' },
  'buvette_sales': { table: 'buvette_sales', pk: 'id' },
  'buvette_clients': { table: 'buvette_clients', pk: 'id' },
  'buvette_payments': { table: 'buvette_payments', pk: 'id' },
  'employees': { table: 'employees', pk: 'id' },
  'pointings': { table: 'pointings', pk: 'id' },
  'operations': { table: 'operations', pk: 'id' },
  'maintenance_tasks': { table: 'maintenance_tasks', pk: 'id' },
  'reservations': { table: 'reservations', pk: 'id' },
  'monthly_adjustments': { table: 'monthly_adjustments', pk: 'id' },
  'leave_requests': { table: 'leave_requests', pk: 'id' }
};

// Deep clone serializer to clean up Firestore Timestamps, Dates, etc.
function cleanData(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'object') {
    if (obj.seconds !== undefined && obj.nanoseconds !== undefined && typeof obj.toDate === 'function') {
      return obj.toDate().toISOString();
    }
    if (obj.seconds !== undefined && obj.nanoseconds !== undefined) {
      return new Date(obj.seconds * 1000).toISOString();
    }
    if (obj instanceof Date) {
      return obj.toISOString();
    }
    if (Array.isArray(obj)) {
      return obj.map(item => cleanData(item));
    }
    
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = cleanData(obj[key]);
    }
    return result;
  }
  return obj;
}

// 1. Compatibility constructors
export function doc(dbInstance: any, collectionName: string, docId: string) {
  const provider = getDatabaseProvider();
  if (provider === 'supabase' && getSupabaseClient() !== null) {
    return { type: 'doc', collectionName, id: docId, isMock: true };
  } else {
    return realDoc(firebaseDb, collectionName, docId);
  }
}

export function collection(dbInstance: any, collectionName: string) {
  const provider = getDatabaseProvider();
  if (provider === 'supabase' && getSupabaseClient() !== null) {
    return { type: 'collection', collectionName, isMock: true };
  } else {
    return realCollection(firebaseDb, collectionName);
  }
}

export function query(ref: any, ...constraints: any[]) {
  const provider = getDatabaseProvider();
  if (provider === 'supabase' && getSupabaseClient() !== null) {
    return { 
      ...ref, 
      constraints: [...(ref.constraints || []), ...constraints] 
    };
  } else {
    return realQuery(ref, ...constraints);
  }
}

export function where(field: string, op: string, val: any) {
  const provider = getDatabaseProvider();
  if (provider === 'supabase' && getSupabaseClient() !== null) {
    return { type: 'where', field, op, val, isMock: true };
  } else {
    return realWhere(field, op as any, val);
  }
}

// Helper to check if reference is mock
function isMockRef(ref: any): boolean {
  return ref && ref.isMock === true;
}

const TABLE_COLUMNS: { [table: string]: string[] } = {
  'users': ['uid', 'email', 'displayName', 'role', 'employeeRole', 'status', 'permissions', 'issuerIds'],
  'issuers': ['id', 'name', 'address', 'mf', 'rc', 'phone', 'email', 'logoUrl', 'bankAccounts', 'isDefault'],
  'clients': ['id', 'name', 'address', 'mf', 'rc', 'phone', 'email', 'isProfessional', 'ville', 'cp', 'defaultRS', 'logoUrl', 'issuerId'],
  'articles': ['id', 'ref', 'name', 'price', 'tva', 'unit', 'category'],
  'purchases': ['id', 'vendor', 'date', 'dueDate', 'status', 'category', 'ht', 'tva', 'ttc', 'ref', 'issuerId', 'ownerId', 'imageUrl', 'driveFileUrl', 'driveFolderUrl', 'createdAt'],
  'invoices': ['id', 'number', 'documentType', 'date', 'dueDate', 'issuer', 'client', 'items', 'timbreFiscal', 'withholdingTaxRate', 'currency', 'bankAccountType', 'notes', 'status', 'ownerId', 'driveFileUrl', 'driveFolderUrl', 'paymentMethod', 'chequeNumber', 'dateReceived', 'remainingBalance'],
  'subscriptions': ['id', 'clientId', 'clientName', 'officeType', 'monthlyPrice', 'startDate', 'endDate', 'status', 'issuerId', 'ownerId', 'notes'],
  'inventory': ['id', 'name', 'totalQuantity', 'availableQuantity', 'category', 'issuerId', 'ownerId'],
  'spaces': ['id', 'name', 'type', 'capacity', 'equipment', 'issuerId', 'ownerId', 'status'],
  'buvette_items': ['id', 'sku', 'name', 'price', 'stock', 'category', 'issuerId', 'ownerId'],
  'buvette_sales': ['id', 'items', 'totalAmount', 'paymentMethod', 'clientId', 'date', 'issuerId', 'ownerId'],
  'buvette_clients': ['id', 'name', 'phone', 'email', 'balance', 'issuerId', 'ownerId', 'createdAt'],
  'buvette_payments': ['id', 'clientId', 'amount', 'paymentMethod', 'date', 'issuerId', 'ownerId'],
  'employees': ['id', 'name', 'email', 'role', 'issuerId', 'operationId', 'status', 'cin', 'cnss', 'hireDate', 'salary', 'phone', 'address', 'birthDate', 'contractType'],
  'pointings': ['id', 'employeeId', 'issuerId', 'date', 'type', 'hours', 'operationId', 'notes'],
  'operations': ['id', 'name', 'hourlyRate', 'roleRates', 'issuerId'],
  'maintenance_tasks': ['id', 'title', 'type', 'targetType', 'targetId', 'targetName', 'status', 'priority', 'date', 'notes', 'cost', 'issuerId', 'ownerId', 'createdAt'],
  'leave_requests': ['id', 'employeeId', 'issuerId', 'startDate', 'endDate', 'type', 'status', 'reason', 'createdAt'],
  'monthly_adjustments': ['id', 'employeeId', 'issuerId', 'month', 'bonus', 'advance', 'delay', 'notes'],
  'reservations': ['id', 'spaceId', 'spaceName', 'clientId', 'clientName', 'clientEmail', 'title', 'description', 'date', 'startTime', 'endTime', 'gcalEventId', 'issuerId', 'ownerId', 'createdAt']
};

function sanitizeForTable(tableName: string, obj: any): any {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const allowed = TABLE_COLUMNS[tableName];
  if (!allowed) return obj;
  
  const result: any = {};
  for (const key of Object.keys(obj)) {
    if (allowed.includes(key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

// 2. Compatibility writes
export async function setDoc(docRef: any, data: any): Promise<void> {
  const cleaned = cleanData(data);
  if (isMockRef(docRef)) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase Client n\'est pas configuré.');
    
    const { collectionName, id } = docRef;
    const mapping = COLLECTION_TO_TABLE[collectionName];
    if (!mapping) throw new Error(`Collection non répertoriée: ${collectionName}`);
    
    const rawPayload = { ...cleaned, [mapping.pk]: id };
    const payload = sanitizeForTable(mapping.table, rawPayload);
    const { error } = await supabase.from(mapping.table).upsert(payload, { onConflict: mapping.pk });
    if (error) throw new Error(error.message);
  } else {
    await realSetDoc(docRef, data);
  }
}

export async function updateDoc(docRef: any, data: any): Promise<void> {
  const cleaned = cleanData(data);
  if (isMockRef(docRef)) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase Client n\'est pas configuré.');
    
    const { collectionName, id } = docRef;
    const mapping = COLLECTION_TO_TABLE[collectionName];
    if (!mapping) throw new Error(`Collection non répertoriée: ${collectionName}`);
    
    const payload = sanitizeForTable(mapping.table, cleaned);
    const { error } = await supabase.from(mapping.table).update(payload).eq(mapping.pk, id);
    if (error) throw new Error(error.message);
  } else {
    await realUpdateDoc(docRef, data);
  }
}

export async function deleteDoc(docRef: any): Promise<void> {
  if (isMockRef(docRef)) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase Client n\'est pas configuré.');
    
    const { collectionName, id } = docRef;
    const mapping = COLLECTION_TO_TABLE[collectionName];
    if (!mapping) throw new Error(`Collection non répertoriée: ${collectionName}`);
    
    const { error } = await supabase.from(mapping.table).delete().eq(mapping.pk, id);
    if (error) throw new Error(error.message);
  } else {
    await realDeleteDoc(docRef);
  }
}

export async function getDoc(docRef: any): Promise<any> {
  if (isMockRef(docRef)) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase Client n\'est pas configuré.');
    
    const { collectionName, id } = docRef;
    const mapping = COLLECTION_TO_TABLE[collectionName];
    if (!mapping) throw new Error(`Collection non répertoriée: ${collectionName}`);
    
    const { data, error } = await supabase.from(mapping.table).select('*').eq(mapping.pk, id).maybeSingle();
    if (error) throw new Error(error.message);
    return {
      exists: () => !!data,
      data: () => data || null
    };
  } else {
    return await realGetDoc(docRef);
  }
}

// 3. Compatibility Listeners
export function onSnapshot(
  ref: any, 
  onNext: any, 
  onError?: any
): () => void {
  if (isMockRef(ref)) {
    const supabase = getSupabaseClient();
    if (!supabase) {
      if (onError) onError(new Error('Supabase Client n\'est pas configuré.'));
      return () => {};
    }

    const { type, collectionName, id, constraints } = ref;
    const mapping = COLLECTION_TO_TABLE[collectionName];
    if (!mapping) {
      if (onError) onError(new Error(`Collection non répertoriée: ${collectionName}`));
      return () => {};
    }

    let isSubscribed = true;

    if (type === 'doc') {
      const fetchAndNotify = async () => {
        try {
          const { data, error } = await supabase.from(mapping.table).select('*').eq(mapping.pk, id).maybeSingle();
          if (error) {
            if (error.code === '42P01') {
              console.warn(`Table "${mapping.table}" does not exist yet in Supabase. Returning empty doc.`);
              if (!isSubscribed) return;
              onNext({
                exists: () => false,
                data: () => null
              });
              return;
            }
            throw error;
          }
          if (!isSubscribed) return;

          onNext({
            exists: () => !!data,
            data: () => data || null
          });
        } catch (err) {
          if (onError) onError(err);
        }
      };

      fetchAndNotify();

      const channel = supabase.channel(`public:${mapping.table}-doc-${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: mapping.table, filter: `${mapping.pk}=eq.${id}` }, () => {
          fetchAndNotify();
        })
        .subscribe();

      return () => {
        isSubscribed = false;
        supabase.removeChannel(channel);
      };
    } else {
      // Collection snapshot
      const fetchAndNotify = async () => {
        try {
          let queryBuilder = supabase.from(mapping.table).select('*');
          
          // Apply query constraints from where() calls
          if (constraints && Array.isArray(constraints)) {
            for (const c of constraints) {
              if (c.type === 'where' && c.op === '==') {
                queryBuilder = queryBuilder.eq(c.field, c.val);
              }
            }
          }

          const { data, error } = await queryBuilder;
          if (error) {
            if (error.code === '42P01') {
              console.warn(`Table "${mapping.table}" does not exist yet in Supabase. Returning empty array.`);
              if (!isSubscribed) return;
              onNext({ docs: [] });
              return;
            }
            throw error;
          }
          if (!isSubscribed) return;

          const mockDocs = (data || []).map(row => ({
            id: row[mapping.pk],
            data: () => row
          }));

          onNext({ docs: mockDocs });
        } catch (err) {
          console.error(`Error querying Supabase table "${mapping.table}":`, err);
          if (onError) onError(err);
        }
      };

      fetchAndNotify();

      const channel = supabase.channel(`public:${mapping.table}-realtime`)
        .on('postgres_changes', { event: '*', schema: 'public', table: mapping.table }, () => {
          fetchAndNotify();
        })
        .subscribe();

      return () => {
        isSubscribed = false;
        supabase.removeChannel(channel);
      };
    }
  } else {
    // Return standard real Firestore listener
    return realOnSnapshot(ref, (snap) => {
      // If it's a doc reference
      if (typeof snap.exists === 'function') {
        onNext(snap);
      } else {
        // It's a collection snapshot, convert to match the signature of mockDocs
        const mockDocs = (snap as any).docs.map((d: any) => ({
          id: d.id,
          data: () => d.data()
        }));
        onNext({ docs: mockDocs });
      }
    }, onError);
  }
}
