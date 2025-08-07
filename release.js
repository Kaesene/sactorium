#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Cores para output no terminal
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function run(command) {
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    log(`❌ Erro executando: ${command}`, colors.red);
    return false;
  }
}

function updateChangelog(version) {
  const changelogPath = path.join(__dirname, 'CHANGELOG.md');
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  
  const today = new Date().toISOString().split('T')[0];
  const newEntry = `\n## [${version}] - ${today}\n\n### 🔄 Alterações\n- Versão de teste/desenvolvimento\n- Melhorias e correções diversas\n`;
  
  const updatedChangelog = changelog.replace(
    '# Changelog do Sactorium\n\nTodas as mudanças notáveis do projeto serão documentadas neste arquivo.\n',
    `# Changelog do Sactorium\n\nTodas as mudanças notáveis do projeto serão documentadas neste arquivo.\n${newEntry}`
  );
  
  fs.writeFileSync(changelogPath, updatedChangelog);
  log(`✅ CHANGELOG.md atualizado`, colors.green);
}

async function main() {
  const args = process.argv.slice(2);
  const releaseType = args[0] || 'patch'; // patch, minor, major
  const environment = args[1] || 'testing'; // testing, production
  
  log(`🚀 Iniciando release ${releaseType} para ${environment}`, colors.blue);
  
  // Verificar se está na branch correta
  const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  const expectedBranch = environment === 'production' ? 'main' : environment === 'testing' ? 'testing' : 'development';
  
  if (currentBranch !== expectedBranch) {
    log(`⚠️  Mudando para branch ${expectedBranch}`, colors.yellow);
    if (!run(`git checkout ${expectedBranch}`)) {
      process.exit(1);
    }
  }
  
  // Atualizar código
  log(`📥 Atualizando código...`, colors.blue);
  if (!run('git pull origin ' + expectedBranch)) {
    process.exit(1);
  }
  
  // Executar testes
  log(`🧪 Executando testes...`, colors.blue);
  if (!run('npm test')) {
    log(`❌ Testes falharam! Abortando release.`, colors.red);
    process.exit(1);
  }
  
  // Atualizar versão
  log(`📝 Atualizando versão (${releaseType})...`, colors.blue);
  if (!run(`npm version ${releaseType} --no-git-tag-version`)) {
    process.exit(1);
  }
  
  // Ler nova versão
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const newVersion = packageJson.version;
  
  log(`✅ Nova versão: ${newVersion}`, colors.green);
  
  // Atualizar changelog
  updateChangelog(newVersion);
  
  // Build da aplicação
  log(`🔨 Fazendo build da aplicação...`, colors.blue);
  const buildCommand = environment === 'production' ? 'npm run build:prod' : 'npm run build:test';
  if (!run(buildCommand)) {
    process.exit(1);
  }
  
  // Commit das mudanças
  log(`📝 Commitando mudanças...`, colors.blue);
  if (!run('git add .')) {
    process.exit(1);
  }
  
  const commitMessage = `🚀 Release v${newVersion} (${environment})

🔄 Tipo: ${releaseType}
🎯 Ambiente: ${environment}
📅 Data: ${new Date().toISOString().split('T')[0]}

🚀 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>`;
  
  if (!run(`git commit -m "${commitMessage}"`)) {
    process.exit(1);
  }
  
  // Criar tag
  if (!run(`git tag v${newVersion}`)) {
    process.exit(1);
  }
  
  log(`🎉 Release v${newVersion} criado com sucesso!`, colors.green);
  log(`📦 Arquivos de build estão em: ./dist/`, colors.blue);
  
  if (environment === 'production') {
    log(`⚠️  Para publicar: git push origin main --tags`, colors.yellow);
  } else {
    log(`🧪 Versão de teste pronta para validação`, colors.yellow);
  }
}

main().catch(error => {
  log(`❌ Erro no script de release: ${error.message}`, colors.red);
  process.exit(1);
});