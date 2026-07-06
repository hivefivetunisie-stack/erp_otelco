
import React, { useState, useEffect } from 'react';
import Layout, { ViewType } from './components/Layout';
import InvoiceForm from './components/InvoiceForm';
import InvoicePreview from './components/InvoicePreview';
import WithholdingCertificate from './components/WithholdingCertificate';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Clients from './components/Clients';
import Articles from './components/Articles';
import Settings from './components/Settings';
import Purchases from './components/Purchases';
import PurchaseImport from './components/PurchaseImport';
import PointingSystem from './components/PointingSystem';
import Subscriptions from './components/Subscriptions';
import CoworkingSpace from './components/CoworkingSpace';
import Buvette from './components/Buvette';
import UserManagement from './components/UserManagement';
import Agenda from './components/Agenda';
import { Invoice, Purchase, ClientInfo, Article, IssuerInfo as Issuer, Subscription, Space, BuvetteItem, BuvetteSale, InventoryItem, UserProfile, ProductionOperation, BuvetteClient, BuvettePayment, MaintenanceTask } from './types';
import { DEFAULT_ISSUER, DEFAULT_CLIENT, DEFAULT_USER_PERMISSIONS } from './constants';
import { checkCompliance } from './services/geminiService';
import { getNextInvoiceNumber, confirmInvoiceNumber } from './utils/sequencer';
import { Printer, Eye, Edit3, Download, ShieldCheck, Loader2, FileCheck, PlusCircle, Cloud, ArrowLeft, X } from 'lucide-react';
import { db, handleFirestoreError, FSOperationType } from './services/firebase';
import { collection, onSnapshot, setDoc, doc, deleteDoc, updateDoc, getDoc } from './services/db';
import { useAuth } from './components/FirebaseProvider';
import { getCachedDriveToken, requestDriveToken, syncInvoiceToDrive } from './services/googleDrive';

declare var html2pdf: any;

