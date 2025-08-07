const { ipcRenderer } = require('electron');

// State
let products = [];
let selectedProduct = null;
let currentMargin = 30;

// DOM Elements
const productsTable = document.getElementById('products-table');
const productsTbody = document.getElementById('products-tbody');
const productInfo = document.getElementById('product-info');
const marginRadios = document.querySelectorAll('input[name="margin"]');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadProducts();
    setupTabNavigation();
});

// Event Listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });

    // Margin selector
    marginRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentMargin = parseInt(e.target.value);
            renderProducts();
        });
    });

    // Product form
    document.getElementById('product-form').addEventListener('submit', handleProductSubmit);

    // ML Calculator inputs
    document.getElementById('ml-product-select').addEventListener('change', onMLProductSelect);
    document.getElementById('ml-price').addEventListener('input', calculateML);
    document.getElementById('ml-shipping').addEventListener('input', calculateML);
    document.getElementById('ml-tax').addEventListener('change', calculateML);
}

// Tab Navigation
function setupTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update active tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${target}-tab`) {
                    content.classList.add('active');
                }
            });
            
            // Load ML products when calculator tab is opened
            if (target === 'calculator') {
                loadMLProducts();
            }
        });
    });
}

function switchTab(tabName) {
    // This is handled by setupTabNavigation
}

// Products Management
async function loadProducts() {
    try {
        products = await ipcRenderer.invoke('get-products');
        renderProducts();
        loadMLProducts(); // Also update ML dropdown
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        alert('Erro ao carregar produtos: ' + error.message);
    }
}

function renderProducts() {
    productsTbody.innerHTML = '';
    
    products.forEach(product => {
        const row = document.createElement('tr');
        row.dataset.productId = product.id;
        
        // Calculate price with current margin
        const priceWithMargin = product.preco_custo * (1 + currentMargin / 100);
        
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.nome}</td>
            <td>R$ ${product.preco_custo.toFixed(2)}</td>
            <td>R$ ${priceWithMargin.toFixed(2)}</td>
            <td>${product.estoque}</td>
            <td>${product.categoria || ''}</td>
            <td>
                <button class="action-btn btn-primary" onclick="editProduct(${product.id})">✏️ Editar</button>
                <button class="action-btn btn-danger" onclick="deleteProduct(${product.id})">🗑️ Excluir</button>
            </td>
        `;
        
        row.addEventListener('click', () => selectProduct(product));
        productsTbody.appendChild(row);
    });
}

function selectProduct(product) {
    selectedProduct = product;
    
    // Update visual selection
    document.querySelectorAll('#products-tbody tr').forEach(row => {
        row.classList.remove('selected');
    });
    
    const selectedRow = document.querySelector(`tr[data-product-id="${product.id}"]`);
    if (selectedRow) {
        selectedRow.classList.add('selected');
    }
    
    // Update info panel
    const info = `ID: ${product.id}
Nome: ${product.nome}
Preço de Custo: R$ ${product.preco_custo.toFixed(2)}
Preço Final: R$ ${(product.preco_custo * (1 + currentMargin / 100)).toFixed(2)}
Estoque: ${product.estoque} unidades
Categoria: ${product.categoria || 'Não definida'}
NCM: ${product.ncm || 'Não informado'}
Fabricante: ${product.fabricante || 'Não informado'}
Descrição: ${product.descricao || 'Não informada'}
Cadastrado em: ${new Date(product.data_cadastro).toLocaleString()}`;
    
    productInfo.textContent = info;
}

// Product CRUD Operations
function showAddProduct() {
    document.getElementById('modal-title').textContent = 'Cadastrar Produto';
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    showModal('product-modal');
}

async function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    document.getElementById('modal-title').textContent = 'Editar Produto';
    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.nome;
    document.getElementById('product-cost').value = product.preco_custo;
    document.getElementById('product-stock').value = product.estoque;
    document.getElementById('product-category').value = product.categoria || '';
    document.getElementById('product-ncm').value = product.ncm || '';
    document.getElementById('product-manufacturer').value = product.fabricante || '';
    document.getElementById('product-description').value = product.descricao || '';
    
    showModal('product-modal');
}

