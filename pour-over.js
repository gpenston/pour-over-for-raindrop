// pour-over.js
import dotenv from 'dotenv';
import axios from 'axios';
import nodemailer from 'nodemailer';
import dayjs from 'dayjs';

dotenv.config();

// Constants
const MAX_ITEMS_TO_SHOW = 7;
const ARCHIVE_FETCH_LIMIT = 100;
const TOP_TAGS_COUNT = 10;
const RECOMMENDATIONS_COUNT = 5;
const MIN_ITEMS_THRESHOLD = 5;
const RAINDROP_ITEMS_PER_PAGE = 50;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // Initial delay, doubles each retry

// Config
const COLLECTION_ID   = process.env.COLLECTION_ID;
const ARCHIVE_ID      = process.env.ARCHIVE_ID;
const RAINDROP_TOKEN  = process.env.RAINDROP_TOKEN;
const NEWS_API_KEY    = process.env.NEWS_API_KEY;
const DIGEST_SCHEDULE = (process.env.DIGEST_SCHEDULE || 'weekly').toLowerCase().trim();
const DIGEST_TIME     = (process.env.DIGEST_TIME     || 'morning').toLowerCase().trim();
const FORCE_SEND      = process.env.FORCE_SEND === 'true';
const SMTP_HOST       = process.env.SMTP_HOST || 'smtp.mail.me.com';
const SMTP_PORT       = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE     = process.env.SMTP_SECURE === 'true';
const SMTP_USER       = process.env.SMTP_USER;
const SMTP_PASS       = process.env.SMTP_PASS;
const FROM_EMAIL      = process.env.FROM_EMAIL;
const TO_EMAIL        = process.env.TO_EMAIL;

// HTML escape helper to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Validate required environment variables
function validateEnv() {
  const required = {
    COLLECTION_ID,
    RAINDROP_TOKEN,
    SMTP_USER,
    SMTP_PASS,
    FROM_EMAIL,
    TO_EMAIL
  };
  
  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n💡 Copy env.example to .env and fill in your values.');
    process.exit(1);
  }
  
  console.log('✅ Environment variables validated');
}

// Check if the digest should run now based on DIGEST_SCHEDULE and DIGEST_TIME
// The workflow fires 3x/day (3, 15, 19 UTC); this function gates whether to actually send.
function shouldRunNow() {
  if (FORCE_SEND) {
    console.log('🚀 Manual trigger — bypassing schedule check');
    return true;
  }

  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcDay  = now.getUTCDay(); // 0=Sun … 6=Sat

  // Map fuzzy time labels to the UTC hours the workflow fires at
  const timeToUtcHour = { morning: 15, noon: 19, night: 3 };
  const targetHour = timeToUtcHour[DIGEST_TIME] ?? 15;

  if (utcHour !== targetHour) {
    console.log(`⏰ Skipping — not the right time slot (now ${utcHour}:00 UTC, '${DIGEST_TIME}' fires at ${targetHour}:00 UTC)`);
    return false;
  }

  // Parse DIGEST_SCHEDULE into a set of day numbers
  const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

  let targetDays;
  if (DIGEST_SCHEDULE === 'daily') {
    return true; // Any day is fine
  } else if (DIGEST_SCHEDULE === 'weekly') {
    targetDays = new Set([0]); // Sunday
  } else {
    // Support comma or hyphen separated day names/abbreviations/numbers
    // e.g. "mon,wed,fri"  "tue-thu"  "1,3,5"  "saturday"
    const parts = DIGEST_SCHEDULE.split(/[\s,\-]+/);
    targetDays = new Set(parts.map(p => {
      const n = parseInt(p, 10);
      if (!isNaN(n) && n >= 0 && n <= 6) return n;
      const idx = DAY_NAMES.findIndex(d => d.startsWith(p.slice(0, 3)));
      return idx >= 0 ? idx : null;
    }).filter(d => d !== null));
  }

  if (targetDays.has(utcDay)) return true;

  console.log(`📅 Skipping — today is ${DAY_NAMES[utcDay]}, schedule is '${DIGEST_SCHEDULE}'`);
  return false;
}

