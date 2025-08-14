const { ipcRenderer } = require('electron');

// State
let products = [];
let selectedProduct = null;
let currentMargin = 30;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Sactorium App...');
    initializeApp();
});

async function initializeApp() {
    try {
        // Setup basic functionality first
        setupTabNavigation();
        setupBasicEvents();
        
        // Load initial data
        await loadProducts();
        
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        alert('Erro ao inicializar aplicação: ' + error.message);
    }
}

function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            
            // Update button states
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update content visibility
            tabContents.forEach(content => {
                if (content.id === `${targetTab}-tab`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
            
            // Initialize tab-specific features
            if (targetTab === 'calculator') {
                loadMLProducts();
            } else if (targetTab === 'imports') {
                setupNCMSearchForImports();
            }
        });
    });
}

function setupBasicEvents() {
    // Margin selector
    document.querySelectorAll('input[name="margin"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentMargin = parseInt(e.target.value);
            renderProducts();
        });
    });
}

async function loadProducts() {
    try {
        console.log('Loading products...');
        products = await ipcRenderer.invoke('get-products');
        console.log(`Loaded ${products.length} products`);
        renderProducts();
        loadMLProducts();
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function renderProducts() {
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    products.forEach(product => {
        const row = document.createElement('tr');
        const priceWithMargin = product.preco_custo * (1 + currentMargin / 100);
        
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.nome}</td>
            <td>R$ ${product.preco_custo.toFixed(2)}</td>
            <td>R$ ${priceWithMargin.toFixed(2)}</td>
            <td>${product.estoque}</td>
            <td>${product.categoria || ''}</td>
            <td>
                <button class="action-btn btn-primary" onclick="editProduct(${product.id})">✏️</button>
                <button class="action-btn btn-danger" onclick="deleteProduct(${product.id})">🗑️</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function loadMLProducts() {
    const select = document.getElementById('ml-product-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione um produto...</option>';
    
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = `${product.nome} - R$ ${product.preco_custo.toFixed(2)}`;
        select.appendChild(option);
    });
}

// Modal functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Product management functions
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
        await loadProducts();
    } catch (error) {
        alert('Erro ao excluir produto: ' + error.message);
    }
}

// ML Calculator
function loadMLProducts() {
    const select = document.getElementById('ml-product-select');
    if (!select) return;
    
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

function updateMLCost() {
    onMLProductSelect();
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

// Form handling
async function handleProductSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const productId = document.getElementById('product-id').value;
    
    const productData = {
        nome: formData.get('nome') || document.getElementById('product-name').value,
        preco_custo: parseFloat(formData.get('preco_custo') || document.getElementById('product-cost').value),
        estoque: parseInt(formData.get('estoque') || document.getElementById('product-stock').value),
        categoria: formData.get('categoria') || document.getElementById('product-category').value,
        ncm: formData.get('ncm') || document.getElementById('product-ncm').value,
        fabricante: formData.get('fabricante') || document.getElementById('product-manufacturer').value,
        descricao: formData.get('descricao') || document.getElementById('product-description').value
    };
    
    try {
        if (productId) {
            await ipcRenderer.invoke('update-product', parseInt(productId), productData);
            alert('Produto atualizado com sucesso!');
        } else {
            await ipcRenderer.invoke('add-product', productData);
            alert('Produto cadastrado com sucesso!');
        }
        
        closeModal('product-modal');
        await loadProducts();
    } catch (error) {
        alert('Erro ao salvar produto: ' + error.message);
    }
}

// Additional functions
function refreshProducts() {
    loadProducts();
}

async function importProducts() {
    try {
        const result = await ipcRenderer.invoke('import-csv');
        if (result.success) {
            alert(`✅ Importação concluída!\nProdutos importados: ${result.imported}\nErros: ${result.errors ? result.errors.length : 0}`);
            await loadProducts();
        } else {
            alert(`❌ Falha na importação: ${result.message}`);
        }
    } catch (error) {
        alert('Erro na importação: ' + error.message);
    }
}

function showImportInstructions() {
    alert('Para importar produtos, use um arquivo CSV com as colunas: nome, preco_custo, estoque');
}

function registerSale() {
    // Implementation for sales registration
}

function showSales() {
    showModal('sales-modal');
}

// Add event listeners for forms when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
    }
});

// ML Calculator event setup
document.addEventListener('DOMContentLoaded', () => {
    const mlSelect = document.getElementById('ml-product-select');
    if (mlSelect) {
        mlSelect.addEventListener('change', onMLProductSelect);
    }
});

// ==========================================
// IMPORTAÇÕES - FUNÇÕES
// ==========================================

// NCM Search System for Imports Tab
let ncmSearchTimeout;

function setupNCMSearchForImports() {
    const searchInput = document.getElementById('ncm-search');
    const resultsDiv = document.getElementById('ncm-results');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            clearTimeout(ncmSearchTimeout);
            
            if (query.length < 2) {
                resultsDiv.style.display = 'none';
                return;
            }
            
            ncmSearchTimeout = setTimeout(() => {
                searchNCMForImports(query);
            }, 300);
        });
    }
}

async function searchNCMForImports(query) {
    try {
        // Buscar tanto por código quanto por descrição
        const results = await ipcRenderer.invoke('search-ncm', query);
        
        // Se não encontrou nada e a query parece ser um código NCM (números), tentar busca exata
        if (results.length === 0 && /^\d+/.test(query)) {
            const exactResults = await ipcRenderer.invoke('get-ncm-by-code', query);
            if (exactResults) {
                displayNCMResults([exactResults]);
                return;
            }
        }
        
        displayNCMResults(results);
    } catch (error) {
        console.error('Erro ao buscar NCM:', error);
    }
}

