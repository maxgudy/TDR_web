# Mòdul Professorat — Especificació d’implementació (MVP funcional)

Aquest document descriu **què s’ha d’implementar** al mòdul de *Professorat* (web + backend) perquè sigui **totalment funcional** com a prototip del TDR: gestió d’alumnes, notes, excursions/pagaments i deures, amb una UX basada en formularis, taules, cerca i (opcionalment) accions assistides via xat.

---

## 0) Objectiu i abast

### Objectiu
Permetre que un docent pugui, des d’una sola interfície:
- Crear/seleccionar una classe.
- Afegir i consultar alumnat.
- Buscar un alumne i afegir-li notes (amb historial).
- Crear excursions i gestionar **assistència** i **pagaments** amb checkboxes.
- Crear deures i gestionar **entrega** amb checkboxes.
- (Opcional) Fer consultes i accions avançades via xat amb confirmació.

### Fora d’abast (per aquest MVP)
- Autenticació real (login).
- Gestió multiusuari amb permisos avançats.
- Exportació PDF.
- Integració amb sistemes reals del centre.

---

## 1) UX / Pantalles (seguint la UI actual)

Partim de la pantalla actual (mode fosc, tabs). Implementar aquests blocs dins la secció **GPT Profes**.

### 1.1 Barra superior comuna (obligatori)
- **Selector de Classe** (dropdown) + botó “+ Crear classe”.
- **Cercador global d’alumnes** (autocomplete) (mínim: dins pestanya Notes).
- Botons ràpids (opcions):
  - + Alumne
  - + Nota
  - + Excursió
  - + Deure

> Si és massa per ara: mínim “Selector de Classe” + “+ Crear classe”.

### 1.2 Pestanya: Alumnes (obligatori)
**Formulari** (ja tens):
- Nom*  
- Cognoms*  
- Email (opcional)  
- Grup/Classe* (si ja hi ha selector global de classe, aquest camp pot ser automàtic)

**Taula d’alumnes de la classe seleccionada**
- Columnes: Nom, Cognoms, Email, Classe, Actiu (toggle), Accions (Editar/Eliminar)
- Cerca per nom/cognoms (input simple).

### 1.3 Pestanya: Notes (obligatori)
**Cercador d’alumne** (autocomplete)
- Quan selecciones alumne:
  - Fitxa breu (Nom, Classe)
  - Formulari “Afegir nota”
  - Historial de notes (llista)

**Formulari Afegir nota**
- Text nota (textarea) *obligatori*
- Tags (opc.) (ex: conducta, acadèmic, tutoria, família)
- Severitat (Baixa/Mitja/Alta) (opc.)
- Botó “Guardar nota”

**Historial**
- Llistat de notes amb: data/hora, text, tags, severitat, (opc) eliminar/editar.

### 1.4 Pestanya: Registres (obligatori) — amb subopcions
Dins “Inserir Registre”, crear **subtabs** o selector:
- Excursions
- Deures

#### Excursions (obligatori)
**Crear excursió**
- Títol*
- Data*
- Preu (opc.)
- Classe (per defecte: classe seleccionada)

**Vista d’excursió**
- Taula llistant alumnes de la classe amb:
  - Ve (checkbox)
  - Pagat (checkbox)
  - Comentari (opc. mini input)
- Botons ràpids:
  - “Marcar tots: Ve”
  - “Marcar tots: No ve”
  - “Marcar tots: Pagat” (opcional)

#### Deures (obligatori)
**Crear deure**
- Títol*
- Assignatura (opc.)
- Data entrega*
- Descripció (opc.)

**Vista deure**
- Taula alumnes amb:
  - Entregat (checkbox)
  - Comentari (opc.)
- Filtre: Pendents / Entregats (opc.)

### 1.5 Xat (opcional, però recomanat)
El xat es manté com a canal de consulta. A MVP:
- Consultes: “Quins alumnes no han pagat l’excursió X?”
- Accions amb confirmació (opcional): “Crea excursió…” → retorna resum + botó Confirmar.

