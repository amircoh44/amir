"use strict";
/* Onboarding, router, all views (home/service/daven/tehillim/zmanim/kotel), print */
function startOnboard(){obStep=0;obData={hebName:state.userHebName||"",engName:state.userEngName||"",birthday:state.birthday,nusach:state.nusach,loc:state.loc,israelMode:state.israelMode,gender:state.gender||""};$("#cover").classList.add("gone");$("#onboard").classList.add("show");$("#app").style.visibility="hidden";renderOb();}
function renderOb(){
  const ob=$("#onboard");let html="";
  if(obStep===0){html=`<div class="ob-content"><div class="ob-step">Welcome</div><div class="ob-h1">Let's set up your siddur</div><div class="ob-h2">A few quick questions so the text, times, and your psalm are right for you.</div></div>`;}
  else if(obStep===1){html=`<div class="ob-content"><div class="ob-step">Step 1 of 3 \u00B7 Your name</div><div class="ob-h1">What's your name?</div><div class="ob-h2">Used for your Hebrew birthday psalm and personal touches.</div><div class="ob-form"><input class="ob-input" id="obEng" placeholder="English name (e.g. Amir Cohen)" value="${esc(obData.engName)}"><input class="ob-input hebrew" id="obHeb" placeholder="\u05E9\u05B5\u05C1\u05DD \u05D1\u05B0\u05E2\u05B4\u05D1\u05B0\u05E8\u05B4\u05D9\u05EA" value="${esc(obData.hebName)}"></div></div>`;}
  else if(obStep===2){const b=obData.birthday;html=`<div class="ob-content"><div class="ob-step">Step 2 of 3 \u00B7 Hebrew birthday</div><div class="ob-h1">When were you born?</div><div class="ob-h2">We'll show the psalm for your year (age + 1), updated each Hebrew birthday.</div><div class="ob-form"><div style="font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-weight:600;margin:.4rem 0 .2rem;text-align:left">English date (we convert)</div><input class="ob-input" id="obDate" type="date" value="${b?b.gregYMD||"":""}"><div id="obHebPreview" style="font-family:var(--hebrew);direction:rtl;color:var(--accent);font-size:1rem;min-height:1.5rem;text-align:right">${b?gematria(b.day)+" "+monthHe(b.month,b.year)+" "+gematria(b.year%1000):""}</div><button class="ob-btn ghost" id="obSkip" style="margin-top:.7rem">Skip \u2014 set later</button></div></div>`;}
  else if(obStep===3){
    const cityBtns=[["Denver, CO",39.7392,-104.9903,"America/Denver"],["Jerusalem",31.7683,35.2137,"Asia/Jerusalem"],["New York, NY",40.7128,-74.006,"America/New_York"],["Los Angeles, CA",34.0522,-118.2437,"America/Los_Angeles"],["London",51.5074,-0.1278,"Europe/London"],["Toronto",43.6532,-79.3832,"America/Toronto"]];
    html=`<div class="ob-content"><div class="ob-step">Step 3 of 3 \u00B7 Nusach & location</div><div class="ob-h1">Which tradition?</div><div class="ob-h2">Affects text variants and zmanim.</div><div class="ob-form" style="max-width:380px"><div style="font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-weight:600;margin:.2rem 0 .3rem;text-align:left">You are</div><div class="ob-grid" style="grid-template-columns:1fr 1fr 1fr">${[["male","Man","אִישׁ"],["female","Woman","אִשָּׁה"],["","Prefer not"]].map(([v,en,he])=>`<button class="ob-pick ${obData.gender===v?"on":""}" data-gender="${v}"><span class="en">${en}</span>${he?`<span class="he">${he}</span>`:""}</button>`).join("")}</div><div style="font-size:.6rem;color:var(--muted);text-align:left;margin:.3rem 0 .2rem">Sets gendered blessings (e.g. שֶּׁלֹּא עָשַׂנִי אִשָּׁה / שֶׁעָשַׂנִי כִּרְצוֹנוֹ).</div><div style="font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-weight:600;margin:.5rem 0 .3rem;text-align:left">Nusach</div><div class="ob-grid">${[["ashkenaz","Ashkenaz","\u05D0\u05B7\u05E9\u05C1\u05B0\u05DB\u05B0\u05BC\u05E0\u05B7\u05D6"],["sefard","Sefard","\u05E1\u05B0\u05E4\u05B8\u05E8\u05B7\u05D3"],["ari","Nusach Ari","\u05E0\u05BB\u05E1\u05B7\u05BC\u05D7 \u05D4\u05B8\u05D0\u05B2\u05E8\u05B4\u05D9"],["edot","Edot HaMizrach","\u05E2\u05B5\u05D3\u05D5\u05B9\u05EA \u05D4\u05B7\u05DE\u05B4\u05D6\u05B0\u05E8\u05B8\u05D7"]].map(([v,en,he])=>`<button class="ob-pick ${obData.nusach===v?"on":""}" data-nusach="${v}"><span class="en">${en}</span><span class="he">${he}</span></button>`).join("")}</div><div style="font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-weight:600;margin:1rem 0 .3rem;text-align:left">Where are you?</div><div class="ob-grid" style="grid-template-columns:1fr 1fr 1fr">${[["diaspora","Chutz LaAretz"],["israel","Eretz Yisrael"],["yerushalayim","Yerushalayim"]].map(([v,en])=>`<button class="ob-pick ${obData.israelMode===v?"on":""}" data-mode="${v}"><span class="en">${en}</span></button>`).join("")}</div><div style="font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-weight:600;margin:1rem 0 .3rem;text-align:left">City</div><div style="position:relative;margin-bottom:.5rem"><input class="ob-input" id="obCity" autocomplete="off" placeholder="Type any city\u2026" value="${esc(obData.loc&&obData.loc.name||"")}" style="margin:0"><div id="obCityList" style="position:absolute;left:0;right:0;top:100%;z-index:5;background:var(--surface2);border:1px solid var(--line);border-radius:.5rem;margin-top:.3rem;overflow:hidden;display:none;max-height:230px;overflow-y:auto;box-shadow:0 12px 32px -10px rgba(0,0,0,.5)"></div></div><div style="font-size:.6rem;color:var(--muted);text-align:left;margin-bottom:.4rem">Or pick a common one:</div><div class="ob-grid">${cityBtns.map(([n,lat,lng,tz])=>`<button class="ob-pick ${obData.loc.name===n?"on":""}" data-city="${n}" data-lat="${lat}" data-lng="${lng}" data-tz="${tz}"><span class="en">${n.split(",")[0]}</span></button>`).join("")}</div></div></div>`;}
  html+=`<div class="ob-progress">${[0,1,2,3].map(i=>`<div class="ob-dot ${i<=obStep?"on":""}"></div>`).join("")}</div>`;
  html+=`<div class="ob-actions">${obStep>0?`<button class="ob-btn ghost" id="obBack">Back</button>`:""}<button class="ob-btn primary" id="obNext">${obStep===0?"Begin":obStep===3?"Finish":"Continue"}</button></div>`;
  ob.innerHTML=html;
  if(obStep===1){$("#obEng").addEventListener("input",e=>obData.engName=e.target.value);$("#obHeb").addEventListener("input",e=>obData.hebName=e.target.value);}
  if(obStep===2){const dt=$("#obDate");dt.addEventListener("input",e=>{if(!e.target.value)return;const[y,m,d]=e.target.value.split("-").map(Number);const h=gregToHeb(y,m,d);h.gregYMD=e.target.value;obData.birthday=h;$("#obHebPreview").textContent=gematria(h.day)+" "+monthHe(h.month,h.year)+" "+gematria(h.year%1000);});const sk=$("#obSkip");if(sk)sk.onclick=()=>{obData.birthday=null;obStep=3;renderOb();};}
  if(obStep===3){ob.querySelectorAll("[data-gender]").forEach(b=>b.onclick=()=>{obData.gender=b.dataset.gender;renderOb();});ob.querySelectorAll("[data-nusach]").forEach(b=>b.onclick=()=>{obData.nusach=b.dataset.nusach;renderOb();});ob.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{obData.israelMode=b.dataset.mode;renderOb();});ob.querySelectorAll("[data-city]").forEach(b=>b.onclick=()=>{obData.loc={name:b.dataset.city,lat:+b.dataset.lat,lng:+b.dataset.lng,tz:b.dataset.tz};renderOb();});
    const ci=$("#obCity"),cl=$("#obCityList");let ct=null;
    if(ci){
      const closeList=()=>{cl.style.display="none";cl.innerHTML="";};
      ci.addEventListener("input",e=>{
        const q=e.target.value;if(ct)clearTimeout(ct);
        if(q.trim().length<2){closeList();return;}
        ct=setTimeout(async()=>{
          cl.style.display="block";cl.innerHTML=`<div style="padding:.6rem .8rem;color:var(--muted);font-size:.82rem">Searching\u2026</div>`;
          const res=await geocodeCity(q);
          if(ci.value.trim().length<2){closeList();return;}
          if(!res.length){cl.innerHTML=`<div style="padding:.6rem .8rem;color:var(--muted);font-size:.82rem">No matches \u2014 try a larger nearby city.</div>`;return;}
          cl.innerHTML="";
          res.forEach(r=>{
            const it=el("button","");it.type="button";it.style.cssText="display:block;width:100%;text-align:left;padding:.6rem .8rem;background:transparent;border:0;border-bottom:1px solid var(--line);color:var(--ink);font-size:.9rem;cursor:pointer;font-family:var(--sans)";
            it.innerHTML=`${esc(r.name)}${r.local?' <span style="color:var(--muted);font-size:.7rem">\u00B7 saved</span>':''}`;
            it.onmouseenter=()=>it.style.background="var(--surface3)";it.onmouseleave=()=>it.style.background="transparent";
            it.onclick=()=>{obData.loc={name:r.name,lat:r.lat,lng:r.lng,tz:r.tz};ci.value=r.name;closeList();ob.querySelectorAll("[data-city]").forEach(b=>b.classList.remove("on"));};
            cl.appendChild(it);
          });
        },280);
      });
      ci.addEventListener("blur",()=>setTimeout(closeList,200));
    }
  }
  const nx=$("#obNext");if(nx)nx.onclick=()=>{if(obStep===3){state.onboarded=true;Object.assign(state,{userHebName:obData.hebName,userEngName:obData.engName,birthday:obData.birthday,nusach:obData.nusach,loc:obData.loc,israelMode:obData.israelMode,gender:obData.gender||""});saveState();$("#onboard").classList.remove("show");openApp();}else{obStep++;renderOb();}};
  const bk=$("#obBack");if(bk)bk.onclick=()=>{obStep--;renderOb();};
}

/* ====== ROUTING ====== */
function go(view,arg){
  if(view!=="tehillim")state.tehSub=null;
  if(view!=="kotel"&&_kotelHandler){window.removeEventListener("deviceorientation",_kotelHandler,true);window.removeEventListener("deviceorientationabsolute",_kotelHandler,true);_kotelHandler=null;}
  state.view=view;state.viewArg=arg||null;
  if(view==="service"){const sid=String(arg||"").split("#")[0];state.resumeSvc=sid;}
  saveState();render();
  /* restore scroll for services, else top */
  if(view==="service"){const sid=String(arg||"").split("#")[0];const y=(state.resumeScroll&&state.resumeScroll[sid])||0;requestAnimationFrame(()=>window.scrollTo(0,y));}
  else window.scrollTo(0,0);
  document.querySelectorAll(".sticky-next").forEach(n=>n.remove());
}
let _scrollSaveTimer=null;
function trackScroll(){
  if(state.view!=="service")return;
  const sid=String(state.viewArg||"").split("#")[0];if(!sid)return;
  if(_scrollSaveTimer)clearTimeout(_scrollSaveTimer);
  _scrollSaveTimer=setTimeout(()=>{state.resumeScroll=state.resumeScroll||{};state.resumeScroll[sid]=window.scrollY;state.lastSeen=state.lastSeen||{};state.lastSeen[sid]=Date.now();saveState();},400);
}
function render(){
  const stage=$("#stage");stage.innerHTML="";
  document.querySelectorAll(".nav-tab").forEach(t=>t.classList.toggle("on",t.dataset.view===state.view||(state.view==="service"&&t.dataset.view==="prayers")||(state.view==="tehillim-read"&&t.dataset.view==="tehillim")));
  if(state.view==="home")renderHome(stage);
  else if(state.view==="service")renderService(stage,state.viewArg);
  else if(state.view==="prayers")renderPrayersIndex(stage);
  else if(state.view==="tehillim")(state.tehSub?renderTehillimSub:renderTehillimHub)(stage);
  else if(state.view==="tehillim-read")renderTehillimRead(stage,state.viewArg);
  else if(state.view==="zmanim")renderZmanim(stage);
  else if(state.view==="kotel")renderKotel(stage);
  else renderHome(stage);
  /* gentle view transition */
  stage.classList.remove("view-in");void stage.offsetWidth;stage.classList.add("view-in");
}
function getGreeting(now){const h=now.getHours();if(h<5)return "Good night";if(h<12)return "Good morning";if(h<17)return "Good afternoon";if(h<21)return "Good evening";return "Good night";}

