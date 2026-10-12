import { expect, test, type Page } from "@playwright/test";

const api = "http://127.0.0.1:4318";
const names = ["Aventure des Alpes", "Aventure de Bretagne", "Aventure des Pyrénées et des cols jusqu’à la Méditerranée"];

async function recommendations(page: Page, selected = names.slice(0, 2)) {
  await page.goto("/signup");
  await page.locator("#signup-email").fill("onboarding@example.test");
  await page.getByRole("button", { name: "Continuer avec email", exact: true }).click();
  await page.locator("#signup-first-name").fill("Camille");
  await page.locator("#signup-last-name").fill("Martin");
  await page.locator("#signup-password").fill("Test1234!abcd");
  await page.locator("#signup-password-confirmation").fill("Test1234!abcd");
  await page.locator("#signup-privacy-policy").check();
  await page.getByRole("button", { name: "Continuer →", exact: true }).click();
  await page.locator("#signup-city").fill("Nantes");
  await page.getByRole("combobox", { name: "Niveau" }).click();
  await page.getByRole("option", { name: "Intermédiaire", exact: true }).click();
  await page.getByRole("button", { name: "Gravel", exact: true }).click();
  await page.getByRole("button", { name: "Continuer", exact: false }).click();
  for (const name of selected) {
    await page.getByPlaceholder("Rechercher un événement…").fill(name);
    await page.getByRole("button").filter({ has: page.getByText(name, { exact: true }) }).click();
  }
}

