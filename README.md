# 📊 Sactorium Desktop

Sistema completo de gestão de produtos e vendas desenvolvido com Electron.

## 🚀 Funcionalidades

- **Gestão de Produtos**: CRUD completo com estoque, preços e categorias
- **Calculadora ML**: Cálculo automático de preços para Mercado Livre
- **Sistema de Vendas**: Registro e controle de vendas
- **Importação CSV**: Importação em lote de produtos
- **Interface Responsiva**: Design moderno e intuitivo
- **Banco Local**: Dados armazenados localmente em JSON

## 🛠️ Tecnologias

- **Electron**: Framework desktop multiplataforma
- **Node.js**: Runtime JavaScript
- **HTML/CSS/JS**: Interface de usuário
- **JSON Database**: Armazenamento local de dados

## 📥 Instalação

```bash
# Clone o repositório
git clone <repository-url>
cd sactorium

# Instale as dependências
npm install

# Execute em modo desenvolvimento
npm run dev

# Ou execute normalmente
npm start
```

## 🔧 Scripts Disponíveis

### Desenvolvimento
```bash
npm run dev          # Modo desenvolvimento (DevTools aberto)
npm start            # Modo normal
npm test             # Executar testes
```

### Build e Distribuição
```bash
npm run build:test   # Build para teste
npm run build:prod   # Build para produção
npm run dist         # Build geral
```

### Versionamento e Release
```bash
npm run release:patch    # Release patch para teste (1.0.0 → 1.0.1)
npm run release:minor    # Release minor para teste (1.0.0 → 1.1.0)
npm run release:major    # Release major para teste (1.0.0 → 2.0.0)
npm run release:prod     # Release para produção
```

## 🌟 Fluxo de Desenvolvimento

### Ambientes
- **main**: Produção estável
- **testing**: Versão de teste
- **development**: Desenvolvimento ativo

### Processo de Release

1. **Desenvolvimento**:
   ```bash
   git checkout development
   # Fazer mudanças
   git add .
   git commit -m "feat: nova funcionalidade"
   ```

2. **Teste**:
   ```bash
   git checkout testing
   git merge development
   npm run release:patch  # Cria versão de teste
   ```

3. **Produção**:
   ```bash
   git checkout main
   git merge testing
   npm run release:prod   # Cria versão de produção
   ```

## 📁 Estrutura do Projeto

```
sactorium/
├── main.js              # Processo principal do Electron
├── renderer.js          # Lógica do renderer
├── database.js          # Sistema de banco de dados JSON
├── config.js            # Configurações de ambiente
├── index.html           # Interface principal
├── styles.css           # Estilos da aplicação
├── release.js           # Script de release automatizado
├── package.json         # Configuração do projeto
├── CHANGELOG.md         # Histórico de mudanças
└── dist/               # Arquivos de build
```

## 🎯 Como Usar

### Cadastrar Produtos
1. Clique em "➕ Cadastrar Produto"
2. Preencha os dados obrigatórios
3. Salve o produto

### Importar Produtos (CSV)
1. Prepare arquivo CSV com colunas: `nome`, `preco_custo`, `estoque`
2. Clique em "📋 Importar Produtos"
3. Selecione o arquivo CSV
4. Confirme a importação

### Calculadora ML
1. Vá para aba "💰 Calculadora ML"
2. Selecione um produto
3. Configure preço de venda e frete
4. Veja o cálculo de lucro automático

### Registrar Vendas
1. Clique em "💰 Registrar Venda"
2. Preencha os dados da venda
3. Confirme o registro

## 🔧 Configuração

O arquivo `config.js` permite configurar:
- Ambiente de execução
- Arquivo de banco de dados
- Configurações da janela
- DevTools

## 🐛 Resolução de Problemas

### Erro ao importar CSV
- Verifique se o arquivo tem as colunas obrigatórias
- Certifique-se que os dados estão no formato correto

### Aplicação não inicia
- Execute `npm install` para instalar dependências
- Verifique se o Node.js está instalado

### Dados não salvam
- Verifique permissões de escrita na pasta do projeto
- Confirme se o arquivo JSON não está corrompido

## 📝 Licença

MIT License - Veja [LICENSE](LICENSE) para detalhes.

## 👨‍💻 Desenvolvido com

🚀 Generated with [Claude Code](https://claude.ai/code)

---

**Versão:** 1.0.0  
**Última atualização:** 2025-08-07