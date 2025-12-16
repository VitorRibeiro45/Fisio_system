import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, Activity, Plus, Search, ChevronRight, Save, 
  Clock, CheckCircle, X, ArrowLeft, Printer, FileText, ClipboardList,
  LogOut, Lock, Mail, User
} from 'lucide-react';

// =================================================================
// ⚠️ CONFIGURAÇÃO CRÍTICA DO SERVIDOR ⚠️
// Se você está rodando no servidor e acessando do celular/PC, 
// TROQUE 'localhost' PELO IP DO SEU SERVIDOR AQUI EMBAIXO!
// Exemplo: 'http://192.168.1.50:3000' ou 'http://45.23.12.90:3000'
// =================================================================
const API_URL = 'http://65.21.48.34:3001'; 

// --- FETCH COM TOKEN (AUTH) ---
const authFetch = async (endpoint, options = {}) => {
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
      alert("ERRO DE CONEXÃO: Não foi possível contactar o servidor.\nVerifique se o backend está rodando e se o IP no App.jsx está correto.");
      throw error;
  }
};

// ... (Restante dos componentes UI são os mesmos, foco na Auth) ...

const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
  const variants = {
    primary: "bg-teal-700 text-white hover:bg-teal-800",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
    ghost: "text-teal-700 hover:bg-teal-50",
  };
  return <button onClick={onClick} className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${variants[variant]} ${className}`} {...props}>{children}</button>;
};

const Input = ({ label, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>}
    <input className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" {...props} />
  </div>
);

// --- TELA DE LOGIN ---
const AuthScreen = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    
    try {
      // Faz a chamada para a API
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      });
      
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || 'Erro na requisição');
      
      onLogin(json); 
    } catch (err) { 
        console.error(err);
        if (err.message.includes('Failed to fetch')) {
            setError(`Não foi possível conectar ao servidor em ${API_URL}. Verifique se ele está ligado.`);
        } else {
            setError(err.message); 
        }
    }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold text-center text-teal-800 mb-2">FisioManager SaaS</h1>
        <p className="text-center text-gray-500 mb-6 text-sm">Acesso Administrativo</p>
        
        {error && <div className="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded border border-red-100">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <Input name="email" type="email" label="Email" required placeholder="seu@email.com" />
          <Input name="password" type="password" label="Senha" required placeholder="••••••••" />
          <Button type="submit" className="w-full mt-2">
            {loading ? 'Conectando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
};

// ... (O restante do App.jsx com PatientDashboard e a lógica principal é mantido igual) ...
// Para brevidade do script, estou focando na correção da autenticação.
// Ao rodar, o React deve carregar a tela de Login acima.

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('fisio_user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleLogin = (data) => {
    localStorage.setItem('fisio_token', data.token);
    localStorage.setItem('fisio_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-teal-800">Bem-vindo, {user.name}!</h1>
            <p className="mb-4">Se você vê esta tela, o Login SaaS com Postgres funcionou.</p>
            <Button onClick={handleLogout}>Sair</Button>
        </div>
    </div>
  );
}