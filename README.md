# Equipe Croesus 
- <img src="/public/img/Logo 2 hd.png" alt="Logo do Projeto" width="200"/>

- **Menbros da Equipe**

- **Brunno de Brito Barros** : Desenvolvedor Fullstack & Cybersecurity Enthusiast
- **Gabriel Marcondes de Oliveira** : Desenvolvedor Fullstack
- **Henrique Bertechini Bilia Franco** : Desenvolvedor Java
- **Vanessa Mendes** : Gestora Administrativa


# Resolve+

**Resolve+** é uma plataforma de gerenciamento de chamados e suporte técnico, projetada para otimizar a resolução de problemas em ambientes corporativos. Com uma interface intuitiva e funcionalidades avançadas, o Resolve+ permite que usuários e administradores acompanhem, gerenciem e resolvam chamados de forma eficiente.

---

## **Informações do Projeto**

- **Título**: Resolve+ - Sistema de Gerenciamento de Chamados  
- **Autores**: Equipe de Desenvolvimento Resolve+  
- **Repositório**: [GitHub](https://github.com/Brunn0B/Projeto-StartTup2-Resolve-)  
- **Dashboard**: `/public/img/imagen.png`

---

## **Instalação & Dependências**

### **Dependências Necessárias:**
- **Node.js** (v16 ou superior)  
- **NGROK** (para teste de servidor)  
- **Express** (para o backend)  
- **MongoDB** (banco de dados)  
- **nodemon** (para reinicialização automática do servidor)  
- **Bibliotecas Adicionais** (listadas no `package.json`)  

### **Passos para Instalação:**

1. Clone o repositório:
```bash
git clone https://github.com/Brunn0B/Projeto-StartTup2-Resolve-.git
cd Projeto-StartTup2-Resolve-
```

2. Instale as dependências:
```bash
npm install
```

3. Configure o MongoDB:
- Certifique-se de ter o MongoDB instalado e rodando.
- Crie um banco de dados chamado `resolveplus`.

4. Configure a conexão no arquivo `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/resolveplus
```

5. Inicie o servidor:
```bash
npm start
```

6. Para testes com NGROK:
```bash
ngrok http 3000
```

---

## **Links e Ferramentas**

### **Links**
- [GitHub](https://github.com/Brunn0B/Projeto-StartTup2-Resolve-) - Repositório do Projeto  
- [Trello - Quadro de Tarefas](https://trello.com/invite/b/66ccc299900a85d7ccc6c3f1/ATTI443afcc886ea7edf8222e5979bcc689c687F4C11/StartupOne)  

### **Ferramentas Utilizadas**
- **JavaScript** (linguagem principal)  
- **HTML** (estrutura do frontend)  
- **CSS** (estilização)  
- **Node.js** (backend)  
- **Express** (framework para APIs)  
- **MongoDB** (banco de dados NoSQL)  
- **NGROK** (teste de servidor)  
- **nodemon** (desenvolvimento)  

**Futuramente:** Integração com **Machine Learning (Python)** para Chat Bot.

---

## **Estrutura do Projeto**

### **Backend (Node.js + Express)**
#### Rotas:
- `/api/chamados`: Gerencia chamados (CRUD).  
- `/api/usuarios`: Gerencia usuários (autenticação e permissões).  
- `/api/relatorios`: Gera relatórios de chamados.  

#### Modelos:
- `Chamado.js`: Modelo de dados para chamados.  
- `Usuario.js`: Modelo de dados para usuários.  

#### Controladores:
- `chamadosController.js`: Lógica para manipulação de chamados.  
- `usuariosController.js`: Lógica para autenticação e gerenciamento de usuários.  

### **Frontend (HTML + CSS + JavaScript)**
#### Páginas:
- `index.html`: Página inicial com login e dashboard.  
- `chamados.html`: Listagem e criação de chamados.  
- `relatorios.html`: Visualização de relatórios.  

#### Funcionalidades:
- Autenticação de usuários.  
- Criação, edição e exclusão de chamados.  
- Visualização de relatórios em tempo real.  

### **Banco de Dados (MongoDB)**
#### Coleções Principais:

**Chamados:**
- `titulo` (String): Título do chamado.  
- `descricao` (String): Descrição detalhada.  
- `status` (String): Status atual (Aberto, Em andamento, Resolvido).  
- `dataCriacao` (Date): Data de criação.  
- `usuario` (ObjectId): Referência ao usuário criador.  

**Usuários:**
- `nome` (String): Nome do usuário.  
- `email` (String): E-mail único.  
- `senha` (String): Senha criptografada.  
- `permissao` (String): Nível de permissão (Admin, Usuário).  

---

## **Requisições (API)**

### **Endpoints:**

**Listar Chamados:**
- Método: GET  
- URL: `/api/chamados`

**Criar Chamado:**
- Método: POST  
- URL: `/api/chamados`  
- Corpo:
```json
{
  "titulo": "Novo Problema",
  "descricao": "Descrição do problema.",
  "status": "Aberto"
}
```

**Atualizar Chamado:**
- Método: PUT  
- URL: `/api/chamados/:id`  
- Corpo:
```json
{
  "status": "Resolvido"
}
```

**Deletar Chamado:**
- Método: DELETE  
- URL: `/api/chamados/:id`

---

## **Funcionalidades Futuras**
- Integração com Machine Learning:
  - Chat Bot para atendimento automático.
  - Análise preditiva de chamados.
- Relatórios Avançados:
  - Gráficos interativos.
  - Exportação em PDF/Excel.
- Autenticação Segura:
  - Implementação de OAuth2.
  - Autenticação de dois fatores (2FA).

---

## **Contribuição**

Contribuições são bem-vindas! Siga os passos abaixo:

1. Faça um fork do repositório.
2. Crie uma branch para sua feature:
```bash
git checkout -b minha-feature
```
3. Commit suas mudanças:
```bash
git commit -m "Adicionando nova funcionalidade"
```
4. Envie para o repositório remoto:
```bash
git push origin minha-feature
```
5. Abra um Pull Request.

---
## **Licença**

MIT License

Copyright (c) 2023 Resolve+

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

### **Como Executar O chat-Bot**

- *Exietm 3 formas A primeira é Usando o Node*

- No terminal navegue  até o projeto, utilizando cd, ou abrindo o terminal direto no VsCode

- Utilizando o Comando "node server.js" ele ira iniciar o servidor Local, e um caminho HTTP

- assim que o sistema for iniciado basta basta acessar a pagina de loguin criar um cadastro , apos isso tera um icone Escrito suporte

- Certifiquice de ter node instalado e todas as dependenciasnecessarias

- *E a 2 forma é utilizando o Lively server*

- este 2° metodo é necessario baixar a extenção live server no VScode

- Ir no arquivo chat-assistente.html   Caminho : public>chat-assistente.html

- Esta é a versao de teste do chat mas funciona normalmente


- *E a 3 etapa é seguindo este link*

- [Sitema Funcional](https://resolve-q6k1.onrender.com)

- Necessario se cadastrar e logar, "assim que o sistema for iniciado basta basta acessar a pagina de loguin criar um cadastro , apos isso tera um icone Escrito suporte"


## **Contato**
Para mais informações, entre em contato com a equipe de desenvolvimento:

- **Email**: brito.brunnob@gmail.com  
- **Site**: [Resolve+](https://resolvemais.netlify.app/public/index.html)

## **Professores Envolvidos**

- **Eliney Sabino**: *Orientador de StartTup*
- **Tulio**: *Cyber-Segurança*
- **Daniel Ohata**: *Inteligência Artificial/MachineLarning*
- **Cilene Renata**: *Desenvolvimento Web Back-end*
- **Fabricio Tonetto**: *Desenvolvimento App-Mobile*

![GIF do Projeto](/public/img/Apresentaçao%20Inicial.gif)

### Vídeo no completo no YouTube -- O Video Esta Desatualizado!!
[![Assista ao vídeo](https://www.youtube.com/watch?v=YtUuTxyDDyg)](https://www.youtube.com/watch?v=YtUuTxyDDyg)


|—— .env
|—— .gitignore
|—— index.html
|—— main.js
|—— node_modules
|—— package-lock.json
|—— package.json
|—— public
|    |—— abrir-chamado.html
|    |—— Configuracoes.html
|    |—— Gerenciador de Chamdos.html
|    |—— img
|        |—— agua.jpg
|        |—— aguaen.jpg
|        |—— anonimo.png
|        |—— Apresentaçao Inicial.gif
|        |—— Apresentaçao Inicial.mp4
|        |—— dengue.jpg
|        |—— dps.jpg
|        |—— estrada-terra.webp
|        |—— image.png
|        |—— Imagens do Grupo
|            |—— Brunno.jpeg
|            |—— Gabriel.jpeg
|            |—— Henrique.jpg
|            |—— Vanessa.jpeg
|        |—— lixo.jpg
|        |—— Lofo2.png
|        |—— Logo 2 hd.png
|        |—— Logo Novo.png
|        |—— Logo-Resolve-hd.png
|        |—— Logo_Novo-removebg-preview.png
|        |—— semaforo.jpg
|        |—— sp.jpg
|    |—— index.html
|    |—— Loguin.html
|    |—— manifest.json
|    |—— Mensalidade.html
|    |—— Pagamento.html
|    |—— PerfilUser.html
|    |—— service-worker.js
|    |—— sobre.html
|    |—— SuporteUsuario.html
|    |—— TelaChamados.css
|    |—— TelaChamados.html
|    |—— TelaChamados.js
|    |—— Uploads
|        |—— avatars
|            |—— 67c3addcd6dda9460a794902-1743030870473-505361244.png
|            |—— 67c3addcd6dda9460a794902-1743031176617-7960131.png
|—— server.js
|—— suporte_ml.py
|—— support_model.joblib
|—— Teste
|—— uploads
|    |—— 15bb03d1fc9f8fd885e4ced73c82a287
|    |—— 8bad5069a3e6c55c29b9af718d543c1e
|    |—— e495b6b89d9e2dc59a7b470c0c37db0e
```
