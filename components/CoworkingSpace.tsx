
import React, { useState } from 'react';
import { Building2, Monitor, Box, PlusCircle, Trash2, Edit3, Save, X, Settings2, CheckCircle2, AlertTriangle, Construction, FileCheck, Info, Package, Archive, Layers, Wrench, Calendar, Clock, ClipboardList, Check } from 'lucide-react';
import { Space, Equipment, Subscription, ClientInfo, InventoryItem, MaintenanceTask } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import Subscriptions from './Subscriptions';

interface CoworkingSpaceProps {
  spaces: Space[];
  subscriptions: Subscription[];
  inventory: InventoryItem[];
  clients: ClientInfo[];
  maintenanceTasks: MaintenanceTask[];
  issuerId: string;
  onAddSpace: (space: Space) => void;
  onUpdateSpace: (space: Space) => void;
  onDeleteSpace: (id: string) => void;
  onAddInventoryItem: (item: InventoryItem) => void;
  onUpdateInventoryItem: (item: InventoryItem) => void;
  onDeleteInventoryItem: (id: string) => void;
  onAddClient: (client: ClientInfo) => Promise<string>;
  onAddSubscription: (sub: Subscription) => void;
  onUpdateSubscription: (sub: Subscription) => void;
  onDeleteSubscription: (id: string) => void;
  onAddMaintenanceTask: (task: MaintenanceTask) => Promise<void>;
  onUpdateMaintenanceTask: (task: MaintenanceTask) => Promise<void>;
  onDeleteMaintenanceTask: (id: string) => Promise<void>;
  canViewFinancials?: boolean;
}

const SPACE_TYPES = [
  "Salle de Réunion",
  "Bureau Privé",
  "Open Space",
  "Zone Lounge",
  "Studio Photo",
  "Cuisine / Cafétéria",
  "Autre"
];

const INVENTORY_CATEGORIES: InventoryItem['category'][] = ['Mobilier', 'Informatique', 'Accessoires', 'Réseau', 'Autres'];

