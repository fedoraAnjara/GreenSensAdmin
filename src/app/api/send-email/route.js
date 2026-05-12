import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(request) {
  try {
    const { recipients, subject, message } = await request.json();

    if (!recipients?.length || !subject || !message) {
      return Response.json({ error: "Données manquantes" }, { status: 400 });
    }

    await transporter.sendMail({
      from: `"GreenSense" <${process.env.GMAIL_USER}>`,
      to: recipients.join(","),
      subject,
      html: `
  <div style="margin:0;padding:0;background:#f3f7f4;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:620px;margin:0 auto;padding:24px;">
      
      <div style="background:linear-gradient(135deg,#166534,#22c55e);padding:28px;border-radius:18px 18px 0 0;text-align:center;">
        <h1 style="margin:0;color:white;font-size:28px;letter-spacing:0.5px;">
          GreenSense
        </h1>
        <p style="margin:8px 0 0;color:#dcfce7;font-size:14px;">
          Empowering healthier lives through smart nutrition and sustainable agriculture
        </p>
      </div>

      <div style="background:white;padding:30px;border-radius:0 0 18px 18px;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
        
        <div style="color:#1f2937;font-size:16px;line-height:1.7;white-space:pre-wrap;">
          ${message.trim()}
        </div>

        <div style="margin:28px 0;padding:18px;background:#f0fdf4;border-left:4px solid #22c55e;border-radius:10px;">
          <p style="margin:0;color:#166534;font-size:14px;">
            Thank you for trusting GreenSense.
          </p>
        </div>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;" />

        <p style="color:#6b7280;font-size:12px;line-height:1.5;margin:0;text-align:center;">
          This email was sent by <strong>GreenSense Admin</strong>.<br/>
          You are receiving this email because you are registered on the GreenSense platform.
        </p>

        <p style="color:#9ca3af;font-size:11px;margin-top:16px;text-align:center;">
          © ${new Date().getFullYear()} GreenSense.
        </p>
      </div>

    </div>
  </div>
`,
    });

    return Response.json({ success: true, count: recipients.length });
  } catch (error) {
    console.error("Nodemailer error:", error);
    return Response.json({ error: "Erreur envoi email" }, { status: 500 });
  }
}
