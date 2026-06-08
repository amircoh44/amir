"use strict";
/* Hebrew calendar, astronomical zmanim, gematria, city DB */

/* ====== HEBREW CALENDAR ENGINE ====== */
const HEB_EPOCH=-1373427;
const HMONTHS=["Nissan","Iyar","Sivan","Tammuz","Av","Elul","Tishrei","Cheshvan","Kislev","Tevet","Shevat","Adar","Adar II"];
const HMONTHS_HE=["\u05E0\u05B4\u05D9\u05E1\u05B8\u05DF","\u05D0\u05B4\u05D9\u05B8\u05BC\u05E8","\u05E1\u05B4\u05D9\u05D5\u05B8\u05DF","\u05EA\u05B7\u05DE\u05B5\u05BC\u05D5\u05D6","\u05D0\u05B8\u05D1","\u05D0\u05B1\u05DC\u05D5\u05BC\u05DC","\u05EA\u05B4\u05E9\u05C1\u05B0\u05E8\u05B5\u05D9","\u05D7\u05B6\u05E9\u05C1\u05B0\u05D5\u05B8\u05DF","\u05DB\u05B4\u05BC\u05E1\u05B0\u05DC\u05B5\u05D5","\u05D8\u05B5\u05D1\u05B5\u05EA","\u05E9\u05C1\u05B0\u05D1\u05B8\u05D8","\u05D0\u05B2\u05D3\u05B8\u05E8","\u05D0\u05B2\u05D3\u05B8\u05E8 \u05D1'"];
function gLeap(y){return (y%4===0)&&(y%100!==0||y%400===0);}
function gRD(y,m,d){return 365*(y-1)+Math.floor((y-1)/4)-Math.floor((y-1)/100)+Math.floor((y-1)/400)+Math.floor((367*m-362)/12)+(m<=2?0:(gLeap(y)?-1:-2))+d;}
function hLeap(y){return ((7*y+1)%19)<7;}
function lastMonthH(y){return hLeap(y)?13:12;}
function hElapsed(y){const m=Math.floor((235*y-234)/19);const p=12084+13753*m;let d=m*29+Math.floor(p/25920);return ((3*(d+1))%7<3)?d+1:d;}
function hDelay(y){const a=hElapsed(y-1),b=hElapsed(y),c=hElapsed(y+1);if(c-b===356)return 2;if(b-a===382)return 1;return 0;}
function hNewYear(y){return HEB_EPOCH+hElapsed(y)+hDelay(y);}
function daysInHY(y){return hNewYear(y+1)-hNewYear(y);}
function longCheshvan(y){return daysInHY(y)%10===5;}
function shortKislev(y){return daysInHY(y)%10===3;}
function lastDayH(m,y){if([2,4,6,10,13].includes(m))return 29;if(m===12&&!hLeap(y))return 29;if(m===8&&!longCheshvan(y))return 29;if(m===9&&shortKislev(y))return 29;return 30;}
function hRD(y,mo,d){let rd=hNewYear(y)+d-1;if(mo<7){const lm=lastMonthH(y);for(let m=7;m<=lm;m++)rd+=lastDayH(m,y);for(let m=1;m<mo;m++)rd+=lastDayH(m,y);}else{for(let m=7;m<mo;m++)rd+=lastDayH(m,y);}return rd;}
function hFromRD(rd){let y=Math.floor((rd-HEB_EPOCH)/366);while(hNewYear(y+1)<=rd)y++;let m=(rd<hRD(y,1,1))?7:1;while(rd>hRD(y,m,lastDayH(m,y)))m++;return {year:y,month:m,day:rd-hRD(y,m,1)+1};}
function todayHeb(d){d=d||new Date();return hFromRD(gRD(d.getFullYear(),d.getMonth()+1,d.getDate()));}
function monthHe(m,y){return (m===12&&hLeap(y))?"\u05D0\u05B2\u05D3\u05B8\u05E8 \u05D0'":HMONTHS_HE[m-1];}
function gematria(n){if(n<=0)return "";const o=["","\u05D0","\u05D1","\u05D2","\u05D3","\u05D4","\u05D5","\u05D6","\u05D7","\u05D8"];const t=["","\u05D9","\u05DB","\u05DC","\u05DE","\u05E0","\u05E1","\u05E2","\u05E4","\u05E6"];const hu=["","\u05E7","\u05E8","\u05E9","\u05EA"];if(n===15)return "\u05D8\u05D5";if(n===16)return "\u05D8\u05D6";if(n>400){let s="",r=n;while(r>=400){s+="\u05EA";r-=400;}return s+gematria(r);}const h=Math.floor(n/100),tt=Math.floor((n%100)/10),oo=n%10;return (hu[h]||"")+(t[tt]||"")+(o[oo]||"");}

