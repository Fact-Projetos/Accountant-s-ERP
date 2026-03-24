import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ditkslssdhkcdrbhbsaj.supabase.co';
const supabaseKey = 'sb_publishable_KD73EEJHimyXYurQE4c4ZQ_s4QHAwwj';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('companies')
    .select('name, client_seq_id, code, created_at')
    .order('client_seq_id', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
    .limit(20);

  if (error) {
    console.error(error);
    return;
  }

  console.log('--- TOP 20 SORTED ---');
  data.forEach((c, idx) => {
    console.log(`${String(idx + 1).padStart(3, '0')} | ${String(c.client_seq_id).padEnd(5)} | ${String(c.code).padEnd(10)} | ${c.name}`);
  });
}

check();
