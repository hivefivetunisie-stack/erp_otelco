
import React from 'react';
import { UserProfile, UserPermissions } from '../types';
import { DEFAULT_USER_PERMISSIONS, SERVEUR_USER_PERMISSIONS } from '../constants';
import { Users, Shield, UserCheck, UserX, Settings2, AtSign, Building, Check, AlertTriangle, Share2, Copy, Mail, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

interface UserManagementProps {
  users: UserProfile[];
  onAddUser: (email: string, displayName: string, role: UserProfile['role'], permissions: UserPermissions, employeeRole?: string) => void;
  onUpdateUser: (user: UserProfile) => void;
  onDeleteUser: (uid: string) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, onAddUser, onUpdateUser, onDeleteUser }) => {
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [newUser, setNewUser] = React.useState({
    email: '',
    displayName: '',
    role: 'editor' as UserProfile['role'] | 'serveur',
  });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.displayName) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (newUser.role === 'serveur') {
      onAddUser(newUser.email, newUser.displayName, 'editor', SERVEUR_USER_PERMISSIONS, 'Serveur');
    } else {
      onAddUser(newUser.email, newUser.displayName, newUser.role as UserProfile['role'], DEFAULT_USER_PERMISSIONS);
    }
    setNewUser({ email: '', displayName: '', role: 'editor' });
    setShowAddForm(false);
  };


  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const labelStyle = "text-[10px] font-black uppercase text-[#ACA9A2] mb-1.5 block tracking-widest";

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[2.5rem] border border-[#E4E0D8]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#1A56DB] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#1A56DB]/20">
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#14120E] uppercase tracking-tighter">Gestion des utilisateurs</h1>
            <p className="text-sm text-[#7A776F] font-medium">Contrôlez les accès et les permissions de votre équipe.</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-[#14120E] text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center gap-2"
        >
          {showAddForm ? 'FERMER' : 'AJOUTER UN UTILISATEUR'}
        </button>
      </div>

      {showAddForm && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[2.5rem] border border-[#1A56DB] shadow-xl space-y-6"
        >
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-[#14120E] uppercase tracking-tight">Nouvel Utilisateur</h2>
            <span className="px-2 py-1 bg-amber-50 text-amber-700 text-[9px] font-black uppercase tracking-widest rounded-lg border border-amber-200">⚠️ Envoi Manuel</span>
          </div>

          <div className="bg-amber-50/70 border border-amber-500/15 rounded-3xl p-5 flex gap-3.5 text-amber-950 font-sans">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-black uppercase tracking-widest text-[9px] text-amber-800">Comment transmettre l'accès ? (Important)</p>
              <p className="font-medium text-amber-900/90 leading-relaxed text-[10.5px]">
                Le système de sécurité n'envoie pas d'e-mail d'invitation automatisé. Une fois l'utilisateur créé ci-dessous :
              </p>
              <ul className="list-disc pl-4 space-y-1 font-bold text-amber-950 text-[10.5px]">
                <li>Vous obtiendrez un bouton de partage instantané (WhatsApp, E-mail ou Copie) sur sa fiche.</li>
                <li>Le collaborateur aura simplement à visiter le site et cliquer sur <strong>"Se connecter avec Google"</strong>.</li>
                <li>Il doit impérativement utiliser le compte Google de l'adresse email spécifiée ici pour déverrouiller son accès.</li>
              </ul>
            </div>
          </div>

          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className={labelStyle}>Nom Complet</label>
              <input 
                type="text" 
                value={newUser.displayName}
                onChange={(e) => setNewUser({...newUser, displayName: e.target.value})}
                placeholder="Ex: Jean Dupont"
                className="w-full h-12 px-4 rounded-xl bg-[#FAF8F4] border border-[#E4E0D8] font-bold text-sm focus:ring-2 focus:ring-[#1A56DB]/20 outline-none"
              />
            </div>
            <div>
              <label className={labelStyle}>Adresse Email</label>
              <input 
                type="email" 
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                placeholder="jean@exemple.com"
                className="w-full h-12 px-4 rounded-xl bg-[#FAF8F4] border border-[#E4E0D8] font-bold text-sm focus:ring-2 focus:ring-[#1A56DB]/20 outline-none"
              />
            </div>
            <div>
              <label className={labelStyle}>Rôle Initial</label>
              <select 
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                className="w-full h-12 px-4 rounded-xl bg-[#FAF8F4] border border-[#E4E0D8] font-bold text-sm focus:ring-2 focus:ring-[#1A56DB]/20 outline-none"
              >
                <option value="editor">Éditeur (Permissions personnalisées)</option>
                <option value="serveur">Serveur / Cafétéria (Caisse uniquement)</option>
                <option value="manager">Manager</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
          </form>
          <div className="flex justify-end">
            <button 
              onClick={handleAddUser}
              className="bg-[#1A56DB] text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#1648C4] transition-all shadow-lg"
            >
              CRÉER LE COMPTE
            </button>
          </div>
        </motion.div>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#ACA9A2]">
          <Users size={18} />
        </div>
        <input 
          type="text" 
          placeholder="Rechercher un utilisateur par nom ou email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-14 pl-12 pr-6 rounded-[1.5rem] bg-white border border-[#E4E0D8] font-bold text-sm focus:ring-2 focus:ring-[#1A56DB]/20 shadow-sm outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredUsers.map(user => (
          <UserCard 
            key={user.uid} 
            user={user} 
            onUpdate={onUpdateUser} 
            onDelete={onDeleteUser} 
            labelStyle={labelStyle}
          />
        ))}
      </div>
    </div>
  );
};

