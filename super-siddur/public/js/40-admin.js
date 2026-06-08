"use strict";
/* Settings/admin panel + per-nusach prayer editor */
function openAdmin(){admTab="profile";paintAdmin();$("#admSheet").classList.add("show");}
function paintAdmin(){
  const body=$("#admBody");body.innerHTML="";
  const tabs=el("div","tabs");
  [["profile","Profile"],["display","Display"],["people","Pray For"],["reminders","Reminders"],["inserts","Insertions"],["nusachloc","Nusach & Location"],["arrange","Edit"],["content","Content"],["splash","Splash"],["icons","Icons"],["admins","Admins"]].forEach(([k,lbl])=>{
    const b=el("button",admTab===k?"on":"");b.textContent=lbl;b.onclick=()=>{admTab=k;paintAdmin();};tabs.appendChild(b);
  });
  body.appendChild(tabs);
  const wrap=el("div","");body.appendChild(wrap);
  if(admTab==="profile")admProfile(wrap);
  else if(admTab==="display")admDisplay(wrap);
  else if(admTab==="nusachloc")admNusachLoc(wrap);
  else if(admTab==="people")admPeople(wrap);
  else if(admTab==="reminders")admReminders(wrap);
  else if(admTab==="inserts")admInserts(wrap);
  else if(admTab==="arrange")admArrange(wrap);
  else if(admTab==="content")admContent(wrap);
  else if(admTab==="splash")admSplash(wrap);
  else if(admTab==="icons")admIcons(wrap);
  else if(admTab==="admins")admAdmins(wrap);
}
function admProfile(w){
  w.appendChild(el("div","note","Your name personalizes greetings, and your Hebrew birthday powers the birthday-psalm feature and age display."));
  const fe=el("div","field");fe.innerHTML=`<label>English name</label><input id="apEng" value="${esc(state.userEngName||"")}" placeholder="e.g. David">`;w.appendChild(fe);
  const fh=el("div","field hebrew");fh.innerHTML=`<label>Hebrew name</label><input id="apHeb" value="${esc(state.userHebName||"")}" placeholder="\u05D3\u05B8\u05D5\u05B4\u05D3">`;w.appendChild(fh);
  const fb=el("div","field");const g=state.birthday&&state.birthday.gregYMD?state.birthday.gregYMD:"";fb.innerHTML=`<label>Birthday (Gregorian date)</label><input id="apBday" type="date" value="${esc(g)}">`;w.appendChild(fb);
  const prev=el("div","note");prev.id="apHebBday";if(state.birthday){prev.textContent=`Hebrew birthday: ${gematria(state.birthday.day)} ${monthHe(state.birthday.month,state.birthday.year)} \u2014 Hebrew age ${computeHebAge(state.birthday)}`;}else{prev.textContent="No birthday set.";}w.appendChild(prev);
  $("#apEng").addEventListener("input",e=>{state.userEngName=e.target.value;saveState();});
  $("#apHeb").addEventListener("input",e=>{state.userHebName=e.target.value;saveState();});
  $("#apBday").addEventListener("input",e=>{if(!e.target.value){state.birthday=null;saveState();$("#apHebBday").textContent="No birthday set.";return;}const[y,m,d]=e.target.value.split("-").map(Number);const h=gregToHeb(y,m,d);h.gregYMD=e.target.value;state.birthday=h;saveState();$("#apHebBday").textContent=`Hebrew birthday: ${gematria(h.day)} ${monthHe(h.month,h.year)} \u2014 Hebrew age ${computeHebAge(h)}`;});
  /* Gender — drives gendered blessings */
  const pickRow=(opts,curVal,onPick)=>{const r=el("div","");r.style.cssText="display:flex;gap:.5rem;flex-wrap:wrap;margin:.3rem 0";opts.forEach(([v,l])=>{const on=curVal===v;const b=el("button","");b.style.cssText="padding:.5rem .9rem;border-radius:.5rem;font-size:.85rem;font-weight:600;cursor:pointer;font-family:var(--sans);border:1px solid "+(on?"var(--accent)":"var(--line)")+";background:"+(on?"color-mix(in srgb,var(--accent) 14%,transparent)":"var(--surface2)")+";color:"+(on?"var(--accent)":"var(--ink2)");b.textContent=l;b.onclick=()=>onPick(v);r.appendChild(b);});return r;};
  const gh=el("div","");gh.style.cssText="font-family:var(--display);font-size:1.05rem;font-weight:600;color:var(--ink);margin:1.4rem 0 .3rem";gh.textContent="Gender";w.appendChild(gh);
  w.appendChild(el("div","note","Sets gendered blessings — men say שֶּלֹּא עָשַׂנִי אִשָּׁה, women say שֶעָשַׂנִי כִּרְצוֹנוֹ. Leave unset to show both."));
  w.appendChild(pickRow([["male","Man"],["female","Woman"],["","Prefer not to say"]],state.gender||"",v=>{state.gender=v;saveState();paintAdmin();if(typeof render==="function")render();}));

  /* Custom audiences — membership + (admin) definitions */
  const defs=state.audienceDefs||[];
  const ah=el("div","");ah.style.cssText="font-family:var(--display);font-size:1.05rem;font-weight:600;color:var(--ink);margin:1.2rem 0 .3rem";ah.textContent="Audiences";w.appendChild(ah);
  w.appendChild(el("div","note","Custom groups (e.g. Kohen, Levi, Mourner). Tick the ones that apply to you; content and icons tagged to a group appear only for its members."));
  if(defs.length){const arow=el("div","");arow.style.cssText="display:flex;gap:.5rem;flex-wrap:wrap;margin:.3rem 0";defs.forEach(d=>{const on=!!(state.audiences&&state.audiences[d.key]);const b=el("button","");b.style.cssText="padding:.5rem .9rem;border-radius:.5rem;font-size:.85rem;font-weight:600;cursor:pointer;font-family:var(--sans);border:1px solid "+(on?"var(--accent)":"var(--line)")+";background:"+(on?"color-mix(in srgb,var(--accent) 14%,transparent)":"var(--surface2)")+";color:"+(on?"var(--accent)":"var(--ink2)");b.textContent=d.label||d.key;b.onclick=()=>{state.audiences=Object.assign({},state.audiences);state.audiences[d.key]=!on;saveState();paintAdmin();if(typeof render==="function")render();};arow.appendChild(b);});w.appendChild(arow);}
  else{w.appendChild(el("div","note","No custom audiences defined yet."));}
  if(typeof hasPerm==="function"&&hasPerm("settings.edit")){
    w.appendChild(el("div","note","Admin: define audiences (published to everyone)."));
    defs.forEach((d,idx)=>{const r=el("div","");r.style.cssText="display:flex;align-items:center;gap:.5rem;margin:.2rem 0";r.innerHTML=`<span style="flex:1;font-size:.85rem"><b>${esc(d.label||d.key)}</b> <span style="color:var(--muted)">(${esc(d.key)})</span></span>`;const rm=el("button","arr-mini");rm.style.color="#d9534f";rm.textContent="✕";rm.onclick=()=>{state.audienceDefs=(state.audienceDefs||[]).filter((_,j)=>j!==idx);saveState();if(typeof publishAudiences==="function")publishAudiences();paintAdmin();};r.appendChild(rm);w.appendChild(r);});
    const f=el("div","field");f.style.marginTop=".4rem";const key=el("input");key.placeholder="key (e.g. kohen)";key.style.cssText="width:100%;margin-bottom:.3rem";const lbl=el("input");lbl.placeholder="label (e.g. Kohen)";lbl.style.cssText="width:100%;margin-bottom:.3rem";const add=el("button","btn-primary","Add audience");add.onclick=()=>{const k=key.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g,"");if(!k){toast("Enter a key");return;}const arr=(state.audienceDefs||[]).slice();if(arr.some(d=>d.key===k)){toast("Key already exists");return;}arr.push({key:k,label:lbl.value.trim()||k});state.audienceDefs=arr;saveState();if(typeof publishAudiences==="function")publishAudiences();paintAdmin();};f.appendChild(key);f.appendChild(lbl);f.appendChild(add);w.appendChild(f);
  }

  /* Install / offline */
  const ih=el("div","");ih.style.cssText="font-family:var(--display);font-size:1.05rem;font-weight:600;color:var(--ink);margin:1.4rem 0 .3rem";ih.textContent="Install & offline";w.appendChild(ih);
  const standalone=(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||window.navigator.standalone;
  if(standalone){
    w.appendChild(el("div","note","\u2713 Running as an installed app. The whole siddur \u2014 every prayer, psalm, and the zmanim \u2014 works fully offline. Only a few non-bundled Tehillim chapters need a connection the first time you open them."));
  } else {
    const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
    w.appendChild(el("div","note","This siddur runs entirely on your device \u2014 no account, no server. To keep it one tap away and full-screen, add it to your home screen:"));
    const steps=el("div","");steps.style.cssText="font-size:.85rem;color:var(--ink2);line-height:1.7;padding:.2rem .2rem .2rem .9rem";
    steps.innerHTML=ios
      ? "1. Tap the <b>Share</b> button in your browser<br>2. Choose <b>Add to Home Screen</b><br>3. Open it from the new icon \u2014 it launches full-screen and works offline."
      : "1. Open your browser menu (\u22EE)<br>2. Choose <b>Install app</b> or <b>Add to Home screen</b><br>3. Open it from the new icon \u2014 it launches full-screen and works offline.";
    w.appendChild(steps);
    w.appendChild(el("div","note","Everything except a handful of non-bundled Tehillim chapters already works with no signal. Once you open one of those online, it's saved for offline too."));
  }
}
function admInserts(w){
  w.appendChild(el("div","note","Rules that splice text into a prayer on matching days \u2014 like Mashiv HaRuach, Ya'aleh V'Yavo, or Al HaNissim. Each rule chooses the text, the day-condition, the service, the exact prayer it attaches to, and whether it goes before, after, or replaces that prayer's text. Built-in rules are editable; you can also add your own."));
  /* live preview of what's active today */
  const today=new Date();const todayActive=allInsertionRules().filter(r=>r.enabled!==false&&(!r.nusach||!r.nusach.length||r.nusach.includes(state.nusach))&&ruleMatches(r,today,state.israelMode));
  const tp=el("div","");tp.style.cssText="margin:.2rem 0 1rem;padding:.7rem .9rem;background:color-mix(in srgb,var(--accent) 7%,transparent);border:1px solid color-mix(in srgb,var(--accent) 18%,transparent);border-radius:.55rem";
  tp.innerHTML=`<div style="font-size:.58rem;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:.3rem">Active today</div>`+(todayActive.length?`<div style="font-size:.85rem;color:var(--ink2)">${todayActive.map(r=>esc(r.label)).join(" \u00B7 ")}</div>`:`<div style="font-size:.85rem;color:var(--muted)">No special insertions today.</div>`);
  w.appendChild(tp);
  /* add new */
  const add=el("button","");add.style.cssText="display:flex;align-items:center;justify-content:center;gap:.5rem;width:100%;margin-bottom:.8rem;padding:.75rem;background:transparent;border:1px dashed color-mix(in srgb,var(--accent) 50%,transparent);border-radius:.6rem;color:var(--accent);font-family:var(--sans);font-weight:600;font-size:.9rem;cursor:pointer";
  add.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:1.1em;height:1.1em"><path d="M12 5v14M5 12h14"/></svg> New insertion rule`;
  add.onclick=()=>openInsertRuleEditor(null);
  w.appendChild(add);
  /* list rules grouped by service */
  const rules=allInsertionRules();
  rules.forEach(r=>{
    const row=el("div","arr-row");row.style.alignItems="flex-start";
    const svcLbl=r.service?(svcById(r.service)?svcById(r.service).en:r.service):"All services";
    const condLbl=insertCondLabel(r.cond);
    row.innerHTML=`<div class="nm" style="flex:1"><b>${esc(r.label||"Untitled")}</b><small>${esc(svcLbl)} \u00B7 ${esc(prayerLabel(r.service,r.prayerId))} \u00B7 ${esc(condLbl)}${r.nusach&&r.nusach.length?" \u00B7 "+r.nusach.map(n=>NUSACH_LABELS[n]).join("/"):""}</small></div>`;
    const tog=el("button","switch"+(r.enabled!==false?" on":""));tog.style.flex="none";
    tog.onclick=()=>{const rr=Object.assign({},r,{enabled:r.enabled===false});saveInsertRule(rr);paintAdmin();};
    const ed=el("button","arr-mini sw");ed.style.cssText="padding:0 .55rem;color:var(--accent)";ed.textContent="Edit";ed.onclick=()=>openInsertRuleEditor(r);
    row.appendChild(tog);row.appendChild(ed);w.appendChild(row);
  });
}
function insertCondLabel(c){
  if(!c)return "always";
  const m={rosh_chodesh:"Rosh Chodesh",chanukah:"Chanukah",purim:"Purim",fast:"Fast days",winter:"Winter",summer:"Summer",rain_season:"Rain season",dry_season:"Dry season",shabbat:"Shabbat",weekday:"Weekday",always:"Every day"};
  let s=m[c.type]||c.type;
  if(c.type==="festival")s="Festival"+(c.fest&&c.fest!=="any"?" ("+c.fest.replace(/_/g," ")+")":"");
  if(c.type==="date_range")s=`${c.fromD}/${c.fromM}\u2013${c.toD}/${c.toM} (Heb)`;
  if(c.region)s+=" \u00B7 "+(c.region==="israel"?"Israel":"Diaspora");
  return s;
}
function prayerLabel(svcId,prayerId){
  if(!prayerId)return "(no prayer)";
  if(svcId){const p=allBasePrayers(svcId).find(x=>x.id===prayerId);if(p)return p.en||prayerId;}
  // search all services
  for(const s of allServices()){const p=allBasePrayers(s.id).find(x=>x.id===prayerId);if(p)return p.en||prayerId;}
  return prayerId;
}
function openInsertRuleEditor(rule){
  const isNew=!rule;
  const r=rule?JSON.parse(JSON.stringify(rule)):{id:"r"+Date.now(),label:"",enabled:true,nusach:null,service:null,prayerId:"",anchor:"end",cond:{type:"rosh_chodesh"},text:{he:"",tr:"",en:""}};
  const old=$("#insRuleEditor");if(old)old.remove();
  const ov=el("div","");ov.id="insRuleEditor";ov.style.cssText="position:fixed;inset:0;z-index:130;background:var(--bg);display:flex;flex-direction:column;overflow:hidden";
  const hd=el("div","");hd.style.cssText="flex:none;padding:1rem 1.1rem .8rem;border-bottom:1px solid var(--line);background:var(--surface);display:flex;align-items:center;gap:.6rem";
  hd.innerHTML=`<button id="irBack" style="background:transparent;border:0;color:var(--muted);cursor:pointer;display:flex;align-items:center;gap:.3rem;font-size:.85rem"><svg class="icon" viewBox="0 0 24 24" style="width:1.1em;height:1.1em"><path d="M15 18l-6-6 6-6"/></svg> Back</button><div style="flex:1;text-align:center;font-family:var(--display);font-weight:600;color:var(--ink)">${isNew?"New Rule":"Edit Rule"}</div><button id="irSave" style="background:var(--accent);color:var(--on-accent);border:0;border-radius:.45rem;padding:.45rem .9rem;font-weight:700;font-size:.82rem;cursor:pointer">Save</button>`;
  ov.appendChild(hd);
  const b=el("div","");b.style.cssText="flex:1;overflow-y:auto;padding:1rem 1.1rem 4rem";
  const field=(label,inner)=>{const f=el("div","field");f.innerHTML=`<label>${label}</label>`;if(typeof inner==="string")f.innerHTML+=inner;else f.appendChild(inner);return f;};
  /* label */
  b.appendChild(field("Rule name",`<input id="irLabel" value="${esc(r.label||"")}" placeholder="e.g. Ya'aleh V'Yavo (Rosh Chodesh)">`));
  /* condition */
  const condSel=el("select");condSel.id="irCond";
  [["rosh_chodesh","Rosh Chodesh"],["festival","Festival"],["chanukah","Chanukah"],["purim","Purim"],["fast","Fast days"],["winter","Winter (Mashiv HaRuach season)"],["summer","Summer"],["rain_season","Rain season (Tal u'Matar)"],["dry_season","Dry season"],["shabbat","Shabbat"],["weekday","Weekday"],["date_range","Hebrew date range"],["always","Every day"]].forEach(([v,l])=>{const o=el("option");o.value=v;o.textContent=l;if(r.cond&&r.cond.type===v)o.selected=true;condSel.appendChild(o);});
  b.appendChild(field("When (day condition)",condSel));
  /* festival sub-select */
  const festWrap=field("Which festival",(()=>{const s=el("select");s.id="irFest";[["any","Any festival"],["pesach","Pesach"],["sukkot","Sukkot"],["shavuot","Shavuot"],["rosh_hashana","Rosh HaShanah"],["shemini_atzeret","Shemini Atzeret"],["chol_hamoed","Chol HaMoed"]].forEach(([v,l])=>{const o=el("option");o.value=v;o.textContent=l;if(r.cond&&r.cond.fest===v)o.selected=true;s.appendChild(o);});return s;})());
  b.appendChild(festWrap);
  /* date range */
  const drWrap=field("Hebrew date range (month/day)",`<div style="display:flex;gap:.4rem;align-items:center"><input id="irFromM" type="number" min="1" max="13" placeholder="M" value="${r.cond&&r.cond.fromM||""}" style="width:3.5rem"><input id="irFromD" type="number" min="1" max="30" placeholder="D" value="${r.cond&&r.cond.fromD||""}" style="width:3.5rem"><span style="color:var(--muted)">to</span><input id="irToM" type="number" min="1" max="13" placeholder="M" value="${r.cond&&r.cond.toM||""}" style="width:3.5rem"><input id="irToD" type="number" min="1" max="30" placeholder="D" value="${r.cond&&r.cond.toD||""}" style="width:3.5rem"></div><div style="font-size:.7rem;color:var(--muted);margin-top:.2rem">Months: 1=Nissan \u2026 7=Tishrei \u2026 12/13=Adar</div>`);
  b.appendChild(drWrap);
  /* region */
  const regSel=el("select");regSel.id="irRegion";[["","Anywhere"],["israel","Israel only"],["diaspora","Diaspora only"]].forEach(([v,l])=>{const o=el("option");o.value=v;o.textContent=l;if((r.cond&&r.cond.region||"")===v)o.selected=true;regSel.appendChild(o);});
  b.appendChild(field("Region",regSel));
  /* service */
  const svcSel=el("select");svcSel.id="irSvc";{const o=el("option");o.value="";o.textContent="All services";if(!r.service)o.selected=true;svcSel.appendChild(o);}
  allServices().forEach(s=>{const o=el("option");o.value=s.id;o.textContent=s.en;if(r.service===s.id)o.selected=true;svcSel.appendChild(o);});
  b.appendChild(field("Service",svcSel));
  /* prayer (blessing) — depends on service */
  const praySel=el("select");praySel.id="irPrayer";
  const fillPrayers=()=>{praySel.innerHTML="";const sid=svcSel.value;const prs=sid?allBasePrayers(sid):[];if(!sid){const o=el("option");o.value=r.prayerId||"";o.textContent=r.prayerId?("(id: "+r.prayerId+")"):"\u2014 pick a service first \u2014";praySel.appendChild(o);}prs.forEach(p=>{const o=el("option");o.value=p.id;o.textContent=p.en||p.id;if(r.prayerId===p.id)o.selected=true;praySel.appendChild(o);});};
  fillPrayers();svcSel.addEventListener("change",fillPrayers);
  b.appendChild(field("Attach to prayer (blessing)",praySel));
  /* anchor */
  const anchSel=el("select");anchSel.id="irAnchor";[["start","Before the prayer text"],["end","After the prayer text"],["replace","Replace the prayer text"]].forEach(([v,l])=>{const o=el("option");o.value=v;o.textContent=l;if(r.anchor===v)o.selected=true;anchSel.appendChild(o);});
  b.appendChild(field("Where",anchSel));
  /* nusach scope */
  const nusWrap=field("Nusach (leave all off for every nusach)",(()=>{const d=el("div");d.style.cssText="display:flex;gap:.4rem;flex-wrap:wrap";Object.keys(NUSACH_LABELS).forEach(k=>{const on=r.nusach&&r.nusach.includes(k);const bb=el("button");bb.type="button";bb.dataset.nus=k;bb.style.cssText="padding:.4rem .7rem;border-radius:.5rem;font-size:.8rem;font-weight:600;cursor:pointer;font-family:var(--sans);border:1px solid "+(on?"var(--accent)":"var(--line)")+";background:"+(on?"color-mix(in srgb,var(--accent) 14%,transparent)":"var(--surface2)")+";color:"+(on?"var(--accent)":"var(--ink2)");bb.textContent=NUSACH_LABELS[k];bb.onclick=()=>{const sel=bb.style.borderColor.indexOf("rgb")>=0&&bb.style.background.indexOf("transparent")<0;const isOn=bb.getAttribute("data-on")==="1";if(isOn){bb.setAttribute("data-on","0");bb.style.borderColor="var(--line)";bb.style.background="var(--surface2)";bb.style.color="var(--ink2)";}else{bb.setAttribute("data-on","1");bb.style.borderColor="var(--accent)";bb.style.background="color-mix(in srgb,var(--accent) 14%,transparent)";bb.style.color="var(--accent)";}};bb.setAttribute("data-on",on?"1":"0");d.appendChild(bb);});return d;})());
  b.appendChild(nusWrap);
  /* text */
  const taCss="width:100%;padding:.6rem .7rem;background:var(--surface2);border:1px solid var(--line);border-radius:.45rem;color:var(--ink);font-size:.92rem;outline:none;font-family:var(--sans);resize:vertical;margin-bottom:.5rem";
  b.appendChild(field("Hebrew text",`<textarea id="irHe" rows="3" dir="rtl" style="${taCss}font-family:var(--hebrew);font-size:1.15rem;line-height:1.9;text-align:right">${esc(r.text&&r.text.he||"")}</textarea>`));
  b.appendChild(field("Transliteration (optional)",`<input id="irTr" value="${esc(r.text&&r.text.tr||"")}" style="font-style:italic">`));
  b.appendChild(field("English (optional)",`<textarea id="irEn" rows="2" style="${taCss}">${esc(r.text&&r.text.en||"")}</textarea>`));
  if(!isNew){const del=el("button","btn-ghost");del.style.cssText="margin:.4rem 0;color:#d9534f;border-color:color-mix(in srgb,#d9534f 40%,transparent)";del.textContent="Delete this rule";del.onclick=()=>{if(!confirm("Delete this insertion rule?"))return;deleteInsertRule(r.id);ov.remove();paintAdmin();};b.appendChild(del);}
  ov.appendChild(b);document.body.appendChild(ov);
  /* show/hide conditional fields */
  const sync=()=>{festWrap.style.display=condSel.value==="festival"?"":"none";drWrap.style.display=condSel.value==="date_range"?"":"none";};
  condSel.addEventListener("change",sync);sync();
  $("#irBack").onclick=()=>ov.remove();
  $("#irSave").onclick=()=>{
    const nus=[...nusWrap.querySelectorAll("[data-nus]")].filter(x=>x.getAttribute("data-on")==="1").map(x=>x.dataset.nus);
    const cond={type:condSel.value};
    if(cond.type==="festival")cond.fest=$("#irFest").value;
    if(cond.type==="date_range"){cond.fromM=+$("#irFromM").value||1;cond.fromD=+$("#irFromD").value||1;cond.toM=+$("#irToM").value||1;cond.toD=+$("#irToD").value||1;}
    const reg=$("#irRegion").value;if(reg)cond.region=reg;
    const out={id:r.id,label:$("#irLabel").value.trim()||"Untitled",enabled:r.enabled!==false,nusach:nus.length?nus:null,service:svcSel.value||null,prayerId:praySel.value||r.prayerId||"",anchor:anchSel.value,cond,text:{he:$("#irHe").value.trim(),tr:$("#irTr").value.trim(),en:$("#irEn").value.trim()}};
    if(!out.prayerId){toast("Pick which prayer it attaches to");return;}
    if(!out.text.he&&!out.text.en){toast("Add the insertion text");return;}
    saveInsertRule(out);ov.remove();paintAdmin();toast("Rule saved");
  };
}
function admReminders(w){
  const mkToggle=(getter,setter,lbl,sub)=>{
    const r=el("div","adm-row");r.innerHTML=`<div class="lbl"><b>${lbl}</b><small>${sub}</small></div>`;
    const sw=el("button","switch"+(getter()?" on":""));
    sw.onclick=()=>{setter(!getter());saveState();sw.classList.toggle("on",getter());paintAdmin();};
    r.appendChild(sw);w.appendChild(r);
  };
  /* Daily thought */
  w.appendChild(el("div","note","Gentle, optional touches \u2014 all off by default. Turn on only what you'd like."));
  mkToggle(()=>state.dailyThought,v=>state.dailyThought=v,"A thought for today","Show a short line of wisdom on the home screen, refreshed daily.");
  /* Haptics */
  mkToggle(()=>state.haptics,v=>state.haptics=v,"Haptic feedback","A gentle buzz when advancing in Daven mode or finishing a sequence. (Android; iOS browsers don't support vibration.)");
  /* Travel sense */
  mkToggle(()=>state.travelSense,v=>{state.travelSense=v;if(v){startTravelSense();}else{stopTravelSense();}},"Sense when traveling","While the app is open, if it senses you're moving by car, it offers Tefilat HaDerech. Uses location; works only while open.");

  /* Prayer-time reminders */
  const h=el("div","");h.style.cssText="font-family:var(--display);font-size:1.05rem;font-weight:600;color:var(--ink);margin:1.4rem 0 .3rem";h.textContent="Prayer-time reminders";w.appendChild(h);
  w.appendChild(el("div","note","Get a heads-up before each prayer's time arrives. Note: phone reminders are most reliable while the app is open or recently used \u2014 a static siddur can't send notifications once it's fully closed, especially on iPhone."));
  const remRow=el("div","adm-row");remRow.innerHTML=`<div class="lbl"><b>Remind me before prayer times</b><small>${notifySupported()?"Uses your device notifications":"Not supported on this device"}</small></div>`;
  const remSw=el("button","switch"+(state.notifyPrayers?" on":""));
  remSw.onclick=async()=>{
    if(!state.notifyPrayers){const ok=await enableNotifications();if(!ok)return;state.notifyPrayers=true;}
    else{state.notifyPrayers=false;clearReminders();}
    saveState();paintAdmin();
  };
  remRow.appendChild(remSw);w.appendChild(remRow);
  if(state.notifyPrayers){
    /* which prayers */
    const whichWrap=el("div","field");whichWrap.style.marginTop=".6rem";whichWrap.innerHTML=`<label>Remind me for</label>`;
    const chips=el("div","");chips.style.cssText="display:flex;gap:.45rem;flex-wrap:wrap";
    [["shacharit","Shacharit"],["mincha","Mincha"],["maariv","Maariv"]].forEach(([k,lbl])=>{
      const on=state.notifyWhich[k];
      const b=el("button","");b.style.cssText="padding:.45rem .8rem;border-radius:.5rem;font-size:.82rem;font-weight:600;cursor:pointer;font-family:var(--sans);border:1px solid "+(on?"var(--accent)":"var(--line)")+";background:"+(on?"color-mix(in srgb,var(--accent) 14%,transparent)":"var(--surface2)")+";color:"+(on?"var(--accent)":"var(--ink2)");b.textContent=lbl;
      b.onclick=()=>{state.notifyWhich[k]=!state.notifyWhich[k];saveState();scheduleReminders();paintAdmin();};chips.appendChild(b);
    });
    whichWrap.appendChild(chips);w.appendChild(whichWrap);
    /* lead time */
    const lt=el("div","field");lt.innerHTML=`<label>How early \u2014 <span style="color:var(--accent);font-weight:600">${state.notifyMinutes} min before</span></label>`;
    const sl=el("input");sl.type="range";sl.min="5";sl.max="60";sl.step="5";sl.value=state.notifyMinutes;sl.style.cssText="width:100%;accent-color:var(--accent)";
    sl.addEventListener("input",e=>{state.notifyMinutes=+e.target.value;lt.querySelector("label span").textContent=state.notifyMinutes+" min before";});
    sl.addEventListener("change",()=>{saveState();scheduleReminders();});
    lt.appendChild(sl);w.appendChild(lt);
    const test=el("button","btn-ghost");test.style.margin=".4rem 0 0";test.textContent="Send a test notification";
    test.onclick=()=>{try{new Notification("The Super Siddur",{body:"Reminders are on. You'll be notified before prayer times while the app is active."});haptic([15,60,15]);}catch(e){toast("Couldn't show notification");}};
    w.appendChild(test);
  }
}
function admDisplay(w){
  /* overall text size */
  const ts=el("div","field");ts.innerHTML=`<label>Overall text size</label>`;const seg=el("div","seg");
  [["0.9","Small"],["1","Default"],["1.15","Large"],["1.3","XL"]].forEach(([v,lbl])=>{const b=el("button",Math.abs(state.textSize-(+v))<0.03?"on":"");b.textContent=lbl;b.onclick=()=>{state.textSize=+v;saveState();applyTheme();paintAdmin();};seg.appendChild(b);});
  ts.appendChild(seg);w.appendChild(ts);
  /* reading mode — how you move through a service (A3) */
  const rmf=el("div","field");rmf.innerHTML=`<label>Reading mode</label>`;const rmseg=el("div","seg");
  [["scroll","Scroll"],["page","Pages"],["swipe","Swipe"],["buttons","Buttons"]].forEach(([v,lbl])=>{const b=el("button",(state.readMode||"scroll")===v?"on":"");b.textContent=lbl;b.onclick=()=>{state.readMode=v;saveState();paintAdmin();if(typeof render==="function")render();};rmseg.appendChild(b);});
  rmf.appendChild(rmseg);w.appendChild(rmf);
  const rmn=el("div","note","Scroll = one long page. Pages/Swipe turn screen-sized pages. Buttons = large Next/Previous to step through one at a time.");rmn.style.marginTop="-.2rem";w.appendChild(rmn);
  /* time format — 12-hour US vs 24-hour military, applies wherever times appear */
  const tf=el("div","field");tf.innerHTML=`<label>Time format</label>`;const tseg=el("div","seg");
  [["12","12-hour (US)"],["24","24-hour (military)"]].forEach(([v,lbl])=>{const b=el("button",(state.timeFmt||"12")===v?"on":"");b.textContent=lbl;b.onclick=()=>{state.timeFmt=v;saveState();paintAdmin();if(typeof render==="function"&&(state.view==="zmanim"||state.view==="home"))render();};tseg.appendChild(b);});
  tf.appendChild(tseg);w.appendChild(tf);
  /* separate Hebrew + English sliders */
  const mkSlider=(key,label,he)=>{
    const f=el("div","field");
    const val=state[key]||1;
    f.innerHTML=`<label>${label} \u2014 <span style="color:var(--accent);font-weight:600">${Math.round(val*100)}%</span></label>`;
    const row=el("div","");row.style.cssText="display:flex;align-items:center;gap:.7rem";
    const prev=el("div","");prev.style.cssText="font-family:"+(he?"var(--hebrew)":"var(--display)")+";direction:"+(he?"rtl":"ltr")+";color:var(--ink);min-width:2.6rem;text-align:center;font-size:"+(1.2*val)+"rem;transition:font-size .15s";prev.textContent=he?"\u05D0":"Aa";
    const sl=el("input");sl.type="range";sl.min="0.8";sl.max="1.6";sl.step="0.05";sl.value=val;sl.style.cssText="flex:1;accent-color:var(--accent)";
    sl.addEventListener("input",e=>{state[key]=+e.target.value;applyTheme();f.querySelector("label span").textContent=Math.round(state[key]*100)+"%";prev.style.fontSize=(1.2*state[key])+"rem";});
    sl.addEventListener("change",()=>saveState());
    row.appendChild(prev);row.appendChild(sl);f.appendChild(row);w.appendChild(f);
  };
  mkSlider("hebScale","Hebrew size",true);
  mkSlider("enScale","English & transliteration size",false);
  mkSlider("suppScale","Instructions & intentions size",false);
  /* toggles */
  const toggles=[["translit","Transliteration","Show romanized pronunciation under Hebrew"],["showInstr","Instructions","Show rubric guidance (stand, sit, bow)"],["showKavanot","Kavanot","Show meditative intentions where provided"],["hebrewOnly","Hebrew only","Hide English & transliteration for an immersive view"],["minyan","Praying with a minyan","Show prayers that require a quorum of ten"],["womanMode","Women's siddur","Hide tefillin and other men's-obligation prayers"],["hideTachanun","Skip Tachanun","Remove Tachanun \u2014 for a simcha in shul, a new baby, a chatan, etc."],["showCover","Opening cover","Show the animated book cover each time the app launches"]];
  toggles.forEach(([k,lbl,sub])=>{
    const r=el("div","adm-row");r.innerHTML=`<div class="lbl"><b>${lbl}</b><small>${sub}</small></div>`;
    const sw=el("button","switch"+(state[k]?" on":""));
    sw.onclick=()=>{state[k]=!state[k];saveState();sw.classList.toggle("on",state[k]);if(k==="showKavanot")paintAdmin();};
    r.appendChild(sw);w.appendChild(r);
    /* kavanah level chooser nested under the Kavanot toggle */
    if(k==="showKavanot"&&state.showKavanot){
      const kl=el("div","");kl.style.cssText="margin:.1rem 0 .6rem;padding:.6rem .8rem;background:var(--surface);border:1px solid var(--line);border-radius:.55rem";
      kl.innerHTML=`<div style="font-size:.6rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-bottom:.5rem">Which kavanot to show</div>`;
      state.kavLevels=state.kavLevels||{found:true,halachic:false,kabbalistic:false};
      const levels=[["found","Foundation","Plain-language focus & intention","var(--insert)"],["halachic","Halachic","What to concentrate on, per din","#9fa97a"],["kabbalistic","Kabbalistic","Sefirot & traditional mystical intent","#b08cc4"]];
      levels.forEach(([key,name,desc,color])=>{
        const row=el("div","");row.style.cssText="display:flex;align-items:center;gap:.6rem;padding:.35rem 0";
        const on=!!state.kavLevels[key];
        const chk=el("button","");chk.style.cssText="flex:none;width:1.5rem;height:1.5rem;border-radius:.35rem;border:1.5px solid "+(on?color:"var(--line)")+";background:"+(on?color:"transparent")+";cursor:pointer;display:grid;place-items:center;color:#fff";
        chk.innerHTML=on?`<svg class="icon" viewBox="0 0 24 24" style="width:.95em;height:.95em"><path d="M20 6L9 17l-5-5"/></svg>`:"";
        const lab=el("div","");lab.style.flex="1";lab.innerHTML=`<div style="font-size:.9rem;font-weight:600;color:var(--ink)">${name}</div><div style="font-size:.72rem;color:var(--ink2)">${desc}</div>`;
        chk.onclick=()=>{state.kavLevels[key]=!state.kavLevels[key];saveState();paintAdmin();};
        row.appendChild(chk);row.appendChild(lab);kl.appendChild(row);
      });
      kl.appendChild(el("div","note","Foundation kavanot are written throughout. Halachic and kabbalistic kavanot appear where they've been added \u2014 you can write your own for any prayer in the editor."));
      w.appendChild(kl);
    }
  });
  /* theme grid */
  const th=el("div","field");th.style.marginTop="1rem";th.innerHTML=`<label>Theme</label>`;
  const grid=el("div","");grid.style.cssText="display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem";
  THEMES.forEach(([key,name,bg,accent])=>{
    const s=el("button","swatch"+(state.theme===key?" on":""));
    s.innerHTML=`<div class="bars" style="background:${bg}"><i style="background:${accent}"></i><i style="background:${bg}"></i><i style="background:${accent};opacity:.5"></i></div><div class="nm">${name}</div>`;
    s.onclick=()=>{state.theme=key;saveState();applyTheme();paintAdmin();};
    grid.appendChild(s);
  });
  th.appendChild(grid);w.appendChild(th);
}
function admNusachLoc(w){
  const fn=el("div","field");fn.innerHTML=`<label>Nusach (prayer rite)</label><select id="anNusach">${Object.keys(NUSACH_LABELS).map(k=>`<option value="${k}"${state.nusach===k?" selected":""}>${NUSACH_LABELS[k]}</option>`).join("")}</select>`;w.appendChild(fn);
  $("#anNusach").addEventListener("change",e=>{state.nusach=e.target.value;saveState();});
  const fi=el("div","field");fi.innerHTML=`<label>Custom / Israel</label><select id="anIsrael"><option value="diaspora"${state.israelMode==="diaspora"?" selected":""}>Diaspora (outside Israel)</option><option value="israel"${state.israelMode==="israel"?" selected":""}>Israel</option><option value="yerushalayim"${state.israelMode==="yerushalayim"?" selected":""}>Jerusalem</option></select>`;w.appendChild(fi);
  $("#anIsrael").addEventListener("change",e=>{state.israelMode=e.target.value;saveState();});
  const lbl=el("div","field");lbl.innerHTML=`<label>Location (for zmanim & current prayer)</label>`;w.appendChild(lbl);
  const cur=el("div","note");cur.textContent=`Currently: ${state.loc.name}`;cur.style.marginBottom=".6rem";w.appendChild(cur);
  const pick=el("div","");w.appendChild(pick);
  locationPicker(pick,()=>{cur.textContent=`Currently: ${state.loc.name}`;});
}
function admPeople(w){
  w.appendChild(el("div","note","Add people to keep in your prayers. Each name is inserted automatically at the right place in the service."));
  /* add form */
  const fn=el("div","field");fn.innerHTML=`<label>Name (Hebrew or English)</label><input id="pfName" placeholder="e.g. \u05D7\u05B7\u05D9\u05B8\u05BC\u05D4 \u05E9\u05B8\u05C2\u05E8\u05B8\u05D4">`;w.appendChild(fn);
  const fm=el("div","field");fm.innerHTML=`<label>Mother's name (optional, traditional for healing)</label><input id="pfMother" placeholder="e.g. \u05E8\u05B4\u05D1\u05B0\u05E7\u05B8\u05D4">`;w.appendChild(fm);
  const fc=el("div","field");fc.innerHTML=`<label>Pray for</label><select id="pfCat">${PRAY_CATEGORIES.map(c=>`<option value="${c.id}">${c.en} \u2014 ${c.spot}</option>`).join("")}</select>`;w.appendChild(fc);
  const add=el("button","btn-ghost");add.style.margin=".2rem 0 1rem";add.textContent="Add name";
  add.onclick=()=>{const n=$("#pfName").value.trim();if(!n){toast("Enter a name");return;}addPrayName(n,$("#pfCat").value,$("#pfMother").value);paintAdmin();};
  w.appendChild(add);
  /* current names by category */
  PRAY_CATEGORIES.forEach(cat=>{
    const list=namesByCat(cat.id);if(!list.length)return;
    const h=el("div","");h.style.cssText="font-size:.62rem;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);font-weight:700;margin:.8rem 0 .4rem";h.textContent=cat.en;w.appendChild(h);
    list.forEach(n=>{const r=el("div","arr-row");r.innerHTML=`<div class="nm"><b style="font-family:var(--hebrew)">${esc(n.name)}</b>${n.mother?`<small>\u05D1\u05B6\u05DF/\u05D1\u05B7\u05EA ${esc(n.mother)}</small>`:""}</div>`;const rm=el("button","arr-mini");rm.style.color="#d9534f";rm.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:1em"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>`;rm.onclick=()=>{removePrayName(n.id);paintAdmin();};r.appendChild(rm);w.appendChild(r);});
  });
  /* personal verse */
  const vh=el("div","");vh.style.cssText="font-family:var(--display);font-size:1.05rem;font-weight:600;color:var(--ink);margin:1.4rem 0 .3rem";vh.textContent="Your personal verse";w.appendChild(vh);
  w.appendChild(el("div","note","Many have the custom to say a Tanach verse at the end of Shemoneh Esrei that begins with the first letter of their Hebrew name and ends with the last. Enter your Hebrew name to see matching verses."));
  const vn=el("div","field");vn.style.marginTop=".6rem";vn.innerHTML=`<label>Hebrew name</label><input id="pvName" value="${esc(state.userHebName||"")}" placeholder="\u05D3\u05B8\u05D5\u05B4\u05D3">`;w.appendChild(vn);
  const matches=el("div","");matches.id="pvMatches";w.appendChild(matches);
  function paintMatches(){
    const nm=$("#pvName").value;const verses=findVersesForName(nm);matches.innerHTML="";
    if(!nm.trim())return;
    if(!verses.length){matches.appendChild(el("div","note","No verse on file for those letters yet \u2014 you can type your own verse below."));}
    else{verses.forEach(v=>{const b=el("button","");b.style.cssText="display:block;width:100%;text-align:right;direction:rtl;font-family:var(--hebrew);font-size:1.05rem;line-height:1.9;padding:.7rem .9rem;margin-bottom:.4rem;background:var(--surface);border:1px solid var(--line);border-radius:.55rem;cursor:pointer;color:var(--ink)"+(state.personalVerse===v?";border-color:var(--accent)":"");b.textContent=v;b.onclick=()=>{state.personalVerse=v;saveState();paintAdmin();toast("Verse saved");};matches.appendChild(b);});}
  }
  $("#pvName").addEventListener("input",paintMatches);paintMatches();
  const cv=el("div","field");cv.style.marginTop=".6rem";cv.innerHTML=`<label>Or type your own verse</label><textarea id="pvCustom" rows="2" style="width:100%;padding:.6rem .7rem;background:var(--surface2);border:1px solid var(--line);border-radius:.45rem;color:var(--ink);font-family:var(--hebrew);direction:rtl;font-size:1.05rem;outline:none;resize:vertical">${esc(state.personalVerse||"")}</textarea>`;w.appendChild(cv);
  $("#pvCustom").addEventListener("input",e=>{state.personalVerse=e.target.value.trim()||null;saveState();});
  if(state.personalVerse){const clr=el("button","btn-ghost");clr.style.margin=".2rem 0";clr.textContent="Clear verse";clr.onclick=()=>{state.personalVerse=null;saveState();paintAdmin();};w.appendChild(clr);}
}
let arrSvcId=null;
function admArrange(w){
  w.appendChild(el("div","note","Pick a service, then reorder, hide, or tap \u201CEdit text\u201D to rewrite the Hebrew, translation, instructions, and kavanot \u2014 or add a brand-new tefillah."));
  if(!arrSvcId)arrSvcId=SERVICES[0].id;
  /* on-theme service picker */
  const lbl=el("div","");lbl.textContent="Service";lbl.style.cssText="font-size:.6rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:700;margin:.4rem 0 .5rem";w.appendChild(lbl);
  const groups=[["Daily",SERVICES.filter(s=>["shacharit","mincha","maariv","birkat","krias"].includes(s.id)),"cat-daily"],
                ["Other",SERVICES.filter(s=>!["shacharit","mincha","maariv","birkat","krias"].includes(s.id)),"cat-daily"],
                ["Occasional & Special",(typeof OCC_SERVICES!=="undefined"?OCC_SERVICES:[]),"cat-occasional"]];
  groups.forEach(([gname,svcs,catcls])=>{
    if(!svcs.length)return;
    const gh=el("div",catcls);gh.style.cssText="--_c:var(--cat);font-size:.58rem;letter-spacing:.16em;text-transform:uppercase;font-weight:700;color:var(--cat,var(--muted));margin:.6rem 0 .4rem .15rem";gh.textContent=gname;w.appendChild(gh);
    const grid=el("div",catcls);grid.style.cssText="display:flex;flex-wrap:wrap;gap:.45rem;margin-bottom:.4rem";
    svcs.forEach(s=>{
      const on=arrSvcId===s.id;
      const chip=el("button","");chip.style.cssText="display:inline-flex;align-items:center;gap:.4rem;padding:.5rem .8rem;border-radius:.6rem;font-size:.85rem;font-weight:600;cursor:pointer;font-family:var(--sans);transition:all .15s;border:1px solid "+(on?"var(--cat,var(--accent))":"var(--line)")+";background:"+(on?"color-mix(in srgb,var(--cat,var(--accent)) 16%,transparent)":"var(--surface)")+";color:"+(on?"var(--cat,var(--accent))":"var(--ink2)");
      chip.innerHTML=`<span>${esc(s.en)}</span><span style="font-family:var(--hebrew);opacity:.8">${esc(s.he)}</span>`;
      chip.onclick=()=>{arrSvcId=s.id;paintAdmin();};
      grid.appendChild(chip);
    });
    w.appendChild(grid);
  });
  /* add new tefillah */
  const addNew=el("button","");addNew.style.cssText="display:flex;align-items:center;justify-content:center;gap:.5rem;width:100%;margin:.8rem 0 .4rem;padding:.8rem;background:transparent;border:1px dashed color-mix(in srgb,var(--accent) 50%,transparent);border-radius:.6rem;color:var(--accent);font-family:var(--sans);font-weight:600;font-size:.9rem;cursor:pointer";
  addNew.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:1.1em;height:1.1em"><path d="M12 5v14M5 12h14"/></svg> Add a new tefillah to ${esc(svcById(arrSvcId)?svcById(arrSvcId).en:"")}`;
  addNew.onclick=()=>{closeSheet("admSheet");addCustomPrayer(arrSvcId);};
  w.appendChild(addNew);
  /* prayer list */
  const list=el("div","");list.id="arrList";w.appendChild(list);
  const reset=el("button","btn-ghost");reset.textContent="Reset this service to default order";reset.style.margin=".8rem 0 0";
  reset.onclick=()=>{delete state.order[arrSvcId];delete state.hidden[arrSvcId];saveState();paintArrange(arrSvcId);toast("Reset to default");};
  w.appendChild(reset);
  if(state.pushLog&&state.pushLog.filter(e=>!e.undone).length&&typeof openPushLog==="function"){
    const ul=el("button","btn-ghost");ul.textContent="↩ Recent text pushes (undo)";ul.style.margin=".5rem 0 0";ul.onclick=()=>{closeSheet("admSheet");openPushLog();};w.appendChild(ul);
  }
  paintArrange(arrSvcId);
}
function paintArrange(svcId){
  const list=$("#arrList");if(!list)return;list.innerHTML="";
  const base=allBasePrayers(svcId).slice();
  const ord=(state.order&&state.order[svcId])||[];
  if(ord.length){base.sort((a,b)=>{let ia=ord.indexOf(a.id),ib=ord.indexOf(b.id);if(ia<0)ia=999;if(ib<0)ib=999;return ia-ib;});}
  const hid=(state.hidden&&state.hidden[svcId])||[];
  const persist=()=>{state.order[svcId]=base.map(p=>p.id);saveState();};
  base.forEach((pr,idx)=>{
    const off=hid.includes(pr.id);
    const row=el("div","arr-row"+(off?" off":""));
    row.innerHTML=`<svg class="icon grip" viewBox="0 0 24 24" style="width:1.1em;height:1.1em"><path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01"/></svg><div class="nm"><b>${esc(pr.en)}</b><span class="he">${esc(pr.he)}</span><small>${esc(pr.section||"Main")}</small></div>`;
    const up=el("button","arr-mini");up.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:1.05em;height:1.05em"><path d="M18 15l-6-6-6 6"/></svg>`;up.disabled=idx===0;up.style.opacity=idx===0?".3":"1";
    up.onclick=()=>{if(idx===0)return;[base[idx-1],base[idx]]=[base[idx],base[idx-1]];persist();paintArrange(svcId);};
    const dn=el("button","arr-mini");dn.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:1.05em;height:1.05em"><path d="M6 9l6 6 6-6"/></svg>`;dn.disabled=idx===base.length-1;dn.style.opacity=idx===base.length-1?".3":"1";
    dn.onclick=()=>{if(idx===base.length-1)return;[base[idx+1],base[idx]]=[base[idx],base[idx+1]];persist();paintArrange(svcId);};
    const tog=el("button","arr-mini sw");tog.style.padding="0 .55rem";tog.textContent=off?"Show":"Hide";
    tog.onclick=()=>{const h=state.hidden[svcId]||[];const i=h.indexOf(pr.id);if(i>=0)h.splice(i,1);else h.push(pr.id);state.hidden[svcId]=h;saveState();paintArrange(svcId);};
    const edit=el("button","arr-mini sw");edit.style.cssText="padding:0 .55rem;color:var(--accent);border-color:color-mix(in srgb,var(--accent) 40%,transparent)";edit.textContent="Edit text";
    edit.onclick=()=>{closeSheet("admSheet");openPrayerEditor(svcId,pr.id);};
    row.appendChild(up);row.appendChild(dn);row.appendChild(tog);row.appendChild(edit);list.appendChild(row);
  });
  if(!base.length)list.appendChild(el("div","note","No prayers in this service yet."));
}

/* ====== APP BOOT ====== */
function openApp(){applyTheme();const nm=state.userEngName||state.userHebName;if(nm)$("#coverName").textContent=nm;const app=$("#app");app.style.visibility="visible";app.style.opacity="1";render();if(state.travelSense)startTravelSense();if(state.notifyPrayers&&typeof scheduleReminders==="function"&&notifySupported()&&Notification.permission==="granted")scheduleReminders();}

/* ====== TRANSCRIBED FROM UPLOAD: Ashkenaz Shacharit, pages 1-2 (Upon Rising, Tzitzit & Tallit) ====== */
(function(){
  if(!PRAYERS.shacharit)return;
  const prep=[
    PR("modeh_ani","Modeh Ani","מוֹדֶה אֲנִי",[
      R("Said immediately upon waking, while still in bed."),
      P("מוֹדֶה אֲנִי לְפָנֶיךָ, מֶלֶךְ חַי וְקַיָּם, שֶׁהֶחֱזַרְתָּ בִּי נִשְׁמָתִי בְּחֶמְלָה, רַבָּה אֱמוּנָתֶךָ.","Modeh ani lefanecha, melech chai vekayam, shehechezarta bi nishmati bechemla, rabba emunatecha.","I give thanks before You, living and eternal King, for You have returned my soul within me with compassion — great is Your faithfulness.",{kav:{found:"The first words of the day. Pause before rushing on — your soul was returned to you, on loan, with trust. Begin with gratitude.",halachic:"This may be said before washing the hands, since it contains no Divine Name. Concentrate on thanking God for restoring the soul each morning.",kabbalistic:"The soul departs upward in sleep and is returned at dawn. The Arizal links the morning return of the soul to renewal through the Sefirah of Malchut — receiving fresh vitality from above."},alt:{edot:"מוֹדָה אֲנִי לְפָנֶיךָ, מֶלֶךְ חַי וְקַיָּם, שֶׁהֶחֱזַרְתָּ בִּי נִשְׁמָתִי בְּחֶמְלָה, רַבָּה אֱמוּנָתֶךָ."}})
    ],"Upon Rising"),
    PR("reishit_chochmah","The Beginning of Wisdom","רֵאשִׁית חָכְמָה",[
      P("רֵאשִׁית חָכְמָה יִרְאַת יְיָ, שֵׂכֶל טוֹב לְכָל עֹשֵׂיהֶם, תְּהִלָּתוֹ עוֹמֶדֶת לָעַד. בָּרוּךְ שֵׁם כְּבוֹד מַלְכוּתוֹ לְעוֹלָם וָעֶד.","Reishit chochma yirat Adonai, sechel tov lechol oseihem, tehilato omedet la'ad. Baruch shem kevod malchuto le'olam va'ed.","The beginning of wisdom is the awe of the Lord; good understanding belongs to all who practice it; His praise endures forever. Blessed is the name of His glorious kingdom for ever and ever.")
    ],"Upon Rising"),
    PR("torah_tziva","Torah Tziva","תּוֹרָה צִוָּה",[
      P("תּוֹרָה צִוָּה לָנוּ מֹשֶׁה, מוֹרָשָׁה קְהִלַּת יַעֲקֹב. שְׁמַע בְּנִי מוּסַר אָבִיךָ, וְאַל תִּטֹּשׁ תּוֹרַת אִמֶּךָ. תּוֹרָה תְהֵא אֱמוּנָתִי, וְאֵל שַׁדַּי בְּעֶזְרָתִי. וְאַתֶּם הַדְּבֵקִים בַּיְיָ אֱלֹהֵיכֶם, חַיִּים כֻּלְּכֶם הַיּוֹם. לִישׁוּעָתְךָ קִוִּיתִי יְיָ.","Torah tziva lanu Moshe, morasha kehilat Ya'akov. Shema beni musar avicha, ve'al titosh torat imecha. Torah tehe emunati, ve'El Shaddai be'ezrati. Ve'atem hadevekim ba'Adonai Eloheichem, chayim kulchem hayom. Lishu'atecha kiviti Adonai.","The Torah that Moses commanded us is the heritage of the congregation of Jacob. Hear, my child, the instruction of your father, and do not forsake the teaching of your mother. May the Torah be my faith, and Almighty God my help. And you who cling to the Lord your God are all alive today. For Your salvation I hope, O Lord.")
    ],"Upon Rising"),
    PR("birkat_tzitzit","Blessing on Tzitzit","לְבִישַׁת צִיצִית",[
      R("Hold the tzitzit (small tallit) and recite the blessing, then put it on."),
      P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו, וְצִוָּנוּ עַל מִצְוַת צִיצִת.","Baruch ata Adonai Eloheinu melech ha'olam, asher kideshanu bemitzvotav, vetzivanu al mitzvat tzitzit.","Blessed are You, Lord our God, King of the universe, who has sanctified us with His commandments and commanded us concerning the precept of tzitzit."),
      P("יְהִי רָצוֹן מִלְּפָנֶיךָ, יְיָ אֱלֹהַי וֵאלֹהֵי אֲבוֹתַי, שֶׁתְּהֵא חֲשׁוּבָה מִצְוַת צִיצִת לְפָנֶיךָ, כְּאִלּוּ קִיַּמְתִּיהָ בְּכָל פְּרָטֶיהָ וְדִקְדּוּקֶיהָ וְכַוָּנוֹתֶיהָ, וְתַרְיַ\"ג מִצְוֹת הַתְּלוּיִם בָּהּ, אָמֵן סֶלָה.","Yehi ratzon milefanecha, Adonai Elohai ve'Elohei avotai, shetehe chashuva mitzvat tzitzit lefanecha, ke'ilu kiyamtiha bechol perateha vedikdukeha vechavanoteha, vetaryag mitzvot hateluyim bah, amen sela.","May it be Your will, Lord my God and God of my fathers, that the precept of tzitzit be accounted before You as though I had fulfilled it in all its details and intentions, together with the 613 commandments dependent upon it. Amen, Selah.")
    ],"Tzitzit & Tallit"),
    PR("atifat_tallit","Wrapping in the Tallit","עֲטִיפַת טַלִּית",[
      P("בָּרְכִי נַפְשִׁי אֶת יְיָ, יְיָ אֱלֹהַי גָּדַלְתָּ מְּאֹד, הוֹד וְהָדָר לָבָשְׁתָּ. עֹטֶה אוֹר כַּשַּׂלְמָה, נוֹטֶה שָׁמַיִם כַּיְרִיעָה.","Barchi nafshi et Adonai, Adonai Elohai gadalta me'od, hod vehadar lavashta. Ote or kasalma, note shamayim kayri'a.","Bless the Lord, O my soul. Lord my God, You are very great; You are clothed in glory and majesty, wrapped in light as in a garment, spreading the heavens like a curtain."),
      R("Wrap yourself in the tallit and recite:"),
      P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו, וְצִוָּנוּ לְהִתְעַטֵּף בַּצִּיצִת.","Baruch ata Adonai Eloheinu melech ha'olam, asher kideshanu bemitzvotav, vetzivanu lehit'atef batzitzit.","Blessed are You, Lord our God, King of the universe, who has sanctified us with His commandments and commanded us to wrap ourselves in the tzitzit."),
      P("מַה יָּקָר חַסְדְּךָ אֱלֹהִים, וּבְנֵי אָדָם בְּצֵל כְּנָפֶיךָ יֶחֱסָיוּן. יִרְוְיֻן מִדֶּשֶׁן בֵּיתֶךָ, וְנַחַל עֲדָנֶיךָ תַשְׁקֵם. כִּי עִמְּךָ מְקוֹר חַיִּים, בְּאוֹרְךָ נִרְאֶה אוֹר. מְשֹׁךְ חַסְדְּךָ לְיֹדְעֶיךָ, וְצִדְקָתְךָ לְיִשְׁרֵי לֵב.","Ma yakar chasdecha Elohim, uvnei adam betzel kenafecha yechesayun. Yirveyun mideshen beitecha, venachal adanecha tashkem. Ki imecha mekor chayim, be'orcha nireh or. Meshoch chasdecha leyod'echa, vetzidkatecha leyishrei lev.","How precious is Your kindness, O God! The children of men take refuge in the shadow of Your wings. They are filled with the abundance of Your house, and You give them drink from the river of Your delights. For with You is the source of life; in Your light we see light. Continue Your kindness to those who know You, and Your righteousness to the upright in heart.")
    ],"Tzitzit & Tallit"),
    PR("hanachat_tefillin","Donning Tefillin","הֲנָחַת תְּפִלִּין",[
      R("Place the arm-tefillin on the upper arm. Before tightening, recite:"),
      P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו, וְצִוָּנוּ לְהָנִיחַ תְּפִלִּין.","Baruch ata Adonai Eloheinu melech ha'olam, asher kideshanu bemitzvotav, vetzivanu lehani'ach tefillin.","Blessed are You, Lord our God, King of the universe, who has sanctified us with His commandments and commanded us to put on tefillin."),
      R("Place the head-tefillin. If you spoke between the two, recite this second blessing:"),
      P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו, וְצִוָּנוּ עַל מִצְוַת תְּפִלִּין.","Baruch ata Adonai Eloheinu melech ha'olam, asher kideshanu bemitzvotav, vetzivanu al mitzvat tefillin.","Blessed are You, Lord our God, King of the universe, who has sanctified us with His commandments and commanded us concerning the precept of tefillin."),
      P("בָּרוּךְ שֵׁם כְּבוֹד מַלְכוּתוֹ לְעוֹלָם וָעֶד.","Baruch shem kevod malchuto le'olam va'ed.","Blessed is the name of His glorious kingdom for ever and ever."),
      P("וּמֵחָכְמָתְךָ אֵל עֶלְיוֹן, תַּאֲצִיל עָלַי, וּמִבִּינָתְךָ תְּבִינֵנִי, וּבְחַסְדְּךָ תַּגְדִּיל עָלַי, וּבִגְבוּרָתְךָ תַּצְמִית אוֹיְבַי וְקָמַי. וְשֶׁמֶן הַטּוֹב תָּרִיק עַל שִׁבְעָה קְנֵי הַמְּנוֹרָה, לְהַשְׁפִּיעַ טוּבְךָ לִבְרִיּוֹתֶיךָ. פּוֹתֵחַ אֶת יָדֶךָ, וּמַשְׂבִּיעַ לְכָל חַי רָצוֹן.","Umechochmatecha El Elyon ta'atzil alai, umibinatecha tevineni, uvchasdecha tagdil alai, uvigvuratecha tatzmit oyvai vekamai. Veshemen hatov tarik al shiv'a kenei hamenora, lehashpi'a tuvecha livriyotecha. Pote'ach et yadecha, umasbi'a lechol chai ratzon.","From Your wisdom, O God most high, bestow upon me; from Your understanding give me understanding; with Your kindness deal greatly with me; by Your might cut off my foes and adversaries. Pour the good oil upon the seven branches of the menorah, to cause Your goodness to flow to Your creatures. You open Your hand and satisfy the desire of every living thing."),
      R("Wind the strap three times around the middle finger and recite:"),
      P("וְאֵרַשְׂתִּיךְ לִי לְעוֹלָם, וְאֵרַשְׂתִּיךְ לִי בְּצֶדֶק וּבְמִשְׁפָּט וּבְחֶסֶד וּבְרַחֲמִים. וְאֵרַשְׂתִּיךְ לִי בֶּאֱמוּנָה, וְיָדַעַתְּ אֶת יְיָ.","Ve'erastich li le'olam, ve'erastich li betzedek uvmishpat uvchesed uvrachamim. Ve'erastich li be'emuna, veyada'at et Adonai.","I will betroth you to Me forever; I will betroth you to Me with righteousness, justice, kindness, and mercy. I will betroth you to Me with faithfulness, and you shall know the Lord.")
    ],"Tefillin")
  ];
  PRAYERS.shacharit.unshift.apply(PRAYERS.shacharit,prep);
})();


/* ====== EMBEDDED SCANNED PAGES DATA ====== */
window.SCANS=[];

/* ====== SCANNED SIDDUR (your uploaded pages) ====== */
function scanDocs(){return (window.SCANS||[]);}
function openScansIndex(){
  const docs=scanDocs();if(!docs.length){toast("Scanned pages are still loading\u2026");return;}
  const old=$("#scanIndex");if(old)old.remove();
  const ov=el("div","");ov.id="scanIndex";
  ov.style.cssText="position:fixed;inset:0;z-index:125;background:var(--bg);display:flex;flex-direction:column";
  const hd=el("div","");hd.style.cssText="flex:none;display:flex;align-items:center;gap:.6rem;padding:.95rem 1rem;border-bottom:1px solid var(--line);background:var(--surface)";
  hd.innerHTML=`<button id="siClose" style="background:transparent;border:0;color:var(--muted);cursor:pointer;display:flex;align-items:center;gap:.3rem;font-size:.85rem"><svg class="icon" viewBox="0 0 24 24" style="width:1.1em;height:1.1em"><path d="M15 18l-6-6 6-6"/></svg> Back</button><div style="flex:1;text-align:center;font-family:var(--display);font-weight:600;color:var(--ink)">Your Scanned Siddur</div><div style="width:3rem"></div>`;
  ov.appendChild(hd);
  const body=el("div","");body.style.cssText="flex:1;overflow-y:auto;padding:1rem 1.1rem 2rem";
  let curNus=null;
  docs.forEach(d=>{
    if(d.nusach!==curNus){curNus=d.nusach;const h=el("div","");h.style.cssText="font-size:.66rem;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);font-weight:700;margin:1rem 0 .5rem;padding-bottom:.3rem;border-bottom:1px solid var(--line)";h.textContent=d.nusach;body.appendChild(h);}
    const b=el("button","card");b.style.marginBottom=".5rem";
    b.innerHTML=`<div class="icon-wrap"><svg class="icon" viewBox="0 0 24 24"><path d="M4 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z"/><path d="M8 8h6M8 12h6"/></svg></div><div class="body"><div class="title">${esc(d.service)}</div><div class="sub">${d.pages.length} pages</div></div><div class="arr">\u2192</div>`;
    b.onclick=()=>openScanDoc(d.id);
    body.appendChild(b);
  });
  ov.appendChild(body);document.body.appendChild(ov);
  $("#siClose").onclick=()=>ov.remove();
}
function openScanDoc(id){
  const docs=scanDocs();const doc=docs.find(d=>d.id===id);if(!doc)return;
  let idx=0;
  const old=$("#scanViewer");if(old)old.remove();
  const ov=el("div","");ov.id="scanViewer";
  ov.style.cssText="position:fixed;inset:0;z-index:130;background:var(--bg);display:flex;flex-direction:column";
  const hd=el("div","");hd.style.cssText="flex:none;display:flex;align-items:center;gap:.6rem;padding:.9rem 1rem;border-bottom:1px solid var(--line);background:var(--surface)";
  hd.innerHTML=`<button id="svClose" style="background:transparent;border:0;color:var(--muted);cursor:pointer;display:flex;align-items:center;gap:.3rem;font-size:.85rem"><svg class="icon" viewBox="0 0 24 24" style="width:1.1em;height:1.1em"><path d="M15 18l-6-6 6-6"/></svg> Library</button><div style="flex:1;text-align:center;font-family:var(--display);font-weight:600;color:var(--ink);font-size:.95rem">${esc(doc.service)} <span style="color:var(--muted);font-weight:400">· ${esc(doc.nusach)}</span></div><div id="svNum" style="font-family:var(--mono);font-size:.78rem;color:var(--muted);min-width:3.4rem;text-align:right"></div>`;
  ov.appendChild(hd);
  const scroll=el("div","");scroll.style.cssText="flex:1;overflow:auto;display:flex;align-items:flex-start;justify-content:center;padding:1rem;background:#888";
  const img=el("img");img.style.cssText="width:100%;max-width:760px;height:auto;background:#fff;box-shadow:0 6px 24px rgba(0,0,0,.4);border-radius:2px";img.alt="Siddur page";
  scroll.appendChild(img);ov.appendChild(scroll);
  const ctr=el("div","");ctr.style.cssText="flex:none;display:flex;align-items:center;gap:.6rem;padding:.7rem 1rem;border-top:1px solid var(--line);background:var(--surface)";
  const prev=el("button","");prev.style.cssText="flex:none;padding:.6rem .9rem;border-radius:.5rem;border:1px solid var(--line);background:var(--surface2);color:var(--ink);cursor:pointer;display:flex;align-items:center;gap:.3rem";prev.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:1.1em;height:1.1em"><path d="M15 18l-6-6 6-6"/></svg>`;
  const slider=el("input");slider.type="range";slider.min="1";slider.max=String(doc.pages.length);slider.value="1";slider.style.cssText="flex:1;accent-color:var(--accent)";
  const next=el("button","");next.style.cssText="flex:none;padding:.6rem .9rem;border-radius:.5rem;border:1px solid var(--line);background:var(--surface2);color:var(--ink);cursor:pointer;display:flex;align-items:center;gap:.3rem";next.innerHTML=`<svg class="icon" viewBox="0 0 24 24" style="width:1.1em;height:1.1em"><path d="M9 6l6 6-6 6"/></svg>`;
  ctr.appendChild(prev);ctr.appendChild(slider);ctr.appendChild(next);ov.appendChild(ctr);
  document.body.appendChild(ov);
  function paint(){idx=Math.max(0,Math.min(doc.pages.length-1,idx));img.src=doc.pages[idx];$("#svNum").textContent=(idx+1)+" / "+doc.pages.length;slider.value=String(idx+1);scroll.scrollTop=0;prev.style.opacity=idx===0?".4":"1";next.style.opacity=idx===doc.pages.length-1?".4":"1";}
  prev.onclick=()=>{idx--;paint();};next.onclick=()=>{idx++;paint();};
  slider.oninput=e=>{idx=(+e.target.value)-1;paint();};
  $("#svClose").onclick=()=>ov.remove();
  ov.tabIndex=0;ov.addEventListener("keydown",e=>{if(e.key==="ArrowLeft"){idx--;paint();}else if(e.key==="ArrowRight"){idx++;paint();}else if(e.key==="Escape")ov.remove();});
  paint();ov.focus();
}


/* embedded decoded text */
