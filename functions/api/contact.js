export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();

    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const subject = String(formData.get("subject") || "").trim();
    const message = String(formData.get("message") || "").trim();

    if (!name || !email || !subject || !message) {
      return new Response("Bitte füllen Sie alle Pflichtfelder aus.", {
        status: 400,
      });
    }

    if (!isValidEmail(email)) {
      return new Response("Bitte geben Sie eine gültige E-Mail-Adresse ein.", {
        status: 400,
      });
    }

    const safeName = name.slice(0, 120);
    const safeEmail = email.slice(0, 160);
    const safeSubject = subject.slice(0, 140);
    const safeMessage = message.slice(0, 5000);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.5; color: #111;">
        <h2 style="margin: 0 0 16px 0;">Neue Nachricht über das Kontaktformular</h2>

        <p><strong>Name:</strong> ${escapeHtml(safeName)}</p>
        <p><strong>E-Mail:</strong> ${escapeHtml(safeEmail)}</p>
        <p><strong>Betreff:</strong> ${escapeHtml(safeSubject)}</p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

        <p style="white-space: pre-wrap;">${escapeHtml(safeMessage)}</p>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Elysium Kontaktformular <kontakt@mail.elysiumgunclub.com>",
        to: ["info@elysiumgunclub.com"],
        reply_to: safeEmail,
        subject: `Kontaktformular: ${safeSubject}`,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Resend Fehler:", errorText);

      return new Response(
        "Die Nachricht konnte leider nicht gesendet werden. Bitte versuchen Sie es später erneut.",
        { status: 500 }
      );
    }

    return new Response(
      "Vielen Dank. Ihre Nachricht wurde erfolgreich gesendet.",
      { status: 200 }
    );
  } catch (error) {
    console.error("Kontaktformular Fehler:", error);

    return new Response(
      "Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es später erneut.",
      { status: 500 }
    );
  }
}

export async function onRequestGet() {
  return new Response("Method not allowed", { status: 405 });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}