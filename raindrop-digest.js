// raindrop-digest.js
import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import nodemailer from 'nodemailer';
import dayjs from 'dayjs';

const COLLECTION_ID = process.env.COLLECTION_ID;
const ARCHIVE_ID = process.env.ARCHIVE_ID;
const RAINDROP_TOKEN = process.env.RAINDROP_TOKEN;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL;
const TO_EMAIL = process.env.TO_EMAIL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Fetch items from a Raindrop collection
async function getRaindropItems(collectionId, perpage = 50) {
  const url = `https://api.raindrop.io/rest/v1/raindrops/${collectionId}?perpage=${perpage}&sort=-created`;
  const { data } = await axios.get(url, {
    headers: { Authorization: `Bearer ${RAINDROP_TOKEN}` },
  });
  return data.items;
}

// Generate recommendations via OpenAI based on archive history
async function getRecommendations(archiveItems, count = 3) {
  // Build a prompt listing titles
  const sample = archiveItems.slice(0, 10).map(i => `- ${i.title}`).join('\n');
  const prompt = `You are a helpful recommendation engine. Based on these previously read articles:\n${sample}\n\nSuggest ${count} recent, high-quality articles (title and URL only) that the user would find valuable.`;

  const resp = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You recommend content.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    },
    { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
  );

  const text = resp.data.choices[0].message.content;
  try {
    // Expect JSON array
    const list = JSON.parse(text);
    return list.slice(0, count);
  } catch {
    // Fallback: parse lines
    return text.split('\n').filter(Boolean).slice(0, count).map(line => {
      const match = line.match(/^(.*)\s+(https?:\/\/\S+)/);
      return match ? { title: match[1].trim(), url: match[2] } : null;
    }).filter(Boolean);
  }
}

// Build HTML for main items and recommendations
function buildEmailHtml(items, recommendations = []) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const linkColor = '#4ba3fa';
  const styles = `<style>
    body { font-family: ${fontFamily}; margin: 0; padding: 32px; background: #fff; color: #000; }
    @media (prefers-color-scheme: dark) {
      body { background: #1c1c1e; color: #f2f2f7; }
      a { color: ${linkColor} !important; }
      .meta { color: #aaa !important; }
      hr { border-color: #333; }
    }
    h1 { font-family: 'New York', Georgia, serif; font-size: 2rem; margin-bottom: 1.5rem; }
    h2.rec { font-size: 1.5rem; margin-top: 2rem; }
    .item, .rec-item { margin-bottom: 2rem; }
    img.preview { width: 100%; border-radius: 12px; margin-bottom: 1rem; }
    .title, .rec-link { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem; color: ${linkColor}; text-decoration: none; }
    .description { font-size: 0.95rem; line-height: 1.5; margin-bottom: 0.75rem; }
    .meta { font-size: 0.85rem; color: #555; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
    img.icon { width: 16px; height: 16px; vertical-align: text-bottom; }
    hr { border: none; border-top: 1px solid #ccc; margin: 2rem 0; }
  </style>`;

  // Main saved items
  const mainHtml = items.map(item => {
    const preview = `https://app.raindrop.io/my/${COLLECTION_ID}/item/${item._id}/preview`;
    const domain = new URL(item.link).hostname.replace('www.', '');
    const savedDate = dayjs(item.created).format('MMM D');
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    return `
    <div class="item">
      ${item.cover ? `<img class="preview" src="${item.cover}" alt="cover"/>` : ''}
      <a class="title" href="${preview}">${item.title}</a>
      ${item.excerpt ? `<div class="description">${item.excerpt}</div>` : ''}
      <div class="meta">
        <img class="icon" src="${favicon}" alt="favicon"/>
        <a href="https://${domain}">${domain}</a>
        <span>• Saved on ${savedDate}</span>
      </div>
      <hr/>
    </div>`;
  }).join('');

  // Recommendations
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
    host: 'smtp.mail.me.com', port: 587, secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
  await transporter.verify();
  await transporter.sendMail({ from: FROM_EMAIL, to: TO_EMAIL, subject: `Your Read Later Digest — ${dayjs().format('MMM D, YYYY')}`, html });
}

// Main flow
(async () => {
  try {
    const saved = await getRaindropItems(COLLECTION_ID);
    if (saved.length <= 5) return console.log('<=5 items, skip.');
    const latest = saved.slice(0, 7);
    const archive = await getRaindropItems(ARCHIVE_ID, 20);
    const recs = await getRecommendations(archive, 3);
    const html = buildEmailHtml(latest, recs);
    await sendEmail(html);
    console.log('Digest sent with recommendations!');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
