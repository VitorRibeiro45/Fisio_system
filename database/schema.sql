-- Tabela de Usuários (Fisioterapeutas)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Pacientes (Vinculada ao Usuário)
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    birth_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Avaliações
CREATE TABLE IF NOT EXISTS assessments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    complaint TEXT,
    hda TEXT,
    hpp TEXT,
    pain_level INTEGER,
    vitals VARCHAR(100),
    inspection TEXT,
    rom TEXT,
    diagnosis VARCHAR(255),
    goals TEXT,
    plan TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Evoluções
CREATE TABLE IF NOT EXISTS evolutions (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subjective TEXT,
    objective TEXT,
    assessment_notes TEXT,
    plan TEXT
);