/**
 * Manifestação do Destinatário - SEFAZ Nacional
 * 
 * Consulta NFe emitidas contra o CNPJ da empresa usando
 * o WebService NFeDistribuicaoDFe da SEFAZ Nacional.
 */

const forge = require('node-forge');
const crypto = require('crypto');
const https = require('https');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const axios = require('axios');
const zlib = require('zlib');

// SEFAZ Nacional URLs
const SEFAZ_URLS = {
    production: 'https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
    homologation: 'https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx'
};

/**
 * Read PFX certificate from base64 string
 */
function readCertificate(pfxBase64, password) {
    try {
        const pfxDer = forge.util.decode64(pfxBase64);
        const pfxAsn1 = forge.asn1.fromDer(pfxDer);
        const p12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);

        // Extract private key
        const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
        const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
        const privateKey = keyBag.key;

        // Extract certificate
        const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
        const certBag = certBags[forge.pki.oids.certBag][0];
        const certificate = certBag.cert;

        // Get PEM formatted
        const certPem = forge.pki.certificateToPem(certificate);
        const keyPem = forge.pki.privateKeyToPem(privateKey);

        // Get certificate info
        const subject = certificate.subject.attributes.reduce((acc, attr) => {
            acc[attr.shortName || attr.name] = attr.value;
            return acc;
        }, {});

        return {
            certPem,
            keyPem,
            subject,
            serialNumber: certificate.serialNumber,
            notBefore: certificate.validity.notBefore,
            notAfter: certificate.validity.notAfter,
            // X509 DER base64 for XML signature
            certDer: forge.util.encode64(forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes())
        };
    } catch (err) {
        throw new Error(`Erro ao ler certificado: ${err.message}`);
    }
}

/**
 * Sign XML using XMLDSig with the certificate
 */
function signXml(xml, keyPem, certDer) {
    // Create canonical XML of the content to sign
    const doc = new DOMParser().parseFromString(xml, 'text/xml');

    // Find the element to sign (distDFeInt)
    const distDFeInt = doc.getElementsByTagNameNS('http://www.portalfiscal.inf.br/nfe', 'distDFeInt')[0];
    if (!distDFeInt) {
        throw new Error('Elemento distDFeInt não encontrado no XML');
    }

    // Set Id attribute
    distDFeInt.setAttribute('Id', 'DistDFeInt');

    // Canonicalize the element
    const serializer = new XMLSerializer();
    let canonicalXml = serializer.serializeToString(distDFeInt);

    // Calculate digest
    const digestHash = crypto.createHash('sha1').update(canonicalXml, 'utf8').digest('base64');

    // Create SignedInfo
    const signedInfo = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#"><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/><Reference URI="#DistDFeInt"><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/><Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/></Transforms><DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/><DigestValue>${digestHash}</DigestValue></Reference></SignedInfo>`;

    // Sign
    const signer = crypto.createSign('RSA-SHA1');
    signer.update(signedInfo);
    const signatureValue = signer.sign(keyPem, 'base64');

    // Build Signature element
    const signatureXml = `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">${signedInfo}<SignatureValue>${signatureValue}</SignatureValue><KeyInfo><X509Data><X509Certificate>${certDer}</X509Certificate></X509Data></KeyInfo></Signature>`;

    return signatureXml;
}

/**
 * Build the SOAP envelope for NFeDistribuicaoDFe
 * @param {string} cnpj - CNPJ da empresa (apenas números)
 * @param {string} ultNSU - Último NSU consultado
 * @param {string} uf - Código UF (ex: 35 para SP, 33 para RJ)
 * @param {string} chNFe - Chave de acesso específica (opcional)
 */
function buildDistribuicaoXml(cnpj, ultNSU = '0', uf = '35', chNFe = null) {
    const tpAmb = '1'; // 1=Produção, 2=Homologação
    const versao = '1.01';

    let consultaContent;
    if (chNFe) {
        // Consulta por chave de acesso específica
        consultaContent = `<consChNFe><chNFe>${chNFe}</chNFe></consChNFe>`;
    } else {
        // Consulta por último NSU
        consultaContent = `<distNSU><ultNSU>${ultNSU.padStart(15, '0')}</ultNSU></distNSU>`;
    }

    const xml = `<distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="${versao}"><tpAmb>${tpAmb}</tpAmb><cUFAutor>${uf}</cUFAutor><CNPJ>${cnpj}</CNPJ>${consultaContent}</distDFeInt>`;

    return xml;
}

