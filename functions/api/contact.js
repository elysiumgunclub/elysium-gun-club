export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();

    const firstname = String(formData.get("firstname") || "").trim();
    const lastname = String(formData.get("lastname") || "").trim();
    const fallbackName = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const topic = String(formData.get("topic") || formData.get("subject") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const privacyAccepted = formData.get("privacy") !== null;

    const fullName = `${firstname} ${lastname}`.trim() || fallbackName;

    if (!fullName || !email || !message) {
      return new Response("Bitte füllen Sie alle Pflichtfelder aus.", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    if (!privacyAccepted) {
      return new Response("Bitte bestätigen Sie die Datenschutzerklärung.", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    if (!isValidEmail(email)) {
      return new Response("Bitte geben Sie eine gültige E-Mail-Adresse ein.", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const safeName = fullName.slice(0, 160);
    const safeEmail = email.slice(0, 160);
    const safeTopic = topic.slice(0, 140) || "Kontaktformular";
    const safeMessage = message.slice(0, 5000);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.5; color: #111;">
        <h2 style="margin: 0 0 16px 0;">Neue Nachricht über das Kontaktformular</h2>

        <p><strong>Name:</strong> ${escapeHtml(safeName)}</p>
        <p><strong>E-Mail:</strong> ${escapeHtml(safeEmail)}</p>
        <p><strong>Betreff:</strong> ${escapeHtml(safeTopic)}</p>

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
        subject: `Kontaktformular: ${safeTopic}`,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Resend Fehler:", errorText);

      return new Response(
        "Die Nachricht konnte leider nicht gesendet werden. Bitte versuchen Sie es später erneut.",
        {
          status: 500,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }
      );
    }

    return new Response(
      "Vielen Dank. Ihre Nachricht wurde erfolgreich gesendet.",
      {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }
    );
  } catch (error) {
    console.error("Kontaktformular Fehler:", error);

    return new Response(
      "Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es später erneut.",
      {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }
    );
  }
}

export async function onRequestGet() {
  return new Response("Method not allowed", {
    status: 405,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
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