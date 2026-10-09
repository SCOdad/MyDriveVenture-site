const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const loaderPath = path.join(__dirname, "..", "assets", "js", "ga4.js");
const source = fs.readFileSync(loaderPath, "utf8");
const taggedPages = [
  "index.html",
  "faq/index.html",
  "feedback/index.html",
  "help/index.html",
  "join/index.html",
  "privacy/index.html",
  "learn/index.html",
  "learn/requirements/index.html",
  "learn/getting-started/index.html",
  "learn/practice/index.html",
  "learn/logging/index.html",
  "learn/research/index.html",
  "learn/research/teen-drowsy-driving/index.html",
  "terms/index.html",
  "text-parker/index.html",
];

function runLoader(hostname, pathname, window = {}) {
  const scripts = [];
  const context = {
    window,
    location: { hostname, pathname },
    document: {
      createElement(tag) {
        assert.equal(tag, "script");
        return {};
      },
      head: { appendChild(script) { scripts.push(script); } },
    },
  };
  vm.runInNewContext(source, context);
  return { window, scripts };
}

test("GA4 loads once for each approved public route on production", () => {
  for (const pathname of [
    "/", "/faq/", "/feedback/", "/help/", "/join/", "/privacy/",
    "/learn/", "/learn/requirements/", "/learn/getting-started/", "/learn/practice/", "/learn/logging/",
    "/learn/research/", "/learn/research/teen-drowsy-driving/", "/terms/",
    "/text-parker/",
  ]) {
    const { window, scripts } = runLoader("mydriveventure.com", pathname);
    assert.equal(scripts.length, 1, pathname);
    assert.equal(scripts[0].async, true, pathname);
    assert.equal(scripts[0].src, "https://www.googletagmanager.com/gtag/js?id=G-VRV02KK3CC", pathname);
    assert.equal(window.dataLayer.length, 2, pathname);
    assert.equal(window.dataLayer[1][0], "config", pathname);
    assert.equal(window.dataLayer[1][1], "G-VRV02KK3CC", pathname);
  }
});

test("GA4 accepts the www production host and normalized index URLs", () => {
  const { scripts } = runLoader("www.mydriveventure.com", "/join/index.html");
  assert.equal(scripts.length, 1);
});

test("GA4 does not load on previews, app routes, or the SMS consent preview", () => {
  for (const [hostname, pathname] of [
    ["localhost", "/"],
    ["mydriveventure-site.github.io", "/"],
    ["mydriveventure.com", "/sms-consent/"],
    ["mydriveventure.com", "/log/"],
    ["mydriveventure.com", "/family/"],
    ["mydriveventure.com", "/operator/"],
  ]) {
    const { window, scripts } = runLoader(hostname, pathname);
    assert.equal(scripts.length, 0, pathname);
    assert.equal(window.dataLayer, undefined, pathname);
  }
});

test("GA4 injection is idempotent", () => {
  const window = {};
  const first = runLoader("mydriveventure.com", "/", window);
  const second = runLoader("mydriveventure.com", "/", window);
  assert.equal(first.scripts.length, 1);
  assert.equal(second.scripts.length, 0);
  assert.equal(window.dataLayer.length, 2);
});

test("all approved public pages include the GA4 loader", () => {
  for (const file of taggedPages) {
    const html = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
    assert.match(html, /\/assets\/js\/ga4\.js\?v=2026\d{4}-[\w-]+/ , file);
  }
});
