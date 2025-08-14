const { ipcRenderer } = require('electron');

// State
let products = [];
let selectedProduct = null;
let currentMargin = 30;

// DOM Elements - Initialize after DOM is loaded
let productsTable, productsTbody, productInfo, marginRadios;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    // Initialize DOM elements
    productsTable = document.getElementById('products-table');
    productsTbody = document.getElementById('products-tbody');
    productInfo = document.getElementById('product-info');
    marginRadios = document.querySelectorAll('input[name="margin"]');
    
    console.log('DOM elements found:', {
        productsTable: !!productsTable,
        productsTbody: !!productsTbody,
        productInfo: !!productInfo,
        marginRadios: marginRadios.length
    });
    
    setupEventListeners();
    loadProducts();
    setupTabNavigation();
});

// Event Listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Margin selector
    if (marginRadios && marginRadios.length > 0) {
        marginRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                currentMargin = parseInt(e.target.value);
                renderProducts();
            });
        });
    }

    // Product row selection
    if (productsTbody) {
        productsTbody.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (row && row.dataset.productId) {
                selectProduct(parseInt(row.dataset.productId));
            }
        });
    }

    // Product form
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
    }

    // ML Calculator inputs
    const mlProductSelect = document.getElementById('ml-product-select');
    const mlPrice = document.getElementById('ml-price');
    const mlShipping = document.getElementById('ml-shipping');
    const mlTax = document.getElementById('ml-tax');
    
    if (mlProductSelect) mlProductSelect.addEventListener('change', updateMLCost);
    if (mlPrice) mlPrice.addEventListener('input', calculateML);
    if (mlShipping) mlShipping.addEventListener('input', calculateML);
    if (mlTax) mlTax.addEventListener('change', calculateML);
}

