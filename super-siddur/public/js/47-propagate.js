"use strict";
/* ====== PUSH AN EDIT TO MATCHING SECTIONS ======================================
   After an admin edits an imported section's Hebrew and/or translation, find
   other sections that represent the same text — across nusachim and across the
   whole siddur — and let the admin review & confirm which ones receive the edit.

   Matching combines two signals into one deduplicated candidate list:
     (a) prayer identity  — same section header (e.g. Modeh Ani) in another doc
     (b) text similarity  — Hebrew that is identical or fuzzy-near the original

   Hebrew and translation push independently. Every push snapshots the targets'
   prior blocks into state.pushLog so it can be undone.
================================================================================ */

/* ---- section id + text helpers (handle both raw TEXTDATA and editor shapes) ---- */
function _parseImpId(id){const p=String(id||"").split("_");if(p.length<4||p[0]!=="imp")return null;return{nusach:p[1],si:parseInt(p[p.length-1],10),svcId:p.slice(2,-1).join("_")};}
function _secHe(blocks){return (blocks||[]).map(b=>b.k==="rubric"?(b.text!=null?b.text:(b.t||"")):(b.he!=null?b.he:(b.t||""))).join("\n");}
function _secEn(blocks){return (blocks||[]).filter(b=>b.k!=="rubric").map(b=>b.en||"").join("\n");}
function _stripNiqqud(s){return String(s||"").replace(/[֑-ׇ]/g,"");}
function _normHe(s){return _stripNiqqud(s).replace(/[^א-ת]/g,"");}
function _normHeader(s){return _stripNiqqud(s).replace(/\s+/g," ").trim();}
function _bigrams(s){const m={};for(let i=0;i<s.length-1;i++){const g=s.substr(i,2);m[g]=(m[g]||0)+1;}return m;}
function _dice(a,b){a=_normHe(a);b=_normHe(b);if(a===b)return a.length?1:0;if(a.length<2||b.length<2)return 0;const A=_bigrams(a),B=_bigrams(b);let inter=0,total=0;for(const g in A){total+=A[g];if(B[g])inter+=Math.min(A[g],B[g]);}for(const g in B)total+=B[g];return total?2*inter/total:0;}
function _nusachLabel(n){return (typeof NUSACH_LABELS!=="undefined"&&NUSACH_LABELS[n])||n;}
function _pushLog(){if(!state.pushLog)state.pushLog=[];return state.pushLog;}

/* ---- entry point: called from the prayer editor's Save (imported branch) ---- */
function offerPropagate(sourceId,origBlocks){
  const src=_parseImpId(sourceId);if(!src)return false;
  const docs=window.TEXTDATA||[];
  const srcDoc=docs.find(d=>d.nusach===src.nusach&&d.svcId===src.svcId);
  if(!srcDoc||!srcDoc.sections||!srcDoc.sections[src.si])return false;
  const srcSec=srcDoc.sections[src.si];
  const origHe=_secHe(origBlocks),origEn=_secEn(origBlocks);
  const newHe=_secHe(srcSec.blocks),newEn=_secEn(srcSec.blocks);
  const heChanged=origHe!==newHe, enChanged=origEn!==newEn;
  if(!heChanged&&!enChanged)return false;

  const header=srcSec.header||srcDoc.service||"";
  const cands=[];
  docs.forEach(doc=>{
    (doc.sections||[]).forEach((sec,si)=>{
      if(doc.nusach===src.nusach&&doc.svcId===src.svcId&&si===src.si)return; /* skip the source */
      const heText=_secHe(sec.blocks);
      const reasons=[];
      if(header&&_normHeader(sec.header||"")&&_normHeader(sec.header)===_normHeader(header))reasons.push("same prayer");
      const sim=_dice(heText,origHe);
      if(sim>=0.999)reasons.push("identical text");
      else if(sim>=0.84)reasons.push("similar text");
      if(reasons.length)cands.push({nusach:doc.nusach,svcId:doc.svcId,service:doc.service||doc.svcId,si,header:sec.header||doc.service||doc.svcId,heText,enText:_secEn(sec.blocks),reasons,sim});
    });
  });
  if(!cands.length){if(typeof toast==="function")toast("Saved · no matching sections found");return true;}
  cands.sort((a,b)=>{const ai=a.reasons.includes("same prayer")?1:0,bi=b.reasons.includes("same prayer")?1:0;if(ai!==bi)return bi-ai;return b.sim-a.sim;});

  _renderReview({src,header,heChanged,enChanged,newHe,newEn,cands});
  return true;
}

