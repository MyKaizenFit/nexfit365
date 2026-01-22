#!/usr/bin/env node
/**
 * Script para reemplazar todas las URLs hardcodeadas de localhost:8000
 * por buildApiUrl() en los archivos del frontend
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const frontendDir = __dirname.replace('/scripts', '');

// Función para reemplazar en un archivo
function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Patrón para encontrar fetch('http://localhost:8000/api/...')
  const patterns = [
    {
      // fetch('http://localhost:8000/api/endpoint')
      regex: /fetch\(['"](http:\/\/localhost:8000\/api\/[^'"]+)['"]/g,
      replacement: (match, url) => {
        const endpoint = url.replace('http://localhost:8000/api/', '');
        return `fetch(buildApiUrl('${endpoint}'))`;
      }
    },
    {
      // `http://localhost:8000/api/endpoint${variable}`
      regex: /`http:\/\/localhost:8000\/api\/([^`]+)`/g,
      replacement: (match, endpoint) => {
        return `buildApiUrl(\`${endpoint}\`)`;
      }
    },
    {
      // "http://localhost:8000/api/endpoint"
      regex: /["']http:\/\/localhost:8000\/api\/([^"']+)["']/g,
      replacement: (match, endpoint) => {
        return `buildApiUrl('${endpoint}')`;
      }
    }
  ];

  patterns.forEach(({ regex, replacement }) => {
    const newContent = content.replace(regex, replacement);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  });

  if (modified) {
    // Asegurar que tiene el import de buildApiUrl
    if (!content.includes("import { buildApiUrl }") && !content.includes("from '@/lib/api'")) {
      const importLine = "import { buildApiUrl } from '@/lib/api'";
      // Buscar la última línea de imports
      const importMatch = content.match(/(import .+ from .+\n)+/);
      if (importMatch) {
        content = content.replace(importMatch[0], importMatch[0] + importLine + '\n');
      } else {
        // Si no hay imports, añadir al principio
        content = importLine + '\n' + content;
      }
    }
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

// Buscar todos los archivos .ts y .tsx en hooks
const hooksDir = path.join(frontendDir, 'hooks');
const files = execSync(`find ${hooksDir} -name "*.ts" -o -name "*.tsx"`, { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(f => f);

let totalFixed = 0;
files.forEach(file => {
  if (replaceInFile(file)) {
    totalFixed++;
  }
});


