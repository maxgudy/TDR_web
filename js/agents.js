// agents.js - Connexió amb n8n (fetch/webhooks i gestió de respostes)

// Mapeig entre IDs interns i noms visibles
const PAGE_ID_TO_NAME = {
    'gpt-profes': 'Agent Professors',
    'faq-email': 'Agent Famílies i Alumnes',
    'dades-estudiants': 'Agent Directius'
};

// Webhooks per a cada agent (utilitzant noms visibles)
const WEBHOOKS = {
    'Agent Professors': 'https://m9m.fluxaroo.com/webhook/24c38e21-6962-4344-898c-0e72010fc536/chat',
    'Agent Famílies i Alumnes': 'https://m9m.fluxaroo.com/webhook/24c38e21-6962-4344-898c-0e72010fc536/chat',
    'Agent Directius': 'https://m9m.fluxaroo.com/webhook/24c38e21-6962-4344-898c-0e72010fc536/chat'
};

// Generar o recuperar ID d'usuari
function getUserId() {
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userId', userId);
    }
    return userId;
}

// Enviar missatge al webhook
async function sendMessageToAgent(message, pageId = null, userId = null) {
    const user = userId || getUserId();
    
    // Obtenir el webhook URL segons la pàgina actual
    let webhookUrl;
    if (pageId && PAGE_ID_TO_NAME[pageId]) {
        const agentName = PAGE_ID_TO_NAME[pageId];
        webhookUrl = WEBHOOKS[agentName];
    } else {
        // Fallback al webhook de professors si no s'especifica
        webhookUrl = WEBHOOKS['Agent Professors'];
    }
    
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: user,
                message: message
            })
        });

        if (!response.ok) {
            throw new Error('Error al enviar el mensaje');
        }

        const data = await response.json();
        
        // Extreure la resposta del bot de diferents formats possibles
        let botResponse = '';
        if (typeof data === 'string') {
            botResponse = data;
        } else if (data.output) {
            botResponse = data.output;
        } else if (data.response) {
            botResponse = data.response;
        } else if (data.message) {
            botResponse = data.message;
        } else if (data.text) {
            botResponse = data.text;
        } else if (data.content) {
            botResponse = data.content;
        } else {
            botResponse = JSON.stringify(data);
        }

        return { success: true, response: botResponse };
    } catch (error) {
        console.error('Error:', error);
        return { success: false, error: error.message };
    }
}

// Exportar funcions per a ús en altres mòduls
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { sendMessageToAgent, getUserId };
}