async function deleteProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (!confirm(`Deseja excluir o produto '${product.nome}'?`)) return;
    
    try {
        await ipcRenderer.invoke('delete-product', productId);
        alert('Produto excluído com sucesso!');
        loadProducts();
        
        if (selectedProduct && selectedProduct.id === productId) {
            selectedProduct = null;
            productInfo.innerHTML = '<p>Selecione um produto para ver detalhes</p>';
        }
    } catch (error) {
        alert('Erro ao excluir produto: ' + error.message);
    }
}

async function handleProductSubmit(e) {
    e.preventDefault();
    
    const formData = {
        nome: document.getElementById('product-name').value,
        preco_custo: parseFloat(document.getElementById('product-cost').value),
        estoque: parseInt(document.getElementById('product-stock').value),
        categoria: document.getElementById('product-category').value,
        ncm: document.getElementById('product-ncm').value,
        fabricante: document.getElementById('product-manufacturer').value,
        descricao: document.getElementById('product-description').value
    };
    
    const productId = document.getElementById('product-id').value;
    
    try {
        if (productId) {
            // Update existing product
            await ipcRenderer.invoke('update-product', parseInt(productId), formData);
            alert('Produto atualizado com sucesso!');
        } else {
            // Create new product
            await ipcRenderer.invoke('add-product', formData);
            alert('Produto cadastrado com sucesso!');
        }
        
        closeModal('product-modal');
        loadProducts();
    } catch (error) {
        alert('Erro ao salvar produto: ' + error.message);
    }
}

// Sales Management
async function registerSale() {
    if (!selectedProduct) {
        alert('Selecione um produto para vender.');
        return;
    }
    
    const priceWithMargin = selectedProduct.preco_custo * (1 + currentMargin / 100);
    
    const quantity = prompt(
        `Produto: ${selectedProduct.nome}\nEstoque: ${selectedProduct.estoque}\nPreço: R$ ${priceWithMargin.toFixed(2)}\n\nQuantidade a vender:`,
        '1'
    );
    
    if (!quantity || isNaN(quantity) || parseInt(quantity) <= 0) return;
    
    const qty = parseInt(quantity);
    if (qty > selectedProduct.estoque) {
        alert('Quantidade maior que o estoque disponível.');
        return;
    }
    
    const client = prompt('Nome do cliente (opcional):') || '';
    
    try {
        const saleData = {
            produto_id: selectedProduct.id,
            quantidade: qty,
            preco_unitario: priceWithMargin,
            total: qty * priceWithMargin,
            cliente: client
        };
        
        await ipcRenderer.invoke('register-sale', saleData);
        alert(`Venda registrada!\nQuantidade: ${qty}\nTotal: R$ ${saleData.total.toFixed(2)}`);
        loadProducts(); // Refresh to update stock
    } catch (error) {
        alert('Erro ao registrar venda: ' + error.message);
    }
}