/* ====== ZMANIM (astronomical, real) ====== */
function julianDay(d){const y=d.getFullYear(),m=d.getMonth()+1,dy=d.getDate();const a=Math.floor((14-m)/12);const yy=y+4800-a;const mm=m+12*a-3;return dy+Math.floor((153*mm+2)/5)+365*yy+Math.floor(yy/4)-Math.floor(yy/100)+Math.floor(yy/400)-32045;}
function solarBase(date,lat,lng){const n=julianDay(date)-2451545.0+0.0008;const Jstar=n-lng/360;const M=(357.5291+0.98560028*Jstar)%360;const Mr=M*Math.PI/180;const C=1.9148*Math.sin(Mr)+0.0200*Math.sin(2*Mr)+0.0003*Math.sin(3*Mr);const lam=(M+C+180+102.9372)%360;const lamR=lam*Math.PI/180;const Jtran=2451545+Jstar+0.0053*Math.sin(Mr)-0.0069*Math.sin(2*lamR);const delta=Math.asin(Math.sin(lamR)*Math.sin(23.44*Math.PI/180));return {Jtran,delta,lat};}
function haFor(deg,b){const phi=b.lat*Math.PI/180;const aR=deg*Math.PI/180;const cosH=(Math.sin(aR)-Math.sin(phi)*Math.sin(b.delta))/(Math.cos(phi)*Math.cos(b.delta));if(cosH<-1||cosH>1)return null;return Math.acos(cosH)*180/Math.PI;}
function tzForLoc(loc){if(!loc)return Intl.DateTimeFormat().resolvedOptions().timeZone;if(loc.tz)return loc.tz;const n=(loc.name||"").toLowerCase();if(/denver|colorado/.test(n))return "America/Denver";if(/jerusalem|tel aviv|israel|bnei brak|haifa|yerushalayim/.test(n))return "Asia/Jerusalem";if(/new york|brooklyn|lakewood|crown heights|miami|monsey/.test(n))return "America/New_York";if(/los angeles/.test(n))return "America/Los_Angeles";if(/houston|chicago|dallas/.test(n))return "America/Chicago";if(/london|manchester/.test(n))return "Europe/London";if(/toronto/.test(n))return "America/Toronto";if(/phoenix/.test(n))return "America/Phoenix";try{return Intl.DateTimeFormat().resolvedOptions().timeZone;}catch(e){return "UTC";}}
function jdToLocalMin(jd,tz){if(jd==null)return null;const utcMs=(jd-2440587.5)*86400000;try{const p=new Intl.DateTimeFormat("en-US",{timeZone:tz,hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(new Date(utcMs));return +p.find(x=>x.type==="hour").value*60+ +p.find(x=>x.type==="minute").value;}catch(e){return null;}}
function computeZmanim(date,loc){const b=solarBase(date,loc.lat,loc.lng);const sHA=haFor(-.833,b);if(!sHA)return null;const dHA=haFor(-16.1,b);const tHA=haFor(-8.5,b);const Jn=b.Jtran;const Jr=Jn-sHA/360,Js=Jn+sHA/360;const tz=tzForLoc(loc);const r=jdToLocalMin(Jr,tz),s=jdToLocalMin(Js,tz);if(r==null||s==null)return null;let day=s-r;if(day<0)day+=1440;const sha=day/12;return {alot:jdToLocalMin(dHA?Jn-dHA/360:null,tz),netz:r,shma:r+sha*3,tefila:r+sha*4,chatzot:jdToLocalMin(Jn,tz),minchaG:r+sha*6.5,minchaK:r+sha*9.5,plag:r+sha*10.75,shkia:s,tzeit:jdToLocalMin(tHA?Jn+tHA/360:null,tz)};}
function nowInLocTz(loc){const tz=tzForLoc(loc);try{const p=new Intl.DateTimeFormat("en-US",{timeZone:tz,hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(new Date());return +p.find(x=>x.type==="hour").value*60+ +p.find(x=>x.type==="minute").value;}catch(e){const n=new Date();return n.getHours()*60+n.getMinutes();}}
function hmFmt(t){if(t==null||isNaN(t))return "\u2014";const T=Math.round(t);let h=Math.floor(T/60)%24;const mm=String(T%60).padStart(2,"0");const fmt=(typeof state!=="undefined"&&state&&state.timeFmt)||"12";if(fmt==="24")return h+":"+mm;const ap=h<12?"AM":"PM";let h12=h%12;if(h12===0)h12=12;return h12+":"+mm+" "+ap;}
function gregToHeb(y,m,d){return hFromRD(gRD(y,m,d));}
function computeHebAge(b){if(!b)return null;const t=todayHeb();let a=t.year-b.year;if(t.month<b.month||(t.month===b.month&&t.day<b.day))a-=1;return a;}
function daysToHebBday(b){if(!b)return null;const n=new Date();const t=todayHeb(n);let yr=t.year;if(t.month>b.month||(t.month===b.month&&t.day>=b.day))yr+=1;let bm=b.month,bd=b.day;if(bm===12&&hLeap(yr)&&!hLeap(b.year))bm=13;const md=lastDayH(bm,yr);if(bd>md)bd=md;return hRD(yr,bm,bd)-gRD(n.getFullYear(),n.getMonth()+1,n.getDate());}
function omerCount(d){const h=todayHeb(d||new Date());if(h.month===1&&h.day>=16)return h.day-15;if(h.month===2)return 15+h.day;if(h.month===3&&h.day<=5)return 44+h.day;return 0;}
function activeTags(d,mode){d=d||new Date();const h=todayHeb(d);const t=new Set();if(h.day===1||h.day===30)t.add("rc");if((h.month===9&&h.day>=25)||(h.month===10&&h.day<=2))t.add("chanukah");if(h.month===1)t.add("nissan");if((h.month===1&&h.day>=16)||h.month===2||(h.month===3&&h.day<=5))t.add("omer");if(mode==="israel"||mode==="yerushalayim")t.add("israel");return t;}

/* ====== CITY DATABASE ====== */
const CITIES=[
 ["Denver, CO",39.7392,-104.9903,"America/Denver"],["Jerusalem",31.7683,35.2137,"Asia/Jerusalem"],
 ["Bnei Brak",32.0838,34.8338,"Asia/Jerusalem"],["Tel Aviv",32.0853,34.7818,"Asia/Jerusalem"],
 ["Haifa",32.7940,34.9896,"Asia/Jerusalem"],["Beit Shemesh",31.7497,34.9886,"Asia/Jerusalem"],
 ["Tzfat",32.9646,35.4960,"Asia/Jerusalem"],["New York, NY",40.7128,-74.006,"America/New_York"],
 ["Brooklyn, NY",40.6782,-73.9442,"America/New_York"],["Lakewood, NJ",40.0978,-74.2176,"America/New_York"],
 ["Monsey, NY",41.1112,-74.0682,"America/New_York"],["Miami, FL",25.7617,-80.1918,"America/New_York"],
 ["Los Angeles, CA",34.0522,-118.2437,"America/Los_Angeles"],["Chicago, IL",41.8781,-87.6298,"America/Chicago"],
 ["Houston, TX",29.7604,-95.3698,"America/Chicago"],["Dallas, TX",32.7767,-96.7970,"America/Chicago"],
 ["Phoenix, AZ",33.4484,-112.0740,"America/Phoenix"],["Toronto",43.6532,-79.3832,"America/Toronto"],
 ["Montreal",45.5019,-73.5674,"America/Toronto"],["London",51.5074,-0.1278,"Europe/London"],
 ["Manchester, UK",53.4808,-2.2426,"Europe/London"],["Paris",48.8566,2.3522,"Europe/Paris"],
 ["Antwerp",51.2194,4.4025,"Europe/Brussels"],["Melbourne",-37.8136,144.9631,"Australia/Melbourne"],
 ["Sydney",-33.8688,151.2093,"Australia/Sydney"],["Johannesburg",-26.2041,28.0473,"Africa/Johannesburg"],
 ["Buenos Aires",-34.6037,-58.3816,"America/Argentina/Buenos_Aires"],["Mexico City",19.4326,-99.1332,"America/Mexico_City"]
];

