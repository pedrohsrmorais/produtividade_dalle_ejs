const express = require('express');
const connection = require('./db/connection'); // Certifique-se de que connection está correto ou use pool
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt'); // Embora usado nas rotas, é bom ter aqui para contexto

const app = express();
const port = 3001;

// Importar os módulos de rotas
const authRoutes = require('./rotas/authRoutes');
const adminRoutes = require('./rotas/adminRoutes');
const userRoutes = require('./rotas/userRoutes');


// Configuração dos Middlewares
app.use(session({
    secret: 'seu_segredo_super_secreto', // MUITO IMPORTANTE: Mudar para uma string longa e aleatória em produção
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Use 'true' em produção (HTTPS)
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public'))); // Servir arquivos estáticos do diretório 'public'
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para verificar se o usuário está logado (pode ser global ou importado)
// É bom que estes middlewares sejam exportados e importados para evitar duplicação.
// Por simplicidade, vou manter aqui para este exemplo, mas idealmente estariam em um arquivo separado.
const requireLogin = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

const requireAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.tipo === 'admin') {
        next();
    } else {
        res.status(403).send('Acesso negado.');
    }
};


// Usar os módulos de rotas
// As rotas dentro de 'authRoutes' serão acessadas diretamente (ex: /login)
app.use('/', authRoutes);

// As rotas dentro de 'adminRoutes' terão o prefixo '/admin' (ex: /admin/dashboard)
app.use('/admin', adminRoutes);

// As rotas dentro de 'userRoutes' terão o prefixo '/user' (ex: /user/dashboard)
app.use('/user', userRoutes);




// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});

// Tratamento para encerrar a conexão com o banco de dados ao fechar o servidor
process.on('SIGINT', () => {

    console.log('Servidor encerrando. Conexões do pool serão fechadas automaticamente.');
    process.exit(0);
});