import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ditkslssdhkcdrbhbsaj.supabase.co';
const supabaseKey = 'sb_publishable_KD73EEJHimyXYurQE4c4ZQ_s4QHAwwj';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('companies')
    .select('name, code, created_at');

  if (error) { console.error(error); return; }

  const sorted = data.sort((a, b) => {
    const codeA = a.code?.replace(/-/g, '').trim() || '';
    const codeB = b.code?.replace(/-/g, '').trim() || '';
    const hasCodeA = codeA.length > 0;
    const hasCodeB = codeB.length > 0;

    if (hasCodeA && !hasCodeB) return -1;
    if (!hasCodeA && hasCodeB) return 1;
    if (!hasCodeA && !hasCodeB) {
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    }
    return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
  });

  console.log('--- LAST 5 ---');
  sorted.slice(-5).forEach((c, idx) => {
    console.log(`${String(sorted.length - 4 + idx).padStart(3, '0')} | ${String(c.code).padEnd(5)} | ${c.name}`);
  });
}

check();
