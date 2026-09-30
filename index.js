'use strict';

const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Major AI crawlers to check.
 * @type {Array<{name: string, company: string}>}
 */
const AI_CRAWLERS = [
  { name: 'GPTBot',             company: 'OpenAI' },
  { name: 'ClaudeBot',          company: 'Anthropic' },
  { name: 'anthropic-ai',       company: 'Anthropic' },
  { name: 'meta-externalagent', company: 'Meta' },
  { name: 'Bytespider',         company: 'ByteDance' },
  { name: 'PerplexityBot',      company: 'Perplexity' },
  { name: 'CCBot',              company: 'Common Crawl' },
  { name: 'Google-Extended',    company: 'Google' },
];

/**
 * Fetch the robots.txt content for a site URL.
 * @param {string} siteUrl
 * @param {number} redirectsLeft
 * @returns {Promise<{content: string, status: number, robotsUrl: string}>}
 */
function fetchRobotsTxt(siteUrl, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(siteUrl);
    } catch (e) {
      return reject(new Error(`Invalid URL: ${siteUrl}`));
    }

    const robotsUrl = `${parsed.protocol}//${parsed.hostname}/robots.txt`;
    const client = parsed.protocol === 'https:' ? https : http;

    const req = client.request(
      {
        hostname: parsed.hostname,
        path: '/robots.txt',
        method: 'GET',
        headers: {
          'User-Agent':
            'ai-crawler-check/1.0 (+https://github.com/lior-seats/ai-crawler-check)',
        },
        timeout: 10000,
      },
      (res) => {
        const loc = res.headers.location;
        if (
          [301, 302, 307, 308].includes(res.statusCode) &&
          loc &&
          redirectsLeft > 0
        ) {
          return resolve(
            fetchRobotsTxt(new URL(loc, robotsUrl).href, redirectsLeft - 1)
          );
        }
        if (res.statusCode === 404) {
          return resolve({ content: '', status: 404, robotsUrl });
        }
        if (res.statusCode !== 200) {
          return reject(
            new Error(`HTTP ${res.statusCode} fetching ${robotsUrl}`)
          );
        }
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ content: body, status: 200, robotsUrl }));
      }
    );
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out after 10s'));
    });
    req.on('error', reject);
    req.end();
  });
}

/**
 * Determine whether a given bot is blocked in robots.txt content.
 * A bot is considered "blocked" when it (or `*`) has `Disallow: /` or
 * `Disallow: /*`.
 *
 * @param {string} content - Full robots.txt text
 * @param {string} botName - User-agent name (case-insensitive match)
 * @returns {boolean}
 */
function isBlocked(content, botName) {
  if (!content || !content.trim()) return false;

  const bot = botName.toLowerCase();
  const lines = content
    .split('\n')
    .map((l) => l.split('#')[0].trim())
    .filter(Boolean);

  let currentAgents = [];
  let currentDisallowAll = false;
  let blocked = false;

  const commit = () => {
    const matches = currentAgents.some((a) => a === bot || a === '*');
    if (matches && currentDisallowAll) blocked = true;
    currentAgents = [];
    currentDisallowAll = false;
  };

  for (const line of lines) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (field === 'user-agent') {
      if (currentAgents.length) commit();
      currentAgents.push(value.toLowerCase());
    } else if (field === 'disallow') {
      if (value === '/' || value === '/*') currentDisallowAll = true;
    }
  }
  if (currentAgents.length) commit();

  return blocked;
}

/**
 * Check which AI crawlers a site's robots.txt is blocking.
 *
 * @param {string} siteUrl - URL of the site to check (e.g. "https://example.com")
 * @param {object} [options]
 * @param {Array<{name: string, company: string}>} [options.crawlers] - Override the default crawler list
 * @returns {Promise<{
 *   url: string,
 *   robotsUrl: string,
 *   robotsStatus: number,
 *   results: Array<{name: string, company: string, blocked: boolean}>,
 *   blocked: string[],
 *   allowed: string[],
 *   allBlocked: boolean,
 *   noneBlocked: boolean
 * }>}
 */
async function checkAICrawlers(siteUrl, options = {}) {
  const crawlers = options.crawlers || AI_CRAWLERS;

  let normalizedUrl = siteUrl;
  if (!normalizedUrl.startsWith('http')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  const { content, status, robotsUrl } = await fetchRobotsTxt(normalizedUrl);

  const results = crawlers.map((crawler) => ({
    name: crawler.name,
    company: crawler.company,
    blocked: isBlocked(content, crawler.name),
  }));

  const blocked = results.filter((r) => r.blocked).map((r) => r.name);
  const allowed = results.filter((r) => !r.blocked).map((r) => r.name);

  return {
    url: normalizedUrl,
    robotsUrl,
    robotsStatus: status,
    results,
    blocked,
    allowed,
    allBlocked: allowed.length === 0,
    noneBlocked: blocked.length === 0,
  };
}

module.exports = { checkAICrawlers, AI_CRAWLERS };
