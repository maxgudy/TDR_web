// main.js - Control de pestanyes i comportament general de la UI

// Estat de l'aplicació
const AppState = {
    currentPage: 'gpt-profes', // 'gpt-profes', 'faq-email', 'dades-estudiants'
    theme: localStorage.getItem('theme') || 'light',
    userId: null
};

// Configuració de les pàgines
const pages = {
    'gpt-profes': {
        title: 'Assistent IA - TDR',
        subtitle: 'Max Gudayol · Automatitzacions amb IA',
        webhookUrl: 'https://m9m.fluxaroo.com/webhook/24c38e21-6962-4344-898c-0e72010fc536/chat'
    },
    'faq-email': {
        title: 'FAQ eMail - TDR',
        subtitle: 'Max Gudayol · Automatitzacions amb IA',
        webhookUrl: 'https://m9m.fluxaroo.com/webhook/24c38e21-6962-4344-898c-0e72010fc536/chat'
    },
    'dades-estudiants': {
        title: 'Dades Estudiants - Dashboard',
        subtitle: 'Max Gudayol · TDR - Automatitzacions amb IA',
        webhookUrl: 'https://m9m.fluxaroo.com/webhook/24c38e21-6962-4344-898c-0e72010fc536/chat'
    }
};

// Inicialitzar l'aplicació
function initApp() {
    // Configurar tema
    initTheme();
    
    // Configurar navegació
    initNavigation();
    
    // Carregar pàgina inicial
    const hash = window.location.hash.slice(1) || 'gpt-profes';
    navigateToPage(hash);
    
    // Configurar event listeners
    setupEventListeners();
}

// Inicialitzar tema
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        updateThemeIcons(true);
    } else {
        document.body.classList.remove('dark-mode');
        updateThemeIcons(false);
    }
}

// Actualitzar icones del tema
function updateThemeIcons(isDark) {
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    
    if (sunIcon && moonIcon) {
        sunIcon.style.display = isDark ? 'none' : 'block';
        moonIcon.style.display = isDark ? 'block' : 'none';
    }
}

// Toggle tema
function toggleTheme() {
    const isDark = document.body.classList.contains('dark-mode');
    document.body.classList.toggle('dark-mode');
    
    const newTheme = isDark ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    AppState.theme = newTheme;
    
    updateThemeIcons(!isDark);
}

// Inicialitzar navegació
function initNavigation() {
    const navElements = document.querySelectorAll('.nav-element');
    navElements.forEach(element => {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = element.getAttribute('data-page');
            navigateToPage(pageId);
        });
    });
}

// Navegar a una pàgina (disponible globalment)
window.navigateToPage = function(pageId) {
    // Amagar totes les pàgines
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Mostrar la pàgina seleccionada
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Actualitzar navegació activa
    document.querySelectorAll('.nav-element').forEach(el => {
        el.classList.remove('active');
    });
    const activeNav = document.querySelector(`[data-page="${pageId}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }
    
    // Actualitzar header
    updateHeader(pageId);
    
    // Actualitzar estat
    AppState.currentPage = pageId;
    
    // Actualitzar URL sense recarregar
    window.history.pushState({ page: pageId }, '', `#${pageId}`);
    
    // Inicialitzar funcionalitat específica de la pàgina
    initPageSpecificFeatures(pageId);
    
    // Disparar event personalitzat per a altres scripts
    window.dispatchEvent(new CustomEvent('pageChanged', { detail: { pageId } }));
};

// Actualitzar header
function updateHeader(pageId) {
    const pageConfig = pages[pageId];
    if (pageConfig) {
        const titleEl = document.querySelector('.header-title');
        const subtitleEl = document.querySelector('.header-subtitle');
        
        if (titleEl) titleEl.textContent = pageConfig.title;
        if (subtitleEl) subtitleEl.textContent = pageConfig.subtitle;
    }
}

// Inicialitzar funcionalitats específiques de cada pàgina
function initPageSpecificFeatures(pageId) {
    if (pageId === 'dades-estudiants') {
        // Inicialitzar dashboard si existeix la funció
        if (typeof initDashboard === 'function') {
            initDashboard();
        }
    }
    
    // Inicialitzar chat per a totes les pàgines que el necessitin
    initChatForPage(pageId);
}

// Inicialitzar chat per a una pàgina
function initChatForPage(pageId) {
    // Aquesta funció es crida per cada pàgina que necessita chat
    // La implementació específica es fa a cada pàgina
}

// Configurar event listeners
function setupEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Navegació amb hash
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.slice(1) || 'gpt-profes';
        navigateToPage(hash);
    });
    
    // Popstate per navegació endarrere/endavant
    window.addEventListener('popstate', (e) => {
        const pageId = e.state?.page || window.location.hash.slice(1) || 'gpt-profes';
        navigateToPage(pageId);
    });
}

// Funcions d'utilitat per al chat
function addMessage(containerId, text, isUser) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = isUser ? 'message user-message' : 'message bot-message';
    
    // Si és un missatge del bot, convertir markdown a HTML
    if (!isUser && typeof marked !== 'undefined') {
        messageDiv.innerHTML = marked.parse(text);
    } else {
        messageDiv.innerHTML = text;
    }
    
    container.appendChild(messageDiv);
    scrollToBottom(container);
}

function scrollToBottom(container) {
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function showTypingIndicator(containerId) {
    const indicator = document.getElementById(containerId);
    if (indicator) {
        indicator.style.display = 'flex';
        const messagesContainer = indicator.parentElement.querySelector('.messages, .dashboard-chat-messages');
        if (messagesContainer) {
            scrollToBottom(messagesContainer);
        }
    }
}

function hideTypingIndicator(containerId) {
    const indicator = document.getElementById(containerId);
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// Inicialitzar quan el DOM està llest
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

