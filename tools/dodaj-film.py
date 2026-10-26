#!/usr/bin/env python3
"""Dodaje film do podstrony /projekty (kompresja, plakat, HTML, VideoObject JSON-LD).

Przyklady:
  # film w galerii "Wiecej filmow"
  python3 tools/dodaj-film.py ~/film.mp4 --slug tabliczka-na-stolik \
      --tytul "Tabliczka na stolik" --opis "Krotki opis."

  # film w istniejacej karcie (strona, google, opinie, automatyzacja)
  python3 tools/dodaj-film.py ~/film.mp4 --slug opinie --karta opinie \
      --tytul "System zbierania opinii Google" --opis "Krotki opis."

Wymaga: ffmpeg, ffprobe. Folder tools/ nie jest wdrazany (Vercel uzywa podfolderu strony).
"""
import argparse, html, json, re, subprocess, sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / "SOLV_ING_Skales_PLASKA_wszystko_do_roota"
PAGE = SITE / "projekty.html"
ORIGIN = "https://www.solving-agency.pl"


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit("Blad polecenia: %s\n%s" % (" ".join(map(str, cmd)), r.stderr))
    return r.stdout


def probe(path):
    out = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
               "stream=width,height", "-show_entries", "format=duration", "-of", "json", str(path)])
    j = json.loads(out)
    return j["streams"][0]["width"], j["streams"][0]["height"], float(j["format"]["duration"])


def player(slug, tytul, portrait):
    t = html.escape(tytul, quote=True)
    cls = "vid p" if portrait else "vid"
    return (
        '<div class="%s" data-film>\n'
        '        <video poster="/film-%s.webp" data-src="/film-%s.mp4" playsinline preload="none" '
        'aria-label="Film: %s"></video>\n'
        '        <button class="play" type="button" aria-label="Odtwórz film z dźwiękiem: %s">'
        '<span class="tri" aria-hidden="true"></span><i>Odtwórz z dźwiękiem</i></button>\n'
        '      </div>' % (cls, slug, slug, t, t)
    )


def main():
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument("plik")
    a.add_argument("--slug", required=True, help="krotka nazwa (male litery, myslniki)")
    a.add_argument("--tytul", required=True)
    a.add_argument("--opis", required=True)
    a.add_argument("--karta", help="id istniejacej karty: strona, google, opinie, automatyzacja")
    a.add_argument("--poster-czas", type=float, default=3.6, help="sekunda kadru na plakat (domyslnie 3.6)")
    a.add_argument("--data", default="2026-10-26", help="uploadDate do JSON-LD (RRRR-MM-DD)")
    a.add_argument("--nadpisz", action="store_true")
    o = a.parse_args()

    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", o.slug):
        sys.exit("--slug: tylko male litery, cyfry i myslniki")
    src = Path(o.plik).expanduser()
    if not src.exists():
        sys.exit("Brak pliku: %s" % src)
    mp4, webp = SITE / ("film-%s.mp4" % o.slug), SITE / ("film-%s.webp" % o.slug)
    page = PAGE.read_text(encoding="utf-8")
    if ("film-%s.mp4" % o.slug) in page and not o.nadpisz:
        sys.exit("Film '%s' juz jest na stronie (uzyj --nadpisz, zeby wymienic plik)." % o.slug)

    w, h, _ = probe(src)
    portrait = h > w
    scale = "scale='min(720,iw)':-2:flags=lanczos" if portrait else "scale='min(1280,iw)':-2:flags=lanczos"
    run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf", scale, "-c:v", "libx264", "-preset", "slow",
         "-crf", "23", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-b:a", "96k",
         "-ac", "2", "-movflags", "+faststart", str(mp4)])
    run(["ffmpeg", "-v", "error", "-y", "-ss", str(o.poster_czas), "-i", str(mp4), "-frames:v", "1",
         "-vf", "scale=540:-2" if portrait else "scale=960:-2", "-c:v", "libwebp", "-quality", "80", str(webp)])
    ow, oh, dur = probe(mp4)
    mb = mp4.stat().st_size / 1e6
    print("%s: %dx%d, %.0f s, %.1f MB" % (mp4.name, ow, oh, dur, mb))
    if mb > 12:
        print("UWAGA: plik wiekszy niz 12 MB, rozważ krotszy film.")

    pl = player(o.slug, o.tytul, portrait)
    if o.karta:
        pat = re.compile(r'(<article class="demo card" id="%s"[^>]*>\s*)<div class="vid[^"]*"[^>]*>.*?</div>(\s*<div class="dt">)'
                         % re.escape(o.karta), re.S)
        if not pat.search(page):
            sys.exit("Nie znaleziono karty #%s w projekty.html" % o.karta)
        page = pat.sub(lambda m: m.group(1) + pl + m.group(2) + '\n        <span class="chip">Przykład</span>', page, 1)
    else:
        card = (
            '    <article class="reel card" data-r>\n      %s\n      <div class="dt">\n'
            '        <span class="chip">Przykład</span>\n        <h3>%s</h3>\n        <p>%s</p>\n      </div>\n'
            '    </article>\n    ' % (pl, html.escape(o.tytul), html.escape(o.opis))
        )
        if "<!-- FILMY:KONIEC -->" not in page:
            sys.exit("Brak znacznika <!-- FILMY:KONIEC --> w projekty.html")
        page = page.replace("<!-- FILMY:KONIEC -->", card + "<!-- FILMY:KONIEC -->", 1)

    m = re.search(r"<!-- VIDEO-LD:START -->\s*<script type=\"application/ld\+json\">(.*?)</script>\s*<!-- VIDEO-LD:END -->", page, re.S)
    if not m:
        sys.exit("Brak bloku VIDEO-LD w projekty.html")
    items = [x for x in json.loads(m.group(1)) if x.get("contentUrl") != "%s/film-%s.mp4" % (ORIGIN, o.slug)]
    items.append({
        "@context": "https://schema.org", "@type": "VideoObject", "name": o.tytul, "description": o.opis,
        "thumbnailUrl": "%s/film-%s.webp" % (ORIGIN, o.slug), "uploadDate": o.data,
        "duration": "PT%dM%dS" % (int(dur) // 60, round(dur) % 60) if dur >= 60 else "PT%dS" % round(dur),
        "contentUrl": "%s/film-%s.mp4" % (ORIGIN, o.slug), "inLanguage": "pl",
    })
    block = ('<!-- VIDEO-LD:START -->\n<script type="application/ld+json">%s</script>\n<!-- VIDEO-LD:END -->'
             % json.dumps(items, ensure_ascii=False, indent=1))
    page = page[:m.start()] + block + page[m.end():]
    PAGE.write_text(page, encoding="utf-8")
    print("OK: dodano '%s' (%s). Sprawdz strone, potem commit i push." % (o.tytul, "karta #" + o.karta if o.karta else "galeria"))


if __name__ == "__main__":
    main()
