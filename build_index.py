# Assembles public/index.html from the extracted (de-escaped) CSS + form markup
# plus production additions (font fallbacks, slot/confirmation styles, live JS).
# Run once: `python3 build_index.py`. After that, public/index.html is canonical.
#
# ⚠️  DO NOT RE-RUN unless you know what you are doing. public/index.html has
#     since been hand-edited to add the legal consent gate (三份文件勾选 + 阅读弹层).
#     Those additions live ONLY in public/index.html, not in this script — re-running
#     would OVERWRITE index.html and silently remove the consent step. The consent
#     documents themselves are generated separately by build_legal.py.
import re, pathlib

base = pathlib.Path(__file__).parent
css = (base / "_extracted_css.css").read_text(encoding="utf-8")
body = (base / "_extracted_body.html").read_text(encoding="utf-8")

# --- 1) Font stacks: keep design intent, drop the 10MB embedded webfonts,
#        add universal system fallbacks (Songti SC / Georgia) for iOS+Android+desktop.
css = css.replace(
    '--serif-cjk:"Noto Serif TC","Source Han Serif TC","Songti TC","STSong",serif;',
    '--serif-cjk:"Noto Serif TC","Noto Serif SC","Source Han Serif TC","Source Han Serif SC","Songti TC","Songti SC","STSong",serif;'
)
css = css.replace(
    '--serif-latin:"EB Garamond","Noto Serif TC",serif;',
    '--serif-latin:"EB Garamond",Georgia,"Times New Roman","Noto Serif TC",serif;'
)

EXTRA_CSS = r"""
/* --- production additions --- */
.sf-hidden{display:none!important}
.slot[disabled]{cursor:not-allowed}
.slot-selected{border-color:var(--accent)!important;background:rgba(74,111,199,.08)}
.slot-selected .slot-time{color:var(--accent-deep)}
.slot-dot.used{opacity:.16}
.slot-full{opacity:.45;cursor:not-allowed}
.slot-full .slot-time{color:var(--muted)}
.slots-loading{opacity:.5;pointer-events:none}
.form-notice{margin:0 0 28px;padding:14px 18px;border:.8px solid var(--danger);background:rgba(160,57,43,.06);color:var(--danger);font-size:13px;line-height:1.65;letter-spacing:.2px}
.form-notice.info{border-color:var(--accent);background:rgba(74,111,199,.07);color:var(--accent-deep)}
.cf-title{font-family:var(--serif-cjk);font-weight:600;font-size:clamp(26px,4vw,36px);line-height:1.25;margin:14px 0 32px}
.cf-title .latin{font-family:var(--serif-latin);font-style:italic;font-weight:500;color:var(--accent-deep);font-size:.7em;margin-left:6px}
.cf-card{border:.8px solid var(--ink);background:var(--surface)}
.cf-row{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:18px 22px;border-bottom:.5px solid var(--hairline)}
.cf-row:last-child{border-bottom:none}
.cf-k{font-family:var(--mono);font-size:10px;letter-spacing:1.6px;color:var(--muted);text-transform:uppercase;white-space:nowrap}
.cf-v{font-family:var(--serif-cjk);font-weight:600;font-size:16px;text-align:right}
.cf-v.cf-ref{font-family:var(--mono);letter-spacing:1.5px;color:var(--accent-deep)}
.cf-note{font-size:13px;color:var(--muted);line-height:1.75;margin-top:24px}
"""
css = css + EXTRA_CSS

