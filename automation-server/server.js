// ═══════════════════════════════════════════════════════════════
// Fact ERP - Servidor de Automacao NFS-e
// Usa Playwright para controlar o navegador e executar os passos
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3099;

// Armazena contexto do browser e paginas abertas
let browser = null;
let context = null;
const pages = {}; // { sessionId: page }

// ─── Inicializa o browser ────────────────────────────────────────
async function ensureBrowser() {
    if (!browser || !browser.isConnected()) {
        console.log('[Server] Iniciando Chromium...');
        browser = await chromium.launch({
            headless: false,
            args: ['--start-maximized']
        });
        context = await browser.newContext({
            viewport: null,
            ignoreHTTPSErrors: true
        });
        console.log('[Server] Chromium iniciado.');
    }
    return context;
}

// ─── Formata datas ───────────────────────────────────────────────
function formatDate(date, format) {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const aaaa = String(date.getFullYear());
    switch (format) {
        case 'ddmmaaaa': return `${dd}${mm}${aaaa}`;
        case 'dd/mm/aaaa': return `${dd}/${mm}/${aaaa}`;
        case 'aaaa-mm-dd': return `${aaaa}-${mm}-${dd}`;
        case 'mmddaaaa': return `${mm}${dd}${aaaa}`;
        case 'mmaaaa': return `${mm}${aaaa}`;
        case 'mm/aaaa': return `${mm}/${aaaa}`;
        case 'aaaamm': return `${aaaa}${mm}`;
        default: return `${dd}/${mm}/${aaaa}`;
    }
}

const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function getMonthIndex(monthName) {
    if (!monthName || monthName === 'Atual') return new Date().getMonth();
    const normalized = monthName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const idx = MONTHS.findIndex(m =>
        m.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === normalized.toLowerCase()
    );
    return idx >= 0 ? idx : new Date().getMonth();
}

// ─── Encontra elemento: tenta na pagina e em iframes ─────────────
async function findElement(page, selector) {
    // 1. Tenta na pagina principal (rapido)
    try {
        const el = await page.waitForSelector(selector, { timeout: 2000, state: 'attached' });
        if (el) return { element: el, frame: page };
    } catch (e) { }

    // 2. Tenta em cada iframe
    const frames = page.frames();
    for (const frame of frames) {
        try {
            const el = await frame.waitForSelector(selector, { timeout: 1500, state: 'attached' });
            if (el) {
                console.log(`[Server] Encontrado em iframe: ${frame.url()}`);
                return { element: el, frame: frame };
            }
        } catch (e) { }
    }

    throw new Error(`Elemento nao encontrado: ${selector}`);
}

// ─── Preenche um campo (fill = colar, mais confiavel) ────────────
async function fillField(page, selector, value) {
    const { element, frame } = await findElement(page, selector);

    // Clicar no campo primeiro
    try {
        await element.click({ force: true, timeout: 1500 });
    } catch (e) {
        await element.evaluate(el => el.click());
    }

    // Limpar o campo
    try {
        await element.evaluate(el => { el.value = ''; });
        await element.dispatchEvent('input');
    } catch (e) { }

    // Preencher via fill (mais confiavel, como colar)
    try {
        await frame.fill(selector, value);
        console.log(`[Server] Preenchido via fill: ${selector} = ${value.substring(0, 3)}***`);
    } catch (e) {
        // Fallback: type (digitar caractere por caractere)
        console.log(`[Server] Fill falhou, tentando type...`);
        try {
            await element.evaluate(el => { el.value = ''; el.focus(); });
            await frame.type(selector, value, { delay: 40 });
            console.log(`[Server] Preenchido via type: ${selector}`);
        } catch (e2) {
            // Ultimo recurso: definir valor via JS
            console.log(`[Server] Type falhou, usando JS direto...`);
            await element.evaluate((el, val) => {
                el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }, value);
            console.log(`[Server] Preenchido via JS: ${selector}`);
        }
    }
}

// ─── Endpoint: Ping ──────────────────────────────────────────────
app.get('/ping', (req, res) => {
    res.json({ success: true, version: '1.0', status: 'online' });
});

