# Classes i alumnes (Professorat)

Aquest document descriu en profunditat el modul de Professorat que gestiona classes, excursions, deures i alumnes/notes. **No** inclou el chatbot.

## Abast i objectiu
- Permet crear i administrar classes.
- Gestiona alumnes per classe (alta, baixa, edicio i estat actiu).
- Registra notes (grades) per alumne i calcula mitjana ponderada.
- Gestiona excursions i deures per classe, amb estat per alumne.

## Fitxers clau
- `TDR_webF/index.html` (estructura UI)
- `TDR_webF/js/professorat.js` (logica principal)
- `TDR_webF/css/styles.css` (estils de formularis, taules i detalls)
- `TDR_webF/supabase_migration.sql` (esquema de dades)

## Estructura de dades (Supabase)
Taules utilitzades en aquest apartat:
- `classes`: `id`, `name`, `created_at`
- `students`: `id`, `class_id`, `first_name`, `last_name`, `email`, `is_active`, `created_at`
- `grades`: `id`, `student_id`, `value`, `type`, `date`, `created_at`
- `excursions`: `id`, `class_id`, `title`, `date`, `price`, `created_at`
- `excursion_status`: `id`, `excursion_id`, `student_id`, `attends`, `paid`, `comment`, `updated_at`
- `homeworks`: `id`, `class_id`, `title`, `subject`, `due_date`, `description`, `created_at`
- `homework_status`: `id`, `homework_id`, `student_id`, `delivered`, `comment`, `updated_at`

Relacions principals:
- `students.class_id -> classes.id`
- `grades.student_id -> students.id`
- `excursions.class_id -> classes.id`
- `excursion_status.excursion_id -> excursions.id`
- `excursion_status.student_id -> students.id`
- `homeworks.class_id -> classes.id`
- `homework_status.homework_id -> homeworks.id`
- `homework_status.student_id -> students.id`

Referencies: `TDR_webF/supabase_migration.sql`.

## Estat global i inicialitzacio
`ProfessoratState` guarda el context actual i caches locals:

```js
const ProfessoratState = {
    selectedClassId: null,
    selectedStudentId: null,
    selectedExcursionId: null,
    selectedHomeworkId: null,
    classes: [],
    students: [],
    grades: [],
    excursions: [],
    homeworks: [],
    editingGradeId: null,
    editingExcursionId: null
};
```

Inicialitzacio:
- `initProfessorat()` configura UI, listeners i carrega classes.
- `setupTabs()` i `setupSubtabs()` controlen canvis de pestanya i preserven scroll.
- `setupEventListeners()` connecta tots els elements clau.
- `setupUiFallbacks()` afegeix listeners alternatius si el DOM no esta llest.
- `loadClasses()` omple selectors i restaura `selectedClassId` des de `localStorage`.

Referencies: `TDR_webF/js/professorat.js`.

## Pantalla "Classes i Registres"
### UI principal (index.html)
- Selector de classe: `#classSelector`
- Botons: `#createClassBtn`, `#deleteClassBtn`
- Subtabs: `Excursions` i `Deures`
- Formularis: `#form-excursion`, `#form-homework`
- Llistes: `#excursionsList`, `#homeworksList`
- Detalls: `#excursionDetail`, `#homeworkDetail`

Referencies: `TDR_webF/index.html`.

### Flux de classes
**Carregar classes**
```js
const { data, error } = await supabaseClient
    .from('classes')
    .select('*')
    .order('created_at', { ascending: false });
```
- Despres es crida `updateClassSelector()` per poblar els selectors.
- La classe seleccionada es guarda a `localStorage`.

**Crear classe**
- `createClass(name)` fa insert a `classes`.
- Recarrega i selecciona la classe nova, disparant el `change` del selector.

**Eliminar classe**
- `performDeleteClass(classId)` fa delete i neteja estat local.
- Neteja llistes de excursions/deures/alumnes.

Referencies: `TDR_webF/js/professorat.js`.

### Excursions (per classe)
**Carregar excursions**
```js
const { data, error } = await supabaseClient
    .from('excursions')
    .select('*')
    .eq('class_id', classId)
    .order('date', { ascending: false });
```

**Crear / editar excursio**
- `handleCreateExcursion(e)` valida `selectedClassId`.
- Si s edita: `update` per `editingExcursionId`.
- Si es nova: `insert` amb `class_id`.
- Despres crea `excursion_status` per tots els alumnes actius de la classe:

```js
const { data: students } = await supabaseClient
    .from('students')
    .select('id')
    .eq('class_id', ProfessoratState.selectedClassId)
    .eq('is_active', true);

const statusRecords = students.map(s => ({
    excursion_id: excursion.id,
    student_id: s.id,
    attends: false,
    paid: false
}));

await supabaseClient
    .from('excursion_status')
    .insert(statusRecords);
```

**Detall i assistencia**
- `loadExcursionDetail(excursionId)` carrega:
  - excursio
  - alumnes de la classe
  - estats (`excursion_status`)
- Renderitza la taula amb checkboxes i comentari.

**Actualitzar estat**
- `updateExcursionStatus()` fa `update` o `insert` segons si existeix registre.

