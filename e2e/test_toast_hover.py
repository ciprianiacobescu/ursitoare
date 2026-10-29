"""C-817bfc8a: the toast Dismiss button keeps a readable background while hovered."""

import json
import re

import pytest
from playwright.sync_api import Page, Route, expect

TRANSPARENT = "rgba(0, 0, 0, 0)"
TOAST_BACKGROUND = "rgb(27, 31, 39)"

_COLOUR = re.compile(
    r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+)\s*)?\)"
)


def _colour(value: str) -> tuple[int, int, int, float]:
    match = _COLOUR.fullmatch(value.strip())
    assert match is not None, f"not an rgb colour: {value}"
    red, green, blue = (int(match.group(index)) for index in (1, 2, 3))
    alpha = float(match.group(4)) if match.group(4) is not None else 1.0
    return red, green, blue, alpha


def _channel_luminance(channel: int) -> float:
    value = channel / 255
    return value / 12.92 if value <= 0.03928 else ((value + 0.055) / 1.055) ** 2.4


def _luminance(value: str) -> float:
    red, green, blue, _ = _colour(value)
    return (
        0.2126 * _channel_luminance(red)
        + 0.7152 * _channel_luminance(green)
        + 0.0722 * _channel_luminance(blue)
    )


def _contrast_ratio(foreground: str, background: str) -> float:
    lighter = max(_luminance(foreground), _luminance(background))
    darker = min(_luminance(foreground), _luminance(background))
    return (lighter + 0.05) / (darker + 0.05)


@pytest.mark.milestone("M1")
@pytest.mark.l4("C-817bfc8a")
def test_c_817bfc8a_toast_dismiss_keeps_background_on_hover(
    page: Page, base_url: str, fresh_state: None
) -> None:
    def answer(route: Route) -> None:
        route.fulfill(
            status=503,
            content_type="application/json",
            body=json.dumps(
                {"error": {"code": "AUTHZ_UNAVAILABLE", "message": "x"}}
            ),
        )

    page.route("**/api/v1/me", answer)
    page.goto(f"{base_url}/")

    dismiss = page.get_by_role("button", name="Dismiss")
    expect(dismiss).to_be_visible()
    toast = page.locator(".ui-toast").filter(has=dismiss)
    expect(toast).to_have_count(1)

    dismiss.hover()

    styles = dismiss.evaluate(
        """(element) => {
            const button = getComputedStyle(element);
            const container = getComputedStyle(element.parentElement);
            return {
                background: button.backgroundColor,
                colour: button.color,
                toastBackground: container.backgroundColor,
            };
        }"""
    )
    background = styles["background"]
    assert background in (TRANSPARENT, TOAST_BACKGROUND), (
        f"the hovered Dismiss button keeps a transparent or toast background, got {background}"
    )

    effective = (
        styles["toastBackground"] if background == TRANSPARENT else background
    )
    assert effective == TOAST_BACKGROUND, (
        f"the effective background is the toast background, got {effective}"
    )
    assert _contrast_ratio(styles["colour"], effective) >= 4.5, (
        f"the Dismiss label {styles['colour']} contrasts with {effective}"
    )