function displayNCMResults(ncms) {
    const resultsDiv = document.getElementById('ncm-results');
    const listDiv = document.getElementById('ncm-list');
    
    if (!resultsDiv || !listDiv) return;
    
    if (ncms.length === 0) {
        listDiv.innerHTML = '<div class="no-results">Nenhum NCM encontrado</div>';
        resultsDiv.style.display = 'block';
        return;
    }
    
    listDiv.innerHTML = ncms.map(ncm => `
        <div class="ncm-item" onclick="selectNCMForImports('${ncm.code}')">
            <div class="ncm-code">${ncm.code}</div>
            <div class="ncm-description">${ncm.description}</div>
            <div class="ncm-category">📂 ${ncm.category}</div>
            <div class="ncm-taxes">
                ${generateTaxPreview(ncm)}
            </div>
        </div>
    `).join('');
    
    resultsDiv.style.display = 'block';
}

function generateTaxPreview(ncm) {
    const activeTaxes = [];
    
    if (ncm.taxes) {
        // Nova estrutura
        for (let i = 1; i <= 5; i++) {
            const tax = ncm.taxes[`tax${i}`];
            if (tax && tax.name && tax.rate > 0) {
                activeTaxes.push(`${tax.name}: ${tax.rate}${tax.type === 'percent' ? '%' : ' R$'}`);
            }
        }
    } else {
        // Estrutura antiga
        if (ncm.import_tax && ncm.import_tax > 0) {
            activeTaxes.push(`II: ${ncm.import_tax}%`);
        }
        if (ncm.ipi && ncm.ipi > 0) {
            activeTaxes.push(`IPI: ${ncm.ipi}%`);
        }
        if (ncm.pis_cofins && ncm.pis_cofins > 0) {
            activeTaxes.push(`PIS/COFINS: ${ncm.pis_cofins}%`);
        }
        if (ncm.icms && ncm.icms > 0) {
            activeTaxes.push(`ICMS: ${ncm.icms}%`);
        }
    }
    
    return activeTaxes.length > 0 ? activeTaxes.join(' | ') : 'Sem impostos configurados';
}

async function selectNCMForImports(code) {
    try {
        const ncm = await ipcRenderer.invoke('get-ncm-by-code', code);
        if (!ncm) return;
        
        selectedNCM = ncm;
        
        // Atualizar interface
        document.getElementById('selected-ncm-code').textContent = ncm.code;
        document.getElementById('selected-ncm-desc').textContent = ncm.description;
        document.getElementById('selected-ncm-category').textContent = ncm.category;
        
        // Atualizar preview dos impostos no NCM selecionado
        updateSelectedNCMTaxPreview(ncm);
        
        // Atualizar preview dos impostos na interface
        updateTaxPreviewForImports(ncm);
        
        // Mostrar seção de NCM selecionado
        document.getElementById('selected-ncm').style.display = 'block';
        document.getElementById('ncm-results').style.display = 'none';
        
        console.log('NCM selecionado:', ncm);
    } catch (error) {
        console.error('Erro ao selecionar NCM:', error);
    }
}

function updateSelectedNCMTaxPreview(ncm) {
    const taxesListElement = document.getElementById('selected-ncm-taxes-list');
    if (!taxesListElement) return;
    
    // Identificar impostos configurados no NCM
    const activeTaxes = [];
    
    if (ncm.taxes) {
        // Nova estrutura - impostos dinâmicos - só mostrar se rate > 0
        for (let i = 1; i <= 5; i++) {
            const tax = ncm.taxes[`tax${i}`];
            if (tax && tax.name && tax.name.trim() !== '' && tax.rate > 0) {
                activeTaxes.push(tax);
            }
        }
    } else {
        // Estrutura antiga - migrar para nova - só mostrar se > 0
        if (ncm.import_tax !== undefined && ncm.import_tax > 0) {
            activeTaxes.push({ name: 'Imposto Importação', rate: ncm.import_tax, type: 'percent' });
        }
        if (ncm.ipi !== undefined && ncm.ipi > 0) {
            activeTaxes.push({ name: 'IPI', rate: ncm.ipi, type: 'percent' });
        }
        if (ncm.pis_cofins !== undefined && ncm.pis_cofins > 0) {
            activeTaxes.push({ name: 'PIS/COFINS', rate: ncm.pis_cofins, type: 'percent' });
        }
        if (ncm.icms !== undefined && ncm.icms > 0) {
            activeTaxes.push({ name: 'ICMS', rate: ncm.icms, type: 'percent' });
        }
    }
    
    if (activeTaxes.length === 0) {
        taxesListElement.textContent = 'Nenhum imposto configurado';
        return;
    }
    
    // Criar lista dinâmica de impostos baseada no NCM
    const taxDisplay = activeTaxes.map(tax => {
        return `${tax.name}: ${tax.rate}%`;
    }).join(' | ');
    
    taxesListElement.textContent = taxDisplay;
}

