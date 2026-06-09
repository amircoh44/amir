"use strict";
/* buildImported(), text index browser, posture detection, bootstrap */

/* ====== FULL TEXT SIDDUR (decoded from your PDFs) ====== */
window.IMPORTED={};
function buildImported(){
  window.IMPORTED={};
  (window.TEXTDATA||[]).forEach(d=>{
    const sid=d.svcId;if(!sid||sid==="torah")return;
    if(!window.IMPORTED[sid])window.IMPORTED[sid]=[];
    d.sections.forEach((sec,si)=>{
      window.IMPORTED[sid].push({
        id:"imp_"+d.nusach+"_"+sid+"_"+si,
        en:"",he:(sec.header&&sec.header.trim())||d.service,section:d.service,
        only:[d.nusach],imported:true,
        blocks:sec.blocks.map(b=>{const o=b.k==="rubric"?{k:"rubric",text:b.t}:{k:"p",he:b.t};if(b.tr)o.tr=b.tr;if(b.en)o.en=b.en;if(b.cond)o.cond=b.cond;if(b.icon)o.icon=b.icon;if(b.tags)o.tags=b.tags;return o;})
      });
    });
  });
}
/* Write an edited imported prayer's blocks straight back into TEXTDATA (single source
   of truth), so the Content tab can publish them. id = imp_<nusach>_<svcId>_<sectionIdx>. */
function writeImportedBack(impId,cleanBlocks){
  const parts=String(impId).split("_");
  if(parts.length<4||parts[0]!=="imp")return false;
  const nusach=parts[1],si=parseInt(parts[parts.length-1],10),sid=parts.slice(2,-1).join("_");
  const doc=(window.TEXTDATA||[]).find(d=>d.nusach===nusach&&d.svcId===sid);
  if(!doc||!doc.sections||!doc.sections[si])return false;
  doc.sections[si].blocks=cleanBlocks.filter(b=>b.k==="rubric"||b.k==="p").map(b=>{
    const o=b.k==="rubric"?{k:"rubric",t:b.text||""}:{k:"p",t:b.he||""};
    if(b.tr)o.tr=b.tr;if(b.en)o.en=b.en;if(b.cond)o.cond=b.cond;if(b.icon)o.icon=b.icon;if(b.tags)o.tags=b.tags;
    return o;
  });
  return true;
}
function textDocs(){return (window.TEXTDATA||[]);}
function openTextIndex(){
  const docs=textDocs();if(!docs.length){toast("Text is still loading\u2026");return;}
  const old=$("#textIndex");if(old)old.remove();
  const ov=el("div","");ov.id="textIndex";
  ov.style.cssText="position:fixed;inset:0;z-index:125;background:var(--bg);display:flex;flex-direction:column";
  const hd=el("div","");hd.style.cssText="flex:none;display:flex;align-items:center;gap:.6rem;padding:.95rem 1rem;border-bottom:1px solid var(--line);background:var(--surface)";
  hd.innerHTML=`<button id="tiClose" style="background:transparent;border:0;color:var(--muted);cursor:pointer;display:flex;align-items:center;gap:.3rem;font-size:.85rem"><svg class="icon" viewBox="0 0 24 24" style="width:1.1em;height:1.1em"><path d="M15 18l-6-6 6-6"/></svg> Back</button><div style="flex:1;text-align:center;font-family:var(--display);font-weight:600;color:var(--ink)">Full Text Siddur</div><div style="width:3rem"></div>`;
  ov.appendChild(hd);
  const body=el("div","");body.style.cssText="flex:1;overflow-y:auto;padding:1rem 1.1rem 2rem";
  let curNus=null;
  docs.forEach((d,i)=>{
    if(d.nusach!==curNus){curNus=d.nusach;const h=el("div","");h.style.cssText="font-size:.66rem;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);font-weight:700;margin:1rem 0 .5rem;padding-bottom:.3rem;border-bottom:1px solid var(--line)";h.textContent=d.nusach;body.appendChild(h);}
    const nb=d.sections.reduce((a,s)=>a+s.blocks.length,0);
    const b=el("button","card");b.style.marginBottom=".5rem";
    b.innerHTML=`<div class="icon-wrap"><svg class="icon" viewBox="0 0 24 24"><path d="M4 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z"/><path d="M8 8h6M8 12h6"/></svg></div><div class="body"><div class="title">${esc(d.service)}</div><div class="sub">${nb} passages \u00B7 fully vocalized</div></div><div class="arr">\u2192</div>`;
    b.onclick=()=>openTextDoc(i);
    body.appendChild(b);
  });
  ov.appendChild(body);document.body.appendChild(ov);
  $("#tiClose").onclick=()=>ov.remove();
}
function openTextDoc(i){
  const d=textDocs()[i];if(!d)return;
  const old=$("#textReader");if(old)old.remove();
  const ov=el("div","");ov.id="textReader";
  ov.style.cssText="position:fixed;inset:0;z-index:130;background:var(--bg);display:flex;flex-direction:column";
  const hd=el("div","");hd.style.cssText="flex:none;display:flex;align-items:center;gap:.6rem;padding:.9rem 1rem;border-bottom:1px solid var(--line);background:var(--surface)";
  hd.innerHTML=`<button id="trClose" style="background:transparent;border:0;color:var(--muted);cursor:pointer;display:flex;align-items:center;gap:.3rem;font-size:.85rem"><svg class="icon" viewBox="0 0 24 24" style="width:1.1em;height:1.1em"><path d="M15 18l-6-6 6-6"/></svg> Back</button><div style="flex:1;text-align:center;font-family:var(--display);font-weight:600;color:var(--ink);font-size:.95rem">${esc(d.service)} <span style="color:var(--muted);font-weight:400">· ${esc(d.nusach)}</span></div><div style="width:3rem"></div>`;
  ov.appendChild(hd);
  const body=el("div","");body.style.cssText="flex:1;overflow-y:auto;padding:1.2rem 1.1rem 3rem";
  d.sections.forEach(sec=>{
    if(sec.header){const h=el("div","");h.style.cssText="font-family:var(--display);font-size:1.15rem;font-weight:600;color:var(--accent);text-align:center;margin:1.4rem 0 .8rem;direction:rtl;font-family:var(--hebrew)";h.textContent=sec.header;body.appendChild(h);}
    sec.blocks.forEach(b=>{
      if(b.k==="rubric"){const r=el("div","");r.style.cssText="font-size:calc(.9rem * var(--scale,1) * var(--sscale,1));color:var(--muted);font-style:italic;text-align:center;direction:rtl;font-family:var(--hebrew);margin:.8rem 0 .4rem";r.textContent=b.t;body.appendChild(r);}
      else{const p=el("div","");p.style.cssText="font-family:var(--hebrew);direction:rtl;text-align:right;font-size:calc(1.15rem * var(--scale,1));line-height:2;color:var(--ink);margin-bottom:.7rem";p.textContent=b.t;body.appendChild(p);}
    });
  });
  ov.appendChild(body);document.body.appendChild(ov);
  $("#trClose").onclick=()=>ov.remove();
}

