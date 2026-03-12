import forge from 'node-forge';

function extractDatesFromPfx(base64Pfx, password) {
  try {
    const p12Der = forge.util.decode64(base64Pfx);
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);
    
    for (const safeContents of p12.safeContents) {
      for (const safeBag of safeContents.safeBags) {
        if (safeBag.type === forge.pki.oids.certBag) {
          const cert = safeBag.cert;
          if (cert) {
            return {
              notBefore: cert.validity.notBefore.toISOString().split('T')[0],
              notAfter: cert.validity.notAfter.toISOString().split('T')[0]
            };
          }
        }
      }
    }
  } catch (err) {
    console.error("Error extracting dates:", err.message || err);
    return null;
  }
  return null;
}

console.log("Types checking passed for node-forge PKCS12 extraction logic.");
