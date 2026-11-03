#!/usr/bin/env python3
"""Bundle the exact current website client, with a registry-derived data allowlist."""
import argparse
from asset_bundle import sync, verify

parser = argparse.ArgumentParser()
parser.add_argument("--check", action="store_true", help="Verify only; do not change assets")
args = parser.parse_args()
if args.check:
    verify()
    print("PASS: Android assets and data allowlist match current website source.")
else:
    files, cities = sync()
    print(f"Bundled {files} exact website assets and {cities} cities; parity verified.")