/* ====== HOME ====== */
function svcIcon(icon){const o=(typeof iconOverrideUrl==="function")&&iconOverrideUrl(icon);if(o)return `<image href="${o}" x="0" y="0" width="24" height="24" preserveAspectRatio="xMidYMid meet"/>`;const m={sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',dusk:'<path d="M17 18a5 5 0 0 0-10 0"/><path d="M12 2v7M4.2 10.2l1.4 1.4M18.4 11.6l1.4-1.4M2 18h20M5 22h14"/>',moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',food:'<path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M17 3c-1.5 0-3 1.5-3 4s1.5 4 3 4v10"/>',path:'<path d="M12 2L2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5"/>',star:'<polygon points="12 2 15 8.5 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 9 8.5 12 2"/>',book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'};return m[icon]||'<path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/>';}
function makeSvcCard(svc,opts){
  opts=opts||{};
  const c=el("button","card"+(opts.current?" cur":""));
  c.innerHTML=`<div class="icon-wrap"><svg class="icon" viewBox="0 0 24 24">${svcIcon(svc.icon)}</svg></div><div class="body"><div class="title">${esc(svc.en)}${opts.current?'<span class="nowtag" style="margin-left:.5rem">Now</span>':""}</div><div class="sub">${esc(opts.sub||svc.when)}</div></div><div class="he">${esc(svc.he)}</div><div class="arr">\u2192</div>`;
  c.onclick=()=>go("service",svc.id);
  return c;
}
function renderHome(stage){
  const now=new Date();const tz=tzForLoc(state.loc);
  /* The Jewish day rolls at sunset — after shkia, show the next day's Hebrew date. */
  const app=(typeof appHebDate==="function")?appHebDate(state.loc):{heb:todayHeb(now),afterSunset:false};
  const h=app.heb;
  let dateStr;try{dateStr=new Intl.DateTimeFormat("en-US",{timeZone:tz,weekday:"long",month:"long",day:"numeric"}).format(now);}catch(e){dateStr=now.toDateString();}
  const hebStr=`${gematria(h.day)} ${monthHe(h.month,h.year)}`+(app.afterSunset?` <span style="color:var(--accent);font-size:.82em">· evening (after sunset)</span>`:"");
  const hero=el("div","today-hero");
  hero.innerHTML=`<div class="today-greeting">${getGreeting(now)}${state.userEngName?", "+esc(state.userEngName):""}</div><div class="today-date">${esc(dateStr)}</div><div class="today-heb-date">${hebStr}</div><div class="today-loc"><svg class="icon" viewBox="0 0 24 24" style="width:.9em;height:.9em"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${esc(state.loc.name)}<span class="pill">${esc(NUSACH_LABELS[state.nusach]||state.nusach)}</span></div>`;
  const z=computeZmanim(now,state.loc);
  if(z){const Z=[["alot","Dawn"],["netz","Sunrise"],["shma","Latest Shema"],["tefila","Latest Shacharit"],["chatzot","Midday"],["minchaG","Earliest Mincha"],["minchaK","Mincha Ketana"],["plag","Plag"],["shkia","Sunset"],["tzeit","Nightfall"]];const nm=nowInLocTz(state.loc);const next=Z.map(([k,en])=>({k,en,t:z[k]})).find(x=>x.t!=null&&x.t>nm);if(next){const mins=Math.round(next.t-nm);const hrs=Math.floor(mins/60),rem=mins%60;const inStr=hrs>0?`in ${hrs}h ${rem}m`:`in ${mins}m`;const card=el("button","next-zman");card.innerHTML=`<div class="nz-dot"></div><div class="nz-info"><div class="nz-label">${inStr} \u00B7 ${esc(state.loc.name.split(",")[0])}</div><div class="nz-name">${next.en}</div></div><div class="nz-time">${hmFmt(next.t)}</div>`;card.onclick=()=>go("zmanim");hero.appendChild(card);}}
  stage.appendChild(hero);

  /* --- This week's parasha (location-correct via hebcal) --- */
  if(typeof parashaCard==="function"){const pc=parashaCard();if(pc)stage.appendChild(pc);}

  /* --- NOW: current prayer by time --- */
  const nm=nowInLocTz(state.loc);
  const cur=currentService(z,nm);
  const curSvc=SERVICES.find(s=>s.id===cur.id);
  if(curSvc){const nc=el("button","now-card");nc.innerHTML=`<div style="flex:none;width:2.6rem;height:2.6rem;border-radius:.6rem;background:var(--accent);color:var(--on-accent);display:grid;place-items:center"><svg class="icon" viewBox="0 0 24 24" style="width:1.4em;height:1.4em">${svcIcon(curSvc.icon)}</svg></div><div style="flex:1"><div style="font-size:.6rem;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:.15rem">Pray now</div><div style="font-family:var(--display);font-size:1.25rem;font-weight:600;color:var(--ink);line-height:1.1">${esc(curSvc.en)} <span style="font-family:var(--hebrew);direction:rtl;color:var(--accent);font-size:.85em">${esc(curSvc.he)}</span></div><div style="font-size:.76rem;color:var(--ink2);margin-top:.15rem">${esc(cur.note)}</div></div><div class="arr" style="color:var(--accent);font-size:1.3rem">\u2192</div>`;nc.onclick=()=>go("service",curSvc.id);stage.appendChild(nc);}

  /* --- Continue where you left off --- */
  if(state.resumeSvc&&(state.resumeScroll&&state.resumeScroll[state.resumeSvc]>120)&&(!curSvc||curSvc.id!==state.resumeSvc)){
    const rsvc=svcById(state.resumeSvc);
    if(rsvc){const rc=el("button","");rc.style.cssText="display:flex;align-items:center;gap:.8rem;width:100%;margin-bottom:.45rem;padding:.7rem .9rem;background:var(--surface);border:1px solid var(--line);border-radius:.6rem;cursor:pointer;text-align:left";
      rc.innerHTML=`<div style="flex:none;width:2rem;height:2rem;border-radius:.45rem;background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);display:grid;place-items:center"><svg class="icon" viewBox="0 0 24 24" style="width:1.1em;height:1.1em"><path d="M3 3v5h5M3.05 13A9 9 0 1 0 6 5.3L3 8"/></svg></div><div style="flex:1"><div style="font-size:.58rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-weight:700">Continue</div><div style="font-size:.92rem;font-weight:600;color:var(--ink)">${esc(rsvc.en)} <span style="font-family:var(--hebrew);color:var(--accent)">${esc(rsvc.he)}</span></div></div><div class="arr" style="color:var(--accent)">\u2192</div>`;
      rc.onclick=()=>go("service",rsvc.id);stage.appendChild(rc);}
  }

  /* --- Birthday psalm spotlight --- */
  if(state.birthday){const age=computeHebAge(state.birthday);const psNum=age+1;const dtb=daysToHebBday(state.birthday);const card=el("button","spotlight-card");const sub=dtb===0?'<b style="color:var(--accent)">Hebrew birthday today!</b>':(dtb!=null&&dtb<=7?`Birthday in ${dtb} days \u2014 new psalm soon`:`Age ${age} \u00B7 the psalm of your year`);card.innerHTML=`<div class="spotlight-num">${psNum}</div><div class="spotlight-info"><div class="spotlight-eyebrow">Your psalm</div><div class="spotlight-title">Tehillim ${psNum}</div><div class="spotlight-sub">${sub}</div></div><div class="arr" style="color:var(--accent)">\u2192</div>`;card.onclick=()=>go("tehillim-read",psNum);stage.appendChild(card);}

  /* --- Omer --- */
  const tags=activeTags(now,state.israelMode);
  if(tags.has("omer")){const n=omerCount(now);if(n>0){const weeks=Math.floor(n/7),days=n%7;const card=el("button","spotlight-card");card.innerHTML=`<div class="spotlight-num">${n}</div><div class="spotlight-info"><div class="spotlight-eyebrow">Tonight</div><div class="spotlight-title">Day ${n} of the Omer</div><div class="spotlight-sub">${weeks>0?`${weeks} ${weeks===1?"week":"weeks"}${days>0?" "+days+" "+(days===1?"day":"days"):""}`:`${days} ${days===1?"day":"days"}`}</div></div><div class="arr" style="color:var(--accent)">\u2192</div>`;card.onclick=()=>toast("Sefirat HaOmer \u2014 count tonight after nightfall");stage.appendChild(card);}}

  /* --- Today's specials (compact chips) --- */
  if(typeof todaySpecials==="function"){
    const sp=todaySpecials(now,state.israelMode);
    if(sp.length){
      const sh=el("div","section-head cat cat-occasional");sh.innerHTML=`<span>Today</span>`;stage.appendChild(sh);
      const wrap=el("div","");wrap.style.cssText="display:flex;flex-wrap:wrap;gap:.45rem;margin-bottom:.5rem";
      sp.forEach(s=>{
        const tappable=!!s.svc;
        const c=el(tappable?"button":"div","");
        c.title=s.reason||"";
        c.style.cssText="display:inline-flex;align-items:center;gap:.4rem;padding:.45rem .75rem;border-radius:.55rem;font-size:.82rem;font-weight:600;font-family:var(--sans);border:1px solid "+(tappable?"color-mix(in srgb,var(--cat-occ,#9c6b3f) 40%,transparent)":"var(--line)")+";background:"+(tappable?"color-mix(in srgb,#9c6b3f 12%,transparent)":"var(--surface)")+";color:"+(tappable?"#b8893e":"var(--ink2)")+(tappable?";cursor:pointer":"");
        c.innerHTML=`<span style="flex:none;width:.45rem;height:.45rem;border-radius:50%;background:${tappable?"#b8893e":"var(--muted)"}"></span><span>${esc(s.label)}</span>${tappable?'<span style="opacity:.7">\u2192</span>':''}`;
        if(tappable)c.onclick=()=>{haptic();go("service",s.svc);};
        wrap.appendChild(c);
      });
      stage.appendChild(wrap);
    }
  }

  /* --- Gentle daily thought (opt-in) --- */
  if(state.dailyThought&&typeof thoughtForToday==="function"){
    const t=thoughtForToday();
    const card=el("div","");card.style.cssText="margin:.3rem 0 .5rem;padding:.9rem 1rem;background:color-mix(in srgb,var(--accent) 6%,transparent);border:1px solid color-mix(in srgb,var(--accent) 18%,transparent);border-radius:.65rem";
    card.innerHTML=`<div style="font-size:.58rem;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:.4rem">A thought for today</div><div style="font-family:var(--hebrew);direction:rtl;text-align:right;font-size:calc(1.1rem * var(--hscale,1));line-height:1.9;color:var(--ink);margin-bottom:.3rem">${esc(t.he)}</div><div style="font-size:calc(.85rem * var(--escale,1));color:var(--ink2);line-height:1.5">${esc(t.en)}</div><div style="font-size:.72rem;color:var(--muted);margin-top:.35rem;font-style:italic">${esc(t.src)}</div>`;
    stage.appendChild(card);
  }

  /* --- Four quick-access blocks (2x2 grid) --- */
  const quick=[
    {label:"Blessings for Food",he:"\u05D1\u05B4\u05BC\u05E8\u05B0\u05DB\u05D5\u05B9\u05EA \u05D4\u05B7\u05E0\u05B0\u05D4\u05B6\u05E0\u05B4\u05D9\u05DF",sub:"Before eating & drinking",icon:"food",go:()=>go("service","brachot")},
    {label:"Grace After Meals",he:"\u05D1\u05B4\u05BC\u05E8\u05B0\u05DB\u05B7\u05BC\u05EA \u05D4\u05B7\u05DE\u05B8\u05BC\u05D6\u05D5\u05B9\u05DF",sub:"Birkat HaMazon",icon:"food",go:()=>go("service","birkat")},
    {label:"Psalms",he:"\u05EA\u05B0\u05BC\u05D4\u05B4\u05DC\u05B4\u05BC\u05D9\u05DD",sub:"Today, books, occasions",icon:"book",go:()=>go("tehillim")},
    {label:"While Traveling",he:"\u05EA\u05B0\u05BC\u05E4\u05B4\u05DC\u05B7\u05BC\u05EA \u05D4\u05B7\u05D3\u05B6\u05BC\u05E8\u05B6\u05DA",sub:"Tefilat HaDerech",icon:"path",go:()=>go("service","travel")}
  ];
  const qWrap=el("div","");qWrap.style.cssText="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin:1.2rem 0 .3rem";
  quick.forEach(q=>{
    const b=el("button","");b.style.cssText="display:flex;flex-direction:column;align-items:flex-start;gap:.55rem;padding:1rem;background:var(--surface);border:1px solid var(--line);border-radius:.7rem;cursor:pointer;text-align:left;min-height:8.5rem";
    b.innerHTML=`<div style="flex:none;width:2.4rem;height:2.4rem;border-radius:.55rem;background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent);display:grid;place-items:center"><svg class="icon" viewBox="0 0 24 24" style="width:1.3em;height:1.3em">${svcIcon(q.icon)}</svg></div><div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end"><div style="font-family:var(--hebrew);direction:rtl;color:var(--accent);font-size:.95rem;margin-bottom:.2rem">${esc(q.he)}</div><div style="font-family:var(--display);font-size:1.02rem;font-weight:600;color:var(--ink);line-height:1.15">${esc(q.label)}</div><div style="font-size:.7rem;color:var(--ink2);margin-top:.12rem">${esc(q.sub)}</div></div>`;
    b.onclick=q.go;qWrap.appendChild(b);
  });
  stage.appendChild(qWrap);

  if(window.SCANS&&window.SCANS.length){
    const totalPg=window.SCANS.reduce((a,d)=>a+d.pages.length,0);
    const sc=el("button","");sc.style.cssText="display:flex;align-items:center;gap:.8rem;width:100%;margin:1.1rem 0 .3rem;padding:1rem 1.1rem;background:color-mix(in srgb,var(--accent) 9%,transparent);border:1px solid color-mix(in srgb,var(--accent) 28%,transparent);border-radius:.7rem;cursor:pointer;text-align:left";
    sc.innerHTML=`<div style="flex:none;width:2.6rem;height:2.6rem;border-radius:.6rem;background:var(--accent);color:var(--on-accent);display:grid;place-items:center"><svg class="icon" viewBox="0 0 24 24" style="width:1.4em;height:1.4em"><path d="M4 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z"/><path d="M18 6h2a0 0 0 0 1 0 0v14a2 2 0 0 1-2 2"/><path d="M8 8h6M8 12h6"/></svg></div><div style="flex:1"><div style="font-size:.6rem;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:.15rem">Your scanned siddur</div><div style="font-family:var(--display);font-size:1.18rem;font-weight:600;color:var(--ink);line-height:1.1">Original Pages</div><div style="font-size:.76rem;color:var(--ink2);margin-top:.18rem">All ${totalPg} uploaded pages \u00B7 ${window.SCANS.length} sections</div></div><div class="arr" style="color:var(--accent);font-size:1.3rem">\u2192</div>`;
    sc.onclick=()=>openScansIndex();stage.appendChild(sc);
  }

  if(state.favorites.length){const fh=el("div","section-head");fh.innerHTML=`<span>Favorites</span>`;stage.appendChild(fh);const list=el("div","card-list");state.favorites.slice(0,4).forEach(k=>{const[s,p]=k.split(".");const pr=(PRAYERS[s]||[]).find(x=>x.id===p);if(!pr)return;const svc=SERVICES.find(x=>x.id===s);const c=el("button","card");c.innerHTML=`<div class="icon-wrap"><svg class="icon" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15 8.5 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 9 8.5 12 2"/></svg></div><div class="body"><div class="title">${esc(pr.en)}</div><div class="sub">${esc(svc?svc.en:"")}</div></div><div class="he">${esc(pr.he)}</div><div class="arr">\u2192</div>`;c.onclick=()=>go("service",s+"#"+p);list.appendChild(c);});stage.appendChild(list);}
}

function renderPrayersIndex(stage){
  const h=el("div","svc-head");h.innerHTML=`<span class="en">All Prayers</span><span class="he">\u05DB\u05B8\u05BC\u05DC \u05D4\u05B7\u05EA\u05B0\u05BC\u05E4\u05B4\u05DC\u05D5\u05B9\u05EA</span>`;stage.appendChild(h);
  const dh=el("div","section-head cat cat-daily");dh.innerHTML="<span>Daily</span>";stage.appendChild(dh);
  const list=el("div","card-list");SERVICES.forEach(s=>list.appendChild(makeSvcCard(s)));stage.appendChild(list);

  if(typeof OCC_SERVICES!=="undefined"&&OCC_SERVICES.length){
    state._discOpen=state._discOpen||{};
    const groups=[
      {key:"holiday",label:"Holidays",he:"\u05D7\u05B7\u05D2\u05B4\u05D9\u05DD \u05D5\u05BC\u05DE\u05D5\u05B9\u05E2\u05B2\u05D3\u05B4\u05D9\u05DD",sub:"Festival & seasonal prayers",cat:"cat-special",icon:"sun"},
      {key:"occasion",label:"Occasions",he:"\u05DC\u05B0\u05E2\u05B5\u05EA \u05E6\u05B8\u05BC\u05E8\u05B0\u05DB\u05B8\u05BC\u05D4",sub:"Life moments, memorial & special blessings",cat:"cat-occasional",icon:"star"}
    ];
    const sec=el("div","");sec.style.marginTop="1.4rem";stage.appendChild(sec);
    groups.forEach(g=>{
      const items=OCC_SERVICES.filter(s=>(s.cat||"occasion")===g.key&&!s.noList);
      if(!items.length)return;
      const open=!!state._discOpen[g.key];
      const disc=el("div","disc "+g.cat+(open?" open":""));
      const head=el("button","disc-head");
      head.innerHTML=`<span class="ds-ic"><svg class="icon" viewBox="0 0 24 24" style="width:1.2em;height:1.2em">${svcIcon(g.icon)}</svg></span><span class="ds-tt"><b>${esc(g.label)}</b><small>${esc(g.sub)} \u00B7 ${items.length}</small></span><span class="ds-he">${esc(g.he)}</span><svg class="icon ds-chev" viewBox="0 0 24 24" style="width:1.1em;height:1.1em"><path d="M6 9l6 6 6-6"/></svg>`;
      head.onclick=()=>{state._discOpen[g.key]=!state._discOpen[g.key];disc.classList.toggle("open",state._discOpen[g.key]);if(typeof haptic==="function")haptic(8);};
      const body=el("div","disc-body");const inner=el("div","");const dl=el("div","disc-list");
      items.forEach(s=>{
        const it=el("button","disc-item");
        it.innerHTML=`<span class="di-tt">${esc(s.en)}</span><span class="di-he">${esc(s.he)}</span><svg class="icon di-arr" viewBox="0 0 24 24" style="width:1em;height:1em"><path d="M9 6l6 6-6 6"/></svg>`;
        it.onclick=()=>{if(typeof haptic==="function")haptic();go("service",s.id);};
        dl.appendChild(it);
      });
      inner.appendChild(dl);body.appendChild(inner);disc.appendChild(head);disc.appendChild(body);sec.appendChild(disc);
    });
  }
}

/* ====== SERVICE (accordion + nusach switch) ====== */
function renderService(stage,arg){
  const[svcId,jumpId]=String(arg||"").split("#");
  const svc=svcById(svcId);
  if(!svc){renderHome(stage);return;}
  const prayers=orderedPrayers(svcId);

  const back=el("button","");back.style.cssText="display:inline-flex;align-items:center;gap:.4rem;color:var(--muted);font-size:.85rem;padding:.4rem .6rem .4rem .4rem;margin-bottom:.5rem;border-radius:.45rem;cursor:pointer;background:transparent;border:0";back.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:.9em;height:.9em"><path d="M15 18l-6-6 6-6"/></svg> Back`;back.onclick=()=>go("home");stage.appendChild(back);

  const head=el("div","svc-head");head.innerHTML=`<span class="en">${esc(svc.en)}</span><span class="he">${esc(svc.he)}</span>`;stage.appendChild(head);

  /* nusach + tools bar */
  const bar=el("div","nusach-bar");
  const ns=el("label","mini-select");ns.innerHTML=`<svg class="icon ic" viewBox="0 0 24 24" style="width:1em;height:1em"><path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14"/><path d="M8 7h8M8 11h6"/></svg><span>Nusach: <b style="color:var(--ink)">${esc(NUSACH_LABELS[state.nusach])}</b></span><svg class="icon" viewBox="0 0 24 24" style="width:.9em;height:.9em"><path d="M6 9l6 6 6-6"/></svg><select id="svcNusach">${Object.keys(NUSACH_LABELS).map(k=>`<option value="${k}"${state.nusach===k?" selected":""}>${NUSACH_LABELS[k]}</option>`).join("")}</select>`;
  bar.appendChild(ns);
  /* Per-prayer quick-jump — go straight to any prayer in this service */
  if(prayers.length>1){
    const bySec={};const secOrder=[];
    prayers.forEach(p=>{const s=p.section||"Main";if(!bySec[s]){bySec[s]=[];secOrder.push(s);}bySec[s].push(p);});
    const opts=secOrder.map(s=>`<optgroup label="${esc(s)}">${bySec[s].map(p=>`<option value="${esc(p.id)}">${esc(p.en)}</option>`).join("")}</optgroup>`).join("");
    const jmp=el("label","mini-select");
    jmp.innerHTML=`<svg class="icon ic" viewBox="0 0 24 24" style="width:1em;height:1em"><path d="M12 5v14M5 12l7 7 7-7"/></svg><span>Jump to…</span><svg class="icon" viewBox="0 0 24 24" style="width:.9em;height:.9em"><path d="M6 9l6 6 6-6"/></svg><select id="svcJump"><option value="">Jump to a prayer…</option>${opts}</select>`;
    bar.appendChild(jmp);
  }
  const exp=el("button","mini-select");exp.innerHTML=`<svg class="icon ic" viewBox="0 0 24 24" style="width:1em;height:1em"><path d="M4 6h16M4 12h16M4 18h16"/></svg><span>Expand all</span>`;bar.appendChild(exp);
  const edt=el("button","mini-select"+(state.editMode?" on-edit":""));edt.innerHTML=`<svg class="icon ic" viewBox="0 0 24 24" style="width:1em;height:1em"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg><span>${state.editMode?"Done editing":"Edit"}</span>`;if(state.editMode){edt.style.cssText="border-color:var(--accent);color:var(--accent)";}edt.onclick=()=>{state.editMode=!state.editMode;saveState();render();};bar.appendChild(edt);
  /* Quick "Skip Tachanun" chip — only for daily services where Tachanun would otherwise be said today */
  if(["shacharit","mincha"].includes(svcId)){
    const plan=(typeof dayPlan==="function")?dayPlan(new Date(),state.israelMode):null;
    const tachWouldShow = plan && !state.hideTachanun && (function(){const d=dayPlan(new Date(),state.israelMode);return d.showTachanun||state.hideTachanun;})();
    // show the chip whenever it's a potential-Tachanun day OR it's currently toggled off
    const baseNoTach=(()=>{const sv=Object.assign({},state);const was=state.hideTachanun;state.hideTachanun=false;const p=dayPlan(new Date(),state.israelMode);state.hideTachanun=was;return !p.showTachanun;})();
    if(!baseNoTach){
      const tch=el("button","mini-select"+(state.hideTachanun?" on-edit":""));
      tch.innerHTML=`<svg class="icon ic" viewBox="0 0 24 24" style="width:1em;height:1em"><path d="M20 6L9 17l-5-5"/></svg><span>${state.hideTachanun?"Tachanun skipped":"Skip Tachanun"}</span>`;
      if(state.hideTachanun)tch.style.cssText="border-color:var(--accent);color:var(--accent)";
      tch.onclick=()=>{state.hideTachanun=!state.hideTachanun;saveState();haptic();render();toast(state.hideTachanun?"Tachanun removed":"Tachanun restored");};
      bar.appendChild(tch);
    }
  }
  if(state.editMode){
    const ab=el("button","mini-select"+((typeof audioTracksForSvc==="function"&&audioTracksForSvc(svcId).length)?" on-edit":""));
    ab.innerHTML=`<svg class="icon ic" viewBox="0 0 24 24" style="width:1em;height:1em"><path d="M3 10v4h4l5 5V5L7 10H3z"/><path d="M16 8a5 5 0 0 1 0 8"/></svg><span>Daven audio</span>`;
    if(typeof audioTracksForSvc==="function"&&audioTracksForSvc(svcId).length)ab.style.cssText="border-color:var(--accent);color:var(--accent)";
    ab.onclick=()=>{if(typeof openAudioAuthor==="function")openAudioAuthor(svcId);};
    bar.appendChild(ab);
  }
  stage.appendChild(bar);

  const dwm=el("button","");dwm.style.cssText="display:flex;align-items:center;gap:.7rem;padding:.85rem 1.1rem;background:color-mix(in srgb,var(--accent) 8%,transparent);border:1px solid color-mix(in srgb,var(--accent) 25%,transparent);border-radius:.6rem;color:var(--accent);cursor:pointer;font-family:var(--sans);font-weight:600;font-size:.88rem;margin-bottom:1rem;width:100%;text-align:left";dwm.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:1.2em;height:1.2em;flex:none"><polygon points="5 3 19 12 5 21 5 3"/></svg><div style="flex:1"><div style="font-size:.95rem">Daven With Me</div><div style="font-size:.72rem;color:var(--ink2);font-weight:500;margin-top:.1rem">Guided, block-by-block, with focus</div></div><svg class="icon" viewBox="0 0 24 24" style="width:1em"><path d="M9 6l6 6-6 6"/></svg>`;dwm.onclick=()=>startDaven(svcId);stage.appendChild(dwm);

  /* group prayers into sections */
  const sections=[];prayers.forEach(p=>{const s=p.section||"Main";if(!sections.find(x=>x.name===s))sections.push({name:s,items:[]});sections.find(x=>x.name===s).items.push(p);});
  const acc=el("div","accordion");
  sections.forEach((sec,si)=>{
    const open=si===0;
    const wrap=el("div","acc-sec"+(open?" open":""));
    const head=el("button","acc-head");head.innerHTML=`<span class="acc-eye">${si+1}</span><span class="acc-tt">${esc(sec.name)}</span><span class="acc-he"></span><svg class="icon acc-chev" viewBox="0 0 24 24" style="width:1.1em;height:1.1em"><path d="M9 6l6 6-6 6"/></svg>`;
    const body=el("div","acc-body");
    sec.items.forEach(pr=>renderPrayerInline(pr,svcId,body));
    head.onclick=()=>wrap.classList.toggle("open");
    wrap.appendChild(head);wrap.appendChild(body);acc.appendChild(wrap);
  });
  stage.appendChild(acc);

  if(state.editMode){
    const addP=el("button","");addP.style.cssText="display:flex;align-items:center;justify-content:center;gap:.5rem;width:100%;margin-top:1rem;padding:.85rem;background:transparent;border:1px dashed color-mix(in srgb,var(--accent) 45%,transparent);border-radius:.6rem;color:var(--accent);font-family:var(--sans);font-weight:600;font-size:.9rem;cursor:pointer";
    addP.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:1.1em;height:1.1em"><path d="M12 5v14M5 12h14"/></svg> Add a new prayer`;
    addP.onclick=()=>addCustomPrayer(svcId);
    stage.appendChild(addP);
  }

  $("#svcNusach").addEventListener("change",e=>{state.nusach=e.target.value;saveState();render();});
  const jsel=$("#svcJump");
  if(jsel)jsel.addEventListener("change",e=>{const id=e.target.value;if(id){const t=document.getElementById("p-"+id);if(t){const sec=t.closest(".acc-sec");if(sec)sec.classList.add("open");if(t.scrollIntoView)t.scrollIntoView({behavior:"smooth",block:"start"});}}e.target.selectedIndex=0;});
  exp.onclick=()=>{const secs=acc.querySelectorAll(".acc-sec");const anyClosed=[...secs].some(s=>!s.classList.contains("open"));secs.forEach(s=>s.classList.toggle("open",anyClosed));exp.querySelector("span").textContent=anyClosed?"Collapse all":"Expand all";};

  if(jumpId)setTimeout(()=>{const t=document.getElementById("p-"+jumpId);if(t){const sec=t.closest(".acc-sec");if(sec)sec.classList.add("open");if(t.scrollIntoView)t.scrollIntoView({behavior:"smooth",block:"start"});}},120);
  if(prayers.length)trackRecent(svcId,prayers[0].id);
}

function renderPrayerInline(pr,svcId,wrap){
  const row=el("div");row.id="p-"+pr.id;row.style.cssText="display:flex;align-items:center;gap:.5rem;margin:1.1rem 0 .4rem";
  const title=el("h3");title.style.cssText="flex:1;font-family:var(--display);font-size:1.1rem;font-weight:600;color:var(--ink);letter-spacing:-.01em;margin:0";title.innerHTML=`${esc(pr.en)} <span style="font-family:var(--hebrew);direction:rtl;color:var(--accent);font-size:.95em;margin-left:.4em">${esc(pr.he)}</span>`;
  const star=el("button","fav-star"+(isFav(svcId,pr.id)?" on":""));star.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:1.1em;height:1.1em" fill="${isFav(svcId,pr.id)?"currentColor":"none"}"><polygon points="12 2 15 8.5 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 9 8.5 12 2"/></svg>`;star.onclick=e=>{e.stopPropagation();toggleFav(svcId,pr.id);star.classList.toggle("on");star.querySelector("svg").setAttribute("fill",isFav(svcId,pr.id)?"currentColor":"none");};
  row.appendChild(title);
  if(state.editMode){const pen=el("button","fav-star");pen.style.color="var(--accent)";pen.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:1.05em;height:1.05em"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`;pen.title="Edit this prayer";pen.onclick=e=>{e.stopPropagation();openPrayerEditor(svcId,pr.id);};row.appendChild(pen);}
  row.appendChild(star);wrap.appendChild(row);
  /* gather active inline insertion rules for this prayer */
  const rules=(typeof activeRulesFor==="function")?activeRulesFor(svcId,pr.id,new Date(),state.israelMode):[];
  const startRules=rules.filter(r=>r.anchor==="start");
  const endRules=rules.filter(r=>r.anchor!=="start"&&r.anchor!=="replace");
  const replaceRules=rules.filter(r=>r.anchor==="replace");
  const renderInsert=(r)=>{
    const ins=el("div","insert-inline");
    ins.style.cssText="margin:.35rem 0;padding:.55rem .8rem;background:color-mix(in srgb,var(--insert) 9%,transparent);border-left:3px solid var(--insert);border-radius:.4rem";
    let h="";
    h+=`<div style="font-size:.56rem;letter-spacing:.16em;text-transform:uppercase;color:var(--insert);font-weight:700;margin-bottom:.25rem">Add today \u00B7 ${esc(r.label||"")}</div>`;
    if(r.text&&r.text.he)h+=`<div style="font-family:var(--hebrew);direction:rtl;font-size:calc(1.15rem * var(--scale) * var(--hscale,1));line-height:1.95;color:var(--ink)">${esc(r.text.he)}</div>`;
    if(state.translit&&r.text&&r.text.tr)h+=`<div style="font-style:italic;color:var(--muted);font-size:calc(.82rem * var(--scale) * var(--escale,1))">${esc(r.text.tr)}</div>`;
    if(!state.hebrewOnly&&r.text&&r.text.en)h+=`<div style="color:var(--ink2);font-size:calc(.86rem * var(--scale) * var(--escale,1));margin-top:.15rem">${esc(r.text.en)}</div>`;
    ins.innerHTML=h;return ins;
  };
  if(replaceRules.length){
    /* replace: show the rule text instead of the prayer's own blocks */
    replaceRules.forEach(r=>wrap.appendChild(renderInsert(r)));
  } else {
    startRules.forEach(r=>wrap.appendChild(renderInsert(r)));
    normalizeBlocks(pr.blocks).forEach(b=>renderBlockTo(b,wrap));
    endRules.forEach(r=>wrap.appendChild(renderInsert(r)));
  }
  injectPersonal(pr,svcId,wrap);
}

/* ====== SMART INSERTION ENGINE ======
   Determines which seasonal/calendar inserts apply right now, based on the
   Hebrew date. Month numbering: 1=Nissan ... 7=Tishrei ... 12/13=Adar.
   All texts are standard public-domain liturgy. */
function smartInserts(d,mode){
  d=d||new Date();const h=todayHeb(d);const ins={};
  const inIsrael=(mode==="israel"||mode==="yerushalayim");
  /* --- Rain/dew season in the 2nd blessing of the Amidah (Gevurot) --- */
  /* Mashiv haruach: from Shemini Atzeret (22 Tishrei) through the first day of Pesach (15 Nissan). */
  const afterSheminiAtzeret = (h.month===7&&h.day>=22)||(h.month>=8&&h.month<=12)||(h.month===13)||(h.month===1&&h.day<=15);
  if(afterSheminiAtzeret){
    ins.gevurot={he:"מַשִּׁיב הָרוּחַ וּמוֹרִיד הַגֶּשֶׁם",tr:"Mashiv haruach umorid hageshem",en:"He causes the wind to blow and the rain to fall",label:"Winter \u00B7 rain"};
  } else {
    ins.gevurot={he:"מוֹרִיד הַטָּל",tr:"Morid hatal",en:"He causes the dew to descend",label:"Summer \u00B7 dew",note:"Sephardic & Israeli custom; many Ashkenazi communities omit this in summer."};
  }
  /* --- Tal u'matar in the 9th blessing (Birkat HaShanim) --- */
  /* In Israel from 7 Cheshvan; in the diaspora from Dec 4/5 — until Pesach. */
  let rainReq=false;
  if(inIsrael){ rainReq = (h.month===8&&h.day>=7)||(h.month>=9&&h.month<=12)||(h.month===13)||(h.month===1&&h.day<=15); }
  else { const m=d.getMonth()+1,day=d.getDate(); const afterDec=(m===12&&day>=5)||(m===1)||(m===2)||(m===3)||(m===4&&day<=15); rainReq=afterDec; }
  ins.shanim = rainReq
    ? {he:"וְתֵן טַל וּמָטָר לִבְרָכָה",tr:"Veten tal umatar livracha",en:"Grant dew and rain for a blessing",label:"Winter \u00B7 ask for rain"}
    : {he:"וְתֵן בְּרָכָה",tr:"Veten bracha",en:"Grant blessing",label:"Summer"};
  /* --- Ya'aleh V'Yavo: Rosh Chodesh & festivals (in Retzei / 17th blessing) --- */
  const isRC=(h.day===1||h.day===30);
  const isPesach=(h.month===1&&h.day>=15&&h.day<=(inIsrael?21:22));
  const isSukkot=(h.month===7&&h.day>=15&&h.day<=(inIsrael?21:22));
  const isSheminiAtz=(h.month===7&&(h.day===22||(!inIsrael&&h.day===23)));
  const isShavuot=(h.month===3&&h.day>=6&&h.day<=(inIsrael?6:7));
  const isRH=(h.month===7&&(h.day===1||h.day===2));
  const yvOccasion = isRC||isPesach||isSukkot||isSheminiAtz||isShavuot||isRH;
  if(yvOccasion){
    let occ="Rosh Chodesh";if(isPesach)occ="Pesach";else if(isSukkot)occ="Sukkot";else if(isSheminiAtz)occ="Shemini Atzeret";else if(isShavuot)occ="Shavuot";else if(isRH)occ="Rosh HaShanah";
    ins.yaaleh={he:"יַעֲלֶה וְיָבֹא וְיַגִּיעַ, וְיֵרָאֶה וְיֵרָצֶה וְיִשָּׁמַע, וְיִפָּקֵד וְיִזָּכֵר זִכְרוֹנֵנוּ וּפִקְדוֹנֵנוּ... בְּיוֹם "+ (isRC?"רֹאשׁ הַחֹדֶשׁ הַזֶּה":"חַג") +". זָכְרֵנוּ יְיָ אֱלֹהֵינוּ בּוֹ לְטוֹבָה, וּפָקְדֵנוּ בוֹ לִבְרָכָה, וְהוֹשִׁיעֵנוּ בוֹ לְחַיִּים.",tr:"Ya'aleh veyavo veyagia...",en:"May our remembrance rise and come before You... on this day of "+occ+". Remember us, Lord our God, for good; consider us for blessing; save us for life.",label:occ};
  }
  /* --- Al HaNissim: Chanukah & Purim (in Modim / thanksgiving) --- */
  const isChanukah=((h.month===9&&h.day>=25)||(h.month===10&&h.day<=(lastDayH(9,h.year)===30?2:3)));
  const isPurim=(h.month===(lastMonthH(h.year)===13?13:12)&&(h.day===14||h.day===15));
  if(isChanukah){
    ins.modim={he:"עַל הַנִּסִּים וְעַל הַפֻּרְקָן וְעַל הַגְּבוּרוֹת וְעַל הַתְּשׁוּעוֹת... בִּימֵי מַתִּתְיָהוּ בֶּן יוֹחָנָן כֹּהֵן גָּדוֹל חַשְׁמוֹנַאי וּבָנָיו...",tr:"Al hanisim...",en:"For the miracles, the redemption, the mighty deeds and the victories... in the days of Mattityahu son of Yochanan the High Priest, the Hasmonean, and his sons...",label:"Chanukah"};
  } else if(isPurim){
    ins.modim={he:"עַל הַנִּסִּים וְעַל הַפֻּרְקָן... בִּימֵי מָרְדְּכַי וְאֶסְתֵּר בְּשׁוּשַׁן הַבִּירָה...",tr:"Al hanisim...",en:"For the miracles and the redemption... in the days of Mordechai and Esther in Shushan the capital...",label:"Purim"};
  }
  return ins;
}


/* ====== HAPTICS ====== */
function haptic(pattern){
  try{ if(state.haptics&&navigator.vibrate)navigator.vibrate(pattern||12); }catch(e){}
}

/* ====== DAILY THOUGHT (public-domain wisdom, rotates by day) ====== */
const DAILY_THOUGHTS=[
  {he:"אֵיזֶהוּ עָשִׁיר? הַשָּמֵחַ בְחֶלְקוֹ",en:"Who is rich? One who rejoices in his portion.",src:"Pirkei Avot 4:1"},
  {he:"יְהִי כְבוֹד חֲבֵרְךָ חָבִיב עָלֶיךָ כְשֶּלְךָ",en:"Let the honor of your friend be as dear to you as your own.",src:"Pirkei Avot 2:10"},
  {he:"עַל שְׁלֹשָׁה דְבָרִים הָעוֹלָם עוֹמֵד: עַל הַתּוֹרָה, וְעַל הָעֲבוֹדָה, וְעַל גְמִילוּת חֲסָדִים",en:"The world stands on three things: Torah, the service of God, and acts of kindness.",src:"Pirkei Avot 1:2"},
  {he:"אִם אֵין אֲנִי לִי, מִי לִי? וּכְשֶאֲנִי לְעַצְמִי, מָה אֲנִי?",en:"If I am not for myself, who is for me? And if I am only for myself, what am I?",src:"Pirkei Avot 1:14"},
  {he:"עֲשֵׂה לְךָ רַב וּקְנֵה לְךָ חָבֵר",en:"Make for yourself a teacher, and acquire for yourself a friend.",src:"Pirkei Avot 1:6"},
  {he:"הַיּוֹם קָצֵר וְהַמְלָאכָה מְרֻבָּה",en:"The day is short and the work is great.",src:"Pirkei Avot 2:15"},
  {he:"אֵיזֶהוּ גִבּוֹר? הַכּוֹבֵשׁ אֶת יִצְרוֹ",en:"Who is mighty? One who conquers his own impulse.",src:"Pirkei Avot 4:1"},
  {he:"טוֹב יְהוָה לַכּוֹל, וְרַחֲמָיו עַל כָּל מַעֲשָׂיו",en:"The Lord is good to all, and His mercy is upon all His works.",src:"Psalms 145:9"},
  {he:"קָרוֹב יְהוָה לְכָל קֹרְאָיו",en:"The Lord is near to all who call upon Him.",src:"Psalms 145:18"},
  {he:"אֵיזֶהוּ חָכָם? הַלּוֹמֵד מִכָּל אָדָם",en:"Who is wise? One who learns from every person.",src:"Pirkei Avot 4:1"}
];
function thoughtForToday(){
  const epoch=Math.floor(Date.now()/86400000);
  return DAILY_THOUGHTS[epoch%DAILY_THOUGHTS.length];
}

/* ====== TRAVEL DETECTION (while app is open) ====== */
let _travelWatch=null,_travelPrompted=false;
function startTravelSense(){
  if(!state.travelSense||!navigator.geolocation||_travelWatch!=null)return;
  try{
    _travelWatch=navigator.geolocation.watchPosition(pos=>{
      const spd=pos.coords.speed; /* m/s, may be null */
      if(spd!=null&&spd>8&&!_travelPrompted){ /* ~29 km/h */
        _travelPrompted=true;showTravelPrompt();
      }
    },()=>{},{enableHighAccuracy:false,maximumAge:30000,timeout:27000});
  }catch(e){}
}
function stopTravelSense(){ if(_travelWatch!=null&&navigator.geolocation){navigator.geolocation.clearWatch(_travelWatch);_travelWatch=null;} }
function showTravelPrompt(){
  if($("#travelPrompt"))return;
  const t=el("div","");t.id="travelPrompt";
  t.style.cssText="position:fixed;left:1rem;right:1rem;bottom:5rem;z-index:70;background:var(--surface);border:1px solid var(--accent);border-radius:.7rem;padding:.9rem 1rem;box-shadow:0 12px 40px -12px rgba(0,0,0,.5);display:flex;align-items:center;gap:.8rem;animation:sheetUp .4s var(--ease-out)";
  t.innerHTML=`<div style="flex:none;width:2.4rem;height:2.4rem;border-radius:.55rem;background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent);display:grid;place-items:center"><svg class="icon" viewBox="0 0 24 24" style="width:1.3em;height:1.3em"><path d="M12 2L2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5"/></svg></div><div style="flex:1"><div style="font-weight:600;color:var(--ink);font-size:.92rem">On the road?</div><div style="font-size:.78rem;color:var(--ink2)">Say Tefilat HaDerech for safe travels.</div></div><button id="tpGo" style="flex:none;background:var(--accent);color:var(--on-accent);border:0;border-radius:.45rem;padding:.45rem .8rem;font-weight:700;font-size:.8rem;cursor:pointer">Open</button><button id="tpX" style="flex:none;background:transparent;border:0;color:var(--muted);cursor:pointer;font-size:1.2rem;line-height:1">\u00D7</button>`;
  document.body.appendChild(t);haptic([10,40,10]);
  $("#tpGo").onclick=()=>{t.remove();go("service","travel");};
  $("#tpX").onclick=()=>{t.remove();};
  setTimeout(()=>{if($("#travelPrompt"))$("#travelPrompt").remove();},15000);
}

/* ====== PRAYER-TIME REMINDERS (best-effort, while app is open/recently backgrounded) ====== */
function notifySupported(){return ("Notification" in window);}
async function enableNotifications(){
  if(!notifySupported()){toast("Notifications aren't supported on this device");return false;}
  try{ const p=await Notification.requestPermission(); if(p==="granted"){scheduleReminders();return true;} else {toast("Permission denied \u2014 enable in browser settings");return false;} }catch(e){return false;}
}
let _reminderTimers=[];
function clearReminders(){_reminderTimers.forEach(t=>clearTimeout(t));_reminderTimers=[];}
function scheduleReminders(){
  clearReminders();
  if(!state.notifyPrayers||!notifySupported()||Notification.permission!=="granted")return;
  const z=computeZmanim(new Date(),state.loc);if(!z)return;
  const now=new Date();const nowMin=now.getHours()*60+now.getMinutes();
  const lead=state.notifyMinutes||15;
  const targets=[];
  if(state.notifyWhich.shacharit&&z.netz!=null)targets.push(["Shacharit","\u05E9\u05B7\u05D7\u05B2\u05E8\u05B4\u05D9\u05EA",z.shma]);
  if(state.notifyWhich.mincha&&z.minchaG!=null)targets.push(["Mincha","\u05DE\u05B4\u05E0\u05B0\u05D7\u05B8\u05D4",z.minchaG]);
  if(state.notifyWhich.maariv&&z.tzeit!=null)targets.push(["Maariv","\u05DE\u05B7\u05E2\u05B2\u05E8\u05B4\u05D9\u05D1",z.tzeit]);
  targets.forEach(([en,he,mins])=>{
    const fireAt=mins-lead;const delta=fireAt-nowMin;
    if(delta>0&&delta<24*60){
      const tid=setTimeout(()=>{
        try{ new Notification("Time for "+en,{body:en+" ("+he+") begins soon. Tap to open your siddur.",tag:"prayer-"+en}); }catch(e){}
        haptic([15,60,15]);
      },delta*60*1000);
      _reminderTimers.push(tid);
    }
  });
}


/* ====== INSERTION RULES ENGINE ======
   A rule splices text into a specific prayer block on matching days.
   Rule shape:
   { id, label, enabled, nusach:["ashkenaz",...]|null(all), service:"shacharit"|null(all),
     prayerId:"gevurot", anchor:"start"|"end"|"replace",
     cond:{type, ...}, text:{he,tr,en} }
   Conditions (cond.type):
     "rosh_chodesh"            — 1st or 30th of any month
     "festival" {fest:"pesach"|"sukkot"|"shavuot"|"rosh_hashana"|"shemini_atzeret"|"chol_hamoed"}
     "chanukah" / "purim"
     "fast"                    — common fast days
     "rain_season"             — tal u'matar window (Israel/diaspora aware)
     "winter"                  — Mashiv HaRuach window (Shemini Atzeret→Pesach)
     "summer"                  — the complement of winter
     "date_range" {fromM,fromD,toM,toD}  (Hebrew month/day)
     "weekday" / "shabbat"
   Plus optional cond.region: "israel"|"diaspora"|null(any). */

function hebFestival(h,inIsrael){
  // returns a festival key for the Hebrew date, or null
  if(h.month===7&&(h.day===1||h.day===2))return "rosh_hashana";
  if(h.month===7&&h.day>=15&&h.day<=21)return (h.day===15||(!inIsrael&&h.day===16))?"sukkot":"chol_hamoed";
  if(h.month===7&&(h.day===22||(!inIsrael&&h.day===23)))return "shemini_atzeret";
  if(h.month===1&&h.day>=15&&h.day<=21){
    const last=inIsrael?21:22;
    if(h.day<=last) return (h.day===15||(!inIsrael&&h.day===16)||h.day===21||(!inIsrael&&h.day===22))?"pesach":"chol_hamoed";
  }
  if(h.month===1&&!inIsrael&&h.day===22)return "pesach";
  if(h.month===3&&(h.day===6||(!inIsrael&&h.day===7)))return "shavuot";
  return null;
}
function isFastDay(h){
  // common public fasts (not exhaustive; Yom Kippur handled as its own)
  if(h.month===10&&h.day===10)return true;         // Asara b'Tevet
  if(h.month===4&&h.day===17)return true;          // 17 Tammuz
  if(h.month===5&&h.day===9)return true;           // Tisha b'Av
  if(h.month===7&&h.day===3)return true;           // Tzom Gedaliah
  // Ta'anit Esther: 13 Adar (or Adar II in leap year)
  const adar=lastMonthH(h.year)===13?13:12;
  if(h.month===adar&&h.day===13)return true;
  return false;
}
function ruleMatches(rule,d,mode){
  d=d||new Date();const h=todayHeb(d);const inIsrael=(mode==="israel"||mode==="yerushalayim");
  const c=rule.cond||{};
  if(c.region==="israel"&&!inIsrael)return false;
  if(c.region==="diaspora"&&inIsrael)return false;
  const jsDow=jsWeekday(d);
  switch(c.type){
    case "rosh_chodesh": return (h.day===1||h.day===30);
    case "chanukah": return ((h.month===9&&h.day>=25)||(h.month===10&&h.day<=(lastDayH(9,h.year)===30?2:3)));
    case "purim": { const adar=lastMonthH(h.year)===13?13:12; return h.month===adar&&(h.day===14||h.day===15); }
    case "fast": return isFastDay(h);
    case "festival": { const f=hebFestival(h,inIsrael); if(!f)return false; if(c.fest&&c.fest!=="any")return f===c.fest; return true; }
    case "winter": return (h.month===7&&h.day>=22)||(h.month>=8&&h.month<=12)||(h.month===13)||(h.month===1&&h.day<=15);
    case "summer": return !((h.month===7&&h.day>=22)||(h.month>=8&&h.month<=12)||(h.month===13)||(h.month===1&&h.day<=15));
    case "rain_season":
      if(inIsrael)return (h.month===8&&h.day>=7)||(h.month>=9&&h.month<=12)||(h.month===13)||(h.month===1&&h.day<=15);
      { const m=d.getMonth()+1,day=d.getDate(); return (m===12&&day>=5)||(m===1)||(m===2)||(m===3)||(m===4&&day<=15); }
    case "dry_season":
      if(inIsrael)return !((h.month===8&&h.day>=7)||(h.month>=9&&h.month<=12)||(h.month===13)||(h.month===1&&h.day<=15));
      { const m=d.getMonth()+1,day=d.getDate(); return !((m===12&&day>=5)||(m===1)||(m===2)||(m===3)||(m===4&&day<=15)); }
    case "shabbat": return jsDow===6;
    case "weekday": return jsDow!==6;
    case "date_range": {
      const a=(c.fromM*100+c.fromD), b=(c.toM*100+c.toD), x=(h.month*100+h.day);
      return a<=b ? (x>=a&&x<=b) : (x>=a||x<=b);
    }
    case "always": return true;
    default: return false;
  }
}
function activeRulesFor(svcId,prayerId,d,mode){
  const rules=allInsertionRules();
  return rules.filter(r=>r.enabled!==false
    && (!r.service||r.service===svcId)
    && r.prayerId===prayerId
    && (!r.nusach||!r.nusach.length||r.nusach.includes(state.nusach))
    && ruleMatches(r,d,mode));
}

/* ====== DEFAULT INSERTION RULES (editable; stored overrides win) ====== */
const DEFAULT_INSERT_RULES=[
  {id:"def_mashiv",label:"Mashiv HaRuach (winter)",enabled:true,nusach:null,service:null,prayerId:"gevurot",anchor:"start",
   cond:{type:"winter"},text:{he:"מַשִּׁיב הָרוּחַ וּמוֹרִיד הַגֶּשֶׁם",tr:"Mashiv haruach umorid hageshem",en:"He causes the wind to blow and the rain to fall"}},
  {id:"def_tal",label:"Morid HaTal (summer)",enabled:true,nusach:null,service:null,prayerId:"gevurot",anchor:"start",
   cond:{type:"summer",region:null},text:{he:"מוֹרִיד הַטָּל",tr:"Morid hatal",en:"He causes the dew to descend"}},
  {id:"def_taluma",label:"V'Ten Tal U'Matar (rain season)",enabled:true,nusach:null,service:null,prayerId:"birkat_hashanim",anchor:"end",
   cond:{type:"rain_season"},text:{he:"וְתֵן טַל וּמָטָר לִבְרָכָה",tr:"Veten tal umatar livracha",en:"Grant dew and rain for a blessing"}},
  {id:"def_yaaleh",label:"Ya'aleh V'Yavo (Rosh Chodesh & festivals)",enabled:true,nusach:null,service:null,prayerId:"retzei",anchor:"end",
   cond:{type:"rosh_chodesh"},text:{he:"יַעֲלֶה וְיָבֹא וְיַגִּיעַ, וְיֵרָאֶה וְיֵרָצֶה וְיִשָּׁמַע, וְיִפָּקֵד וְיִזָּכֵר זִכְרוֹנֵנוּ... זָכְרֵנוּ יְיָ אֱלֹהֵינוּ בּוֹ לְטוֹבָה, וּפָקְדֵנוּ בוֹ לִבְרָכָה, וְהוֹשִׁיעֵנוּ בוֹ לְחַיִּים.",tr:"Ya'aleh veyavo...",en:"May our remembrance rise and come before You... Remember us, Lord our God, for good; consider us for blessing; save us for life."}},
  {id:"def_yaaleh_fest",label:"Ya'aleh V'Yavo (festivals)",enabled:true,nusach:null,service:null,prayerId:"retzei",anchor:"end",
   cond:{type:"festival",fest:"any"},text:{he:"יַעֲלֶה וְיָבֹא... בְּיוֹם חַג הַזֶּה.",tr:"Ya'aleh veyavo... beyom chag hazeh.",en:"May our remembrance rise... on this festival day."}},
  {id:"def_alhanissim_ch",label:"Al HaNissim (Chanukah)",enabled:true,nusach:null,service:null,prayerId:"modim",anchor:"end",
   cond:{type:"chanukah"},text:{he:"עַל הַנִּסִּים וְעַל הַפֻּרְקָן... בִּימֵי מַתִּתְיָהוּ בֶּן יוֹחָנָן כֹּהֵן גָּדוֹל חַשְׁמוֹנַאי וּבָנָיו...",tr:"Al hanisim...",en:"For the miracles... in the days of Mattityahu son of Yochanan the High Priest, the Hasmonean, and his sons..."}},
  {id:"def_alhanissim_pur",label:"Al HaNissim (Purim)",enabled:true,nusach:null,service:null,prayerId:"modim",anchor:"end",
   cond:{type:"purim"},text:{he:"עַל הַנִּסִּים וְעַל הַפֻּרְקָן... בִּימֵי מָרְדְּכַי וְאֶסְתֵּר בְּשׁוּשַׁן הַבִּירָה...",tr:"Al hanisim...",en:"For the miracles... in the days of Mordechai and Esther in Shushan the capital..."}}
];
function allInsertionRules(){
  // user rules in state.insertRules override/extend defaults; deletions tracked in state.insertRulesDeleted
  const userRules=(state.insertRules||[]);
  const deleted=new Set(state.insertRulesDeleted||[]);
  const overrides={};userRules.forEach(r=>{if(r.id)overrides[r.id]=r;});
  const merged=[];
  DEFAULT_INSERT_RULES.forEach(d=>{ if(deleted.has(d.id))return; merged.push(overrides[d.id]?Object.assign({},d,overrides[d.id]):d); });
  userRules.forEach(r=>{ if(!DEFAULT_INSERT_RULES.find(d=>d.id===r.id)) merged.push(r); });
  return merged;
}
function saveInsertRule(rule){
  state.insertRules=state.insertRules||[];
  const i=state.insertRules.findIndex(r=>r.id===rule.id);
  if(i>=0)state.insertRules[i]=rule;else state.insertRules.push(rule);
  saveState();
}
function deleteInsertRule(id){
  const isDefault=DEFAULT_INSERT_RULES.find(d=>d.id===id);
  if(isDefault){state.insertRulesDeleted=state.insertRulesDeleted||[];if(!state.insertRulesDeleted.includes(id))state.insertRulesDeleted.push(id);}
  state.insertRules=(state.insertRules||[]).filter(r=>r.id!==id);
  saveState();
}

function injectPersonal(pr,svcId,wrap){
  /* Seasonal/calendar inserts are now handled inline by the insertion-rules engine in renderPrayerInline. */
  /* Healing names at the Refuah blessing */
  if(pr.id==="refuah"||/refuah|\u05E8\u05B0\u05E4\u05D5\u05BC\u05D0\u05B8\u05D4/i.test(pr.en+pr.he)){
    const names=formatNameList("refuah");
    if(names){const ins=el("div","");ins.style.cssText="margin:.5rem 0;padding:.7rem .9rem;background:color-mix(in srgb,var(--insert) 12%,transparent);border:1px solid color-mix(in srgb,var(--insert) 30%,transparent);border-radius:.55rem";
      ins.innerHTML=`<div style="font-size:.62rem;letter-spacing:.16em;text-transform:uppercase;color:var(--insert);font-weight:700;margin-bottom:.3rem">Add for healing</div><div style="font-family:var(--hebrew);direction:rtl;font-size:1.05rem;line-height:1.9;color:var(--ink)">\u05D5\u05B4\u05D9\u05E9\u05B0\u05C1\u05DC\u05B7\u05D7 \u05E8\u05B0\u05E4\u05D5\u05BC\u05D0\u05B8\u05D4 \u05E9\u05B0\u05C1\u05DC\u05B5\u05DE\u05B8\u05D4 \u05DC: ${esc(names)}</div>`;
      wrap.appendChild(ins);}
  }
  /* Personal verse + general names just before the end of the Amidah (Elohai Netzor) */
  if(pr.id==="birkat_shalom"||/elohai netzor|\u05E0\u05B0\u05E6\u05D5\u05B9\u05E8 \u05DC\u05B0\u05E9\u05D5\u05B9\u05E0\u05B4\u05D9/i.test(pr.en+pr.he+JSON.stringify(pr.blocks||[]))){
    const gen=[formatNameList("parnasa"),formatNameList("shidduch"),formatNameList("success")].filter(Boolean).join(", ");
    if(gen){const ins=el("div","");ins.style.cssText="margin:.5rem 0;padding:.7rem .9rem;background:color-mix(in srgb,var(--insert) 12%,transparent);border:1px solid color-mix(in srgb,var(--insert) 30%,transparent);border-radius:.55rem";
      ins.innerHTML=`<div style="font-size:.62rem;letter-spacing:.16em;text-transform:uppercase;color:var(--insert);font-weight:700;margin-bottom:.3rem">Personal requests</div><div style="font-family:var(--hebrew);direction:rtl;font-size:1.05rem;line-height:1.9;color:var(--ink)">\u05D5\u05B4\u05D9\u05D4\u05B4\u05D9 \u05E8\u05B8\u05E6\u05D5\u05B9\u05DF \u05E9\u05B6\u05BC\u05EA\u05B4\u05BC\u05D6\u05B0\u05DB\u05B6\u05BC\u05D4 \u05DC: ${esc(gen)}</div>`;
      wrap.appendChild(ins);}
    if(state.personalVerse){const v=el("div","");v.style.cssText="margin:.5rem 0;padding:.7rem .9rem;background:color-mix(in srgb,var(--accent) 10%,transparent);border:1px solid color-mix(in srgb,var(--accent) 28%,transparent);border-radius:.55rem";
      v.innerHTML=`<div style="font-size:.62rem;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:.3rem">Your verse</div><div style="font-family:var(--hebrew);direction:rtl;font-size:1.1rem;line-height:1.95;color:var(--ink)">${esc(state.personalVerse)}</div>`;
      wrap.appendChild(v);}
  }
}

/* A per-block icon (b.icon={key,cond}) rendered as a small badge when its
   condition matches — uploaded overrides become an <img>, built-ins inline SVG. */
function blockIconHtml(ic){
  if(!ic||!ic.key)return"";
  if(typeof condMatches==="function"&&!condMatches(ic.cond))return"";
  const url=(window.ICON_OVERRIDES||{})[ic.key];
  if(url)return `<img class="icon" src="${url}" alt="${esc(ic.key)}" style="width:1.2em;height:1.2em;object-fit:contain;vertical-align:middle">`;
  if(ic.key==="stand"||ic.key==="sit"||ic.key==="bow")return postureIcon(ic.key);
  return `<svg class="icon" viewBox="0 0 24 24" style="width:1.2em;height:1.2em">${svcIcon(ic.key)}</svg>`;
}
function renderBlockTo(b,wrap){
  if(b.k==="kavanah"){if(state.showKavanot)renderKavanot(b,wrap);return;}
  if(b.k==="rubric"){if(!blockVisible(b))return;if(!state.showInstr)return;const r=el("div","rubric");r.innerHTML=esc(b.text||"");const post=postureOf(b);if(post){const tag=el("span","posture-tag "+post.tag);tag.innerHTML=`${postureIcon(post.tag)}<span>${post.label}</span>`;r.insertBefore(tag,r.firstChild);}wrap.appendChild(r);return;}
  if(!blockVisible(b))return;
  const tags=b.tags||[];
  const block=el("div","block"+(tags.includes("special")?" special-block":""));
  const icoH=blockIconHtml(b.icon);
  if(icoH){const it=el("span","posture-tag");it.innerHTML=icoH;block.appendChild(it);}
  const he=pickHe(b);
  if(b.vary){const v=el("span","nvar");v.textContent=b.vary;block.appendChild(v);}
  if(he){const hh=el("div","he-text");hh.innerHTML=esc(he);block.appendChild(hh);}
  if(!state.hebrewOnly){if(state.translit&&b.tr){const t=el("div","translit");t.innerHTML=esc(b.tr);block.appendChild(t);}if(b.en){const e=el("div","en-text");e.innerHTML=esc(b.en);block.appendChild(e);}}
  wrap.appendChild(block);
  if(state.showKavanot)renderKavanot(b,wrap);
}
/* Normalize a block's kavanah data into {found,halachic,kabbalistic} */
function kavLayers(b){
  if(!b)return {};
  if(b.kav&&typeof b.kav==="object")return b.kav; /* new multi-level form */
  if(typeof b.kavanah==="string"&&b.kavanah)return {found:b.kavanah}; /* legacy single */
  if(b.kavanah&&typeof b.kavanah==="object")return b.kavanah;
  return {};
}
/* Kavanot are their own blocks (k:"kavanah"). Legacy prayers attach a kavanah to a
   text block; splitKavBlock converts those into [textBlock, kavanahBlock] so the
   kavanah becomes an independent, reorderable item. Idempotent. */
function blockHasKav(b){const l=kavLayers(b);return !!(l&&(l.found||l.halachic||l.kabbalistic));}
function splitKavBlock(b){
  if(!b||b.k==="kavanah")return [b];
  if(!blockHasKav(b))return [b];
  const l=kavLayers(b);
  const text=Object.assign({},b);delete text.kavanah;delete text.kav;
  const kav={k:"kavanah",kav:{}};
  if(l.found)kav.kav.found=l.found;if(l.halachic)kav.kav.halachic=l.halachic;if(l.kabbalistic)kav.kav.kabbalistic=l.kabbalistic;
  return [text,kav];
}
function normalizeBlocks(blocks){const out=[];(blocks||[]).forEach(b=>{splitKavBlock(b).forEach(x=>out.push(x));});return out;}
function renderKavanot(b,wrap){
  const layers=kavLayers(b);const lv=state.kavLevels||{found:true};
  const defs=[["found","Kavanah","var(--insert)"],["halachic","Halachic Focus","#9fa97a"],["kabbalistic","Kabbalistic","#b08cc4"]];
  let shown=0;
  defs.forEach(([key,title,color])=>{
    if(!lv[key])return;const txt=layers[key];if(!txt)return;
    const k=el("div","kavanah-card");k.style.setProperty("--kc",color);
    k.style.borderLeftColor=color;k.style.background="color-mix(in srgb,"+color+" 8%,transparent)";k.style.borderColor="color-mix(in srgb,"+color+" 22%,transparent)";
    k.dataset.label=title;k.innerHTML=`<div class="kav-lbl" style="color:${color}">${esc(title)}</div>${esc(txt)}`;
    wrap.appendChild(k);shown++;
  });
}

/* ====== DAVEN WITH ME ====== */
let dm={svcId:null,blocks:[],idx:0};
/* Flatten a service into Daven blocks. Each block is tagged with its owning
   prayer id (pid) and its index within that prayer's normalized blocks (bi);
   a header block uses bi:-1. These (pid,bi) pairs are stable identifiers that
   audio sync cues bind to, so cues survive toggle changes that hide blocks.
   Pass onlyPids to limit to a subset of prayers (used by the audio authoring UI). */
function buildDavenBlocks(svcId,onlyPids){
  const prayers=orderedPrayers(svcId);const blocks=[];
  prayers.forEach(pr=>{
    if(onlyPids&&onlyPids.length&&!onlyPids.includes(pr.id))return;
    blocks.push({k:"header",en:pr.en,he:pr.he,section:pr.section,pid:pr.id,bi:-1});
    normalizeBlocks(pr.blocks).forEach((b,bi)=>{
      if(b.k==="rubric"&&!state.showInstr)return;
      if(b.k==="kavanah"&&!state.showKavanot)return;
      if(b.k!=="rubric"&&b.k!=="kavanah"&&!blockVisible(b))return;
      blocks.push(Object.assign({},b,{pid:pr.id,bi:bi}));
    });
  });
  return blocks;
}
function startDaven(svcId){
  const blocks=buildDavenBlocks(svcId);if(!blocks.length)return;
  dm={svcId,blocks,idx:0};const svc=svcById(svcId);$("#dmTitle").textContent=svc.en;$("#daven").classList.add("show");
  if(typeof davenAudioReset==="function")davenAudioReset();
  paintDaven();
  if(typeof davenAudioInit==="function")davenAudioInit();
}
function paintDaven(){
  const c=$("#dmContent");c.innerHTML="";
  dm.blocks.forEach((b,i)=>{
    const card=el("div","dm-block");card.dataset.i=i;if(b.pid!=null)card.dataset.pid=b.pid;if(b.bi!=null)card.dataset.bi=b.bi;if(i<dm.idx)card.classList.add("past");else if(i===dm.idx)card.classList.add("current");
    if(b.k==="header"){card.innerHTML=`<div style="font-size:.62rem;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:.3rem">${esc(b.section||"Main")}</div><div style="font-family:var(--display);font-size:1.5rem;font-weight:600;color:var(--ink);letter-spacing:-.01em">${esc(b.en)} <span style="font-family:var(--hebrew);direction:rtl;color:var(--accent);font-size:.85em">${esc(b.he)}</span></div>`;}
    else if(b.k==="rubric"){const post=postureOf(b);let postHtml="";if(post)postHtml=`<span class="posture-tag ${post.tag}">${postureIcon(post.tag)}<span>${post.label}</span></span>`;card.innerHTML=`<div class="rubric">${postHtml}${esc(b.text||"")}</div>`;}
    else if(b.k==="kavanah"){renderKavanot(b,card);}
    else{let html="";const ico=blockIconHtml(b.icon);if(ico)html+=`<span class="posture-tag">${ico}</span>`;const he=pickHe(b);if(he)html+=`<div class="he-text">${esc(he)}</div>`;if(state.translit&&b.tr)html+=`<div class="translit">${esc(b.tr)}</div>`;if(!state.hebrewOnly&&b.en)html+=`<div class="en-text">${esc(b.en)}</div>`;card.innerHTML=html;if(state.showKavanot&&i===dm.idx)renderKavanot(b,card);}
    c.appendChild(card);
  });
  const pct=dm.blocks.length>1?Math.round((dm.idx/(dm.blocks.length-1))*100):100;$("#dmFill").style.width=pct+"%";
  setTimeout(()=>{const cur=c.querySelector(".current");if(cur&&cur.scrollIntoView)cur.scrollIntoView({behavior:"smooth",block:"center"});},50);
  $("#dmPrev").style.opacity=dm.idx===0?".3":"1";
  $("#dmNext").innerHTML=dm.idx>=dm.blocks.length-1?'Done <svg class="icon" viewBox="0 0 24 24" style="width:1em"><path d="M20 6L9 17l-5-5"/></svg>':'Next <svg class="icon" viewBox="0 0 24 24" style="width:1em"><path d="M9 6l6 6-6 6"/></svg>';
  if(typeof davenAudioAfterPaint==="function")davenAudioAfterPaint();
}
function dmNext(){if(dm.idx>=dm.blocks.length-1){$("#daven").classList.remove("show");haptic([20,80,20]);toast("Tefillah complete");return;}dm.idx++;haptic(10);paintDaven();}
function dmPrev(){if(dm.idx>0){dm.idx--;paintDaven();}}

/* ====== TEHILLIM HUB (with divisions) ====== */
function startSeq(label,chapters){state.tehillimSeq={label,chapters:chapters.slice(),idx:0};saveState();go("tehillim-read",chapters[0]);}
function localWeekday(){const tz=tzForLoc(state.loc);try{const wd=new Intl.DateTimeFormat("en-US",{timeZone:tz,weekday:"short"}).format(new Date());return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(wd);}catch(e){return new Date().getDay();}}
function renderTehillimHub(stage){
  const head=el("div","svc-head");head.innerHTML=`<span class="en">Tehillim</span><span class="he">\u05EA\u05B0\u05BC\u05D4\u05B4\u05DC\u05B4\u05BC\u05D9\u05DD</span>`;stage.appendChild(head);
  const sub=el("div","svc-sub");sub.textContent="Psalms of David";stage.appendChild(sub);

  /* --- TODAY'S READING (weekly + monthly, no scrolling) --- */
  const th=el("div","section-head cat cat-tehillim");th.innerHTML=`<span>Today's Reading</span>`;stage.appendChild(th);
  const todayWrap=el("div","");todayWrap.style.cssText="display:flex;flex-direction:column;gap:.6rem;margin-bottom:.4rem";

  const wd=localWeekday();const wDay=TEHILLIM_WEEK[wd];const wChs=rangeArr(wDay.from,wDay.to);
  const wc=el("button","");wc.style.cssText="display:flex;align-items:center;gap:.85rem;width:100%;padding:1rem 1.1rem;background:color-mix(in srgb,var(--accent) 10%,transparent);border:1px solid color-mix(in srgb,var(--accent) 30%,transparent);border-radius:.7rem;cursor:pointer;text-align:left";
  wc.innerHTML=`<div style="flex:none;width:2.6rem;height:2.6rem;border-radius:.6rem;background:var(--accent);color:var(--on-accent);display:grid;place-items:center;font-family:var(--hebrew);font-weight:700;font-size:.95rem">\u05E9\u05B8\u05D1\u05D5\u05BC\u05E2\u05B7</div><div style="flex:1"><div style="font-size:.6rem;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);font-weight:700">Weekly cycle \u00B7 ${esc(wDay.label)}</div><div style="font-family:var(--display);font-size:1.12rem;font-weight:600;color:var(--ink);line-height:1.15;margin-top:.1rem">chapters ${wDay.from}\u2013${wDay.to}</div><div style="font-size:.74rem;color:var(--ink2);margin-top:.1rem">${wChs.length} chapters</div></div><div class="arr" style="color:var(--accent);font-size:1.3rem">\u2192</div>`;
  wc.onclick=()=>startSeq("Weekly \u00B7 "+wDay.label,wChs);

  const hb=todayHeb();const mlen=lastDayH(hb.month,hb.year);const mChs=monthChaptersForDay(hb.day,mlen);
  const mc=el("button","");mc.style.cssText="display:flex;align-items:center;gap:.85rem;width:100%;padding:1rem 1.1rem;background:color-mix(in srgb,var(--accent) 10%,transparent);border:1px solid color-mix(in srgb,var(--accent) 30%,transparent);border-radius:.7rem;cursor:pointer;text-align:left";
  mc.innerHTML=`<div style="flex:none;width:2.6rem;height:2.6rem;border-radius:.6rem;background:var(--accent);color:var(--on-accent);display:grid;place-items:center;font-family:var(--hebrew);font-weight:700;font-size:1.05rem">${gematria(hb.day)}</div><div style="flex:1"><div style="font-size:.6rem;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);font-weight:700">Monthly cycle \u00B7 Day ${hb.day}</div><div style="font-family:var(--display);font-size:1.12rem;font-weight:600;color:var(--ink);line-height:1.15;margin-top:.1rem">chapters ${mChs[0]}\u2013${mChs[mChs.length-1]}</div><div style="font-size:.74rem;color:var(--ink2);margin-top:.1rem">${mChs.length} chapter${mChs.length>1?"s":""} \u00B7 ${gematria(hb.day)} ${monthHe(hb.month,hb.year)}</div></div><div class="arr" style="color:var(--accent);font-size:1.3rem">\u2192</div>`;
  mc.onclick=()=>startSeq("Day "+hb.day+" of the month",mChs);
  /* monthly cycle shown before the weekly cycle */
  todayWrap.appendChild(mc);todayWrap.appendChild(wc);
  stage.appendChild(todayWrap);

  if(state.birthday){const age=computeHebAge(state.birthday);const psNum=age+1;const card=el("button","");card.style.cssText="display:flex;align-items:center;gap:.85rem;width:100%;padding:.85rem 1.1rem;background:var(--surface);border:1px solid var(--line);border-radius:.7rem;cursor:pointer;text-align:left;margin-top:.6rem";card.innerHTML=`<div style="flex:none;width:2.4rem;height:2.4rem;border-radius:.55rem;background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent);display:grid;place-items:center;font-weight:700">${psNum}</div><div style="flex:1"><div style="font-size:.6rem;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);font-weight:700">Your psalm</div><div style="font-family:var(--display);font-size:1.05rem;font-weight:600;color:var(--ink)">Tehillim ${psNum}</div></div><div class="arr" style="color:var(--accent)">\u2192</div>`;card.onclick=()=>go("tehillim-read",psNum);stage.appendChild(card);}

  /* --- Menu buttons (tap to open) --- */
  const menuWrap=el("div","");menuWrap.style.cssText="display:flex;flex-direction:column;gap:.6rem;margin-top:1.2rem";
  const mkMenu=(eyebrow,title,sub,he,sub2)=>{
    const b=el("button","");b.style.cssText="display:flex;align-items:center;gap:.85rem;width:100%;padding:1rem 1.1rem;background:var(--surface);border:1px solid var(--line);border-radius:.7rem;cursor:pointer;text-align:left";
    b.innerHTML=`<div style="flex:none;width:2.6rem;height:2.6rem;border-radius:.6rem;background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent);display:grid;place-items:center;font-family:var(--hebrew);font-weight:700;font-size:1rem">${he}</div><div style="flex:1"><div style="font-family:var(--display);font-size:1.12rem;font-weight:600;color:var(--ink);line-height:1.15">${esc(title)}</div><div style="font-size:.74rem;color:var(--ink2);margin-top:.12rem">${esc(sub)}</div></div><div class="arr" style="color:var(--accent);font-size:1.3rem">\u2192</div>`;
    b.onclick=()=>{state.tehSub=sub2;saveState();render();};
    return b;
  };
  menuWrap.appendChild(mkMenu("","All 150 Chapters","Browse every psalm by book","\u05E7\u05B0\u05E4\u05B4\u05D9\u05D8\u05B6\u05DC","allchapters"));
  menuWrap.appendChild(mkMenu("","For an Occasion","Sequences for healing, travel, and more","\u05E2\u05B5\u05EA","occasions"));
  stage.appendChild(menuWrap);
}

function renderTehillimSub(stage){
  const sub=state.tehSub;
  const back=el("button","");back.style.cssText="display:inline-flex;align-items:center;gap:.4rem;color:var(--muted);font-size:.85rem;padding:.4rem .6rem .4rem .4rem;margin-bottom:.5rem;border-radius:.45rem;cursor:pointer;background:transparent;border:0";back.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:.9em;height:.9em"><path d="M15 18l-6-6 6-6"/></svg> Tehillim`;back.onclick=()=>{state.tehSub=null;saveState();render();};stage.appendChild(back);

  if(sub==="allchapters"){
    const head=el("div","svc-head");head.innerHTML=`<span class="en">All 150 Chapters</span><span class="he">\u05E7\u05B0\u05E4\u05B4\u05D9\u05D8\u05B6\u05DC</span>`;stage.appendChild(head);
    TEHILLIM_BOOKS.forEach(bk=>{
      const bh=el("div","section-head");bh.innerHTML=`<span>${esc(bk.label)} \u00B7 ${bk.from}\u2013${bk.to}</span><span style="font-family:var(--hebrew);color:var(--accent);font-weight:600">${esc(bk.he)}</span>`;stage.appendChild(bh);
      const grid=el("div","teh-grid");
      for(let i=bk.from;i<=bk.to;i++){const cell=el("button","teh-cell"+(TEHILLIM_EMBED[i]?" embedded":""));cell.textContent=i;cell.onclick=()=>{state.tehillimSeq=null;saveState();go("tehillim-read",i);};grid.appendChild(cell);}
      stage.appendChild(grid);
    });
  } else if(sub==="books"){
    const head=el("div","svc-head");head.innerHTML=`<span class="en">The Five Books</span><span class="he">\u05D7\u05B2\u05DE\u05B4\u05E9\u05B8\u05BC\u05D4 \u05E1\u05B0\u05E4\u05B8\u05E8\u05B4\u05D9\u05DD</span>`;stage.appendChild(head);
    const note=el("div","note");note.textContent="Tehillim is divided into five books, paralleling the five books of the Torah.";stage.appendChild(note);
    const box=el("div","");box.style.cssText="display:flex;flex-direction:column;gap:.5rem;margin-top:.6rem";
    TEHILLIM_BOOKS.forEach((bk,bi)=>{
      const chs=rangeArr(bk.from,bk.to);
      const c=el("button","div-card");c.innerHTML=`<div class="dn">${gematria(bk.from)}\u2013${gematria(bk.to)}</div><div class="di"><b>${esc(bk.label)}</b><small>Psalms ${bk.from}\u2013${bk.to} \u00B7 ${chs.length} chapters</small></div><div style="font-family:var(--hebrew);direction:rtl;color:var(--accent)">${esc(bk.he)}</div>`;
      c.onclick=()=>{state.tehBookOpen=(state.tehBookOpen===bi?null:bi);saveState();render();};
      box.appendChild(c);
      if(state.tehBookOpen===bi){
        const grid=el("div","teh-grid");grid.style.margin=".2rem 0 .4rem";
        for(let i=bk.from;i<=bk.to;i++){const cell=el("button","teh-cell"+(TEHILLIM_EMBED[i]?" embedded":""));cell.textContent=i;cell.onclick=()=>{state.tehillimSeq=null;saveState();go("tehillim-read",i);};grid.appendChild(cell);}
        box.appendChild(grid);
        const readAll=el("button","btn-ghost");readAll.style.cssText="margin:.1rem 0 .3rem";readAll.textContent="Read "+bk.label+" in sequence";readAll.onclick=()=>startSeq(bk.label,chs);box.appendChild(readAll);
      }
    });
    stage.appendChild(box);
  } else if(sub==="occasions"){
    const head=el("div","svc-head");head.innerHTML=`<span class="en">For an Occasion</span><span class="he">\u05DC\u05B0\u05E2\u05B5\u05EA \u05E6\u05B8\u05BC\u05E8\u05B8\u05D4</span>`;stage.appendChild(head);
    const box=el("div","");box.style.cssText="display:flex;flex-direction:column;gap:.5rem;margin-top:.6rem";
    TEHILLIM_OCC.forEach(o=>{const c=el("button","div-card");c.innerHTML=`<div class="dn"><svg class="icon" viewBox="0 0 24 24" style="width:1.1em"><path d="M12 2l2 6h6l-5 4 2 7-5-4-5 4 2-7-5-4h6z"/></svg></div><div class="di"><b>${esc(o.label)}</b><small>${o.ch.length} chapters${o.sub?" \u00B7 "+esc(o.sub):""}</small></div><div style="font-family:var(--hebrew);direction:rtl;color:var(--accent)">${esc(o.he)}</div>`;c.onclick=()=>startSeq(o.label,o.ch);box.appendChild(c);});
    stage.appendChild(box);
  } else { state.tehSub=null; renderTehillimHub(stage); }
}

async function renderTehillimRead(stage,n){
  n=+n;
  const back=el("button","");back.style.cssText="display:inline-flex;align-items:center;gap:.4rem;color:var(--muted);font-size:.85rem;padding:.4rem .6rem .4rem .4rem;margin-bottom:.5rem;border-radius:.45rem;cursor:pointer;background:transparent;border:0";back.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:.9em;height:.9em"><path d="M15 18l-6-6 6-6"/></svg> Back to Tehillim`;back.onclick=()=>go("tehillim");stage.appendChild(back);
  const inSeq=state.tehillimSeq&&state.tehillimSeq.chapters.length;
  if(inSeq){const idx=state.tehillimSeq.chapters.indexOf(n);if(idx>=0){state.tehillimSeq.idx=idx;saveState();}const banner=el("div");banner.style.cssText="background:color-mix(in srgb,var(--accent) 8%,transparent);border:1px solid color-mix(in srgb,var(--accent) 20%,transparent);border-radius:.55rem;padding:.65rem .9rem;margin-bottom:1rem;font-size:.84rem;color:var(--ink2);display:flex;align-items:center;gap:.6rem";banner.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:1em;color:var(--accent)"><polygon points="12 2 15 8.5 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 9 8.5 12 2"/></svg><span><b style="color:var(--accent)">${esc(state.tehillimSeq.label)}</b> \u00B7 ${idx+1} of ${state.tehillimSeq.chapters.length}</span>`;stage.appendChild(banner);}
  const head=el("div","svc-head");head.innerHTML=`<span class="en">Psalm ${n}</span><span class="he">\u05EA\u05B0\u05BC\u05D4\u05B4\u05DC\u05B4\u05BC\u05D9\u05DD ${gematria(n)}</span>`;stage.appendChild(head);
  const wrap=el("div","");wrap.style.padding="0 .25rem";stage.appendChild(wrap);
  let verses=TEHILLIM_EMBED[n];
  if(!verses){
    /* check localStorage cache of previously fetched chapters */
    try{const cached=JSON.parse(localStorage.getItem("teh_cache")||"{}");if(cached[n]&&cached[n].length)verses=cached[n];}catch(e){}
  }
  if(!verses){
    if(navigator.onLine===false){
      wrap.innerHTML=`<div style="padding:1.4rem;color:var(--muted);font-size:.9rem;text-align:center;border:1px dashed var(--line);border-radius:.55rem;line-height:1.6">You're offline, and Tehillim ${n} isn't saved on this device yet.<br><small>Open it once while online and it will be saved for offline use.</small></div>`;
    } else {
      wrap.innerHTML='<div style="padding:1rem 0"><div style="height:1.5rem;width:60%;background:var(--surface2);border-radius:.3rem;margin-bottom:.4rem"></div><div style="height:1.2rem;background:var(--surface2);border-radius:.3rem;margin-bottom:.4rem"></div><div style="height:1.2rem;width:85%;background:var(--surface2);border-radius:.3rem"></div></div>';
      try{const r=await fetch(`https://www.sefaria.org/api/v3/texts/Psalms.${n}?return_format=text_only`);if(r.ok){const d=await r.json();verses=(d.versions&&d.versions[0]&&d.versions[0].text)||[];if(verses&&verses.length){try{const c=JSON.parse(localStorage.getItem("teh_cache")||"{}");c[n]=verses;localStorage.setItem("teh_cache",JSON.stringify(c));}catch(e){}}}}catch(e){verses=null;}
    }
  }
  if(verses&&verses.length){wrap.innerHTML="";verses.forEach((v,i)=>{const b=el("div","block");const he=el("div","he-text");he.innerHTML=`<span style="color:var(--muted);font-size:.7em;margin-left:.5em">${gematria(i+1)}.</span> ${esc(v)}`;b.appendChild(he);wrap.appendChild(b);});}
  else{wrap.innerHTML=`<div style="padding:1.4rem;color:var(--muted);font-size:.9rem;text-align:center;border:1px dashed var(--line);border-radius:.55rem;line-height:1.6">Tehillim ${n} isn't bundled offline.<br><small>Connect to the internet to load the full text from Sefaria.</small></div>`;}
  if(inSeq){const idx=state.tehillimSeq.chapters.indexOf(n);if(idx>=0&&idx<state.tehillimSeq.chapters.length-1){const next=el("button","sticky-next");next.innerHTML=`Next: Tehillim ${state.tehillimSeq.chapters[idx+1]} <svg class="icon" viewBox="0 0 24 24" style="width:1em"><path d="M9 6l6 6-6 6"/></svg>`;next.onclick=()=>go("tehillim-read",state.tehillimSeq.chapters[idx+1]);document.body.appendChild(next);}else if(idx===state.tehillimSeq.chapters.length-1){const done=el("div");done.style.cssText="margin-top:1.4rem;padding:1.4rem;text-align:center;background:color-mix(in srgb,var(--accent) 10%,transparent);border:1px solid color-mix(in srgb,var(--accent) 25%,transparent);border-radius:.65rem";done.innerHTML=`<div style="font-family:var(--display);font-size:1.15rem;font-weight:600;color:var(--accent);margin-bottom:.3rem">Sequence complete</div><div style="font-size:.86rem;color:var(--muted)">You finished all ${state.tehillimSeq.chapters.length} chapters for ${esc(state.tehillimSeq.label)}.</div>`;stage.appendChild(done);}}
}

/* ====== LOCATION HELPERS ====== */
function setLoc(name,lat,lng,tz){state.loc={name,lat:+lat,lng:+lng,tz:tz||tzForLoc({name})};saveState();}
/* Live city search via Open-Meteo geocoding (free, no key). Falls back to the
   built-in CITIES list when offline or if the request fails. */
async function geocodeCity(q){
  q=(q||"").trim();if(q.length<2)return [];
  const local=CITIES.filter(c=>c[0].toLowerCase().includes(q.toLowerCase())).slice(0,6)
    .map(c=>({name:c[0],lat:c[1],lng:c[2],tz:c[3],local:true}));
  if(navigator.onLine===false)return local;
  try{
    const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`);
    if(!r.ok)return local;
    const d=await r.json();
    if(!d.results||!d.results.length)return local;
    return d.results.map(x=>{
      const parts=[x.name,x.admin1,x.country].filter(Boolean);
      const label=x.country_code&&x.country_code!=="US"?(x.name+(x.country?", "+x.country:"")):(x.name+(x.admin1?", "+x.admin1:""));
      return {name:label,lat:+x.latitude.toFixed(4),lng:+x.longitude.toFixed(4),tz:x.timezone||null,full:parts.join(", ")};
    });
  }catch(e){return local;}
}
function useGeolocation(after){
  if(!navigator.geolocation){toast("Location not available on this device");return;}
  toast("Finding your location\u2026");
  navigator.geolocation.getCurrentPosition(p=>{let tz;try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone;}catch(e){tz=null;}state.loc={name:"My location",lat:+p.coords.latitude.toFixed(4),lng:+p.coords.longitude.toFixed(4),tz};saveState();toast("Location set");after&&after();},err=>{toast(err.code===1?"Location permission denied":"Couldn't get location");},{timeout:9000,enableHighAccuracy:false});
}
function locationPicker(container,after){
  container.innerHTML="";
  const row=el("div","");row.style.cssText="display:flex;gap:.4rem;margin-bottom:.5rem";
  const inp=el("input");inp.placeholder="Type any city\u2026";inp.autocomplete="off";inp.style.cssText="flex:1;padding:.65rem .8rem;background:var(--surface2);border:1px solid var(--line);border-radius:.5rem;color:var(--ink);font-size:.92rem;outline:none";
  const geo=el("button","btn-ghost");geo.style.margin="0";geo.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:1.1em;height:1.1em"><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/></svg>`;geo.title="Use my location";geo.onclick=()=>useGeolocation(after);
  row.appendChild(inp);row.appendChild(geo);container.appendChild(row);
  const results=el("div","");container.appendChild(results);
  let t=null;
  function paintLocal(q){results.innerHTML="";const ql=(q||"").toLowerCase().trim();const list=ql?CITIES.filter(c=>c[0].toLowerCase().includes(ql)):CITIES.slice(0,8);renderRows(list.map(c=>({name:c[0],lat:c[1],lng:c[2],tz:c[3]})));}
  function renderRows(list){
    results.innerHTML="";
    if(!list.length){results.innerHTML=`<div class="note">No city matched. Try a larger nearby city, or use the location button.</div>`;return;}
    list.forEach(r=>{const b=el("button","loc-result");const active=state.loc.name===r.name;b.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:1.1em;height:1.1em;color:var(--accent)"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><div class="ln"><b>${esc(r.name)}</b><small>${esc(r.tz||"")}</small></div>${active?'<span class="nowtag">Current</span>':""}`;b.onclick=()=>{setLoc(r.name,r.lat,r.lng,r.tz);after&&after();};results.appendChild(b);});
  }
  paintLocal("");
  inp.addEventListener("input",e=>{
    const q=e.target.value;if(t)clearTimeout(t);
    if(q.trim().length<2){paintLocal(q);return;}
    t=setTimeout(async()=>{
      results.innerHTML=`<div class="note">Searching\u2026</div>`;
      const res=await geocodeCity(q);
      if(inp.value.trim().length<2){paintLocal(inp.value);return;}
      renderRows(res);
    },280);
  });
  return inp;
}

/* ====== ZMANIM (with location switcher) ====== */
/* ====== COMPASS TO JERUSALEM ====== */
const KOTEL={lat:31.7767,lng:35.2345}; /* Western Wall */
function bearingToKotel(lat,lng){
  const toR=x=>x*Math.PI/180,toD=x=>x*180/Math.PI;
  const φ1=toR(lat),φ2=toR(KOTEL.lat),Δλ=toR(KOTEL.lng-lng);
  const y=Math.sin(Δλ)*Math.cos(φ2);
  const x=Math.cos(φ1)*Math.sin(φ2)-Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
  return (toD(Math.atan2(y,x))+360)%360;
}
let _kotelHandler=null;
/* Original Kotel line art — minimalist ashlar masonry with an engraved
   "ירושלים / JERUSALEM" wordmark. Pure SVG, every colour from var(--accent)/
   var(--bg) via the `style` property (presentation attributes don't take var()),
   so it restyles with the theme and needs no external image. */
function kotelArtSVG(){
  const W=360,H=176,x0=8,x1=352,top=26,ground=158;
  const rows=7,rowH=(ground-top)/rows,cell=58;
  const bandY0=top+3*rowH,bandY1=top+5*rowH; // cleared band (2 courses) for the wordmark
  let courses="",joints="";
  for(let i=0;i<=rows;i++){const y=(top+i*rowH).toFixed(1);courses+=`<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}"/>`;}
  for(let r=0;r<rows;r++){
    const yA=top+r*rowH,yB=top+(r+1)*rowH;
    if(yA>=bandY0-0.5&&yB<=bandY1+0.5)continue;      // keep the wordmark band clear
    const off=(r%2)?cell/2:0;                          // running-bond offset
    for(let x=x0+off;x<x1-2;x+=cell){if(x<=x0+2)continue;joints+=`<line x1="${x.toFixed(1)}" y1="${yA.toFixed(1)}" x2="${x.toFixed(1)}" y2="${yB.toFixed(1)}"/>`;}
  }
  const arch=`<path d="M214 ${top} A 72 72 0 0 1 ${x1} ${top}" style="stroke-opacity:.4"/>`; // Wilson's Arch hint
  const tuft=(x,y)=>`<g style="stroke-opacity:.7"><path d="M${x} ${y} q -3 -7 -6 -10"/><path d="M${x} ${y} q 0 -8 0 -12"/><path d="M${x} ${y} q 3 -7 6 -10"/></g>`;
  const greens=tuft(x0+cell,(top+rowH).toFixed(1))+tuft((x0+cell*3+cell/2).toFixed(1),(top+2*rowH).toFixed(1))+tuft((x1-cell).toFixed(1),ground);
  const base=`<line x1="${x0}" y1="${ground}" x2="${x1}" y2="${ground}" style="stroke-width:2.2"/>`;
  const band=`<rect x="${x0}" y="${bandY0.toFixed(1)}" width="${x1-x0}" height="${(bandY1-bandY0).toFixed(1)}" rx="3" style="fill:var(--bg);fill-opacity:.82;stroke:none"/>`;
  const midY=(bandY0+bandY1)/2;
  const word=`<g style="fill:var(--accent);stroke:none;filter:drop-shadow(0 0 5px color-mix(in srgb,var(--accent) 55%,transparent))" text-anchor="middle">`
    +`<text x="${W/2}" y="${(midY-1).toFixed(1)}" dominant-baseline="middle" style="font-family:var(--hebrew);font-weight:600;font-size:29px">ירושלים</text>`
    +`<text x="${W/2}" y="${(midY+17).toFixed(1)}" dominant-baseline="middle" style="font-family:var(--display);font-size:9px;letter-spacing:4px">JERUSALEM</text></g>`;
  return `<svg class="kotel-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Jerusalem"`
    +` style="stroke:var(--accent)" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">`
    +`${arch}<g>${courses}</g><g>${joints}</g>${base}${greens}${band}${word}</svg>`;
}
function renderKotel(stage){
  const loc=state.loc||{name:"Jerusalem",lat:31.78,lng:35.23};
  const atKotel=Math.abs(loc.lat-KOTEL.lat)<0.02&&Math.abs(loc.lng-KOTEL.lng)<0.02;
  const bearing=bearingToKotel(loc.lat,loc.lng);
  /* Header: themed line art by default; an admin-uploaded photo overrides it. */
  const kImg=(state.branding&&state.branding.kotelImage)||"";
  if(kImg){
    const hero=el("div","kotel-hero");
    const img=el("div","kh-img");img.style.backgroundImage=`url("${kImg}")`;hero.appendChild(img);
    const cap=el("div","kh-cap");cap.innerHTML=`<div class="t">Toward Jerusalem</div><div class="s">${esc(loc.name||"")}</div>`;hero.appendChild(cap);
    stage.appendChild(hero);
  }else{
    const hero=el("div","kotel-art");
    hero.innerHTML=kotelArtSVG();
    const from=el("div","from");from.textContent="From "+(loc.name||"your location");
    hero.appendChild(from);
    stage.appendChild(hero);
  }

  const wrap=el("div","compass-wrap");
  if(atKotel){
    const msg=el("div","");msg.style.cssText="text-align:center;padding:2rem 1rem";
    msg.innerHTML=`<div style="font-family:var(--hebrew);font-size:2rem;color:var(--accent);margin-bottom:.5rem">\u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05E4\u05B9\u05D4</div><div style="color:var(--ink2)">You're at the Western Wall. Face the Wall to pray.</div>`;
    wrap.appendChild(msg);stage.appendChild(wrap);return;
  }
  /* compass dial */
  const comp=el("div","compass");
  comp.innerHTML=`<div class="ring"></div><div class="ring2"></div>
    <div class="cdial" id="kCard">
      <div class="lbl n">N</div><div class="lbl s">S</div><div class="lbl e">E</div><div class="lbl w">W</div>
    </div>
    <svg class="star" viewBox="0 0 100 100" fill="none" stroke="color-mix(in srgb,var(--accent) 55%,transparent)" stroke-width="2"><path d="M50 14 L61 40 L88 40 L66 57 L74 84 L50 68 L26 84 L34 57 L12 40 L39 40 Z"/></svg>
    <div class="needle" id="kNeedle"><div class="head"></div><div class="arm"></div></div>
    <div class="hub"></div>`;
  wrap.appendChild(comp);
  const readout=el("div","kotel-readout");readout.innerHTML=`<div class="city">${esc(loc.name||"")} \u2192 Jerusalem</div><div class="deg" id="kDeg">${Math.round(bearing)}\u00B0</div>`;
  wrap.appendChild(readout);
  const note=el("div","kotel-note");note.id="kNote";note.textContent="Point the top of your phone north; the arrow turns toward the Western Wall.";
  wrap.appendChild(note);
  const enable=el("button","btn-ghost");enable.style.cssText="margin:.8rem auto 0;display:block";enable.textContent="Use live compass";
  wrap.appendChild(enable);
  stage.appendChild(wrap);

  const needle=()=>document.getElementById("kNeedle");
  const card=()=>document.getElementById("kCard");
  let heading=0; /* device heading (deg from north) */
  const paint=()=>{
    const n=needle();if(!n)return;
    /* needle points to (bearing - heading): when phone faces north, points at bearing */
    n.style.transform=`translate(-50%,-50%) rotate(${(bearing-heading+360)%360}deg)`;
    const c=card();if(c)c.style.transform=`rotate(${(-heading+360)%360}deg)`;
  };
  paint();
  function onOrient(e){
    let hd=null;
    if(e.webkitCompassHeading!=null)hd=e.webkitCompassHeading; /* iOS: degrees from north, clockwise */
    else if(e.alpha!=null)hd=360-e.alpha; /* Android approximation */
    if(hd!=null){heading=hd;paint();const note=document.getElementById("kNote");if(note)note.textContent="Live compass on \u2014 turn until the arrow points straight up.";}
  }
  const start=async()=>{
    try{
      if(typeof DeviceOrientationEvent!=="undefined"&&typeof DeviceOrientationEvent.requestPermission==="function"){
        const p=await DeviceOrientationEvent.requestPermission();
        if(p!=="granted"){toast("Compass permission denied");return;}
      }
      if(_kotelHandler)window.removeEventListener("deviceorientation",_kotelHandler);
      _kotelHandler=onOrient;
      window.addEventListener("deviceorientationabsolute",onOrient,true);
      window.addEventListener("deviceorientation",onOrient,true);
      enable.textContent="Live compass on";enable.disabled=true;enable.style.opacity=".6";
      haptic();
    }catch(err){toast("Compass not available on this device");}
  };
  enable.onclick=start;
}
/* Short, practical explanations for each zman — opened by tapping a zman row. */
const ZMAN_INFO={
  alot:{what:"Alot HaShachar — the first light of dawn, when the eastern sky begins to brighten (~72 minutes before sunrise).",do:"The earliest one may put on tallit & tefillin and say Shema in pressing circumstances; most wait for later."},
  netz:{what:"HaNetz HaChamah — sunrise, when the sun's edge appears on the horizon.",do:"The ideal moment to begin the Shacharit Amidah (k'vatikin, praying with sunrise)."},
  shma:{what:"Sof Zman Kriat Shema — the latest time to recite the morning Shema (end of the 3rd halachic hour).",do:"Finish saying Shema with its blessings before this time."},
  tefila:{what:"Sof Zman Tefillah — the latest time to pray the Shacharit Amidah (end of the 4th halachic hour).",do:"Complete the morning Amidah before this time."},
  chatzot:{what:"Chatzot — solar midday, the midpoint between sunrise and sunset.",do:"Latest time for Shacharit if missed (b'dieved); Mincha may not be said until just after."},
  minchaG:{what:"Mincha Gedolah — the earliest time to pray Mincha (½ halachic hour after midday).",do:"You may daven Mincha from now until sunset."},
  minchaK:{what:"Mincha Ketana — the preferred later time for Mincha (2½ halachic hours before nightfall).",do:"The ideal, unhurried window to daven Mincha before evening."},
  plag:{what:"Plag HaMincha — 1¼ halachic hours before nightfall.",do:"The earliest one may accept Shabbat early or daven Maariv (following Rabbi Yehuda)."},
  shkia:{what:"Shkiat HaChamah — sunset, when the sun dips below the horizon; twilight (bein hashmashot) begins.",do:"The deadline for Mincha and for finishing a daytime mitzvah."},
  tzeit:{what:"Tzeit HaKochavim — nightfall, when three medium stars are visible (~45–72 min after sunset).",do:"The new Hebrew day begins: time for Maariv, the evening Shema, and Shabbat/holiday end."},
};
function openZmanInfo(k,en,he,t){
  const info=ZMAN_INFO[k]||{what:"",do:""};
  const old=$("#zmanInfo");if(old)old.remove();
  const ov=el("div","");ov.id="zmanInfo";ov.style.cssText="position:fixed;inset:0;z-index:140;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center";
  const card=el("div","");card.style.cssText="background:var(--surface);border:1px solid var(--line);border-top-left-radius:1rem;border-top-right-radius:1rem;width:100%;max-width:560px;max-height:82vh;overflow-y:auto;padding:1.3rem 1.3rem 2rem";
  card.innerHTML=`<div style="display:flex;align-items:baseline;gap:.6rem;margin-bottom:.15rem"><div style="font-family:var(--display);font-size:1.3rem;font-weight:600;color:var(--ink)">${esc(en)}</div><div style="font-family:var(--hebrew);direction:rtl;color:var(--accent);font-size:1.05rem">${esc(he)}</div></div><div style="font-family:var(--mono);color:var(--accent);font-size:1rem;margin-bottom:1rem">${hmFmt(t)}</div><div style="font-size:.6rem;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:.25rem">What it is</div><div style="font-size:.95rem;color:var(--ink2);line-height:1.65;margin-bottom:1rem">${esc(info.what)}</div><div style="font-size:.6rem;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:.25rem">What you do</div><div style="font-size:.95rem;color:var(--ink2);line-height:1.65;margin-bottom:1.3rem">${esc(info.do)}</div><button class="btn-primary" id="zmanInfoClose" style="width:100%">Close</button>`;
  ov.appendChild(card);document.body.appendChild(ov);
  ov.onclick=(e)=>{if(e.target===ov)ov.remove();};
  $("#zmanInfoClose").onclick=()=>ov.remove();
}
function renderZmanim(stage){
  const now=new Date();const tz=tzForLoc(state.loc);
  const head=el("div","svc-head");head.innerHTML=`<span class="en">Zmanim</span><span class="he">\u05D6\u05B0\u05DE\u05B7\u05E0\u05B4\u05BC\u05D9\u05DD</span>`;stage.appendChild(head);
  const sub=el("div","svc-sub");try{sub.textContent=`${state.loc.name} \u00B7 ${new Intl.DateTimeFormat("en-US",{timeZone:tz,weekday:"long",month:"long",day:"numeric"}).format(now)}`;}catch(e){sub.textContent=state.loc.name;}stage.appendChild(sub);

  /* location switcher */
  const bar=el("div","nusach-bar");
  const togg=el("button","mini-select");togg.innerHTML=`<svg class="icon ic" viewBox="0 0 24 24" style="width:1em;height:1em"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span>Change location</span><svg class="icon" viewBox="0 0 24 24" style="width:.9em;height:.9em"><path d="M6 9l6 6 6-6"/></svg>`;
  bar.appendChild(togg);stage.appendChild(bar);
  const picker=el("div","");picker.style.cssText="display:none;margin-bottom:1rem";stage.appendChild(picker);
  let pickerBuilt=false;
  togg.onclick=()=>{const showing=picker.style.display!=="none";if(showing){picker.style.display="none";}else{picker.style.display="block";if(!pickerBuilt){locationPicker(picker,()=>render());pickerBuilt=true;}}};

  const clock=el("div");clock.style.cssText="display:flex;align-items:center;justify-content:space-between;padding:.75rem 1rem;background:color-mix(in srgb,var(--accent) 6%,transparent);border:1px solid color-mix(in srgb,var(--accent) 18%,transparent);border-radius:.55rem;margin-bottom:1.2rem;font-family:var(--mono);font-variant-numeric:tabular-nums";
  function paintClock(){try{const h12=(state.timeFmt||"12")!=="24";const t=new Intl.DateTimeFormat("en-US",{timeZone:tz,hour:"numeric",minute:"2-digit",second:"2-digit",hour12:h12}).format(new Date());clock.innerHTML=`<span style="color:var(--muted);font-family:var(--sans);font-size:.66rem;letter-spacing:.18em;text-transform:uppercase">Local time</span><span style="color:var(--accent);font-weight:500;font-size:1rem">${t}</span>`;}catch(e){}}
  paintClock();stage.appendChild(clock);

  const z=computeZmanim(now,state.loc);
  if(!z){stage.appendChild(el("div","note","Could not compute zmanim for this location."));return;}
  const nm=nowInLocTz(state.loc);
  const Z=[["alot","Dawn","\u05E2\u05B2\u05DC\u05D5\u05B9\u05EA \u05D4\u05B7\u05E9\u05B7\u05BC\u05D7\u05B7\u05E8"],["netz","Sunrise","\u05D4\u05B8\u05E0\u05B5\u05E5 \u05D4\u05B7\u05D7\u05B7\u05DE\u05B8\u05BC\u05D4"],["shma","Latest Shema","\u05E1\u05D5\u05B9\u05E3 \u05D6\u05B0\u05DE\u05B7\u05DF \u05E9\u05B0\u05C1\u05DE\u05B7\u05E2"],["tefila","Latest Shacharit","\u05E1\u05D5\u05B9\u05E3 \u05D6\u05B0\u05DE\u05B7\u05DF \u05EA\u05B0\u05E4\u05B4\u05DC\u05B8\u05BC\u05D4"],["chatzot","Midday","\u05D7\u05B2\u05E6\u05D5\u05B9\u05EA \u05D4\u05B7\u05D9\u05D5\u05B9\u05DD"],["minchaG","Earliest Mincha","\u05DE\u05B4\u05E0\u05B0\u05D7\u05B8\u05D4 \u05D2\u05B0\u05BC\u05D3\u05D5\u05B9\u05DC\u05B8\u05D4"],["minchaK","Mincha Ketana","\u05DE\u05B4\u05E0\u05B0\u05D7\u05B8\u05D4 \u05E7\u05B0\u05D8\u05B7\u05E0\u05B8\u05BC\u05D4"],["plag","Plag HaMincha","\u05E4\u05B0\u05BC\u05DC\u05B7\u05D2 \u05D4\u05B7\u05DE\u05B4\u05E0\u05B0\u05D7\u05B8\u05D4"],["shkia","Sunset","\u05E9\u05B0\u05C1\u05E7\u05B4\u05D9\u05E2\u05B7\u05EA \u05D4\u05B7\u05D7\u05B7\u05DE\u05B8\u05BC\u05D4"],["tzeit","Nightfall","\u05E6\u05B5\u05D0\u05EA \u05D4\u05B7\u05DB\u05D5\u05B9\u05DB\u05B8\u05D1\u05B4\u05D9\u05DD"]];
  const next=Z.map(([k,en,he])=>({k,en,he,t:z[k]})).find(x=>x.t!=null&&x.t>nm);
  Z.forEach(([k,en,he])=>{const isNext=next&&next.k===k;const row=el("button");row.style.cssText=`display:flex;justify-content:space-between;align-items:center;gap:.6rem;width:100%;text-align:left;cursor:pointer;background:transparent;font:inherit;padding:.95rem 0;border:0;border-bottom:1px solid var(--line);${isNext?'background:color-mix(in srgb,var(--accent) 8%,transparent);border-radius:.6rem;padding:.95rem 1rem;border-bottom:0;border:1px solid color-mix(in srgb,var(--accent) 25%,transparent);margin:.3rem 0':''}`;row.innerHTML=`<div style="flex:1"><div style="font-family:var(--display);font-weight:500;font-size:1rem;color:var(--ink)">${esc(en)}${isNext?' <span style="font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);font-weight:600;margin-left:.4rem">NEXT</span>':''}</div><div style="color:var(--muted);font-family:var(--hebrew);direction:rtl;font-size:.95rem;margin-top:.18rem">${esc(he)}</div></div><div style="display:flex;align-items:center;gap:.5rem"><div style="font-family:var(--mono);font-size:1.1rem;color:var(--accent);font-weight:500;font-variant-numeric:tabular-nums">${hmFmt(z[k])}</div><svg class="icon" viewBox="0 0 24 24" style="width:1.05em;height:1.05em;color:var(--muted);flex:none"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg></div>`;row.onclick=()=>openZmanInfo(k,en,he,z[k]);stage.appendChild(row);});
  if(window.__zmInt)clearInterval(window.__zmInt);window.__zmInt=setInterval(()=>{if(state.view==="zmanim")paintClock();else{clearInterval(window.__zmInt);window.__zmInt=null;}},1000);
}

/* ====== SHEETS, LIBRARY, SEARCH ====== */
function closeSheet(id){$("#"+id).classList.remove("show");}
/* ====== PRINTABLE BOOKLET (download / print, offline) ======
   Generates a clean 5.5x8.5 booklet in a new window, sized for printing.
   The user saves as PDF or prints "2-up, fold" for a folded booklet. */
function openPrintDialog(){
  const sheet=$("#printSheet");
  if(sheet){sheet.classList.add("show");return;}
  const ov=el("div","sheet");ov.id="printSheet";
  const body=el("div","sheet-body");
  body.innerHTML=`<div class="sheet-head"><h2>Print a Siddur</h2><button class="sheet-close" data-close="printSheet"><svg class="icon" viewBox="0 0 24 24"><path d="M6 6l12 12M6 18L18 6"/></svg></button></div>`;
  const c=el("div","sheet-content");
  c.innerHTML=`<div class="note">Build a print-ready booklet from the prayers in the app. It opens in a new tab where you can <b>Save as PDF</b> or print. For a folded booklet, choose <b>two pages per sheet</b> (or your printer's booklet mode) and fold.</div>`;
  /* which services */
  const svcWrap=el("div","field");svcWrap.innerHTML=`<label>Include</label>`;
  const svcGrid=el("div","");svcGrid.style.cssText="display:flex;flex-wrap:wrap;gap:.45rem";
  const PRINTABLE=SERVICES.concat(typeof OCC_SERVICES!=="undefined"?OCC_SERVICES:[]);
  const chosen=new Set(["maariv","shacharit","mincha"]);
  PRINTABLE.forEach(s=>{
    const b=el("button","");const on=()=>chosen.has(s.id);
    const paint=()=>{b.style.cssText="padding:.45rem .75rem;border-radius:.5rem;font-size:.82rem;font-weight:600;cursor:pointer;font-family:var(--sans);border:1px solid "+(on()?"var(--accent)":"var(--line)")+";background:"+(on()?"color-mix(in srgb,var(--accent) 14%,transparent)":"var(--surface2)")+";color:"+(on()?"var(--accent)":"var(--ink2)");};
    b.innerHTML=`<span>${esc(s.en)}</span>`;paint();
    b.onclick=()=>{if(chosen.has(s.id))chosen.delete(s.id);else chosen.add(s.id);paint();};
    svcGrid.appendChild(b);
  });
  svcWrap.appendChild(svcGrid);c.appendChild(svcWrap);
  /* layout */
  let layout="he_en";
  const layWrap=el("div","field");layWrap.innerHTML=`<label>Text layout</label>`;
  const laySeg=el("div","seg");
  [["he","Hebrew only"],["he_tr","Hebrew + transliteration"],["he_en","Hebrew + English"],["all","All three"]].forEach(([v,lbl])=>{
    const b=el("button",layout===v?"on":"");b.textContent=lbl;b.onclick=()=>{layout=v;[...laySeg.children].forEach(x=>x.classList.remove("on"));b.classList.add("on");};laySeg.appendChild(b);
  });
  layWrap.appendChild(laySeg);c.appendChild(layWrap);
  /* size */
  let fmt="booklet";
  const fmtWrap=el("div","field");fmtWrap.innerHTML=`<label>Page format</label>`;
  const fmtSeg=el("div","seg");
  [["booklet","Half-page booklet (5.5\u00D78.5)"],["letter","Full page (Letter/A4)"]].forEach(([v,lbl])=>{
    const b=el("button",fmt===v?"on":"");b.textContent=lbl;b.onclick=()=>{fmt=v;[...fmtSeg.children].forEach(x=>x.classList.remove("on"));b.classList.add("on");};fmtSeg.appendChild(b);
  });
  fmtWrap.appendChild(fmtSeg);c.appendChild(fmtWrap);
  /* generate */
  const gen=el("button","btn-primary");gen.style.cssText="width:100%;margin-top:.4rem";gen.textContent="Build & open print view";
  gen.onclick=()=>{
    const ids=PRINTABLE.filter(s=>chosen.has(s.id)).map(s=>s.id);
    if(!ids.length){toast("Choose at least one service");return;}
    buildBooklet(ids,layout,fmt);
  };
  c.appendChild(gen);
  c.appendChild(el("div","note","Tip: a Shabbos booklet will include the Shabbos versions as they're added to the app. Right now it prints the prayers currently in your siddur for the chosen services and nusach ("+esc(NUSACH_LABELS[state.nusach])+")."));
  body.appendChild(c);ov.appendChild(body);document.body.appendChild(ov);
  ov.querySelector("[data-close]").onclick=()=>ov.classList.remove("show");
  ov.classList.add("show");
}

function buildBooklet(svcIds,layout,fmt){
  const showHe=true, showTr=(layout==="he_tr"||layout==="all"), showEn=(layout==="he_en"||layout==="all");
  const pageCss = fmt==="booklet" ? "@page{size:5.5in 8.5in;margin:0.5in 0.55in}" : "@page{size:letter;margin:0.85in 0.9in}";
  const baseHe = fmt==="booklet" ? 15 : 18;
  let html=`<!doctype html><html lang="he"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Siddur \u2014 Print</title>
<link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500;700&family=Cormorant+Garamond:wght@500;600&display=swap" rel="stylesheet">
<style>
${pageCss}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:#1a1208}
body{font-family:"Cormorant Garamond",Georgia,serif}
.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:90vh;page-break-after:always}
.cover .t1{font-size:14pt;letter-spacing:.3em;text-transform:uppercase;color:#8a6429;margin-bottom:.4rem}
.cover .t2{font-family:"Frank Ruhl Libre",serif;font-size:34pt;font-weight:700;color:#6b2a1c;margin:.2rem 0}
.cover .t3{font-size:12pt;color:#555;font-style:italic;margin-top:.6rem}
.cover .rule{width:42%;height:2px;background:linear-gradient(90deg,transparent,#c79a4e,transparent);margin:1rem 0}
h2.svc{font-family:"Frank Ruhl Libre",serif;font-size:${fmt==="booklet"?"19pt":"23pt"};color:#6b2a1c;text-align:center;border-bottom:2px solid #c79a4e;padding-bottom:.25rem;margin:0 0 .8rem;page-break-before:always}
h2.svc .en{display:block;font-family:"Cormorant Garamond",serif;font-size:.62em;color:#8a6429;letter-spacing:.15em;text-transform:uppercase}
h3.sec{font-size:${fmt==="booklet"?"11pt":"13pt"};letter-spacing:.12em;text-transform:uppercase;color:#9c6b3f;margin:1rem 0 .4rem;border-left:3px solid #c79a4e;padding-left:.5rem}
.pr{margin:0 0 .9rem;page-break-inside:avoid}
.pr .ttl{display:flex;justify-content:space-between;align-items:baseline;border-bottom:.5px solid #ddd2b8;margin-bottom:.35rem;padding-bottom:.12rem}
.pr .ttl .en{font-size:${fmt==="booklet"?"9.5pt":"11pt"};color:#8a6429;font-weight:600}
.pr .ttl .he{font-family:"Frank Ruhl Libre",serif;font-size:${fmt==="booklet"?"12pt":"14pt"};color:#6b2a1c;font-weight:700;direction:rtl}
.he{font-family:"Frank Ruhl Libre",serif;direction:rtl;text-align:right;font-size:${baseHe}pt;line-height:1.85;color:#1a1208;margin:.15rem 0}
.tr{font-style:italic;color:#7a6a4a;font-size:${fmt==="booklet"?"9pt":"10.5pt"};line-height:1.4;margin:.1rem 0}
.en{color:#33291a;font-size:${fmt==="booklet"?"9.5pt":"11pt"};line-height:1.45;margin:.1rem 0 .3rem}
.rubric{font-style:italic;color:#7a6a4a;font-size:${fmt==="booklet"?"8.5pt":"10pt"};text-align:center;margin:.3rem 0;padding:0 .5rem}
.foot{text-align:center;color:#aaa;font-size:8pt;margin-top:2rem;page-break-before:always}
@media screen{body{max-width:5.6in;margin:0 auto;box-shadow:0 0 0 100vmax #eee;background:#fff;padding:.4in}.print-bar{position:fixed;top:0;left:0;right:0;background:#1a1208;color:#f0e6d2;padding:.6rem;text-align:center;font-family:system-ui,sans-serif;font-size:13px;z-index:9}.print-bar button{background:#d4a854;color:#1a1208;border:0;border-radius:5px;padding:.4rem .9rem;font-weight:700;cursor:pointer;margin-left:.5rem}body{margin-top:3rem}}
@media print{.print-bar{display:none}}
</style></head><body>
<div class="print-bar">Booklet ready \u2014 <span style="opacity:.8">to fold: print 2 pages per sheet, double-sided, flip on short edge</span><button onclick="window.print()">Print / Save PDF</button></div>
<div class="cover"><div class="t1">The Super Siddur</div><div class="rule"></div><div class="t2">\u05E1\u05B4\u05D3\u05BC\u05D5\u05BC\u05E8</div><div class="t1" style="font-size:10pt">${esc(NUSACH_LABELS[state.nusach]||"")}</div><div class="t3">${esc(state.userEngName||state.userHebName||"")}</div></div>`;

  const escH=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  svcIds.forEach(sid=>{
    const svc=svcById(sid);if(!svc)return;
    const prayers=orderedPrayers(sid);
    if(!prayers.length)return;
    html+=`<h2 class="svc"><span class="he">${escH(svc.he)}</span><span class="en">${escH(svc.en)}</span></h2>`;
    let lastSec=null;
    prayers.forEach(pr=>{
      if(pr.section&&pr.section!==lastSec){html+=`<h3 class="sec">${escH(pr.section)}</h3>`;lastSec=pr.section;}
      html+=`<div class="pr">`;
      if(pr.en||pr.he)html+=`<div class="ttl"><span class="en">${escH(pr.en||"")}</span><span class="he">${escH(pr.he||"")}</span></div>`;
      (pr.blocks||[]).forEach(b=>{
        if(b.k==="rubric"){if(b.text)html+=`<div class="rubric">${escH(b.text)}</div>`;return;}
        if(showHe&&b.he)html+=`<div class="he">${escH(b.he)}</div>`;
        if(showTr&&b.tr)html+=`<div class="tr">${escH(b.tr)}</div>`;
        if(showEn&&b.en)html+=`<div class="en">${escH(b.en)}</div>`;
      });
      html+=`</div>`;
    });
  });
  html+=`<div class="foot">Generated by The Super Siddur \u00B7 ${escH(NUSACH_LABELS[state.nusach]||"")}</div></body></html>`;

  const w=window.open("","_blank");
  if(!w){toast("Allow pop-ups to open the print view");return;}
  w.document.open();w.document.write(html);w.document.close();
  if($("#printSheet"))$("#printSheet").classList.remove("show");
}

function openLib(){
  const body=$("#libBody");body.innerHTML="";
  const s=el("div","lib-search");s.innerHTML=`<input id="libQ" placeholder="Search the siddur\u2026">`;body.appendChild(s);
  const grp=(label)=>{const l=el("div","lib-group-label");l.textContent=label;body.appendChild(l);};
  const it=(en,he,cb)=>{const b=el("button","lib-item");b.innerHTML=`<span class="lib-en">${esc(en)}</span><span class="lib-he">${esc(he)}</span>`;b.onclick=cb;body.appendChild(b);};
  /* Print a booklet */
  const pb=el("button","lib-item");pb.style.cssText="border:1px solid color-mix(in srgb,var(--accent) 35%,transparent);background:color-mix(in srgb,var(--accent) 8%,transparent);margin-bottom:.6rem";
  pb.innerHTML=`<span class="lib-en" style="display:flex;align-items:center;gap:.5rem;color:var(--accent)"><svg class="icon" viewBox="0 0 24 24" style="width:1.1em;height:1.1em"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>Print a Siddur</span><span class="lib-he" style="color:var(--accent)">\u05DC\u05B0\u05D4\u05B7\u05D3\u05B0\u05E4\u05B4\u05BC\u05D9\u05E1</span>`;
  pb.onclick=()=>{closeSheet("libSheet");openPrintDialog();};body.appendChild(pb);
  grp("Daily Prayers");["shacharit","mincha","maariv","birkat","krias"].forEach(sid=>{const s=SERVICES.find(x=>x.id===sid);if(s)it(s.en,s.he,()=>{closeSheet("libSheet");go("service",s.id);});});
  grp("Everyday Occasions");["travel","brachot"].forEach(sid=>{const s=SERVICES.find(x=>x.id===sid);if(s)it(s.en,s.he,()=>{closeSheet("libSheet");go("service",s.id);});});
  if(typeof OCC_SERVICES!=="undefined"){
    const hol=OCC_SERVICES.filter(s=>(s.cat||"occasion")==="holiday"&&!s.noList);
    const occ=OCC_SERVICES.filter(s=>(s.cat||"occasion")==="occasion"&&!s.noList);
    if(hol.length){grp("Holidays");hol.forEach(s=>it(s.en,s.he,()=>{closeSheet("libSheet");go("service",s.id);}));}
    if(occ.length){grp("Occasions");occ.forEach(s=>it(s.en,s.he,()=>{closeSheet("libSheet");go("service",s.id);}));}
  }
  grp("Tehillim");it("Tehillim","\u05EA\u05B0\u05BC\u05D4\u05B4\u05DC\u05B4\u05BC\u05D9\u05DD",()=>{closeSheet("libSheet");go("tehillim");});
  grp("Personal");it("Zmanim","\u05D6\u05B0\u05DE\u05B7\u05E0\u05B4\u05BC\u05D9\u05DD",()=>{closeSheet("libSheet");go("zmanim");});it("Today","\u05D4\u05B7\u05D9\u05BC\u05D5\u05B9\u05DD",()=>{closeSheet("libSheet");go("home");});
  if(window.SCANS&&window.SCANS.length){
    grp("Your Scanned Siddur \u00B7 Original Pages");
    let curNus=null;
    window.SCANS.forEach(d=>{
      if(d.nusach!==curNus){curNus=d.nusach;const sub=el("div","lib-group-label");sub.style.cssText="font-size:.62rem;opacity:.7;padding-top:.5rem";sub.textContent=d.nusach;body.appendChild(sub);}
      const b=el("button","lib-item");b.innerHTML=`<span class="lib-en">${esc(d.service)} <span style="color:var(--muted);font-weight:400;font-size:.8em">(${d.pages.length} pages)</span></span><span class="lib-he">${esc(d.nusach)}</span>`;b.onclick=()=>{closeSheet("libSheet");openScanDoc(d.id);};body.appendChild(b);
    });
  }
  $("#libQ").addEventListener("input",e=>{const q=e.target.value.toLowerCase().trim();body.querySelectorAll(".lib-item").forEach(i=>{i.style.display=(!q||i.textContent.toLowerCase().includes(q))?"flex":"none";});});
  $("#libSheet").classList.add("show");
}
function openSearch(){$("#searchSheet").classList.add("show");setTimeout(()=>$("#searchInput").focus(),100);$("#searchInput").value="";paintSearch("");}
function paintSearch(q){
  const r=$("#searchResults");r.innerHTML="";
  if(!q.trim()){r.innerHTML=`<div style="text-align:center;color:var(--muted);padding:1.5rem;font-size:.9rem">Start typing to search prayers, sections, and verses.</div>`;return;}
  const ql=q.toLowerCase();const matches=[];
  const SRC=Object.assign({},PRAYERS,(typeof OCC_PRAYERS!=="undefined"?OCC_PRAYERS:{}));
  Object.entries(SRC).forEach(([svcId,prayers])=>{prayers.forEach(pr=>{const all=pr.en+" "+pr.he+" "+(pr.section||"");if(all.toLowerCase().includes(ql))matches.push({type:"prayer",svcId,prayer:pr});pr.blocks.forEach(b=>{if(b.k!=="p")return;const t=(b.he||"")+" "+(b.tr||"")+" "+(b.en||"");if(t.toLowerCase().includes(ql))matches.push({type:"block",svcId,prayer:pr,block:b});});});});
  if(!matches.length){r.innerHTML=`<div style="text-align:center;color:var(--muted);padding:1.5rem;font-size:.9rem">No matches for "${esc(q)}".</div>`;return;}
  matches.slice(0,30).forEach(m=>{const c=el("button","card");c.style.marginBottom=".5rem";const svc=svcById(m.svcId)||{en:''};if(m.type==="prayer"){c.innerHTML=`<div class="icon-wrap"><svg class="icon" viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg></div><div class="body"><div class="title">${esc(m.prayer.en)}</div><div class="sub">${esc(svc.en)} \u00B7 ${esc(m.prayer.section||"Main")}</div></div><div class="he">${esc(m.prayer.he)}</div><div class="arr">\u2192</div>`;}else{const sn=(m.block.en||m.block.he||"").substring(0,80);c.innerHTML=`<div class="icon-wrap"><svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg></div><div class="body"><div class="title">${esc(m.prayer.en)}</div><div class="sub">${esc(svc.en)} \u00B7 ${esc(sn)}...</div></div><div class="arr">\u2192</div>`;}c.onclick=()=>{closeSheet("searchSheet");go("service",m.svcId+"#"+m.prayer.id);};r.appendChild(c);});
}

/* ====== ADMIN / SETTINGS ====== */
let admTab="profile";
