// SCRIPT PARA CRIAR USUÁRIOS CORRETAMENTE (COM HASH)
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const nome = process.argv[2];
const email = process.argv[3];
const senha = process.argv[4];

if (!nome || !email || !senha) {
    console.log('❌ USO: node criar_admin.js "Nome" "email" "senha"');
    process.exit(1);
}

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function criar() {
    try {
        console.log(`🔒 Gerando hash para '${email}'...`);
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(senha, salt);

        console.log("💾 Inserindo no banco...");
        // Tenta inserir, se der erro de duplicado, avisa
        try {
            const res = await pool.query(
                'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
                [nome, email, hash]
            );
            console.log(`✅ SUCESSO! Usuário criado com ID: ${res.rows[0].id}`);
            console.log(`👉 Agora você pode logar com a senha: ${senha}`);
        } catch (dbErr) {
            if (dbErr.code === '23505') { // Código de chave duplicada (email)
                console.log("⚠️  AVISO: Este email já existe. Atualizando a senha...");
                await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, email]);
                console.log("✅ Senha do usuário existente foi atualizada!");
            } else {
                throw dbErr;
            }
        }

    } catch (err) {
        console.error("❌ ERRO:", err.message);
    } finally {
        pool.end();
    }
}

criar();