const App: React.FC = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [docType, setDocType] = useState<'invoice' | 'rs'>('invoice');
  const [isChecking, setIsChecking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDriveConnected, setIsDriveConnected] = useState(!!getCachedDriveToken());
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [isSyncingDriveId, setIsSyncingDriveId] = useState<string | null>(null);
  const [isSyncingSaleDrive, setIsSyncingSaleDrive] = useState(false);
  const [complianceResult, setComplianceResult] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const handleConnectDrive = async () => {
    setIsConnectingDrive(true);
    try {
      const token = await requestDriveToken();
      if (token) {
        setIsDriveConnected(true);
        alert("Connexion à Google Drive réussie !");
      }
    } catch (error) {
      console.error("Failed to connect Drive:", error);
      alert("Échec de la connexion à Google Drive. Assurez-vous d'avoir autorisé les permissions.");
    } finally {
      setIsConnectingDrive(false);
    }
  };

  const handleSyncPurchaseToDrive = async (p: Purchase) => {
    let token = getCachedDriveToken();
    if (!token) {
      setIsConnectingDrive(true);
      try {
        token = await requestDriveToken();
        if (token) {
          setIsDriveConnected(true);
        } else {
          return;
        }
      } catch (err) {
        alert("Veuillez vous connecter à Google Drive pour synchroniser.");
        return;
       } finally {
         setIsConnectingDrive(false);
       }
    }

    if (!p.imageUrl) {
      alert("Cette dépense n'a pas d'image de facture scannée.");
      return;
    }

    setIsSyncingDriveId(p.id);
    try {
      const syncResult = await syncInvoiceToDrive(token, p, p.imageUrl, 'purchase');
      await updateDoc(doc(db, 'purchases', p.id), {
        driveFileUrl: syncResult.fileUrl,
        driveFolderUrl: syncResult.folderUrl
      });
      alert("Facture d'achat transférée avec succès sur Google Drive !");
    } catch (error) {
      console.error("Sync error:", error);
      alert("Impossible de synchroniser le document sur Google Drive.");
    } finally {
      setIsSyncingDriveId(null);
    }
  };

  const handleSyncSaleToDrive = async () => {
    const element = document.getElementById('document-to-print');
    if (!element) {
      alert("Document introuvable pour l'export.");
      return;
    }

    let token = getCachedDriveToken();
    if (!token) {
      setIsConnectingDrive(true);
      try {
        token = await requestDriveToken();
        if (token) {
          setIsDriveConnected(true);
        } else {
          return;
        }
      } catch (err) {
        alert("Veuillez vous connecter à Google Drive pour synchroniser.");
        return;
      } finally {
        setIsConnectingDrive(false);
      }
    }

    setIsSyncingSaleDrive(true);
    try {
      // 1. Force state save to Firestore
      const invoiceToSave = { ...invoice, ownerId: user!.uid };
      if (invoice.documentType === 'recu' || invoice.documentType === 'vente_espece') {
        invoiceToSave.status = 'paid';
      }
      await setDoc(doc(db, 'invoices', invoiceToSave.id), invoiceToSave);
      confirmInvoiceNumber(invoiceToSave.number);

      // 2. Generate PDF using html2pdf
      const fileName = docType === 'invoice' 
        ? `Facture_${invoice.number}` 
        : `Certificat_RS_${invoice.number}`;

      const opt = {
        margin: 0,
        filename: `${fileName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2.5, 
          useCORS: true, 
          letterRendering: true,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const pdfBlob = await html2pdf().set(opt).from(element).output('blob');

      // 3. Sync to Google Drive
      const syncResult = await syncInvoiceToDrive(token, invoiceToSave, pdfBlob, 'sale');

      // 4. Update the document back in Firestore
      await updateDoc(doc(db, 'invoices', invoiceToSave.id), {
        driveFileUrl: syncResult.fileUrl,
        driveFolderUrl: syncResult.folderUrl
      });

      // 5. Update local edited invoice
      setInvoice(prev => ({
        ...prev,
        driveFileUrl: syncResult.fileUrl,
        driveFolderUrl: syncResult.folderUrl
      }));

      alert("Enregistré avec succès dans Firestore, compilé en PDF, et transféré sur votre Google Drive !");
    } catch (error) {
      console.error("Error syncing sale to Google Drive:", error);
      alert("Une erreur est survenue lors de l'archivage sur Google Drive. Vérifiez votre session.");
    } finally {
      setIsSyncingSaleDrive(false);
    }
  };

  // States for data
  const [factures, setFactures] = useState<Invoice[]>([]);
  const [achats, setAchats] = useState<Purchase[]>([]);
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [buvetteItems, setBuvetteItems] = useState<BuvetteItem[]>([]);
  const [buvetteSales, setBuvetteSales] = useState<BuvetteSale[]>([]);
  const [buvetteClients, setBuvetteClients] = useState<BuvetteClient[]>([]);
  const [buvettePayments, setBuvettePayments] = useState<BuvettePayment[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [pointings, setPointings] = useState<any[]>([]);
  const [operations, setOperations] = useState<ProductionOperation[]>([]);
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [selectedIssuerIds, setSelectedIssuerIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('selectedIssuerIds');
    return saved ? JSON.parse(saved) : [];
  });

  const userIssuers = profile?.role === 'admin' 
    ? issuers 
    : issuers.filter(i => profile?.issuerIds?.includes(i.id));

  const activeIssuers = userIssuers.filter(i => selectedIssuerIds.includes(i.id));
  const primaryIssuer = activeIssuers[0] || userIssuers.find(i => i.isDefault) || userIssuers[0] || DEFAULT_ISSUER;

  // Filtered data based on selection
  const filteredFactures = factures.filter(f => selectedIssuerIds.includes(f.issuer.id) && (profile?.role === 'admin' || profile?.issuerIds?.includes(f.issuer.id)));
  const filteredAchats = achats.filter(a => selectedIssuerIds.includes(a.issuerId) && (profile?.role === 'admin' || profile?.issuerIds?.includes(a.issuerId)));

  useEffect(() => {
    localStorage.setItem('selectedIssuerIds', JSON.stringify(selectedIssuerIds));
  }, [selectedIssuerIds]);

  // Clean up selectedIssuerIds if user doesn't have access anymore
  useEffect(() => {
    if (userIssuers.length > 0) {
      const validSelected = selectedIssuerIds.filter(id => userIssuers.some(i => i.id === id));
      if (validSelected.length !== selectedIssuerIds.length) {
        if (validSelected.length === 0) {
          const def = userIssuers.find(i => i.isDefault) || userIssuers[0];
          setSelectedIssuerIds([def.id]);
        } else {
          setSelectedIssuerIds(validSelected);
        }
      }
    }
  }, [userIssuers]);



  // Firestore listeners
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }

    // Profile listener
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), async (snapshot) => {
      const isAdminEmail = user.email === 'hivefivetunisie@gmail.com' || user.email === 'admin@synergy.com';
      const isManagerEmail = user.email === 'ryadmerarbi18@gmail.com' || user.email === 'dhouha.laserostop@gmail.com';

      if (snapshot.exists()) {
        const data = snapshot.data() as UserProfile;
        // Auto-upgrade owner/managers if needed
        if ((isAdminEmail || isManagerEmail) && (data.status === 'pending' || (isAdminEmail && data.role !== 'admin') || (isManagerEmail && data.role !== 'manager'))) {
           const upgraded = {
             ...data,
             role: isAdminEmail ? ('admin' as const) : ('manager' as const),
             status: 'active' as const,
             permissions: {
               canViewFinancials: true,
               canManageInvoices: true,
               canManagePurchases: true,
               canManageInventory: true,
               canManageSpaces: true,
               canManageSales: true,
               canManageBuvette: true,
               canManageClients: true,
               canManageArticles: true,
               canManageSubscriptions: true,
               canManageAttendance: true,
               canManageEmployees: true,
               canManageOperations: true,
               canManageUsers: isAdminEmail,
               canManageSettings: true
             }
           };
           await updateDoc(doc(db, 'users', user.uid), upgraded);
           setProfile(upgraded);
        } else if (data.status === 'pending') {
           // User is pending validation. Check if an invitation or access document was created for them.
           try {
             const inviteId = `invite_${user.email?.toLowerCase().trim()}`;
             const inviteSnap = await getDoc(doc(db, 'users', inviteId));
             if (inviteSnap.exists()) {
               const inviteData = inviteSnap.data() as UserProfile;
               const upgraded = {
                 ...data,
                 displayName: inviteData.displayName || data.displayName,
                 role: inviteData.role || data.role,
                 employeeRole: inviteData.employeeRole !== undefined ? inviteData.employeeRole : data.employeeRole,
                 status: 'active' as const, // Automatically activate since their invitation exists or was updated
                 permissions: inviteData.permissions || data.permissions,
                 issuerIds: inviteData.issuerIds || data.issuerIds
               };
               await updateDoc(doc(db, 'users', user.uid), upgraded);
               await deleteDoc(doc(db, 'users', inviteId));
               setProfile(upgraded);
             } else {
               setProfile(data);
             }
           } catch (error) {
             console.warn("Could not check pending invitation:", error);
             setProfile(data);
           }
        } else {
           setProfile(data);
        }
      } else {
        // Check for invitation safely
        let initialData: Partial<UserProfile> = {};
        let matchesInvitation = false;
        try {
          const inviteId = `invite_${user.email?.toLowerCase().trim()}`;
          const inviteSnap = await getDoc(doc(db, 'users', inviteId));
          if (inviteSnap.exists()) {
            initialData = inviteSnap.data();
            matchesInvitation = true;
            try {
              // Delete invitation record so it's not reused or orphan
              await deleteDoc(doc(db, 'users', inviteId));
            } catch (delErr) {
              console.warn("Could not delete invitation doc:", delErr);
            }
          }
        } catch (getErr) {
          console.warn("Could not check invitation doc (client might be offline):", getErr);
        }

        // Create initial profile
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: initialData.displayName || user.displayName || 'Utilisateur',
          role: initialData.role || (isAdminEmail ? 'admin' : (isManagerEmail ? 'manager' : 'editor')),
          employeeRole: initialData.employeeRole,
          status: matchesInvitation ? 'active' : (initialData.status || ((isAdminEmail || isManagerEmail || initialData.role === 'manager' || initialData.role === 'admin' || initialData.role === 'editor') ? 'active' : 'pending')),
          permissions: initialData.permissions || ( (isAdminEmail || isManagerEmail || initialData.role === 'manager') ? {
             canViewFinancials: true,
             canManageInvoices: true,
             canManagePurchases: true,
             canManageInventory: true,
             canManageSpaces: true,
             canManageSales: true,
             canManageBuvette: true,
             canManageClients: true,
             canManageArticles: true,
             canManageSubscriptions: true,
             canManageAttendance: true,
             canManageEmployees: true,
             canManageOperations: true,
             canManageUsers: isAdminEmail,
             canManageSettings: true
          } : DEFAULT_USER_PERMISSIONS ),
          issuerIds: initialData.issuerIds || issuers.map(i => i.id)
        };
        try {
          await setDoc(doc(db, 'users', user.uid), newProfile);
        } catch (setErr) {
          console.warn("Could not save initial profile to Firestore (client might be offline):", setErr);
        }
        setProfile(newProfile);
      }
      setLoadingProfile(false);
    }, (error) => {
      console.error("Profile error:", error);
      setLoadingProfile(false);
    });

    // Listeners should only start if profile is active or we are admin
    let unsubs: (() => void)[] = [];

    const startListeners = () => {
      // All users listener (for admin)
      if (profile?.role === 'admin') {
        unsubs.push(onSnapshot(collection(db, 'users'), (snapshot) => {
          setAllUsers(snapshot.docs.map(d => d.data() as UserProfile));
        }));
      }

      unsubs.push(onSnapshot(collection(db, 'invoices'), (snapshot) => {
        setFactures(snapshot.docs.map(doc => doc.data() as Invoice));
      }, (error) => handleFirestoreError(error, FSOperationType.LIST, 'invoices')));

      unsubs.push(onSnapshot(collection(db, 'purchases'), (snapshot) => {
        setAchats(snapshot.docs.map(doc => doc.data() as Purchase));
      }, (error) => handleFirestoreError(error, FSOperationType.LIST, 'purchases')));

      unsubs.push(onSnapshot(collection(db, 'clients'), (snapshot) => {
        setClients(snapshot.docs.map(doc => doc.data() as ClientInfo));
      }, (error) => handleFirestoreError(error, FSOperationType.LIST, 'clients')));

      unsubs.push(onSnapshot(collection(db, 'articles'), (snapshot) => {
        setArticles(snapshot.docs.map(doc => doc.data() as Article));
      }, (error) => handleFirestoreError(error, FSOperationType.LIST, 'articles')));

      unsubs.push(onSnapshot(collection(db, 'subscriptions'), (snapshot) => {
        setSubscriptions(snapshot.docs.map(doc => doc.data() as Subscription));
      }, (error) => handleFirestoreError(error, FSOperationType.LIST, 'subscriptions')));

      unsubs.push(onSnapshot(collection(db, 'spaces'), (snapshot) => {
        setSpaces(snapshot.docs.map(doc => doc.data() as Space));
      }, (error) => handleFirestoreError(error, FSOperationType.LIST, 'spaces')));

      unsubs.push(onSnapshot(collection(db, 'coworking_inventory'), (snapshot) => {
        setInventory(snapshot.docs.map(doc => doc.data() as InventoryItem));
      }, (error) => handleFirestoreError(error, FSOperationType.LIST, 'coworking_inventory')));

      unsubs.push(onSnapshot(collection(db, 'maintenance_tasks'), (snapshot) => {
        setMaintenanceTasks(snapshot.docs.map(doc => doc.data() as MaintenanceTask));
      }, (error) => handleFirestoreError(error, FSOperationType.LIST, 'maintenance_tasks')));

      unsubs.push(onSnapshot(collection(db, 'buvette_items'), (snapshot) => {
        setBuvetteItems(snapshot.docs.map(doc => doc.data() as BuvetteItem));
      }, (error) => handleFirestoreError(error, FSOperationType.LIST, 'buvette_items')));

      unsubs.push(onSnapshot(collection(db, 'buvette_sales'), (snapshot) => {
        setBuvetteSales(snapshot.docs.map(doc => doc.data() as BuvetteSale));
      }, (error) => handleFirestoreError(error, FSOperationType.LIST, 'buvette_sales')));

      unsubs.push(onSnapshot(collection(db, 'buvette_clients'), (snapshot) => {
        setBuvetteClients(snapshot.docs.map(doc => doc.data() as BuvetteClient));
      }, (error) => handleFirestoreError(error, FSOperationType.LIST, 'buvette_clients')));

      unsubs.push(onSnapshot(collection(db, 'buvette_payments'), (snapshot) => {
        setBuvettePayments(snapshot.docs.map(doc => doc.data() as BuvettePayment));
      }, (error) => handleFirestoreError(error, FSOperationType.LIST, 'buvette_payments')));

      unsubs.push(onSnapshot(collection(db, 'employees'), (snapshot) => {
        setEmployees(snapshot.docs.map(doc => doc.data()));
      }, (error) => handleFirestoreError(error, FSOperationType.LIST, 'employees')));

      unsubs.push(onSnapshot(collection(db, 'pointings'), (snapshot) => {
        setPointings(snapshot.docs.map(doc => doc.data()));
      }, (error) => handleFirestoreError(error, FSOperationType.LIST, 'pointings')));

      unsubs.push(onSnapshot(collection(db, 'operations'), (snapshot) => {
        setOperations(snapshot.docs.map(doc => doc.data() as ProductionOperation));
      }, (error) => handleFirestoreError(error, FSOperationType.LIST, 'operations')));

      unsubs.push(onSnapshot(collection(db, 'issuers'), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as Issuer);
        setIssuers(data);
        if (data.length > 0 && selectedIssuerIds.length === 0) {
          const def = data.find(i => i.isDefault) || data[0];
          setSelectedIssuerIds([def.id]);
        }
      }, (error) => handleFirestoreError(error, FSOperationType.LIST, 'issuers')));
    };

    if (profile?.status === 'active') {
      startListeners();
    }

    return () => {
      unsubProfile();
      unsubs.forEach(u => u());
    };
  }, [user, profile?.status]);

  const handleToggleIssuer = (id: string, multi: boolean) => {
    if (multi) {
      setSelectedIssuerIds(prev => 
        prev.includes(id) 
          ? prev.filter(iid => iid !== id) 
          : [...prev, id]
      );
    } else {
      setSelectedIssuerIds([id]);
    }
  };

  const handleExportAccounting = () => {
    const headers = ['Date', 'Fournisseur', 'HT', 'TVA', 'TTC', 'Catégorie'];
    const rows = filteredAchats
      .map(p => [
        p.date,
        p.vendor,
        p.ht.toFixed(3),
        p.tva.toFixed(3),
        p.ttc.toFixed(3),
        p.category
      ]);
      
    const content = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Export_Accounting_${primaryIssuer.name}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const createInitialInvoice = (): Invoice => ({
    id: 'inv-' + Date.now(),
    number: getNextInvoiceNumber(),
    documentType: 'facture',
    date: new Date().toISOString().split('T')[0],
    dueDate: 'Immédiat',
    issuer: primaryIssuer,
    client: DEFAULT_CLIENT,
    items: [
      { id: '1', description: 'Prestation de Services Informatiques', quantity: 1, unitPrice: 1500, tvaRate: 19 }
    ],
    timbreFiscal: 1.000,
    withholdingTaxRate: 0,
    currency: 'DT',
    bankAccountType: 'dinars',
    notes: "Merci d'utiliser la communication suivante pour votre paiement : " + getNextInvoiceNumber() + "\n\nConditions de règlement : Règlement immédiat",
    status: 'pending'
  });

  const [invoice, setInvoice] = useState<Invoice>(createInitialInvoice);

  const handleSaveInvoice = async () => {
    try {
      // Force status to paid for receipts and cash sales
      const invoiceToSave = { ...invoice, ownerId: user!.uid };
      if (invoice.documentType === 'recu' || invoice.documentType === 'vente_espece') {
        invoiceToSave.status = 'paid';
      }

      await setDoc(doc(db, 'invoices', invoiceToSave.id), invoiceToSave);
      confirmInvoiceNumber(invoiceToSave.number);
      alert("Document enregistré avec succès !");
      setCurrentView('historique');
    } catch (error) {
      handleFirestoreError(error, FSOperationType.CREATE, 'invoices/' + invoice.id);
    }
  };

  const handleNewInvoice = () => {
    setInvoice(createInitialInvoice());
    setActiveTab('edit');
    setCurrentView('nouvelle');
    setComplianceResult(null);
  };

  const handleCheckCompliance = async () => {
    setIsChecking(true);
    try {
      const result = await checkCompliance(invoice);
      setComplianceResult(result);
    } catch (err) {
      setComplianceResult("Une erreur s'est produite lors de la vérification.");
    } finally {
      setIsChecking(false);
    }
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    const element = document.getElementById('document-to-print');
    if (!element) {
      alert("Document introuvable pour l'export.");
      setIsGenerating(false);
      return;
    }

    const fileName = docType === 'invoice' 
      ? `Facture_${invoice.number}` 
      : `Certificat_RS_${invoice.number}`;

    const opt = {
      margin: 0,
      filename: `${fileName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2.5, 
        useCORS: true, 
        letterRendering: true,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF Export Error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderContent = () => {
    const isAdmin = profile?.role === 'admin';
    const can = profile?.permissions || DEFAULT_USER_PERMISSIONS;
    
    const dashboardProps = {
      invoices: filteredFactures, 
      purchases: filteredAchats, 
      subscriptions: subscriptions.filter(s => selectedIssuerIds.includes(s.issuerId)), 
      buvetteSales: buvetteSales.filter(bs => selectedIssuerIds.includes(bs.issuerId)), 
      employees: employees.filter(e => selectedIssuerIds.includes(e.issuerId)),
      pointings: pointings.filter(p => employees.some(e => e.id === p.employeeId && selectedIssuerIds.includes(e.issuerId))),
      operations: operations.filter(o => selectedIssuerIds.includes(o.issuerId)),
      canViewFinancials: can.canViewFinancials || isAdmin,
      dateRange: dateRange,
      onDateRangeChange: setDateRange
    };

    switch (currentView) {
      case 'dashboard':
        if (selectedIssuerIds.length > 1) {
          return (
            <div className="space-y-4 pb-20">
              {activeIssuers.map(issuer => (
                <div key={issuer.id} className="border-b-4 border-[#E4E0D8] last:border-b-0">
                  <Dashboard 
                    invoices={factures.filter(f => f.issuer.id === issuer.id)}
                    purchases={achats.filter(a => a.issuerId === issuer.id)}
                    subscriptions={subscriptions.filter(s => s.issuerId === issuer.id)}
                    buvetteSales={buvetteSales.filter(s => s.issuerId === issuer.id)}
                    employees={employees.filter(e => e.issuerId === issuer.id)}
                    pointings={pointings.filter(p => employees.some(e => e.id === p.employeeId && e.issuerId === issuer.id))}
                    operations={operations.filter(o => o.issuerId === issuer.id)}
                    canViewFinancials={can.canViewFinancials || isAdmin}
                    issuerName={issuer.name}
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                  />
                </div>
              ))}
            </div>
          );
        }
        return <Dashboard {...dashboardProps} issuerName={activeIssuers.length === 1 ? activeIssuers[0].name : undefined} />;
      case 'nouvelle':
        if (!isAdmin && !can.canManageInvoices) return <Dashboard {...dashboardProps} />;
        return (
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            {/* Actions Bar */}
            <div className="sticky top-0 z-50 py-4 no-print mb-6">
              <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white/90 backdrop-blur-xl px-6 py-4 rounded-3xl shadow-xl border border-[#E4E0D8]">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setCurrentView('historique')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#FAF8F4] border border-[#E4E0D8] hover:bg-[#F1EDE5] text-[#14120E] rounded-2xl text-xs font-black tracking-widest uppercase transition-all shadow-sm active:scale-95"
                    title="Retourner à l'historique des factures"
                  >
                    <ArrowLeft size={15} /> RETOUR
                  </button>
                  <div className="flex bg-[#F1EDE5] p-1 rounded-2xl">
                    <button 
                      onClick={() => setActiveTab('edit')}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'edit' ? 'bg-white text-[#1A56DB] shadow-lg' : 'text-[#7A776F] hover:text-[#14120E]'}`}
                    >
                      <Edit3 size={16} /> ÉDITION
                    </button>
                    <button 
                      onClick={() => setActiveTab('preview')}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'preview' ? 'bg-white text-[#1A56DB] shadow-lg' : 'text-[#7A776F] hover:text-[#14120E]'}`}
                    >
                      <Eye size={16} /> APERÇU PDF
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  {activeTab === 'edit' && (
                    <button onClick={handleSaveInvoice} className="bg-[#1A56DB] text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#1648C4] transition-all shadow-xl">
                      ENREGISTRER
                    </button>
                  )}
                  {activeTab === 'preview' && (
                    <div className="flex gap-3">
                      <button onClick={generatePDF} disabled={isGenerating} className="flex items-center gap-2 bg-[#C0280F] text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#A3220D] transition-all disabled:opacity-50 shadow-xl">
                        {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} EXPORTER PDF
                      </button>

                      {invoice.driveFileUrl ? (
                        <>
                          <a 
                            href={invoice.driveFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-[#1A56DB] text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#1648C4] transition-all shadow-xl"
                          >
                            <Cloud size={16} /> Voir sur Drive
                          </a>
                          {invoice.driveFolderUrl && (
                            <a 
                              href={invoice.driveFolderUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-[#D1A000] text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#B18800] transition-all shadow-xl"
                              title="Ouvrir le dossier de classement"
                            >
                              Dossier
                            </a>
                          )}
                        </>
                      ) : (
                        <button 
                          onClick={handleSyncSaleToDrive} 
                          disabled={isSyncingSaleDrive}
                          className="flex items-center gap-2 bg-[#0E7866] text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#085a4d] transition-all disabled:opacity-50 shadow-xl"
                        >
                          {isSyncingSaleDrive ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Cloud size={16} />
                          )} 
                          Archiver sur Drive
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {activeTab === 'edit' ? (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-8">
                  <InvoiceForm 
                    invoice={invoice} 
                    onChange={setInvoice} 
                    onCheckCompliance={handleCheckCompliance} 
                    complianceResult={complianceResult}
                    isChecking={isChecking}
                    clients={clients}
                    articles={articles}
                    issuers={issuers}
                  />
                </div>
                <div className="xl:col-span-4 hidden xl:block">
                  <div className="sticky top-32 bg-white p-8 rounded-3xl border border-[#E4E0D8] shadow-sm text-center">
                     <div className="w-16 h-16 bg-[#EBF2FF] text-[#1A56DB] rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileCheck size={32} />
                     </div>
                     <h4 className="text-sm font-black text-[#14120E] mb-2 uppercase tracking-widest">Récapitulatif</h4>
                     <QuickSummary invoice={invoice} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center pb-20 overflow-x-auto overflow-y-visible">
                <div className="bg-[#E4E0D8]/30 p-4 md:p-8 rounded-[2rem] shadow-inner border border-[#E4E0D8]/20 scale-[0.6] sm:scale-[0.8] md:scale-90 lg:scale-100 origin-top">
                  <div className="bg-white shadow-2xl relative">
                    {docType === 'invoice' ? (
                      <InvoicePreview invoice={invoice} />
                    ) : (
                      <WithholdingCertificate invoice={invoice} />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'historique':
        if (!isAdmin && !can.canManageInvoices) return <Dashboard {...dashboardProps} />;
        return (
          <History 
            invoices={filteredFactures} 
            onViewInvoice={(inv) => { setInvoice(inv); setActiveTab('preview'); setCurrentView('nouvelle'); }} 
            onEditInvoice={(inv) => { setInvoice(inv); setActiveTab('edit'); setCurrentView('nouvelle'); }}
            onUpdateInvoice={async (inv) => {
              try {
                await updateDoc(doc(db, 'invoices', inv.id), { status: inv.status });
              } catch (error) {
                handleFirestoreError(error, FSOperationType.UPDATE, 'invoices/' + inv.id);
              }
            }}
            onDeleteInvoice={async (id) => {
              if (confirm('Supprimer cette facture ?')) {
                try {
                  await deleteDoc(doc(db, 'invoices', id));
                } catch (error) {
                  handleFirestoreError(error, FSOperationType.DELETE, 'invoices/' + id);
                }
              }
            }}
          />
        );
      case 'achats':
        if (!isAdmin && !can.canManagePurchases) return <Dashboard {...dashboardProps} />;
        return (
          <Purchases 
            purchases={filteredAchats} 
            issuerId={primaryIssuer?.id || ''} 
            issuers={userIssuers}
            onDelete={async (id) => {
              if (confirm('Supprimer cet achat ?')) {
                try {
                  await deleteDoc(doc(db, 'purchases', id));
                } catch (error) {
                  handleFirestoreError(error, FSOperationType.DELETE, 'purchases/' + id);
                }
              }
            }}
            onUpdate={async (p) => {
              try {
                await updateDoc(doc(db, 'purchases', p.id), { ...p } as any);
              } catch (error) {
                handleFirestoreError(error, FSOperationType.UPDATE, 'purchases/' + p.id);
              }
            }}
            onExport={handleExportAccounting}
            onAddManual={() => setCurrentView('import-achat')}
            onSyncDrive={handleSyncPurchaseToDrive}
            isSyncingDriveId={isSyncingDriveId}
          />
        );
      case 'utilisateurs':
        return isAdmin ? (
          <UserManagement 
            users={allUsers}
            onAddUser={async (email, displayName, role, permissions, employeeRole) => {
              const inviteId = `invite_${email.toLowerCase().trim()}`;
              try {
                await setDoc(doc(db, 'users', inviteId), {
                  uid: inviteId,
                  email: email.toLowerCase().trim(),
                  displayName,
                  role,
                  employeeRole: employeeRole || null,
                  status: 'pending',
                  permissions,
                  issuerIds: issuers.map(i => i.id) // Give access to all companies by default or let admin adjust
                });
              } catch (err) {
                handleFirestoreError(err, FSOperationType.CREATE, 'users/' + inviteId);
              }
            }}
            onUpdateUser={async (u) => {
              try {
                await updateDoc(doc(db, 'users', u.uid), { ...u });
              } catch (err) {
                handleFirestoreError(err, FSOperationType.UPDATE, 'users/' + u.uid);
              }
            }}
            onDeleteUser={async (uid) => {
              if (confirm('Supprimer cet utilisateur ?')) {
                try {
                  await deleteDoc(doc(db, 'users', uid));
                } catch (err) {
                  handleFirestoreError(err, FSOperationType.DELETE, 'users/' + uid);
                }
              }
            }}
          />
        ) : <Dashboard {...dashboardProps} />;
      case 'import-achat':
        if (!isAdmin && !can.canManagePurchases) return <Dashboard {...dashboardProps} />;
        return (
          <PurchaseImport 
            activeIssuerId={primaryIssuer?.id || ''} 
            issuers={userIssuers}
            isDriveConnected={isDriveConnected}
            onConnectDrive={handleConnectDrive}
            isConnectingDrive={isConnectingDrive}
            onSave={async (p, syncToDrive) => {
              try {
                let pFinal = { ...p, ownerId: user!.uid, createdAt: new Date().toISOString() };
                if (syncToDrive) {
                  const token = getCachedDriveToken();
                  if (token && p.imageUrl) {
                    try {
                      const syncResult = await syncInvoiceToDrive(token, p, p.imageUrl, 'purchase');
                      pFinal.driveFileUrl = syncResult.fileUrl;
                      pFinal.driveFolderUrl = syncResult.folderUrl;
                    } catch (driveErr) {
                      console.error("Failed to sync on import save, continuing save", driveErr);
                      alert("Impossible de téléverser l'image sur Google Drive, l'achat a été enregistré localement.");
                    }
                  }
                }

                // Sanitize undefined & NaN field values to prevent silent Firestore creation failures
                const pClean: any = {};
                Object.keys(pFinal).forEach((key) => {
                  const value = (pFinal as any)[key];
                  if (value !== undefined && value !== null && !Number.isNaN(value)) {
                    pClean[key] = value;
                  }
                });

                await setDoc(doc(db, 'purchases', p.id), pClean);
                alert("Achat enregistré !");
                setCurrentView('achats');
              } catch (error) {
                console.error("Error saving purchase to Firestore:", error);
                alert("Erreur lors de l'enregistrement de l'achat : " + (error instanceof Error ? error.message : String(error)));
                handleFirestoreError(error, FSOperationType.CREATE, 'purchases/' + p.id);
              }
            }}
          />
        );
      case 'parametres':
        if (!isAdmin && !can.canManageSettings) return <Dashboard {...dashboardProps} />;
        return (
          <Settings 
            issuers={issuers} 
            activeId={primaryIssuer?.id || ''}
            onSetActive={(id) => handleToggleIssuer(id, false)}
            onSaveIssuer={async (newIssuer) => {
              try {
                await setDoc(doc(db, 'issuers', newIssuer.id), newIssuer);
              } catch (error) {
                handleFirestoreError(error, FSOperationType.WRITE, 'issuers/' + newIssuer.id);
              }
            }}
            onDeleteIssuer={async (id) => {
              if (confirm('Supprimer cette entreprise ?')) {
                try {
                  await deleteDoc(doc(db, 'issuers', id));
                  setSelectedIssuerIds(prev => prev.filter(iid => iid !== id));
                } catch (error) {
                  handleFirestoreError(error, FSOperationType.DELETE, 'issuers/' + id);
                }
              }
            }}
          />
        );
      case 'clients':
        if (!isAdmin && !can.canManageClients) return <Dashboard {...dashboardProps} />;
        return (
          <Clients 
            clients={clients} 
            invoices={factures}
            onAddClient={async (c) => {
              try {
                await setDoc(doc(db, 'clients', c.id), { ...c, ownerId: user!.uid });
                return c.id;
              } catch (error) {
                handleFirestoreError(error, FSOperationType.CREATE, 'clients/' + c.id);
                throw error;
              }
            }}
            onUpdateClient={async (c) => {
              try {
                await updateDoc(doc(db, 'clients', c.id), { ...c });
              } catch (error) {
                handleFirestoreError(error, FSOperationType.UPDATE, 'clients/' + c.id);
              }
            }}
            onDeleteClient={async (id) => {
              if (confirm('Supprimer ce client ?')) {
                try {
                  await deleteDoc(doc(db, 'clients', id));
                } catch (error) {
                  handleFirestoreError(error, FSOperationType.DELETE, 'clients/' + id);
                }
              }
            }}
            subscriptions={subscriptions}
            spaces={spaces}
            issuers={issuers}
            onAddSubscription={async (sub) => {
              try {
                await setDoc(doc(db, 'subscriptions', sub.id), { ...sub, ownerId: user!.uid });
                // Automatically occupy the respective Coworking Space if possible
                const spaceObj = spaces.find(s => s.name === sub.officeType);
                if (spaceObj && spaceObj.status === 'available') {
                  await updateDoc(doc(db, 'spaces', spaceObj.id), { status: 'occupied' });
                }
              } catch (error) {
                handleFirestoreError(error, FSOperationType.CREATE, 'subscriptions/' + sub.id);
              }
            }}
            onUpdateSubscription={async (sub) => {
              try {
                await updateDoc(doc(db, 'subscriptions', sub.id), { ...sub });
              } catch (error) {
                handleFirestoreError(error, FSOperationType.UPDATE, 'subscriptions/' + sub.id);
              }
            }}
            onDeleteSubscription={async (id) => {
              if (confirm('Supprimer cet abonnement ?')) {
                try {
                  await deleteDoc(doc(db, 'subscriptions', id));
                } catch (error) {
                  handleFirestoreError(error, FSOperationType.DELETE, 'subscriptions/' + id);
                }
              }
            }}
          />
        );
      case 'articles':
        if (!isAdmin && !can.canManageArticles) return <Dashboard {...dashboardProps} />;
        return (
          <Articles 
            articles={articles} 
            onAddArticle={async (a) => {
              try {
                await setDoc(doc(db, 'articles', a.id), { ...a, ownerId: user!.uid });
              } catch (error) {
                handleFirestoreError(error, FSOperationType.CREATE, 'articles/' + a.id);
              }
            }}
            onUpdateArticle={async (a) => {
              try {
                await updateDoc(doc(db, 'articles', a.id), { ...a });
              } catch (error) {
                handleFirestoreError(error, FSOperationType.UPDATE, 'articles/' + a.id);
              }
            }}
            onDeleteArticle={async (id) => {
              if (confirm('Supprimer cet article ?')) {
                try {
                  await deleteDoc(doc(db, 'articles', id));
                } catch (error) {
                  handleFirestoreError(error, FSOperationType.DELETE, 'articles/' + id);
                }
              }
            }}
          />
        );
      case 'pointage':
        if (!isAdmin && !can.canManageAttendance) return <Dashboard {...dashboardProps} />;
        return (
          <PointingSystem 
            selectedIssuerIds={selectedIssuerIds}
            issuers={issuers}
            permissions={can}
            isAdmin={isAdmin}
          />
        );
      case 'coworking':
        if (!isAdmin && !can.canManageSpaces && !can.canManageSubscriptions) return <Dashboard {...dashboardProps} />;
        return (
          <CoworkingSpace 
            spaces={spaces}
            subscriptions={subscriptions}
            inventory={inventory}
            clients={clients}
            maintenanceTasks={maintenanceTasks}
            onAddMaintenanceTask={async (task) => {
              try {
                await setDoc(doc(db, 'maintenance_tasks', task.id), { ...task, ownerId: user!.uid });
              } catch (error) {
                handleFirestoreError(error, FSOperationType.CREATE, 'maintenance_tasks/' + task.id);
              }
            }}
            onUpdateMaintenanceTask={async (task) => {
              try {
                await updateDoc(doc(db, 'maintenance_tasks', task.id), { ...task });
              } catch (error) {
                handleFirestoreError(error, FSOperationType.UPDATE, 'maintenance_tasks/' + task.id);
              }
            }}
            onDeleteMaintenanceTask={async (id) => {
              if (confirm('Supprimer cette tâche de maintenance ?')) {
                try {
                  await deleteDoc(doc(db, 'maintenance_tasks', id));
                } catch (error) {
                  handleFirestoreError(error, FSOperationType.DELETE, 'maintenance_tasks/' + id);
                }
              }
            }}
            issuerId={primaryIssuer?.id || ''}
            onAddSpace={async (space) => {
              try {
                await setDoc(doc(db, 'spaces', space.id), { ...space, ownerId: user!.uid });
              } catch (error) {
                handleFirestoreError(error, FSOperationType.CREATE, 'spaces/' + space.id);
              }
            }}
            onUpdateSpace={async (space) => {
              try {
                await updateDoc(doc(db, 'spaces', space.id), { ...space });
              } catch (error) {
                handleFirestoreError(error, FSOperationType.UPDATE, 'spaces/' + space.id);
              }
            }}
            onDeleteSpace={async (id) => {
              if (confirm('Supprimer cet espace ?')) {
                try {
                  await deleteDoc(doc(db, 'spaces', id));
                } catch (error) {
                  handleFirestoreError(error, FSOperationType.DELETE, 'spaces/' + id);
                }
              }
            }}
            onAddInventoryItem={async (item) => {
              try {
                await setDoc(doc(db, 'coworking_inventory', item.id), { ...item, ownerId: user!.uid });
              } catch (error) {
                handleFirestoreError(error, FSOperationType.CREATE, 'coworking_inventory/' + item.id);
              }
            }}
            onUpdateInventoryItem={async (item) => {
              try {
                await updateDoc(doc(db, 'coworking_inventory', item.id), { ...item });
              } catch (error) {
                handleFirestoreError(error, FSOperationType.UPDATE, 'coworking_inventory/' + item.id);
              }
            }}
            onDeleteInventoryItem={async (id) => {
              if (confirm('Supprimer cet article d\'inventaire ?')) {
                try {
                  await deleteDoc(doc(db, 'coworking_inventory', id));
                } catch (error) {
                  handleFirestoreError(error, FSOperationType.DELETE, 'coworking_inventory/' + id);
                }
              }
            }}
            onAddClient={async (client) => {
              try {
                await setDoc(doc(db, 'clients', client.id), client);
                return client.id;
              } catch (error) {
                handleFirestoreError(error, FSOperationType.CREATE, 'clients/' + client.id);
                throw error;
              }
            }}
            onAddSubscription={async (sub) => {
              try {
                await setDoc(doc(db, 'subscriptions', sub.id), { ...sub, ownerId: user!.uid });
                // Mark space as occupied if applicable
                const space = spaces.find(s => s.name === sub.officeType);
                if (space && space.status === 'available') {
                  await updateDoc(doc(db, 'spaces', space.id), { status: 'occupied' });
                }
              } catch (error) {
                handleFirestoreError(error, FSOperationType.CREATE, 'subscriptions/' + sub.id);
              }
            }}
            onUpdateSubscription={async (sub) => {
              try {
                await updateDoc(doc(db, 'subscriptions', sub.id), { ...sub });
              } catch (error) {
                handleFirestoreError(error, FSOperationType.UPDATE, 'subscriptions/' + sub.id);
              }
            }}
            onDeleteSubscription={async (id) => {
              if (confirm('Supprimer cet abonnement ?')) {
                try {
                  await deleteDoc(doc(db, 'subscriptions', id));
                } catch (error) {
                  handleFirestoreError(error, FSOperationType.DELETE, 'subscriptions/' + id);
                }
              }
            }}
            canViewFinancials={can.canViewFinancials || isAdmin}
          />
        );
      case 'buvette': {
        if (!isAdmin && !can.canManageBuvette && !can.canManageSales) return <Dashboard {...dashboardProps} />;
        const sanitize = (obj: any): any => {
          const result: any = {};
          Object.keys(obj).forEach(key => {
            if (obj[key] !== undefined) {
              if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                result[key] = sanitize(obj[key]);
              } else if (Array.isArray(obj[key])) {
                result[key] = obj[key].map((item: any) => typeof item === 'object' ? sanitize(item) : item);
              } else {
                result[key] = obj[key];
              }
            }
          });
          return result;
        };
        return (
          <Buvette 
            items={buvetteItems}
            sales={buvetteSales}
            clients={buvetteClients}
            payments={buvettePayments}
            issuerId={primaryIssuer?.id || ''}
            onAddItem={async (item) => {
              try {
                await setDoc(doc(db, 'buvette_items', item.id), sanitize({ ...item, ownerId: user!.uid }));
              } catch (error) {
                handleFirestoreError(error, FSOperationType.CREATE, 'buvette_items/' + item.id);
              }
            }}
            onUpdateItem={async (item) => {
              try {
                await updateDoc(doc(db, 'buvette_items', item.id), sanitize({ ...item }));
              } catch (error) {
                handleFirestoreError(error, FSOperationType.UPDATE, 'buvette_items/' + item.id);
              }
            }}
            onDeleteItem={async (id) => {
              if (confirm('Supprimer cet article ?')) {
                try {
                  await deleteDoc(doc(db, 'buvette_items', id));
                } catch (error) {
                  handleFirestoreError(error, FSOperationType.DELETE, 'buvette_items/' + id);
                }
              }
            }}
            onAddClient={async (client) => {
              try {
                await setDoc(doc(db, 'buvette_clients', client.id), sanitize({ ...client, ownerId: user!.uid }));
              } catch (error) {
                handleFirestoreError(error, FSOperationType.CREATE, 'buvette_clients/' + client.id);
              }
            }}
            onUpdateClient={async (client) => {
              try {
                await updateDoc(doc(db, 'buvette_clients', client.id), sanitize({ ...client }));
              } catch (error) {
                handleFirestoreError(error, FSOperationType.UPDATE, 'buvette_clients/' + client.id);
              }
            }}
            onDeleteClient={async (id) => {
              if (confirm('Supprimer ce client ? Ses transactions resteront mais son compte sera désactivé.')) {
                try {
                  await deleteDoc(doc(db, 'buvette_clients', id));
                } catch (error) {
                  handleFirestoreError(error, FSOperationType.DELETE, 'buvette_clients/' + id);
                }
              }
            }}
            onAddPayment={async (payment) => {
              try {
                await setDoc(doc(db, 'buvette_payments', payment.id), sanitize({ ...payment, ownerId: user!.uid }));
                const clientRef = doc(db, 'buvette_clients', payment.clientId);
                const clientDoc = buvetteClients.find(c => c.id === payment.clientId);
                if (clientDoc) {
                  await updateDoc(clientRef, {
                    balance: Math.max(0, (clientDoc.balance || 0) - payment.amount)
                  });
                }
              } catch (error) {
                handleFirestoreError(error, FSOperationType.CREATE, 'buvette_payments/' + payment.id);
              }
            }}
            onAddSale={async (sale) => {
              try {
                await setDoc(doc(db, 'buvette_sales', sale.id), sanitize({ ...sale, ownerId: user!.uid }));
                // Also update stock for each item sold
                for (const item of sale.items) {
                  const dbItem = buvetteItems.find(i => i.id === item.itemId);
                  if (dbItem) {
                    await updateDoc(doc(db, 'buvette_items', item.itemId), {
                      stock: Math.max(0, dbItem.stock - item.quantity)
                    });
                  }
                }
                // If it is charged to client account, update the client's balance
                if (sale.paymentMethod === 'client_account' && sale.clientId) {
                  const clientRef = doc(db, 'buvette_clients', sale.clientId);
                  const clientDoc = buvetteClients.find(c => c.id === sale.clientId);
                  if (clientDoc) {
                    await updateDoc(clientRef, {
                      balance: (clientDoc.balance || 0) + sale.totalAmount
                    });
                  }
                }
              } catch (error) {
                handleFirestoreError(error, FSOperationType.CREATE, 'buvette_sales/' + sale.id);
              }
            }}
          />
        );
      }
      case 'agenda': {
        if (!isAdmin && !can.canManageSpaces) return <Dashboard {...dashboardProps} />;
        return (
          <Agenda 
            spaces={spaces}
            clients={clients}
            issuerId={primaryIssuer?.id || ''}
            userId={user?.uid || ''}
          />
        );
      }
      default:
        return <Dashboard {...dashboardProps} />;
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 size={48} className="animate-spin text-[#1A56DB] mx-auto" />
          <p className="text-sm font-black text-[#14120E] uppercase tracking-widest">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  if (profile?.status !== 'active') {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-12 rounded-[3rem] border border-[#E4E0D8] shadow-2xl text-center space-y-8">
          <div className="w-24 h-24 bg-[#FAF8F4] text-[#C0280F] rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck size={48} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#14120E] uppercase tracking-tighter mb-4">
              {profile?.status === 'pending' ? 'Accès en attente' : 'Compte suspendu'}
            </h1>
            <p className="text-sm text-[#7A776F] font-medium leading-relaxed">
              {profile?.status === 'pending' 
                ? "Votre compte a été créé avec succès. Un administrateur doit valider votre accès pour que vous puissiez utiliser l'application."
                : "Votre compte a été suspendu par un administrateur. Veuillez les contacter pour plus d'informations."}
            </p>

            <div className="p-4 bg-[#FAF8F4] border border-[#E4E0D8]/60 rounded-2xl text-[11px] space-y-1.5 font-bold font-sans text-left mt-5 text-[#7A776F]">
              <div className="flex justify-between items-center">
                <span>Compte connecté :</span>
                <span className="text-[#14120E] font-black">{user?.email}</span>
              </div>
              {profile?.status === 'pending' && (
                <p className="text-[10px] text-amber-700 leading-snug mt-2 pt-2 border-t border-dashed border-[#E4E0D8]">
                  ⚠️ IMPORTANT : Si l'administrateur vous a déjà envoyé une invitation, vous devez impérativement vous déconnecter et vous reconnecter avec l'adresse e-mail exacte à laquelle l'invitation a été envoyée.
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full py-4 bg-[#14120E] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-md"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      activeView={currentView} 
      onViewChange={setCurrentView}
      issuers={userIssuers}
      primaryIssuer={primaryIssuer}
      selectedIssuerIds={selectedIssuerIds}
      onToggleIssuer={handleToggleIssuer}
      onToggleAllIssuers={() => {
        if (selectedIssuerIds.length === userIssuers.length) {
          setSelectedIssuerIds([userIssuers[0]?.id].filter(Boolean) as string[]);
        } else {
          setSelectedIssuerIds(userIssuers.map(i => i.id));
        }
      }}
      onLogout={logout}
      profile={profile}
    >
      {renderContent()}
    </Layout>
  );
};

import { CURRENCIES, calculateInvoice, formatCurrency } from './utils/calculations';
const QuickSummary = ({ invoice }: { invoice: Invoice }) => {
  const res = calculateInvoice(invoice);
  const currency = CURRENCIES.find(c => c.code === invoice.currency) || CURRENCIES[0];
  
  return (
    <div className="space-y-3 bg-[#FAF8F4] p-6 rounded-2xl border border-[#E4E0D8]">
      <div className="flex justify-between text-[10px] font-bold text-[#7A776F] uppercase tracking-wider">
        <span>Total HT</span>
        <span className="text-[#14120E] font-mono">{formatCurrency(res.totalHT, invoice.currency)}</span>
      </div>
      <div className="flex justify-between text-[10px] font-bold text-[#7A776F] uppercase tracking-wider">
        <span>TVA</span>
        <span className="text-[#14120E] font-mono">{formatCurrency(res.totalTVA, invoice.currency)}</span>
      </div>
      <div className="pt-4 border-t border-[#E4E0D8] flex flex-col items-center">
        <span className="text-[10px] font-black uppercase text-[#1A56DB] tracking-widest mb-1">Net à Payer</span>
        <span className="text-3xl font-black text-[#14120E] font-mono tracking-tighter">
          {formatCurrency(res.totalTTC, invoice.currency)} <span className="text-xs font-normal opacity-40">{currency.symbol}</span>
        </span>
      </div>
    </div>
  );
};

export default App;
