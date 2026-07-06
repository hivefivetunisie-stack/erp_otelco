
import React, { useState } from 'react';
import { 
  FileText, Settings, History as HistoryIcon, LayoutDashboard, 
  ShoppingCart, Upload, Users, Package, LogOut, ShieldCheck, Clock,
  Menu, X, FileCheck, Monitor, Coffee, Calendar
} from 'lucide-react';
import { Invoice, Purchase, ClientInfo, Article, IssuerInfo as Issuer, UserProfile } from '../types';

export type ViewType = 'dashboard' | 'nouvelle' | 'historique' | 'achats' | 'import-achat' | 'clients' | 'articles' | 'parametres' | 'pointage' | 'coworking' | 'buvette' | 'utilisateurs' | 'agenda';

interface LayoutProps {
  children: React.ReactNode;
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  issuers: Issuer[];
  primaryIssuer: Issuer;
  selectedIssuerIds: string[];
  onToggleIssuer: (id: string, multi: boolean) => void;
  onToggleAllIssuers: () => void;
  onLogout: () => void;
  profile?: UserProfile | null;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeView, 
  onViewChange,
  issuers,
  primaryIssuer,
  selectedIssuerIds,
  onToggleIssuer,
  onToggleAllIssuers,
  onLogout,
  profile
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleNavClick = (view: ViewType) => {
    onViewChange(view);
    setIsSidebarOpen(false);
  };

  const isAllSelected = issuers.length > 0 && selectedIssuerIds.length === issuers.length;

