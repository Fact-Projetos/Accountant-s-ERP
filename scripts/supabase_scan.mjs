import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ditkslssdhkcdrbhbsaj.supabase.co';
const supabaseKey = 'sb_publishable_KD73EEJHimyXYurQE4c4ZQ_s4QHAwwj';

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES_TO_CHECK = [
  'companies',
  'movements',
  'tax_assessments',
  'accountant_financial',
  'financial_service_types',
  'financial_extra_services',
  'standalone_services',
  'profiles',
  'documents',
  'city_links'
];

async function scan() {
  console.log('--- SUPABASE SYNCHRONIZATION SCAN ---');
  
  for (const table of TABLES_TO_CHECK) {
    process.stdout.write(`Checking [${table}]... `);
    
    // Try to fetch 1 row to verify existence and connectivity
    const { data, error, status } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (error) {
      if (status === 404) {
        console.log('MISSING ❌');
      } else {
        console.log(`ERROR: ${error.message} ⚠️`);
      }
    } else {
      const countResult = await supabase.from(table).select('*', { count: 'exact', head: true });
      const count = countResult.count || 0;
      console.log(`OK ✅ (${count} rows found)`);
      
      // Check specific columns for critical tables
      if (table === 'companies') {
        const hasSeqId = data && data[0] && 'client_seq_id' in data[0];
        const hasVisibleViews = data && data[0] && 'visible_views' in data[0];
        console.log(`  - client_seq_id: ${hasSeqId ? 'Present' : 'MISSING ❌'}`);
        console.log(`  - visible_views: ${hasVisibleViews ? 'Present' : 'MISSING ❌'}`);
      }
    }
  }

  console.log('\n--- Scan Completed ---');
}

scan().catch(err => {
  console.error('Fatal scan error:', err);
});
