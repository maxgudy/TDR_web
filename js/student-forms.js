// student-forms.js - Gestió de formularis per inserir alumnes, notes i registres

// Inicialitzar formularis quan es carrega la pàgina
function initStudentForms() {
    const formsSection = document.getElementById('formsSection-gpt');
    if (!formsSection) return;
    
    // Configurar pestanyes
    const tabs = formsSection.querySelectorAll('.form-tab');
    const forms = formsSection.querySelectorAll('.student-form');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            
            // Actualitzar pestanyes actives
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Mostrar formulari corresponent
            forms.forEach(form => {
                form.classList.remove('active');
                if (form.getAttribute('data-type') === tabName) {
                    form.classList.add('active');
                }
            });
        });
    });
    
    // Configurar enviament de formularis
    forms.forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleFormSubmit(form);
        });
    });
}

// Gestionar enviament de formulari
async function handleFormSubmit(form) {
    const formType = form.getAttribute('data-type');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Validació bàsica
    if (!validateForm(data, formType)) {
        showFeedback('error', 'Si us plau, omple tots els camps obligatoris.');
        return;
    }
    
    // Deshabilitar botó durant l'enviament
    const submitBtn = form.querySelector('.form-submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviant...';
    
    try {
        // Construir comanda SQL
        const sqlCommand = buildSQLCommand(formType, data);
        
        // Enviar al webhook via n8n
        const result = await sendSQLCommand(sqlCommand, formType, data);
        
        if (result.success) {
            showFeedback('success', result.message || 'Dades inserides correctament!');
            form.reset();
        } else {
            showFeedback('error', result.error || 'Error en inserir les dades. Si us plau, intenta-ho de nou.');
        }
    } catch (error) {
        console.error('Error:', error);
        showFeedback('error', 'Error de connexió. Si us plau, intenta-ho de nou.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Validar formulari
function validateForm(data, formType) {
    switch (formType) {
        case 'student':
            return data.nom && data.cognoms && data.grup;
        case 'note':
            return data.alumne && data.assignatura && data.nota && data.data;
        case 'record':
            return data.alumne && data.tipus && data.estat && data.data;
        default:
            return false;
    }
}

// Construir comanda SQL
function buildSQLCommand(formType, data) {
    switch (formType) {
        case 'student':
            const emailValue = data.email ? `'${escapeSQL(data.email)}'` : 'NULL';
            return `INSERT INTO students (nom, cognoms, email, grup) VALUES ('${escapeSQL(data.nom)}', '${escapeSQL(data.cognoms)}', ${emailValue}, '${escapeSQL(data.grup)}')`;
        
        case 'note':
            return `INSERT INTO notes (alumne_id, assignatura, nota, data) VALUES ((SELECT id FROM students WHERE nom || ' ' || cognoms = '${escapeSQL(data.alumne)}' LIMIT 1), '${escapeSQL(data.assignatura)}', ${parseFloat(data.nota)}, '${data.data}')`;
        
        case 'record':
            const notesValue = data.notes ? `'${escapeSQL(data.notes)}'` : 'NULL';
            return `INSERT INTO registres (alumne_id, tipus, estat, data, notes) VALUES ((SELECT id FROM students WHERE nom || ' ' || cognoms = '${escapeSQL(data.alumne)}' LIMIT 1), '${escapeSQL(data.tipus)}', '${escapeSQL(data.estat)}', '${data.data}', ${notesValue})`;
        
        default:
            return '';
    }
}

// Escapar caràcters especials per SQL
function escapeSQL(str) {
    if (!str) return '';
    return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

// Enviar comanda SQL al webhook
async function sendSQLCommand(sqlCommand, formType, data) {
    const pageId = 'gpt-profes'; // Agent Professors
    
    // Construir missatge per a n8n
    const message = JSON.stringify({
        action: 'insert',
        type: formType,
        sql: sqlCommand,
        data: data
    });
    
    // Utilitzar la funció existent sendMessageToAgent
    const result = await sendMessageToAgent(message, pageId);
    
    if (result.success) {
        return { success: true, message: result.response };
    } else {
        return { success: false, error: result.error || 'Error desconegut' };
    }
}

// Mostrar feedback a l'usuari
function showFeedback(type, message) {
    const feedback = document.getElementById('formFeedback-gpt');
    if (!feedback) return;
    
    feedback.className = `form-feedback ${type}`;
    feedback.textContent = message;
    feedback.style.display = 'block';
    
    // Amagar després de 5 segons
    setTimeout(() => {
        feedback.style.display = 'none';
    }, 5000);
}

// Inicialitzar quan es carrega la pàgina o es canvia a la pàgina de professors
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Esperar una mica per assegurar que tot està carregat
        setTimeout(initStudentForms, 500);
    });
} else {
    setTimeout(initStudentForms, 500);
}

// També inicialitzar quan es canvia a la pàgina de professors
window.addEventListener('pageChanged', (e) => {
    if (e.detail.pageId === 'gpt-profes') {
        setTimeout(initStudentForms, 300);
    }
});

