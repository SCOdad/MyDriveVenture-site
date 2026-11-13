const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const card=fs.readFileSync('assets/js/family-card-profile.js','utf8');
const profile=fs.readFileSync('assets/js/profile.js','utf8');
test('Florida time-in-stage numerator capped at denominator on Family Hub',()=>{
 assert.ok(card.includes("r.requirement_type==='PriorStageMonths'?Math.min(n.actual,n.required):n.actual"));
 assert.ok(profile.includes("r.requirement_type==='PriorStageMonths'?Math.min(progress.actual,progress.required):progress.actual"));
});
