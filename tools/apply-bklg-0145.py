#!/usr/bin/env python3
"""Apply BKLG-0145 national pilot messaging changes to versioned site artifacts."""
from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


root = Path(__file__).resolve().parents[1]
index_path = root / "index.html"
index = index_path.read_text(encoding="utf-8")
replacements = [
    ("Join the Michigan pilot", "Join the pilot", "hero pilot CTA"),
    ("<p class=\"michigan-note\"><strong>Starting in Michigan:</strong> Drive Venture currently supports families working toward Michigan’s 50 supervised hours, including 10 hours at night.</p>", "<p class=\"michigan-note\"><strong>Pilot availability:</strong> Drive Venture is currently accepting families in Michigan and Kansas. Licensing rules differ by state, so families should always confirm their current state requirements.</p>", "when-to-use pilot availability"),
    ("<h2 id=\"pilot-title\">Starting in Michigan. Built for every road.</h2>", "<h2 id=\"pilot-title\">A growing pilot. Built for every road.</h2>", "pilot heading"),
    ("<p>Drive Venture starts in Michigan, where pilot families are working toward 50 supervised hours, including 10 at night. We are building a simple way to keep those hours visible, share the work, and learn what helps families practice together.</p>", "<p>Drive Venture’s pilot now includes families in Michigan and Kansas. We are building a simple way to keep supervised-practice hours visible, share the work, and learn what helps families practice together as the pilot grows.</p>", "pilot body"),
    ("<p>Michigan is where Drive Venture begins, but families across the country face different practice rules. Our review covers all 50 states and Washington, D.C. Requirements can change based on age, driver education, and licensing path, so always check your state’s current rules.</p>", "<p>Families across the country face different supervised-practice rules. Our review covers all 50 states and Washington, D.C. Pilot availability is currently limited to Michigan and Kansas; the map’s other categories describe licensing requirements, not Drive Venture availability. Requirements can change based on age, driver education, and licensing path, so always check your state’s current rules.</p>", "requirements intro"),
    ("alt=\"Geographic United States political map of supervised-driving requirements. Michigan is currently supported by Drive Venture; 28 other jurisdictions require exactly 50 hours; 20 require a different number of supervised hours; and Arkansas and Mississippi have no verified statewide accumulated-hours minimum. Alaska and Hawaii appear as insets.\"", "alt=\"Geographic United States political map of supervised-driving requirements. Drive Venture pilot availability is highlighted for Michigan and Kansas; other map categories describe supervised-practice hour requirements. Arkansas and Mississippi have no verified statewide accumulated-hours minimum. Alaska and Hawaii appear as insets.\"", "map alt"),
    ("<strong>Currently supported by Drive Venture</strong><small>Michigan</small>", "<strong>Drive Venture pilot currently available</strong><small>Michigan and Kansas</small>", "map legend pilot availability"),
    ("<p>In Michigan? Join the pilot. Somewhere else—or just planning ahead? Join the waitlist and help us decide where Drive Venture goes next.</p>", "<p>In Michigan or Kansas? Join the pilot. Somewhere else—or just planning ahead? Join the waitlist and help us decide where Drive Venture goes next.</p>", "final CTA copy"),
    ("Join the Michigan pilot", "Join the pilot", "final pilot CTA"),
]
for old, new, label in replacements:
    index = replace_once(index, old, new, label)
index_path.write_text(index, encoding="utf-8")

# The map's bright-yellow category now means pilot availability, independent of
# the requirements categories. Preserve the underlying requirements research.
map_path = root / "assets" / "images" / "state-requirements-map.svg"
svg = map_path.read_text(encoding="utf-8")
svg = replace_once(
    svg,
    "Michigan is bright yellow as currently supported. Other exact-50-hour states are light yellow.",
    "Michigan and Kansas are bright yellow where the Drive Venture pilot is currently available. Other exact-50-hour states are light yellow.",
    "map description",
)
ks_marker = '<g id="KS" class="state exact50"'
if svg.count(ks_marker) != 1:
    raise RuntimeError(f"Kansas map group: expected exactly one match, found {svg.count(ks_marker)}")
start = svg.index(ks_marker)
end = svg.index("</g>", start) + len("</g>")
ks = svg[start:end]
ks = replace_once(ks, 'class="state exact50"', 'class="state supported"', "Kansas class")
ks = replace_once(ks, 'style="fill:#dfcc7a"', 'style="fill:#f4b820"', "Kansas fill")
svg = svg[:start] + ks + svg[end:]
map_path.write_text(svg, encoding="utf-8")

# Keep the map generator aligned with the checked-in artifact without changing
# the licensing-research dataset's meaning.
generator_path = root / "tools" / "build-state-requirements-map.py"
generator = generator_path.read_text(encoding="utf-8")
generator = replace_once(generator, 'VALID = {', 'PILOT_STATES = {"MI", "KS"}\nVALID = {', "pilot state constant")
generator = replace_once(generator, 'category = "supported" if row["CurrentSupport"].lower()=="true" else "exact50"', 'category = "supported" if abbr in PILOT_STATES else "exact50"', "map category logic")
generator = replace_once(generator, 'Michigan is bright yellow as currently supported. Other exact-50-hour states are light yellow.', 'Michigan and Kansas are bright yellow where the Drive Venture pilot is currently available. Other exact-50-hour states are light yellow.', "generator description")
generator_path.write_text(generator, encoding="utf-8")
