#!/usr/bin/env python3
"""Build Happy Map with the EXISTING signing key. Never creates signing material."""
import os,pathlib,subprocess,zipfile,json,hashlib,re,shutil
from asset_bundle import verify, verify_apk, catalog_manifest
from release_checks import verify_release
ROOT=pathlib.Path(__file__).resolve().parent
TASK=pathlib.Path('/Users/ermolife/Documents/Codex/2026-10-03/2017-tomorrow-morrow-19-00-20')
TOOLCHAIN=pathlib.Path('/Users/ermolife/Documents/Codex/2026-09-14/x20/work/android-toolchain')
SDK=pathlib.Path(os.environ.get('MORROW_ANDROID_SDK',TOOLCHAIN/'sdk'))
JAVA=pathlib.Path(os.environ.get('MORROW_JAVA_HOME',TOOLCHAIN/'java/Contents/Home'))
SIGN=pathlib.Path(os.environ.get('MORROW_SIGNING_DIR',TASK/'work/android-signing'))
BUILD=ROOT/'build';BT=SDK/'build-tools/36.0.0';PLATFORM=SDK/'platforms/android-36/android.jar'
try:
 release,published=verify_release()
 proof=verify()
except (ValueError,KeyError,FileNotFoundError) as error:
 raise SystemExit('Build blocked: '+str(error))
ENV=dict(os.environ,JAVA_HOME=str(JAVA),PATH=str(JAVA/'bin')+':'+os.environ.get('PATH',''))
password=SIGN/'password';key=SIGN/'morrow-release.p12'
required=[password,key,PLATFORM,JAVA/'bin/javac',JAVA/'bin/jar',JAVA/'bin/keytool',BT/'aapt2',BT/'d8',BT/'zipalign',BT/'apksigner']
if any(not p.exists() for p in required):
 raise SystemExit('Build blocked: existing signing key/password and Android SDK/JDK are required. No replacement key will be generated. Set MORROW_SIGNING_DIR, MORROW_ANDROID_SDK, MORROW_JAVA_HOME on the original build machine.')
def run(*args,capture=False):return subprocess.run([str(x) for x in args],check=True,env=ENV,capture_output=capture,text=capture)
# Verify the actual public APK, not just its JSON metadata, before reading signing material.
published_apk=ROOT.parent/'public/downloads'/published['file']
if pathlib.Path(published['file']).name!=published['file'] or not published_apk.is_file():raise SystemExit('Published APK is missing or has an unsafe filename.')
if hashlib.sha256(published_apk.read_bytes()).hexdigest()!=published['sha256']:raise SystemExit('Published APK hash differs from its release metadata.')
expected=release['previousCertificateSha256']
published_verification=run(BT/'apksigner','verify','--verbose','--print-certs',published_apk,capture=True).stdout
published_cert=re.search(r'Signer #1 certificate SHA-256 digest:\s*([0-9a-fA-F]+)',published_verification)
if not published_cert or published_cert.group(1).lower()!=expected:raise SystemExit('Published APK certificate differs from the pinned release certificate.')
ENV['MORROW_SIGNING_PASSWORD']=password.read_text().strip()
# Confirm compatibility before compiling or emitting any APK. No replacement key.
cert=run(JAVA/'bin/keytool','-list','-v','-keystore',key,'-storepass:env','MORROW_SIGNING_PASSWORD','-alias','morrow',capture=True).stdout
match=re.search(r'SHA256:\s*([0-9A-Fa-f:]+)',cert)
if not match or match.group(1).replace(':','').lower()!=expected:raise SystemExit('Signing certificate differs from the installed app. Refusing to build an incompatible update.')
STAGE=BUILD/'staging'
if STAGE.exists():shutil.rmtree(STAGE)
for p in (STAGE,STAGE/'classes',STAGE/'generated',STAGE/'dex'):p.mkdir(parents=True,exist_ok=True)
run(BT/'aapt2','compile','--dir',ROOT/'res','-o',STAGE/'resources.zip')
run(BT/'aapt2','link','-o',STAGE/'unsigned.apk','-I',PLATFORM,'--manifest',ROOT/'AndroidManifest.xml','--java',STAGE/'generated','-A',ROOT/'assets',STAGE/'resources.zip')
run(JAVA/'bin/javac','-encoding','UTF-8','-source','8','-target','8','-bootclasspath',str(PLATFORM)+os.pathsep+str(BT/'core-lambda-stubs.jar'),'-d',STAGE/'classes',*ROOT.glob('src/**/*.java'),*(STAGE/'generated').glob('**/*.java'))
run(JAVA/'bin/jar','cf',STAGE/'classes.jar','-C',STAGE/'classes','.')
run(BT/'d8','--release','--min-api','26','--lib',PLATFORM,'--output',STAGE/'dex',STAGE/'classes.jar')
with zipfile.ZipFile(STAGE/'unsigned.apk','a',compression=zipfile.ZIP_DEFLATED) as z:
 for p in (STAGE/'dex').glob('*.dex'):z.write(p,p.name)
run(BT/'zipalign','-f','4',STAGE/'unsigned.apk',STAGE/'aligned.apk')
out=BUILD/('happy-map-'+release['version']+'.apk')
candidate=STAGE/'candidate.apk'
run(BT/'apksigner','sign','--ks',key,'--ks-key-alias','morrow','--ks-pass','env:MORROW_SIGNING_PASSWORD','--key-pass','env:MORROW_SIGNING_PASSWORD','--out',candidate,STAGE/'aligned.apk')
verification=run(BT/'apksigner','verify','--verbose','--print-certs',candidate,capture=True).stdout
candidate_cert=re.search(r'Signer #1 certificate SHA-256 digest:\s*([0-9a-fA-F]+)',verification)
if not candidate_cert or candidate_cert.group(1).lower()!=expected:raise SystemExit('APK certificate verification failed.')
run(BT/'zipalign','-c','4',candidate)
badging=run(BT/'aapt2','dump','badging',candidate,capture=True).stdout
identity=re.search(r"package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'",badging)
if not identity or identity.groups()!=(release['package'],str(release['versionCode']),release['version']):raise SystemExit('Built APK package/version mismatch.')
verify();verify_apk(candidate)
candidate.replace(out)
catalogs=catalog_manifest()
metadata={'file':out.name,'version':release['version'],'versionCode':release['versionCode'],'package':release['package'],'minAndroid':'8.0','sizeBytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'certificateSha256':expected,'assetManifestSha256':hashlib.sha256((ROOT/'asset-manifest.json').read_bytes()).hexdigest(),'catalogManifestSha256':proof['catalogManifestSha256'],'supportedCities':catalogs['cityIds'],'maxCatalogBytes':catalogs['maxCatalogBytes']}
(BUILD/'release.json').write_text(json.dumps(metadata,indent=2)+'\n');print(json.dumps(metadata))
