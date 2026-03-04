const { readCertificate, consultarDistribuicaoDFe } = require('./manifest-service');
const fs = require('fs');

const pfxPath = 'C:\\Users\\RODRIGO\\Documents\\FACT ERP CONTABIL\\JIL COMERCIO DE ELETRONICOS LTDA45898008000155-123456.pfx';
const pfxBuffer = fs.readFileSync(pfxPath);
const pfxBase64 = pfxBuffer.toString('base64');

async function main() {
    try {
        const cert = readCertificate(pfxBase64, '123456');
        console.log('Titular:', cert.subject.CN || cert.subject.O);
        console.log('Validade:', cert.notAfter);

        const result = await consultarDistribuicaoDFe(pfxBase64, '123456', '45.898.008/0001-55', 'SP', '0', null);

        // Write full result to file for inspection
        fs.writeFileSync('test-result.json', JSON.stringify(result, null, 2));
        console.log('cStat:', result.cStat);
        console.log('xMotivo:', result.xMotivo);
        console.log('Notas:', result.notas.length);
        console.log('Result saved to test-result.json');
    } catch (err) {
        console.error('ERRO:', err.message);
        // Save error details
        fs.writeFileSync('test-error.json', JSON.stringify({ error: err.message, stack: err.stack }, null, 2));
    }
}
main();
