#!/usr/bin/env python3
"""No SDK, signing credentials, network, or released APK mutation required."""
import json
import re
import tempfile
import unittest
import zipfile
from pathlib import Path

from asset_bundle import (CATALOG_ASSET, MAX_CATALOG_BYTES, ROOT, SOURCE,
                          catalog_manifest, source_files, sync, verify, verify_apk)
from release_checks import verify_release


class BundleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.source = self.root / "public"
        self.assets = self.root / "assets"
        self.proof = self.root / "proof.json"
        self.source.mkdir()
        self.registry = {"cities": [{"id": "tbilisi", "path": "map.html"}]}
        self.write("city-picker.json", self.registry)
        (self.source / "map.html").write_text("<title>Map</title>")
        (self.source / "app.js").write_text("const app = 'current';")
        self.write("events.json", {"events": [{"id": "e", "title": "Event"}]})
        self.write("places.json", {"places": [{"id": "p", "title": "Place"}]})

    def tearDown(self):
        self.temp.cleanup()

    def write(self, name, value):
        path = self.source / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value))

    def bundle(self):
        return sync(self.source, self.assets, self.proof)

    def check(self):
        return verify(self.source, self.assets, self.proof)

    def test_exact_copy_and_generated_allowlist(self):
        self.assertEqual(self.bundle(), (5, 1))
        self.check()
        self.assertEqual((self.source / "app.js").read_bytes(), (self.assets / "app.js").read_bytes())
        self.assertEqual(json.loads((self.assets / CATALOG_ASSET).read_text())["paths"],
                         ["events.json", "places.json"])

    def test_apks_are_excluded(self):
        self.write("downloads/old.apk", "not included")
        self.bundle()
        self.assertFalse((self.assets / "downloads").exists())

    def test_stale_source_rejected(self):
        self.bundle()
        (self.source / "app.js").write_text("const app = 'newer';")
        with self.assertRaisesRegex(ValueError, "Website source changed"):
            self.check()

    def test_tampered_bundle_rejected(self):
        self.bundle()
        (self.assets / "app.js").write_text("tampered")
        with self.assertRaisesRegex(ValueError, "differ"):
            self.check()

    def test_extra_bundle_asset_rejected(self):
        self.bundle()
        (self.assets / "unreviewed.js").write_text("extra")
        with self.assertRaisesRegex(ValueError, "differ"):
            self.check()

    def test_missing_city_data_rejected(self):
        (self.source / "places.json").unlink()
        with self.assertRaisesRegex(ValueError, "Missing canonical"):
            self.bundle()

    def test_unsafe_registry_path_rejected(self):
        self.registry["cities"][0]["path"] = "https://example.com/map.html"
        self.write("city-picker.json", self.registry)
        with self.assertRaisesRegex(ValueError, "unsafe city entry"):
            self.bundle()

    def test_duplicate_city_rejected(self):
        self.registry["cities"] *= 2
        self.write("city-picker.json", self.registry)
        with self.assertRaisesRegex(ValueError, "repeated city"):
            self.bundle()

    def test_symlinks_rejected(self):
        (self.source / "linked.js").symlink_to(self.source / "app.js")
        with self.assertRaisesRegex(ValueError, "Symlinks"):
            source_files(self.source)

    def test_source_cannot_supply_allowlist(self):
        self.write(CATALOG_ASSET, {"paths": ["evil.js"]})
        with self.assertRaisesRegex(ValueError, "must not be supplied"):
            self.bundle()

    def test_apk_matches_proof_and_tamper_rejected(self):
        self.bundle()
        archive = self.root / "test.apk"
        with zipfile.ZipFile(archive, "w") as output:
            for path in self.assets.iterdir():
                output.write(path, "assets/" + path.name)
        verify_apk(archive, self.proof)
        with zipfile.ZipFile(archive, "a") as output:
            output.writestr("assets/unreviewed.js", "extra")
        with self.assertRaisesRegex(ValueError, "inventory"):
            verify_apk(archive, self.proof)

    def test_current_catalogs_fit_and_all_cities_are_allowed(self):
        manifest = catalog_manifest()
        registry = json.loads((SOURCE / "city-picker.json").read_text())
        self.assertEqual(manifest["cityIds"], [city["id"] for city in registry["cities"]])
        self.assertIn("flensburg/events.json", manifest["paths"])
        self.assertIn("london/places.json", manifest["paths"])
        self.assertIn("berlin/places.json", manifest["paths"])
        self.assertGreater(MAX_CATALOG_BYTES, (SOURCE / "berlin/places.json").stat().st_size)
        native = (ROOT / "src/ge/morrow/app/MainActivity.java").read_text()
        self.assertIn("MAX_CATALOG_BYTES = 32 * 1024 * 1024", native)
        self.assertIn("publishedCatalogPaths.contains(path)", native)
        self.assertIn('new java.net.URL("https://happymap.app/" + path)', native)
        self.assertIn("setInstanceFollowRedirects(false)", native)
        self.assertIn('"appassets.androidplatform.net"', native)
        self.assertNotIn("addJavascriptInterface", native)
        self.assertIn("d.length<150000", (SOURCE / "london/discovery.js").read_text())
        for path in manifest["paths"]:
            self.assertRegex(path, r"^(?:(?:en|de)/)?(?:[a-z]+(?:-[a-z]+)*/)?(?:events|places)\.json$")
            self.assertNotIn("..", path)


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / "android"
        self.root.mkdir()
        (self.root.parent / "public").mkdir()
        self.release = {"version": "2.4.10", "versionCode": 24, "package": "ge.morrow.app",
                        "previousCertificateSha256": "a" * 64}
        self.published = {"version": "2.4.9", "versionCode": 23, "package": "ge.morrow.app",
                          "certificateSha256": "a" * 64}
        self.save()

    def tearDown(self):
        self.temp.cleanup()

    def save(self):
        (self.root / "release.json").write_text(json.dumps(self.release))
        (self.root.parent / "public/android-release.json").write_text(json.dumps(self.published))
        (self.root / "AndroidManifest.xml").write_text(
            '<manifest xmlns:android="http://schemas.android.com/apk/res/android" '
            f'package="ge.morrow.app" android:versionName="{self.release["version"]}" '
            f'android:versionCode="{self.release["versionCode"]}"/>')

    def test_new_release_allowed(self):
        self.assertEqual(verify_release(self.root)[0], self.release)

    def test_unbumped_version_rejected(self):
        self.release.update(version="2.4.9", versionCode=23)
        self.save()
        with self.assertRaisesRegex(ValueError, "higher versionCode"):
            verify_release(self.root)

    def test_changed_certificate_rejected(self):
        self.release["previousCertificateSha256"] = "b" * 64
        self.save()
        with self.assertRaisesRegex(ValueError, "certificate differs"):
            verify_release(self.root)

    def test_changed_package_rejected(self):
        self.release["package"] = "different.app"
        self.save()
        with self.assertRaisesRegex(ValueError, "Package changed"):
            verify_release(self.root)

    def test_manifest_version_drift_rejected(self):
        self.release["versionCode"] = 25
        (self.root / "release.json").write_text(json.dumps(self.release))
        with self.assertRaisesRegex(ValueError, "versions differ"):
            verify_release(self.root)


if __name__ == "__main__":
    unittest.main()