  return (
    <div className="flex min-h-screen bg-[#FAF8F4] font-['Sora'] text-[#14120E]">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] md:hidden no-print"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on Print */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-[120] w-[240px] bg-[#14120E] border-r border-white/5 
        flex flex-col no-print transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Company Selector Section */}
        <div className="p-5 border-b border-white/10">
           <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Entreprises</span>
              <button 
                onClick={onToggleAllIssuers}
                className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest transition-all ${isAllSelected ? 'bg-[#1A56DB] text-white' : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/60'}`}
              >
                {isAllSelected ? 'TOUTES' : 'VOIR TOUT'}
              </button>
           </div>
           
           <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
              {issuers.map(issuer => (
                <div 
                  key={issuer.id}
                  onClick={(e) => onToggleIssuer(issuer.id, e.shiftKey || e.metaKey || e.ctrlKey)}
                  className={`flex items-center gap-2.5 p-2 rounded-xl border border-transparent cursor-pointer transition-all group ${selectedIssuerIds.includes(issuer.id) ? 'bg-white/10 border-white/10' : 'hover:bg-white/5'}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 overflow-hidden ${selectedIssuerIds.includes(issuer.id) ? 'bg-[#1A56DB] text-white' : 'bg-white/5 text-white/40'}`}>
                    {issuer.logoUrl ? <img src={issuer.logoUrl} className="w-full h-full object-cover" /> : issuer.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[10px] font-bold truncate ${selectedIssuerIds.includes(issuer.id) ? 'text-white' : 'text-white/50 group-hover:text-white/80'}`}>{issuer.name}</p>
                    <p className="text-[8px] text-white/20 font-mono truncate tracking-tight">{issuer.mf}</p>
                  </div>
                  {selectedIssuerIds.includes(issuer.id) && (
                    <div className="w-1.5 h-1.5 bg-[#1A56DB] rounded-full"></div>
                  )}
                </div>
              ))}
              {issuers.length === 0 && (
                <button 
                  onClick={() => onViewChange('parametres')}
                  className="w-full p-2 border border-dashed border-white/10 rounded-xl text-[10px] text-white/30 hover:bg-white/5 transition-all"
                >
                  Ajouter une entreprise
                </button>
              )}
           </div>
        </div>

        <nav className="flex-1 p-[14px_10px] overflow-y-auto custom-scrollbar">
          <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest px-2.5 pt-2.5 pb-1">Principal</div>
          <NavItem 
            icon={<LayoutDashboard size={16} />} 
            label="Tableau de bord" 
            active={activeView === 'dashboard'} 
            onClick={() => handleNavClick('dashboard')} 
          />
          {(profile?.permissions?.canManageInvoices || profile?.role === 'admin') && (
            <>
              <NavItem 
                icon={<FileText size={16} />} 
                label="Nouvelle facture" 
                active={activeView === 'nouvelle'} 
                onClick={() => handleNavClick('nouvelle')} 
              />
              <NavItem 
                icon={<HistoryIcon size={16} />} 
                label="Factures vente" 
                active={activeView === 'historique'} 
                onClick={() => handleNavClick('historique')} 
              />
            </>
          )}

          {(profile?.permissions?.canManagePurchases || profile?.role === 'admin') && (
            <>
              <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest px-2.5 pt-6 pb-1">Achats</div>
              <NavItem 
                icon={<ShoppingCart size={16} />} 
                label="Journal des achats" 
                active={activeView === 'achats'} 
                onClick={() => handleNavClick('achats')} 
              />
              <NavItem 
                icon={<Upload size={16} />} 
                label="Scan facture (IA)" 
                active={activeView === 'import-achat'} 
                onClick={() => handleNavClick('import-achat')} 
              />
            </>
          )}

          <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest px-2.5 pt-6 pb-1">Gestion</div>
          {(profile?.permissions?.canManageClients || profile?.role === 'admin') && (
            <NavItem 
              icon={<Users size={16} />} 
              label="Clients" 
              active={activeView === 'clients'} 
              onClick={() => handleNavClick('clients')} 
            />
          )}
          {(profile?.permissions?.canManageArticles || profile?.role === 'admin') && (
            <NavItem 
              icon={<Package size={16} />} 
              label="Articles" 
              active={activeView === 'articles'} 
              onClick={() => handleNavClick('articles')} 
            />
          )}
          {(profile?.permissions?.canManageAttendance || profile?.role === 'admin') && (
            <NavItem 
              icon={<Clock size={16} />} 
              label="Pointage & Employés" 
              active={activeView === 'pointage'} 
              onClick={() => handleNavClick('pointage')} 
            />
          )}
          
          <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest px-2.5 pt-6 pb-1">Coworking</div>
          {(profile?.permissions?.canManageSpaces || profile?.permissions?.canManageSubscriptions || profile?.role === 'admin') && (
            <NavItem 
              icon={<Monitor size={16} />} 
              label="Espace Coworking" 
              active={activeView === 'coworking'} 
              onClick={() => handleNavClick('coworking')} 
            />
          )}
          {(profile?.permissions?.canManageSpaces || profile?.role === 'admin') && (
            <NavItem 
              icon={<Calendar size={16} />} 
              label="Agenda & Salles" 
              active={activeView === 'agenda'} 
              onClick={() => handleNavClick('agenda')} 
            />
          )}
          {(profile?.permissions?.canManageBuvette || profile?.permissions?.canManageSales || profile?.role === 'admin') && (
            <NavItem 
              icon={<Coffee size={16} />} 
              label="Buvette / Snack" 
              active={activeView === 'buvette'} 
              onClick={() => handleNavClick('buvette')} 
            />
          )}

          {(profile?.permissions?.canManageSettings || profile?.role === 'admin') && (
            <NavItem 
              icon={<Settings size={16} />} 
              label="Paramètres" 
              active={activeView === 'parametres'} 
              onClick={() => handleNavClick('parametres')} 
            />
          )}

          {(profile?.permissions?.canManageUsers || profile?.role === 'admin') && (
            <>
              <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest px-2.5 pt-6 pb-1">Administration</div>
              <NavItem 
                icon={<ShieldCheck size={16} />} 
                label="Utilisateurs & Accès" 
                active={activeView === 'utilisateurs'} 
                onClick={() => handleNavClick('utilisateurs')} 
              />
            </>
          )}
        </nav>

        <div className="p-[14px_20px] border-t border-white/10">
          <div className="text-xs text-white/40 font-medium truncate">{issuers.length > 1 ? `${selectedIssuerIds.length} Sociétés actives` : primaryIssuer?.name || 'HiveFive'}</div>
          <div className="text-[10px] text-white/25 font-mono mt-0.5">{selectedIssuerIds.length === 1 ? `MF: ${primaryIssuer?.mf}` : 'Multi-Dashboard View'}</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 md:ml-[240px]">
        {/* Header - Hidden on Print */}
        <header className="h-[60px] bg-white border-b border-[#E4E0D8] flex items-center justify-between px-4 md:px-7 no-print sticky top-0 z-50 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 md:hidden bg-[#1A56DB]/5 hover:bg-[#1A56DB]/10 text-[#1A56DB] rounded-xl transition-all"
              aria-label="Menu"
            >
              {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <h1 className="text-sm md:text-[15px] font-semibold text-[#14120E] truncate">
              {activeView === 'nouvelle' ? 'Nouvelle facture' : activeView.charAt(0).toUpperCase() + activeView.slice(1).replace('-', ' ')}
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
             <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#E6F8F4] text-[#0E7866] border border-[#A7E8DC] text-[11px] font-bold hover:bg-[#CCF5EC] transition-all">
                <ShieldCheck size={14} /> Sync
             </button>
             <button 
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E4E0D8] text-[11px] font-bold text-[#3D3A34] hover:bg-[#F1EDE5] transition-all"
             >
                <LogOut size={14} /> Déconnexion
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-[#FAF8F4]">
          {children}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-xl transition-all text-sm md:text-xs font-medium ${active ? 'bg-[#1A56DB]/20 text-[#7FB3FF]' : 'text-white/55 hover:bg-white/5 hover:text-white/90'}`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default Layout;
