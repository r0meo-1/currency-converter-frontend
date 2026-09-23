import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setImmediate } from 'node:timers/promises';
import test from 'node:test';
import { JSDOM } from 'jsdom';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');

async function openPage(t) {
  const dom = new JSDOM(html, {
    url: 'https://converter.example/',
    runScripts: 'outside-only',
  });
  t.after(() => dom.window.close());
  const { window } = dom;
  const requests = [];
  window.fetch = (url) => new Promise((resolve, reject) => {
    requests.push({ url, resolve, reject });
  });
  const script = window.document.querySelector('script[type="module"]').getAttribute('src');
  const bundle = await readFile(new URL(`../dist${script}`, import.meta.url), 'utf8');
  window.eval(bundle);
  assert.equal(requests.length, 1, 'initial conversion request');
  const source = window.document.querySelector('.currency__value.source');
  const result = window.document.querySelector('.currency__value.result');
  const sourceInfo = window.document.querySelector('.currency__info.source');
  const resultInfo = window.document.querySelector('.currency__info.result');
  const status = () => window.document.querySelector('[role="status"]')?.textContent;
  const input = async (element, value) => {
    element.value = value;
    element.dispatchEvent(new window.Event('input', { bubbles: true }));
    await setImmediate();
  };
  const answer = async (index, result, rate, ok = true) => {
    requests[index].resolve({ ok, json: async () => ({ result, info: { rate } }) });
    await setImmediate();
  };
  return { window, requests, source, result, sourceInfo, resultInfo, status, input, answer };
}

test('latest edit wins when responses arrive out of order', async (t) => {
  const page = await openPage(t);
  await page.input(page.source, '20');
  await page.answer(1, 40, 2);
  await page.answer(0, 2, 2);
  assert.equal(page.source.value, '20');
  assert.equal(page.result.value, '40,00');
});

test('clearing an amount invalidates a pending response', async (t) => {
  const page = await openPage(t);
  await page.input(page.source, '');
  await page.answer(0, 2, 2);
  assert.equal(page.result.value, '');
  assert.equal(page.sourceInfo.textContent, '');
  assert.equal(page.resultInfo.textContent, '');
});

test('editing the other side preserves the latest typed value and rate direction', async (t) => {
  const page = await openPage(t);
  await page.input(page.result, '10');
  await page.answer(1, 5, 0.5);
  await page.answer(0, 2, 2);
  assert.equal(page.source.value, '5,00');
  assert.equal(page.result.value, '10');
  assert.equal(page.sourceInfo.textContent, '1 ₽ = 2,00 $');
  assert.equal(page.resultInfo.textContent, '1 $ = 0,50 ₽');
});

test('network failure clears the old quote and shows a retry message', async (t) => {
  const page = await openPage(t);
  await page.answer(0, 2, 2);
  await page.input(page.source, '3');
  assert.equal(page.result.value, '', 'old result is cleared while loading');
  page.requests[1].reject(new Error('offline'));
  await setImmediate();
  assert.equal(page.result.value, '');
  assert.equal(page.sourceInfo.textContent, '');
  assert.match(page.status(), /Не удалось/);
});

test('HTTP errors cannot be displayed as a successful quote', async (t) => {
  const page = await openPage(t);
  await page.answer(0, 100, 100, false);
  assert.equal(page.result.value, '');
  assert.match(page.status(), /Не удалось/);
});

test('invalid provider payload cannot leave a partial result', async (t) => {
  const page = await openPage(t);
  await page.answer(0, 100, 0);
  assert.equal(page.result.value, '');
  assert.match(page.status(), /Не удалось/);
});

test('failure from an old request cannot erase a newer successful quote', async (t) => {
  const page = await openPage(t);
  await page.input(page.source, '3');
  await page.answer(1, 6, 2);
  page.requests[0].reject(new Error('old request failed'));
  await setImmediate();
  assert.equal(page.result.value, '6,00');
  assert.equal(page.status(), '');
});

test('changing currencies invalidates the previous currency pair', async (t) => {
  const page = await openPage(t);
  const radio = page.window.document.querySelector('input[name="result"][value="eur"]');
  radio.checked = true;
  radio.dispatchEvent(new page.window.Event('change', { bubbles: true }));
  await page.answer(1, 3, 3);
  await page.answer(0, 2, 2);
  assert.equal(page.result.value, '3,00');
  assert.equal(page.sourceInfo.textContent, '1 ₽ = 3,00 €');
});

test('successful retry clears the visible error', async (t) => {
  const page = await openPage(t);
  await page.answer(0, 0, 0, false);
  assert.match(page.status(), /Не удалось/);
  await page.input(page.source, '3');
  await page.answer(1, 6, 2);
  assert.equal(page.result.value, '6,00');
  assert.equal(page.status(), '');
});

test('swapping currencies invalidates the previous request', async (t) => {
  const page = await openPage(t);
  page.window.document.querySelector('.swap-button').click();
  await page.answer(1, 0.5, 0.5);
  await page.answer(0, 2, 2);
  assert.equal(page.result.value, '0,50');
  assert.equal(page.sourceInfo.textContent, '1 $ = 0,50 ₽');
});

test('decimal comma input is sent to the API as a decimal point', async (t) => {
  const page = await openPage(t);
  await page.input(page.source, '1,25');
  const url = new URL(page.requests[1].url);
  assert.equal(url.pathname, '/api/convert/');
  assert.equal(url.searchParams.get('amount'), '1.25');
  assert.equal(url.searchParams.get('from'), 'RUB');
  assert.equal(url.searchParams.get('to'), 'USD');
  await page.answer(1, 2.5, 2);
  assert.equal(page.source.value, '1,25');
  assert.equal(page.result.value, '2,50');
});
