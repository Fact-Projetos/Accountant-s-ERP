// ═══════════════════════════════════════════════════════════════
// Fact ERP - Robo NFS-e :: Content Script
// Roda dentro da pagina alvo (prefeitura), tem acesso total ao DOM
// ═══════════════════════════════════════════════════════════════

// ─── Simula digitacao real, caractere por caractere ──────────────
async function simulateTyping(el, text) {
    el.focus();
    el.dispatchEvent(new Event('focus', { bubbles: true }));

    // Limpa o campo
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const keyCode = char.charCodeAt(0);

        el.dispatchEvent(new KeyboardEvent('keydown', {
            key: char, code: 'Key' + char.toUpperCase(), charCode: keyCode,
            keyCode: keyCode, which: keyCode, bubbles: true, cancelable: true
        }));

        el.dispatchEvent(new KeyboardEvent('keypress', {
            key: char, code: 'Key' + char.toUpperCase(), charCode: keyCode,
            keyCode: keyCode, which: keyCode, bubbles: true, cancelable: true
        }));

        el.value += char;

        el.dispatchEvent(new InputEvent('input', {
            data: char, inputType: 'insertText', bubbles: true, cancelable: true
        }));

        el.dispatchEvent(new KeyboardEvent('keyup', {
            key: char, code: 'Key' + char.toUpperCase(), charCode: keyCode,
            keyCode: keyCode, which: keyCode, bubbles: true, cancelable: true
        }));

        await new Promise(r => setTimeout(r, 30 + Math.random() * 30));
    }

    el.dispatchEvent(new Event('change', { bubbles: true }));
}

// ─── Formatacao de datas ────────────────────────────────────────
function formatDate(date, format) {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const aaaa = String(date.getFullYear());
    switch (format) {
        case 'ddmmaaaa': return dd + mm + aaaa;
        case 'dd/mm/aaaa': return dd + '/' + mm + '/' + aaaa;
        case 'aaaa-mm-dd': return aaaa + '-' + mm + '-' + dd;
        case 'mmddaaaa': return mm + dd + aaaa;
        case 'mmaaaa': return mm + aaaa;
        case 'mm/aaaa': return mm + '/' + aaaa;
        case 'aaaamm': return aaaa + mm;
        default: return dd + '/' + mm + '/' + aaaa;
    }
}

const MONTHS = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
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

// ─── Escuta comandos do background script ────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type !== 'EXECUTE_STEP') return false;

    const { step, client } = message;
    console.log('[Fact Robot CS] Executando:', step.action, '| Seletor:', step.selector);

    executeStep(step, client)
        .then(() => {
            console.log('[Fact Robot CS] Sucesso:', step.action);
            sendResponse({ success: true });
        })
        .catch((err) => {
            console.error('[Fact Robot CS] Erro:', step.action, err.message);
            sendResponse({ success: false, error: err.message });
        });

    return true; // resposta assincrona
});