// ─── Endpoint: Abrir URL ─────────────────────────────────────────
app.post('/open', async (req, res) => {
    try {
        const { url, sessionId } = req.body;
        console.log(`\n${'═'.repeat(50)}`);
        console.log(`[Server] Abrindo: ${url}`);
        console.log(`[Server] Sessao: ${sessionId}`);

        const ctx = await ensureBrowser();
        const page = await ctx.newPage();
        pages[sessionId] = page;

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Esperar a pagina estabilizar (rede parar de carregar)
        try {
            await page.waitForLoadState('networkidle', { timeout: 10000 });
        } catch (e) {
            console.log('[Server] NetworkIdle timeout - continuando...');
        }

        const title = await page.title();
        console.log(`[Server] Pagina carregada: ${title}`);
        console.log(`[Server] URL final: ${page.url()}`);
        console.log(`[Server] Frames: ${page.frames().length}`);

        res.json({ success: true, sessionId, title });
    } catch (err) {
        console.error('[Server] Erro ao abrir:', err.message);
        res.json({ success: false, error: err.message });
    }
});

// ─── Endpoint: Executar um passo ─────────────────────────────────
app.post('/execute-step', async (req, res) => {
    try {
        const { sessionId, step, client } = req.body;
        const page = pages[sessionId];

        if (!page || page.isClosed()) {
            return res.json({ success: false, error: 'Sessao nao encontrada ou pagina fechada.' });
        }

        const monthIdx = getMonthIndex(client.month);
        const year = parseInt(client.year);

        console.log(`\n[Server] ─── Executando: ${step.action} ───`);
        console.log(`[Server] Seletor: ${step.selector}`);

        switch (step.action) {
            case 'digitar_usuario': {
                await fillField(page, step.selector, client.login);
                break;
            }

            case 'digitar_senha': {
                await fillField(page, step.selector, client.password);
                break;
            }

            case 'clicar_elemento':
            case 'clicar_download': {
                const { element } = await findElement(page, step.selector);
                try {
                    await element.click({ force: true, timeout: 1500 });
                } catch (e) {
                    await element.evaluate(el => el.click());
                }
                // Espera breve para UI reagir
                await page.waitForTimeout(200);
                break;
            }

            case 'fechar_modal':
            case 'close_modal': {
                console.log(`[Server] Fechando modal: ${step.selector}`);

                // Estrategia 1: clique com Playwright
                try {
                    const { element } = await findElement(page, step.selector);
                    try {
                        await element.click({ force: true, timeout: 2000 });
                        console.log('[Server] Modal fechado via click force.');
                    } catch (e) {
                        try {
                            await element.evaluate(el => el.click());
                            console.log('[Server] Modal fechado via JS click.');
                        } catch (jsErr) {
                            console.log('[Server] JS click falhou:', jsErr.message);
                        }
                    }
                } catch (e) {
                    console.log(`[Server] Seletor nao encontrado: ${step.selector}`);
                }

                // Estrategia 2: jQuery / DOM direto
                try {
                    await page.evaluate(() => {
                        if (window.$ || window.jQuery) {
                            const jq = window.$ || window.jQuery;
                            jq('#divAviso').hide();
                            jq('#divBgModal').hide();
                            jq('.modal-backdrop').hide();
                            jq('.modal').modal && jq('.modal').modal('hide');
                        }
                        const ids = ['divAviso', 'divBgModal'];
                        ids.forEach(id => {
                            const el = document.getElementById(id);
                            if (el) el.style.display = 'none';
                        });
                        // Busca botao OK generico
                        document.querySelectorAll('a, button, input[type="button"]').forEach(btn => {
                            if (btn.textContent && btn.textContent.trim().toUpperCase() === 'OK') {
                                btn.click();
                            }
                        });
                    });
                } catch (e) { }

                await page.waitForTimeout(200);
                console.log('[Server] Tratamento de modal concluido.');
                break;
            }

            case 'email_fixo':
            case 'digitar_texto': {
                await fillField(page, step.selector, step.format || '');
                break;
            }

            case 'data_inicial': {
                const firstDay = new Date(year, monthIdx, 1);
                const formatted = formatDate(firstDay, step.format);
                await fillField(page, step.selector, formatted);
                break;
            }

            case 'data_final': {
                const lastDay = new Date(year, monthIdx + 1, 0);
                const formatted = formatDate(lastDay, step.format);
                await fillField(page, step.selector, formatted);
                break;
            }

            case 'competencia': {
                const compDate = new Date(year, monthIdx, 1);
                const formatted = formatDate(compDate, step.format);
                await fillField(page, step.selector, formatted);
                break;
            }

            case 'aguardar': {
                const ms = parseInt(step.selector) || 2000;
                console.log(`[Server] Aguardando ${ms}ms...`);
                await page.waitForTimeout(ms);
                break;
            }

            default:
                return res.json({ success: false, error: `Acao desconhecida: ${step.action}` });
        }

        console.log(`[Server] ✓ Passo concluido: ${step.action}`);
        res.json({ success: true });

    } catch (err) {
        console.error(`[Server] ✗ Erro no passo:`, err.message);
        res.json({ success: false, error: err.message });
    }
});

