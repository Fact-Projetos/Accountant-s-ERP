const { readCertificate } = require('./manifest-service');
const fs = require('fs');

// Read certificate from file
const pfxPath = 'C:\\Users\\RODRIGO\\Documents\\FACT ERP CONTABIL\\JIL COMERCIO DE ELETRONICOS LTDA45898008000155-123456.pfx';
const pfxBuffer = fs.readFileSync(pfxPath);
const pfxBase64 = pfxBuffer.toString('base64');

console.log('Certificate base64 length:', pfxBase64.length);
console.log('');

try {
  const cert = readCertificate(pfxBase64, '123456');
  console.log('=== CERTIFICADO VÁLIDO ===');
  console.log('Titular:', cert.subject.CN || cert.subject.O || 'N/A');
  console.log('Subject:', JSON.stringify(cert.subject, null, 2));
  console.log('Serial:', cert.serialNumber);
  console.log('Válido de:', cert.notBefore);
  console.log('Válido até:', cert.notAfter);
  console.log('Expirado:', new Date(cert.notAfter) < new Date() ? 'SIM ⚠️' : 'NÃO ✅');
} catch (err) {
  console.error('ERRO:', err.message);
}
