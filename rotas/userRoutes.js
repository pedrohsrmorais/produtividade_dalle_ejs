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
  const data = req.query.data || moment().format('YYYY-MM-DD');
  const usuarioId = req.session.user.id;

  const query = `
    SELECT * FROM atividades 
    WHERE data_atividade = ? AND id_responsavel = ?
    ORDER BY id DESC
  `;

  connection.query(query, [data, usuarioId], (err, results) => {
    if (err) {
      console.error('Erro ao buscar atividades:', err);
      return res.send('Erro ao buscar atividades');
    }

    results.forEach(a => {
      a.data_formatada = moment(a.data_atividade).format('YYYY-MM-DD'); // formato para comparação
      a.data_atividade = moment(a.data_atividade).format('DD/MM/YYYY'); // formato para exibição
    });

    const diaAnterior = moment(data).subtract(1, 'days').format('YYYY-MM-DD');
    const proximoDia = moment(data).add(1, 'days').format('YYYY-MM-DD');

    res.render('user/dashboard', {
      atividades: results,
      dataAtual: data,
      diaAnterior,
      proximoDia,
      usuario: req.session.user,
      erro: req.query.erro || null
    });
  });
});

// Cadastro de nova atividade com turno e duração
router.post('/atividades', requireLogin, (req, res) => {
  const { descricao, impacto, data_atividade, duracao_atividade, turno } = req.body;

  const dataFormatada = moment(data_atividade, 'YYYY-MM-DD').format('YYYY-MM-DD');
  const status = 'iniciada';
  const nome_responsavel = req.session.user.nome;
  const id_responsavel = req.session.user.id;

  const query = `
    INSERT INTO atividades 
    (descricao, data_atividade, impacto, nome_responsavel, id_responsavel, status, duracao_atividade, turno)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  connection.query(
    query,
    [descricao, dataFormatada, impacto, nome_responsavel, id_responsavel, status, duracao_atividade, turno],
    (err, result) => {
      if (err) {
        console.error('Erro ao cadastrar atividade:', err);
        return res.redirect(`/user/dashboard?data=${dataFormatada}&erro=Erro ao cadastrar atividade`);
      }

      res.redirect(`/user/dashboard?data=${dataFormatada}`);
    }
  );
});

// Finalizar atividade
router.post('/atividades/:id/finalizar', requireLogin, (req, res) => {
  const atividadeId = req.params.id;
  const usuarioId = req.session.user.id;
  const dataHoje = moment().format('YYYY-MM-DD');

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

router.post('/atividades/:id/excluir', requireLogin, (req, res) => {
  const atividadeId = req.params.id;
  const usuarioId = req.session.user.id;

  const deleteQuery = `DELETE FROM atividades WHERE id = ? AND id_responsavel = ?`;

  connection.query(deleteQuery, [atividadeId, usuarioId], (err) => {
    if (err) {
      console.error('Erro ao excluir atividade:', err);
      return res.send('Erro ao excluir atividade.');
    }

    const dataHoje = moment().format('YYYY-MM-DD');
    res.redirect(`/user/dashboard?data=${dataHoje}`);
  });
});


module.exports = router;
