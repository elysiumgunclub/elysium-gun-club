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

    return new Response(renderSuccessPage(), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
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

function renderSuccessPage() {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nachricht erfolgreich gesendet · Elysium Gun Club e.V.</title>
  <link rel="icon" type="image/svg+xml" href="/images/logo.svg?v=2">
  <link rel="alternate icon" type="image/png" href="/images/logo.png?v=2">
  <style>
    :root {
      --bg: #020b17;
      --bg-soft: #071528;
      --text: #ffffff;
      --muted: rgba(255, 255, 255, 0.72);
      --line: rgba(255, 255, 255, 0.14);
      --blue: #006ee6;
      --blue-hover: #0a7cff;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at 50% 18%, rgba(0, 110, 230, 0.24), transparent 32%),
        linear-gradient(180deg, var(--bg-soft), var(--bg));
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 20px;
    }

    .success-page {
      width: min(760px, 100%);
      text-align: center;
      position: relative;
    }

    .watermark {
      width: 260px;
      height: 260px;
      object-fit: contain;
      opacity: 0.13;
      position: absolute;
      left: 50%;
      top: -58px;
      transform: translateX(-50%);
      pointer-events: none;
      user-select: none;
      filter: saturate(0.9) contrast(1.05);
    }

    .content {
      position: relative;
      padding-top: 142px;
    }

    .status {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 28px;
      padding: 8px 14px;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--muted);
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.02em;
      background: rgba(255, 255, 255, 0.04);
      backdrop-filter: blur(10px);
    }

    .check {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--blue);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      line-height: 1;
      color: #fff;
    }

    h1 {
      margin: 0;
      font-size: clamp(42px, 8vw, 82px);
      line-height: 0.95;
      letter-spacing: -0.055em;
      font-weight: 800;
    }

    h2 {
      margin: 24px 0 0;
      font-size: clamp(25px, 4vw, 38px);
      line-height: 1.12;
      letter-spacing: -0.035em;
      font-weight: 800;
    }

    p {
      max-width: 620px;
      margin: 18px auto 0;
      color: var(--muted);
      font-size: clamp(17px, 2vw, 20px);
      line-height: 1.58;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      justify-content: center;
      margin-top: 38px;
    }

    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 48px;
      padding: 0 26px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.07em;
      text-decoration: none;
      text-transform: uppercase;
      transition: transform 180ms ease, background 180ms ease, border-color 180ms ease;
    }

    .button-primary {
      background: var(--blue);
      color: #fff;
      box-shadow: 0 18px 50px rgba(0, 110, 230, 0.22);
    }

    .button-secondary {
      border: 1px solid var(--line);
      color: #fff;
      background: rgba(255, 255, 255, 0.04);
    }

    .button:hover {
      transform: translateY(-1px);
    }

    .button-primary:hover {
      background: var(--blue-hover);
    }

    .button-secondary:hover {
      border-color: rgba(255, 255, 255, 0.32);
    }

    @media (max-width: 560px) {
      body {
        align-items: flex-start;
        padding-top: 48px;
      }

      .watermark {
        width: 220px;
        height: 220px;
        top: -34px;
      }

      .content {
        padding-top: 126px;
      }

      .actions {
        flex-direction: column;
      }

      .button {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <main class="success-page">
    <img class="watermark" src="/images/logo.svg" alt="" aria-hidden="true" />

    <section class="content" aria-labelledby="success-title">
      <div class="status"><span class="check">✓</span> Nachricht übermittelt</div>
      <h1>Danke.</h1>
      <h2 id="success-title">Deine Nachricht wurde erfolgreich gesendet.</h2>
      <p>
        Vielen Dank für deine Anfrage an den Elysium Gun Club e.V. Wir haben deine Nachricht erhalten
        und melden uns schnellstmöglich bei dir zurück.
      </p>

      <div class="actions">
        <a class="button button-primary" href="/">Zur Startseite</a>
        <a class="button button-secondary" href="/#kontakt">Zurück zum Kontakt</a>
      </div>
    </section>
  </main>
</body>
</html>`;
}