// raindrop-digest.js

const axios = require('axios');
const nodemailer = require('nodemailer');
const dayjs = require('dayjs');

// --- CONFIG (replace with env vars or secrets) ---
const RAINDROP_TOKEN = process.env.RAINDROP_TOKEN;
const COLLECTION_ID = process.env.COLLECTION_ID;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const TO_EMAIL = process.env.TO_EMAIL;
const FROM_EMAIL = process.env.FROM_EMAIL;
// -----------------------------------------------

const fetchBookmarks = async () => {
  const since = dayjs().subtract(7, 'day').toISOString();

  const res = await axios.get(
    `https://api.raindrop.io/rest/v1/raindrops/${COLLECTION_ID}`,
    {
      headers: {
        Authorization: `Bearer ${RAINDROP_TOKEN}`,
      },
      params: {
        perpage: 50,
        sort: '-created',
      },
    }
  );

  return res.data.items.filter(item => item.created >= since);
};

const buildHTML = (items) => {
  if (!items.length) return '<p>No new Read Later items this week.</p>';

  return `
    <h2>Your Read Later Digest</h2>
    <ul>
      ${items
        .map(
          (item) => `
        <li>
          <a href="${item.link}">${item.title || item.link}</a><br>
          ${item.excerpt || ''}
        </li>`
        )
        .join('')}
    </ul>
  `;
};

const sendEmail = async (html, subject) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject,
    html,
  });
};

const main = async () => {
  const items = await fetchBookmarks();
  const html = buildHTML(items);
  const subject = `Your Read Later Digest: ${dayjs().subtract(7, 'day').format('MMM D')} – ${dayjs().format('MMM D')}`;

  await sendEmail(html, subject);
};

main().catch(console.error);
