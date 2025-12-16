import os
import sys

# Nome da pasta raiz do projeto
ROOT_DIR = "fisio-manager-admin-manual"

def create_file(path, content):
    full_path = os.path.join(ROOT_DIR, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip())
    print(f"Arquivo atualizado/criado: {path}")

# --- 1. CONFIGURAÇÕES ESSENCIAIS (PACKAGE.JSON E .ENV) ---
SERVER_PACKAGE_JSON = """
{
  "name": "fisio-server-saas",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "pg": "^8.11.3",
    "dotenv": "^16.3.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
"""

SERVER_ENV = """
DB_USER=postgres
DB_HOST=localhost
DB_NAME=fisio_system
DB_PASSWORD=minhacasa1091@@
DB_PORT=5432
JWT_SECRET=R00td3v3l0p3r@#
PORT=3000
"""

# --- 2. SERVER INDEX COMPLETO (RESTAURADO) ---
SERVER_INDEX_JS = """
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Log detalhado
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// Middleware de Autenticação
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

// ROTA DE LOGIN
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: 'Usuário não encontrado' });

    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) return res.status(400).json({ error: 'Senha incorreta' });

    const token = jwt.sign({ id: user.id, name: user.name }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// --- ROTAS DE PACIENTES ---
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

// --- ROTAS DE PRONTUÁRIO ---
app.get('/api/patients/:id/assessment', authenticateToken, async (req, res) => {
  try {
    const checkOwner = await pool.query('SELECT id FROM patients WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (checkOwner.rows.length === 0) return res.sendStatus(403);
    const result = await pool.query('SELECT * FROM assessments WHERE patient_id = $1', [req.params.id]);
    res.json(result.rows[0] || null);
  } catch (err) { res.status(500).json(err); }
});

app.post('/api/patients/:id/assessment', authenticateToken, async (req, res) => {
  const { id } = req.params; const d = req.body;
  try {
    const checkOwner = await pool.query('SELECT id FROM patients WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (checkOwner.rows.length === 0) return res.sendStatus(403);
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

app.get('/api/patients/:id/evolutions', authenticateToken, async (req, res) => {
  try {
    const checkOwner = await pool.query('SELECT id FROM patients WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (checkOwner.rows.length === 0) return res.sendStatus(403);
    const result = await pool.query('SELECT * FROM evolutions WHERE patient_id = $1 ORDER BY date DESC', [req.params.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json(err); }
});

app.post('/api/patients/:id/evolutions', authenticateToken, async (req, res) => {
  const { subjective, objective, assessment, plan } = req.body;
  try {
    const checkOwner = await pool.query('SELECT id FROM patients WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (checkOwner.rows.length === 0) return res.sendStatus(403);
    await pool.query('INSERT INTO evolutions (patient_id, subjective, objective, assessment_notes, plan) VALUES ($1, $2, $3, $4, $5)', [req.params.id, subjective, objective, assessment, plan]);
    res.json({ success: true });
  } catch (err) { res.status(500).json(err); }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Servidor rodando...');
});
"""

# --- 3. SCRIPT ROBUSTO PARA CRIAR USUÁRIO ---
SERVER_CRIAR_USUARIO_JS = """
const fs = require('fs');
const path = require('path');

// 1. Diagnóstico de Ambiente
console.log("---------------------------------------");
if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
    console.error("❌ ERRO: Pasta 'node_modules' não encontrada.");
    console.error("   SOLUÇÃO: Execute 'npm install' nesta pasta antes de continuar.");
    process.exit(1);
}
require('dotenv').config();

if (!process.env.DB_PASSWORD) {
    console.error("❌ ERRO: Senha do banco não encontrada no arquivo .env");
    process.exit(1);
}

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const name = process.argv[2];
const email = process.argv[3];
const password = process.argv[4];

if (!name || !email || !password) {
  console.log("❌ ERRO: Faltam argumentos!");
  console.log("   Uso: node criar_usuario.js \"Nome\" \"email\" \"senha\"");
  process.exit(1);
}

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function run() {
  try {
    console.log(`🔒 Criando usuário para: ${email}`);
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const res = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [name, email, hash]
    );
    console.log(`✅ SUCESSO! Usuário criado com ID: ${res.rows[0].id}`);
  } catch (err) {
    console.error("❌ ERRO NO BANCO:", err.message);
  } finally {
    pool.end();
  }
}
run();
"""

# --- 4. SCRIPT PARA RESETAR SENHA ---
SERVER_RESETAR_SENHA_JS = """
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const email = process.argv[2];
const novaSenha = process.argv[3];

if (!email || !novaSenha) {
    console.log("❌ USO: node resetar_senha.js \"email\" \"nova_senha\"");
    process.exit(1);
}

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function run() {
    try {
        console.log(`🔍 Buscando usuário '${email}'...`);
        const check = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (check.rows.length === 0) {
            console.log("❌ ERRO: Usuário não encontrado.");
            process.exit(1);
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(novaSenha, salt);
        await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, email]);

        console.log("✅ SUCESSO! Senha atualizada.");
    } catch (err) {
        console.error("❌ ERRO:", err.message);
    } finally {
        pool.end();
    }
}
run();
"""

# Atualizar arquivos
print("Restaurando servidor completo e corrigindo scripts...")
create_file("server/package.json", SERVER_PACKAGE_JSON)
create_file("server/.env", SERVER_ENV)
create_file("server/index.js", SERVER_INDEX_JS)
create_file("server/criar_usuario.js", SERVER_CRIAR_USUARIO_JS)
create_file("server/resetar_senha.js", SERVER_RESETAR_SENHA_JS)
print("Concluído. Execute 'npm install' na pasta server e tente novamente.")import os
import sys

