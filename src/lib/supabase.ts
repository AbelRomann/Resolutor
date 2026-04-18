import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || url.includes('your-project')) {
  console.warn('[Resolutor] Supabase no configurado. Edita el archivo .env con tus credenciales.');
}

export const supabase = createClient(url, key);
