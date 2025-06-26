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
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 1em; line-height: 1.6;">
      <h2 style="margin-bottom: 0.5em;">Your Read Later Digest</h2>
      <p style="color: #666; font-size: 14px;">${items.length} new item${items.length > 1 ? 's' : ''} this week</p>
      <hr style="margin: 1em 0; border: none; border-top: 1px solid #eee;" />
      ${items.map(item => {
        const url = new URL(item.link);
        const domain = url.hostname.replace(/^www\./, '');
        const title = item.title || item.link;
        const excerpt = item.excerpt || '';
        const date = new Date(item.created).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

        return `
          <div style="margin-bottom: 1.5em;">
            <a href="${item.link}" style="font-size: 17px; font-weight: 600; color: #0077cc; text-decoration: none;">
              ${title}
            </a>
            <div style="font-size: 14px; color: #444; margin-top: 0.3em;">
              ${excerpt}
            </div>
            <div style="font-size: 12px; color: #888; margin-top: 0.4em;">
              ${domain} · Saved on ${date}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
};

const sendEmail = async (html, subject) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.mail.me.com',
    port: 587,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      ciphers: 'SSLv3',
    }
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