function updateTaxPreviewForImports(ncm) {
    const taxContainer = document.getElementById('ncm-taxes-display');
    if (!taxContainer) return;
    
    // Limpar container
    taxContainer.innerHTML = '';
    
    const activeTaxes = [];
    
    if (ncm.taxes) {
        // Nova estrutura - impostos dinâmicos
        for (let i = 1; i <= 5; i++) {
            const tax = ncm.taxes[`tax${i}`];
            if (tax && tax.name && tax.rate > 0) {
                activeTaxes.push(tax);
            }
        }
    } else {
        // Estrutura antiga - migrar para nova
        if (ncm.import_tax && ncm.import_tax > 0) {
            activeTaxes.push({ name: 'Imposto Importação', rate: ncm.import_tax, type: 'percent' });
        }
        if (ncm.ipi && ncm.ipi > 0) {
            activeTaxes.push({ name: 'IPI', rate: ncm.ipi, type: 'percent' });
        }
        if (ncm.pis_cofins && ncm.pis_cofins > 0) {
            activeTaxes.push({ name: 'PIS/COFINS', rate: ncm.pis_cofins, type: 'percent' });
        }
        if (ncm.icms && ncm.icms > 0) {
            activeTaxes.push({ name: 'ICMS', rate: ncm.icms, type: 'percent' });
        }
    }
    
    if (activeTaxes.length === 0) {
        taxContainer.innerHTML = `
            <div class="no-taxes-configured">
                <p>⚠️ Este NCM não possui impostos configurados</p>
                <p class="small-text">Configure os impostos no <a href="#" onclick="showNCMManager()">Gerenciador de NCMs</a></p>
            </div>
        `;
        return;
    }
    
    // Calcular valor CIF atual se possível
    const costUSD = parseFloat(document.getElementById('import-cost-usd')?.value?.replace(',', '.')) || 0;
    const totalWeight = parseFloat(document.getElementById('import-total-weight')?.value?.replace(',', '.')) || 0;
    const usdRate = parseFloat(document.getElementById('import-usd-rate')?.value?.replace(',', '.')) || 5.5;
    
    let cifValue = 0;
    let cifBRL = 0;
    let showCalculations = false;
    
    if (costUSD > 0 && totalWeight > 0) {
        const insurance = costUSD * 0.01;
        const freight = totalWeight * 5;
        cifValue = costUSD + insurance + freight;
        cifBRL = cifValue * usdRate;
        showCalculations = true;
    }
    
    // Exibir impostos ativos
    const taxesHTML = activeTaxes.map(tax => {
        let baseInfo = '';
        let calculatedValue = '';
        
        if (tax.type === 'percent') {
            baseInfo = 'Base: CIF (Custo + Seguro + Frete)';
            if (showCalculations) {
                const taxValue = cifBRL * (tax.rate / 100);
                calculatedValue = `<div class="calculated-values">
                    <div class="cif-value">CIF: R$ ${cifBRL.toFixed(2)}</div>
                    <div class="tax-value">Imposto: R$ ${taxValue.toFixed(2)}</div>
                    <div class="total-value">Total: R$ ${(cifBRL + taxValue).toFixed(2)}</div>
                </div>`;
            }
        } else {
            baseInfo = 'Valor Fixo';
            if (showCalculations) {
                calculatedValue = `<div class="calculated-values">
                    <div class="tax-value">Imposto: R$ ${tax.rate.toFixed(2)}</div>
                </div>`;
            }
        }
        
        return `
            <div class="tax-item">
                <div class="tax-name">${tax.name}</div>
                <div class="tax-rate">${tax.rate}${tax.type === 'percent' ? '%' : ' R$'}</div>
                <div class="tax-base">${baseInfo}</div>
                ${calculatedValue}
            </div>
        `;
    }).join('');
    
    // Calcular total dos impostos NCM para o IVA
    let totalNCMTax = 0;
    let totalAfterNCMTax = cifBRL;
    
    // Exibir impostos ativos com nova formatação melhorada
    const newTaxesHTML = activeTaxes.map(tax => {
        let calculatedValue = '';
        
        if (tax.type === 'percent' && showCalculations) {
            const taxValue = cifBRL * (tax.rate / 100);
            totalNCMTax += taxValue;
            
            calculatedValue = `
                <div class="tax-calculation-details">
                    <div class="tax-calculation-row">
                        <span class="tax-calculation-label">📊 Base (CIF):</span>
                        <span class="tax-calculation-value">R$ ${cifBRL.toFixed(2)}</span>
                    </div>
                    <div class="tax-calculation-row">
                        <span class="tax-calculation-label">💰 Imposto:</span>
                        <span class="tax-calculation-value">R$ ${taxValue.toFixed(2)}</span>
                    </div>
                    <div class="tax-calculation-row">
                        <span class="tax-calculation-label">🎯 Total:</span>
                        <span class="tax-calculation-value">R$ ${(cifBRL + taxValue).toFixed(2)}</span>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="tax-card">
                <h4>
                    ${tax.name}
                    <span class="tax-rate-badge">${tax.rate}%</span>
                </h4>
                <div class="tax-calculation-label">Base: CIF (Custo + Seguro + Frete)</div>
                ${calculatedValue}
            </div>
        `;
    }).join('');
    
    // Calcular IVA 10% sobre o total após impostos NCM
    totalAfterNCMTax = cifBRL + totalNCMTax;
    const ivaValue = totalAfterNCMTax * 0.10;
    const finalTotal = totalAfterNCMTax + ivaValue;
    
    const ivaHTML = showCalculations ? `
        <div class="iva-section">
            <h4>
                🏛️ IVA (Imposto Fixo)
                <span class="tax-rate-badge">10%</span>
            </h4>
            <div class="iva-calculation">
                <div class="tax-calculation-row">
                    <span class="tax-calculation-label">📊 Base (Total após impostos NCM):</span>
                    <span class="tax-calculation-value">R$ ${totalAfterNCMTax.toFixed(2)}</span>
                </div>
                <div class="tax-calculation-row">
                    <span class="tax-calculation-label">💰 IVA (10%):</span>
                    <span class="tax-calculation-value">R$ ${ivaValue.toFixed(2)}</span>
                </div>
                <div class="tax-calculation-row">
                    <span class="tax-calculation-label">🎯 TOTAL FINAL:</span>
                    <span class="tax-calculation-value">R$ ${finalTotal.toFixed(2)}</span>
                </div>
            </div>
        </div>
    ` : '';
    
    taxContainer.innerHTML = `
        <div class="taxes-configured">
            <h3 style="margin-bottom: 20px; color: #333; text-align: center;">💰 Impostos para este NCM</h3>
            ${newTaxesHTML}
            ${ivaHTML}
            <div class="tax-info" style="text-align: center; margin-top: 15px; color: #666;">
                <p>💡 ${showCalculations ? 'Valores calculados automaticamente baseados nos dados informados.' : 'Informe os valores de compra e peso para ver os cálculos.'}</p>
            </div>
        </div>
    `;
    
    // Atualizar resumo de importação
    updateImportSummary(ncm, { cifValue, cifBRL, totalNCMTax, ivaValue, finalTotal, showCalculations });
    
    // Também atualizar preview no NCM selecionado (se existir)
    const previewSpans = ['selected-ncm-ii', 'selected-ncm-ipi', 'selected-ncm-pis', 'selected-ncm-icms'];
    previewSpans.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = '0';
    });
    
    activeTaxes.forEach(tax => {
        const taxName = tax.name.toLowerCase();
        if (taxName.includes('importação') || taxName.includes('ii')) {
            const element = document.getElementById('selected-ncm-ii');
            if (element) element.textContent = tax.rate;
        } else if (taxName.includes('ipi')) {
            const element = document.getElementById('selected-ncm-ipi');
            if (element) element.textContent = tax.rate;
        } else if (taxName.includes('pis') || taxName.includes('cofins')) {
            const element = document.getElementById('selected-ncm-pis');
            if (element) element.textContent = tax.rate;
        } else if (taxName.includes('icms')) {
            const element = document.getElementById('selected-ncm-icms');
            if (element) element.textContent = tax.rate;
        }
    });
}

