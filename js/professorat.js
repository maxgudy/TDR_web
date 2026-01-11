// professorat.js - Mòdul de gestió de professorat
// Gestió completa d'alumnes, notes, excursions i deures

// Criteris d'avaluació amb pesos (percentatges)
const EVALUATION_CRITERIA = {
    exam: 80,      // 80% examens
    homework: 10,  // 10% deures
    activity: 10   // 10% activitats
};

// Estat global
const ProfessoratState = {
    selectedClassId: null,
    selectedStudentId: null,
    selectedExcursionId: null,
    selectedHomeworkId: null,
    classes: [],
    students: [],
    grades: [], // Notes d'avaluació (qualificacions)
    excursions: [],
    homeworks: [],
    editingGradeId: null,
    editingExcursionId: null
};

let studentsRenderToken = 0;

let studentSearchWrapperElement = null;
let pendingDeleteClassId = null;

function setStudentSearchVisibility(isVisible) {
    if (!studentSearchWrapperElement) {
        studentSearchWrapperElement = document.querySelector('.students-table-container .table-search');
    }
    if (studentSearchWrapperElement) {
        studentSearchWrapperElement.style.display = isVisible ? '' : 'none';
    }
}

function preserveMainScrollPosition() {
    const main = document.querySelector('main');
    const scrollTop = main ? main.scrollTop : (window.scrollY || window.pageYOffset);
    requestAnimationFrame(() => {
        if (main) {
            main.scrollTop = scrollTop;
        } else {
            window.scrollTo(0, scrollTop);
        }
    });
}

function attachExcursionDetailScrollGuard() {
    const detail = document.getElementById('excursionDetail');
    if (!detail || detail.dataset.scrollGuard) return;
    detail.dataset.scrollGuard = 'true';

    const handler = (event) => {
        const target = event.target;
        if (!target || !target.matches('input[type="checkbox"], input[type="text"]')) return;
        preserveMainScrollPosition();
    };

    detail.addEventListener('mousedown', handler);
    detail.addEventListener('focusin', handler);
}

function openDeleteClassModal() {
    if (!ProfessoratState.selectedClassId) {
        const selector = document.getElementById('classSelector');
        ProfessoratState.selectedClassId = selector ? selector.value : null;
    }
    if (!ProfessoratState.selectedClassId) {
        showFeedback('error', 'Selecciona una classe abans d\'eliminar-la');
        return;
    }
    pendingDeleteClassId = ProfessoratState.selectedClassId;
    const nameEl = document.getElementById('deleteClassName');
    if (nameEl) {
        nameEl.textContent = getClassName(pendingDeleteClassId) || 'classe seleccionada';
    }
    const modal = document.getElementById('deleteClassModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeDeleteClassModal() {
    pendingDeleteClassId = null;
    const modal = document.getElementById('deleteClassModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function executeDeleteClass() {
    if (!pendingDeleteClassId) return;
    const classId = pendingDeleteClassId;
    closeDeleteClassModal();
    await performDeleteClass(classId);
}

// Client de Supabase (s'utilitza directament, no a través de n8n)
let supabaseClient;

// Inicialitzar client de Supabase
function initSupabaseClient() {
    if (window.supabaseClient) {
        supabaseClient = window.supabaseClient;
        console.log('[Professorat] Client de Supabase inicialitzat correctament');
        return true;
    } else {
        console.error('[Professorat] Error: Client de Supabase no disponible');
        console.error('[Professorat] window.supabaseClient:', window.supabaseClient);
        console.error('[Professorat] typeof supabase:', typeof supabase);
        return false;
    }
}

// Inicialitzar mòdul professorat
function initProfessorat() {
    console.log('[Professorat] ===== INICIALITZANT MÒDUL PROFESSORAT =====');

    const supabaseReady = initSupabaseClient();
    if (!supabaseReady) {
        console.error('[Professorat] No s\'ha pogut inicialitzar el client de Supabase');
        showFeedback('error', 'Error connectant amb Supabase. Assegura\'t que les taules estan creades.');
    }

    console.log('[Professorat] Configurant UI...');
    setupTabs();
    setupSubtabs();
    setupEventListeners();
    setupCreateClassForm();

    if (supabaseReady) {
        console.log('[Professorat] Client de Supabase inicialitzat, carregant dades...');
        loadClasses().then(() => {
            console.log('[Professorat] ===== LOADCLASSES COMPLETAT =====');
        }).catch(err => {
            console.error('[Professorat] Error en loadClasses:', err);
        });
    }
}

// Configurar pestanyes principals
function setupTabs() {
    const tabs = document.querySelectorAll('.professorat-tab');
    const panels = document.querySelectorAll('.professorat-panel');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const tabName = tab.getAttribute('data-tab');
            
            // Guardar posició de scroll actual
            const currentScrollY = window.scrollY || window.pageYOffset;
            
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            panels.forEach(panel => {
                panel.classList.remove('active');
            });
            
            // Activar panell seleccionat sense scroll ni reflow
            const targetPanel = document.getElementById(`panel-${tabName}`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
            
            // Restaurar posició de scroll immediatament
            window.scrollTo(0, currentScrollY);
            
            // També prevenir scroll després del següent frame
            requestAnimationFrame(() => {
                window.scrollTo(0, currentScrollY);
            });
            
            // Carregar dades quan es canvia de pestanya
            if (tabName === 'classes') {
                // Carregar excursions i deures si hi ha classe seleccionada
                if (ProfessoratState.selectedClassId) {
                    loadExcursions(ProfessoratState.selectedClassId);
                    loadHomeworks(ProfessoratState.selectedClassId);
                }
            } else if (tabName === 'students') {
                // Carregar alumnes si hi ha classe seleccionada
                if (ProfessoratState.selectedClassId) {
                    loadStudents(ProfessoratState.selectedClassId);
                }
                // Resetejar selecció de notes
                resetStudentSelection();
            }
        });
    });
}

// Configurar subtabs de registres
function setupSubtabs() {
    const subtabs = document.querySelectorAll('.registre-subtab');
    const subpanels = document.querySelectorAll('.registre-subpanel');
    
    subtabs.forEach(subtab => {
        subtab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const subtabName = subtab.getAttribute('data-subtab');
            
            // Guardar posició de scroll actual
            const currentScrollY = window.scrollY || window.pageYOffset;
            
            subtabs.forEach(st => st.classList.remove('active'));
            subtab.classList.add('active');
            
            subpanels.forEach(subpanel => {
                subpanel.classList.remove('active');
                if (subpanel.id === `subpanel-${subtabName}`) {
                    subpanel.classList.add('active');
                }
            });

            const excursionDetail = document.getElementById('excursionDetail');
            const homeworkDetail = document.getElementById('homeworkDetail');
            if (excursionDetail) excursionDetail.style.display = 'none';
            if (homeworkDetail) homeworkDetail.style.display = 'none';
            
            // Restaurar posició de scroll immediatament
            window.scrollTo(0, currentScrollY);
            
            // També prevenir scroll després del següent frame
            requestAnimationFrame(() => {
                window.scrollTo(0, currentScrollY);
            });
        });
    });
}

