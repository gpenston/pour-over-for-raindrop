// raindrop-digest.js
import dotenv from 'dotenv';
import axios from 'axios';
import nodemailer from 'nodemailer';
import dayjs from 'dayjs';

dotenv.config();

const COLLECTION_ID = process.env.COLLECTION_ID;
const RAINDROP_TOKEN = process.env.RAINDROP_TOKEN;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL;
const TO_EMAIL = process.env.TO_EMAIL;

// Fetch items from Raindrop.io
async function getRaindropItems() {
  console.log('🔍 Fetching items...');
  const url = `https://api.raindrop.io/rest/v1/raindrops/${COLLECTION_ID}?perpage=50&sort=-created`;
  const { data } = await axios.get(url, {
    headers: { Authorization: `Bearer ${RAINDROP_TOKEN}` },
  });
  return data.items;
}

// Build the email HTML content
function buildEmailHtml(items) {
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
    .item { margin-bottom: 3rem; }
    img.preview { width: 100%; border-radius: 12px; margin-bottom: 1rem; }
    .title { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem; }
    .description { font-size: 0.95rem; line-height: 1.5; margin-bottom: 0.75rem; }
    .meta { font-size: 0.85rem; color: #555; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
    img.icon { width: 16px; height: 16px; vertical-align: text-bottom; }
    hr { border: none; border-top: 1px solid #ccc; margin: 2rem 0; }
  </style>`;

  const content = items.map(item => {
    const previewUrl = `https://app.raindrop.io/my/${COLLECTION_ID}/item/${item._id}/preview`;
    const domain = new URL(item.link).hostname.replace('www.', '');
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    const savedDate = dayjs(item.created).format('MMM D');
    const readTime = item.excerpt ? `${Math.ceil(item.excerpt.split(/\s+/).length / 200)} min read` : '';

    return `
      <div class="item">
        ${item.cover ? `<img class="preview" src="${item.cover}" alt="cover" />` : ''}
        <a class="title" href="${previewUrl}" style="color: ${linkColor}; text-decoration: none;">${item.title}</a>
        ${item.excerpt ? `<div class="description">${item.excerpt}</div>` : ''}
        <div class="meta">
          <img class="icon" src="${favicon}" alt="favicon" />
          <a href="https://${domain}" style="color: inherit; text-decoration: none;">${domain}</a>
          <span>• Saved on ${savedDate}</span>
          ${readTime ? `<span>• ${readTime}</span>` : ''}
        </div>
        <hr />
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="color-scheme" content="light dark">
      <meta name="supported-color-schemes" content="light dark">
      ${styles}
    </head>
    <body>
      <h1>Your Read Later Digest</h1>
      ${content}
    </body>
    </html>
  `;
}

// Send the email via iCloud SMTP
async function sendDigestEmail(html) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.mail.me.com',
    port: 587,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  await transporter.verify();
  console.log('✅ SMTP connection successful');

  const info = await transporter.sendMail({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: `Your Read Later Digest — ${dayjs().format('MMM D, YYYY')}`,
    html
  });

  console.log('📧 Message sent:', info.messageId);
}

// Main execution
(async () => {
  try {
    const items = await getRaindropItems();
    console.log(`Total fetched: ${items.length}`);
    const recent = items.slice(0, 5);
    const older = items.slice(5);
    const random = older.sort(() => Math.random() - 0.5).slice(0, 2);
    console.log(`Recent items: ${recent.length}, Random items: ${random.length}`);

    const html = buildEmailHtml([...recent, ...random]);
    console.log(`✉️ Sending digest to: ${TO_EMAIL}`);
    await sendDigestEmail(html);
    console.log('✅ Digest sent!');
  } catch (err) {
    console.error('❌ Error sending digest:', err);
    process.exit(1);
  }
})();