// Tab Navigation
function setupTabNavigation() {
    console.log('Setting up tab navigation...');
    
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    console.log('Found tab buttons:', tabBtns.length);
    console.log('Found tab contents:', tabContents.length);
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            console.log('Tab clicked:', btn.dataset.tab);
            const target = btn.dataset.tab;
            
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update active tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${target}-tab`) {
                    content.classList.add('active');
                    console.log('Activated tab:', content.id);
                }
            });
            
            // Initialize tab-specific functionality
            try {
                if (target === 'calculator') {
                    console.log('Loading ML products...');
                    loadMLProducts();
                } else if (target === 'imports') {
                    console.log('Initializing NCM system...');
                    setTimeout(() => {
                        try {
                            initNCMSystem();
                        } catch (error) {
                            console.error('Error initializing NCM system:', error);
                        }
                    }, 100);
                }
            } catch (error) {
                console.error('Error in tab functionality:', error);
            }
        });
    });
}

function switchTab(tabName) {
    // This is handled by setupTabNavigation
}

// Products Management
async function loadProducts() {
    console.log('Loading products...');
    try {
        products = await ipcRenderer.invoke('get-products');
        console.log('Products loaded:', products.length);
        renderProducts();
        loadMLProducts(); // Also update ML dropdown
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        alert('Erro ao carregar produtos: ' + error.message);
    }
}

function renderProducts() {
    console.log('Rendering products...');
    console.log('Products to render:', products.length);
    
    if (!productsTbody) {
        console.error('productsTbody element not found!');
        return;
    }
    
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

// ==========================================
// IMPORTAÇÕES - FUNÇÕES CIF
// ==========================================

// Constantes para cálculo CIF - Paraguai
const CIF_CONSTANTS = {
    INSURANCE_RATE: 0.01, // 1% do valor de compra
    FREIGHT_RATE_PER_KG: 5.00 // USD 5 por kg
};

// Calcular CIF automaticamente
function calculateCIF() {
    const costUSD = parseFloat(document.getElementById('import-cost-usd').value) || 0;
    const totalWeight = parseFloat(document.getElementById('import-total-weight').value) || 0;
    const quantity = parseInt(document.getElementById('import-quantity').value) || 1;
    
    if (costUSD <= 0 || totalWeight <= 0) {
        document.getElementById('cif-breakdown').style.display = 'none';
        return null;
    }
    
    // Cálculos CIF
    const cost = costUSD;
    const insurance = costUSD * CIF_CONSTANTS.INSURANCE_RATE; // 1% do custo
    const freight = totalWeight * CIF_CONSTANTS.FREIGHT_RATE_PER_KG; // USD 5/kg
    const totalCIF = cost + insurance + freight;
    const cifPerUnit = totalCIF / quantity;
    
    // Atualizar interface
    document.getElementById('cif-cost').textContent = formatUSD(cost);
    document.getElementById('cif-insurance').textContent = formatUSD(insurance);
    document.getElementById('cif-freight').textContent = formatUSD(freight);
    document.getElementById('cif-total').textContent = formatUSD(totalCIF);
    document.getElementById('cif-unit').textContent = formatUSD(cifPerUnit);
    
    // Mostrar breakdown
    document.getElementById('cif-breakdown').style.display = 'block';
    
    return {
        cost: cost,
        insurance: insurance,
        freight: freight,
        totalCIF: totalCIF,
        cifPerUnit: cifPerUnit,
        quantity: quantity,
        totalWeight: totalWeight
    };
}

// Formatar valor em USD
function formatUSD(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value);
}

// ==========================================
// IMPORTAÇÕES - FUNÇÕES
// ==========================================

function calculateImport() {
    // Primeiro calcular CIF
    const cifData = calculateCIF();
    if (!cifData) {
        alert('Por favor, preencha o valor de compra e peso total para calcular o CIF');
        return;
    }
    
    // Obter valores dos inputs
    const productName = document.getElementById('import-product-name').value;
    const quantity = cifData.quantity;
    const totalWeight = cifData.totalWeight;
    
    // Usar valores do CIF
    const totalCifUSD = cifData.totalCIF;
    const usdRate = parseFloat(document.getElementById('import-usd-rate').value) || 5.50;
    
    const customsBroker = parseFloat(document.getElementById('import-customs-broker').value) || 500;
    const otherCosts = parseFloat(document.getElementById('import-other-costs').value) || 0;
    
    const margin = parseFloat(document.getElementById('import-margin').value) || 40;
    const mlCommission = parseFloat(document.getElementById('import-ml-commission').value) || 12;
    
    // Validações básicas
    if (!productName || totalCifUSD <= 0) {
        alert('Por favor, preencha o nome do produto e calcule o CIF primeiro');
        return;
    }
    
    // Verificar se há NCM selecionado
    if (!selectedNCM) {
        alert('Por favor, selecione um NCM para calcular os impostos corretos');
        return;
    }
    
    // Cálculos baseados no CIF
    const totalCifBrl = totalCifUSD * usdRate;
    const cifInsuranceBrl = cifData.insurance * usdRate;
    const cifFreightBrl = cifData.freight * usdRate;
    
    // Base de cálculo dos impostos = CIF em reais
    let taxBase = totalCifBrl;
    let totalTaxes = 0;
    const taxDetails = [];
    
    // Calcular impostos baseados no NCM selecionado
    if (selectedNCM.taxes) {
        for (let i = 1; i <= 5; i++) {
            const tax = selectedNCM.taxes[`tax${i}`];
            if (tax && tax.name && tax.rate > 0) {
                let taxValue = 0;
                if (tax.type === 'percent') {
                    taxValue = taxBase * (tax.rate / 100);
                } else if (tax.type === 'fixed') {
                    taxValue = tax.rate * quantity; // Valor fixo por unidade
                }
                
                totalTaxes += taxValue;
                taxDetails.push({
                    name: tax.name,
                    rate: tax.rate,
                    type: tax.type,
                    value: taxValue,
                    base: taxBase
                });
                
                // Para impostos em cascata (cada imposto pode aumentar a base do próximo)
                // Comentado por enquanto - pode ser ativado se necessário
                // taxBase += taxValue;
            }
        }
    } else {
        // Fallback para estrutura antiga (compatibilidade)
        const importTaxValue = taxBase * ((selectedNCM.import_tax || 0) / 100);
        const ipiValue = taxBase * ((selectedNCM.ipi || 0) / 100);
        const icmsValue = taxBase * ((selectedNCM.icms || 0) / 100);
        totalTaxes = importTaxValue + ipiValue + icmsValue;
    }
    
    // Despesas extras
    const extraCosts = customsBroker + otherCosts;
    
    // Custo total
    const totalCost = totalCifBrl + totalTaxes + extraCosts;
    const unitCost = totalCost / quantity;
    
    // Preços de venda
    const directPrice = unitCost * (1 + margin / 100);
    const directProfit = directPrice - unitCost;
    
    // Preço para ML (considerando a comissão)
    const mlPrice = unitCost / (1 - (margin / 100) - (mlCommission / 100));
    const mlNet = mlPrice * (1 - mlCommission / 100);
    const mlProfit = mlNet - unitCost;
    const mlRealMargin = ((mlProfit / unitCost) * 100);
    
    // Exibir resultados - usando CIF
    document.getElementById('result-fob-brl').textContent = formatCurrency(totalCifBrl);
    document.getElementById('result-freight-insurance').textContent = formatCurrency(cifInsuranceBrl + cifFreightBrl);
    document.getElementById('result-taxes').textContent = formatCurrency(totalTaxes);
    document.getElementById('result-extra-costs').textContent = formatCurrency(extraCosts);
    document.getElementById('result-total-cost').textContent = formatCurrency(totalCost);
    document.getElementById('result-unit-cost').textContent = formatCurrency(unitCost);
    
    // Exibir código NCM no resultado
    document.getElementById('selected-ncm-code-result').textContent = selectedNCM.code;
    
    // Exibir detalhamento dos impostos
    if (taxDetails.length > 0) {
        const detailList = document.getElementById('tax-detail-list');
        detailList.innerHTML = taxDetails.map(tax => `
            <div class="tax-detail-item">
                <span>${tax.name}:</span>
                <span>${tax.rate}${tax.type === 'percent' ? '%' : ' R$'} = ${formatCurrency(tax.value)}</span>
            </div>
        `).join('');
        document.getElementById('tax-breakdown-detail').style.display = 'block';
    } else {
        document.getElementById('tax-breakdown-detail').style.display = 'none';
    }
    
    document.getElementById('result-direct-price').textContent = formatCurrency(directPrice);
    document.getElementById('result-direct-profit').textContent = formatCurrency(directProfit);
    
    document.getElementById('result-ml-price').textContent = formatCurrency(mlPrice);
    document.getElementById('result-ml-net').textContent = formatCurrency(mlNet);
    document.getElementById('result-ml-profit').textContent = formatCurrency(mlProfit);
    document.getElementById('result-ml-margin').textContent = mlRealMargin.toFixed(1) + '%';
    
    // Mostrar container de resultados
    document.getElementById('import-results').style.display = 'block';
    
    // Scroll para os resultados
    document.getElementById('import-results').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

function clearImportForm() {
    // Limpar campos do produto
    document.getElementById('import-product-name').value = '';
    document.getElementById('import-cost-usd').value = '';
    document.getElementById('import-total-weight').value = '';
    document.getElementById('import-quantity').value = '1';
    
    // Limpar NCM selecionado
    clearSelectedNCM();
    
    // Manter valores padrão dos impostos e taxas
    document.getElementById('import-usd-rate').value = '5.50';
    document.getElementById('import-tax').value = '16';
    document.getElementById('import-ipi').value = '0';
    document.getElementById('import-pis-cofins').value = '9.25';
    document.getElementById('import-icms').value = '18';
    document.getElementById('import-customs-broker').value = '300';
    document.getElementById('import-other-costs').value = '';
    document.getElementById('import-margin').value = '40';
    document.getElementById('import-ml-commission').value = '12';
    
    // Ocultar resultados
    document.getElementById('import-results').style.display = 'none';
    document.getElementById('cif-breakdown').style.display = 'none';
}

async function saveImportProduct() {
    const productName = document.getElementById('import-product-name').value;
    const unitCostText = document.getElementById('result-unit-cost').textContent;
    
    if (!productName || unitCostText === 'R$ 0,00') {
        alert('Por favor, calcule a importação primeiro');
        return;
    }
    
    // Extrair valor numérico do custo unitário
    const unitCost = parseFloat(unitCostText.replace('R$ ', '').replace('.', '').replace(',', '.'));
    const quantity = parseInt(document.getElementById('import-quantity').value) || 1;
    
    try {
        const product = {
            nome: productName,
            preco_custo: unitCost,
            estoque: quantity,
            categoria: 'Importado',
            descricao: 'Produto calculado via importação',
            fabricante: 'Importado',
            ncm: ''
        };
        
        await ipcRenderer.invoke('add-product', product);
        
        alert('✅ Produto salvo com sucesso!\nO produto foi adicionado à lista de produtos.');
        
        // Limpar formulário
        clearImportForm();
        
        // Atualizar lista de produtos
        loadProducts();
        
        // Voltar para aba de produtos
        switchTab('products');
        
    } catch (error) {
        alert('Erro ao salvar produto: ' + error.message);
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// ==========================================
// NCM - FUNÇÕES
// ==========================================

let selectedNCM = null;
let allNCMs = [];
let filteredNCMs = [];

// Dynamic tax fields
let taxFieldCount = 0;
const MAX_TAX_FIELDS = 5;

// Inicializar sistema NCM ao abrir aba importações
function initNCMSystem() {
    loadAllNCMs();
    setupNCMSearch();
    loadParaguayDefaults();
}

// Carregar todos os NCMs
async function loadAllNCMs() {
    try {
        allNCMs = await ipcRenderer.invoke('get-all-ncms');
        updateNCMTable();
        updateCategoryFilter();
    } catch (error) {
        console.error('Erro ao carregar NCMs:', error);
    }
}

// Configurar busca de NCM
function setupNCMSearch() {
    const searchInput = document.getElementById('ncm-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(searchNCM, 300));
    }
}

// Buscar NCM
async function searchNCM() {
    const query = document.getElementById('ncm-search').value;
    const resultsContainer = document.getElementById('ncm-results');
    const resultsList = document.getElementById('ncm-list');
    
    if (query.length < 2) {
        resultsContainer.style.display = 'none';
        return;
    }
    
    try {
        const results = await ipcRenderer.invoke('search-ncm', query);
        
        if (results.length === 0) {
            resultsList.innerHTML = '<div class="no-results">Nenhum NCM encontrado</div>';
        } else {
            resultsList.innerHTML = results.map(ncm => `
                <div class="ncm-item" onclick="selectNCM('${ncm.code}')">
                    <div class="ncm-code">${ncm.code}</div>
                    <div class="ncm-description">${ncm.description}</div>
                    <div class="ncm-category">${ncm.category}</div>
                    <div class="ncm-taxes">II:${ncm.import_tax}% | IPI:${ncm.ipi}% | ICMS:${ncm.icms}%</div>
                </div>
            `).join('');
        }
        
        resultsContainer.style.display = 'block';
    } catch (error) {
        console.error('Erro na busca NCM:', error);
        resultsList.innerHTML = '<div class="error">Erro na busca</div>';
    }
}

// Selecionar NCM
async function selectNCM(code) {
    try {
        const ncm = await ipcRenderer.invoke('get-ncm-by-code', code);
        if (!ncm) return;
        
        selectedNCM = ncm;
        
        // Atualizar interface
        document.getElementById('selected-ncm-code').textContent = ncm.code;
        document.getElementById('selected-ncm-desc').textContent = ncm.description;
        document.getElementById('selected-ncm-category').textContent = ncm.category;
        document.getElementById('selected-ncm-ii').textContent = ncm.import_tax;
        document.getElementById('selected-ncm-ipi').textContent = ncm.ipi;
        document.getElementById('selected-ncm-pis').textContent = ncm.pis_cofins;
        document.getElementById('selected-ncm-icms').textContent = ncm.icms;
        
        // Atualizar campos de imposto na calculadora
        document.getElementById('import-tax').value = ncm.import_tax;
        document.getElementById('import-ipi').value = ncm.ipi;
        document.getElementById('import-pis-cofins').value = ncm.pis_cofins;
        document.getElementById('import-icms').value = ncm.icms;
        
        // Mostrar NCM selecionado
        document.getElementById('selected-ncm').style.display = 'block';
        document.getElementById('ncm-results').style.display = 'none';
        document.getElementById('ncm-search').value = `${ncm.code} - ${ncm.description}`;
        
    } catch (error) {
        console.error('Erro ao selecionar NCM:', error);
    }
}

// Limpar NCM selecionado
function clearSelectedNCM() {
    selectedNCM = null;
    document.getElementById('selected-ncm').style.display = 'none';
    document.getElementById('ncm-search').value = '';
    
    // Restaurar valores padrão
    document.getElementById('import-tax').value = '16';
    document.getElementById('import-ipi').value = '0';
    document.getElementById('import-pis-cofins').value = '9.25';
    document.getElementById('import-icms').value = '18';
}

// Carregar valores padrão do Paraguai
async function loadParaguayDefaults() {
    try {
        const defaults = await ipcRenderer.invoke('get-paraguay-defaults');
        
        // Atualizar campos com valores padrão do Paraguai
        if (defaults.default_freight_rate) {
            document.getElementById('import-freight').placeholder = `Padrão: ${defaults.default_freight_rate}% FOB`;
        }
        if (defaults.default_insurance_rate) {
            document.getElementById('import-insurance').value = defaults.default_insurance_rate;
        }
        if (defaults.default_broker_fee) {
            document.getElementById('import-customs-broker').value = defaults.default_broker_fee;
        }
        if (defaults.default_other_costs) {
            document.getElementById('import-other-costs').placeholder = `Padrão: R$ ${defaults.default_other_costs}`;
        }
        if (defaults.usd_rate) {
            document.getElementById('import-usd-rate').value = defaults.usd_rate;
        }
        
    } catch (error) {
        console.error('Erro ao carregar padrões Paraguai:', error);
    }
}

// ==========================================
// NCM MANAGER - FUNÇÕES DINÂMICAS
// ==========================================

let taxFieldCount = 0;
const MAX_TAX_FIELDS = 5;

// Inicializar campos de imposto
function initializeTaxFields() {
    const container = document.getElementById('tax-fields-container');
    if (!container) return;
    
    container.innerHTML = '';
    taxFieldCount = 0;
    
    // Adicionar primeiro campo automaticamente
    addTaxField();
}

// Adicionar campo de imposto
function addTaxField() {
    if (taxFieldCount >= MAX_TAX_FIELDS) {
        alert(`Máximo de ${MAX_TAX_FIELDS} impostos permitidos por NCM`);
        return;
    }
    
    taxFieldCount++;
    const container = document.getElementById('tax-fields-container');
    
    const taxFieldHTML = `
        <div class="tax-config-row" data-tax-index="${taxFieldCount}">
            <div class="tax-row-header">
                <span class="tax-number">Imposto ${taxFieldCount}</span>
                ${taxFieldCount > 1 ? `<button type="button" class="btn btn-sm btn-danger" onclick="removeTaxField(${taxFieldCount})">🗑️ Remover</button>` : ''}
            </div>
            <div class="tax-row-fields">
                <div class="form-group">
                    <label>Nome do Imposto:</label>
                    <input type="text" id="tax-${taxFieldCount}-name" placeholder="Ex: Imposto Importação" ${taxFieldCount === 1 ? 'value="Imposto Importação"' : ''}>
                </div>
                <div class="form-group">
                    <label>Taxa:</label>
                    <input type="number" id="tax-${taxFieldCount}-rate" step="0.01" value="${taxFieldCount === 1 ? '16' : '0'}" min="0" max="1000">
                </div>
                <div class="form-group">
                    <label>Tipo:</label>
                    <select id="tax-${taxFieldCount}-type">
                        <option value="percent">Percentual (%)</option>
                        <option value="fixed">Valor Fixo (R$)</option>
                    </select>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', taxFieldHTML);
    
    // Atualizar estado do botão
    updateAddTaxButton();
}

