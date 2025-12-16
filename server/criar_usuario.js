require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Pega argumentos da linha de comando
const name = process.argv[2];
const email = process.argv[3];
const password = process.argv[4];

console.log("---------------------------------------");
console.log("🔧 Diagnóstico de Configuração:");
console.log(`   Host: ${process.env.DB_HOST || 'NÃO DEFINIDO'}`);
console.log(`   User: ${process.env.DB_USER || 'NÃO DEFINIDO'}`);
console.log(`   DB:   ${process.env.DB_NAME || 'NÃO DEFINIDO'}`);

if (!process.env.DB_PASSWORD) {
    console.error("❌ ERRO: A variável DB_PASSWORD não foi encontrada.");
    console.error("   Certifique-se de que o arquivo .env existe nesta pasta e tem a senha.");
    process.exit(1);
} else if (process.env.DB_PASSWORD === 'sua_senha_aqui') {
    console.error("❌ ERRO: Você ainda não configurou a senha no arquivo .env!");
    console.error("   Edite o arquivo 'server/.env' e troque 'sua_senha_aqui' pela senha real do banco.");
    process.exit(1);
} else {
    console.log("   Senha: CONFIGURADA (OK)");
}
console.log("---------------------------------------");

if (!name || !email || !password) {
  console.log("❌ USO INCORRETO!");
  console.log("Use: node criar_usuario.js "Nome" "email@teste.com" "senha123"");
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
    // 1. Gera o Hash
    console.log("🔒 Gerando criptografia da senha...");
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // 2. Insere no Banco
    console.log("💾 Tentando conectar e salvar no banco de dados...");
    const res = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hash]
    );

    console.log("✅ USUÁRIO CRIADO COM SUCESSO!");
    console.log("--------------------------------");
    console.log(`ID:    ${res.rows[0].id}`);
    console.log(`Nome:  ${res.rows[0].name}`);
    console.log(`Email: ${res.rows[0].email}`);
    console.log("--------------------------------");
    console.log("Agora você pode fazer login no sistema.");

  } catch (err) {
    console.error("❌ ERRO AO CONECTAR OU CRIAR USUÁRIO:");
    if (err.code === '23505') {
      console.error("   ERRO: Este email já está cadastrado!");
    } else if (err.code === '28P01') {
      console.error("   ERRO: Senha do banco de dados incorreta (Autenticação falhou).");
    } else if (err.code === 'ECONNREFUSED') {
      console.error("   ERRO: Não foi possível conectar ao servidor PostgreSQL (Porta fechada ou serviço parado).");
    } else {
      console.error(err);
    }
  } finally {
    pool.end();
  }
}

run();