function calculateImport() {
    const productName = document.getElementById('import-product-name').value;
    const costUSD = parseFloat(document.getElementById('import-cost-usd').value.replace(',', '.')) || 0;
    const totalWeight = parseFloat(document.getElementById('import-total-weight').value.replace(',', '.')) || 0;
    const quantity = parseFloat(document.getElementById('import-quantity').value.replace(',', '.')) || 1;
    const usdRate = parseFloat(document.getElementById('import-usd-rate').value.replace(',', '.')) || 5.5;
    
    if (!productName || costUSD <= 0 || totalWeight <= 0) {
        alert('Por favor, preencha todos os campos obrigatórios');
        return;
    }
    
    // Cálculo CIF
    const insurance = costUSD * 0.01; // 1%
    const freight = totalWeight * 5; // $5 por kg
    const cifValue = costUSD + insurance + freight;
    const cifBRL = cifValue * usdRate;
    
    // Verificar se há NCM selecionado
    if (!selectedNCM) {
        alert('Por favor, selecione um NCM para calcular os impostos corretos');
        return;
    }
    
    // Usar impostos do NCM selecionado
    const taxBase = cifBRL;
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
                } else {
                    taxValue = tax.rate;
                }
                totalTaxes += taxValue;
                taxDetails.push({
                    name: tax.name,
                    rate: tax.rate,
                    type: tax.type,
                    value: taxValue
                });
            }
        }
    } else {
        // Fallback para estrutura antiga (compatibilidade)
        const importTaxValue = taxBase * ((selectedNCM.import_tax || 0) / 100);
        const ipiValue = taxBase * ((selectedNCM.ipi || 0) / 100);
        const icmsValue = taxBase * ((selectedNCM.icms || 0) / 100);
        totalTaxes = importTaxValue + ipiValue + icmsValue;
    }
    const customsBroker = parseFloat(document.getElementById('import-customs-broker').value) || 500;
    const otherCosts = parseFloat(document.getElementById('import-other-costs').value) || 0;
    
    const totalCost = cifBRL + totalTaxes + customsBroker + otherCosts;
    const unitCost = totalCost / quantity;
    
    // Exibir resultados
    document.getElementById('cif-cost').textContent = `USD ${costUSD.toFixed(2)}`;
    document.getElementById('cif-insurance').textContent = `USD ${insurance.toFixed(2)}`;
    document.getElementById('cif-freight').textContent = `USD ${freight.toFixed(2)}`;
    document.getElementById('cif-total').textContent = `USD ${cifValue.toFixed(2)}`;
    document.getElementById('cif-unit').textContent = `USD ${(cifValue / quantity).toFixed(2)}`;
    document.getElementById('cif-breakdown').style.display = 'block';
    
    document.getElementById('result-fob-brl').textContent = `R$ ${cifBRL.toFixed(2)}`;
    document.getElementById('result-freight-insurance').textContent = `R$ ${((insurance + freight) * usdRate).toFixed(2)}`;
    document.getElementById('result-taxes').textContent = `R$ ${totalTaxes.toFixed(2)}`;
    document.getElementById('result-extra-costs').textContent = `R$ ${(customsBroker + otherCosts).toFixed(2)}`;
    document.getElementById('result-total-cost').textContent = `R$ ${totalCost.toFixed(2)}`;
    document.getElementById('result-unit-cost').textContent = `R$ ${unitCost.toFixed(2)}`;
    
    // Exibir código NCM no resultado
    document.getElementById('selected-ncm-code-result').textContent = selectedNCM.code;
    
    // Exibir detalhamento dos impostos
    if (taxDetails.length > 0) {
        const taxBreakdown = taxDetails.map(tax => 
            `${tax.name}: R$ ${tax.value.toFixed(2)} (${tax.rate}${tax.type === 'percent' ? '%' : ' R$'})`
        ).join('<br>');
        
        const taxDetailsElement = document.getElementById('tax-breakdown-details');
        if (taxDetailsElement) {
            taxDetailsElement.innerHTML = taxBreakdown;
        }
    }
    
    // Preços de venda
    const margin = parseFloat(document.getElementById('import-margin').value) || 40;
    const mlCommission = parseFloat(document.getElementById('import-ml-commission').value) || 12;
    
    const directPrice = unitCost * (1 + margin / 100);
    const directProfit = directPrice - unitCost;
    
    const mlPrice = unitCost / (1 - mlCommission / 100) * (1 + margin / 100);
    const mlNet = mlPrice * (1 - mlCommission / 100);
    const mlProfit = mlNet - unitCost;
    const mlMarginReal = ((mlProfit / unitCost) * 100);
    
    document.getElementById('result-direct-price').textContent = `R$ ${directPrice.toFixed(2)}`;
    document.getElementById('result-direct-profit').textContent = `R$ ${directProfit.toFixed(2)}`;
    
    document.getElementById('result-ml-price').textContent = `R$ ${mlPrice.toFixed(2)}`;
    document.getElementById('result-ml-net').textContent = `R$ ${mlNet.toFixed(2)}`;
    document.getElementById('result-ml-profit').textContent = `R$ ${mlProfit.toFixed(2)}`;
    document.getElementById('result-ml-margin').textContent = `${mlMarginReal.toFixed(1)}%`;
    
    document.getElementById('import-results').style.display = 'block';
}

