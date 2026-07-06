import React, { useState, useEffect } from 'react';
import { 
  Coffee, ShoppingCart, List, Trash2, Search, History, User, CreditCard, 
  Banknote, ShoppingBag, Users, Plus, X, Check, FileText, Printer, 
  ArrowUpRight, ArrowDownLeft, Minus, Percent, Coins, Receipt, ChevronRight,
  Volume2, VolumeX, Flame, LogOut, Loader2, Calculator, Edit2
} from 'lucide-react';
import { BuvetteItem, BuvetteSale, BuvetteClient, BuvettePayment } from '../types';
import { formatCurrency } from '../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';
import { playPOSSound } from '../utils/posAudio';

interface BuvetteProps {
  items: BuvetteItem[];
  sales: BuvetteSale[];
  clients?: BuvetteClient[];
  payments?: BuvettePayment[];
  issuerId: string;
  onAddItem: (item: BuvetteItem) => void;
  onUpdateItem: (item: BuvetteItem) => void;
  onDeleteItem: (id: string) => void;
  onAddSale: (sale: BuvetteSale) => void;
  onAddClient?: (client: BuvetteClient) => void;
  onUpdateClient?: (client: BuvetteClient) => void;
  onDeleteClient?: (id: string) => void;
  onAddPayment?: (payment: BuvettePayment) => void;
}

const CATEGORIES = ["Boissons Chaudes", "Boissons Froides", "Snacks", "Viennoiseries", "Déjeuner", "Autre"];