**Accio massiva**
- `markAllExcursion(field, value)` actualitza tots els alumnes de la classe.

Referencies: `TDR_webF/js/professorat.js`.

### Deures (per classe)
**Carregar deures**
```js
const { data, error } = await supabaseClient
    .from('homeworks')
    .select('*')
    .eq('class_id', classId)
    .order('due_date', { ascending: false });
```

**Crear deure**
- `handleCreateHomework(e)` valida `selectedClassId` i crea el deure.
- Crea `homework_status` per cada alumne actiu.

**Detall i estat**
- `loadHomeworkDetail(homeworkId)` carrega deure i alumnes, i crea map d estat.
- `updateHomeworkStatus()` actualitza `delivered` o `comment`.

Referencies: `TDR_webF/js/professorat.js`.

## Pantalla "Alumnes i Notes"
### UI principal (index.html)
- Selector de classe: `#classSelectorStudents`
- Botons: `#addStudentBtn`
- Formulari alumne: `#form-student` (usa `#student-class` ocult)
- Cerca taula: `#studentSearch`
- Taula alumnes: `#studentsTableBody`
- Seccio notes: `#gradesSection`, formulari `#form-note`, historial `#notesHistory`
- Cerca global: `#globalStudentSearch` + `#globalSearchResults`

Referencies: `TDR_webF/index.html`.

### Flux d alumnes
**Carregar alumnes**
```js
const { data, error } = await supabaseClient
    .from('students')
    .select('*')
    .eq('class_id', classId)
    .order('last_name', { ascending: true });
```
- Deduplicacio local per nom/correu/classe per evitar duplicats visuals.

**Crear alumne**
- `handleCreateStudent(e)`:
  - valida classe
  - normalitza dades
  - evita duplicats en memoria
  - crea alumne en Supabase
  - recarrega alumnes i obre el formulari de notes per al nou alumne

**Actualitzar alumne**
- `updateStudent(studentId, data)` fa update parcial.
- `toggleStudentActive()` canvia `is_active`.

**Eliminar alumne**
- `deleteStudent(studentId)` elimina grades i alumne.

**Render taula**
- `updateStudentsTable()` pinta la taula i calcula mitjanes per alumne.
- Usa un `studentsRenderToken` per evitar condicions de carrera.

**Filtrar alumnes**
- `filterStudentsTable()` filtra per text a la taula.

**Edicio rapida**
- `editStudent(studentId)` usa `prompt()` per canvis basics.

Referencies: `TDR_webF/js/professorat.js`.

### Notes (grades)
**Obrir notes per alumne**
- `openGradeForm(studentId, ...)` actualitza la toolbar i mostra la seccio.
- `selectStudentForNotes(...)` delega a `openGradeForm`.

**Carregar notes**
```js
const { data, error } = await supabaseClient
    .from('grades')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: false });
```
- `updateGradesHistory()` renderitza l historial de notes.

**Crear o editar nota**
- `handleCreateGrade(e)` valida valors i data.
- Si hi ha `editingGradeId`, crida `updateGrade()`.

**Eliminar nota**
- `deleteGrade(gradeId)` elimina nota i recarrega l historial.

**Mitjana ponderada**
- `calculateWeightedAverage(grades)` agrupa per tipus:
  - `exam` 80%
  - `homework` 10%
  - `activity` 10%

Exemple de calcul:
```js
const EVALUATION_CRITERIA = { exam: 80, homework: 10, activity: 10 };
```

**Actualitzar cel la de mitjana**
- `calculateAndDisplayAverage(studentId)` calcula i crida `updateStudentAverageCell`.

Referencies: `TDR_webF/js/professorat.js`.

## Cerca global d alumnes
- Entrada: `#globalStudentSearch`.
- `handleGlobalStudentSearch(e)` consulta tots els alumnes actius.
- Filtra localment i mostra resultats amb classe associada.
- Al seleccionar, canvia a la pestanya d alumnes i obre notes.

Referencies: `TDR_webF/js/professorat.js`.

## Control de scroll i UX
- Canvis de pestanya guarden i restauren scroll per evitar salts.
- La seccio de notes usa `scrollIntoView` quan s obre.
- Accions que abans mostraven feedback visual s han minimitzat per evitar salts.

Referencies: `TDR_webF/js/professorat.js`.

## Estils rellevants
Estils per formularis, taules i detalls:
- `.clean-form`, `.card-form`, `.small-form`
- `.form-field`, `.form-row`, `.form-actions`
- `.students-table`, `.detail-table`, `.detail-card`
- `.toggle-switch`, `.student-actions`, `.list-card`

Referencies: `TDR_webF/css/styles.css`.

## Punts d extensio
- Afegir validacions mes estrictes per emails i noms.
- Unificar edicio d alumnes amb un modal en lloc de `prompt()`.
- Optimitzar consulta de mitjanes amb vista o funcio SQL.
- Afegir filtres per curs, grup o estat actiu.

## Dependencia externa
- Client Supabase disponible a `window.supabaseClient`.
- Sense n8n per CRUD (nomes per chatbot).

Referencies: `TDR_webF/js/professorat.js`.