function _renderReview(ctx){
  const old=document.getElementById("pushReview");if(old)old.remove();
  const ov=el("div","");ov.id="pushReview";
  ov.style.cssText="position:fixed;inset:0;z-index:130;background:var(--bg);display:flex;flex-direction:column;overflow:hidden";

  const hd=el("div","");hd.style.cssText="flex:none;padding:1rem 1.1rem .85rem;border-bottom:1px solid var(--line);background:var(--surface)";
  hd.innerHTML=`<div style="display:flex;align-items:center;gap:.6rem">
      <button id="prClose" style="background:transparent;border:0;color:var(--muted);cursor:pointer;display:flex;align-items:center;gap:.3rem;font-size:.85rem"><svg class="icon" viewBox="0 0 24 24" style="width:1.1em;height:1.1em"><path d="M15 18l-6-6 6-6"/></svg> Cancel</button>
      <div style="flex:1;text-align:center;font-family:var(--display);font-weight:600;color:var(--ink)">Find &amp; update matching sections</div>
      <button id="prApply" style="background:var(--accent);color:var(--on-accent);border:0;border-radius:.45rem;padding:.45rem .9rem;font-weight:700;font-size:.82rem;cursor:pointer">Apply</button>
    </div>
    <div style="margin-top:.6rem;font-size:.8rem;color:var(--ink2)">“${esc(ctx.header)}” · you changed ${ctx.heChanged?'<b style="color:var(--accent)">Hebrew</b>':""}${ctx.heChanged&&ctx.enChanged?" &amp; ":""}${ctx.enChanged?'<b style="color:var(--accent)">translation</b>':""}. Pick which sections receive it.</div>`;
  ov.appendChild(hd);

  /* global controls */
  const ctl=el("div","");ctl.style.cssText="flex:none;display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;padding:.6rem 1.1rem;border-bottom:1px solid var(--line);background:var(--surface2)";
  const mkToggle=(id,label,on)=>{const b=el("button","");b.id=id;b.dataset.on=on?"1":"0";b.style.cssText="padding:.4rem .75rem;border-radius:.5rem;font-size:.8rem;font-weight:600;cursor:pointer;font-family:var(--sans);border:1px solid "+(on?"var(--accent)":"var(--line)")+";background:"+(on?"color-mix(in srgb,var(--accent) 14%,transparent)":"var(--surface)")+";color:"+(on?"var(--accent)":"var(--ink2)");b.textContent=label;return b;};
  ctl.appendChild(el("span","",)).textContent="Push:";
  ctl.lastChild.style.cssText="font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:700";
  if(ctx.heChanged)ctl.appendChild(mkToggle("prPushHe","Hebrew",true));
  if(ctx.enChanged)ctl.appendChild(mkToggle("prPushEn","Translation",true));
  const sp=el("div","");sp.style.flex="1";ctl.appendChild(sp);
  const selAll=el("button","");selAll.style.cssText="padding:.4rem .7rem;border-radius:.5rem;font-size:.78rem;font-weight:600;cursor:pointer;border:1px solid var(--line);background:var(--surface);color:var(--ink2)";selAll.textContent="Select all";ctl.appendChild(selAll);
  const selNone=el("button","");selNone.style.cssText=selAll.style.cssText;selNone.textContent="None";ctl.appendChild(selNone);
  ov.appendChild(ctl);

  /* candidate list */
  const body=el("div","");body.style.cssText="flex:1;min-height:0;overflow-y:auto;padding:.8rem 1.1rem 1.5rem";
  ctx.cands.forEach((c,idx)=>{
    const high=c.reasons.includes("same prayer")||c.reasons.includes("identical text");
    const card=el("div","");card.dataset.idx=idx;card.style.cssText="background:var(--surface);border:1px solid var(--line);border-radius:.6rem;padding:.75rem .85rem;margin-bottom:.6rem;display:flex;gap:.7rem;align-items:flex-start";
    const cb=el("input","");cb.type="checkbox";cb.className="pr-inc";cb.checked=high;cb.style.cssText="margin-top:.25rem;width:1.1rem;height:1.1rem;accent-color:var(--accent);flex:none";
    const main=el("div","");main.style.flex="1";main.style.minWidth="0";
    const badges=c.reasons.map(r=>`<span style="font-size:.6rem;letter-spacing:.08em;text-transform:uppercase;font-weight:700;padding:.15rem .45rem;border-radius:.3rem;color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent)">${esc(r)}</span>`).join(" ");
    main.innerHTML=`<div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin-bottom:.35rem">
        <span style="font-weight:600;color:var(--ink);font-size:.9rem">${esc(_nusachLabel(c.nusach))} · ${esc(c.service)}</span>
        <span style="font-family:var(--hebrew);color:var(--accent);font-size:.95rem">${esc(c.header)}</span></div>
      <div style="font-family:var(--hebrew);direction:rtl;text-align:right;color:var(--ink2);font-size:.92rem;line-height:1.7;max-height:3.6em;overflow:hidden">${esc((c.heText||"").replace(/\n/g," ").slice(0,120))}</div>
      ${c.enText?`<div style="color:var(--muted);font-size:.78rem;margin-top:.25rem;max-height:2.6em;overflow:hidden">${esc(c.enText.replace(/\n/g," ").slice(0,120))}</div>`:""}
      <div style="margin-top:.45rem">${badges}</div>`;
    /* per-field toggles (only for fields that changed) */
    const fields=el("div","");fields.style.cssText="display:flex;gap:.8rem;margin-top:.5rem";
    if(ctx.heChanged){const l=el("label","");l.style.cssText="display:inline-flex;align-items:center;gap:.3rem;font-size:.76rem;color:var(--ink2);cursor:pointer";l.innerHTML=`<input type="checkbox" class="pr-he" checked style="accent-color:var(--accent)"> Hebrew`;fields.appendChild(l);}
    if(ctx.enChanged){const l=el("label","");l.style.cssText="display:inline-flex;align-items:center;gap:.3rem;font-size:.76rem;color:var(--ink2);cursor:pointer";l.innerHTML=`<input type="checkbox" class="pr-en" checked style="accent-color:var(--accent)"> Translation`;fields.appendChild(l);}
    main.appendChild(fields);
    card.appendChild(cb);card.appendChild(main);body.appendChild(card);
  });
  ov.appendChild(body);
  document.body.appendChild(ov);

  /* wiring */
  const incs=()=>[...ov.querySelectorAll(".pr-inc")];
  document.getElementById("prClose").onclick=()=>{ov.remove();if(typeof toast==="function")toast("Saved · publish via Content → Save to server");};
  selAll.onclick=()=>incs().forEach(c=>c.checked=true);
  selNone.onclick=()=>incs().forEach(c=>c.checked=false);
  const wireToggle=(id,cls)=>{const b=document.getElementById(id);if(!b)return;b.onclick=()=>{const on=b.dataset.on!=="1";b.dataset.on=on?"1":"0";b.style.borderColor=on?"var(--accent)":"var(--line)";b.style.background=on?"color-mix(in srgb,var(--accent) 14%,transparent)":"var(--surface)";b.style.color=on?"var(--accent)":"var(--ink2)";ov.querySelectorAll(cls).forEach(x=>x.checked=on);};};
  wireToggle("prPushHe",".pr-he");wireToggle("prPushEn",".pr-en");

  document.getElementById("prApply").onclick=()=>{
    const picks=[];
    [...body.children].forEach(card=>{
      const inc=card.querySelector(".pr-inc");if(!inc||!inc.checked)return;
      const heCb=card.querySelector(".pr-he"),enCb=card.querySelector(".pr-en");
      const he=!!(heCb&&heCb.checked),en=!!(enCb&&enCb.checked);
      if(!he&&!en)return;
      picks.push({idx:+card.dataset.idx,he,en});
    });
    if(!picks.length){if(typeof toast==="function")toast("Select at least one section");return;}
    _applyPushes(ctx,picks);ov.remove();
  };
}

