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
    showModal('product-modal');
}

async function editProduct(id) {
    // Implementation for editing product
}

async function deleteProduct(id) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        try {
            await ipcRenderer.invoke('delete-product', id);
            await loadProducts();
        } catch (error) {
            alert('Erro ao excluir produto: ' + error.message);
        }
    }
}

// Calculator functions
function updateMLCost() {
    const select = document.getElementById('ml-product-select');
    const costInput = document.getElementById('ml-cost');
    
    if (select && costInput && select.value) {
        const product = products.find(p => p.id == select.value);
        if (product) {
            costInput.value = product.preco_custo.toFixed(2);
        }
    }
}

function calculateML() {
    // Implementation for ML calculation
}