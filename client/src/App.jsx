import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Calendar, Activity, Plus, Search, ChevronRight, Save, 
  Clock, CheckCircle, X, ArrowLeft, Printer, FileText, ClipboardList,
  LogOut, Lock, Mail, User, AlertCircle, ChevronLeft, Loader2, UserCheck, UserX
} from 'lucide-react';

// =================================================================
// ⚠️ CONFIGURAÇÃO DO SERVIDOR
// =================================================================
const API_URL = 'http://65.21.48.34:3000'; 

// =================================================================
// 🔌 CAMADA DE DADOS (API REST - REESCRITA E ROBUSTA)
// =================================================================
const api = {
  // Função central para padronizar TODAS as requisições
  request: async (endpoint, method = 'GET', body = null) => {
    const token = localStorage.getItem('fisio_token');
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = { method, headers };

    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      // Log para você ver no console (F12) o que está sendo enviado
      console.log(`📡 [${method}] ${endpoint}`, body || ''); 

      const response = await fetch(`${API_URL}${endpoint}`, config);

      // Se o token expirou
      if (response.status === 401 || response.status === 403) {
        localStorage.clear();
        window.location.reload();
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const data = await response.json();

      if (!response.ok) {
        // Lança o erro exato que veio do servidor Postgres
        throw new Error(data.error || data.message || `Erro ${response.status}`);
      }

      return data;

    } catch (error) {
      console.error("❌ Erro API:", error);
      throw error;
    }
  },

  // --- AUTENTICAÇÃO ---
  login: (identifier, password) => {
    const payload = { password, identifier };
    if (identifier.includes('@')) payload.email = identifier;
    else payload.username = identifier;
    return api.request('/auth/login', 'POST', payload);
  },

  // --- PACIENTES ---
  getPatients: () => api.request('/api/patients'),

  createPatient: (data) => api.request('/api/patients', 'POST', data),

  // Correção do Status: Envia apenas o campo status
  updatePatientStatus: (id, status) => api.request(`/api/patients/${id}`, 'PUT', { status }),

  // --- AVALIAÇÃO ---
  getAssessment: (pid) => api.request(`/api/patients/${pid}/assessment`),
  
  saveAssessment: (pid, data) => {
    // Converte painLevel para número se existir
    if (data.painLevel) data.painLevel = parseInt(data.painLevel);
    return api.request(`/api/patients/${pid}/assessment`, 'POST', data);
  },

  // --- EVOLUÇÃO ---
  getEvolutions: (pid) => api.request(`/api/patients/${pid}/evolutions`),
  
  createEvolution: (pid, data) => api.request(`/api/patients/${pid}/evolutions`, 'POST', data),

  // --- AGENDA ---
  getAppointmentsRange: (start, end) => api.request(`/api/appointments?startDate=${start}&endDate=${end}`),
  
  createAppointment: (data) => api.request('/api/appointments', 'POST', data),
  
  deleteAppointment: (id) => api.request(`/api/appointments/${id}`, 'DELETE'),
};

