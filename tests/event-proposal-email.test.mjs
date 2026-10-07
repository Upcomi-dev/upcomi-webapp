import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { compileFunction } from "node:vm";
import ts from "typescript";

// Exercise the real server modules with isolated environment, database and email
// dependencies, without a Next.js request context or external services.
function loadModule(path, imports, env = {}, logs = []) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  const require = (name) => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected dependency: ${name}`);
    return imports[name];
  };
  compileFunction(outputText, ["require", "exports", "process", "console"], { filename: path })(
    require,
    exports,
    { env },
    { warn: (...args) => logs.push(args), error: (...args) => logs.push(args) },
  );
  return exports;
}

const configuredEnv = {
  RESEND_API_KEY: "re_test_key",
};
const proposal = {
  eventId: 42,
  eventName: 'Randonnée <script>alert("x")</script> & vélo',
  startDate: "2026-10-10",
  endDate: "2026-10-11",
  city: "Saint-Étienne",
  country: "France",
  organizer: 'Club "Vélo" & amis',
  contactName: "L'équipe <Upcomi>",
  contactEmail: "contact@example.com",
  routeCount: 2,
};

function mailHarness({ env = configuredEnv, failure } = {}) {
  const calls = [];
  const logs = [];
  let clients = 0;
  const { sendEventProposalNotification } = loadModule("src/lib/email/event-proposal-notification.ts", {
    "server-only": {},
    "@/assets/brand/upcomi-logo-horizontal-orange.png": { default: { src: "/_next/static/media/upcomi-logo.png" } },
    "@/lib/seo": loadModule("src/lib/seo.ts", {}),
    resend: {
      Resend: class {
        constructor(key) {
          clients++;
          assert.equal(key, configuredEnv.RESEND_API_KEY);
          this.emails = {
            send: async (...args) => {
              calls.push(args);
              if (failure === "network") throw new TypeError("Network unavailable");
              return failure === "api"
                ? { data: null, error: { name: "validation_error", message: "Rejected" } }
                : { data: { id: "email-123" }, error: null };
            },
          };
        }
      },
    },
  }, env, logs);
  return { sendEventProposalNotification, calls, logs, clients: () => clients };
}

test("sends the French summary with escaped HTML, plain text and stable idempotency key", async () => {
  const mail = mailHarness();
  assert.equal(mail.clients(), 0, "Resend is not instantiated at import/build time");
  await mail.sendEventProposalNotification(proposal);
  assert.equal(mail.calls.length, 1);
  const [payload, options] = mail.calls[0];
  assert.equal(payload.from, "Upcomi <onboarding@resend.dev>");
  assert.deepEqual(payload.to, ["dev@upcomi.cc"]);
  assert.equal(options.idempotencyKey, "event-proposal/42");
  assert.match(payload.subject, /^\[Upcomi\] Nouvelle proposition :/);
  assert.match(payload.html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; &amp; vélo/);
  assert.match(payload.html, /L&#39;équipe &lt;Upcomi&gt;/);
  assert.doesNotMatch(payload.html, /<script>/);
  for (const value of [proposal.eventName, proposal.city, proposal.country, proposal.organizer, proposal.contactName, proposal.contactEmail]) {
    assert.ok(payload.text.includes(value));
  }
  assert.match(payload.text, /10 octobre 2026 au 11 octobre 2026/);
  assert.match(payload.text, /Nombre de parcours : 2/);
  assert.match(payload.html, /href="https:\/\/app\.upcomi\.cc\/admin\?tab=proposals"/);
  assert.ok(payload.text.includes("https://app.upcomi.cc/admin?tab=proposals"));
  assert.equal(mail.logs.length, 0);
});

test("handles optional fields and a single date without leaking header newlines", async () => {
  const mail = mailHarness();
  await mail.sendEventProposalNotification({ ...proposal, eventName: "Vélo\r\nParis", endDate: null, country: null, contactName: null });
  const [payload] = mail.calls[0];
  assert.doesNotMatch(payload.subject, /[\r\n]/);
  assert.match(payload.text, /Dates : 10 octobre 2026\n/);
  assert.match(payload.text, /Lieu : Saint-Étienne\n/);
  assert.match(payload.text, /Contact : Non renseigné/);
});

for (const key of Object.keys(configuredEnv)) {
  test(`missing ${key} skips sending with a configuration warning`, async () => {
    const mail = mailHarness({ env: { ...configuredEnv, [key]: "  " } });
    await mail.sendEventProposalNotification(proposal);
    assert.equal(mail.clients(), 0);
    assert.equal(mail.calls.length, 0);
    assert.deepEqual(mail.logs[0][1], { eventId: 42, missing: [key] });
  });
}

function formData() {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    contact_name: proposal.contactName,
    contact_email: proposal.contactEmail,
    villeDepart: proposal.city,
    paysDepart: proposal.country,
    dateEvent: proposal.startDate,
    dateFin: proposal.endDate,
    nomEvent: proposal.eventName,
    organisateur: proposal.organizer,
    description: "Une aventure à vélo.",
    route_id: "1",
    route_name: "Découverte",
    route_type_event: "Social Ride",
    route_bike_type: "Route",
    route_distance: "100",
    route_elevation: "500",
    route_price: "0",
    route_delay: "",
  })) data.set(key, value);
  data.set("image", new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "test.png", { type: "image/png" }));
  return data;
}

function submissionHarness({ databaseFailure, schedulingFailure, ...mailOptions } = {}) {
  const mail = mailHarness(mailOptions);
  const scheduled = [];
  const writes = [];
  const deletions = [];
  const imageRemovals = [];
  const supabase = {
    rpc: async () => ({ data: proposal.organizer, error: null }),
    storage: { from: () => ({
      upload: async () => ({ error: null }),
      remove: async (paths) => { imageRemovals.push(paths); return { error: null }; },
    }) },
    from: (table) => ({
      insert: (values) => {
        writes.push({ table, values });
        const result = databaseFailure === table
          ? { data: null, error: { message: "Database failure" } }
          : { data: { id: 42 }, error: null };
        return table === "events" ? { select: () => ({ single: async () => result }) } : Promise.resolve(result);
      },
      delete: () => ({ eq: async (column, id) => { deletions.push({ table, column, id }); return { error: null }; } }),
    }),
  };
  const { submitEventProposal } = loadModule("src/app/proposer-un-evenement/actions.ts", {
    "node:crypto": { randomUUID },
    "next/cache": { revalidatePath: () => {} },
    "next/server": { after: (callback) => {
      assert.deepEqual(writes.map(({ table }) => table), ["events", "sous_events", "event_submission_contacts"]);
      if (schedulingFailure) throw new Error("No request context");
      scheduled.push(callback);
    } },
    "@/lib/email/event-proposal-notification": mail,
    "@/lib/events/slugs": { getUniqueEventSlug: async () => "test-event", isDuplicateEventSlugError: () => false },
    "@/lib/storage/urls": { buildSupabasePublicStorageUrl: () => "https://example.com/test.png" },
    "@/lib/supabase/admin": { createAdminClient: () => supabase },
  }, {}, mail.logs);
  return { ...mail, submitEventProposal, scheduled, writes, deletions, imageRemovals };
}

test("a complete submission schedules one alert after persistence and returns before sending", async () => {
  const flow = submissionHarness();
  assert.deepEqual(await flow.submitEventProposal(formData()), { ok: true });
  assert.equal(flow.calls.length, 0);
  assert.equal(flow.scheduled.length, 1);
  await flow.scheduled[0]();
  assert.equal(flow.calls.length, 1);
  assert.match(flow.calls[0][0].text, /Nombre de parcours : 1/);
  assert.equal(flow.calls[0][1].idempotencyKey, "event-proposal/42");
  assert.equal(flow.deletions.length, 0);
  assert.equal(flow.imageRemovals.length, 0);
});

for (const scenario of ["invalid", "honeypot", "events", "sous_events", "event_submission_contacts"]) {
  test(`${scenario}: no email is scheduled for a rejected or incomplete submission`, async () => {
    const flow = submissionHarness({ databaseFailure: scenario });
    const data = formData();
    if (scenario === "invalid") data.set("contact_email", "invalid");
    if (scenario === "honeypot") data.set("company_url", "https://spam.example");
    const result = await flow.submitEventProposal(data);
    assert.equal(result.ok, scenario === "honeypot");
    assert.equal(flow.scheduled.length, 0);
    assert.equal(flow.calls.length, 0);
    if (["sous_events", "event_submission_contacts"].includes(scenario)) {
      assert.equal(flow.deletions.length, 1);
      assert.equal(flow.imageRemovals.length, 1);
    }
  });
}

for (const failure of ["api", "network", "configuration", "scheduling"]) {
  test(`${failure} failure preserves the saved proposal, image and successful result`, async () => {
    const flow = submissionHarness({
      failure,
      env: failure === "configuration" ? {} : configuredEnv,
      schedulingFailure: failure === "scheduling",
    });
    assert.deepEqual(await flow.submitEventProposal(formData()), { ok: true });
    for (const callback of flow.scheduled) await assert.doesNotReject(callback);
    assert.equal(flow.deletions.length, 0);
    assert.equal(flow.imageRemovals.length, 0);
    assert.equal(flow.logs.length, 1);
    assert.equal(flow.logs[0][1].eventId, 42);
    assert.ok(!JSON.stringify(flow.logs).includes(configuredEnv.RESEND_API_KEY));
    assert.ok(!JSON.stringify(flow.logs).includes(proposal.contactEmail));
  });
}