async function showSales() {
    try {
        const sales = await ipcRenderer.invoke('get-sales');
        const salesTbody = document.getElementById('sales-tbody');
        
        salesTbody.innerHTML = '';
        
        sales.forEach(sale => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${sale.id}</td>
                <td>${sale.produto_nome}</td>
                <td>${sale.quantidade}</td>
                <td>R$ ${sale.preco_unitario.toFixed(2)}</td>
                <td>R$ ${sale.total.toFixed(2)}</td>
                <td>${sale.cliente || 'Não informado'}</td>
                <td>${new Date(sale.data_venda).toLocaleString()}</td>
            `;
            salesTbody.appendChild(row);
        });
        
        showModal('sales-modal');
    } catch (error) {
        alert('Erro ao carregar vendas: ' + error.message);
    }
}

// ML Calculator
function loadMLProducts() {
    const select = document.getElementById('ml-product-select');
    select.innerHTML = '<option value="">Selecione um produto...</option>';
    
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = `${product.nome} (ID: ${product.id})`;
        select.appendChild(option);
    });
}

function onMLProductSelect() {
    const select = document.getElementById('ml-product-select');
    const productId = parseInt(select.value);
    
    if (!productId) {
        document.getElementById('ml-cost').value = '';
        return;
    }
    
    const product = products.find(p => p.id === productId);
    if (product) {
        document.getElementById('ml-cost').value = product.preco_custo.toFixed(2);
        calculateML();
    }
}

function calculateML() {
    const cost = parseFloat(document.getElementById('ml-cost').value) || 0;
    const price = parseFloat(document.getElementById('ml-price').value) || 0;
    const shipping = parseFloat(document.getElementById('ml-shipping').value) || 0;
    const taxPercent = parseFloat(document.getElementById('ml-tax').value) || 4;
    
    const result17 = document.getElementById('result-17');
    const result12 = document.getElementById('result-12');
    
    if (cost <= 0) {
        result17.textContent = 'Selecione um produto para calcular';
        result12.textContent = 'Selecione um produto para calcular';
        return;
    }
    
    if (price <= 0) {
        result17.textContent = 'Digite o valor final de venda para calcular';
        result12.textContent = 'Digite o valor final de venda para calcular';
        return;
    }
    
    // Calculate taxes and profits
    const taxValue = price * (taxPercent / 100);
    
    // 17% fee
    const fee17 = price * 0.17;
    const grossProfit17 = price - cost - shipping - taxValue;
    const netProfit17 = grossProfit17 - fee17;
    const margin17 = cost > 0 ? (netProfit17 / cost) * 100 : 0;
    
    // 12% fee
    const fee12 = price * 0.12;
    const grossProfit12 = price - cost - shipping - taxValue;
    const netProfit12 = grossProfit12 - fee12;
    const margin12 = cost > 0 ? (netProfit12 / cost) * 100 : 0;
    
    // Update results
    const productName = document.getElementById('ml-product-select').selectedOptions[0]?.textContent.split(' (ID:')[0] || 'Produto';
    
    result17.innerHTML = `
        📦 ${productName}<br><br>
        Sobra: R$ ${netProfit17.toFixed(2)}<br>
        Margem: ${margin17.toFixed(2)}%<br><br>
        ${margin17 >= margin12 ? '🏆 MELHOR OPÇÃO!' : ''}
    `;
    
    result12.innerHTML = `
        📦 ${productName}<br><br>
        Sobra: R$ ${netProfit12.toFixed(2)}<br>
        Margem: ${margin12.toFixed(2)}%<br><br>
        ${margin12 > margin17 ? '🏆 MELHOR OPÇÃO!' : ''}
    `;
}

// Import Products
async function importProducts() {
    try {
        const result = await ipcRenderer.invoke('import-csv');
        
        if (!result.success) {
            alert('Erro na importação: ' + result.message);
            return;
        }
        
        let message = `✅ Importação concluída!\n\n`;
        message += `📦 Produtos importados: ${result.imported}\n\n`;
        
        if (result.errors && result.errors.length > 0) {
            message += `⚠️ Erros encontrados:\n`;
            message += result.errors.slice(0, 5).join('\n');
            if (result.errors.length > 5) {
                message += `\n... e mais ${result.errors.length - 5} erros`;
            }
        } else {
            message += `🎉 Todos os produtos foram importados com sucesso!`;
        }
        
        alert(message);
        
        // Atualizar lista de produtos
        loadProducts();
        
    } catch (error) {
        alert('Erro na importação: ' + error.message);
    }
}

function showImportInstructions() {
    alert(`📋 FORMATO ESPERADO DO ARQUIVO:

Colunas obrigatórias:
• nome - Nome do produto
• preco_custo - Preço de custo (ex: 15.50)
• estoque - Quantidade em estoque (ex: 10)

Colunas opcionais:
• descricao - Descrição do produto
• categoria - Categoria
• ncm - Código NCM
• fabricante - Nome do fabricante

EXEMPLO DE LINHA:
Produto A | 15.50 | 10 | Descrição | Categoria | 123456 | Marca A

💡 Os preços finais serão calculados automaticamente com margens de 30% e 40%

💡 Dica: Use Excel ou LibreOffice para criar/editar`);
}

// Utility Functions
function refreshProducts() {
    loadProducts();
}

function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Close modals when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
};