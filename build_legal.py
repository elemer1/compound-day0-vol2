# Builds public/legal/*.html (the three legal documents) from the source .docx
# files in ../consent, verbatim, in the site's brand style.
#
# Run:  python3 build_legal.py        (requires pandoc on PATH)
#
# What it does, per document:
#   1. pandoc docx -> HTML fragment (faithful text extraction).
#   2. Pull the first bold paragraph as the page title.
#   3. Turn the leading single-cell "重要提示 / 适用关系" table into a callout box.
#   4. Fix Word's numbering artifacts:
#        - strip <ol start="N"> so every list restarts at 1
#        - merge lists that Word split with manually-typed "(N)" paragraphs
#          (e.g. [ol][p(2)][p(3)][ol]) back into one continuous list
#      The legal TEXT is never changed — only the list markup is normalised.
#   5. Wrap in the brand template.
#
# After running, public/legal/*.html is canonical (safe to hand-edit).
import re, html as ihtml, pathlib, subprocess, sys

BASE = pathlib.Path(__file__).parent
CONSENT_DIR = BASE.parent / "consent"
OUT_DIR = BASE / "public" / "legal"
EN_DIR = BASE / "legal_en"   # optional English translations, appended after the Chinese

# source .docx (matched by the legal team's "_m_0N_" suffix) -> output slug + nav title
DOCS = [
    ("_m_01_", "service-agreement", "用户服务协议"),
    ("_m_02_", "privacy-policy",    "个人信息处理规则"),
    ("_m_03_", "consent-form",      "健康检测活动知情同意书"),
]

CONSENT_VERSION = "2026-05-20"  # keep in sync with functions/api/register.js


def find_docx(marker):
    hits = sorted(CONSENT_DIR.glob(f"*{marker}*.docx"))
    if not hits:
        sys.exit(f"!! no .docx matching *{marker}*.docx in {CONSENT_DIR}")
    return hits[0]


def to_fragment(docx_path):
    try:
        out = subprocess.run(
            ["pandoc", str(docx_path), "-t", "html", "--wrap=none"],
            capture_output=True, text=True, check=True,
        )
    except FileNotFoundError:
        sys.exit("!! pandoc not found on PATH — install it (brew install pandoc) and re-run.")
    except subprocess.CalledProcessError as e:
        sys.exit(f"!! pandoc failed on {docx_path.name}:\n{e.stderr}")
    return out.stdout


def extract_title(frag):
    m = re.search(r"<p><strong>(.*?)</strong></p>", frag, flags=re.DOTALL)
    if not m:
        return "法律文件", frag
    title = re.sub(r"<[^>]+>", "", m.group(1)).strip()
    frag = frag[: m.start()] + frag[m.end():]  # remove the title line from the body
    return title, frag


def table_to_callout(frag):
    # The first table in each doc is a one-cell highlight box (重要提示 / 适用关系).
    def repl(m):
        block = m.group(0)
        cell = re.search(r"<t[hd][^>]*>(.*?)</t[hd]>", block, flags=re.DOTALL)
        inner = cell.group(1).strip() if cell else ""
        return f'<aside class="callout">{inner}</aside>'
    return re.sub(r"<table>.*?</table>", repl, frag, count=1, flags=re.DOTALL)


def fix_lists(frag):
    # 1) restart every ordered list at 1 (drop Word's continuous start="N"/type)
    frag = re.sub(r"<ol[^>]*>", "<ol>", frag)
    # 2) absorb manually-numbered "(N) ..." paragraphs that Word left between list
    #    items back into the preceding list as real <li> (marker dropped, text kept)
    prev = None
    while prev != frag:
        prev = frag
        frag = re.sub(
            r"</ol>(\s*)<p>\(\d+\)\s*(.*?)</p>",
            r"<li><p>\2</p></li></ol>\1",
            frag, flags=re.DOTALL,
        )
    # 3) the absorb step leaves the continuation list adjacent — join them so the
    #    whole group numbers continuously (1,2,3,4,5 ...)
    frag = re.sub(r"</ol>\s*<ol>", "", frag)
    return frag


