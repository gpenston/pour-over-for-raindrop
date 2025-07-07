// raindrop-digest.js
import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import nodemailer from 'nodemailer';
import dayjs from 'dayjs';

// Config from environment
const COLLECTION_ID = process.env.COLLECTION_ID;
const RAINDROP_TOKEN = process.env.RAINDROP_TOKEN;
const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL;
const TO_EMAIL = process.env.TO_EMAIL;

// Fetch items from a Raindrop collection
async function getRaindropItems(collectionId, perpage = 50) {
  console.log(`🔍 Fetching items for collection ${collectionId}...`);
  const url = `https://api.raindrop.io/rest/v1/raindrops/${collectionId}?perpage=${perpage}&sort=-created`;
  const { data } = await axios.get(url, {
    headers: { Authorization: `Bearer ${RAINDROP_TOKEN}` }
  });
  console.log(`🔢 Fetched ${data.items.length} items`);
  return data.items;
}

// Get tag-based recommendations via NewsAPI
async function getTagRecommendations(items, topTagCount = 3, perTag = 2) {
  console.log('🗂 Counting tags...');
  const tagCount = {};
  items.forEach(item => {
    (item.tags || []).forEach(tag => {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    });
  });

  const topTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topTagCount)
    .map(entry => entry[0]);

  console.log(`🔝 Top tags: ${topTags.join(', ')}`);
  const recs = [];

  for (const tag of topTags) {
    try {
      console.log(`🌐 Fetching news for tag: ${tag}`);
      const { data } = await axios.get('https://newsapi.org/v2/everything', {
        params: { q: tag, pageSize: perTag, apiKey: NEWSAPI_KEY }
      });
      data.articles.forEach(article => {
        recs.push({ title: article.title, url: article.url });
      });
    } catch (err) {
      console.warn(`⚠️ NewsAPI fetch failed for '${tag}': ${err.message}`);
    }
  }

  console.log(`✅ Collected ${recs.length} recommendations`);
  return recs;
}

// Build the email HTML
function buildEmailHtml(items, recommendations = []) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const linkColor = '#4ba3fa';
  const styles = `<style>
    body { font-family: ${fontFamily}; margin:0; padding:32px; background:#fff; color:#000; }
    @media (prefers-color-scheme: dark) {
      body { background:#1c1c1e; color:#f2f2f7; }
      a { color:${linkColor}!important; }
      hr { border-color:#333; }
    }
    h1 { font-family:'New York',Georgia,serif; font-size:2rem; margin-bottom:1.5rem; }
    h2.rec { font-size:1.5rem; margin-top:2rem; }
    .item,.rec-item { margin-bottom:2rem; }
    .title,.rec-link { font-size:1.25rem; font-weight:600; margin:0 0 .5rem; color:${linkColor}; text-decoration:none; }
    .meta { font-size:.85rem; color:#555; margin-bottom:1rem; }
    hr { border:none; border-top:1px solid #ccc; margin:2rem 0; }
  </style>`;

  const mainHtml = items.map(item => {
    const preview = `https://app.raindrop.io/my/${COLLECTION_ID}/item/${item._id}/preview`;
    const savedDate = dayjs(item.created).format('MMM D');
    return `
      <div class="item">
        <a class="title" href="${preview}">${item.title}</a>
        <div class="meta">Saved on ${savedDate}</div>
        <hr/>
      </div>`;
  }).join('');

  const recHtml = recommendations.length
    ? `<h2 class="rec">Recommended for You</h2>` + recommendations.map(rec => `
      <div class="rec-item">
        <a class="rec-link" href="${rec.url}">${rec.title}</a>
      </div>`).join('')
    : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">${styles}</head><body><h1>Your Read Later Digest</h1>${mainHtml}${recHtml}</body></html>`;
}

// Send email via iCloud SMTP
async function sendEmail(html) {
  const transporter = nodemailer.createTransport({
    host:'smtp.mail.me.com', port:587, secure:false,
    auth:{ user:SMTP_USER, pass:SMTP_PASS }
  });
  await transporter.verify();
  console.log('✅ SMTP verified');
  await transporter.sendMail({ from:FROM_EMAIL, to:TO_EMAIL, subject:`Your Read Later Digest — ${dayjs().format('MMM D, YYYY')}`, html });
}

// Main flow
(async () => {
  try {
    const saved = await getRaindropItems(COLLECTION_ID);
    if (saved.length <= 5) {
      console.log('<=5 items, skip digest.');
      return;
    }
    const latest = saved.slice(0, 7);

    let recs = [];
    if (NEWSAPI_KEY) {
      recs = await getTagRecommendations(latest);
    } else {
      console.warn('⚠️ NEWSAPI_KEY not set; skipping recommendations.');
    }

    const html = buildEmailHtml(latest, recs);
    await sendEmail(html);
    console.log('✅ Digest sent with recommendations!');
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
})();