// Remover campo de imposto
function removeTaxField(taxIndex) {
    const fieldToRemove = document.querySelector(`[data-tax-index="${taxIndex}"]`);
    if (fieldToRemove) {
        fieldToRemove.remove();
        taxFieldCount--;
        
        // Renumerar campos restantes
        renumberTaxFields();
        updateAddTaxButton();
    }
}

// Renumerar campos após remoção
function renumberTaxFields() {
    const taxRows = document.querySelectorAll('.tax-config-row');
    taxFieldCount = 0;
    
    taxRows.forEach((row, index) => {
        taxFieldCount++;
        const newIndex = taxFieldCount;
        
        // Atualizar atributo data
        row.setAttribute('data-tax-index', newIndex);
        
        // Atualizar número do imposto
        const numberSpan = row.querySelector('.tax-number');
        if (numberSpan) {
            numberSpan.textContent = `Imposto ${newIndex}`;
        }
        
        // Atualizar IDs dos inputs
        const inputs = row.querySelectorAll('input, select');
        inputs.forEach(input => {
            const oldId = input.id;
            const newId = oldId.replace(/tax-\d+/, `tax-${newIndex}`);
            input.id = newId;
        });
        
        // Atualizar botão remover
        const removeBtn = row.querySelector('.btn-danger');
        if (removeBtn) {
            if (newIndex === 1) {
                // Primeiro campo não pode ser removido
                removeBtn.style.display = 'none';
            } else {
                removeBtn.style.display = 'inline-block';
                removeBtn.setAttribute('onclick', `removeTaxField(${newIndex})`);
            }
        }
    });
}