/* ====== BOOT / EVENT WIRING ====== */
document.addEventListener("DOMContentLoaded",()=>{
  loadState();
  buildImported();
  applyTheme();
  if(typeof applySplash==="function")applySplash();      // admin-set splash overrides
  if(typeof syncFromServer==="function")syncFromServer(); // pull live content + branding
  window.addEventListener("scroll",trackScroll,{passive:true});
  const nm=state.userEngName||state.userHebName;if(nm)$("#coverName").textContent=nm;

  const cover=$("#cover"),bookCover=$("#bookCover");
  function enterFromCover(){
    state.coverSeen=(state.coverSeen||0)+1;saveState();
    if(!state.onboarded){startOnboard();return;}
    if(bookCover)bookCover.classList.add("open");
    /* render the app underneath first so the opening book reveals it */
    openApp();
    setTimeout(()=>{cover.classList.add("lifting");},650);
    setTimeout(()=>{cover.classList.add("gone");},1550);
  }
  /* Skip the animated cover when the user turned it off, or after it's been seen enough. */
  const skipCover = state.showCover===false || state.coverSeen>=5;
  if(state.onboarded && skipCover){cover.classList.add("gone");try{openApp();}catch(_e){console.error("openApp failed:",_e);const a=$("#app");if(a){a.style.visibility="visible";a.style.opacity="1";}}}
  else if(!state.onboarded && state.showCover===false){startOnboard();}
  else if(bookCover){bookCover.addEventListener("click",enterFromCover);cover.addEventListener("click",e=>{if(e.target===cover)enterFromCover();});}

  /* bottom nav */
  document.querySelectorAll(".nav-tab").forEach(tab=>{
    tab.addEventListener("click",()=>go(tab.getAttribute("data-view")));
  });
  /* top bar */
  const libBtn=$("#libBtn");if(libBtn)libBtn.addEventListener("click",openLib);
  const admBtn=$("#admBtn");if(admBtn)admBtn.addEventListener("click",openAdmin);
  const searchBtn=$("#searchBtn");if(searchBtn)searchBtn.addEventListener("click",openSearch);

  /* sheet close buttons + backdrop */
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeSheet(b.getAttribute("data-close"))));
  document.querySelectorAll(".sheet").forEach(sh=>sh.addEventListener("click",e=>{if(e.target===sh)sh.classList.remove("show");}));

  /* search input */
  const si=$("#searchInput");if(si)si.addEventListener("input",e=>paintSearch(e.target.value));

  /* daven controls */
  const dn=$("#dmNext");if(dn)dn.addEventListener("click",dmNext);
  const dp=$("#dmPrev");if(dp)dp.addEventListener("click",dmPrev);
  const dc=$("#dmClose");if(dc)dc.addEventListener("click",()=>$("#daven").classList.remove("show"));

  /* keyboard */
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"){
      const dav=$("#daven");if(dav&&dav.classList.contains("show")){dav.classList.remove("show");return;}
      let closed=false;document.querySelectorAll(".sheet.show").forEach(s=>{s.classList.remove("show");closed=true;});
      if(closed)return;
    }
    const dav=$("#daven");
    if(dav&&dav.classList.contains("show")){
      if(e.key==="ArrowRight"||e.key===" "){e.preventDefault();dmNext();}
      else if(e.key==="ArrowLeft"){e.preventDefault();dmPrev();}
    }
  });
});

