-- Migració per crear les taules del mòdul Professorat
-- Executar aquest script a Supabase SQL Editor
-- Project URL: https://rvoavonrgdkohsglfiux.supabase.co

-- IMPORTANT: Executar aquest script complet a Supabase SQL Editor

-- Crear taula classes
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear taula students
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear taula notes
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    tags TEXT[],
    severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear taula excursions
CREATE TABLE IF NOT EXISTS excursions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date DATE NOT NULL,
    price NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear taula excursion_status
CREATE TABLE IF NOT EXISTS excursion_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    excursion_id UUID REFERENCES excursions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    attends BOOLEAN DEFAULT false,
    paid BOOLEAN DEFAULT false,
    comment TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(excursion_id, student_id)
);

-- Crear taula homeworks
CREATE TABLE IF NOT EXISTS homeworks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT,
    due_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear taula homework_status
CREATE TABLE IF NOT EXISTS homework_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    homework_id UUID REFERENCES homeworks(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    delivered BOOLEAN DEFAULT false,
    comment TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(homework_id, student_id)
);

-- Crear índexs per millorar rendiment
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_notes_student_id ON notes(student_id);
CREATE INDEX IF NOT EXISTS idx_excursions_class_id ON excursions(class_id);
CREATE INDEX IF NOT EXISTS idx_excursion_status_excursion_id ON excursion_status(excursion_id);
CREATE INDEX IF NOT EXISTS idx_excursion_status_student_id ON excursion_status(student_id);
CREATE INDEX IF NOT EXISTS idx_homeworks_class_id ON homeworks(class_id);
CREATE INDEX IF NOT EXISTS idx_homework_status_homework_id ON homework_status(homework_id);
CREATE INDEX IF NOT EXISTS idx_homework_status_student_id ON homework_status(student_id);