// Atualizar estado do botão adicionar
function updateAddTaxButton() {
    const addBtn = document.getElementById('add-tax-btn');
    if (addBtn) {
        if (taxFieldCount >= MAX_TAX_FIELDS) {
            addBtn.disabled = true;
            addBtn.textContent = `✅ Máximo (${MAX_TAX_FIELDS}) atingido`;
            addBtn.classList.remove('btn-success');
            addBtn.classList.add('btn-secondary');
        } else {
            addBtn.disabled = false;
            addBtn.textContent = '➕ Adicionar Imposto';
            addBtn.classList.remove('btn-secondary');
            addBtn.classList.add('btn-success');
        }
    }
}

// ==========================================
// NCM MANAGER - FUNÇÕES
// ==========================================

// Mostrar gerenciador de NCM
function showNCMManager() {
    loadAllNCMs();
    showModal('ncm-modal');
    // Inicializar campos dinâmicos
    setTimeout(() => initializeTaxFields(), 100);
}

// Atualizar tabela de NCMs
function updateNCMTable() {
    const tbody = document.getElementById('ncm-table-body');
    if (!tbody) return;
    
    const ncmsToShow = filteredNCMs.length > 0 ? filteredNCMs : allNCMs;
    
    tbody.innerHTML = ncmsToShow.map(ncm => {
        // Gerar lista de impostos configurados
        let taxList = '';
        if (ncm.taxes) {
            const activeTaxes = [];
            for (let i = 1; i <= 5; i++) {
                const tax = ncm.taxes[`tax${i}`];
                if (tax && tax.name && tax.rate > 0) {
                    activeTaxes.push(`${tax.name}: ${tax.rate}${tax.type === 'percent' ? '%' : ' R$'}`);
                }
            }
            taxList = activeTaxes.length > 0 ? activeTaxes.join(' | ') : 'Nenhum imposto configurado';
        } else {
            // Compatibilidade com estrutura antiga
            taxList = `II: ${ncm.import_tax || 0}% | IPI: ${ncm.ipi || 0}% | ICMS: ${ncm.icms || 0}%`;
        }
        
        return `
            <tr>
                <td>${ncm.code}</td>
                <td title="${ncm.description}">${ncm.description.substring(0, 30)}${ncm.description.length > 30 ? '...' : ''}</td>
                <td>${ncm.category}</td>
                <td title="${taxList}" class="tax-list">${taxList.substring(0, 50)}${taxList.length > 50 ? '...' : ''}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editNCM('${ncm.code}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteNCM('${ncm.code}')">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Atualizar filtro de categorias
function updateCategoryFilter() {
    const filter = document.getElementById('category-filter');
    if (!filter) return;
    
    const categories = [...new Set(allNCMs.map(ncm => ncm.category))].sort();
    filter.innerHTML = '<option value="">Todas as categorias</option>' +
        categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

// Filtrar lista de NCMs
function filterNCMList() {
    const textFilter = document.getElementById('ncm-filter').value.toLowerCase();
    const categoryFilter = document.getElementById('category-filter').value;
    
    filteredNCMs = allNCMs.filter(ncm => {
        const matchText = !textFilter || 
            ncm.code.toLowerCase().includes(textFilter) ||
            ncm.description.toLowerCase().includes(textFilter);
            
        const matchCategory = !categoryFilter || ncm.category === categoryFilter;
        
        return matchText && matchCategory;
    });
    
    updateNCMTable();
}

// Configurar formulário NCM
document.addEventListener('DOMContentLoaded', () => {
    const ncmForm = document.getElementById('ncm-form');
    if (ncmForm) {
        ncmForm.addEventListener('submit', handleNCMSubmit);
    }
});

// Manipular envio do formulário NCM
async function handleNCMSubmit(e) {
    e.preventDefault();
    
    const ncmData = {
        code: document.getElementById('new-ncm-code').value,
        description: document.getElementById('new-ncm-description').value,
        category: document.getElementById('new-ncm-category').value,
        notes: document.getElementById('new-ncm-notes').value
    };
    
    // Coletar dados dos campos dinâmicos de imposto
    for (let i = 1; i <= taxFieldCount; i++) {
        const nameField = document.getElementById(`tax-${i}-name`);
        const rateField = document.getElementById(`tax-${i}-rate`);
        const typeField = document.getElementById(`tax-${i}-type`);
        
        if (nameField && rateField && typeField) {
            ncmData[`tax${i}_name`] = nameField.value || '';
            ncmData[`tax${i}_rate`] = parseFloat(rateField.value) || 0;
            ncmData[`tax${i}_type`] = typeField.value || 'percent';
        }
    }
    
    // Preencher campos vazios para os impostos não utilizados
    for (let i = taxFieldCount + 1; i <= 5; i++) {
        ncmData[`tax${i}_name`] = '';
        ncmData[`tax${i}_rate`] = 0;
        ncmData[`tax${i}_type`] = 'percent';
    }
    
    try {
        await ipcRenderer.invoke('add-ncm', ncmData);
        alert('✅ NCM adicionado com sucesso!');
        clearNCMForm();
        loadAllNCMs();
    } catch (error) {
        alert('❌ Erro ao adicionar NCM: ' + error.message);
    }
}

// Limpar formulário NCM
function clearNCMForm() {
    document.getElementById('ncm-form').reset();
    
    // Reinicializar campos dinâmicos de imposto
    initializeTaxFields();
}

// Editar NCM
async function editNCM(code) {
    try {
        const ncm = await ipcRenderer.invoke('get-ncm-by-code', code);
        if (!ncm) return;
        
        // Preencher formulário com dados básicos do NCM
        document.getElementById('new-ncm-code').value = ncm.code;
        document.getElementById('new-ncm-description').value = ncm.description;
        document.getElementById('new-ncm-category').value = ncm.category;
        document.getElementById('new-ncm-notes').value = ncm.notes || '';
        
        // Limpar e recriar campos dinâmicos baseados nos dados do NCM
        const container = document.getElementById('tax-fields-container');
        container.innerHTML = '';
        taxFieldCount = 0;
        
        // Carregar impostos existentes
        if (ncm.taxes) {
            // Nova estrutura
            for (let i = 1; i <= 5; i++) {
                const tax = ncm.taxes[`tax${i}`];
                if (tax && (tax.name || tax.rate > 0)) {
                    addTaxField();
                    
                    // Preencher dados
                    const nameField = document.getElementById(`tax-${taxFieldCount}-name`);
                    const rateField = document.getElementById(`tax-${taxFieldCount}-rate`);
                    const typeField = document.getElementById(`tax-${taxFieldCount}-type`);
                    
                    if (nameField) nameField.value = tax.name || '';
                    if (rateField) rateField.value = tax.rate || 0;
                    if (typeField) typeField.value = tax.type || 'percent';
                }
            }
        } else {
            // Estrutura antiga - migrar
            if (ncm.import_tax && ncm.import_tax > 0) {
                addTaxField();
                document.getElementById('tax-1-name').value = 'Imposto Importação';
                document.getElementById('tax-1-rate').value = ncm.import_tax;
            }
            if (ncm.ipi && ncm.ipi > 0) {
                addTaxField();
                document.getElementById(`tax-${taxFieldCount}-name`).value = 'IPI';
                document.getElementById(`tax-${taxFieldCount}-rate`).value = ncm.ipi;
            }
            if (ncm.pis_cofins && ncm.pis_cofins > 0) {
                addTaxField();
                document.getElementById(`tax-${taxFieldCount}-name`).value = 'PIS/COFINS';
                document.getElementById(`tax-${taxFieldCount}-rate`).value = ncm.pis_cofins;
            }
            if (ncm.icms && ncm.icms > 0) {
                addTaxField();
                document.getElementById(`tax-${taxFieldCount}-name`).value = 'ICMS';
                document.getElementById(`tax-${taxFieldCount}-rate`).value = ncm.icms;
            }
        }
        
        // Se não tiver nenhum imposto, adicionar pelo menos um campo
        if (taxFieldCount === 0) {
            addTaxField();
        }
        
        // Desabilitar campo código (não pode ser editado)
        document.getElementById('new-ncm-code').readOnly = true;
        
        // Mudar texto do botão
        const submitBtn = document.querySelector('#ncm-form button[type="submit"]');
        submitBtn.textContent = '✏️ Atualizar NCM';
        submitBtn.onclick = (e) => {
            e.preventDefault();
            updateNCM(code);
        };
        
    } catch (error) {
        alert('Erro ao carregar dados do NCM: ' + error.message);
    }
}

// Atualizar NCM
async function updateNCM(code) {
    const updateData = {
        description: document.getElementById('new-ncm-description').value,
        category: document.getElementById('new-ncm-category').value,
        notes: document.getElementById('new-ncm-notes').value,
        taxes: {}
    };
    
    // Coletar dados dos campos dinâmicos de imposto
    for (let i = 1; i <= taxFieldCount; i++) {
        const nameField = document.getElementById(`tax-${i}-name`);
        const rateField = document.getElementById(`tax-${i}-rate`);
        const typeField = document.getElementById(`tax-${i}-type`);
        
        if (nameField && rateField && typeField) {
            updateData.taxes[`tax${i}`] = {
                name: nameField.value || '',
                rate: parseFloat(rateField.value) || 0,
                type: typeField.value || 'percent'
            };
        }
    }
    
    // Preencher campos vazios para os impostos não utilizados
    for (let i = taxFieldCount + 1; i <= 5; i++) {
        updateData.taxes[`tax${i}`] = {
            name: '',
            rate: 0,
            type: 'percent'
        };
    }
    
    try {
        await ipcRenderer.invoke('update-ncm', code, updateData);
        alert('✅ NCM atualizado com sucesso!');
        resetNCMForm();
        loadAllNCMs();
    } catch (error) {
        alert('❌ Erro ao atualizar NCM: ' + error.message);
    }
}

// Deletar NCM
async function deleteNCM(code) {
    if (!confirm(`Tem certeza que deseja deletar o NCM ${code}?`)) {
        return;
    }
    
    try {
        await ipcRenderer.invoke('delete-ncm', code);
        alert('✅ NCM deletado com sucesso!');
        loadAllNCMs();
    } catch (error) {
        alert('❌ Erro ao deletar NCM: ' + error.message);
    }
}

// Resetar formulário NCM
function resetNCMForm() {
    clearNCMForm();
    document.getElementById('new-ncm-code').readOnly = false;
    const submitBtn = document.querySelector('#ncm-form button[type="submit"]');
    submitBtn.textContent = '💾 Salvar NCM';
    submitBtn.onclick = null;
}

// Utility: Debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// NCM system is now initialized via setupTabNavigation in the imports tab