const CoworkingSpace: React.FC<CoworkingSpaceProps> = ({ 
  spaces, 
  subscriptions,
  inventory,
  clients,
  maintenanceTasks,
  issuerId, 
  onAddSpace, 
  onUpdateSpace, 
  onDeleteSpace,
  onAddInventoryItem,
  onUpdateInventoryItem,
  onDeleteInventoryItem,
  onAddClient,
  onAddSubscription,
  onUpdateSubscription,
  onDeleteSubscription,
  onAddMaintenanceTask,
  onUpdateMaintenanceTask,
  onDeleteMaintenanceTask,
  canViewFinancials = true
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'contracts' | 'stock' | 'maintenance'>('inventory');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  
  // Assignment form state
  const [assigningSpaceId, setAssigningSpaceId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [assignQuantity, setAssignQuantity] = useState<number>(1);

  // Maintenance task form state
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState<Partial<MaintenanceTask>>({
    title: '',
    type: 'repair',
    targetType: 'general',
    targetId: '',
    targetName: 'Général',
    status: 'todo',
    priority: 'medium',
    date: new Date().toISOString().substring(0, 10),
    notes: '',
    cost: 0
  });

  const [form, setForm] = useState<Partial<Space>>({
    name: '',
    type: SPACE_TYPES[0],
    capacity: 0,
    status: 'available',
    equipment: []
  });

  const [itemForm, setItemForm] = useState<Partial<InventoryItem>>({
    name: '',
    totalQuantity: 0,
    category: 'Autres'
  });

  const filteredSpaces = spaces.filter(s => s.issuerId === issuerId);
  const filteredInventory = inventory.filter(i => i.issuerId === issuerId);
  const filteredTasks = (maintenanceTasks || []).filter(t => t.issuerId === issuerId);

  const handleSubmitTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title) return;

    let finalTargetName = 'Général';
    if (taskForm.targetType === 'space') {
      const found = spaces.find(s => s.id === taskForm.targetId);
      finalTargetName = found ? found.name : 'Espace inconnu';
    } else if (taskForm.targetType === 'equipment') {
      const found = inventory.find(i => i.id === taskForm.targetId);
      finalTargetName = found ? found.name : 'Équipement inconnu';
    }

    onAddMaintenanceTask({
      ...taskForm,
      id: 'task-' + Date.now(),
      targetName: finalTargetName,
      issuerId,
      createdAt: new Date().toISOString()
    } as MaintenanceTask);

    setShowAddTaskForm(false);
    setTaskForm({
      title: '',
      type: 'repair',
      targetType: 'general',
      targetId: '',
      targetName: 'Général',
      status: 'todo',
      priority: 'medium',
      date: new Date().toISOString().substring(0, 10),
      notes: '',
      cost: 0
    });
  };

  const handleSubmitSpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.type) return;

    onAddSpace({
      ...form,
      id: 'space-' + Date.now(),
      equipment: [],
      issuerId
    } as Space);

    setShowAddForm(false);
    setForm({ name: '', type: SPACE_TYPES[0], capacity: 0, status: 'available', equipment: [] });
  };

  const handleSubmitItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name || !itemForm.totalQuantity) return;

    onAddInventoryItem({
      ...itemForm,
      id: 'inv-' + Date.now(),
      availableQuantity: itemForm.totalQuantity,
      issuerId
    } as InventoryItem);

    setShowItemForm(false);
    setItemForm({ name: '', totalQuantity: 0, category: 'Autres' });
  };

  const getAvailableQuantity = (itemId: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return 0;
    
    const assigned = spaces.reduce((sum, space) => {
      const eq = space.equipment.find(e => e.inventoryItemId === itemId);
      return sum + (eq?.quantity || 0);
    }, 0);

    return item.totalQuantity - assigned;
  };

  const assignEquipment = (spaceId: string) => {
    setAssigningSpaceId(spaceId);
    const availableItems = filteredInventory.filter(i => getAvailableQuantity(i.id) > 0);
    if (availableItems.length > 0) {
      setSelectedItemId(availableItems[0].id);
    } else {
      setSelectedItemId('');
    }
    setAssignQuantity(1);
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningSpaceId || !selectedItemId) return;
    const space = spaces.find(s => s.id === assigningSpaceId);
    const item = filteredInventory.find(i => i.id === selectedItemId);
    if (!space || !item) return;

    const available = getAvailableQuantity(item.id);
    if (assignQuantity <= 0 || assignQuantity > available) {
      alert("Quantité de stock disponible insuffisante.");
      return;
    }

    const existingId = space.equipment.find(e => e.inventoryItemId === item.id);
    let newEquipment;
    if (existingId) {
      newEquipment = space.equipment.map(e => e.inventoryItemId === item.id ? { ...e, quantity: e.quantity + assignQuantity } : e);
    } else {
      newEquipment = [...space.equipment, { inventoryItemId: item.id, name: item.name, quantity: assignQuantity }];
    }

    onUpdateSpace({ ...space, equipment: newEquipment });
    setAssigningSpaceId(null);
    setSelectedItemId('');
    setAssignQuantity(1);
  };

  const removeEquipment = (spaceId: string, inventoryItemId: string) => {
    const space = spaces.find(s => s.id === spaceId);
    if (!space) return;

    onUpdateSpace({
      ...space,
      equipment: space.equipment.filter(e => e.inventoryItemId !== inventoryItemId)
    });
  };

  const labelStyle = "text-[10px] font-black uppercase text-[#ACA9A2] mb-1.5 block tracking-widest";
  const inputStyle = "w-full h-11 px-4 rounded-xl bg-[#FAF8F4] border border-[#E4E0D8] font-bold text-xs focus:ring-2 focus:ring-[#1A56DB]/20 outline-none transition-all";

  return (
    <div className="p-7 space-y-7">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-[#14120E] uppercase tracking-tighter flex items-center gap-2">
             <Building2 size={24} className="text-[#1A56DB]" />
             Hub Coworking Otelco
          </h2>
          <p className="text-xs text-[#7A776F] font-medium italic mt-1">Salles, équipements et gestion locative unifiée.</p>
        </div>
        
        <div className="flex bg-[#FAF8F4] p-1 rounded-2xl border border-[#E4E0D8] flex-wrap gap-1">
           <button 
             onClick={() => setActiveTab('inventory')}
             className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-white text-[#1A56DB] shadow-lg' : 'text-[#7A776F] hover:text-[#14120E]'}`}
           >
              <Monitor size={14} /> Salles
           </button>
           <button 
             onClick={() => setActiveTab('stock')}
             className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'stock' ? 'bg-white text-[#1A56DB] shadow-lg' : 'text-[#7A776F] hover:text-[#14120E]'}`}
           >
              <Package size={14} /> Stock Global
           </button>
           <button 
             onClick={() => setActiveTab('maintenance')}
             className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'maintenance' ? 'bg-white text-[#1A56DB] shadow-lg' : 'text-[#7A776F] hover:text-[#14120E]'}`}
           >
              <Wrench size={14} /> Maintenance
           </button>
           {canViewFinancials && (
             <button 
               onClick={() => setActiveTab('contracts')}
               className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'contracts' ? 'bg-white text-[#1A56DB] shadow-lg' : 'text-[#7A776F] hover:text-[#14120E]'}`}
             >
                <FileCheck size={14} /> Contrats
             </button>
           )}
        </div>
      </div>

      {activeTab === 'inventory' && (
        <>
          <div className="flex justify-end">
            <button 
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[#1A56DB] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#1648C4] transition-all shadow-xl active:scale-95"
            >
              <PlusCircle size={18} /> Nouvel Espace
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSpaces.map(space => (
              <motion.div 
                layout
                key={space.id}
                className="bg-white rounded-[2rem] border border-[#E4E0D8] shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-all"
              >
                 <div className="p-6 border-b border-[#FAF8F4] flex justify-between items-start bg-[#FAF8F4]/30">
                    <div className="flex items-center gap-3">
                       <div className="w-12 h-12 bg-[#1A56DB] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#1A56DB]/20">
                          <Monitor size={22} />
                       </div>
                       <div>
                          <h3 className="text-sm font-black text-[#14120E] uppercase tracking-tighter">{space.name}</h3>
                          <span className="text-[9px] font-black uppercase text-[#ACA9A2] tracking-widest">{space.type}</span>
                       </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => onDeleteSpace(space.id)} className="p-2 text-[#ACA9A2] hover:text-[#C0280F] hover:bg-[#FFF1EE] rounded-lg transition-all">
                          <Trash2 size={16} />
                       </button>
                    </div>
                 </div>

                 <div className="p-6 flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                       <span className={labelStyle}>Capacité</span>
                       <span className="text-xs font-black text-[#14120E]">{space.capacity} Personnes</span>
                    </div>

                    <div className="space-y-3">
                       <div className="flex items-center justify-between">
                          <label className={labelStyle}>Équipements Assis ({space.equipment.reduce((s, e) => s + e.quantity, 0)})</label>
                          <button 
                            onClick={() => assignEquipment(space.id)}
                            className="text-[9px] font-bold text-[#1A56DB] uppercase p-1 hover:bg-[#EBF2FF] rounded transition-all"
                          >
                            + Assigner
                          </button>
                       </div>
                       
                       <div className="space-y-2">
                          {space.equipment.map(eq => (
                            <div key={eq.inventoryItemId} className="flex items-center justify-between p-2.5 bg-[#FAF8F4] rounded-xl border border-[#E4E0D8]/50 group/eq">
                               <div className="flex items-center gap-2">
                                  <Layers size={14} className="text-[#1A56DB]" />
                                  <span className="text-[11px] font-bold text-[#3D3A34]">{eq.name} x{eq.quantity}</span>
                               </div>
                               <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => removeEquipment(space.id, eq.inventoryItemId)}
                                    className="p-1.5 text-[#ACA9A2] hover:text-[#C0280F] rounded-lg transition-all"
                                  >
                                    <X size={12} />
                                  </button>
                               </div>
                            </div>
                          ))}
                          {space.equipment.length === 0 && (
                            <div className="py-4 text-center border-2 border-dashed border-[#FAF8F4] rounded-xl">
                               <p className="text-[10px] font-bold text-[#ACA9A2] uppercase">Aucun équipement assigné</p>
                            </div>
                          )}
                       </div>
                    </div>
                 </div>

                 <div className="p-4 bg-[#FAF8F4]/50 border-t border-[#E4E0D8]/50">
                    <div className={`p-2 rounded-xl text-center text-[9px] font-black uppercase tracking-widest ${
                      space.status === 'available' ? 'bg-[#E6F8F4] text-[#0E7866]' : 
                      space.status === 'occupied' ? 'bg-[#EBF2FF] text-[#1A56DB]' : 
                      'bg-[#FFF1EE] text-[#C0280F]'
                    }`}>
                       {space.status === 'available' ? 'Disponible' : space.status === 'occupied' ? 'Occupé' : 'Maintenance'}
                    </div>
                 </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'stock' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-7 rounded-[2rem] border border-[#E4E0D8]">
             <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#FAF8F4] text-[#1A56DB] rounded-2xl flex items-center justify-center">
                   <Archive size={28} />
                </div>
                <div>
                   <h3 className="text-lg font-black text-[#14120E] uppercase tracking-tighter">Inventaire Centralisé</h3>
                   <p className="text-xs text-[#7A776F] font-medium">Répartition globale du matériel Otelco.</p>
                </div>
             </div>
             <button 
               onClick={() => setShowItemForm(true)}
               className="flex items-center gap-2 px-6 py-3 bg-[#1A56DB] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#1648C4] transition-all"
             >
                <PlusCircle size={18} /> Nouvel Article
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredInventory.map(item => {
              const assigned = spaces.reduce((sum, s) => {
                const eq = s.equipment.find(e => e.inventoryItemId === item.id);
                return sum + (eq?.quantity || 0);
              }, 0);
              const available = item.totalQuantity - assigned;

              return (
                <div key={item.id} className="bg-white p-6 rounded-[2rem] border border-[#E4E0D8] shadow-sm flex flex-col gap-4 group hover:border-[#1A56DB] transition-all">
                   <div className="flex justify-between items-start">
                      <span className="text-[9px] font-black uppercase bg-[#FAF8F4] px-2.5 py-1 rounded-lg text-[#ACA9A2] tracking-widest">{item.category}</span>
                      <button onClick={() => onDeleteInventoryItem(item.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-[#ACA9A2] hover:text-[#C0280F] transition-all">
                        <Trash2 size={14} />
                      </button>
                   </div>
                   <div>
                      <h4 className="text-sm font-black text-[#14120E] uppercase line-clamp-1">{item.name}</h4>
                      <p className="text-[10px] font-bold text-[#7A776F] mt-1">Total: {item.totalQuantity} unités</p>
                   </div>
                   
                   <div className="space-y-2 mt-auto pt-4 border-t border-[#FAF8F4]">
                      <div className="flex justify-between text-[10px] font-bold">
                         <span className="text-[#ACA9A2] uppercase">Disponible</span>
                         <span className={`font-black ${available < 3 ? 'text-[#C0280F]' : 'text-[#0E7866]'}`}>{available}</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#FAF8F4] rounded-full overflow-hidden">
                         <div 
                           className={`h-full transition-all ${available < 3 ? 'bg-[#C0280F]' : 'bg-[#0E7866]'}`}
                           style={{ width: `${(available / item.totalQuantity) * 100}%` }}
                         />
                      </div>
                      <p className="text-[8px] font-black text-[#ACA9A2] uppercase text-right">Assigné: {assigned}</p>
                   </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'contracts' && (
        <div className="bg-white rounded-[2.5rem] border border-[#E4E0D8] shadow-sm">
           <Subscriptions 
              subscriptions={subscriptions}
              clients={clients}
              spaces={spaces}
              issuerId={issuerId}
              onAdd={onAddSubscription}
              onUpdate={onUpdateSubscription}
              onDelete={onDeleteSubscription}
              onAddClient={onAddClient}
           />
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-7 rounded-[2rem] border border-[#E4E0D8] gap-4 shadow-sm">
             <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#FAF8F4] text-[#1A56DB] rounded-2xl flex items-center justify-center">
                   <Wrench size={28} />
                </div>
                <div>
                   <h3 className="text-lg font-black text-[#14120E] uppercase tracking-tighter">Maintenance & Travaux</h3>
                   <p className="text-xs text-[#7A776F] font-medium">Suivi des réparations d'équipements et chantiers de l'espace.</p>
                </div>
             </div>
             <button 
               onClick={() => {
                 setTaskForm({
                   title: '',
                   type: 'repair',
                   targetType: 'general',
                   targetId: '',
                   status: 'todo',
                   priority: 'medium',
                   date: new Date().toISOString().substring(0, 10),
                   notes: '',
                   cost: 0
                 });
                 setShowAddTaskForm(true);
               }}
               className="flex items-center gap-2 px-6 py-3 bg-[#1A56DB] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#1648C4] transition-all self-stretch sm:self-auto justify-center"
             >
                <PlusCircle size={18} /> Nouveau Travail / Réparation
             </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
             {(['planned', 'todo', 'in_progress', 'done'] as const).map(status => {
                const tasksInStatus = filteredTasks.filter(t => t.status === status);
                const statusInfo = {
                  planned: { label: 'Prévus', color: 'text-[#1A56DB]', bg: 'bg-[#EBF2FF]', border: 'border-[#1A56DB]/20', icon: <Calendar size={14} /> },
                  todo: { label: 'À Faire', color: 'text-[#7A776F]', bg: 'bg-[#FAF8F4]', border: 'border-[#7A776F]/20', icon: <ClipboardList size={14} /> },
                  in_progress: { label: 'En Cours', color: 'text-[#B25E00]', bg: 'bg-[#FFF8EB]', border: 'border-[#B25E00]/20', icon: <Clock size={14} /> },
                  done: { label: 'Terminés', color: 'text-[#0E7866]', bg: 'bg-[#E6F8F4]', border: 'border-[#0E7866]/20', icon: <Check size={14} /> }
                }[status];

                return (
                   <div key={status} className="flex flex-col bg-[#FAF8F4]/30 rounded-[2rem] border border-[#E4E0D8] p-5 min-h-[500px]">
                      <div className="flex items-center justify-between mb-4 border-b border-[#E4E0D8]/40 pb-3">
                         <div className="flex items-center gap-2">
                            <span className={`${statusInfo.color} ${statusInfo.bg} p-1.5 rounded-lg`}>{statusInfo.icon}</span>
                            <span className="text-xs font-black text-[#14120E] uppercase tracking-wider">{statusInfo.label}</span>
                         </div>
                         <span className="text-[10px] font-black bg-white px-2.5 py-1 rounded-full border border-[#E4E0D8] text-[#7A776F]">
                            {tasksInStatus.length}
                         </span>
                      </div>

                      <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                         {tasksInStatus.map(task => {
                            const priorityColor = {
                              high: 'bg-[#FFF1EE] text-[#C0280F] border-[#C0280F]/20',
                              medium: 'bg-[#FFF8EB] text-[#B25E00] border-[#B25E00]/20',
                              low: 'bg-[#FAF8F4] text-[#7A776F] border-[#E4E0D8]/50'
                            }[task.priority];

                            const typeLabel = {
                              repair: 'Réparation',
                              maintenance: 'Entretien',
                              work: 'Travaux',
                              other: 'Autre'
                            }[task.type];

                            return (
                               <motion.div 
                                 layout
                                 key={task.id}
                                 className="bg-white p-4.5 rounded-2xl border border-[#E4E0D8] hover:border-[#1A56DB] transition-all shadow-sm flex flex-col gap-3 group"
                               >
                                  <div className="flex justify-between items-start gap-2">
                                     <span className="text-[8px] font-black tracking-widest uppercase bg-[#FAF8F4] text-[#ACA9A2] px-2 py-0.5 rounded">
                                        {typeLabel}
                                     </span>
                                     <button 
                                       onClick={() => onDeleteMaintenanceTask(task.id)}
                                       className="opacity-0 group-hover:opacity-100 p-1 text-[#ACA9A2] hover:text-[#C0280F] rounded transition-all ml-auto self-start"
                                     >
                                        <Trash2 size={13} />
                                     </button>
                                  </div>

                                  <div>
                                     <h5 className="text-xs font-black text-[#14120E] uppercase leading-tight">{task.title}</h5>
                                     <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#7A776F] mt-1.5">
                                        {task.targetType === 'space' && <Monitor size={12} className="text-[#1A56DB]" />}
                                        {task.targetType === 'equipment' && <Layers size={12} className="text-[#1A56DB]" />}
                                        {task.targetType === 'general' && <Building2 size={12} className="text-[#1A56DB]" />}
                                        <span className="line-clamp-1">{task.targetName}</span>
                                     </div>
                                  </div>

                                  {task.notes && (
                                     <p className="text-[10px] text-[#7A776F] bg-[#FAF8F4] p-2 rounded-xl italic font-medium leading-relaxed border border-[#E4E0D8]/30">
                                        {task.notes}
                                     </p>
                                  )}

                                  <div className="flex flex-wrap gap-1.5 items-center justify-between border-t border-[#FAF8F4] pt-3 mt-1">
                                     <div className="flex gap-1">
                                        <span className={`text-[8px] font-black uppercase tracking-wider border px-1.5 py-0.5 rounded-full ${priorityColor}`}>
                                           {task.priority === 'high' ? 'Urgent' : task.priority === 'medium' ? 'Normal' : 'Faible'}
                                        </span>
                                        {task.cost && task.cost > 0 ? (
                                           <span className="text-[8px] font-black uppercase tracking-wider bg-[#E6F8F4] text-[#0E7866] border border-[#0E7866]/20 px-1.5 py-0.5 rounded-full">
                                              {task.cost} DT
                                           </span>
                                        ) : null}
                                     </div>
                                     <span className="text-[9px] font-bold text-[#ACA9A2] flex items-center gap-1">
                                        <Calendar size={10} /> {task.date}
                                     </span>
                                  </div>

                                  <div className="flex gap-1 border-t border-[#FAF8F4]/80 pt-2.5 mt-1.5">
                                     <select 
                                       value={task.status} 
                                       onChange={e => onUpdateMaintenanceTask({ ...task, status: e.target.value as any })}
                                       className="w-full text-[9px] font-black uppercase tracking-wider bg-[#FAF8F4] border border-[#E4E0D8] h-7 px-2 rounded-lg text-[#3D3A34] focus:outline-none"
                                     >
                                        <option value="planned">🧭 Prévu</option>
                                        <option value="todo">📋 À faire</option>
                                        <option value="in_progress">⚡ En cours</option>
                                        <option value="done">✅ Terminé</option>
                                     </select>
                                  </div>
                               </motion.div>
                            );
                         })}

                         {tasksInStatus.length === 0 && (
                            <div className="py-8 text-center border-2 border-dashed border-[#E4E0D8]/40 rounded-2xl flex flex-col items-center justify-center gap-1.5 bg-white/50 flex-1">
                               <Construction size={22} className="text-[#ACA9A2]/60" />
                               <span className="text-[9px] font-black uppercase text-[#ACA9A2] tracking-wider">Aucune tâche</span>
                            </div>
                         )}
                      </div>
                   </div>
                );
             })}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddForm(false)} className="absolute inset-0 bg-[#3D3A34]/40 backdrop-blur-md" />
             <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-[#E4E0D8] overflow-hidden">
                <div className="p-8 border-b border-[#E4E0D8] bg-[#FAF8F4]/30">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#14120E]">Nouvel Espace de Travail</h3>
                </div>
                <form onSubmit={handleSubmitSpace} className="p-8 space-y-6">
                   <div className="space-y-4">
                      <div>
                        <label className={labelStyle}>Nom de la Salle / Espace</label>
                        <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputStyle} placeholder="Ex: Salle Berlin, Bureau 302..." />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelStyle}>Type</label>
                          <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className={inputStyle}>
                            {SPACE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={labelStyle}>Capacité (Pers.)</label>
                          <input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: parseInt(e.target.value)})} className={inputStyle} />
                        </div>
                      </div>
                   </div>
                   <div className="flex gap-4 pt-4">
                      <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 px-8 py-4 bg-[#FAF8F4] text-[#14120E] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F1EDE5] transition-all">Annuler</button>
                      <button type="submit" className="flex-2 px-8 py-4 bg-[#1A56DB] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#1648C4] transition-all shadow-xl">Créer l'espace</button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}

        {showItemForm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowItemForm(false)} className="absolute inset-0 bg-[#3D3A34]/40 backdrop-blur-md" />
             <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-[#E4E0D8] overflow-hidden">
                <div className="p-8 border-b border-[#E4E0D8] bg-[#FAF8F4]/30">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#14120E]">Nouvel Article Inventaire</h3>
                </div>
                <form onSubmit={handleSubmitItem} className="p-8 space-y-6">
                   <div className="space-y-4">
                      <div>
                        <label className={labelStyle}>Désignation de l'article</label>
                        <input required value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className={inputStyle} placeholder="Ex: Chaise Ergonomique, Écran Dell 24'..." />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelStyle}>Catégorie</label>
                          <select value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value as any})} className={inputStyle}>
                            {INVENTORY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={labelStyle}>Quantité Totale</label>
                          <input required type="number" value={itemForm.totalQuantity || ''} onChange={e => setItemForm({...itemForm, totalQuantity: parseInt(e.target.value)})} className={inputStyle} />
                        </div>
                      </div>
                   </div>
                   <div className="flex gap-4 pt-4">
                      <button type="button" onClick={() => setShowItemForm(false)} className="flex-1 px-8 py-4 bg-[#FAF8F4] text-[#14120E] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F1EDE5] transition-all">Annuler</button>
                      <button type="submit" className="flex-2 px-8 py-4 bg-[#1A56DB] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#1648C4] transition-all shadow-xl">Ajouter en stock</button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
        {assigningSpaceId !== null && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAssigningSpaceId(null)} className="absolute inset-0 bg-[#3D3A34]/40 backdrop-blur-md" />
             <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-[#E4E0D8] overflow-hidden">
                <div className="p-8 border-b border-[#E4E0D8] bg-[#FAF8F4]/30 flex justify-between items-center">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#14120E]">Assigner un Équipement</h3>
                  <button type="button" onClick={() => setAssigningSpaceId(null)} className="p-1 text-[#ACA9A2] hover:text-[#14120E] transition-all">
                     <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleAssignSubmit} className="p-8 space-y-6">
                   <div className="space-y-4">
                      <div>
                        <label className={labelStyle}>Article du stock global</label>
                        <select 
                          required 
                          value={selectedItemId} 
                          onChange={e => {
                            setSelectedItemId(e.target.value);
                            setAssignQuantity(1);
                          }} 
                          className={inputStyle}
                        >
                          <option value="">-- Choisir un équipement disponible --</option>
                          {filteredInventory.map(item => {
                            const qty = getAvailableQuantity(item.id);
                            return (
                              <option key={item.id} value={item.id} disabled={qty <= 0}>
                                 {item.name} ({qty} disponibles)
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {selectedItemId && (
                        <div>
                          <label className={labelStyle}>Quantité à assigner</label>
                          <input 
                            required 
                            type="number" 
                            min={1} 
                            max={getAvailableQuantity(selectedItemId)} 
                            value={assignQuantity} 
                            onChange={e => setAssignQuantity(parseInt(e.target.value) || 1)} 
                            className={inputStyle} 
                          />
                        </div>
                      )}
                      
                      {filteredInventory.length === 0 && (
                        <div className="p-4 bg-[#FFF1EE] border border-[#C0280F]/20 text-[#C0280F] text-xs font-bold rounded-xl">
                           Aucun article dans l'inventaire global. Créez d'abord des articles dans l'onglet "Stock Global".
                        </div>
                      )}
                   </div>
                   <div className="flex gap-4 pt-4">
                      <button type="button" onClick={() => setAssigningSpaceId(null)} className="flex-1 px-8 py-4 bg-[#FAF8F4] text-[#14120E] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F1EDE5] transition-all">Annuler</button>
                      <button 
                        type="submit" 
                        disabled={!selectedItemId || getAvailableQuantity(selectedItemId) <= 0}
                        className="flex-2 px-8 py-4 bg-[#1A56DB] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#1648C4] transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         Assigner
                      </button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}

        {showAddTaskForm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddTaskForm(false)} className="absolute inset-0 bg-[#3D3A34]/40 backdrop-blur-md" />
             <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-[#E4E0D8] overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-8 border-b border-[#E4E0D8] bg-[#FAF8F4]/30 flex justify-between items-center">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#14120E]">Déclarer Maintenance / Travaux</h3>
                  <button type="button" onClick={() => setShowAddTaskForm(false)} className="p-1 text-[#ACA9A2] hover:text-[#14120E] transition-all">
                     <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleSubmitTask} className="p-8 space-y-5 overflow-y-auto flex-1">
                   <div className="space-y-4">
                      <div>
                        <label className={labelStyle}>Titre des travaux / Panne</label>
                        <input required value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className={inputStyle} placeholder="Ex: Réparation Clim Bureau, Peinture Salle..." />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div>
                           <label className={labelStyle}>Type</label>
                           <select value={taskForm.type} onChange={e => setTaskForm({...taskForm, type: e.target.value as any})} className={inputStyle}>
                              <option value="repair">Réparation 🛠️</option>
                              <option value="maintenance">Entretien ⚙️</option>
                              <option value="work">Travaux 🧱</option>
                              <option value="other">Autre 📁</option>
                           </select>
                         </div>
                         <div>
                           <label className={labelStyle}>Priorité</label>
                           <select value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value as any})} className={inputStyle}>
                              <option value="low">Faible</option>
                              <option value="medium">Normal</option>
                              <option value="high">Urgent 🚨</option>
                           </select>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div>
                           <label className={labelStyle}>Cible</label>
                           <select 
                             value={taskForm.targetType} 
                             onChange={e => setTaskForm({
                               ...taskForm, 
                               targetType: e.target.value as any,
                               targetId: ''
                             })} 
                             className={inputStyle}
                           >
                              <option value="general">Général</option>
                              <option value="space">Salle / Bureau</option>
                              <option value="equipment">Équipement du stock</option>
                           </select>
                         </div>
                         <div>
                           <label className={labelStyle}>Statut Initial</label>
                           <select value={taskForm.status} onChange={e => setTaskForm({...taskForm, status: e.target.value as any})} className={inputStyle}>
                              <option value="planned">Prévu</option>
                              <option value="todo">À Faire</option>
                              <option value="in_progress">En Cours</option>
                              <option value="done">Terminé</option>
                           </select>
                         </div>
                      </div>

                      {taskForm.targetType === 'space' && (
                        <div>
                          <label className={labelStyle}>Sélectionner la Salle / Espace</label>
                          <select required value={taskForm.targetId} onChange={e => setTaskForm({...taskForm, targetId: e.target.value})} className={inputStyle}>
                             <option value="">-- Choisir une salle --</option>
                             {filteredSpaces.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
                          </select>
                        </div>
                      )}

                      {taskForm.targetType === 'equipment' && (
                        <div>
                          <label className={labelStyle}>Sélectionner l'Équipement du stock</label>
                          <select required value={taskForm.targetId} onChange={e => setTaskForm({...taskForm, targetId: e.target.value})} className={inputStyle}>
                             <option value="">-- Choisir un équipement --</option>
                             {filteredInventory.map(i => <option key={i.id} value={i.id}>{i.name} (Dispo: {getAvailableQuantity(i.id)})</option>)}
                          </select>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                         <div>
                           <label className={labelStyle}>Planifié le / Date</label>
                           <input type="date" required value={taskForm.date} onChange={e => setTaskForm({...taskForm, date: e.target.value})} className={inputStyle} />
                         </div>
                         <div>
                           <label className={labelStyle}>Coût Estimé (DT)</label>
                           <input type="number" min={0} value={taskForm.cost || ''} onChange={e => setTaskForm({...taskForm, cost: parseFloat(e.target.value) || 0})} className={inputStyle} placeholder="Coût en DT" />
                         </div>
                      </div>

                      <div>
                        <label className={labelStyle}>Notes / Description</label>
                        <textarea value={taskForm.notes} onChange={e => setTaskForm({...taskForm, notes: e.target.value})} className="w-full h-20 p-3 px-4 rounded-xl bg-[#FAF8F4] border border-[#E4E0D8] font-bold text-xs focus:ring-2 focus:ring-[#1A56DB]/20 outline-none transition-all resize-none" placeholder="Détaillez les réparations ou le cahier des charges..." />
                      </div>
                   </div>
                   <div className="flex gap-4 pt-2">
                      <button type="button" onClick={() => setShowAddTaskForm(false)} className="flex-1 px-8 py-4 bg-[#FAF8F4] text-[#14120E] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F1EDE5] transition-all">Annuler</button>
                      <button type="submit" className="flex-2 px-8 py-4 bg-[#1A56DB] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#1648C4] transition-all shadow-xl">Enregistrer</button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatusIcon = ({ status }: { status: 'functional' | 'broken' | 'maintenance' }) => {
  switch (status) {
    case 'functional': return <CheckCircle2 size={14} className="text-[#0E7866]" />;
    case 'maintenance': return <Construction size={14} className="text-[#1A56DB]" />;
    case 'broken': return <AlertTriangle size={14} className="text-[#C0280F]" />;
    default: return <Box size={14} className="text-[#ACA9A2]" />;
  }
};

export default CoworkingSpace;