PAGE = """<!DOCTYPE html>
<html lang="zh-Hans">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title} · Compound</title>
<meta name="robots" content="noindex">
<meta name="theme-color" content="#EFE9DD">
<link rel="icon" href="/assets/compound-mark.png">
<style>
:root{{--bg:#EFE9DD;--surface:#FBF7EC;--ink:#010116;--accent:#4A6FC7;--accent-deep:#2E4FA4;
--muted:rgba(1,1,22,.62);--soft:rgba(1,1,22,.18);--hairline:rgba(1,1,22,.12);--danger:#A0392B;
--serif-cjk:"Noto Serif SC","Noto Serif TC","Source Han Serif SC","Songti SC","STSong",serif;
--sans:"Manrope","Noto Sans SC","PingFang SC","Microsoft YaHei",system-ui,sans-serif;
--mono:"JetBrains Mono",ui-monospace,monospace}}
*{{box-sizing:border-box;margin:0;padding:0}}
html{{-webkit-text-size-adjust:100%}}
body{{background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:15px;line-height:1.8;
-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;padding:0 22px;word-wrap:break-word;overflow-wrap:anywhere}}
.doc{{max-width:720px;margin:0 auto;padding:28px 0 96px}}
.topbar{{display:flex;align-items:center;justify-content:space-between;gap:12px;
padding:14px 0 18px;border-bottom:.5px solid var(--ink);margin-bottom:8px;
position:sticky;top:0;background:var(--bg);z-index:5}}
.topbar .brand{{display:flex;align-items:center;gap:8px;font-weight:600;letter-spacing:.4px;font-size:13px}}
.topbar .brand img{{height:22px;width:auto;display:block}}
.back{{font-size:12px;letter-spacing:.5px;color:var(--accent-deep);text-decoration:none;
border:.8px solid var(--soft);padding:7px 14px;border-radius:999px;white-space:nowrap;transition:.15s}}
.back:hover{{border-color:var(--accent);background:rgba(74,111,199,.07)}}
.doc-head{{padding:28px 0 8px}}
.doc-overline{{font-family:var(--mono);font-size:10px;letter-spacing:2.5px;color:var(--accent);
font-weight:600;text-transform:uppercase;margin-bottom:14px}}
h1.doc-title{{font-family:var(--serif-cjk);font-weight:700;font-size:clamp(26px,5vw,38px);
line-height:1.3;letter-spacing:.01em}}
.doc-meta{{font-family:var(--mono);font-size:11px;color:var(--muted);letter-spacing:.5px;
margin-top:14px;padding-bottom:8px}}
.callout{{background:rgba(74,111,199,.07);border:.8px solid var(--accent-soft,#A5BBEF);
border-left:3px solid var(--accent);padding:18px 20px;margin:24px 0 8px;
font-size:14px;line-height:1.85;color:var(--ink)}}
.callout strong{{color:var(--accent-deep)}}
.body{{padding-top:8px}}
.body h1{{font-family:var(--serif-cjk);font-weight:600;font-size:clamp(19px,3.4vw,23px);
line-height:1.45;margin:40px 0 14px;padding-top:22px;border-top:.5px solid var(--hairline)}}
.body h2{{font-family:var(--serif-cjk);font-weight:600;font-size:16px;
color:var(--accent-deep);margin:26px 0 10px}}
.body p{{margin:0 0 14px}}
.body ol,.body ul{{margin:0 0 16px;padding-left:1.55em}}
.body li{{margin:0 0 10px;padding-left:.2em}}
.body li::marker{{color:var(--accent);font-variant-numeric:tabular-nums}}
.body li>p{{margin:0 0 6px}}
.body strong{{font-weight:700}}
.body a{{color:var(--accent-deep);text-decoration:underline}}
.doc-foot{{margin-top:48px;padding-top:20px;border-top:.5px solid var(--ink);
font-size:12px;color:var(--muted);line-height:1.8}}
.doc-foot .accent{{color:var(--accent-deep);font-weight:600}}
.en-jump{{display:inline-block;margin-top:14px;font-size:12px;letter-spacing:.5px;color:var(--accent-deep);text-decoration:none;border:.8px solid var(--soft);padding:7px 14px;border-radius:999px;transition:.15s}}
.en-jump:hover{{border-color:var(--accent);background:rgba(74,111,199,.07)}}
.lang-sep{{border:none;border-top:1.5px solid var(--ink);margin:64px 0 0}}
.lang-en{{padding-top:8px}}
.en-note{{background:rgba(1,1,22,.04);border-left:3px solid var(--muted);padding:14px 18px;margin:28px 0 8px;font-size:13px;line-height:1.75;color:var(--muted)}}
.lang-en h1.en-title{{font-family:var(--serif-cjk);font-weight:700;font-size:clamp(24px,4.6vw,34px);line-height:1.3;margin:24px 0 4px;padding-top:0;border-top:none}}
.en-sub{{font-size:14px;color:var(--muted);margin:0 0 8px}}
.back-to-top{{margin-top:44px;padding-top:18px;border-top:.5px solid var(--hairline);font-size:12px}}
.back-to-top a{{color:var(--accent-deep);text-decoration:none}}
@media (max-width:560px){{body{{padding:0 16px;font-size:15px}}.doc{{padding:18px 0 80px}}}}
</style>
</head>
<body>
<div class="doc">
 <div class="topbar">
  <span class="brand"><img src="/assets/compound-mark.png" alt="Compound">Compound · 法律文件</span>
  <a class="back" id="back-link" href="/">← 返回报名</a>
 </div>
 <div class="doc-head" id="top">
  <p class="doc-overline">Compound · Legal</p>
  <h1 class="doc-title">{title}</h1>
  <p class="doc-meta">版本 {version} · 北京衍灵科技有限公司</p>{en_jump}
 </div>
 <div class="body">
{body}
 </div>
 <div class="doc-foot">
  本文件由 <span class="accent">北京衍灵科技有限公司</span> 提供并对其内容负责 ·
  如有疑问请联系 <span class="accent">hello@compoundlife.ai</span>
 </div>
</div>
<script>
// In a new tab, "返回报名" goes back / home. Hide it when embedded in the RSVP modal.
(function(){{
  var back=document.getElementById('back-link');
  if(window.top!==window.self){{ if(back) back.style.display='none'; return; }}
  if(back) back.addEventListener('click',function(e){{
    if(history.length>1){{ e.preventDefault(); history.back(); }}
  }});
}})();
</script>
</body>
</html>
"""


