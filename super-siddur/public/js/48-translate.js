"use strict";
/* ====== CANONICAL ENGLISH — FETCH FROM SEFARIA ================================
   English is the master translation layer. This module lets an admin pull
   public-domain English from Sefaria for a section (search → pick ref → preview
   → fill), mapping the returned segments onto the section's prayer blocks. Only
   the English (block.en) is touched; Hebrew is never changed. Blocks left blank
   are flagged "needs English" in the editor so the canonical layer can be
   completed. Later, the other languages are generated from this verified English.
============================================================================== */

const SEFARIA_BASE="https://www.sefaria.org";

function _stripHtml(s){return String(s==null?"":s).replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();}
function _flattenSeg(t){
  const out=[];
  (function walk(x){
    if(x==null)return;
    if(Array.isArray(x)){x.forEach(walk);return;}
    const s=_stripHtml(x);if(s)out.push(s);
  })(t);
  return out;
}

/* GET the English version of a Sefaria ref, flattened to an array of segments. */
async function sefariaFetchEnglish(ref){
  if(!ref||!ref.trim())return{ok:false,error:"Enter or pick a Sefaria reference first"};
  const url=SEFARIA_BASE+"/api/v3/texts/"+encodeURIComponent(ref.trim())+"?version=english&return_format=text_only";
  try{
    const r=await fetch(url);
    if(!r.ok)return{ok:false,error:"Sefaria: "+(r.status===404?"reference not found":"error "+r.status)};
    const d=await r.json();
    let v=(d.versions||[]).find(x=>x&&(x.language==="en"||x.isPrimary===false&&x.direction==="ltr"))||(d.versions||[])[0];
    const segs=_flattenSeg(v&&v.text).map(cleanText);
    if(!segs.length)return{ok:false,error:"No English text available for this reference"};
    return{ok:true,segments:segs,ref:d.ref||ref};
  }catch(e){return{ok:false,error:"Network error — Sefaria needs a connection"};}
}

/* Sefaria name autocomplete → ref/title suggestions. */
async function sefariaSearch(q){
  if(!q||q.trim().length<2)return[];
  try{
    const r=await fetch(SEFARIA_BASE+"/api/name/"+encodeURIComponent(q.trim())+"?limit=12");
    if(!r.ok)return[];
    const d=await r.json();
    const objs=d.completion_objects||[];
    const seen={},out=[];
    objs.forEach(o=>{const key=o.key||o.title;if(key&&!seen[key]){seen[key]=1;out.push({title:o.title||key,key,type:o.type||""});}});
    if(!out.length&&Array.isArray(d.completions))d.completions.forEach(c=>out.push({title:c,key:c,type:""}));
    return out.slice(0,12);
  }catch(e){return[];}
}

/* Map fetched English segments onto a section's prayer blocks (en only). */
function mapSegmentsToEnglish(blocks,segs){
  const ps=(blocks||[]).filter(b=>b.k!=="rubric"&&b.k!=="kavanah");
  if(!ps.length||!segs||!segs.length)return 0;
  let n=0;
  if(ps.length===1){ps[0].en=segs.join("\n");return 1;}
  if(segs.length===ps.length){ps.forEach((b,i)=>{if(segs[i]){b.en=segs[i];n++;}});return n;}
  /* counts differ: best-effort positional, remainder appended to the last block */
  ps.forEach((b,i)=>{
    if(i<segs.length){b.en=(i===ps.length-1)?segs.slice(i).join("\n"):segs[i];if(b.en)n++;}
  });
  return n;
}

