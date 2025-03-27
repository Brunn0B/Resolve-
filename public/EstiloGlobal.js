function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }
}

applySavedTheme();

function openConfigPopup() {
    window.open('Configuracoes.html', 'Configurações', 'width=400,height=500');
}