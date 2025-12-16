const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.log("---------------------------------------------------------");
  console.log("ERRO: Você precisa fornecer a senha.");
  console.log("Uso: node gerar_senha.js \"sua_senha_aqui\"");
  console.log("---------------------------------------------------------");
  process.exit(1);
}

bcrypt.genSalt(10, (err, salt) => {
  bcrypt.hash(password, salt, (err, hash) => {
    console.log("---------------------------------------------------------");
    console.log("Senha Original: " + password);
    console.log("HASH PARA O BANCO DE DADOS (Copie o código abaixo):");
    console.log(hash);
    console.log("---------------------------------------------------------");
    console.log("Exemplo de SQL:");
    console.log(`INSERT INTO users (name, email, password_hash) VALUES ('Dr. Nome', 'email@teste.com', '${hash}');`);
    console.log("---------------------------------------------------------");
  });
});