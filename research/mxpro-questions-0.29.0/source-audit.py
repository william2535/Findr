#!/usr/bin/env python3
"""Recheck the MxPro procedure pack against its actual downloaded sources."""
import argparse
import hashlib
import json
import re
import subprocess
import urllib.request
from pathlib import Path


def quotations(value):
    if isinstance(value, dict):
        if "quote" in value:
            yield value
        for child in value.values():
            yield from quotations(child)
    elif isinstance(value, list):
        for child in value:
            yield from quotations(child)


def normalise(text):
    return re.sub(r"\s+", " ", text).strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--download", action="store_true", help="Fetch only missing source files")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    audit = json.loads(Path(__file__).with_suffix(".json").read_text())
    pack = json.loads((root / "public/app/data/quick-procedures.json").read_text())
    sources = {source["recordId"]: source for source in audit["sources"]}
    args.cache.mkdir(parents=True, exist_ok=True)
    results = []
    for procedure in pack["procedures"]:
        manual = procedure["manual"]
        if manual["recordId"] not in sources:
            continue  # This historical audit owns only its reviewed MxPro editions.
        source = sources[manual["recordId"]]
        pdf = args.cache / (manual["recordId"] + ".pdf")
        if not pdf.exists() and args.download:
            request = urllib.request.Request(source["url"], headers={"User-Agent": "FINDR-source-audit/0.29"})
            with urllib.request.urlopen(request, timeout=60) as response:
                pdf.write_bytes(response.read())
        if not pdf.exists():
            raise SystemExit(f"Missing {pdf}; supply the reviewed copy or use --download.")
        actual = hashlib.sha256(pdf.read_bytes()).hexdigest()
        if actual != manual["sha256"] or actual != source["sha256"]:
            raise SystemExit(f"Changed source {manual['recordId']}: SHA-256 {actual}; review required.")
        info = subprocess.run(["pdfinfo", str(pdf)], check=True, capture_output=True, text=True).stdout
        count = int(re.search(r"^Pages:\s+(\d+)", info, re.M).group(1))
        if count != manual["pageCount"]:
            raise SystemExit(f"Unexpected PDF page count for {manual['recordId']}: {count}")
        text = subprocess.run(
            ["pdftotext", "-layout", str(pdf), "-"], check=True, capture_output=True, text=True
        ).stdout
        pages = text.split("\f")
        unique = {(ref["page"], ref["quote"]) for ref in quotations(procedure)}
        for page, quote in unique:
            if normalise(quote) not in normalise(pages[page - 1]):
                raise SystemExit(f"Source anchor mismatch: {manual['recordId']} PDF page {page}: {quote!r}")
        results.append({"recordId": manual["recordId"], "sha256": actual, "pages": count,
                        "uniqueSourceAnchors": len(unique), "allAnchorsMatch": True})
    print(json.dumps({"source": "real PDFs", "results": results}, indent=2))


if __name__ == "__main__":
    main()
