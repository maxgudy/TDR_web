# Configuració de Supabase per al Mòdul Professorat

## Credencials de Supabase

- **Project URL**: `https://rvoavonrgdkohsglfiux.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b2F2b25yZ2Rrb2hzZ2xmaXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjUxNDUsImV4cCI6MjA4MjYwMTE0NX0.0rBOT0C9d7ZoYYyScUlW8-ih4j5GpMSUpKP_nphl9pM`
- **Service Role Key** (només per n8n): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b2F2b25yZ2Rrb2hzZ2xmaXV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzAyNTE0NSwiZXhwIjoyMDgyNjAxMTQ1fQ.h9gj4mVSfrGh78X-k5DyDgS-Gp75WfsfcV66a72rkNc`

## Passos per configura

### 1. Crear les taules a Supabase

1. Accedeix al teu projecte Supabase: https://rvoavonrgdkohsglfiux.supabase.co
2. Ves a **SQL Editor**
3. Crea una nova query
4. Copia i enganxa el contingut del fitxer `supabase_migration.sql`
5. Executa la query

Això crearà totes les taules necessàries:
- `classes`
- `students`
- `notes`
- `excursions`
- `excursion_status`
- `homeworks`
- `homework_status`

### 2. Configurar RLS (Row Level Security)

Per aquest MVP/prototip, pots deixar RLS desactivat o crear polítiques permissives:

```sql
-- Desactivar RLS temporalment (només per prototip)
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE excursions DISABLE ROW LEVEL SECURITY;
ALTER TABLE excursion_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE homeworks DISABLE ROW LEVEL SECURITY;
ALTER TABLE homework_status DISABLE ROW LEVEL SECURITY;
```

O crear polítiques permissives:

```sql
-- Polítiques permissives per a totes les taules
CREATE POLICY "Allow all operations on classes" ON classes FOR ALL USING (true);
CREATE POLICY "Allow all operations on students" ON students FOR ALL USING (true);
CREATE POLICY "Allow all operations on notes" ON notes FOR ALL USING (true);
CREATE POLICY "Allow all operations on excursions" ON excursions FOR ALL USING (true);
CREATE POLICY "Allow all operations on excursion_status" ON excursion_status FOR ALL USING (true);
CREATE POLICY "Allow all operations on homeworks" ON homeworks FOR ALL USING (true);
CREATE POLICY "Allow all operations on homework_status" ON homework_status FOR ALL USING (true);
```

### 3. Configurar n8n

El webhook de n8n ha de processar les següents accions que venen del frontend:

- `listClasses` - Llistar totes les classes
- `createClass` - Crear una nova classe
- `listStudents` - Llistar alumnes d'una classe
- `createStudent` - Crear un alumne
- `updateStudent` - Actualitzar un alumne
- `deleteStudent` - Eliminar (soft delete) un alumne
- `listNotes` - Llistar notes d'un alumne
- `createNote` - Crear una nota
- `listExcursions` - Llistar excursions d'una classe
- `createExcursion` - Crear una excursió
- `getExcursion` - Obtenir detalls d'una excursió amb status
- `updateExcursionStatus` - Actualitzar status d'excursió
- `listHomeworks` - Llistar deures d'una classe
- `createHomework` - Crear un deure
- `getHomework` - Obtenir detalls d'un deure amb status
- `updateHomeworkStatus` - Actualitzar status de deure

**Format del missatge que rep n8n:**
```json
{
  "action": "createClass",
  "name": "2nA"
}
```

**Format de resposta esperat:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-de-la-classe",
    "name": "2nA",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### 4. Connexió n8n → Supabase

A n8n, utilitza la **Service Role Key** per connectar-te a Supabase i executar les operacions SQL.

## Verificació

Després de crear les taules, pots verificar que tot està correcte executant:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('classes', 'students', 'notes', 'excursions', 'excursion_status', 'homeworks', 'homework_status');
```

Hauries de veure les 7 taules llistades.

