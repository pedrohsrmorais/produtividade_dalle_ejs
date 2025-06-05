const express = require('express');
const router = express.Router();
const connection = require('../db/connection');
const moment = require('moment');

// Middleware de segurança
function requireAdmin(req, res, next) {
    if (!req.session.user || req.session.user.tipo !== 'admin') {
        return res.status(403).send('Acesso negado.');
    }
    next();
}

// 📌 Listar todos os usuários
router.get('/usuarios', requireAdmin, (req, res) => {
    const query = 'SELECT id, nome, email FROM usuarios WHERE tipo = "user"';

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Erro ao buscar usuários:', err);
            return res.send('Erro ao buscar usuários');
        }

        res.render('admin/usuarios', { usuarios: results });
    });
});

// Relatórios
router.get('/relatorio/:id', requireAdmin, (req, res) => {
    const usuarioId = req.params.id;

    const query = `
    SELECT 
      SUM(CASE WHEN status = 'iniciada' THEN 1 ELSE 0 END) AS nao_finalizadas,
      SUM(CASE WHEN status = 'finalizada' THEN 1 ELSE 0 END) AS finalizadas,
      (
        SELECT SUM(impacto) 
        FROM atividades 
        WHERE id_responsavel = ? AND status = 'finalizada'
      ) AS impacto_total,
      (
        SELECT ROUND(AVG(impacto), 2)
        FROM atividades
        WHERE id_responsavel = ? AND status = 'finalizada'
      ) AS impacto_medio,
        (
  SELECT TIME_FORMAT(
    SEC_TO_TIME(AVG(TIME_TO_SEC(duracao_atividade))),
    '%H:%i'
  )
  FROM atividades
  WHERE id_responsavel = ? AND status = 'finalizada'
) AS duracao_media

    FROM atividades
    WHERE id_responsavel = ?
  `;

    connection.query(
        query,
        [usuarioId, usuarioId, usuarioId, usuarioId],
        (err, resultados) => {
            if (err) {
                console.error('Erro ao gerar relatório:', err);
                return res.send('Erro ao gerar relatório');
            }

            const dados = resultados[0];

            res.render('admin/relatorio', {
                usuarioId,
                relatorio: dados
            });
        }
    );
});



// 📌 Página do menu do admin
router.get('/', requireAdmin, (req, res) => {
    res.render('admin/menu');
});

// 📌 Relatório geral com filtro por intervalo de datas
// 📌 Relatório geral com filtro por intervalo de datas
router.get('/relatorio-geral', requireAdmin, (req, res) => {
    const dataInicio = req.query.dataInicio || moment().subtract(7, 'days').format('YYYY-MM-DD');
    const dataFim = req.query.dataFim || moment().format('YYYY-MM-DD');

    // Transforma a seleção em array (mesmo que só tenha 1)
    let usuarioIds = req.query.usuario;
    if (usuarioIds && !Array.isArray(usuarioIds)) {
        usuarioIds = [usuarioIds];
    }

    // Lista de usuários para o select
    const usuariosQuery = `SELECT id, nome FROM usuarios WHERE tipo = 'user'`;

    connection.query(usuariosQuery, (err, listaUsuarios) => {
        if (err) {
            console.error('Erro ao buscar usuários:', err);
            return res.send('Erro ao carregar usuários');
        }

        // Query principal
        let queryResumo = `
            SELECT 
                u.id,
                u.nome,
                COUNT(CASE WHEN a.status = 'finalizada' THEN 1 END) AS finalizadas,
                COUNT(CASE WHEN a.status = 'iniciada' THEN 1 END) AS nao_finalizadas,
                SUM(CASE WHEN a.status = 'finalizada' THEN a.impacto ELSE 0 END) AS impacto_total,
                ROUND(AVG(CASE WHEN a.status = 'finalizada' THEN a.impacto ELSE NULL END), 2) AS impacto_medio,
                TIME_FORMAT(
                    SEC_TO_TIME(AVG(CASE WHEN a.status = 'finalizada' THEN TIME_TO_SEC(a.duracao_atividade) ELSE NULL END)),
                    '%H:%i'
                ) AS tempo_medio_finalizadas,
                TIME_FORMAT(
                    SEC_TO_TIME(SUM(CASE WHEN a.status = 'finalizada' THEN TIME_TO_SEC(a.duracao_atividade) ELSE 0 END)),
                    '%H:%i'
                ) AS tempo_total_finalizadas
            FROM usuarios u
            LEFT JOIN atividades a 
                ON a.id_responsavel = u.id AND a.data_atividade BETWEEN ? AND ?
            WHERE u.tipo = 'user'
        `;

        const params = [dataInicio, dataFim];

        // Aplica filtro de múltiplos usuários (se houver)
        if (usuarioIds && usuarioIds.length > 0) {
            const placeholders = usuarioIds.map(() => '?').join(',');
            queryResumo += ` AND u.id IN (${placeholders})`;
            params.push(...usuarioIds);
        }

        queryResumo += ' GROUP BY u.id, u.nome ORDER BY u.nome';

        connection.query(queryResumo, params, (err2, resultados) => {
            if (err2) {
                console.error('Erro ao gerar relatório:', err2);
                return res.send('Erro ao gerar relatório');
            }

            // Cálculo dos totais
            const totais = {
                finalizadas: 0,
                nao_finalizadas: 0,
                impacto_total: 0,
                impacto_medio: 0
            };

            let totalFinalizadas = 0;
            let totalTempoSegundos = 0;
            let totalMediaSegundos = 0;
            let usuariosComTempo = 0;

            resultados.forEach(u => {
                totais.finalizadas += u.finalizadas || 0;
                totais.nao_finalizadas += u.nao_finalizadas || 0;
                totais.impacto_total += u.impacto_total || 0;

                if (u.finalizadas) totalFinalizadas += u.finalizadas;

                if (u.tempo_total_finalizadas) {
                    const [h, m] = u.tempo_total_finalizadas.split(':').map(Number);
                    totalTempoSegundos += (h * 3600) + (m * 60);
                }

                if (u.tempo_medio_finalizadas && u.finalizadas > 0) {
                    const [h, m] = u.tempo_medio_finalizadas.split(':').map(Number);
                    totalMediaSegundos += (h * 3600) + (m * 60);
                    usuariosComTempo += 1;
                }
            });

            function formatSecondsToHHMM(totalSeconds) {
                const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
                const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
                return `${h}:${m}`;
            }

            totais.tempo_total = formatSecondsToHHMM(totalTempoSegundos);
            totais.tempo_medio = usuariosComTempo > 0
                ? formatSecondsToHHMM(Math.floor(totalMediaSegundos / usuariosComTempo))
                : '-';

            totais.impacto_medio = totalFinalizadas > 0
                ? (totais.impacto_total / totalFinalizadas).toFixed(2)
                : 0;

            const topMais = [...resultados].sort((a, b) => b.finalizadas - a.finalizadas).slice(0, 5);
            const topMenos = [...resultados].sort((a, b) => a.finalizadas - b.finalizadas).slice(0, 5);

            res.render('admin/relatorio_geral', {
                usuarios: resultados,
                listaUsuarios,
                filtroUsuario: usuarioIds,
                dataInicio,
                dataFim,
                totais,
                topMaisLabels: topMais.map(u => u.nome),
                topMaisData: topMais.map(u => u.finalizadas),
                topMenosLabels: topMenos.map(u => u.nome),
                topMenosData: topMenos.map(u => u.finalizadas)
            });
        });
    });
});






