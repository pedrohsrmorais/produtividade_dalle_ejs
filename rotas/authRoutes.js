const express = require('express');
const router = express.Router();
const connection = require('../db/connection');
const path = require('path');

// Redireciona para a página de login
router.get('/', (req, res) => {
  res.redirect('/login');
});


// Formulários
router.get('/login', (req, res) => {
  res.render('auth/login'); // views/auth/login.ejs
});


// Processa login
router.post('/login', (req, res) => {
  const { email, senha } = req.body;
  const query = 'SELECT * FROM usuarios WHERE email = ?';

  connection.query(query, [email], (err, results) => {
    if (err) {
      console.error('Erro ao buscar usuário:', err);
      return res.render('auth/login', { error: 'Erro interno. Tente novamente mais tarde.' });
    }

    if (results.length > 0) {
      const user = results[0];

      if (senha === user.senha) {
        req.session.user = {
          id: user.id,
          nome: user.nome,
          email: user.email,
          tipo: user.tipo
        };

        if (user.tipo === 'admin') {
          res.redirect('/admin');
        } else {
          res.redirect('/user/dashboard');
        }
      } else {
        res.render('auth/login', { error: 'Usuário ou senha inválidos.' });
      }
    } else {
      res.render('auth/login', { error: 'Usuário ou senha inválidos.' });
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

    // Redireciona para a lista de usuários após o cadastro
    res.redirect('/admin/usuarios');
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
