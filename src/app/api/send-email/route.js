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
      return Response.json(
        { error: "Données manquantes" },
        { status: 400 }
      );
    }

    await transporter.sendMail({
      from: `"GreenSense" <${process.env.GMAIL_USER}>`,
      to: recipients.join(","),
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #16a34a; padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">GreenSense</h1>
          </div>
          <div style="background-color: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px;">
            <div style="white-space: pre-wrap; color: #374151; font-size: 15px; line-height: 1.6;">
              ${message}
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Cet email a été envoyé par GreenSense Admin.
              Vous recevez cet email car vous êtes inscrit sur la plateforme GreenSense.
            </p>
          </div>
        </div>
      `,
    });

    return Response.json({ success: true, count: recipients.length });

  } catch (error) {
    console.error("Nodemailer error:", error);
    return Response.json(
      { error: "Erreur envoi email" },
      { status: 500 }
    );
  }
}