"use strict";
/* ====== DAVEN AUDIO + BLOCK-LEVEL SYNC ==========================================
   Attach an uploaded audio clip to a service — covering a single prayer, several,
   or all of them — and mark when each block/line begins. During "Daven With Me"
   the matching line highlights and scrolls in time with the audio.

   Storage   : audio blobs live in IndexedDB (offline-capable, kept out of
               localStorage which is far too small for audio).
   Timings   : block-level (one timestamp per line), bound to a stable (pid,bi)
               identifier so cues survive toggle changes that hide some blocks.
               This is the foundation a finer per-word layer can sit on later.
   Metadata  : state.audioTracks[id] = {id, svcId, prayerIds:[...], name, mime,
                                         cues:[{pid,bi,t}], created}
================================================================================ */

/* ---- IndexedDB blob store ---- */
const AUDIO_DB="siddur-audio", AUDIO_STORE="clips";
function _audioDB(){return new Promise((res,rej)=>{let r;try{r=indexedDB.open(AUDIO_DB,1);}catch(e){return rej(e);}r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(AUDIO_STORE))r.result.createObjectStore(AUDIO_STORE);};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
function audioBlobPut(id,blob){return _audioDB().then(db=>new Promise((res,rej)=>{const tx=db.transaction(AUDIO_STORE,"readwrite");tx.objectStore(AUDIO_STORE).put(blob,id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);}));}
function audioBlobGet(id){return _audioDB().then(db=>new Promise((res,rej)=>{const tx=db.transaction(AUDIO_STORE,"readonly");const rq=tx.objectStore(AUDIO_STORE).get(id);rq.onsuccess=()=>res(rq.result||null);rq.onerror=()=>rej(rq.error);}));}
function audioBlobDel(id){return _audioDB().then(db=>new Promise((res,rej)=>{const tx=db.transaction(AUDIO_STORE,"readwrite");tx.objectStore(AUDIO_STORE).delete(id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);}));}

/* ---- track metadata ---- */
function _tracks(){if(!state.audioTracks)state.audioTracks={};return state.audioTracks;}
function audioTracksForSvc(svcId){return Object.keys(_tracks()).map(k=>_tracks()[k]).filter(t=>t.svcId===svcId);}
function _audId(){return "aud_"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function _fmtTime(s){s=Math.max(0,s||0);const m=Math.floor(s/60),x=Math.floor(s%60);return m+":"+(x<10?"0":"")+x;}

/* ============================ PLAYBACK (Daven With Me) ============================ */
let _dav={audio:null,url:null,track:null,cues:[],activeIdx:-1};

/* called by startDaven *before* paint — tears down any prior player */
function davenAudioReset(){
  if(_dav.audio){try{_dav.audio.pause();}catch(e){}}
  if(_dav.url){try{URL.revokeObjectURL(_dav.url);}catch(e){}}
  _dav={audio:null,url:null,track:null,cues:[],activeIdx:-1};
  const bar=document.getElementById("dmAudioBar");if(bar)bar.remove();
}

/* called by startDaven *after* paint — wires up the player if a track exists */
function davenAudioInit(){
  if(typeof dm==="undefined"||!dm||!dm.svcId)return;
  const tracks=audioTracksForSvc(dm.svcId);
  if(!tracks.length)return;
  const track=tracks[0]; /* v1: one track per service */
  _dav.track=track;
  const idxOf={};dm.blocks.forEach((b,i)=>{idxOf[b.pid+"|"+b.bi]=i;});
  _dav.cues=(track.cues||[]).map(c=>({t:c.t,dmIdx:idxOf[c.pid+"|"+c.bi]}))
                            .filter(c=>c.dmIdx!=null&&c.t!=null)
                            .sort((a,b)=>a.t-b.t);
  _injectDavenAudioBar(track);
  davenAudioAfterPaint();
}

function _injectDavenAudioBar(track){
  const daven=document.getElementById("daven");if(!daven)return;
  const old=document.getElementById("dmAudioBar");if(old)old.remove();
  const bar=el("div","dm-audio");bar.id="dmAudioBar";
  bar.innerHTML=`<button class="dm-aud-play" id="dmAudPlay" aria-label="Play"><svg class="icon" viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"/></svg></button>`+
    `<span class="dm-aud-time" id="dmAudCur">0:00</span>`+
    `<input class="dm-aud-seek" id="dmAudSeek" type="range" min="0" max="1000" value="0" aria-label="Seek">`+
    `<span class="dm-aud-time" id="dmAudDur">0:00</span>`+
    `<button class="dm-aud-rate" id="dmAudRate">1×</button>`;
  const prog=daven.querySelector(".dm-progress");
  if(prog&&prog.nextSibling)daven.insertBefore(bar,prog.nextSibling);else if(prog)prog.parentNode.appendChild(bar);else daven.appendChild(bar);

  const audio=new Audio();audio.preload="auto";_dav.audio=audio;
  audioBlobGet(track.id).then(blob=>{
    if(!blob){const c=document.getElementById("dmAudCur");if(c)c.textContent="—";return;}
    const url=URL.createObjectURL(blob);_dav.url=url;audio.src=url;
  }).catch(()=>{});

  const play=document.getElementById("dmAudPlay"),seek=document.getElementById("dmAudSeek"),
        cur=document.getElementById("dmAudCur"),dur=document.getElementById("dmAudDur"),
        rate=document.getElementById("dmAudRate");
  const rates=[1,1.25,1.5,0.75];let ri=0;
  const pIco=`<svg class="icon" viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"/></svg>`;
  const sIco=`<svg class="icon" viewBox="0 0 24 24"><path d="M7 5h3v14H7zM14 5h3v14h-3z"/></svg>`;
  play.onclick=()=>{if(audio.paused)audio.play().catch(()=>{});else audio.pause();};
  audio.onplay=()=>{play.innerHTML=sIco;};
  audio.onpause=()=>{play.innerHTML=pIco;};
  audio.onended=()=>{play.innerHTML=pIco;};
  audio.onloadedmetadata=()=>{if(isFinite(audio.duration))dur.textContent=_fmtTime(audio.duration);};
  audio.ontimeupdate=()=>{
    if(audio.duration&&isFinite(audio.duration)){seek.value=String(Math.round(audio.currentTime/audio.duration*1000));cur.textContent=_fmtTime(audio.currentTime);}
    _davenSyncHighlight(audio.currentTime);
  };
  seek.oninput=()=>{if(audio.duration&&isFinite(audio.duration))audio.currentTime=seek.value/1000*audio.duration;};
  rate.onclick=()=>{ri=(ri+1)%rates.length;audio.playbackRate=rates[ri];rate.textContent=rates[ri]+"×";};
}

/* re-applied after every paintDaven (blocks get rebuilt): rebind tap-to-seek + highlight */
function davenAudioAfterPaint(){
  if(!_dav.track)return;
  const content=document.getElementById("dmContent");if(!content)return;
  const track=_dav.track;
  content.querySelectorAll(".dm-block").forEach(card=>{
    const key=card.dataset.pid+"|"+card.dataset.bi;
    const cue=(track.cues||[]).find(c=>c.pid+"|"+c.bi===key);
    if(cue){card.classList.add("has-cue");card.style.cursor="pointer";
      card.addEventListener("click",()=>{if(_dav.audio){_dav.audio.currentTime=cue.t;if(_dav.audio.paused)_dav.audio.play().catch(()=>{});}});}
  });
  if(_dav.activeIdx>=0)_paintActive(_dav.activeIdx);
}

function _davenSyncHighlight(t){
  const cues=_dav.cues;if(!cues.length)return;
  let lo=-1;for(let i=0;i<cues.length;i++){if(cues[i].t<=t+0.001)lo=i;else break;}
  const idx=lo>=0?cues[lo].dmIdx:-1;
  if(idx===_dav.activeIdx)return;
  _dav.activeIdx=idx;if(idx<0)return;
  if(typeof dm!=="undefined"&&dm)dm.idx=idx;
  _paintActive(idx);
}

function _paintActive(idx){
  const content=document.getElementById("dmContent");if(!content)return;
  content.querySelectorAll(".dm-block").forEach(card=>{
    const i=+card.dataset.i;
    card.classList.toggle("audio-current",i===idx);
    card.classList.toggle("current",i===idx);
    card.classList.toggle("past",i<idx);
  });
  const cur=content.querySelector(".audio-current");
  if(cur&&cur.scrollIntoView)cur.scrollIntoView({behavior:"smooth",block:"center"});
  const fill=document.getElementById("dmFill");
  if(fill&&typeof dm!=="undefined"&&dm&&dm.blocks.length>1)fill.style.width=Math.round(idx/(dm.blocks.length-1)*100)+"%";
}

/* ============================ AUTHORING (mark the lines) ============================ */
let _auth=null;

function openAudioAuthor(svcId){
  const svc=svcById(svcId);if(!svc)return;
  const existing=audioTracksForSvc(svcId)[0]||null;
  const track=existing?JSON.parse(JSON.stringify(existing))
                      :{id:_audId(),svcId,prayerIds:orderedPrayers(svcId).map(p=>p.id),name:"",mime:"",cues:[]};
  if(!track.prayerIds||!track.prayerIds.length)track.prayerIds=orderedPrayers(svcId).map(p=>p.id);
  _auth={svcId,svcName:svc.en,track,audio:null,url:null,fileBlob:null,markIdx:0,hasBlob:!!existing};
  let ov=document.getElementById("audioAuthor");if(ov)ov.remove();
  ov=el("div","audio-author");ov.id="audioAuthor";document.body.appendChild(ov);
  if(existing){audioBlobGet(existing.id).then(b=>{if(b)_authLoadBlob(b,true);_renderAuthor();});}
  _renderAuthor();
}

function closeAudioAuthor(){
  if(_auth){if(_auth.audio){try{_auth.audio.pause();}catch(e){}}if(_auth.url){try{URL.revokeObjectURL(_auth.url);}catch(e){}}}
  _auth=null;const ov=document.getElementById("audioAuthor");if(ov)ov.remove();
}

function _authLoadBlob(blob,keepName){
  _auth.fileBlob=blob;_auth.hasBlob=true;
  if(_auth.url){try{URL.revokeObjectURL(_auth.url);}catch(e){}}
  _auth.url=URL.createObjectURL(blob);
  if(!_auth.audio)_auth.audio=new Audio();
  _auth.audio.src=_auth.url;
  if(!keepName&&blob.name){_auth.track.name=blob.name;_auth.track.mime=blob.type||"";}
}

function _authBlocks(){return buildDavenBlocks(_auth.svcId,_auth.track.prayerIds);}
function _cueFor(b){return _auth.track.cues.find(c=>c.pid===b.pid&&c.bi===b.bi);}
function _setCue(b,t){const c=_cueFor(b);if(c)c.t=t;else _auth.track.cues.push({pid:b.pid,bi:b.bi,t:t});}
function _clearCue(b){_auth.track.cues=_auth.track.cues.filter(c=>!(c.pid===b.pid&&c.bi===b.bi));}

function _renderAuthor(){
  const ov=document.getElementById("audioAuthor");if(!ov||!_auth)return;
  const blocks=_authBlocks();
  if(_auth.markIdx>blocks.length)_auth.markIdx=blocks.length;
  const prayers=orderedPrayers(_auth.svcId);
  const marked=_auth.track.cues.length;

  ov.innerHTML=
   `<div class="aa-top">
      <button class="aa-x" id="aaClose"><svg class="icon" viewBox="0 0 24 24"><path d="M6 6l12 12M6 18L18 6"/></svg></button>
      <div class="aa-title">Daven audio · ${esc(_auth.svcName)}</div>
    </div>
    <div class="aa-body">
      <div class="aa-sect-label">1 · Audio file <span class="aa-hint">stored in the app, works offline</span></div>
      <div class="aa-file">
        <label class="aa-upload"><input type="file" id="aaFile" accept="audio/*" hidden>
          <svg class="icon" viewBox="0 0 24 24" style="width:1.1em"><path d="M12 5v14M5 12h14"/></svg>
          <span>${_auth.hasBlob?"Replace audio":"Choose audio file"}</span></label>
        ${_auth.track.name?`<span class="aa-fname">${esc(_auth.track.name)}</span>`:""}
      </div>
      ${_auth.hasBlob?`<div class="aa-player">
        <button class="dm-aud-play" id="aaPlay"><svg class="icon" viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"/></svg></button>
        <span class="dm-aud-time" id="aaCur">0:00</span>
        <input class="dm-aud-seek" id="aaSeek" type="range" min="0" max="1000" value="0">
        <span class="dm-aud-time" id="aaDur">0:00</span>
        <button class="dm-aud-rate" id="aaRate">1×</button>
      </div>`:`<div class="aa-empty">Add an audio file to begin marking lines.</div>`}

      <div class="aa-sect-label">2 · Which prayers does this cover?</div>
      <div class="aa-scope">
        <button class="aa-chip" id="aaAll">All</button><button class="aa-chip" id="aaNone">None</button>
        ${prayers.map(p=>`<button class="aa-chip${_auth.track.prayerIds.includes(p.id)?" on":""}" data-pid="${esc(p.id)}">${esc(p.en)}</button>`).join("")}
      </div>

      <div class="aa-sect-label">3 · Mark each line <span class="aa-hint">${marked} of ${blocks.length} marked</span></div>
      ${_auth.hasBlob?`<button class="aa-marknext" id="aaMarkNext">⏱ Mark this line &amp; advance${blocks[_auth.markIdx]?` — “${esc((blocks[_auth.markIdx].en||blocks[_auth.markIdx].he||blocks[_auth.markIdx].text||"line").slice(0,40))}…”`:" — all lines marked"}</button>`:""}
      <div class="aa-list">
        ${blocks.map((b,i)=>{const c=_cueFor(b);const label=b.k==="header"?(b.en+" · "+(b.he||"")):(b.en||b.he||b.text||"(line)");
          return `<div class="aa-row${i===_auth.markIdx?" next":""}${b.k==="header"?" hdr":""}" data-i="${i}">
            <button class="aa-set" data-set="${i}">${c?_fmtTime(c.t):"set"}</button>
            <div class="aa-rowtxt">${esc(label.slice(0,70))}</div>
            ${c?`<button class="aa-go" data-go="${i}" title="Play from here">▶</button><button class="aa-clear" data-clr="${i}" title="Clear">✕</button>`:""}
          </div>`;}).join("")}
      </div>
    </div>
    <div class="aa-foot">
      ${audioTracksForSvc(_auth.svcId).length?`<button class="aa-del" id="aaDelete">Delete audio</button>`:`<span></span>`}
      <button class="aa-save" id="aaSave">Save</button>
    </div>`;

  /* ---- bind ---- */
  document.getElementById("aaClose").onclick=closeAudioAuthor;
  document.getElementById("aaFile").onchange=e=>{const f=e.target.files&&e.target.files[0];if(f){_authLoadBlob(f,false);_auth.markIdx=0;_renderAuthor();}};
  document.getElementById("aaAll").onclick=()=>{_auth.track.prayerIds=prayers.map(p=>p.id);_renderAuthor();};
  document.getElementById("aaNone").onclick=()=>{_auth.track.prayerIds=[];_renderAuthor();};
  ov.querySelectorAll(".aa-chip[data-pid]").forEach(ch=>ch.onclick=()=>{const pid=ch.dataset.pid;const a=_auth.track.prayerIds;const i=a.indexOf(pid);if(i>=0)a.splice(i,1);else a.push(pid);_renderAuthor();});

  ov.querySelectorAll(".aa-set").forEach(b=>b.onclick=()=>{const i=+b.dataset.set;const blk=blocks[i];if(_auth.audio){_setCue(blk,_auth.audio.currentTime);}else{_setCue(blk,0);}_renderAuthor();});
  ov.querySelectorAll(".aa-go").forEach(b=>b.onclick=()=>{const c=_cueFor(blocks[+b.dataset.go]);if(c&&_auth.audio){_auth.audio.currentTime=c.t;_auth.audio.play().catch(()=>{});}});
  ov.querySelectorAll(".aa-clear").forEach(b=>b.onclick=()=>{_clearCue(blocks[+b.dataset.clr]);_renderAuthor();});
  ov.querySelectorAll(".aa-row").forEach(r=>r.onclick=e=>{if(e.target.closest("button"))return;_auth.markIdx=+r.dataset.i;_renderAuthor();});

  const mn=document.getElementById("aaMarkNext");
  if(mn)mn.onclick=()=>{const blk=blocks[_auth.markIdx];if(!blk)return;_setCue(blk,_auth.audio?_auth.audio.currentTime:0);_auth.markIdx=Math.min(blocks.length,_auth.markIdx+1);if(typeof haptic==="function")haptic(10);_renderAuthor();};

  const save=document.getElementById("aaSave");if(save)save.onclick=_authSave;
  const del=document.getElementById("aaDelete");if(del)del.onclick=_authDelete;

  if(_auth.hasBlob)_bindAuthorPlayer();
}

function _bindAuthorPlayer(){
  if(!_auth.audio)_auth.audio=new Audio();
  const audio=_auth.audio;
  const play=document.getElementById("aaPlay"),seek=document.getElementById("aaSeek"),
        cur=document.getElementById("aaCur"),dur=document.getElementById("aaDur"),rate=document.getElementById("aaRate");
  if(!play)return;
  const pIco=`<svg class="icon" viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"/></svg>`;
  const sIco=`<svg class="icon" viewBox="0 0 24 24"><path d="M7 5h3v14H7zM14 5h3v14h-3z"/></svg>`;
  play.innerHTML=audio.paused?pIco:sIco;
  if(isFinite(audio.duration))dur.textContent=_fmtTime(audio.duration);
  const rates=[1,1.25,1.5,0.75];
  play.onclick=()=>{if(audio.paused)audio.play().catch(()=>{});else audio.pause();};
  audio.onplay=()=>{if(document.getElementById("aaPlay"))document.getElementById("aaPlay").innerHTML=sIco;};
  audio.onpause=()=>{if(document.getElementById("aaPlay"))document.getElementById("aaPlay").innerHTML=pIco;};
  audio.onloadedmetadata=()=>{const d=document.getElementById("aaDur");if(d&&isFinite(audio.duration))d.textContent=_fmtTime(audio.duration);};
  audio.ontimeupdate=()=>{const c=document.getElementById("aaCur"),s=document.getElementById("aaSeek");if(audio.duration&&isFinite(audio.duration)){if(s)s.value=String(Math.round(audio.currentTime/audio.duration*1000));if(c)c.textContent=_fmtTime(audio.currentTime);}};
  seek.oninput=()=>{if(audio.duration&&isFinite(audio.duration))audio.currentTime=seek.value/1000*audio.duration;};
  let ri=0;rate.onclick=()=>{ri=(ri+1)%rates.length;audio.playbackRate=rates[ri];rate.textContent=rates[ri]+"×";};
}

function _authSave(){
  const tr=_auth.track;
  if(!_auth.hasBlob){if(typeof toast==="function")toast("Add an audio file first");return;}
  if(!tr.cues.length){if(typeof toast==="function")toast("Mark at least one line first");return;}
  tr.cues.sort((a,b)=>a.t-b.t);tr.created=tr.created||Date.now();
  const finish=()=>{_tracks()[tr.id]=tr;saveState();if(typeof toast==="function")toast("Audio sync saved");closeAudioAuthor();if(typeof render==="function")render();};
  if(_auth.fileBlob){tr.mime=_auth.fileBlob.type||tr.mime;audioBlobPut(tr.id,_auth.fileBlob).then(finish).catch(()=>{if(typeof toast==="function")toast("Could not store audio");});}
  else finish();
}

function _authDelete(){
  const tr=_auth.track;delete _tracks()[tr.id];saveState();
  audioBlobDel(tr.id).catch(()=>{});
  if(typeof toast==="function")toast("Audio removed");closeAudioAuthor();if(typeof render==="function")render();
}
