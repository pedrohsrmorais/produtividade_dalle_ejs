document.addEventListener('DOMContentLoaded', () => {
    const sections = ['gestao-usuarios', 'gestao-tarefas', 'relatorios'];

    const showSection = (id) => {
        sections.forEach(sec => {
            const el = document.getElementById(sec);
            if (el) el.style.display = sec === id ? 'block' : 'none';
        });
    };

    // Exibir 'relatorios' por padrão
    showSection('relatorios');

    // Definir botão ativo inicialmente
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
    const relatoriosBtn = document.querySelector('.menu-btn[data-section="relatorios"]');
    if (relatoriosBtn) relatoriosBtn.classList.add('active');

    document.querySelectorAll('.menu-btn').forEach(button => {
        button.addEventListener('click', () => {
            const target = button.dataset.section;
            showSection(target);

            document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    document.querySelectorAll('.toggle-button').forEach(button => {
        button.addEventListener('click', () => {
            const userId = button.dataset.userId;
            const type = button.dataset.type;
            const row = document.getElementById(`detail-${userId}`);

            if (!row) return;

            const allContents = row.querySelectorAll('.detail-content');
            const selectedContent = row.querySelector(`.detail-content[data-type="${type}"]`);

            const isAlreadyVisible = selectedContent.style.display === 'block';

            allContents.forEach(content => content.style.display = 'none');

            if (isAlreadyVisible) {
                row.style.display = 'none';
                updateButtons(userId, type, false);
            } else {
                row.style.display = 'table-row';
                selectedContent.style.display = 'block';
                updateButtons(userId, type, true);
            }
        });
    });

    function updateButtons(userId, activeType, isVisible) {
        document.querySelectorAll(`.toggle-button[data-user-id="${userId}"]`).forEach(btn => {
            const type = btn.dataset.type;
            if (type === activeType) {
                btn.textContent = isVisible
                    ? (type === 'atividades' ? 'Esconder Atividades' : 'Esconder Relatório')
                    : (type === 'atividades' ? 'Ver Atividades' : 'Gerar Relatório');
            } else {
                btn.textContent = type === 'atividades' ? 'Ver Atividades' : 'Gerar Relatório';
            }
        });
    }
});
