#!/usr/bin/env python3
"""Add reviewed picture batches without resetting FINDR's existing library.

Usage: python scripts/add-panel-images.py /absolute/path/to/picture-batches
Each batch has panels.json, images/, and optional coverage.json / aliases.json.
Use the current panels.json schema; every image must retain its source credit.
PDF files are research inputs only and are never copied into the application.
"""
from collections import defaultdict
from datetime import date
from io import BytesIO
from pathlib import Path
import hashlib
import json
import re
import sys

from PIL import Image, ImageOps

project = Path(__file__).resolve().parents[1]
app = project / "public/app"
data = app / "data"


def read(path):
    return json.loads(path.read_text())


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")


def record_ids(values):
    result = sorted(set(values))
    missing = set(result) - records.keys()
    if missing:
        raise ValueError(f"Unknown archive identifiers: {sorted(missing)}")
    return result


root = Path(sys.argv[1]).resolve()
catalogue = read(data / "catalogue.json")
records = {r["id"]: r for r in catalogue["records"]}
current = read(data / "panels.json")
panels = {p["id"]: p for p in current}
assert len(panels) == len(current), "Existing panel identifiers must be unique"
original_ids = set(panels)
coverage = read(data / "coverage.json")
unresolved = {x["id"]: x for x in coverage.get("unresolved", [])}
resolved = []
added = []
updated = []

for batch in sorted(root.iterdir()):
    manifest = batch / "panels.json"
    if not manifest.is_file():
        continue
    entries = read(manifest)
    assert len({p["id"] for p in entries}) == len(entries), f"Duplicate IDs in {batch.name}"
    for incoming in entries:
        identifier = incoming["id"]
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]+", identifier):
            raise ValueError(f"Unsafe panel identifier: {identifier}")
        previous = panels.get(identifier, {})
        if previous and any(previous[k] != incoming[k] for k in ["brand", "category"]):
            raise ValueError(f"Review brand/category change separately: {identifier}")
        panel = {**previous, **incoming}
        for key in ["brand", "model", "category", "source_image_url", "source_page_url", "image_credit", "image_type"]:
            if not panel.get(key):
                raise ValueError(f"{identifier}: missing {key}")
        path = (batch / "images" / incoming["image"]).resolve()
        if not path.is_relative_to(batch.resolve()) or not path.is_file():
            raise ValueError(f"{identifier}: invalid image path {path}")
        image = ImageOps.exif_transpose(Image.open(BytesIO(path.read_bytes())))
        if image.mode not in ("RGB", "RGBA") or "transparency" in image.info:
            image = image.convert("RGBA" if "transparency" in image.info else "RGB")
        image.thumbnail((900, 900), Image.Resampling.LANCZOS)
        filename = identifier + ".webp"
        destination = app / "panels" / filename
        image.save(destination, "WEBP", quality=88, method=6)
        panel["image"] = filename
        panel["image_sha256"] = hashlib.sha256(destination.read_bytes()).hexdigest()
        panel["image_dimensions"] = list(image.size)
        panel["aliases"] = sorted(set(previous.get("aliases", []) + incoming.get("aliases", []) + [panel["model"]]))
        panel["record_ids"] = record_ids(previous.get("record_ids", []) + incoming.get("record_ids", []))
        panel["source_pdf_page"] = panel.get("source_pdf_page") or panel.get("source_document_page") or panel.get("source_page_number")
        panel.pop("image_local_path", None)
        panels[identifier] = panel
        (updated if previous else added).append(identifier)

    audit_file = batch / "coverage.json"
    if audit_file.is_file():
        audit = read(audit_file)
        write(project / "research/panel-audit" / f"{batch.name}.json", audit)
        candidates = audit if isinstance(audit, list) else audit.get("candidates", audit.get("unresolved", []))
        for candidate in candidates:
            if candidate.get("id") and candidate.get("model"):
                unresolved[candidate["id"]] = candidate

    alias_file = batch / "aliases.json"
    if alias_file.is_file():
        aliases = read(alias_file)
        for alias in aliases:
            target = panels[alias["target_panel_id"]]
            target["aliases"] = sorted(set(target.get("aliases", []) + alias.get("aliases", [])))
            target["record_ids"] = record_ids(target["record_ids"] + alias.get("record_ids", []))
            unresolved.pop(alias["id"], None)
            resolved.append(alias)

excluded = {"verified-image", "verified", "excluded", "not-panel", "non-panel", "accessory", "duplicate"}
unresolved = [x for x in unresolved.values() if x["id"] not in panels and x.get("status") not in excluded]
grouped = defaultdict(list)
for panel in panels.values():
    grouped[panel["brand"], panel["category"]].append(panel)
old_packs = {(p["brand"], p["category"]): p for p in read(data / "packs.json")}
packs = []
for (brand, category), members in sorted(grouped.items()):
    pack = dict(old_packs.get((brand, category), {}))
    ids = set(pack.get("record_ids", []))
    ids.update(identifier for p in members for identifier in p["record_ids"])
    for candidate in unresolved:
        if candidate["brand"] == brand:
            ids.update(i for i in candidate.get("record_ids", []) if i in records and records[i]["category"] == category)
    ids = record_ids(ids)
    pack.update({
        "id": pack.get("id") or re.sub(r"[^a-z0-9]+", "-", brand.lower()).strip("-") + "-" + category,
        "brand": brand, "category": category, "title": brand + " panel pack",
        "description": pack.get("description") or ("Matched panel manuals, user guides and technical references from Manual Archives, including retained historical editions." if ids else "Pictured panel families for visual identification. Matching manuals have not yet been linked in this archive snapshot."),
        "scope": pack.get("scope") or ("Identified panel families in the recorded archive snapshot. Confirm the installed model and manual edition." if ids else "Picture identification references only. Confirm the exact installed model; this pack does not yet include linked manuals."),
        "panel_ids": [p["id"] for p in sorted(members, key=lambda p: p["model"].casefold())],
        "record_ids": ids, "record_count": len(ids),
        "direct_pdf_count": sum(bool(records[i]["url"]) for i in ids),
        "repository_url": catalogue["repository"], "source_commit": catalogue["commit"],
    })
    packs.append(pack)

ordered = sorted(panels.values(), key=lambda p: (p["id"] != "gent-vigilon-compact", p["brand"].casefold(), p["model"].casefold()))
assert original_ids <= panels.keys(), "An addition must not remove existing panels"
coverage.update({
    "generated": date.today().isoformat(), "repository_commit": catalogue["commit"],
    "pictured_families": len(ordered), "brands": len({p["brand"] for p in ordered}),
    "packs": len(packs), "unresolved": unresolved,
})
write(data / "panels.json", ordered)
write(data / "packs.json", packs)
write(data / "coverage.json", coverage)
summary = {
    "date": date.today().isoformat(), "previous_pictured_families": len(current),
    "pictured_families": len(ordered), "brands": coverage["brands"], "packs": len(packs),
    "added_panel_ids": added, "updated_panel_ids": updated, "resolved_aliases": resolved,
    "remaining_tracked_candidates": len(unresolved),
    "picture_bytes": sum((app / "panels" / p["image"]).stat().st_size for p in ordered),
}
write(project / "research/panel-audit/latest-additions.json", summary)
print(json.dumps(summary))
