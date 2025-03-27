document.addEventListener('DOMContentLoaded', function () {
    var modeSwitch = document.querySelector('.mode-switch');
    if (modeSwitch) {
        modeSwitch.addEventListener('click', function () {
            document.documentElement.classList.toggle('dark');
            modeSwitch.classList.toggle('active');
        });
    }
    var listView = document.querySelector('.list-view');
    var gridView = document.querySelector('.grid-view');
    var projectsList = document.querySelector('.project-boxes');

    if (listView && gridView && projectsList) {
        listView.addEventListener('click', function () {
            gridView.classList.remove('active');
            listView.classList.add('active');
            projectsList.classList.remove('jsGridView');
            projectsList.classList.add('jsListView');
        });

        gridView.addEventListener('click', function () {
            gridView.classList.add('active');
            listView.classList.remove('active');
            projectsList.classList.remove('jsListView');
            projectsList.classList.add('jsGridView');
        });
    }
    var messagesBtn = document.querySelector('.messages-btn');
    var messagesClose = document.querySelector('.messages-close');

    if (messagesBtn) {
        messagesBtn.addEventListener('click', function () {
            document.querySelector('.messages-section').classList.add('show');
        });
    }

    if (messagesClose) {
        messagesClose.addEventListener('click', function () {
            document.querySelector('.messages-section').classList.remove('show');
        });
    }
    async function carregarChamados() {
        try {
            const response = await fetch('/buscar-chamados');
            const chamados = await response.json();

            const chamadosContainer = document.getElementById('chamados-container');
            const messagesContainer = document.getElementById('messages-container');

            if (chamadosContainer && messagesContainer) {
                chamadosContainer.innerHTML = '';
                messagesContainer.innerHTML = '';

                chamados.forEach(chamado => {
                    const nomeCriador = chamado.criador && chamado.criador.name ? chamado.criador.name : 'Usuário Anônimo';

                    const chamadoCompleto = `
                        <div class="project-box-wrapper">
                            <div class="project-box" data-id="${chamado._id}" data-status="${chamado.status}">
                                <div class="project-box-header">
                                    <span>${new Date(chamado.createdAt).toLocaleDateString()}</span>
                                    <div class="more-wrapper">
                                        <button class="project-btn-more" id="btn-more-${chamado._id}">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-more-vertical">
                                                <circle cx="12" cy="12" r="1" />
                                                <circle cx="12" cy="5" r="1" />
                                                <circle cx="12" cy="19" r="1" />
                                            </svg>
                                        </button>
                                        <div class="more-options" id="more-options-${chamado._id}">
                                            <button class="option" data-status="pendente">Pendente</button>
                                            <button class="option" data-status="em_andamento">Em Andamento</button>
                                            <button class="option" data-status="concluido">Concluído</button>
                                        </div>
                                    </div>
                                </div>
                                <div class="project-box-content-header">
                                    <p class="box-content-header">${chamado.titulo}</p>
                                    <p class="box-content-subheader">${chamado.localizacao}</p>
                                </div>
                                <div class="box-progress-wrapper">
                                    <p class="box-progress-header">Descrição</p>
                                    <p class="box-content-subheader">${chamado.descricao}</p>
                                </div>
                                ${chamado.foto ? `
                                    <div class="box-progress-wrapper">
                                        <p class="box-progress-header">Imagem</p>
                                        <img src="${chamado.foto}" alt="Imagem do Chamado" style="max-width: 100%; border-radius: 8px;">
                                    </div>
                                ` : ''}
                                <div class="project-box-footer">
                                    <div class="participants">
                                        <span>Criado por: ${nomeCriador}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    chamadosContainer.insertAdjacentHTML('beforeend', chamadoCompleto);

                    const chamadoResumido = `
                        <div class="message-box">
                            <img src="/FotosFuncionariosRH.IMG/Pessoa aleatoria M3.jpg" alt="profile image">
                            <div class="message-content">
                                <div class="message-header">
                                    <div class="name">${nomeCriador}</div>
                                    <div class="star-checkbox">
                                        <input type="checkbox" id="star-${chamado._id}">
                                        <label for="star-${chamado._id}">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-star">
                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                            </svg>
                                        </label>
                                    </div>
                                </div>
                                <p class="message-line">${chamado.titulo}</p>
                                <p class="message-line time">${new Date(chamado.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    `;
                    messagesContainer.insertAdjacentHTML('beforeend', chamadoResumido);
                });

                configurarEventos();
            }
        } catch (error) {
            console.error('Erro ao carregar chamados:', error);
        }
    }

    
    function configurarEventos() {
        function toggleMoreOptions(buttonId) {
            const moreOptions = document.getElementById(`more-options-${buttonId}`);
            if (moreOptions) {
                moreOptions.style.display = moreOptions.style.display === 'block' ? 'none' : 'block';
            }
        }

        document.querySelectorAll('.project-btn-more').forEach(button => {
            button.addEventListener('click', function (e) {
                e.stopPropagation();
                const chamadoId = this.id.replace('btn-more-', '');
                toggleMoreOptions(chamadoId);
            });
        });

        document.addEventListener('click', function () {
            document.querySelectorAll('.more-options').forEach(menu => {
                menu.style.display = 'none';
            });
        });

        document.querySelectorAll('.more-options').forEach(menu => {
            menu.addEventListener('click', function (e) {
                e.stopPropagation();
            });
        });

        async function atualizarStatus(chamadoId, status) {
            try {
                const response = await fetch(`/atualizar-status/${chamadoId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status })
                });

                if (response.ok) {
                    const chamadoAtualizado = await response.json();
                    const card = document.querySelector(`.project-box[data-id="${chamadoId}"]`);
                    if (card) {
                        card.setAttribute('data-status', status);
                    }
                } else {
                    console.error('Erro ao atualizar status:', await response.json());
                }
            } catch (error) {
                console.error('Erro ao atualizar status:', error);
            }
        }

        document.querySelectorAll('.more-options .option').forEach(button => {
            button.addEventListener('click', function () {
                const chamadoId = this.closest('.project-box-wrapper').querySelector('.project-box').getAttribute('data-id');
                const status = this.getAttribute('data-status');
                atualizarStatus(chamadoId, status);
            });
        });
    }

    carregarChamados();
});