function calculateCIF() {
    const costUSD = parseFloat(document.getElementById('import-cost-usd').value.replace(',', '.')) || 0;
    const totalWeight = parseFloat(document.getElementById('import-total-weight').value.replace(',', '.')) || 0;
    const quantity = parseFloat(document.getElementById('import-quantity').value.replace(',', '.')) || 1;
    
    if (costUSD > 0 && totalWeight > 0) {
        const insurance = costUSD * 0.01;
        const freight = totalWeight * 5;
        const cifValue = costUSD + insurance + freight;
        
        document.getElementById('cif-cost').textContent = `USD ${costUSD.toFixed(2)}`;
        document.getElementById('cif-insurance').textContent = `USD ${insurance.toFixed(2)}`;
        document.getElementById('cif-freight').textContent = `USD ${freight.toFixed(2)}`;
        document.getElementById('cif-total').textContent = `USD ${cifValue.toFixed(2)}`;
        document.getElementById('cif-unit').textContent = `USD ${(cifValue / quantity).toFixed(2)}`;
        document.getElementById('cif-breakdown').style.display = 'block';
    }
}

function clearImportForm() {
    document.getElementById('import-product-name').value = '';
    document.getElementById('import-cost-usd').value = '';
    document.getElementById('import-total-weight').value = '';
    document.getElementById('import-quantity').value = '1';
    document.getElementById('import-usd-rate').value = '5.50';
    document.getElementById('import-margin').value = '40';
    document.getElementById('cif-breakdown').style.display = 'none';
    document.getElementById('import-results').style.display = 'none';
    clearSelectedNCM();
}

function saveImportProduct() {
    const productName = document.getElementById('import-product-name').value;
    const unitCostText = document.getElementById('result-unit-cost').textContent;
    const unitCost = parseFloat(unitCostText.replace('R$', '').replace(',', '.').trim());
    
    if (!productName || !unitCost) {
        alert('Execute o cálculo de importação antes de salvar');
        return;
    }
    
    const productData = {
        nome: productName,
        preco_custo: unitCost,
        estoque: parseInt(document.getElementById('import-quantity').value) || 1,
        categoria: 'Importado',
        descricao: 'Produto importado via calculadora'
    };
    
    // Add product using existing function
    ipcRenderer.invoke('add-product', productData)
        .then(() => {
            alert('✅ Produto importado salvo com sucesso!');
            loadProducts();
            clearImportForm();
        })
        .catch(error => {
            alert('❌ Erro ao salvar produto: ' + error.message);
        });
}