function _pushedBlocks(srcRaw,tgtRaw,pushHe,pushEn){
  const clone=o=>JSON.parse(JSON.stringify(o));
  if(pushHe){
    return srcRaw.map((sb,i)=>{const o=clone(sb);if(!pushEn){const tb=tgtRaw[i];if(tb&&tb.en!=null)o.en=tb.en;else delete o.en;}return o;});
  }
  if(pushEn){ /* translation only — keep target Hebrew & structure, map p-block → p-block */
    const srcP=srcRaw.filter(b=>b.k!=="rubric");let pi=-1;
    return tgtRaw.map(tb=>{const o=clone(tb);if(tb.k!=="rubric"){pi++;const sb=srcP[pi];if(sb){if(sb.en!=null)o.en=sb.en;else delete o.en;}}return o;});
  }
  return tgtRaw.map(clone);
}

function _applyPushes(ctx,picks){
  const docs=window.TEXTDATA||[];
  const srcDoc=docs.find(d=>d.nusach===ctx.src.nusach&&d.svcId===ctx.src.svcId);
  const srcRaw=srcDoc.sections[ctx.src.si].blocks;
  const targets=[];
  picks.forEach(p=>{
    const c=ctx.cands[p.idx];
    const doc=docs.find(d=>d.nusach===c.nusach&&d.svcId===c.svcId);
    if(!doc||!doc.sections||!doc.sections[c.si])return;
    const sec=doc.sections[c.si];
    const before=JSON.parse(JSON.stringify(sec.blocks||[]));
    sec.blocks=_pushedBlocks(srcRaw,sec.blocks||[],p.he,p.en);
    targets.push({nusach:c.nusach,svcId:c.svcId,si:c.si,header:c.header,he:p.he,en:p.en,before});
  });
  if(!targets.length)return;
  const log=_pushLog();
  log.unshift({id:"push_"+Date.now().toString(36),ts:Date.now(),source:{header:ctx.header,nusach:ctx.src.nusach,svcId:ctx.src.svcId},he:ctx.heChanged,en:ctx.enChanged,targets});
  if(log.length>20)log.length=20;
  if(typeof buildImported==="function")buildImported();
  saveState();if(typeof render==="function")render();
  if(typeof toast==="function")toast("Updated "+targets.length+" section"+(targets.length>1?"s":"")+" · publish via Content → Save to server");
}

