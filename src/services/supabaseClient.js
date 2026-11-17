import { createClient } from '@supabase/supabase-js';
import { MODO_DEMO, crearSupabaseDemo } from './demo';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;


// En modo demo no se crea el cliente real: la app trabaja con datos de ejemplo locales
export const supabase = MODO_DEMO ? crearSupabaseDemo() : createClient(supabaseUrl, supabaseAnonKey);