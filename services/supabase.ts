import { createClient } from '@supabase/supabase-js';
import { Database } from '../database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[SUPABASE_DEBUG] URL:', supabaseUrl);
console.log('[SUPABASE_DEBUG] Key length:', supabaseAnonKey?.length || 0);

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing. Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || ''
);
