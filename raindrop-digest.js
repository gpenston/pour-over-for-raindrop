// raindrop-digest.js
import axios from 'axios';
import nodemailer from 'nodemailer';
import dayjs from 'dayjs';

// --- CONFIG FROM ENV VARS ---
const {
  RAINDROP_TOKEN,
  COLLECTION_ID,
  SMTP_USER,
  SMTP_PASS,
  TO_EMAIL,
  FROM_EMAIL
} = process.env;

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
        <li style="margin-bottom: 1em;">
          <a href="${item.link}" style="font-size: 16px;">${item.title || item.link}</a><br>
          <span style="color: #666;">${item.excerpt || ''}</span>
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
  try {
    const items = await fetchBookmarks();
    const html = buildHTML(items);
    const subject = `Your Read Later Digest: ${dayjs().subtract(7, 'day').format('MMM D')} – ${dayjs().format('MMM D')}`;
    await sendEmail(html, subject);
    console.log('Digest sent successfully.');
  } catch (err) {
    console.error('Error sending digest:', err);
    process.exit(1);
  }
};

main();
