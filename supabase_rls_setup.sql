-- Configuració de RLS (Row Level Security) per al mòdul Professorat
-- Executar aquest script DESPRÉS de crear les taules
-- Project URL: https://rvoavonrgdkohsglfiux.supabase.co

-- Opció 1: Desactivar RLS temporalment (més simple per prototip)
-- Descomenta les línies següents si vols desactivar RLS:

-- ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE students DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE excursions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE excursion_status DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE homeworks DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE homework_status DISABLE ROW LEVEL SECURITY;

-- Opció 2: Crear polítiques permissives (recomanat si RLS està activat)
-- Descomenta les línies següents si vols mantenir RLS activat amb polítiques permissives:

-- Activar RLS a totes les taules (si no està activat)
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE excursions ENABLE ROW LEVEL SECURITY;
ALTER TABLE excursion_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_status ENABLE ROW LEVEL SECURITY;

-- Crear polítiques permissives per a totes les operacions
CREATE POLICY "Allow all operations on classes" ON classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on students" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on notes" ON notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on excursions" ON excursions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on excursion_status" ON excursion_status FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on homeworks" ON homeworks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on homework_status" ON homework_status FOR ALL USING (true) WITH CHECK (true);