// Configurar event listeners
function setupEventListeners() {
    console.log('[Professorat] setupEventListeners - configurant listeners...');
    
    // Selector de classe (a pestanya Classes)
    const classSelector = document.getElementById('classSelector');
    const classSelectorStudents = document.getElementById('classSelectorStudents');
    const deleteClassBtn = document.getElementById('deleteClassBtn');
    
    console.log('[Professorat] Elements trobats:', {
        classSelector: !!classSelector,
        classSelectorStudents: !!classSelectorStudents,
        deleteClassBtn: !!deleteClassBtn
    });
    
    if (classSelector) {
        classSelector.addEventListener('change', (e) => {
            ProfessoratState.selectedClassId = e.target.value || null;
            
            // Guardar al localStorage per mantenir la selecció
            if (ProfessoratState.selectedClassId) {
                localStorage.setItem('selectedClassId', ProfessoratState.selectedClassId);
            } else {
                localStorage.removeItem('selectedClassId');
            }
            
            // Mostrar/ocultar botó eliminar classe
            if (deleteClassBtn) {
                deleteClassBtn.style.display = ProfessoratState.selectedClassId ? 'inline-block' : 'none';
            }
            
            if (ProfessoratState.selectedClassId) {
                // Carregar dades per a la pestanya Classes
                loadExcursions(ProfessoratState.selectedClassId);
                loadHomeworks(ProfessoratState.selectedClassId);
                // Carregar dades per a la pestanya Alumnes
                loadStudents(ProfessoratState.selectedClassId);
                const studentClassSelect = document.getElementById('student-class');
                if (studentClassSelect) {
                    studentClassSelect.value = ProfessoratState.selectedClassId;
                }
            } else {
                clearExcursionsList();
                clearHomeworksList();
                clearStudentsTable();
            }
        });
    }

    if (classSelectorStudents) {
        classSelectorStudents.addEventListener('change', (e) => {
            ProfessoratState.selectedClassId = e.target.value || null;
            if (ProfessoratState.selectedClassId) {
                localStorage.setItem('selectedClassId', ProfessoratState.selectedClassId);
            } else {
                localStorage.removeItem('selectedClassId');
            }
            const studentClassSelect = document.getElementById('student-class');
            if (studentClassSelect) {
                studentClassSelect.value = ProfessoratState.selectedClassId || '';
            }
            if (ProfessoratState.selectedClassId) {
                loadStudents(ProfessoratState.selectedClassId);
            } else {
                clearStudentsTable();
            }
        });
    }
    
    if (deleteClassBtn) {
        deleteClassBtn.addEventListener('click', openDeleteClassModal);
    }
    const deleteClassConfirmBtn = document.getElementById('deleteClassConfirmBtn');
    if (deleteClassConfirmBtn) {
        deleteClassConfirmBtn.addEventListener('click', executeDeleteClass);
    }
    
    // Crear classe
    const createClassBtn = document.getElementById('createClassBtn');
    console.log('[Professorat] createClassBtn trobat:', !!createClassBtn);
    if (createClassBtn) {
        console.log('[Professorat] Afegint listener a createClassBtn');
        createClassBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('[Professorat] createClassBtn clicat!');
            showCreateClassDialog();
        });
    }
    
    // Afegir alumne
    const addStudentBtn = document.getElementById('addStudentBtn');
    const cancelStudentForm = document.getElementById('cancelStudentForm');
    const formStudent = document.getElementById('form-student');
    const studentClassSelect = document.getElementById('student-class');
    
    console.log('[Professorat] Alumnes - Elements trobats:', {
        addStudentBtn: !!addStudentBtn,
        formStudent: !!formStudent
    });
    
    if (addStudentBtn) {
        console.log('[Professorat] Afegint listener a addStudentBtn');
        addStudentBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('[Professorat] addStudentBtn clicat!');
            if (formStudent) {
                formStudent.style.display = 'block';
                setStudentSearchVisibility(false);
                if (studentClassSelect) {
                    const selector = document.getElementById('classSelectorStudents');
                    studentClassSelect.value = (selector && selector.value) || ProfessoratState.selectedClassId || '';
                }
                console.log('[Professorat] Formulari alumne mostrat');
            }
        });
    }
    if (cancelStudentForm) {
        cancelStudentForm.addEventListener('click', () => {
            if (formStudent) {
                formStudent.style.display = 'none';
                formStudent.reset();
                setStudentSearchVisibility(true);
            }
        });
    }
    if (formStudent) {
        if (!formStudent.dataset.listenerBound) {
            formStudent.addEventListener('submit', handleCreateStudent);
            formStudent.dataset.listenerBound = 'true';
        }
    }
    
    // Formulari notes d'avaluació
    const formNote = document.getElementById('form-note');
    if (formNote) {
        if (!formNote.dataset.listenerBound) {
            formNote.addEventListener('submit', handleCreateGrade);
            formNote.dataset.listenerBound = 'true';
        }
    }
    const cancelGradeEditBtn = document.getElementById('cancelGradeEditBtn');
    if (cancelGradeEditBtn) {
        cancelGradeEditBtn.addEventListener('click', (e) => {
            e.preventDefault();
            exitGradeEditMode();
        });
    }
    const closeGradesSectionBtn = document.getElementById('closeGradesSectionBtn');
    if (closeGradesSectionBtn) {
        closeGradesSectionBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeGradesSection();
        });
    }
    
    // Excursions
    const createExcursionBtn = document.getElementById('createExcursionBtn');
    const cancelExcursionForm = document.getElementById('cancelExcursionForm');
    const formExcursion = document.getElementById('form-excursion');
    
    console.log('[Professorat] Excursions - Elements trobats:', {
        createExcursionBtn: !!createExcursionBtn,
        cancelExcursionForm: !!cancelExcursionForm,
        formExcursion: !!formExcursion
    });
    
    if (createExcursionBtn) {
        console.log('[Professorat] Afegint listener a createExcursionBtn');
        createExcursionBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('[Professorat] createExcursionBtn clicat!');
            if (formExcursion) {
                formExcursion.style.display = 'block';
                console.log('[Professorat] Formulari excursió mostrat');
            }
        });
    }
    if (cancelExcursionForm) {
        cancelExcursionForm.addEventListener('click', () => {
            if (formExcursion) {
                formExcursion.style.display = 'none';
                formExcursion.reset();
                setExcursionFormMode(false);
            }
        });
    }
    if (formExcursion) {
        formExcursion.addEventListener('submit', handleCreateExcursion);
    }
    
    // Deures
    const createHomeworkBtn = document.getElementById('createHomeworkBtn');
    const cancelHomeworkForm = document.getElementById('cancelHomeworkForm');
    const formHomework = document.getElementById('form-homework');
    
    if (createHomeworkBtn) {
        createHomeworkBtn.addEventListener('click', () => {
            if (formHomework) formHomework.style.display = 'block';
        });
    }
    if (cancelHomeworkForm) {
        cancelHomeworkForm.addEventListener('click', () => {
            if (formHomework) {
                formHomework.style.display = 'none';
                formHomework.reset();
            }
        });
    }
    if (formHomework) {
        formHomework.addEventListener('submit', handleCreateHomework);
    }
    
    
    // Cerca a taula d'alumnes
    const studentSearch = document.getElementById('studentSearch');
    if (studentSearch) {
        studentSearch.addEventListener('input', filterStudentsTable);
    }
}

// ========== FUNCIONS PER COMUNICAR DIRECTAMENT AMB SUPABASE ==========
// NOTA: n8n només s'utilitza per al chatbot, no per a les operacions CRUD

// ========== GESTIÓ DE CLASSES ==========

async function loadClasses() {
    console.log('[Professorat] Carregant classes des de Supabase...');
    console.log('[Professorat] Supabase client disponible:', !!supabaseClient);
    
    if (!supabaseClient) {
        console.error('[Professorat] Client de Supabase no inicialitzat');
        showFeedback('error', 'Client de Supabase no inicialitzat');
        return;
    }
    
    try {
        console.log('[Professorat] Fent consulta a Supabase...');
        const { data, error } = await supabaseClient
            .from('classes')
            .select('*')
            .order('created_at', { ascending: false });
        
        console.log('[Professorat] Resposta de Supabase:', { data, error });
        
        if (error) {
            console.error('[Professorat] Error carregant classes:', error);
            console.error('[Professorat] Detalls de l\'error:', JSON.stringify(error, null, 2));
            showFeedback('error', `Error carregant classes: ${error.message}`);
            ProfessoratState.classes = [];
        } else {
            ProfessoratState.classes = data || [];
            console.log(`[Professorat] Classes carregades: ${ProfessoratState.classes.length}`);
            if (ProfessoratState.classes.length > 0) {
                console.log('[Professorat] Classes:', ProfessoratState.classes);
            } else {
                console.log('[Professorat] No hi ha classes a la base de dades');
            }
        }
        
        console.log('[Professorat] Cridant updateClassSelector...');
        updateClassSelector();
        console.log('[Professorat] updateClassSelector completat');
        
        // Restaurar la classe seleccionada des del localStorage
        const savedClassId = localStorage.getItem('selectedClassId');
        if (savedClassId && ProfessoratState.classes.find(c => c.id === savedClassId)) {
            const selector = document.getElementById('classSelector');
            if (selector) {
                selector.value = savedClassId;
                ProfessoratState.selectedClassId = savedClassId;
                // Carregar dades per a la classe seleccionada
                loadExcursions(savedClassId);
                loadHomeworks(savedClassId);
                loadStudents(savedClassId);
                
                // Mostrar botó eliminar
                const deleteClassBtn = document.getElementById('deleteClassBtn');
                if (deleteClassBtn) {
                    deleteClassBtn.style.display = 'inline-block';
                }
            }
        }
    } catch (error) {
        console.error('[Professorat] Excepció carregant classes:', error);
        console.error('[Professorat] Stack trace:', error.stack);
        showFeedback('error', 'Error de connexió amb Supabase');
        ProfessoratState.classes = [];
        updateClassSelector();
    }
}

async function createClass(name) {
    console.log('[Professorat] Creant classe:', name);
    
    if (!supabaseClient) {
        showFeedback('error', 'Client de Supabase no inicialitzat');
        return null;
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('classes')
            .insert([{ name: name }])
            .select()
            .single();
        
        if (error) {
            console.error('[Professorat] Error creant classe:', error);
            showFeedback('error', `Error creant classe: ${error.message}`);
            return null;
        }
        
        console.log('[Professorat] Classe creada:', data);
        
        // Guardar posició de scroll abans de recarregar
        const scrollPosition = window.scrollY || window.pageYOffset;
        
        // Recarregar classes i actualitzar selector
        await loadClasses();
        
        // Seleccionar la classe creada
        if (data && data.id) {
            const selector = document.getElementById('classSelector');
            if (selector) {
                selector.value = data.id;
                // Disparar event change per carregar alumnes, excursions, etc.
                selector.dispatchEvent(new Event('change'));
            }
        }
        
        // Restaurar posició de scroll després d'un petit delay
        setTimeout(() => {
            window.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
            });
        }, 50);
        
        showFeedback('success', 'Classe creada correctament');
        return data;
    } catch (error) {
        console.error('[Professorat] Excepció creant classe:', error);
        showFeedback('error', 'Error de connexió amb Supabase');
        return null;
    }
}

async function performDeleteClass(classId) {
    if (!classId) {
        showFeedback('error', 'Selecciona una classe abans d’eliminar-la');
        return;
    }

    if (!supabaseClient) {
        showFeedback('error', 'Client de Supabase no inicialitzat');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('classes')
            .delete()
            .eq('id', classId);

        if (error) {
            console.error('[Professorat] Error eliminant classe:', error);
            showFeedback('error', `Error eliminant classe: ${error.message}`);
            return;
        }

        showFeedback('success', 'Classe eliminada correctament');
        ProfessoratState.selectedClassId = null;
        ProfessoratState.students = [];
        ProfessoratState.grades = [];
        ProfessoratState.selectedStudentId = null;
        exitGradeEditMode();
        resetStudentSelection();
        setStudentSearchVisibility(true);
        await loadClasses();
        clearExcursionsList();
        clearHomeworksList();
        clearStudentsTable();
    } catch (error) {
        console.error('[Professorat] Excepció eliminant classe:', error);
        showFeedback('error', 'Error de connexió amb Supabase');
    }
}

