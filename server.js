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

// Configurações iniciais
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Conexão com o MongoDB
const uri = process.env.MONGODB_URI;
mongoose.connect(uri)
  .then(() => console.log('Conectado ao MongoDB Atlas'))
  .catch(err => console.error('Erro ao conectar ao MongoDB Atlas:', err));

app.use(express.static(path.join(__dirname, 'public')));

// =============================================
// SCHEMAS DO BANCO DE DADOS
// =============================================

// Schema para armazenar imagens
const imageSchema = new mongoose.Schema({
  data: Buffer,
  contentType: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  chamadoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chamado' },
  createdAt: { type: Date, default: Date.now }
});
const Image = mongoose.model('Image', imageSchema);

// Schema de Usuário
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

// Schema de Mensagem
const mensagemSchema = new mongoose.Schema({
  texto: { type: String, required: true },
  criador: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  data: { type: Date, default: Date.now },
});

// Schema de Chamado
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
  foto: String, // Mantido para compatibilidade
  fotoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Image' }, // Nova referência
  criador: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pendente', 'em_andamento', 'concluido'], default: 'pendente' },
  createdAt: { type: Date, default: Date.now },
  mensagens: [mensagemSchema]
});
const Chamado = mongoose.model('Chamado', chamadoSchema);

// Schema de Conversa de Suporte
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

// Schema de Serviço
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

// Schema de Pedido
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

// Schema de Cartão
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

// =============================================
// MIDDLEWARES
// =============================================

// Middleware de autenticação
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token de autenticação não fornecido.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido ou expirado.' });
    }
    req.user = user;
    next();
  });
}

// Configuração do Multer para upload de arquivos
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas!'), false);
    }
  }
});

// =============================================
// ENDPOINTS
// =============================================

// Endpoint para servir imagens
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
  try {
    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(400).json({ message: 'Falha no login. Verifique suas credenciais.' });
    }
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ message: 'Login efetuado com sucesso!', token, user });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao fazer login: ' + error.message });
  }
});

app.post('/signup', async (req, res) => {
  const { email, name, cpf, password, userType } = req.body;
  try {
    const existingUser = await User.findOne({ $or: [{ email }, { cpf }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Email ou CPF já cadastrado!' });
    }
    const newUser = new User({ email, name, cpf, password, userType });
    await newUser.save();
    res.status(201).json({ message: 'Cadastro efetuado com sucesso!' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao cadastrar usuário: ' + error.message });
  }
});

// Chamados
app.post('/abrir-chamado', authenticateToken, async (req, res) => {
  const { titulo, descricao, localizacao, foto } = req.body;
  const criador = req.user.userId;

  try {
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

    res.status(200).json(chamadosFormatados);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar chamados: ' + error.message });
  }
});

app.get('/buscar-chamados-com-mensagens', async (req, res) => {
  try {
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

    res.status(200).json(chamadosFormatados);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar chamados com mensagens: ' + error.message });
  }
});

app.put('/atualizar-status/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const chamado = await Chamado.findByIdAndUpdate(id, { status }, { new: true });
    if (!chamado) {
      return res.status(404).json({ message: 'Chamado não encontrado.' });
    }
    res.status(200).json(chamado);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar status: ' + error.message });
  }
});

app.get('/contar-chamados', async (req, res) => {
  try {
    const totalChamados = await Chamado.countDocuments();
    const emAndamento = await Chamado.countDocuments({ status: 'em_andamento' });
    const pendentes = await Chamado.countDocuments({ status: 'pendente' });
    const concluidos = await Chamado.countDocuments({ status: 'concluido' });
    res.status(200).json({ totalChamados, emAndamento, pendentes, concluidos });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao contar chamados: ' + error.message });
  }
});

// Usuários
app.post('/api/upload-avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
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

    res.json({
      success: true,
      avatarUrl: `/image/${savedImage._id}`,
      user: user,
      message: 'Avatar atualizado com sucesso!'
    });
  } catch (error) {
    console.error('Erro no upload do avatar:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erro ao atualizar avatar: ' + error.message 
    });
  }
});

