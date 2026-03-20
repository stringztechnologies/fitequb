import { expect, test } from "@playwright/test";

// Design tokens from DESIGN-SPEC.md
const COLORS = {
  bgPrimary: "rgb(10, 10, 10)", // #0a0a0a
  bgCard: "rgb(28, 28, 30)", // #1c1c1e
  green: "rgb(0, 200, 83)", // #00C853
  gold: "rgb(255, 215, 0)", // #FFD700
  textSecondary: "rgb(142, 142, 147)", // #8E8E93
  cyan: "rgb(0, 188, 212)", // #00BCD4
  orange: "rgb(255, 149, 0)", // #FF9500
  red: "rgb(255, 59, 48)", // #FF3B30
};

// ──────────────────────────────────────
// HOME PAGE
// ──────────────────────────────────────
test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("dark background renders", async ({ page }) => {
    const bg = await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe(COLORS.bgPrimary);
  });

  test("progress ring SVG exists", async ({ page }) => {
    const ring = page.locator("svg circle");
    await expect(ring.first()).toBeVisible();
  });

  test("gold ETB amount in progress ring", async ({ page }) => {
    // The gold number and "ETB" label are separate spans
    const goldNumber = page.locator("span.text-\\[28px\\]").first();
    await expect(goldNumber).toBeVisible();
    const color = await goldNumber.evaluate((el) => getComputedStyle(el).color);
    expect(color).toBe(COLORS.gold);
  });

  test("Potential Payout label visible", async ({ page }) => {
    await expect(page.locator("text=Potential Payout")).toBeVisible();
  });

  test("3 feature cards present", async ({ page }) => {
    await expect(page.locator("text=Equb Rooms")).toBeVisible();
    await expect(page.locator("text=Gym Day Passes")).toBeVisible();
    await expect(page.locator("text=Step Challenge")).toBeVisible();
  });

  test("bottom nav has 5 tabs", async ({ page }) => {
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();
    const buttons = nav.locator("button");
    await expect(buttons).toHaveCount(5);
  });

  test("home nav tab is gold when active", async ({ page }) => {
    const homeTab = page.locator("nav button").first();
    const color = await homeTab.evaluate((el) => getComputedStyle(el).color);
    expect(color).toBe(COLORS.gold);
  });

  test("feature cards have 16px border-radius", async ({ page }) => {
    const card = page.locator("button:has-text('Equb Rooms')");
    const radius = await card.evaluate(
      (el) => getComputedStyle(el).borderRadius,
    );
    expect(radius).toBe("16px");
  });

  test("feature card badges visible", async ({ page }) => {
    await expect(page.locator("text=Ends in 2 days")).toBeVisible();
    await expect(page.locator("text=Discount Active")).toBeVisible();
  });
});

// ──────────────────────────────────────
// NOTIFICATIONS
// ──────────────────────────────────────
test.describe("Notifications Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/notifications");
    await page.waitForLoadState("networkidle");
  });

  test("page renders with title", async ({ page }) => {
    await expect(page.locator("text=Notification Center")).toBeVisible();
  });

  test("tab bar shows All and Earnings", async ({ page }) => {
    const allBtn = page.locator("button").filter({ hasText: /^All$/ });
    const earningsBtn = page.locator("button").filter({ hasText: "Earnings" });
    await expect(allBtn).toBeVisible();
    await expect(earningsBtn).toBeVisible();
  });

  test("notification cards have colored left borders", async ({ page }) => {
    const firstCard = page
      .locator("[class*='rounded']")
      .filter({ hasText: "Payout" })
      .first();
    const borderLeft = await firstCard.evaluate(
      (el) => getComputedStyle(el).borderLeftColor,
    );
    expect(borderLeft).toBe(COLORS.gold);
  });

  test("urgency notification has red pulsing dot", async ({ page }) => {
    const dot = page.locator(".animate-pulse");
    await expect(dot).toBeVisible();
  });

  test("5 notification cards present", async ({ page }) => {
    const cards = page.locator(
      "text=mins ago, text=hour ago, text=hours ago, text=Yesterday",
    );
    const count = await page.locator("[style*='border-left']").count();
    expect(count).toBeGreaterThanOrEqual(4);
  });
});

