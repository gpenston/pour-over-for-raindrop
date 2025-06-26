// … keep your existing imports and getRaindropItems / buildEmailHtml …

async function sendDigestEmail(html) {
  console.log('🔌 Setting up SMTP transport…');
  const transporter = nodemailer.createTransport({
    host: 'smtp.mail.me.com',
    port: 587,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  try {
    console.log('🔍 Verifying SMTP connection…');
    await transporter.verify();
    console.log('✅ SMTP connection successful');
  } catch (verifyErr) {
    console.error('❌ SMTP verify failed:', verifyErr);
    throw verifyErr;
  }

  console.log(`✉️ About to send email from ${FROM_EMAIL} to ${TO_EMAIL}`);
  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      subject: `Your Read Later Digest — ${dayjs().format('MMM D, YYYY')}`,
      html
    });
    console.log('📧 Message sent:', info.messageId);
  } catch (sendErr) {
    console.error('❌ sendMail failed:', sendErr);
    throw sendErr;
  }
}

// … rest of your main() that calls sendDigestEmail() …
