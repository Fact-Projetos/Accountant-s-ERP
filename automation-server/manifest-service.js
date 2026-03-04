/**
 * Manifestação do Destinatário - SEFAZ Nacional
 * 
 * Consulta NFe emitidas contra o CNPJ da empresa usando
 * o WebService NFeDistribuicaoDFe da SEFAZ Nacional.
 * 
 * IMPORTANTE: Este serviço NÃO requer assinatura XML.
 * A autenticação é feita via TLS mútuo (certificado do cliente).
 */

const forge = require('node-forge');
const https = require('https');
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
            notAfter: certificate.validity.notAfter
        };
    } catch (err) {
        throw new Error(`Erro ao ler certificado: ${err.message}`);
    }
}

/**
 * Get UF code from state abbreviation
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
 * Build the SOAP envelope for NFeDistribuicaoDFe
 * NÃO requer assinatura XML - autenticação via TLS mútuo
 */
function buildSoapEnvelope(cnpj, ultNSU = '0', uf = '35', chNFe = null) {
    const tpAmb = '1'; // 1=Produção, 2=Homologação
    const versao = '1.01';
    const cleanCnpj = cnpj.replace(/\D/g, '');

    let consultaContent;
    if (chNFe) {
        consultaContent = `<consChNFe><chNFe>${chNFe}</chNFe></consChNFe>`;
    } else {
        consultaContent = `<distNSU><ultNSU>${ultNSU.padStart(15, '0')}</ultNSU></distNSU>`;
    }

    // Envelope SOAP 1.2 com namespace correto
    const soap = `<?xml version="1.0" encoding="utf-8"?>` +
        `<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">` +
        `<soap12:Body>` +
        `<nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">` +
        `<nfeDadosMsg>` +
        `<distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="${versao}">` +
        `<tpAmb>${tpAmb}</tpAmb>` +
        `<cUFAutor>${uf}</cUFAutor>` +
        `<CNPJ>${cleanCnpj}</CNPJ>` +
        `${consultaContent}` +
        `</distDFeInt>` +
        `</nfeDadosMsg>` +
        `</nfeDistDFeInteresse>` +
        `</soap12:Body>` +
        `</soap12:Envelope>`;

    return soap;
}

/**
 * Extract text content from XML by tag name
 */
function getTextContent(xmlStr, tagName) {
    // Simple regex-based extraction (more robust than DOM parsing for SOAP responses)
    const regex = new RegExp(`<(?:[a-zA-Z0-9]+:)?${tagName}[^>]*>([^<]*)<`, 'i');
    const match = xmlStr.match(regex);
    return match ? match[1].trim() : '';
}

/**
 * Parse the SEFAZ response
 */
function parseDistribuicaoResponse(responseXml) {
    const cStat = getTextContent(responseXml, 'cStat');
    const xMotivo = getTextContent(responseXml, 'xMotivo');
    const ultNSU = getTextContent(responseXml, 'ultNSU');
    const maxNSU = getTextContent(responseXml, 'maxNSU');

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
        // Extract all docZip elements
        const docZipRegex = /<docZip\s+NSU="(\d+)"(?:\s+schema="([^"]*)")?[^>]*>([^<]+)<\/docZip>/gi;
        let match;

        while ((match = docZipRegex.exec(responseXml)) !== null) {
            const nsu = match[1];
            const schema = match[2] || '';
            const compressedBase64 = match[3].trim();

            try {
                // Decompress the gzip content
                const compressed = Buffer.from(compressedBase64, 'base64');
                const decompressed = zlib.inflateRawSync(compressed);
                const xmlContent = decompressed.toString('utf-8');

                if (schema.includes('resNFe')) {
                    // Summary of NFe (resumo)
                    const nota = {
                        nsu,
                        tipo: 'resumo',
                        chNFe: getTextContent(xmlContent, 'chNFe'),
                        cnpjEmitente: getTextContent(xmlContent, 'CNPJ'),
                        nomeEmitente: getTextContent(xmlContent, 'xNome'),
                        ieEmitente: getTextContent(xmlContent, 'IE'),
                        dataEmissao: getTextContent(xmlContent, 'dhEmi'),
                        tipoOperacao: getTextContent(xmlContent, 'tpNF'),
                        valorNFe: parseFloat(getTextContent(xmlContent, 'vNF') || '0'),
                        digestValue: getTextContent(xmlContent, 'digVal'),
                        sitNFe: getTextContent(xmlContent, 'cSitNFe'),
                        xmlResumo: xmlContent
                    };
                    result.notas.push(nota);
                } else if (schema.includes('procNFe') || schema.includes('nfeProc')) {
                    const nota = {
                        nsu,
                        tipo: 'completo',
                        chNFe: getTextContent(xmlContent, 'chNFe'),
                        xmlCompleto: xmlContent
                    };
                    result.notas.push(nota);
                } else if (schema.includes('resEvento')) {
                    const nota = {
                        nsu,
                        tipo: 'evento',
                        chNFe: getTextContent(xmlContent, 'chNFe'),
                        tipoEvento: getTextContent(xmlContent, 'tpEvento'),
                        descEvento: getTextContent(xmlContent, 'xEvento'),
                        xmlResumo: xmlContent
                    };
                    result.notas.push(nota);
                }
            } catch (err) {
                console.error(`[Manifest] Error decompressing docZip NSU ${nsu}:`, err.message);
            }
        }

        result.hasMore = parseInt(ultNSU || '0') < parseInt(maxNSU || '0');
    }

    return result;
}

