# 🪟 Sactorium para Windows

Esta branch contém a configuração específica para build Windows.

## 📦 Tipos de Build

### 1. Instalador NSIS (.exe)
```bash
npm run dist:win-installer
```
- Instalador tradicional Windows
- Cria atalhos no Desktop e Menu Iniciar
- Suporte x64 e x86 (32-bit)
- Desinstalador incluído

### 2. Versão Portable (.exe)
```bash
npm run dist:win-portable
```
- Executável único sem instalação
- Ideal para pen drives
- Apenas x64

### 3. Ambas as versões
```bash
npm run dist:win
```
- Gera instalador + portable
- x64 e x86

## 🛠️ Requisitos

1. **Ícone Windows**:
   - Adicionar `icon.ico` em `/build/`
   - Resolução recomendada: 256x256

2. **Plataforma**:
   - Idealmente executar em Windows
   - Ou usar GitHub Actions/CI

## 📁 Output

Arquivos gerados em `/dist/windows/`:
- `Sactorium Setup 1.1.0.exe` (Instalador)
- `Sactorium-1.1.0-portable.exe` (Portable)
- `Sactorium Setup 1.1.0-ia32.exe` (32-bit)

## 🔄 Voltando para Mac

```bash
git checkout main
```

A versão Mac permanece inalterada na branch `main`.