// ─── Endpoint: Fechar sessao ─────────────────────────────────────
app.post('/close', async (req, res) => {
    try {
        const { sessionId } = req.body;
        const page = pages[sessionId];
        if (page && !page.isClosed()) {
            await page.close();
        }
        delete pages[sessionId];
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

// ─── Endpoint: Status do browser ─────────────────────────────────
app.get('/status', (req, res) => {
    res.json({
        browserConnected: browser ? browser.isConnected() : false,
        activeSessions: Object.keys(pages).length
    });
});

// ═══════════════════════════════════════════════════════════════
// MANIFESTAÇÃO DO DESTINATÁRIO - Busca NFe via SEFAZ
// ═══════════════════════════════════════════════════════════════

const { consultarDistribuicaoDFe, readCertificate } = require('./manifest-service');

// ─── Endpoint: Consultar notas do SEFAZ ──────────────────────────
app.post('/manifest/consulta', async (req, res) => {
    try {
        const { certificateBase64, certificatePassword, cnpj, uf, ultNSU, chNFe } = req.body;

        if (!certificateBase64 || !certificatePassword || !cnpj) {
            return res.status(400).json({
                success: false,
                error: 'Parâmetros obrigatórios: certificateBase64, certificatePassword, cnpj'
            });
        }

        console.log(`\n[Manifest] ═══ Consulta NFe ═══`);
        console.log(`[Manifest] CNPJ: ${cnpj}`);
        console.log(`[Manifest] UF: ${uf || 'RJ'}`);
        console.log(`[Manifest] ultNSU: ${ultNSU || '0'}`);

        const result = await consultarDistribuicaoDFe(
            certificateBase64,
            certificatePassword,
            cnpj,
            uf || 'RJ',
            ultNSU || '0',
            chNFe || null
        );

        res.json({
            success: true,
            cStat: result.cStat,
            xMotivo: result.xMotivo,
            ultNSU: result.ultNSU,
            maxNSU: result.maxNSU,
            hasMore: result.hasMore,
            notas: result.notas.filter(n => n.tipo === 'resumo').map(n => ({
                nsu: n.nsu,
                chaveNfe: n.chNFe,
                cnpjEmitente: n.cnpjEmitente,
                nomeEmitente: n.nomeEmitente,
                ieEmitente: n.ieEmitente,
                dataEmissao: n.dataEmissao,
                valorNfe: n.valorNFe,
                sitNfe: n.sitNFe,
                tipoOperacao: n.tipoOperacao,
                xmlResumo: n.xmlResumo
            })),
            eventos: result.notas.filter(n => n.tipo === 'evento')
        });
    } catch (err) {
        console.error('[Manifest] Erro:', err.message);
        res.json({ success: false, error: err.message });
    }
});

// ─── Endpoint: Validar certificado ───────────────────────────────
app.post('/manifest/certificado/validar', async (req, res) => {
    try {
        const { certificateBase64, certificatePassword } = req.body;

        if (!certificateBase64 || !certificatePassword) {
            return res.status(400).json({
                success: false,
                error: 'Informe certificateBase64 e certificatePassword'
            });
        }

        const cert = readCertificate(certificateBase64, certificatePassword);

        res.json({
            success: true,
            certificado: {
                titular: cert.subject.CN || cert.subject.O || 'N/A',
                cnpj: cert.subject['2.16.76.1.3.3'] || '',
                emissao: cert.notBefore,
                vencimento: cert.notAfter,
                expirado: new Date(cert.notAfter) < new Date(),
                serialNumber: cert.serialNumber
            }
        });
    } catch (err) {
        console.error('[Manifest] Erro ao validar certificado:', err.message);
        res.json({ success: false, error: err.message });
    }
});

// ─── Endpoint: Status do serviço de manifestação ─────────────────
app.get('/manifest/status', (req, res) => {
    res.json({
        available: true,
        service: 'Manifestação do Destinatário',
        version: '1.0'
    });
});

// ─── Iniciar servidor ────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`  Fact ERP - Servidor de Automacao NFS-e`);
    console.log(`  + Manifestação do Destinatário (SEFAZ)`);
    console.log(`  Rodando em: http://localhost:${PORT}`);
    console.log(`  Status: http://localhost:${PORT}/status`);
    console.log(`${'═'.repeat(50)}\n`);
});

process.on('SIGINT', async () => {
    console.log('\n[Server] Encerrando...');
    if (browser) await browser.close();
    process.exit(0);
});
