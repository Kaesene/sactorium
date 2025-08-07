const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const JSONDatabase = require('./database.js');
const config = require('./config.js');

// Manter referência da janela
let mainWindow;
let db;

function createWindow() {
  // Criar janela principal
  mainWindow = new BrowserWindow({
    width: config.window.width,
    height: config.window.height,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: config.window.webSecurity
    },
    title: `${config.app.name} v${config.app.version} (${config.environment})`,
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  // Carregar interface
  mainWindow.loadFile('index.html');

  // Menu da aplicação (opcional, pode remover)
  const template = [
    {
      label: 'Sactorium',
      submenu: [
        { role: 'about', label: 'Sobre o Sactorium' },
        { type: 'separator' },
        { role: 'quit', label: 'Sair' }
      ]
    },
    {
      label: 'Arquivo',
      submenu: [
        { 
          label: 'Importar Produtos',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            mainWindow.webContents.send('import-products');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // DevTools para desenvolvimento
  if (config.app.devTools) {
    mainWindow.webContents.openDevTools();
  }
  
  // Limpar cache do Electron
  mainWindow.webContents.session.clearCache();
}

// Inicializar banco de dados
function initDatabase() {
  db = new JSONDatabase();
  console.log('Banco de dados JSON inicializado');
}

// Eventos do app
app.whenReady().then(() => {
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers para comunicação com renderer
ipcMain.handle('get-products', async () => {
  try {
    return await db.getProducts();
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    throw error;
  }
});

ipcMain.handle('add-product', async (event, product) => {
  try {
    return await db.addProduct(product);
  } catch (error) {
    console.error('Erro ao adicionar produto:', error);
    throw error;
  }
});

ipcMain.handle('update-product', async (event, id, product) => {
  try {
    return await db.updateProduct(id, product);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    throw error;
  }
});

ipcMain.handle('delete-product', async (event, id) => {
  try {
    return await db.deleteProduct(id);
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    throw error;
  }
});

ipcMain.handle('register-sale', async (event, sale) => {
  try {
    return await db.addSale(sale);
  } catch (error) {
    console.error('Erro ao registrar venda:', error);
    throw error;
  }
});

ipcMain.handle('get-sales', async () => {
  try {
    return await db.getSales();
  } catch (error) {
    console.error('Erro ao buscar vendas:', error);
    throw error;
  }
});

ipcMain.handle('import-csv', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Importar produtos do CSV',
      filters: [
        { name: 'Arquivos CSV', extensions: ['csv'] },
        { name: 'Todos os arquivos', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled) {
      return { success: false, message: 'Importação cancelada' };
    }

    const filePath = result.filePaths[0];
    const csvData = fs.readFileSync(filePath, 'utf8');
    
    // Parse CSV com suporte a vírgulas nos valores
    const lines = csvData.split('\n').filter(line => line.trim());
    
    // Parser CSV mais robusto
    function parseCSVLine(line) {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    }
    
    const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, ''));
    
    // Verificar se tem os headers necessários
    const requiredHeaders = ['nome', 'preco_custo', 'estoque'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      return { 
        success: false, 
        message: `Colunas obrigatórias faltando: ${missingHeaders.join(', ')}` 
      };
    }
    
    let importedCount = 0;
    const errors = [];
    
    // Processar cada linha (pulando header)
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]).map(v => v.replace(/"/g, ''));
        
        if (values.length < headers.length) continue; // Linha incompleta
        
        const product = {};
        headers.forEach((header, index) => {
          product[header] = values[index] || '';
        });
        
        // Converter tipos
        product.preco_custo = parseFloat(product.preco_custo) || 0;
        product.estoque = parseInt(product.estoque) || 0;
        
        // Validações básicas
        if (!product.nome || product.nome.trim() === '') {
          errors.push(`Linha ${i + 1}: Nome vazio`);
          continue;
        }
        
        if (product.preco_custo <= 0) {
          errors.push(`Linha ${i + 1}: Preço de custo inválido`);
          continue;
        }
        
        // Adicionar produto
        await db.addProduct({
          nome: product.nome.trim(),
          preco_custo: product.preco_custo,
          estoque: product.estoque,
          descricao: product.descricao || '',
          categoria: product.categoria || '',
          ncm: product.ncm || '',
          fabricante: product.fabricante || ''
        });
        
        importedCount++;
        
      } catch (error) {
        errors.push(`Linha ${i + 1}: ${error.message}`);
      }
    }
    
    return {
      success: true,
      imported: importedCount,
      errors: errors
    };
    
  } catch (error) {
    console.error('Erro na importação CSV:', error);
    return { 
      success: false, 
      message: `Erro na importação: ${error.message}` 
    };
  }
});