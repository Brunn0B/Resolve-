const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'Chave_secreta$$%';

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

console.log('Verificando variáveis de ambiente...');
if (!process.env.MONGODB_URI) {
  console.warn('AVISO: Variável de ambiente MONGODB_URI não definida. Usando URI padrão local.');
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/suporte-app';
console.log(`Tentando conectar ao MongoDB: ${uri.substring(0, 20)}...`);

mongoose.connect(uri)
  .then(() => console.log('Conectado ao MongoDB com sucesso!'))
  .catch(err => {
    console.error('Erro ao conectar ao MongoDB:', err);
    console.log('Verifique se o MongoDB está rodando e se a URI está correta.');
  });

app.use(express.static(path.join(__dirname, 'public')));
console.log(`Servindo arquivos estáticos de: ${path.join(__dirname, 'public')}`);

const imageSchema = new mongoose.Schema({
  data: Buffer,
  contentType: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  chamadoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chamado' },
  createdAt: { type: Date, default: Date.now }
});
const Image = mongoose.model('Image', imageSchema);

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  cpf: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userType: { type: String, enum: ['colaborador', 'administrador'], required: true },
  avatar: { type: mongoose.Schema.Types.ObjectId, ref: 'Image' },
  phone: { type: String, default: '' },
  department: { type: String, default: 'Tecnologia da Informação' },
  bio: { type: String, default: '' },
  settings: {
    theme: { type: String, default: 'light' },
    language: { type: String, default: 'pt-br' },
  },
  privacySettings: {
    profileVisibility: { type: String, default: 'all' },
    showEmail: { type: Boolean, default: true },
    showPhone: { type: Boolean, default: false },
    showDepartment: { type: Boolean, default: true },
    showActivity: { type: Boolean, default: true },
    showTickets: { type: Boolean, default: true }
  },
  twoFAEnabled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

const mensagemSchema = new mongoose.Schema({
  texto: { type: String, required: true },
  criador: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  data: { type: Date, default: Date.now },
});

const chamadoSchema = new mongoose.Schema({
  titulo: String,
  descricao: String,
  localizacao: {
    type: { type: String, enum: ['predefined', 'gps'], required: true },
    value: String,
    coordinates: {
      latitude: Number,
      longitude: Number,
      accuracy: Number
    }
  },
  fotoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Image' }, 

  criador: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pendente', 'em_andamento', 'concluido'], default: 'pendente' },
  createdAt: { type: Date, default: Date.now },
  mensagens: [mensagemSchema]
});
const Chamado = mongoose.model('Chamado', chamadoSchema);

const supportConversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  messages: [{
    text: String,
    sender: { type: String, enum: ['user', 'bot'], required: true },
    timestamp: { type: Date, default: Date.now },
    intent: String,
    resolved: { type: Boolean, default: false }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });
const SupportConversation = mongoose.model('SupportConversation', supportConversationSchema);

const servicoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  empresa: { type: String, required: true },
  descricao: { type: String, required: true },
  mensal: { type: Number, required: true },
  anual: { type: Number, required: true },
  categorias: { type: [String], required: true },
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  badge: { type: String }
});
const Servico = mongoose.model('Servico', servicoSchema);

const pedidoSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  servicos: [{
    servico: { type: mongoose.Schema.Types.Mixed },
    frequencia: { type: String, enum: ['mensal', 'anual'], required: true },
    valor: { type: Number, required: true }
  }],
  total: { type: Number, required: true },
  metodoPagamento: { type: String, required: true },
  status: { type: String, enum: ['pendente', 'pago', 'cancelado'], default: 'pendente' },
  dataPedido: { type: Date, default: Date.now },
  boleto: {
    codigo: { type: String },
    vencimento: { type: Date },
    url: { type: String }
  },
  pix: {
    key: { type: String },
    expirationDate: { type: Date },
    qrCode: { type: String }
  }
});
const Pedido = mongoose.model('Pedido', pedidoSchema);

const cardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cardNumber: { type: String, required: true },
  lastFour: { type: String, required: true },
  holderName: { type: String, required: true },
  expiryDate: { type: String, required: true },
  brand: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Card = mongoose.model('Card', cardSchema);

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log(`Acesso não autorizado: Token não fornecido - ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ message: 'Token de autenticação não fornecido.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log(`Token inválido: ${err.message} - ${req.method} ${req.originalUrl}`);
      return res.status(403).json({ message: 'Token inválido ou expirado.' });
    }
    req.user = user;
    next();
  });
}

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas!'), false);
    }
  }
});

app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'online', 
    message: 'Servidor funcionando corretamente',
    mongodb: mongoose.connection.readyState === 1 ? 'conectado' : 'desconectado',
    timestamp: new Date().toISOString()
  });
});

app.get('/image/:id', async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image || !image.data) {
      return res.status(404).send('Imagem não encontrada');
    }
    res.contentType(image.contentType);
    res.send(image.data);
  } catch (error) {
    console.error('Erro ao buscar imagem:', error);
    res.status(500).send('Erro ao recuperar imagem');
  }
});

// Autenticação
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
  }
  
  try {
    console.log(`Tentativa de login: ${email}`);
    const user = await User.findOne({ email, password });
    if (!user) {
      console.log(`Login falhou para: ${email} - Credenciais inválidas`);
      return res.status(400).json({ message: 'Falha no login. Verifique suas credenciais.' });
    }
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
    console.log(`Login bem-sucedido: ${email}`);
    res.status(200).json({ message: 'Login efetuado com sucesso!', token, user });
  } catch (error) {
    console.error(`Erro no login para ${email}:`, error);
    res.status(500).json({ message: 'Erro ao fazer login: ' + error.message });
  }
});

app.post('/signup', async (req, res) => {
  const { email, name, cpf, password, userType } = req.body;
  
  if (!email || !name || !cpf || !password) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
  }
  
  try {
    console.log(`Tentativa de cadastro: ${email}`);
    const existingUser = await User.findOne({ $or: [{ email }, { cpf }] });
    if (existingUser) {
      console.log(`Cadastro falhou para: ${email} - Email ou CPF já existente`);
      return res.status(400).json({ message: 'Email ou CPF já cadastrado!' });
    }
    const newUser = new User({ 
      email, 
      name, 
      cpf, 
      password, 
      userType: userType || 'colaborador' 
    });
    await newUser.save();
    console.log(`Cadastro bem-sucedido: ${email}`);
    res.status(201).json({ message: 'Cadastro efetuado com sucesso!' });
  } catch (error) {
    console.error(`Erro no cadastro para ${email}:`, error);
    res.status(500).json({ message: 'Erro ao cadastrar usuário: ' + error.message });
  }
});

// Chamados
app.post('/abrir-chamado', authenticateToken, async (req, res) => {
  const { titulo, descricao, localizacao, foto } = req.body;
  const criador = req.user.userId;

  if (!titulo || !descricao || !localizacao) {
    return res.status(400).json({ message: 'Título, descrição e localização são obrigatórios.' });
  }

  try {
    console.log(`Novo chamado sendo criado por: ${criador}`);
    let fotoUrl = null;
    let fotoId = null;

    if (foto) {
      if (foto.startsWith('data:image')) {
        const matches = foto.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          return res.status(400).json({ message: 'Formato de imagem inválido.' });
        }

        const contentType = matches[1];
        const imageBuffer = Buffer.from(matches[2], 'base64');
        
        const newImage = new Image({
          data: imageBuffer,
          contentType: contentType,
          userId: criador
        });
        
        const savedImage = await newImage.save();
        fotoId = savedImage._id;
        console.log(`Imagem salva para o chamado: ${fotoId}`);
      } else if (foto.startsWith('/uploads/')) {
        fotoUrl = foto;
      }
    }

    const novoChamado = new Chamado({
      titulo,
      descricao,
      localizacao,
      foto: fotoUrl,
      fotoId: fotoId,
      criador,
    });

    await novoChamado.save();
    console.log(`Chamado criado com sucesso: ${novoChamado._id}`);
    res.status(201).json({ 
      message: 'Chamado aberto com sucesso!', 
      chamado: {
        ...novoChamado.toObject(),
        foto: fotoId ? `/image/${fotoId}` : fotoUrl
      }
    });
  } catch (error) {
    console.error('Erro ao abrir chamado:', error);
    res.status(500).json({ message: 'Erro ao abrir o chamado: ' + error.message });
  }
});

app.get('/buscar-chamados', async (req, res) => {
  try {
    console.log('Buscando todos os chamados');
    const chamados = await Chamado.find()
      .populate('criador', 'name')
      .populate('fotoId')
      .sort({ createdAt: -1 });

    const chamadosFormatados = chamados.map(chamado => {
      let foto = chamado.foto;
      if (!foto && chamado.fotoId) {
        foto = `/image/${chamado.fotoId._id}`;
      }

      return {
        ...chamado.toObject(),
        foto: foto
      };
    });

    console.log(`${chamadosFormatados.length} chamados encontrados`);
    res.status(200).json(chamadosFormatados);
  } catch (error) {
    console.error('Erro ao buscar chamados:', error);
    res.status(500).json({ message: 'Erro ao buscar chamados: ' + error.message });
  }
});

app.get('/buscar-chamados-com-mensagens', async (req, res) => {
  try {
    console.log('Buscando chamados com mensagens');
    const chamados = await Chamado.find()
      .populate('criador', 'name')
      .populate('mensagens.criador', 'name')
      .populate('fotoId');

    const chamadosFormatados = chamados.map(chamado => {
      let foto = chamado.foto;
      if (!foto && chamado.fotoId) {
        foto = `/image/${chamado.fotoId._id}`;
      }

      return {
        ...chamado.toObject(),
        foto: foto
      };
    });

    console.log(`${chamadosFormatados.length} chamados com mensagens encontrados`);
    res.status(200).json(chamadosFormatados);
  } catch (error) {
    console.error('Erro ao buscar chamados com mensagens:', error);
    res.status(500).json({ message: 'Erro ao buscar chamados com mensagens: ' + error.message });
  }
});

app.put('/atualizar-status/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status || !['pendente', 'em_andamento', 'concluido'].includes(status)) {
    return res.status(400).json({ message: 'Status inválido.' });
  }
  
  try {
    console.log(`Atualizando status do chamado ${id} para ${status}`);
    const chamado = await Chamado.findByIdAndUpdate(id, { status }, { new: true });
    if (!chamado) {
      console.log(`Chamado não encontrado: ${id}`);
      return res.status(404).json({ message: 'Chamado não encontrado.' });
    }
    console.log(`Status do chamado ${id} atualizado com sucesso`);
    res.status(200).json(chamado);
  } catch (error) {
    console.error(`Erro ao atualizar status do chamado ${id}:`, error);
    res.status(500).json({ message: 'Erro ao atualizar status: ' + error.message });
  }
});

app.get('/contar-chamados', async (req, res) => {
  try {
    console.log('Contando chamados por status');
    const totalChamados = await Chamado.countDocuments();
    const emAndamento = await Chamado.countDocuments({ status: 'em_andamento' });
    const pendentes = await Chamado.countDocuments({ status: 'pendente' });
    const concluidos = await Chamado.countDocuments({ status: 'concluido' });
    
    console.log(`Total: ${totalChamados}, Em andamento: ${emAndamento}, Pendentes: ${pendentes}, Concluídos: ${concluidos}`);
    res.status(200).json({ totalChamados, emAndamento, pendentes, concluidos });
  } catch (error) {
    console.error('Erro ao contar chamados:', error);
    res.status(500).json({ message: 'Erro ao contar chamados: ' + error.message });
  }
});

// Usuários
app.post('/api/upload-avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    console.log(`Upload de avatar para usuário ${req.user.userId}`);
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    }

    const newImage = new Image({
      data: req.file.buffer,
      contentType: req.file.mimetype,
      userId: req.user.userId
    });

    const savedImage = await newImage.save();
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { avatar: savedImage._id },
      { new: true }
    );

    console.log(`Avatar atualizado com sucesso para usuário ${req.user.userId}`);
    res.json({
      success: true,
      avatarUrl: `/image/${savedImage._id}`,
      user: user,
      message: 'Avatar atualizado com sucesso!'
    });
  } catch (error) {
    console.error(`Erro no upload do avatar para usuário ${req.user.userId}:`, error);
    res.status(500).json({ 
      success: false,
      message: 'Erro ao atualizar avatar: ' + error.message 
    });
  }
});

app.get('/api/user-profile', authenticateToken, async (req, res) => {
  try {
    console.log(`Buscando perfil do usuário ${req.user.userId}`);
    const user = await User.findById(req.user.userId)
      .select('-password -__v')
      .populate('avatar');
    
    if (!user) {
      console.log(`Usuário não encontrado: ${req.user.userId}`);
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    const userWithAvatarUrl = {
      ...user.toObject(),
      avatarUrl: user.avatar ? `/image/${user.avatar._id}` : null
    };
    
    console.log(`Perfil do usuário ${req.user.userId} retornado com sucesso`);
    res.json(userWithAvatarUrl);
  } catch (error) {
    console.error(`Erro ao buscar perfil do usuário ${req.user.userId}:`, error);
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/update-profile', authenticateToken, async (req, res) => {
  try {
    console.log(`Atualizando perfil do usuário ${req.user.userId}`);
    const { name, email, phone, department, bio } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name, email, phone, department, bio },
      { new: true, select: '-password -__v' }
    );
    
    if (!user) {
      console.log(`Usuário não encontrado: ${req.user.userId}`);
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    console.log(`Perfil do usuário ${req.user.userId} atualizado com sucesso`);
    res.json(user);
  } catch (error) {
    console.error(`Erro ao atualizar perfil do usuário ${req.user.userId}:`, error);
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/change-password', authenticateToken, async (req, res) => {
  try {
    console.log(`Alteração de senha para usuário ${req.user.userId}`);
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Senha atual e nova senha são obrigatórias.' });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      console.log(`Usuário não encontrado: ${req.user.userId}`);
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    if (user.password !== currentPassword) {
      console.log(`Senha atual incorreta para usuário ${req.user.userId}`);
      return res.status(400).json({ message: 'Senha atual incorreta' });
    }
    
    user.password = newPassword;
    await user.save();
    
    console.log(`Senha alterada com sucesso para usuário ${req.user.userId}`);
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error(`Erro ao alterar senha do usuário ${req.user.userId}:`, error);
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/toggle-2fa', authenticateToken, async (req, res) => {
  try {
    console.log(`Alterando status 2FA para usuário ${req.user.userId}`);
    const user = await User.findById(req.user.userId);
    if (!user) {
      console.log(`Usuário não encontrado: ${req.user.userId}`);
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    user.twoFAEnabled = !user.twoFAEnabled;
    await user.save();
    
    console.log(`Status 2FA alterado para ${user.twoFAEnabled ? 'ativado' : 'desativado'} para usuário ${req.user.userId}`);
    res.json({ enabled: user.twoFAEnabled });
  } catch (error) {
    console.error(`Erro ao alterar status 2FA do usuário ${req.user.userId}:`, error);
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/user-cards', authenticateToken, async (req, res) => {
  try {
    console.log(`Buscando cartões do usuário ${req.user.userId}`);
    const cards = await Card.find({ userId: req.user.userId });
    console.log(`${cards.length} cartões encontrados para usuário ${req.user.userId}`);
    res.json(cards);
  } catch (error) {
    console.error(`Erro ao buscar cartões do usuário ${req.user.userId}:`, error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/add-card', authenticateToken, async (req, res) => {
  try {
    console.log(`Adicionando cartão para usuário ${req.user.userId}`);
    const { cardNumber, cardHolderName, cardExpiryDate, cardCVV } = req.body;
    
    if (!cardNumber || !cardHolderName || !cardExpiryDate) {
      return res.status(400).json({ message: 'Todos os campos do cartão são obrigatórios.' });
    }
    
    let brand = 'other';
    if (/^4/.test(cardNumber)) {
      brand = 'visa';
    } else if (/^5[1-5]/.test(cardNumber)) {
      brand = 'mastercard';
    } else if (/^3[47]/.test(cardNumber)) {
      brand = 'amex';
    }
    
    const newCard = new Card({
      userId: req.user.userId,
      cardNumber,
      lastFour: cardNumber.slice(-4),
      holderName: cardHolderName,
      expiryDate: cardExpiryDate,
      brand
    });
    
    await newCard.save();
    console.log(`Cartão adicionado com sucesso para usuário ${req.user.userId}`);
    res.status(201).json(newCard);
  } catch (error) {
    console.error(`Erro ao adicionar cartão para usuário ${req.user.userId}:`, error);
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/delete-card/:id', authenticateToken, async (req, res) => {
  try {
    console.log(`Removendo cartão ${req.params.id} para usuário ${req.user.userId}`);
    const card = await Card.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });
    
    if (!card) {
      console.log(`Cartão ${req.params.id} não encontrado para usuário ${req.user.userId}`);
      return res.status(404).json({ message: 'Cartão não encontrado' });
    }
    
    console.log(`Cartão ${req.params.id} removido com sucesso para usuário ${req.user.userId}`);
    res.json({ message: 'Cartão removido com sucesso' });
  } catch (error) {
    console.error(`Erro ao remover cartão ${req.params.id} para usuário ${req.user.userId}:`, error);
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/user-tickets', authenticateToken, async (req, res) => {
  try {
    console.log(`Buscando tickets do usuário ${req.user.userId}`);
    const tickets = await Chamado.find({ criador: req.user.userId })
      .populate('fotoId')
      .sort({ createdAt: -1 });

    const ticketsFormatados = tickets.map(ticket => {
      let foto = ticket.foto;
      if (!foto && ticket.fotoId) {
        foto = `/image/${ticket.fotoId._id}`;
      }

      return {
        ...ticket.toObject(),
        foto: foto
      };
    });

    console.log(`${ticketsFormatados.length} tickets encontrados para usuário ${req.user.userId}`);
    res.json(ticketsFormatados);
  } catch (error) {
    console.error(`Erro ao buscar tickets do usuário ${req.user.userId}:`, error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/privacy-settings', authenticateToken, async (req, res) => {
  try {
    console.log(`Atualizando configurações de privacidade para usuário ${req.user.userId}`);
    const {
      profileVisibility,
      showEmail,
      showPhone,
      showDepartment,
      showActivity,
      showTickets
    } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        privacySettings: {
          profileVisibility,
          showEmail,
          showPhone,
          showDepartment,
          showActivity,
          showTickets
        }
      },
      { new: true }
    );
    
    console.log(`Configurações de privacidade atualizadas com sucesso para usuário ${req.user.userId}`);
    res.json(user.privacySettings);
  } catch (error) {
    console.error(`Erro ao atualizar configurações de privacidade para usuário ${req.user.userId}:`, error);
    res.status(400).json({ message: error.message });
  }
});

const supportKnowledgeBase = {
  senha: {
    responses: [
      "Para redefinir sua senha, você pode usar a opção 'Esqueci minha senha' na tela de login ou atualizar diretamente no seu perfil.",
      "Problemas com senha? Você pode redefinir sua senha a qualquer momento através do seu perfil ou na tela de login."
    ],
    solutions: [
      "Redefinir senha",
      "Verificar requisitos de senha",
      "Contatar administrador"
    ]
  },
  cartao: {
    responses: [
      "Você pode gerenciar seus cartões na seção 'Métodos de Pagamento' do seu perfil.",
      "Para adicionar um novo cartão, acesse seu perfil e vá para 'Métodos de Pagamento'."
    ],
    solutions: [
      "Adicionar novo cartão",
      "Remover cartão existente",
      "Definir cartão padrão"
    ]
  },
  dados: {
    responses: [
      "Seus dados pessoais podem ser atualizados a qualquer momento na seção 'Meu Perfil'.",
      "Para atualizar suas informações, acesse 'Meu Perfil' e clique em 'Editar'."
    ],
    solutions: [
      "Atualizar perfil",
      "Configurar privacidade",
      "Verificar dados cadastrais"
    ]
  },
  sistema: {
    responses: [
      "Se o sistema estiver lento, tente limpar o cache do navegador ou reiniciar a aplicação.",
      "Problemas técnicos? Verifique sua conexão com a internet e tente novamente em alguns minutos."
    ],
    solutions: [
      "Limpar cache do navegador",
      "Verificar conexão",
      "Abrir chamado técnico"
    ]
  }
};

app.post('/api/support', authenticateToken, async (req, res) => {
  try {
    console.log(`Nova mensagem de suporte do usuário ${req.user.userId}`);
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: 'Mensagem é obrigatória.' });
    }
    
    const userId = req.user.userId;

    const intent = classifySupportIntent(message);
    const knowledge = supportKnowledgeBase[intent] || supportKnowledgeBase['sistema'];
    const response = knowledge.responses[Math.floor(Math.random() * knowledge.responses.length)];
    
    console.log(`Intent identificada: ${intent}`);
    saveSupportConversation(userId, message, response, intent);

    console.log(`Resposta enviada para usuário ${req.user.userId}`);
    res.json({
      response: response,
      solutions: knowledge.solutions,
      intent: intent
    });

  } catch (error) {
    console.error(`Erro no suporte para usuário ${req.user.userId}:`, error);
    res.status(500).json({ 
      response: "Desculpe, ocorreu um erro no sistema de suporte. Por favor, tente novamente mais tarde.",
      solutions: [],
      intent: "erro"
    });
  }
});

function classifySupportIntent(message) {
  const lowerMsg = message.toLowerCase();
  
  if (/senha|acesso|login/.test(lowerMsg)) return 'senha';
  if (/cartão|cartao/.test(lowerMsg)) return 'cartao';
  if (/dados|informação|informacao|cadastro/.test(lowerMsg)) return 'dados';
  if (/sistema|lento|travando|erro|bug/.test(lowerMsg)) return 'sistema';
  
  return 'sistema';
}

async function saveSupportConversation(userId, userMessage, botResponse, intent) {
  try {
    await SupportConversation.findOneAndUpdate(
      { userId },
      {
        $push: {
          messages: [
            { text: userMessage, sender: 'user', intent },
            { text: botResponse, sender: 'bot', intent }
          ]
        }
      },
      { upsert: true, new: true }
    );
    console.log(`Conversa de suporte salva para usuário ${userId}`);
  } catch (error) {
    console.error(`Erro ao salvar conversa de suporte para usuário ${userId}:`, error);
  }
}

app.get('/api/support/history', authenticateToken, async (req, res) => {
  try {
    console.log(`Buscando histórico de suporte para usuário ${req.user.userId}`);
    const conversations = await SupportConversation.find({ userId: req.user.userId })
      .sort({ updatedAt: -1 })
      .limit(5);
    
    console.log(`${conversations.length} conversas encontradas para usuário ${req.user.userId}`);
    res.json(conversations);
  } catch (error) {
    console.error(`Erro ao buscar histórico de suporte para usuário ${req.user.userId}:`, error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/confirm-payment', authenticateToken, async (req, res) => {
  try {
    console.log(`Confirmação de pagamento para usuário ${req.user.userId}`);
    const { orderId, paymentMethod, cardId, installments } = req.body;
    
    if (!orderId || !paymentMethod) {
      return res.status(400).json({ message: 'Dados de pagamento incompletos' });
    }
    const pedido = await Pedido.findById(orderId);
    if (!pedido) {
      console.log(`Pedido não encontrado: ${orderId}`);
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    if (pedido.usuario.toString() !== req.user.userId) {
      console.log(`Acesso não autorizado ao pedido ${orderId} pelo usuário ${req.user.userId}`);
      return res.status(403).json({ message: 'Acesso não autorizado' });
    }

    if (paymentMethod === 'card') {
      if (cardId) {
        const card = await Card.findOne({ _id: cardId, userId: req.user.userId });
        if (!card) {
          console.log(`Cartão não encontrado: ${cardId}`);
          return res.status(400).json({ message: 'Cartão não encontrado' });
        }
      }
      pedido.status = 'pago';
      pedido.metodoPagamento = 'Cartão de Crédito';
      
    } else if (paymentMethod === 'boleto') {
      pedido.status = 'pendente';
      pedido.metodoPagamento = 'Boleto Bancário';
      
    } else if (paymentMethod === 'pix') {
      pedido.status = 'pago';
      pedido.metodoPagamento = 'PIX';
      pedido.pix = {
        key: '123e4567-e89b-12d3-a456-426614174000',
        expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        qrCode: `00020101021226860014br.gov.bcb.pix2561qrcodepix.gerencianet.com.br/123456789520400005303986540520.005802BR5925EMPRESA DE EXEMPLO6008BRASILIA62070503***6304`
      };
    }

    await pedido.save();
    console.log(`Pagamento confirmado com sucesso para pedido ${orderId}`);

    res.json({
      success: true,
      order: pedido,
      message: 'Pagamento confirmado com sucesso'
    });

  } catch (error) {
    console.error(`Erro ao confirmar pagamento para usuário ${req.user.userId}:`, error);
    res.status(500).json({ 
      success: false,
      message: 'Erro ao processar pagamento: ' + error.message 
    });
  }
});


// Rota para lidar com endpoints API não encontrados


app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    console.log(`Acesso à lista de usuários por ${req.user.userId}`);
    const user = await User.findById(req.user.userId);
    if (!user || user.userType !== 'administrador') {
      console.log(`Acesso não autorizado à lista de usuários por ${req.user.userId}`);
      return res.status(403).json({ message: 'Acesso não autorizado' });
    }

    const users = await User.find({})
      .select('-password -__v -twoFAEnabled -privacySettings')
      .populate('avatar');

    console.log(`${users.length} usuários encontrados`);
    res.json(users);
  } catch (error) {
    console.error(`Erro ao buscar usuários por ${req.user.userId}:`, error);
    res.status(500).json({ message: 'Erro ao buscar usuários' });
  }
});

app.post('/reset-password', async (req, res) => {
  const { cpf, newPassword } = req.body;

  if (!cpf || !newPassword) {
    return res.status(400).json({ message: 'CPF e nova senha são obrigatórios.' });
  }

  try {
    console.log(`Tentativa de redefinição de senha para CPF: ${cpf}`);
    const user = await User.findOne({ cpf });
    if (user) {
      user.password = newPassword;
      await user.save();
      console.log(`Senha redefinida com sucesso para CPF: ${cpf}`);
      res.status(200).json({ message: 'Senha redefinida com sucesso!' });
    } else {
      console.log(`CPF não encontrado: ${cpf}`);
      res.status(404).json({ message: 'CPF não encontrado.' });
    }
  } catch (error) {
    console.error(`Erro ao redefinir senha para CPF ${cpf}:`, error);
    res.status(500).json({ message: 'Erro ao redefinir senha: ' + error.message });
  }
});

app.post('/api/pedidos', authenticateToken, async (req, res) => {
    try {
        const { servicos, metodoPagamento, status } = req.body;
        const userId = req.user.userId;

        // Calcular total
        const total = servicos.reduce((sum, item) => sum + item.valor, 0);

        const novoPedido = new Pedido({
            usuario: userId,
            servicos,
            total,
            metodoPagamento,
            status
        });

        await novoPedido.save();
        res.status(201).json(novoPedido);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});




// Rotas para Serviços
app.get('/api/servicos', authenticateToken, async (req, res) => {
    try {
        const servicos = await Servico.find();
        res.json(servicos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Rota para buscar um pedido específico
app.get('/api/pedidos/:id', authenticateToken, async (req, res) => {
  try {
    console.log(`Buscando pedido ${req.params.id}`);
    const pedido = await Pedido.findById(req.params.id)
      .populate('usuario', 'name email cpf')
      .populate('servicos.servico');
    
    if (!pedido) {
      console.log(`Pedido não encontrado: ${req.params.id}`);
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    // Verifica se o usuário tem permissão para ver este pedido
    if (pedido.usuario._id.toString() !== req.user.userId) {
      console.log(`Acesso não autorizado ao pedido ${req.params.id} pelo usuário ${req.user.userId}`);
      return res.status(403).json({ message: 'Acesso não autorizado' });
    }

    console.log(`Pedido ${req.params.id} encontrado`);
    res.json(pedido);
  } catch (error) {
    console.error(`Erro ao buscar pedido ${req.params.id}:`, error);
    res.status(500).json({ message: 'Erro ao buscar pedido: ' + error.message });
  }
});

// Rota para buscar os pedidos de um usuário (para a página de serviços contratados)
app.get('/api/meus-pedidos', authenticateToken, async (req, res) => {
  try {
    console.log(`Buscando pedidos do usuário ${req.user.userId}`);
    const pedidos = await Pedido.find({ usuario: req.user.userId })
      .populate('servicos.servico')
      .sort({ dataPedido: -1 });
    
    console.log(`${pedidos.length} pedidos encontrados para o usuário ${req.user.userId}`);
    res.json(pedidos);
  } catch (error) {
    console.error(`Erro ao buscar pedidos do usuário ${req.user.userId}:`, error);
    res.status(500).json({ message: 'Erro ao buscar pedidos: ' + error.message });
  }
});

// Rota para confirmar pagamento (já existe no seu server.js)
// app.post('/api/confirm-payment', authenticateToken, async (req, res) => { ... });

// Rota para gerar comprovante de pagamento
app.get('/api/comprovante/:pedidoId', authenticateToken, async (req, res) => {
  try {
    console.log(`Gerando comprovante para pedido ${req.params.pedidoId}`);
    const pedido = await Pedido.findById(req.params.pedidoId)
      .populate('usuario', 'name email cpf')
      .populate('servicos.servico');
    
    if (!pedido) {
      console.log(`Pedido não encontrado: ${req.params.pedidoId}`);
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    // Verifica se o usuário tem permissão para ver este pedido
    if (pedido.usuario._id.toString() !== req.user.userId) {
      console.log(`Acesso não autorizado ao pedido ${req.params.pedidoId} pelo usuário ${req.user.userId}`);
      return res.status(403).json({ message: 'Acesso não autorizado' });
    }

    // Aqui você pode implementar a geração do PDF no servidor se preferir
    // Por enquanto, apenas retornamos os dados do pedido
    console.log(`Comprovante gerado para pedido ${req.params.pedidoId}`);
    res.json({
      success: true,
      pedido: pedido,
      message: 'Dados para geração do comprovante'
    });
  } catch (error) {
    console.error(`Erro ao gerar comprovante para pedido ${req.params.pedidoId}:`, error);
    res.status(500).json({ message: 'Erro ao gerar comprovante: ' + error.message });
  }
});




app.get('/api/chamados/:id/mensagens', authenticateToken, async (req, res) => {
    try {
        const chamado = await Chamado.findById(req.params.id)
            .populate('criador', 'name')
            .populate('mensagens.criador', 'name')
            .populate('fotoId');

        if (!chamado) {
            return res.status(404).json({ message: 'Chamado não encontrado.' });
        }

        res.status(200).json(chamado);
    } catch (error) {
        console.error('Erro ao buscar chamado:', error);
        res.status(500).json({ message: 'Erro ao buscar chamado: ' + error.message });
    }
});


// Buscar um chamado específico com suas mensagens
app.get('/buscar-chamados-com-mensagens/:id', authenticateToken, async (req, res) => {
    try {
        console.log(`Buscando chamado ${req.params.id} com mensagens`);
        const chamado = await Chamado.findById(req.params.id)
            .populate('criador', 'name email')
            .populate('mensagens.criador', 'name email')
            .populate('fotoId');

        if (!chamado) {
            console.log(`Chamado não encontrado: ${req.params.id}`);
            return res.status(404).json({ message: 'Chamado não encontrado.' });
        }

        // Formatar a resposta
        const chamadoFormatado = {
            ...chamado.toObject(),
            foto: chamado.fotoId ? `/image/${chamado.fotoId._id}` : chamado.foto
        };

        console.log(`Chamado ${req.params.id} encontrado com ${chamado.mensagens.length} mensagens`);
        res.status(200).json(chamadoFormatado);
    } catch (error) {
        console.error(`Erro ao buscar chamado ${req.params.id}:`, error);
        res.status(500).json({ 
            message: 'Erro ao buscar chamado',
            error: error.message 
        });
    }
});


// Adicionar mensagem a um chamado
app.post('/adicionar-mensagem/:id', authenticateToken, async (req, res) => {
    try {
        const { texto } = req.body;
        const userId = req.user.userId;
        
        if (!texto) {
            return res.status(400).json({ message: 'O texto da mensagem é obrigatório.' });
        }

        const chamado = await Chamado.findByIdAndUpdate(
            req.params.id,
            {
                $push: {
                    mensagens: {
                        texto,
                        criador: userId
                    }
                }
            },
            { new: true }
        ).populate('mensagens.criador', 'name email');

        if (!chamado) {
            return res.status(404).json({ message: 'Chamado não encontrado.' });
        }

        const novaMensagem = chamado.mensagens[chamado.mensagens.length - 1];
        
        res.status(201).json({
            message: 'Mensagem adicionada com sucesso!',
            mensagem: novaMensagem
        });
    } catch (error) {
        console.error('Erro ao adicionar mensagem:', error);
        res.status(500).json({ message: 'Erro ao adicionar mensagem: ' + error.message });
    }
});

app.get('/suporte', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'SuporteUsuario.html'));
});

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat-assistente.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'TelaInicio.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'TelaInicio.html'));
});

app.use((err, req, res, next) => {
  console.error('Erro interno:', err.stack);
  res.status(500).json({ 
    message: 'Erro interno do servidor.', 
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});


app.use('/api', (req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Endpoint da API não encontrado' 
  });
});
// Middleware para log de requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Middleware para erro 404 API
app.use('/api', (req, res, next) => {
  res.status(404).json({ 
    success: false,
    message: 'Endpoint da API não encontrado' 
  });
});

// Middleware para erro 500
app.use((err, req, res, next) => {
  console.error('Erro interno:', err.stack);
  res.status(500).json({ 
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`MongoDB: ${mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'}`);
  console.log(`Diretório público: ${path.join(__dirname, 'public')}`);
});

process.on('SIGINT', () => {
  console.log('Encerrando servidor...');
  mongoose.connection.close(() => {
    console.log('Conexão com MongoDB fechada');
    process.exit(0);
  });
});
