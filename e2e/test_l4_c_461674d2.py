# l4: generated test (l4/generated-test@1); rewritten by the harness
import os

import pytest
from playwright.sync_api import Page, expect


@pytest.mark.l4("C-461674d2")
def test_toast_dismiss_focus_outline_contrast(page: Page):
    page.goto(os.environ["L4_E2E_BASE_URL"])
    expect(page.locator("#root")).not_to_be_empty()

    page.evaluate(
        """() => {
          const region = document.querySelector('.ui-toasts') || (() => {
            const d = document.createElement('div');
            d.className = 'ui-toasts';
            document.body.appendChild(d);
            return d;
          })();
          const toast = document.createElement('div');
          toast.className = 'ui-toast';
          toast.innerHTML = '<p>Saved</p><button type="button" class="ui-button" id="probe-dismiss">Dismiss</button>';
          region.appendChild(toast);
        }"""
    )

    # Establish keyboard modality, then focus the Dismiss button.
    page.keyboard.press("Tab")
    page.evaluate("document.getElementById('probe-dismiss').focus()")
    expect(page.locator("#probe-dismiss")).to_be_focused()

    result = page.evaluate(
        """() => {
          const btn = document.getElementById('probe-dismiss');
          const cs = getComputedStyle(btn);
          const resolve = (prop, value) => {
            const p = document.createElement('span');
            p.style.setProperty(prop, value);
            document.body.appendChild(p);
            const out = getComputedStyle(p).getPropertyValue(prop);
            p.remove();
            return out;
          };
          const parse = (s) => (s.match(/[\\d.]+/g) || []).slice(0, 3).map(Number);
          const lum = ([r, g, b]) => {
            const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
            return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
          };
          const bg = resolve('background-color', 'var(--ui-color-toast-bg)');
          const outline = cs.outlineColor;
          const a = lum(parse(outline)), b = lum(parse(bg));
          const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), outline, bg, ratio };
        }"""
    )

    assert result["style"] != "none" and result["width"] > 0, result
    assert result["ratio"] >= 3.0, result
