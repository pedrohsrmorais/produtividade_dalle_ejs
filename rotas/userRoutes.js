const express = require('express');
const router = express.Router();
const connection = require('../db/connection');
const moment = require('moment');

// Middleware de autenticação
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

// Dashboard de atividades
router.get('/dashboard', requireLogin, (req, res) => {
  const data = req.query.data || moment().format('YYYY-MM-DD'); // já no formato do MySQL
  const usuarioId = req.session.user.id;

  const query = `
    SELECT * FROM atividades 
    WHERE data_atividade = ? AND id_responsavel = ?
    ORDER BY id DESC
    LIMIT 10
  `;

  connection.query(query, [data, usuarioId], (err, results) => {
    if (err) {
      console.error('Erro ao buscar atividades:', err);
      return res.send('Erro ao buscar atividades');
    }
    results.forEach(a => {
      a.data_atividade = moment(a.data_atividade).format('DD/MM/YYYY');
    });


    const diaAnterior = moment(data).subtract(1, 'days').format('YYYY-MM-DD');
    const proximoDia = moment(data).add(1, 'days').format('YYYY-MM-DD');

    res.render('user/dashboard', {
      atividades: results,
      dataAtual: data,
      diaAnterior,
      proximoDia,
      usuario: req.session.user,
      erro: req.query.erro || null // 👈 Adiciona a variável 'erro' (opcional)
    });

  });
});

// Cadastro de nova atividade com data formatada para o tipo DATE
router.post('/atividades', requireLogin, (req, res) => {
  const { descricao, impacto, data_atividade } = req.body;
  const dataFormatada = moment(data_atividade, 'YYYY-MM-DD').format('YYYY-MM-DD'); // garante o formato
  const status = 'iniciada';
  const nome_responsavel = req.session.user.nome;
  const id_responsavel = req.session.user.id;

  const query = `
    INSERT INTO atividades 
    (descricao, data_atividade, impacto, nome_responsavel, id_responsavel, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  connection.query(
    query,
    [descricao, dataFormatada, impacto, nome_responsavel, id_responsavel, status],
    (err, result) => {
      if (err) {
        console.error('Erro ao inserir atividade:', err);
        return res.redirect(`/user/dashboard?data=${dataFormatada}&erro=Erro ao cadastrar atividade`);
      }

      res.redirect(`/user/dashboard?data=${dataFormatada}`);
    }
  );
});
router.post('/atividades/:id/finalizar', requireLogin, (req, res) => {
  const atividadeId = req.params.id;
  const usuarioId = req.session.user.id;
  const dataHoje = moment().format('YYYY-MM-DD');

  // Verifica se a atividade pertence ao usuário e é de hoje
  const query = `
    SELECT * FROM atividades 
    WHERE id = ? AND id_responsavel = ? AND data_atividade = ? AND status = 'iniciada'
  `;

  connection.query(query, [atividadeId, usuarioId, dataHoje], (err, results) => {
    if (err) {
      console.error('Erro ao verificar atividade:', err);
      return res.send('Erro ao verificar atividade.');
    }

    if (results.length === 0) {
      return res.redirect(`/user/dashboard?data=${dataHoje}&erro=Você só pode finalizar atividades do dia atual.`);
    }

    // Atualiza o status da atividade
    const updateQuery = `UPDATE atividades SET status = 'finalizada' WHERE id = ?`;

    connection.query(updateQuery, [atividadeId], (updateErr) => {
      if (updateErr) {
        console.error('Erro ao atualizar atividade:', updateErr);
        return res.send('Erro ao finalizar atividade.');
      }

      res.redirect(`/user/dashboard?data=${dataHoje}`);
    });
  });
});

module.exports = router;
