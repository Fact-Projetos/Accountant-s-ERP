import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ditkslssdhkcdrbhbsaj.supabase.co';
const supabaseKey = 'sb_publishable_KD73EEJHimyXYurQE4c4ZQ_s4QHAwwj';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('companies')
    .select('name, code, created_at')
    .ilike('name', '%ANA LAURA%');

  if (error) { console.error(error); return; }

  console.log(`Found ${data.length} records:`);
  data.forEach(c => console.log(` - ${c.name} | Code: ${c.code}`));
}

check();
