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

async function storyStep(page: Page, selected?: string[]) {
  await recommendations(page, selected);
  await page.getByRole("button", { name: "Continuer", exact: false }).click();
  await expect(page.getByRole("heading", { name: "Partage un récit d’aventure" })).toBeVisible();
}

async function chooseEvent(page: Page, name: string) {
  const choice = page.getByRole("combobox", { name: "Événement à raconter" });
  if (!await choice.isVisible()) await page.getByRole("button", { name: "Choisir un autre événement" }).click();
  await choice.click();
  await page.getByRole("option", { name, exact: true }).click();
}

test.beforeEach(async ({ request }) => {
  await request.post(`${api}/__scenario`, { data: {} });
});

test("saves one story for the least covered event and finishes", async ({ page, request }, testInfo) => {
  await storyStep(page);
  await expect(page.getByText(names[1], { exact: true })).toBeVisible();
  await page.locator("#signup-story").fill("Une belle aventure à partager.");
  await expect(page.locator("#signup-story")).toHaveAttribute("maxlength", "200");
  await page.screenshot({ path: testInfo.outputPath("story.png"), fullPage: true });
  await page.getByRole("button", { name: "Enregistrer et terminer" }).click();
  await expect(page.getByRole("heading", { name: "C'est tout bon !" })).toBeVisible();
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
  await page.getByRole("button", { name: "Continuer", exact: false }).click();
  await expect(page.locator("#signup-story-url")).toHaveValue("https://example.test/alpes");
  await page.getByRole("button", { name: "Retour", exact: true }).click();
  await page.getByRole("button", { name: `Retirer ${names[0]}` }).click();
  await page.getByRole("button", { name: "Continuer", exact: false }).click();
  await expect(page.locator("#signup-story")).toHaveValue("Brouillon breton");
  await page.getByRole("button", { name: "Choisir un autre événement" }).click();
  const select = page.getByRole("combobox", { name: "Événement à raconter" });
  await select.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: names[0], exact: true })).toHaveCount(0);
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(select).toContainText(names[2]);
  await expect(page.locator("#signup-story")).toHaveValue("");
  await page.screenshot({ path: testInfo.outputPath("story-choice.png"), fullPage: true });
  const bounds = await select.boundingBox();
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.locator("#signup-story-url").fill("https://example.test/pyrenees");
  await page.getByRole("button", { name: "Enregistrer et terminer" }).click();
  await expect(page.getByRole("heading", { name: "C'est tout bon !" })).toBeVisible();
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

test("one event hides selection and an empty form can be skipped", async ({ page, request }) => {
  await storyStep(page, [names[0]]);
  await expect(page.getByRole("button", { name: "Choisir un autre événement" })).toHaveCount(0);
  await page.getByRole("button", { name: "Passer cette étape", exact: true }).click();
  await expect(page.getByRole("heading", { name: "C'est tout bon !" })).toBeVisible();
  const log = await (await request.get(`${api}/__requests`)).json();
  expect(log.filter((entry: { path: string }) => entry.path === "/rest/v1/user_event_stories")).toHaveLength(0);
});

test("count failure proposes first recommendation and skip discards unsaved drafts", async ({ page, request }) => {
  await request.post(`${api}/__scenario`, { data: { countFailure: true } });
  await storyStep(page);
  await expect(page.getByText(names[0], { exact: true })).toBeVisible();
  await page.locator("#signup-story").fill("Un brouillon non publié");
  await page.getByRole("button", { name: "Passer cette étape", exact: true }).click();
  await expect(page.getByRole("heading", { name: "C'est tout bon !" })).toBeVisible();
  const log = await (await request.get(`${api}/__requests`)).json();
  expect(log.filter((entry: { path: string }) => entry.path === "/rest/v1/user_event_stories")).toHaveLength(0);
});

test("save failure preserves the draft; rapid submissions write only once per attempt", async ({ page, request }) => {
  await request.post(`${api}/__scenario`, { data: { storyFailures: 1, storyDelay: 300 } });
  await storyStep(page);
  await page.locator("#signup-story").fill("À conserver après une erreur");
  const save = page.getByRole("button", { name: "Enregistrer et terminer" });
  await save.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(page.getByRole("alert")).toContainText("Récit indisponible");
  await expect(page.locator("#signup-story")).toHaveValue("À conserver après une erreur");
  await save.click();
  await expect(page.getByRole("heading", { name: "C'est tout bon !" })).toBeVisible();
  const log = await (await request.get(`${api}/__requests`)).json();
  expect(log.filter((entry: { path: string }) => entry.path === "/rest/v1/user_event_stories")).toHaveLength(2);
});

test("failed finalization retries without writing another story", async ({ page, request }) => {
  await request.post(`${api}/__scenario`, { data: { completionFailures: 1 } });
  await storyStep(page);
  await page.locator("#signup-story").fill("Un seul récit enregistré");
  await page.getByRole("button", { name: "Enregistrer et terminer" }).click();
  await expect(page.getByRole("status")).toContainText("Ton récit est enregistré");
  await expect(page.getByRole("button", { name: "Choisir un autre événement" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Retour", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Terminer", exact: true }).click();
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
  await page.getByRole("button", { name: "Enregistrer et terminer" }).click();
  await expect(page.getByRole("alert")).toContainText("Ce lien ne semble pas valide");
  await page.locator("#signup-story-url").fill("https://example.test/recit");
  await page.route("**/rest/v1/user_event_stories*", (route) => route.abort());
  await page.getByRole("button", { name: "Enregistrer et terminer" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("#signup-story")).toHaveValue("Récit à conserver");
  await expect(page.locator("#signup-story-url")).toHaveValue("https://example.test/recit");
  await page.unroute("**/rest/v1/user_event_stories*");
  await page.getByRole("button", { name: "Enregistrer et terminer" }).click();
  await expect(page.getByRole("heading", { name: "C'est tout bon !" })).toBeVisible();
});
