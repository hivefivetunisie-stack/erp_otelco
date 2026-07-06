import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Plus, Trash2, Edit3, Check, AlertCircle, 
  RefreshCw, Send, MapPin, User, Mail, Search, CalendarPlus, 
  Sparkles, Globe, Link2, Info, CheckCircle2, ChevronRight
} from 'lucide-react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, where, doc, setDoc, deleteDoc, updateDoc } from '../services/db';
import { MeetingReservation, Space, ClientInfo } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  requestCalendarToken, 
  getCachedToken, 
  clearCachedToken, 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent 
} from '../services/googleCalendar';

interface AgendaProps {
  spaces: Space[];
  clients: ClientInfo[];
  issuerId: string;
  userId: string;
}

const Agenda: React.FC<AgendaProps> = ({ spaces, clients, issuerId, userId }) => {
  const [reservations, setReservations] = useState<MeetingReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [googleToken, setGoogleToken] = useState<string | null>(getCachedToken());
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedRes, setSelectedRes] = useState<MeetingReservation | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [filterByDate, setFilterByDate] = useState(true);

  // If view mode is timeline, force date filtering
  useEffect(() => {
    if (viewMode === 'timeline') {
      setFilterByDate(true);
    }
  }, [viewMode]);

  // Interactive timeline settings and helper tools
  const hoursOfDay = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

  const timeToMinutes = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  const checkOverlap = (
    spaceId: string, 
    date: string, 
    startTime: string, 
    endTime: string, 
    excludeId?: string
  ) => {
    if (!spaceId || !date || !startTime || !endTime) return null;
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);

    return reservations.find(res => {
      if (excludeId && res.id === excludeId) return false;
      if (res.spaceId !== spaceId || res.date !== date) return false;

      const resStart = timeToMinutes(res.startTime);
      const resEnd = timeToMinutes(res.endTime);

      return resStart < endMin && resEnd > startMin;
    });
  };

  const getReservationForSlot = (spaceId: string, hourStr: string) => {
    const slotStart = timeToMinutes(hourStr);
    const slotEnd = slotStart + 60; // 1-hour interval duration

    // Filter reservations on the selected date for this workspace room
    const dayReservations = reservations.filter(res => 
      res.date === selectedDay && 
      res.spaceId === spaceId
    );

    return dayReservations.find(res => {
      const resStart = timeToMinutes(res.startTime);
      const resEnd = timeToMinutes(res.endTime);
      // Determine if there are any overlaps in time indices
      return resStart < slotEnd && resEnd > slotStart;
    });
  };

  const handleSlotClick = (space: Space, hourStr: string) => {
    const [h, m] = hourStr.split(':').map(Number);
    const nextH = h + 1;
    const nextHourStr = `${nextH < 10 ? '0' : ''}${nextH}:${m < 10 ? '0' : ''}${m}`;

    setFormData(prev => ({
      ...prev,
      date: selectedDay,
      spaceId: space.id,
      spaceName: space.name,
      startTime: hourStr,
      endTime: nextHourStr,
    }));
    setIsEditing(false);
    setShowAddForm(true);
  };

  // Reservation form properties
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:00',
    spaceId: '',
    spaceName: '',
    clientId: '',
    clientName: '',
    clientEmail: '',
    syncToGoogle: true
  });

  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Filter meeting rooms (Salle de Réunion) or typical bookable spaces
  const meetingRooms = spaces.filter(s => s.issuerId === issuerId && (s.type === 'Salle de Réunion' || s.type === 'Bureau Privé'));
  const allIssuerSpaces = spaces.filter(s => s.issuerId === issuerId);
  const activeSpaces = meetingRooms.length > 0 ? meetingRooms : allIssuerSpaces;

  // Real-time Reservations subscription
  useEffect(() => {
    if (!issuerId) return;

    setLoading(true);
    const q = query(
      collection(db, 'reservations'),
      where('issuerId', '==', issuerId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MeetingReservation[];
      
      // Sort in-memory chronologically
      list.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });

      setReservations(list);
      setLoading(false);
    }, (error) => {
      console.error("Firestore onSnapshot error for reservations:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [issuerId]);

  // Synchronize internal Google Token cache state
  useEffect(() => {
    setGoogleToken(getCachedToken());
  }, []);

  // Set default space in form if rooms are available
  useEffect(() => {
    if (activeSpaces.length > 0 && !formData.spaceId) {
      setFormData(prev => ({
        ...prev,
        spaceId: activeSpaces[0].id,
        spaceName: activeSpaces[0].name
      }));
    }
  }, [activeSpaces]);

  // Auto-connect token check
  const connectGoogle = async () => {
    setSyncLoading(true);
    setSyncMessage(null);
    try {
      const token = await requestCalendarToken();
      if (token) {
        setGoogleToken(token);
        setSyncMessage({ type: 'success', text: 'Google Calendar connecté avec succès !' });
      }
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err.message || 'Échec de la connexion à Google Calendar.' });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSelectClient = (client: ClientInfo) => {
    setFormData(prev => ({
      ...prev,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email || prev.clientEmail
    }));
    setClientSearch(client.name);
    setShowClientDropdown(false);
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'spaceId') {
      const spaceObj = activeSpaces.find(s => s.id === value);
      setFormData(prev => ({
        ...prev,
        spaceId: value,
        spaceName: spaceObj ? spaceObj.name : 'Salle'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Build high fidelity dialog alerts as per constraints
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date || !formData.startTime || !formData.endTime || !formData.clientName || !formData.clientEmail) {
      alert("Veuillez remplir tous les champs obligatoires (Titre, Date, Créneau, Client, Email).");
      return;
    }

    // Dynamic scheduling overlap prevention check
    const overlappingRes = checkOverlap(
      formData.spaceId,
      formData.date,
      formData.startTime,
      formData.endTime,
      isEditing && selectedRes ? selectedRes.id : undefined
    );

    if (overlappingRes) {
      const confirmForce = window.confirm(
        `⚠️ CONFLIT DE PLANNING DÉTECTÉ !\n\n` +
        `Une réservation existe déjà pour ce créneau :\n` +
        `• Salle : "${overlappingRes.spaceName}"\n` +
        `• Sujet : "${overlappingRes.title}"\n` +
        `• Date : ${new Date(overlappingRes.date).toLocaleDateString('fr-FR')}\n` +
        `• Horaires : ${overlappingRes.startTime} - ${overlappingRes.endTime}\n\n` +
        `Souhaitez-vous quand même forcer cette réservation (double réservation) ? Cliquez sur 'Annuler' pour modifier vos horaires.`
      );
      if (!confirmForce) {
        return;
      }
    }

    setSyncLoading(true);
    setSyncMessage(null);

    let gcalEventId: string | undefined = undefined;

    try {
      // 1. Google Calendar Integration
      if (formData.syncToGoogle) {
        const token = googleToken || getCachedToken();
        if (!token) {
          // Ask if they want to connect first
          const promptConnect = window.confirm("Google Calendar n'est pas connecté. Souhaitez-vous le connecter pour partager cette réservation ?");
          if (promptConnect) {
            const newToken = await requestCalendarToken();
            if (newToken) {
              setGoogleToken(newToken);
              // Create event
              const created = await createCalendarEvent(newToken, {
                title: `${formData.title} (${formData.spaceName})`,
                description: formData.description + `\n\nRéservé via HiveFive pour ${formData.clientName}`,
                date: formData.date,
                startTime: formData.startTime,
                endTime: formData.endTime,
                clientEmail: formData.clientEmail,
                clientName: formData.clientName
              });
              if (created) gcalEventId = created.id;
            } else {
              throw new Error("Authentification annulée.");
            }
          }
        } else {
          // Normal creation
          const created = await createCalendarEvent(token, {
            title: `${formData.title} (${formData.spaceName})`,
            description: formData.description + `\n\nRéservé via HiveFive pour ${formData.clientName}`,
            date: formData.date,
            startTime: formData.startTime,
            endTime: formData.endTime,
            clientEmail: formData.clientEmail,
            clientName: formData.clientName
          });
          if (created) gcalEventId = created.id;
        }
      }

      // 2. Firestore Document Construction
      const resId = isEditing && selectedRes ? selectedRes.id : 'res-' + Date.now();
      const reservationData: Record<string, any> = {
        id: resId,
        title: formData.title,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        spaceId: formData.spaceId || 'unique-room',
        spaceName: formData.spaceName || 'Salle Principale',
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        issuerId: issuerId,
        ownerId: userId,
        createdAt: isEditing && selectedRes ? selectedRes.createdAt : new Date().toISOString()
      };

      if (formData.clientId) {
        reservationData.clientId = formData.clientId;
      }
      if (formData.description) {
        reservationData.description = formData.description;
      }
      if (gcalEventId) {
        reservationData.gcalEventId = gcalEventId;
      } else if (isEditing && selectedRes?.gcalEventId) {
        reservationData.gcalEventId = selectedRes.gcalEventId;
      }

      await setDoc(doc(db, 'reservations', resId), reservationData);
      
      setSyncMessage({ 
        type: 'success', 
        text: isEditing 
          ? 'Réservation mise à jour et synchronisée !' 
          : 'Réservation créée et invitation envoyée aux clients par Google Calendar !' 
      });

      // Reset form controls
      setShowAddForm(false);
      setIsEditing(false);
      setSelectedRes(null);
      resetForm();

    } catch (err: any) {
      console.error(err);
      setSyncMessage({ 
        type: 'error', 
        text: `Firestore ou Google Calendar : ${err.message || 'Une erreur est survenue.'}` 
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleEditClick = (res: MeetingReservation) => {
    setSelectedRes(res);
    setFormData({
      title: res.title,
      description: res.description || '',
      date: res.date,
      startTime: res.startTime,
      endTime: res.endTime,
      spaceId: res.spaceId,
      spaceName: res.spaceName,
      clientId: res.clientId || '',
      clientName: res.clientName,
      clientEmail: res.clientEmail,
      syncToGoogle: !!res.gcalEventId
    });
    setClientSearch(res.clientName);
    setIsEditing(true);
    setShowAddForm(true);
  };

  const handleDeleteClick = async (res: MeetingReservation) => {
    // Guidelines command user confirmation block for Workspace APIs:
    const confirmMessage = res.gcalEventId 
      ? `Êtes-vous sûr de vouloir supprimer la réservation de "${res.clientName}" ? Cela supprimera également l'événement du calendrier Google Agenda des participants.`
      : `Êtes-vous sûr de vouloir supprimer la réservation de "${res.clientName}" ?`;

    const isConfirmed = window.confirm(confirmMessage);
    if (!isConfirmed) return;

    setSyncLoading(true);
    try {
      if (res.gcalEventId) {
        const token = googleToken || getCachedToken();
        if (token) {
          try {
            await deleteCalendarEvent(token, res.gcalEventId);
          } catch (gcalErr) {
            console.warn("Échec de suppression sur Google Calendar (peut-être déjà supprimé manuellement):", gcalErr);
          }
        }
      }

      await deleteDoc(doc(db, 'reservations', res.id));
      setSyncMessage({ type: 'success', text: 'La réservation a été supprimée avec succès.' });
      setSelectedRes(null);
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: `Erreur lors de la suppression: ${err.message}` });
    } finally {
      setSyncLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '11:00',
      spaceId: activeSpaces[0]?.id || '',
      spaceName: activeSpaces[0]?.name || 'Salle Principale',
      clientId: '',
      clientName: '',
      clientEmail: '',
      syncToGoogle: true
    });
    setClientSearch('');
    setShowClientDropdown(false);
  };

  // Query / filters application
  const filteredReservations = reservations.filter(res => {
    const matchesSearch = 
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.clientEmail.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSpace = selectedSpaceId === 'all' || res.spaceId === selectedSpaceId;
    const matchesDay = !filterByDate || !selectedDay || res.date === selectedDay;

    return matchesSearch && matchesSpace && matchesDay;
  });

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col font-sans select-none text-slate-800">
      
      {/* Top Banner Status & Google Sync Controls */}
      <div className="bg-white border border-[#E4E0D8] rounded-[2rem] p-5 shadow-sm shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="h-12 w-12 rounded-[1.25rem] bg-[#1A56DB]/5 flex items-center justify-center text-[#1A56DB] shrink-0">
            <Calendar size={22} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-[#14120E] flex items-center gap-2">
              Agenda des Salles de Réunion 
              <span className="text-[10px] bg-emerald-50 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full uppercase">Google Sync intégré</span>
            </h2>
            <p className="text-xs text-[#7A776F] mt-1 font-medium max-w-xl">
              Planifiez les créations de réservations et envoyez automatiquement des invitations directes sur le Google Agenda de vos clients et collaborateurs. Les données restent synchronisées en temps réel.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
          {googleToken ? (
            <div className="flex items-center gap-2 bg-[#E6F8F4] border border-[#A7E8DC] px-4 py-2.5 rounded-2xl text-[10px] font-black text-[#0E7866] uppercase tracking-wider">
              <Globe size={13} className="text-[#0E7866]" /> Google Agenda Connecté
            </div>
          ) : (
            <button 
              onClick={connectGoogle}
              disabled={syncLoading}
              className="flex items-center gap-2 bg-[#1A56DB] hover:bg-[#1A56DB]/90 text-white px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {syncLoading ? <RefreshCw className="animate-spin" size={13} /> : <CalendarPlus size={13} />}
              Connecter Google Agenda
            </button>
          )}
        </div>
      </div>

      {/* Success/Error Alerts banner */}
      <AnimatePresence>
        {syncMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-3.5 rounded-2xl flex items-center justify-between text-xs font-semibold ${syncMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'} shrink-0`}
          >
            <div className="flex items-center gap-2">
              <Sparkles size={14} className={syncMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'} />
              <span>{syncMessage.text}</span>
            </div>
            <button onClick={() => setSyncMessage(null)} className="text-[10px] underline hover:no-underline font-black uppercase text-slate-400">Masquer</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 h-full overflow-hidden">
        
        {/* Reservation Planner columns (scheduler) */}
        <div className="lg:col-span-7 flex flex-col bg-white border border-[#E4E0D8] rounded-[2rem] p-5 shadow-sm overflow-hidden relative">
          
          {/* Scheduling query bar */}
          <div className="space-y-3.5 shrink-0 mb-4 border-b border-[#FAF8F4] pb-4">
            <div className="flex flex-col sm:flex-row gap-2.5 justify-between">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par titre, client, email..."
                  className="w-full bg-[#FAF8F4]/80 text-[11px] font-bold h-10 pl-9 pr-3 rounded-2xl border border-transparent focus:bg-white focus:border-[#1A56DB] outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="flex gap-2">
                <input 
                  type="date"
                  value={selectedDay}
                  onChange={e => {
                    setSelectedDay(e.target.value);
                    setFilterByDate(true);
                  }}
                  className="bg-[#FAF8F4]/80 text-[11px] font-bold h-10 px-3 rounded-2xl border border-transparent focus:bg-white focus:border-[#1A56DB] outline-none transition-all cursor-pointer"
                />

                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !filterByDate;
                    setFilterByDate(nextVal);
                    if (!nextVal) {
                      setViewMode('list');
                    }
                  }}
                  className={`px-3 h-10 text-[9px] font-black uppercase tracking-wider rounded-2xl transition-all border flex items-center gap-1.5 shrink-0 select-none ${
                    !filterByDate 
                      ? 'bg-[#1A56DB] text-white border-transparent shadow-md hover:bg-[#154fc9]' 
                      : 'bg-[#FAF8F4]/80 text-slate-500 border-transparent hover:bg-slate-100'
                  }`}
                  title={filterByDate ? "Afficher toutes de réservations existantes" : "Afficher seulement la date sélectionnée"}
                >
                  <Calendar size={11} /> {!filterByDate ? 'Toutes les dates' : 'Toutes dates'}
                </button>

                {/* Switch between interactive Timeline / List Views */}
                <div className="flex bg-[#FAF8F4]/80 p-0.5 rounded-2xl border border-[#E4E0D8]/40 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('timeline')}
                    className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 ${viewMode === 'timeline' ? 'bg-[#1A56DB] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    title="Afficher la grille horaire des disponibilités"
                  >
                    <Clock size={11} /> Planning
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-[#14120E] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    title="Afficher la liste simple des réunions"
                  >
                    <Search size={11} /> Liste
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto py-1 custom-scrollbar shrink-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 mr-1 shrink-0">Salles:</span>
              <button
                onClick={() => setSelectedSpaceId('all')}
                className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${selectedSpaceId === 'all' ? 'bg-[#14120E] text-white shadow-sm' : 'bg-[#FAF8F4] text-slate-500 hover:bg-slate-100'}`}
              >
                Toutes
              </button>
              {activeSpaces.map(sp => (
                <button
                  key={sp.id}
                  onClick={() => setSelectedSpaceId(sp.id)}
                  className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ${selectedSpaceId === sp.id ? 'bg-[#14120E] text-white shadow-sm' : 'bg-[#FAF8F4] text-slate-500 hover:bg-slate-100'}`}
                >
                  {sp.name}
                </button>
              ))}
            </div>
          </div>

          {/* List or Timeline display */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <RefreshCw className="animate-spin mb-3 text-[#1A56DB]" size={28} />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Chargement des réservations...</p>
              </div>
            ) : viewMode === 'list' ? (
              filteredReservations.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#FAF8F4]/65 border border-dashed border-[#E4E0D8] rounded-3xl min-h-[220px]">
                  <Calendar size={32} className="text-slate-300 mb-3" />
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-[#14120E]">Aucune réservation</h4>
                  <p className="text-[10px] text-slate-400 max-w-xs mt-1.5 font-medium">Aucun créneau réservé pour les critères spécifiés. Planifiez un rendez-vous pour commencer.</p>
                  <button 
                    onClick={() => { resetForm(); setIsEditing(false); setShowAddForm(true); }}
                    className="mt-4 flex items-center gap-1.5 bg-[#14120E] text-white px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md"
                  >
                    <Plus size={11} /> Réserver un espace
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    const groups: { [date: string]: MeetingReservation[] } = {};
                    filteredReservations.forEach(res => {
                      if (!groups[res.date]) {
                        groups[res.date] = [];
                      }
                      groups[res.date].push(res);
                    });

                    return Object.keys(groups)
                      .sort((a, b) => a.localeCompare(b))
                      .map(dateStr => {
                        const dayRes = groups[dateStr];
                        let formattedDate = dateStr;
                        try {
                          formattedDate = new Date(dateStr).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          });
                        } catch (e) {
                          console.error(e);
                        }

                        return (
                          <div key={dateStr} className="space-y-3">
                            <div className="flex items-center gap-2 pb-1.5 border-b border-[#E4E0D8]/40 pt-2 first:pt-0">
                              <Calendar size={13} className="text-[#1A56DB]" />
                              <span className="text-[10px] font-black uppercase tracking-wider text-[#14120E] capitalize">
                                {formattedDate}
                              </span>
                              <span className="text-[8px] bg-[#1A56DB]/5 text-[#1A56DB] font-extrabold px-2 py-0.5 rounded-full select-none">
                                {dayRes.length} {dayRes.length > 1 ? 'réservations' : 'réservation'}
                              </span>
                            </div>

                            <div className="space-y-3">
                              {dayRes.map(res => {
                                const isSelected = selectedRes?.id === res.id;
                                return (
                                  <motion.div
                                    layout
                                    key={res.id}
                                    onClick={() => { setSelectedRes(res); setIsEditing(false); }}
                                    className={`p-4 rounded-3xl border text-left flex flex-col md:flex-row justify-between items-start md:items-center gap-3 cursor-pointer transition-all ${isSelected ? 'border-[#1A56DB] bg-[#1A56DB]/5 shadow-sm' : 'border-[#E4E0D8]/60 bg-white hover:border-slate-300'}`}
                                  >
                                    <div className="flex gap-3.5 min-w-0">
                                      <div className="h-12 w-12 rounded-2xl bg-[#14120E] text-white flex flex-col justify-center items-center text-center shrink-0">
                                        <span className="text-[8px] tracking-tight font-black uppercase opacity-60">Créneau</span>
                                        <span className="text-[11px] font-mono font-black">{res.startTime}</span>
                                      </div>
                                      
                                      <div className="min-w-0">
                                        <h4 className="text-xs font-black text-[#14120E] uppercase tracking-tight flex items-center gap-2 flex-wrap">
                                          {res.title}
                                          {res.gcalEventId && (
                                            <span className="text-[7.5px] font-extrabold text-[#0E7866] bg-emerald-100/50 border border-emerald-200 px-1.5 py-0.5 rounded tracking-tight inline-flex items-center gap-1">
                                              <Globe size={9} /> Google Live
                                            </span>
                                          )}
                                        </h4>
                                        
                                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-slate-500 font-medium mt-1 font-mono">
                                          <span className="flex items-center gap-1 text-[#1A56DB] font-extrabold">
                                            <MapPin size={11} /> {res.spaceName}
                                          </span>
                                          <span className="text-slate-300">•</span>
                                          <span className="flex items-center gap-1 font-sans">
                                            <User size={11} /> {res.clientName}
                                          </span>
                                          <span className="text-slate-300">•</span>
                                          <span className="text-slate-400 lower-case">{res.clientEmail}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-end md:self-auto shrink-0 border-t border-[#FAF8F4] md:border-t-0 pt-2.5 md:pt-0 w-full md:w-auto justify-end">
                                      <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleEditClick(res); }}
                                        className="p-2 bg-slate-50 hover:bg-[#FAF8F4] text-slate-500 rounded-xl hover:text-[#1A56DB] border border-[#E4E0D8]/60 transition-all shadow-sm"
                                        title="Modifier"
                                      >
                                        <Edit3 size={12} />
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(res); }}
                                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-100 transition-all shadow-sm"
                                        title="Supprimer"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                  })()}
                </div>
              )
            ) : (
              /* Daily Availability Schedule Timeline Grid */
              <div className="w-full overflow-x-auto custom-scrollbar">
                <div className="min-w-[550px] space-y-4">
                  
                  {/* Info Header guidance */}
                  <div className="bg-[#FAF8F4] border border-[#E4E0D8]/50 p-3 rounded-2xl flex items-center justify-between gap-2 shrink-0">
                    <p className="text-[10px] text-[#7A776F] font-bold tracking-tight">
                      💡 Cliquez sur un créneau <span className="text-[#0E7866] font-extrabold font-mono">Disponible</span> pour planifier instantanément, ou sur une réunion occupée pour afficher son détail.
                    </p>
                    <span className="text-[10px] font-mono font-black text-[#1A56DB] bg-[#1A56DB]/5 px-2 py-0.5 rounded-md uppercase shrink-0">
                      {new Date(selectedDay).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  {/* Header Row for Room Columns */}
                  <div className="grid grid-cols-12 gap-2 text-center pb-2.5 border-b border-[#E4E0D8]/50 text-[9.5px] font-black uppercase text-slate-500 tracking-wider">
                    <div className="col-span-3 text-left pl-1">Horaires</div>
                    <div 
                      className="col-span-9 grid gap-2" 
                      style={{ gridTemplateColumns: `repeat(${(selectedSpaceId === 'all' ? activeSpaces : activeSpaces.filter(sp => sp.id === selectedSpaceId)).length}, minmax(0, 1fr))` }}
                    >
                      {(selectedSpaceId === 'all' ? activeSpaces : activeSpaces.filter(sp => sp.id === selectedSpaceId)).map(sp => (
                        <div key={sp.id} className="truncate font-black text-[#14120E] text-center" title={`${sp.name} (${sp.type})`}>
                          {sp.name}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Timeline hours blocks rows */}
                  <div className="divide-y divide-[#FAF8F4] space-y-2 pt-1">
                    {hoursOfDay.map(hourStr => {
                      const spacesToDisplay = selectedSpaceId === 'all' ? activeSpaces : activeSpaces.filter(sp => sp.id === selectedSpaceId);
                      return (
                        <div key={hourStr} className="grid grid-cols-12 gap-2 py-2 items-center">
                          {/* Left Hour indices */}
                          <div className="col-span-3 text-left font-mono font-black text-[11px] text-slate-505 flex items-center gap-1.5 pl-1">
                            <Clock size={12} className="text-slate-400" />
                            <span>{hourStr}</span>
                          </div>

                          {/* Dynamic rooms grid cells */}
                          <div 
                            className="col-span-9 grid gap-2" 
                            style={{ gridTemplateColumns: `repeat(${spacesToDisplay.length}, minmax(0, 1fr))` }}
                          >
                            {spacesToDisplay.map(space => {
                              const activeRes = getReservationForSlot(space.id, hourStr);
                              
                              if (activeRes) {
                                const isSelected = selectedRes?.id === activeRes.id;
                                return (
                                  <div
                                    key={space.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedRes(activeRes);
                                      setIsEditing(false);
                                      setShowAddForm(false);
                                    }}
                                    className={`p-1.5 px-2 rounded-xl text-left transition-all cursor-pointer truncate shadow-xs border-l-4 ${
                                      isSelected 
                                        ? 'bg-[#1A56DB]/15 border-l-[#1a56db] ring-1 ring-[#1A56DB]/30' 
                                        : 'bg-indigo-50 hover:bg-indigo-100/90 border-l-[#1A56DB]'
                                    } group`}
                                    title={`${activeRes.title} - Client: ${activeRes.clientName}`}
                                  >
                                    <div className="text-[9px] font-black text-slate-905 uppercase truncate leading-tight">
                                      {activeRes.title}
                                    </div>
                                    <div className="text-[8px] text-slate-500 font-bold truncate mt-0.5 flex items-center gap-1">
                                      <span>{activeRes.startTime}-{activeRes.endTime}</span>
                                      <span>•</span>
                                      <span className="truncate">{activeRes.clientName}</span>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <button
                                  type="button"
                                  key={space.id}
                                  onClick={() => handleSlotClick(space, hourStr)}
                                  className="group p-2.5 border border-dashed border-[#E4E0D8]/80 hover:border-[#1A56DB] hover:bg-emerald-50/30 rounded-xl transition-all text-left flex items-center justify-between text-[9px] font-extrabold text-slate-500 hover:text-[#0E7866] cursor-pointer"
                                >
                                  <span className="truncate">Disponible</span>
                                  <Plus size={11} className="opacity-0 group-hover:opacity-100 transition-all text-[#1A56DB] shrink-0" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              </div>
            )}
          </div>

          {/* Quick Stats banner */}
          <div className="shrink-0 border-t border-[#FAF8F4] pt-3.5 flex items-center justify-between text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">
            <span>Total Réservations: {filteredReservations.length}</span>
            <div className="flex gap-3">
              <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                ● SYNC CALENDAR ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* Workspace calendar reservation details or creation card form */}
        <div className="lg:col-span-5 h-full overflow-y-auto no-scrollbar">
          
          <AnimatePresence mode="wait">
            {showAddForm ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white border border-[#E4E0D8] rounded-[2rem] p-5 shadow-sm space-y-4"
              >
                <div className="flex justify-between items-center border-b border-[#FAF8F4] pb-3 shrink-0">
                  <h3 className="text-xs font-black uppercase text-[#14120E] tracking-wider flex items-center gap-1.5 text-[#1A56DB]">
                    <CalendarPlus size={15} /> 
                    {isEditing ? "Modifier la Réservation" : "Nouvelle Réservation"}
                  </h3>
                  <button 
                    onClick={() => { setShowAddForm(false); setIsEditing(false); resetForm(); }}
                    className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-lg font-black uppercase text-[10px] transition-all"
                  >
                    Retour
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Select Meeting Room Space */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-[#7A776F] tracking-wider">Salle (Espace de réunion) *</label>
                    <select 
                      name="spaceId"
                      value={formData.spaceId}
                      onChange={handleFieldChange}
                      className="w-full h-11 bg-[#FAF8F4] text-xs font-bold rounded-2xl px-3 border border-transparent focus:bg-white focus:border-[#1A56DB] outline-none transition-all cursor-pointer"
                    >
                      {activeSpaces.length === 0 ? (
                        <option value="">Aucune salle - Salle Générique</option>
                      ) : (
                        activeSpaces.map(sp => (
                          <option key={sp.id} value={sp.id}>{sp.name} ({sp.type} - Cap: {sp.capacity})</option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Reservation title Subject */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-[#7A776F] tracking-wider font-semibold">Sujet de la Réunion *</label>
                    <input 
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleFieldChange}
                      placeholder="e.g. Brainstorming Projet X, Réunion d'intégration"
                      className="w-full h-11 bg-[#FAF8F4] text-xs font-bold rounded-2xl px-3 border border-transparent focus:bg-white focus:border-[#1A56DB] outline-none transition-all"
                    />
                  </div>

                  {/* Date, Start and End time row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-[#7A776F] tracking-wider">Date *</label>
                      <input 
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleFieldChange}
                        className="w-full h-11 bg-[#FAF8F4] text-xs font-bold rounded-2xl px-3 border border-transparent focus:bg-white focus:border-[#1A56DB] outline-none transition-all cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-[#7A776F] tracking-wider">Début *</label>
                      <input 
                        type="time"
                        name="startTime"
                        value={formData.startTime}
                        onChange={handleFieldChange}
                        className="w-full h-11 bg-[#FAF8F4] text-xs font-bold rounded-2xl px-3 border border-transparent focus:bg-white focus:border-[#1A56DB] outline-none transition-all cursor-pointer font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-[#7A776F] tracking-wider">Fin *</label>
                      <input 
                        type="time"
                        name="endTime"
                        value={formData.endTime}
                        onChange={handleFieldChange}
                        className="w-full h-11 bg-[#FAF8F4] text-xs font-bold rounded-2xl px-3 border border-transparent focus:bg-white focus:border-[#1A56DB] outline-none transition-all cursor-pointer font-mono"
                      />
                    </div>
                  </div>

                  {/* Dynamic Overlap Warning Banner */}
                  {(() => {
                    const overlap = checkOverlap(
                      formData.spaceId,
                      formData.date,
                      formData.startTime,
                      formData.endTime,
                      isEditing && selectedRes ? selectedRes.id : undefined
                    );
                    if (overlap) {
                      return (
                        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl flex items-start gap-2.5 text-[10px] font-medium leading-relaxed">
                          <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold text-[#14120E] uppercase tracking-wider block mb-0.5">⚠️ Conflit de Créneau Détecté</span>
                            Ce créneau chevauche la réservation <strong className="font-bold underline">"{overlap.title}"</strong> ({overlap.clientName}) planifiée de {overlap.startTime} à {overlap.endTime}.
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Client name selection search dropdown */}
                  <div className="space-y-1.5 relative">
                    <label className="text-[9px] font-black uppercase text-[#7A776F] tracking-wider">Sélectionner un Client *</label>
                    <div className="relative">
                      <input 
                        type="text"
                        value={clientSearch}
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          setFormData(prev => ({ ...prev, clientName: e.target.value }));
                          setShowClientDropdown(true);
                        }}
                        onFocus={() => setShowClientDropdown(true)}
                        placeholder="Rechercher ou saisir le nom d'un client"
                        className="w-full h-11 bg-[#FAF8F4] text-xs font-bold rounded-2xl px-3 border border-transparent focus:bg-white focus:border-[#1A56DB] outline-none transition-all"
                      />
                      {clientSearch && (
                        <button 
                          type="button"
                          onClick={() => { setClientSearch(''); setFormData(p => ({...p, clientId:'', clientName: '', clientEmail: ''})); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px]"
                        >
                          Effacer
                        </button>
                      )}
                    </div>

                    {/* Client lists search matches */}
                    {showClientDropdown && clientSearch && filteredClients.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#E4E0D8] rounded-2xl shadow-xl z-50 max-h-44 overflow-y-auto custom-scrollbar p-1.5">
                        {filteredClients.map(c => (
                          <div
                            key={c.id}
                            onClick={() => handleSelectClient(c)}
                            className="p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer text-xs font-bold flex flex-col transition-all text-slate-700"
                          >
                            <span>{c.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono lower-case">{c.email || 'Pas de courriel'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Client Email address */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-[#7A776F] tracking-wider flex items-center gap-1">
                      <Mail size={11} className="text-[#1A56DB]" /> Courriel du Client *
                    </label>
                    <input 
                      type="email"
                      name="clientEmail"
                      value={formData.clientEmail}
                      onChange={handleFieldChange}
                      placeholder="client-invite@company.com"
                      className="w-full h-11 bg-[#FAF8F4] text-xs font-bold rounded-2xl px-3 border border-transparent focus:bg-white focus:border-[#1A56DB] outline-none transition-all"
                    />
                    <p className="text-[9px] text-[#7A776F] font-bold">Un e-mail d'invitation avec les détails de la réunion et le lien de géolocalisation de la salle lui sera envoyé via Google Agenda.</p>
                  </div>

                  {/* Description space remarks */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-[#7A776F] tracking-wider">Description / Remarques</label>
                    <textarea 
                      name="description"
                      value={formData.description}
                      onChange={handleFieldChange}
                      rows={2}
                      placeholder="Spécifications (Café souhaité, écran de projection, etc.)"
                      className="w-full bg-[#FAF8F4] text-xs font-bold rounded-2xl p-3 border border-transparent focus:bg-white focus:border-[#1A56DB] outline-none transition-all resize-none"
                    />
                  </div>

                  {/* Toggle integration share */}
                  <div className="flex items-center gap-2.5 p-3.5 bg-slate-50 rounded-2xl border border-[#E4E0D8]/40">
                    <input 
                      type="checkbox"
                      id="syncToGoogle"
                      name="syncToGoogle"
                      checked={formData.syncToGoogle}
                      onChange={(e) => setFormData(prev => ({ ...prev, syncToGoogle: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#1A56DB] border-gray-300 focus:ring-[#1A56DB] cursor-pointer"
                    />
                    <label htmlFor="syncToGoogle" className="text-[10px] font-black uppercase tracking-wider text-slate-750 cursor-pointer flex items-center gap-1.5">
                      <Globe size={12} className="text-[#1A56DB]" /> Synchroniser avec Google Agenda
                    </label>
                  </div>

                  {/* Action submission buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={syncLoading}
                      className="flex-1 flex items-center justify-center gap-2 bg-[#14120E] text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black shadow-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                      {syncLoading ? <RefreshCw className="animate-spin" size={13} /> : <Check size={13} />}
                      {isEditing ? "Enregistrer" : "Confirmer la Réservation"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAddForm(false); setIsEditing(false); resetForm(); }}
                      className="px-6 py-3.5 rounded-2xl border border-[#E4E0D8] text-[10px] font-black uppercase tracking-widest text-[#7A776F] hover:bg-slate-50 transition-all"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : selectedRes ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-white border border-[#E4E0D8] rounded-[2rem] p-5 shadow-sm space-y-5"
              >
                <div className="flex justify-between items-center border-b border-[#FAF8F4] pb-3 shrink-0">
                  <h3 className="text-xs font-black uppercase text-[#14120E] tracking-wider">Détails de la Réservation</h3>
                  <button 
                    onClick={() => { resetForm(); setIsEditing(false); setShowAddForm(true); }}
                    className="flex items-center gap-1 bg-[#1A56DB]/5 text-[#1A56DB] hover:bg-[#1A56DB]/10 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                  >
                    <Plus size={11} /> Nouvelle
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Detailed summary information */}
                  <div className="space-y-1">
                    <div className="text-[10px] text-[#7A776F] font-bold uppercase tracking-wider">Sujet / Objectif</div>
                    <p className="text-sm font-black text-[#14120E] uppercase tracking-tight">{selectedRes.title}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-b border-[#FAF8F4] py-3.5">
                    <div className="space-y-1">
                      <div className="text-[9px] text-[#7A776F] font-bold uppercase tracking-wider flex items-center gap-1">
                        <MapPin size={11} className="text-[#1A56DB]" /> Salle Réservée
                      </div>
                      <span className="text-xs font-extrabold text-[#14120E] uppercase">{selectedRes.spaceName}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[9px] text-[#7A776F] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Clock size={11} className="text-[#1A56DB]" /> Date & Horaires
                      </div>
                      <span className="text-xs font-mono font-black text-slate-800">{new Date(selectedRes.date).toLocaleDateString('fr-FR')} • {selectedRes.startTime} - {selectedRes.endTime}</span>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <div className="text-[10px] text-[#7A776F] font-bold uppercase tracking-wider border-b border-[#FAF8F4] pb-1">Participant / Invité</div>
                    
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-[#FAF8F4] flex items-center justify-center text-slate-500 font-bold shrink-0">
                        <User size={15} />
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-tight text-slate-800">{selectedRes.clientName}</div>
                        <div className="text-[10px] text-slate-400 font-mono lower-case">{selectedRes.clientEmail}</div>
                      </div>
                    </div>
                  </div>

                  {selectedRes.description && (
                    <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-[9px] text-[#7A776F] font-bold uppercase tracking-wider">Notes & Consigne de Service</div>
                      <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">{selectedRes.description}</p>
                    </div>
                  )}

                  {selectedRes.gcalEventId && (
                    <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-start gap-3">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[9px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1">
                          Synchronisé avec Google Agenda
                        </span>
                        <p className="text-[10px] text-emerald-700/80 font-medium mt-1 leading-snug">
                          Un e-mail récapitulatif complet a été envoyé au client avec les boutons d'acceptation automatique de l'événement. Toute modification ou suppression d'agenda effectuée ici se répercutera instantanément sur son agenda.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions footer */}
                  <div className="flex gap-2.5 border-t border-[#FAF8F4] pt-4 shrink-0">
                    <button
                      onClick={() => handleEditClick(selectedRes)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 text-white rounded-2xl py-3.5 text-[10px] font-black uppercase tracking-wider hover:bg-black transition-all"
                    >
                      <Edit3 size={12} /> Modifier la réservation
                    </button>
                    <button
                      onClick={() => handleDeleteClick(selectedRes)}
                      className="px-4 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100/65 rounded-2xl flex items-center justify-center transition-all"
                      title="Annuler le rendez-vous"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-white border border-[#E4E0D8] rounded-[2rem] p-6 shadow-sm text-center py-10 space-y-4"
              >
                <div className="w-16 h-16 bg-[#1A56DB]/5 text-[#1A56DB] rounded-[1.5rem] flex items-center justify-center mx-auto shadow-sm">
                  <Sparkles size={24} className="animate-bounce" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase text-[#14120E] tracking-wider">Planificateur Intelligent</h3>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto mt-2 font-medium leading-relaxed">
                    Sélectionnez une réservation dans votre flux chronologique à gauche pour voir les détails, les correspondances participants et vérifier le statut de synchronisation Google Calendar.
                  </p>
                </div>
                <button
                  onClick={() => { resetForm(); setIsEditing(false); setShowAddForm(true); }}
                  className="bg-[#14120E] text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md inline-flex items-center gap-1.5"
                >
                  <Plus size={11} /> Planifier un rendez-vous
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Informational guides block */}
          <div className="bg-slate-50 border border-[#E4E0D8]/40 rounded-[2rem] p-4 mt-4 text-[10.5px] font-semibold text-slate-500 leading-relaxed space-y-2">
            <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Info size={11} className="text-[#1A56DB]" /> Astuces d'Intégration
            </h4>
            <p>
              En connectant votre compte Google, HiveFive utilise l'authentification sécurisée OAuth 2.0 pour créer directement des invitations aux réunions. Vous n'avez pas besoin de configurer de serveur ni de clé API.
            </p>
            <p className="text-[9px] font-medium text-slate-400">
              Note: Pour modifier une réunion, utilisez simplement l'icône crayon, ajustez les créneaux, puis validez. Les agendas de l'hôte et du client invité seront rafraîchis en temps réel.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Agenda;
