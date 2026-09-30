# ai-crawler-check

> Check which AI crawlers your `robots.txt` is blocking — as a CLI, in CI, or in your code.

[![npm version](https://img.shields.io/npm/v/ai-crawler-check.svg)](https://www.npmjs.com/package/ai-crawler-check)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

AI crawlers (GPTBot, ClaudeBot, Bytespider, and more) scrape your site for training data. This tool parses your `robots.txt` and tells you which ones have unrestricted access — so you can fix it before it costs you.

---

## Quick start

```bash
npx ai-crawler-check https://example.com
```

**Output:**

```
Checking https://example.com/robots.txt...

  ✅  GPTBot                     BLOCKED
  ⚠️   ClaudeBot                  ALLOWED
  ⚠️   anthropic-ai               ALLOWED
  ✅  meta-externalagent          BLOCKED
  ✅  Bytespider                  BLOCKED
  ⚠️   PerplexityBot              ALLOWED
  ✅  CCBot                       BLOCKED
  ✅  Google-Extended             BLOCKED

⚠️  3 of 8 major AI crawlers have unrestricted access.
   Get real-time monitoring: https://lior-seats.github.io/crawlguard-waitlist/
```

---

## Install

```bash
# Run without installing (recommended for one-off checks)
npx ai-crawler-check https://yoursite.com

# Or install globally
npm install -g ai-crawler-check
ai-crawler-check https://yoursite.com
```

---

## Crawlers checked

| Crawler | Company |
|---|---|
| GPTBot | OpenAI |
| ClaudeBot | Anthropic |
| anthropic-ai | Anthropic |
| meta-externalagent | Meta |
| Bytespider | ByteDance |
| PerplexityBot | Perplexity |
| CCBot | Common Crawl |
| Google-Extended | Google |

---

## Programmatic API

```js
const { checkAICrawlers } = require('ai-crawler-check');

const result = await checkAICrawlers('https://example.com');

console.log(result.blocked);  // ['GPTBot', 'Bytespider', ...]
console.log(result.allowed);  // ['ClaudeBot', 'PerplexityBot', ...]
console.log(result.allBlocked);  // false
```

### Return value

```ts
{
  url: string;           // Normalized input URL
  robotsUrl: string;     // Fetched robots.txt URL
  robotsStatus: number;  // HTTP status (200 / 404)
  results: Array<{
    name: string;        // Crawler name
    company: string;     // Company
    blocked: boolean;    // Whether Disallow: / is set
  }>;
  blocked: string[];     // Names of blocked crawlers
  allowed: string[];     // Names of allowed crawlers
  allBlocked: boolean;   // True if all crawlers are blocked
  noneBlocked: boolean;  // True if no crawlers are blocked
}
```

### Custom crawler list

```js
const { checkAICrawlers, AI_CRAWLERS } = require('ai-crawler-check');

// Add your own crawlers to the default list
const result = await checkAICrawlers('https://example.com', {
  crawlers: [
    ...AI_CRAWLERS,
    { name: 'MyCrawler', company: 'My Company' },
  ],
});
```

---

## Use in CI

Check your `robots.txt` on every deploy with the companion **GitHub Action**:

```yaml
- name: Check AI crawler access
  uses: lior-seats/crawl-check-action@v1
  with:
    url: 'https://yoursite.com'
    fail-on-allowed: 'true'
```

→ [lior-seats/crawl-check-action](https://github.com/lior-seats/crawl-check-action) · [GitHub Marketplace](https://github.com/marketplace/actions/check-ai-crawler-access)

---

## Exit codes

| Code | Meaning |
|---|---|
| `0` | All crawlers blocked (or no robots.txt) |
| `1` | One or more crawlers have unrestricted access |
| `2` | Network / fetch error |

---

## How it works

1. Fetches `https://<domain>/robots.txt`
2. Parses `User-agent` + `Disallow: /` directives (including wildcard `*` rules)
3. Returns per-crawler blocked/allowed status

A crawler is considered **blocked** when it (or the wildcard `*`) has a `Disallow: /` or `Disallow: /*` rule.

---

## Want real-time monitoring?

This CLI tells you the current state. **[CrawlGuard](https://lior-seats.github.io/crawlguard-waitlist/)** monitors your `robots.txt` continuously and alerts you when AI crawlers gain access — useful after deployments.

→ **[Join the CrawlGuard waitlist](https://lior-seats.github.io/crawlguard-waitlist/)**

---

## License

MIT © lior-seats