# --- 2) Replace the empty confirmation section with real content. ---
CONFIRMATION = """<section class="confirmation sf-hidden" id=confirmation hidden>
 <p class=form-overline>CONFIRMED · 預約成功</p>
 <h2 class=cf-title>你的 Day Zero 已鎖定 <span class=latin>You're in</span></h2>
 <div class=cf-card>
 <div class=cf-row><span class=cf-k>預約碼 REF</span><span class="cf-v cf-ref" id=cf-ref>—</span></div>
 <div class=cf-row><span class=cf-k>姓名 NAME</span><span class=cf-v id=cf-name>—</span></div>
 <div class=cf-row><span class=cf-k>採血時段 SLOT</span><span class=cf-v id=cf-slot>—</span></div>
 <div class=cf-row><span class=cf-k>日期地點 WHEN</span><span class=cf-v>06.01.2026 · 虹橋 T2 / 2F</span></div>
 </div>
 <p class=cf-note>請截圖此頁保存 · Screenshot this page。抵達前請留意下方準備事項；如需更改時段，請聯絡主辦方。</p>
</section>"""
body = re.sub(
    r'<section class="confirmation sf-hidden" id=confirmation hidden>.*?</section>',
    lambda m: CONFIRMATION, body, count=1, flags=re.DOTALL
)

# --- 3) Insert the notice banner at the top of the form. ---
body = body.replace(
    "<form id=register-form novalidate>",
    '<form id=register-form novalidate>\n <div id=form-notice class="form-notice sf-hidden" role=alert></div>',
    1
)

# --- 4) Use the real muShanghai logo mark instead of the placeholder 木 box. ---
body = body.replace(
    "<div class=mu-mark>木</div>",
    '<img class=mu-mark src="/assets/mushanghai-mark.png" alt="muShanghai" width=30 height=30>'
)
css = css.replace(
    ".mu-mark{width:24px;height:24px;border:.8px solid var(--ink);border-radius:3px;display:flex;align-items:center;justify-content:center;font-family:var(--serif-cjk);font-weight:600;font-size:13px}",
    ".mu-mark{height:26px;width:26px;object-fit:contain;display:block}"
)
# Match the two brand marks to the same size.
css = css.replace(
    ".compound-mark{width:22px;height:22px;display:flex;align-items:center;justify-content:center;flex-shrink:0}.compound-mark svg{width:18px;height:18px}",
    ".compound-mark{height:25px;width:auto;object-fit:contain;display:block;flex-shrink:0}"
)
# Use the real Compound logo image instead of the inline dot SVG.
body = re.sub(r'<div class=compound-mark>.*?</div>',
              '<img class=compound-mark src="/assets/compound-mark.png" alt="Compound">',
              body, count=1, flags=re.DOTALL)

FAVICON = ("data:image/svg+xml,"
    "%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='-13.5%20-13.5%2027%2027'%3E"
    "%3Cg%20fill='%23010116'%3E"
    "%3Ccircle%20cx='0'%20cy='-9'%20r='3.4'/%3E%3Ccircle%20cx='7.8'%20cy='-4.5'%20r='3.4'/%3E"
    "%3Ccircle%20cx='7.8'%20cy='4.5'%20r='3.4'/%3E%3Ccircle%20cx='0'%20cy='9'%20r='3.4'/%3E"
    "%3Ccircle%20cx='-7.8'%20cy='4.5'%20r='3.4'/%3E%3Ccircle%20cx='-7.8'%20cy='-4.5'%20r='3.4'/%3E"
    "%3C/g%3E%3C/svg%3E")

