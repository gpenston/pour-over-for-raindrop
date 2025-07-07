// raindrop-digest.js
import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import nodemailer from 'nodemailer';
import dayjs from 'dayjs';

// Config
const COLLECTION_ID = process.env.COLLECTION_ID;
const RAINDROP_TOKEN = process.env.RAINDROP_TOKEN;
const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL;
const TO_EMAIL = process.env.TO_EMAIL;

// Fetch items from Raindrop
async function getRaindropItems(collectionId, perpage = 50) {
  console.log(`🔍 Fetching items from collection ${collectionId}…`);
  const url = `https://api.raindrop.io/rest/v1/raindrops/${collectionId}?perpage=${perpage}&sort=-created`;
  const { data } = await axios.get(url, {
    headers: { Authorization: `Bearer ${RAINDROP_TOKEN}` }
  });
  console.log(`🔢 Fetched ${data.items.length} items.`);
  return data.items;
}

// Tag-based recs via NewsAPI
async function getTagRecommendations(items, topTagCount = 3, perTag = 2) {
  const tagCount = {};
  items.forEach(item => {
    (item.tags || []).forEach(tag => {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    });
  });
  const topTags = Object.entries(tagCount)
    .sort((a,b) => b[1] - a[1])
    .slice(0, topTagCount)
    .map(([tag]) => tag);
  console.log(`🔝 Top tags: ${topTags.join(', ')}`);

  const recs = [];
  for (const tag of topTags) {
    try {
      console.log(`🌐 Searching NewsAPI for "${tag}"…`);
      const { data } = await axios.get('https://newsapi.org/v2/everything', {
        params: { q: tag, pageSize: perTag, apiKey: NEWSAPI_KEY }
      });
      data.articles.forEach(a => recs.push({ title: a.title, url: a.url }));
    } catch (e) {
      console.warn(`⚠️ NewsAPI failed for ${tag}: ${e.message}`);
    }
  }
  console.log(`✅ Collected ${recs.length} recommendations.`);
  return recs;
}

// Build email HTML
function buildEmailHtml(items, recommendations = []) {
  const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const linkColor = '#4ba3fa';
  const styles = `<style>
    body{font-family:${font};margin:0;padding:32px;background:#fff;color:#000}
    @media(prefers-color-scheme:dark){body{background:#1c1c1e;color:#f2f2f7}a{color:${linkColor}!important}.meta{color:#aaa!important}hr{border-color:#333}}
    h1{font-family:'New York',Georgia,serif;font-size:2rem;margin-bottom:1.5rem}
    h2.rec{font-size:1.5rem;margin-top:2rem}
    .item,.rec-item{margin-bottom:2rem}
    img.preview{width:100%;border-radius:12px;margin-bottom:1rem}
    .title,.rec-link{font-size:1.25rem;font-weight:600;margin:0 0 .5rem;color:${linkColor};text-decoration:none}
    .description{font-size:.95rem;line-height:1.5;margin-bottom:.75rem;color:inherit}
    .meta{font-size:.85rem;color:#555;display:flex;align-items:center;gap:.5rem;margin-bottom:1rem}
    img.icon{width:16px;height:16px;vertical-align:text-bottom}
    hr{border:none;border-top:1px solid #ccc;margin:2rem 0}
  </style>`;

  const mainHtml = items.map(item => {
    const cover = item.cover ? `<img class="preview" src="${item.cover}" alt="cover"/>` : '';
    const previewUrl = `https://app.raindrop.io/my/${COLLECTION_ID}/item/${item._id}/preview`;
    const domain = new URL(item.link).hostname.replace('www.','');
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    const date = dayjs(item.created).format('MMM D');
    return `
      <div class="item">
        ${cover}
        <a class="title" href="${previewUrl}">${item.title}</a>
        ${item.excerpt?`<div class="description">${item.excerpt}</div>`:''}
        <div class="meta">
          <img class="icon" src="${favicon}" alt="favicon"/>
          <a href="https://${domain}" style="color:inherit;text-decoration:none">${domain}</a>
          <span>• Saved on ${date}</span>
        </div>
        <hr/>
      </div>`;
  }).join('');

  const recHtml = recommendations.length
    ? `<h2 class="rec">Recommended for You</h2>` +
      recommendations.map(r => {
        const dom = new URL(r.url).hostname.replace('www.','');
        const fav = `https://www.google.com/s2/favicons?domain=${dom}&sz=32`;
        return `
          <div class="rec-item">
            <a class="rec-link" href="${r.url}">${r.title}</a>
            <div class="meta">
              <img class="icon" src="${fav}" alt="favicon"/>
              <a href="https://${dom}" style="color:inherit;text-decoration:none">${dom}</a>
            </div>
          </div>`;
      }).join('')
    : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">${styles}</head><body><h1>Your Read Later Digest</h1>${mainHtml}${recHtml}</body></html>`;
}

// Send via iCloud SMTP
async function sendEmail(html) {
  const transporter = nodemailer.createTransport({host:'smtp.mail.me.com',port:587,secure:false,auth:{user:SMTP_USER,pass:SMTP_PASS}});
  await transporter.verify(); console.log('✅ SMTP verified');
  const info = await transporter.sendMail({from:FROM_EMAIL,to:TO_EMAIL,subject:`Your Read Later Digest — ${dayjs().format('MMM D, YYYY')}`,html});
  console.log('📧 Sent:',info.messageId);
}

// Main
(async()=>{
  try{
    const saved = await getRaindropItems(COLLECTION_ID);
    if(saved.length<=5){console.log('<=5 items, skipping');return}
    const latest = saved.slice(0,7);
    let recs = [];
    if(NEWSAPI_KEY){ recs = await getTagRecommendations(latest) }
    else{ console.warn('⚠️ NEWSAPI_KEY not set, skipping recs') }
    const html = buildEmailHtml(latest,recs);
    await sendEmail(html);
    console.log('✅ Digest sent!');
  }catch(e){console.error('❌ Error:',e);process.exit(1)}
})();
