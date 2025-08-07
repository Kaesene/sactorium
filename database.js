const fs = require('fs');
const path = require('path');
const os = require('os');

class JSONDatabase {
    constructor() {
        // Usar pasta do usuário em vez da pasta da aplicação
        const userDataPath = path.join(os.homedir(), '.sactorium');
        
        // Criar pasta se não existir
        if (!fs.existsSync(userDataPath)) {
            fs.mkdirSync(userDataPath, { recursive: true });
        }
        
        this.dbPath = path.join(userDataPath, 'sactorium-data.json');
        this.data = this.loadData();
    }

    loadData() {
        try {
            if (fs.existsSync(this.dbPath)) {
                const data = fs.readFileSync(this.dbPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.log('Erro ao carregar dados, criando novo banco:', error.message);
        }
        
        // Estrutura inicial
        return {
            produtos: [],
            vendas: [],
            nextProductId: 1,
            nextSaleId: 1
        };
    }

    saveData() {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            return false;
        }
    }

    // Produtos
    async getProducts() {
        return Promise.resolve([...this.data.produtos]);
    }

    async addProduct(product) {
        const newProduct = {
            id: this.data.nextProductId++,
            ...product,
            data_cadastro: new Date().toISOString(),
            data_modificacao: new Date().toISOString()
        };
        
        this.data.produtos.push(newProduct);
        this.saveData();
        return Promise.resolve(newProduct.id);
    }

    async updateProduct(id, product) {
        const index = this.data.produtos.findIndex(p => p.id === id);
        if (index === -1) {
            return Promise.reject(new Error('Produto não encontrado'));
        }

        this.data.produtos[index] = {
            ...this.data.produtos[index],
            ...product,
            id: id, // Manter ID original
            data_modificacao: new Date().toISOString()
        };
        
        this.saveData();
        return Promise.resolve();
    }

    async deleteProduct(id) {
        const index = this.data.produtos.findIndex(p => p.id === id);
        if (index === -1) {
            return Promise.reject(new Error('Produto não encontrado'));
        }

        this.data.produtos.splice(index, 1);
        this.saveData();
        return Promise.resolve();
    }

    // Vendas
    async addSale(sale) {
        const newSale = {
            id: this.data.nextSaleId++,
            ...sale,
            data_venda: new Date().toISOString()
        };
        
        this.data.vendas.push(newSale);
        
        // Atualizar estoque do produto
        const productIndex = this.data.produtos.findIndex(p => p.id === sale.produto_id);
        if (productIndex !== -1) {
            this.data.produtos[productIndex].estoque -= sale.quantidade;
        }
        
        this.saveData();
        return Promise.resolve(newSale.id);
    }

    async getSales() {
        // Adicionar nome do produto às vendas
        const salesWithProductNames = this.data.vendas.map(sale => {
            const product = this.data.produtos.find(p => p.id === sale.produto_id);
            return {
                ...sale,
                produto_nome: product ? product.nome : 'Produto removido'
            };
        });
        
        return Promise.resolve(salesWithProductNames.reverse()); // Mais recentes primeiro
    }
}

module.exports = JSONDatabase;