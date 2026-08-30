const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const html = fs.readFileSync('operator/backlog/index.html', 'utf8');
const js = fs.readFileSync('operator/backlog/operator.js', 'utf8');
const enhancements = fs.readFileSync('operator/backlog/enhancements.js', 'utf8');

test('required backlog fields use native validation and the shared required marker', () => {
  const form = html.match(/<form id="detail-form"[\s\S]*?<\/form>/)?.[0] || '';
  for (const name of ['status', 'priority', 'category', 'title']) {
    const marker = new RegExp('field-label\">[^<]*<span class=\"required-marker\"[^>]*>\\*</span>[\\s\\S]*?name=\"' + name + '\"[^>]*required');
    assert.match(form, marker);
  }
});

test('Category uses the approved provisional canonical dropdown', () => {
  const select = html.match(/<select name="category" required>[\s\S]*?<\/select>/)?.[0] || '';
  const values = [...select.matchAll(/<option(?: value="([^"]*)")?>([^<]+)<\/option>/g)].map(match => match[1] ?? match[2]);
  assert.deepEqual(values, ['', 'Product', 'Web / UX', 'Visual / Brand', 'Quest Engine', 'Data', 'Platform / Infrastructure', 'Technical Debt', 'Operations', 'Operator', 'Communications / Text Parker', 'Documentation']);
});

test('historical Category values are preserved while editing existing items', () => {
  assert.match(js, /function category\(v=''\)/);
  assert.match(js, /dataset\.historical==='true'/);
  assert.match(js, /new Option\(/);
  assert.match(js, /category\(x\.category\)/);
  assert.match(js, /form\.reset\(\);category\(''\);val\('status','BACKLOG'\);val\('priority','P3'\)/);
});

test('top and bottom Save changes controls share the same detail form submit path', () => {
  const form = html.match(/<form id="detail-form"[\s\S]*?<\/form>/)?.[0] || '';
  const submitButtons = form.match(/<button[^>]*type="submit"[^>]*>Save changes<\/button>/g) || [];
  assert.equal(submitButtons.length, 2);
  assert.match(form, /id="save-item-top"/);
  assert.match(form, /id="save-item"/);
  assert.doesNotMatch(js, /getElementById\('save-item-top'\)/);
});

test('Operator API requests resolve the current session and perform one bounded refresh retry', () => {
  assert.match(js, /async function accessToken\(refresh=false\)/);
  assert.match(js, /client\.auth\.getSession\(\)/);
  assert.match(js, /client\.auth\.refreshSession\(\)/);
  assert.match(js, /r\.status===401/);
  assert.match(js, /authentication required/);
  assert.doesNotMatch(js, /let client,token=/);
});

test('terminal state styling outranks P0 and P1 queue backgrounds', () => {
  assert.match(enhancements, /priority-p0:not\(\.terminal\):not\(\.current-active\)/);
  assert.match(enhancements, /priority-p1:not\(\.terminal\):not\(\.current-active\)/);
  assert.match(enhancements, /\.backlog-row\.terminal\.priority-p0,\.backlog-row\.terminal\.priority-p1\{border-left-color:#45a565\}/);
});