/* Admin dialog: search Sefaria, fetch English, preview, then hand segments back. */
function openSefariaDialog(seedTitle,onFetched){
  const old=document.getElementById("sefariaDlg");if(old)old.remove();
  let segments=null;
  const ov=el("div","");ov.id="sefariaDlg";
  ov.style.cssText="position:fixed;inset:0;z-index:130;background:var(--bg);display:flex;flex-direction:column;overflow:hidden";
  ov.innerHTML=`
    <div style="flex:none;padding:1rem 1.1rem;border-bottom:1px solid var(--line);background:var(--surface);display:flex;align-items:center;gap:.6rem">
      <button id="sdClose" style="background:transparent;border:0;color:var(--muted);cursor:pointer;display:flex;align-items:center;gap:.3rem;font-size:.85rem"><svg class="icon" viewBox="0 0 24 24" style="width:1.1em;height:1.1em"><path d="M15 18l-6-6 6-6"/></svg> Cancel</button>
      <div style="flex:1;text-align:center;font-family:var(--display);font-weight:600;color:var(--ink)">English from Sefaria</div>
      <button id="sdFill" style="background:var(--accent);color:var(--on-accent);border:0;border-radius:.45rem;padding:.45rem .9rem;font-weight:700;font-size:.82rem;cursor:pointer;opacity:.5" disabled>Fill English</button>
    </div>
    <div style="flex:1;overflow-y:auto;padding:1rem 1.1rem 1.5rem">
      <div class="field"><label>Search Sefaria (prayer or book name)</label><input id="sdQuery" placeholder="e.g. Modeh Ani, Ashrei, Psalms 145" value="${esc(seedTitle||"")}"></div>
      <div id="sdSugg" style="display:flex;flex-direction:column;gap:.3rem;margin:.2rem 0 .6rem"></div>
      <div class="field"><label>Sefaria reference</label><input id="sdRef" placeholder="e.g. Psalms 145 or Siddur Ashkenaz, ..." value=""></div>
      <button id="sdFetch" class="btn-ghost" style="margin:.2rem 0 .8rem">Fetch English</button>
      <div id="sdStatus" style="font-size:.82rem;color:var(--ink2);margin-bottom:.6rem"></div>
      <div id="sdPreview"></div>
    </div>`;
  document.body.appendChild(ov);

  const q=document.getElementById("sdQuery"),refIn=document.getElementById("sdRef"),
        sugg=document.getElementById("sdSugg"),status=document.getElementById("sdStatus"),
        preview=document.getElementById("sdPreview"),fillBtn=document.getElementById("sdFill");

  document.getElementById("sdClose").onclick=()=>ov.remove();

  let tmr=null;
  const runSearch=()=>{
    const term=q.value;
    sugg.innerHTML="";
    if(!term||term.trim().length<2)return;
    sefariaSearch(term).then(list=>{
      sugg.innerHTML="";
      list.forEach(s=>{
        const b=el("button","");b.style.cssText="text-align:left;padding:.45rem .65rem;border:1px solid var(--line);border-radius:.45rem;background:var(--surface);color:var(--ink2);font-size:.82rem;cursor:pointer";
        b.innerHTML=`<b style="color:var(--ink)">${esc(s.title)}</b>${s.type?` <span style="color:var(--muted);font-size:.72rem">· ${esc(s.type)}</span>`:""}`;
        b.onclick=()=>{refIn.value=s.key;sugg.innerHTML="";status.textContent="";};
        sugg.appendChild(b);
      });
    });
  };
  q.addEventListener("input",()=>{clearTimeout(tmr);tmr=setTimeout(runSearch,300);});
  setTimeout(runSearch,200);

  document.getElementById("sdFetch").onclick=()=>{
    const ref=refIn.value||q.value;
    status.textContent="Fetching…";preview.innerHTML="";segments=null;fillBtn.disabled=true;fillBtn.style.opacity=".5";
    sefariaFetchEnglish(ref).then(res=>{
      if(!res.ok){status.textContent=res.error;return;}
      segments=res.segments;
      status.innerHTML=`<b style="color:var(--accent)">${esc(res.ref)}</b> · ${segments.length} segment${segments.length>1?"s":""}`;
      preview.innerHTML=segments.map((s,i)=>`<div style="padding:.5rem .65rem;border:1px solid var(--line);border-radius:.45rem;margin-bottom:.4rem;font-size:.86rem;color:var(--ink2);line-height:1.5"><span style="color:var(--muted);font-size:.7rem;margin-right:.4rem">${i+1}</span>${esc(s)}</div>`).join("");
      fillBtn.disabled=false;fillBtn.style.opacity="1";
    });
  };

  fillBtn.onclick=()=>{if(!segments)return;ov.remove();if(typeof onFetched==="function")onFetched(segments);};
}
