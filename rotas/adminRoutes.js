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

// 📌 Relatório individual por usuário
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
            ) AS impacto_medio
        FROM atividades
        WHERE id_responsavel = ?
    `;

    connection.query(query, [usuarioId, usuarioId, usuarioId], (err, resultados) => {
        if (err) {
            console.error('Erro ao gerar relatório:', err);
            return res.send('Erro ao gerar relatório');
        }

        const dados = resultados[0];

        res.render('admin/relatorio', {
            usuarioId,
            relatorio: dados
        });
    });
});

// 📌 Página do menu do admin
router.get('/', requireAdmin, (req, res) => {
    res.render('admin/menu');
});

// 📌 Relatório geral com filtro por intervalo de datas
router.get('/relatorio-geral', requireAdmin, (req, res) => {
    const dataInicio = req.query.dataInicio || moment().subtract(7, 'days').format('YYYY-MM-DD');
    const dataFim = req.query.dataFim || moment().format('YYYY-MM-DD');

    const query = `
        SELECT 
            u.id,
            u.nome,
            COUNT(CASE WHEN a.status = 'finalizada' THEN 1 END) AS finalizadas,
            COUNT(CASE WHEN a.status = 'iniciada' THEN 1 END) AS nao_finalizadas,
            SUM(CASE WHEN a.status = 'finalizada' THEN a.impacto ELSE 0 END) AS impacto_total,
            ROUND(AVG(CASE WHEN a.status = 'finalizada' THEN a.impacto ELSE NULL END), 2) AS impacto_medio
        FROM usuarios u
        LEFT JOIN atividades a 
            ON a.id_responsavel = u.id AND a.data_atividade BETWEEN ? AND ?
        WHERE u.tipo = 'user'
        GROUP BY u.id, u.nome
        ORDER BY u.nome
    `;

    connection.query(query, [dataInicio, dataFim], (err, resultados) => {
        if (err) {
            console.error('Erro no relatório geral:', err);
            return res.send('Erro ao gerar relatório.');
        }

        // Totais globais
        const totais = {
            finalizadas: 0,
            nao_finalizadas: 0,
            impacto_total: 0,
            impacto_medio: 0
        };

        let totalFinalizadas = 0;

        resultados.forEach(u => {
            totais.finalizadas += u.finalizadas || 0;
            totais.nao_finalizadas += u.nao_finalizadas || 0;
            totais.impacto_total += u.impacto_total || 0;
            if (u.finalizadas) totalFinalizadas += u.finalizadas;
        });

        totais.impacto_medio = totalFinalizadas > 0
            ? (totais.impacto_total / totalFinalizadas).toFixed(2)
            : 0;
        const topMais = [...resultados].sort((a, b) => b.finalizadas - a.finalizadas).slice(0, 5);
        const topMenos = [...resultados].sort((a, b) => a.finalizadas - b.finalizadas).slice(0, 5);

        const topMaisLabels = topMais.map(u => u.nome);
        const topMaisData = topMais.map(u => u.finalizadas);
        const topMenosLabels = topMenos.map(u => u.nome);
        const topMenosData = topMenos.map(u => u.finalizadas);
        res.render('admin/relatorio_geral', {
            usuarios: resultados,
            dataInicio,
            dataFim,
            totais,
            topMaisLabels,
            topMaisData,
            topMenosLabels,
            topMenosData
        });

    });
});
// 📌 Ver todas as atividades com filtro por usuário
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


module.exports = router;
