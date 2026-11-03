"""Non-secret release gates, intentionally separate from the signing process."""
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ANDROID_NS = "{http://schemas.android.com/apk/res/android}"


def verify_release(root=ROOT):
    release = json.loads((root / "release.json").read_text())
    published = json.loads((root.parent / "public/android-release.json").read_text())
    manifest = ET.parse(root / "AndroidManifest.xml").getroot()
    if release["package"] != published["package"] or manifest.attrib["package"] != release["package"]:
        raise ValueError("Package changed; this would not preserve the installed application")
    if (manifest.attrib[ANDROID_NS + "versionName"] != release["version"]
            or int(manifest.attrib[ANDROID_NS + "versionCode"]) != release["versionCode"]):
        raise ValueError("AndroidManifest.xml and android/release.json versions differ")
    expected = release["previousCertificateSha256"]
    if not re.fullmatch("[0-9a-f]{64}", expected) or expected != published["certificateSha256"]:
        raise ValueError("Release certificate differs from the currently distributed APK")
    if release["versionCode"] <= published["versionCode"] or release["version"] == published["version"]:
        raise ValueError("New APK release requires a higher versionCode and a new versionName; "
                         "leave public/android-release.json unchanged until the signed APK is verified")
    return release, published