---

## 2) Model de dades (recomanat: Supabase)

### 2.1 Taules (SQL / Supabase)
**classes**
- id (uuid, pk)
- name (text, unique)  — ex: “2nA”
- created_at (timestamp)

**students**
- id (uuid, pk)
- class_id (uuid, fk → classes.id)
- first_name (text)
- last_name (text)
- email (text, nullable)
- is_active (boolean, default true)
- created_at (timestamp)

**notes**
- id (uuid, pk)
- student_id (uuid, fk → students.id)
- text (text)
- tags (text[] o jsonb) (nullable)
- severity (text) (nullable) — “low|medium|high”
- created_at (timestamp)

**excursions**
- id (uuid, pk)
- class_id (uuid, fk)
- title (text)
- date (date)
- price (numeric, nullable)
- created_at (timestamp)

**excursion_status**
- id (uuid, pk)
- excursion_id (uuid, fk → excursions.id)
- student_id (uuid, fk → students.id)
- attends (boolean, default false)
- paid (boolean, default false)
- comment (text, nullable)
- updated_at (timestamp)

**homeworks**
- id (uuid, pk)
- class_id (uuid, fk)
- title (text)
- subject (text, nullable)
- due_date (date)
- description (text, nullable)
- created_at (timestamp)

**homework_status**
- id (uuid, pk)
- homework_id (uuid, fk → homeworks.id)
- student_id (uuid, fk → students.id)
- delivered (boolean, default false)
- comment (text, nullable)
- updated_at (timestamp)

> Nota: “status” es pot crear quan es crea l’excursió/deure (una fila per alumne).

### 2.2 Regles (RLS)
Per TDR/prototip:
- Es pot deixar RLS desactivat o amb política permissiva (segons necessitat).
Per “producció”:
- RLS activat amb auth + polítiques per rol.

---

## 3) Arquitectura d’integració (frontend ↔ n8n ↔ Supabase)

### 3.1 Recomanació (simple i robusta)
- Frontend NO parla directament amb Supabase.
- Frontend → **n8n webhooks** (CRUD) → Supabase.
- Avantatge: tota la lògica i validacions queden centralitzades.

### 3.2 Endpoints (webhooks) a implementar a n8n
Crear aquests webhooks (exemples de noms; adaptar a la teva nomenclatura):

**Classes**
- `POST /webhook/profes/classes/create`  { name }
- `GET  /webhook/profes/classes/list`

**Students**
- `POST /webhook/profes/students/create` { classId, firstName, lastName, email }
- `GET  /webhook/profes/students/list`   { classId }
- `POST /webhook/profes/students/update` { studentId, ...fields }
- `POST /webhook/profes/students/delete` { studentId }  (soft delete: is_active=false)

**Notes**
- `POST /webhook/profes/notes/create` { studentId, text, tags?, severity? }
- `GET  /webhook/profes/notes/list`   { studentId }

**Excursions**
- `POST /webhook/profes/excursions/create` { classId, title, date, price? }
- `GET  /webhook/profes/excursions/list`   { classId }
- `GET  /webhook/profes/excursions/get`    { excursionId }  (inclou status per alumne)
- `POST /webhook/profes/excursions/status/update` { excursionId, studentId, attends?, paid?, comment? }

**Deures**
- `POST /webhook/profes/homeworks/create` { classId, title, subject?, dueDate, description? }
- `GET  /webhook/profes/homeworks/list`   { classId }
- `GET  /webhook/profes/homeworks/get`    { homeworkId } (inclou status per alumne)
- `POST /webhook/profes/homeworks/status/update` { homeworkId, studentId, delivered?, comment? }

> Les respostes han de ser JSON consistents (success, data, error).

---

## 4) Lògica frontend (què cal implementar)

### 4.1 Estat global mínim
- `selectedClassId`
- `selectedStudentId` (per Notes)
- `selectedExcursionId` / `selectedHomeworkId`
- caches opcionals (llistes)

