import "server-only";
import { Resend } from "resend";
import upcomiLogo from "@/assets/brand/upcomi-logo-horizontal-orange.png";
import { getCanonicalUrl } from "@/lib/seo";

const NOTIFICATION_FROM = "Upcomi <onboarding@resend.dev>";
// The resend.dev sender can only email the address of the Resend account.
const NOTIFICATION_RECIPIENTS = ["dev@upcomi.cc"];

type EventProposalNotification = {
  eventId: number;
  eventName: string;
  startDate: string;
  endDate: string | null;
  city: string;
  country: string | null;
  organizer: string;
  contactName: string | null;
  contactEmail: string;
  routeCount: number;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

// This notification must never turn a saved proposal into a failed submission.
export async function sendEventProposalNotification(proposal: EventProposalNotification): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      console.warn("Event proposal email skipped: missing configuration", {
        eventId: proposal.eventId,
        missing: ["RESEND_API_KEY"],
      });
      return;
    }

    const dates = proposal.endDate && proposal.endDate !== proposal.startDate
      ? `${formatDate(proposal.startDate)} au ${formatDate(proposal.endDate)}`
      : formatDate(proposal.startDate);
    const details: [string, string][] = [
      ["Événement", proposal.eventName],
      ["Dates", dates],
      ["Lieu", [proposal.city, proposal.country].filter(Boolean).join(", ")],
      ["Organisateur", proposal.organizer],
      ["Contact", proposal.contactName || "Non renseigné"],
      ["Email de contact", proposal.contactEmail],
      ["Nombre de parcours", String(proposal.routeCount)],
      ["Référence", String(proposal.eventId)],
    ];
    const adminUrl = getCanonicalUrl("/admin?tab=proposals");
    const logoUrl = getCanonicalUrl(upcomiLogo.src);
    const text = [
      "Nouvelle proposition d’événement",
      "Une nouvelle proposition attend votre validation.",
      "",
      ...details.map(([label, value]) => `${label} : ${value}`),
      "",
      `Consulter les propositions : ${adminUrl}`,
    ].join("\n");
    const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Nouvelle proposition d’événement</title>
    <link href="https://fonts.googleapis.com/css2?family=Averia+Serif+Libre:wght@400;700&family=Work+Sans:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
      @media only screen and (max-width: 480px) {
        .email-outer { padding: 12px 8px !important; }
        .email-content { padding: 28px 20px !important; }
        .email-heading { font-size: 30px !important; }
        .email-details, .email-details tbody, .detail-row { display: block !important; width: 100% !important; }
        .detail-label, .detail-value { display: block !important; width: auto !important; }
        .detail-label { padding: 12px 0 2px !important; border-bottom: 0 !important; }
        .detail-value { padding: 0 0 12px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#f3ebdf;color:#24170f;font-family:'Work Sans',Arial,sans-serif;-webkit-text-size-adjust:100%">
    <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${escapeHtml(proposal.eventName)} : une nouvelle proposition attend votre validation.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3ebdf">
      <tr><td class="email-outer" align="center" style="padding:28px 16px">
        <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
          <tr><td style="padding:0 12px 20px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td><a href="${escapeHtml(getCanonicalUrl())}" style="text-decoration:none"><img src="${escapeHtml(logoUrl)}" alt="Upcomi" width="168" height="56" style="display:block;border:0;width:168px;height:56px;color:#eb5f3b;font-size:28px;font-family:Georgia,serif"></a></td>
                <td align="right" style="font-size:12px;line-height:18px;color:#78604d">Alerte interne</td>
              </tr>
            </table>
          </td></tr>
          <tr><td class="email-content" bgcolor="#fff9f1" style="padding:36px 40px;border-radius:26px">
            <h1 class="email-heading" style="margin:0 0 12px;font-family:'Averia Serif Libre',Georgia,serif;font-size:36px;font-weight:400;line-height:1.15;letter-spacing:-0.6px;color:#24170f">Nouvelle proposition<br>d’événement</h1>
            <p style="margin:0 0 28px;font-size:15px;line-height:24px;color:#78604d">Une nouvelle proposition attend votre validation.</p>
            <h2 style="margin:0;padding:24px 0 20px;border-top:1px solid #dfcfbe;font-family:'Averia Serif Libre',Georgia,serif;font-size:26px;font-weight:400;line-height:1.3;color:#24170f;overflow-wrap:anywhere;word-break:break-word">${escapeHtml(proposal.eventName)}</h2>
            <table class="email-details" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed">
              ${details.slice(1, -1).map(([label, value]) => `<tr class="detail-row">
                <td class="detail-label" width="36%" valign="top" style="width:36%;padding:12px 12px 12px 0;border-bottom:1px solid #eaded0;font-size:13px;line-height:22px;color:#78604d">${escapeHtml(label)}</td>
                <td class="detail-value" valign="top" style="padding:12px 0;border-bottom:1px solid #eaded0;font-size:14px;line-height:22px;color:#24170f;overflow-wrap:anywhere;word-break:break-word">${escapeHtml(value)}</td>
              </tr>`).join("")}
            </table>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px">
              <tr><td bgcolor="#bb3c1d" align="center" style="border-radius:999px;mso-padding-alt:15px 24px">
                <a href="${escapeHtml(adminUrl)}" style="display:inline-block;padding:15px 24px;border:1px solid #bb3c1d;border-radius:999px;color:#ffffff;font-size:14px;font-weight:600;line-height:20px;text-align:center;text-decoration:none;mso-padding-alt:0">Consulter les propositions</a>
              </td></tr>
            </table>
          </td></tr>
          <tr><td style="padding:22px 16px 4px;text-align:center;font-size:12px;line-height:20px;color:#78604d">
            Upcomi · Proposition n° ${escapeHtml(String(proposal.eventId))}<br>
            <a href="${escapeHtml(adminUrl)}" style="color:#78604d;text-decoration:underline">Ouvrir l’administration</a>
          </td></tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td></tr>
    </table>
  </body>
</html>`;

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: NOTIFICATION_FROM,
      to: NOTIFICATION_RECIPIENTS,
      subject: `[Upcomi] Nouvelle proposition : ${proposal.eventName.replace(/[\r\n]+/g, " ")}`,
      html,
      text,
    }, {
      idempotencyKey: `event-proposal/${proposal.eventId}`,
    });

    if (error) {
      console.error("Event proposal email failed", {
        eventId: proposal.eventId,
        error: error.name,
      });
    }
  } catch (error) {
    console.error("Event proposal email failed", {
      eventId: proposal.eventId,
      error: error instanceof Error ? error.name : "unknown_error",
    });
  }
}