async function selectionStep(page: Page, selected?: string[]) {
  await recommendations(page, selected);
  await page.getByRole("button", { name: "Continuer", exact: false }).click();
  await expect(page.getByRole("heading", { name: "Partage un récit d’aventure" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Événement à raconter" })).toBeVisible();
  await expect(page.locator('input[name="signup-story-event"]:checked')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Raconter cet événement", exact: true })).toBeDisabled();
}

async function storyStep(page: Page, selected?: string[]) {
  await selectionStep(page, selected);
  await expect(page.locator("#signup-story")).toHaveCount(0);
  await chooseEvent(page, selected?.length === 1 ? selected[0] : names[1]);
}

async function chooseEvent(page: Page, name: string) {
  if (await page.locator("#signup-story").isVisible()) {
    await page.getByRole("button", { name: "Retour", exact: true }).click();
  }
  await page.getByRole("radio", { name, exact: true }).check();
  await page.getByRole("button", { name: "Raconter cet événement", exact: true }).click();
}

async function finishSavedStory(page: Page) {
  await expect(page.getByRole("img", { name: "Récit enregistré", exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Terminer mon inscription", exact: true }).click();
  await expect(page.getByRole("heading", { name: "C'est tout bon !" })).toBeVisible();
}

test.beforeEach(async ({ request }) => {
  await request.post(`${api}/__scenario`, { data: {} });
});

test("saves one story for the manually selected event and finishes", async ({ page, request }, testInfo) => {
  await storyStep(page);
  await expect(page.getByText(names[1], { exact: true })).toBeVisible();
  await page.locator("#signup-story").fill("Une belle aventure à partager.");
  await expect(page.locator("#signup-story")).toHaveAttribute("maxlength", "200");
  await page.screenshot({ path: testInfo.outputPath("story.png"), fullPage: true });
  await page.getByRole("button", { name: "Enregistrer le récit" }).click();
  await finishSavedStory(page);
  const log = await (await request.get(`${api}/__requests`)).json();
  const stories = log.filter((entry: { path: string }) => entry.path === "/rest/v1/user_event_stories");
  expect(stories).toHaveLength(1);
  expect(stories[0].body).toMatchObject({ event_id: 22, story: "Une belle aventure à partager.", story_url: null, status: "pending" });
  expect(log.some((entry: { body?: { data?: { onboarding_completed?: boolean } } }) => entry.body?.data?.onboarding_completed)).toBe(true);
});

test("keeps separate drafts, manual choice and handles removed recommendations", async ({ page, request }, testInfo) => {
  await storyStep(page, names);
  await page.locator("#signup-story").fill("Brouillon breton");
  await chooseEvent(page, names[0]);
  await expect(page.locator("#signup-story")).toHaveValue("");
  await page.locator("#signup-story-url").fill("https://example.test/alpes");
  await chooseEvent(page, names[1]);
  await expect(page.locator("#signup-story")).toHaveValue("Brouillon breton");
  await expect(page.locator("#signup-story-url")).toHaveValue("");
  await chooseEvent(page, names[0]);
  await expect(page.locator("#signup-story-url")).toHaveValue("https://example.test/alpes");
  await page.getByRole("button", { name: "Retour", exact: true }).click();
  await page.getByRole("button", { name: "Retour", exact: true }).click();
  await page.getByRole("button", { name: "Continuer", exact: false }).click();
  await expect(page.getByRole("button", { name: "Raconter cet événement", exact: true })).toBeDisabled();
  await chooseEvent(page, names[0]);
  await expect(page.locator("#signup-story-url")).toHaveValue("https://example.test/alpes");
  await page.getByRole("button", { name: "Retour", exact: true }).click();
  await page.getByRole("button", { name: "Retour", exact: true }).click();
  await page.getByRole("button", { name: `Retirer ${names[0]}` }).click();
  await page.getByRole("button", { name: "Continuer", exact: false }).click();
  await chooseEvent(page, names[1]);
  await expect(page.locator("#signup-story")).toHaveValue("Brouillon breton");
  await page.getByRole("button", { name: "Retour", exact: true }).click();
  const choices = page.getByRole("group", { name: "Événement à raconter" });
  await expect(page.getByRole("radio", { name: names[0], exact: true })).toHaveCount(0);
  await page.getByRole("radio", { name: names[1], exact: true }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: names[2], exact: true })).toBeChecked();
  await page.screenshot({ path: testInfo.outputPath("story-choice.png"), fullPage: true });
  const bounds = await choices.boundingBox();
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByRole("button", { name: "Raconter cet événement", exact: true }).click();
  await expect(page.locator("#signup-story")).toHaveValue("");
  await page.locator("#signup-story-url").fill("https://example.test/pyrenees");
  await page.getByRole("button", { name: "Enregistrer le récit" }).click();
  await finishSavedStory(page);
  const log = await (await request.get(`${api}/__requests`)).json();
  const stories = log.filter((entry: { path: string }) => entry.path === "/rest/v1/user_event_stories");
  expect(stories).toHaveLength(1);
  expect(stories[0].body).toMatchObject({ event_id: 33, story: null, story_url: "https://example.test/pyrenees" });
});

test("empty recommendations skip stories entirely", async ({ page, request }) => {
  await recommendations(page, []);
  await page.getByRole("button", { name: "Passer cette étape", exact: true }).click();
  await expect(page.getByRole("heading", { name: "C'est tout bon !" })).toBeVisible();
  const log = await (await request.get(`${api}/__requests`)).json();
  expect(log.filter((entry: { path: string }) => /get_event_story_counts|user_event_stories/.test(entry.path))).toHaveLength(0);
});

test("one event still has a selection step and an empty form can be skipped", async ({ page, request }) => {
  await selectionStep(page, [names[0]]);
  await expect(page.getByRole("radio", { name: names[0], exact: true })).not.toBeChecked();
  await page.getByRole("radio", { name: names[0], exact: true }).check();
  await expect(page.locator("#signup-story")).toHaveCount(0);
  await page.getByRole("button", { name: "Raconter cet événement", exact: true }).click();
  await expect(page.getByRole("button", { name: "Enregistrer le récit" })).toBeDisabled();
  await page.getByRole("button", { name: "Terminer mon inscription", exact: true }).click();
  await expect(page.getByRole("heading", { name: "C'est tout bon !" })).toBeVisible();
  const log = await (await request.get(`${api}/__requests`)).json();
  expect(log.filter((entry: { path: string }) => entry.path === "/rest/v1/user_event_stories")).toHaveLength(0);
});

test("manual selection needs no count request and finishing discards unsaved drafts", async ({ page, request }) => {
  await request.post(`${api}/__scenario`, { data: { countFailure: true } });
  await storyStep(page, [names[0]]);
  await expect(page.getByText(names[0], { exact: true })).toBeVisible();
  await page.locator("#signup-story").fill("Un brouillon non publié");
  await page.getByRole("button", { name: "Terminer mon inscription", exact: true }).click();
  await expect(page.getByRole("heading", { name: "C'est tout bon !" })).toBeVisible();
  const log = await (await request.get(`${api}/__requests`)).json();
  expect(log.filter((entry: { path: string }) => entry.path === "/rest/v1/user_event_stories")).toHaveLength(0);
});

test("save failure preserves the draft; rapid submissions write only once per attempt", async ({ page, request }) => {
  await request.post(`${api}/__scenario`, { data: { storyFailures: 1, storyDelay: 300 } });
  await storyStep(page);
  await page.locator("#signup-story").fill("À conserver après une erreur");
  const save = page.getByRole("button", { name: "Enregistrer le récit" });
  await save.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(page.getByRole("alert")).toContainText("Récit indisponible");
  await expect(page.locator("#signup-story")).toHaveValue("À conserver après une erreur");
  await save.click();
  await finishSavedStory(page);
  const log = await (await request.get(`${api}/__requests`)).json();
  expect(log.filter((entry: { path: string }) => entry.path === "/rest/v1/user_event_stories")).toHaveLength(2);
});

test("failed finalization retries without writing another story", async ({ page, request }) => {
  await request.post(`${api}/__scenario`, { data: { completionFailures: 1 } });
  await storyStep(page);
  await page.locator("#signup-story").fill("Un seul récit enregistré");
  await page.getByRole("button", { name: "Enregistrer le récit" }).click();
  await expect(page.getByRole("img", { name: "Récit enregistré", exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Terminer mon inscription", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("#signup-story")).toHaveCount(0);
  await page.getByRole("button", { name: "Terminer mon inscription", exact: true }).click();
  await expect(page.getByRole("heading", { name: "C'est tout bon !" })).toBeVisible();
  const log = await (await request.get(`${api}/__requests`)).json();
  expect(log.filter((entry: { path: string }) => entry.path === "/rest/v1/user_event_stories")).toHaveLength(1);
});

test("recommendation failure keeps the selected events and can be retried", async ({ page, request }) => {
  await request.post(`${api}/__scenario`, { data: { recommendationFailures: 1 } });
  await recommendations(page);
  await page.getByRole("button", { name: "Continuer →", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Recommandations indisponibles");
  await expect(page.getByRole("button", { name: `Retirer ${names[0]}` })).toBeVisible();
  await expect(page.getByRole("button", { name: `Retirer ${names[1]}` })).toBeVisible();
  await page.getByRole("button", { name: "Continuer →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Partage un récit d’aventure" })).toBeVisible();
});

test("invalid URL and offline save preserve input before a successful retry", async ({ page }) => {
  await storyStep(page);
  await page.locator("#signup-story-url").fill("http://[");
  await page.locator("#signup-story").fill("Récit à conserver");
  await page.getByRole("button", { name: "Enregistrer le récit" }).click();
  await expect(page.getByRole("alert")).toContainText("Ce lien ne semble pas valide");
  await page.locator("#signup-story-url").fill("https://example.test/recit");
  await page.route("**/rest/v1/user_event_stories*", (route) => route.abort());
  await page.getByRole("button", { name: "Enregistrer le récit" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("#signup-story")).toHaveValue("Récit à conserver");
  await expect(page.locator("#signup-story-url")).toHaveValue("https://example.test/recit");
  await page.unroute("**/rest/v1/user_event_stories*");
  await page.getByRole("button", { name: "Enregistrer le récit" }).click();
  await finishSavedStory(page);
});


test("saves successive stories without finalizing early or offering saved events again", async ({ page, request }, testInfo) => {
  await selectionStep(page);
  await page.screenshot({ path: testInfo.outputPath("selection.png"), fullPage: true });
  await chooseEvent(page, names[1]);
  await page.locator("#signup-story").fill("Le récit breton");
  // Keep a separate draft ready for the second event.
  await chooseEvent(page, names[0]);
  await page.locator("#signup-story-url").fill("https://example.test/alpes");
  await chooseEvent(page, names[1]);
  await page.getByRole("button", { name: "Enregistrer le récit" }).click();
  await expect(page.getByRole("heading", { name: "Partage un récit d’aventure" })).toBeFocused();
  await expect(page.getByRole("img", { name: "Récit enregistré", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("group", { name: "Événement à raconter" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Raconter cet événement", exact: true })).toBeDisabled();
  await expect(page.locator('input[name="signup-story-event"]:checked')).toHaveCount(0);
  const completedEvent = page.getByRole("listitem").filter({ hasText: names[1] });
  await expect(completedEvent.getByRole("img", { name: "Récit enregistré" })).toBeVisible();
  await expect(completedEvent.locator("svg")).toBeVisible();
  await expect(completedEvent.locator(".text-green-800")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("saved.png"), fullPage: true });
  let log = await (await request.get(`${api}/__requests`)).json();
  expect(log.some((entry: { body?: { data?: { onboarding_completed?: boolean } } }) => entry.body?.data?.onboarding_completed)).toBe(false);
  await expect(page.getByRole("group", { name: "Événement à raconter" })).toBeVisible();
  await expect(page.getByRole("radio", { name: names[1], exact: true })).toHaveCount(0);
  await page.getByRole("radio", { name: names[0], exact: true }).check();
  await page.getByRole("button", { name: "Raconter cet événement", exact: true }).click();
  await expect(page.locator("#signup-story-url")).toHaveValue("https://example.test/alpes");
  await expect(page.locator("#signup-story")).toHaveValue("");
  await page.getByRole("button", { name: "Enregistrer le récit" }).click();
  await expect(page.getByRole("img", { name: "Récit enregistré", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Raconter cet événement", exact: true })).toBeDisabled();
  await expect(page.getByRole("img", { name: "Récit enregistré", exact: true })).toHaveCount(2);
  await expect(page.getByRole("radio")).toHaveCount(0);
  await finishSavedStory(page);
  log = await (await request.get(`${api}/__requests`)).json();
  const stories = log.filter((entry: { path: string }) => entry.path === "/rest/v1/user_event_stories");
  expect(stories.map((entry: { body: unknown }) => entry.body)).toMatchObject([
    { event_id: 22, story: "Le récit breton", story_url: null },
    { event_id: 11, story: null, story_url: "https://example.test/alpes" },
  ]);
});

test("can finish from the next selection without losing the saved story", async ({ page, request }) => {
  await storyStep(page);
  await page.locator("#signup-story").fill("Récit déjà enregistré");
  await page.getByRole("button", { name: "Enregistrer le récit" }).click();
  await expect(page.getByRole("group", { name: "Événement à raconter" })).toBeVisible();
  await page.getByRole("button", { name: "Retour", exact: true }).click();
  // Removing every recommendation must not lose or rewrite the saved story.
  for (const name of names.slice(0, 2)) {
    await page.getByRole("button", { name: `Retirer ${name}` }).click();
  }
  await page.getByRole("button", { name: "Passer cette étape", exact: true }).click();
  await expect(page.getByRole("heading", { name: "C'est tout bon !" })).toBeVisible();
  const log = await (await request.get(`${api}/__requests`)).json();
  expect(log.filter((entry: { path: string }) => entry.path === "/rest/v1/user_event_stories")).toHaveLength(1);
});


test("can finish from the unselected list without writing a story", async ({ page, request }) => {
  await selectionStep(page);
  await page.getByRole("button", { name: "Terminer mon inscription", exact: true }).click();
  await expect(page.getByRole("heading", { name: "C'est tout bon !" })).toBeVisible();
  const log = await (await request.get(`${api}/__requests`)).json();
  expect(log.filter((entry: { path: string }) => /get_event_story_counts|user_event_stories/.test(entry.path))).toHaveLength(0);
});
