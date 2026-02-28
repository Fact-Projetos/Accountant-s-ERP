// ═══════════════════════════════════════════════════════════════
// Fact ERP - Robo NFS-e :: Background Service Worker
// Receives messages from the web app and forwards to content scripts
// ═══════════════════════════════════════════════════════════════

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
    console.log('[Fact Robot BG] Mensagem recebida:', message.type);

    if (message.type === 'FACT_PING') {
        sendResponse({ success: true, version: '1.0' });
        return false;
    }

    if (message.type === 'FACT_OPEN_URL') {
        chrome.tabs.create({ url: message.url, active: true }, (tab) => {
            console.log('[Fact Robot BG] Aba aberta, tabId:', tab.id);
            sendResponse({ success: true, tabId: tab.id });
        });
        return true;
    }

    if (message.type === 'FACT_EXECUTE_STEP') {
        const tabId = message.tabId;
        console.log('[Fact Robot BG] Executando step na aba', tabId, ':', message.step.action);

        chrome.tabs.sendMessage(tabId, {
            type: 'EXECUTE_STEP',
            step: message.step,
            client: message.client
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('[Fact Robot BG] Erro ao enviar para content script:', chrome.runtime.lastError.message);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                console.log('[Fact Robot BG] Resposta do content script:', response);
                sendResponse(response || { success: false, error: 'Sem resposta do content script' });
            }
        });
        return true;
    }

    if (message.type === 'FACT_CHECK_TAB') {
        chrome.tabs.get(message.tabId, (tab) => {
            if (chrome.runtime.lastError) {
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                sendResponse({
                    success: true,
                    status: tab.status,
                    url: tab.url,
                    title: tab.title
                });
            }
        });
        return true;
    }
});

console.log('[Fact Robot BG] Service worker iniciado.');