const UserCard = ({ user, onUpdate, onDelete, labelStyle }: { user: UserProfile, onUpdate: (u: UserProfile) => void, onDelete: (uid: string) => void, labelStyle: string }) => {
  const RoleButton = ({ role, active, onClick, color, label }: { role: string, active: boolean, onClick: () => void, color: string, label: string }) => (
    <button
      onClick={onClick}
      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
        active ? color : 'bg-[#FAF8F4] text-[#ACA9A2] hover:bg-[#F1EDE5]'
      } ${!active && role === 'manager' ? 'border border-dashed border-[#1A56DB]/20' : ''}`}
    >
      {label}
    </button>
  );

  const [localUser, setLocalUser] = React.useState<UserProfile>(user);
  const [isSaving, setIsSaving] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setLocalUser(user);
  }, [user]);

  const hasChanges = JSON.stringify(localUser) !== JSON.stringify(user);

  const togglePermission = (permission: keyof UserPermissions) => {
    setLocalUser({
      ...localUser,
      permissions: {
        ...(localUser.permissions || DEFAULT_USER_PERMISSIONS),
        [permission]: !localUser.permissions?.[permission]
      }
    });
  };

  const updateRole = (role: UserProfile['role']) => {
    setLocalUser({ ...localUser, role });
  };

  const updateStatus = (status: UserProfile['status']) => {
    setLocalUser({ ...localUser, status });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(localUser);
    } finally {
      setIsSaving(false);
    }
  };

  const applyManagerTemplate = () => {
    setLocalUser({
      ...localUser,
      role: 'manager',
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
        canManageUsers: false,
        canManageSettings: true
      }
    });
  };

  const applyServeurTemplate = () => {
    setLocalUser({
      ...localUser,
      role: 'editor',
      employeeRole: 'Serveur',
      permissions: {
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
      }
    });
  };

  return (
    <motion.div 
      layout
      className={`bg-white rounded-[2rem] border p-8 shadow-sm group transition-all ${
        hasChanges ? 'border-[#1A56DB] ring-4 ring-[#1A56DB]/5' : 'border-[#E4E0D8] hover:border-[#1A56DB]/50'
      }`}
    >
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#FAF8F4] rounded-xl flex items-center justify-center text-[#14120E] font-black text-xl">
                {localUser.displayName?.charAt(0) || '?'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-[#14120E] uppercase tracking-tight">{localUser.displayName || 'Utilisateur'}</h3>
                  {localUser.uid?.startsWith('invite_') && (
                    <span className="px-2 py-0.5 bg-[#FFF4E5] text-[#B25E09] text-[8px] font-black uppercase rounded-md border border-[#B25E09]/10">Invitation</span>
                  )}
                  {localUser.employeeRole && (
                    <span className="px-2 py-0.5 bg-[#EBF2FF] text-[#1A56DB] text-[8px] font-black uppercase rounded-md border border-[#1A56DB]/10">Poste: {localUser.employeeRole}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[#7A776F] font-bold text-[10px] mb-3">
                  <AtSign size={10} /> {localUser.email}
                </div>

                {localUser.uid?.startsWith('invite_') && (
                  <div className="p-4 rounded-2xl bg-amber-50/65 border border-amber-500/15 space-y-3 font-sans max-w-lg mt-3">
                    <div className="flex items-center gap-1.5 text-amber-900">
                      <Share2 size={12} className="text-amber-700 shrink-0" />
                      <span className="text-[9px] font-black uppercase tracking-wider">Partager l'accès à ce collaborateur</span>
                    </div>
                    <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                      Aucun email automatique n'est généré. Utilisez impérativement les boutons ci-dessous pour lui transmettre son accès :
                    </p>
                    
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => {
                          const text = `Bonjour ${localUser.displayName || ''},\n\nVous êtes invité(e) à rejoindre notre espace de travail sur My Hive Five.\n\n🔗 Lien d'accès : ${window.location.origin}\n\n⚠️ TRÈS IMPORTANT :\nLors de votre première connexion, cliquez sur "Se connecter avec Google" et utilisez impérativement votre adresse email : ${localUser.email}\nIl s'agit de l'adresse autorisée par l'administrateur.\n\nÀ bientôt !`;
                          navigator.clipboard.writeText(text);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="px-2.5 py-1.5 bg-amber-600 text-white font-black text-[8.5px] uppercase tracking-wider rounded-lg hover:bg-amber-700 transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
                      >
                        {copied ? <Check size={11} /> : <Copy size={11} />}
                        {copied ? "COPIÉ !" : "COPIER LE MESSAGE"}
                      </button>
                      
                      <a
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                          `Bonjour ${localUser.displayName || ''},\n\nVous êtes invité(e) à rejoindre notre espace de travail sur My Hive Five.\n\n🔗 Lien d'accès : ${window.location.origin}\n\n⚠️ TRÈS IMPORTANT :\nLors de votre première connexion, cliquez sur "Se connecter avec Google" et utilisez impérativement votre adresse email : ${localUser.email}\nIl s'agit de l'adresse autorisée par l'administrateur.\n\nÀ bientôt !`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-emerald-600 text-white font-black text-[8.5px] uppercase tracking-wider rounded-lg hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-xs active:scale-95 text-center no-underline"
                      >
                        <MessageSquare size={11} />
                        SUR WHATSAPP
                      </a>

                      <a
                        href={`mailto:${localUser.email}?subject=${encodeURIComponent("Invitation My Hive Five")}&body=${encodeURIComponent(
                          `Bonjour ${localUser.displayName || ''},\n\nVous êtes invité(e) à rejoindre notre espace de travail sur My Hive Five.\n\n🔗 Lien d'accès : ${window.location.origin}\n\n⚠️ TRÈS IMPORTANT :\nLors de votre première connexion, cliquez sur "Se connecter avec Google" et utilisez impérativement votre adresse email : ${localUser.email}\nIl s'agit de l'adresse autorisée par l'administrateur.\n\nÀ bientôt !`
                        )}`}
                        className="px-2.5 py-1.5 bg-indigo-600 text-white font-black text-[8.5px] uppercase tracking-wider rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-1.5 shadow-xs active:scale-95 text-center no-underline"
                      >
                        <Mail size={11} />
                        PAR E-MAIL
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select 
                value={localUser.status}
                onChange={(e) => updateStatus(e.target.value as any)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none border transition-all ${
                  localUser.status === 'active' ? 'bg-[#E6F8F4] text-[#0E7866] border-[#0E7866]/20' : 
                  localUser.status === 'pending' ? 'bg-[#FFF1EE] text-[#C0280F] animate-pulse border-[#C0280F]/20' : 
                  'bg-gray-100 text-gray-500 border-gray-200'
                }`}
              >
                <option value="pending">En attente</option>
                <option value="active">Actif</option>
                <option value="suspended">Suspendu</option>
              </select>
              <button 
                onClick={() => onDelete(localUser.uid)}
                className="p-2 text-[#ACA9A2] hover:text-[#C0280F] transition-colors"
                title="Supprimer"
              >
                <UserX size={18} />
              </button>
            </div>
          </div>
 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[#FAF8F4]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className={labelStyle}>Rôle Système</label>
                {localUser.role === 'manager' && (
                   <button 
                     onClick={applyManagerTemplate}
                     className="text-[8px] font-black uppercase text-[#1A56DB] hover:underline"
                   >
                     Appliquer Modèle Manager
                   </button>
                )}
                {localUser.role === 'editor' && (
                   <button 
                     onClick={applyServeurTemplate}
                     className="text-[8px] font-black uppercase text-[#0E7866] hover:underline"
                   >
                     Appliquer Modèle Serveur (Buvette)
                   </button>
                )}
              </div>
              <div className="flex gap-2">
                <RoleButton 
                  role="admin" 
                  active={localUser.role === 'admin'} 
                  onClick={() => updateRole('admin')} 
                  color="bg-[#14120E] text-white"
                  label="Admin" 
                />
                <RoleButton 
                  role="manager" 
                  active={localUser.role === 'manager'} 
                  onClick={() => updateRole('manager')} 
                  color="bg-[#1A56DB] text-white"
                  label="Manager" 
                />
                <RoleButton 
                  role="editor" 
                  active={localUser.role === 'editor'} 
                  onClick={() => updateRole('editor')} 
                  color="bg-[#0E7866] text-white"
                  label="Éditeur" 
                />
              </div>
              
              <div className="mt-8">
                 <button 
                   disabled={!hasChanges || isSaving}
                   onClick={handleSave}
                   className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${
                     hasChanges 
                       ? 'bg-[#1A56DB] text-white hover:bg-[#1648C4] shadow-[#1A56DB]/20' 
                       : 'bg-[#FAF8F4] text-[#ACA9A2] cursor-not-allowed border border-[#E4E0D8]'
                   }`}
                 >
                   {isSaving ? (
                     <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                   ) : (
                     <>
                       <Check size={16} />
                       VALIDER LES ACCÈS
                     </>
                   )}
                 </button>
                 {hasChanges && !isSaving && (
                   <button 
                     onClick={() => setLocalUser(user)}
                     className="w-full mt-2 py-2 text-[9px] font-black uppercase text-[#ACA9A2] hover:text-[#7A776F] transition-colors"
                   >
                     Annuler les modifications
                   </button>
                 )}
              </div>
            </div>
            <div>
              <label className={labelStyle}>Permissions Spécifiques</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                 <PermissionToggle 
                   label="Finance" 
                   active={!!localUser.permissions?.canViewFinancials} 
                   onToggle={() => togglePermission('canViewFinancials')} 
                 />
                 <PermissionToggle 
                   label="Factures" 
                   active={!!localUser.permissions?.canManageInvoices} 
                   onToggle={() => togglePermission('canManageInvoices')} 
                 />
                 <PermissionToggle 
                   label="Achats" 
                   active={!!localUser.permissions?.canManagePurchases} 
                   onToggle={() => togglePermission('canManagePurchases')} 
                 />
                 <PermissionToggle 
                   label="Inventaire" 
                   active={!!localUser.permissions?.canManageInventory} 
                   onToggle={() => togglePermission('canManageInventory')} 
                 />
                 <PermissionToggle 
                   label="Espaces" 
                   active={!!localUser.permissions?.canManageSpaces} 
                   onToggle={() => togglePermission('canManageSpaces')} 
                 />
                 <PermissionToggle 
                   label="Ventes" 
                   active={!!localUser.permissions?.canManageSales} 
                   onToggle={() => togglePermission('canManageSales')} 
                 />
                 <PermissionToggle 
                   label="Buvette" 
                   active={!!localUser.permissions?.canManageBuvette} 
                   onToggle={() => togglePermission('canManageBuvette')} 
                 />
                 <PermissionToggle 
                   label="Clients" 
                   active={!!localUser.permissions?.canManageClients} 
                   onToggle={() => togglePermission('canManageClients')} 
                 />
                 <PermissionToggle 
                   label="Articles" 
                   active={!!localUser.permissions?.canManageArticles} 
                   onToggle={() => togglePermission('canManageArticles')} 
                 />
                 <PermissionToggle 
                   label="Abonnements" 
                   active={!!localUser.permissions?.canManageSubscriptions} 
                   onToggle={() => togglePermission('canManageSubscriptions')} 
                 />
                 <PermissionToggle 
                   label="Pointage" 
                   active={!!localUser.permissions?.canManageAttendance} 
                   onToggle={() => togglePermission('canManageAttendance')} 
                 />
                 <PermissionToggle 
                   label="Employés" 
                   active={!!localUser.permissions?.canManageEmployees} 
                   onToggle={() => togglePermission('canManageEmployees')} 
                 />
                 <PermissionToggle 
                   label="Opérations" 
                   active={!!localUser.permissions?.canManageOperations} 
                   onToggle={() => togglePermission('canManageOperations')} 
                 />
                 <PermissionToggle 
                   label="Équipe" 
                   active={!!localUser.permissions?.canManageUsers} 
                   onToggle={() => togglePermission('canManageUsers')} 
                 />
                 <PermissionToggle 
                   label="Réglages" 
                   active={!!localUser.permissions?.canManageSettings} 
                   onToggle={() => togglePermission('canManageSettings')} 
                 />
               </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const PermissionToggle = ({ label, active, onToggle }: { label: string, active: boolean, onToggle: () => void }) => (
  <button 
    onClick={onToggle}
    className={`px-4 py-2.5 rounded-xl border flex items-center justify-between group transition-all ${
      active ? 'bg-[#EBF2FF] border-[#1A56DB]/20 text-[#1A56DB]' : 'bg-white border-[#E4E0D8] text-[#ACA9A2] hover:border-[#1A56DB]'
    }`}
  >
    <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    <div className={`w-3 h-3 rounded-full ${active ? 'bg-[#1A56DB]' : 'bg-[#E4E0D8]'}`} />
  </button>
);

export default UserManagement;
