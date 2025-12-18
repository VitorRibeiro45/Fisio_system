import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Calendar, Activity, Plus, Search, ChevronRight, Save, 
  Clock, CheckCircle, X, ArrowLeft, Printer, FileText, ClipboardList,
  LogOut, Lock, Mail, User, AlertCircle, ChevronLeft
} from 'lucide-react';

// =================================================================
// ⚠️ CONFIGURAÇÃO DO SERVIDOR (Conexão Node/Postgres)
// =================================================================
const API_URL = 'http://65.21.48.34:3000'; 

// =================================================================
// 🎨 ÍCONES LOCAIS (FALLBACK)
// =================================================================
const LocalIcons = {
  Repeat: ({ size = 24, className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m17 2 4 4-4 4"/>
      <path d="M3 11v-1a4 4 0 0 1 4-4h14"/>
      <path d="m7 22-4-4 4-4"/>
      <path d="M21 13v1a4 4 0 0 1-4 4H3"/>
    </svg>
  ),
  Loader2: ({ size = 24, className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`animate-spin ${className}`}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  UserCheck: ({ size = 24, className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <polyline points="16 11 18 13 22 9"/>
    </svg>
  ),
  UserX: ({ size = 24, className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <line x1="18" y1="8" x2="23" y2="13"/>
      <line x1="23" y1="8" x2="18" y2="13"/>
    </svg>
  )
};

// =================================================================
// 🔌 CAMADA DE DADOS (API REST - Conector Postgres)
// =================================================================
const api = {
  // --- HELPERS DE CONEXÃO ---
  fetch: async (endpoint, options = {}) => {
    const token = localStorage.getItem('fisio_token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
        
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('fisio_token');
          localStorage.removeItem('fisio_user');
          window.location.reload(); 
          return null;
        }
        return response;
    } catch (error) {
        console.error("Erro de Conexão:", error);
        alert("ERRO DE CONEXÃO: Verifique se o backend está rodando no IP: " + API_URL);
        throw error;
    }
  },

  login: async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao realizar login');
      return data; 
    } catch (error) {
      throw error;
    }
  },

  // --- MÉTODOS DE DADOS ---
  
  // Pacientes
  getPatients: async () => {
    const res = await api.fetch('/api/patients');
    if (res && res.ok) return await res.json();
    return [];
  },

  createPatient: async (data) => {
    const res = await api.fetch('/api/patients', {
      method: 'POST', body: JSON.stringify(data)
    });
    if (res && res.ok) return await res.json();
    throw new Error('Erro ao criar paciente');
  },

  updatePatient: async (id, data) => {
    const res = await api.fetch(`/api/patients/${id}`, {
      method: 'PUT', body: JSON.stringify(data)
    });
    if (res && res.ok) return await res.json();
    throw new Error('Erro ao atualizar paciente');
  },

  // Avaliação
  getAssessment: async (patientId) => {
    const res = await api.fetch(`/api/patients/${patientId}/assessment`);
    if (res && res.ok) return await res.json();
    return null;
  },

  saveAssessment: async (patientId, data) => {
    const res = await api.fetch(`/api/patients/${patientId}/assessment`, {
      method: 'POST', body: JSON.stringify(data)
    });
    if (res && res.ok) return await res.json();
    throw new Error('Erro ao salvar avaliação');
  },

  // Evoluções
  getEvolutions: async (patientId) => {
    const res = await api.fetch(`/api/patients/${patientId}/evolutions`);
    if (res && res.ok) return await res.json();
    return [];
  },

  createEvolution: async (patientId, data) => {
    const res = await api.fetch(`/api/patients/${patientId}/evolutions`, {
      method: 'POST', body: JSON.stringify(data)
    });
    if (res && res.ok) return await res.json();
    throw new Error('Erro ao salvar evolução');
  },

  // Agenda / Agendamentos (Suporte a Range de Datas)
  getAppointmentsRange: async (startDate, endDate) => {
    // Rota esperada: GET /api/appointments?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
    const res = await api.fetch(`/api/appointments?startDate=${startDate}&endDate=${endDate}`);
    if (res && res.ok) {
        const data = await res.json();
        // Ordenação local para garantir visualização correta
        return data.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.time.localeCompare(b.time);
        });
    }
    return [];
  },

  createAppointment: async (data) => {
    const res = await api.fetch('/api/appointments', {
      method: 'POST', body: JSON.stringify(data)
    });
    if (res && res.ok) return await res.json();
    throw new Error('Erro ao criar agendamento');
  },

  deleteAppointment: async (id) => {
    await api.fetch(`/api/appointments/${id}`, { method: 'DELETE' });
  }
};

// =================================================================
// 🖨️ ESTILOS DE IMPRESSÃO
// =================================================================
const PrintStyles = () => (
  <style>{`
    @media print {
      @page { margin: 0; size: A4; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
      .no-print, header, .auth-screen, button, .app-container { display: none !important; }
      .print-preview-container {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
        z-index: 99999 !important;
        display: block !important;
        visibility: visible !important;
      }
      .print-content {
        box-shadow: none !important;
        margin: 0 !important;
        width: 100% !important;
        max-width: none !important;
      }
      .break-inside-avoid { page-break-inside: avoid; }
    }
  `}</style>
);

// =================================================================
// 🎨 UI COMPONENTS
// =================================================================

