#!/usr/bin/env node
'use strict';

const { checkAICrawlers } = require('./index.js');

const CTA_URL = 'https://lior-seats.github.io/crawlguard-waitlist/';
const CRAWL_CHECK_URL = 'https://lior-seats.github.io/crawl-check/';

// ── ANSI helpers ─────────────────────────────────────────────────────────────
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = {
  green:  (s) => useColor ? `\x1b[32m${s}\x1b[0m` : s,
  yellow: (s) => useColor ? `\x1b[33m${s}\x1b[0m` : s,
  red:    (s) => useColor ? `\x1b[31m${s}\x1b[0m` : s,
  bold:   (s) => useColor ? `\x1b[1m${s}\x1b[0m`  : s,
  dim:    (s) => useColor ? `\x1b[2m${s}\x1b[0m`  : s,
  cyan:   (s) => useColor ? `\x1b[36m${s}\x1b[0m` : s,
};

// ── Help text ─────────────────────────────────────────────────────────────────
function showHelp() {
  console.log(`
${c.bold('ai-crawler-check')} — Check which AI crawlers your robots.txt is blocking

${c.bold('Usage:')}
  npx ai-crawler-check <url>

${c.bold('Examples:')}
  npx ai-crawler-check https://example.com
  npx ai-crawler-check example.com

${c.bold('Exit codes:')}
  0  All crawlers are blocked (or site has no robots.txt: all allowed)
  1  One or more AI crawlers have unrestricted access
  2  Network / fetch error

${c.bold('Programmatic API:')}
  const { checkAICrawlers } = require('ai-crawler-check');
  const result = await checkAICrawlers('https://example.com');
  // { blocked: ['GPTBot', ...], allowed: ['ClaudeBot', ...], ... }

${c.dim(`Get real-time monitoring: ${CTA_URL}`)}
`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const arg = process.argv[2];

  if (!arg || arg === '--help' || arg === '-h') {
    showHelp();
    process.exit(0);
  }

  if (arg === '--version' || arg === '-v') {
    const pkg = require('./package.json');
    console.log(pkg.version);
    process.exit(0);
  }

  let siteUrl = arg.trim();
  if (!siteUrl.startsWith('http')) siteUrl = 'https://' + siteUrl;

  console.log(`\n${c.dim(`Checking ${siteUrl}/robots.txt...`)}\n`);

  let result;
  try {
    result = await checkAICrawlers(siteUrl);
  } catch (err) {
    console.error(`${c.red('✗')} Error: ${err.message}\n`);
    process.exit(2);
  }

  // ── Handle missing robots.txt ─────────────────────────────────────────────
  if (result.robotsStatus === 404) {
    console.log(
      `${c.yellow('⚠')}  No robots.txt found — all AI crawlers have unrestricted access.\n`
    );
  }

  // ── Per-crawler results ───────────────────────────────────────────────────
  const PAD = 26;
  for (const r of result.results) {
    if (r.blocked) {
      console.log(`  ${c.green('✅')}  ${r.name.padEnd(PAD)} ${c.green('BLOCKED')}`);
    } else {
      console.log(`  ${c.yellow('⚠️ ')}  ${r.name.padEnd(PAD)} ${c.yellow('ALLOWED')}`);
    }
  }

  console.log('');

  // ── Summary line ──────────────────────────────────────────────────────────
  const total = result.results.length;
  const numAllowed = result.allowed.length;
  const numBlocked = result.blocked.length;

  if (numAllowed === 0) {
    console.log(c.green(`✅ All ${total} major AI crawlers are blocked.`));
    console.log(c.dim(`   Get real-time monitoring: ${CTA_URL}`));
  } else if (numBlocked === 0) {
    console.log(c.red(`🚨 None of the ${total} major AI crawlers are blocked.`));
    console.log(`   Fix this now: ${c.bold(CRAWL_CHECK_URL)}`);
    console.log(`   Get real-time monitoring: ${c.bold(CTA_URL)}`);
  } else {
    console.log(
      c.yellow(
        `⚠️  ${numAllowed} of ${total} major AI crawlers have unrestricted access.`
      )
    );
    console.log(`   Get real-time monitoring: ${c.bold(CTA_URL)}`);
  }

  console.log('');

  process.exit(numAllowed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`Unexpected error: ${err.message}`);
  process.exit(2);
});