function updateImportSummary(ncm, calculationData) {
    const summaryContainer = document.getElementById('import-summary-display');
    if (!summaryContainer) return;
    
    const { cifValue, cifBRL, totalNCMTax, ivaValue, finalTotal, showCalculations } = calculationData;
    
    if (!showCalculations) {
        summaryContainer.innerHTML = `
            <div class="summary-message">
                <p>ℹ️ Preencha os dados acima e selecione um NCM para ver o resumo completo</p>
                <p class="small-text">O resumo será calculado automaticamente com todos os custos em USD e BRL</p>
            </div>
        `;
        return;
    }
    
    // Obter valores dos inputs
    const realCostUSD = parseFloat(document.getElementById('import-real-cost-usd')?.value?.replace(',', '.')) || 0;
    const declaredCostUSD = parseFloat(document.getElementById('import-cost-usd')?.value?.replace(',', '.')) || 0;
    const totalWeight = parseFloat(document.getElementById('import-total-weight')?.value?.replace(',', '.')) || 0;
    const quantity = parseFloat(document.getElementById('import-quantity')?.value?.replace(',', '.')) || 1;
    const usdRate = parseFloat(document.getElementById('import-usd-rate')?.value?.replace(',', '.')) || 5.5;
    const usdGuaraniRate = parseFloat(document.getElementById('import-usd-guarani-rate')?.value?.replace(',', '.')) || 7500;
    const despachanteUSD = parseFloat(document.getElementById('import-customs-broker')?.value?.replace(',', '.')) || 44;
    const otherCostsUSD = parseFloat(document.getElementById('import-other-costs')?.value?.replace(',', '.')) || 0;
    
    // Calcular componentes (usando valor declarado para cálculos)
    const insurance = declaredCostUSD * 0.01;
    const freight = totalWeight * 5;
    const otherTaxes = totalNCMTax;
    // Calcular custo total real (usando custo real da China)
    const realTotalCostUSD = realCostUSD + insurance + freight + despachanteUSD + otherCostsUSD + (totalNCMTax / usdRate) + (ivaValue / usdRate);
    const realTotalCostBRL = (realCostUSD * usdRate) + (insurance * usdRate) + (freight * usdRate) + totalNCMTax + ivaValue + (despachanteUSD * usdRate) + (otherCostsUSD * usdRate);
    
    // Calcular custo declarado (para comparação)
    const declaredTotalCostUSD = cifValue + despachanteUSD + otherCostsUSD + (totalNCMTax / usdRate) + (ivaValue / usdRate);
    const declaredTotalCostBRL = cifBRL + totalNCMTax + ivaValue + (despachanteUSD * usdRate) + (otherCostsUSD * usdRate);
    
    summaryContainer.innerHTML = `
        <div class="summary-content">
            <div class="summary-column">
                <h4>💰 Custos em USD</h4>
                <div class="summary-row">
                    <span class="summary-label">💰 Custo Real China:</span>
                    <span class="summary-value">USD ${realCostUSD.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">📋 Valor Declarado:</span>
                    <span class="summary-value">USD ${declaredCostUSD.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">🛡️ Seguro (1%):</span>
                    <span class="summary-value">USD ${insurance.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">🚛 Frete (USD 5/kg):</span>
                    <span class="summary-value">USD ${freight.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">📊 Subtotal CIF:</span>
                    <span class="summary-value">USD ${cifValue.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">📋 Impostos NCM:</span>
                    <span class="summary-value">USD ${(otherTaxes / usdRate).toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">🏛️ IVA (10%):</span>
                    <span class="summary-value">USD ${(ivaValue / usdRate).toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">💼 Despachante:</span>
                    <span class="summary-value">USD ${despachanteUSD.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">📦 Outras Despesas:</span>
                    <span class="summary-value">USD ${otherCostsUSD.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">🎯 Custo Final USD:</span>
                    <span class="summary-value">USD ${realTotalCostUSD.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">📊 Quantidade Total:</span>
                    <span class="summary-value">${quantity.toFixed(0)} unidades</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">💰 Custo por Unidade:</span>
                    <span class="summary-value">USD ${(realTotalCostUSD / quantity).toFixed(2)}</span>
                </div>
            </div>
            
            <div class="summary-column">
                <h4>🇧🇷 Custos em BRL</h4>
                <div class="summary-row">
                    <span class="summary-label">💰 Custo Real China:</span>
                    <span class="summary-value">R$ ${(realCostUSD * usdRate).toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">📋 Valor Declarado:</span>
                    <span class="summary-value">R$ ${(declaredCostUSD * usdRate).toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">🛡️ Seguro (1%):</span>
                    <span class="summary-value">R$ ${(insurance * usdRate).toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">🚛 Frete (USD 5/kg):</span>
                    <span class="summary-value">R$ ${(freight * usdRate).toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">📊 Subtotal CIF:</span>
                    <span class="summary-value">R$ ${cifBRL.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">📋 Impostos NCM:</span>
                    <span class="summary-value">R$ ${otherTaxes.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">🏛️ IVA (10%):</span>
                    <span class="summary-value">R$ ${ivaValue.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">💼 Despachante:</span>
                    <span class="summary-value">R$ ${(despachanteUSD * usdRate).toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">📦 Outras Despesas:</span>
                    <span class="summary-value">R$ ${(otherCostsUSD * usdRate).toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">🎯 Custo Final BRL:</span>
                    <span class="summary-value">R$ ${realTotalCostBRL.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">📊 Quantidade Total:</span>
                    <span class="summary-value">${quantity.toFixed(0)} unidades</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">💰 Custo por Unidade:</span>
                    <span class="summary-value">R$ ${(realTotalCostBRL / quantity).toFixed(2)}</span>
                </div>
            </div>
            
            <div class="summary-column">
                <h4>🇵🇾 Custos em Guarani</h4>
                <div class="summary-row">
                    <span class="summary-label">💰 Custo Real China:</span>
                    <span class="summary-value">₲ ${(realCostUSD * usdGuaraniRate).toLocaleString('es-PY')}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">📋 Valor Declarado:</span>
                    <span class="summary-value">₲ ${(declaredCostUSD * usdGuaraniRate).toLocaleString('es-PY')}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">🛡️ Seguro (1%):</span>
                    <span class="summary-value">₲ ${(insurance * usdGuaraniRate).toLocaleString('es-PY')}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">🚛 Frete (USD 5/kg):</span>
                    <span class="summary-value">₲ ${(freight * usdGuaraniRate).toLocaleString('es-PY')}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">📊 Subtotal CIF:</span>
                    <span class="summary-value">₲ ${(cifValue * usdGuaraniRate).toLocaleString('es-PY')}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">📋 Impostos NCM:</span>
                    <span class="summary-value">₲ ${((otherTaxes / usdRate) * usdGuaraniRate).toLocaleString('es-PY')}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">🏛️ IVA (10%):</span>
                    <span class="summary-value">₲ ${((ivaValue / usdRate) * usdGuaraniRate).toLocaleString('es-PY')}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">💼 Despachante:</span>
                    <span class="summary-value">₲ ${(despachanteUSD * usdGuaraniRate).toLocaleString('es-PY')}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">📦 Outras Despesas:</span>
                    <span class="summary-value">₲ ${(otherCostsUSD * usdGuaraniRate).toLocaleString('es-PY')}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">🎯 Custo Final Guarani:</span>
                    <span class="summary-value">₲ ${(realTotalCostUSD * usdGuaraniRate).toLocaleString('es-PY')}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">📊 Quantidade Total:</span>
                    <span class="summary-value">${quantity.toFixed(0)} unidades</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">💰 Custo por Unidade:</span>
                    <span class="summary-value">₲ ${((realTotalCostUSD * usdGuaraniRate) / quantity).toLocaleString('es-PY')}</span>
                </div>
            </div>
        </div>
        
        <div class="summary-total-section">
            <h4>🎯 Valor Final no Paraguai</h4>
            <div class="final-totals">
                <div class="total-box">
                    <div class="total-currency">💵 Em Dólar</div>
                    <div class="total-value">USD ${realTotalCostUSD.toFixed(2)}</div>
                </div>
                <div class="total-box">
                    <div class="total-currency">💰 Em Real</div>
                    <div class="total-value">R$ ${realTotalCostBRL.toFixed(2)}</div>
                </div>
                <div class="total-box">
                    <div class="total-currency">🇵🇾 Em Guarani</div>
                    <div class="total-value">₲ ${(realTotalCostUSD * usdGuaraniRate).toLocaleString('es-PY')}</div>
                </div>
            </div>
            <div style="margin-top: 15px; font-size: 14px; opacity: 0.9;">
                <p>💡 <strong>Custo Final</strong> baseado no Custo Real China. Impostos calculados sobre o Valor Declarado.</p>
                <p>📈 Taxas: USD→BRL ${usdRate.toFixed(2)} | USD→₲ ${usdGuaraniRate.toLocaleString('es-PY')} | NCM: ${ncm.code} - ${ncm.description}</p>
                <p>💰 Economia nos impostos: R$ ${((realCostUSD - declaredCostUSD) * usdRate).toFixed(2)} (diferença entre custo real e declarado)</p>
            </div>
        </div>
    `;
}