/**
 * Wrap in SOAP envelope
 */
function buildSoapEnvelope(signedXml) {
    return `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Header/><soap12:Body><nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe"><nfeDadosMsg>${signedXml}</nfeDadosMsg></nfeDistDFeInteresse></soap12:Body></soap12:Envelope>`;
}

/**
 * Parse the SEFAZ response
 */
function parseDistribuicaoResponse(responseXml) {
    const doc = new DOMParser().parseFromString(responseXml, 'text/xml');

    // Get return code
    const cStat = getTextContent(doc, 'cStat');
    const xMotivo = getTextContent(doc, 'xMotivo');
    const ultNSU = getTextContent(doc, 'ultNSU');
    const maxNSU = getTextContent(doc, 'maxNSU');

    const result = {
        cStat,
        xMotivo,
        ultNSU: ultNSU ? ultNSU.replace(/^0+/, '') || '0' : '0',
        maxNSU: maxNSU ? maxNSU.replace(/^0+/, '') || '0' : '0',
        notas: [],
        hasMore: false
    };

    // Status 138 = Documentos localizados
    if (cStat === '138') {
        const loteDistDFeInt = doc.getElementsByTagName('loteDistDFeInt')[0];
        if (loteDistDFeInt) {
            const docZips = loteDistDFeInt.getElementsByTagName('docZip');

            for (let i = 0; i < docZips.length; i++) {
                const docZip = docZips[i];
                const nsu = docZip.getAttribute('NSU');
                const schema = docZip.getAttribute('schema') || '';
                const compressedBase64 = docZip.textContent;

                try {
                    // Decompress the gzip content
                    const compressed = Buffer.from(compressedBase64, 'base64');
                    const decompressed = zlib.inflateRawSync(compressed);
                    const xmlContent = decompressed.toString('utf-8');

                    // Parse the decompressed XML
                    const innerDoc = new DOMParser().parseFromString(xmlContent, 'text/xml');

                    if (schema.includes('resNFe')) {
                        // Summary of NFe (resumo)
                        const nota = {
                            nsu,
                            tipo: 'resumo',
                            chNFe: getTextContent(innerDoc, 'chNFe'),
                            cnpjEmitente: getTextContent(innerDoc, 'CNPJ'),
                            nomeEmitente: getTextContent(innerDoc, 'xNome'),
                            ieEmitente: getTextContent(innerDoc, 'IE'),
                            dataEmissao: getTextContent(innerDoc, 'dhEmi'),
                            tipoOperacao: getTextContent(innerDoc, 'tpNF'), // 0=entrada, 1=saída
                            valorNFe: parseFloat(getTextContent(innerDoc, 'vNF') || '0'),
                            digestValue: getTextContent(innerDoc, 'digVal'),
                            sitNFe: getTextContent(innerDoc, 'cSitNFe'), // 1=Autorizada
                            tipoNFe: getTextContent(innerDoc, 'dhRecbto') ? '55' : '55',
                            xmlResumo: xmlContent
                        };
                        result.notas.push(nota);
                    } else if (schema.includes('procNFe') || schema.includes('nfeProc')) {
                        // Complete NFe XML
                        const nota = {
                            nsu,
                            tipo: 'completo',
                            chNFe: getTextContent(innerDoc, 'chNFe') || '',
                            xmlCompleto: xmlContent
                        };
                        result.notas.push(nota);
                    } else if (schema.includes('resEvento')) {
                        // Event summary (cancellation, manifestation, etc.)
                        const nota = {
                            nsu,
                            tipo: 'evento',
                            chNFe: getTextContent(innerDoc, 'chNFe'),
                            tipoEvento: getTextContent(innerDoc, 'tpEvento'),
                            descEvento: getTextContent(innerDoc, 'xEvento'),
                            xmlResumo: xmlContent
                        };
                        result.notas.push(nota);
                    }
                } catch (err) {
                    console.error(`Error decompressing docZip NSU ${nsu}:`, err.message);
                }
            }
        }

        // Check if there are more documents
        result.hasMore = parseInt(ultNSU || '0') < parseInt(maxNSU || '0');
    }

    return result;
}

