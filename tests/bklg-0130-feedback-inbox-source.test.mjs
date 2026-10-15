import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../operator/feedback/operator.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../operator/feedback/index.html',import.meta.url),'utf8');
assert.match(html,/id="feedback-source-filter"/,'Inbox exposes a source filter');
assert.match(js,/feedback-source-filter/,'Inbox binds the source filter');
assert.match(js,/f\.source===sourceFilter\.value/,'Source filter excludes other sources');
assert.match(js,/Source: \$\{esc\(f\.source/,'Inbox identifies individual message origins');
assert.match(js,/Sender identity unverified/,'Unknown identity does not become registered by email association');
