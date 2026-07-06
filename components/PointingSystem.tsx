
import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Clock, Calendar, ChevronLeft, ChevronRight, 
  Search, Plus, Trash2, Edit2, Check, X, Filter, 
  Briefcase, MoreVertical, DollarSign, TrendingUp, AlertCircle,
  History as HistoryIcon, Download, Printer, FileText
} from 'lucide-react';
import { db, handleFirestoreError, FSOperationType } from '../services/firebase';
import { collection, onSnapshot, setDoc, doc, deleteDoc, updateDoc, query, where } from '../services/db';
import { Employee, ProductionOperation as WorkOperation, Pointing, PointingType, IssuerInfo as Issuer, MonthlyAdjustment, LeaveRequest } from '../types';
import { Eye, Award, CalendarDays, KeyRound, Briefcase as BriefcaseIcon, UserCheck, ShieldAlert, CheckCircle, FileSignature } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PointingSystemProps {
  selectedIssuerIds: string[];
  issuers: Issuer[];
  permissions?: any;
  isAdmin?: boolean;
}

const PREDEFINED_ROLES = [
  "Manager",
  "IT",
  "Serveur",
  "Agent Call Center",
  "Superviseur",
  "Coach BK",
  "Qualiticien",
  "Call2",
  "Formateur"
];

const getRoleRate = (op: any, roleName: string) => {
  if (!op) return 0;
  if (!roleName) return parseFloat(op.hourlyRate) || 0;
  
  const roleRates = op.roleRates || {};
  const normalizedSearch = roleName.trim().toLowerCase();
  
  const matchingKey = Object.keys(roleRates).find(
    k => k.trim().toLowerCase() === normalizedSearch
  );
  
  if (matchingKey && roleRates[matchingKey] !== undefined) {
    const val = parseFloat(roleRates[matchingKey]);
    return isNaN(val) ? (parseFloat(op.hourlyRate) || 0) : val;
  }
  
  return parseFloat(op.hourlyRate) || 0;
};