### 4.2 Funcions clau (JS)
- `loadClasses()`, `createClass()`
- `loadStudents(classId)`, `createStudent(form)`, `updateStudent()`, `softDeleteStudent()`
- `searchStudents(query)` (per autocomplete)
- `loadNotes(studentId)`, `createNote()`
- `createExcursion()`, `loadExcursions(classId)`, `loadExcursionDetail(excursionId)`, `updateExcursionStatus()`
- `createHomework()`, `loadHomeworks(classId)`, `loadHomeworkDetail(homeworkId)`, `updateHomeworkStatus()`

### 4.3 Taules i checkboxes
- En canviar un checkbox, enviar update immediat (debounce opcional).
- Mostrar feedback (spinner petit / “Guardat”).
- Gestionar errors (toast o missatge sota).

### 4.4 Mode fosc
- Ja existeix; mantenir coherència als components nous.

---

## 5) Criteris d’acceptació (Definition of Done)

### Professorat — Alumnes
- Puc crear una classe.
- Puc afegir alumnes i es veuen en una taula.
- Puc editar/eliminar (soft delete) un alumne.
- Filtre/cerca funciona.

### Professorat — Notes
- Puc buscar un alumne (autocomplete).
- Puc afegir una nota i queda guardada.
- Veig historial de notes.

### Professorat — Excursions
- Puc crear una excursió.
- Veig la llista d’alumnes amb “Ve” i “Pagat”.
- Marcar/unmarcar canvia i persisteix.

### Professorat — Deures
- Puc crear un deure.
- Veig llista d’alumnes amb “Entregat”.
- Marcar/unmarcar persisteix.

---

## 6) Què necessites donar al software developer

### 6.1 Accés i repositori
- Accés al repositori GitHub (read/write).
- Branca de treball o checklist de PRs.

### 6.2 Supabase (si s’usa)
- **Project URL**= https://rvoavonrgdkohsglfiux.supabase.co i **anon key**=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b2F2b25yZ2Rrb2hzZ2xmaXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjUxNDUsImV4cCI6MjA4MjYwMTE0NX0.0rBOT0C9d7ZoYYyScUlW8-ih4j5GpMSUpKP_nphl9pM (si frontend hi parla) o **service role key**= eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b2F2b25yZ2Rrb2hzZ2xmaXV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzAyNTE0NSwiZXhwIjoyMDgyNjAxMTQ1fQ.h9gj4mVSfrGh78X-k5DyDgS-Gp75WfsfcV66a72rkNc (només a n8n).
- Credencials per entrar al projecte Supabase (si cal).
- SQL de creació de taules (o migracions).
- Decisió sobre RLS (desactivat per prototip o polítiques simples).


### 6.3 n8n (si s’usa com a backend)
- URL del teu n8n + forma d’autenticació.
- Llista de webhooks a crear (secció 3.2).
- Connexió de n8n amb Supabase (credencials).
- Format de resposta esperat per cada webhook.

### 6.4 Disseny/UI
- Captura de pantalla de la UI actual (la que has enviat).
- Noms exactes de pestanyes/sections.
- Si tens paleta/colors/fonts, adjuntar.

### 6.5 Mostres de dades (recomanat)
- 1–2 classes de prova (2nA, 2nB).
- 5–10 alumnes de prova.
- 1 excursió i 1 deure de prova.

---

## 7) Recomanacions d’implementació (per agilitzar)

- Començar per: **Classes → Students → Notes** (ja dona una demo molt bona).
- Després: **Excursions** (taula + checkboxes).
- Finalment: **Deures**.
- Guardar tot al backend (Supabase) des del primer dia per evitar “refactor” posterior.

---

## 8) Possibles millores futures (per mencionar al TDR)
- Multi-xat i persistència d’historial per usuari.
- Autenticació (profes/directius) i permisos.
- Exportació a CSV/PDF.
- Notificacions (correus a famílies) via n8n.
- Integració del xat per crear registres amb confirmació.

---