function getTextContent(doc, tagName) {
    const elements = doc.getElementsByTagName(tagName);
    return elements.length > 0 ? elements[0].textContent : '';
}

/**
 * Get UF code from CNPJ or state abbreviation
 */
function getUfCode(uf) {
    const ufCodes = {
        'AC': '12', 'AL': '27', 'AM': '13', 'AP': '16', 'BA': '29',
        'CE': '23', 'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21',
        'MG': '31', 'MS': '50', 'MT': '51', 'PA': '15', 'PB': '25',
        'PE': '26', 'PI': '22', 'PR': '41', 'RJ': '33', 'RN': '24',
        'RO': '11', 'RR': '14', 'RS': '43', 'SC': '42', 'SE': '28',
        'SP': '35', 'TO': '17'
    };
    return ufCodes[uf.toUpperCase()] || '35';
}

/**
 * Main function: Query SEFAZ for documents issued against CNPJ
 */
async function consultarDistribuicaoDFe(pfxBase64, password, cnpj, uf = 'RJ', ultNSU = '0', chNFe = null) {
    console.log(`[Manifest] Consultando CNPJ: ${cnpj}, UF: ${uf}, ultNSU: ${ultNSU}`);

    // 1. Read certificate
    const cert = readCertificate(pfxBase64, password);
    console.log(`[Manifest] Certificado lido com sucesso. Titular: ${cert.subject.CN || cert.subject.O || 'N/A'}`);
    console.log(`[Manifest] Validade: ${cert.notBefore} até ${cert.notAfter}`);

    // Check certificate expiry
    if (new Date(cert.notAfter) < new Date()) {
        throw new Error('Certificado digital expirado!');
    }

    // 2. Build XML
    const cleanCnpj = cnpj.replace(/\D/g, '');
    const ufCode = getUfCode(uf);
    const distXml = buildDistribuicaoXml(cleanCnpj, ultNSU, ufCode, chNFe);

    // 3. Sign XML
    const signatureXml = signXml(`<distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">${distXml.replace(/<distDFeInt[^>]*>/, '').replace('</distDFeInt>', '')}</distDFeInt>`, cert.keyPem, cert.certDer);

    // Insert signature into XML
    const signedXml = distXml.replace('</distDFeInt>', `${signatureXml}</distDFeInt>`);

    // 4. Build SOAP envelope  
    const soapEnvelope = buildSoapEnvelope(signedXml);

    console.log(`[Manifest] Enviando requisição para SEFAZ...`);

    // 5. Send request with mutual TLS (client certificate)
    try {
        const response = await axios.post(SEFAZ_URLS.production, soapEnvelope, {
            headers: {
                'Content-Type': 'application/soap+xml; charset=utf-8',
                'SOAPAction': 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse'
            },
            httpsAgent: new https.Agent({
                cert: cert.certPem,
                key: cert.keyPem,
                rejectUnauthorized: false // SEFAZ certificates may need this
            }),
            timeout: 30000,
            maxContentLength: 50 * 1024 * 1024 // 50MB
        });

        console.log(`[Manifest] Resposta recebida. Status HTTP: ${response.status}`);

        // 6. Parse response
        const result = parseDistribuicaoResponse(response.data);
        console.log(`[Manifest] cStat: ${result.cStat} - ${result.xMotivo}`);
        console.log(`[Manifest] Documentos encontrados: ${result.notas.length}`);
        console.log(`[Manifest] ultNSU: ${result.ultNSU}, maxNSU: ${result.maxNSU}, hasMore: ${result.hasMore}`);

        return result;
    } catch (err) {
        if (err.response) {
            console.error(`[Manifest] Erro HTTP ${err.response.status}:`, err.response.data ? err.response.data.substring(0, 500) : 'empty');

            // Try to parse SEFAZ error response
            try {
                const result = parseDistribuicaoResponse(err.response.data);
                return result;
            } catch (e) { /* ignore parse error */ }
        }
        throw new Error(`Erro na comunicação com SEFAZ: ${err.message}`);
    }
}

module.exports = {
    consultarDistribuicaoDFe,
    readCertificate,
    getUfCode
};