// Variável para debounce das atualizações
let updateTimeout;

function updateSummaryIfNCMSelected() {
    // Cancelar timeout anterior se existir
    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }
    
    // Criar novo timeout para evitar muitas chamadas durante digitação
    updateTimeout = setTimeout(() => {
        if (selectedNCM) {
            // Atualizar tanto a preview de impostos quanto o resumo
            updateTaxPreviewForImports(selectedNCM);
            
            // Também atualizar CIF se necessário
            calculateCIF();
        } else {
            // Se não há NCM selecionado, apenas atualizar CIF
            calculateCIF();
        }
    }, 300); // Aguardar 300ms após parar de digitar
}

// Função para atualização imediata (sem debounce) - para onchange
function updateSummaryImmediate() {
    if (selectedNCM) {
        updateTaxPreviewForImports(selectedNCM);
        calculateCIF();
    } else {
        calculateCIF();
    }
}

function clearSelectedNCM() {
    selectedNCM = null;
    const selectedDiv = document.getElementById('selected-ncm');
    if (selectedDiv) {
        selectedDiv.style.display = 'none';
    }
    const searchInput = document.getElementById('ncm-search');
    if (searchInput) {
        searchInput.value = '';
    }
    const resultsDiv = document.getElementById('ncm-results');
    if (resultsDiv) {
        resultsDiv.style.display = 'none';
    }
    
    // Limpar exibição de impostos
    const taxContainer = document.getElementById('ncm-taxes-display');
    if (taxContainer) {
        taxContainer.innerHTML = `
            <div class="no-ncm-selected">
                <p>⚠️ Selecione um NCM acima para ver os impostos aplicáveis</p>
                <p class="small-text">Os impostos serão calculados automaticamente baseados no NCM escolhido</p>
            </div>
        `;
    }
}

// ==========================================
// SISTEMA NCM COMPLETO
// ==========================================

let allNCMs = [];
let filteredNCMs = [];
let selectedNCM = null;

// Dynamic tax fields
let taxFieldCount = 0;
const MAX_TAX_FIELDS = 5;

function showNCMManager() {
    loadAllNCMs();
    showModal('ncm-modal');
    // Inicializar campos dinâmicos
    setTimeout(() => {
        console.log('Initializing tax fields...');
        initializeTaxFields();
    }, 200);
}

async function loadAllNCMs() {
    try {
        allNCMs = await ipcRenderer.invoke('get-all-ncms');
        updateNCMTable();
        updateCategoryFilter();
    } catch (error) {
        console.error('Erro ao carregar NCMs:', error);
    }
}

function initializeTaxFields() {
    const container = document.getElementById('tax-fields-container');
    if (!container) {
        console.error('tax-fields-container not found!');
        return;
    }
    
    console.log('Container found, clearing and adding first field...');
    container.innerHTML = '';
    taxFieldCount = 0;
    
    // Adicionar primeiro campo automaticamente
    addTaxField();
}