const Button = ({ children, onClick, variant = 'primary', className = '', disabled, ...props }) => {
  const variants = {
    primary: "bg-teal-700 text-white hover:bg-teal-800 shadow-sm active:scale-95",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:scale-95",
    ghost: "text-teal-700 hover:bg-teal-50 active:scale-95",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} 
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>{children}</div>
);

const Input = ({ label, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>}
    <input className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 transition-all" {...props} />
  </div>
);

const TextArea = ({ label, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>}
    <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 min-h-[100px] transition-all" {...props} />
  </div>
);

// =================================================================
// 📅 AGENDA COMPONENT (MENSAL - API CONNECTED)
// =================================================================
const AgendaView = ({ patients }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const toISODate = (d) => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  const [selectedDate, setSelectedDate] = useState(toISODate(new Date()));
  
  const [monthAppointments, setMonthAppointments] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false); 
  const [loading, setLoading] = useState(false);

  // Busca dados do mês via API
  useEffect(() => {
    const fetchMonthData = async () => {
        setLoading(true);
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        // Define range do mês
        const startDate = toISODate(new Date(year, month, 1));
        const endDate = toISODate(new Date(year, month + 1, 0));

        try {
            const data = await api.getAppointmentsRange(startDate, endDate);
            setMonthAppointments(data);
        } catch (e) {
            console.error("Erro ao carregar agenda", e);
        } finally {
            setLoading(false);
        }
    };
    fetchMonthData();
  }, [currentMonth]);

  const changeMonth = (delta) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
    setCurrentMonth(newDate);
  };

  const handleAddAppointment = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const formProps = Object.fromEntries(fd.entries());
    const patient = patients.find(p => String(p.id) === String(formProps.patientId));
    
    const baseApp = {
      time: formProps.time,
      patientId: formProps.patientId,
      patientName: patient ? patient.name : 'Desconhecido',
      type: formProps.type,
      notes: formProps.notes
    };

    setLoading(true);

    try {
        const promises = [];

        if (isRecurring) {
            const weeks = parseInt(formProps.weeks) || 4; 
            const [y, m, d] = selectedDate.split('-').map(Number);
            
            for (let i = 0; i < weeks; i++) {
                const nextDate = new Date(y, m - 1, d + (i * 7));
                const dateStr = toISODate(nextDate);
                promises.push(api.createAppointment({
                    ...baseApp,
                    date: dateStr,
                    isRecurring: true 
                }));
            }
        } else {
            promises.push(api.createAppointment({
                ...baseApp,
                date: selectedDate
            }));
        }

        await Promise.all(promises);
        
        setShowAddModal(false);
        setIsRecurring(false); 
        
        // Refresh Agenda
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const startDate = toISODate(new Date(year, month, 1));
        const endDate = toISODate(new Date(year, month + 1, 0));
        const data = await api.getAppointmentsRange(startDate, endDate);
        setMonthAppointments(data);

        alert(isRecurring ? 'Agendamentos recorrentes criados com sucesso!' : 'Agendamento criado!');

    } catch (err) {
        console.error("Erro ao criar agendamentos", err);
        alert("Erro ao salvar agendamento.");
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if(confirm("Deseja cancelar este agendamento?")) {
      try {
          await api.deleteAppointment(id);
          setMonthAppointments(prev => prev.filter(app => app.id !== id));
      } catch (err) {
          alert("Erro ao excluir agendamento.");
      }
    }
  };

  // Clique no dia para agendar
  const handleDateClick = (dateStr) => {
    setSelectedDate(dateStr);
    setShowAddModal(true);
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(toISODate(new Date(year, month, i)));
  }

  const selectedDayAppointments = monthAppointments.filter(app => app.date === selectedDate);
  
  const appointmentsByDay = useMemo(() => {
    const map = {};
    monthAppointments.forEach(app => {
        if (!map[app.date]) map[app.date] = [];
        map[app.date].push(app);
    });
    return map;
  }, [monthAppointments]);

  const monthLabel = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const selectedDateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="animate-in fade-in flex flex-col lg:flex-row gap-8">
      <div className="flex-1">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 capitalize">{monthLabel}</h2>
            <div className="flex gap-2 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                <Button variant="ghost" onClick={() => changeMonth(-1)} className="px-2 py-1"><ChevronLeft size={20}/></Button>
                <Button variant="ghost" onClick={() => changeMonth(1)} className="px-2 py-1"><ChevronRight size={20}/></Button>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                    <div key={d} className="py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">{d}</div>
                ))}
            </div>
            
            <div className="grid grid-cols-7">
                {calendarDays.map((dateStr, i) => {
                    if (!dateStr) return <div key={`empty-${i}`} className="bg-gray-50/50 min-h-[80px] border-b border-r border-gray-100"></div>;
                    
                    const dayNum = parseInt(dateStr.split('-')[2]);
                    const isSelected = dateStr === selectedDate;
                    const isToday = dateStr === toISODate(new Date());
                    const apps = appointmentsByDay[dateStr] || [];

                    return (
                        <div 
                            key={dateStr}
                            onClick={() => handleDateClick(dateStr)}
                            className={`min-h-[80px] p-2 border-b border-r border-gray-100 cursor-pointer transition-colors relative hover:bg-gray-50
                                ${isSelected ? 'bg-teal-50 ring-2 ring-inset ring-teal-500 z-10' : ''}
                            `}
                        >
                            <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1
                                ${isToday ? 'bg-teal-600 text-white' : 'text-gray-700'}
                            `}>
                                {dayNum}
                            </span>
                            <div className="flex flex-col gap-1">
                                {apps.slice(0, 3).map((app, idx) => (
                                    <div key={idx} className="h-1.5 w-full bg-blue-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 w-full opacity-60"></div>
                                    </div>
                                ))}
                                {apps.length > 3 && <span className="text-[10px] text-gray-400 font-bold">+{apps.length - 3}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      <div className="w-full lg:w-96 flex flex-col">
          <div className="flex justify-between items-center mb-4">
               <div>
                   <h3 className="font-bold text-gray-800 text-lg">Agenda do Dia</h3>
                   <p className="text-xs text-gray-500 capitalize">{selectedDateLabel}</p>
               </div>
               <Button onClick={() => setShowAddModal(true)} className="px-3 py-1.5 text-sm shadow-teal-100"><Plus size={16}/> Agendar</Button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 min-h-[300px] overflow-hidden flex flex-col">
              {loading ? (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-sm gap-2">
                      <LocalIcons.Loader2 size={16}/> Carregando...
                  </div>
              ) : selectedDayAppointments.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                      <Calendar size={32} className="mb-2 opacity-20"/>
                      <p className="text-sm">Sem agendamentos.</p>
                  </div>
              ) : (
                  <div className="overflow-y-auto p-2 space-y-2">
                      {selectedDayAppointments.map(app => (
                          <div key={app.id} className="p-3 rounded-lg border border-gray-100 bg-white hover:border-teal-200 hover:shadow-sm transition-all group">
                              <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-3">
                                      <div className="bg-teal-50 text-teal-700 font-bold px-2 py-1 rounded text-sm border border-teal-100">
                                          {app.time}
                                      </div>
                                      <div>
                                          <p className="font-bold text-gray-800 text-sm">{app.patientName}</p>
                                          <p className="text-xs text-gray-500 flex items-center gap-1">
                                            {app.isRecurring && <LocalIcons.Repeat size={10} className="text-teal-600"/>}
                                            {app.type}
                                          </p>
                                      </div>
                                  </div>
                                  <button onClick={() => handleDelete(app.id)} className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <X size={14}/>
                                  </button>
                              </div>
                              {app.notes && (
                                  <div className="mt-2 pt-2 border-t border-gray-50 text-xs text-gray-500 flex items-start gap-1">
                                      <span className="font-semibold">Nota:</span> {app.notes}
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </div>

      {showAddModal && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95">
               <div className="flex justify-between items-center mb-6">
                   <h2 className="text-xl font-bold text-gray-800">Agendar para {selectedDate.split('-')[2]}/{selectedDate.split('-')[1]}</h2>
                   <button onClick={() => { setShowAddModal(false); setIsRecurring(false); }} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
               </div>
               <form onSubmit={handleAddAppointment}>
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Paciente</label>
                    <select name="patientId" required className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                       <option value="">Selecione...</option>
                       {patients.filter(p => (p.status || 'active') !== 'archived').map(p => (
                         <option key={p.id} value={p.id}>{p.name}</option>
                       ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <Input name="time" label="Horário" type="time" required />
                     <div className="mb-4">
                        <label className="block text-sm font-bold text-gray-700 mb-1">Tipo</label>
                        <select name="type" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                           <option>Sessão</option>
                           <option>Avaliação</option>
                           <option>Retorno</option>
                        </select>
                     </div>
                  </div>
                  <Input name="notes" label="Observação (Opcional)" placeholder="Ex: Trazer exames" />
                  
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={isRecurring} 
                            onChange={(e) => setIsRecurring(e.target.checked)}
                            className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                          />
                          <span className="text-sm font-bold text-gray-700 flex items-center gap-2"><LocalIcons.Repeat size={14}/> Repetir semanalmente</span>
                      </label>
                      
                      {isRecurring && (
                          <div className="mt-3 animate-in slide-in-from-top-2">
                              <Input 
                                name="weeks" 
                                label="Repetir por quantas semanas?" 
                                type="number" 
                                min="2" 
                                max="12" 
                                defaultValue="4" 
                                placeholder="4"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                O sistema criará agendamentos automáticos neste mesmo dia e horário pelas próximas semanas.
                              </p>
                          </div>
                      )}
                  </div>

                  <div className="flex justify-end gap-3 pt-2 border-t">
                      <Button type="button" variant="secondary" onClick={() => { setShowAddModal(false); setIsRecurring(false); }}>Cancelar</Button>
                      <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Confirmar'}</Button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

// =================================================================
// 📄 SCREENS & FLOWS
// =================================================================

// --- PRINT PREVIEW (A4 PDF) ---
const DocumentPreview = ({ type, data, patient, onClose, userName }) => {
  const currentStatus = (patient.status || 'active') === 'archived' ? 'ALTA / INATIVO' : 'ATIVO';

  return (
    <div className="fixed inset-0 bg-gray-900/90 z-50 overflow-y-auto flex flex-col items-center p-4 md:p-8 backdrop-blur-sm animate-in fade-in print-preview-container">
      <div className="w-full max-w-[210mm] flex justify-between items-center mb-4 no-print text-white">
         <h2 className="font-bold text-lg">Visualização de Impressão</h2>
         <div className="flex gap-2">
           <Button variant="secondary" onClick={onClose}><X size={16}/> Fechar</Button>
           <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 border-none text-white"><Printer size={16}/> Imprimir / Salvar PDF</Button>
         </div>
      </div>
      
      <div className="bg-white w-full max-w-[210mm] min-h-[297mm] p-[15mm] md:p-[20mm] shadow-2xl text-black relative print-content mx-auto">
        {/* Header A4 */}
        <div className="border-b-2 border-teal-800 pb-4 mb-6 flex justify-between items-end">
            <div>
                <h1 className="text-2xl font-bold uppercase text-gray-800 tracking-wide">FisioManager</h1>
                <p className="text-sm text-gray-500 uppercase tracking-widest">Sistema de Prontuário Eletrônico</p>
            </div>
            <div className="text-right text-xs">
                <p>Profissional: <strong>{userName}</strong></p>
                <p>Gerado em: {new Date().toLocaleDateString()}</p>
            </div>
        </div>

        {/* Patient Header */}
        <div className="bg-gray-50 p-4 rounded border border-gray-200 mb-8 text-sm grid grid-cols-2 gap-4">
           <div><span className="font-bold text-gray-600">PACIENTE:</span> <span className="uppercase">{patient.name}</span></div>
           <div><span className="font-bold text-gray-600">CPF:</span> {patient.cpf || '-'}</div>
           <div><span className="font-bold text-gray-600">TELEFONE:</span> {patient.phone}</div>
           <div><span className="font-bold text-gray-600">DATA NASC.:</span> {patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('pt-BR') : '-'}</div>
           <div className={currentStatus === 'ALTA / INATIVO' ? "text-red-600 font-bold" : "text-green-700 font-bold"}>
             <span className="text-gray-600 font-bold">STATUS:</span> {currentStatus}
           </div>
        </div>

        {type === 'assessment' && (
           <div className="space-y-8 text-sm">
             <div className="bg-teal-700 text-white p-2 font-bold uppercase text-center rounded-sm tracking-widest">Ficha de Avaliação</div>
             
             <section>
                <h3 className="font-bold border-b border-gray-300 mb-3 text-teal-800 uppercase text-xs">1. Anamnese</h3>
                <div className="space-y-3">
                  <p><strong className="text-gray-700">Queixa Principal (QP):</strong><br/> {data.complaint || "Não informado"}</p>
                  <p><strong className="text-gray-700">História da Doença Atual (HDA):</strong><br/> {data.hda || "---"}</p>
                  <p><strong className="text-gray-700">História Patológica Pregressa (HPP):</strong><br/> {data.hpp || "---"}</p>
                </div>
             </section>

             <section>
                <h3 className="font-bold border-b border-gray-300 mb-3 text-teal-800 uppercase text-xs">2. Exame Físico</h3>
                <div className="grid grid-cols-2 gap-6 mb-4">
                    <div className="border p-2 rounded text-center">
                      <strong className="block text-gray-500 text-xs">EVA (Dor)</strong>
                      <span className="text-2xl font-bold text-teal-700">{data.painLevel || 0}<span className="text-sm text-gray-400">/10</span></span>
                    </div>
                    <div className="border p-2 rounded">
                      <strong className="block text-gray-500 text-xs mb-1">Sinais Vitais</strong>
                      {data.vitals || "Normais"}
                    </div>
                </div>
                <p><strong className="text-gray-700">Inspeção/Palpação:</strong><br/> {data.inspection || "---"}</p>
                <p className="mt-2"><strong className="text-gray-700">ADM / Força:</strong><br/> {data.rom || "---"}</p>
             </section>

             <section>
                <h3 className="font-bold border-b border-gray-300 mb-3 text-teal-800 uppercase text-xs">3. Diagnóstico Cinesiológico</h3>
                <p className="mb-2"><strong className="text-gray-700">Diagnóstico Cinesiológico:</strong><br/> {data.diagnosis || "---"}</p>
             </section>

             <section>
                <h3 className="font-bold border-b border-gray-300 mb-3 text-teal-800 uppercase text-xs">4. Observação</h3>
                <p className="mb-2"><strong className="text-gray-700">Deambulação:</strong> {data.ambulation || "---"}</p>
                <p><strong className="text-gray-700">Tônus:</strong> {data.tonus === 'Outros' ? (data.tonusOther || 'Outros') : (data.tonus || "---")}</p>
             </section>

             <section>
                <h3 className="font-bold border-b border-gray-300 mb-3 text-teal-800 uppercase text-xs">5. Tratamento Fisioterapêutico Proposto</h3>
                <p className="mb-2"><strong className="text-gray-700">Objetivo:</strong><br/> {data.treatmentGoal || "---"}</p>
                <p className="mb-2"><strong className="text-gray-700">Conduta:</strong><br/> {data.treatmentConduct || "---"}</p>
             </section>
           </div>
        )}

        {type === 'evolutions' && (
           <div className="space-y-4 text-sm">
             <div className="bg-teal-700 text-white p-2 font-bold uppercase text-center rounded-sm tracking-widest">Relatório de Evolução (SOAP)</div>
             <table className="w-full border-collapse border border-gray-300 mt-4">
               <thead>
                 <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
                   <th className="border p-2 w-32 text-left">Data / Hora</th>
                   <th className="border p-2 text-left">Descrição do Atendimento</th>
                 </tr>
               </thead>
               <tbody>
                 {data.map((evo, i) => (
                   <tr key={i} className="break-inside-avoid hover:bg-gray-50">
                     <td className="border p-3 align-top font-bold text-gray-700">
                        {evo.date ? new Date(evo.date).toLocaleDateString('pt-BR') : 'Hoje'} <br/>
                        <span className="text-xs font-normal text-gray-500">{evo.date ? new Date(evo.date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : ''}</span>
                     </td>
                     <td className="border p-3">
                       <div className="grid gap-2">
                         <div className="flex gap-2"><strong className="text-teal-700 w-4">S:</strong> <span>{evo.subjective}</span></div>
                         <div className="flex gap-2"><strong className="text-teal-700 w-4">O:</strong> <span>{evo.objective}</span></div>
                         <div className="flex gap-2"><strong className="text-teal-700 w-4">A:</strong> <span>{evo.assessment}</span></div>
                         <div className="flex gap-2"><strong className="text-teal-700 w-4">P:</strong> <span>{evo.plan}</span></div>
                       </div>
                     </td>
                   </tr>
                 ))}
                 {data.length === 0 && <tr><td colSpan="2" className="p-8 text-center text-gray-400">Nenhum registro encontrado.</td></tr>}
               </tbody>
             </table>
           </div>
        )}

        {/* Footer A4 */}
        <div className="absolute bottom-[20mm] left-[20mm] right-[20mm] text-center">
             <div className="border-t border-black w-64 mx-auto pt-2 mb-1"></div>
             <p className="font-bold">{userName}</p>
             <p className="text-xs text-gray-500">Fisioterapeuta Responsável</p>
        </div>
      </div>
    </div>
  );
};

// --- PATIENT DASHBOARD ---
const PatientDashboard = ({ patient: initialPatient, user, onBack }) => {
  const [patient, setPatient] = useState(initialPatient);
  const [view, setView] = useState('menu');
  const [assessment, setAssessment] = useState(null);
  const [evolutions, setEvolutions] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  // Derivando estado visual do paciente
  const isArchived = (patient.status || 'active') === 'archived';

  // Load Data
  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        try {
            const assessData = await api.getAssessment(patient.id);
            setAssessment(assessData);

            const evoData = await api.getEvolutions(patient.id);
            setEvolutions(evoData);
        } catch (e) {
            console.error("Error loading data", e);
        } finally {
            setLoading(false);
        }
    };
    if (patient.id) {
        loadData();
    }
  }, [patient]);

  const handleSaveAssessment = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    
    try {
        await api.saveAssessment(patient.id, data);
        setAssessment(data);
        setView('menu');
        alert('Avaliação salva com sucesso!');
    } catch(err) {
        alert("Erro ao salvar: " + err.message);
    }
  };

  const handleSaveEvolution = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    
    // Adicionar data atual se o backend não fizer automaticamente
    data.date = new Date().toISOString();

    try {
        const newEvo = await api.createEvolution(patient.id, data);
        setEvolutions([newEvo, ...evolutions]);
        setView('menu');
        alert('Evolução registrada com sucesso!');
    } catch(err) {
        alert("Erro ao salvar evolução: " + err.message);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = isArchived ? 'active' : 'archived';
    setStatusLoading(true);
    
    try {
        await api.updatePatient(patient.id, { status: newStatus });
        
        // Atualiza o estado local imediatamente
        setPatient(prev => ({ ...prev, status: newStatus }));
        
    } catch (error) {
        console.error(error);
        alert("Erro ao atualizar status: " + error.message);
    } finally {
        setStatusLoading(false);
    }
  };

  if (previewData) return <DocumentPreview type={previewData.type} data={previewData.data} patient={patient} userName={user.name} onClose={() => setPreviewData(null)} />;

  if (view === 'form_assessment') return (
    <div className="max-w-4xl mx-auto pb-20 animate-in slide-in-from-right">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="secondary" onClick={() => setView('menu')}><ArrowLeft size={16}/> Voltar</Button>
        <h2 className="text-xl font-bold text-teal-800">Ficha de Avaliação</h2>
      </div>
      <Card className="p-8">
        <form onSubmit={handleSaveAssessment}>
          <div className="grid md:grid-cols-2 gap-6">
             <div className="md:col-span-2">
                <h3 className="font-bold text-gray-400 text-xs uppercase mb-3 border-b pb-1">Anamnese</h3>
             </div>
             <div className="md:col-span-2">
                <TextArea name="complaint" label="Queixa Principal (QP)" defaultValue={assessment?.complaint} required placeholder="O que trouxe o paciente aqui?" />
             </div>
             <TextArea name="hda" label="História da Doença Atual (HDA)" defaultValue={assessment?.hda} rows="3" />
             <TextArea name="hpp" label="História Patológica Pregressa (HPP)" defaultValue={assessment?.hpp} rows="3" />
             
             <div className="md:col-span-2">
                <h3 className="font-bold text-gray-400 text-xs uppercase mb-3 border-b pb-1 mt-4">Exame Físico</h3>
             </div>
             <Input name="painLevel" label="Escala de Dor (0-10)" type="number" min="0" max="10" defaultValue={assessment?.painLevel} />
             <Input name="vitals" label="Sinais Vitais (PA, FC, SpO2)" defaultValue={assessment?.vitals} />
             <div className="md:col-span-2">
                <TextArea name="inspection" label="Inspeção e Palpação" defaultValue={assessment?.inspection} />
             </div>
             <div className="md:col-span-2">
                <TextArea name="rom" label="Amplitude de Movimento (ADM) e Força" defaultValue={assessment?.rom} />
             </div>

             <div className="md:col-span-2">
                <h3 className="font-bold text-gray-400 text-xs uppercase mb-3 border-b pb-1 mt-4">Conclusão</h3>
             </div>
             <Input name="diagnosis" label="Diagnóstico Cinesiológico Funcional" defaultValue={assessment?.diagnosis} required />
             
             {/* Observação Section */}
             <div className="md:col-span-2">
                <h3 className="font-bold text-gray-400 text-xs uppercase mb-3 border-b pb-1 mt-4">Observação</h3>
             </div>
             
             <div className="md:col-span-2 mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Deambulação</label>
                <div className="flex flex-wrap gap-4">
                  {['Livre', 'Bengala', 'Andador', 'Cadeira de rodas', 'Leito'].map((option) => (
                    <label key={option} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="ambulation" 
                        value={option} 
                        defaultChecked={assessment?.ambulation === option}
                        className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
             </div>

             <div className="md:col-span-2 mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Tônus</label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-4">
                    {['Normotonia', 'Hipotonia', 'Hipertonia'].map((option) => (
                        <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="radio" 
                            name="tonus" 
                            value={option} 
                            defaultChecked={assessment?.tonus === option}
                            className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{option}</span>
                        </label>
                    ))}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="radio" 
                            name="tonus" 
                            value="Outros" 
                            defaultChecked={assessment?.tonus === 'Outros'}
                            className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                        />
                        <span className="text-sm text-gray-700">Outros</span>
                    </label>
                  </div>
                  <input 
                    name="tonusOther" 
                    placeholder="Especifique se outros..." 
                    defaultValue={assessment?.tonusOther}
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </div>
             </div>

             <div className="md:col-span-2 mt-4">
                <h3 className="font-bold text-gray-400 text-xs uppercase mb-3 border-b pb-1">Tratamento Fisioterapêutico Proposto</h3>
             </div>
             <div className="md:col-span-2">
                <TextArea name="treatmentGoal" label="Objetivo" defaultValue={assessment?.treatmentGoal} rows="2" />
             </div>
             <div className="md:col-span-2">
                <TextArea name="treatmentConduct" label="Conduta" defaultValue={assessment?.treatmentConduct} rows="3" />
             </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
              <Button type="button" variant="secondary" onClick={() => setView('menu')}>Cancelar</Button>
              <Button type="submit"><Save size={16}/> Salvar Ficha</Button>
          </div>
        </form>
      </Card>
    </div>
  );

  if (view === 'form_evolution') return (
    <div className="max-w-3xl mx-auto pb-20 animate-in slide-in-from-right">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="secondary" onClick={() => setView('menu')}><ArrowLeft size={16}/> Voltar</Button>
        <h2 className="text-xl font-bold text-blue-800">Nova Evolução (Sessão)</h2>
      </div>
      <Card className="p-8">
        <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-lg mb-6 flex items-start gap-2">
            <ClipboardList size={18} className="mt-0.5" />
            <div>
                <strong>Método SOAP:</strong> Preencha os campos abaixo para registrar o atendimento de hoje.
            </div>
        </div>
        <form onSubmit={handleSaveEvolution}>
          <TextArea name="subjective" label="S - Subjetivo" placeholder="Relato do paciente..." required />
          <TextArea name="objective" label="O - Objetivo" placeholder="O que você observou/mediu..." />
          <TextArea name="assessment" label="A - Avaliação/Procedimentos" placeholder="O que foi feito na sessão..." required />
          <TextArea name="plan" label="P - Plano" placeholder="Orientações para casa ou próxima sessão..." />
          <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="secondary" onClick={() => setView('menu')}>Cancelar</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white"><Save size={16}/> Salvar Evolução</Button>
          </div>
        </form>
      </Card>
    </div>
  );

  return (
    <div className={`pb-20 animate-in fade-in min-h-screen ${isArchived ? 'bg-red-50/50' : ''}`}>
       {/* Header Paciente - CORRIGIDO PARA MOSTRAR VERMELHO SE ALTA */}
       <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 p-6 rounded-xl border shadow-sm transition-colors ${isArchived ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-4">
             <Button variant="ghost" onClick={onBack} className="h-12 w-12 rounded-full border border-gray-200 bg-white"><ArrowLeft size={20}/></Button>
             <div>
                <h1 className={`text-3xl font-bold ${isArchived ? 'text-red-900' : 'text-gray-900'}`}>{patient.name}</h1>
                <div className={`flex gap-4 text-sm mt-1 ${isArchived ? 'text-red-700' : 'text-gray-500'}`}>
                    <span className="flex items-center gap-1"><User size={14}/> {patient.phone}</span>
                    {patient.cpf && <span className="flex items-center gap-1"><FileText size={14}/> {patient.cpf}</span>}
                    <span className="flex items-center gap-1"><Calendar size={14}/> {patient.birthDate}</span>
                </div>
             </div>
          </div>
          <div className="flex flex-col items-end gap-2">
             {isArchived ? (
                <span className="bg-red-200 text-red-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-red-300">
                    <LocalIcons.UserX size={12}/> Alta / Inativo
                </span>
             ) : (
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <LocalIcons.UserCheck size={12}/> Em Tratamento
                </span>
             )}
             
             <Button 
                variant="ghost" 
                onClick={handleToggleStatus} 
                disabled={statusLoading}
                className={`text-xs ${isArchived ? 'text-green-700 hover:bg-green-100 hover:text-green-900' : 'text-red-500 hover:bg-red-50'}`}
             >
                {statusLoading ? <LocalIcons.Loader2 size={14} /> : (isArchived ? 'Reativar Paciente' : 'Dar Alta')}
             </Button>
          </div>
       </div>

       <div className="grid md:grid-cols-3 gap-8">
          {/* Coluna Esquerda: Ações */}
          <div className="space-y-6">
             <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-400 text-xs uppercase mb-4 tracking-wider">Prontuário</h3>
                <div className="space-y-3">
                    <button onClick={() => setView('form_assessment')} className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-teal-50 hover:border-teal-200 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="bg-teal-100 p-2 rounded text-teal-700 group-hover:bg-teal-600 group-hover:text-white transition-colors"><ClipboardList size={20}/></div>
                            <div className="text-left">
                                <span className="block font-bold text-gray-700 group-hover:text-teal-800">Avaliação</span>
                                <span className="block text-xs text-gray-400">{assessment ? 'Editar Ficha' : 'Criar Nova'}</span>
                            </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-300"/>
                    </button>

                    <button onClick={() => setView('form_evolution')} className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors"><Plus size={20}/></div>
                            <div className="text-left">
                                <span className="block font-bold text-gray-700 group-hover:text-blue-800">Nova Evolução</span>
                                <span className="block text-xs text-gray-400">Registrar Sessão</span>
                            </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-300"/>
                    </button>
                </div>
             </div>

             <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-400 text-xs uppercase mb-4 tracking-wider">Relatórios PDF</h3>
                <div className="space-y-2">
                    <Button variant="secondary" className="w-full justify-between text-xs" onClick={() => assessment ? setPreviewData({type:'assessment', data:assessment}) : alert('Preencha a avaliação primeiro')}>
                        <span>Ficha de Avaliação</span> <Printer size={14}/>
                    </Button>
                    <Button variant="secondary" className="w-full justify-between text-xs" onClick={() => evolutions.length ? setPreviewData({type:'evolutions', data:evolutions}) : alert('Sem evoluções registradas')}>
                        <span>Histórico de Evoluções</span> <Printer size={14}/>
                    </Button>
                </div>
             </div>
          </div>

          {/* Coluna Direita: Resumo */}
          <div className="md:col-span-2 space-y-6">
             {/* Card Resumo Avaliação */}
             <Card className="p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><ClipboardList size={100}/></div>
                <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                    <Activity className="text-teal-600" size={20}/> Resumo Clínico
                </h3>
                {assessment ? (
                    <div className="grid gap-4 text-sm relative z-10">
                        <div className="bg-gray-50 p-3 rounded border border-gray-100">
                            <span className="block text-xs font-bold text-gray-400 uppercase">Queixa Principal</span>
                            <p className="font-medium text-gray-800">{assessment.complaint}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-3 rounded border border-gray-100">
                                <span className="block text-xs font-bold text-gray-400 uppercase">Diagnóstico</span>
                                <p className="font-medium text-gray-800">{assessment.diagnosis}</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded border border-gray-100">
                                <span className="block text-xs font-bold text-gray-400 uppercase">Plano</span>
                                <p className="font-medium text-gray-800 truncate">{assessment.plan}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">
                        <p>Nenhuma avaliação registrada.</p>
                    </div>
                )}
             </Card>

             {/* Timeline Evoluções */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-bold text-lg text-gray-800 mb-6 flex items-center gap-2">
                    <Clock className="text-blue-600" size={20}/> Histórico de Sessões
                </h3>
                <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-0 before:w-0.5 before:bg-gray-100">
                    {evolutions.length === 0 ? (
                        <p className="text-gray-400 text-center py-4 text-sm pl-8">Nenhuma sessão realizada.</p>
                    ) : (
                        evolutions.map((evo, i) => (
                            <div key={i} className="relative pl-10">
                                <div className="absolute left-0 top-1 w-10 h-10 bg-white border-4 border-blue-50 rounded-full flex items-center justify-center z-10">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                                        {evo.date ? new Date(evo.date).toLocaleDateString() : 'Data inválida'}
                                    </span>
                                    <div className="bg-gray-50 p-3 rounded-lg mt-1 border border-gray-100">
                                        <p className="text-sm font-medium text-gray-800 mb-1">{evo.assessment}</p>
                                        <p className="text-xs text-gray-500 line-clamp-2">{evo.subjective}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

// --- LOGIN SCREEN ---
const AuthScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); 
    setError('');
    
    if (!email || !password) {
        setError("Preencha todos os campos.");
        setLoading(false);
        return;
    }

    try {
      const userData = await api.login(email, password);
      onLogin(userData);
    } catch (err) {
      setError(err.message || 'Erro ao logar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center mb-8">
            <div className="bg-teal-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-teal-200">
              <Activity size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">FisioManager SaaS</h1>
            <p className="text-sm text-gray-500">Gestão Inteligente de Fisioterapia</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 flex items-center gap-2 border border-red-100"><AlertCircle size={16}/> {error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Email Profissional" 
            placeholder="seu@email.com" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            type="email"
          />
          <Input 
            label="Senha" 
            placeholder="••••••••" 
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <Button type="submit" className="w-full h-12 text-lg shadow-teal-200">
            {loading ? 'Conectando...' : 'Acessar Sistema'}
          </Button>
        </form>
        
        <p className="text-center text-xs text-gray-400 mt-8">
           © 2024 FisioManager SaaS. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};

// --- APP CONTROLLER ---
export default function App() {
  const [user, setUser] = useState(null); 
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [currentTab, setCurrentTab] = useState('patients'); // 'patients' | 'agenda'

  // 1. Verificar Login
  useEffect(() => {
    const stored = localStorage.getItem('fisio_user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  // 2. Load Patients
  useEffect(() => {
    if (user && !selectedPatient) {
        api.getPatients().then(setPatients).catch(console.error);
    }
  }, [user, selectedPatient, showAdd, currentTab]);

  // Handlers
  const handleLogin = (data) => {
    localStorage.setItem('fisio_token', data.token);
    localStorage.setItem('fisio_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    
    try {
        await api.createPatient(data);
        setShowAdd(false);
        const updated = await api.getPatients();
        setPatients(updated);
        alert('Paciente cadastrado com sucesso!');
    } catch(err) {
        alert("Erro ao criar paciente: " + err.message);
    }
  };

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  if (selectedPatient) return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 app-container">
        <PrintStyles />
        <PatientDashboard 
            patient={selectedPatient} 
            user={user} 
            onBack={() => setSelectedPatient(null)} 
        />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 app-container">
      <PrintStyles />
      {/* Header Dashboard */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-6 py-4 shadow-sm">
         <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
               <div className="bg-teal-600 text-white p-1.5 rounded-lg shadow">
                  <Activity size={20} />
               </div>
               <span className="font-bold text-gray-800 text-lg hidden sm:inline">FisioManager</span>
            </div>
            
            {/* Navigation Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                  onClick={() => setCurrentTab('patients')}
                  className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${currentTab === 'patients' ? 'bg-white text-teal-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Pacientes
                </button>
                <button 
                  onClick={() => setCurrentTab('agenda')}
                  className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${currentTab === 'agenda' ? 'bg-white text-teal-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Agenda
                </button>
            </div>

            <div className="flex items-center gap-4">
               <div className="text-right hidden sm:block">
                   <p className="text-sm font-bold text-gray-700">{user.name}</p>
                   <p className="text-xs text-gray-500">Administrador</p>
               </div>
               <div className="h-8 w-px bg-gray-200 mx-2"></div>
               <Button variant="ghost" onClick={handleLogout} className="text-xs">
                  <LogOut size={16}/> Sair
               </Button>
            </div>
         </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
         {currentTab === 'patients' && (
           <div className="animate-in fade-in slide-in-from-bottom-2">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Meus Pacientes</h1>
                    <p className="text-gray-500">Gerencie seus atendimentos de forma simples.</p>
                </div>
                <Button onClick={() => setShowAdd(true)} className="shadow-lg shadow-teal-100"><Plus size={18}/> Novo Paciente</Button>
             </div>

             {/* Barra de Busca (Visual) */}
             <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    placeholder="Buscar por nome, CPF ou telefone..."
                />
             </div>

             {patients.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-xl border-2 border-dashed border-gray-200">
                   <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                       <Users size={40} className="text-gray-300" />
                   </div>
                   <h3 className="text-lg font-bold text-gray-700">Sua lista está vazia</h3>
                   <p className="text-gray-500 mb-6">Comece cadastrando seu primeiro paciente no botão acima.</p>
                </div>
             ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                   {patients.map(p => {
                      const status = p.status || 'active';
                      return (
                      <div key={p.id} onClick={() => setSelectedPatient(p)} className={`bg-white p-5 rounded-xl border shadow-sm hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden ${status === 'archived' ? 'border-red-200 bg-red-50 opacity-90' : 'border-gray-200 hover:border-teal-300'}`}>
                         <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight className="text-teal-600" />
                         </div>
                         <div className="flex items-center gap-4 mb-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl transition-colors ${status === 'archived' ? 'bg-red-200 text-red-700' : 'bg-teal-50 text-teal-700 group-hover:bg-teal-600 group-hover:text-white'}`}>
                               {p.name.charAt(0)}
                            </div>
                            <div>
                               <h3 className="font-bold text-gray-800 text-lg group-hover:text-teal-700 transition-colors flex items-center gap-2">
                                 {p.name}
                                 {status === 'archived' && <span className="text-[10px] bg-red-200 text-red-800 px-1.5 py-0.5 rounded uppercase font-bold">Alta</span>}
                               </h3>
                               <p className="text-xs text-gray-500 uppercase tracking-wide">Paciente</p>
                            </div>
                         </div>
                         <div className="space-y-2 text-sm text-gray-600 pt-4 border-t border-gray-50">
                            <div className="flex items-center gap-2"><User size={14} className="text-gray-400"/> {p.phone}</div>
                            {p.cpf && <div className="flex items-center gap-2"><FileText size={14} className="text-gray-400"/> {p.cpf}</div>}
                            <div className="flex items-center gap-2"><Calendar size={14} className="text-gray-400"/> {p.birthDate ? new Date(p.birthDate).toLocaleDateString() : '-'}</div>
                         </div>
                      </div>
                   )})}
                </div>
             )}
           </div>
         )}

         {currentTab === 'agenda' && (
           <AgendaView patients={patients} />
         )}
      </main>

      {/* MODAL NOVO PACIENTE */}
      {showAdd && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95">
               <div className="flex justify-between items-center mb-6">
                   <h2 className="text-xl font-bold text-gray-800">Novo Paciente</h2>
                   <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
               </div>
               <form onSubmit={handleAddPatient}>
                  <Input name="name" label="Nome Completo" required autoFocus placeholder="Ex: Ana Maria" />
                  <Input name="cpf" label="CPF" placeholder="000.000.000-00" />
                  <Input name="phone" label="Telefone / WhatsApp" placeholder="(00) 00000-0000" />
                  <Input name="birthDate" label="Data de Nascimento" type="date" />
                  <div className="flex justify-end gap-3 mt-8">
                      <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancelar</Button>
                      <Button type="submit">Salvar Cadastro</Button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}