# Wraps the English fragment, appended after the Chinese body. The reference-only /
# Chinese-prevails notice is mandatory for a bilingual legal document.
EN_SECTION = """
<hr class="lang-sep">
<section class="lang-en" id="english">
<p class="en-note"><strong>English Translation (for reference only).</strong> The Chinese version above is the legally binding version. In the event of any inconsistency between the Chinese and English versions, the Chinese version shall prevail.</p>
__EN_FRAG__
<p class="back-to-top"><a href="#top">↑ 返回中文版顶部 · Back to top</a></p>
</section>
"""


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for marker, slug, nav in DOCS:
        docx = find_docx(marker)
        frag = to_fragment(docx)
        title, frag = extract_title(frag)
        frag = table_to_callout(frag)
        frag = fix_lists(frag)
        body = frag.strip()

        en_jump = ""
        note = "zh only"
        en_path = EN_DIR / f"{slug}.html"
        if en_path.exists():
            en_frag = en_path.read_text(encoding="utf-8").strip()
            body += EN_SECTION.replace("__EN_FRAG__", en_frag)
            en_jump = '\n  <a class="en-jump" href="#english">English version ↓</a>'
            note = "zh + en"

        page = PAGE.format(title=ihtml.escape(title), version=CONSENT_VERSION, body=body, en_jump=en_jump)
        (OUT_DIR / f"{slug}.html").write_text(page, encoding="utf-8")
        print(f"  wrote public/legal/{slug}.html  ({len(page.encode('utf-8')):,} bytes, {note})  <- {docx.name}")
    print("done.")


if __name__ == "__main__":
    main()
