from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

class SupportML:
    def __init__(self):
        self.model = None
        self.vectorizer = None
        self.load_or_train_model()
        
        self.knowledge_base = {
            'senha': {
                'responses': [
                    "Para resetar sua senha, acesse 'Esqueci minha senha' na página de login.",
                    "Se seu cartão foi bloqueado, entre em contato com o RH para liberação."
                ],
                'solutions': [
                    {"title": "Redefinir Senha", "url": "/reset-password"},
                    {"title": "Desbloquear Acesso", "url": "/unlock-account"}
                ]
            },
            'cartao': {
                'responses': [
                    "Problemas com cartão devem ser reportados ao departamento de RH.",
                    "Para solicitar um novo cartão, acesse o portal do colaborador."
                ],
                'solutions': [
                    {"title": "Solicitar Novo Cartão", "url": "/new-card"},
                    {"title": "Reportar Perda/Roubo", "url": "/report-loss"}
                ]
            },
            'dados': {
                'responses': [
                    "Para atualizar seus dados cadastrais, acesse 'Meu Perfil'.",
                    "Dados incorretos? Envie um ticket para o departamento pessoal."
                ],
                'solutions': [
                    {"title": "Atualizar Cadastro", "url": "/update-profile"},
                    {"title": "Corrigir Dados", "url": "/correct-data"}
                ]
            },
            'sistema': {
                'responses': [
                    "Problemas no sistema? Tente limpar o cache do navegador.",
                    "Erros persistentes devem ser reportados ao suporte técnico."
                ],
                'solutions': [
                    {"title": "Relatar Bug", "url": "/report-bug"},
                    {"title": "Status do Sistema", "url": "/system-status"}
                ]
            }
        }
        
    def load_or_train_model(self):
        model_path = 'support_model.joblib'
        if os.path.exists(model_path):
            self.model = joblib.load(model_path)
        else:
            self.train_model()
    
    def train_model(self):
        data = {
            'text': [
                'não consigo acessar minha conta',
                'esqueci minha senha',
                'como redefinir minha senha',
                'meu cartão não está funcionando',
                'cartão bloqueado',
                'solicitar novo cartão',
                'meus dados estão incorretos',
                'atualizar informações cadastrais',
                'corrigir data de nascimento',
                'o sistema está lento',
                'aplicativo não carrega',
                'erro ao tentar login'
            ],
            'label': [
                'senha', 'senha', 'senha',
                'cartao', 'cartao', 'cartao',
                'dados', 'dados', 'dados',
                'sistema', 'sistema', 'sistema'
            ]
        }
        
        df = pd.DataFrame(data)
        self.model = Pipeline([
            ('tfidf', TfidfVectorizer()),
            ('clf', MultinomialNB())
        ])
        self.model.fit(df['text'], df['label'])
        joblib.dump(self.model, 'support_model.joblib')
    
    def predict_intent(self, text):
        try:
            return self.model.predict([text])[0]
        except:
            return "sistema"
    
    def get_response(self, intent):
        intent = intent if intent in self.knowledge_base else 'sistema'
        knowledge = self.knowledge_base[intent]
        response = np.random.choice(knowledge['responses'])
        return {
            'response': response,
            'solutions': knowledge['solutions'],
            'intent': intent
        }

support_ml = SupportML()

@app.route('/api/support', methods=['POST'])
def handle_support():
    try:
        data = request.json
        user_message = data.get('message', '')
        
        intent = support_ml.predict_intent(user_message)
        
        result = support_ml.get_response(intent)
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'response': "Desculpe, ocorreu um erro no sistema. Por favor, tente novamente.",
            'solutions': [],
            'intent': 'erro'
        }), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)