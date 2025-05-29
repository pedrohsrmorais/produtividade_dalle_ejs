document.addEventListener('DOMContentLoaded', function () {
    initToggleCreateActivity();
    initFibonacciValidation();
});

function initToggleCreateActivity() {
    const toggleButton = document.getElementById('toggleCreateActivity');
    const formContainer = document.getElementById('createActivityFormContainer');

    if (!toggleButton || !formContainer) {
        console.warn('Elementos para alternar o formulário de atividade não encontrados.');
        return;
    }

    toggleButton.addEventListener('click', () => {
        const isVisible = formContainer.classList.toggle('form-visible');
        toggleButton.textContent = isVisible
            ? 'Fechar formulário de atividade'
            : 'Criar nova atividade';
    });
}

function initFibonacciValidation() {
    const validFibonacci = [1, 2, 3, 5, 8, 13, 21];

    document.querySelectorAll('form[action^="/user/atividades/finalizar/"]').forEach(form => {
        form.addEventListener('submit', event => {
            const input = form.querySelector('input[name="impacto_real"]');
            const value = parseInt(input?.value, 10);

            if (!validFibonacci.includes(value)) {
                event.preventDefault();
                alert('Por favor, insira um valor válido da sequência de Fibonacci: 1, 2, 3, 5, 8, 13, 21.');
                input.focus();
            }
        });
    });
}
