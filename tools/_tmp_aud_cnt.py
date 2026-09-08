# -*- coding: utf-8 -*-
from pathlib import Path
t = Path(r"c:\github\red\js\26-export.js").read_text(encoding="utf-8")
# search related pieces
for needle in [
    "_maTrigHooked",
    "_audioHandled",
    "maTriggerElIds",
    "click-el",
    "EMBED_MAX",
    "mediaSrcType",
    "fetch(d.mediaSrc",
    "audio/",
]:
    print(needle, t.count(needle))
