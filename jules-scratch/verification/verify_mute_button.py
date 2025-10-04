from playwright.sync_api import Page, expect

def test_mute_button_and_dialog(page: Page):
    """
    This test verifies that the "Mute" button is present in the player modal
    and that clicking it opens the correct dialog with a duration input.
    """
    # 1. Arrange: Go to the NUI browser page.
    page.goto("http://localhost:40121/#/player/1")

    # 2. Act: Navigate to the "Actions" tab.
    actions_tab = page.get_by_role("tab", name="Actions")
    actions_tab.click()

    # 3. Assert: Check if the "Mute" button is visible.
    mute_button = page.get_by_role("button", name="Mute")
    expect(mute_button).to_be_visible()

    # 4. Act: Click the "Mute" button.
    mute_button.click()

    # 5. Assert: Check if the dialog is visible and has the correct elements.
    dialog = page.get_by_role("dialog")
    expect(dialog).to_be_visible()
    expect(dialog.get_by_role("heading", name="Mute playerone"))
    expect(dialog.get_by_placeholder("Mute reason")).to_be_visible()
    expect(dialog.get_by_placeholder("Enter duration (e.g., 10 minutes, 2 hours, 1 day)")).to_be_visible()


    # 6. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/verification.png")