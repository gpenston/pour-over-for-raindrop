// raindrop-digest.js
import dotenv from 'dotenv';
import axios from 'axios';
import nodemailer from 'nodemailer';
import dayjs from 'dayjs';

dotenv.config();

// Config
const COLLECTION_ID    = process.env.COLLECTION_ID;
const ARCHIVE_ID       = process.env.ARCHIVE_ID;
const RAINDROP_TOKEN   = process.env.RAINDROP_TOKEN;
const OPENAI_API_KEY   = process.env.OPENAI_API_KEY;
const SMTP_USER        = process.env.SMTP_USER;
const SMTP_PASS        = process.env.SMTP_PASS;
const FROM_EMAIL       = process.env.FROM_EMAIL;
const TO_EMAIL         = process.env.TO_EMAIL;

// Fetch items from a Raindrop collection
async function getRaindropItems(collectionId, perpage = 50) {
  console.log(`🔍 Fetching items from ${collectionId}…`);
  const url = `https://api.raindrop.io/rest/v1/raindrops/${collectionId}?perpage=${perpage}&sort=-created`;
  const { data } = await axios.get(url, {
    headers: { Authorization: `Bearer ${RAINDROP_TOKEN}` }
  });
  console.log(`🔢 Fetched ${data.items.length} items.`);
  return data.items;
}

// Ask OpenAI for 5 article recs given top tags
async function getRecommendations(tags, count = 5) {
  console.log(`💡 Generating ${count} recs for tags: ${tags.join(', ')}`);
  const prompt = `Here are my top tags: ${tags.join(', ')}. `
               + `Suggest ${count} recent, high-quality articles not already in my Read Later list. `
               + `Respond with a pure JSON array of objects, each having "title" and "url" fields.`;
  
  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful recommendation engine.' },
        { role: 'user',   content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    },
    { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
  );

  const text = res.data.choices[0].message.content.trim();
  try {
    const recs = JSON.parse(text);
    console.log(`✅ Parsed ${recs.length} recs from OpenAI.`);
    return recs;
  } catch {
    console.warn('⚠️ Failed to parse JSON. Returning empty recs.');
    return [];
  }
}

// Build the HTML email
function buildEmailHtml(items, recs = []) {
  const font = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;
  const linkColor = '#4ba3fa';
  const styles = `<style>
    body{font-family:${font};margin:0;padding:32px;background:#fff;color:#000}
    @media(prefers-color-scheme:dark){
      body{background:#1c1c1e;color:#f2f2f7}
      a{color:${linkColor}!important}
      hr{border-color:#333}
    }
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
    const dom     = new URL(it.link).hostname.replace('www.','');
    const icon    = `https://www.google.com/s2/favicons?domain=${dom}&sz=32`;
    const date    = dayjs(it.created).format('MMM D');
    const tag     = it.tags?.[0]||'';
    const tagLink = tag
      ? `<a href="https://app.raindrop.io/my/${COLLECTION_ID}/tag/%23${encodeURIComponent(tag)}" class="tag-link"><span class="tag">#${tag}</span></a>`
      : '';

    return `<div class="item">
      ${cover}
      <a class="title" href="${preview}">${it.title}</a>
      ${it.excerpt?`<div class="description">${it.excerpt}</div>`:''}
      <div class="meta">
        <img class="icon" src="${icon}"/><a href="https://${dom}" style="color:inherit;text-decoration:none">${dom}</a>
        <span>• Saved on ${date}</span>${tagLink}
      </div><hr/>
    </div>`;
  }).join('');

  const recHtml = recs.length
    ? `<h2 class="rec">Recommended for You</h2>` + recs.map(r => {
        const dom = new URL(r.url).hostname.replace('www.','');
        const ico = `https://www.google.com/s2/favicons?domain=${dom}&sz=32`;
        return `<div class="rec-item">
          <a class="rec-link" href="${r.url}">${r.title}</a>
          <div class="meta">
            <img class="icon" src="${ico}"/><a href="https://${dom}" style="color:inherit;text-decoration:none">${dom}</a>
            <span>•</span>
            <a href="https://app.raindrop.io/my/${COLLECTION_ID}/tag/%23${encodeURIComponent(r.tag)}" class="tag-link"><span class="tag">#${r.tag}</span></a>
          </div><hr/>
        </div>`;
      }).join('')
    : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    ${styles}</head><body><h1>Your Read Later Digest</h1>${mainHtml}${recHtml}</body></html>`;
}

// Send via iCloud SMTP
async function sendEmail(html) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.mail.me.com',
    port: 587,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
  await transporter.verify(); console.log('✅ SMTP ok');
  await transporter.sendMail({
    from: FROM_EMAIL,
    to:   TO_EMAIL,
    subject: `Your Read Later Digest — ${dayjs().format('MMM D, YYYY')}`,
    html
  });
  console.log('📧 Sent');
}

// Main
(async () => {
  try {
    const saved = await getRaindropItems(COLLECTION_ID);
    if (saved.length <= 5) { console.log('≤5 items, skipping'); return; }
    const latest = saved.slice(0, 7);

    let recs = [];
    if (ARCHIVE_ID && OPENAI_API_KEY) {
      const archive = await getRaindropItems(ARCHIVE_ID, 100);
      // build tag list
      const count = {};
      archive.forEach(it => (it.tags||[]).forEach(t=>count[t]=(count[t]||0)+1));
      const topTags = Object.entries(count)
        .sort((a,b)=>b[1]-a[1]).slice(0,10).map(([t])=>t);
      recs = await getRecommendations(topTags, 5);
    }

    const html = buildEmailHtml(latest, recs);
    await sendEmail(html);
  } catch (e) {
    console.error('❌', e);
    process.exit(1);
  }
})();
