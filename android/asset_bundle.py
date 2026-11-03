"""Reproducible Android assets and exact, data-only network allowlist.

This module never reads signing material and can run on any build machine.
"""
import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent / "public"
ASSETS = ROOT / "assets"
PROOF = ROOT / "asset-manifest.json"
CATALOG_ASSET = "android-catalogs.json"
MAX_CATALOG_BYTES = 32 * 1024 * 1024
MAX_PLACES = 150000
MAX_EVENTS = 20000


def source_files(source=SOURCE):
    files = {}
    for path in sorted(source.rglob("*")):
        relative = path.relative_to(source)
        if "downloads" in relative.parts:
            continue
        if path.is_symlink():
            raise ValueError("Symlinks are not allowed in Android assets: " + str(relative))
        if path.is_file():
            files[relative.as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    if CATALOG_ASSET in files:
        raise ValueError("The generated Android allowlist must not be supplied by public/")
    return files


def catalog_manifest(source=SOURCE):
    registry = json.loads((source / "city-picker.json").read_text())
    cities = registry["cities"]
    if not isinstance(cities, list) or not 1 <= len(cities) <= 500:
        raise ValueError("Invalid city registry")
    ids, paths = [], set()
    for city in cities:
        city_id, entry = city["id"], city["path"]
        if not re.fullmatch(r"[a-z]+(?:-[a-z]+)*", city_id) or city_id in ids:
            raise ValueError("Invalid or repeated city ID: " + str(city_id))
        expected = "map.html" if city_id == "tbilisi" else city_id + "/index.html"
        if entry != expected or not (source / entry).is_file():
            raise ValueError("Missing or unsafe city entry: " + str(entry))
        ids.append(city_id)
        folder = "" if city_id == "tbilisi" else city_id + "/"
        for locale in ("", "en/", "de/"):
            for kind in ("events", "places"):
                relative = locale + folder + kind + ".json"
                path = source / relative
                if not path.is_file():
                    if not locale:
                        raise ValueError("Missing canonical city data: " + relative)
                    continue
                if path.stat().st_size > MAX_CATALOG_BYTES:
                    raise ValueError("Catalog exceeds Android byte limit: " + relative)
                data = json.loads(path.read_text())
                records = data if isinstance(data, list) else data.get(kind)
                limit = MAX_PLACES if kind == "places" else MAX_EVENTS
                if not isinstance(records, list) or len(records) >= limit:
                    raise ValueError("Catalog exceeds client record limit: " + relative)
                if not all(isinstance(row, dict) and isinstance(row.get("id"), str)
                           and isinstance(row.get("title"), str) for row in records):
                    raise ValueError("Invalid catalog records: " + relative)
                paths.add(relative)
    return {"schemaVersion": 1, "cityIds": ids, "paths": sorted(paths),
            "maxCatalogBytes": MAX_CATALOG_BYTES}


def manifest_bytes(manifest):
    return (json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()


def sync(source=SOURCE, assets=ASSETS, proof=PROOF):
    before = source_files(source)
    catalogs = catalog_manifest(source)
    if assets.exists():
        shutil.rmtree(assets)
    shutil.copytree(source, assets, ignore=shutil.ignore_patterns("downloads"))
    (assets / CATALOG_ASSET).write_bytes(manifest_bytes(catalogs))
    proof.write_bytes(manifest_bytes({
        "schemaVersion": 2, "source": "public", "files": before,
        "catalogManifestSha256": hashlib.sha256(manifest_bytes(catalogs)).hexdigest()
    }))
    verify(source, assets, proof)
    return len(before), len(catalogs["cityIds"])


def verify(source=SOURCE, assets=ASSETS, proof=PROOF):
    """Fail on stale, missing, extra or modified assets, including registry drift."""
    if not proof.is_file() or not assets.is_dir():
        raise ValueError("Android assets are absent; run python3 android/sync-assets.py")
    saved = json.loads(proof.read_text())
    current = source_files(source)
    if saved.get("schemaVersion") != 2 or saved.get("files") != current:
        raise ValueError("Website source changed; run python3 android/sync-assets.py again")
    actual = {}
    for path in sorted(assets.rglob("*")):
        if path.is_symlink():
            raise ValueError("Symlink in bundled assets")
        if path.is_file():
            actual[path.relative_to(assets).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    generated = manifest_bytes(catalog_manifest(source))
    expected = dict(current, **{CATALOG_ASSET: hashlib.sha256(generated).hexdigest()})
    if actual != expected or saved.get("catalogManifestSha256") != expected[CATALOG_ASSET]:
        raise ValueError("Bundled assets or catalog allowlist differ from current website source")
    return saved


def verify_apk(apk, proof=PROOF):
    import zipfile
    saved = json.loads(proof.read_text())
    expected = {"assets/" + name: digest for name, digest in saved["files"].items()}
    expected["assets/" + CATALOG_ASSET] = saved["catalogManifestSha256"]
    with zipfile.ZipFile(apk) as archive:
        names = [name for name in archive.namelist() if name.startswith("assets/") and not name.endswith("/")]
        if len(names) != len(set(names)) or set(names) != set(expected):
            raise ValueError("APK asset inventory differs from verified bundle")
        for name, digest in expected.items():
            if hashlib.sha256(archive.read(name)).hexdigest() != digest:
                raise ValueError("APK asset differs from website source: " + name)
