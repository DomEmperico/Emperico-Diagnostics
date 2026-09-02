export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/send-results" && request.method === "POST") {
      try {
        const data = await request.json();
        const { email, tool, subject, summary } = data;

        if (!email || typeof email !== "string" || !email.includes("@")) {
          return json({ ok: false, error: "A valid email is required." }, 400);
        }

        // NOTE: using Resend's shared test domain (onboarding@resend.dev) for now,
        // because empericogroup.com is not yet verified in Resend. In sandbox mode
        // Resend will only actually deliver to the email address the Resend account
        // itself was signed up with - other recipients will get a rejected response.
        // Once empericogroup.com is verified (see Resend > Domains), change "from"
        // below to something like: "Emperico Diagnostics <results@empericogroup.com>"
        const resendResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: "Emperico Diagnostics <onboarding@resend.dev>",
            to: [email],
            bcc: ["dom@empericogroup.com", "mark@empericogroup.com"],
            subject: subject || (tool ? `Your ${tool} results` : "Your diagnostic results"),
            text: summary || ""
          })
        });

        if (!resendResp.ok) {
          const errText = await resendResp.text();
          return json({ ok: false, error: "Email service error", detail: errText }, 502);
        }

        return json({ ok: true });
      } catch (err) {
        return json({ ok: false, error: "Unexpected error", detail: String(err) }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