app.get('/api/user-profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password -__v')
      .populate('avatar');
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    const userWithAvatarUrl = {
      ...user.toObject(),
      avatarUrl: user.avatar ? `/image/${user.avatar._id}` : null
    };
    
    res.json(userWithAvatarUrl);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/update-profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, department, bio } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name, email, phone, department, bio },
      { new: true, select: '-password -__v' }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    if (user.password !== currentPassword) {
      return res.status(400).json({ message: 'Senha atual incorreta' });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/toggle-2fa', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    user.twoFAEnabled = !user.twoFAEnabled;
    await user.save();
    
    res.json({ enabled: user.twoFAEnabled });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Cartões
app.get('/api/user-cards', authenticateToken, async (req, res) => {
  try {
    const cards = await Card.find({ userId: req.user.userId });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/add-card', authenticateToken, async (req, res) => {
  try {
    const { cardNumber, cardHolderName, cardExpiryDate, cardCVV } = req.body;
    
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
    res.status(201).json(newCard);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/delete-card/:id', authenticateToken, async (req, res) => {
  try {
    const card = await Card.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });
    
    if (!card) {
      return res.status(404).json({ message: 'Cartão não encontrado' });
    }
    
    res.json({ message: 'Cartão removido com sucesso' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Tickets do usuário
app.get('/api/user-tickets', authenticateToken, async (req, res) => {
  try {
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

    res.json(ticketsFormatados);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Configurações de privacidade
app.post('/api/privacy-settings', authenticateToken, async (req, res) => {
  try {
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
    
    res.json(user.privacySettings);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Suporte
app.post('/api/support', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.userId;

    const intent = classifySupportIntent(message);
    const knowledge = supportKnowledgeBase[intent] || supportKnowledgeBase['sistema'];
    const response = knowledge.responses[Math.floor(Math.random() * knowledge.responses.length)];
    
    saveSupportConversation(userId, message, response, intent);

    res.json({
      response: response,
      solutions: knowledge.solutions,
      intent: intent
    });

  } catch (error) {
    console.error('Erro no suporte:', error);
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
  } catch (error) {
    console.error('Erro ao salvar conversa de suporte:', error);
  }
}

app.get('/api/support/history', authenticateToken, async (req, res) => {
  try {
    const conversations = await SupportConversation.find({ userId: req.user.userId })
      .sort({ updatedAt: -1 })
      .limit(5);
    
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Pagamentos
app.post('/api/confirm-payment', authenticateToken, async (req, res) => {
  try {
    const { orderId, paymentMethod, cardId, installments } = req.body;
    
    if (!orderId || !paymentMethod) {
      return res.status(400).json({ message: 'Dados de pagamento incompletos' });
    }
    const pedido = await Pedido.findById(orderId);
    if (!pedido) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    if (pedido.usuario.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Acesso não autorizado' });
    }

    if (paymentMethod === 'card') {
      if (cardId) {
        const card = await Card.findOne({ _id: cardId, userId: req.user.userId });
        if (!card) {
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

    res.json({
      success: true,
      order: pedido,
      message: 'Pagamento confirmado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao confirmar pagamento:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erro ao processar pagamento: ' + error.message 
    });
  }
});

// Administração
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.userType !== 'administrador') {
      return res.status(403).json({ message: 'Acesso não autorizado' });
    }

    const users = await User.find({})
      .select('-password -__v -twoFAEnabled -privacySettings')
      .populate('avatar');

    res.json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ message: 'Erro ao buscar usuários' });
  }
});

// Redefinição de senha
app.post('/reset-password', async (req, res) => {
  const { cpf, newPassword } = req.body;

  try {
    const user = await User.findOne({ cpf });
    if (user) {
      user.password = newPassword;
      await user.save();
      res.status(200).json({ message: 'Senha redefinida com sucesso!' });
    } else {
      res.status(404).json({ message: 'CPF não encontrado.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro ao redefinir senha: ' + error.message });
  }
});

// Rotas estáticas
app.get('/suporte', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'SuporteUsuario.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'TelaInicio.html'));
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro interno:', err.stack);
  res.status(500).json({ message: 'Erro interno do servidor.' });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

process.on('SIGINT', () => {
  console.log('Encerrando servidor...');
  process.exit();
});