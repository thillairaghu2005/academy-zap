import { expect, test } from "@playwright/test";

const viewports = [
  [320, 568], [360, 800], [375, 812], [390, 844], [412, 915], [430, 932],
  [600, 960], [768, 1024], [820, 1180], [1024, 1366],
  [1280, 720], [1366, 768], [1440, 900], [1600, 900], [1920, 1080],
  [844, 390], [568, 320],
] as const;

const courses = [
  ["Networking Basics", "/courses/0a1b2c3d-4e5f-4a6b-7c8d-9e0f1a2b3c4d"],
  ["Cloud Security Essentials", "/courses/e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b"],
] as const;

for (const [width, height] of viewports) {
  for (const [courseName, path] of courses) {
    test(`${courseName} has no horizontal overflow at ${width}×${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(path);
      await expect(page.getByRole("heading", { name: courseName })).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      expect(dimensions.document, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 1);
      expect(dimensions.body, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 1);

      const mobileNav = page.getByRole("navigation", { name: "Mobile primary navigation" });
      if (width < 1024) await expect(mobileNav).toBeVisible();
      else await expect(mobileNav).toBeHidden();
    });
  }
}

test("mobile tutor clears the bottom navigation and closes with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/courses/0a1b2c3d-4e5f-4a6b-7c8d-9e0f1a2b3c4d");
  await page.getByRole("button", { name: "Essential only" }).click();
  const nav = page.getByRole("navigation", { name: "Mobile primary navigation" });
  const launcher = page.getByRole("button", { name: "Open AI Tutor" });
  const navBox = await nav.boundingBox();
  const launcherBox = await launcher.boundingBox();
  expect(navBox).not.toBeNull();
  expect(launcherBox).not.toBeNull();
  expect(launcherBox!.y + launcherBox!.height).toBeLessThan(navBox!.y);

  await launcher.click();
  const panel = page.getByRole("dialog", { name: "Zapsters Tutor" });
  await expect(panel).toBeVisible();
  const panelBox = await panel.boundingBox();
  expect(panelBox!.x).toBeGreaterThanOrEqual(0);
  expect(panelBox!.y).toBeGreaterThanOrEqual(0);
  expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(320);
  expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(568);
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});

test("mobile search stays in the viewport and exposes quick actions", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/courses");
  await page.getByRole("button", { name: "Essential only" }).click();
  await page.getByRole("button", { name: "Search Zapsters" }).click();
  const dialog = page.getByRole("dialog", { name: "Search Zapsters" });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  expect(box!.y + box!.height).toBeLessThanOrEqual(568);
  await expect(page.getByRole("option", { name: /Resume course/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("demo Labs catalog searches with explicit local fixtures", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@zapsters.dev");
  await page.getByRole("textbox", { name: "Password" }).fill("demo123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/labs");
  await expect(page.getByText("5 labs available")).toBeVisible();
  await page.getByLabel("Search labs").fill("Linux Fundamentals");
  await expect(page.getByRole("link", { name: /Linux Fundamentals/ })).toBeVisible();
  await expect(page.getByText("Offensive Web App Testing")).toBeHidden();
});
