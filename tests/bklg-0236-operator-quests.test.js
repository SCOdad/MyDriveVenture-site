const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const home = fs.readFileSync('operator/index.html','utf8');
const config = fs.readFileSync('operator/config.js','utf8');
const catalog = fs.readFileSync('operator/quests/index.html','utf8');
const catalogJs = fs.readFileSync('operator/quests/operator.js','utf8');
const dictionary = fs.readFileSync('operator/dictionary/index.html','utf8');
const dictionaryJs = fs.readFileSync('operator/dictionary/operator.js','utf8');

test('BKLG-0236 exposes Quests as a first-class Operator Home tool', () => {
  assert.match(home, /href="\/operator\/quests\/">Quests<\/a>/);
  assert.match(home, /<h3>Quests<\/h3>/);
  assert.match(home, /Quest Catalog/);
  assert.match(config, /DV_OPERATOR_QUESTS_ENDPOINT/);
});

test('BKLG-0236 provides a read-only searchable quest catalog', () => {
  assert.match(catalog, /<h1>Quest Catalog<\/h1>/);
  assert.match(catalog, /id="quest-search"/);
  assert.match(catalog, /id="quest-type"/);
  assert.match(catalog, /id="quest-status"/);
  assert.match(catalogJs, /quest_key/);
  assert.match(catalogJs, /description/);
  assert.match(catalogJs, /target/);
  assert.match(catalogJs, /Inactive/);
  assert.doesNotMatch(catalog, /Save quest|Create quest|Delete quest|Edit quest/);
});

test('BKLG-0236 Dictionary searches and selects existing quests with Destination-first ordering', () => {
  assert.match(dictionary, /id="quest-search"/);
  assert.match(dictionary, /id="quest-search-results"/);
  assert.match(dictionary, /id="selected-quest"/);
  assert.match(dictionaryJs, /function renderQuestSearch/);
  assert.match(dictionaryJs, /quest_type==='Destination'/);
  assert.match(dictionaryJs, /data-quest-key/);
  assert.match(dictionaryJs, /View in Quest Catalog/);
  assert.match(dictionaryJs, /questEndpoint=window\.DV_OPERATOR_QUESTS_ENDPOINT/);
});


test('BKLG-0236 derives operator-quests endpoint when cached operator config is stale', () => {
  assert.match(catalogJs, /DV_OPERATOR_QUESTS_ENDPOINT\|\|window\.DV_ENVIRONMENT_CONFIG\?\.functionUrl\?\.\('operator-quests'\)/);
  assert.match(dictionaryJs, /DV_OPERATOR_QUESTS_ENDPOINT\|\|window\.DV_ENVIRONMENT_CONFIG\?\.functionUrl\?\.\('operator-quests'\)/);
});