/* ====== PRAYER EDITOR ====== */
function addCustomPrayer(svcId){
  if(!state.customPrayers[svcId])state.customPrayers[svcId]=[];
  const id="custom_"+Date.now();
  state.customPrayers[svcId].push({id,en:"New Prayer",he:"",section:"Main",blocks:[{k:"p",he:"",tr:"",en:""}],custom:true});
  saveState();
  openPrayerEditor(svcId,id);
}
function findBasePrayer(svcId,prId){return allBasePrayers(svcId).find(p=>p.id===prId);}
function isCustomPrayer(svcId,prId){return ((state.customPrayers&&state.customPrayers[svcId])||[]).some(p=>p.id===prId);}
function openPrayerEditor(svcId,prId){
  const basePr=findBasePrayer(svcId,prId);if(!basePr)return;
  const eff=effPrayer(svcId,basePr);
  const custom=isCustomPrayer(svcId,prId);
  const meta={en:eff.en||"",he:eff.he||"",section:eff.section||"Main"};
  let blocks=normalizeBlocks(JSON.parse(JSON.stringify(eff.blocks||[])));
  let targetNusach=state.nusach; /* which nusach this edit applies to; "__all__" = all */
  function loadFor(tn){
    const key = tn==="__all__" ? prayerKey(svcId,prId) : (svcId+"."+prId+"@"+tn);
    const ov = state.prayerEdits[key];
    if(ov){meta.en=ov.en!=null?ov.en:basePr.en;meta.he=ov.he!=null?ov.he:basePr.he;meta.section=ov.section!=null?ov.section:(basePr.section||"Main");blocks=normalizeBlocks(JSON.parse(JSON.stringify(ov.blocks||basePr.blocks||[])));}
    else{meta.en=basePr.en||"";meta.he=basePr.he||"";meta.section=basePr.section||"Main";blocks=normalizeBlocks(JSON.parse(JSON.stringify(basePr.blocks||[])));}
  }
  const old=$("#prayerEditor");if(old)old.remove();
  const ov=el("div","");ov.id="prayerEditor";
  ov.style.cssText="position:fixed;inset:0;z-index:120;background:var(--bg);display:flex;flex-direction:column;overflow:hidden";
  /* header */
  const hd=el("div","");hd.style.cssText="flex:none;padding:1rem 1.1rem .8rem;border-bottom:1px solid var(--line);background:var(--surface)";
  hd.innerHTML=`<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.8rem"><button id="peClose" style="background:transparent;border:0;color:var(--muted);cursor:pointer;display:flex;align-items:center;gap:.3rem;font-size:.85rem"><svg class="icon" viewBox="0 0 24 24" style="width:1.1em;height:1.1em"><path d="M15 18l-6-6 6-6"/></svg> Back</button><div style="flex:1;text-align:center;font-family:var(--display);font-weight:600;color:var(--ink)">${custom?"Edit Prayer":"Edit Prayer"}</div><button id="peSave" style="background:var(--accent);color:var(--on-accent);border:0;border-radius:.45rem;padding:.45rem .9rem;font-weight:700;font-size:.82rem;cursor:pointer">Save</button></div>`;
  /* nusach picker (only for built-in prayers) */
  if(!custom){
    const sc=el("div","field");sc.style.marginBottom=".7rem";
    sc.innerHTML=`<label>These changes apply to</label>`;
    const chips=el("div","");chips.style.cssText="display:flex;flex-wrap:wrap;gap:.4rem";
    const opts=Object.keys(NUSACH_LABELS).map(k=>[k,NUSACH_LABELS[k]]).concat([["__all__","All nusachot"]]);
    const repaintChips=()=>{[...chips.children].forEach((c,i)=>{const on=opts[i][0]===targetNusach;c.style.borderColor=on?"var(--accent)":"var(--line)";c.style.background=on?"color-mix(in srgb,var(--accent) 16%,transparent)":"var(--surface2)";c.style.color=on?"var(--accent)":"var(--ink2)";});};
    opts.forEach(([val,label])=>{const b=el("button","");b.style.cssText="padding:.45rem .75rem;border-radius:.5rem;font-size:.82rem;font-weight:600;cursor:pointer;font-family:var(--sans);border:1px solid var(--line);background:var(--surface2);color:var(--ink2)";b.textContent=label;b.onclick=()=>{targetNusach=val;loadFor(targetNusach);$("#peEn").value=meta.en;$("#peHe").value=meta.he;repaintChips();paintBlocks();};chips.appendChild(b);});
    sc.appendChild(chips);hd.appendChild(sc);
    setTimeout(repaintChips,0);
  }
  const fEn=el("div","field");fEn.innerHTML=`<label>Title (English)</label><input id="peEn" value="${esc(meta.en)}">`;hd.appendChild(fEn);
  const fHe=el("div","field hebrew");fHe.style.marginBottom="0";fHe.innerHTML=`<label>Title (Hebrew)</label><input id="peHe" value="${esc(meta.he)}">`;hd.appendChild(fHe);
  ov.appendChild(hd);
  /* body */
  const bodyScroll=el("div","");bodyScroll.style.cssText="flex:1;min-height:0;overflow-y:auto;padding:1rem 1.1rem 1.5rem";
  const list=el("div","");bodyScroll.appendChild(list);
  ov.appendChild(bodyScroll);
  /* footer */
  const ft=el("div","");ft.style.cssText="flex:none;padding:.8rem 1.1rem;background:var(--surface);border-top:1px solid var(--line);display:flex;gap:.5rem;flex-wrap:wrap;max-height:42vh;overflow-y:auto";
  const addTxt=el("button","btn-ghost");addTxt.style.margin="0";addTxt.style.flex="1 1 30%";addTxt.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:1em;height:1em"><path d="M12 5v14M5 12h14"/></svg> Prayer text`;
  const addRub=el("button","btn-ghost");addRub.style.margin="0";addRub.style.flex="1 1 30%";addRub.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:1em;height:1em"><path d="M4 6h10M4 12h16M4 18h7"/></svg> Instruction`;
  const addKav=el("button","btn-ghost");addKav.style.margin="0";addKav.style.flex="1 1 30%";addKav.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:1em;height:1em"><path d="M12 3a4 4 0 0 1 4 4c0 2-2 3-2 5h-4c0-2-2-3-2-5a4 4 0 0 1 4-4zM10 18h4M11 21h2"/></svg> Kavanah`;
  ft.appendChild(addTxt);ft.appendChild(addRub);ft.appendChild(addKav);
  /* Fill canonical English from Sefaria (public-domain), mapped onto prayer blocks */
  const addSef=el("button","btn-ghost");addSef.style.cssText="margin:0;flex:1 1 30%";addSef.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:1em;height:1em"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> English · Sefaria`;
  addSef.onclick=()=>{if(typeof openSefariaDialog!=="function"){toast("Translation module not loaded");return;}openSefariaDialog(meta.en,(segs)=>{const n=(typeof mapSegmentsToEnglish==="function")?mapSegmentsToEnglish(blocks,segs):0;paintBlocks();toast(n?("Filled English on "+n+" block"+(n>1?"s":"")+" · review & Save"):"No prayer-text blocks to fill");});};
  ft.appendChild(addSef);
  if(custom){const del=el("button","btn-ghost");del.style.cssText="margin:0;flex:1 1 30%;color:#d9534f;border-color:color-mix(in srgb,#d9534f 40%,transparent)";del.textContent="Delete prayer";del.onclick=()=>{if(!confirm("Delete this prayer? This cannot be undone."))return;state.customPrayers[svcId]=(state.customPrayers[svcId]||[]).filter(p=>p.id!==prId);if(state.hidden[svcId])state.hidden[svcId]=state.hidden[svcId].filter(x=>x!==prId);if(state.order[svcId])state.order[svcId]=state.order[svcId].filter(x=>x!==prId);saveState();ov.remove();render();};ft.appendChild(del);}
  else{const rst=el("button","btn-ghost");rst.style.cssText="margin:0;flex:1 1 30%";rst.textContent="Reset to original";rst.onclick=()=>{delete state.prayerEdits[prayerKey(svcId,prId)];delete state.prayerEdits[svcId+"."+prId+"@"+state.nusach];saveState();ov.remove();render();toast("Reset to original");};ft.appendChild(rst);}
  ov.appendChild(ft);
  document.body.appendChild(ov);

  function paintBlocks(){
    list.innerHTML="";
    if(!blocks.length){list.appendChild(el("div","note","No blocks yet. Add prayer text or an instruction below."));}
    blocks.forEach((b,i)=>{
      if(b.region){b.cond=Object.assign({region:b.region},b.cond||{});delete b.region;} /* migrate legacy region → cond */
      const isRub=b.k==="rubric",isKav=b.k==="kavanah";
      const card=el("div","");card.style.cssText="background:var(--surface);border:1px solid var(--line);border-radius:.6rem;padding:.8rem;margin-bottom:.7rem"+(isRub?";border-left:3px solid var(--instr)":isKav?";border-left:3px solid var(--insert)":"");
      const top=el("div","");top.style.cssText="display:flex;align-items:center;gap:.4rem;margin-bottom:.55rem";
      const chip=el("span","");chip.style.cssText="font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;font-weight:700;padding:.2rem .5rem;border-radius:.3rem;"+(isRub?"color:var(--instr);background:color-mix(in srgb,var(--instr) 12%,transparent)":isKav?"color:var(--insert);background:color-mix(in srgb,var(--insert) 12%,transparent)":"color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,transparent)");chip.textContent=isRub?"Instruction":isKav?"Kavanah":"Prayer text";
      top.appendChild(chip);const spacer=el("div","");spacer.style.flex="1";top.appendChild(spacer);
      const up=el("button","arr-mini");up.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:1em;height:1em"><path d="M18 15l-6-6-6 6"/></svg>`;up.disabled=i===0;up.style.opacity=i===0?".3":"1";up.onclick=()=>{[blocks[i-1],blocks[i]]=[blocks[i],blocks[i-1]];paintBlocks();};
      const dn=el("button","arr-mini");dn.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:1em;height:1em"><path d="M6 9l6 6 6-6"/></svg>`;dn.disabled=i===blocks.length-1;dn.style.opacity=i===blocks.length-1?".3":"1";dn.onclick=()=>{[blocks[i+1],blocks[i]]=[blocks[i],blocks[i+1]];paintBlocks();};
      const rm=el("button","arr-mini");rm.style.color="#d9534f";rm.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:1em;height:1em"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>`;rm.onclick=()=>{blocks.splice(i,1);paintBlocks();};
      top.appendChild(up);top.appendChild(dn);top.appendChild(rm);card.appendChild(top);
      if(isRub){
        const ta=el("textarea");ta.value=b.text||"";ta.placeholder="Instruction, e.g. \u201CSay the following quietly\u201D";ta.rows=2;ta.style.cssText=taCss();ta.addEventListener("input",e=>b.text=e.target.value);card.appendChild(ta);
        /* posture toggle */
        const pl=el("div","");pl.textContent="Posture cue";pl.style.cssText=miniLabel()+"margin-top:.5rem";card.appendChild(pl);
        const prow=el("div","");prow.style.cssText="display:flex;gap:.4rem;flex-wrap:wrap";
        const cur=b.posture||postureAuto(b.text||"");
        const mkP=(val,label,svg)=>{const on=cur===val;const pb=el("button","");pb.style.cssText="display:inline-flex;align-items:center;gap:.35rem;padding:.4rem .7rem;border-radius:.5rem;font-size:.78rem;font-weight:600;cursor:pointer;font-family:var(--sans);border:1px solid "+(on?"var(--accent)":"var(--line)")+";background:"+(on?"color-mix(in srgb,var(--accent) 14%,transparent)":"var(--surface2)")+";color:"+(on?"var(--accent)":"var(--ink2)");pb.innerHTML=svg+`<span>${label}</span>`;pb.onclick=()=>{b.posture=(b.posture===val?null:val);paintBlocks();};return pb;};
        prow.appendChild(mkP("stand","Rise",postureIcon("stand")));
        prow.appendChild(mkP("sit","Sit",postureIcon("sit")));
        prow.appendChild(mkP("bow","Bow",postureIcon("bow")));
        card.appendChild(prow);
      }else if(isKav){
        /* Kavanah block \u2014 three editable layers, reorderable like any other block. */
        const kv=kavLayers(b);
        b.kav=b.kav||{found:kv.found||"",halachic:kv.halachic||"",kabbalistic:kv.kabbalistic||""};
        if(typeof b.kavanah==="string"){if(!b.kav.found)b.kav.found=b.kavanah;delete b.kavanah;}
        card.appendChild(el("div","note","Place this anywhere in the list \u2014 it appears in the service exactly where it sits here."));
        const mkKav=(key,label,color)=>{
          card.appendChild(mkLabel(label));
          const k=el("textarea");k.value=b.kav[key]||"";k.placeholder="\u2026";k.rows=2;k.style.cssText=taCss()+"background:color-mix(in srgb,"+color+" 8%,transparent);border-color:color-mix(in srgb,"+color+" 28%,transparent)";k.addEventListener("input",e=>{b.kav[key]=e.target.value;});card.appendChild(k);
        };
        mkKav("found","Foundation kavanah","var(--insert)");
        mkKav("halachic","Halachic focus","#9fa97a");
        mkKav("kabbalistic","Kabbalistic kavanah","#b08cc4");
      }else{
        const he=el("textarea");he.value=b.he||"";he.placeholder="Hebrew text";he.rows=3;he.dir="rtl";he.style.cssText=taCss()+"font-family:var(--hebrew);font-size:1.15rem;line-height:1.9;text-align:right";he.addEventListener("input",e=>b.he=e.target.value);
        const tr=el("input");tr.value=b.tr||"";tr.placeholder="Transliteration (optional)";tr.style.cssText=taCss()+"font-style:italic";tr.addEventListener("input",e=>b.tr=e.target.value);
        const en=el("textarea");en.value=b.en||"";en.placeholder="English translation (optional)";en.rows=2;en.style.cssText=taCss();en.addEventListener("input",e=>b.en=e.target.value);
        card.appendChild(mkLabel("Hebrew"));card.appendChild(he);
        card.appendChild(mkLabel("Transliteration"));card.appendChild(tr);
        const enLbl=el("div","");enLbl.style.cssText=miniLabel()+"display:flex;align-items:center;gap:.4rem";
        enLbl.innerHTML="English"+((b.en||"").trim()?"":` <span style="color:#c9912f;background:color-mix(in srgb,#c9912f 16%,transparent);font-size:.56rem;letter-spacing:.06em;padding:.1rem .4rem;border-radius:.3rem;text-transform:none;font-weight:700">needs English</span>`);
        card.appendChild(enLbl);card.appendChild(en);
        /* who sees this block + an optional conditional icon */
        const cl=el("div","");cl.textContent="Conditions — who sees this block";cl.style.cssText=miniLabel()+"margin-top:.6rem";card.appendChild(cl);
        condControls(card,()=>b.cond,(c)=>{if(c&&Object.keys(c).length)b.cond=c;else delete b.cond;});
        iconControls(card,b);
      }
      list.appendChild(card);
    });
  }
  function taCss(){return "width:100%;padding:.6rem .7rem;background:var(--surface2);border:1px solid var(--line);border-radius:.45rem;color:var(--ink);font-size:.92rem;outline:none;font-family:var(--sans);resize:vertical;margin-bottom:.5rem";}
  function miniLabel(){return "font-size:.6rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-bottom:.25rem";}
  function mkLabel(t){const d=el("div","");d.textContent=t;d.style.cssText=miniLabel();return d;}
  function chipCss(on){return "padding:.4rem .7rem;border-radius:.5rem;font-size:.78rem;font-weight:600;cursor:pointer;font-family:var(--sans);border:1px solid "+(on?"var(--accent)":"var(--line)")+";background:"+(on?"color-mix(in srgb,var(--accent) 14%,transparent)":"var(--surface2)")+";color:"+(on?"var(--accent)":"var(--ink2)");}
  /* Reusable condition builder (gender / location / minyan / custom audiences).
     getC()/setC() read & write the condition object on a block or an icon. */
  function condControls(card,getC,setC){
    const c=()=>getC()||{};
    const mk=(label,opts,cur,onPick)=>{
      const lbl=el("div","");lbl.textContent=label;lbl.style.cssText=miniLabel()+"margin-top:.5rem";card.appendChild(lbl);
      const row=el("div","");row.style.cssText="display:flex;gap:.4rem;flex-wrap:wrap";
      opts.forEach(([val,t])=>{const bn=el("button","");bn.type="button";bn.style.cssText=chipCss(cur===val);bn.textContent=t;bn.onclick=()=>onPick(val);row.appendChild(bn);});
      card.appendChild(row);
    };
    mk("Audience (siddur)",[["","Everyone"],["male","Men's siddur"],["female","Women's siddur"]],c().gender||"",v=>{const x=Object.assign({},c());if(v)x.gender=v;else delete x.gender;setC(x);paintBlocks();});
    mk("Location",[["","Anywhere"],["israel","Israel only"],["diaspora","Diaspora only"]],c().region||"",v=>{const x=Object.assign({},c());if(v)x.region=v;else delete x.region;setC(x);paintBlocks();});
    mk("Minyan",[["","Any"],["yes","With minyan"],["no","Without minyan"]],c().minyan===true?"yes":c().minyan===false?"no":"",v=>{const x=Object.assign({},c());if(v==="yes")x.minyan=true;else if(v==="no")x.minyan=false;else delete x.minyan;setC(x);paintBlocks();});
    const defs=state.audienceDefs||[];
    if(defs.length){
      const lbl=el("div","");lbl.textContent="Custom audiences (must belong to all selected)";lbl.style.cssText=miniLabel()+"margin-top:.5rem";card.appendChild(lbl);
      const row=el("div","");row.style.cssText="display:flex;gap:.4rem;flex-wrap:wrap";
      defs.forEach(d=>{const sel=(c().audiences||[]).includes(d.key);const bn=el("button","");bn.type="button";bn.style.cssText=chipCss(sel);bn.textContent=d.label||d.key;bn.onclick=()=>{const x=Object.assign({},c());const arr=(x.audiences||[]).slice();const j=arr.indexOf(d.key);if(j>=0)arr.splice(j,1);else arr.push(d.key);if(arr.length)x.audiences=arr;else delete x.audiences;setC(x);paintBlocks();};row.appendChild(bn);});
      card.appendChild(row);
    }
  }
  const ICON_KEYS=["stand","sit","bow","sun","dusk","moon","food","path","star","book"];
  /* Optional per-block icon, with its own condition (e.g. show a "bow" icon only for men). */
  function iconControls(card,b){
    const lbl=el("div","");lbl.textContent="Icon (shown beside this block)";lbl.style.cssText=miniLabel()+"margin-top:.7rem";card.appendChild(lbl);
    const keys=ICON_KEYS.concat(Object.keys(window.ICON_OVERRIDES||{}).filter(k=>ICON_KEYS.indexOf(k)<0));
    const sel=el("select");sel.style.cssText=taCss()+"margin-bottom:.3rem";
    sel.innerHTML=`<option value="">None</option>`+keys.map(k=>`<option value="${esc(k)}">${esc(k)}</option>`).join("");
    sel.value=(b.icon&&b.icon.key)||"";
    sel.onchange=()=>{if(sel.value){b.icon=Object.assign({},b.icon||{},{key:sel.value});}else{delete b.icon;}paintBlocks();};
    card.appendChild(sel);
    if(b.icon&&b.icon.key){
      const n=el("div","note","Show this icon only for:");n.style.cssText="margin:.2rem 0 0";card.appendChild(n);
      condControls(card,()=>b.icon.cond,(c)=>{if(c&&Object.keys(c).length)b.icon.cond=c;else delete b.icon.cond;});
    }
  }
  paintBlocks();
  addTxt.onclick=()=>{blocks.push({k:"p",he:"",tr:"",en:""});paintBlocks();bodyScroll.scrollTop=bodyScroll.scrollHeight;};
  addRub.onclick=()=>{blocks.push({k:"rubric",text:""});paintBlocks();bodyScroll.scrollTop=bodyScroll.scrollHeight;};
  addKav.onclick=()=>{blocks.push({k:"kavanah",kav:{found:"",halachic:"",kabbalistic:""}});paintBlocks();bodyScroll.scrollTop=bodyScroll.scrollHeight;};
  $("#peClose").onclick=()=>{ov.remove();};
  $("#peSave").onclick=()=>{
    const en=$("#peEn").value.trim(),he=$("#peHe").value.trim();
    const clean=blocks.filter(b=>{
      if(b.k==="rubric")return (b.text||"").trim();
      if(b.k==="kavanah"){const k=b.kav||{};return (k.found||"").trim()||(k.halachic||"").trim()||(k.kabbalistic||"").trim();}
      return (b.he||"").trim()||(b.en||"").trim()||(b.tr||"").trim();
    }).map(b=>{const c=Object.assign({},b);delete c._showK;delete c.kavanah;if(!c.region)delete c.region;if(c.cond&&!Object.keys(c.cond).length)delete c.cond;if(c.icon&&!c.icon.key)delete c.icon;if(c.kav){const kk={};if((c.kav.found||"").trim())kk.found=c.kav.found.trim();if((c.kav.halachic||"").trim())kk.halachic=c.kav.halachic.trim();if((c.kav.kabbalistic||"").trim())kk.kabbalistic=c.kav.kabbalistic.trim();if(Object.keys(kk).length)c.kav=kk;else delete c.kav;}return c;});
    if(custom){
      const arr=state.customPrayers[svcId]||[];const idx=arr.findIndex(p=>p.id===prId);
      if(idx>=0)arr[idx]=Object.assign({},arr[idx],{en:en||"Untitled",he,section:meta.section,blocks:clean});
      saveState();ov.remove();render();toast("Saved");return;
    }
    if(basePr.imported){
      /* edits to imported prayers are written straight into TEXTDATA so the Content
         tab's "Save to server" publishes them (conditions/icons included) to everyone. */
      const origBlocks=JSON.parse(JSON.stringify(basePr.blocks||[]));
      if(writeImportedBack(basePr.id,clean)){
        buildImported();saveState();ov.remove();render();
        /* offer to push the Hebrew/translation change to matching sections */
        if(!(typeof offerPropagate==="function"&&offerPropagate(basePr.id,origBlocks)))toast("Saved · publish via Content → Save to server");
        return;
      }
    }
    const rec={en,he,section:meta.section,blocks:clean};
    if(targetNusach==="__all__"){state.prayerEdits[prayerKey(svcId,prId)]=rec;}
    else{state.prayerEdits[svcId+"."+prId+"@"+targetNusach]=rec;}
    saveState();ov.remove();render();toast(targetNusach==="__all__"?"Saved for all nusachot":"Saved for "+NUSACH_LABELS[targetNusach]);
  };
}
function postureOf(b){if(b&&b.posture)return{tag:b.posture,label:b.posture==="stand"?"Rise":b.posture==="sit"?"Sit":"Bow"};return postureFromText((b&&b.text)||"");}
function postureAuto(t){const p=postureFromText(t);return p?p.tag:null;}