/* ---- undo log ---- */
function undoPush(id){
  const log=_pushLog();const e=log.find(x=>x.id===id);if(!e||e.undone)return;
  const docs=window.TEXTDATA||[];
  e.targets.forEach(t=>{const doc=docs.find(d=>d.nusach===t.nusach&&d.svcId===t.svcId);if(doc&&doc.sections&&doc.sections[t.si])doc.sections[t.si].blocks=JSON.parse(JSON.stringify(t.before));});
  e.undone=true;
  if(typeof buildImported==="function")buildImported();
  saveState();if(typeof render==="function")render();if(typeof openPushLog==="function")openPushLog();
  if(typeof toast==="function")toast("Push undone · republish via Content → Save to server");
}

function openPushLog(){
  const old=document.getElementById("pushLog");if(old)old.remove();
  const log=_pushLog();
  const ov=el("div","");ov.id="pushLog";
  ov.style.cssText="position:fixed;inset:0;z-index:130;background:var(--bg);display:flex;flex-direction:column;overflow:hidden";
  const hd=el("div","");hd.style.cssText="flex:none;padding:1rem 1.1rem;border-bottom:1px solid var(--line);background:var(--surface);display:flex;align-items:center;gap:.6rem";
  hd.innerHTML=`<button id="plClose" style="background:transparent;border:0;color:var(--muted);cursor:pointer;display:flex;align-items:center;gap:.3rem;font-size:.85rem"><svg class="icon" viewBox="0 0 24 24" style="width:1.1em;height:1.1em"><path d="M15 18l-6-6 6-6"/></svg> Back</button><div style="flex:1;font-family:var(--display);font-weight:600;color:var(--ink)">Recent text pushes</div>`;
  ov.appendChild(hd);
  const body=el("div","");body.style.cssText="flex:1;overflow-y:auto;padding:1rem 1.1rem 2rem";
  const live=log.filter(e=>!e.undone);
  if(!live.length)body.appendChild(el("div","note","No pushes to undo."));
  live.forEach(e=>{
    const card=el("div","");card.style.cssText="background:var(--surface);border:1px solid var(--line);border-radius:.6rem;padding:.75rem .85rem;margin-bottom:.6rem;display:flex;gap:.7rem;align-items:center";
    const fields=[e.targets.some(t=>t.he)?"Hebrew":"",e.targets.some(t=>t.en)?"translation":""].filter(Boolean).join(" & ");
    const when=new Date(e.ts).toLocaleString();
    card.innerHTML=`<div style="flex:1;min-width:0"><div style="font-weight:600;color:var(--ink);font-size:.9rem">${esc(e.source.header||"")} <span style="font-family:var(--hebrew);color:var(--accent)"></span></div><div style="font-size:.76rem;color:var(--ink2);margin-top:.2rem">${esc(fields)} → ${e.targets.length} section${e.targets.length>1?"s":""} · ${esc(when)}</div></div>`;
    const u=el("button","");u.style.cssText="flex:none;padding:.45rem .85rem;border-radius:.45rem;border:1px solid color-mix(in srgb,var(--accent) 40%,transparent);background:transparent;color:var(--accent);font-weight:600;font-size:.8rem;cursor:pointer";u.textContent="↩ Undo";u.onclick=()=>undoPush(e.id);
    card.appendChild(u);body.appendChild(card);
  });
  ov.appendChild(body);document.body.appendChild(ov);
  document.getElementById("plClose").onclick=()=>ov.remove();
}