// ─── Executa um passo da automacao ──────────────────────────────
async function executeStep(step, client) {
    const monthIdx = getMonthIndex(client.month);
    const year = parseInt(client.year);

    switch (step.action) {

        case 'digitar_usuario': {
            const el = document.querySelector(step.selector);
            if (!el) throw new Error('Elemento nao encontrado: ' + step.selector);
            await simulateTyping(el, client.login);
            break;
        }

        case 'digitar_senha': {
            const el = document.querySelector(step.selector);
            if (!el) throw new Error('Elemento nao encontrado: ' + step.selector);
            await simulateTyping(el, client.password);
            break;
        }

        case 'clicar_elemento':
        case 'clicar_download': {
            const el = document.querySelector(step.selector);
            if (!el) throw new Error('Elemento nao encontrado: ' + step.selector);
            el.click();
            break;
        }

        case 'fechar_modal': {
            console.log('[Fact Robot CS] Tentando fechar modal com seletor:', step.selector);
            let fechou = false;

            // Estrategia 1: Clicar no elemento pelo seletor
            try {
                const el = document.querySelector(step.selector);
                if (el) {
                    console.log('[Fact Robot CS] Elemento encontrado, clicando...');
                    el.click();
                    fechou = true;

                    // Estrategia 2: Executar o onclick inline (ex: jQuery hide)
                    const onclickAttr = el.getAttribute('onclick');
                    if (onclickAttr) {
                        console.log('[Fact Robot CS] Executando onclick:', onclickAttr);
                        try { eval(onclickAttr); } catch (e) {
                            console.log('[Fact Robot CS] Erro ao executar onclick:', e.message);
                        }
                    }
                }
            } catch (e) {
                console.log('[Fact Robot CS] Erro na estrategia 1:', e.message);
            }

            // Estrategia 3: jQuery direto (se disponivel na pagina)
            try {
                if (window.$ || window.jQuery) {
                    const jq = window.$ || window.jQuery;
                    console.log('[Fact Robot CS] jQuery detectado, escondendo divs...');
                    jq('#divAviso').hide();
                    jq('#divBgModal').hide();
                    jq('.modal-backdrop').hide();
                    jq('.modal').hide();
                    fechou = true;
                }
            } catch (e) {
                console.log('[Fact Robot CS] Erro na estrategia 3 (jQuery):', e.message);
            }

            // Estrategia 4: DOM direto - style.display = 'none'
            try {
                const idsToHide = ['divAviso', 'divBgModal', 'modal-backdrop'];
                for (const id of idsToHide) {
                    const div = document.getElementById(id);
                    if (div) {
                        div.style.display = 'none';
                        console.log('[Fact Robot CS] Div #' + id + ' escondida via DOM.');
                        fechou = true;
                    }
                }
            } catch (e) {
                console.log('[Fact Robot CS] Erro na estrategia 4 (DOM):', e.message);
            }

            // Estrategia 5: Buscar por classe .btn-ok e clicar
            if (!fechou) {
                try {
                    const btnOk = document.querySelector('.btn-ok');
                    if (btnOk) {
                        console.log('[Fact Robot CS] Encontrou .btn-ok, clicando...');
                        btnOk.click();
                        fechou = true;
                    }
                } catch (e) { }
            }

            // Estrategia 6: Buscar qualquer botao com texto "OK" e clicar
            if (!fechou) {
                try {
                    const buttons = document.querySelectorAll('a, button, input[type="button"]');
                    for (const btn of buttons) {
                        if (btn.textContent && btn.textContent.trim().toUpperCase() === 'OK') {
                            console.log('[Fact Robot CS] Encontrou botao OK, clicando...');
                            btn.click();
                            fechou = true;
                            break;
                        }
                    }
                } catch (e) { }
            }

            // Pequeno delay para animacao do modal
            await new Promise(r => setTimeout(r, 500));

            console.log('[Fact Robot CS] Modal fechado?', fechou);
            break;
        }

        case 'email_fixo':
        case 'digitar_texto': {
            const el = document.querySelector(step.selector);
            if (!el) throw new Error('Elemento nao encontrado: ' + step.selector);
            await simulateTyping(el, step.format || '');
            break;
        }

        case 'data_inicial': {
            const firstDay = new Date(year, monthIdx, 1);
            const el = document.querySelector(step.selector);
            if (!el) throw new Error('Elemento nao encontrado: ' + step.selector);
            await simulateTyping(el, formatDate(firstDay, step.format));
            break;
        }

        case 'data_final': {
            const lastDay = new Date(year, monthIdx + 1, 0);
            const el = document.querySelector(step.selector);
            if (!el) throw new Error('Elemento nao encontrado: ' + step.selector);
            await simulateTyping(el, formatDate(lastDay, step.format));
            break;
        }

        case 'competencia': {
            const compDate = new Date(year, monthIdx, 1);
            const el = document.querySelector(step.selector);
            if (!el) throw new Error('Elemento nao encontrado: ' + step.selector);
            await simulateTyping(el, formatDate(compDate, step.format));
            break;
        }

        case 'aguardar': {
            const ms = parseInt(step.selector) || 2000;
            console.log('[Fact Robot CS] Aguardando', ms, 'ms...');
            await new Promise(r => setTimeout(r, ms));
            break;
        }

        default:
            throw new Error('Acao desconhecida: ' + step.action);
    }
}

console.log('[Fact Robot CS] Content script carregado em:', window.location.href);