/**
 * Main function: Query SEFAZ for documents issued against CNPJ
 */
async function consultarDistribuicaoDFe(pfxBase64, password, cnpj, uf = 'SP', ultNSU = '0', chNFe = null) {
    console.log(`[Manifest] Consultando CNPJ: ${cnpj}, UF: ${uf}, ultNSU: ${ultNSU}`);

    // 1. Read certificate
    const cert = readCertificate(pfxBase64, password);
    console.log(`[Manifest] Certificado: ${cert.subject.CN || cert.subject.O || 'N/A'}`);
    console.log(`[Manifest] Validade: ${cert.notBefore} até ${cert.notAfter}`);

    if (new Date(cert.notAfter) < new Date()) {
        throw new Error('Certificado digital expirado!');
    }

    // 2. Build SOAP envelope (SEM assinatura - autenticação via TLS)
    const ufCode = getUfCode(uf);
    const soapEnvelope = buildSoapEnvelope(cnpj, ultNSU, ufCode, chNFe);

    console.log(`[Manifest] UF Code: ${ufCode}`);
    console.log(`[Manifest] Enviando requisição para SEFAZ (Produção)...`);

    // 3. Send request with mutual TLS (client certificate)
    try {
        const response = await axios.post(SEFAZ_URLS.production, soapEnvelope, {
            headers: {
                'Content-Type': 'application/soap+xml; charset=utf-8'
            },
            httpsAgent: new https.Agent({
                cert: cert.certPem,
                key: cert.keyPem,
                rejectUnauthorized: false
            }),
            timeout: 30000,
            maxContentLength: 50 * 1024 * 1024
        });

        console.log(`[Manifest] Resposta HTTP: ${response.status}`);

        const result = parseDistribuicaoResponse(response.data);
        console.log(`[Manifest] cStat: ${result.cStat} - ${result.xMotivo}`);
        console.log(`[Manifest] Documentos: ${result.notas.length}, ultNSU: ${result.ultNSU}, maxNSU: ${result.maxNSU}`);

        return result;
    } catch (err) {
        if (err.response) {
            console.error(`[Manifest] HTTP ${err.response.status}:`, typeof err.response.data === 'string' ? err.response.data.substring(0, 500) : err.response.data);
            try {
                return parseDistribuicaoResponse(err.response.data);
            } catch (e) { /* ignore */ }
        }
        throw new Error(`Erro SEFAZ: ${err.message}`);
    }
}

/**
 * Build XML for Evento de Manifestação do Destinatário
 * This REQUIRES XML digital signature (XMLDSig)
 * 
 * Event types:
 * 210200 = Confirmação da Operação
 * 210210 = Ciência da Operação  
 * 210220 = Desconhecimento da Operação
 * 210240 = Operação não Realizada
 */
function buildEventoManifestacao(cnpj, chNFe, tipoEvento, nSeqEvento = 1, justificativa = '') {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    const tpAmb = '1'; // Produção
    const cOrgao = '91'; // Ambiente Nacional
    const dhEvento = new Date().toISOString().replace(/\.\d{3}Z$/, '-03:00');
    const eventId = `ID${tipoEvento}${chNFe}${String(nSeqEvento).padStart(2, '0')}`;

    const descEventos = {
        '210200': 'Confirmacao da Operacao',
        '210210': 'Ciencia da Operacao',
        '210220': 'Desconhecimento da Operacao',
        '210240': 'Operacao nao Realizada'
    };
    const descEvento = descEventos[tipoEvento] || 'Ciencia da Operacao';
    const versaoEvento = '1.00';

    let detEventoContent = `<descEvento>${descEvento}</descEvento>`;
    if (tipoEvento === '210240' && justificativa) {
        detEventoContent += `<xJust>${justificativa}</xJust>`;
    }

    const infEvento = `<infEvento Id="${eventId}">` +
        `<cOrgao>${cOrgao}</cOrgao>` +
        `<tpAmb>${tpAmb}</tpAmb>` +
        `<CNPJ>${cleanCnpj}</CNPJ>` +
        `<chNFe>${chNFe}</chNFe>` +
        `<dhEvento>${dhEvento}</dhEvento>` +
        `<tpEvento>${tipoEvento}</tpEvento>` +
        `<nSeqEvento>${nSeqEvento}</nSeqEvento>` +
        `<verEvento>${versaoEvento}</verEvento>` +
        `<detEvento versao="${versaoEvento}">` +
        detEventoContent +
        `</detEvento>` +
        `</infEvento>`;

    return { infEvento, eventId };
}

