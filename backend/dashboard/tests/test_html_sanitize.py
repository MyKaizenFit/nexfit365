from dashboard.html_sanitize import sanitize_help_html


def test_sanitize_help_html_strips_script_and_handlers():
    dirty = '<p>Hola</p><script>alert(1)</script><img src=x onerror="alert(2)">'
    clean = sanitize_help_html(dirty)
    assert "<script" not in clean.lower()
    assert "onerror" not in clean.lower()
    assert "Hola" in clean
