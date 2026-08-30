const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const backlogHtml = fs.readFileSync('operator/backlog/index.html', 'utf8');
const backlogJs = fs.readFileSync('operator/backlog/operator.js', 'utf8');
const backlogEnhancements = fs.readFileSync('operator/backlog/enhancements.js', 'utf8');
const feedbackEnhancements = fs.readFileSync('operator/feedback/enhancements.js', 'utf8');

test('Operator backlog resolves the current session token for each API request and retries one auth failure', () => {
  assert.match(backlogJs, /async function currentAccessToken\(forceRefresh=false\)/);
  assert.match(backlogJs, /client\.auth\.getSession\(\)/);
  assert.match(backlogJs, /client\.auth\.refreshSession\(\)/);
  assert.match(backlogJs, /r\.status===401/);
  assert.match(backlogJs, /authentication required/);
  assert.match(backlogJs, /client\.auth\.onAuthStateChange/);
});

test('standalone backlog creation remains available from Backlog Manager', () => {
  assert.match(backlogHtml, /id="new-item"[^>]*>New item<\/button>/);
  assert.match(backlogJs, /if\(creating\).*?api\('create',data\)/s);
  assert.match(backlogJs, /Created \$\{out\.backlog_code\}/);
});

test('canonical required backlog fields use the shared red required marker and native validation', () => {
  for (const name of ['status', 'priority', 'category', 'title']) {
    assert.match(backlogHtml, new RegExp(`field-label">[^<]*<span class="required-marker"[^>]*>\\*</span>[\\s\\S]*?name="${name}"[^>]*required`));
  }
});

test('top and bottom Save changes controls submit the same detail form', () => {
  const form = backlogHtml.match(/<form id="detail-form"[\s\S]*?<\/form>/)?.[0] || '';
  const saveButtons = form.match(/<button[^>]*type="submit"[^>]*>Save changes<\/button>/g) || [];
  assert.equal(saveButtons.length, 2);
  assert.match(form, /id="save-item-top"/);
  assert.match(form, /id="save-item"/);
  assert.doesNotMatch(backlogJs, /getElementById\('save-item-top'\)/);
});

test('terminal state wins over P0 and P1 queue styling', () => {
  assert.match(backlogEnhancements, /priority-p0:not\(\.terminal\):not\(\.current-active\)/);
  assert.match(backlogEnhancements, /priority-p1:not\(\.terminal\):not\(\.current-active\)/);
  assert.match(backlogEnhancements, /\.backlog-row\.terminal\.priority-p0,\.backlog-row\.terminal\.priority-p1\{background:rgba\(69,165,101,\.22\)/);
  assert.match(backlogEnhancements, /border-left-color:#45a565/);
});

test('Feedback create-and-link continues to use the canonical backlog create API then link the returned code', () => {
  assert.match(feedbackEnhancements, /action:'create'/);
  assert.match(feedbackEnhancements, /created\.backlog_code/);
  assert.match(feedbackEnhancements, /action:'link_backlog'/);
});
