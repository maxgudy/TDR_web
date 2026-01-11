// supabase-config.js - Configuració de Supabase
// Inicialització del client de Supabase per a ús directe des del frontend

const SUPABASE_URL = 'https://rvoavonrgdkohsglfiux.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b2F2b25yZ2Rrb2hzZ2xmaXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjUxNDUsImV4cCI6MjA4MjYwMTE0NX0.0rBOT0C9d7ZoYYyScUlW8-ih4j5GpMSUpKP_nphl9pM';

function initSupabaseClient() {
    if (window.supabaseClient) return true;
    if (typeof window.supabase === 'undefined') {
        console.warn('[SupabaseConfig] Supabase client library missing');
        return false;
    }

    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = client;
    return true;
}

initSupabaseClient();

