from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
import joblib
import os
from datetime import datetime
import logging
import re
import spacy
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import make_pipeline as make_imb_pipeline
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from sentence_transformers import SentenceTransformer
import torch
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('support_ml.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
    nltk.data.find('corpora/wordnet')
except:
    nltk.download('punkt')
    nltk.download('stopwords')
    nltk.download('wordnet')

try:
    nlp = spacy.load("pt_core_news_sm")
except:
    logger.warning("Modelo Spacy para português não encontrado. Instale com: python -m spacy download pt_core_news_sm")
    nlp = None

class AdvancedTextPreprocessor:
    def __init__(self):
        self.stop_words = set(stopwords.words('portuguese'))
        self.lemmatizer = WordNetLemmatizer()
        self.special_chars = re.compile(r'[^a-zA-ZáéíóúÁÉÍÓÚâêîôÂÊÎÔãõÃÕçÇ\s]')
        
    def preprocess(self, text):
        text = text.lower()
        
        text = self.special_chars.sub(' ', text)
        
        words = nltk.word_tokenize(text)
        
        words = [self.lemmatizer.lemmatize(word) for word in words if word not in self.stop_words]
        
        return ' '.join(words)

class SupportML:
    def __init__(self):
        self.model = None
        self.preprocessor = AdvancedTextPreprocessor()
        self.sentence_model = None
        self.fine_tuned_model = None
        self.tokenizer = None
        self.load_models()
        
        self.knowledge_base = self._create_knowledge_base()
        
    def _create_knowledge_base(self):
        return {
            'senha': {
                'responses': [
                    "Para resetar sua senha, acesse 'Esqueci minha senha' na página de login.",
                    "Se seu cartão foi bloqueado, entre em contato com o RH para liberação."
                ],
                'solutions': [
                    {"title": "Redefinir Senha", "url": "/reset-password", "action": "redirect"},
                    {"title": "Desbloquear Acesso", "url": "/unlock-account", "action": "redirect"}
                ],
                'follow_up': [
                    "Conseguiu resolver seu problema com a senha?",
                    "Precisa de mais alguma ajuda com acesso?"
                ]
            },
            'cartao': {
                'responses': [
                    "Problemas com cartão devem ser reportados ao departamento de RH.",
                    "Para solicitar um novo cartão, acesse o portal do colaborador."
                ],
                'solutions': [
                    {"title": "Solicitar Novo Cartão", "url": "/new-card", "action": "api_call"},
                    {"title": "Reportar Perda/Roubo", "url": "/report-loss", "action": "form"}
                ],
                'follow_up': [
                    "Seu problema com o cartão foi resolvido?",
                    "Precisa de ajuda adicional com o cartão?"
                ]
            },
            'dados': {
                'responses': [
                    "Para atualizar seus dados cadastrais, acesse 'Meu Perfil'.",
                    "Dados incorretos? Envie um ticket para o departamento pessoal."
                ],
                'solutions': [
                    {"title": "Atualizar Cadastro", "url": "/update-profile", "action": "redirect"},
                    {"title": "Corrigir Dados", "url": "/correct-data", "action": "form"}
                ],
                'follow_up': [
                    "Conseguiu atualizar seus dados corretamente?",
                    "Os dados estão corretos agora?"
                ]
            },
            'sistema': {
                'responses': [
                    "Problemas no sistema? Tente limpar o cache do navegador.",
                    "Erros persistentes devem ser reportados ao suporte técnico."
                ],
                'solutions': [
                    {"title": "Relatar Bug", "url": "/report-bug", "action": "form"},
                    {"title": "Status do Sistema", "url": "/system-status", "action": "api_call"}
                ],
                'follow_up': [
                    "O problema no sistema persiste?",
                    "Precisa de ajuda técnica adicional?"
                ]
            },
            'saudacao': {
                'responses': [
                    "Olá! Como posso te ajudar hoje?",
                    "Bem-vindo ao suporte! Em que posso ajudar?"
                ],
                'solutions': [],
                'follow_up': []
            },
            'despedida': {
                'responses': [
                    "Até logo! Estarei aqui se precisar de mais ajuda.",
                    "Foi um prazer ajudar! Volte sempre que precisar."
                ],
                'solutions': [],
                'follow_up': []
            }
        }
    
    def load_models(self):
        """Carrega todos os modelos necessários"""
        self.load_or_train_basic_model()
        
        try:
            self.sentence_model = SentenceTransformer('neuralmind/bert-base-portuguese-cased')
            logger.info("Modelo de embeddings carregado com sucesso")
        except Exception as e:
            logger.error(f"Erro ao carregar modelo de embeddings: {e}")
            self.sentence_model = None
        
        self.load_fine_tuned_model()
    
    def load_fine_tuned_model(self):
        """Tenta carregar um modelo fine-tuned se existir"""
        try:
            model_path = "fine_tuned_model"
            if os.path.exists(model_path):
                self.tokenizer = AutoTokenizer.from_pretrained(model_path)
                self.fine_tuned_model = AutoModelForSequenceClassification.from_pretrained(model_path)
                logger.info("Modelo fine-tuned carregado com sucesso")
        except Exception as e:
            logger.error(f"Erro ao carregar modelo fine-tuned: {e}")
            self.fine_tuned_model = None
    
    def load_or_train_basic_model(self):
        """Carrega ou treina o modelo básico"""
        model_path = 'support_model.joblib'
        if os.path.exists(model_path):
            try:
                self.model = joblib.load(model_path)
                logger.info("Modelo básico carregado com sucesso do arquivo.")
            except Exception as e:
                logger.error(f"Erro ao carregar modelo básico: {e}")
                self.train_basic_model()
        else:
            logger.info("Nenhum modelo básico encontrado. Treinando novo modelo...")
            self.train_basic_model()
    
    def train_basic_model(self):
        """Treina o modelo básico com dados aumentados"""
        try:
            data = {
                'text': [
                    'não consigo acessar minha conta', 'acesso negado', 'login não funciona',
                    'esqueci minha senha', 'não lembro a senha', 'como recuperar senha',
                    'como redefinir minha senha', 'resetar senha', 'mudar senha',
                    'meu cartão não está funcionando', 'cartão não passa', 'cartão recusado',
                    'cartão bloqueado', 'cartão cancelado', 'desbloquear cartão',
                    'solicitar novo cartão', 'pedir cartão novo', 'cartão perdido',
                    'meus dados estão incorretos', 'informações erradas', 'dados desatualizados',
                    'atualizar informações cadastrais', 'mudar dados', 'alterar cadastro',
                    'corrigir data de nascimento', 'data errada', 'nascimento incorreto',
                    'o sistema está lento', 'demora para carregar', 'aplicativo lento',
                    'aplicativo não carrega', 'não abre', 'tela travada',
                    'erro ao tentar login', 'mensagem de erro', 'problema no login',
                    'olá', 'bom dia', 'boa tarde', 'oi',
                    'tchau', 'até mais', 'obrigado', 'valeu'
                ],
                'label': [
                    'senha', 'senha', 'senha',
                    'senha', 'senha', 'senha',
                    'senha', 'senha', 'senha',
                    'cartao', 'cartao', 'cartao',
                    'cartao', 'cartao', 'cartao',
                    'cartao', 'cartao', 'cartao',
                    'dados', 'dados', 'dados',
                    'dados', 'dados', 'dados',
                    'dados', 'dados', 'dados',
                    'sistema', 'sistema', 'sistema',
                    'sistema', 'sistema', 'sistema',
                    'sistema', 'sistema', 'sistema',
                    'saudacao', 'saudacao', 'saudacao', 'saudacao',
                    'despedida', 'despedida', 'despedida', 'despedida'
                ]
            }
            
            df = pd.DataFrame(data)
            
            X_train, X_test, y_train, y_test = train_test_split(
                df['text'], df['label'], test_size=0.2, random_state=42
            )
            
            self.model = make_imb_pipeline(
                TfidfVectorizer(preprocessor=self.preprocessor.preprocess),
                SMOTE(random_state=42),
                RandomForestClassifier(n_estimators=100, random_state=42)
            )
            
            self.model.fit(X_train, y_train)
            
            y_pred = self.model.predict(X_test)
            logger.info("\n" + classification_report(y_test, y_pred))
            
            joblib.dump(self.model, 'support_model.joblib')
            logger.info("Modelo básico treinado e salvo com sucesso.")
            
        except Exception as e:
            logger.error(f"Erro ao treinar modelo básico: {e}")
            raise
    
    def predict_intent(self, text):
        """Prediz a intenção usando o melhor modelo disponível"""
        try:
            if self.fine_tuned_model and self.tokenizer:
                inputs = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
                with torch.no_grad():
                    logits = self.fine_tuned_model(**inputs).logits
                predicted_class = torch.argmax(logits, dim=1).item()
                intents = ['senha', 'cartao', 'dados', 'sistema', 'saudacao', 'despedida']
                return intents[predicted_class]
            
            if self.sentence_model:
                embedding = self.sentence_model.encode([text])
                intents = ['senha', 'cartao', 'dados', 'sistema', 'saudacao', 'despedida']
                examples = [
                    "não consigo acessar minha conta",
                    "meu cartão não funciona",
                    "meus dados estão errados",
                    "o sistema está lento",
                    "olá, bom dia",
                    "tchau, obrigado"
                ]
                example_embeddings = self.sentence_model.encode(examples)
                similarities = np.dot(embedding, example_embeddings.T)[0]
                return intents[np.argmax(similarities)]
            
            return self.model.predict([text])[0]
            
        except Exception as e:
            logger.error(f"Erro ao prever intenção: {e}")
            return "sistema"
    
    def get_response(self, intent, context=None):
        """Gera uma resposta baseada na intenção e contexto"""
        try:
            intent = intent if intent in self.knowledge_base else 'sistema'
            knowledge = self.knowledge_base[intent]
            if context and 'previous_intents' in context:
                last_intent = context['previous_intents'][-1] if context['previous_intents'] else None
                if last_intent == intent and len(knowledge['follow_up']) > 0:
                    response = np.random.choice(knowledge['follow_up'])
                else:
                    response = np.random.choice(knowledge['responses'])
            else:
                response = np.random.choice(knowledge['responses'])
            
            return {
                'response': response,
                'solutions': knowledge['solutions'],
                'intent': intent,
                'confidence': 0.9 
            }
        except Exception as e:
            logger.error(f"Erro ao obter resposta: {e}")
            return {
                'response': "Desculpe, ocorreu um erro no sistema. Por favor, tente novamente.",
                'solutions': [],
                'intent': 'erro',
                'confidence': 0.0
            }
    
    def train_fine_tuned_model(self, dataset_path):
        """Método para fine-tune de um modelo transformer"""
        logger.info("Fine-tuning não implementado nesta versão")
        return False

support_ml = SupportML()

@app.route('/api/support', methods=['POST'])
def handle_support():
    try:
        data = request.json
        user_message = data.get('message', '').strip()
        context = data.get('context', {})
        
        if not user_message:
            return jsonify({
                'response': "Por favor, digite sua mensagem.",
                'solutions': [],
                'intent': 'erro',
                'confidence': 0.0,
                'context': context
            }), 400
        
        logger.info(f"Mensagem recebida: {user_message}")
        
        intent = support_ml.predict_intent(user_message)
        logger.info(f"Intenção detectada: {intent}")
        
        if 'previous_intents' not in context:
            context['previous_intents'] = []
        context['previous_intents'].append(intent)
        
        if len(context['previous_intents']) > 5:
            context['previous_intents'] = context['previous_intents'][-5:]
        
        result = support_ml.get_response(intent, context)
        logger.info(f"Resposta gerada: {result['response']}")
        
        result['context'] = context
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Erro no endpoint /api/support: {e}")
        return jsonify({
            'response': "Desculpe, ocorreu um erro no sistema. Por favor, tente novamente.",
            'solutions': [],
            'intent': 'erro',
            'confidence': 0.0,
            'context': {}
        }), 500

@app.route('/api/train', methods=['POST'])
def train_model():
    """Endpoint para treinar/retreinar modelos"""
    try:
        dataset_path = request.json.get('dataset_path')
        
        if support_ml.train_fine_tuned_model(dataset_path):
            return jsonify({
                'status': 'success',
                'message': 'Modelo fine-tuned treinado com sucesso'
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': 'Falha ao treinar modelo fine-tuned'
            }), 400
            
    except Exception as e:
        logger.error(f"Erro no endpoint /train: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'models': {
            'basic_model_loaded': support_ml.model is not None,
            'sentence_model_loaded': support_ml.sentence_model is not None,
            'fine_tuned_model_loaded': support_ml.fine_tuned_model is not None
        },
        'timestamp': datetime.now().isoformat()
    }), 200

if __name__ == '__main__':
    app.run(port=5001, debug=True)