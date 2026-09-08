# -*- coding: utf-8 -*-
from pathlib import Path
t = Path(r"c:\github\red\js\26-export.js").read_text(encoding="utf-8")
needle = "else if(d.type==='mediaaudio')"
i = t.find(needle)
print("i", i)
chunk = t[i:i+8000]
# write for inspection
Path(r"c:\github\red\tools\_aud_chunk.txt").write_text(chunk, encoding="utf-8")
print("len", len(chunk))
print(chunk[:4000])
print("---MORE---")
print(chunk[4000:8000])
