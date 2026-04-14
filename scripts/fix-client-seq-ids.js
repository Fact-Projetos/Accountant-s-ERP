/**
 * Script para corrigir os client_seq_id no Supabase
 * Ordena as empresas pela mesma lógica do frontend (Clients.tsx)
 * e atribui client_seq_id sequencial: 1, 2, 3...
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ditkslssdhkcdrbhbsaj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_KD73EEJHimyXYurQE4c4ZQ_s4QHAwwj';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixClientSeqIds() {
    console.log('=== Corrigindo client_seq_id ===\n');

    // 1. Buscar todas as empresas
    const { data: companies, error } = await supabase
        .from('companies')
        .select('id, client_seq_id, code, name, created_at');

    if (error) {
        console.error('Erro ao buscar empresas:', error.message);
        return;
    }

    console.log(`Total de empresas encontradas: ${companies.length}\n`);

    // 2. Ordenar pela mesma lógica do frontend (Clients.tsx)
    // Natural Sort: empresas com código primeiro, sem código por data de criação
    const sorted = [...companies].sort((a, b) => {
        const codeA = String(a.code || '').replace(/-/g, '').trim();
        const codeB = String(b.code || '').replace(/-/g, '').trim();
        const hasCodeA = codeA.length > 0;
        const hasCodeB = codeB.length > 0;

        // Ambos sem código -> ordenar por data (mais antigo primeiro)
        if (!hasCodeA && !hasCodeB) {
            const dateA = new Date(a.created_at || 0).getTime() || 0;
            const dateB = new Date(b.created_at || 0).getTime() || 0;
            return dateA - dateB;
        }

        // Um sem código -> vai pro final
        if (!hasCodeA) return 1;
        if (!hasCodeB) return -1;

        // Ambos com código -> natural sort (001, 002, 003...)
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
    });

    // 3. Mostrar situação ANTES (para verificação)
    console.log('--- ANTES da correção ---');
    console.log('Pos | ID Atual | Cod  | Nome');
    console.log('-'.repeat(80));
    sorted.forEach((c, idx) => {
        const newId = idx + 1;
        const currentId = c.client_seq_id || 0;
        const changed = currentId !== newId ? ' *** MUDAR ***' : '';
        console.log(
            `${String(newId).padStart(3, '0')} | ${String(currentId).padStart(3, '0')}      | ${(c.code || '---').padEnd(4)} | ${c.name}${changed}`
        );
    });

    // 4. Identificar quais precisam de atualização
    const updates = [];
    sorted.forEach((c, idx) => {
        const newSeqId = idx + 1;
        if (c.client_seq_id !== newSeqId) {
            updates.push({
                id: c.id,
                name: c.name,
                code: c.code,
                oldSeqId: c.client_seq_id || 0,
                newSeqId: newSeqId
            });
        }
    });

    if (updates.length === 0) {
        console.log('\n✅ Todos os client_seq_id já estão corretos! Nada a fazer.');
        return;
    }

    console.log(`\n--- ${updates.length} empresa(s) precisam de correção ---`);
    updates.forEach(u => {
        console.log(`  ${u.name}: ${u.oldSeqId} → ${u.newSeqId}`);
    });

    // 5. Executar as atualizações
    console.log('\nAtualizando...');
    let successCount = 0;
    let errorCount = 0;

    for (const u of updates) {
        const { error: updateError } = await supabase
            .from('companies')
            .update({ client_seq_id: u.newSeqId })
            .eq('id', u.id);

        if (updateError) {
            console.error(`  ❌ Erro ao atualizar "${u.name}": ${updateError.message}`);
            errorCount++;
        } else {
            console.log(`  ✅ ${u.name}: ${u.oldSeqId} → ${u.newSeqId}`);
            successCount++;
        }
    }

    console.log(`\n=== Concluído ===`);
    console.log(`  ✅ Sucesso: ${successCount}`);
    console.log(`  ❌ Erros: ${errorCount}`);

    // 6. Mostrar resultado final
    console.log('\n--- DEPOIS da correção ---');
    const { data: updated } = await supabase
        .from('companies')
        .select('client_seq_id, code, name');

    if (updated) {
        const finalSorted = [...updated].sort((a, b) => {
            const codeA = String(a.code || '').replace(/-/g, '').trim();
            const codeB = String(b.code || '').replace(/-/g, '').trim();
            const hasCodeA = codeA.length > 0;
            const hasCodeB = codeB.length > 0;
            if (!hasCodeA && !hasCodeB) return 0;
            if (!hasCodeA) return 1;
            if (!hasCodeB) return -1;
            return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
        });

        console.log('ID  | Cod  | Nome');
        console.log('-'.repeat(60));
        finalSorted.forEach(c => {
            console.log(
                `${String(c.client_seq_id).padStart(3, '0')} | ${(c.code || '---').padEnd(4)} | ${c.name}`
            );
        });
    }
}

fixClientSeqIds().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});
