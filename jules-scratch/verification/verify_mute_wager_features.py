from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Go to the players page
    page.goto("http://localhost:40122/#/players")

    # Click on the first player in the table to open the modal
    page.locator("tbody > tr:first-child").click()

    # Wait for the modal to appear
    expect(page.locator("div[role='dialog']")).to_be_visible()

    # Click on the "Mute" tab
    page.get_by_role("button", name="Mute").click()

    # Fill out the mute form
    page.locator('input[name="duration"]').fill("1d")
    page.locator('textarea[name="reason"]').fill("Test mute reason")

    # Take a screenshot of the mute form
    page.screenshot(path="jules-scratch/verification/mute_form_verification.png")

    # Click on the "Wager" tab
    page.get_by_role("button", name="Wager").click()

    # Take a screenshot of the wager form
    page.screenshot(path="jules-scratch/verification/wager_form_verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)