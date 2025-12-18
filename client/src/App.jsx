import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Calendar, Activity, Plus, Search, ChevronRight, Save, 
  Clock, CheckCircle, X, ArrowLeft, Printer, FileText, ClipboardList,
  LogOut, Lock, Mail, User, AlertCircle, ChevronLeft
} from 'lucide-react';

// =================================================================
// ⚠️ CONFIGURAÇÃO DO SERVIDOR
// =================================================================
const API_URL = 'http://65.21.48.34:3001'; 

// =================================================================
// 🎨 ÍCONES LOCAIS (FALLBACK)
// =================================================================
const LocalIcons = {
  Repeat: ({ size = 24, className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>
    </svg>
  ),
  Loader2: ({ size = 24, className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`animate-spin ${className}`}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  UserCheck: ({ size = 24, className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>
    </svg>
  ),
  UserX: ({ size = 24, className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/>
    </svg>
  )
};

// =================================================================
// 🔌 CAMADA DE DADOS (API REST - POSTGRES)
// =================================================================
const api = {
  // --- HELPERS ---
  fetch: async (endpoint, options = {}) => {
    const token = localStorage.getItem('fisio_token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
        
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('fisio_token');
          localStorage.removeItem('fisio_user');
          window.location.reload(); 
          return null;
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.message || 'Erro na requisição');
        }
        
        return data;
    } catch (error) {
        console.error("Erro API:", error);
        throw error;
    }
  },

  // --- MÉTODOS ---
  login: async (identifier, password) => {
    const payload = { password, identifier };
    // Detecta se é email ou usuário para facilitar pro backend
    if (identifier.includes('@')) payload.email = identifier;
    else payload.username = identifier;

    return api.fetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getPatients: () => api.fetch('/api/patients'),

  createPatient: (data) => api.fetch('/api/patients', {
      method: 'POST', body: JSON.stringify(data)
  }),

  updatePatientStatus: (id, status) => api.fetch(`/api/patients/${id}`, {
      method: 'PUT', body: JSON.stringify({ status })
  }),

  getAssessment: (pid) => api.fetch(`/api/patients/${pid}/assessment`).catch(() => null),

  saveAssessment: (pid, data) => api.fetch(`/api/patients/${pid}/assessment`, {
      method: 'POST', body: JSON.stringify(data)
  }),

  getEvolutions: (pid) => api.fetch(`/api/patients/${pid}/evolutions`).catch(() => []),

  createEvolution: (pid, data) => api.fetch(`/api/patients/${pid}/evolutions`, {
      method: 'POST', body: JSON.stringify(data)
  }),

  getAppointmentsRange: (start, end) => api.fetch(`/api/appointments?startDate=${start}&endDate=${end}`).catch(() => []),

  createAppointment: (data) => api.fetch('/api/appointments', {
      method: 'POST', body: JSON.stringify(data)
  }),

  deleteAppointment: (id) => api.fetch(`/api/appointments/${id}`, { method: 'DELETE' })
};

// =================================================================
// 🖨️ PRINT STYLES
// =================================================================
const PrintStyles = () => (
  <style>{`
    @media print {
      @page { margin: 0; size: A4; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
      .no-print, header, .auth-screen, button, .app-container { display: none !important; }
      .print-preview-container { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background: white !important; z-index: 99999 !important; display: block !important; visibility: visible !important; }
      .print-content { box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: none !important; padding: 20mm !important; }
      .break-inside-avoid { page-break-inside: avoid; }
    }
  `}</style>
);

// =================================================================
// 🎨 UI COMPONENTS
// =================================================================
const Button = ({ children, onClick, variant = 'primary', className = '', disabled, ...props }) => {
  const variants = {
    primary: "bg-teal-700 text-white hover:bg-teal-800",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
    ghost: "text-teal-700 hover:bg-teal-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
  };
  return <button onClick={onClick} disabled={disabled} className={`px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${variants[variant]} ${className} ${disabled ? 'opacity-50' : ''}`} {...props}>{children}</button>;
};

const Card = ({ children, className = '', onClick }) => <div onClick={onClick} className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>{children}</div>;

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
// 📅 AGENDA COMPONENT (MENSAL)
// =================================================================
const AgendaView = ({ patients }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const toISODate = (d) => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  const [selectedDate, setSelectedDate] = useState(toISODate(new Date()));
  
  const [monthAppointments, setMonthAppointments] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false); 
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMonthData = async () => {
        setLoading(true);
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const startDate = toISODate(new Date(year, month, 1));
        const endDate = toISODate(new Date(year, month + 1, 0));

        try {
            const data = await api.getAppointmentsRange(startDate, endDate);
            setMonthAppointments(data || []);
        } catch (e) {
            console.error("Erro agenda:", e);
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
                promises.push(api.createAppointment({ ...baseApp, date: toISODate(nextDate) }));
            }
        } else {
            promises.push(api.createAppointment({ ...baseApp, date: selectedDate }));
        }

        await Promise.all(promises);
        
        // Refresh Agenda
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const startDate = toISODate(new Date(year, month, 1));
        const endDate = toISODate(new Date(year, month + 1, 0));
        const data = await api.getAppointmentsRange(startDate, endDate);
        setMonthAppointments(data);
        
        setShowAddModal(false);
        setIsRecurring(false);
        alert('Agendamento realizado!');
    } catch (err) {
        alert("Erro ao agendar: " + err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if(confirm("Cancelar agendamento?")) {
      try {
          await api.deleteAppointment(id);
          setMonthAppointments(prev => prev.filter(app => app.id !== id));
      } catch(e) { alert(e.message); }
    }
  };

  const handleDateClick = (dateStr) => {
    setSelectedDate(dateStr);
    setShowAddModal(true);
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(toISODate(new Date(year, month, i)));

  const selectedDayAppointments = monthAppointments.filter(app => app.date === selectedDate);
  const monthLabel = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in">
      <div className="flex-1">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 capitalize">{monthLabel}</h2>
            <div className="flex gap-2">
                <Button variant="ghost" onClick={() => changeMonth(-1)}><ChevronLeft/></Button>
                <Button variant="ghost" onClick={() => changeMonth(1)}><ChevronRight/></Button>
            </div>
        </div>
        <div className="bg-white rounded-xl shadow border overflow-hidden">
            <div className="grid grid-cols-7 border-b bg-gray-50">
                {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => <div key={d} className="py-3 text-center text-xs font-bold text-gray-500 uppercase">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
                {calendarDays.map((dateStr, i) => {
                    if (!dateStr) return <div key={i} className="bg-gray-50/50 min-h-[80px] border-b border-r"></div>;
                    const isSelected = dateStr === selectedDate;
                    const count = monthAppointments.filter(a => a.date === dateStr).length;
                    return (
                        <div key={dateStr} onClick={() => handleDateClick(dateStr)} className={`min-h-[80px] p-2 border-b border-r cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-teal-50 ring-2 ring-inset ring-teal-500' : ''}`}>
                            <span className="text-sm font-bold text-gray-700">{parseInt(dateStr.split('-')[2])}</span>
                            {count > 0 && <div className="mt-1"><span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">{count} agend.</span></div>}
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      <div className="w-full lg:w-96 bg-white rounded-xl shadow border p-6 flex flex-col h-fit">
          <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-lg">Agenda: {selectedDate.split('-').reverse().join('/')}</h3>
               <Button onClick={() => setShowAddModal(true)}><Plus size={16}/></Button>
          </div>
          {loading ? <div className="text-center py-4"><LocalIcons.Loader2 className="animate-spin inline"/></div> : 
           selectedDayAppointments.length === 0 ? <p className="text-gray-400 text-center py-8">Sem agendamentos.</p> : 
           <div className="space-y-3">
              {selectedDayAppointments.map(app => (
                  <div key={app.id} className="p-3 rounded border hover:shadow-sm transition-all flex justify-between items-start">
                      <div>
                          <span className="font-bold text-teal-700 block">{app.time}</span>
                          <span className="font-medium text-sm">{app.patientName}</span>
                          <span className="text-xs text-gray-500 block">{app.type}</span>
                      </div>
                      <button onClick={() => handleDelete(app.id)} className="text-gray-400 hover:text-red-500"><X size={16}/></button>
                  </div>
              ))}
           </div>
          }
      </div>

      {showAddModal && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
               <h2 className="text-xl font-bold mb-4">Novo Agendamento</h2>
               <form onSubmit={handleAddAppointment}>
                  <div className="mb-4">
                    <label className="block text-sm font-bold mb-1">Paciente</label>
                    <select name="patientId" required className="w-full border p-2 rounded">
                       <option value="">Selecione...</option>
                       {patients.filter(p => (p.status || 'active') !== 'archived').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-4 mb-4">
                     <Input name="time" type="time" required label="Horário" />
                     <div className="w-full">
                        <label className="block text-sm font-bold mb-1">Tipo</label>
                        <select name="type" className="w-full border p-2 rounded h-[42px]">
                           <option>Sessão</option><option>Avaliação</option>
                        </select>
                     </div>
                  </div>
                  <Input name="notes" label="Nota" />
                  
                  <div className="mb-4 bg-gray-50 p-3 rounded">
                      <label className="flex items-center gap-2 text-sm font-bold">
                          <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)}/> Repetir Semanalmente
                      </label>
                      {isRecurring && <input name="weeks" type="number" defaultValue="4" min="2" max="12" className="mt-2 w-full border p-2 rounded text-sm" placeholder="Quantas semanas?"/>}
                  </div>

                  <div className="flex justify-end gap-2">
                      <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancelar</Button>
                      <Button type="submit" disabled={loading}>Salvar</Button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

// =================================================================
// 📄 PREVIEW PDF
// =================================================================
const DocumentPreview = ({ type, data, patient, onClose, userName }) => (
    <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto flex justify-center p-8 print-preview-container">
      <div className="w-full max-w-[210mm] min-h-[297mm] bg-white p-[20mm] shadow-2xl relative print-content">
        <div className="flex justify-between items-center mb-8 border-b-2 border-teal-800 pb-4">
            <div><h1 className="text-2xl font-bold uppercase">FisioManager</h1><p className="text-sm text-gray-500 uppercase">Prontuário Eletrônico</p></div>
            <div className="no-print"><Button onClick={onClose} variant="secondary">Fechar</Button></div>
        </div>
        <div className="bg-gray-50 p-4 border mb-8 text-sm grid grid-cols-2 gap-4">
           <div><strong>PACIENTE:</strong> {patient.name}</div>
           <div><strong>CPF:</strong> {patient.cpf}</div>
           <div><strong>TELEFONE:</strong> {patient.phone}</div>
           <div><strong>NASCIMENTO:</strong> {patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('pt-BR') : '-'}</div>
        </div>
        
        {type === 'assessment' && (
           <div className="space-y-6 text-sm">
             <div className="bg-teal-700 text-white p-1 font-bold text-center uppercase">Ficha de Avaliação</div>
             <p><strong>QP:</strong> {data.complaint}</p>
             <p><strong>HDA:</strong> {data.hda}</p>
             <p><strong>HPP:</strong> {data.hpp}</p>
             <div className="grid grid-cols-2 gap-4 border p-2">
                <div><strong>Dor (EVA):</strong> {data.painLevel}</div>
                <div><strong>Sinais Vitais:</strong> {data.vitals}</div>
             </div>
             <p><strong>Inspeção:</strong> {data.inspection}</p>
             <p><strong>Diagnóstico:</strong> {data.diagnosis}</p>
             <p><strong>Plano:</strong> {data.plan}</p>
           </div>
        )}

        {type === 'evolutions' && (
           <div className="space-y-4">
             <div className="bg-teal-700 text-white p-1 font-bold text-center uppercase">Evoluções</div>
             <table className="w-full border text-sm">
               <thead><tr className="bg-gray-100"><th className="border p-2">Data</th><th className="border p-2">Descrição</th></tr></thead>
               <tbody>
                 {data.map((ev, i) => (
                   <tr key={i}><td className="border p-2 align-top font-bold">{new Date(ev.date).toLocaleDateString()}</td><td className="border p-2"><strong>S:</strong> {ev.subjective}<br/><strong>O:</strong> {ev.objective}<br/><strong>A:</strong> {ev.assessment}<br/><strong>P:</strong> {ev.plan}</td></tr>
                 ))}
               </tbody>
             </table>
           </div>
        )}
      </div>
    </div>
);

// =================================================================
// 📄 DASHBOARD PACIENTE
// =================================================================
const PatientDashboard = ({ patient, user, onBack, onUpdateList }) => {
  const [localPatient, setLocalPatient] = useState(patient);
  const [view, setView] = useState('menu');
  const [assessment, setAssessment] = useState(null);
  const [evolutions, setEvolutions] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const isArchived = (localPatient.status || '').toLowerCase() === 'archived';

  useEffect(() => {
    api.getAssessment(localPatient.id).then(setAssessment);
    api.getEvolutions(localPatient.id).then(setEvolutions);
  }, [localPatient.id]);

  const handleToggleStatus = async () => {
    const newStatus = isArchived ? 'active' : 'archived';
    if (!confirm(`Deseja alterar status para ${newStatus === 'active' ? 'ATIVO' : 'ALTA'}?`)) return;
    
    setStatusLoading(true);
    try {
        await api.updatePatientStatus(localPatient.id, newStatus);
        setLocalPatient({ ...localPatient, status: newStatus });
        if(onUpdateList) onUpdateList();
        alert("Status atualizado!");
    } catch(err) { alert(err.message); } 
    finally { setStatusLoading(false); }
  };

  const handleSaveAssessment = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
        await api.saveAssessment(localPatient.id, data);
        setAssessment(data); setView('menu'); alert('Salvo!');
    } catch(err) { alert(err.message); }
  };

  const handleSaveEvolution = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    data.date = new Date().toISOString();
    try {
        await api.createEvolution(localPatient.id, data);
        setEvolutions([data, ...evolutions]); setView('menu'); alert('Salvo!');
    } catch(err) { alert(err.message); }
  };

  if (previewData) return <DocumentPreview type={previewData.type} data={previewData.data} patient={localPatient} userName={user.name} onClose={() => setPreviewData(null)} />;

  if (view === 'form_assessment') return (
    <div className="max-w-3xl mx-auto p-4 animate-in fade-in">
        <div className="flex gap-4 mb-4"><Button variant="secondary" onClick={()=>setView('menu')}><ArrowLeft/></Button><h2 className="text-xl font-bold">Avaliação</h2></div>
        <Card className="p-6">
            <form onSubmit={handleSaveAssessment}>
                <TextArea name="complaint" label="Queixa Principal" defaultValue={assessment?.complaint} required />
                <TextArea name="hda" label="HDA" defaultValue={assessment?.hda} />
                <div className="grid grid-cols-2 gap-4">
                    <Input name="painLevel" label="Dor (0-10)" type="number" defaultValue={assessment?.painLevel} />
                    <Input name="vitals" label="Sinais Vitais" defaultValue={assessment?.vitals} />
                </div>
                <Input name="diagnosis" label="Diagnóstico" defaultValue={assessment?.diagnosis} required />
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-2">Deambulação</label>
                    <div className="flex gap-4 flex-wrap">{['Livre','Bengala','Andador','Cadeira'].map(o => <label key={o} className="flex gap-1"><input type="radio" name="ambulation" value={o} defaultChecked={assessment?.ambulation===o}/> {o}</label>)}</div>
                </div>
                <TextArea name="plan" label="Plano de Tratamento" defaultValue={assessment?.plan} required />
                <Button type="submit">Salvar Ficha</Button>
            </form>
        </Card>
    </div>
  );

  if (view === 'form_evolution') return (
    <div className="max-w-3xl mx-auto p-4 animate-in fade-in">
        <div className="flex gap-4 mb-4"><Button variant="secondary" onClick={()=>setView('menu')}><ArrowLeft/></Button><h2 className="text-xl font-bold">Nova Evolução</h2></div>
        <Card className="p-6">
            <form onSubmit={handleSaveEvolution}>
                <TextArea name="subjective" label="S - Subjetivo" required />
                <TextArea name="objective" label="O - Objetivo" />
                <TextArea name="assessment" label="A - Avaliação" required />
                <TextArea name="plan" label="P - Plano" />
                <Button type="submit">Salvar Sessão</Button>
            </form>
        </Card>
    </div>
  );

  return (
    <div className={`min-h-screen p-4 md:p-8 ${isArchived ? 'bg-red-50' : 'bg-gray-50'}`}>
        <div className={`flex justify-between items-center mb-8 p-6 rounded-xl border shadow-sm bg-white ${isArchived ? 'border-red-200' : 'border-gray-200'}`}>
            <div>
                <h1 className={`text-3xl font-bold ${isArchived ? 'text-red-800' : 'text-gray-900'}`}>{localPatient.name}</h1>
                <p className="text-gray-500">{localPatient.phone} • {localPatient.cpf}</p>
            </div>
            <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${isArchived ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {isArchived ? 'Alta / Inativo' : 'Em Tratamento'}
                </span>
                <div className="mt-2">
                    <Button variant={isArchived ? 'primary' : 'danger'} onClick={handleToggleStatus} disabled={statusLoading} className="text-xs h-8">
                        {statusLoading ? <LocalIcons.Loader2 className="animate-spin"/> : (isArchived ? 'Reativar' : 'Dar Alta')}
                    </Button>
                </div>
            </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-4">
                <Card className="p-4">
                    <h3 className="font-bold text-gray-400 text-xs uppercase mb-3">Prontuário</h3>
                    <Button variant="secondary" className="w-full justify-start mb-2" onClick={()=>setView('form_assessment')}><ClipboardList size={16}/> Ficha Avaliação</Button>
                    <Button variant="secondary" className="w-full justify-start" onClick={()=>setView('form_evolution')}><Plus size={16}/> Nova Evolução</Button>
                </Card>
                <Card className="p-4">
                    <h3 className="font-bold text-gray-400 text-xs uppercase mb-3">Imprimir</h3>
                    <Button variant="secondary" className="w-full justify-start mb-2 text-xs" onClick={()=>setPreviewData({type:'assessment', data:assessment})} disabled={!assessment}><Printer size={14}/> Ficha</Button>
                    <Button variant="secondary" className="w-full justify-start text-xs" onClick={()=>setPreviewData({type:'evolutions', data:evolutions})} disabled={evolutions.length===0}><Printer size={14}/> Evoluções</Button>
                </Card>
            </div>
            <div className="md:col-span-2 space-y-6">
                <Card className="p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Activity className="text-teal-600"/> Resumo</h3>
                    {assessment ? <div className="space-y-2 text-sm"><p><strong>QP:</strong> {assessment.complaint}</p><p><strong>Diag:</strong> {assessment.diagnosis}</p></div> : <p className="text-gray-400">Sem dados.</p>}
                </Card>
                <Card className="p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Clock className="text-blue-600"/> Histórico ({evolutions.length})</h3>
                    <div className="space-y-4">
                        {evolutions.map((ev, i) => (
                            <div key={i} className="pl-4 border-l-2 border-blue-100">
                                <span className="text-xs font-bold text-blue-600">{new Date(ev.date).toLocaleDateString()}</span>
                                <p className="text-sm text-gray-800 line-clamp-2">{ev.assessment}</p>
                            </div>
                        ))}
                        {evolutions.length===0 && <p className="text-gray-400">Vazio.</p>}
                    </div>
                </Card>
            </div>
        </div>
    </div>
  );
};

// =================================================================
// 📄 APP & LOGIN
// =================================================================
const AuthScreen = ({ onLogin }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
        const data = await api.login(identifier, password);
        onLogin(data);
    } catch(err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold text-center text-teal-800 mb-6">FisioManager</h1>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm flex items-center gap-2"><AlertCircle size={16}/> {error}</div>}
        <form onSubmit={handleSubmit}>
            <Input label="Email ou Usuário" value={identifier} onChange={e=>setIdentifier(e.target.value)} />
            <Input label="Senha" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
            <Button type="submit" className="w-full mt-4" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</Button>
        </form>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(() => {
      try { return JSON.parse(localStorage.getItem('fisio_user')); } catch { return null; }
  });
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [view, setView] = useState('patients'); 
  const [showAdd, setShowAdd] = useState(false);

  const loadPatients = () => {
      if (user) api.getPatients().then(setPatients).catch(console.error);
  };

  useEffect(() => { loadPatients(); }, [user]);

  const handleLogin = (data) => {
    localStorage.setItem('fisio_token', data.token);
    localStorage.setItem('fisio_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
        await api.createPatient(data);
        setShowAdd(false); loadPatients(); alert('Criado!');
    } catch(err) { alert(err.message); }
  };

  if (!user) return <AuthScreen onLogin={handleLogin} />;
  
  if (selectedPatient) return <PatientDashboard patient={selectedPatient} user={user} onBack={() => setSelectedPatient(null)} onUpdateList={loadPatients} />;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20 app-container">
        <PrintStyles />
        <header className="bg-white border-b sticky top-0 z-10 px-4 py-3 shadow-sm flex justify-between items-center">
            <div className="flex items-center gap-2 text-teal-800 font-bold text-lg"><Activity/> FisioManager</div>
            <div className="flex bg-gray-100 p-1 rounded">
                <button onClick={()=>setView('patients')} className={`px-4 py-1 rounded text-sm font-bold ${view==='patients'?'bg-white shadow':''}`}>Pacientes</button>
                <button onClick={()=>setView('agenda')} className={`px-4 py-1 rounded text-sm font-bold ${view==='agenda'?'bg-white shadow':''}`}>Agenda</button>
            </div>
            <button onClick={()=>{localStorage.clear(); setUser(null);}} className="text-gray-500 hover:text-red-500"><LogOut size={20}/></button>
        </header>

        <main className="max-w-6xl mx-auto p-4 md:p-8">
            {view === 'patients' && (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold">Meus Pacientes</h2>
                        <Button onClick={()=>setShowAdd(true)}><Plus size={18}/> Novo</Button>
                    </div>
                    {patients.length === 0 ? <div className="text-center py-20 text-gray-400 border-2 border-dashed rounded">Lista Vazia</div> : (
                        <div className="grid gap-4 md:grid-cols-3">
                            {patients.map(p => {
                                const isArchived = (p.status||'').toLowerCase() === 'archived';
                                return (
                                    <div key={p.id} onClick={()=>setSelectedPatient(p)} className={`bg-white p-4 rounded-xl border shadow-sm cursor-pointer hover:shadow-md transition-all ${isArchived ? 'opacity-70 bg-gray-50 border-gray-200' : 'hover:border-teal-400'}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isArchived ? 'bg-gray-200 text-gray-500' : 'bg-teal-100 text-teal-700'}`}>{p.name.charAt(0)}</div>
                                                <div><h3 className="font-bold leading-tight">{p.name}</h3><p className="text-xs text-gray-500">{p.phone}</p></div>
                                            </div>
                                            {isArchived ? <span className="text-[10px] font-bold bg-gray-200 px-2 py-0.5 rounded text-gray-600">ALTA</span> : <ChevronRight size={16} className="text-gray-300"/>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {view === 'agenda' && <AgendaView patients={patients} firebaseUid={user.uid} />}
        </main>

        {showAdd && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white p-6 rounded-xl w-full max-w-sm">
                    <h3 className="text-xl font-bold mb-4">Novo Paciente</h3>
                    <form onSubmit={handleCreatePatient}>
                        <Input name="name" label="Nome" required />
                        <Input name="phone" label="Telefone" />
                        <Input name="cpf" label="CPF" />
                        <Input name="birthDate" label="Nascimento" type="date" />
                        <div className="flex justify-end gap-2 mt-4">
                            <Button type="button" variant="secondary" onClick={()=>setShowAdd(false)}>Cancelar</Button>
                            <Button type="submit">Salvar</Button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
}