/**
 * Sign the evento XML using XMLDSig (required for RecepcaoEvento)
 */
function signEventoXml(infEvento, eventId, keyPem, certDerBase64) {
    const crypto = require('crypto');

    // Canonical XML of infEvento
    const canonicalXml = infEvento;

    // Calculate SHA-1 digest
    const digestHash = crypto.createHash('sha1').update(canonicalXml, 'utf8').digest('base64');

    // Build SignedInfo
    const signedInfo = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">` +
        `<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
        `<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>` +
        `<Reference URI="#${eventId}">` +
        `<Transforms>` +
        `<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>` +
        `<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
        `</Transforms>` +
        `<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>` +
        `<DigestValue>${digestHash}</DigestValue>` +
        `</Reference>` +
        `</SignedInfo>`;

    // Sign with RSA-SHA1
    const signer = crypto.createSign('RSA-SHA1');
    signer.update(signedInfo);
    const signatureValue = signer.sign(keyPem, 'base64');

    // Build complete Signature
    const signature = `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">` +
        signedInfo +
        `<SignatureValue>${signatureValue}</SignatureValue>` +
        `<KeyInfo>` +
        `<X509Data>` +
        `<X509Certificate>${certDerBase64}</X509Certificate>` +
        `</X509Data>` +
        `</KeyInfo>` +
        `</Signature>`;

    return signature;
}

/**
 * Send Manifestação do Destinatário event to SEFAZ
 */
async function enviarEventoManifestacao(pfxBase64, password, cnpj, chNFe, tipoEvento, justificativa = '') {
    console.log(`[Manifest] Enviando evento ${tipoEvento} para NFe ${chNFe}`);

    // 1. Read certificate
    const cert = readCertificate(pfxBase64, password);

    if (new Date(cert.notAfter) < new Date()) {
        throw new Error('Certificado digital expirado!');
    }

    // Get certificate DER base64 for X509Certificate element
    const certDerBase64 = forge.util.encode64(
        forge.asn1.toDer(forge.pki.certificateToAsn1(
            forge.pki.certificateFromPem(cert.certPem)
        )).getBytes()
    );

    // 2. Build evento XML
    const { infEvento, eventId } = buildEventoManifestacao(cnpj, chNFe, tipoEvento, 1, justificativa);

    // 3. Sign the XML
    const signature = signEventoXml(infEvento, eventId, cert.keyPem, certDerBase64);

    // 4. Build complete evento with signature
    const eventoXml = `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">` +
        infEvento +
        signature +
        `</evento>`;

    // 5. Wrap in envEvento
    const envEvento = `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">` +
        `<idLote>1</idLote>` +
        eventoXml +
        `</envEvento>`;

    // 6. Build SOAP envelope
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>` +
        `<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">` +
        `<soap12:Body>` +
        `<nfeRecepcaoEvento xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">` +
        `<nfeDadosMsg>` +
        envEvento +
        `</nfeDadosMsg>` +
        `</nfeRecepcaoEvento>` +
        `</soap12:Body>` +
        `</soap12:Envelope>`;

    // 7. Send request
    const EVENTO_URL = 'https://www.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx';

    try {
        const response = await axios.post(EVENTO_URL, soapEnvelope, {
            headers: {
                'Content-Type': 'application/soap+xml; charset=utf-8'
            },
            httpsAgent: new https.Agent({
                cert: cert.certPem,
                key: cert.keyPem,
                rejectUnauthorized: false
            }),
            timeout: 30000
        });

        console.log(`[Manifest] Evento - HTTP ${response.status}`);

        const cStatEvento = getTextContent(response.data, 'cStat');
        const xMotivoEvento = getTextContent(response.data, 'xMotivo');

        console.log(`[Manifest] Evento cStat: ${cStatEvento} - ${xMotivoEvento}`);

        return {
            success: cStatEvento === '128' || cStatEvento === '135' || cStatEvento === '136',
            cStat: cStatEvento,
            xMotivo: xMotivoEvento,
            chNFe,
            tipoEvento
        };
    } catch (err) {
        if (err.response) {
            const cStatErr = getTextContent(err.response.data || '', 'cStat');
            const xMotivoErr = getTextContent(err.response.data || '', 'xMotivo');
            if (cStatErr) {
                return { success: false, cStat: cStatErr, xMotivo: xMotivoErr, chNFe, tipoEvento };
            }
        }
        throw new Error(`Erro ao enviar evento: ${err.message}`);
    }
}

module.exports = {
    consultarDistribuicaoDFe,
    enviarEventoManifestacao,
    readCertificate,
    getUfCode
};
