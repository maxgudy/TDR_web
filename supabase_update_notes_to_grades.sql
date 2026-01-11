-- Actualitzar taula notes per suportar notes d'avaluació (qualificacions)
-- Executar aquest script a Supabase SQL Editor

-- Eliminar la taula notes antiga i crear una nova amb estructura per qualificacions
DROP TABLE IF EXISTS notes CASCADE;

-- Crear nova taula grades (notes d'avaluació)
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    value NUMERIC(4, 2) NOT NULL CHECK (value >= 0 AND value <= 10),
    type TEXT NOT NULL CHECK (type IN ('exam', 'activity', 'homework', 'project', 'participation', 'other')),
    subject TEXT,
    date DATE NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índexs
CREATE INDEX idx_grades_student_id ON grades(student_id);
CREATE INDEX idx_grades_date ON grades(date);
CREATE INDEX idx_grades_type ON grades(type);

-- Funció per calcular mitjana d'un alumne
CREATE OR REPLACE FUNCTION calculate_student_average(student_uuid UUID)
RETURNS NUMERIC AS $$
    SELECT COALESCE(ROUND(AVG(value)::NUMERIC, 2), 0)
    FROM grades
    WHERE student_id = student_uuid;
$$ LANGUAGE SQL;