// =================================================================
// 🎨 ÍCONES LOCAIS
// =================================================================
const LocalIcons = {
  Repeat: ({ size = 24, className = "" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>,
};

// =================================================================
// 🖨️ ESTILOS
// =================================================================
const PrintStyles = () => (
  <style>{`
    @media print {
      @page { margin: 0; size: A4; }
      body { background: white; -webkit-print-color-adjust: exact; }
      .no-print, header, .auth-screen, button, .app-container { display: none !important; }
      .print-preview-container { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: white; z-index: 99999; display: block !important; }
      .print-content { box-shadow: none; margin: 0; width: 100%; max-width: none; padding: 20mm; }
    }
  `}</style>
);

// =================================================================
// 🧩 COMPONENTES UI
// =================================================================
const Button = ({ children, onClick, variant = 'primary', className = '', disabled, ...props }) => {
  const variants = {
    primary: "bg-teal-700 text-white hover:bg-teal-800",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
    ghost: "text-teal-700 hover:bg-teal-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
  };
  return <button onClick={onClick} disabled={disabled} className={`px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} {...props}>{children}</button>;
};

const Input = ({ label, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>}
    <input className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" {...props} />
  </div>
);

const TextArea = ({ label, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>}
    <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 min-h-[100px]" {...props} />
  </div>
);

const Card = ({ children, className='', onClick }) => <div onClick={onClick} className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>{children}</div>;

// =================================================================
// 📄 DASHBOARD DO PACIENTE
// =================================================================
const PatientDashboard = ({ patient, user, onBack, onUpdateList }) => {
  const [localPatient, setLocalPatient] = useState(patient);
  const [view, setView] = useState('menu');
  const [assessment, setAssessment] = useState(null);
  const [evolutions, setEvolutions] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const isArchived = (localPatient.status || '').toLowerCase() === 'archived';

  // Carrega dados iniciais
  useEffect(() => {
    if(localPatient.id) {
        api.getAssessment(localPatient.id).then(setAssessment).catch(() => {});
        api.getEvolutions(localPatient.id).then(setEvolutions).catch(() => {});
    }
  }, [localPatient.id]);

  // --- CORREÇÃO: ALTERAR STATUS ---
  const handleToggleStatus = async () => {
    const newStatus = isArchived ? 'active' : 'archived';
    
    if(!window.confirm(`Deseja alterar o status para: ${newStatus === 'active' ? 'ATIVO' : 'ALTA'}?`)) return;

    setStatusLoading(true);
    try {
        await api.updatePatientStatus(localPatient.id, newStatus);
        
        // Atualiza Localmente
        const updated = { ...localPatient, status: newStatus };
        setLocalPatient(updated);
        
        // Atualiza a lista principal (App)
        if(onUpdateList) onUpdateList();
        
        alert("Status atualizado com sucesso!");
    } catch(err) {
        alert("Erro ao alterar status:\n" + err.message);
    } finally {
        setStatusLoading(false);
    }
  };

  // --- CORREÇÃO: SALVAR AVALIAÇÃO ---
  const handleSaveAssessment = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
        await api.saveAssessment(localPatient.id, data);
        setAssessment(data); 
        setView('menu'); 
        alert('Ficha salva!');
    } catch(err) {
        alert("Erro ao salvar ficha:\n" + err.message);
    }
  };

  // --- CORREÇÃO: SALVAR EVOLUÇÃO ---
  const handleSaveEvolution = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    data.date = new Date().toISOString(); // Garante data ISO para o banco
    try {
        const saved = await api.createEvolution(localPatient.id, data);
        setEvolutions([saved || data, ...evolutions]); 
        setView('menu'); 
        alert('Evolução salva!');
    } catch(err) {
        alert("Erro ao salvar evolução:\n" + err.message);
    }
  };

  // --- PREVIEW PDF ---
  if (previewData) return (
    <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto flex justify-center p-8 print-preview-container">
      <div className="w-full max-w-[210mm] min-h-[297mm] bg-white p-[20mm] shadow-2xl relative print-content">
        <div className="flex justify-between items-center mb-8 border-b-2 border-teal-800 pb-4">
            <div><h1 className="text-2xl font-bold uppercase">FisioManager</h1><p className="text-sm text-gray-500 uppercase">Prontuário</p></div>
            <div className="no-print"><Button onClick={() => setPreviewData(null)} variant="secondary">Fechar</Button></div>
        </div>
        <div className="bg-gray-50 p-4 border mb-8 text-sm grid grid-cols-2 gap-4">
           <div><strong>PACIENTE:</strong> {localPatient.name}</div>
           <div><strong>CPF:</strong> {localPatient.cpf}</div>
           <div><strong>TELEFONE:</strong> {localPatient.phone}</div>
           <div><strong>STATUS:</strong> {isArchived ? 'ALTA' : 'ATIVO'}</div>
        </div>
        {previewData.type === 'assessment' && (
           <div className="space-y-4 text-sm">
             <div className="bg-teal-700 text-white p-1 font-bold text-center uppercase">Avaliação</div>
             <p><strong>QP:</strong> {previewData.data.complaint}</p>
             <p><strong>HDA:</strong> {previewData.data.hda}</p>
             <div className="grid grid-cols-2 gap-4 border p-2"><div><strong>Dor:</strong> {previewData.data.painLevel}</div><div><strong>Sinais:</strong> {previewData.data.vitals}</div></div>
             <p><strong>Diagnóstico:</strong> {previewData.data.diagnosis}</p>
             <p><strong>Plano:</strong> {previewData.data.plan}</p>
           </div>
        )}
        {previewData.type === 'evolutions' && (
           <div className="space-y-4 text-sm">
             <div className="bg-teal-700 text-white p-1 font-bold text-center uppercase">Evoluções</div>
             <table className="w-full border"><thead><tr className="bg-gray-100"><th className="border p-2">Data</th><th className="border p-2">Descrição</th></tr></thead>
               <tbody>{previewData.data.map((ev, i) => (<tr key={i}><td className="border p-2">{new Date(ev.date).toLocaleDateString()}</td><td className="border p-2"><strong>S:</strong> {ev.subjective}<br/><strong>A:</strong> {ev.assessment}</td></tr>))}</tbody>
             </table>
           </div>
        )}
      </div>
    </div>
  );

  // --- FORMULÁRIOS ---
  if (view === 'form_assessment') return (
    <div className="max-w-3xl mx-auto p-4 animate-in fade-in">
        <div className="flex gap-4 mb-4"><Button variant="secondary" onClick={()=>setView('menu')}><ArrowLeft size={16}/> Voltar</Button><h2 className="text-xl font-bold">Avaliação</h2></div>
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
                    <div className="flex gap-4 flex-wrap">
                        {['Livre','Bengala','Andador','Cadeira'].map(o => (
                            <label key={o} className="flex gap-1 items-center cursor-pointer">
                                <input type="radio" name="ambulation" value={o} defaultChecked={assessment?.ambulation===o}/> {o}
                            </label>
                        ))}
                    </div>
                </div>

                <TextArea name="plan" label="Plano de Tratamento" defaultValue={assessment?.plan} required />
                <Button type="submit">Salvar Ficha</Button>
            </form>
        </Card>
    </div>
  );

  if (view === 'form_evolution') return (
    <div className="max-w-3xl mx-auto p-4 animate-in fade-in">
        <div className="flex gap-4 mb-4"><Button variant="secondary" onClick={()=>setView('menu')}><ArrowLeft size={16}/> Voltar</Button><h2 className="text-xl font-bold">Evolução</h2></div>
        <Card className="p-6">
            <form onSubmit={handleSaveEvolution}>
                <TextArea name="subjective" label="Subjetivo" required />
                <TextArea name="objective" label="Objetivo" />
                <TextArea name="assessment" label="Avaliação" required />
                <TextArea name="plan" label="Plano" />
                <Button type="submit">Salvar Sessão</Button>
            </form>
        </Card>
    </div>
  );

  return (
    <div className={`min-h-screen p-4 md:p-8 ${isArchived ? 'bg-red-50' : 'bg-gray-50'}`}>
        <div className={`flex justify-between items-center mb-8 p-6 rounded-xl border shadow-sm bg-white ${isArchived ? 'border-red-200' : 'border-gray-200'}`}>
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={onBack}><ArrowLeft/></Button>
                <div>
                    <h1 className={`text-3xl font-bold ${isArchived ? 'text-red-800' : 'text-gray-900'}`}>{localPatient.name}</h1>
                    <p className="text-gray-500">{localPatient.phone} • {localPatient.cpf}</p>
                </div>
            </div>
            <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${isArchived ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {isArchived ? 'Alta / Inativo' : 'Ativo'}
                </span>
                <div className="mt-2">
                    <Button variant={isArchived ? 'primary' : 'danger'} onClick={handleToggleStatus} disabled={statusLoading} className="text-xs h-8">
                        {statusLoading ? <Loader2 className="animate-spin" size={14}/> : (isArchived ? 'Reativar' : 'Dar Alta')}
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
// 📄 AGENDA
// =================================================================
const AgendaView = ({ patients }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getAppointmentsRange(date, date)
       .then(data => setAppointments(data || []))
       .catch(() => setAppointments([]))
       .finally(() => setLoading(false));
  }, [date]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const pat = patients.find(p => String(p.id) === String(data.patientId));
    
    // Garante que o nome vai junto para exibição
    const payload = { 
        ...data, 
        date, 
        patientName: pat ? pat.name : 'Desconhecido' 
    };

    try {
        await api.createAppointment(payload);
        const refresh = await api.getAppointmentsRange(date, date);
        setAppointments(refresh || []); 
        e.target.reset();
        alert("Agendado!");
    } catch(err) {
        alert("Erro ao agendar:\n" + err.message);
    }
  };

  const handleDel = async (id) => {
    if(confirm('Excluir?')) {
        try {
            await api.deleteAppointment(id);
            setAppointments(prev => prev.filter(a => a.id !== id));
        } catch(err) {
            alert("Erro ao excluir:\n" + err.message);
        }
    }
  };

  return (
    <div className="animate-in fade-in">
        <div className="flex justify-between items-center mb-6">
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="border p-2 rounded bg-white font-bold"/>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
                {loading ? <p className="text-center">Carregando...</p> : appointments.map(app => (
                    <div key={app.id} className="bg-white p-3 rounded border flex justify-between items-center shadow-sm">
                        <div>
                            <span className="font-bold text-teal-700 mr-3">{app.time}</span>
                            <span className="font-medium">{app.patientName}</span>
                            <span className="text-xs text-gray-500 ml-2">({app.type})</span>
                        </div>
                        <button onClick={()=>handleDel(app.id)} className="text-red-400 hover:text-red-600"><X size={16}/></button>
                    </div>
                ))}
                {!loading && appointments.length === 0 && <p className="text-gray-400 text-center py-4">Sem agendamentos.</p>}
            </div>
            <div className="bg-white p-6 rounded-xl border h-fit">
                <h3 className="font-bold mb-4">Novo Agendamento</h3>
                <form onSubmit={handleAdd}>
                    <select name="patientId" className="w-full border p-2 rounded mb-3 bg-white" required>
                        <option value="">Selecione Paciente</option>
                        {patients.filter(p => (p.status||'').toLowerCase() !== 'archived').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="flex gap-2 mb-3">
                        <input name="time" type="time" className="border p-2 rounded w-full" required />
                        <select name="type" className="border p-2 rounded w-full bg-white">
                            <option>Sessão</option><option>Avaliação</option>
                        </select>
                    </div>
                    <Button type="submit" className="w-full">Agendar</Button>
                </form>
            </div>
        </div>
    </div>
  );
};

// =================================================================
// 📄 APP PRINCIPAL
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
            <Input label="Usuário ou Email" value={identifier} onChange={e=>setIdentifier(e.target.value)} />
            <Input label="Senha" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
            <Button type="submit" className="w-full mt-4" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</Button>
        </form>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(() => {
      try {
          const u = localStorage.getItem('fisio_user');
          return u ? JSON.parse(u) : null;
      } catch { return null; }
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

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
        await api.createPatient(data);
        setShowAdd(false); loadPatients(); alert('Paciente criado!');
    } catch(err) { alert("Erro: " + err.message); }
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
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-500"><LogOut size={20}/></button>
        </header>

        <main className="max-w-5xl mx-auto p-4 md:p-8">
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

            {view === 'agenda' && <AgendaView patients={patients} />}
        </main>

        {showAdd && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white p-6 rounded-xl w-full max-w-sm animate-in zoom-in-95">
                    <h3 className="text-xl font-bold mb-4">Novo Paciente</h3>
                    <form onSubmit={handleAddPatient}>
                        <Input name="name" label="Nome" required autoFocus />
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
