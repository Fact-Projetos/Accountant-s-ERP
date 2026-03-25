import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ditkslssdhkcdrbhbsaj.supabase.co';
const supabaseKey = 'sb_publishable_KD73EEJHimyXYurQE4c4ZQ_s4QHAwwj';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('companies')
    .select('name, created_at')
    .is('created_at', null);

  if (error) { console.error(error); return; }

  console.log(`Total companies with null created_at: ${data.length}`);
  data.forEach(c => console.log(` - ${c.name}`));
}

check();