const PointingSystem: React.FC<PointingSystemProps> = ({ selectedIssuerIds, issuers, permissions, isAdmin }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [operations, setOperations] = useState<WorkOperation[]>([]);
  const [pointings, setPointings] = useState<Pointing[]>([]);
  const [adjustments, setAdjustments] = useState<MonthlyAdjustment[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [issuerFilter, setIssuerFilter] = useState<'all' | string>(selectedIssuerIds.length === 1 ? selectedIssuerIds[0] : 'all');
  
  const canManageAttendance = isAdmin || permissions?.canManageAttendance;
  const canManageEmployees = isAdmin || permissions?.canManageEmployees;
  const canManageOperations = isAdmin || permissions?.canManageOperations;

  const [activeTab, setActiveTab] = useState<'daily' | 'sheet' | 'payments' | 'employees' | 'operations'>(
    canManageAttendance ? 'daily' : (canManageEmployees ? 'employees' : 'operations')
  );
  
  // Data Loading
  useEffect(() => {
    if (selectedIssuerIds.length === 0) return;

    const unsubEmp = onSnapshot(collection(db, 'employees'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      setEmployees(data.filter(e => selectedIssuerIds.includes(e.issuerId)));
    }, (error) => {
      handleFirestoreError(error, FSOperationType.LIST, 'employees');
    });

    const unsubOps = onSnapshot(collection(db, 'operations'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkOperation));
      setOperations(data.filter(o => selectedIssuerIds.includes(o.issuerId)));
    }, (error) => {
      handleFirestoreError(error, FSOperationType.LIST, 'operations');
    });

    const unsubPoint = onSnapshot(collection(db, 'pointings'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pointing));
      setPointings(data.filter(p => selectedIssuerIds.includes(p.issuerId)));
    }, (error) => {
      handleFirestoreError(error, FSOperationType.LIST, 'pointings');
    });

    const unsubAdj = onSnapshot(collection(db, 'monthly_adjustments'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MonthlyAdjustment));
      setAdjustments(data.filter(a => selectedIssuerIds.includes(a.issuerId)));
    }, (error) => {
      handleFirestoreError(error, FSOperationType.LIST, 'monthly_adjustments');
    });

    const unsubLeave = onSnapshot(collection(db, 'leave_requests'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest));
      setLeaveRequests(data.filter(l => selectedIssuerIds.includes(l.issuerId)));
    }, (error) => {
      handleFirestoreError(error, FSOperationType.LIST, 'leave_requests');
    });

    return () => {
      unsubEmp();
      unsubOps();
      unsubPoint();
      unsubAdj();
      unsubLeave();
    };
  }, [selectedIssuerIds]);

  const stats = {
    totalActive: employees.filter(e => e.status === 'active').length,
    totalHoursToday: pointings.filter(p => p.date === selectedDate).reduce((acc, p) => acc + (p.hours || 0), 0),
    totalCostToday: pointings
      .filter(p => p.date === selectedDate && (p.type === 'work' || p.type === 'leave'))
      .reduce((acc, p) => {
        const op = operations.find(o => o.id === p.operationId);
        const emp = employees.find(e => e.id === p.employeeId);
        const rate = getRoleRate(op, emp?.role || '');
        return acc + ((p.hours || 0) * rate);
      }, 0),
    avgHoursPerAgent: employees.length > 0 ? (pointings.filter(p => p.date === selectedDate).reduce((acc, p) => acc + (p.hours || 0), 0) / employees.length).toFixed(1) : 0
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-20">
      {/* Upper Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-8">
        <StatCard 
          icon={<Users className="text-[#1A56DB]" />} 
          label="Agents Actifs" 
          value={stats.totalActive} 
          subValue={`${employees.length} au total`} 
        />
        <StatCard 
          icon={<Clock className="text-[#0E7866]" />} 
          label="Heures Prod. (Jour)" 
          value={stats.totalHoursToday} 
          subValue="Heures cumulées" 
        />
        <StatCard 
          icon={<DollarSign className="text-[#C0280F]" />} 
          label="Coût Prod. (Jour)" 
          value={`${stats.totalCostToday.toFixed(2)} DT`} 
          subValue="Basé sur tarifs horaires" 
        />
        <StatCard 
          icon={<Briefcase className="text-[#9D38FB]" />} 
          label="Moyenne / Agent" 
          value={`${stats.avgHoursPerAgent}h`} 
          subValue="Productivité" 
        />
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-[#E4E0D8] w-full md:w-fit shadow-sm overflow-x-auto custom-scrollbar whitespace-nowrap">
          {canManageAttendance && (
            <>
              <TabButton active={activeTab === 'daily'} onClick={() => setActiveTab('daily')} icon={<Calendar size={14} />} label="Pointage" />
              <TabButton active={activeTab === 'sheet'} onClick={() => setActiveTab('sheet')} icon={<TrendingUp size={14} />} label="Timesheet" />
              <TabButton active={activeTab === 'payments'} onClick={() => setActiveTab('payments')} icon={<DollarSign size={14} />} label="Paiements & Fiches" />
            </>
          )}
          {canManageEmployees && (
            <TabButton active={activeTab === 'employees'} onClick={() => setActiveTab('employees')} icon={<Users size={14} />} label="Employés" />
          )}
          {canManageOperations && (
            <TabButton active={activeTab === 'operations'} onClick={() => setActiveTab('operations')} icon={<TrendingUp size={14} />} label="Opérations" />
          )}
        </div>

        {issuers.length > 1 && (
          <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1 border border-[#E4E0D8] rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-[#ACA9A2] px-3">Filtrer par Entreprise</span>
            <select 
              value={issuerFilter}
              onChange={(e) => setIssuerFilter(e.target.value)}
              className="px-4 py-2 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest outline-none border border-[#E4E0D8] transition-all focus:border-[#1A56DB]"
            >
              <option value="all">Toutes les Entreprises</option>
              {issuers.filter(i => selectedIssuerIds.includes(i.id)).map(issuer => (
                <option key={issuer.id} value={issuer.id}>{issuer.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'daily' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="daily">
            <DailyPointing 
              date={selectedDate} 
              onDateChange={setSelectedDate} 
              employees={employees.filter(e => issuerFilter === 'all' || e.issuerId === issuerFilter)} 
              operations={operations} 
              pointings={pointings}
              issuers={issuers}
              onSave={async (p) => {
                await setDoc(doc(db, 'pointings', p.id), p);
              }}
              onDelete={async (id) => {
                await deleteDoc(doc(db, 'pointings', id));
              }}
            />
          </motion.div>
        )}

        {activeTab === 'sheet' && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} key="sheet">
            <TimeSheetGrid 
              employees={employees.filter(e => issuerFilter === 'all' || e.issuerId === issuerFilter)} 
              pointings={pointings} 
              operations={operations} 
              issuers={issuers}
              onSelectDate={(d: string) => {
                setSelectedDate(d);
                setActiveTab('daily');
              }}
            />
          </motion.div>
        )}

        {activeTab === 'payments' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="payments">
            <MonthlyPayments 
              employees={employees.filter(e => issuerFilter === 'all' || e.issuerId === issuerFilter)} 
              pointings={pointings} 
              operations={operations} 
              adjustments={adjustments}
              issuers={issuers}
              onSaveAdjustment={async (adj: MonthlyAdjustment) => {
                await setDoc(doc(db, 'monthly_adjustments', adj.id), adj);
              }}
            />
          </motion.div>
        )}

        {activeTab === 'employees' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="employees">
            <EmployeeManager 
              employees={employees.filter(e => issuerFilter === 'all' || e.issuerId === issuerFilter)} 
              issuers={issuers}
              operations={operations}
              selectedIssuerIds={selectedIssuerIds}
              leaveRequests={leaveRequests}
              pointings={pointings}
              onAdd={async (e) => {
                try {
                  await setDoc(doc(db, 'employees', e.id), e);
                  if ((e.role === 'Manager' || e.role === 'IT' || e.role === 'Serveur') && e.email) {
                    const placeholderId = `invite_${e.email.toLowerCase().trim()}`;
                    // Check if already exists
                    await setDoc(doc(db, 'users', placeholderId), {
                      uid: placeholderId,
                      email: e.email.toLowerCase().trim(),
                      displayName: e.name,
                      role: e.role === 'IT' ? 'editor' : (e.role === 'Serveur' ? 'editor' : 'manager'),
                      employeeRole: e.role,
                      status: 'pending',
                      permissions: e.role === 'Serveur' ? {
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
                      } : {
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
                        canManageEmployees: e.role === 'IT',
                        canManageOperations: e.role === 'IT',
                        canManageUsers: false,
                        canManageSettings: e.role === 'IT'
                      },
                      issuerIds: [e.issuerId]
                    }, { merge: true });
                  }
                } catch (err) {
                  handleFirestoreError(err, FSOperationType.WRITE, 'employees');
                }
              }}
              onUpdate={async (e) => {
                try {
                  await updateDoc(doc(db, 'employees', e.id), { ...e } as any);
                  if ((e.role === 'Manager' || e.role === 'IT' || e.role === 'Serveur') && e.email) {
                    const placeholderId = `invite_${e.email.toLowerCase().trim()}`;
                    await setDoc(doc(db, 'users', placeholderId), {
                      displayName: e.name,
                      role: e.role === 'IT' ? 'editor' : (e.role === 'Serveur' ? 'editor' : 'manager'),
                      employeeRole: e.role,
                      email: e.email.toLowerCase().trim(),
                      permissions: e.role === 'Serveur' ? {
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
                      } : {
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
                        canManageEmployees: e.role === 'IT',
                        canManageOperations: e.role === 'IT',
                        canManageUsers: false,
                        canManageSettings: e.role === 'IT'
                      }
                    }, { merge: true });
                  }
                } catch (err) {
                  handleFirestoreError(err, FSOperationType.UPDATE, 'employees/' + e.id);
                }
              }}
              onDelete={async (id) => {
                const emp = employees.find(e => e.id === id);
                if (!id) {
                  alert("Erreur: ID de l'employé manquant");
                  return;
                }
                if (window.confirm(`Voulez-vous vraiment supprimer l'employé ${emp?.name || ''} ?`)) {
                  try {
                    console.log("Deleting employee:", id);
                    await deleteDoc(doc(db, 'employees', id));
                    if ((emp?.role === 'Manager' || emp?.role === 'IT') && emp?.email) {
                      const inviteId = `invite_${emp.email.toLowerCase().trim()}`;
                      await deleteDoc(doc(db, 'users', inviteId));
                    }
                    alert("Employé supprimé avec succès");
                  } catch (err: any) {
                    console.error("Delete error:", err);
                    alert("Erreur lors de la suppression: " + err.message);
                    handleFirestoreError(err, FSOperationType.DELETE, 'employees/' + id);
                  }
                }
              }}
            />
          </motion.div>
        )}

        {activeTab === 'operations' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="operations">
            <OperationManager 
              operations={operations.filter(o => issuerFilter === 'all' || o.issuerId === issuerFilter)} 
              employees={employees}
              issuers={issuers}
              selectedIssuerIds={selectedIssuerIds}
              onAdd={async (o) => await setDoc(doc(db, 'operations', o.id), o)}
              onUpdate={async (o) => await updateDoc(doc(db, 'operations', o.id), { ...o } as any)}
              onDelete={async (id, skipConfirm = false) => {
                const op = operations.find(o => o.id === id);
                if (!id) {
                  alert("Erreur: ID de l'opération manquant");
                  return;
                }
                if (skipConfirm || window.confirm(`Supprimer l'opération "${op?.name || ''}" ?`)) {
                  try {
                    console.log("Deleting operation:", id);
                    await deleteDoc(doc(db, 'operations', id));
                    if (!skipConfirm) alert("Opération supprimée avec succès");
                  } catch (err: any) {
                    console.error("Delete error:", err);
                    if (!skipConfirm) alert("Erreur lors de la suppression: " + err.message);
                    handleFirestoreError(err, FSOperationType.DELETE, 'operations/' + id);
                  }
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Sub-components ---

const DailyPointing = ({ date, onDateChange, employees, operations, pointings, onSave, onDelete, issuers }: any) => {
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Group pointings by employee for faster lookup
  const pointingsForDate = pointings.filter((p: any) => p.date === date);

  // Get unique roles for filtering
  const uniqueRoles = Array.from(new Set(employees.map((e: any) => e.role).filter(Boolean))) as string[];

  const handleQuickSave = async (empId: string, issuerId: string, hours: number, type: PointingType, opId: string) => {
    setIsSaving(empId);
    const existing = pointingsForDate.find((p: any) => p.employeeId === empId);
    const id = existing?.id || `p-${empId}-${date}`;
    
    await onSave({
      id,
      employeeId: empId,
      issuerId,
      date,
      hours,
      type,
      operationId: opId || '',
      updatedAt: new Date().toISOString()
    });
    setIsSaving(null);
  };

  const markAllPresent = async () => {
    if (!confirm("Voulez-vous marquer tous les agents présents (8h) pour cette date ?")) return;
    for (const emp of filteredEmployees) {
      const pointing = pointingsForDate.find((p: any) => p.employeeId === emp.id);
      if (!pointing) {
        await handleQuickSave(emp.id, emp.issuerId, 8, 'work', operations[0]?.id || '');
      }
    }
  };

  const copyFromYesterday = async () => {
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayPointings = pointings.filter((p: any) => p.date === yesterdayStr);

    if (yesterdayPointings.length === 0) {
      alert("Aucune donnée trouvée pour hier (" + yesterdayStr + ")");
      return;
    }

    if (!confirm("Copier les données du " + yesterdayStr + " (" + yesterdayPointings.length + " entrées) ?")) return;

    for (const p of yesterdayPointings) {
      // Check if employee exists in current list
      const emp = employees.find((e: any) => e.id === p.employeeId);
      if (emp) {
        await handleQuickSave(emp.id, emp.issuerId, p.hours, p.type, p.operationId);
      }
    }
  };

  const filteredEmployees = employees.filter((e: any) => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        e.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || e.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="bg-white rounded-3xl border border-[#E4E0D8] shadow-sm overflow-hidden min-h-[600px]">
      {/* Search & Actions Header */}
      <div className="p-4 md:p-6 border-b border-[#E4E0D8] bg-[#FAF8F4]/50 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-[#1A56DB] p-2.5 rounded-2xl text-white">
              <Clock size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-[#14120E]">Feuille de présence rapide</h2>
              <p className="text-[10px] text-[#7A776F] font-bold">Remplissage en masse pour vos {employees.length} agents</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={copyFromYesterday}
              className="flex-1 md:flex-none h-10 px-4 bg-white border border-[#E4E0D8] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#FAF8F4] transition-all flex items-center justify-center gap-2"
            >
              <HistoryIcon size={14} /> Copier d'hier
            </button>
            <button 
              onClick={markAllPresent}
              className="flex-1 md:flex-none h-10 px-4 bg-[#0E7866] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#0C6254] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#0E7866]/20"
            >
              <Check size={14} /> Tous Présents (8h)
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ACA9A2]" size={16} />
            <input 
              placeholder="Rechercher un agent..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-12 pr-4 rounded-xl border border-[#E4E0D8] text-xs font-bold bg-white focus:ring-2 focus:ring-[#1A56DB]/20 outline-none transition-all shadow-sm"
            />
          </div>

          <div className="w-full md:w-auto flex items-center gap-2">
            <div className="relative flex-1 md:w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ACA9A2]" size={14} />
              <select 
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full h-11 pl-9 pr-4 rounded-xl border border-[#E4E0D8] text-xs font-bold bg-white focus:ring-2 focus:ring-[#1A56DB]/20 outline-none transition-all shadow-sm appearance-none"
              >
                <option value="all">Tous les postes</option>
                {uniqueRoles.map(role => (
                   <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-[#E4E0D8] shadow-sm shrink-0">
              <button 
                onClick={() => {
                  const prev = new Date(date);
                  prev.setDate(prev.getDate() - 1);
                  onDateChange(prev.toISOString().split('T')[0]);
                }}
                className="w-9 h-9 hover:bg-[#FAF8F4] rounded-lg text-[#7A776F] transition-all flex items-center justify-center"
              >
                <ChevronLeft size={18} />
              </button>
              <input 
                type="date" 
                value={date}
                onChange={(e) => onDateChange(e.target.value)}
                className="h-9 px-2 text-xs font-black uppercase bg-transparent outline-none cursor-pointer"
              />
              <button 
                onClick={() => {
                  const next = new Date(date);
                  next.setDate(next.getDate() + 1);
                  onDateChange(next.toISOString().split('T')[0]);
                }}
                className="w-9 h-9 hover:bg-[#FAF8F4] rounded-lg text-[#7A776F] transition-all flex items-center justify-center"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Operation Cost Summary for the day */}
        <div className="pt-2 flex flex-wrap gap-x-6 gap-y-2">
          {operations.map((op: any) => {
            const opPoints = pointingsForDate.filter((p: any) => p.operationId === op.id && (p.type === 'work' || p.type === 'leave'));
            const totalHours = opPoints.reduce((acc: number, p: any) => acc + (p.hours || 0), 0);
            const agentCount = opPoints.length;
            if (totalHours === 0) return null;
            return (
              <div key={op.id} className="flex items-center gap-2 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0E7866]"></div>
                <span className="text-[10px] font-bold text-[#14120E]">{op.name}:</span>
                <span className="text-[10px] font-black text-[#0E7866]">{agentCount} Agent{agentCount > 1 ? 's' : ''}</span>
                <span className="text-[9px] font-bold text-[#ACA9A2] tracking-tighter">({totalHours}h)</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-[#FAF8F4] z-10">
            <tr className="border-b border-[#E4E0D8]">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-[#7A776F]">Agent</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-[#7A776F]">Status</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-[#7A776F]">Heures</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-[#7A776F]">Opération</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-[#7A776F]">Coût</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-[#7A776F] text-right pr-8">Etat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4E0D8]">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center">
                   <div className="max-w-xs mx-auto">
                      <Users size={40} className="mx-auto text-[#B0ADA5] mb-4 opacity-30" />
                      <p className="text-sm font-bold text-[#7A776F]">Aucun agent trouvé.</p>
                      {searchQuery && <button onClick={() => setSearchQuery('')} className="text-[#1A56DB] text-[10px] font-black uppercase mt-2">Effacer la recherche</button>}
                   </div>
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp: any) => {
                const pointing = pointingsForDate.find((p: any) => p.employeeId === emp.id);
                const op = operations.find((o: any) => o.id === (pointing?.operationId || emp.operationId || (operations.find((op: any) => op.issuerId === emp.issuerId)?.id) || operations[0]?.id));
                const rate = getRoleRate(op, emp.role);
                const estPrice = ((pointing?.type === 'work' || pointing?.type === 'leave') && op) ? ((pointing.hours || 0) * rate).toFixed(3) : '0.000';
                
                return (
                  <tr key={emp.id} className={`hover:bg-[#FAF8F4]/30 transition-colors ${pointing ? 'bg-[#EBF2FF]/5' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-lg ${pointing ? 'bg-[#1A56DB] text-white shadow-md' : 'bg-[#EBF2FF] text-[#1A56DB]'} transition-all flex items-center justify-center text-[10px] font-black uppercase`}>
                            {emp.name.charAt(0)}
                         </div>
                         <div>
                            <div className="text-xs font-black text-[#14120E] flex items-center gap-2">
                               {emp.name}
                               {issuers.find((i: any) => i.id === emp.issuerId) && (
                                 <span className="px-1.5 py-0.5 bg-[#FAF8F4] text-[#7A776F] border border-[#E4E0D8] rounded text-[8px] font-black uppercase">
                                   {issuers.find((i: any) => i.id === emp.issuerId)?.name.split(' ')[0]}
                                 </span>
                               )}
                            </div>
                            <div className="text-[9px] text-[#A2A098] font-bold uppercase">{emp.role}</div>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={pointing?.type || ''}
                        onChange={(e) => {
                          const type = e.target.value as PointingType;
                          const hours = (type === 'work' || type === 'leave') ? 8 : 0;
                          handleQuickSave(emp.id, emp.issuerId, hours, type, pointing?.operationId || emp.operationId || operations.find((o:any) => o.issuerId === emp.issuerId)?.id || operations[0]?.id || '');
                        }}
                        className={`h-9 px-3 rounded-lg border text-[10px] font-black uppercase outline-none transition-all ${pointing ? 'bg-white border-[#E4E0D8]' : 'bg-white border-[#E4E0D8]/40 opacity-60'}`}
                      >
                        {!pointing && <option value="" disabled>Status</option>}
                        <option value="work">Présent</option>
                        <option value="absence">Absence</option>
                        <option value="holiday">Férié</option>
                        <option value="off">Off/Repos</option>
                        <option value="leave">Congé</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                        <input 
                          type="number"
                          step="0.5"
                          value={pointing?.hours ?? ''}
                          placeholder="0"
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            handleQuickSave(emp.id, emp.issuerId, isNaN(val) ? 0 : val, pointing?.type || 'work', pointing?.operationId || emp.operationId || operations.find((o:any) => o.issuerId === emp.issuerId)?.id || operations[0]?.id || '');
                          }}
                          className={`w-16 h-9 px-2 text-center rounded-lg border text-xs font-mono font-bold outline-none transition-all ${((pointing?.hours || 0) > 0) ? 'bg-white border-[#1A56DB] text-[#1A56DB]' : 'bg-white border-[#E4E0D8]/40 opacity-60'}`}
                        />
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => handleQuickSave(emp.id, emp.issuerId, 8, 'work', pointing?.operationId || emp.operationId || operations.find((o:any) => o.issuerId === emp.issuerId)?.id || operations[0]?.id || '')} className="text-[8px] font-black text-[#1A56DB] bg-[#1A56DB]/5 px-1 rounded hover:bg-[#1A56DB]/10">8H</button>
                          <button onClick={() => handleQuickSave(emp.id, emp.issuerId, 4, 'work', pointing?.operationId || emp.operationId || operations.find((o:any) => o.issuerId === emp.issuerId)?.id || operations[0]?.id || '')} className="text-[8px] font-black text-[#7A776F] bg-black/5 px-1 rounded hover:bg-black/10">4H</button>
                        </div>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        disabled={pointing?.type && pointing.type !== 'work'}
                        value={pointing?.operationId || emp.operationId || (operations.find((o:any) => o.issuerId === emp.issuerId)?.id || '')}
                        onChange={(e) => handleQuickSave(emp.id, emp.issuerId, pointing?.hours || 8, pointing?.type || 'work', e.target.value)}
                        className="h-9 px-3 rounded-lg border border-[#E4E0D8] text-[10px] font-bold text-[#7A776F] outline-none max-w-[150px] bg-white"
                      >
                        {operations.filter((o: any) => o.issuerId === emp.issuerId).map((o: any) => (
                           <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                       <div className="font-mono text-xs font-bold text-[#0E7866]">{estPrice} <span className="text-[10px] opacity-40">DT</span></div>
                    </td>
                    <td className="px-6 py-4 text-right pr-8">
                       {isSaving === emp.id ? (
                         <div className="w-5 h-5 border-2 border-[#1A56DB] border-t-transparent rounded-full animate-spin ml-auto"></div>
                       ) : pointing ? (
                         <div className="flex items-center justify-end gap-1.5 text-[#0E7866] text-[10px] font-black uppercase">
                           <div className="w-4 h-4 bg-[#E6F8F4] rounded-full flex items-center justify-center">
                             <Check size={10} />
                           </div>
                           <span>Ok</span>
                         </div>
                       ) : (
                         <div className="text-[#ACA9A2] text-[10px] font-bold uppercase opacity-30">Vierge</div>
                       )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TimeSheetGrid = ({ employees, pointings, operations, issuers, onSelectDate }: any) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [roleFilter, setRoleFilter] = useState('all');
  const [opFilter, setOpFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const dateArray = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
    return d.toISOString().split('T')[0];
  });

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));

  const filteredEmployees = employees.filter((e: any) => {
    const matchesRole = roleFilter === 'all' || e.role === roleFilter;
    const matchesOp = opFilter === 'all' || e.operationId === opFilter;
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesOp && matchesSearch;
  });

  const uniqueRoles = Array.from(new Set(employees.map((e: any) => e.role).filter(Boolean))) as string[];

  return (
    <div className="bg-white rounded-3xl border border-[#E4E0D8] shadow-sm overflow-hidden flex flex-col h-[calc(100vh-320px)]">
       <div className="p-4 md:p-6 border-b border-[#E4E0D8] bg-[#FAF8F4]/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <div className="bg-[#9D38FB] p-2.5 rounded-2xl text-white">
                <TrendingUp size={20} />
             </div>
             <div>
               <h2 className="text-sm font-black uppercase tracking-widest text-[#14120E]">Timesheet Mensuel</h2>
               <p className="text-[10px] text-[#7A776F] font-bold italic">Cliquez sur une case pour pointer ce jour</p>
             </div>
          </div>

          <div className="flex items-center gap-4 flex-1 justify-center">
             <button onClick={prevMonth} className="w-10 h-10 rounded-xl border border-[#E4E0D8] flex items-center justify-center hover:bg-white transition-all"><ChevronLeft size={18} /></button>
             <div className="text-xs font-black uppercase tracking-widest text-[#14120E] min-w-[150px] text-center">
                {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
             </div>
             <button onClick={nextMonth} className="w-10 h-10 rounded-xl border border-[#E4E0D8] flex items-center justify-center hover:bg-white transition-all"><ChevronRight size={18} /></button>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ACA9A2]" size={14} />
              <input 
                placeholder="Chercher..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#E4E0D8] text-xs font-bold bg-white outline-none"
              />
            </div>
            <div className="relative flex-1 md:w-32">
              <Plus className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ACA9A2]" size={14} />
              <select 
                value={opFilter}
                onChange={(e) => setOpFilter(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#E4E0D8] text-xs font-bold bg-white outline-none appearance-none"
              >
                <option value="all">Opérations</option>
                {operations.map((op: any) => (
                   <option key={op.id} value={op.id}>{op.name}</option>
                ))}
              </select>
            </div>
            <div className="relative flex-1 md:w-32">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ACA9A2]" size={14} />
              <select 
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#E4E0D8] text-xs font-bold bg-white outline-none appearance-none"
              >
                <option value="all">Postes</option>
                {uniqueRoles.map(role => (
                   <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          </div>
       </div>

       <div className="flex-1 overflow-auto relative custom-scrollbar">
          <table className="w-full text-left border-collapse border-spacing-0">
             <thead className="sticky top-0 z-20 bg-[#FAF8F4]">
                <tr>
                   <th className="sticky left-0 z-30 bg-[#FAF8F4] px-4 py-3 text-[9px] font-black uppercase tracking-wider text-[#7A776F] border-b border-r border-[#E4E0D8] min-w-[180px]">Agent</th>
                   {dateArray.map(date => {
                     const d = new Date(date).getDate();
                     const isToday = date === new Date().toISOString().split('T')[0];
                     return (
                      <th key={date} 
                        onClick={() => onSelectDate(date)}
                        className={`px-2 py-3 text-center text-[9px] font-black uppercase tracking-tight border-b border-[#E4E0D8] min-w-[32px] cursor-pointer hover:bg-[#1A56DB] hover:text-white transition-all ${isToday ? 'bg-[#1A56DB]/10 text-[#1A56DB]' : 'text-[#7A776F]'}`}>
                         {d}
                      </th>
                     );
                   })}
                   <th className="sticky right-0 z-30 bg-[#FAF8F4] px-4 py-3 text-[9px] font-black uppercase tracking-wider text-[#0E7866] border-b border-l border-[#E4E0D8] min-w-[80px]">Total H</th>
                   <th className="sticky right-0 z-30 bg-[#FAF8F4] px-4 py-3 text-[9px] font-black uppercase tracking-wider text-[#1A56DB] border-b border-l border-[#E4E0D8] min-w-[100px] right-[80px]">Total Montant</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-[#E4E0D8]">
                {filteredEmployees.map((emp: any) => {
                  let totalHours = 0;
                  let totalAmount = 0;
                  
                  return (
                    <tr key={emp.id} className="hover:bg-[#FAF8F4]/50 transition-colors">
                      <td className="sticky left-0 z-10 bg-white px-4 py-2 border-r border-[#E4E0D8]">
                         <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-md bg-[#F1EDE5] text-[#7A776F] flex items-center justify-center text-[8px] font-bold">
                              {emp.name.charAt(0)}
                           </div>
                           <div className="text-[10px] font-bold text-[#14120E] truncate max-w-[120px]">{emp.name}</div>
                         </div>
                      </td>
                      {dateArray.map(date => {
                         const pts = pointings.filter((p: any) => p.date === date && p.employeeId === emp.id);
                         const dayHours = pts.reduce((acc: number, p: any) => acc + p.hours, 0);
                         const dayAmount = pts.reduce((acc: number, p: any) => {
                            if (p.type !== 'work' && p.type !== 'leave') return acc;
                            const op = operations.find((o: any) => o.id === p.operationId);
                            const rate = getRoleRate(op, emp.role);
                            return acc + (p.hours * rate);
                         }, 0);
                         
                         totalHours += dayHours;
                         totalAmount += dayAmount;

                         return (
                           <td key={date} 
                             onClick={() => onSelectDate(date)}
                             className={`px-1 py-2 text-center text-[10px] font-mono font-bold border-r border-[#FAF8F4] cursor-pointer hover:ring-2 hover:ring-[#1A56DB]/50 transition-all ${dayHours > 0 ? 'bg-[#EBF2FF] text-[#1A56DB]' : 'text-[#ACA9A2] opacity-30 hover:opacity-100'}`}>
                             {dayHours > 0 ? dayHours : '.'}
                           </td>
                         );
                      })}
                      <td className="sticky right-0 z-10 bg-white px-4 py-2 text-center font-mono text-[10px] font-bold text-[#0E7866] border-l border-[#E4E0D8]">
                         {totalHours}h
                      </td>
                      <td className="sticky right-0 z-10 bg-[#EBF2FF] px-4 py-2 text-right font-mono text-[10px] font-black text-[#1A56DB] border-l border-[#E4E0D8] right-[80px]">
                         {totalAmount.toFixed(2)}DT
                      </td>
                    </tr>
                  );
                })}
             </tbody>
          </table>
       </div>

       {/* Operation Summary Footer */}
       <div className="p-4 bg-[#FAF8F4] border-t border-[#E4E0D8]">
          <h4 className="text-[10px] font-black uppercase text-[#7A776F] mb-3 tracking-widest">Résumé par opération (Production du mois)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
             {operations.map((op: any) => {
               const opPoints = pointings.filter((p: any) => p.operationId === op.id && dateArray.includes(p.date));
               const totalHours = opPoints.reduce((acc: number, p: any) => acc + (p.hours || 0), 0);
               const uniqueAgents = new Set(opPoints.map((p: any) => p.employeeId)).size;
               if (totalHours === 0) return null;
               return (
                 <div key={op.id} className="bg-white p-3 rounded-xl border border-[#E4E0D8] shadow-sm">
                   <div className="text-[8px] font-black text-[#ACA9A2] uppercase truncate">{op.name}</div>
                   <div className="flex items-center justify-between mt-1">
                     <span className="text-[10px] font-bold text-[#14120E]">{totalHours}h</span>
                     <span className="text-[10px] font-black text-[#0E7866]">{uniqueAgents} Agent{uniqueAgents > 1 ? 's' : ''}</span>
                   </div>
                 </div>
               );
             })}
          </div>
       </div>
    </div>
  );
};

const EmployeeManager = ({ employees, issuers, operations, onAdd, onUpdate, onDelete, selectedIssuerIds, leaveRequests, pointings }: any) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-[#14120E] uppercase tracking-tighter">Gestion du Personnel</h2>
            <p className="text-xs text-[#7A776F] font-bold">Listez et gérez vos agents par entreprise</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#1A56DB] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#1648C4] transition-all shadow-xl"
          >
            <UserPlus size={16} /> Ajouter un agent
          </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isAdding && (
            <EmployeeCard 
              isNew 
              issuers={issuers}
              operations={operations}
              selectedIssuerIds={selectedIssuerIds}
              leaveRequests={leaveRequests || []}
              pointings={pointings || []}
              onSave={(e: any) => { onAdd(e); setIsAdding(false); }} 
              onCancel={() => setIsAdding(false)} 
            />
          )}
          {employees.map((e: any) => (
            <EmployeeCard 
              key={e.id} 
              employee={e} 
              issuers={issuers}
              operations={operations}
              selectedIssuerIds={selectedIssuerIds}
              leaveRequests={leaveRequests || []}
              pointings={pointings || []}
              isEditing={editingId === e.id}
              onEdit={() => setEditingId(e.id)}
              onUpdate={(updated: any) => { onUpdate(updated); setEditingId(null); }}
              onDelete={() => onDelete(e.id)}
              onCancel={() => setEditingId(null)}
            />
          ))}
       </div>
    </div>
  );
};

const OperationManager = ({ operations, employees, issuers, onAdd, onUpdate, onDelete, selectedIssuerIds }: any) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);


  // No-op cleanup or empty effect removed to prevent unintended data loss

  const handleDeleteAll = async () => {
    if (window.confirm(`Supprimer TOUTES les ${operations.length} opérations ? Cette action est irréversible.`)) {
      try {
        for (const op of operations) {
          await onDelete(op.id, true);
        }
        alert("Toutes les opérations ont été supprimées");
      } catch (err) {
        alert("Erreur lors de la suppression groupée");
      }
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-[#E4E0D8]">
          <div>
            <h2 className="text-lg font-black text-[#14120E] uppercase tracking-tighter">Opérations de Production</h2>
            <p className="text-xs text-[#7A776F] font-bold">Gérez la liste des tâches et les affectations</p>
          </div>
          <div className="flex gap-2">
            {operations.length > 0 && (
              <button 
                onClick={handleDeleteAll}
                className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all font-mono"
              >
                <Trash2 size={14} /> Supprimer tout
              </button>
            )}
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[#0E7866] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#0C6254] transition-all shadow-xl"
            >
              <Plus size={16} /> Nouvelle Opération
            </button>
          </div>
       </div>

       {isAdding && (
          <div className="bg-white p-6 rounded-3xl border border-[#E4E0D8] shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
            <OperationCard 
              isNew 
              issuers={issuers}
              employees={employees}
              selectedIssuerIds={selectedIssuerIds}
              onSave={(o: any) => { onAdd(o); setIsAdding(false); }} 
              onCancel={() => setIsAdding(false)} 
            />
          </div>
       )}

       <div className="bg-white rounded-3xl border border-[#E4E0D8] overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF8F4] border-b border-[#E4E0D8]">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-[#ACA9A2] tracking-wider">Opération</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-[#ACA9A2] tracking-wider">Entreprise</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-[#ACA9A2] tracking-wider">Tarif de Base</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-[#ACA9A2] tracking-wider">Tarifs par Rôle</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-[#ACA9A2] tracking-wider">Agents Affectés</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-[#ACA9A2] tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E0D8]">
              {operations.length === 0 && !isAdding && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#7A776F] font-medium italic">
                    Aucune opération configurée. Cliquez sur "Nouvelle Opération" pour commencer.
                  </td>
                </tr>
              )}
              {operations.map((o: any) => {
                const assignedCount = employees?.filter((e: any) => e.operationId === o.id).length || 0;
                const issuer = issuers.find((i: any) => i.id === o.issuerId);
                
                if (editingId === o.id) {
                  return (
                    <tr key={o.id}>
                      <td colSpan={6} className="px-6 py-8 bg-[#FAF8F4]/50">
                        <OperationCard 
                          operation={o} 
                          employees={employees}
                          issuers={issuers}
                          selectedIssuerIds={selectedIssuerIds}
                          isEditing={true}
                          onUpdate={(updated: any) => { onUpdate(updated); setEditingId(null); }}
                          onCancel={() => setEditingId(null)}
                        />
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={o.id} className="hover:bg-[#FAF8F4]/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#E6F8F4] text-[#0E7866] rounded-lg flex items-center justify-center">
                          <TrendingUp size={16} />
                        </div>
                        <span className="text-sm font-black text-[#14120E]">{o.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full bg-white border border-[#E4E0D8] text-[9px] font-black uppercase text-[#7A776F]">
                        {issuer?.name || 'Inconnu'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-black text-[#0E7866]">
                        {o.hourlyRate ? `${parseFloat(o.hourlyRate).toFixed(3)} DT/h` : '0.000 DT/h'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {o.roleRates && Object.keys(o.roleRates).length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {Object.entries(o.roleRates).map(([r, rate]: any) => (
                            <span key={r} className="px-1.5 py-0.5 bg-[#EBF2FF] text-[#1A56DB] text-[8px] font-black rounded font-mono border border-[#1A56DB]/10">
                              {r}: {parseFloat(rate as string).toFixed(3)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#ACA9A2] italic font-bold">Aucun tarif spécifique</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="px-2.5 py-1 rounded-lg bg-[#EBF2FF] text-[#1A56DB] text-sm font-black font-mono">
                          {assignedCount}
                        </div>
                        <span className="text-[10px] font-bold text-[#7A776F] uppercase">Agent{assignedCount > 1 ? 's' : ''}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEditingId(o.id)}
                          className="p-2 hover:bg-[#F1EDE5] rounded-xl text-[#7A776F] transition-all"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => onDelete(o.id)}
                          className="p-2 hover:bg-red-50 rounded-xl text-red-500 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
       </div>
    </div>
  );
};

// --- Atomic components ---

const StatCard = ({ icon, label, value, subValue }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-[#E4E0D8] shadow-sm hover:shadow-md transition-all">
    <div className="flex items-center gap-4 mb-4">
      <div className="w-12 h-12 bg-[#FAF8F4] rounded-2xl flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase text-[#ACA9A2] tracking-wider">{label}</p>
        <p className="text-2xl font-black text-[#14120E] font-mono tracking-tighter">{value}</p>
      </div>
    </div>
    <div className="text-[10px] text-[#7A776F] font-bold bg-[#FAF8F4] px-3 py-1.5 rounded-xl w-fit">
      {subValue}
    </div>
  </div>
);

const TabButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-white text-[#1A56DB] shadow-md' : 'text-[#7A776F] hover:text-[#14120E]'}`}
  >
    {icon}
    {label}
  </button>
);

const EmployeeCard = ({ employee, issuers, operations, isNew, isEditing, onSave, onUpdate, onDelete, onEdit, onCancel, selectedIssuerIds, leaveRequests, pointings }: any) => {
  const defaultIssuerId = (selectedIssuerIds && selectedIssuerIds.length > 0) ? selectedIssuerIds[0] : (issuers[0]?.id || '');
  
  // State for Edit/Create view
  const [form, setForm] = useState(() => {
    if (employee) {
      return {
        cin: '',
        cnss: '',
        hireDate: '',
        salary: 0,
        phone: '',
        address: '',
        birthDate: '',
        contractType: 'CDD',
        ...employee
      };
    }
    return {
      id: 'e-' + Date.now(),
      name: '',
      email: '',
      role: '',
      operationId: '',
      status: 'active',
      issuerId: defaultIssuerId,
      cin: '',
      cnss: '',
      hireDate: '',
      salary: 0,
      phone: '',
      address: '',
      birthDate: '',
      contractType: 'CDD'
    };
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdminFieldsForm, setShowAdminFieldsForm] = useState(false);
  
  // State for detail modal
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'stats' | 'leaves'>('profile');
  
  // Document generation state inside modal
  const [activeDoc, setActiveDoc] = useState<'none' | 'attestation' | 'contrat'>('none');
  
  // Leave request form state
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    type: 'payé' as const,
    reason: ''
  });
  const [isSavingLeave, setIsSavingLeave] = useState(false);

  if (isNew || isEditing) {
    const handleSave = async () => {
      if (!form.name.trim()) {
        alert("Le nom est obligatoire");
        return;
      }
      if ((form.role === 'Manager' || form.role === 'IT') && !form.email?.trim()) {
        alert("L'email est obligatoire pour un Manager ou IT");
        return;
      }
      if (!form.issuerId) {
        alert("L'entreprise est obligatoire");
        return;
      }
      
      setIsSubmitting(true);
      try {
        if (isNew) {
          await onSave(form);
        } else {
          await onUpdate(form);
        }
      } catch (error) {
        console.error("Save error:", error);
        alert("Erreur lors de l'enregistrement");
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="bg-white p-6 rounded-3xl border-2 border-[#1A56DB]/20 shadow-xl space-y-4">
         <div>
            <label className="text-[10px] font-black uppercase text-[#ACA9A2] mb-1.5 block">Nom de l'agent</label>
            <input 
              autoFocus
              placeholder="Ex: Mohamed Ben Ahmed"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              className="w-full h-11 px-4 rounded-xl bg-[#FAF8F4] border border-[#E4E0D8] font-bold text-xs focus:ring-2 focus:ring-[#1A56DB]/20 outline-none"
            />
         </div>
          <div>
            <label className="text-[10px] font-black uppercase text-[#ACA9A2] mb-1.5 block">Email (Requis pour Manager/IT)</label>
            <input 
              type="email"
              placeholder="email@exemple.com"
              value={form.email || ''}
              onChange={e => setForm({...form, email: e.target.value})}
              className="w-full h-11 px-4 rounded-xl bg-[#FAF8F4] border border-[#E4E0D8] font-bold text-xs focus:ring-2 focus:ring-[#1A56DB]/20 outline-none"
            />
         </div>
         <div className="grid grid-cols-2 gap-4">
           <div>
              <label className="text-[10px] font-black uppercase text-[#ACA9A2] mb-1.5 block">Poste occupé</label>
              <select 
                value={PREDEFINED_ROLES.includes(form.role) ? form.role : (form.role ? 'Autre' : '')}
                onChange={e => {
                  const val = e.target.value;
                  if (val === 'Autre') {
                    setForm({...form, role: ''});
                  } else {
                    setForm({...form, role: val});
                  }
                }}
                className="w-full h-11 px-4 rounded-xl bg-[#FAF8F4] border border-[#E4E0D8] font-bold text-xs focus:ring-2 focus:ring-[#1A56DB]/20 outline-none"
              >
                <option value="" disabled>Sélectionner un poste</option>
                {PREDEFINED_ROLES.map(role => (
                   <option key={role} value={role}>{role}</option>
                ))}
                <option value="Autre">Autre (Saisie libre)</option>
              </select>
           </div>
           <div>
              <label className="text-[10px] font-black uppercase text-[#ACA9A2] mb-1.5 block">Opération par défaut</label>
              <select 
                value={form.operationId || ''}
                onChange={e => setForm({...form, operationId: e.target.value})}
                className="w-full h-11 px-4 rounded-xl bg-[#FAF8F4] border border-[#E4E0D8] font-bold text-xs focus:ring-2 focus:ring-[#1A56DB]/20 outline-none"
              >
                <option value="">Aucune opération par défaut</option>
                {(operations || []).filter((o: any) => o.issuerId === form.issuerId).map((o: any) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
           </div>
         </div>

         {(!PREDEFINED_ROLES.includes(form.role) || form.role === 'Autre') && (
           <div>
             <label className="text-[10px] font-black uppercase text-[#ACA9A2] mb-1.5 block">Saisir un poste personnalisé...</label>
             <input 
               placeholder="Ex: Designer UI/UX"
               value={form.role === 'Autre' ? '' : form.role}
               onChange={e => setForm({...form, role: e.target.value})}
               className="w-full h-11 px-4 rounded-xl bg-[#FAF8F4] border border-[#E4E0D8] font-bold text-xs focus:ring-2 focus:ring-[#1A56DB]/20 outline-none"
             />
           </div>
         )}

         <div className="grid grid-cols-2 gap-4">
           <div>
              <label className="text-[10px] font-black uppercase text-[#ACA9A2] mb-1.5 block">Entreprise d'affectation</label>
              <select 
                value={form.issuerId}
                onChange={e => setForm({...form, issuerId: e.target.value})}
                className="w-full h-11 px-4 rounded-xl bg-[#FAF8F4] border border-[#E4E0D8] font-bold text-xs focus:ring-2 focus:ring-[#1A56DB]/20 outline-none"
              >
                {issuers.filter((i: any) => selectedIssuerIds?.includes(i.id)).map((i: any) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
           </div>
           <div>
              <label className="text-[10px] font-black uppercase text-[#ACA9A2] mb-1.5 block">Statut Actuel</label>
              <select 
                value={form.status}
                onChange={e => setForm({...form, status: e.target.value as any})}
                className="w-full h-11 px-4 rounded-xl bg-[#FAF8F4] border border-[#E4E0D8] font-bold text-xs focus:ring-2 focus:ring-[#1A56DB]/20 outline-none"
              >
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
           </div>
         </div>

         <div className="border-t border-[#E4E0D8] pt-3">
           <button
             type="button"
             onClick={() => setShowAdminFieldsForm(!showAdminFieldsForm)}
             className="w-full text-left py-2 font-black text-[10px] uppercase tracking-wider text-[#1A56DB] flex items-center gap-1 hover:underline"
           >
             {showAdminFieldsForm ? '▼ Masquer les infos administratives' : '► Afficher les infos administratives (CIN, CNSS, Contrat, Salaire...)'}
           </button>
           
           {showAdminFieldsForm && (
             <motion.div 
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: 1, height: 'auto' }}
               className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4"
             >
               <div>
                  <label className="text-[9px] font-black uppercase text-[#ACA9A2] mb-1 block">Numéro CIN (Tunisie)</label>
                  <input 
                    placeholder="Ex: 08976543 (8 chiffres)"
                    maxLength={8}
                    value={form.cin || ''}
                    onChange={e => setForm({...form, cin: e.target.value})}
                    className="w-full h-10 px-3 rounded-lg bg-[#FAF8F4] border border-[#E4E0D8] font-bold text-xs outline-none"
                  />
               </div>
               <div>
                  <label className="text-[9px] font-black uppercase text-[#ACA9A2] mb-1 block">Numéro CNSS</label>
                  <input 
                    placeholder="Ex: 12345678-90"
                    value={form.cnss || ''}
                    onChange={e => setForm({...form, cnss: e.target.value})}
                    className="w-full h-10 px-3 rounded-lg bg-[#FAF8F4] border border-[#E4E0D8] font-bold text-xs outline-none"
                  />
               </div>
               <div>
                  <label className="text-[9px] font-black uppercase text-[#ACA9A2] mb-1 block">Type de Contrat</label>
                  <select 
                    value={form.contractType || 'CDD'}
                    onChange={e => setForm({...form, contractType: e.target.value as any})}
                    className="w-full h-10 px-3 rounded-lg bg-[#FAF8F4] border border-[#E4E0D8] font-bold text-xs outline-none"
                  >
                    <option value="CDD">CDD - Contrat à Durée Déterminée</option>
                    <option value="CDI">CDI - Contrat à Durée Indéterminée</option>
                    <option value="SIVP">SIVP - Stage d'Initiation à la Vie Professionnelle</option>
                    <option value="Karama">Contrat Karama</option>
                    <option value="Autre">Autre type de contrat</option>
                  </select>
               </div>
               <div>
                  <label className="text-[9px] font-black uppercase text-[#ACA9A2] mb-1 block">Salaire Mensuel Brut (DT)</label>
                  <input 
                    type="number"
                    placeholder="Ex: 1200.000"
                    value={form.salary || 0}
                    onChange={e => setForm({...form, salary: parseFloat(e.target.value) || 0})}
                    className="w-full h-10 px-3 rounded-lg bg-[#FAF8F4] border border-[#E4E0D8] font-bold text-xs font-mono outline-none"
                  />
               </div>
               <div>
                  <label className="text-[9px] font-black uppercase text-[#ACA9A2] mb-1 block">Date d'Embauche</label>
                  <input 
                    type="date"
                    value={form.hireDate || ''}
                    onChange={e => setForm({...form, hireDate: e.target.value})}
                    className="w-full h-10 px-3 rounded-lg bg-[#FAF8F4] border border-[#E4E0D8] font-bold text-xs outline-none"
                  />
               </div>
               <div>
                  <label className="text-[9px] font-black uppercase text-[#ACA9A2] mb-1 block">Date de Naissance</label>
                  <input 
                    type="date"
                    value={form.birthDate || ''}
                    onChange={e => setForm({...form, birthDate: e.target.value})}
                    className="w-full h-10 px-3 rounded-lg bg-[#FAF8F4] border border-[#E4E0D8] font-bold text-xs outline-none"
                  />
               </div>
               <div>
                  <label className="text-[9px] font-black uppercase text-[#ACA9A2] mb-1 block">Numéro de Téléphone</label>
                  <input 
                    placeholder="Ex: 22 334 455"
                    value={form.phone || ''}
                    onChange={e => setForm({...form, phone: e.target.value})}
                    className="w-full h-10 px-3 rounded-lg bg-[#FAF8F4] border border-[#E4E0D8] font-bold text-xs outline-none"
                  />
               </div>
               <div>
                  <label className="text-[9px] font-black uppercase text-[#ACA9A2] mb-1 block">Adresse Nationale</label>
                  <input 
                    placeholder="Ex: 12 Avenue Habib Bourguiba, Tunis"
                    value={form.address || ''}
                    onChange={e => setForm({...form, address: e.target.value})}
                    className="w-full h-10 px-3 rounded-lg bg-[#FAF8F4] border border-[#E4E0D8] font-bold text-xs outline-none"
                  />
               </div>
             </motion.div>
           )}
         </div>

         <div className="flex gap-2 pt-2">
            <button 
              disabled={isSubmitting}
              onClick={handleSave} 
              className="flex-1 h-11 bg-[#1A56DB] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-[#1648C4] transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Enregistrer'}
            </button>
            <button onClick={onCancel} className="px-4 h-11 border border-[#E4E0D8] rounded-xl hover:bg-[#FAF8F4] transition-all"><X size={16}/></button>
         </div>
      </div>
    );
  }

  const issuer = issuers.find((i: any) => i.id === employee.issuerId);
  const assignedOp = (operations || []).find((o: any) => o.id === employee.operationId);
  
  // STATS computations for this employee
  const empPointings = pointings.filter((p: any) => p.employeeId === employee.id);
  const totalWorkedDays = empPointings.filter((p: any) => p.type === 'work').length;
  const totalWorkedHours = empPointings.filter((p: any) => p.type === 'work').reduce((acc: number, p: any) => acc + (p.hours || 0), 0);
  const totalLeaves = empPointings.filter((p: any) => p.type === 'leave').length;
  const totalAbsences = empPointings.filter((p: any) => p.type === 'absence').length;
  const totalOffs = empPointings.filter((p: any) => p.type === 'off').length;
  const totalHolidays = empPointings.filter((p: any) => p.type === 'holiday').length;
  
  const averageHoursPerDay = totalWorkedDays > 0 ? (totalWorkedHours / totalWorkedDays).toFixed(1) : '0.0';

  // Specific employee leaves
  const empLeaves = leaveRequests.filter((l: any) => l.employeeId === employee.id);

  // Submit leave request to Firebase
  const handleAddLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate) {
      alert("Veuillez remplir les dates de début et de fin.");
      return;
    }
    if (new Date(leaveForm.startDate) > new Date(leaveForm.endDate)) {
      alert("La date de début ne peut être supérieure à la date de fin.");
      return;
    }
    setIsSavingLeave(true);
    const leaveId = 'leave-' + Date.now();
    try {
      const newLeave: LeaveRequest = {
        id: leaveId,
        employeeId: employee.id,
        issuerId: employee.issuerId,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        type: leaveForm.type,
        status: 'pending',
        reason: leaveForm.reason,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'leave_requests', leaveId), newLeave);
      alert("Demande de congé déposée avec succès !");
      setLeaveForm({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        type: 'payé' as const,
        reason: ''
      });
      setShowLeaveForm(false);
    } catch (err: any) {
      alert("Erreur lors de la sauvegarde: " + err.message);
    } finally {
      setIsSavingLeave(false);
    }
  };

  const handleUpdateLeaveStatus = async (leaveId: string, value: 'approved' | 'rejected') => {
    if (!confirm(`Sûr de vouloir enregistrer cette décision (${value === 'approved' ? 'Approuvé' : 'Refusé'}) ?`)) return;
    try {
      await updateDoc(doc(db, 'leave_requests', leaveId), { status: value });
      
      // If approved, dynamically generate 8H Pointings for that range!
      if (value === 'approved') {
        const leave = empLeaves.find((l: any) => l.id === leaveId);
        if (leave) {
          const start = new Date(leave.startDate);
          const end = new Date(leave.endDate);
          const curr = new Date(start);
          while (curr <= end) {
            const dateStr = curr.toISOString().split('T')[0];
            const pointingId = `p-${employee.id}-${dateStr}`;
            await setDoc(doc(db, 'pointings', pointingId), {
              id: pointingId,
              employeeId: employee.id,
              issuerId: employee.issuerId,
              date: dateStr,
              type: 'leave',
              hours: 8,
              notes: `Congé approuvé d'office par validation du manager (${leave.type})`,
              updatedAt: new Date().toISOString()
            }, { merge: true });
            curr.setDate(curr.getDate() + 1);
          }
          alert("Congé approuvé ! Le pointage pour toute la période sur cette timesheet a été automatiquement enregistré en heures de 'Congé' (8h/jour).");
        }
      } else {
        alert("Demande rejetée.");
      }
    } catch (err: any) {
      alert("Erreur: " + err.message);
    }
  };

  const handleDeleteLeave = async (leaveId: string) => {
    if (!confirm("Voulez-vous supprimer cette demande de congé ?")) return;
    try {
      await deleteDoc(doc(db, 'leave_requests', leaveId));
      alert("Demande supprimée avec succès.");
    } catch (err: any) {
      alert("Erreur lors de la suppression: " + err.message);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-[#E4E0D8] shadow-sm hover:shadow-md transition-all group">
       <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-[#EBF2FF] text-[#1A56DB] rounded-2xl flex items-center justify-center text-lg font-black uppercase">
            {employee.name.charAt(0)}
          </div>
          <div className="flex gap-1 transition-all">
             <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 hover:bg-[#F1EDE5] rounded-lg text-[#7A776F] transition-colors" title="Modifier l'employé"><Edit2 size={14} /></button>
             <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 hover:bg-[#C0280F]/10 rounded-lg text-[#C0280F] transition-colors" title="Supprimer l'employé"><Trash2 size={14} /></button>
          </div>
       </div>
       <h3 className="text-sm font-black text-[#14120E] mb-1">{employee.name}</h3>
       <div className="flex flex-col gap-1 mb-3">
         <p className="text-[10px] font-bold text-[#ACA9A2] uppercase tracking-widest">{employee.role}</p>
         {assignedOp && (
           <span className="text-[9px] font-black text-[#0E7866] bg-[#E6F8F4] px-2 py-0.5 rounded w-fit uppercase">{assignedOp.name}</span>
         )}
       </div>

       <div className="flex items-center justify-between pt-3 border-t border-[#E4E0D8] mt-3">
          <div className="flex items-center gap-1.5 max-w-[60%]">
             <div className="w-4.5 h-4.5 rounded-full bg-[#EBF2FF] flex items-center justify-center shrink-0">
                <Briefcase size={9} className="text-[#1A56DB]"/>
             </div>
             <span className="text-[9px] font-bold text-[#7A776F] truncate">{issuer?.name || '—'}</span>
          </div>
          <button 
            type="button"
            onClick={() => { setShowDetails(true); setActiveTab('profile'); }}
            className="px-3 py-1.5 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl text-[8.5px] font-black uppercase text-[#1A56DB] tracking-wider hover:bg-[#1A56DB] hover:text-white transition-all flex items-center gap-1 shrink-0"
          >
            <Eye size={10} /> Profil & Stats
          </button>
       </div>

       {/* --- DETAILED PROFILE MODAL & LEAVE PORTAL --- */}
       <AnimatePresence>
         {showDetails && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 md:p-8 backdrop-blur-xs overflow-y-auto">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="bg-[#FAF8F4] w-full max-w-5xl rounded-[2rem] border border-[#E4E0D8] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-left"
             >
                {/* Modal Header */}
                <div className="p-6 md:p-8 bg-white border-b border-[#E4E0D8] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#1A56DB] text-white rounded-2xl flex items-center justify-center text-xl font-black">
                      {employee.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-[#14120E] uppercase tracking-tighter">{employee.name}</h2>
                        <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-md ${employee.status === 'active' ? 'bg-[#E6F8F4] text-[#0E7866] border border-[#0E7866]/10' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                          {employee.status === 'active' ? 'COLLABORATEUR ACTIF' : 'INACTIF'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[#7A776F] uppercase tracking-wide">{employee.role} • {issuer?.name}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowDetails(false)}
                    className="p-3 bg-[#FAF8F4] border border-[#E4E0D8] rounded-2xl hover:bg-gray-100 transition-all text-[#7A776F] hover:text-black shrink-0 self-end md:self-auto"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Sub-navigation tabs */}
                <div className="px-6 md:px-8 py-2 bg-white border-b border-[#E4E0D8] flex gap-2 overflow-x-auto custom-scrollbar whitespace-nowrap">
                  <button 
                    onClick={() => { setActiveTab('profile'); setActiveDoc('none'); }}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'profile' ? 'bg-[#1A56DB] text-white shadow-md' : 'text-[#7A776F] hover:bg-[#FAF8F4] hover:text-[#14120E]'}`}
                  >
                    <UserCheck className="inline mr-1" size={13} /> Profil & Documents administratifs
                  </button>
                  <button 
                    onClick={() => { setActiveTab('stats'); setActiveDoc('none'); }}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'stats' ? 'bg-[#1A56DB] text-white shadow-md' : 'text-[#7A776F] hover:bg-[#FAF8F4] hover:text-[#14120E]'}`}
                  >
                    <TrendingUp className="inline mr-1" size={13} /> Suivi des pointages & Statistiques
                  </button>
                  <button 
                    onClick={() => { setActiveTab('leaves'); setActiveDoc('none'); }}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'leaves' ? 'bg-[#1A56DB] text-white shadow-md' : 'text-[#7A776F] hover:bg-[#FAF8F4] hover:text-[#14120E]'}`}
                  >
                    <CalendarDays className="inline mr-1" size={13} /> Demandes de congés ({empLeaves.length})
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                   {activeTab === 'profile' && (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                        {/* Administrative card */}
                        <div className="lg:col-span-2 bg-white rounded-3xl border border-[#E4E0D8] p-6 space-y-4 shadow-sm">
                           <div className="flex items-center gap-2 pb-3 border-b border-[#FAF8F4]">
                              <Award className="text-[#1A56DB]" size={18} />
                              <h3 className="text-xs font-black uppercase tracking-wider text-[#14120E]">Fiche administrative de l'employé</h3>
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-xs">
                              <div>
                                 <span className="text-[9px] uppercase tracking-widest text-[#ACA9A2] font-black block">Nationalité & CIN</span>
                                 <span className="font-bold text-[#14120E] text-sm">{employee.cin ? `Tunisienne, CIN N° ${employee.cin}` : 'Non saisi'}</span>
                              </div>
                              <div>
                                 <span className="text-[9px] uppercase tracking-widest text-[#ACA9A2] font-black block">Numéro de Sécurité Sociale (CNSS)</span>
                                 <span className="font-bold text-[#14120E] text-sm">{employee.cnss || 'Non saisi'}</span>
                              </div>
                              <div>
                                 <span className="text-[9px] uppercase tracking-widest text-[#ACA9A2] font-black block">Date de Naissance</span>
                                 <span className="font-bold text-[#14120E] text-sm">{employee.birthDate ? new Date(employee.birthDate).toLocaleDateString('fr-FR') : 'Non saisi'}</span>
                              </div>
                              <div>
                                 <span className="text-[9px] uppercase tracking-widest text-[#ACA9A2] font-black block">Date de recrutement</span>
                                 <span className="font-bold text-[#14120E] text-sm">{employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('fr-FR') : 'Non saisi'}</span>
                              </div>
                              <div>
                                 <span className="text-[9px] uppercase tracking-widest text-[#ACA9A2] font-black block">Catégorie de Contrat</span>
                                 <span className="px-2 py-0.5 bg-[#FAF8F4] border border-[#E4E0D8] rounded font-mono text-[10px] font-black uppercase text-[#1A56DB] w-fit block mt-1">
                                    {employee.contractType || 'CDD'}
                                 </span>
                              </div>
                              <div>
                                 <span className="text-[9px] uppercase tracking-widest text-[#ACA9A2] font-black block">Salaire Mensuel Brut</span>
                                 <span className="font-mono font-black text-sm text-[#0E7866]">{employee.salary ? `${employee.salary.toFixed(3)} DT` : 'Non saisi'}</span>
                              </div>
                              <div className="sm:col-span-2 border-t border-[#FAF8F4] pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <span className="text-[9px] uppercase tracking-widest text-[#ACA9A2] font-black block">Adresse e-mail professionnelle</span>
                                    <span className="font-bold text-[#14120E]">{employee.email || '—'}</span>
                                 </div>
                                 <div>
                                    <span className="text-[9px] uppercase tracking-widest text-[#ACA9A2] font-black block">Numéro de Téléphone</span>
                                    <span className="font-bold text-[#14120E]">{employee.phone || '—'}</span>
                                 </div>
                              </div>
                              <div className="sm:col-span-2">
                                 <span className="text-[9px] uppercase tracking-widest text-[#ACA9A2] font-black block">Adresse d'habitation</span>
                                 <span className="font-bold text-[#14120E]">{employee.address || '—'}</span>
                              </div>
                           </div>
                           
                           <div className="pt-4 border-t border-[#FAF8F4] flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#FFF1EE]/20 p-4 rounded-2xl border border-[#C0280F]/10 gap-3">
                             <div>
                               <p className="text-[10px] uppercase font-black text-[#C0280F] tracking-wider">Zone de danger</p>
                               <p className="text-[9px] text-[#7A776F] font-bold">Cette action supprimera définitivement le profil de l'employé.</p>
                             </div>
                             <button
                               type="button"
                               onClick={() => {
                                 setShowDetails(false);
                                 onDelete();
                               }}
                               className="px-4 py-2 bg-[#C0280F] hover:bg-[#A0200C] text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-md active:scale-95"
                             >
                               <Trash2 size={12} /> Supprimer l'employé
                             </button>
                           </div>
                        </div>

                        {/* Legal documents operations */}
                        <div className="bg-white rounded-3xl border border-[#E4E0D8] p-6 space-y-4 shadow-sm flex flex-col justify-between">
                           <div>
                              <div className="flex items-center gap-2 pb-3 border-b border-[#FAF8F4] mb-4">
                                 <FileText className="text-[#9D38FB]" size={18} />
                                 <h3 className="text-xs font-black uppercase tracking-wider text-[#14120E]">Générateur de documents</h3>
                              </div>
                              <p className="text-[11px] text-[#7A776F] font-bold leading-relaxed">
                                Produisez, imprimez ou exportez instantanément les documents officiels conformes à la réglementation tunisienne.
                              </p>
                           </div>

                           <div className="space-y-3">
                              <button
                                onClick={() => setActiveDoc('attestation')}
                                className="w-full py-3 px-4 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl font-black text-[10px] uppercase tracking-widest text-[#14120E] hover:bg-[#1A56DB] hover:text-white hover:border-[#1A56DB] transition-all flex items-center justify-between"
                              >
                                 <span>📜 Attestation de Travail</span>
                                 <span>➔</span>
                              </button>
                              
                              <button
                                onClick={() => setActiveDoc('contrat')}
                                className="w-full py-3 px-4 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl font-black text-[10px] uppercase tracking-widest text-[#14120E] hover:bg-[#1A56DB] hover:text-white hover:border-[#1A56DB] transition-all flex items-center justify-between"
                              >
                                 <span>✍ Contrat Tunisien ({employee.contractType || 'CDD'})</span>
                                 <span>➔</span>
                              </button>
                           </div>
                           
                           <div className="p-3 bg-blue-50/50 border border-blue-500/10 rounded-2xl text-[10px] text-blue-900 font-bold leading-relaxed">
                              💡 Les documents récupèrent automatiquement les informations saisies lors de la modification de l'employé.
                           </div>
                        </div>
                     </div>
                   )}

                   {activeTab === 'stats' && (
                     <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Attendance visual ledger */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                           <div className="bg-white p-4 rounded-2xl border border-[#E4E0D8] shadow-xs text-center">
                              <span className="text-[8px] uppercase tracking-widest text-[#ACA9A2] font-black block mb-1">Présences</span>
                              <span className="text-xl font-black text-[#0E7866] font-mono">{totalWorkedDays} jours</span>
                              <span className="text-[10px] text-[#7A776F] font-bold block mt-1">({totalWorkedHours}H de prod.)</span>
                           </div>
                           <div className="bg-white p-4 rounded-2xl border border-[#E4E0D8] shadow-xs text-center">
                              <span className="text-[8px] uppercase tracking-widest text-[#ACA9A2] font-black block mb-1">Congés</span>
                              <span className="text-xl font-black text-[#1A56DB] font-mono">{totalLeaves} jours</span>
                              <span className="text-[10px] text-[#7A776F] font-bold block mt-1">Payés ou maladie</span>
                           </div>
                           <div className="bg-white p-4 rounded-2xl border border-[#E4E0D8] shadow-xs text-center">
                              <span className="text-[8px] uppercase tracking-widest text-[#ACA9A2] font-black block mb-1">Absences</span>
                              <span className="text-xl font-black text-[#C0280F] font-mono">{totalAbsences} jours</span>
                              <span className="text-[10px] text-red-500 font-bold block mt-1">Injustifiées</span>
                           </div>
                           <div className="bg-white p-4 rounded-2xl border border-[#E4E0D8] shadow-xs text-center">
                              <span className="text-[8px] uppercase tracking-widest text-[#ACA9A2] font-black block mb-1">Repos appliqués</span>
                              <span className="text-xl font-black text-[#7A776F] font-mono">{totalOffs} repos</span>
                              <span className="text-[10px] text-[#7A776F] font-bold block mt-1">Week-ends & Off</span>
                           </div>
                           <div className="bg-white p-4 rounded-2xl border border-[#E4E0D8] shadow-xs text-center col-span-2 md:col-span-1">
                              <span className="text-[8px] uppercase tracking-widest text-[#ACA9A2] font-black block mb-1">Moyenne journalière</span>
                              <span className="text-xl font-black text-[#9D38FB] font-mono">{averageHoursPerDay}H/j</span>
                              <span className="text-[10px] text-[#7A776F] font-bold block mt-1">Productivité</span>
                           </div>
                        </div>

                        {/* Recent ledger records */}
                        <div className="bg-white rounded-3xl border border-[#E4E0D8] shadow-xs overflow-hidden">
                           <div className="p-4 border-b border-[#E4E0D8] bg-[#FAF8F4]/20 flex justify-between items-center text-xs">
                              <span className="font-black uppercase tracking-wider text-[#14120E]">Historique récent de pointage</span>
                              <span className="text-[10px] text-[#7A776F] font-bold">{empPointings.length} pointages recensés</span>
                           </div>
                           <div className="max-h-[300px] overflow-y-auto divide-y divide-[#E4E0D8] custom-scrollbar">
                              {empPointings.length === 0 ? (
                                <div className="p-8 text-center text-xs text-[#ACA9A2] font-bold italic">
                                   Aucun log de pointage pour cet agent dans l'historique de la base de données.
                                </div>
                              ) : (
                                empPointings.slice(-15).reverse().map((p: any) => (
                                  <div key={p.id} className="p-3 text-xs flex justify-between items-center hover:bg-[#FAF8F4]/30">
                                     <div className="flex items-center gap-3">
                                        <div className={`px-2 py-1.5 rounded-lg font-mono text-[9px] font-black uppercase ${
                                          p.type === 'work' ? 'bg-[#E6F8F4] text-[#0E7866]' :
                                          p.type === 'leave' ? 'bg-[#EBF2FF] text-[#1A56DB]' :
                                          p.type === 'absence' ? 'bg-[#FFF1EE] text-[#C0280F]' :
                                          'bg-[#FAF8F4] text-[#7A776F]'
                                        }`}>
                                           {p.type === 'work' ? 'Présent' :
                                            p.type === 'leave' ? 'Congé' :
                                            p.type === 'absence' ? 'Absence' :
                                            p.type === 'off' ? 'Repos' : 'Férié'}
                                        </div>
                                        <div>
                                           <span className="font-bold text-[#14120E]">{new Date(p.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                           {p.notes && <p className="text-[9px] text-[#ACA9A2] font-medium leading-tight mt-0.5">{p.notes}</p>}
                                        </div>
                                     </div>
                                     <div className="text-right font-mono font-bold text-[#14120E]">
                                        {p.hours} heures
                                     </div>
                                  </div>
                                ))
                              )}
                           </div>
                        </div>
                     </div>
                   )}

                   {activeTab === 'leaves' && (
                     <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center bg-white p-5 rounded-3xl border border-[#E4E0D8] shadow-xs">
                           <div>
                              <h3 className="text-xs font-black uppercase text-[#14120E]">Suivi des Congés</h3>
                              <p className="text-[10px] text-[#ACA9A2] font-medium mt-0.5">Demandes d'abscences et congés officiels</p>
                           </div>
                           
                           {!showLeaveForm ? (
                             <button
                               onClick={() => setShowLeaveForm(true)}
                               className="px-4 py-2 bg-[#1A56DB] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#1648C4] flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                             >
                                <Plus size={12} /> Déposer un congé
                             </button>
                           ) : (
                             <button
                               onClick={() => setShowLeaveForm(false)}
                               className="px-3 py-2 border border-[#E4E0D8] rounded-xl text-[10px] font-black uppercase text-[#7A776F] hover:bg-[#FAF8F4] transition-all"
                             >
                                Annuler
                             </button>
                           )}
                        </div>

                        {showLeaveForm && (
                          <motion.form 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onSubmit={handleAddLeaveRequest}
                            className="bg-white p-6 rounded-3xl border border-[#1A56DB]/20 shadow-md space-y-4"
                          >
                             <h4 className="text-[10px] font-black uppercase text-[#1A56DB] tracking-widest pb-2 border-b border-[#FAF8F4]">Nouvelle Demande de Congé</h4>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                   <label className="text-[9px] font-black uppercase text-[#ACA9A2] mb-1 block">Date de Début</label>
                                   <input 
                                     type="date"
                                     required
                                     value={leaveForm.startDate}
                                     onChange={e => setLeaveForm({...leaveForm, startDate: e.target.value})}
                                     className="w-full h-10 px-3 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl font-bold text-xs outline-none focus:ring-1 focus:ring-[#1A56DB]"
                                   />
                                </div>
                                <div>
                                   <label className="text-[9px] font-black uppercase text-[#ACA9A2] mb-1 block">Date de Fin (Inclus)</label>
                                   <input 
                                     type="date"
                                     required
                                     value={leaveForm.endDate}
                                     onChange={e => setLeaveForm({...leaveForm, endDate: e.target.value})}
                                     className="w-full h-10 px-3 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl font-bold text-xs outline-none focus:ring-1 focus:ring-[#1A56DB]"
                                   />
                                </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                   <label className="text-[9px] font-black uppercase text-[#ACA9A2] mb-1 block">Type de congé</label>
                                   <select
                                     value={leaveForm.type}
                                     onChange={e => setLeaveForm({...leaveForm, type: e.target.value as any})}
                                     className="w-full h-10 px-3 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl font-bold text-xs outline-none"
                                   >
                                      <option value="payé">Congé Annuel Payé</option>
                                      <option value="maladie">Congé Maladie</option>
                                      <option value="maternité">Congé Maternité / Paternité</option>
                                      <option value="sans_solde">Congé Sans Solde</option>
                                      <option value="exceptionnel">Congé Exceptionnel (Circonstances)</option>
                                   </select>
                                </div>
                                <div>
                                   <label className="text-[9px] font-black uppercase text-[#ACA9A2] mb-1 block">Raison / Commentaire</label>
                                   <input 
                                     placeholder="Ex: Raisons familiales / Certificat médical"
                                     value={leaveForm.reason}
                                     onChange={e => setForm({...form})} // no-op check to ensure focus is held safely
                                     onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
                                     className="w-full h-10 px-3 bg-[#FAF8F4] border border-[#E4E0D8] rounded-xl font-bold text-xs outline-none"
                                   />
                                </div>
                             </div>

                             <div className="flex justify-end pt-2">
                                <button
                                  type="submit"
                                  disabled={isSavingLeave}
                                  className="px-6 h-10 bg-[#1A56DB] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
                                >
                                   {isSavingLeave ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Enregistrer le Congé'}
                                </button>
                             </div>
                          </motion.form>
                        )}

                        <div className="bg-white rounded-3xl border border-[#E4E0D8] overflow-hidden shadow-xs">
                           <table className="w-full text-left">
                              <thead>
                                 <tr className="bg-[#FAF8F4] border-b border-[#E4E0D8]">
                                    <th className="px-5 py-3 text-[9px] font-black uppercase text-[#7A776F] tracking-wide">Période</th>
                                    <th className="px-5 py-3 text-[9px] font-black uppercase text-[#7A776F] tracking-wide">Type</th>
                                    <th className="px-5 py-3 text-[9px] font-black uppercase text-[#7A776F] tracking-wide">Raison</th>
                                    <th className="px-5 py-3 text-[9px] font-black uppercase text-[#7A776F] tracking-wide text-center">Statut</th>
                                    <th className="px-5 py-3 text-[9px] font-black uppercase text-[#7A776F] tracking-wide text-right">Actions</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E4E0D8] text-xs">
                                 {empLeaves.length === 0 ? (
                                   <tr>
                                      <td colSpan={5} className="p-8 text-center text-[#ACA9A2] font-bold italic">
                                         Aucune demande de congé déposée pour l'instant.
                                      </td>
                                   </tr>
                                 ) : (
                                   empLeaves.map((leave: any) => (
                                     <tr key={leave.id} className="hover:bg-[#FAF8F4]/30 transition-colors">
                                        <td className="px-5 py-3.5 font-bold">
                                           Du {new Date(leave.startDate).toLocaleDateString('fr-FR')} au {new Date(leave.endDate).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className="px-5 py-3.5 capitalize font-bold text-[#14120E]">
                                           {leave.type === 'payé' ? 'Annuel Payé' :
                                            leave.type === 'maladie' ? 'Maladie' :
                                            leave.type === 'maternité' ? 'Maternité / Paternité' :
                                            leave.type === 'sans_solde' ? 'Sans Solde' : 'Exceptionnel'}
                                        </td>
                                        <td className="px-5 py-3.5 text-[#7A776F] max-w-[200px] truncate" title={leave.reason}>
                                           {leave.reason || '—'}
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                           <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                                             leave.status === 'approved' ? 'bg-[#E6F8F4] text-[#0E7866] border border-[#0E7866]/10' :
                                             leave.status === 'rejected' ? 'bg-[#FFF1EE] text-[#C0280F] border border-[#C0280F]/10' :
                                             'bg-[#FFF4E5] text-[#B25E09] border border-[#B25E09]/15'
                                           }`}>
                                              {leave.status === 'approved' ? 'Approuvé' :
                                               leave.status === 'rejected' ? 'Refusé' : 'En attente'}
                                           </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                           <div className="flex justify-end gap-1.5">
                                              {leave.status === 'pending' && (
                                                <>
                                                  <button 
                                                    onClick={() => handleUpdateLeaveStatus(leave.id, 'approved')}
                                                    className="p-1.5 bg-[#E6F8F4] text-[#0E7866] rounded-lg hover:opacity-80"
                                                    title="Approuver"
                                                  >
                                                     <Check size={12} />
                                                  </button>
                                                  <button 
                                                    onClick={() => handleUpdateLeaveStatus(leave.id, 'rejected')}
                                                    className="p-1.5 bg-[#FFF1EE] text-[#C0280F] rounded-lg hover:opacity-80"
                                                    title="Rejeter"
                                                  >
                                                     <X size={12} />
                                                  </button>
                                                </>
                                              )}
                                              <button 
                                                onClick={() => handleDeleteLeave(leave.id)}
                                                className="p-1.5 hover:bg-gray-100 rounded-lg text-[#ACA9A2] hover:text-[#C0280F]"
                                                title="Supprimer"
                                              >
                                                 <Trash2 size={12} />
                                              </button>
                                           </div>
                                        </td>
                                     </tr>
                                   ))
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>
                   )}
                </div>

                {/* Document overlay iframe-free printing utility */}
                {activeDoc === 'attestation' && (
                  <AttestationDocument employee={employee} issuer={issuer} onClose={() => setActiveDoc('none')} />
                )}
                {activeDoc === 'contrat' && (
                  <ContratDocument employee={employee} issuer={issuer} onClose={() => setActiveDoc('none')} />
                )}
             </motion.div>
           </div>
         )}
       </AnimatePresence>
    </div>
  );
};

// --- Tunisian Legal Certificate and Contract printable components ---

const AttestationDocument = ({ employee, issuer, onClose }: any) => {
  const currentDate = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const documentRef = React.useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = React.useState(false);

  const handlePrint = () => {
    window.print();
  };

  const exportPDF = async () => {
    if (!documentRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(documentRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Attestation_de_Travail_${employee.name.replace(/ /g, '_')}.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-[110] flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs font-sans">
       <style>{`
         @media print {
           body * {
             visibility: hidden !important;
           }
           #print-area, #print-area * {
             visibility: visible !important;
           }
           #print-area {
             position: absolute !important;
             left: 0 !important;
             top: 0 !important;
             width: 100% !important;
             background: white !important;
             box-shadow: none !important;
             margin: 0 !important;
             padding: 40px !important;
             color: black !important;
           }
         }
       `}</style>
       <div className="bg-[#FAF8F4] rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative border border-[#E4E0D8] leading-relaxed flex flex-col max-h-[90vh]">
          {/* Header toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-center pb-4 mb-4 border-b border-[#E4E0D8] print:hidden gap-3 flex-shrink-0">
             <div className="flex items-center gap-2">
                <span className="text-lg">📜</span>
                <h4 className="text-xs font-black uppercase text-[#14120E] tracking-wider">Attestation de Travail</h4>
             </div>
             <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                <button 
                  onClick={exportPDF}
                  disabled={exporting}
                  className="px-4 py-2.5 bg-[#0E7866] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#0a5c4e] flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Exporter PDF
                </button>
                <button 
                  onClick={handlePrint}
                  className="px-4 py-2.5 bg-[#1A56DB] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#1648C4] flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                >
                  <Printer size={12} /> Imprimer
                </button>
                <button 
                  onClick={onClose} 
                  className="px-4 py-2.5 bg-[#C0280F] hover:bg-[#A0200C] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                  title="Fermer la Fiche"
                >
                  <X size={12} /> Fermer
                </button>
             </div>
          </div>
          
          {/* Printable page sheet */}
          <div ref={documentRef} id="print-area" className="flex-1 bg-white p-6 md:p-10 text-black text-[12px] text-justify space-y-8 overflow-y-auto print:overflow-visible shadow-sm border border-[#E4E0D8]/40 rounded-xl">
             {/* Dynamic Company Letterhead Header */}
             <div className="flex justify-between items-start pb-6 border-b-2 border-black/80">
                <div className="space-y-0.5">
                   <h2 className="font-serif font-black text-xs md:text-sm uppercase tracking-tight text-black">{issuer?.name || 'LA SOCIÉTÉ'}</h2>
                   <div className="text-[9px] sm:text-[10px] text-gray-500 font-semibold space-y-0.5 leading-normal pt-1">
                      <p><strong>Adresse :</strong> {issuer?.address || 'Tunis, Tunisie'}</p>
                      {issuer?.mf && <p><strong>Matricule Fiscal (M.F.) :</strong> {issuer.mf}</p>}
                      {issuer?.rc && <p><strong>Registre National des Entreprises (R.N.E / R.C.) :</strong> {issuer.rc}</p>}
                      {issuer?.phone && <p><strong>Tél :</strong> {issuer.phone}</p>}
                      {issuer?.email && <p><strong>E-mail :</strong> {issuer.email}</p>}
                   </div>
                </div>
                <div className="text-right flex flex-col items-end">
                   <p className="text-[10px] text-gray-600 font-bold mb-1">TUNIS, LE {currentDate.toUpperCase()}</p>
                   <span className="text-[8px] uppercase font-black tracking-widest text-[#1A56DB] bg-blue-50 px-1.5 py-0.5 rounded print:hidden border border-blue-100">Document RH Officiel</span>
                </div>
             </div>

             <div className="text-center my-10">
                <h1 className="text-[17px] font-black uppercase tracking-widest border-b-2 border-black pb-2 w-fit mx-auto font-serif">ATTESTATION DE TRAVAIL</h1>
             </div>

             <div className="space-y-4 leading-loose text-gray-900 text-sm">
                <p>
                   Je soussigné, Gérant de la société <strong className="text-black font-extrabold">{issuer?.name || '________________'}</strong>, certifie par la présente que :
                </p>
                <p>
                   Monsieur/Madame <strong className="text-black uppercase text-[14px] tracking-tight">{employee.name}</strong>, de nationalité Tunisienne, titulaire de la Carte d’Identité Nationale (CIN) n° <strong className="text-black font-semibold">{employee.cin || '______________'}</strong>, est employé(e) au sein de notre société depuis le <strong className="text-black font-semibold">{employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('fr-FR') : '______________'}</strong>.
                </p>
                <p>
                   L'intéressé(e) occupe actuellement le poste de <strong className="text-black font-semibold uppercase">{employee.role || '______________'}</strong> sous le régime d'un contrat <strong className="text-black font-bold uppercase">{employee.contractType || 'CDD'}</strong>.
                </p>
                <p>
                   La présente attestation est délivrée à l'intéressé(e) pour servir et faire valoir ce que de droit, à sa demande.
                </p>
             </div>

             <div className="flex justify-end mt-20 pr-8 pt-8">
                <div className="text-center space-y-16">
                   <p className="text-[10px] font-black uppercase text-gray-600">Pour la Direction de la société {issuer?.name || ''}<br/>Signature & Cachet de l'Entreprise</p>
                   <div className="w-36 h-0.5 border-t border-dashed border-gray-400 mx-auto"></div>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

const ContratDocument = ({ employee, issuer, onClose }: any) => {
  const currentDate = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const hireDateStr = employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('fr-FR') : 'xx/xx/xxxx';
  const documentRef = React.useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = React.useState(false);
  
  const handlePrint = () => {
    window.print();
  };

  const exportPDF = async () => {
    if (!documentRef.current) return;
    setExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const childPages = documentRef.current.children;
      
      let isFirst = true;
      for (let i = 0; i < childPages.length; i++) {
        const pageEl = childPages[i] as HTMLElement;
        if (!pageEl.classList.contains('print-page-break')) continue;
        
        const canvas = await html2canvas(pageEl, { scale: 1.8 });
        const imgData = canvas.toDataURL('image/png');
        
        if (!isFirst) {
          pdf.addPage();
        }
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        isFirst = false;
      }
      pdf.save(`Contrat_de_Travail_${employee.name.replace(/ /g, '_')}.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
    } finally {
      setExporting(false);
    }
  };

  // Convert contract type to readable French text
  let contractFullName = "Contrat de Travail à Durée Indéterminée (CDI)";
  if (employee.contractType === "CDD") contractFullName = "Contrat de Travail à Durée Déterminée (CDD)";
  if (employee.contractType === "SIVP") contractFullName = "Contrat de Stage SIVP (Initiation à la Vie Professionnelle)";
  if (employee.contractType === "Karama") contractFullName = "Contrat de Travail d'Insertion Professionnelle (Karama)";

  return (
    <div className="fixed inset-0 bg-black/75 z-[110] flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs font-sans">
       <style>{`
         @media print {
           body * {
             visibility: hidden !important;
           }
           #print-area-contract, #print-area-contract * {
             visibility: visible !important;
           }
           #print-area-contract {
             position: absolute !important;
             left: 0 !important;
             top: 0 !important;
             width: 100% !important;
             background: white !important;
             box-shadow: none !important;
             margin: 0 !important;
             padding: 0 !important;
             color: black !important;
           }
           .print-page-break {
             page-break-after: always !important;
             break-after: page !important;
             height: 100vh !important;
             border: none !important;
             box-shadow: none !important;
             margin: 0 !important;
             padding: 40px !important;
           }
         }
       `}</style>
       <div className="bg-[#FAF8F4] rounded-[2rem] max-w-4xl w-full p-6 shadow-2xl relative border border-[#E4E0D8] flex flex-col max-h-[92vh]">
          {/* Header toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-center pb-4 mb-4 border-b border-[#E4E0D8] print:hidden gap-3 flex-shrink-0">
             <div className="flex items-center gap-2">
                <span className="text-xl">✍</span>
                <div>
                   <h4 className="text-xs font-black uppercase text-[#14120E] tracking-wider">Contrat Tunisien</h4>
                   <p className="text-[10px] text-gray-500 font-bold uppercase">Format Prêt pour Impression physique / Export PDF A4</p>
                </div>
             </div>
             <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                <button 
                  onClick={exportPDF}
                  disabled={exporting}
                  className="px-4 py-2.5 bg-[#0E7866] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#0a5c4e] flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Exporter PDF
                </button>
                <button 
                  onClick={handlePrint}
                  className="px-4 py-2.5 bg-[#1A56DB] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#1648C4] flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                >
                  <Printer size={12} /> Imprimer (4 pages)
                </button>
                <button 
                  onClick={onClose} 
                  className="px-4 py-2.5 bg-[#C0280F] hover:bg-[#A0200C] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                  title="Fermer la Fiche"
                >
                  <X size={12} /> Fermer
                </button>
             </div>
          </div>
          
          {/* Printable page sheet (vertical scrolling of elegant pages on screen) */}
          <div ref={documentRef} id="print-area-contract" className="flex-1 overflow-y-auto space-y-6 max-h-[80vh] custom-scrollbar px-2">
             
             {/* ================= PAGE 1 ================= */}
             <div className="print-page-break bg-white border border-gray-200 shadow-sm mx-auto p-10 md:p-14 max-w-[21cm] min-h-[29.7cm] flex flex-col justify-between rounded-xl">
                <div>
                   {/* Letterhead on Page 1 */}
                   <div className="flex justify-between items-start pb-6 border-b border-gray-100">
                      <div>
                         <h2 className="font-serif font-black text-xs md:text-sm uppercase text-black">{issuer?.name || 'SOCIÉTÉ'}</h2>
                         <p className="text-[9px] text-[#7A776F] font-bold">Matricule Fiscal: {issuer?.mf || 'Non saisi'}</p>
                         <p className="text-[9px] text-[#7A776F] font-bold">R.C: {issuer?.rc || 'Non saisi'}</p>
                      </div>
                      <div className="text-right">
                         <span className="text-[8px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-black border border-emerald-100">Page 1 / 4</span>
                      </div>
                   </div>

                   <div className="text-center my-14 space-y-4">
                      <h1 className="text-[18px] md:text-[20px] font-black uppercase tracking-tight text-gray-900 leading-normal font-serif">
                         CONTRAT DE TRAVAIL À DURÉE<br/>
                         {employee.contractType === 'CDI' ? 'INDÉTERMINÉE (CDI)' : `DÉTERMINÉE (${(employee.contractType || 'CDD').toUpperCase()})`}
                      </h1>
                      <div className="h-0.5 w-1/4 bg-gray-900 mx-auto"></div>
                      <p className="text-xs font-extrabold text-gray-500 uppercase">SOCIÉTÉ : {issuer?.name?.toUpperCase() || '______________'}</p>
                   </div>

                   <div className="space-y-6 pt-4 text-xs md:text-sm text-justify text-gray-950">
                      <h2 className="font-extrabold text-[#14120E] border-b pb-1.5 uppercase text-[11px] tracking-wide">ENTRE LES SOUSSIGNÉS :</h2>
                      
                      <div className="space-y-2">
                         <h3 className="font-black text-black">L’EMPLOYEUR</h3>
                         <div className="pl-4 space-y-1 font-semibold leading-relaxed border-l-2 border-blue-600/40">
                            <p><strong>Nom et Prénom :</strong> Mensi Haythem</p>
                            <p><strong>Agissant en qualité de :</strong> Gérant</p>
                            <p><strong>Société :</strong> {issuer?.name || '________________'}</p>
                            <p><strong>Adresse :</strong> {issuer?.address || '________________'}</p>
                            <p><strong>Identifiant unique (M.F.) :</strong> {issuer?.mf || '________________'}</p>
                         </div>
                      </div>

                      <div className="py-2 flex items-center justify-center gap-3">
                         <span className="h-px bg-gray-200 flex-grow"></span>
                         <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">ET</span>
                         <span className="h-px bg-gray-200 flex-grow"></span>
                      </div>

                      <div className="space-y-2">
                         <h3 className="font-black text-black">L’EMPLOYÉ(E)</h3>
                         <div className="pl-4 space-y-1 font-semibold leading-relaxed border-l-2 border-emerald-600/40">
                            <p><strong>Nom et Prénom :</strong> <span className="uppercase text-blue-900 font-extrabold">{employee.name}</span></p>
                            <p><strong>Nationalité :</strong> Tunisienne</p>
                            <p><strong>Adresse :</strong> {employee.address || 'Non saisi'}</p>
                            <p><strong>Numéro C.I.N :</strong> {employee.cin || 'Non saisi'}</p>
                            <p><strong>Numéro CNSS :</strong> {employee.cnss || 'Non saisi'}</p>
                         </div>
                      </div>

                      <div className="pt-6 font-extrabold text-[#14120E] text-center italic">
                         « Il a été arrêté et convenu ce qui suit »
                      </div>
                   </div>
                </div>

                <div className="text-center pt-8 border-t border-gray-100 text-[10px] font-bold text-gray-400">
                   {issuer?.name || ''} - Contrat de Travail Tunisien
                </div>
             </div>

             {/* ================= PAGE 2 ================= */}
             <div className="print-page-break bg-white border border-gray-200 shadow-sm mx-auto p-10 md:p-14 max-w-[21cm] min-h-[29.7cm] flex flex-col justify-between rounded-xl">
                <div>
                   {/* Letterhead on Page 2 */}
                   <div className="flex justify-between items-start pb-4 border-b border-gray-100 mb-6">
                      <div>
                         <h2 className="font-serif font-black text-[10px] uppercase text-black">{issuer?.name || 'SOCIÉTÉ'}</h2>
                      </div>
                      <div className="text-right">
                         <span className="text-[8px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-black border border-emerald-100">Page 2 / 4</span>
                      </div>
                   </div>

                   <div className="space-y-6 text-xs md:text-sm text-justify text-gray-900 leading-relaxed font-sans">
                      
                      <div className="space-y-2">
                         <h3 className="font-extrabold text-black uppercase border-b pb-1 text-[11px] tracking-wide">Article 1 : Nature et durée du contrat</h3>
                         <p>
                            Le présent contrat est un contrat de travail à {employee.contractType === 'CDI' ? 'durée indéterminée (CDI)' : `durée déterminée (${(employee.contractType || 'CDD').toUpperCase()})`}.
                         </p>
                         <p>
                            Il prend effet à compter du <strong className="text-black">{hireDateStr}</strong>.
                         </p>
                      </div>

                      <div className="space-y-2 pt-2">
                         <h3 className="font-extrabold text-black uppercase border-b pb-1 text-[11px] tracking-wide">Article 2 : Fonction et engagement</h3>
                         <p>
                            L’employeur engage le salarié en qualité de <strong className="text-black uppercase">{employee.role || 'Salarié'}</strong>.
                         </p>
                         <p>
                            Le salarié s’engage à se conformer aux dispositions du Code du Travail tunisien tel que modifié par la loi n°96-62 du 15 juillet 1996, aux textes législatifs ultérieurs ainsi qu’à la convention collective cadre régissant l’activité de l’employeur.
                         </p>
                         <p>
                            Le salarié consacrera l’intégralité de son temps et de son activité professionnelle au service de la société.
                         </p>
                         <p>
                            Il lui est interdit d’exercer toute autre activité professionnelle, même non concurrente, sans l’autorisation écrite et préalable de l’employeur, pendant toute la durée du présent contrat.
                         </p>
                      </div>

                      <div className="space-y-2 pt-2">
                         <h3 className="font-extrabold text-black uppercase border-b pb-1 text-[11px] tracking-wide">Article 3 : Catégorie professionnelle et hiérarchie</h3>
                         <p>
                            Le salarié exercera exclusivement au sein de la société <strong className="text-black uppercase">{issuer?.name || '________________'}</strong> en qualité de <strong className="text-black">{employee.role || 'Salarié'}</strong>.
                         </p>
                         <p>
                            Il exercera ses fonctions sous l’autorité et selon les directives de l'employeur ou de toute personne mandatée par celui-ci.
                         </p>
                         <p>
                            L’employeur se réserve le droit d’affecter le personnel selon les besoins de l’exploitation et les compétences du salarié.
                         </p>
                      </div>

                   </div>
                </div>

                <div className="text-center pt-8 border-t border-gray-100 text-[10px] font-bold text-gray-400">
                   {issuer?.name || ''} - Paraphes de l'employé(e): _____________ • de l'employeur: _____________ 
                </div>
             </div>

             {/* ================= PAGE 3 ================= */}
             <div className="print-page-break bg-white border border-gray-200 shadow-sm mx-auto p-10 md:p-14 max-w-[21cm] min-h-[29.7cm] flex flex-col justify-between rounded-xl">
                <div>
                   {/* Letterhead on Page 3 */}
                   <div className="flex justify-between items-start pb-4 border-b border-gray-100 mb-6">
                      <div>
                         <h2 className="font-serif font-black text-[10px] uppercase text-black">{issuer?.name || 'SOCIÉTÉ'}</h2>
                      </div>
                      <div className="text-right">
                         <span className="text-[8px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-black border border-emerald-100">Page 3 / 4</span>
                      </div>
                   </div>

                   <div className="space-y-6 text-xs md:text-sm text-justify text-gray-900 leading-relaxed font-sans">
                      
                      <div className="space-y-2">
                         <h3 className="font-extrabold text-black uppercase border-b pb-1 text-[11px] tracking-wide">Article 4 : Lieu de travail</h3>
                         <p>
                            Le travail sera effectué au siège de la société.
                         </p>
                         <p>
                            Le lieu de travail pourra être modifié en fonction des nécessités de service et des besoins de l’exploitation.
                         </p>
                      </div>

                      <div className="space-y-2 pt-2">
                         <h3 className="font-extrabold text-black uppercase border-b pb-1 text-[11px] tracking-wide">Article 5 : Horaire de travail</h3>
                         <p>
                            La durée du travail est fixée à <strong className="text-black">40 ou 48 heures par semaine</strong>, conformément à la réglementation en vigueur.
                         </p>
                         <p>
                            Le salarié s’engage à respecter les horaires de travail en vigueur dans la société et à effectuer, si nécessaire, des heures supplémentaires en fonction des exigences du service.
                         </p>
                         <p>
                            Les heures supplémentaires ne sont pas incluses dans la rémunération de base et seront traitées conformément à la législation en vigueur.
                         </p>
                      </div>

                      <div className="space-y-2 pt-2">
                         <h3 className="font-extrabold text-black uppercase border-b pb-1 text-[11px] tracking-wide">Article 6 : Rémunération</h3>
                         <p>
                            Le salarié percevra une rémunération brute mensuelle de <strong className="font-mono text-[13px] text-blue-900">{employee.salary ? `${employee.salary.toFixed(3)} DT` : 'xxxxxxxxx DT'}</strong>, conformément à la réglementation en vigueur.
                         </p>
                         <p>
                            Cette rémunération pourra être révisée en cas de modification légale ou réglementaire applicable à la profession ou à la catégorie professionnelle concernée.
                         </p>
                         <p>
                            Les indemnités et avantages accessoires sont ceux prévus par la loi.
                         </p>
                      </div>

                      <div className="space-y-2 pt-2">
                         <h3 className="font-extrabold text-black uppercase border-b pb-1 text-[11px] tracking-wide">Article 7 : Paiement du salaire</h3>
                         <p>
                            Le salaire est versé mensuellement, au début de chaque mois, <strong className="text-black">entre le 3 et le 10</strong>, selon les usages de l’entreprise.
                         </p>
                         <p>
                            Aucune retenue ne pourra être opérée sur le salaire en dehors des cas et limites prévus par la législation en vigueur.
                         </p>
                      </div>

                      <div className="space-y-2 pt-2">
                         <h3 className="font-extrabold text-black uppercase border-b pb-1 text-[11px] tracking-wide">Article 8 : Congés</h3>
                         <p>
                            Le salarié bénéficie de <strong className="text-black">1,5 jour ouvrable de congé payé par mois de travail effectif</strong>.
                         </p>
                         <p>
                            La période de congé est fixée par l’employeur en fonction des nécessités du service.
                         </p>
                         <p>
                            Des congés exceptionnels peuvent être accordés à titre gracieux, sur demande du salarié et accord de l’employeur, et seront déduits du salaire du mois concerné.
                         </p>
                      </div>

                   </div>
                </div>

                <div className="text-center pt-8 border-t border-gray-100 text-[10px] font-bold text-gray-400">
                   {issuer?.name || ''} - Paraphes de l'employé(e): _____________ • de l'employeur: _____________ 
                </div>
             </div>

             {/* ================= PAGE 4 ================= */}
             <div className="print-page-break bg-white border border-gray-200 shadow-sm mx-auto p-10 md:p-14 max-w-[21cm] min-h-[29.7cm] flex flex-col justify-between rounded-xl">
                <div>
                   {/* Letterhead on Page 4 */}
                   <div className="flex justify-between items-start pb-4 border-b border-gray-100 mb-6">
                      <div>
                         <h2 className="font-serif font-black text-[10px] uppercase text-black">{issuer?.name || 'SOCIÉTÉ'}</h2>
                      </div>
                      <div className="text-right">
                         <span className="text-[8px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-black border border-emerald-100">Page 4 / 4</span>
                      </div>
                   </div>

                   <div className="space-y-5 text-xs md:text-sm text-justify text-gray-900 leading-relaxed font-sans">
                      
                      <div className="space-y-2">
                         <h3 className="font-extrabold text-black uppercase border-b pb-1 text-[11px] tracking-wide">Article 9 : Préavis et résiliation</h3>
                         <p>
                            Le présent contrat peut être résilié par l’une ou l’autre des parties sous réserve du respect d’un préavis d’un (1) mois.
                         </p>
                         <p>
                            Il peut être résilié sans préavis ni indemnité en cas de faute grave ou d’insuffisance professionnelle, conformément à la législation en vigueur.
                         </p>
                         <p>
                            En cas de non-respect du délai de préavis par le salarié, celui-ci perd le bénéfice du solde de tout compte, ainsi que de toute prime, gratification ou avantage non encore versé, dans les limites autorisées par la loi.
                         </p>
                      </div>

                      <div className="space-y-2">
                         <h3 className="font-extrabold text-black uppercase border-b pb-1 text-[11px] tracking-wide">Article 10 : Responsabilité et déclarations</h3>
                         <p>
                            Le salarié déclare être libre de tout engagement envers ses précédents employeurs et assume personnellement toute responsabilité résultant d’une violation de l’article 26 du Code du Travail.
                         </p>
                      </div>

                      <div className="space-y-2">
                         <h3 className="font-extrabold text-black uppercase border-b pb-1 text-[11px] tracking-wide">Article 11 : Conservation du matériel</h3>
                         <p>
                            Le salarié est tenu d’assurer la bonne conservation du matériel et des biens mis à sa disposition dans le cadre de ses fonctions.
                         </p>
                         <p>
                            Il s’engage à les restituer en bon état à la fin de son contrat.
                         </p>
                      </div>

                      <div className="space-y-2">
                         <h3 className="font-extrabold text-black uppercase border-b pb-1 text-[11px] tracking-wide">Article 12 : Confidentialité et secret professionnel</h3>
                         <p>
                            Le salarié s’engage à respecter une obligation stricte de confidentialité pendant la durée du contrat et après sa cessation.
                         </p>
                         <p>
                            Il lui est interdit de divulguer toute information, document, donnée ou procédé relatif à l’organisation, au fonctionnement, aux clients ou aux méthodes de l’entreprise, dont il aurait eu connaissance directement ou indirectement.
                         </p>
                      </div>

                      <div className="space-y-2">
                         <h3 className="font-extrabold text-black uppercase border-b pb-1 text-[11px] tracking-wide">Article 13 : Litiges</h3>
                         <p>
                            Tout différend relatif à l’exécution ou à l’interprétation du présent contrat sera soumis à l’arbitrage amiable du bureau de l’Inspection du Travail territorialement compétent.
                         </p>
                      </div>

                      <div className="pt-4 space-y-4">
                         <p className="font-extrabold">Fait à Tunis, le {currentDate}</p>
                         <p className="italic text-[11px] text-gray-500">En deux exemplaires originaux, dont un remis à chaque partie.</p>
                         
                         <div className="grid grid-cols-2 gap-8 pt-6">
                            <div className="space-y-12">
                               <p className="font-black text-black border-b pb-1 text-[10px] uppercase">L'Employeur (Mensi Haythem)</p>
                               <div className="h-10 text-gray-400 text-[10px] italic">Signature & Cachet</div>
                            </div>
                            <div className="space-y-12">
                               <p className="font-black text-black border-b pb-1 text-[10px] uppercase">L'Employé(e) (<span className="uppercase">{employee.name}</span>)</p>
                               <div className="h-10 text-gray-400 text-[10px] italic">Mention "Lu et approuvé" + Signature</div>
                            </div>
                         </div>
                      </div>

                   </div>
                </div>

                <div className="text-center pt-8 border-t border-gray-100 text-[10px] font-bold text-gray-400">
                   {issuer?.name || ''} - Document de validation juridique Tunisie - Fin de contrat
                </div>
             </div>

          </div>
       </div>
    </div>
  );
};

const OperationCard = ({ operation, employees, issuers, isNew, isEditing, onSave, onUpdate, onDelete, onEdit, onCancel, selectedIssuerIds }: any) => {
  const defaultIssuerId = (selectedIssuerIds && selectedIssuerIds.length > 0) ? selectedIssuerIds[0] : (issuers[0]?.id || '');
  const [form, setForm] = useState(operation || { id: 'o-' + Date.now(), name: '', hourlyRate: 0, roleRates: {}, issuerId: defaultIssuerId });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allAvailableRoles = Array.from(new Set([
    ...PREDEFINED_ROLES,
    ...(employees || []).map((e: any) => e.role).filter(Boolean)
  ])) as string[];

  if (isNew || isEditing) {
    const handleSave = async () => {
      if (!form.name.trim()) {
        alert("Le nom de l'opération est obligatoire");
        return;
      }
      
      setIsSubmitting(true);
      try {
        if (isNew) {
          await onSave(form);
        } else {
          await onUpdate(form);
        }
      } catch (error) {
        console.error("Operation save error:", error);
        alert("Erreur lors de l'enregistrement");
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="bg-white p-6 rounded-3xl border-2 border-[#0E7866]/20 shadow-xl space-y-4">
         <div>
            <label className="text-[10px] font-black uppercase text-[#ACA9A2] mb-1.5 block">Nom de l'opération</label>
            <input 
              autoFocus
              placeholder="Ex: Récolte Olives"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              className="w-full h-11 px-4 rounded-xl bg-[#FAF8F4] border border-[#E4E0D8] font-bold text-xs focus:ring-2 focus:ring-[#0E7866]/20 outline-none"
            />
         </div>
         
         <div className="space-y-3 pt-2">
            <label className="text-[10px] font-black uppercase text-[#ACA9A2] block">Tarifs par Rôle (DT/h)</label>
            <div className="bg-[#FAF8F4] p-3 rounded-xl border border-[#E4E0D8] space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between pb-2 border-b border-[#E4E0D8] mb-2">
                <span className="text-[10px] font-bold text-[#7A776F]">Tarif par Défaut</span>
                <input 
                  type="number"
                  step="0.1"
                  value={form.hourlyRate || 0}
                  onChange={e => setForm({...form, hourlyRate: parseFloat(e.target.value) || 0})}
                  className="w-20 h-8 px-2 rounded-lg border border-[#E4E0D8] font-mono text-[10px] text-right outline-none focus:border-[#0E7866]"
                />
              </div>
              {allAvailableRoles.map(role => (
                <div key={role} className="flex items-center justify-between gap-4">
                  <span className="text-[10px] font-bold text-[#14120E] truncate">{role}</span>
                  <input 
                    type="number"
                    step="0.1"
                    placeholder={(form.hourlyRate || 0).toString()}
                    value={form.roleRates?.[role] || ''}
                    onChange={e => {
                      const rates = { ...(form.roleRates || {}) };
                      const val = parseFloat(e.target.value);
                      if (isNaN(val)) {
                        delete rates[role];
                      } else {
                        rates[role] = val;
                      }
                      setForm({...form, roleRates: rates});
                    }}
                    className="w-20 h-8 px-2 rounded-lg border border-[#E4E0D8] font-mono text-[10px] text-right outline-none focus:border-[#0E7866]"
                  />
                </div>
              ))}
            </div>
         </div>

         <div>
            <label className="text-[10px] font-black uppercase text-[#ACA9A2] mb-1.5 block">Entreprise</label>
            <select 
              value={form.issuerId}
              onChange={e => setForm({...form, issuerId: e.target.value})}
              className="w-full h-11 px-4 rounded-xl bg-[#FAF8F4] border border-[#E4E0D8] font-bold text-xs focus:ring-2 focus:ring-[#0E7866]/20 outline-none"
            >
              {issuers.filter((i: any) => selectedIssuerIds?.includes(i.id)).map((i: any) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
         </div>
         <div className="flex gap-2 pt-2">
            <button 
              disabled={isSubmitting}
              onClick={handleSave} 
              className="flex-1 h-11 bg-[#0E7866] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-[#0C6254] transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Enregistrer'}
            </button>
            <button onClick={onCancel} className="px-4 h-11 border border-[#E4E0D8] rounded-xl hover:bg-[#FAF8F4] transition-all"><X size={16}/></button>
         </div>
      </div>
    );
  }

  const issuer = issuers.find((i: any) => i.id === operation.issuerId);
  const totalRolesConfigured = Object.keys(operation.roleRates || {}).length;
  const assignedAgentsCount = employees?.filter((e: any) => e.operationId === operation.id).length || 0;

  return null; // The card view is removed, we only use the form when isEditing/isNew
};

// --- Monthly Payments & Pay Slips ---

const MonthlyPayments = ({ employees, pointings, operations, adjustments, issuers, onSaveAdjustment }: any) => {
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [searchQuery, setSearchQuery] = useState('');
  const [opFilter, setOpFilter] = useState('all');
  const [editingAdj, setEditingAdj] = useState<any>(null);
  const [selectedSlipEmployee, setSelectedSlipEmployee] = useState<any>(null);

  const filteredEmployees = employees.filter((e: any) => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOp = opFilter === 'all' || e.operationId === opFilter;
    return matchesSearch && matchesOp;
  });

  const getMonthStats = (empId: string) => {
    const monthStart = `${currentMonth}-01`;
    const monthEnd = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 0).toISOString().split('T')[0];
    
    const empPointings = pointings.filter((p: any) => 
      p.employeeId === empId && 
      p.date >= monthStart && 
      p.date <= monthEnd &&
      (p.type === 'work' || p.type === 'leave' || p.type === 'holiday')
    );

    const totalHours = empPointings.reduce((acc: number, p: any) => acc + (p.hours || 0), 0);
    const baseSalary = empPointings.reduce((acc: number, p: any) => {
      const op = operations.find((o: any) => o.id === p.operationId);
      const emp = employees.find((e: any) => e.id === empId);
      const rate = getRoleRate(op, emp?.role || '');
      return acc + (p.hours * rate);
    }, 0);

    const adj = adjustments.find((a: any) => a.employeeId === empId && a.month === currentMonth);
    const bonus = adj?.bonus || 0;
    const advance = adj?.advance || 0;
    const delay = adj?.delay || 0;
    const netToPay = baseSalary + bonus - advance - delay;

    return { totalHours, baseSalary, bonus, advance, delay, netToPay, adj };
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-[#E4E0D8] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-[#1A56DB] p-2.5 rounded-2xl text-white">
              <DollarSign size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-[#14120E]">Paiements Mensuels</h2>
              <p className="text-[10px] text-[#7A776F] font-bold">Gérez les primes, avances et fiches de paie</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input 
              type="month"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              className="h-11 px-4 rounded-xl border border-[#E4E0D8] text-xs font-black uppercase outline-none bg-[#FAF8F4]"
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ACA9A2]" size={16} />
            <input 
              placeholder="Rechercher par nom d'agent..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-12 pr-4 rounded-xl border border-[#E4E0D8] text-xs font-bold bg-[#FAF8F4] outline-none"
            />
          </div>
          <div className="w-full md:w-64">
            <select 
              value={opFilter}
              onChange={(e) => setOpFilter(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-[#E4E0D8] text-xs font-bold bg-[#FAF8F4] outline-none"
            >
              <option value="all">Toutes les opérations</option>
              {operations.map((op: any) => (
                <option key={op.id} value={op.id}>{op.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E4E0D8] bg-[#FAF8F4]/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-[#7A776F]">Agent</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-[#7A776F]">Heures</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-[#7A776F]">Salaire Base</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-[#0E7866]">Primes</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-[#C0280F]">Avances</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-[#C0280F]">Retards</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-[#1A56DB]">Net à Payer</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-[#7A776F] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E0D8]">
              {filteredEmployees.map((emp: any) => {
                const stats = getMonthStats(emp.id);
                return (
                  <tr key={emp.id} className="hover:bg-[#FAF8F4]/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-[#EBF2FF] text-[#1A56DB] flex items-center justify-center text-[10px] font-black">
                            {emp.name.charAt(0)}
                         </div>
                         <div>
                            <div className="text-xs font-black text-[#14120E]">{emp.name}</div>
                            <div className="text-[9px] text-[#A2A098] font-bold uppercase">{emp.role}</div>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-mono font-bold text-[#7A776F]">{stats.totalHours}h</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-mono font-bold text-[#14120E]">{stats.baseSalary.toFixed(2)}DT</div>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setEditingAdj({ empId: emp.id, type: 'bonus', value: stats.bonus, adjId: stats.adj?.id })}
                        className="text-xs font-mono font-black text-[#0E7866] hover:bg-[#E6F8F4] px-2 py-1 rounded-lg transition-all"
                      >
                        +{stats.bonus.toFixed(2)}DT
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setEditingAdj({ empId: emp.id, type: 'advance', value: stats.advance, adjId: stats.adj?.id })}
                        className="text-xs font-mono font-black text-[#C0280F] hover:bg-red-50 px-2 py-1 rounded-lg transition-all"
                      >
                        -{stats.advance.toFixed(2)}DT
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setEditingAdj({ empId: emp.id, type: 'delay', value: stats.delay, adjId: stats.adj?.id })}
                        className="text-xs font-mono font-black text-[#C0280F] hover:bg-red-50 px-2 py-1 rounded-lg transition-all"
                      >
                        -{stats.delay.toFixed(2)}DT
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-mono font-black text-[#1A56DB]">{stats.netToPay.toFixed(2)}DT</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedSlipEmployee({ ...emp, stats })}
                        className="p-2 hover:bg-[#F1EDE5] rounded-xl text-[#7A776F] transition-all"
                        title="Générer Fiche de Paie"
                      >
                        <FileText size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {editingAdj && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-[#E4E0D8]">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#14120E] mb-6">
                Ajustement {editingAdj.type === 'bonus' ? 'Prime' : editingAdj.type === 'advance' ? 'Avance' : 'Retard'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-[#ACA9A2] mb-1.5 block">Montant (DT)</label>
                  <input 
                    autoFocus
                    type="number"
                    step="5"
                    defaultValue={editingAdj.value}
                    onKeyDown={(e: any) => {
                      if (e.key === 'Enter') {
                        const val = parseFloat(e.target.value);
                        onSaveAdjustment({
                          id: editingAdj.adjId || `adj-${editingAdj.empId}-${currentMonth}`,
                          employeeId: editingAdj.empId,
                          issuerId: employees.find((e: any) => e.id === editingAdj.empId)?.issuerId || '',
                          month: currentMonth,
                          bonus: editingAdj.type === 'bonus' ? val : (adjustments.find((a: any) => a.id === editingAdj.adjId)?.bonus || 0),
                          advance: editingAdj.type === 'advance' ? val : (adjustments.find((a: any) => a.id === editingAdj.adjId)?.advance || 0),
                          delay: editingAdj.type === 'delay' ? val : (adjustments.find((a: any) => a.id === editingAdj.adjId)?.delay || 0),
                        });
                        setEditingAdj(null);
                      }
                    }}
                    className="w-full h-12 px-4 rounded-xl border border-[#E4E0D8] text-sm font-mono font-black focus:ring-2 focus:ring-[#1A56DB]/20 outline-none"
                  />
                  <p className="text-[10px] text-[#7A776F] mt-2 italic font-bold">Appuyez sur Entrée pour enregistrer</p>
                </div>
                <div className="pt-4 flex gap-2">
                   <button onClick={() => setEditingAdj(null)} className="flex-1 h-11 border border-[#E4E0D8] rounded-xl text-[10px] font-black uppercase hover:bg-[#FAF8F4] transition-all">Annuler</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {selectedSlipEmployee && (
          <PaySlipModal 
            employee={selectedSlipEmployee} 
            issuer={issuers.find((i: any) => i.id === selectedSlipEmployee.issuerId)}
            month={currentMonth}
            pointings={pointings.filter((p: any) => p.employeeId === selectedSlipEmployee.id && p.date.startsWith(currentMonth))}
            operations={operations}
            onClose={() => setSelectedSlipEmployee(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const PaySlipModal = ({ employee, issuer, month, pointings, operations, onClose }: any) => {
  const modalRef = React.useRef<HTMLDivElement>(null);
  
  const stats = employee.stats;
  const monthName = new Date(`${month}-01`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const exportPDF = async () => {
    if (!modalRef.current) return;
    const canvas = await html2canvas(modalRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Fiche_de_Paie_${employee.name.replace(/ /g, '_')}_${month}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 overflow-y-auto py-10 px-4 print:p-0">
      <div className="max-w-4xl w-full mx-auto flex flex-col gap-4">
        <div className="flex justify-between items-center bg-[#FAF8F4] px-6 py-4 rounded-3xl border border-[#E4E0D8]/40 shadow-lg print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-lg">📜</span>
            <div className="text-left">
              <h4 className="text-xs font-black uppercase text-[#14120E] tracking-wider">Aperçu Fiche de Paie</h4>
              <p className="text-[10px] text-[#7A776F] font-bold">{employee.name} • {monthName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={exportPDF} className="flex items-center gap-1.5 px-5 py-2.5 bg-[#1A56DB] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#1648C4] transition-all shadow-md active:scale-95">
              <Download size={13} /> Exporter PDF
            </button>
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-5 py-2.5 bg-white text-[#14120E] border border-[#E4E0D8]/80 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-stone-50 transition-all shadow-sm active:scale-95">
              <Printer size={13} /> Imprimer
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-[#C0280F] hover:bg-[#A0200C] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-1.5" title="Fermer la Fiche">
              <X size={14} /> Fermer
            </button>
          </div>
        </div>

        <div ref={modalRef} className="bg-white p-12 shadow-2xl border border-[#E4E0D8] min-h-[1100px] print:m-0 print:border-0 print:shadow-none font-sans">
          {/* Header */}
          <div className="flex justify-between items-start mb-12 border-b-2 border-black pb-8">
            <div className="space-y-1">
              <h1 className="text-2xl font-black uppercase tracking-tighter">{issuer?.name}</h1>
              <p className="text-xs text-[#7A776F] font-bold">{issuer?.address}</p>
              <div className="flex gap-4 mt-2">
                <span className="text-[10px] font-black uppercase">MF: {issuer?.mf}</span>
                <span className="text-[10px] font-black uppercase">RC: {issuer?.rc}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-black text-white px-4 py-2 text-xl font-black uppercase mb-2">Fiche de Paie</div>
              <div className="text-lg font-black uppercase tracking-tighter text-[#7A776F]">{monthName}</div>
            </div>
          </div>

          {/* Employee Details */}
          <div className="grid grid-cols-2 gap-12 mb-12 bg-[#FAF8F4] p-8 border border-[#E4E0D8]">
            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase text-[#ACA9A2]">Informations Salarié</div>
              <div>
                <div className="text-xl font-black text-[#14120E]">{employee.name}</div>
                <div className="text-sm font-bold text-[#7A776F] uppercase">{employee.role}</div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase text-[#ACA9A2]">Détails du Poste</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-[#7A776F]">Opération:</span>
                  <span className="text-xs font-black">{operations.find((o: any) => o.id === employee.operationId)?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-[#7A776F]">ID Salarié:</span>
                  <span className="text-xs font-mono font-black">{employee.id.slice(-6).toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <table className="w-full border-collapse mb-12">
            <thead>
              <tr className="bg-black text-white">
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest">Désignation</th>
                <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Nombre</th>
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest">Taux (DT)</th>
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest">Gain (DT)</th>
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest">Retenue (DT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E0D8] border-b-2 border-black">
              {/* Daily / Hours Breakdown could go here but let's summarize per operation rate */}
              <tr className="bg-[#FAF8F4]/50">
                <td className="px-4 py-4 text-xs font-black">Heures de Production</td>
                <td className="px-4 py-4 text-center text-xs font-mono font-bold">{stats.totalHours} h</td>
                <td className="px-4 py-4 text-right text-xs font-mono font-bold">
                  {stats.totalHours > 0 ? (stats.baseSalary / stats.totalHours).toFixed(3) : '0.000'}
                </td>
                <td className="px-4 py-4 text-right text-xs font-mono font-black">{stats.baseSalary.toFixed(3)}</td>
                <td className="px-4 py-4 text-right">—</td>
              </tr>
              {stats.bonus > 0 && (
                <tr>
                  <td className="px-4 py-4 text-xs font-black">Primes & Gratifications</td>
                  <td className="px-4 py-4 text-center">—</td>
                  <td className="px-4 py-4 text-right">—</td>
                  <td className="px-4 py-4 text-right text-xs font-mono font-black">{stats.bonus.toFixed(3)}</td>
                  <td className="px-4 py-4 text-right">—</td>
                </tr>
              )}
              {stats.advance > 0 && (
                <tr>
                  <td className="px-4 py-4 text-xs font-black italic">Avances sur Salaire</td>
                  <td className="px-4 py-4 text-center">—</td>
                  <td className="px-4 py-4 text-right">—</td>
                  <td className="px-4 py-4 text-right">—</td>
                  <td className="px-4 py-4 text-right text-xs font-mono font-black">{stats.advance.toFixed(3)}</td>
                </tr>
              )}
              {stats.delay > 0 && (
                <tr>
                  <td className="px-4 py-4 text-xs font-black italic text-[#C0280F]">Retards & Déductions</td>
                  <td className="px-4 py-4 text-center">—</td>
                  <td className="px-4 py-4 text-right">—</td>
                  <td className="px-4 py-4 text-right">—</td>
                  <td className="px-4 py-4 text-right text-xs font-mono font-black">{stats.delay.toFixed(3)}</td>
                </tr>
              )}
              {/* Add placeholders for Delays/Absences if needed, but for now we focus on what was requested */}
              {pointings.some((p: any) => p.type === 'absence') && (
                <tr className="bg-red-50/20">
                  <td className="px-4 py-4 text-xs font-black text-red-600">Absences (Déduction indicative)</td>
                  <td className="px-4 py-4 text-center text-xs font-mono font-bold">{pointings.filter((p: any) => p.type === 'absence').length} j</td>
                  <td className="px-4 py-4 text-right">—</td>
                  <td className="px-4 py-4 text-right">—</td>
                  <td className="px-4 py-4 text-right text-xs font-mono font-bold text-red-600">Note</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-20">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-xs font-bold text-[#7A776F]">
                <span>Total Brut</span>
                <span className="font-mono">{(stats.baseSalary + stats.bonus).toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-[#C0280F]">
                <span>Total Retenues</span>
                <span className="font-mono">-{ (stats.advance + stats.delay).toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between pt-4 border-t-4 border-black text-xl font-black">
                <span className="uppercase tracking-tighter">NET À PAYER</span>
                <span className="font-mono text-[#1A56DB]">{stats.netToPay.toFixed(3)} DT</span>
              </div>
            </div>
          </div>

          {/* Signature Zone */}
          <div className="grid grid-cols-2 gap-20 mt-auto pt-20">
            <div className="text-center space-y-12">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#ACA9A2]">Signature de l'Employeur</div>
              <div className="h-24 w-3/4 mx-auto border-b border-dashed border-[#ACA9A2]"></div>
              <div className="text-[9px] font-bold italic">Cachet et Signature</div>
            </div>
            <div className="text-center space-y-12">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#ACA9A2]">Signature du Salarié</div>
              <div className="h-24 w-3/4 mx-auto border-b border-dashed border-[#ACA9A2]"></div>
              <div className="text-[9px] font-bold italic">Précédé de la mention "Lu et approuvé"</div>
            </div>
          </div>
          
          <div className="mt-20 pt-8 border-t border-[#E4E0D8] text-center">
            <p className="text-[8px] text-[#ACA9A2] font-black uppercase tracking-widest">Document généré le {new Date().toLocaleDateString('fr-FR')} par FacturaTN Pro</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PointingSystem;
