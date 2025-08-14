# 🚀 GitHub Setup - Sactorium

## 📋 Como usar o GitHub Actions

### 1. Fazer Push para GitHub
```bash
# Criar repositório no GitHub primeiro
git remote add origin https://github.com/SEU_USUARIO/sactorium.git
git push -u origin main
git push origin windows-build
```

### 2. Builds Automáticos

#### 🔄 **Automático** (quando fizer push):
- Push na branch `main` → Build Mac automático
- Push na branch `windows-build` → Build Windows automático  
- Criar tag `v1.1.0` → Release automático com ambos

#### 🎮 **Manual** (quando quiser):
1. Vá em **Actions** no GitHub
2. Clique em **Manual Build**  
3. Escolha plataforma: Windows, Mac ou Both
4. Clique **Run workflow**

### 3. Downloads

Os builds ficam em **Actions > Workflow > Artifacts**:
- `sactorium-windows-vXXX` (arquivos .exe)
- `sactorium-mac-vXXX` (arquivo .dmg)

### 4. Releases Automáticos

Para criar release público:
```bash
git tag v1.1.0
git push origin v1.1.0
```

Vai criar release no GitHub com downloads públicos.

## 🛠️ Comandos Locais

```bash
# Desenvolvimento Mac
git checkout main
npm start

# Desenvolvimento Windows (local)  
git checkout windows-build
npm start

# Build local (se quiser tentar)
npm run dist:win      # No Windows
npm run dist          # No Mac
```

## ⚠️ Importante

- GitHub Actions é **gratuito** para projetos públicos
- Builds Windows só funcionam 100% no GitHub (máquina Windows real)
- Seu Mac continua sendo usado para desenvolvimento
- GitHub cuida dos builds de produção

## 📱 Notificações

GitHub vai notificar por email quando builds terminarem (sucesso/erro).