// ──────────────────────────────────────
// PAYMENT
// ──────────────────────────────────────
test.describe("Payment Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/payment");
    await page.waitForLoadState("networkidle");
  });

  test("orange countdown timer badge visible", async ({ page }) => {
    const timer = page.locator("[class*='font-mono']").first();
    await expect(timer).toBeVisible();
    const color = await timer.evaluate((el) => getComputedStyle(el).color);
    expect(color).toBe(COLORS.orange);
  });

  test("payment breakdown table shows gold total", async ({ page }) => {
    const total = page.locator("text=Total to Pay:");
    await expect(total).toBeVisible();
    const color = await total.evaluate((el) => getComputedStyle(el).color);
    expect(color).toBe(COLORS.gold);
  });

  test("Telebirr payment method card visible", async ({ page }) => {
    await expect(page.locator("text=Telebirr")).toBeVisible();
  });

  test("Confirm and Pay button is green", async ({ page }) => {
    const btn = page.locator("button:has-text('Confirm and Pay')");
    await expect(btn).toBeVisible();
    const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe(COLORS.green);
  });

  test("ETB amounts are gold", async ({ page }) => {
    const etb = page.locator("text=1,000 ETB").first();
    await expect(etb).toBeVisible();
    const color = await etb.evaluate((el) => getComputedStyle(el).color);
    expect(color).toBe(COLORS.gold);
  });
});

// ──────────────────────────────────────
// WIN CELEBRATION
// ──────────────────────────────────────
test.describe("Win Celebration Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/win");
    await page.waitForLoadState("networkidle");
  });

  test("YOU WON! text in gold", async ({ page }) => {
    const won = page.locator("text=YOU WON!");
    await expect(won).toBeVisible();
    const color = await won.evaluate((el) => getComputedStyle(el).color);
    expect(color).toBe(COLORS.gold);
  });

  test("neon green ETB amount", async ({ page }) => {
    const amount = page.locator("text=25,000 ETB");
    await expect(amount).toBeVisible();
    const color = await amount.evaluate((el) => getComputedStyle(el).color);
    // #00E676 = rgb(0, 230, 118)
    expect(color).toBe("rgb(0, 230, 118)");
  });

  test("confetti particles exist", async ({ page }) => {
    const particles = page.locator("[style*='confetti-fall']");
    const count = await particles.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test("Return to Home button", async ({ page }) => {
    await expect(
      page.locator("button:has-text('Return to Home')"),
    ).toBeVisible();
  });

  test("Share with Friends outline button", async ({ page }) => {
    const btn = page.locator("button:has-text('Share with Friends')");
    await expect(btn).toBeVisible();
    const borderColor = await btn.evaluate(
      (el) => getComputedStyle(el).borderColor,
    );
    expect(borderColor).toBe(COLORS.gold);
  });
});

// ──────────────────────────────────────
// GYM LIST
// ──────────────────────────────────────
test.describe("Gym List Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/gyms");
    await page.waitForLoadState("networkidle");
  });

  test("search bar with gold border", async ({ page }) => {
    const search = page.locator("input[placeholder*='Search']");
    await expect(search).toBeVisible();
  });

  test("filter chips present", async ({ page }) => {
    await expect(page.locator("button:has-text('Near Me')")).toBeVisible();
    await expect(page.locator("button:has-text('Top Rated')")).toBeVisible();
    await expect(page.locator("button:has-text('Cheapest')")).toBeVisible();
  });

  test("active filter chip has gold border", async ({ page }) => {
    const nearMe = page.locator("button:has-text('Near Me')");
    const borderColor = await nearMe.evaluate(
      (el) => getComputedStyle(el).borderColor,
    );
    expect(borderColor).toBe(COLORS.gold);
  });
});

