const fs = require('fs');
const path = require('path');

class NCMDatabase {
    constructor() {
        this.dataFile = path.join(__dirname, 'ncm-data.json');
        this.data = this.loadData();
    }

    loadData() {
        try {
            if (fs.existsSync(this.dataFile)) {
                const data = fs.readFileSync(this.dataFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Erro ao carregar dados NCM:', error);
        }

        // Dados iniciais com NCMs comuns para importação Paraguai
        return {
            ncms: [
                // Eletrônicos
                {
                    code: '85171231',
                    description: 'Telefones móveis (celulares) - smartphones',
                    category: 'Eletrônicos',
                    import_tax: 16,
                    ipi: 15,
                    pis_cofins: 9.25,
                    icms: 18,
                    notes: 'Produtos mais comuns via Paraguai'
                },
                {
                    code: '85171219',
                    description: 'Telefones móveis (celulares) - outros',
                    category: 'Eletrônicos',
                    import_tax: 16,
                    ipi: 15,
                    pis_cofins: 9.25,
                    icms: 18,
                    notes: ''
                },
                {
                    code: '85285290',
                    description: 'Monitores e projetores de vídeo',
                    category: 'Eletrônicos',
                    import_tax: 16,
                    ipi: 10,
                    pis_cofins: 9.25,
                    icms: 18,
                    notes: ''
                },
                {
                    code: '84713020',
                    description: 'Computadores portáteis (notebooks)',
                    category: 'Informática',
                    import_tax: 16,
                    ipi: 0,
                    pis_cofins: 9.25,
                    icms: 18,
                    notes: 'IPI zero conforme lei'
                },
                {
                    code: '84713090',
                    description: 'Computadores - outros',
                    category: 'Informática',
                    import_tax: 16,
                    ipi: 0,
                    pis_cofins: 9.25,
                    icms: 18,
                    notes: ''
                },
                
                // Acessórios
                {
                    code: '85444290',
                    description: 'Cabos para informática/eletrônicos',
                    category: 'Acessórios',
                    import_tax: 16,
                    ipi: 5,
                    pis_cofins: 9.25,
                    icms: 18,
                    notes: ''
                },
                {
                    code: '85177000',
                    description: 'Partes de telefones (capas, película, etc)',
                    category: 'Acessórios',
                    import_tax: 16,
                    ipi: 15,
                    pis_cofins: 9.25,
                    icms: 18,
                    notes: ''
                },
                {
                    code: '85183000',
                    description: 'Fones de ouvido/microfones',
                    category: 'Acessórios',
                    import_tax: 16,
                    ipi: 10,
                    pis_cofins: 9.25,
                    icms: 18,
                    notes: ''
                },
                
                // Brinquedos
                {
                    code: '95030000',
                    description: 'Brinquedos de madeira',
                    category: 'Brinquedos',
                    import_tax: 20,
                    ipi: 0,
                    pis_cofins: 9.25,
                    icms: 18,
                    notes: 'Tributação mais alta'
                },
                {
                    code: '95049000',
                    description: 'Brinquedos - outros',
                    category: 'Brinquedos',
                    import_tax: 20,
                    ipi: 0,
                    pis_cofins: 9.25,
                    icms: 18,
                    notes: ''
                },
                
                // Vestuário
                {
                    code: '61091000',
                    description: 'Camisetas de malha - algodão',
                    category: 'Vestuário',
                    import_tax: 35,
                    ipi: 0,
                    pis_cofins: 9.25,
                    icms: 18,
                    notes: 'Tributação muito alta - cuidado'
                },
                {
                    code: '64039900',
                    description: 'Calçados - outros',
                    category: 'Calçados',
                    import_tax: 35,
                    ipi: 0,
                    pis_cofins: 9.25,
                    icms: 18,
                    notes: 'Tributação muito alta'
                },
                
                // Ferramentas
                {
                    code: '82019000',
                    description: 'Ferramentas manuais - outras',
                    category: 'Ferramentas',
                    import_tax: 16,
                    ipi: 5,
                    pis_cofins: 9.25,
                    icms: 18,
                    notes: ''
                },
                
                // Perfumes/Cosméticos
                {
                    code: '33049900',
                    description: 'Produtos de beleza - outros',
                    category: 'Cosméticos',
                    import_tax: 16,
                    ipi: 0,
                    pis_cofins: 9.25,
                    icms: 18,
                    notes: ''
                },
                
                // Genérico
                {
                    code: '00000000',
                    description: 'NCM Genérico - Definir taxas manualmente',
                    category: 'Genérico',
                    import_tax: 16,
                    ipi: 10,
                    pis_cofins: 9.25,
                    icms: 18,
                    notes: 'Use para produtos sem NCM específico'
                }
            ],
            customs: {
                // Dados específicos para Paraguai
                default_freight_rate: 8.0, // % sobre FOB para frete Paraguai
                default_insurance_rate: 0.3, // % sobre FOB
                default_broker_fee: 300.00, // Taxa fixa despachante
                default_other_costs: 150.00, // Outras despesas
                usd_rate: 5.50, // Taxa padrão USD
                notes: 'Taxas baseadas em importação via Paraguai - Ciudad del Este'
            }
        };
    }

    saveData() {
        try {
            fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error('Erro ao salvar dados NCM:', error);
            return false;
        }
    }

    // Buscar NCM por código
    findByCode(code) {
        return this.data.ncms.find(ncm => ncm.code === code);
    }

    // Buscar NCMs por descrição
    searchByDescription(query) {
        const searchTerm = query.toLowerCase();
        return this.data.ncms.filter(ncm => 
            ncm.description.toLowerCase().includes(searchTerm) ||
            ncm.category.toLowerCase().includes(searchTerm)
        );
    }

    // Obter todas as NCMs
    getAllNCMs() {
        return this.data.ncms;
    }

    // Obter NCMs por categoria
    getByCategory(category) {
        return this.data.ncms.filter(ncm => ncm.category === category);
    }

    // Obter todas as categorias
    getCategories() {
        const categories = [...new Set(this.data.ncms.map(ncm => ncm.category))];
        return categories.sort();
    }

    // Adicionar nova NCM
    addNCM(ncmData) {
        try {
            // Validações
            if (!ncmData.code || !ncmData.description) {
                throw new Error('Código e descrição são obrigatórios');
            }

            // Verificar se já existe
            if (this.findByCode(ncmData.code)) {
                throw new Error('NCM já cadastrado');
            }

            const newNCM = {
                code: ncmData.code,
                description: ncmData.description,
                category: ncmData.category || 'Outros',
                import_tax: parseFloat(ncmData.import_tax) || 16,
                ipi: parseFloat(ncmData.ipi) || 0,
                pis_cofins: parseFloat(ncmData.pis_cofins) || 9.25,
                icms: parseFloat(ncmData.icms) || 18,
                notes: ncmData.notes || ''
            };

            this.data.ncms.push(newNCM);
            this.saveData();
            return newNCM;
        } catch (error) {
            throw error;
        }
    }

    // Atualizar NCM
    updateNCM(code, updateData) {
        try {
            const ncmIndex = this.data.ncms.findIndex(ncm => ncm.code === code);
            if (ncmIndex === -1) {
                throw new Error('NCM não encontrado');
            }

            // Atualizar dados
            this.data.ncms[ncmIndex] = {
                ...this.data.ncms[ncmIndex],
                ...updateData
            };

            this.saveData();
            return this.data.ncms[ncmIndex];
        } catch (error) {
            throw error;
        }
    }

    // Deletar NCM
    deleteNCM(code) {
        try {
            const ncmIndex = this.data.ncms.findIndex(ncm => ncm.code === code);
            if (ncmIndex === -1) {
                throw new Error('NCM não encontrado');
            }

            this.data.ncms.splice(ncmIndex, 1);
            this.saveData();
            return true;
        } catch (error) {
            throw error;
        }
    }

    // Obter configurações padrão do Paraguai
    getParaguayDefaults() {
        return this.data.customs;
    }

    // Atualizar configurações
    updateParaguayDefaults(newDefaults) {
        try {
            this.data.customs = {
                ...this.data.customs,
                ...newDefaults
            };
            this.saveData();
            return this.data.customs;
        } catch (error) {
            throw error;
        }
    }

    // Calcular impostos para um NCM específico
    calculateTaxes(ncmCode, fobValue) {
        const ncm = this.findByCode(ncmCode);
        if (!ncm) {
            throw new Error('NCM não encontrado');
        }

        const taxes = {
            import_tax: fobValue * (ncm.import_tax / 100),
            ipi: fobValue * (ncm.ipi / 100),
            pis_cofins: fobValue * (ncm.pis_cofins / 100),
            icms: fobValue * (ncm.icms / 100)
        };

        taxes.total = taxes.import_tax + taxes.ipi + taxes.pis_cofins + taxes.icms;
        taxes.effective_rate = (taxes.total / fobValue) * 100;

        return {
            ncm: ncm,
            base_value: fobValue,
            taxes: taxes
        };
    }
}

module.exports = NCMDatabase;