// 📌 Ver todas as atividades com filtro por usuário e intervalo de datas
router.get('/atividades', requireAdmin, (req, res) => {
    const usuarioId = req.query.usuario || null;
    const dataInicio = req.query.dataInicio || null;
    const dataFim = req.query.dataFim || null;

    // Busca todos os usuários para popular o filtro
    const usuariosQuery = 'SELECT id, nome FROM usuarios WHERE tipo = "user"';

    connection.query(usuariosQuery, (err, usuarios) => {
        if (err) {
            console.error('Erro ao buscar usuários:', err);
            return res.send('Erro ao buscar usuários');
        }

        // Monta a query de atividades com os filtros dinâmicos
        let atividadesQuery = `
            SELECT a.*, u.nome AS nome_responsavel
            FROM atividades a
            JOIN usuarios u ON a.id_responsavel = u.id
            WHERE 1 = 1
        `;
        const params = [];

        if (usuarioId) {
            atividadesQuery += ' AND u.id = ?';
            params.push(usuarioId);
        }

        if (dataInicio && dataFim) {
            atividadesQuery += ' AND a.data_atividade BETWEEN ? AND ?';
            params.push(dataInicio, dataFim);
        } else if (dataInicio) {
            atividadesQuery += ' AND a.data_atividade >= ?';
            params.push(dataInicio);
        } else if (dataFim) {
            atividadesQuery += ' AND a.data_atividade <= ?';
            params.push(dataFim);
        }

        atividadesQuery += ' ORDER BY a.data_atividade DESC';

        connection.query(atividadesQuery, params, (err2, atividades) => {
            if (err2) {
                console.error('Erro ao buscar atividades:', err2);
                return res.send('Erro ao buscar atividades');
            }

            res.render('admin/atividades', {
                atividades,
                usuarios,
                filtroUsuario: usuarioId,
                dataInicio,
                dataFim
            });
        });
    });
});

router.post('/usuarios/:id/excluir', requireAdmin, (req, res) => {
  const usuarioId = req.params.id;

  const excluirAtividades = 'DELETE FROM atividades WHERE id_responsavel = ?';
  const excluirUsuario = 'DELETE FROM usuarios WHERE id = ? AND tipo = "user"';

  connection.query(excluirAtividades, [usuarioId], (err1) => {
    if (err1) {
      console.error('Erro ao excluir atividades:', err1);
      return res.send('Erro ao excluir atividades do usuário.');
    }

    connection.query(excluirUsuario, [usuarioId], (err2) => {
      if (err2) {
        console.error('Erro ao excluir usuário:', err2);
        return res.send('Erro ao excluir usuário.');
      }

      res.redirect('/admin/usuarios');
    });
  });
});


module.exports = router;
