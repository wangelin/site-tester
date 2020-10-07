#!/usr/bin/env node --no-warnings
const colors = require("colors/safe");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");
const { readdirSync } = require("fs");
const path = require("path");

const sites = [];

function readConfigs() {
  const files = readdirSync(path.resolve("sites"));
  for (const file of files) {
    sites.push(require(path.resolve("sites", file)));
  }
}

// polyfills
const polyfillMatchMedia = require("./polyfills/matchMedia.js");

const ok = (bool) =>
  bool ? colors.bgGreen(" OK ") : colors.bgRed(" NOT OK! ");

async function testSites() {
  let results = [];
  for (let [i, { disable, disabled, name, site, api }] of sites.entries()) {
    if (disable !== undefined && disabled === undefined) disabled = disable;
    let col = " ";
    let result = { name };
    if (disabled) {
      process.stdout.write(
        `${((i + 1).toString() + ".").padStart(3)}${col.repeat(
          3
        )}skipping ${name}\n`
      );
      result.skipped = true;
      results.push(result);
      continue;
    }
    process.stdout.write(
      `${((i + 1).toString() + ".").padStart(3)}${col.repeat(3)}testing ${name}`
    );
    if (api) {
      const { url, test, data = {} } = api;
      process.stdout.write(`\n${col}`);
      let c2 = colors.bgMagenta(" ");
      const pre = `${c2.repeat(4)} `;
      const text = `[api]  "${url}"`;
      process.stdout.write(text);
      let response = await fetch(url, { method: "POST", body: data });
      const json = await response.json();
      if (test) {
        let success;
        try {
          success = test(json);
          result.api = success;
        } catch (e) {
          result.api = false;
        }
        process.stdout.write(
          `${(pre + text).replace(/./g, "\b")}${ok(success)}${c2}${colors.reset(
            " "
          )}${text}`
        );
      }
    }
    if (site) {
      const { url, treat, wait = 0, test } = site;
      process.stdout.write(`\n${col}`);
      let c2 = colors.bgCyan(" ");
      const pre = `${c2.repeat(4)} `;
      const text = `[site] "${url}"${
        wait > 0 ? ` (wait ${wait / 1000}s)` : ""
      }`;
      process.stdout.write(pre + text);
      let response = await fetch(url);
      let markup = await response.text();
      if (treat) {
        markup = treat(markup);
      }
      const { window } = new JSDOM(markup, {
        url,
        runScripts: "dangerously",
        resources: "usable",
        pretendToBeVisual: true,
      });

      const { document } = window;
      polyfillMatchMedia(window);

      let success;
      try {
        success = await new Promise((resolve, reject) => {
          window.onload = () => {
            if (wait > 0) {
              window.setTimeout(() => {
                try {
                  const success = test(document);
                  resolve(success);
                } catch (e) {
                  resolve(false);
                }
              }, wait);
            } else {
              resolve(test(document));
            }
          };
        });
        result.site = success;
      } catch (e) {
        result.site = false;
      }
      process.stdout.write(
        `${(pre + text).replace(/./g, "\b")}${ok(success)}${c2}${colors.reset(
          " "
        )}${text}`
      );
    }
    process.stdout.write("\n".repeat(i < sites.length - 1 ? 2 : 1));
    results.push(result);
  }
  console.log("Result:");
  console.log(results);
  const errors = sites
    .map(({ name, site, api }, i) => {
      let value = { name };
      if (site && !results[i].site) value.site = true;
      if (api && !results[i].api) value.api = true;
      return value;
    })
    .filter((x) => x.site || x.api);
  const errorString = errors
    .reduce((result, { name, site, api }) => {
      return [
        ...result,
        `${name.padEnd(15)}` +
          [site ? "site DOWN!" : "", api ? "api DOWN!" : ""]
            .map((x) => x.padEnd(15))
            .join(""),
      ];
    }, [])
    .join("\n");
  if (errorString.length > 0) console.error(errorString);
  process.exit(); // wont quit otherwise
}

function main() {
  readConfigs();
  testSites();
}

main();
