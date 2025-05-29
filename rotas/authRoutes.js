const express = require('express');
const router = express.Router();
const connection = require('../db/connection');
const path = require('path');

// Página inicial pública (landing)
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Formulários
router.get('/login', (req, res) => {
  res.render('auth/login'); // views/auth/login.ejs
});

router.get('/register', (req, res) => {
  res.render('auth/register'); // views/auth/register.ejs
});

// Processa login
router.post('/login', (req, res) => {
  const { email, senha } = req.body;
  const query = 'SELECT * FROM usuarios WHERE email = ?';

  connection.query(query, [email], (err, results) => {
    if (err) {
      console.error('Erro ao buscar usuário:', err);
      return res.send('Erro no banco de dados.');
    }

    if (results.length > 0) {
      const user = results[0];

      if (senha === user.senha) {
        // Armazena dados da sessão
        req.session.user = {
          id: user.id,
          nome: user.nome,
          email: user.email,
          tipo: user.tipo
        };

        // Redirecionamento por tipo
        if (user.tipo === 'admin') {
          res.redirect('/admin');
        } else {
          res.redirect('/user/dashboard');
        }
      } else {
        res.send('Usuário ou senha inválidos.');
      }
    } else {
      res.send('Usuário ou senha inválidos.');
    }
  });
});

// Processa registro
router.post('/register', (req, res) => {
  const { nome, email, senha } = req.body;

  const query = 'INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, "user")';

  connection.query(query, [nome, email, senha], (err, results) => {
    if (err) {
      console.error('Erro ao registrar usuário:', err);
      return res.send('Erro ao cadastrar.');
    }

    res.send('Cadastro realizado com sucesso! Faça login <a href="/login">aqui</a>.');
  });
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erro ao fazer logout:', err);
      return res.send('Erro ao fazer logout.');
    }
    res.redirect('/login');
  });
});

module.exports = router;