function updateClassSelector() {
    const selectors = [
        document.getElementById('classSelector'),
        document.getElementById('classSelectorStudents')
    ].filter(Boolean);
    console.log('[Professorat] Actualitzant selector de classes amb classes:', ProfessoratState.classes);

    if (selectors.length === 0) return;

    selectors.forEach(select => {
        select.innerHTML = '<option value="">Selecciona una classe</option>';
    });

    if (ProfessoratState.classes && Array.isArray(ProfessoratState.classes) && ProfessoratState.classes.length > 0) {
        ProfessoratState.classes.forEach(cls => {
            if (cls && cls.id && cls.name) {
                selectors.forEach(select => {
                    const option = document.createElement('option');
                    option.value = cls.id;
                    option.textContent = cls.name;
                    select.appendChild(option);
                });
            } else {
                console.warn('[Professorat] Classe incompleta:', cls);
            }
        });
    }

    selectors.forEach(select => {
        select.value = ProfessoratState.selectedClassId || '';
    });

    console.log(`[Professorat] Selector actualitzat amb ${ProfessoratState.classes.length} classes`);
}

function showCreateClassDialog() {
    const modal = document.getElementById('createClassModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('newClassName').focus();
    }
}

function closeCreateClassModal() {
    const modal = document.getElementById('createClassModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('createClassForm').reset();
    }
}

function showPanel(panel) {
    if (!panel) return;
    panel.classList.remove('hidden-panel');
    panel.style.display = 'block';
}

function hidePanel(panel) {
    if (!panel) return;
    panel.classList.add('hidden-panel');
    panel.style.display = 'none';
}

function setupUiFallbacks() {
    const attachOnce = (element, key, eventName, handler) => {
        if (!element) return;
        if (element.dataset[key]) return;
        element.dataset[key] = 'true';
        element.addEventListener(eventName, handler);
    };

    const classSelector = document.getElementById('classSelector');
    const classSelectorStudents = document.getElementById('classSelectorStudents');
    const deleteClassBtn = document.getElementById('deleteClassBtn');
    const deleteClassConfirmBtn = document.getElementById('deleteClassConfirmBtn');

    const handleClassChange = (value) => {
        ProfessoratState.selectedClassId = value || null;
        if (ProfessoratState.selectedClassId) {
            localStorage.setItem('selectedClassId', ProfessoratState.selectedClassId);
        } else {
            localStorage.removeItem('selectedClassId');
        }
        if (deleteClassBtn) {
            deleteClassBtn.style.display = ProfessoratState.selectedClassId ? 'inline-block' : 'none';
        }
        if (classSelector && classSelector.value !== ProfessoratState.selectedClassId) {
            classSelector.value = ProfessoratState.selectedClassId || '';
        }
        if (classSelectorStudents && classSelectorStudents.value !== ProfessoratState.selectedClassId) {
            classSelectorStudents.value = ProfessoratState.selectedClassId || '';
        }

        if (ProfessoratState.selectedClassId) {
            loadExcursions(ProfessoratState.selectedClassId);
            loadHomeworks(ProfessoratState.selectedClassId);
            loadStudents(ProfessoratState.selectedClassId);
        } else {
            clearExcursionsList();
            clearHomeworksList();
            clearStudentsTable();
        }
    };

    attachOnce(classSelector, 'fallbackListener', 'change', (e) => {
        handleClassChange(e.target.value);
    });
    attachOnce(classSelectorStudents, 'fallbackListener', 'change', (e) => {
        handleClassChange(e.target.value);
    });

    attachOnce(deleteClassBtn, 'fallbackListener', 'click', (e) => {
        e.preventDefault();
        openDeleteClassModal();
    });

    attachOnce(deleteClassConfirmBtn, 'fallbackListener', 'click', (e) => {
        e.preventDefault();
        executeDeleteClass();
    });

    const createClassBtn = document.getElementById('createClassBtn');
    const createClassModal = document.getElementById('createClassModal');
    const createClassForm = document.getElementById('createClassForm');

    attachOnce(createClassBtn, 'fallbackListener', 'click', (e) => {
        e.preventDefault();
        showCreateClassDialog();
    });

    attachOnce(createClassModal, 'fallbackListener', 'click', (e) => {
        if (e.target === createClassModal) {
            closeCreateClassModal();
        }
    });

    attachOnce(createClassForm, 'fallbackListener', 'submit', (e) => {
        e.preventDefault();
    });

    const addStudentBtn = document.getElementById('addStudentBtn');
    const cancelStudentForm = document.getElementById('cancelStudentForm');
    const formStudent = document.getElementById('form-student');

    attachOnce(addStudentBtn, 'fallbackListener', 'click', (e) => {
        e.preventDefault();
        showPanel(formStudent);
        setStudentSearchVisibility(false);
    });

    attachOnce(cancelStudentForm, 'fallbackListener', 'click', (e) => {
        e.preventDefault();
        hidePanel(formStudent);
        if (formStudent) formStudent.reset();
        setStudentSearchVisibility(true);
    });

    attachOnce(formStudent, 'fallbackListener', 'submit', (e) => {
        handleCreateStudent(e);
    });

    const createExcursionBtn = document.getElementById('createExcursionBtn');
    const cancelExcursionForm = document.getElementById('cancelExcursionForm');
    const formExcursion = document.getElementById('form-excursion');

    attachOnce(createExcursionBtn, 'fallbackListener', 'click', (e) => {
        e.preventDefault();
        showPanel(formExcursion);
    });

    attachOnce(cancelExcursionForm, 'fallbackListener', 'click', (e) => {
        e.preventDefault();
        hidePanel(formExcursion);
        if (formExcursion) formExcursion.reset();
        setExcursionFormMode(false);
    });

    attachOnce(formExcursion, 'fallbackListener', 'submit', (e) => {
        handleCreateExcursion(e);
    });

    const createHomeworkBtn = document.getElementById('createHomeworkBtn');
    const cancelHomeworkForm = document.getElementById('cancelHomeworkForm');
    const formHomework = document.getElementById('form-homework');

    attachOnce(createHomeworkBtn, 'fallbackListener', 'click', (e) => {
        e.preventDefault();
        showPanel(formHomework);
    });

    attachOnce(cancelHomeworkForm, 'fallbackListener', 'click', (e) => {
        e.preventDefault();
        hidePanel(formHomework);
        if (formHomework) formHomework.reset();
    });

    attachOnce(formHomework, 'fallbackListener', 'submit', (e) => {
        handleCreateHomework(e);
    });

    const formNote = document.getElementById('form-note');
    if (!formNote || !formNote.dataset.listenerBound) {
        attachOnce(formNote, 'fallbackListener', 'submit', (e) => {
            handleCreateGrade(e);
        });
    }

    const closeGradesSectionBtn = document.getElementById('closeGradesSectionBtn');
    attachOnce(closeGradesSectionBtn, 'fallbackListener', 'click', (e) => {
        e.preventDefault();
        closeGradesSection();
    });
}

// Configurar formulari de crear classe
function setupCreateClassForm() {
    const form = document.getElementById('createClassForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const formData = new FormData(e.target);
            const name = formData.get('name').trim();
            
            if (name) {
                const result = await createClass(name);
                if (result) {
                    closeCreateClassModal();
                }
            }
            
            return false;
        }, false);
    }
    
    // Tancar modal quan es clica fora
    const modal = document.getElementById('createClassModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeCreateClassModal();
            }
        });
    }
}

// ========== GESTIÓ D'ALUMNES ==========

