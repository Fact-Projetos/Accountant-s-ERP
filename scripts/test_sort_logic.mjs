const testData = [
  { name: 'ANA LAURA', code: '-', created_at: '2026-01-01' },
  { name: 'FACT', code: '001', created_at: '2026-01-02' },
  { name: 'DRM', code: '003', created_at: '2026-01-03' },
  { name: 'NEW CLIENT', code: '-', created_at: '2026-03-24' },
  { name: 'G.S.A', code: '002', created_at: '2026-01-02' },
];

const sorted = testData.sort((a, b) => {
    const codeA = a.code?.replace(/-/g, '').trim();
    const codeB = b.code?.replace(/-/g, '').trim();

    const hasCodeA = codeA && codeA.length > 0;
    const hasCodeB = codeB && codeB.length > 0;

    // Both without code -> sort by date (oldest first)
    if (!hasCodeA && !hasCodeB) return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    
    // One without code -> that one goes to the bottom
    if (!hasCodeA) return 1;
    if (!hasCodeB) return -1;

    // Both have codes, sort naturally
    return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
});

console.log(JSON.stringify(sorted, null, 2));
