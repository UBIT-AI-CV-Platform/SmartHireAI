import { test } from '@playwright/test';
import * as fs from 'fs';

const URL = 'http://localhost:3000';

test('extract all visible text from public pages', async ({ page }) => {
  const pages = [
    { name: 'landing', url: '/' },
    { name: 'auth', url: '/auth' },
  ];

  let report = '';

  for (const p of pages) {
    await page.goto(`${URL}${p.url}`);
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    report += `\n\n=== ${p.name.toUpperCase()} (${p.url}) ===\n${text}`;
  }

  fs.writeFileSync('tests/page-text-dump.txt', report);
  console.log('Text extracted — check tests/page-text-dump.txt');
});