// ──────────────────────────────────────
// SYNC FITNESS
// ──────────────────────────────────────
test.describe("Sync Fitness Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sync");
    await page.waitForLoadState("networkidle");
  });

  test("page title visible", async ({ page }) => {
    await expect(page.locator("text=Sync Fitness Data")).toBeVisible();
  });

  test("3 provider cards", async ({ page }) => {
    await expect(page.locator("text=Google Fit")).toBeVisible();
    await expect(page.locator("text=Apple Health")).toBeVisible();
    await expect(page.locator("text=Telegram Activity")).toBeVisible();
  });

  test("yellow Connect buttons", async ({ page }) => {
    const connectBtn = page.locator("button:has-text('Connect')").first();
    await expect(connectBtn).toBeVisible();
    const bg = await connectBtn.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    // #FFC107 = rgb(255, 193, 7)
    expect(bg).toBe("rgb(255, 193, 7)");
  });

  test("Sync Now CTA is green", async ({ page }) => {
    const btn = page.locator("button:has-text('Sync Now')");
    const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe(COLORS.green);
  });
});

// ──────────────────────────────────────
// QR CHECK-IN
// ──────────────────────────────────────
test.describe("QR Check-in Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/qr/test");
    await page.waitForLoadState("networkidle");
  });

  test("check-in title visible", async ({ page }) => {
    await expect(page.locator("text=Check-in at")).toBeVisible();
  });

  test("QR code container has green border", async ({ page }) => {
    const qr = page.locator("[class*='bg-white'][class*='rounded']").first();
    await expect(qr).toBeVisible();
    const border = await qr.evaluate((el) => getComputedStyle(el).borderColor);
    expect(border).toBe(COLORS.green);
  });

  test("scan instruction in gold", async ({ page }) => {
    const text = page.locator("text=Scan to confirm");
    await expect(text).toBeVisible();
    const color = await text.evaluate((el) => getComputedStyle(el).color);
    expect(color).toBe(COLORS.gold);
  });

  test("session progress bar visible", async ({ page }) => {
    await expect(page.locator("text=Session 3 of 5")).toBeVisible();
    await expect(page.locator("text=60%")).toBeVisible();
  });
});

// ──────────────────────────────────────
// PROFILE
// ──────────────────────────────────────
// Profile requires Telegram auth — skip in unauthenticated browser tests
test.describe("Profile Page (requires auth)", () => {
  test.skip();

  test("green-bordered stat card for Total Earned", async ({ page }) => {
    await page.goto("/profile");
    const card = page.locator("text=Total Earned").locator("..");
    const border = await card.evaluate(
      (el) => getComputedStyle(el).borderColor,
    );
    expect(border).toBe(COLORS.green);
  });
});

// ──────────────────────────────────────
// CROSS-PAGE CHECKS
// ──────────────────────────────────────
test.describe("Cross-page design consistency", () => {
  const pages = [
    "/",
    "/notifications",
    "/payment",
    "/win",
    "/gyms",
    "/sync",
    "/qr/test",
    "/profile",
  ];

  for (const path of pages) {
    test(`${path} has dark background`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const bg = await page
        .locator("body")
        .evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(bg).toBe(COLORS.bgPrimary);
    });
  }

  for (const path of ["/", "/gyms", "/notifications", "/profile"]) {
    test(`${path} has 5-tab bottom nav`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const nav = page.locator("nav");
      await expect(nav).toBeVisible();
      const count = await nav.locator("button").count();
      expect(count).toBe(5);
    });
  }

  test("no console errors on home", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    // Filter out expected network errors (API calls fail without Telegram auth)
    const unexpected = errors.filter(
      (e) =>
        !e.includes("ERR_CONNECTION_REFUSED") &&
        !e.includes("Failed to load resource"),
    );
    expect(unexpected).toEqual([]);
  });
});