// Retry wrapper with exponential backoff
async function retryWithBackoff(fn, context = 'Operation') {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES;
      const statusCode = error.response?.status;
      const errorMsg = error.response?.data?.message || error.message;
      
      // Don't retry on client errors (4xx) except rate limits
      if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
        console.error(`❌ ${context} failed with client error ${statusCode}: ${errorMsg}`);
        throw error;
      }
      
      if (isLastAttempt) {
        console.error(`❌ ${context} failed after ${MAX_RETRIES} attempts: ${errorMsg}`);
        throw error;
      }
      
      const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`⚠️ ${context} failed (attempt ${attempt}/${MAX_RETRIES}): ${errorMsg}`);
      console.warn(`   Retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

// Fetch items from a Raindrop collection
async function getRaindropItems(collectionId, perpage = RAINDROP_ITEMS_PER_PAGE) {
  console.log(`🔍 Fetching items from collection ${collectionId}…`);
  const url = `https://api.raindrop.io/rest/v1/raindrops/${collectionId}?perpage=${perpage}&sort=-created`;
  
  return retryWithBackoff(async () => {
    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${RAINDROP_TOKEN}` }
    });
    
    if (!data || !Array.isArray(data.items)) {
      console.error('⚠️ Unexpected API response structure:', data);
      return [];
    }
    
    console.log(`🔢 Fetched ${data.items.length} items from collection ${collectionId}`);
    return data.items;
  }, `Raindrop API (collection ${collectionId})`);
}

// Detect listicle-style titles (e.g. "Top 10 Tips", "5 Ways to...")
function isListicle(title) {
  return (
    /^(Top|Best)\s/i.test(title) ||
    /^\d+\s+(Essential|Must|Key|Critical|Important|Powerful|Proven)/i.test(title) ||
    /\d+\s+(Tips|Strategies|Ways|Things|Trends|Reasons|Steps|Lessons)/i.test(title) ||
    /:\s*\d+\s+(Tips|Strategies|Ways|Things|Trends)/i.test(title)
  );
}

// Fetch recommendations from NewsAPI using batched tag query (1 request per run)
async function getNewsRecommendations(tags, savedUrls = [], count = RECOMMENDATIONS_COUNT) {
  if (!NEWS_API_KEY) return null; // null = not configured, not a failure

  console.log(`📰 Fetching recommendations from NewsAPI for tags: ${tags.slice(0, 8).join(', ')}`);

  // Batch all tags into a single OR query — stays well under the 100 req/day free limit
  const query = tags.slice(0, 8).join(' OR ');

  try {
    const response = await retryWithBackoff(async () =>
      axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: query,
          sortBy: 'relevancy',
          pageSize: 25,
          language: 'en',
          apiKey: NEWS_API_KEY,
        }
      }), 'NewsAPI'
    );

    const articles = (response.data.articles || []).filter(a =>
      a.url &&
      a.title &&
      a.title !== '[Removed]' &&
      !savedUrls.includes(a.url) &&
      !isListicle(a.title)
    );

    console.log(`📰 NewsAPI returned ${articles.length} usable articles`);

    // Spread picks across the result set for topic diversity
    const step = Math.max(1, Math.floor(articles.length / count));
    const recs = [];
    for (let i = 0; i < articles.length && recs.length < count; i += step) {
      recs.push({ title: articles[i].title, url: articles[i].url });
    }

    console.log(`✅ Selected ${recs.length} recommendations from NewsAPI`);
    return recs; // Empty array = configured but no results; null = failed/unconfigured
  } catch (e) {
    console.warn(`⚠️ NewsAPI failed: ${e.message}`);
    return null; // Trigger fallback to AI provider
  }
}

// Build HTML email
function buildEmailHtml(items, recs = []) {
  const font = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;
  const linkColor = '#4ba3fa';
  const styles = `<style>
    body{font-family:${font};margin:0;padding:32px;background:#fff;color:#000}
    @media(prefers-color-scheme:dark){body{background:#1c1c1e;color:#f2f2f7}a{color:${linkColor}!important}hr{border-color:#333}}
    h1{font-family:'New York',Georgia,serif;font-size:2rem;margin-bottom:1.5rem}
    h2.rec{font-family:'New York',Georgia,serif;font-size:1.5rem;margin-top:2rem}
    .item,.rec-item{margin-bottom:2rem}
    img.preview{width:100%;border-radius:12px;margin-bottom:1rem}
    .title,.rec-link{font-size:1.25rem;font-weight:600;margin:0 0 .5rem;color:${linkColor};text-decoration:none}
    .description{font-size:.95rem;line-height:1.5;margin-bottom:.75rem}
    .meta{font-size:.85rem;color:#555;display:flex;align-items:center;gap:.5rem;margin-bottom:1rem;flex-wrap:wrap}
    .tag{background:#eee;border-radius:3px;padding:2px 6px;font-size:.75rem;color:#555}
    img.icon{width:12px;height:12px;vertical-align:text-bottom}
    hr{border:none;border-top:1px solid #ccc;margin:2rem 0}
  </style>`;

  const mainHtml = items.map(it => {
    const cover   = it.cover ? `<img class="preview" src="${it.cover}"/>` : '';
    const preview = `https://app.raindrop.io/my/${COLLECTION_ID}/item/${it._id}/preview`;
    
    // Safe URL parsing
    let domain = '';
    let icon = '';
    try {
      domain = new URL(it.link).hostname.replace('www.','');
      icon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch (error) {
      console.warn(`⚠️ Invalid URL for item "${it.title}": ${it.link}`);
      domain = 'unknown';
    }
    
    const date    = dayjs(it.created).format('MMM D');
    const tag     = it.tags?.[0] || '';
    const tagLink = tag
      ? `<a href="https://app.raindrop.io/my/${COLLECTION_ID}/tag/%23${encodeURIComponent(tag)}" class="tag-link"><span class="tag">#${escapeHtml(tag)}</span></a>`
      : '';

    const domainHtml = icon
      ? `<img class="icon" src="${icon}"/><a href="https://${domain}" style="color:inherit;text-decoration:none">${escapeHtml(domain)}</a>`
      : `<span>${escapeHtml(domain)}</span>`;

    return `<div class="item">
      ${cover}
      <a class="title" href="${preview}">${escapeHtml(it.title)}</a>
      ${it.excerpt ? `<div class="description">${escapeHtml(it.excerpt)}</div>` : ''}
      <div class="meta">
        ${domainHtml}
        <span>• Saved on ${date}</span>${tagLink}
      </div>
      <hr/>
    </div>`;
  }).join('');

  const recHtml = recs.length
    ? `<h2 class="rec">Recommended for You</h2>` + recs.map(r => {
        let domain = '';
        let icon2  = '';
        try {
          domain = new URL(r.url).hostname.replace('www.', '');
          icon2  = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        } catch {
          console.warn(`⚠️ Invalid URL in recommendation: ${r.url}`);
        }
        const tag2   = r.tag || '';
        const tagLink2 = tag2
          ? `<a href="https://app.raindrop.io/my/${COLLECTION_ID}/tag/%23${encodeURIComponent(tag2)}" class="tag-link"><span class="tag">#${escapeHtml(tag2)}</span></a>`
          : '';
        const domainHtml = domain ? `<img class="icon" src="${icon2}"/><a href="https://${domain}" style="color:inherit;text-decoration:none">${escapeHtml(domain)}</a>` : '';
        return `<div class="rec-item">
          <a class="rec-link" href="${escapeHtml(r.url)}">${escapeHtml(r.title)}</a>
          <div class="meta">
            ${domainHtml}${domain && tag2 ? '<span>•</span>' : ''}${tagLink2}
          </div>
          <hr/>
        </div>`;
      }).join('')
    : '';

  const signOff = '<p style="font-size:.9rem;color:#555;margin-top:1.5rem">Thanks for reading — happy bookmarking! ✨</p>';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">${styles}</head><body><h1>Your Pour Over Digest</h1>${mainHtml}${recHtml}${signOff}</body></html>`;
}

// Send via SMTP
async function sendEmail(html) {
  return retryWithBackoff(async () => {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
    
    await transporter.verify();
    console.log('✅ SMTP connection verified');
    
    await transporter.sendMail({
      from: FROM_EMAIL,
      to:   TO_EMAIL,
      subject: `Your Pour Over Digest — ${dayjs().format('MMM D, YYYY')}`,
      html
    });
    
    console.log('📧 Email sent successfully');
  }, 'SMTP email delivery');
}

// Main
(async () => {
  try {
    validateEnv();

    if (!shouldRunNow()) return; // Not the right day/time — exit cleanly

    console.log('🔑 CONFIG:', { DIGEST_SCHEDULE, DIGEST_TIME, REC_SOURCE: NEWS_API_KEY ? 'NewsAPI' : 'None' });
    
    const saved = await getRaindropItems(COLLECTION_ID);
    
    if (saved.length <= MIN_ITEMS_THRESHOLD) {
      console.log(`≤${MIN_ITEMS_THRESHOLD} items, skipping digest`);
      return;
    }
    
    const latest = saved.slice(0, MAX_ITEMS_TO_SHOW);
    console.log(`📋 Selected ${latest.length} items for digest`);

    let recs = [];
    if (ARCHIVE_ID && NEWS_API_KEY) {
      console.log(`🔍 Fetching archive items from ${ARCHIVE_ID}…`);
      const archive = await getRaindropItems(ARCHIVE_ID, ARCHIVE_FETCH_LIMIT);

      // Weight tags: Read Later (3x) + Archive (1x) to prioritize current interests
      const tagWeights = {};

      // Add Read Later tags with 3x weight (current active interests)
      saved.forEach(it => {
        (it.tags || []).forEach(tag => {
          tagWeights[tag] = (tagWeights[tag] || 0) + 3;
        });
      });

      // Add Archive tags with 1x weight (historical interests)
      archive.forEach(it => {
        (it.tags || []).forEach(tag => {
          tagWeights[tag] = (tagWeights[tag] || 0) + 1;
        });
      });

      const topTags = Object.entries(tagWeights)
        .sort((a, b) => b[1] - a[1])
        .map(([tag]) => tag)
        .filter(tag => {
          // Filter out year tags (2024, 2025, etc.) that cause trend-chasing
          if (/^\d{4}$/.test(tag)) return false;
          return true;
        })
        .slice(0, TOP_TAGS_COUNT);

      console.log('🔝 Top tags (weighted, filtered):', topTags);

      const savedUrls = saved.map(it => it.link).filter(Boolean);
      const newsRecs = await getNewsRecommendations(topTags, savedUrls);
      if (newsRecs && newsRecs.length > 0) {
        recs = newsRecs;
      } else if (newsRecs === null) {
        console.warn('⚠️ NewsAPI failed');
      } else {
        console.warn('⚠️ NewsAPI returned no results');
      }
    } else {
      console.warn('⚠️ ARCHIVE_ID or NEWS_API_KEY missing; skipping recommendations');
    }

    const html = buildEmailHtml(latest, recs);
    await sendEmail(html);
    
    console.log('🎉 Digest sent successfully!');
  } catch (e) {
    console.error('❌ Fatal error:', e.message);
    if (e.response) {
      console.error('Response status:', e.response.status);
      if (e.response.data) {
        console.error('Response data:', JSON.stringify(e.response.data).slice(0, 500));
      }
    }
    console.error('Stack trace:', e.stack);
    process.exit(1);
  }
})();
