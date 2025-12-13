// raindrop-digest.js
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
const OPENAI_API_KEY  = process.env.OPENAI_API_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const AI_PROVIDER     = process.env.AI_PROVIDER || 'openai'; // 'openai' or 'perplexity'
const SMTP_USER       = process.env.SMTP_USER;
const SMTP_PASS       = process.env.SMTP_PASS;
const FROM_EMAIL      = process.env.FROM_EMAIL;
const TO_EMAIL        = process.env.TO_EMAIL;

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

// Ask AI for recommendations, fallback on error
async function getRecommendations(tags, recentTitles, count = RECOMMENDATIONS_COUNT) {
  console.log(`💡 Generating ${count} recommendations for tags: ${tags.join(', ')}`);
  
  // Determine which AI provider to use
  const usePerplexity = AI_PROVIDER === 'perplexity' || (PERPLEXITY_API_KEY && !OPENAI_API_KEY);
  
  if (usePerplexity && !PERPLEXITY_API_KEY) {
    console.warn('⚠️ Perplexity selected but no API key provided');
    return [];
  }
  
  if (!usePerplexity && !OPENAI_API_KEY) {
    console.warn('⚠️ OpenAI selected but no API key provided');
    return [];
  }
  
  // Build context string from recent article titles
  const contextStr = recentTitles && recentTitles.length > 0
    ? `\n\nRecent articles I've saved: "${recentTitles.slice(0, 8).join('"; "')}"`
    : '';
  
  const apiConfig = usePerplexity ? {
    url: 'https://api.perplexity.ai/chat/completions',
    key: PERPLEXITY_API_KEY,
    model: 'sonar-pro',
    name: 'Perplexity',
    prompt: `You are a helpful recommendation engine with web search capabilities. ` +
            `I'm interested in these topics: ${tags.join(', ')}.${contextStr}\n\n` +
            `Based on these interests, search the web and find ${count} recent, high-quality articles ` +
            `published in the last 3 months that align with my reading patterns. ` +
            `Focus on authoritative sources and avoid surface-level content. ` +
            `Respond with a JSON array of objects having "title" and "url" fields. Only return the JSON, no other text.`
  } : {
    url: 'https://api.openai.com/v1/chat/completions',
    key: OPENAI_API_KEY,
    model: 'gpt-4o-mini',
    name: 'OpenAI',
    prompt: `I'm interested in: ${tags.join(', ')}.${contextStr}\n\n` +
            `Suggest ${count} recent, high-quality articles that match these interests. ` +
            `Respond with a JSON array of objects having "title" and "url" fields.`
  };
  
  console.log(`🤖 Using ${apiConfig.name} for recommendations`);
  
  try {
    const recs = await retryWithBackoff(async () => {
      const res = await axios.post(
        apiConfig.url,
        {
          model: apiConfig.model,
          messages: [
            { role: 'system', content: 'You are a helpful recommendation engine.' },
            { role: 'user',   content: apiConfig.prompt }
          ],
          temperature: 0.7,
          max_tokens: 1000
        },
        { headers: { Authorization: `Bearer ${apiConfig.key}` } }
      );
      
      let text = res.data.choices[0].message.content.trim();
      
      // Handle markdown code blocks (```json ... ```)
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        text = jsonMatch[1];
      }
      
      const recs = JSON.parse(text);
      
      if (!Array.isArray(recs)) {
        console.warn(`⚠️ ${apiConfig.name} response is not an array`);
        return [];
      }
      
      console.log(`✅ Generated ${recs.length} recommendations from ${apiConfig.name}`);
      return recs;
    }, `${apiConfig.name} API`);
    
    return recs;
  } catch (e) {
    // Gracefully degrade - recommendations are optional
    console.warn(`⚠️ Could not generate recommendations: ${e.response?.status || e.message}`);
    if (e.response?.data) {
      console.warn('   Response data:', JSON.stringify(e.response.data).slice(0, 200));
    }
    return [];
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
      ? `<a href="https://app.raindrop.io/my/${COLLECTION_ID}/tag/%23${encodeURIComponent(tag)}" class="tag-link"><span class="tag">#${tag}</span></a>`
      : '';
    
    const domainHtml = icon
      ? `<img class="icon" src="${icon}"/><a href="https://${domain}" style="color:inherit;text-decoration:none">${domain}</a>`
      : `<span>${domain}</span>`;

    return `<div class="item">
      ${cover}
      <a class="title" href="${preview}">${it.title}</a>
      ${it.excerpt ? `<div class="description">${it.excerpt}</div>` : ''}
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
          ? `<a href="https://app.raindrop.io/my/${COLLECTION_ID}/tag/%23${encodeURIComponent(tag2)}" class="tag-link"><span class="tag">#${tag2}</span></a>`
          : '';
        const domainHtml = domain ? `<img class="icon" src="${icon2}"/><a href="https://${domain}" style="color:inherit;text-decoration:none">${domain}</a>` : '';
        return `<div class="rec-item">
          <a class="rec-link" href="${r.url}">${r.title}</a>
          <div class="meta">
            ${domainHtml}<span>${domain ? '•' : ''}</span>${tagLink2}
          </div>
          <hr/>
        </div>`;
      }).join('')
    : '';

  const signOff = '<p style="font-size:.9rem;color:#555;margin-top:1.5rem">Thanks for reading — happy bookmarking! ✨</p>';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">${styles}</head><body><h1>Your Read Later Digest</h1>${mainHtml}${recHtml}${signOff}</body></html>`;
}

// Send via iCloud SMTP
async function sendEmail(html) {
  return retryWithBackoff(async () => {
    const transporter = nodemailer.createTransport({
      host: 'smtp.mail.me.com',
      port: 587,
      secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
    
    await transporter.verify();
    console.log('✅ SMTP connection verified');
    
    await transporter.sendMail({
      from: FROM_EMAIL,
      to:   TO_EMAIL,
      subject: `Your Read Later Digest — ${dayjs().format('MMM D, YYYY')}`,
      html
    });
    
    console.log('📧 Email sent successfully');
  }, 'SMTP email delivery');
}

// Main
(async () => {
  try {
    validateEnv();
    
    const aiKey = PERPLEXITY_API_KEY ? 'Perplexity' : (OPENAI_API_KEY ? 'OpenAI' : 'None');
    console.log('🔑 CONFIG:', { COLLECTION_ID, ARCHIVE_ID, AI_PROVIDER: aiKey });
    
    const saved = await getRaindropItems(COLLECTION_ID);
    
    if (saved.length <= MIN_ITEMS_THRESHOLD) {
      console.log(`≤${MIN_ITEMS_THRESHOLD} items, skipping digest`);
      return;
    }
    
    const latest = saved.slice(0, MAX_ITEMS_TO_SHOW);
    console.log(`📋 Selected ${latest.length} items for digest`);

    let recs = [];
    if (ARCHIVE_ID && (OPENAI_API_KEY || PERPLEXITY_API_KEY)) {
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
        .slice(0, TOP_TAGS_COUNT)
        .map(([tag]) => tag);
      
      console.log('🔝 Top tags (weighted):', topTags);
      
      // Extract recent article titles for context
      const recentTitles = saved.slice(0, 10).map(it => it.title);
      console.log(`📖 Using ${recentTitles.length} recent article titles for context`);
      
      recs = await getRecommendations(topTags, recentTitles);
    } else {
      console.warn('⚠️ ARCHIVE_ID or AI API key missing; skipping recommendations');
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
