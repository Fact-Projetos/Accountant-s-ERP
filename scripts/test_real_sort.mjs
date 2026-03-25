import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ditkslssdhkcdrbhbsaj.supabase.co';
const supabaseKey = 'sb_publishable_KD73EEJHimyXYurQE4c4ZQ_s4QHAwwj';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, code, created_at, client_seq_id');

  if (error) { console.error(error); return; }

  // Simulate adding a NEW client record (not yet in DB but coming from a save/refetch)
  const newClient = {
    id: 'temp-new-id',
    name: 'NOVO CLIENTE TESTE',
    code: '-',
    created_at: new Date().toISOString(), // Current time (Newest)
    client_seq_id: null
  };

  const allData = [...data, newClient];

  // Apply the logic from Clients.tsx
  const sorted = allData.sort((a, b) => {
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

  console.log('--- SORTED LIST (TOP 5) ---');
  sorted.slice(0, 5).forEach((c, idx) => {
    console.log(`${String(idx + 1).padStart(3, '0')} | ${String(c.code).padEnd(5)} | ${c.name}`);
  });

  console.log('\n--- SORTED LIST (BOTTOM 5) ---');
  sorted.slice(-5).forEach((c, idx) => {
    console.log(`${String(sorted.length - 4 + idx).padStart(3, '0')} | ${String(c.code).padEnd(5)} | ${c.name}`);
  });
}

test();
