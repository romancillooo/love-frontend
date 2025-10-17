#!/usr/bin/env node
/**
 * Quick smoke test for the deployed site.
 *
 * Usage:
 *   node tools/verify-deploy.mjs --url=https://your-hosting-domain/login
 *
 * Flags:
 *   --url        Target URL to verify (default: http://localhost:4200/login)
 *   --selector   CSS selector that must be present to consider the page healthy
 *                (default: .login-wrapper)
 *   --timeout    Navigation timeout in milliseconds (default: 20000)
 */

import { chromium } from 'playwright';

const DEFAULT_OPTIONS = {
  url: 'http://localhost:4200/login',
  selector: '.login-wrapper',
  timeout: 20_000
};

function parseArgs(argv) {
  return argv.slice(2).reduce((acc, arg) => {
    if (!arg.startsWith('--')) {
      return acc;
    }

    const [key, value = ''] = arg.slice(2).split('=');
    switch (key) {
      case 'url':
        acc.url = value || acc.url;
        break;
      case 'selector':
        acc.selector = value || acc.selector;
        break;
      case 'timeout':
        acc.timeout = Number.parseInt(value, 10) || acc.timeout;
        break;
      default:
        console.warn(`⚠️  Flag desconocida ignorada: --${key}`);
    }
    return acc;
  }, { ...DEFAULT_OPTIONS });
}

async function verifyDeployment(options) {
  const errors = [];
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`[console] ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    errors.push(`[pageerror] ${error.message}`);
  });

  try {
    console.log(`🚀 Abriendo ${options.url}`);
    const response = await page.goto(options.url, {
      waitUntil: 'domcontentloaded',
      timeout: options.timeout
    });

    if (!response || !response.ok()) {
      throw new Error(`Respuesta HTTP inválida: ${response?.status() ?? 'sin respuesta'}`);
    }

    await page.waitForSelector(options.selector, { timeout: options.timeout });
    console.log(`✅ Elemento crítico encontrado: ${options.selector}`);

    if (errors.length) {
      console.error('❌ Se detectaron errores durante el renderizado:');
      errors.forEach(err => console.error(`   • ${err}`));
      process.exitCode = 1;
    } else {
      console.log('✅ Sin errores de consola ni excepciones.');
    }
  } catch (error) {
    console.error('❌ La verificación falló:', error.message);
    if (errors.length) {
      errors.forEach(err => console.error(`   • ${err}`));
    }
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

const options = parseArgs(process.argv);
verifyDeployment(options).catch(error => {
  console.error('❌ Error inesperado en la verificación:', error);
  process.exit(1);
});
