document.addEventListener('DOMContentLoaded', function () {
    
    var modeSwitch = document.querySelector('.mode-switch');
    modeSwitch.addEventListener('click', function () {
        document.documentElement.classList.toggle('dark');
        modeSwitch.classList.toggle('active');
    });

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
    var messagesSection = document.querySelector('.messages-section');

    if (messagesBtn && messagesClose && messagesSection) {
        messagesBtn.addEventListener('click', function () {
            messagesSection.classList.add('show');
        });

        messagesClose.addEventListener('click', function () {
            messagesSection.classList.remove('show');
        });
    }


    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const fotoCapturada = document.getElementById('fotoCapturada');
    const capturarFotoBtn = document.getElementById('capturarFoto');

    async function iniciarCamera() {
        try {
            const constraints = {
                video: {
                    facingMode: 'environment', // Usar câmera traseira
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
    
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            cameraPreview.style.display = 'block';
            cameraControls.style.display = 'flex';
            iniciarCameraBtn.style.display = 'none';
        } catch (error) {
            alert('Erro ao acessar a câmera: ' + error.message);
        }
    }

    capturarFotoBtn.addEventListener('click', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

        const imagemBase64 = canvas.toDataURL('image/png');
        fotoCapturada.src = imagemBase64;
        fotoCapturada.style.display = 'block';
    });

    function dataURItoBlob(dataURI) {
        const byteString = atob(dataURI.split(',')[1]);
        const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mimeString });
    }

    document.getElementById('chamadoForm').addEventListener('submit', async function (event) {
        event.preventDefault();

        const titulo = document.getElementById('titulo').value;
        const descricao = document.getElementById('descricao').value;
        const localizacao = document.getElementById('localizacao').value;
        const fotoCapturada = document.getElementById('fotoCapturada').src;

        if (!titulo || !descricao || !localizacao) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        const formData = new FormData();
        formData.append('titulo', titulo);
        formData.append('descricao', descricao);
        formData.append('localizacao', localizacao);
        if (fotoCapturada) {
            const blob = await fetch(fotoCapturada).then(res => res.blob());
            formData.append('foto', blob, 'foto_capturada.png');
        }

        try {
            const response = await fetch('/abrir-chamado', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                alert('Chamado aberto com sucesso!');
                document.getElementById('chamadoForm').reset();
                document.getElementById('fotoCapturada').style.display = 'none';
            } else {
                alert('Erro ao abrir o chamado.');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao abrir o chamado.');
        }
    });

    iniciarCamera();
});