// Adicionar campo de imposto
function addTaxField() {
    console.log('addTaxField called, current count:', taxFieldCount);
    
    if (taxFieldCount >= MAX_TAX_FIELDS) {
        alert(`Máximo de ${MAX_TAX_FIELDS} impostos permitidos por NCM`);
        return;
    }
    
    const container = document.getElementById('tax-fields-container');
    if (!container) {
        console.error('Container not found in addTaxField!');
        return;
    }
    
    taxFieldCount++;
    console.log('Adding tax field:', taxFieldCount);
    
    const taxFieldHTML = `
        <div class="tax-config-row" data-tax-index="${taxFieldCount}">
            <div class="tax-row-header">
                <span class="tax-number">Imposto ${taxFieldCount}</span>
                ${taxFieldCount > 1 ? `<button type="button" class="btn btn-sm btn-danger" onclick="removeTaxField(${taxFieldCount})">🗑️ Remover</button>` : ''}
            </div>
            <div class="tax-row-fields">
                <div class="form-group">
                    <label>Nome do Imposto:</label>
                    <input type="text" id="tax-${taxFieldCount}-name" name="tax-${taxFieldCount}-name" placeholder="Ex: Imposto Importação" ${taxFieldCount === 1 ? 'value="Imposto Importação"' : ''}>
                </div>
                <div class="form-group">
                    <label>Taxa:</label>
                    <input type="text" id="tax-${taxFieldCount}-rate" name="tax-${taxFieldCount}-rate" placeholder="0.00" value="${taxFieldCount === 1 ? '16' : ''}" oninput="formatNumericInput(this)">
                </div>
                <div class="form-group">
                    <label>Tipo:</label>
                    <select id="tax-${taxFieldCount}-type" name="tax-${taxFieldCount}-type">
                        <option value="percent">Percentual (%)</option>
                        <option value="fixed">Valor Fixo (R$)</option>
                    </select>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', taxFieldHTML);
    console.log('Tax field added successfully');
    
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

function updateCategoryFilter() {
    const filter = document.getElementById('category-filter');
    if (!filter) return;
    
    const categories = [...new Set(allNCMs.map(ncm => ncm.category))].sort();
    filter.innerHTML = '<option value="">Todas as categorias</option>' +
        categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

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

// Manipular envio do formulário NCM
async function handleNCMSubmit(e) {
    e.preventDefault();
    console.log('NCM form submitted, taxFieldCount:', taxFieldCount);
    
    const ncmData = {
        code: document.getElementById('new-ncm-code').value,
        description: document.getElementById('new-ncm-description').value,
        category: document.getElementById('new-ncm-category').value,
        notes: document.getElementById('new-ncm-notes').value
    };
    
    console.log('Basic NCM data:', ncmData);
    
    // Coletar dados dos campos dinâmicos de imposto
    for (let i = 1; i <= taxFieldCount; i++) {
        const nameField = document.getElementById(`tax-${i}-name`);
        const rateField = document.getElementById(`tax-${i}-rate`);
        const typeField = document.getElementById(`tax-${i}-type`);
        
        console.log(`Tax field ${i}:`, {
            nameField: nameField ? nameField.value : 'NOT FOUND',
            rateField: rateField ? rateField.value : 'NOT FOUND',
            typeField: typeField ? typeField.value : 'NOT FOUND'
        });
        
        if (nameField && rateField && typeField) {
            ncmData[`tax${i}_name`] = nameField.value || '';
            // Converter vírgula para ponto antes de fazer parseFloat
            const rateValue = rateField.value.replace(',', '.');
            ncmData[`tax${i}_rate`] = parseFloat(rateValue) || 0;
            ncmData[`tax${i}_type`] = typeField.value || 'percent';
        }
    }
    
    // Preencher campos vazios para os impostos não utilizados
    for (let i = taxFieldCount + 1; i <= 5; i++) {
        ncmData[`tax${i}_name`] = '';
        ncmData[`tax${i}_rate`] = 0;
        ncmData[`tax${i}_type`] = 'percent';
    }
    
    console.log('Final NCM data:', ncmData);
    
    try {
        await ipcRenderer.invoke('add-ncm', ncmData);
        alert('✅ NCM adicionado com sucesso!');
        clearNCMForm();
        loadAllNCMs();
    } catch (error) {
        console.error('Error adding NCM:', error);
        alert('❌ Erro ao adicionar NCM: ' + error.message);
    }
}

function clearNCMForm() {
    const form = document.getElementById('ncm-form');
    if (form) {
        form.reset();
    }
    
    // Reinicializar campos dinâmicos de imposto
    initializeTaxFields();
}

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
        }
        
        // Se não tiver nenhum imposto, adicionar pelo menos um campo
        if (taxFieldCount === 0) {
            addTaxField();
        }
        
        // Desabilitar campo código (não pode ser editado)
        document.getElementById('new-ncm-code').readOnly = true;
        
        // Mudar texto do botão
        const submitBtn = document.querySelector('#ncm-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = '✏️ Atualizar NCM';
            submitBtn.onclick = (e) => {
                e.preventDefault();
                updateNCM(code);
            };
        }
        
    } catch (error) {
        alert('Erro ao carregar dados do NCM: ' + error.message);
    }
}

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
            // Converter vírgula para ponto antes de fazer parseFloat
            const rateValue = rateField.value.replace(',', '.');
            updateData.taxes[`tax${i}`] = {
                name: nameField.value || '',
                rate: parseFloat(rateValue) || 0,
                type: typeField.value || 'percent'
            };
        }
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

function resetNCMForm() {
    clearNCMForm();
    document.getElementById('new-ncm-code').readOnly = false;
    const submitBtn = document.querySelector('#ncm-form button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = '💾 Salvar NCM';
        submitBtn.onclick = null;
    }
}

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

// Função para converter vírgula em ponto automaticamente nos campos numéricos
function convertCommaToPoint(input) {
    const value = input.value;
    if (value.includes(',')) {
        input.value = value.replace(',', '.');
    }
}

// Função para atualizar preview de impostos quando valores mudam
function updateTaxPreview() {
    if (selectedNCM) {
        updateTaxPreviewForImports(selectedNCM);
    }
}

// Função avançada para formatação de campos numéricos (aceita qualquer valor)
function formatNumericInput(input) {
    let value = input.value;
    
    // Permitir números, vírgula, ponto e espaços
    // Remove caracteres não numéricos exceto vírgula, ponto
    value = value.replace(/[^0-9,.]/g, '');
    
    // Substituir vírgula por ponto para padronizar
    value = value.replace(',', '.');
    
    // Permitir apenas um ponto decimal
    const parts = value.split('.');
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    input.value = value;
}

// Configurar formulário NCM
document.addEventListener('DOMContentLoaded', () => {
    const ncmForm = document.getElementById('ncm-form');
    if (ncmForm) {
        ncmForm.addEventListener('submit', handleNCMSubmit);
    }
});