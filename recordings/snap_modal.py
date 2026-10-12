import time
from playwright.sync_api import sync_playwright

def snap():
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        page = b.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://127.0.0.1:5174/ingestion", wait_until="networkidle")
        time.sleep(1.0)
        btn = page.locator(".icon-btn[aria-label*='Settings']")
        if btn.count() > 0:
            btn.first.click()
            time.sleep(0.8)
            tab = page.locator("button:has-text('Telemetry')")
            if tab.count() > 0:
                tab.click()
                time.sleep(0.8)
            page.screenshot(path="recordings/clean_modal_telemetry.png")
            print("[SUCCESS] Screenshot saved to recordings/clean_modal_telemetry.png")
        b.close()

if __name__ == "__main__":
    snap()