JS = r"""
(function(){
  var form=document.getElementById('register-form');
  var slotGrid=document.getElementById('slot-grid');
  var submitBtn=document.getElementById('submit-btn');
  var notice=document.getElementById('form-notice');
  var formSection=document.getElementById('form-section');
  var confirmation=document.getElementById('confirmation');
  var selectedSlotId=null, slotData={}, submitting=false;

  function showNotice(msg,type){ notice.textContent=msg; notice.className='form-notice'+(type==='info'?' info':''); }
  function hideNotice(){ notice.className='form-notice sf-hidden'; }

  function renderSlots(){
    var btns=slotGrid.querySelectorAll('.slot');
    for(var i=0;i<btns.length;i++){
      var btn=btns[i], id=btn.getAttribute('data-slot-id'), s=slotData[id];
      if(!s) continue;
      var cap=btn.querySelector('.slot-cap'), dots='';
      for(var k=0;k<s.capacity;k++){ dots+='<span class="slot-dot'+(k>=s.remaining?' used':'')+'"></span>'; }
      cap.innerHTML=dots;
      var full=s.remaining<=0;
      btn.classList.toggle('slot-full',full);
      btn.disabled=full;
      btn.setAttribute('aria-disabled',full?'true':'false');
      btn.setAttribute('aria-label',s.time+' to '+s.end+', '+(full?'full':(s.remaining+' seats remaining')));
      if(full && selectedSlotId===id){ selectedSlotId=null; btn.classList.remove('slot-selected'); btn.setAttribute('aria-checked','false'); }
    }
    updateSubmitState();
  }

  function loadSlots(){
    slotGrid.classList.add('slots-loading');
    return fetch('/api/slots',{cache:'no-store'}).then(function(r){return r.json();}).then(function(data){
      slotData={};
      (data.slots||[]).forEach(function(s){ slotData[s.id]=s; });
      renderSlots();
    }).catch(function(){
      showNotice('無法載入時段，請刷新頁面重試。Could not load slots — please refresh.','info');
    }).then(function(){ slotGrid.classList.remove('slots-loading'); });
  }

  slotGrid.addEventListener('click',function(e){
    var btn=e.target.closest('.slot');
    if(!btn||btn.disabled) return;
    var id=btn.getAttribute('data-slot-id');
    if(slotData[id] && slotData[id].remaining<=0) return;
    selectedSlotId=id;
    var btns=slotGrid.querySelectorAll('.slot');
    for(var i=0;i<btns.length;i++){ var on=btns[i]===btn; btns[i].classList.toggle('slot-selected',on); btns[i].setAttribute('aria-checked',on?'true':'false'); }
    clearFieldError('field-slot');
    updateSubmitState();
  });

  function val(id){ var el=document.getElementById(id); return el?(el.value||'').trim():''; }
  function emailOk(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function phoneOk(v){ var d=(v.match(/\d/g)||[]).length; return d>=7 && /^[+\d][\d\s\-()]*$/.test(v); }
  function genderVal(){ var el=form.querySelector('input[name=gender]:checked'); return el?el.value:''; }
  function fieldValid(){ return {
    name:val('name').length>0,
    birth:val('birth-year')!=='' && val('birth-month')!=='',
    gender:!!genderVal(), slot:!!selectedSlotId,
    email:emailOk(val('email')), phone:phoneOk(val('phone'))
  };}
  function allValid(){ var f=fieldValid(); return f.name&&f.birth&&f.gender&&f.slot&&f.email&&f.phone; }
  function updateSubmitState(){ submitBtn.disabled=submitting||!allValid(); }

  function showFieldError(fid){ var el=document.querySelector('#'+fid+' .field-error'); if(el) el.classList.remove('sf-hidden'); }
  function clearFieldError(fid){ var el=document.querySelector('#'+fid+' .field-error'); if(el) el.classList.add('sf-hidden'); }

  ['name','birth-year','birth-month','email','phone'].forEach(function(id){
    var el=document.getElementById(id);
    el.addEventListener('input',function(){ clearAssoc(id); updateSubmitState(); });
    el.addEventListener('change',updateSubmitState);
    el.addEventListener('blur',function(){ blurValidate(id); });
  });
  Array.prototype.forEach.call(form.querySelectorAll('input[name=gender]'),function(el){
    el.addEventListener('change',function(){ clearFieldError('field-gender'); updateSubmitState(); });
  });
  function clearAssoc(id){
    if(id==='name') clearFieldError('field-name');
    else if(id==='birth-year'||id==='birth-month') clearFieldError('field-birth');
    else if(id==='email') clearFieldError('field-email');
    else if(id==='phone') clearFieldError('field-phone');
  }
  function blurValidate(id){
    var f=fieldValid();
    if(id==='name' && !f.name) showFieldError('field-name');
    if((id==='birth-year'||id==='birth-month') && !f.birth) showFieldError('field-birth');
    if(id==='email' && val('email')!=='' && !f.email) showFieldError('field-email');
    if(id==='phone' && val('phone')!=='' && !f.phone) showFieldError('field-phone');
  }

  form.addEventListener('submit',function(e){
    e.preventDefault();
    hideNotice();
    var f=fieldValid();
    if(!f.name) showFieldError('field-name');
    if(!f.birth) showFieldError('field-birth');
    if(!f.gender) showFieldError('field-gender');
    if(!f.slot) showFieldError('field-slot');
    if(!f.email) showFieldError('field-email');
    if(!f.phone) showFieldError('field-phone');
    if(!allValid()) return;

    submitting=true; updateSubmitState();
    var payload={ name:val('name'), birthYear:parseInt(val('birth-year'),10), birthMonth:parseInt(val('birth-month'),10),
      gender:genderVal(), slotId:selectedSlotId, email:val('email'), phone:val('phone') };

    fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    .then(function(r){ return r.json().then(function(data){ return {status:r.status,data:data}; }); })
    .then(function(res){
      var data=res.data;
      if(res.status===201 && data.ok){ showConfirmation(data.ref,data.name,data.slot,false); return; }
      if(data.error==='duplicate'){
        if(data.booking){ showConfirmation(data.booking.ref,data.booking.name,data.booking.slot,true); }
        else { showNotice('你已用此電郵預約過。You have already registered with this email.','info'); }
        return;
      }
      if(data.error==='slot_full'){
        showNotice('該時段剛剛額滿，請改選其他時段。That slot just filled up — please choose another.',null);
        selectedSlotId=null;
        loadSlots().then(function(){ document.getElementById('field-slot').scrollIntoView({behavior:'smooth',block:'center'}); });
        return;
      }
      if(data.error==='validation'){ showNotice('資料有誤，請檢查後重試。Please check your details.',null); return; }
      showNotice('提交失敗，請稍後重試。Something went wrong — please try again.',null);
    })
    .catch(function(){ showNotice('網絡錯誤，請檢查網絡後重試。Network error — please try again.',null); })
    .then(function(){ submitting=false; updateSubmitState(); });
  });

  function showConfirmation(ref,name,slot,already){
    document.getElementById('cf-ref').textContent=ref;
    document.getElementById('cf-name').textContent=name;
    document.getElementById('cf-slot').textContent=slot.time+'–'+slot.end;
    if(already){ var t=confirmation.querySelector('.cf-title'); if(t) t.innerHTML='你已預約 <span class="latin">Already reserved</span>'; }
    formSection.classList.add('sf-hidden');
    confirmation.hidden=false; confirmation.classList.remove('sf-hidden');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  loadSlots();
})();
"""

HEAD = """<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>未來人計劃 · From the Future · 預約登記</title>
<meta name="description" content="muShanghai × Compound · 未來人計劃 · 2026.06.01 · 上海虹橋 · 預約登記">
<meta name="theme-color" content="#EFE9DD">
<meta name="robots" content="noindex">
<meta property="og:title" content="未來人計劃 · From the Future">
<meta property="og:description" content="muShanghai × Compound · 2026.06.01 · 上海虹橋 · 預約登記">
<link rel="icon" href="/assets/compound-mark.png">
<style>__CSS__</style>
</head>
<body>
""".replace("__FAVICON__", FAVICON).replace("__CSS__", css)

html = HEAD + body + "\n<script>" + JS + "</script>\n</body>\n</html>\n"
(base / "public" / "index.html").write_text(html, encoding="utf-8")
print("Wrote public/index.html  (%d bytes)" % len(html.encode("utf-8")))
