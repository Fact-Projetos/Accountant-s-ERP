import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ditkslssdhkcdrbhbsaj.supabase.co';
const supabaseKey = 'sb_publishable_KD73EEJHimyXYurQE4c4ZQ_s4QHAwwj';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('companies')
    .select('name, client_seq_id, code, created_at')
    .not('client_seq_id', 'is', null)
    .order('client_seq_id', { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  console.log('--- NON-NULL IDs ---');
  data.forEach((c) => {
    console.log(`${String(c.client_seq_id).padEnd(5)} | ${String(c.code).padEnd(10)} | ${c.name}`);
  });
  
  console.log('\n--- NULL IDs COUNT ---');
  const { count } = await supabase.from('companies').select('*', { count: 'exact', head: true }).is('client_seq_id', null);
  console.log(`Total Null IDs: ${count}`);
}

check();
