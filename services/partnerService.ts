import { Partner } from '../types';

const STORAGE_KEY = 'fact_partners';

export const partnerService = {
    getPartners(): Partner[] {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            // Initialize with some mock data if empty
            const initial: Partner[] = [
                { id: '1', type: 'cliente', name: 'João Silva', document: '123.456.789-00', email: 'joao@email.com', phone: '(11) 99999-9999', status: 'Ativo' },
                { id: '2', type: 'fornecedor', name: 'Atacado Central Ltda', document: '44.555.666/0001-22', email: 'vendas@central.com', phone: '(11) 4004-0000', status: 'Ativo' },
            ];
            this.savePartners(initial);
            return initial;
        }
        return JSON.parse(stored);
    },

    savePartners(partners: Partner[]) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(partners));
    },

    addOrUpdatePartner(partner: Omit<Partner, 'id' | 'status'> & { id?: string, status?: 'Ativo' | 'Inativo' }): Partner {
        const partners = this.getPartners();

        // Check if partner with same document exists
        const existingIndex = partners.findIndex(p => p.document === partner.document && p.type === partner.type);

        if (existingIndex > -1) {
            const updated = { ...partners[existingIndex], ...partner };
            partners[existingIndex] = updated;
            this.savePartners(partners);
            return updated;
        } else {
            const newPartner: Partner = {
                ...partner,
                id: partner.id || Math.random().toString(36).substr(2, 9),
                status: partner.status || 'Ativo',
            } as Partner;
            partners.push(newPartner);
            this.savePartners(partners);
            return newPartner;
        }
    },

    deletePartner(id: string) {
        const partners = this.getPartners();
        const filtered = partners.filter(p => p.id !== id);
        this.savePartners(filtered);
    }
};