# Nome da pasta raiz do projeto
ROOT_DIR = "fisio-manager-admin-manual"

def create_file(path, content):
    full_path = os.path.join(ROOT_DIR, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip())
    print(f"Arquivo atualizado/criado: {path}")

# --- 1. CONFIGURAÇÕES ESSENCIAIS (PACKAGE.JSON E .ENV) ---
SERVER_PACKAGE_JSON = """
{
  "name": "fisio-server-saas",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "pg": "^8.11.3",
    "dotenv": "^16.3.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
"""

SERVER_ENV = """
DB_USER=postgres
DB_HOST=localhost
DB_NAME=fisio_system
DB_PASSWORD=minhacasa1091@@
DB_PORT=5432
JWT_SECRET=R00td3v3l0p3r@#
PORT=3000
"""

# --- 2. SERVER INDEX COMPLETO (RESTAURADO) ---
SERVER_INDEX_JS = """
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Log detalhado
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// Middleware de Autenticação
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

// ROTA DE LOGIN
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: 'Usuário não encontrado' });

    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) return res.status(400).json({ error: 'Senha incorreta' });

    const token = jwt.sign({ id: user.id, name: user.name }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// --- ROTAS DE PACIENTES ---
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

// --- ROTAS DE PRONTUÁRIO ---
app.get('/api/patients/:id/assessment', authenticateToken, async (req, res) => {
  try {
    const checkOwner = await pool.query('SELECT id FROM patients WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (checkOwner.rows.length === 0) return res.sendStatus(403);
    const result = await pool.query('SELECT * FROM assessments WHERE patient_id = $1', [req.params.id]);
    res.json(result.rows[0] || null);
  } catch (err) { res.status(500).json(err); }
});

app.post('/api/patients/:id/assessment', authenticateToken, async (req, res) => {
  const { id } = req.params; const d = req.body;
  try {
    const checkOwner = await pool.query('SELECT id FROM patients WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (checkOwner.rows.length === 0) return res.sendStatus(403);
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

app.get('/api/patients/:id/evolutions', authenticateToken, async (req, res) => {
  try {
    const checkOwner = await pool.query('SELECT id FROM patients WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (checkOwner.rows.length === 0) return res.sendStatus(403);
    const result = await pool.query('SELECT * FROM evolutions WHERE patient_id = $1 ORDER BY date DESC', [req.params.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json(err); }
});

app.post('/api/patients/:id/evolutions', authenticateToken, async (req, res) => {
  const { subjective, objective, assessment, plan } = req.body;
  try {
    const checkOwner = await pool.query('SELECT id FROM patients WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (checkOwner.rows.length === 0) return res.sendStatus(403);
    await pool.query('INSERT INTO evolutions (patient_id, subjective, objective, assessment_notes, plan) VALUES ($1, $2, $3, $4, $5)', [req.params.id, subjective, objective, assessment, plan]);
    res.json({ success: true });
  } catch (err) { res.status(500).json(err); }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Servidor rodando...');
});
"""

# --- 3. SCRIPT ROBUSTO PARA CRIAR USUÁRIO ---
SERVER_CRIAR_USUARIO_JS = """
const fs = require('fs');
const path = require('path');

// 1. Diagnóstico de Ambiente
console.log("---------------------------------------");
if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
    console.error("❌ ERRO: Pasta 'node_modules' não encontrada.");
    console.error("   SOLUÇÃO: Execute 'npm install' nesta pasta antes de continuar.");
    process.exit(1);
}
require('dotenv').config();

if (!process.env.DB_PASSWORD) {
    console.error("❌ ERRO: Senha do banco não encontrada no arquivo .env");
    process.exit(1);
}

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const name = process.argv[2];
const email = process.argv[3];
const password = process.argv[4];

if (!name || !email || !password) {
  console.log("❌ ERRO: Faltam argumentos!");
  console.log("   Uso: node criar_usuario.js \"Nome\" \"email\" \"senha\"");
  process.exit(1);
}

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function run() {
  try {
    console.log(`🔒 Criando usuário para: ${email}`);
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const res = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [name, email, hash]
    );
    console.log(`✅ SUCESSO! Usuário criado com ID: ${res.rows[0].id}`);
  } catch (err) {
    console.error("❌ ERRO NO BANCO:", err.message);
  } finally {
    pool.end();
  }
}
run();
"""

# --- 4. SCRIPT PARA RESETAR SENHA ---
SERVER_RESETAR_SENHA_JS = """
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const email = process.argv[2];
const novaSenha = process.argv[3];

if (!email || !novaSenha) {
    console.log("❌ USO: node resetar_senha.js \"email\" \"nova_senha\"");
    process.exit(1);
}

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function run() {
    try {
        console.log(`🔍 Buscando usuário '${email}'...`);
        const check = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (check.rows.length === 0) {
            console.log("❌ ERRO: Usuário não encontrado.");
            process.exit(1);
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(novaSenha, salt);
        await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, email]);

        console.log("✅ SUCESSO! Senha atualizada.");
    } catch (err) {
        console.error("❌ ERRO:", err.message);
    } finally {
        pool.end();
    }
}
run();
"""

# Atualizar arquivos
print("Restaurando servidor completo e corrigindo scripts...")
create_file("server/package.json", SERVER_PACKAGE_JSON)
create_file("server/.env", SERVER_ENV)
create_file("server/index.js", SERVER_INDEX_JS)
create_file("server/criar_usuario.js", SERVER_CRIAR_USUARIO_JS)
create_file("server/resetar_senha.js", SERVER_RESETAR_SENHA_JS)

