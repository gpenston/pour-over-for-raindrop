// raindrop-digest.js
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import axios from 'axios';
dotenv.config();

const RAINDROP_TOKEN = process.env.RAINDROP_TOKEN;
const COLLECTION_ID = process.env.COLLECTION_ID;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL;
const TO_EMAIL = process.env.TO_EMAIL;

const getRaindropItems = async () => {
  const res = await axios.get(`https://api.raindrop.io/rest/v1/raindrops/${COLLECTION_ID}`, {
    headers: { Authorization: `Bearer ${RAINDROP_TOKEN}` }
  });
  return res.data.items;
};

const buildEmailHTML = (items) => {
  const styles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        background: white;
        color: #111;
        margin: 0;
        padding: 2rem;
      }
      @media (prefers-color-scheme: dark) {
        body {
          background: #1c1c1e;
          color: #fefefe;
        }
        a {
          color: #61a8ff;
        }
      }
      h2 {
        font-family: "New York", Georgia, serif;
        font-size: 1.3rem;
        margin: 1rem 0 0.5rem;
      }
      .item {
        margin-bottom: 2rem;
      }
      .meta {
        font-size: 0.85rem;
        color: #555;
        margin: 0.25rem 0;
      }
      .desc {
        font-size: 0.9rem;
        margin: 0.5rem 0;
      }
    </style>
  `;

  const entries = items.map(item => {
    const previewUrl = `https://app.raindrop.io/my/${COLLECTION_ID}/item/${item._id}/preview`;
    const icon = item.domain ? `https://www.google.com/s2/favicons?sz=64&domain_url=${item.domain}` : '';
    return `
      <div class="item">
        ${item.cover ? `<a href="${previewUrl}"><img src="${item.cover}" style="max-width:100%; border-radius:12px" /></a>` : ''}
        <h2><a href="${previewUrl}" style="text-decoration:none; color:#007aff">${item.title}</a></h2>
        ${item.excerpt ? `<div class="desc">${item.excerpt}</div>` : ''}
        <div class="meta">
          ${icon ? `<img src="${icon}" width="16" height="16" style="vertical-align:middle; margin-right:4px;" />` : ''}
          <a href="${item.link}" style="font-size:0.85rem">(Original)</a> &nbsp; • &nbsp; Saved on ${new Date(item.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      </div>
    `;
  });

  return `
    <html>
      <head>${styles}</head>
      <body>
        <h1>Your Read Later Digest</h1>
        ${entries.join('')}
      </body>
    </html>
  `;
};

const sendEmail = async (html) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.mail.me.com',
    port: 587,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: 'Your Read Later Digest',
    html
  });
};

const run = async () => {
  console.log('Fetching items...');
  const items = await getRaindropItems();

  const sorted = items.sort((a, b) => new Date(b.created) - new Date(a.created));
  const recent = sorted.slice(0, 5);
  const remaining = sorted.slice(5);
  const random = remaining.sort(() => 0.5 - Math.random()).slice(0, 2);

  const finalItems = [...recent, ...random];
  console.log(`Total fetched: ${items.length}`);
  console.log(`Recent items: ${recent.length}`);
  console.log(`Random items: ${random.length}`);

  const html = buildEmailHTML(finalItems);
  console.log(`Sending email to: ${TO_EMAIL}`);
  await sendEmail(html);
};

run().catch(err => {
  console.error('Error sending digest:', err);
  process.exit(1);
});
