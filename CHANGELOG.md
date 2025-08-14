# Changelog do Sactorium

Todas as mudanças notáveis do projeto serão documentadas neste arquivo.

## [1.1.0] - 2025-08-14

### ✨ Novas Funcionalidades
- **Sistema NCM Avançado**: Base de dados completa com códigos NCM e impostos customizáveis
- **Calculadora CIF Dinâmica**: Cálculo automático de custos de importação (Custo + Seguro + Frete)
- **Sistema Multi-Moeda**: Conversão USD → BRL e USD → Guarani para operações no Paraguai
- **Interface de Importação**: Resumo em tempo real com todos os custos e impostos
- **Sistema de Impostos Flexível**: Até 5 impostos customizáveis por NCM
- **Preview de Tributação**: Visualização instantânea dos impostos aplicáveis

### 🔧 Melhorias Técnicas
- Menu contextual com clique direito
- Atalhos de teclado padrão (Cmd+C, Cmd+V, etc.)
- Sistema de backup de arquivos de desenvolvimento
- Validação automática de inputs numéricos
- Conversão automática de vírgula para ponto em campos numéricos

### 🎯 Interface
- Resumo detalhado de importação em tempo real
- Campos organizados por seções lógicas
- Feedback visual instantâneo ao preencher dados
- Melhor usabilidade para operações de importação

## [1.0.0] - 2025-08-07

### ✨ Adicionado
- Sistema completo de gestão de produtos (CRUD)
- Calculadora integrada para preços do Mercado Livre
- Sistema básico de registro de vendas
- Importação de produtos via CSV
- Interface desktop responsiva com Electron
- Banco de dados JSON local
- Sistema de margens personalizáveis (30% e 40%)

### 🔧 Configuração
- Repositório Git configurado com branches (main, development, testing)
- Scripts de build e versionamento automatizados
- Configuração de ambientes (dev, test, prod)
- Gitignore configurado para Electron

### 🎯 Funcionalidades
- Cadastro de produtos com informações completas
- Cálculo automático de preços com margem
- Visualização de estoque em tempo real
- Histórico de vendas
- Painel de informações detalhadas
- Interface intuitiva com navegação por abas