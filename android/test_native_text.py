#!/usr/bin/env python3
"""Verify all six native UI languages using a JDK, without Android or credentials."""
import os
from pathlib import Path
import subprocess
import tempfile
ROOT = Path(__file__).resolve().parent
JAVA = Path(os.environ.get("MORROW_JAVA_HOME", os.environ.get("JAVA_HOME", "/usr"))) / "bin"
TEST = 'package ge.morrow.app;\npublic final class NativeTextTest {\n public static void main(String[] args) {\n  String[] languages={"ru","en","sr","es","de","pt-br"};\n  String[] keys={"openTitle","openMessage","retry","nearby","location","continue","notNow","noDialer","noBrowser","updateTitle","updateMessage","later","openUpdate"};\n  int count=0;\n  for(String lang:languages) for(String key:keys) {\n   String text=NativeText.text(lang,key);\n   if(text==null||text.trim().isEmpty()) throw new AssertionError(lang+key);\n   if(!lang.equals("ru") && text.matches(".*[А-Яа-яЁё].*")) throw new AssertionError(lang+key);\n   count++;\n  }\n  if(!NativeText.normalize("sr-Latn-RS").equals("sr")) throw new AssertionError();\n  if(!NativeText.normalize("pt_BR").equals("pt-br")) throw new AssertionError();\n  if(!NativeText.normalize("fr").equals("en")) throw new AssertionError();\n  System.out.println("PASS: "+count+" localized native strings and locale normalization");\n }\n}\n'
with tempfile.TemporaryDirectory() as directory:
    out = Path(directory)
    test = out / "NativeTextTest.java"
    test.write_text(TEST)
    subprocess.run([str(JAVA / "javac"), "-encoding", "UTF-8", "-d", str(out), str(ROOT / "src/ge/morrow/app/NativeText.java"), str(test)], check=True)
    subprocess.run([str(JAVA / "java"), "-cp", str(out), "ge.morrow.app.NativeTextTest"], check=True)