async function loadStudents(classId) {
    if (!classId || !supabaseClient) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('students')
            .select('*')
            .eq('class_id', classId)
            .order('last_name', { ascending: true });
        
        if (error) {
            console.error('[Professorat] Error carregant alumnes:', error);
            showFeedback('error', `Error carregant alumnes: ${error.message}`);
            ProfessoratState.students = [];
        } else {
            const rawStudents = data || [];
            const normalize = (value) => (value || '')
                .toString()
                .trim()
                .toLowerCase()
                .replace(/\s+/g, ' ');
            const seen = new Set();
            ProfessoratState.students = rawStudents.filter(student => {
                const key = `v:${normalize(student.first_name)}|${normalize(student.last_name)}|${normalize(student.email)}|${student.class_id || ''}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        }
        
        updateStudentsTable();
    } catch (error) {
        console.error('[Professorat] Excepció carregant alumnes:', error);
        showFeedback('error', 'Error de connexió amb Supabase');
        ProfessoratState.students = [];
        updateStudentsTable();
    }
}

async function handleCreateStudent(e) {
    e.preventDefault();
    
    if (!supabaseClient) {
        showFeedback('error', 'Client de Supabase no inicialitzat');
        return;
    }
    
    const formData = new FormData(e.target);
    const classIdFromForm = formData.get('classId');
    const classSelectorStudents = document.getElementById('classSelectorStudents');
    const classId = classIdFromForm
        || (classSelectorStudents ? classSelectorStudents.value : '')
        || ProfessoratState.selectedClassId;

    if (!classId) {
        showFeedback('error', 'Selecciona una classe per l\'alumne');
        return;
    }
    ProfessoratState.selectedClassId = classId;

    const studentData = {
        class_id: classId,
        first_name: formData.get('firstName'),
        last_name: formData.get('lastName'),
        email: formData.get('email') || null,
        is_active: true
    };

    const normalize = (value) => (value || '').toString().trim().toLowerCase();
    const newFirst = normalize(studentData.first_name);
    const newLast = normalize(studentData.last_name);
    const newEmail = normalize(studentData.email);
    const duplicate = ProfessoratState.students.some(s => {
        const existingEmail = normalize(s.email);
        const sameName = normalize(s.first_name) === newFirst && normalize(s.last_name) === newLast;
        if (newEmail && existingEmail) return existingEmail === newEmail;
        return sameName;
    });
    if (duplicate) {
        alert('Aquest alumne ja existeix a la classe seleccionada.');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('students')
            .insert([studentData])
            .select()
            .single();
        
        if (error) {
            console.error('[Professorat] Error creant alumne:', error);
            showFeedback('error', `Error creant alumne: ${error.message}`);
        } else {
            showFeedback('success', 'Alumne creat correctament');
            e.target.reset();
            e.target.style.display = 'none';
            setStudentSearchVisibility(true);
            await loadStudents(ProfessoratState.selectedClassId);
            
            // Obrir formulari de notes per al nou alumne
            if (data && data.id) {
                setTimeout(() => {
                    openGradeForm(
                        data.id,
                        data.first_name,
                        data.last_name,
                        getClassName(data.class_id)
                    );
                }, 300);
            }
        }
    } catch (error) {
        console.error('[Professorat] Excepció creant alumne:', error);
        showFeedback('error', 'Error de connexió amb Supabase');
    }
}

async function updateStudent(studentId, data) {
    if (!supabaseClient) {
        showFeedback('error', 'Client de Supabase no inicialitzat');
        return;
    }
    
    // Mapejar noms de camps si cal
    const updateData = {};
    if (data.first_name) updateData.first_name = data.first_name;
    if (data.last_name) updateData.last_name = data.last_name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    
    try {
        const { error } = await supabaseClient
            .from('students')
            .update(updateData)
            .eq('id', studentId);
        
        if (error) {
            console.error('[Professorat] Error actualitzant alumne:', error);
            showFeedback('error', `Error actualitzant alumne: ${error.message}`);
        } else {
            await loadStudents(ProfessoratState.selectedClassId);
            showFeedback('success', 'Alumne actualitzat');
        }
    } catch (error) {
        console.error('[Professorat] Excepció actualitzant alumne:', error);
        showFeedback('error', 'Error de connexió amb Supabase');
    }
}

async function deleteStudent(studentId) {
    if (!confirm('Estàs segur que vols eliminar aquest alumne? Això eliminarà també totes les seves notes d\'avaluació.')) return;
    
    if (!supabaseClient) {
        showFeedback('error', 'Client de Supabase no inicialitzat');
        return;
    }
    
    // Hard delete: eliminar l'alumne i les seves notes (CASCADE)
    try {
        // Primer eliminar les notes d'avaluació (si no hi ha CASCADE)
        const { error: gradesError } = await supabaseClient
            .from('grades')
            .delete()
            .eq('student_id', studentId);
        
        if (gradesError) {
            console.warn('[Professorat] Error eliminant notes:', gradesError);
        }
        
        // Després eliminar l'alumne
        const { error } = await supabaseClient
            .from('students')
            .delete()
            .eq('id', studentId);
        
        if (error) {
            console.error('[Professorat] Error eliminant alumne:', error);
            showFeedback('error', `Error eliminant alumne: ${error.message}`);
        } else {
            await loadStudents(ProfessoratState.selectedClassId);
            ProfessoratState.selectedStudentId = null;
            ProfessoratState.grades = [];
            exitGradeEditMode();
            resetStudentSelection();
            showFeedback('success', 'Alumne eliminat correctament');
        }
    } catch (error) {
        console.error('[Professorat] Excepció eliminant alumne:', error);
        showFeedback('error', 'Error de connexió amb Supabase');
    }
}

function updateStudentsTable() {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;
    
    const renderToken = ++studentsRenderToken;
    tbody.innerHTML = '';
    
    if (ProfessoratState.students.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No hi ha alumnes a aquesta classe</td></tr>';
        return;
    }
    
    // Carregar mitjanes per a tots els alumnes
    if (!supabaseClient) {
        // Si no hi ha client, mostrar sense mitjanes
        ProfessoratState.students.forEach(student => {
            const row = document.createElement('tr');
            row.dataset.studentId = student.id;
            row.innerHTML = `
                <td>${escapeHtml(student.first_name)}</td>
                <td>${escapeHtml(student.last_name)}</td>
                <td>${escapeHtml(student.email || '-')}</td>
                <td>${escapeHtml(getClassName(student.class_id))}</td>
                <td><span class="student-average">-</span></td>
                <td>
                    <label class="toggle-switch">
                        <input type="checkbox" ${student.is_active ? 'checked' : ''} 
                               onchange="toggleStudentActive('${student.id}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </td>
                <td>
                    <div class="student-actions">
                        <button class="btn-grade" onclick="openGradeForm('${student.id}', '${escapeHtml(student.first_name)}', '${escapeHtml(student.last_name)}', '${escapeHtml(getClassName(student.class_id))}')" title="Afegir nota">Afegir nota</button>
                        <button class="btn-edit" onclick="editStudent('${student.id}')">Editar</button>
                        <button class="btn-delete" onclick="deleteStudent('${student.id}')">Eliminar</button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
        return;
    }
    
    const studentIds = ProfessoratState.students.map(s => s.id);
    Promise.all(studentIds.map(async (studentId) => {
        try {
            const { data } = await supabaseClient
                .from('grades')
                .select('*')
                .eq('student_id', studentId);
            
            if (data && data.length > 0) {
                const average = calculateWeightedAverage(data);
                return { studentId, average: average !== null ? average.toFixed(2) : '-' };
            }
            return { studentId, average: '-' };
        } catch (error) {
            return { studentId, average: '-' };
        }
    })).then(averages => {
        if (renderToken !== studentsRenderToken) return;
        tbody.innerHTML = '';
        const avgMap = {};
        averages.forEach(avg => {
            avgMap[avg.studentId] = avg.average;
        });
        
        ProfessoratState.students.forEach(student => {
            const row = document.createElement('tr');
            row.dataset.studentId = student.id;
            row.innerHTML = `
                <td>${escapeHtml(student.first_name)}</td>
                <td>${escapeHtml(student.last_name)}</td>
                <td>${escapeHtml(student.email || '-')}</td>
                <td>${escapeHtml(getClassName(student.class_id))}</td>
                <td><span class="student-average">${avgMap[student.id] || '-'}</span></td>
                <td>
                    <label class="toggle-switch">
                        <input type="checkbox" ${student.is_active ? 'checked' : ''} 
                               onchange="toggleStudentActive('${student.id}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </td>
                <td>
                    <div class="student-actions">
                        <button class="btn-grade" onclick="openGradeForm('${student.id}', '${escapeHtml(student.first_name)}', '${escapeHtml(student.last_name)}', '${escapeHtml(getClassName(student.class_id))}')" title="Afegir nota">Afegir nota</button>
                        <button class="btn-edit" onclick="editStudent('${student.id}')">Editar</button>
                        <button class="btn-delete" onclick="deleteStudent('${student.id}')">Eliminar</button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    });
}

function clearStudentsTable() {
    const tbody = document.getElementById('studentsTableBody');
    if (tbody) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Selecciona una classe per veure els alumnes</td></tr>';
    }
}

function filterStudentsTable() {
    const searchTerm = document.getElementById('studentSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#studentsTableBody tr');
    
    rows.forEach(row => {
        if (row.classList.contains('empty-row')) return;
        
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

async function toggleStudentActive(studentId, isActive) {
    await updateStudent(studentId, { is_active: isActive });
}

function editStudent(studentId) {
    const student = ProfessoratState.students.find(s => s.id === studentId);
    if (!student) return;
    
    // Implementar edició (potser un modal o edició inline)
    const newFirstName = prompt('Nom:', student.first_name);
    const newLastName = prompt('Cognoms:', student.last_name);
    const newEmail = prompt('Email:', student.email || '');
    
    if (newFirstName && newLastName) {
        updateStudent(studentId, {
            first_name: newFirstName,
            last_name: newLastName,
            email: newEmail || null
        });
    }
}

// ========== GESTIÓ DE NOTES ==========

// Funció per realitzar la cerca
async function performStudentSearch() {
    const noteStudentSearch = document.getElementById('noteStudentSearch');
    if (!noteStudentSearch) return;
    
    const query = noteStudentSearch.value.trim();
    await searchStudents(query);
}

// Funció genèrica de cerca
async function searchStudents(query) {
    const resultsDiv = document.getElementById('studentSearchResults');
    
    if (!resultsDiv) return;
    
    if (query.length < 2) {
        resultsDiv.classList.remove('show');
        resultsDiv.innerHTML = '';
        return;
    }
    
    // Cercar entre tots els alumnes
    if (!supabaseClient) {
        console.error('[Professorat] Supabase client no disponible');
        return;
    }
    
    try {
        // Primer obtenir tots els alumnes actius
        const { data: students, error: studentsError } = await supabaseClient
            .from('students')
            .select('id, first_name, last_name, class_id')
            .eq('is_active', true);
        
        if (studentsError) {
            console.error('[Professorat] Error cercant alumnes:', studentsError);
            return;
        }
        
        if (!students || students.length === 0) {
            resultsDiv.classList.remove('show');
            resultsDiv.innerHTML = '';
            return;
        }
        
        // Filtrar per nom (ja que Supabase pot no tenir ilike correctament configurat)
        const queryLower = query.toLowerCase();
        const matches = students.filter(s => {
            const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
            return fullName.includes(queryLower);
        }).slice(0, 10);
        
        if (matches.length > 0) {
            // Obtenir noms de classes per als alumnes trobats
            const classIds = [...new Set(matches.map(s => s.class_id))];
            const { data: classes } = await supabaseClient
                .from('classes')
                .select('id, name')
                .in('id', classIds);
            
            const classMap = {};
            if (classes) {
                classes.forEach(c => classMap[c.id] = c.name);
            }
            
            resultsDiv.innerHTML = matches.map(s => {
                const className = classMap[s.class_id] || 'Classe desconeguda';
                const fullName = `${s.first_name} ${s.last_name}`;
                return `
                    <div class="search-result-item" onclick="selectStudentForNotes('${s.id}', '${escapeHtml(fullName)}', '${escapeHtml(className)}')">
                        <strong>${escapeHtml(fullName)}</strong> <span style="color: #666;">- ${escapeHtml(className)}</span>
                    </div>
                `;
            }).join('');
            resultsDiv.classList.add('show');
        } else {
            resultsDiv.classList.remove('show');
            resultsDiv.innerHTML = '';
        }
    } catch (error) {
        console.error('[Professorat] Excepció cercant alumnes:', error);
        resultsDiv.classList.remove('show');
        resultsDiv.innerHTML = '';
    }
}

function openGradeForm(studentId, firstName, lastName, className) {
    exitGradeEditMode();
    ProfessoratState.selectedStudentId = studentId;
    const fullName = `${firstName} ${lastName}`;
    
    // Actualitzar el nom de l'alumne a la toolbar
    const toolbarNameEl = document.getElementById('selectedStudentNameToolbar');
    if (toolbarNameEl) {
        toolbarNameEl.textContent = `Notes de ${fullName} (${className})`;
    }
    
    // Mostrar secció de notes
    const gradesSection = document.getElementById('gradesSection');
    if (gradesSection) {
        gradesSection.style.display = 'block';
        // Scroll suau fins a la secció
        gradesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    
    // Carregar notes d'avaluació i calcular mitjana
    loadGrades(studentId).then(() => {
        calculateAndDisplayAverage(studentId);
    });
}

function closeGradesSection() {
    const gradesSection = document.getElementById('gradesSection');
    if (gradesSection) {
        gradesSection.style.display = 'none';
    }
    ProfessoratState.selectedStudentId = null;
}

async function selectStudentForNotes(studentId, studentName, className) {
    const nameParts = studentName.split(' ');
    openGradeForm(studentId, nameParts[0], nameParts.slice(1).join(' '), className);
}

function resetStudentSelection() {
    ProfessoratState.selectedStudentId = null;
    const gradesSection = document.getElementById('gradesSection');
    if (gradesSection) {
        gradesSection.style.display = 'none';
    }
}

// ========== GESTIÓ DE NOTES D'AVALUACIÓ (GRADES) ==========

async function loadGrades(studentId) {
    if (!supabaseClient) {
        console.error('[Professorat] Client de Supabase no inicialitzat');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('grades')
            .select('*')
            .eq('student_id', studentId)
            .order('date', { ascending: false });
        
        if (error) {
            console.error('[Professorat] Error carregant notes:', error);
            showFeedback('error', `Error carregant notes: ${error.message}`);
            ProfessoratState.grades = [];
        } else {
            ProfessoratState.grades = data || [];
            console.log(`[Professorat] Notes carregades: ${ProfessoratState.grades.length}`);
        }
        
        updateGradesHistory();
    } catch (error) {
        console.error('[Professorat] Excepció carregant notes:', error);
        showFeedback('error', 'Error de connexió amb Supabase');
        ProfessoratState.grades = [];
        updateGradesHistory();
    }
}

function exitGradeEditMode() {
    const form = document.getElementById('form-note');
    if (form) {
        form.reset();
        const submitBtn = form.querySelector('.form-submit-btn');
        if (submitBtn) submitBtn.textContent = 'Guardar Nota';
    }
    const cancelBtn = document.getElementById('cancelGradeEditBtn');
    if (cancelBtn) {
        cancelBtn.style.display = 'none';
    }
    ProfessoratState.editingGradeId = null;
}

function enterGradeEditMode(grade) {
    const form = document.getElementById('form-note');
    if (!form) return;
    const valueInput = document.getElementById('grade-value');
    const typeInput = document.getElementById('grade-type');
    const dateInput = document.getElementById('grade-date');

    if (valueInput) valueInput.value = grade.value;
    if (typeInput) typeInput.value = grade.type || '';
    if (dateInput) dateInput.value = grade.date ? grade.date : '';

    const submitBtn = form.querySelector('.form-submit-btn');
    if (submitBtn) submitBtn.textContent = 'Actualitzar Nota';

    const cancelBtn = document.getElementById('cancelGradeEditBtn');
    if (cancelBtn) {
        cancelBtn.style.display = 'inline-block';
    }

    ProfessoratState.editingGradeId = grade.id;
}

function prepareGradeEdit(gradeId) {
    const grade = ProfessoratState.grades.find(g => g.id === gradeId);
    if (!grade) return;
    enterGradeEditMode(grade);
    const gradesSection = document.getElementById('gradesSection');
    if (gradesSection) {
        gradesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

async function updateGrade(gradeId, gradeData) {
    if (!supabaseClient) {
        showFeedback('error', 'Client de Supabase no inicialitzat');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('grades')
            .update(gradeData)
            .eq('id', gradeId);

        if (error) {
            console.error('[Professorat] Error actualitzant nota:', error);
            showFeedback('error', `Error actualitzant nota: ${error.message}`);
            return;
        }

        showFeedback('success', 'Nota actualitzada correctament');
        exitGradeEditMode();
        await loadGrades(ProfessoratState.selectedStudentId);
        await calculateAndDisplayAverage(ProfessoratState.selectedStudentId);
    } catch (error) {
        console.error('[Professorat] Excepció actualitzant nota:', error);
        showFeedback('error', 'Error de connexió amb Supabase');
    }
}

async function deleteGrade(gradeId) {
    if (!supabaseClient) {
        showFeedback('error', 'Client de Supabase no inicialitzat');
        return;
    }

    const confirmed = confirm('Segur que vols eliminar aquesta nota?');
    if (!confirmed) return;

    try {
        const { error } = await supabaseClient
            .from('grades')
            .delete()
            .eq('id', gradeId);

        if (error) {
            console.error('[Professorat] Error eliminant nota:', error);
            showFeedback('error', `Error eliminant nota: ${error.message}`);
            return;
        }

        if (ProfessoratState.editingGradeId === gradeId) {
            exitGradeEditMode();
        }

        showFeedback('success', 'Nota eliminada');
        await loadGrades(ProfessoratState.selectedStudentId);
        await calculateAndDisplayAverage(ProfessoratState.selectedStudentId);
    } catch (error) {
        console.error('[Professorat] Excepció eliminant nota:', error);
        showFeedback('error', 'Error de connexió amb Supabase');
    }
}

function calculateWeightedAverage(grades) {
    if (!grades || grades.length === 0) return null;
    
    // Agrupar notes per tipus
    const gradesByType = {
        exam: [],
        homework: [],
        activity: []
    };
    
    grades.forEach(grade => {
        const type = grade.type;
        if (gradesByType[type]) {
            gradesByType[type].push(parseFloat(grade.value || 0));
        }
    });
    
    // Calcular mitjana per cada tipus
    const averagesByType = {};
    Object.keys(gradesByType).forEach(type => {
        const typeGrades = gradesByType[type];
        if (typeGrades.length > 0) {
            const sum = typeGrades.reduce((acc, val) => acc + val, 0);
            averagesByType[type] = sum / typeGrades.length;
        }
    });
    
    // Calcular mitjana ponderada
    let weightedSum = 0;
    let totalWeight = 0;
    
    Object.keys(EVALUATION_CRITERIA).forEach(type => {
        if (averagesByType[type] !== undefined) {
            const weight = EVALUATION_CRITERIA[type];
            weightedSum += averagesByType[type] * weight;
            totalWeight += weight;
        }
    });
    
    if (totalWeight === 0) return null;
    return weightedSum / totalWeight;
}

async function calculateAndDisplayAverage(studentId) {
    if (!supabaseClient) return;
    
    try {
        // Carregar totes les notes de l'alumne
        const { data: grades, error } = await supabaseClient
            .from('grades')
            .select('*')
            .eq('student_id', studentId);
        
        if (error) {
            console.error('[Professorat] Error carregant notes per mitjana:', error);
            // Utilitzar notes ja carregades
            const average = calculateWeightedAverage(ProfessoratState.grades);
            const formatted = average !== null ? average.toFixed(2) : '-';
            // document.getElementById('studentAverage').textContent = formatted; // Eliminat: ja no mostrem la mitjana
            updateStudentAverageCell(studentId, formatted);
            return;
        }
        
        // Calcular mitjana ponderada
        const average = calculateWeightedAverage(grades || []);
        const formatted = average !== null ? average.toFixed(2) : '-';
        // document.getElementById('studentAverage').textContent = formatted; // Eliminat: ja no mostrem la mitjana
        updateStudentAverageCell(studentId, formatted);
    } catch (error) {
        console.error('[Professorat] Error calculant mitjana:', error);
        // Calcular amb les notes ja carregades
        const average = calculateWeightedAverage(ProfessoratState.grades);
        const formatted = average !== null ? average.toFixed(2) : '-';
        // document.getElementById('studentAverage').textContent = formatted; // Eliminat: ja no mostrem la mitjana
        updateStudentAverageCell(studentId, formatted);
    }
}

function updateStudentAverageCell(studentId, value) {
    if (!studentId) return;
    const cell = document.querySelector(`#studentsTableBody tr[data-student-id="${studentId}"] .student-average`);
    if (cell) cell.textContent = value;
}

async function handleCreateGrade(e) {
    e.preventDefault();
    
    if (!ProfessoratState.selectedStudentId) {
        showFeedback('error', 'Selecciona un alumne primer');
        return;
    }
    
    if (!supabaseClient) {
        showFeedback('error', 'Client de Supabase no inicialitzat');
        return;
    }
    
    const formData = new FormData(e.target);
    const rawValue = (formData.get('value') || '').toString().trim();
    const normalizedValue = rawValue.replace(',', '.');
    const numericValue = parseFloat(normalizedValue);

    if (Number.isNaN(numericValue)) {
        showFeedback('error', 'Introdueix una qualificació numèrica vàlida (0-10)');
        return;
    }

      const rawDate = (formData.get('date') || '').toString().trim();
      const gradeData = {
          student_id: ProfessoratState.selectedStudentId,
          value: numericValue,
          type: formData.get('type'),
          date: rawDate ? rawDate : null
      };
    
    if (ProfessoratState.editingGradeId) {
        await updateGrade(ProfessoratState.editingGradeId, gradeData);
        return;
    }

    // Validar qualificació
    if (gradeData.value < 0 || gradeData.value > 10) {
        showFeedback('error', 'La qualificació ha de ser entre 0 i 10');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('grades')
            .insert([gradeData])
            .select()
            .single();
        
        if (error) {
            console.error('[Professorat] Error creant nota:', error);
            showFeedback('error', `Error creant nota: ${error.message}`);
        } else {
            showFeedback('success', 'Nota d\'avaluació creada correctament');
            e.target.reset();
            await loadGrades(ProfessoratState.selectedStudentId);
            await calculateAndDisplayAverage(ProfessoratState.selectedStudentId);
        }
    } catch (error) {
        console.error('[Professorat] Excepció creant nota:', error);
        showFeedback('error', 'Error de connexió amb Supabase');
    }
}

function updateGradesHistory() {
    const notesHistory = document.getElementById('notesHistory');
    
    if (!notesHistory) return;
    
    if (!ProfessoratState.grades || ProfessoratState.grades.length === 0) {
        notesHistory.innerHTML = '<p>No hi ha notes per aquest alumne</p>';
    } else {
        notesHistory.innerHTML = ProfessoratState.grades.map(grade => {
            const typeLabels = {
                exam: 'Examen (80%)',
                homework: 'Deure (10%)',
                activity: 'Activitat (10%)'
            };
            const typeLabel = typeLabels[grade.type] || grade.type;
            const date = grade.date ? new Date(grade.date).toLocaleDateString('ca-ES') : 'Sense data';
            const value = parseFloat(grade.value).toFixed(2);

            return `
            <div class="note-item" onclick="prepareGradeEdit('${grade.id}')">
                <div class="note-header">
                    <h4>${value} - ${typeLabel}</h4>
                    <div class="note-actions">
                        <button type="button" class="btn-delete" onclick="event.stopPropagation(); deleteGrade('${grade.id}')">Eliminar</button>
                    </div>
                </div>
                <p>Data: ${date}</p>
            </div>
            `;
        }).join('');
    }
}




// ========== GESTIÓ D'EXCURSIONS ==========

async function loadExcursions(classId) {
    if (!classId || !supabaseClient) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('excursions')
            .select('*')
            .eq('class_id', classId)
            .order('date', { ascending: false });
        
        if (error) {
            console.error('[Professorat] Error carregant excursions:', error);
            ProfessoratState.excursions = [];
        } else {
            ProfessoratState.excursions = data || [];
        }
        
        updateExcursionsList();
    } catch (error) {
        console.error('[Professorat] Excepció carregant excursions:', error);
        ProfessoratState.excursions = [];
        updateExcursionsList();
    }
}

async function handleCreateExcursion(e) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[Professorat] handleCreateExcursion cridat');
    console.log('[Professorat] selectedClassId:', ProfessoratState.selectedClassId);
    
    if (!ProfessoratState.selectedClassId) {
        showFeedback('error', 'Selecciona una classe primer');
        return false;
    }
    
    if (!supabaseClient) {
        showFeedback('error', 'Client de Supabase no inicialitzat');
        return false;
    }
    
    const formData = new FormData(e.target);
    const excursionData = {
        class_id: ProfessoratState.selectedClassId,
        title: formData.get('title'),
        date: formData.get('date'),
        price: formData.get('price') ? parseFloat(formData.get('price')) : null
    };
    
    console.log('[Professorat] Dades excursió:', excursionData);
    
    try {
        let excursion = null;
        let excursionError = null;

        if (ProfessoratState.editingExcursionId) {
            ({ data: excursion, error: excursionError } = await supabaseClient
                .from('excursions')
                .update({
                    title: excursionData.title,
                    date: excursionData.date,
                    price: excursionData.price
                })
                .eq('id', ProfessoratState.editingExcursionId)
                .select()
                .single());
        } else {
            ({ data: excursion, error: excursionError } = await supabaseClient
                .from('excursions')
                .insert([excursionData])
                .select()
                .single());
        }
        
        if (excursionError) {
            console.error('[Professorat] Error creant excursió:', excursionError);
            showFeedback('error', `Error creant excursió: ${excursionError.message}`);
            return false;
        }
        
        console.log('[Professorat] Excursió guardada:', excursion);

        if (!ProfessoratState.editingExcursionId) {
            // Crear status per a tots els alumnes de la classe
            const { data: students } = await supabaseClient
                .from('students')
                .select('id')
                .eq('class_id', ProfessoratState.selectedClassId)
                .eq('is_active', true);
            
            if (students && students.length > 0) {
                const statusRecords = students.map(s => ({
                    excursion_id: excursion.id,
                    student_id: s.id,
                    attends: false,
                    paid: false
                }));
                
                await supabaseClient
                    .from('excursion_status')
                    .insert(statusRecords);
            }
        }
        
        showFeedback('success', ProfessoratState.editingExcursionId ? 'Excursió actualitzada' : 'Excursió creada correctament');
        e.target.reset();
        e.target.style.display = 'none';
        setExcursionFormMode(false);
        await loadExcursions(ProfessoratState.selectedClassId);
    } catch (error) {
        console.error('[Professorat] Excepció creant excursió:', error);
        showFeedback('error', 'Error de connexió amb Supabase');
    }
    
    return false;
}

function updateExcursionsList() {
    const list = document.getElementById('excursionsList');
    if (!list) return;
    
    const activeClassId = ProfessoratState.selectedClassId;
    const excursionsForClass = activeClassId
        ? ProfessoratState.excursions.filter(exc => exc.class_id === activeClassId)
        : [];

    if (excursionsForClass.length === 0) {
        list.innerHTML = '<p>No hi ha excursions per aquesta classe</p>';
        return;
    }
    
    list.innerHTML = excursionsForClass.map(exc => `
        <div class="excursion-item">
            <div class="excursion-info">
                <h4>${escapeHtml(exc.title)}</h4>
                <p>Data: ${formatDate(exc.date)} ${exc.price ? `- Preu: ${exc.price}€` : ''}</p>
            </div>
            <div class="excursion-actions">
                <button type="button" class="detail-action-btn" onclick="openExcursionAttendance('${exc.id}')">Gestionar assistència</button>
                <button type="button" class="detail-action-btn" onclick="openExcursionEdit('${exc.id}')">Editar</button>
                <button type="button" class="detail-action-btn" onclick="deleteExcursion('${exc.id}')">Eliminar</button>
            </div>
        </div>
    `).join('');
}

function clearExcursionsList() {
    const list = document.getElementById('excursionsList');
    if (list) list.innerHTML = '';
}

function setExcursionFormMode(isEditing) {
    const form = document.getElementById('form-excursion');
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    if (submitBtn) {
        submitBtn.textContent = isEditing ? 'Guardar canvis' : 'Guardar Excursió';
    }
    if (!isEditing) {
        ProfessoratState.editingExcursionId = null;
    }
}

function openExcursionEdit(excursionId) {
    const excursion = ProfessoratState.excursions.find(exc => exc.id === excursionId);
    const form = document.getElementById('form-excursion');
    if (!form || !excursion) return;
    form.style.display = 'block';
    form.classList.remove('hidden-panel');
    document.getElementById('excursionTitle').value = excursion.title || '';
    document.getElementById('excursionDate').value = excursion.date || '';
    document.getElementById('excursionPrice').value = excursion.price ?? '';
    ProfessoratState.editingExcursionId = excursionId;
    setExcursionFormMode(true);
}

async function deleteExcursion(excursionId) {
    if (!confirm('Vols eliminar aquesta excursió?')) return;
    if (!supabaseClient) {
        showFeedback('error', 'Client de Supabase no inicialitzat');
        return;
    }
    try {
        await supabaseClient
            .from('excursion_status')
            .delete()
            .eq('excursion_id', excursionId);
        const { error } = await supabaseClient
            .from('excursions')
            .delete()
            .eq('id', excursionId);
        if (error) {
            showFeedback('error', `Error eliminant excursió: ${error.message}`);
            return;
        }
        if (ProfessoratState.selectedExcursionId === excursionId) {
            closeExcursionDetail();
        }
        await loadExcursions(ProfessoratState.selectedClassId);
        showFeedback('success', 'Excursió eliminada');
    } catch (error) {
        console.error('[Professorat] Excepció eliminant excursió:', error);
        showFeedback('error', 'Error de connexió amb Supabase');
    }
}

function openExcursionAttendance(excursionId) {
    loadExcursionDetail(excursionId);
}

async function loadExcursionDetail(excursionId) {
    if (!supabaseClient) return;
    
    ProfessoratState.selectedExcursionId = excursionId;
    const homeworkDetail = document.getElementById('homeworkDetail');
    if (homeworkDetail) homeworkDetail.style.display = 'none';
    
    try {
        // Carregar excursió
        const { data: excursion, error: excursionError } = await supabaseClient
            .from('excursions')
            .select('*')
            .eq('id', excursionId)
            .single();
        
        if (excursionError) {
            console.error('[Professorat] Error carregant excursió:', excursionError);
            showFeedback('error', 'Error carregant excursió');
            return;
        }
        
        // Carregar alumnes de la classe
        const { data: students, error: studentsError } = await supabaseClient
            .from('students')
            .select('id, first_name, last_name')
            .eq('class_id', excursion.class_id)
            .eq('is_active', true)
            .order('last_name', { ascending: true });
        
        if (studentsError) {
            console.error('[Professorat] Error carregant alumnes:', studentsError);
            showFeedback('error', 'Error carregant alumnes');
            return;
        }
        
        // Carregar status de cada alumne
        const { data: statuses } = await supabaseClient
            .from('excursion_status')
            .select('*')
            .eq('excursion_id', excursionId);
        
        // Crear mapa de status per alumne
        const statusMap = {};
        if (statuses) {
            statuses.forEach(s => {
                statusMap[s.student_id] = s;
            });
        }
        
        document.getElementById('excursionDetailTitle').textContent = excursion.title;
        const meta = document.getElementById('excursionDetailMeta');
        if (meta) {
            const priceText = excursion.price ? ` - Preu: ${excursion.price}€` : '';
            meta.textContent = `Data: ${formatDate(excursion.date)}${priceText}`;
        }
        const editBtn = document.getElementById('excursionEditBtn');
        const deleteBtn = document.getElementById('excursionDeleteBtn');
        if (editBtn) {
            editBtn.onclick = () => openExcursionEdit(excursionId);
        }
        if (deleteBtn) {
            deleteBtn.onclick = () => deleteExcursion(excursionId);
        }
        document.getElementById('excursionDetail').style.display = 'block';
        attachExcursionDetailScrollGuard();
        
        const tbody = document.getElementById('excursionStatusTableBody');
        tbody.innerHTML = '';
        
        students.forEach(student => {
            const status = statusMap[student.id] || { attends: false, paid: false, comment: '' };
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(student.first_name)} ${escapeHtml(student.last_name)}</td>
                  <td>
                      <input type="checkbox" ${status.attends ? 'checked' : ''} 
                             aria-label="Ve"
                             onchange="updateExcursionStatus('${excursionId}', '${student.id}', 'attends', this.checked)">
                  </td>
                  <td>
                      <input type="checkbox" ${status.paid ? 'checked' : ''} 
                             aria-label="Pagat"
                             onchange="updateExcursionStatus('${excursionId}', '${student.id}', 'paid', this.checked)">
                  </td>
                <td>
                    <input type="text" value="${escapeHtml(status.comment || '')}" 
                           placeholder="Comentari..." 
                           onblur="updateExcursionStatus('${excursionId}', '${student.id}', 'comment', this.value)">
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('[Professorat] Excepció carregant detall excursió:', error);
        showFeedback('error', 'Error de connexió amb Supabase');
    }
}

async function updateExcursionStatus(excursionId, studentId, field, value) {
    if (!supabaseClient) return;
    
    try {
        // Verificar si ja existeix un registre
        const { data: existing } = await supabaseClient
            .from('excursion_status')
            .select('id')
            .eq('excursion_id', excursionId)
            .eq('student_id', studentId)
            .single();
        
        const updateData = { [field]: value, updated_at: new Date().toISOString() };
        
        if (existing) {
            // Actualitzar registre existent
            const { error } = await supabaseClient
                .from('excursion_status')
                .update(updateData)
                .eq('id', existing.id);
            
            if (error) {
                console.error('[Professorat] Error actualitzant status:', error);
            }
        } else {
            // Crear nou registre
            const { error } = await supabaseClient
                .from('excursion_status')
                .insert([{
                    excursion_id: excursionId,
                    student_id: studentId,
                    ...updateData
                }]);
            
            if (error) {
                console.error('[Professorat] Error creant status:', error);
            }
        }
        
        // Evitar feedback visual per no generar salts de scroll.
    } catch (error) {
        console.error('[Professorat] Excepció actualitzant status:', error);
    }
}

// ========== GESTIÓ DE DEURES ==========

async function loadHomeworks(classId) {
    if (!classId || !supabaseClient) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('homeworks')
            .select('*')
            .eq('class_id', classId)
            .order('due_date', { ascending: false });
        
        if (error) {
            console.error('[Professorat] Error carregant deures:', error);
            ProfessoratState.homeworks = [];
        } else {
            ProfessoratState.homeworks = data || [];
        }
        
        updateHomeworksList();
    } catch (error) {
        console.error('[Professorat] Excepció carregant deures:', error);
        ProfessoratState.homeworks = [];
        updateHomeworksList();
    }
}

async function handleCreateHomework(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!ProfessoratState.selectedClassId) {
        showFeedback('error', 'Selecciona una classe primer');
        return;
    }
    
    if (!supabaseClient) {
        showFeedback('error', 'Client de Supabase no inicialitzat');
        return;
    }
    
    const formData = new FormData(e.target);
    const homeworkData = {
        class_id: ProfessoratState.selectedClassId,
        title: formData.get('title'),
        subject: formData.get('subject') || null,
        due_date: formData.get('dueDate'),
        description: formData.get('description') || null
    };
    
    try {
        const { data: homework, error: homeworkError } = await supabaseClient
            .from('homeworks')
            .insert([homeworkData])
            .select()
            .single();
        
        if (homeworkError) {
            console.error('[Professorat] Error creant deure:', homeworkError);
            showFeedback('error', `Error creant deure: ${homeworkError.message}`);
            return;
        }
        
        // Crear status per a tots els alumnes de la classe
        const { data: students } = await supabaseClient
            .from('students')
            .select('id')
            .eq('class_id', ProfessoratState.selectedClassId)
            .eq('is_active', true);
        
        if (students && students.length > 0) {
            const statusRecords = students.map(s => ({
                homework_id: homework.id,
                student_id: s.id,
                delivered: false
            }));
            
            await supabaseClient
                .from('homework_status')
                .insert(statusRecords);
        }
        
        showFeedback('success', 'Deure creat correctament');
        e.target.reset();
        e.target.style.display = 'none';
        await loadHomeworks(ProfessoratState.selectedClassId);
    } catch (error) {
        console.error('[Professorat] Excepció creant deure:', error);
        showFeedback('error', 'Error de connexió amb Supabase');
    }
}

function updateHomeworksList() {
    const list = document.getElementById('homeworksList');
    if (!list) return;
    
    if (ProfessoratState.homeworks.length === 0) {
        list.innerHTML = '<p>No hi ha deures per aquesta classe</p>';
        return;
    }
    
    list.innerHTML = ProfessoratState.homeworks.map(hw => `
        <div class="homework-item" onclick="loadHomeworkDetail('${hw.id}')">
            <h4>${escapeHtml(hw.title)}</h4>
            <p>${hw.subject ? `Assignatura: ${escapeHtml(hw.subject)} - ` : ''}Data entrega: ${formatDate(hw.due_date)}</p>
        </div>
    `).join('');
}

function clearHomeworksList() {
    const list = document.getElementById('homeworksList');
    if (list) list.innerHTML = '';
}

async function loadHomeworkDetail(homeworkId) {
    if (!supabaseClient) return;
    
    ProfessoratState.selectedHomeworkId = homeworkId;
    const excursionDetail = document.getElementById('excursionDetail');
    if (excursionDetail) excursionDetail.style.display = 'none';
    
    try {
        // Carregar deure
        const { data: homework, error: homeworkError } = await supabaseClient
            .from('homeworks')
            .select('*')
            .eq('id', homeworkId)
            .single();
        
        if (homeworkError) {
            console.error('[Professorat] Error carregant deure:', homeworkError);
            showFeedback('error', 'Error carregant deure');
            return;
        }
        
        // Carregar alumnes de la classe
        const { data: students, error: studentsError } = await supabaseClient
            .from('students')
            .select('id, first_name, last_name')
            .eq('class_id', homework.class_id)
            .eq('is_active', true)
            .order('last_name', { ascending: true });
        
        if (studentsError) {
            console.error('[Professorat] Error carregant alumnes:', studentsError);
            showFeedback('error', 'Error carregant alumnes');
            return;
        }
        
        // Carregar status de cada alumne
        const { data: statuses } = await supabaseClient
            .from('homework_status')
            .select('*')
            .eq('homework_id', homeworkId);
        
        // Crear mapa de status per alumne
        const statusMap = {};
        if (statuses) {
            statuses.forEach(s => {
                statusMap[s.student_id] = s;
            });
        }
        
        document.getElementById('homeworkDetailTitle').textContent = homework.title;
        document.getElementById('homeworkDetail').style.display = 'block';
        
        // Afegir status a cada estudiant
        const studentsWithStatus = students.map(s => ({
            ...s,
            status: statusMap[s.id] || { delivered: false, comment: '' }
        }));
        
        updateHomeworkStatusTable(studentsWithStatus);
    } catch (error) {
        console.error('[Professorat] Excepció carregant detall deure:', error);
        showFeedback('error', 'Error de connexió amb Supabase');
    }
}

function updateHomeworkStatusTable(students) {
    const tbody = document.getElementById('homeworkStatusTableBody');
    tbody.innerHTML = '';
    
    students.forEach(student => {
        const status = student.status || { delivered: false, comment: '' };
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(student.first_name)} ${escapeHtml(student.last_name)}</td>
            <td>
                <input type="checkbox" ${status.delivered ? 'checked' : ''} 
                       onchange="updateHomeworkStatus('${ProfessoratState.selectedHomeworkId}', '${student.id}', 'delivered', this.checked)">
            </td>
            <td>
                <input type="text" value="${escapeHtml(status.comment || '')}" 
                       placeholder="Comentari..." 
                       onblur="updateHomeworkStatus('${ProfessoratState.selectedHomeworkId}', '${student.id}', 'comment', this.value)">
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function updateHomeworkStatus(homeworkId, studentId, field, value) {
    if (!supabaseClient) return;
    
    try {
        // Verificar si ja existeix un registre
        const { data: existing } = await supabaseClient
            .from('homework_status')
            .select('id')
            .eq('homework_id', homeworkId)
            .eq('student_id', studentId)
            .single();
        
        const updateData = { [field]: value, updated_at: new Date().toISOString() };
        
        if (existing) {
            // Actualitzar registre existent
            const { error } = await supabaseClient
                .from('homework_status')
                .update(updateData)
                .eq('id', existing.id);
            
            if (error) {
                console.error('[Professorat] Error actualitzant status:', error);
            }
        } else {
            // Crear nou registre
            const { error } = await supabaseClient
                .from('homework_status')
                .insert([{
                    homework_id: homeworkId,
                    student_id: studentId,
                    ...updateData
                }]);
            
            if (error) {
                console.error('[Professorat] Error creant status:', error);
            }
        }
        
        // Evitar feedback visual per no generar salts de scroll.
    } catch (error) {
        console.error('[Professorat] Excepció actualitzant status:', error);
    }
}

// ========== FUNCIONS AUXILIARS ==========

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ca-ES');
}

function getSeverityLabel(severity) {
    const labels = {
        low: 'Baixa',
        medium: 'Mitja',
        high: 'Alta'
    };
    return labels[severity] || severity;
}

function getClassName(classId) {
    const cls = ProfessoratState.classes.find(c => c.id === classId);
    return cls ? cls.name : '';
}

function showFeedback(type, message, duration = 5000) {
    return;
    const feedback = document.getElementById('formFeedback-gpt');
    if (!feedback) return;
    
    // Si ja hi ha un missatge mostrant-se, ocultar-lo primer
    if (feedback.classList.contains('show')) {
        feedback.classList.remove('show');
        feedback.classList.add('hiding');
        
        setTimeout(() => {
            feedback.classList.remove('hiding');
            displayNewFeedback();
        }, 300);
    } else {
        displayNewFeedback();
    }
    
    function displayNewFeedback() {
        feedback.className = `form-feedback ${type}`;
        feedback.textContent = message;
        
        // Forçar reflow per assegurar que la transició funciona
        void feedback.offsetWidth;
        
        // Mostrar amb animació
        setTimeout(() => {
            feedback.classList.add('show');
        }, 10);
        
        // Ocultar amb animació després de la durada
        setTimeout(() => {
            feedback.classList.remove('show');
            feedback.classList.add('hiding');
            
            setTimeout(() => {
                feedback.classList.remove('hiding');
                feedback.textContent = '';
            }, 300);
        }, duration);
    }
}

async function handleGlobalStudentSearch(e) {
    const query = e.target.value.trim();
    const resultsDiv = document.getElementById('globalSearchResults');
    
    if (!resultsDiv) return;
    
    if (query.length < 2) {
        resultsDiv.classList.remove('show');
        resultsDiv.innerHTML = '';
        return;
    }
    
    // Cercar entre tots els alumnes
    if (!supabaseClient) {
        console.error('[Professorat] Supabase client no disponible');
        return;
    }
    
    try {
        // Obtenir tots els alumnes actius
        const { data: students, error: studentsError } = await supabaseClient
            .from('students')
            .select('id, first_name, last_name, class_id')
            .eq('is_active', true);
        
        if (studentsError) {
            console.error('[Professorat] Error cercant alumnes:', studentsError);
            return;
        }
        
        if (!students || students.length === 0) {
            resultsDiv.classList.remove('show');
            resultsDiv.innerHTML = '';
            return;
        }
        
        // Filtrar per nom
        const queryLower = query.toLowerCase();
        const matches = students.filter(s => {
            const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
            return fullName.includes(queryLower);
        }).slice(0, 10);
        
        if (matches.length > 0) {
            // Obtenir noms de classes per als alumnes trobats
            const classIds = [...new Set(matches.map(s => s.class_id))];
            const { data: classes } = await supabaseClient
                .from('classes')
                .select('id, name')
                .in('id', classIds);
            
            const classMap = {};
            if (classes) {
                classes.forEach(c => classMap[c.id] = c.name);
            }
            
            resultsDiv.innerHTML = matches.map(s => {
                const className = classMap[s.class_id] || 'Classe desconeguda';
                return `
                    <div class="search-result-item" onclick="selectStudentFromGlobalSearch('${s.id}', '${escapeHtml(s.first_name)}', '${escapeHtml(s.last_name)}', '${escapeHtml(className)}')">
                        <strong>${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}</strong> <span style="color: #666;">- ${escapeHtml(className)}</span>
                    </div>
                `;
            }).join('');
            resultsDiv.classList.add('show');
        } else {
            resultsDiv.classList.remove('show');
            resultsDiv.innerHTML = '';
        }
    } catch (error) {
        console.error('[Professorat] Excepció cercant alumnes:', error);
        resultsDiv.classList.remove('show');
        resultsDiv.innerHTML = '';
    }
}

function selectStudentFromGlobalSearch(studentId, firstName, lastName, className) {
    // Tancar resultats del cercador global
    const globalResults = document.getElementById('globalSearchResults');
    if (globalResults) {
        globalResults.classList.remove('show');
    }
    
    // Netejar cercador global
    const globalSearch = document.getElementById('globalStudentSearch');
    if (globalSearch) {
        globalSearch.value = '';
    }
    
    // Canviar a pestanya Alumnes (que ara inclou Notes)
    const studentsTab = document.querySelector('[data-tab="students"]');
    if (studentsTab) {
        studentsTab.click();
        
        // Seleccionar l'alumne després d'un petit delay per assegurar que la pestanya està activa
        setTimeout(() => {
            selectStudentForNotes(studentId, `${firstName} ${lastName}`, className);
        }, 100);
    }
}

// Funcions per marcar tots els alumnes
async function markAllExcursion(field, value) {
    if (!ProfessoratState.selectedExcursionId || !supabaseClient) return;
    
    try {
        // Carregar excursió per obtenir class_id
        const { data: excursion } = await supabaseClient
            .from('excursions')
            .select('class_id')
            .eq('id', ProfessoratState.selectedExcursionId)
            .single();
        
        if (!excursion) return;
        
        // Obtenir tots els alumnes de la classe
        const { data: students } = await supabaseClient
            .from('students')
            .select('id')
            .eq('class_id', excursion.class_id)
            .eq('is_active', true);
        
        if (!students || students.length === 0) return;
        
        // Actualitzar o crear status per a tots els alumnes
        const promises = students.map(async (student) => {
            // Verificar si existeix
            const { data: existing } = await supabaseClient
                .from('excursion_status')
                .select('id')
                .eq('excursion_id', ProfessoratState.selectedExcursionId)
                .eq('student_id', student.id)
                .single();
            
            const updateData = { [field]: value, updated_at: new Date().toISOString() };
            
            if (existing) {
                return supabaseClient
                    .from('excursion_status')
                    .update(updateData)
                    .eq('id', existing.id);
            } else {
                return supabaseClient
                    .from('excursion_status')
                    .insert([{
                        excursion_id: ProfessoratState.selectedExcursionId,
                        student_id: student.id,
                        ...updateData
                    }]);
            }
        });
        
        await Promise.all(promises);
        await loadExcursionDetail(ProfessoratState.selectedExcursionId);
        showFeedback('success', 'Tots els alumnes actualitzats');
    } catch (error) {
        console.error('[Professorat] Excepció marcant tots:', error);
        showFeedback('error', 'Error actualitzant alumnes');
    }
}

function closeExcursionDetail() {
    document.getElementById('excursionDetail').style.display = 'none';
    ProfessoratState.selectedExcursionId = null;
}

function closeHomeworkDetail() {
    document.getElementById('homeworkDetail').style.display = 'none';
    ProfessoratState.selectedHomeworkId = null;
}

// Exportar funcions globals necessàries
window.selectStudentForNotes = selectStudentForNotes;
window.openGradeForm = openGradeForm;
window.selectStudentFromGlobalSearch = selectStudentFromGlobalSearch;
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
window.toggleStudentActive = toggleStudentActive;
window.loadExcursionDetail = loadExcursionDetail;
window.openExcursionAttendance = openExcursionAttendance;
window.openExcursionEdit = openExcursionEdit;
window.deleteExcursion = deleteExcursion;
window.updateExcursionStatus = updateExcursionStatus;
window.loadHomeworkDetail = loadHomeworkDetail;
window.updateHomeworkStatus = updateHomeworkStatus;
window.markAllExcursion = markAllExcursion;
window.closeExcursionDetail = closeExcursionDetail;
window.closeHomeworkDetail = closeHomeworkDetail;
window.closeCreateClassModal = closeCreateClassModal;
window.openDeleteClassModal = openDeleteClassModal;
window.closeDeleteClassModal = closeDeleteClassModal;
window.prepareGradeEdit = prepareGradeEdit;
window.deleteGrade = deleteGrade;
window.handleGlobalStudentSearch = handleGlobalStudentSearch;
window.performStudentSearch = performStudentSearch;
window.closeGradesSection = closeGradesSection;

// Variable per evitar inicialitzacions múltiples
let isInitialized = false;

// Funció segura d'inicialització
function safeInitProfessorat() {
    if (isInitialized) {
        console.log('[Professorat] Ja inicialitzat, saltant...');
        return;
    }

    console.log('[Professorat] Inicialitzant ara...');
    isInitialized = true;
    initProfessorat();
}

// Inicialitzar quan es carrega la pàgina
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(safeInitProfessorat, 100);
        setupUiFallbacks();
    });
} else {
    setTimeout(safeInitProfessorat, 100);
    setupUiFallbacks();
}

// També inicialitzar quan es canvia a la pàgina de professors
window.addEventListener('pageChanged', (e) => {
    if (e.detail.pageId === 'gpt-profes' && !isInitialized) {
        setTimeout(safeInitProfessorat, 50);
        setupUiFallbacks();
    }
});

