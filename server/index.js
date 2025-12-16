require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors()); // Permite conexões de qualquer lugar (Frontend)
app.use(express.json());

// Configuração do Banco
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Log de Diagnóstico no Boot
console.log("------------------------------------------------");
console.log("🚀 INICIANDO SERVIDOR SAAS (FISIO MANAGER)");
console.log(`   Banco: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
console.log("------------------------------------------------");

// Teste de conexão imediato
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error("❌ ERRO FATAL: Não foi possível conectar ao PostgreSQL!");
    console.error(`   Detalhe: ${err.message}`);
    if (err.code === '28P01') console.error("   Dica: A senha do banco está errada no arquivo .env");
    if (err.code === 'ECONNREFUSED') console.error("   Dica: O PostgreSQL não está rodando ou a porta está bloqueada.");
  } else {
    console.log("✅ CONEXÃO COM O BANCO BEM SUCEDIDA!");
  }
});

// Middleware para ver quem está chamando
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// --- ROTA DE LOGIN (COM LOGS DE DEBUG) ---
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`🔐 TENTATIVA DE LOGIN: ${email}`);

  try {
    // 1. Busca usuário
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      console.log(`❌ FALHA: Usuário '${email}' não existe no banco.`);
      return res.status(400).json({ error: 'Email não encontrado' });
    }

    const user = result.rows[0];
    
    // 2. Verifica se a senha no banco é um Hash válido
    if (!user.password_hash || !user.password_hash.startsWith('$2')) {
      console.log(`❌ ERRO CRÍTICO: A senha no banco para '${email}' NÃO ESTÁ CRIPTOGRAFADA.`);
      console.log(`   Valor encontrado: ${user.password_hash}`);
      console.log(`   SOLUÇÃO: Use o script 'node criar_admin.js' para recriar este usuário.`);
      return res.status(500).json({ error: 'Erro de integridade de dados (Senha inválida)' });
    }

    // 3. Compara senha
    const validPass = await bcrypt.compare(password, user.password_hash);
    
    if (!validPass) {
      console.log(`❌ FALHA: Senha incorreta para '${email}'.`);
      return res.status(400).json({ error: 'Senha incorreta' });
    }

    // 4. Sucesso
    console.log(`✅ SUCESSO: Usuário '${user.name}' autenticado.`);
    const token = jwt.sign({ id: user.id, name: user.name }, process.env.JWT_SECRET);
    
    res.json({ 
      token, 
      user: { id: user.id, name: user.name, email: user.email } 
    });

  } catch (err) {
    console.error("❌ ERRO NO SERVIDOR:", err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// --- MIDDLEWARE DE PROTEÇÃO (JWT) ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// --- ROTAS DO SISTEMA (ISOLAMENTO DE DADOS) ---

// 1. Pacientes
app.get('/api/patients', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM patients WHERE user_id = $1 ORDER BY name ASC', [req.user.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json(err); }
});

app.post('/api/patients', authenticateToken, async (req, res) => {
  const { name, phone, birthDate } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO patients (name, phone, birth_date, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, phone, birthDate, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json(err); }
});

// 2. Avaliações
app.get('/api/patients/:id/assessment', authenticateToken, async (req, res) => {
  try {
    // Garante que o paciente é meu
    const check = await pool.query('SELECT id FROM patients WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (check.rows.length === 0) return res.sendStatus(403);
    
    const result = await pool.query('SELECT * FROM assessments WHERE patient_id = $1', [req.params.id]);
    res.json(result.rows[0] || null);
  } catch (err) { res.status(500).json(err); }
});

app.post('/api/patients/:id/assessment', authenticateToken, async (req, res) => {
  const { id } = req.params; const d = req.body;
  try {
    const check = await pool.query('SELECT id FROM patients WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (check.rows.length === 0) return res.sendStatus(403);

    const exists = await pool.query('SELECT 1 FROM assessments WHERE patient_id = $1', [id]);
    if (exists.rows.length > 0) {
        await pool.query(
            `UPDATE assessments SET complaint=$1, hda=$2, hpp=$3, pain_level=$4, vitals=$5, inspection=$6, rom=$7, diagnosis=$8, goals=$9, plan=$10, updated_at=NOW() WHERE patient_id=$11`,
            [d.complaint, d.hda, d.hpp, d.painLevel, d.vitals, d.inspection, d.rom, d.diagnosis, d.goals, d.plan, id]
        );
    } else {
        await pool.query(
            `INSERT INTO assessments (patient_id, complaint, hda, hpp, pain_level, vitals, inspection, rom, diagnosis, goals, plan) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [id, d.complaint, d.hda, d.hpp, d.painLevel, d.vitals, d.inspection, d.rom, d.diagnosis, d.goals, d.plan]
        );
    }
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json(err); }
});

// 3. Evoluções
app.get('/api/patients/:id/evolutions', authenticateToken, async (req, res) => {
  try {
    const check = await pool.query('SELECT id FROM patients WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (check.rows.length === 0) return res.sendStatus(403);
    const result = await pool.query('SELECT * FROM evolutions WHERE patient_id = $1 ORDER BY date DESC', [req.params.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json(err); }
});

app.post('/api/patients/:id/evolutions', authenticateToken, async (req, res) => {
  const { subjective, objective, assessment, plan } = req.body;
  try {
    const check = await pool.query('SELECT id FROM patients WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (check.rows.length === 0) return res.sendStatus(403);
    await pool.query('INSERT INTO evolutions (patient_id, subjective, objective, assessment_notes, plan) VALUES ($1, $2, $3, $4, $5)', [req.params.id, subjective, objective, assessment, plan]);
    res.json({ success: true });
  } catch (err) { res.status(500).json(err); }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`🔥 Servidor rodando na porta ${process.env.PORT || 3000}`);
});