const Buvette: React.FC<BuvetteProps> = ({ 
  items, sales, clients = [], payments = [], issuerId, 
  onAddItem, onUpdateItem, onDeleteItem, onAddSale,
  onAddClient = () => {}, onUpdateClient = () => {}, onDeleteClient = () => {}, onAddPayment = () => {}
}) => {
  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'history' | 'accounts'>('pos');
  const [cart, setCart] = useState<{ itemId: string, name: string, quantity: number, price: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<BuvetteItem | null>(null);

  // Settings
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('buvette_muted') === 'true');
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [cashGiven, setCashGiven] = useState('');
  const [showChangeCalcModal, setShowChangeCalcModal] = useState(false);
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<BuvetteSale | null>(null);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Keypad / Multiplier & Custom Price states
  const [numpadVal, setNumpadVal] = useState('');
  const [numpadQty, setNumpadQty] = useState(1);
  const [showMobileNumpad, setShowMobileNumpad] = useState(false);
  const [posMobileView, setPosMobileView] = useState<'catalog' | 'numpad' | 'ticket'>('catalog');

  // Standby Carts (Mise en attente)
  const [suspendedCarts, setSuspendedCarts] = useState<{
    id: string; name: string; date: string;
    cart: { itemId: string, name: string, quantity: number, price: number }[];
    discountType: 'none' | 'percent' | 'fixed'; discountValue: number;
  }[]>(() => {
    try {
      const saved = localStorage.getItem(`buvette_suspended_${issuerId}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Cash Register Drawer Sessions (Fonds de Caisse & Clôture)
  const [cashDrawer, setCashDrawer] = useState<{
    isOpen: boolean; openingBalance: number; dateOpened: string;
    extraTransactions: { id: string, type: 'in' | 'out', amount: number, notes: string, date: string }[];
  }>(() => {
    try {
      const saved = localStorage.getItem(`buvette_session_${issuerId}`);
      return saved ? JSON.parse(saved) : { isOpen: false, openingBalance: 50, dateOpened: '', extraTransactions: [] };
    } catch { return { isOpen: false, openingBalance: 50, dateOpened: '', extraTransactions: [] }; }
  });

  const [closedSessions, setClosedSessions] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(`buvette_closed_sessions_${issuerId}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Modern Dialog systems (for IFrame sandbox compatibility)
  const [alertState, setAlertState] = useState<{ show: boolean, title: string, message: string, type?: 'alert' | 'success' | 'warn' }>({ show: false, title: '', message: '' });
  const [confirmState, setConfirmState] = useState<{ show: boolean, title: string, message: string, action?: () => void }>({ show: false, title: '', message: '' });
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdLabel, setHoldLabel] = useState('');
  const [showDrawerFlowModal, setShowDrawerFlowModal] = useState(false);
  const [drawerFlowType, setDrawerFlowType] = useState<'in' | 'out'>('in');
  const [drawerFlowForm, setDrawerFlowForm] = useState({ amount: '', notes: '' });
  const [showZReportForm, setShowZReportForm] = useState(false);
  const [actualCashCounted, setActualCashCounted] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Clients section
  const [showClientCheckoutModal, setShowClientCheckoutModal] = useState(false);
  const [searchClientQuery, setSearchClientQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<BuvetteClient | null>(null);
  const [showAddClientForm, setShowAddClientForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', phone: '', email: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMethod: 'cash' as 'cash' | 'card' });

  // Persistence triggers
  useEffect(() => {
    localStorage.setItem(`buvette_suspended_${issuerId}`, JSON.stringify(suspendedCarts));
  }, [suspendedCarts, issuerId]);

  useEffect(() => {
    localStorage.setItem(`buvette_session_${issuerId}`, JSON.stringify(cashDrawer));
  }, [cashDrawer, issuerId]);

  useEffect(() => {
    localStorage.setItem(`buvette_closed_sessions_${issuerId}`, JSON.stringify(closedSessions));
  }, [closedSessions, issuerId]);

  useEffect(() => {
    localStorage.setItem('buvette_muted', String(isMuted));
  }, [isMuted]);

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  // Handle Physical Keyboards hooks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }
      
      const key = e.key;
      if (/[0-9]/.test(key)) {
        setNumpadVal(prev => prev + key);
        playPOSSound('click', isMuted);
      } else if (key === '.') {
        setNumpadVal(prev => prev.includes('.') ? prev : prev + '.');
        playPOSSound('click', isMuted);
      } else if (key === 'Backspace') {
        setNumpadVal(prev => prev.slice(0, -1));
        playPOSSound('click', isMuted);
      } else if (key === 'Enter') {
        e.preventDefault();
        if (numpadVal) {
          setCashGiven(numpadVal);
          setShowChangeCalcModal(true);
          setNumpadVal('');
        } else if (cart.length > 0) {
          setShowChangeCalcModal(true);
        }
      } else if (key === 'Escape') {
        setNumpadVal('');
      } else if (key === '*' || key === 'q' || key === 'Q') {
        const val = parseInt(numpadVal);
        if (val && val > 0 && val < 100) {
          setNumpadQty(val);
          setNumpadVal('');
          playPOSSound('click', isMuted);
        }
      } else if (key === '+' || key === 'd' || key === 'D') {
        e.preventDefault();
        const val = parseFloat(numpadVal);
        if (val > 0) {
          handleInsertCustomItem(val);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numpadVal, cart, numpadQty, isMuted]);

  const triggerAlert = (title: string, message: string, type: 'alert' | 'success' | 'warn' = 'alert') => {
    setAlertState({ show: true, title, message, type });
  };

  const triggerConfirm = (title: string, message: string, action: () => void) => {
    setConfirmState({ show: true, title, message, action });
  };

  // Data mapping & flows
  const filteredItems = items
    .filter(i => i.issuerId === issuerId)
    .filter(i => selectedCategory === 'Tous' || i.category === selectedCategory)
    .filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const filteredSales = sales
    .filter(s => s.issuerId === issuerId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredClients = clients
    .filter(c => c.issuerId === issuerId)
    .filter(c => c.name.toLowerCase().includes(searchClientQuery.toLowerCase()));

  // Active sales today
  const salesToday = filteredSales.filter(s => new Date(s.date).toDateString() === new Date().toDateString());
  const totalSalesToday = salesToday.reduce((sum, s) => sum + s.totalAmount, 0);
  const cashSalesToday = salesToday.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.totalAmount, 0);
  const cardSalesToday = salesToday.filter(s => s.paymentMethod === 'card').reduce((sum, s) => sum + s.totalAmount, 0);
  const accountSalesToday = salesToday.filter(s => s.paymentMethod === 'client_account').reduce((sum, s) => sum + s.totalAmount, 0);
  const totalPaymentsReceivedToday = payments
    .filter(p => p.issuerId === issuerId && new Date(p.date).toDateString() === new Date().toDateString())
    .reduce((sum, p) => sum + p.amount, 0);

  // Cart financial summaries
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = discountType === 'none' ? 0 : discountType === 'percent' ? (cartSubtotal * discountValue) / 100 : discountValue;
  const cartTotal = Math.max(0, cartSubtotal - discountAmount);
  const totalAccountsReceivable = clients.filter(c => c.issuerId === issuerId).reduce((sum, c) => sum + (c.balance || 0), 0);

  // Cache calculations for cash drawer
  const getTheoreticalCash = () => {
    const opening = cashDrawer.openingBalance;
    const sessionCashSales = filteredSales
      .filter(s => s.paymentMethod === 'cash' && cashDrawer.dateOpened && new Date(s.date) >= new Date(cashDrawer.dateOpened))
      .reduce((sum, s) => sum + s.totalAmount, 0);
    const sessionDebtPaymentsCash = payments
      .filter(p => p.paymentMethod === 'cash' && cashDrawer.dateOpened && new Date(p.date) >= new Date(cashDrawer.dateOpened))
      .reduce((sum, p) => sum + p.amount, 0);
    const sessionDeposits = cashDrawer.extraTransactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
    const sessionWithdrawals = cashDrawer.extraTransactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0);
    return opening + sessionCashSales + sessionDebtPaymentsCash + sessionDeposits - sessionWithdrawals;
  };

  // Add Item to active cart with dynamic quantities
  const addToCart = (item: BuvetteItem, multiplierOverride?: number) => {
    if (!cashDrawer.isOpen) {
      triggerAlert("Caisse Verrouillée", "Veuillez ouvrir la session de caisse en indiquant le fonds de tiroir avant de procéder aux ventes.", "warn");
      return;
    }
    const qtyToAdd = multiplierOverride || numpadQty || 1;
    if (item.stock <= 0) {
      playPOSSound('error', isMuted);
      triggerAlert("Stock Épuisé", "Cet article n'est actuellement plus disponible en stock.", "warn");
      return;
    }
    const existing = cart.find(c => c.itemId === item.id);
    const currentQty = existing ? existing.quantity : 0;

    if (currentQty + qtyToAdd > item.stock) {
      playPOSSound('error', isMuted);
      triggerAlert("Stock Insuffisant", `Vous essayez d'ajouter ${qtyToAdd} unité(s), mais la quantité restante en stock est de ${item.stock - currentQty}.`, "warn");
      return;
    }

    playPOSSound('beep', isMuted);
    if (existing) {
      setCart(cart.map(c => c.itemId === item.id ? { ...c, quantity: c.quantity + qtyToAdd } : c));
    } else {
      setCart([...cart, { itemId: item.id, name: item.name, quantity: qtyToAdd, price: item.price }]);
    }
    setNumpadQty(1);
  };

  const decrementCart = (itemId: string) => {
    const existing = cart.find(c => c.itemId === itemId);
    if (!existing) return;
    if (existing.quantity <= 1) {
      setCart(cart.filter(c => c.itemId !== itemId));
    } else {
      setCart(cart.map(c => c.itemId === itemId ? { ...c, quantity: c.quantity - 1 } : c));
    }
    playPOSSound('click', isMuted);
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(c => c.itemId !== itemId));
    playPOSSound('click', isMuted);
  };

  // Settle cart sales
  const handleCheckout = (paymentMethod: BuvetteSale['paymentMethod'], clientId?: string) => {
    if (cart.length === 0) return;

    const saleId = 'sale-' + Date.now();
    const newSale: BuvetteSale = {
      id: saleId,
      items: cart.map(c => ({
        itemId: c.itemId,
        itemName: c.name,
        quantity: c.quantity,
        price: c.price
      })),
      totalAmount: cartTotal,
      paymentMethod,
      clientId,
      date: new Date().toISOString(),
      issuerId,
      ownerId: ''
    };

    onAddSale(newSale);
    playPOSSound('cash', isMuted);

    // Clear local POS checkout states
    setCart([]);
    setDiscountType('none');
    setDiscountValue(0);
    setShowClientCheckoutModal(false);
    setSelectedSaleForReceipt(newSale);
    setPosMobileView('catalog');
  };

  // Settle Custom direct items
  const handleInsertCustomItem = (priceVal?: number) => {
    const calculatedPrice = priceVal || parseFloat(numpadVal);
    if (!calculatedPrice || calculatedPrice <= 0) {
      playPOSSound('error', isMuted);
      return;
    }
    if (!cashDrawer.isOpen) {
      triggerAlert("Caisse Verrouillée", "Veuillez ouvrir la session de caisse d'abord.", "warn");
      return;
    }
    const customItem = {
      itemId: 'custom-' + Date.now(),
      name: `Article Divers (${calculatedPrice.toFixed(3)} DT)`,
      quantity: numpadQty,
      price: calculatedPrice
    };
    setCart(prev => [...prev, customItem]);
    playPOSSound('beep', isMuted);
    setNumpadVal('');
    setNumpadQty(1);
  };

  // Shift Session management
  const handleOpenSession = (balance: number) => {
    setCashDrawer({
      isOpen: true,
      openingBalance: balance,
      dateOpened: new Date().toISOString(),
      extraTransactions: []
    });
    playPOSSound('cash', isMuted);
  };

  const submitDrawerFlow = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(drawerFlowForm.amount);
    if (!amt || amt <= 0) return;

    setCashDrawer(prev => ({
      ...prev,
      extraTransactions: [
        ...prev.extraTransactions,
        {
          id: 'flow-' + Date.now(),
          type: drawerFlowType,
          amount: amt,
          notes: drawerFlowForm.notes || (drawerFlowType === 'in' ? 'Injection Cash' : 'Retrait Cash'),
          date: new Date().toISOString()
        }
      ]
    }));

    setDrawerFlowForm({ amount: '', notes: '' });
    setShowDrawerFlowModal(false);
    playPOSSound('cash', isMuted);
    triggerAlert("Trésorerie Modifiée", "Mouvement de tiroir-caisse enregistré avec succès.", "success");
  };

  const handleCloseSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const counted = parseFloat(actualCashCounted);
    if (isNaN(counted) || counted < 0) return;

    const theoretical = getTheoreticalCash();
    const diff = counted - theoretical;

    const newClosed = {
      id: 'z-' + Date.now().toString().slice(-6),
      openingBalance: cashDrawer.openingBalance,
      closingDate: new Date().toISOString(),
      dateOpened: cashDrawer.dateOpened,
      totalSales: salesToday.reduce((sum, s) => sum + s.totalAmount, 0),
      salesCash: cashSalesToday,
      salesCard: cardSalesToday,
      salesAccount: accountSalesToday,
      totalDeposits: cashDrawer.extraTransactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0) + cashSalesToday,
      totalWithdrawals: cashDrawer.extraTransactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0),
      expectedCash: theoretical,
      actualCash: counted,
      difference: diff,
      notes: closingNotes
    };

    setClosedSessions(prev => [newClosed, ...prev]);
    
    // Clear Session values
    setCashDrawer({ isOpen: false, openingBalance: 50, dateOpened: '', extraTransactions: [] });
    setActualCashCounted('');
    setClosingNotes('');
    setShowZReportForm(false);
    
    playPOSSound('cash', isMuted);
    handlePrintZReport(newClosed);
  };

  // Draft standby order holds
  const handleSuspendActiveCart = () => {
    if (cart.length === 0) return;
    setHoldLabel('');
    setShowHoldModal(true);
  };

  const confirmSuspendCart = (e: React.FormEvent) => {
    e.preventDefault();
    const label = holdLabel.trim() || `Client #${suspendedCarts.length + 1}`;
    setSuspendedCarts(prev => [
      ...prev,
      {
        id: 'hold-' + Date.now(),
        name: label,
        cart: [...cart],
        discountType,
        discountValue,
        date: new Date().toISOString()
      }
    ]);
    setCart([]);
    setDiscountType('none');
    setDiscountValue(0);
    setShowHoldModal(false);
    playPOSSound('beep', isMuted);
  };

  const resumeSuspendedCart = (hold: typeof suspendedCarts[0]) => {
    setCart(hold.cart);
    setDiscountType(hold.discountType);
    setDiscountValue(hold.discountValue);
    setSuspendedCarts(prev => prev.filter(s => s.id !== hold.id));
    playPOSSound('beep', isMuted);
  };

  // thermal printing utilities
  const handlePrintReceipt = (sale: BuvetteSale) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      triggerAlert("Popups bloqués", "Activez les popups pour pouvoir imprimer les tickets thermiques.", "warn");
      return;
    }
    const itemsRows = sale.items.map(item => `
      <div style="display: flex; justify-content: space-between; font-family: monospace; font-size: 13px; margin-bottom: 5px;">
        <span style="flex: 2;">${item.itemName}</span>
        <span style="flex: 1; text-align: center;">${item.quantity} x</span>
        <span style="flex: 1; text-align: right;">${item.price.toFixed(3)}</span>
      </div>
    `).join('');

    const htmlContent = `
      <html>
        <head>
          <title>Ticket Pos #${sale.id}</title>
          <style>@media print { body { width: 80mm; margin: 0; padding: 10px; } } body { font-family: monospace; width: 78mm; padding: 10px; margin: auto; }</style>
        </head>
        <body>
          <div style="text-align: center;">
            <h3 style="margin: 0; font-size: 14px;">CAFE / BUVETTE INTERNE</h3>
            <p style="margin: 2px 0; font-size: 11px;">Solution de Facturation Pro</p>
            <p style="margin: 2px 0; font-size: 10px;">Date: ${new Date(sale.date).toLocaleString('fr-FR')}</p>
          </div>
          <div style="border-bottom: 1px dashed black; margin: 8px 0;"></div>
          <div>${itemsRows}</div>
          <div style="border-bottom: 1px dashed black; margin: 8px 0;"></div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
            <span>NET À PAYER:</span>
            <span>${sale.totalAmount.toFixed(3)} DT</span>
          </div>
          <div style="font-size: 11px; margin-top: 4px; text-align: right;">Paiement: ${sale.paymentMethod.toUpperCase()}</div>
          <div style="border-bottom: 1px dashed black; margin: 8px 0;"></div>
          <p style="text-align: center; font-size: 11px; margin: 10px 0 0 0;">Merci pour votre visite !</p>
          <script>window.print();</script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handlePrintZReport = (report: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const htmlContent = `
      <html>
        <head>
          <title>Rapport Z Caisse</title>
          <style>body { font-family: monospace; width: 78mm; padding: 10px; margin: auto; }</style>
        </head>
        <body>
          <div style="text-align: center;">
            <h3 style="margin: 0;">RAPPORT Z DE CLÔTURE</h3>
            <p style="margin: 2px 0 0 0; font-size: 11px;">Rapport de Caisse Session</p>
          </div>
          <div style="border-bottom: 1px dashed black; margin: 10px 0;"></div>
          <p style="margin: 3px 0; font-size: 11px;"><b>Ouvert :</b> ${new Date(report.dateOpened).toLocaleString('fr-FR')}</p>
          <p style="margin: 3px 0; font-size: 11px;"><b>Fermé :</b> ${new Date(report.closingDate).toLocaleString('fr-FR')}</p>
          <div style="border-bottom: 1px dashed black; margin: 10px 0;"></div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;"><span>Ventes Cash:</span><span>${report.salesCash.toFixed(3)} DT</span></div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;"><span>Ventes TPE:</span><span>${report.salesCard.toFixed(3)} DT</span></div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;"><span>Ventes Ardoise:</span><span>${report.salesAccount.toFixed(3)} DT</span></div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin-top: 5px;"><span>TOTAL RECETTES:</span><span>${report.totalSales.toFixed(3)} DT</span></div>
          <div style="border-bottom: 1px dashed black; margin: 10px 0;"></div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;"><span>Fond Initial:</span><span>${report.openingBalance.toFixed(3)} DT</span></div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;"><span>Calculé théorique drawer:</span><span>${report.expectedCash.toFixed(3)} DT</span></div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin-bottom: 4px;"><span>Compté physique:</span><span>${report.actualCash.toFixed(3)} DT</span></div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; color: maroon;"><span>Écart:</span><span>${report.difference.toFixed(3)} DT</span></div>
          <div style="border-bottom: 1px dashed black; margin: 10px 0;"></div>
          <p style="font-size: 11px; margin-top: 15px; text-align: center;">Signature Responsable</p>
          <script>window.print();</script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fPrice = (e.currentTarget as any).elements.price.valueAsNumber;
    const fStock = (e.currentTarget as any).elements.stock.valueAsNumber || 0;
    const fName = (e.currentTarget as any).elements.name.value;
    const fCategory = (e.currentTarget as any).elements.category.value;
    const fSku = (e.currentTarget as any).elements.sku.value;

    if (!fName || isNaN(fPrice) || fPrice === undefined) return;

    if (editingItem) {
      onUpdateItem({
        ...editingItem,
        name: fName,
        sku: fSku || '',
        price: fPrice,
        stock: fStock,
        category: fCategory
      });
      setEditingItem(null);
      setShowAddForm(false);
      triggerAlert("Article Modifié", `L'article ${fName} a été mis à jour avec le prix de ${fPrice.toFixed(3)} DT.`, "success");
    } else {
      onAddItem({
        id: 'item-' + Date.now(),
        name: fName,
        sku: fSku,
        price: fPrice,
        stock: fStock,
        category: fCategory,
        issuerId,
        ownerId: ''
      });
      setShowAddForm(false);
      triggerAlert("Article Ajouté", `L'article ${fName} a été intégré au catalogue.`, "success");
    }
  };

  // Client database helpers
  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name) return;

    onAddClient({
      id: 'client-' + Date.now(),
      name: clientForm.name,
      phone: clientForm.phone,
      email: clientForm.email,
      balance: 0,
      issuerId,
      ownerId: '',
      createdAt: new Date().toISOString()
    });

    setClientForm({ name: '', phone: '', email: '' });
    setShowAddClientForm(false);
    triggerAlert("Débiteur Enregistré", "Le profil a été ajouté. Il est désormais prêt à différer ses factures.", "success");
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !paymentForm.amount || parseFloat(paymentForm.amount) <= 0) return;
    const amt = parseFloat(paymentForm.amount);

    onAddPayment({
      id: 'pay-' + Date.now(),
      clientId: selectedClient.id,
      amount: amt,
      paymentMethod: paymentForm.paymentMethod,
      date: new Date().toISOString(),
      issuerId,
      ownerId: ''
    });

    // Mirror in normal Sales drawer history
    onAddSale({
      id: 'sale-pay-' + Date.now(),
      items: [{
        itemId: 'payment-account',
        itemName: `Règlement d'ardoise: ${selectedClient.name}`,
        quantity: 1,
        price: amt
      }],
      totalAmount: amt,
      paymentMethod: paymentForm.paymentMethod,
      date: new Date().toISOString(),
      issuerId,
      ownerId: ''
    });

    // Local override for fast state reflection
    setSelectedClient({
      ...selectedClient,
      balance: Math.max(0, (selectedClient.balance || 0) - amt)
    });

    setPaymentForm({ amount: '', paymentMethod: 'cash' });
    setShowPaymentForm(false);
    playPOSSound('cash', isMuted);
    triggerAlert("Versement Reçu", `Versement de ${amt.toFixed(3)} DT crédité avec succès pour ${selectedClient.name}.`, "success");
  };

  const getClientHistory = (clientId: string) => {
    const clientSales = filteredSales
      .filter(s => s.clientId === clientId && s.paymentMethod === 'client_account')
      .map(s => ({
        id: s.id,
        date: s.date,
        type: 'purchase' as const,
        description: s.items.map(i => `${i.quantity}x ${i.itemName}`).join(', '),
        amount: s.totalAmount,
        paymentMethod: null
      }));

    const clientPays = payments
      .filter(p => p.clientId === clientId && p.issuerId === issuerId)
      .map(p => ({
        id: p.id,
        date: p.date,
        type: 'payment' as const,
        description: `Règlement ${p.paymentMethod === 'cash' ? 'espèces' : 'carte'}`,
        amount: p.amount,
        paymentMethod: p.paymentMethod
      }));

    return [...clientSales, ...clientPays].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handlePrintStatement = (client: BuvetteClient) => {
    const clientHistory = getClientHistory(client.id);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const tableRows = clientHistory.map(h => `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 8px;">${new Date(h.date).toLocaleDateString('fr-FR')}</td>
        <td style="padding: 8px; font-weight: bold;">${h.type === 'purchase' ? 'ACHAT' : 'VERSEMENT'}</td>
        <td style="padding: 8px;">${h.description}</td>
        <td style="padding: 8px; text-align: right; color: ${h.type === 'purchase' ? 'red' : 'green'}">${h.amount.toFixed(3)} DT</td>
      </tr>
    `).join('');

    const htmlContent = `
      <html>
        <head>
          <title>Date Statement ${client.name}</title>
          <style>body { font-family: Arial, sans-serif; padding: 20px; }</style>
        </head>
        <body>
          <h2>RELEVÉ DE COMPTE BUVETTE</h2>
          <p><b>Client :</b> ${client.name}</p>
          <p><b>Marge restant à payer :</b> ${client.balance.toFixed(3)} DT</p>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f4f4f4;">
                <th style="padding: 8px; text-align: left;">Date</th>
                <th style="padding: 8px; text-align: left;">Type</th>
                <th style="padding: 8px; text-align: left;">Description</th>
                <th style="padding: 8px; text-align: right;">Montant</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="p-1 md:p-1.5 space-y-1.5 md:space-y-2 h-[calc(100vh-60px)] flex flex-col select-none text-gray-900 leading-normal font-sans">
      
      {/* Header Panel */}
      <div className="flex flex-row justify-between items-center gap-2 bg-white py-1.5 px-3 rounded-xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="h-6 w-6 rounded-md bg-indigo-50 hidden sm:flex items-center justify-center text-indigo-600 shrink-0">
            <Coffee size={13} className="animate-pulse" />
          </div>
          <div className="min-w-0 flex items-center gap-1.5">
            <h1 className="text-xs font-black tracking-tight uppercase truncate">Cafétéria</h1>
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cashDrawer.isOpen ? 'bg-emerald-500 animate-ping' : 'bg-rose-400'}`} />
            <p className="text-[9px] text-gray-400 font-medium hidden md:block">({cashDrawer.dateOpened ? new Date(cashDrawer.dateOpened).toLocaleDateString() : 'Inactive'})</p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2">
          {cashDrawer.isOpen && (
            <div className="flex items-center gap-1 bg-indigo-600/5 px-2 py-1 rounded-lg text-indigo-700 text-[8px] md:text-[9.5px] font-bold border border-indigo-100 font-mono">
              <Coins size={10} className="text-indigo-600" />
              <span>Tiroir: {formatCurrency(getTheoreticalCash(), 'DT')}</span>
            </div>
          )}

          <button 
            onClick={toggleMute}
            className={`p-1.5 rounded-lg border transition-all ${isMuted ? 'bg-rose-50 border-rose-200 text-rose-500' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
          >
            {isMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
          </button>

          <div className="bg-gray-50 p-0.5 rounded-lg border border-gray-200 flex gap-0.5">
            <TabButton active={activeTab === 'pos'} onClick={() => { setActiveTab('pos'); playPOSSound('click', isMuted); }} icon={<ShoppingCart size={10} />} label="Caisse" />
            <TabButton active={activeTab === 'accounts'} onClick={() => { setActiveTab('accounts'); playPOSSound('click', isMuted); }} icon={<Users size={10} />} label="Abonnés" />
            <TabButton active={activeTab === 'inventory'} onClick={() => { setActiveTab('inventory'); playPOSSound('click', isMuted); }} icon={<List size={10} />} label="Stocks" />
            <TabButton active={activeTab === 'history'} onClick={() => { setActiveTab('history'); playPOSSound('click', isMuted); }} icon={<History size={10} />} label="Session Z" />
          </div>
        </div>
      </div>

      {/* Main active Tab panel renderizer */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          
          {/* TAP 1: COREL POS */}
          {activeTab === 'pos' && (
            <motion.div 
              key="pos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="flex flex-col lg:grid lg:grid-cols-12 gap-3 md:gap-4 h-full overflow-hidden"
            >
              {/* Mobile POS View Swiper Segmented Tabs */}
              <div className="flex lg:hidden bg-gray-100 p-0.5 rounded-xl gap-0.5 shrink-0 shadow-sm border border-gray-200/50">
                <button
                  onClick={() => { setPosMobileView('catalog'); playPOSSound('click', isMuted); }}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${posMobileView === 'catalog' ? 'bg-indigo-600 text-white shadow-md' : 'bg-transparent text-gray-500 hover:bg-black/5'}`}
                >
                  <ShoppingBag size={12} /> Articles
                </button>
                <button
                  onClick={() => { setPosMobileView('ticket'); playPOSSound('click', isMuted); }}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all relative ${posMobileView === 'ticket' ? 'bg-indigo-600 text-white shadow-md' : 'bg-transparent text-gray-500 hover:bg-black/5'}`}
                >
                  <ShoppingCart size={12} /> Ticket
                  {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black h-4.5 w-4.5 rounded-full flex items-center justify-center animate-bounce border border-white">
                      {cart.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  )}
                </button>
              </div>

              <div className={`${posMobileView === 'ticket' ? 'hidden lg:flex' : 'flex'} lg:col-span-8 flex-col gap-2 md:gap-3 h-full overflow-hidden relative`}>
                
                {/* Suspended Active standing Carts notification strip */}
                {suspendedCarts.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-2xl flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                      <p className="text-[9px] font-black uppercase text-amber-800 tracking-tight shrink-0">Rappels ({suspendedCarts.length}) :</p>
                      <div className="flex gap-1 overflow-x-auto scrollbar-none pr-1">
                        {suspendedCarts.map(hold => (
                          <button 
                            key={hold.id}
                            onClick={() => resumeSuspendedCart(hold)}
                            className="px-2 py-0.5 bg-white text-[9px] font-black text-amber-700 hover:text-white border border-amber-500/20 hover:bg-amber-500 hover:border-transparent rounded-md transition-all flex items-center gap-1 shrink-0 active:scale-95 shadow-sm"
                          >
                            <span>{hold.name}</span>
                            <span className="font-mono text-[8px] bg-amber-100 hover:bg-amber-600 px-1 rounded">
                              {formatCurrency(hold.cart.reduce((s,i) => s + (i.price * i.quantity),0), 'DT')}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub row: Catalog Filter banner */}
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center bg-white p-2 rounded-2xl border border-gray-100 shadow-sm shrink-0">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input 
                      placeholder="Filtre rapide..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                      className="w-full h-8 pl-9 pr-3 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500/15"
                    />
                  </div>
                  <div className="flex gap-1 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
                    {["Tous", ...CATEGORIES].map(cat => (
                      <button 
                        key={cat} onClick={() => { setSelectedCategory(cat); playPOSSound('click', isMuted); }}
                        className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Catalogs & Tactile Keypad split Layout */}
                <div className="flex-1 h-full overflow-hidden">
                  
                  {/* Catalog Column Panel */}
                  <div className={`overflow-y-auto custom-scrollbar h-full ${posMobileView === 'catalog' ? 'block' : 'hidden'} lg:block pr-1 pb-16`}>
                    {filteredItems.length === 0 ? (
                      <div className="h-44 bg-white border border-gray-100 rounded-2xl flex flex-col items-center justify-center text-center p-4 shadow-sm">
                        <ShoppingBag size={24} className="text-gray-300 mb-2" />
                        <h4 className="text-[10px] font-black uppercase text-gray-800">Aucun produit</h4>
                        <p className="text-[9px] text-gray-400 max-w-xs font-medium">Ajoutez-en ou modifiez vos filtres.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                        {filteredItems.map(item => {
                          const cQty = cart.find(c => c.itemId === item.id)?.quantity || 0;
                          return (
                            <button 
                              key={item.id} onClick={() => addToCart(item)}
                              className={`p-2 rounded-xl border text-left flex flex-col justify-between h-[115px] md:h-[125px] relative transition-all group ${item.stock <= 0 ? 'bg-rose-50/10 border-gray-100 opacity-60' : 'bg-white border-gray-100 hover:shadow-xl hover:border-indigo-600'}`}
                            >
                              <div className="flex justify-between items-start w-full">
                                <span className="text-[8px] font-extrabold uppercase bg-indigo-50/50 text-indigo-700 px-1.5 py-0.5 rounded">
                                  {item.category.split(' ')[0]}
                                </span>
                                {cQty > 0 && <span className="h-5 w-5 rounded-full bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center shrink-0">{cQty}</span>}
                              </div>
                              <div className="my-0.5">
                                <p className="text-[10px] md:text-xs font-black text-gray-800 uppercase line-clamp-2 leading-tight md:leading-snug">{item.name}</p>
                                <p className="text-[7.5px] font-mono text-gray-400 font-bold hidden xl:block">REF: {item.sku || 'N/A'}</p>
                              </div>
                              <div className="flex justify-between items-end w-full border-t border-gray-50 pt-1 shrink-0">
                                <p className="text-[11px] font-black text-indigo-600 font-mono leading-none">{formatCurrency(item.price, 'DT')}</p>
                                <span className={`text-[7.5px] font-extrabold tracking-tight px-1 py-0.5 rounded ${item.stock <= 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-800'}`}>
                                  {item.stock <= 0 ? 'RUPTURE' : `STK: ${item.stock}`}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                {/* Floating bottom action drawer pill for mobile */}
                {cart.length > 0 && posMobileView !== 'ticket' && (
                  <div className="absolute bottom-4 left-4 right-4 z-40 lg:hidden">
                    <button 
                      onClick={() => { setPosMobileView('ticket'); playPOSSound('click', isMuted); }}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-between shadow-xl shadow-indigo-600/30 active:scale-95 transition-all text-left"
                    >
                      <span className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-white text-indigo-600 font-extrabold text-[10px] flex items-center justify-center font-mono">
                          {cart.reduce((s, i) => s + i.quantity, 0)}
                        </span>
                        <span>Voir le Ticket</span>
                      </span>
                      <span className="font-mono text-sm tracking-tight flex items-center gap-1">
                        {formatCurrency(cartTotal, 'DT')} <ChevronRight size={16} />
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Sidebar Active ticket panel */}
              <div className={`${posMobileView === 'ticket' ? 'flex' : 'hidden'} lg:flex lg:col-span-4 bg-gray-900 text-white rounded-[2.5rem] flex-col h-full overflow-hidden shadow-2xl relative border border-gray-800`}>
                <div className="p-5 border-b border-gray-800 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={15} className="text-indigo-400" />
                    <span className="text-white text-xs font-black uppercase tracking-wider">Ticket Client</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {cart.length > 0 && (
                      <button 
                        onClick={handleSuspendActiveCart}
                        title="Mettre en attente"
                        className="px-2 py-1 bg-white/5 hover:bg-white/15 text-amber-500 rounded-lg text-[9px] font-black uppercase active:scale-95 transition-all flex items-center gap-1"
                      >
                        ⏸ Suspendre
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        if (cart.length > 0) {
                          triggerConfirm("Vider le Panier", "Êtes-vous sûr de vouloir supprimer tous les articles ?", () => {
                            setCart([]);
                            triggerAlert("Panier Vidé", "Le panier d'achat a été vidé.", "success");
                          });
                        }
                      }}
                      className="text-[9.5px] font-black text-gray-400 hover:text-rose-400 uppercase tracking-widest transition-all"
                    >
                      Vider
                    </button>
                  </div>
                </div>

                {/* Sidebar Active Cart list */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-3">
                  <AnimatePresence>
                    {cart.map(item => {
                      const itemInv = items.find(i => i.id === item.itemId);
                      const maxStk = itemInv ? itemInv.stock : 999;
                      return (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: -10 }}
                          key={item.itemId} className="bg-white/5 p-3.5 rounded-2xl flex justify-between items-center gap-2 border border-white/5 group"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-black text-white uppercase truncate">{item.name}</p>
                            <span className="text-[9px] text-gray-400 font-mono tracking-tight">{formatCurrency(item.price, 'DT')} l'unité</span>
                          </div>

                          <div className="flex items-center gap-2.5 bg-black/50 p-1 rounded-xl shrink-0">
                            <button 
                              onClick={() => decrementCart(item.itemId)}
                              className="h-5.5 w-5.5 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-90"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="text-xs font-black min-w-[12px] text-center font-mono">{item.quantity}</span>
                            <button 
                              onClick={() => {
                                if (item.quantity >= maxStk) {
                                  triggerAlert("Limite Stock", `Impossible d'ajouter plus, seulement ${maxStk} unités sont disponibles.`, "warn");
                                  return;
                                }
                                addToCart({ id: item.itemId, stock: maxStk } as any, 1);
                              }}
                              className="h-5.5 w-5.5 rounded-lg bg-indigo-600/30 text-indigo-400 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-all active:scale-90"
                            >
                              <Plus size={10} />
                            </button>
                          </div>

                          <div className="text-right shrink-0 min-w-[65px] flex flex-col items-end">
                            <p className="text-[11px] font-black font-mono">{formatCurrency(item.price * item.quantity, 'DT')}</p>
                            <button 
                              onClick={() => removeFromCart(item.itemId)}
                              className="text-[8px] font-black uppercase text-rose-500 hover:underline mt-0.5 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              Retirer
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {cart.length === 0 && (
                    <div className="h-64 flex flex-col items-center justify-center text-center py-12 opacity-35 px-4">
                      <ShoppingBag size={42} className="text-white mb-3" />
                      <p className="text-xs font-black uppercase tracking-wider text-white">Aucun Produit sélectionné</p>
                      <p className="text-[10px] text-gray-400 italic mt-1 max-w-[180px]">Sélectionnez des articles à gauche ou tapez un montant tactile.</p>
                    </div>
                  )}
                </div>

                {/* Subtotals & Checkouts buttons pane */}
                <div className="p-5 bg-white/[0.01] border-t border-gray-800 space-y-3.5 shrink-0 select-none">
                  <div className="space-y-2 text-xs text-gray-400 font-semibold tracking-tight border-b border-gray-800/65 pb-3">
                    <div className="flex justify-between items-center text-[10px]">
                      <span>SOUS-TOTAL COMPTOIR</span>
                      <span className="font-mono">{formatCurrency(cartSubtotal, 'DT')}</span>
                    </div>

                    <div className="flex justify-between items-center text-[10px]">
                      <span className="flex items-center gap-1 uppercase tracking-wider text-amber-500"><Percent size={11} /> Remise appliquée</span>
                      <div className="flex gap-1.5 items-center">
                        {discountType === 'none' ? (
                          <div className="flex gap-1">
                            <button onClick={() => { setDiscountType('percent'); setDiscountValue(5); playPOSSound('click', isMuted); }} className="px-1.5 py-0.5 bg-white/5 rounded text-[9px] hover:bg-white/10">-5%</button>
                            <button onClick={() => { setDiscountType('percent'); setDiscountValue(10); playPOSSound('click', isMuted); }} className="px-1.5 py-0.5 bg-white/5 rounded text-[9px] hover:bg-white/10">-10%</button>
                            <button onClick={() => { setDiscountType('fixed'); setDiscountValue(1); playPOSSound('click', isMuted); }} className="px-1.5 py-0.5 bg-white/5 rounded text-[9px] hover:bg-white/10">-1DT</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-lg text-[9.5px] font-black">
                            <span>{discountType === 'percent' ? `-${discountValue}%` : `-${discountValue.toFixed(3)} DT`} ({discountAmount.toFixed(3)} DT)</span>
                            <button onClick={() => { setDiscountType('none'); setDiscountValue(0); }} className="text-amber-300 font-extrabold hover:text-white"><X size={10} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Grand Net Total */}
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Net Caisse</p>
                      <p className="text-[9px] text-[#1A56DB] font-extrabold uppercase tracking-wide">TTC & Remises Incluses</p>
                    </div>
                    <p className="text-2xl font-black font-mono tracking-tight leading-none text-white">{formatCurrency(cartTotal, 'DT')}</p>
                  </div>

                  {/* Fast Action Pay grids */}
                  <div className="w-full pt-1 font-sans">
                    <button 
                      onClick={() => {
                        if (cart.length === 0) return;
                        setCashGiven('');
                        setShowChangeCalcModal(true);
                      }}
                      disabled={cart.length === 0}
                      className="w-full py-3 px-1 border border-emerald-500/20 bg-emerald-500/10 rounded-xl text-emerald-400 hover:bg-emerald-500 hover:text-white active:scale-95 hover:border-transparent transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-30 disabled:pointer-events-none shadow-sm"
                    >
                      <Banknote size={15} /> Espèces (Cash)
                    </button>
                  </div>

                  <button 
                    onClick={() => {
                      if (cart.length === 0) return;
                      setShowClientCheckoutModal(true);
                    }}
                    disabled={cart.length === 0}
                    className="w-full py-2.5 mt-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-black active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 disabled:opacity-30"
                  >
                    <Users size={12} /> Compte Client (Imputer Ardoise)
                  </button>

                  {/* Tiny trigger for mobile tactile Keys toggle */}
                  <button 
                    onClick={() => {
                      setPosMobileView('catalog');
                      playPOSSound('click', isMuted);
                    }}
                    className="w-full md:hidden py-2 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-1 text-gray-300"
                  >
                    🛒 Retour au Catalogue
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: CLIENT ACCOUNTS (DÉBITEURS) */}
          {activeTab === 'accounts' && (
            <motion.div 
              key="accounts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden"
            >
              {/* Left Column Abonnés registry list */}
              <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">
                <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Créances Globales Buvette</p>
                  <div className="flex justify-between items-end">
                    <p className="text-xl font-black font-mono text-rose-600">{formatCurrency(totalAccountsReceivable, 'DT')}</p>
                    <button 
                      onClick={() => setShowAddClientForm(true)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1"
                    >
                      <Plus size={11} /> Nouvel Abonné
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input 
                    placeholder="Chercher par nom..." value={searchClientQuery} onChange={e => setSearchClientQuery(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 bg-white border border-gray-100 shadow-sm rounded-xl text-xs font-bold outline-none"
                  />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2.5 pb-20">
                  {filteredClients.map(cli => (
                    <button 
                      key={cli.id} onClick={() => { setSelectedClient(cli); playPOSSound('click', isMuted); }}
                      className={`w-full p-4 rounded-2xl border transition-all text-left flex justify-between items-center ${selectedClient?.id === cli.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-800 hover:border-indigo-600'}`}
                    >
                      <div>
                        <p className="text-xs font-black uppercase tracking-tight">{cli.name}</p>
                        <p className={`text-[9px] font-medium font-mono ${selectedClient?.id === cli.id ? 'text-white/60' : 'text-gray-400'}`}>{cli.phone || 'Pas de numéro'}</p>
                      </div>
                      <div className="text-right font-mono">
                        <p className="text-xs font-black">{formatCurrency(cli.balance || 0, 'DT')}</p>
                        <p className={`text-[8px] font-bold ${selectedClient?.id === cli.id ? 'text-white/60' : 'text-gray-400'}`}>SOLDE COMPTE</p>
                      </div>
                    </button>
                  ))}
                  {filteredClients.length === 0 && (
                    <div className="py-12 text-center text-gray-300 border border-dashed border-gray-200 rounded-[2rem] bg-white opacity-60">
                      <Users size={24} className="mx-auto mb-1.5" />
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Aucun profil enregistré</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column Abonnés statement ledger */}
              <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
                {selectedClient ? (
                  <div className="bg-white rounded-[2.5rem] border border-gray-100 flex-1 flex flex-col overflow-hidden shadow-sm">
                    <div className="p-7 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
                      <div>
                        <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded uppercase tracking-wide">Registre Ardoise</span>
                        <h3 className="text-base font-black text-gray-800 uppercase leading-snug mt-1">{selectedClient.name}</h3>
                        <p className="text-[10px] text-gray-400 font-semibold mt-1">Saisie: Tél: {selectedClient.phone || 'Non configuré'} • Email: {selectedClient.email || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Solde Restant Dû</p>
                        <p className="text-2xl font-black font-mono text-rose-600">{formatCurrency(selectedClient.balance || 0, 'DT')}</p>
                      </div>
                    </div>

                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/35 flex flex-wrap gap-2.5">
                      <button 
                        onClick={() => setShowPaymentForm(true)} disabled={!(selectedClient.balance > 0)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-45 transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Banknote size={13} /> Enregistrer Règlement
                      </button>
                      <button 
                        onClick={() => handlePrintStatement(selectedClient)}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:border-gray-800 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                      >
                        <Printer size={13} /> Imprimer Relevé
                      </button>
                      <button 
                        onClick={() => {
                          triggerConfirm("Supprimer le Débiteur", `Voulez-vous supprimer le compte de ${selectedClient.name} ? Cette action est irréversible.`, () => {
                            onDeleteClient(selectedClient.id);
                            setSelectedClient(null);
                            triggerAlert("Abonné Supprimé", "Le compte différé a été radié de la base.", "success");
                          });
                        }}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1 ml-auto"
                      >
                        <Trash2 size={13} /> Radier
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3.5 pb-20">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2.5">Chronologie des Transactions</p>
                      {getClientHistory(selectedClient.id).map(log => (
                        <div key={log.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${log.type === 'purchase' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              {log.type === 'purchase' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-800 uppercase">{log.type === 'purchase' ? 'Achat Articles (Débit)' : 'Encaissement Reçu (Crédit)'}</p>
                              <p className="text-[10px] text-gray-400 font-semibold line-clamp-1">{log.description}</p>
                              <span className="text-[9px] font-mono text-gray-400 block mt-0.5">{new Date(log.date).toLocaleString('fr-FR')}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-xs font-mono font-black ${log.type === 'purchase' ? 'text-rose-600' : 'text-emerald-700'}`}>
                              {log.type === 'purchase' ? '+' : '-'}{log.amount.toFixed(3)}
                            </p>
                          </div>
                        </div>
                      ))}
                      {getClientHistory(selectedClient.id).length === 0 && (
                        <p className="text-center py-10 text-[10px] font-black uppercase tracking-wider text-gray-400">Aucun historique d'achat.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 border-2 border-dashed border-gray-100 bg-white rounded-[2.5rem] flex flex-col items-center justify-center p-8 opacity-65 text-center shadow-sm">
                    <Users size={36} className="text-gray-300 mb-2" />
                    <h4 className="text-xs font-black uppercase text-gray-800">Aucun Abonné sélectionné</h4>
                    <p className="text-[10px] text-gray-400 max-w-sm mt-1">Sélectionnez un profil débiteur à gauche pour gérer sa dette, saisir ses règlements, et imprimer ses relevés thermiques.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: STOCK & ARTICLES CATALOG */}
          {activeTab === 'inventory' && (
            <motion.div 
              key="inventory" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-6 h-full overflow-y-auto pb-20 scrollbar-none"
            >
              <div className="bg-white p-5 rounded-[2rem] border border-gray-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 flex-1">
                  <div>
                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Références Produits</label>
                    <p className="text-xl font-bold font-mono text-gray-800">{items.length}</p>
                  </div>
                  <div>
                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Valeur Net Buvette</label>
                    <p className="text-xl font-bold font-mono text-indigo-600">{formatCurrency(items.reduce((s,i) => s + (i.price * i.stock), 0), 'DT')}</p>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Articles Stock Bas</label>
                    <p className="text-xl font-bold font-mono text-rose-600">{items.filter(i => i.stock < 5).length}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-gray-150 pt-4 md:pt-0 md:pl-6 shrink-0">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={showLowStockOnly} onChange={e => setShowLowStockOnly(e.target.checked)} className="rounded h-4 w-4 border-gray-300 text-indigo-600" />
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">Restreindre stock bas</span>
                  </label>
                  <button 
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <Plus size={12} /> Ajouter Article
                  </button>
                </div>
              </div>

              {/* Inventory Table Container */}
              <div className="bg-white rounded-[2rem] border border-gray-105 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-black uppercase tracking-widest text-[9px]">
                        <th className="px-6 py-4.5">Articles / SKU</th>
                        <th className="px-6 py-4.5 text-center">Catégorie</th>
                        <th className="px-6 py-4.5 text-right font-mono">Prix Unitaire</th>
                        <th className="px-6 py-4.5 text-center">Niveau de Stock</th>
                        <th className="px-6 py-4.5 text-center">Commandes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 font-medium">
                      {items
                        .filter(i => i.issuerId === issuerId)
                        .filter(i => !showLowStockOnly || i.stock < 5)
                        .map(item => (
                          <tr key={item.id} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4">
                              <p className="font-extrabold text-gray-800 uppercase">{item.name}</p>
                              <span className="text-[9px] font-mono text-gray-400">SKU: {item.sku || 'N/A'}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg">{item.category}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1 select-none">
                                <input
                                  type="number"
                                  step="0.05"
                                  defaultValue={item.price}
                                  key={item.id + '-price-' + item.price}
                                  onBlur={(e) => {
                                    const newPrice = parseFloat(e.target.value);
                                    if (!isNaN(newPrice) && newPrice !== item.price && newPrice >= 0) {
                                      onUpdateItem({ ...item, price: newPrice });
                                      triggerAlert("Prix Actualisé", `${item.name} est maintenant à ${newPrice.toFixed(3)} DT`, "success");
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  className="w-20 px-1.5 py-1 text-right font-mono font-black bg-gray-50 border border-gray-150 rounded-lg text-gray-800 text-[11px] focus:ring-1 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                                />
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider">DT</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2 font-mono mt-0.5">
                                <button onClick={() => onUpdateItem({...item, stock: Math.max(0, item.stock - 1)})} className="h-6 w-6 bg-gray-100 text-gray-600 rounded flex items-center justify-center font-bold font-mono hover:bg-gray-200 shadow-xs">-</button>
                                <span className={`w-12 text-center text-xs font-black inline-block p-1 rounded ${item.stock <= 0 ? 'bg-rose-50 text-rose-600' : item.stock < 5 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-800'}`}>{item.stock}</span>
                                <button onClick={() => onUpdateItem({...item, stock: item.stock + 1})} className="h-6 w-6 bg-gray-100 text-gray-600 rounded flex items-center justify-center font-bold font-mono hover:bg-gray-200 shadow-xs">+</button>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button 
                                  onClick={() => {
                                    setEditingItem(item);
                                    setShowAddForm(true);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                  title="Modifier les détails de l'article"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button 
                                  onClick={() => {
                                    triggerConfirm("Supprimer l'Article", `Supprimer définitivement l'article client ${item.name} ?`, () => {
                                      onDeleteItem(item.id);
                                      triggerAlert("Article Radié", `${item.name} a été retiré du catalogue.`, "success");
                                    });
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Supprimer l'article"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: SESSION Z / CRON LOGS */}
          {activeTab === 'history' && (
            <motion.div 
              key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-5 h-full overflow-y-auto pb-20 scrollbar-none"
            >
              
              {/* Daily Sales statistics metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-gray-900 text-white rounded-3xl p-5 shadow-lg border border-gray-800">
                  <p className="text-[9px] font-black uppercase text-gray-400">Total Ventes Aujourd'hui</p>
                  <p className="text-2xl font-black font-mono tracking-tight text-white mt-1">{formatCurrency(totalSalesToday, 'DT')}</p>
                  <span className="text-[9.5px] font-semibold text-indigo-400 block mt-1">{salesToday.length} transactions au total</span>
                </div>
                <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
                  <p className="text-[9px] font-black uppercase text-gray-400">Encaissements Cash (Drawer)</p>
                  <p className="text-xl font-black font-mono text-emerald-600 mt-1">{formatCurrency(cashSalesToday, 'DT')}</p>
                  <p className="text-[9px] text-gray-400 font-bold mt-1">+ Versements de dettes : {formatCurrency(totalPaymentsReceivedToday, 'DT')}</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
                  <p className="text-[9px] font-black uppercase text-gray-400">Ardoises Différées</p>
                  <p className="text-xl font-black font-mono text-amber-600 mt-1">{formatCurrency(accountSalesToday, 'DT')}</p>
                  <span className="text-[9px] text-amber-700 font-bold uppercase block mt-1">Dettes en cours</span>
                </div>
              </div>

              {/* Dynamic shift operator drawer controls */}
              <div className="bg-white rounded-[2rem] border border-gray-100 p-6 flex flex-col md:flex-row justify-between gap-4 shadow-sm items-center">
                <div>
                  <h4 className="text-sm font-black text-gray-800 uppercase flex items-center gap-1.5">
                    <Coins className="text-amber-500" size={16} /> Session de caisse active
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-0.5 font-medium leading-none">
                    {cashDrawer.isOpen 
                      ? `Ouverte le ${new Date(cashDrawer.dateOpened).toLocaleString('fr-FR')} | Fond de tiroir : ${cashDrawer.openingBalance.toFixed(3)} DT` 
                      : 'Aucune session active. Démarrez ci-dessous pour valider les ventes.'}
                  </p>
                </div>
                
                {cashDrawer.isOpen ? (
                  <div className="flex gap-2.5">
                    <button 
                      onClick={() => { setDrawerFlowType('in'); setShowDrawerFlowModal(true); }}
                      className="px-4 py-2 border border-emerald-500/10 hover:border-emerald-500 bg-emerald-50 text-emerald-800 rounded-xl text-[10px] font-black uppercase"
                    >
                      + Injection cash
                    </button>
                    <button 
                      onClick={() => { setDrawerFlowType('out'); setShowDrawerFlowModal(true); }}
                      className="px-4 py-2 border border-rose-500/10 hover:border-rose-500 bg-rose-50 text-rose-800 rounded-xl text-[10px] font-black uppercase"
                    >
                      - Retrait cash
                    </button>
                    <button 
                      onClick={() => { setActualCashCounted(''); setClosingNotes(''); setShowZReportForm(true); }}
                      className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-indigo-600/15"
                    >
                      🔒 Clôturer l'ardoise (Rapport Z)
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider block">CLÔTURÉE</span>
                    <button 
                      onClick={() => handleOpenSession(50.000)}
                      className="px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-black uppercase rounded-xl shadow-md transition-all active:scale-95"
                    >
                      🔑 Démarrer Nouvelle Session
                    </button>
                  </div>
                )}
              </div>

              {/* Historical Z closures records */}
              <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-tight text-gray-800">Archives des Clôtures Z de Caisse</h4>
                  <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest font-mono">Bilan financier locaux</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-medium">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-[9px] text-gray-400 uppercase font-black tracking-widest">
                        <th className="px-6 py-4">ID / Date Fermeture</th>
                        <th className="px-6 py-4">Heure Ouverture</th>
                        <th className="px-6 py-4 text-right">Recettes Total</th>
                        <th className="px-6 py-4 text-right font-mono">Espèces Attendus</th>
                        <th className="px-6 py-4 text-right font-mono">Espèces Réels</th>
                        <th className="px-6 py-4 text-center">Écart Caisse</th>
                        <th className="px-6 py-4 text-center">Ticket</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {closedSessions.map(report => (
                        <tr key={report.id} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4">
                            <span className="font-extrabold text-gray-800 uppercase">Z-RPT #{report.id}</span>
                            <span className="text-[10px] text-gray-400 block">{new Date(report.closingDate).toLocaleDateString('fr-FR')}</span>
                          </td>
                          <td className="px-6 py-4 font-mono text-gray-400">{new Date(report.dateOpened).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                          <td className="px-6 py-4 text-right font-mono text-gray-800">{report.totalSales.toFixed(3)} DT</td>
                          <td className="px-6 py-4 text-right font-mono font-medium text-gray-500">{report.expectedCash.toFixed(3)} DT</td>
                          <td className="px-6 py-4 text-right font-mono font-black text-gray-800">{report.actualCash.toFixed(3)} DT</td>
                          <td className={`px-6 py-4 text-center font-bold font-mono ${report.difference >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {report.difference >= 0 ? '+' : ''}{report.difference.toFixed(3)} DT
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => handlePrintZReport(report)}
                              className="p-1 px-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-[9px] font-black uppercase text-gray-600 border border-gray-200"
                            >
                              Ré-imprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                      {closedSessions.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-16 text-[10px] font-black uppercase tracking-widest text-gray-400">Aucun rapport Z archivé localement.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* OVERLAY SCREENS MODALS GRID (AnimatePresence dynamic sheets) */}
      <AnimatePresence>
        
        {/* LA CAISSE FERMÉE GATED SCREEN (glassmorphism blockade for security) */}
        {!cashDrawer.isOpen && activeTab === 'pos' && (
          <div className="absolute inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm rounded-[2.5rem]">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-md w-full bg-white rounded-[2.5rem] p-8 border border-gray-200 shadow-2xl text-center space-y-6"
            >
              <div className="h-16 w-16 bg-rose-50 border border-rose-100 text-rose-500 rounded-3xl flex items-center justify-center mx-auto shadow-sm animate-bounce">
                <LogOut size={26} className="rotate-270" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-800 uppercase tracking-tight">Caisse Enregistreuse Verrouillée</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto font-medium leading-relaxed">
                  Aucune session de caisse n'est active. Veuillez déclarer le fonds de caisse (monnaie à disposition dans le tiroir) pour activer le clavier tactile et démarrer les ventes.
                </p>
              </div>

              {/* Quick default presets */}
              <div className="grid grid-cols-3 gap-2">
                {[30.000, 50.000, 100.000].map(val => (
                  <button 
                    key={val} onClick={() => handleOpenSession(val)}
                    className="p-3 bg-gray-50 border border-gray-150 rounded-2xl hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-800 font-mono text-xs font-black transition-all active:scale-95 shadow-sm"
                  >
                    {val.toFixed(3)} DT
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => handleOpenSession(0.000)}
                  className="flex-1 py-3 px-4 bg-gray-50 text-gray-600 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-gray-150 transition-all border border-gray-200"
                >
                  Sans fonds (0.000 DT)
                </button>
                <button 
                  onClick={() => handleOpenSession(50.000)}
                  className="flex-1 py-3 px-4 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-md"
                >
                  Ouvrir caisse par défaut
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* CASH CALCULATOR CHANGE MODAL SHEET */}
        {showChangeCalcModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-gray-950/45 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-sm w-full bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                <h3 className="text-xs font-black uppercase text-gray-800 tracking-wider flex items-center gap-1.5">
                  <Coins size={15} className="text-emerald-500 animate-pulse" /> Rendu de Monnaie
                </h3>
                <button onClick={() => setShowChangeCalcModal(false)} className="text-gray-400 hover:text-gray-900"><X size={18} /></button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div>
                    <span className="text-[8.5px] font-black text-gray-400 uppercase tracking-widest block leading-none mb-1">Montant Exigé</span>
                    <span className="text-xs font-semibold text-gray-500">Net de vente</span>
                  </div>
                  <span className="text-xl font-bold font-mono text-gray-900">{formatCurrency(cartTotal, 'DT')}</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 20, 50].map(bill => (
                    <button 
                      key={bill} onClick={() => { setCashGiven(bill.toString()); playPOSSound('click', isMuted); }}
                      className="py-2 bg-gray-50 hover:bg-emerald-50 border border-gray-100 hover:border-emerald-300 text-center font-mono text-xs font-black rounded-xl text-gray-800 hover:text-emerald-800 transition-all active:scale-95"
                    >
                      {bill} DT
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-widest block text-gray-400">Montant donné par le client (DT)</label>
                  <input 
                    type="number" step="0.1" value={cashGiven} onChange={e => setCashGiven(e.target.value)} placeholder="0.000 DT"
                    className="w-full h-11 px-4 rounded-xl bg-gray-50 border border-gray-150 font-black text-sm outline-none focus:ring-2 focus:ring-emerald-500/10 placeholder-gray-300"
                  />
                </div>

                {cashGiven && parseFloat(cashGiven) >= cartTotal && (
                  <div className="p-4 bg-emerald-50/50 border border-emerald-100 text-center rounded-2xl">
                    <span className="text-[8.5px] font-black text-emerald-700 uppercase tracking-wider block mb-0.5">Monnaie à rendre :</span>
                    <span className="text-2xl font-bold font-mono text-emerald-600">{(parseFloat(cashGiven) - cartTotal).toFixed(3)} DT</span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button 
                    onClick={() => setShowChangeCalcModal(false)}
                    className="flex-1 py-3 bg-gray-50 text-gray-600 font-extrabold text-[10px] uppercase rounded-xl hover:bg-gray-100"
                  >
                    Retour
                  </button>
                  <button 
                    onClick={() => {
                      handleCheckout('cash');
                      setShowChangeCalcModal(false);
                    }}
                    disabled={cashGiven !== '' && parseFloat(cashGiven) < cartTotal}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase rounded-xl shadow-md disabled:opacity-40"
                  >
                    Valider Especes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* BRUTALIST PRINTING TICKET SCREEN PREVIEW */}
        {selectedSaleForReceipt && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-gray-950/45 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-sm w-full bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50">
                <span className="text-xs font-black uppercase text-gray-800 flex items-center gap-1"><FileText size={14} /> Aperçu Ticket</span>
                <button onClick={() => setSelectedSaleForReceipt(null)} className="text-gray-400 hover:text-gray-900"><X size={18} /></button>
              </div>

              <div className="p-6 space-y-4 max-h-[350px] overflow-y-auto bg-gray-100/35">
                <div className="bg-white p-5 border border-gray-150 rounded-2xl font-mono text-stone-700 shadow-inner text-xs space-y-2.5">
                  <div className="text-center font-bold">
                    <h5 className="text-sm font-black uppercase text-stone-900 mb-0.5">BUVETTE INTERNE</h5>
                    <span>Réf Caisse #{selectedSaleForReceipt.id.slice(-6)}</span>
                  </div>
                  <div className="border-b border-dashed border-stone-300"></div>
                  
                  <div className="space-y-1">
                    {selectedSaleForReceipt.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px]">
                        <span>{it.quantity}x {it.itemName}</span>
                        <span>{(it.price * it.quantity).toFixed(3)} DT</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-b border-dashed border-stone-300"></div>
                  <div className="flex justify-between font-black text-stone-900">
                    <span>TOTAL PAYÉ:</span>
                    <span>{selectedSaleForReceipt.totalAmount.toFixed(3)} DT</span>
                  </div>
                  <p className="text-center text-[10px] text-stone-400 pt-1 font-sans">{new Date(selectedSaleForReceipt.date).toLocaleString('fr-FR')}</p>
                </div>
              </div>

              <div className="p-5 border-t border-gray-50 bg-white flex gap-2">
                <button onClick={() => setSelectedSaleForReceipt(null)} className="flex-1 py-3 bg-gray-50 text-gray-600 text-[10px] uppercase font-bold rounded-xl">Fermer</button>
                <button 
                  onClick={() => handlePrintReceipt(selectedSaleForReceipt)}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] uppercase font-black rounded-xl shadow-lg flex items-center justify-center gap-1.5"
                >
                  <Printer size={13} /> Imprimer Ticket
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* SUSPEND STANDBY LABEL PROMPT MODAL */}
        {showHoldModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-gray-950/45 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-xs w-full bg-white rounded-[2rem] p-6 border border-gray-100 shadow-2xl"
            >
              <h4 className="text-xs font-black uppercase text-gray-800 tracking-wider mb-2">Suspendre le ticket</h4>
              <p className="text-[10px] text-gray-400 font-semibold mb-4 leading-relaxed">Indiquez un libellé ou nom de table pour identifier le client en cours plus tard.</p>
              <form onSubmit={confirmSuspendCart} className="space-y-4">
                <input 
                  type="text" autoFocus required value={holdLabel} onChange={e => setHoldLabel(e.target.value)} placeholder="Ex: Table 4, Hassene..."
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-150 rounded-xl text-xs font-bold outline-none"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowHoldModal(false)} className="flex-1 py-2.5 bg-gray-50 text-gray-600 text-[10px] uppercase font-bold rounded-xl">Annuler</button>
                  <button type="submit" className="flex-1 py-2.5 bg-amber-500 text-black font-black text-[10px] uppercase rounded-xl">Suspendre</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* CASH DRAW INFLOW / OUTFLOW EXTRA TRANSACTION MODAL */}
        {showDrawerFlowModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-gray-950/45 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-xs w-full bg-white rounded-[2rem] p-6 border border-gray-100 shadow-2xl"
            >
              <h4 className="text-xs font-black uppercase text-gray-800 tracking-wider mb-1">
                {drawerFlowType === 'in' ? '🔥 Injection de Trésorerie' : '💸 Décaissement Tiroir'}
              </h4>
              <p className="text-[10.5px] text-gray-400 font-semibold mb-4 leading-relaxed">Ajout ou retrait de cash extra du coffre-fort buvette.</p>
              <form onSubmit={submitDrawerFlow} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-gray-400 block">Montant (DT)</label>
                  <input 
                    type="number" step="0.1" required value={drawerFlowForm.amount} onChange={e => setDrawerFlowForm({...drawerFlowForm, amount: e.target.value})} placeholder="0.000 DT"
                    className="w-full h-10 px-3 bg-gray-50 border border-gray-150 rounded-xl font-bold text-sm outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-gray-400 block">Motif / Notes</label>
                  <input 
                    type="text" required value={drawerFlowForm.notes} onChange={e => setDrawerFlowForm({...drawerFlowForm, notes: e.target.value})} placeholder="Ex: Panier de lait, Approvisionnement monnaie..."
                    className="w-full h-10 px-3 bg-gray-50 border border-gray-150 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowDrawerFlowModal(false)} className="flex-1 py-2.5 bg-gray-50 text-gray-600 text-[10px] uppercase font-bold rounded-xl">Annuler</button>
                  <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white font-black text-[10px] uppercase rounded-xl">Confirmer</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* CASH RECONCILIATION CLOSURE RAPPORT Z MODAL */}
        {showZReportForm && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-gray-950/45 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-sm w-full bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-50 bg-gray-50">
                <h3 className="text-xs font-black uppercase text-stone-900 tracking-wider">🔒 Clôture de Caisse & Rapport Z</h3>
                <p className="text-[10px] text-gray-400 font-semibold">Réconciliation du solde tiroir-caisse</p>
              </div>
              <form onSubmit={handleCloseSessionSubmit} className="p-6 space-y-4">
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div>
                    <span className="text-[8px] font-black text-gray-400 uppercase">Théorique calculé (Espèces)</span>
                    <p className="text-[9.5px] text-gray-400 leading-none">Ventes & Mouvements</p>
                  </div>
                  <span className="text-base font-black font-mono text-indigo-600">{getTheoreticalCash().toFixed(3)} DT</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[8.5px] font-black uppercase text-gray-400">Montant Espèces Physiquement Compté (DT)</label>
                  <input 
                    type="number" step="0.050" required value={actualCashCounted} onChange={e => setActualCashCounted(e.target.value)} placeholder="0.000 DT"
                    className="w-full h-11 px-4 bg-gray-50 border border-gray-150 font-black text-sm rounded-xl outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8.5px] font-black uppercase text-gray-400">Observations de cloture</label>
                  <input 
                    type="text" value={closingNotes} onChange={e => setClosingNotes(e.target.value)} placeholder="Ex: Caisse équilibrée, Écart de 0.500 DT dû au change..."
                    className="w-full h-10 px-4 bg-gray-50 border border-gray-155 text-xs font-bold rounded-xl outline-none"
                  />
                </div>

                {actualCashCounted && !isNaN(parseFloat(actualCashCounted)) && (
                  <div className={`p-3 text-center rounded-xl font-bold font-mono text-xs ${parseFloat(actualCashCounted) - getTheoreticalCash() >= 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50/70 text-red-700'}`}>
                    Écart de Caisse : {(parseFloat(actualCashCounted) - getTheoreticalCash()).toFixed(3)} DT
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowZReportForm(false)} className="flex-1 py-3 bg-gray-50 text-gray-600 text-[10px] uppercase font-bold rounded-xl">Abandonner</button>
                  <button type="submit" className="flex-1 py-3 bg-stone-900 hover:bg-stone-850 text-white text-[10px] uppercase font-black rounded-xl shadow-md">Fermer Session Z</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* DEBITEUR / CLIENT CHECKOUT ASSIGNER MODAL */}
        {showClientCheckoutModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-gray-950/45 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-sm w-full bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                <span className="text-xs font-black uppercase text-gray-800">Imputer l'ardoise sur Compte</span>
                <button onClick={() => setShowClientCheckoutModal(false)} className="text-gray-400 hover:text-gray-900"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input 
                    placeholder="Chercher l'abonné..." value={searchClientQuery} onChange={e => setSearchClientQuery(e.target.value)}
                    className="w-full h-10 pl-9 pr-4 bg-gray-50 border border-gray-150 rounded-xl text-xs font-bold outline-none font-sans"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                  {filteredClients.map(cli => (
                    <button 
                      key={cli.id} onClick={() => handleCheckout('client_account', cli.id)}
                      className="w-full p-3.5 rounded-2xl border border-gray-100 hover:border-indigo-600 hover:bg-indigo-50/20 text-left flex justify-between items-center transition-all group"
                    >
                      <div>
                        <p className="text-xs font-black uppercase text-gray-800">{cli.name}</p>
                        <span className="text-[9.5px] font-mono text-gray-400">{cli.phone || 'Pas de tél'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-rose-600 block">{cli.balance.toFixed(3)} DT</span>
                        <span className="text-[7.5px] font-black text-gray-400 group-hover:text-indigo-600 tracking-wider">AFFECTER</span>
                      </div>
                    </button>
                  ))}
                  {filteredClients.length === 0 && (
                    <p className="text-center py-6 text-[10px] text-gray-400 font-extrabold uppercase tracking-wide">Aucun profil ne correspond.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* NEW DEBITEUR SUBSCRIBER REGISTRY ADD SHEET */}
        {showAddClientForm && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-gray-950/45 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-sm w-full bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-2xl"
            >
              <div className="p-6 border-b border-gray-50 bg-gray-50">
                <h4 className="text-xs font-black uppercase text-gray-800 tracking-wider">Créer un profil Abonné</h4>
                <p className="text-[10px] text-gray-400 font-semibold">Crédits différés pour la buvette</p>
              </div>
              <form onSubmit={handleSaveClient} className="p-6 space-y-4 font-sans text-xs">
                <div className="space-y-1">
                  <label className="text-[8.5px] font-black uppercase tracking-widest text-gray-400">Nom complet de l'abonné</label>
                  <input required value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} placeholder="Ex: Hassene Ben Ali" className="w-full h-11 px-4 bg-gray-50 border border-gray-150 rounded-xl text-xs font-bold outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8.5px] font-black uppercase tracking-widest text-gray-400">Numéro Téléphone</label>
                  <input value={clientForm.phone} onChange={e => setClientForm({...clientForm, phone: e.target.value})} placeholder="Ex: 50 123 456" className="w-full h-11 px-4 bg-gray-50 border border-gray-150 rounded-xl text-xs font-bold outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8.5px] font-black uppercase tracking-widest text-gray-400">Email (facultatif)</label>
                  <input value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} placeholder="Ex: hasene@domain.tn" className="w-full h-11 px-4 bg-gray-50 border border-gray-150 rounded-xl text-xs font-bold outline-none" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowAddClientForm(false)} className="flex-1 py-3 bg-gray-50 text-gray-600 text-[10px] font-black uppercase rounded-xl">Fermer</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-xl shadow-md">Enregistrer</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* SETTLE DEBT / ARDOISE PAYMENT SUBMISSION MODAL */}
        {showPaymentForm && selectedClient && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-gray-950/45 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-sm w-full bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-2xl bg-white"
            >
              <div className="p-6 border-b border-gray-50 bg-gray-50">
                <h4 className="text-xs font-black uppercase text-gray-800 tracking-wider">Règlement de dette / Ardoise</h4>
                <p className="text-[10px] text-emerald-700 font-bold">Versement reçu de {selectedClient.name}</p>
              </div>
              <form onSubmit={handleSavePayment} className="p-6 space-y-4">
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100 font-sans">
                  <span className="text-[8.5px] font-black uppercase tracking-widest text-gray-400">Encours Actuel dû</span>
                  <span className="text-base font-black font-mono text-rose-600">{selectedClient.balance.toFixed(3)} DT</span>
                </div>

                <div className="space-y-1 text-xs">
                  <label className="text-[8.5px] font-black uppercase tracking-widest text-gray-400">Montant Versé Réel (DT)</label>
                  <input 
                    type="number" step="0.050" required max={selectedClient.balance} value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} placeholder="0.000 DT"
                    className="w-full h-11 px-4 bg-gray-50 border border-gray-150 font-black text-sm rounded-xl outline-none"
                  />
                </div>

                <div className="space-y-1 text-xs">
                  <label className="text-[8.5px] font-black uppercase tracking-widest text-gray-400">Méthode de perception</label>
                  <select value={paymentForm.paymentMethod} onChange={e => setPaymentForm({...paymentForm, paymentMethod: e.target.value as any})} className="w-full h-11 px-4 bg-gray-50 border border-gray-150 rounded-xl outline-none font-bold">
                    <option value="cash">Paiement en Espèces (Caisse)</option>
                    <option value="card">TPE / Chèque / Virement</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowPaymentForm(false)} className="flex-1 py-3 bg-gray-50 text-gray-600 text-[10px] uppercase font-bold rounded-xl">Fermer</button>
                  <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white text-[10px] uppercase font-black rounded-xl">Valider Règlement</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* ADD MASTER PRODUCT INVENTORY MODAL */}
        {showAddForm && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-gray-950/45 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-sm w-full bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-2xl"
            >
              <div className="p-6 border-b border-gray-50 bg-gray-50">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-800">
                  {editingItem ? "Modifier la référence" : "Ajouter une référence"}
                </h4>
                <p className="text-[10px] text-gray-400 font-bold">
                  {editingItem ? "Mettre à jour les paramètres de l'article" : "Catalogue produit buvette"}
                </p>
              </div>
              <form key={editingItem?.id || 'new'} onSubmit={handleAddItemSubmit} className="p-6 space-y-4 text-xs font-medium font-sans">
                <div className="space-y-1">
                  <label className="text-[8.5px] font-black uppercase text-gray-400 tracking-wider">Désignation produit</label>
                  <input 
                    name="name" 
                    required 
                    defaultValue={editingItem?.name || ''} 
                    placeholder="Ex: Café Express, Croissant..." 
                    className="w-full h-10 px-3 border border-gray-150 bg-gray-50 rounded-xl font-bold" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8.5px] font-black uppercase text-gray-400 tracking-wider">Catégorie</label>
                    <select 
                      name="category" 
                      defaultValue={editingItem?.category || CATEGORIES[0]} 
                      className="w-full h-10 px-3 border border-gray-150 bg-gray-50 rounded-xl font-bold"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8.5px] font-black uppercase text-gray-400 tracking-wider">Réf / Code</label>
                    <input 
                      name="sku" 
                      defaultValue={editingItem?.sku || ''} 
                      placeholder="Ex: COFFEE01" 
                      className="w-full h-10 px-3 border border-gray-150 bg-gray-50 rounded-xl font-bold" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8.5px] font-black uppercase text-gray-400 tracking-wider">Prix de vente (DT)</label>
                    <input 
                      name="price" 
                      type="number" 
                      step="0.05" 
                      required 
                      defaultValue={editingItem?.price !== undefined ? editingItem.price : ''} 
                      placeholder="0.000" 
                      className="w-full h-10 px-3 border border-gray-150 bg-gray-50 rounded-xl font-bold" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8.5px] font-black uppercase text-gray-400 tracking-wider">
                      {editingItem ? "Niveau de stock" : "Stock Initial"}
                    </label>
                    <input 
                      name="stock" 
                      type="number" 
                      defaultValue={editingItem?.stock !== undefined ? editingItem.stock : "50"} 
                      placeholder="50" 
                      className="w-full h-10 px-3 border border-gray-150 bg-gray-50 rounded-xl font-bold" 
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingItem(null);
                      setShowAddForm(false);
                    }} 
                    className="flex-1 py-3 bg-gray-50 text-gray-600 text-[10px] font-black uppercase rounded-xl"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-xl"
                  >
                    {editingItem ? "Enregistrer" : "Créer article"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* GENERIC SANDBOX ALERT MODALS IN-APP DIALOG */}
        {alertState.show && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-gray-950/50 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-xs w-full bg-white rounded-[2rem] p-6 border border-gray-100 shadow-2xl text-center space-y-4"
            >
              <div className={`h-11 w-11 rounded-full flex items-center justify-center mx-auto text-base font-extrabold ${alertState.type === 'success' ? 'bg-emerald-50 text-emerald-600' : alertState.type === 'warn' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-500'}`}>
                {alertState.type === 'success' ? '✓' : alertState.type === 'warn' ? '!' : '✕'}
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-tight text-gray-900">{alertState.title}</h4>
                <p className="text-[10.5px] text-gray-400 mt-1 font-semibold leading-relaxed">{alertState.message}</p>
              </div>
              <button 
                onClick={() => setAlertState({ show: false, title: '', message: '' })}
                className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase transition-all"
              >
                Fermer
              </button>
            </motion.div>
          </div>
        )}

        {/* GENERIC CONFIRM MODAL DIALOG SHEET */}
        {confirmState.show && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-gray-950/50 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-xs w-full bg-white rounded-[2rem] p-6 border border-gray-100 shadow-2xl text-center space-y-4"
            >
              <h4 className="text-xs font-black uppercase text-gray-900 tracking-tight">{confirmState.title}</h4>
              <p className="text-[10.5px] text-gray-400 font-semibold leading-relaxed">{confirmState.message}</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setConfirmState({ show: false, title: '', message: '' })}
                  className="flex-1 py-2.5 bg-gray-50 text-gray-600 rounded-xl text-[10px] font-black uppercase"
                >
                  Annuler
                </button>
                <button 
                  onClick={() => {
                    if (confirmState.action) confirmState.action();
                    setConfirmState({ show: false, title: '', message: '' });
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase"
                >
                  Confirmer
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex items-center gap-1.5 px-1.5 py-1 md:px-2.5 md:py-1 text-[8px] md:text-[9px] font-black uppercase tracking-tight transition-all ${active ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-700'}`}>
    {icon} 
    <span className="hidden sm:inline">{label}</span>
    <span className="inline sm:hidden">{label === 'Session Z' ? 'Sess. Z' : label}</span>
  </button>
);

const KeyButton = ({ label, variant, onClick }: { label: any, variant: 'dark' | 'orange' | 'rose' | 'blue' | 'green', onClick: () => void }) => {
  const getStyle = () => {
    switch(variant) {
      case 'orange': return 'bg-amber-600/10 text-amber-500 border border-amber-600/20 hover:bg-amber-600 hover:text-black';
      case 'rose': return 'bg-rose-600/15 text-rose-500 border border-rose-600/20 hover:bg-rose-600 hover:text-white';
      case 'blue': return 'bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600 hover:text-white';
      case 'green': return 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600 hover:text-white';
      default: return 'bg-white/5 text-gray-200 border border-white/5 hover:bg-white/10';
    }
  };
  return (
    <button 
      type="button" onClick={onClick}
      className={`h-11 rounded-2xl flex items-center justify-center font-mono font-black text-xs transition-all active:scale-95 ${getStyle()}`}
    >
      {label}
    </button>
  );
};

export default Buvette;
