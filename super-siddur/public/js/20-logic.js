"use strict";
/* Occasional/seasonal prayers, categories, verse DB, prayer ordering */
/* ====== OCCASIONAL & SEASONAL PRAYERS ====== */
const OCC_SERVICES=[
  {id:"hallel",en:"Hallel",he:"\u05D4\u05B7\u05DC\u05B5\u05BC\u05DC",when:"Festivals, Rosh Chodesh, Chanukah",icon:"sun",tags:["hallel"],cat:"holiday"},
  {id:"chanukah",en:"Chanukah Lights",he:"\u05D4\u05B7\u05D3\u05B0\u05DC\u05B8\u05E7\u05B7\u05EA \u05E0\u05B5\u05E8\u05D5\u05BA\u05EA \u05D7\u05B2\u05E0\u05D5\u05BB\u05DB\u05B8\u05BC\u05D4",when:"Eight nights of Chanukah",icon:"sun",tags:["chanukah"],cat:"holiday"},
  {id:"avinu",en:"Avinu Malkeinu",he:"\u05D0\u05B8\u05D1\u05B4\u05D9\u05E0\u05D5\u05BC \u05DE\u05B7\u05DC\u05B0\u05DB\u05B5\u05BC\u05E0\u05D5\u05BC",when:"Ten Days of Repentance & fasts",icon:"star",tags:["avinu"],cat:"holiday"},
  {id:"hatarat",en:"Hatarat Nedarim",he:"\u05D4\u05B7\u05EA\u05B8\u05BC\u05E8\u05B7\u05EA \u05E0\u05B0\u05D3\u05B8\u05E8\u05B4\u05D9\u05DD",when:"Erev Rosh HaShanah",icon:"star",cat:"holiday"},
  {id:"ilanot",en:"Birkat HaIlanot",he:"\u05D1\u05B4\u05BC\u05E8\u05B0\u05DB\u05B7\u05BC\u05EA \u05D4\u05B8\u05D0\u05B4\u05D9\u05DC\u05B8\u05E0\u05D5\u05BA\u05EA",when:"Blossoming trees in Nissan",icon:"path",tags:["nissan"],cat:"holiday"},
  {id:"tachanun",en:"Tachanun",he:"\u05EA\u05B7\u05BC\u05D7\u05B2\u05E0\u05D5\u05BC\u05DF",when:"Weekday supplication",icon:"star",tags:["tachanun"],cat:"occasion"},
  {id:"levana",en:"Kiddush Levana",he:"\u05E7\u05B4\u05D3\u05D5\u05BC\u05E9 \u05DC\u05B0\u05D1\u05B8\u05E0\u05B8\u05D4",when:"Sanctifying the new moon",icon:"moon",cat:"occasion"},
  {id:"special",en:"Special Blessings",he:"\u05D1\u05B0\u05E8\u05B8\u05DB\u05D5\u05B9\u05EA \u05D4\u05B8\u05E8\u05B0\u05D0\u05B4\u05D9\u05B8\u05BC\u05D4",when:"On wonders & rare sights",icon:"star",cat:"occasion"},
  {id:"malei",en:"Keil Malei Rachamim",he:"\u05D0\u05B5\u05DC \u05DE\u05B8\u05DC\u05B5\u05D0 \u05E8\u05B7\u05D7\u05B2\u05DE\u05B4\u05D9\u05DD",when:"Memorial prayer",icon:"moon",cat:"occasion"},
  {id:"shevabrachot",en:"Sheva Brachot",he:"\u05E9\u05B6\u05C1\u05D1\u05B7\u05E2 \u05D1\u05B0\u05E8\u05B8\u05DB\u05D5\u05B9\u05EA",when:"At a wedding & the week after",icon:"star",cat:"occasion"}
];
const OCC_PRAYERS={};
function occP(he,tr,en,extra){return Object.assign({k:"p",he,tr,en},extra||{});}
function occR(text){return {k:"rubric",text};}
function occPR(id,en,he,blocks,section){return {id,en,he,blocks,section:section||""};}

/* Tachanun (weekday, after Amidah; omitted on festive days) */
OCC_PRAYERS.tachanun=[
  occPR("tach_vayomer","Vayomer David","\u05D5\u05B7\u05D9\u05BC\u05D0\u05DE\u05B6\u05E8 \u05D3\u05B8\u05D5\u05B4\u05D3",[
    occR("Not said on Shabbat, festivals, Rosh Chodesh, Chanukah, or other festive days."),
    occP("\u05D5\u05B7\u05D9\u05BC\u05D0\u05DE\u05B6\u05E8 \u05D3\u05B8\u05D5\u05B4\u05D3 \u05D0\u05B6\u05DC \u05D2\u05B8\u05BC\u05D3: \u05E6\u05B7\u05D1\u05BE\u05DC\u05B4\u05D9 \u05DE\u05B0\u05D0\u05B9\u05D3, \u05E0\u05B4\u05BC\u05E4\u05B0\u05BC\u05DC\u05B8\u05D4 \u05E0\u05B8\u05BC\u05D0 \u05D1\u05B0\u05D9\u05B7\u05D3\u05BE\u05D9\u05B0\u05D9\u05B8, \u05DB\u05B4\u05BC\u05D9\u05BE\u05E8\u05B7\u05D1\u05B4\u05BC\u05D9\u05DD \u05E8\u05B7\u05D7\u05B2\u05DE\u05B8\u05D5, \u05D5\u05BC\u05D1\u05B0\u05D9\u05B7\u05D3 \u05D0\u05B8\u05D3\u05B8\u05DD \u05D0\u05B7\u05DC\u05BE\u05D0\u05B6\u05E4\u05B8\u05BC\u05DC\u05B8\u05D4.","Vayomer David el Gad: tzar li me'od, niplah na veyad Adonai ki rabim rachamav, uvyad adam al epola.","David said to Gad: I am in great distress; let us fall into the hand of the Lord, for His mercies are great, but let me not fall into the hand of man.")
  ],"Tachanun"),
  occPR("tach_psalm6","Psalm 6 \u00B7 Nefilat Apayim","\u05E0\u05B0\u05E4\u05B4\u05D9\u05DC\u05B7\u05EA \u05D0\u05B7\u05E4\u05B7\u05BC\u05D9\u05B4\u05DD",[
    occR("Recited resting the head on the arm; without tefillin, or on the right arm when wearing them."),
    occP("\u05D9\u05B0\u05D4\u05D5\u05B8\u05D4, \u05D0\u05B7\u05DC\u05BE\u05D1\u05B0\u05D0\u05B7\u05E4\u05B0\u05BC\u05DA\u05B8 \u05EA\u05D5\u05B9\u05DB\u05B4\u05D9\u05D7\u05B5\u05E0\u05B4\u05D9, \u05D5\u05B0\u05D0\u05B7\u05DC\u05BE\u05D1\u05B7\u05D7\u05B2\u05DE\u05B8\u05EA\u05B0\u05DA\u05B8 \u05EA\u05B0\u05D9\u05B7\u05E1\u05B0\u05BC\u05E8\u05B5\u05E0\u05B4\u05D9. \u05D7\u05B8\u05E0\u05B5\u05BC\u05E0\u05B4\u05D9 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05DB\u05B4\u05BC\u05D9 \u05D0\u05BB\u05DE\u05B0\u05DC\u05B7\u05DC \u05D0\u05B8\u05E0\u05B4\u05D9, \u05E8\u05B0\u05E4\u05B8\u05D0\u05E0\u05B4\u05D9 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05DB\u05B4\u05BC\u05D9 \u05E0\u05B4\u05D1\u05B0\u05D4\u05B2\u05DC\u05D5\u05BC \u05E2\u05B2\u05E6\u05B8\u05DE\u05B8\u05D9.","Adonai al be'apcha tochicheni, ve'al bachamatcha teyasreni. Choneni Adonai ki umlal ani, refa'eni Adonai ki nivhalu atzamai.","O Lord, do not rebuke me in Your anger, nor chasten me in Your wrath. Be gracious to me, O Lord, for I am weak; heal me, O Lord, for my bones tremble."),
    occP("\u05D5\u05B0\u05E0\u05B7\u05E4\u05B0\u05E9\u05B4\u05C1\u05D9 \u05E0\u05B4\u05D1\u05B0\u05D4\u05B2\u05DC\u05B8\u05D4 \u05DE\u05B0\u05D0\u05B9\u05D3, \u05D5\u05B0\u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05E2\u05B7\u05D3\u05BE\u05DE\u05B8\u05EA\u05B8\u05D9. \u05E9\u05D5\u05BC\u05D1\u05B8\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D7\u05B7\u05DC\u05B0\u05BC\u05E6\u05B8\u05D4 \u05E0\u05B7\u05E4\u05B0\u05E9\u05B4\u05C1\u05D9, \u05D4\u05D5\u05B9\u05E9\u05B4\u05C1\u05D9\u05E2\u05B5\u05E0\u05B4\u05D9 \u05DC\u05B0\u05DE\u05B7\u05E2\u05B7\u05DF \u05D7\u05B7\u05E1\u05B0\u05D3\u05B6\u05BC\u05DA\u05B8.","Venafshi nivhala me'od, ve'ata Adonai ad matai. Shuva Adonai chaltza nafshi, hoshi'eni lema'an chasdecha.","My soul too is greatly troubled; and You, O Lord — how long? Return, O Lord, deliver my soul; save me for the sake of Your kindness.")
  ],"Tachanun"),
  occPR("tach_shomer","Shomer Yisrael","\u05E9\u05B9\u05C1\u05DE\u05B5\u05E8 \u05D9\u05B4\u05E9\u05B0\u05C2\u05E8\u05B8\u05D0\u05B5\u05DC",[
    occP("\u05E9\u05B9\u05C1\u05DE\u05B5\u05E8 \u05D9\u05B4\u05E9\u05B0\u05C2\u05E8\u05B8\u05D0\u05B5\u05DC, \u05E9\u05B0\u05C1\u05DE\u05B9\u05E8 \u05E9\u05B0\u05C1\u05D0\u05B5\u05E8\u05B4\u05D9\u05EA \u05D9\u05B4\u05E9\u05B0\u05C2\u05E8\u05B8\u05D0\u05B5\u05DC, \u05D5\u05B0\u05D0\u05B7\u05DC \u05D9\u05B9\u05D0\u05D1\u05B7\u05D3 \u05D9\u05B4\u05E9\u05B0\u05C2\u05E8\u05B8\u05D0\u05B5\u05DC, \u05D4\u05B8\u05D0\u05D5\u05B9\u05DE\u05B0\u05E8\u05B4\u05D9\u05DD \u05E9\u05B0\u05C1\u05DE\u05B7\u05E2 \u05D9\u05B4\u05E9\u05B0\u05C2\u05E8\u05B8\u05D0\u05B5\u05DC.","Shomer Yisrael, shemor she'erit Yisrael, ve'al yovad Yisrael, ha'omrim Shema Yisrael.","Guardian of Israel, guard the remnant of Israel, and let not Israel perish — those who say, \u201CHear, O Israel.\u201D"),
    occP("\u05D5\u05B7\u05D0\u05B2\u05E0\u05B7\u05D7\u05B0\u05E0\u05D5\u05BC \u05DC\u05B9\u05D0 \u05E0\u05B5\u05D3\u05B7\u05E2 \u05DE\u05B7\u05D4\u05BE\u05E0\u05B7\u05BC\u05E2\u05B2\u05E9\u05B6\u05C2\u05D4, \u05DB\u05B4\u05BC\u05D9 \u05E2\u05B8\u05DC\u05B6\u05D9\u05DA\u05B8 \u05E2\u05B5\u05D9\u05E0\u05B5\u05D9\u05E0\u05D5\u05BC. \u05D6\u05B0\u05DB\u05B9\u05E8 \u05E8\u05B7\u05D7\u05B2\u05DE\u05B6\u05D9\u05DA\u05B8 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D5\u05B7\u05D7\u05B2\u05E1\u05B8\u05D3\u05B6\u05D9\u05DA\u05B8, \u05DB\u05B4\u05BC\u05D9 \u05DE\u05B5\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD \u05D4\u05B5\u05DE\u05B8\u05BC\u05D4.","Va'anachnu lo neda ma na'aseh, ki alecha eineinu. Zechor rachamecha Adonai vachasadecha, ki me'olam hema.","We know not what to do, but our eyes are upon You. Remember Your mercies, O Lord, and Your kindnesses, for they are everlasting.")
  ],"Tachanun")
];

/* Avinu Malkeinu (abridged-standard public lines) */
OCC_PRAYERS.avinu=[
  occPR("am_main","Avinu Malkeinu","\u05D0\u05B8\u05D1\u05B4\u05D9\u05E0\u05D5\u05BC \u05DE\u05B7\u05DC\u05B0\u05DB\u05B5\u05BC\u05E0\u05D5\u05BC",[
    occR("Said during the Ten Days of Repentance and on fast days. The Ark is opened."),
    occP("\u05D0\u05B8\u05D1\u05B4\u05D9\u05E0\u05D5\u05BC \u05DE\u05B7\u05DC\u05B0\u05DB\u05B5\u05BC\u05E0\u05D5\u05BC, \u05D7\u05B8\u05D8\u05B8\u05D0\u05E0\u05D5\u05BC \u05DC\u05B0\u05E4\u05B8\u05E0\u05B6\u05D9\u05DA\u05B8.","Avinu Malkeinu, chatanu lefanecha.","Our Father, our King, we have sinned before You."),
    occP("\u05D0\u05B8\u05D1\u05B4\u05D9\u05E0\u05D5\u05BC \u05DE\u05B7\u05DC\u05B0\u05DB\u05B5\u05BC\u05E0\u05D5\u05BC, \u05D0\u05B5\u05D9\u05DF \u05DC\u05B8\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D0\u05B6\u05DC\u05B8\u05BC\u05D0 \u05D0\u05B8\u05EA\u05B8\u05BC\u05D4.","Avinu Malkeinu, ein lanu melech ela ata.","Our Father, our King, we have no king but You."),
    occP("\u05D0\u05B8\u05D1\u05B4\u05D9\u05E0\u05D5\u05BC \u05DE\u05B7\u05DC\u05B0\u05DB\u05B5\u05BC\u05E0\u05D5\u05BC, \u05E2\u05B2\u05E9\u05B5\u05C2\u05D4 \u05E2\u05B4\u05DE\u05B8\u05BC\u05E0\u05D5\u05BC \u05DC\u05B0\u05DE\u05B7\u05E2\u05B7\u05DF \u05E9\u05B0\u05C1\u05DE\u05B6\u05DA\u05B8.","Avinu Malkeinu, aseh imanu lema'an shemecha.","Our Father, our King, act toward us for the sake of Your name."),
    occP("\u05D0\u05B8\u05D1\u05B4\u05D9\u05E0\u05D5\u05BC \u05DE\u05B7\u05DC\u05B0\u05DB\u05B5\u05BC\u05E0\u05D5\u05BC, \u05D7\u05B7\u05D3\u05B5\u05BC\u05E9 \u05E2\u05B8\u05DC\u05B5\u05D9\u05E0\u05D5\u05BC \u05E9\u05B8\u05C1\u05E0\u05B8\u05D4 \u05D8\u05D5\u05B9\u05D1\u05B8\u05D4.","Avinu Malkeinu, chadesh aleinu shana tova.","Our Father, our King, renew for us a good year."),
    occP("\u05D0\u05B8\u05D1\u05B4\u05D9\u05E0\u05D5\u05BC \u05DE\u05B7\u05DC\u05B0\u05DB\u05B5\u05BC\u05E0\u05D5\u05BC, \u05DB\u05B8\u05BC\u05EA\u05B0\u05D1\u05B5\u05E0\u05D5\u05BC \u05D1\u05B0\u05E1\u05B5\u05E4\u05B6\u05E8 \u05D7\u05B7\u05D9\u05B4\u05BC\u05D9\u05DD \u05D8\u05D5\u05B9\u05D1\u05B4\u05D9\u05DD.","Avinu Malkeinu, katveinu besefer chayim tovim.","Our Father, our King, inscribe us in the book of good life."),
    occP("\u05D0\u05B8\u05D1\u05B4\u05D9\u05E0\u05D5\u05BC \u05DE\u05B7\u05DC\u05B0\u05DB\u05B5\u05BC\u05E0\u05D5\u05BC, \u05D7\u05B8\u05E0\u05B5\u05BC\u05E0\u05D5\u05BC \u05D5\u05B7\u05E2\u05B2\u05E0\u05B5\u05E0\u05D5\u05BC \u05DB\u05B4\u05BC\u05D9 \u05D0\u05B5\u05D9\u05DF \u05D1\u05B8\u05BC\u05E0\u05D5\u05BC \u05DE\u05B7\u05E2\u05B2\u05E9\u05B4\u05C2\u05D9\u05DD, \u05E2\u05B2\u05E9\u05B5\u05C2\u05D4 \u05E2\u05B4\u05DE\u05B8\u05BC\u05E0\u05D5\u05BC \u05E6\u05B0\u05D3\u05B8\u05E7\u05B8\u05D4 \u05D5\u05B8\u05D7\u05B6\u05E1\u05B6\u05D3 \u05D5\u05B0\u05D4\u05D5\u05B9\u05E9\u05B4\u05C1\u05D9\u05E2\u05B5\u05E0\u05D5\u05BC.","Avinu Malkeinu, choneinu va'aneinu ki ein banu ma'asim, aseh imanu tzedaka vachesed vehoshi'einu.","Our Father, our King, be gracious to us and answer us, for we have no worthy deeds; deal with us in charity and kindness, and save us.")
  ],"Avinu Malkeinu")
];

/* Chanukah lights */
OCC_PRAYERS.chanukah=[
  occPR("chan_brachot","Lighting Blessings","\u05D1\u05B4\u05BC\u05E8\u05B0\u05DB\u05D5\u05B9\u05EA \u05D4\u05B7\u05D3\u05B0\u05DC\u05B8\u05E7\u05B8\u05D4",[
    occR("Light each night after nightfall; on the first night include Shehecheyanu."),
    occP("\u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD, \u05D0\u05B2\u05E9\u05B6\u05C1\u05E8 \u05E7\u05B4\u05D3\u05B0\u05BC\u05E9\u05B8\u05C1\u05E0\u05D5\u05BC \u05D1\u05B0\u05DE\u05B4\u05E6\u05B0\u05D5\u05B9\u05EA\u05B8\u05D9\u05D5, \u05D5\u05B0\u05E6\u05B4\u05D5\u05B8\u05BC\u05E0\u05D5\u05BC \u05DC\u05B0\u05D4\u05B7\u05D3\u05B0\u05DC\u05B4\u05D9\u05E7 \u05E0\u05B5\u05E8 \u05E9\u05B6\u05C1\u05DC \u05D7\u05B2\u05E0\u05D5\u05BB\u05DB\u05B8\u05BC\u05D4.","Baruch ata Adonai Eloheinu melech ha'olam, asher kideshanu bemitzvotav, vetzivanu lehadlik ner shel Chanukah.","Blessed are You, Lord our God, King of the universe, who has sanctified us with His commandments and commanded us to kindle the Chanukah light."),
    occP("\u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD, \u05E9\u05B6\u05C1\u05E2\u05B8\u05E9\u05B8\u05C2\u05D4 \u05E0\u05B4\u05E1\u05B4\u05BC\u05D9\u05DD \u05DC\u05B7\u05D0\u05B2\u05D1\u05D5\u05B9\u05EA\u05B5\u05D9\u05E0\u05D5\u05BC \u05D1\u05B7\u05BC\u05D9\u05B8\u05BC\u05DE\u05B4\u05D9\u05DD \u05D4\u05B8\u05D4\u05B5\u05DD \u05D1\u05B4\u05BC\u05D6\u05B0\u05DE\u05B7\u05DF \u05D4\u05B7\u05D6\u05B6\u05BC\u05D4.","Baruch ata Adonai Eloheinu melech ha'olam, she'asa nisim la'avoteinu bayamim hahem bazman hazeh.","Blessed are You, Lord our God, King of the universe, who performed miracles for our ancestors in those days, at this time."),
    occR("First night only:"),
    occP("\u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD, \u05E9\u05B6\u05C1\u05D4\u05B6\u05D7\u05B1\u05D9\u05B8\u05E0\u05D5\u05BC \u05D5\u05B0\u05E7\u05B4\u05D9\u05B0\u05BC\u05DE\u05B8\u05E0\u05D5\u05BC \u05D5\u05B0\u05D4\u05B4\u05D2\u05B4\u05BC\u05D9\u05E2\u05B8\u05E0\u05D5\u05BC \u05DC\u05B7\u05D6\u05B0\u05BC\u05DE\u05B7\u05DF \u05D4\u05B7\u05D6\u05B6\u05BC\u05D4.","Baruch ata Adonai Eloheinu melech ha'olam, shehecheyanu vekiyemanu vehigi'anu lazman hazeh.","Blessed are You, Lord our God, King of the universe, who has kept us alive, sustained us, and brought us to this season.")
  ],"Chanukah"),
  occPR("chan_haneirot","HaNeirot Halalu","\u05D4\u05B7\u05E0\u05B5\u05BC\u05E8\u05D5\u05B9\u05EA \u05D4\u05B7\u05DC\u05B8\u05BC\u05DC\u05D5\u05BC",[
    occP("\u05D4\u05B7\u05E0\u05B5\u05BC\u05E8\u05D5\u05B9\u05EA \u05D4\u05B7\u05DC\u05B8\u05BC\u05DC\u05D5\u05BC \u05D0\u05B8\u05E0\u05D5\u05BC \u05DE\u05B7\u05D3\u05B0\u05DC\u05B4\u05D9\u05E7\u05B4\u05D9\u05DF, \u05E2\u05B7\u05DC \u05D4\u05B7\u05E0\u05B4\u05BC\u05E1\u05B4\u05BC\u05D9\u05DD \u05D5\u05B0\u05E2\u05B7\u05DC \u05D4\u05B7\u05E0\u05B4\u05BC\u05E4\u05B0\u05DC\u05B8\u05D0\u05D5\u05B9\u05EA, \u05E9\u05B6\u05C1\u05E2\u05B8\u05E9\u05B4\u05C2\u05D9\u05EA\u05B8 \u05DC\u05B7\u05D0\u05B2\u05D1\u05D5\u05B9\u05EA\u05B5\u05D9\u05E0\u05D5\u05BC.","HaNeirot halalu anu madlikin, al hanisim ve'al haniflaot, she'asita la'avoteinu.","These lights we kindle on account of the miracles and wonders You wrought for our ancestors."),
    occP("\u05D5\u05B0\u05DB\u05B8\u05DC \u05E9\u05B0\u05C1\u05DE\u05D5\u05B9\u05E0\u05B7\u05EA \u05D9\u05B0\u05DE\u05B5\u05D9 \u05D7\u05B2\u05E0\u05D5\u05BB\u05DB\u05B8\u05BC\u05D4 \u05D4\u05B7\u05E0\u05B5\u05BC\u05E8\u05D5\u05B9\u05EA \u05D4\u05B7\u05DC\u05B8\u05BC\u05DC\u05D5\u05BC \u05E7\u05B9\u05D3\u05B6\u05E9 \u05D4\u05B5\u05DD, \u05D5\u05B0\u05D0\u05B5\u05D9\u05DF \u05DC\u05B8\u05E0\u05D5\u05BC \u05E8\u05B0\u05E9\u05D5\u05BC\u05EA \u05DC\u05B0\u05D4\u05B4\u05E9\u05B0\u05C1\u05EA\u05B7\u05DE\u05B5\u05BC\u05E9 \u05D1\u05B8\u05BC\u05D4\u05B6\u05DD.","Vechol shemonat yemei Chanukah haneirot halalu kodesh hem, ve'ein lanu reshut lehishtamesh bahem.","Throughout the eight days of Chanukah these lights are holy, and we are not permitted to make use of them.")
  ],"Chanukah")
];

/* Hallel (opening blessing + first psalm) */
OCC_PRAYERS.hallel=[
  occPR("hallel_open","Blessing & Hallelujah","\u05D1\u05B4\u05BC\u05E8\u05B0\u05DB\u05B7\u05BC\u05EA \u05D4\u05B7\u05D4\u05B7\u05DC\u05B5\u05BC\u05DC",[
    occR("Recited on festivals, Rosh Chodesh, and Chanukah after the Amidah."),
    occP("\u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD, \u05D0\u05B2\u05E9\u05B6\u05C1\u05E8 \u05E7\u05B4\u05D3\u05B0\u05BC\u05E9\u05B8\u05C1\u05E0\u05D5\u05BC \u05D1\u05B0\u05DE\u05B4\u05E6\u05B0\u05D5\u05B9\u05EA\u05B8\u05D9\u05D5, \u05D5\u05B0\u05E6\u05B4\u05D5\u05B8\u05BC\u05E0\u05D5\u05BC \u05DC\u05B4\u05E7\u05B0\u05E8\u05D5\u05B9\u05D0 \u05D0\u05B6\u05EA \u05D4\u05B7\u05D4\u05B7\u05DC\u05B5\u05BC\u05DC.","Baruch ata Adonai Eloheinu melech ha'olam, asher kideshanu bemitzvotav, vetzivanu likro et haHallel.","Blessed are You, Lord our God, King of the universe, who has sanctified us with His commandments and commanded us to recite the Hallel."),
    occP("\u05D4\u05B7\u05DC\u05B0\u05DC\u05D5\u05BC\u05D9\u05B8\u05D4. \u05D4\u05B7\u05DC\u05B0\u05DC\u05D5\u05BC \u05E2\u05B7\u05D1\u05B0\u05D3\u05B5\u05D9 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4, \u05D4\u05B7\u05DC\u05B0\u05DC\u05D5\u05BC \u05D0\u05B6\u05EA \u05E9\u05B5\u05C1\u05DD \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4. \u05D9\u05B0\u05D4\u05B4\u05D9 \u05E9\u05B5\u05C1\u05DD \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05DE\u05B0\u05D1\u05B9\u05E8\u05B8\u05DA\u05B0, \u05DE\u05B5\u05E2\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D5\u05B0\u05E2\u05B7\u05D3 \u05E2\u05D5\u05B9\u05DC\u05B8\u05DD.","Halleluyah. Hallelu avdei Adonai, hallelu et shem Adonai. Yehi shem Adonai mevorach, me'ata ve'ad olam.","Praise the Lord. Praise, O servants of the Lord, praise the name of the Lord. Blessed be the name of the Lord from now and forever.")
  ],"Hallel")
];

/* Kiddush Levana */
OCC_PRAYERS.levana=[
  occPR("lev_main","Kiddush Levana","\u05E7\u05B4\u05D3\u05D5\u05BC\u05E9 \u05DC\u05B0\u05D1\u05B8\u05E0\u05B8\u05D4",[
    occR("Said outdoors under the open sky, from after the new moon until mid-month, preferably on Motzaei Shabbat."),
    occP("\u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD, \u05D0\u05B2\u05E9\u05B6\u05C1\u05E8 \u05D1\u05B0\u05DE\u05B7\u05D0\u05B2\u05DE\u05B8\u05E8\u05D5\u05B9 \u05D1\u05B8\u05BC\u05E8\u05B8\u05D0 \u05E9\u05B0\u05C1\u05D7\u05B8\u05E7\u05B4\u05D9\u05DD, \u05D5\u05B4\u05D1\u05B0\u05E8\u05D5\u05BC\u05D7\u05B7 \u05E4\u05B4\u05BC\u05D9\u05D5 \u05DB\u05B8\u05BC\u05DC \u05E6\u05B0\u05D1\u05B8\u05D0\u05B8\u05DD.","Baruch ata Adonai Eloheinu melech ha'olam, asher bema'amaro bara shechakim, uvru'ach piv kol tzeva'am.","Blessed are You, Lord our God, King of the universe, who by His word created the heavens, and by the breath of His mouth all their host."),
    occR("Rise on the toes three times toward the moon and say:"),
    occP("\u05DB\u05B0\u05BC\u05E9\u05B5\u05C1\u05DD \u05E9\u05B6\u05C1\u05D0\u05B2\u05E0\u05B4\u05D9 \u05E8\u05D5\u05B9\u05E7\u05B5\u05D3 \u05DB\u05B0\u05E0\u05B6\u05D2\u05B0\u05D3\u05B5\u05DA\u05B0 \u05D5\u05B0\u05D0\u05B5\u05D9\u05E0\u05B4\u05D9 \u05D9\u05B8\u05DB\u05D5\u05B9\u05DC \u05DC\u05B4\u05E0\u05B0\u05D2\u05B9\u05BC\u05E2\u05B7 \u05D1\u05B8\u05BC\u05DA\u05B0, \u05DB\u05B5\u05BC\u05DF \u05DC\u05B9\u05D0 \u05D9\u05D5\u05BC\u05DB\u05B0\u05DC\u05D5\u05BC \u05DB\u05B8\u05DC \u05D0\u05D5\u05B9\u05D9\u05B0\u05D1\u05B7\u05D9 \u05DC\u05B4\u05E0\u05B0\u05D2\u05B9\u05BC\u05E2\u05B7 \u05D1\u05B4\u05BC\u05D9 \u05DC\u05B0\u05E8\u05B8\u05E2\u05B8\u05D4.","Keshem she'ani roked kenegdech ve'eini yachol lingo'a bach, ken lo yuchlu kol oyvai lingo'a bi lera'a.","Just as I leap toward you but cannot touch you, so may none of my foes be able to touch me for harm."),
    occP("\u05E9\u05B8\u05BC\u05DC\u05D5\u05B9\u05DD \u05E2\u05B2\u05DC\u05B5\u05D9\u05DB\u05B6\u05DD. \u05E2\u05B2\u05DC\u05B5\u05D9\u05DB\u05B6\u05DD \u05E9\u05B8\u05BC\u05DC\u05D5\u05B9\u05DD. \u05E1\u05B4\u05D9\u05DE\u05B8\u05DF \u05D8\u05D5\u05B9\u05D1 \u05D9\u05B0\u05D4\u05B5\u05D0 \u05DC\u05B8\u05E0\u05D5\u05BC \u05D5\u05BC\u05DC\u05B0\u05DB\u05B8\u05DC\u05DC \u05D9\u05B4\u05E9\u05B0\u05C2\u05E8\u05B8\u05D0\u05B5\u05DC. \u05D0\u05B8\u05DE\u05B5\u05DF.","Shalom aleichem. Aleichem shalom. Siman tov yehe lanu ulchol Yisrael. Amen.","Peace be upon you. Upon you, peace. May it be a good sign for us and for all Israel. Amen.")
  ],"Kiddush Levana")
];

/* Birkat HaIlanot */
OCC_PRAYERS.ilanot=[
  occPR("ilan_main","Blessing on Trees","\u05D1\u05B4\u05BC\u05E8\u05B0\u05DB\u05B7\u05BC\u05EA \u05D4\u05B8\u05D0\u05B4\u05D9\u05DC\u05B8\u05E0\u05D5\u05BA\u05EA",[
    occR("Said once a year during Nissan upon seeing fruit trees in blossom."),
    occP("\u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD, \u05E9\u05B6\u05C1\u05DC\u05B9\u05D0 \u05D7\u05B4\u05D8\u05B7\u05BC\u05E8 \u05D1\u05B0\u05E2\u05D5\u05B9\u05DC\u05B8\u05DE\u05D5\u05B9 \u05DB\u05B0\u05BC\u05DC\u05D5\u05BC\u05DD, \u05D5\u05B5\u05D1\u05B8\u05BC\u05E8\u05B8\u05D0 \u05D1\u05D5\u05B9 \u05D1\u05B0\u05E8\u05B4\u05BC\u05D9\u05D5\u05B9\u05EA \u05D8\u05D5\u05B9\u05D1\u05D5\u05B9\u05EA, \u05D5\u05B0\u05D0\u05B4\u05D9\u05DC\u05B8\u05E0\u05D5\u05B9\u05EA \u05D8\u05D5\u05B9\u05D1\u05D5\u05B9\u05EA, \u05DC\u05B5\u05D4\u05B8\u05E0\u05D5\u05B9\u05EA \u05D1\u05B8\u05BC\u05D4\u05B6\u05DD \u05D1\u05B0\u05E0\u05B5\u05D9 \u05D0\u05B8\u05D3\u05B8\u05DD.","Baruch ata Adonai Eloheinu melech ha'olam, shelo chisar be'olamo klum, uvara vo beriyot tovot ve'ilanot tovot, lehanot bahem benei adam.","Blessed are You, Lord our God, King of the universe, who has left nothing lacking in His world, and created in it good creatures and good trees for people to enjoy.")
  ],"Birkat HaIlanot")
];

/* Bracha Achrona */
/* Special Blessings (Birchot HaRe'iyah & others) */
OCC_PRAYERS.special=[
  occPR("sp_intro","Blessings on Wonders","\u05D1\u05B4\u05BC\u05E8\u05B0\u05DB\u05D5\u05B9\u05EA \u05D4\u05B8\u05E8\u05B0\u05D0\u05B4\u05D9\u05B8\u05BC\u05D4",[
    occR("Each blessing opens \u201CBaruch ata Adonai Eloheinu melech ha'olam\u201D \u2014 Blessed are You, Lord our God, King of the universe \u2014 then concludes as below.")
  ],"Special Blessings"),
  occPR("sp_lightning","On Lightning & Comets","\u05E2\u05B7\u05DC \u05D4\u05B7\u05D1\u05B0\u05BC\u05E8\u05B8\u05E7\u05B4\u05D9\u05DD",[
    occR("On seeing lightning, shooting stars, comets, great mountains, or vast deserts."),
    occP("\u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD, \u05E2\u05B9\u05E9\u05B6\u05C2\u05D4 \u05DE\u05B7\u05E2\u05B2\u05E9\u05B5\u05C2\u05D4 \u05D1\u05B0\u05E8\u05B5\u05D0\u05E9\u05B4\u05C1\u05D9\u05EA.","Baruch ata Adonai Eloheinu melech ha'olam, oseh ma'aseh vereshit.","...who makes the work of creation.")
  ],"Special Blessings"),
  occPR("sp_thunder","On Thunder & Storms","\u05E2\u05B7\u05DC \u05D4\u05B8\u05E8\u05B0\u05E2\u05B8\u05DE\u05B4\u05D9\u05DD",[
    occR("On hearing thunder, or on fierce winds and storms."),
    occP("\u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD, \u05E9\u05B6\u05BC\u05DB\u05B9\u05D7\u05D5\u05B9 \u05D5\u05BC\u05D2\u05B0\u05D1\u05D5\u05BC\u05E8\u05B8\u05EA\u05D5\u05B9 \u05DE\u05B8\u05DC\u05B5\u05D0 \u05E2\u05D5\u05B9\u05DC\u05B8\u05DD.","Baruch ata Adonai Eloheinu melech ha'olam, shekocho ugvurato male olam.","...whose power and might fill the world.")
  ],"Special Blessings"),
  occPR("sp_rainbow","On a Rainbow","\u05E2\u05B7\u05DC \u05D4\u05B7\u05E7\u05B6\u05BC\u05E9\u05B6\u05C1\u05EA",[
    occR("On seeing a rainbow."),
    occP("\u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD, \u05D6\u05D5\u05B9\u05DB\u05B5\u05E8 \u05D4\u05B7\u05D1\u05B0\u05BC\u05E8\u05B4\u05D9\u05EA \u05D5\u05B0\u05E0\u05B6\u05D0\u05B1\u05DE\u05B8\u05DF \u05D1\u05B4\u05BC\u05D1\u05B0\u05E8\u05B4\u05D9\u05EA\u05D5\u05B9 \u05D5\u05B0\u05E7\u05B7\u05D9\u05B8\u05BC\u05DD \u05D1\u05B0\u05DE\u05B7\u05D0\u05B2\u05DE\u05B8\u05E8\u05D5\u05B9.","Baruch ata Adonai Eloheinu melech ha'olam, zocher habrit vene'eman bivrito vekayam bema'amaro.","...who remembers the covenant, is faithful to His covenant, and keeps His word.")
  ],"Special Blessings"),
  occPR("sp_ocean","On the Sea & Wonders of Nature","\u05E2\u05B7\u05DC \u05D4\u05B7\u05D9\u05B8\u05BC\u05DD",[
    occR("On seeing the great sea (the Mediterranean), or oceans."),
    occP("\u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD, \u05E9\u05B6\u05BC\u05E2\u05B8\u05E9\u05B8\u05C2\u05D4 \u05D0\u05B6\u05EA \u05D4\u05B7\u05D9\u05B8\u05BC\u05DD \u05D4\u05B7\u05D2\u05B8\u05BC\u05D3\u05D5\u05B9\u05DC.","Baruch ata Adonai Eloheinu melech ha'olam, she'asa et hayam hagadol.","...who made the great sea.")
  ],"Special Blessings"),
  occPR("sp_trees","On Fragrant Trees & Blossoms","\u05E2\u05B7\u05DC \u05E8\u05B5\u05D9\u05D7\u05B7 \u05D8\u05D5\u05B9\u05D1",[
    occR("On seeing trees in first blossom in Nissan (see also Birkat HaIlanot), and on beautiful creatures or trees."),
    occP("\u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD, \u05E9\u05B6\u05BC\u05DB\u05B8\u05BC\u05DB\u05B8\u05D4 \u05DC\u05D5\u05B9 \u05D1\u05B0\u05E2\u05D5\u05B9\u05DC\u05B8\u05DE\u05D5\u05B9.","Baruch ata Adonai Eloheinu melech ha'olam, shekacha lo be'olamo.","...who has such things in His world.")
  ],"Special Blessings"),
  occPR("sp_king","On Seeing a King","\u05E2\u05B7\u05DC \u05DE\u05B0\u05DC\u05B8\u05DB\u05B4\u05D9\u05DD",[
    occR("On seeing a reigning monarch or head of state."),
    occP("\u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD, \u05E9\u05B6\u05BC\u05E0\u05B8\u05EA\u05B7\u05DF \u05DE\u05B4\u05DB\u05B0\u05BC\u05D1\u05D5\u05B9\u05D3\u05D5\u05B9 \u05DC\u05B0\u05D1\u05B8\u05E9\u05B8\u05C2\u05E8 \u05D5\u05B8\u05D3\u05B8\u05DD.","Baruch ata Adonai Eloheinu melech ha'olam, shenatan michvodo levasar vadam.","...who has given of His glory to flesh and blood.")
  ],"Special Blessings"),
  occPR("sp_sage","On a Torah Sage","\u05E2\u05B7\u05DC \u05D7\u05B7\u05DB\u05B0\u05DE\u05B5\u05D9 \u05D4\u05B7\u05EA\u05B9\u05BC\u05E8\u05B8\u05D4",[
    occR("On seeing an outstanding Torah scholar."),
    occP("\u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD, \u05E9\u05B6\u05BC\u05D7\u05B8\u05DC\u05B7\u05E7 \u05DE\u05B5\u05D7\u05B8\u05DB\u05B0\u05DE\u05B8\u05EA\u05D5\u05B9 \u05DC\u05B4\u05D9\u05E8\u05B5\u05D0\u05B8\u05D9\u05D5.","Baruch ata Adonai Eloheinu melech ha'olam, shechalak mechochmato lire'av.","...who has imparted of His wisdom to those who fear Him.")
  ],"Special Blessings"),
  occPR("sp_secular","On a Secular Sage","\u05E2\u05B7\u05DC \u05D7\u05B7\u05DB\u05B0\u05DE\u05B5\u05D9 \u05D0\u05BB\u05DE\u05D5\u05B9\u05EA \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD",[
    occR("On seeing a person of great secular wisdom or scientific achievement."),
    occP("\u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD, \u05E9\u05B6\u05BC\u05E0\u05B8\u05EA\u05B7\u05DF \u05DE\u05B5\u05D7\u05B8\u05DB\u05B0\u05DE\u05B8\u05EA\u05D5\u05B9 \u05DC\u05B0\u05D1\u05B8\u05E9\u05B8\u05C2\u05E8 \u05D5\u05B8\u05D3\u05B8\u05DD.","Baruch ata Adonai Eloheinu melech ha'olam, shenatan mechochmato levasar vadam.","...who has given of His wisdom to flesh and blood.")
  ],"Special Blessings"),
  occPR("sp_multitude","On 600,000 Jews Together","\u05E2\u05B7\u05DC \u05E8\u05B4\u05D1\u05B0\u05D1\u05D5\u05B9\u05EA \u05D9\u05B4\u05E9\u05B0\u05C2\u05E8\u05B8\u05D0\u05B5\u05DC",[
    occR("On seeing a multitude of 600,000 or more Jews together."),
    occP("\u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD, \u05D7\u05B2\u05DB\u05B7\u05DD \u05D4\u05B8\u05E8\u05B8\u05D6\u05B4\u05D9\u05DD.","Baruch ata Adonai Eloheinu melech ha'olam, chacham harazim.","...the Knower of secrets.")
  ],"Special Blessings"),
  occPR("sp_moshiach","Anticipating Moshiach","\u05E6\u05B4\u05E4\u05B4\u05BC\u05D9\u05B7\u05BC\u05EA \u05D4\u05B7\u05D2\u05B0\u05D0\u05BB\u05DC\u05B8\u05BC\u05D4",[
    occR("A daily expression of hope for the redemption (from the Amidah and the Thirteen Principles)."),
    occP("\u05D0\u05B2\u05E0\u05B4\u05D9 \u05DE\u05B7\u05D0\u05B2\u05DE\u05B4\u05D9\u05DF \u05D1\u05B6\u05D0\u05B1\u05DE\u05D5\u05BC\u05E0\u05B8\u05D4 \u05E9\u05B0\u05C1\u05DC\u05B5\u05DE\u05B8\u05D4 \u05D1\u05B0\u05D1\u05B4\u05D9\u05D0\u05B7\u05EA \u05D4\u05B7\u05DE\u05B8\u05BC\u05E9\u05B4\u05C1\u05D9\u05D7\u05B7, \u05D5\u05B0\u05D0\u05B7\u05E3 \u05E2\u05B7\u05DC \u05E4\u05B4\u05BC\u05D9 \u05E9\u05B6\u05C1\u05D9\u05B4\u05EA\u05B0\u05DE\u05B7\u05D4\u05B0\u05DE\u05B5\u05D4\u05B7, \u05E2\u05B4\u05DD \u05DB\u05B8\u05BC\u05DC \u05D6\u05B6\u05D4 \u05D0\u05B2\u05D7\u05B7\u05DB\u05B6\u05BC\u05D4 \u05DC\u05D5\u05B9 \u05D1\u05B0\u05DB\u05B8\u05BC\u05DC \u05D9\u05D5\u05B9\u05DD \u05E9\u05B6\u05C1\u05D9\u05B8\u05D1\u05D5\u05B9\u05D0.","Ani ma'amin be'emuna shelema beviat haMashiach, ve'af al pi sheyitmahmeha, im kol zeh achakeh lo bechol yom sheyavo.","I believe with complete faith in the coming of the Messiah; and though he may delay, nonetheless I await his coming every day.")
  ],"Special Blessings"),
  occPR("sp_besorot","On Good & Hard Tidings","\u05E2\u05B7\u05DC \u05D4\u05B7\u05D1\u05B0\u05BC\u05E9\u05B9\u05C2\u05E8\u05D5\u05B9\u05EA",[
    occR("On hearing distinctly good news that benefits oneself and others:"),
    occP("\u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD, \u05D4\u05B7\u05D8\u05D5\u05B9\u05D1 \u05D5\u05B0\u05D4\u05B7\u05DE\u05B5\u05D8\u05B4\u05D9\u05D1.","Baruch ata Adonai Eloheinu melech ha'olam, hatov vehametiv.","...who is good and does good."),
    occR("On hearing sorrowful news, God forbid:"),
    occP("\u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD, \u05D3\u05B7\u05BC\u05D9\u05B8\u05BC\u05DF \u05D4\u05B8\u05D0\u05B1\u05DE\u05B6\u05EA.","Baruch ata Adonai Eloheinu melech ha'olam, dayan ha'emet.","...the true Judge.")
  ],"Special Blessings"),
  occPR("sp_shehecheyanu","Shehecheyanu","\u05E9\u05B6\u05C1\u05D4\u05B6\u05D7\u05B1\u05D9\u05B8\u05E0\u05D5\u05BC",[
    occR("On joyous new occasions \u2014 new fruit, new garments, festivals, and happy firsts."),
    occP("\u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD, \u05E9\u05B6\u05C1\u05D4\u05B6\u05D7\u05B1\u05D9\u05B8\u05E0\u05D5\u05BC \u05D5\u05B0\u05E7\u05B4\u05D9\u05B0\u05BC\u05DE\u05B8\u05E0\u05D5\u05BC \u05D5\u05B0\u05D4\u05B4\u05D2\u05B4\u05BC\u05D9\u05E2\u05B8\u05E0\u05D5\u05BC \u05DC\u05B7\u05D6\u05B0\u05BC\u05DE\u05B7\u05DF \u05D4\u05B7\u05D6\u05B6\u05BC\u05D4.","Baruch ata Adonai Eloheinu melech ha'olam, shehecheyanu vekiyemanu vehigi'anu lazman hazeh.","...who has kept us alive, sustained us, and brought us to this season.")
  ],"Special Blessings")
];

/* Keil Malei Rachamim */
OCC_PRAYERS.malei=[
  occPR("malei_main","Keil Malei Rachamim","\u05D0\u05B5\u05DC \u05DE\u05B8\u05DC\u05B5\u05D0 \u05E8\u05B7\u05D7\u05B2\u05DE\u05B4\u05D9\u05DD",[
    occR("Memorial prayer recited for the departed."),
    occP("\u05D0\u05B5\u05DC \u05DE\u05B8\u05DC\u05B5\u05D0 \u05E8\u05B7\u05D7\u05B2\u05DE\u05B4\u05D9\u05DD \u05E9\u05D5\u05B9\u05DB\u05B5\u05DF \u05D1\u05B7\u05BC\u05DE\u05B0\u05E8\u05D5\u05B9\u05DE\u05B4\u05D9\u05DD, \u05D4\u05B7\u05DE\u05B0\u05E6\u05B5\u05D0 \u05DE\u05B0\u05E0\u05D5\u05BC\u05D7\u05B8\u05D4 \u05E0\u05B0\u05DB\u05D5\u05B9\u05E0\u05B8\u05D4 \u05E2\u05B7\u05DC \u05DB\u05B7\u05BC\u05E0\u05B0\u05E4\u05B5\u05D9 \u05D4\u05B7\u05E9\u05B0\u05BC\u05DB\u05B4\u05D9\u05E0\u05B8\u05D4.","Keil malei rachamim shochen bameromim, hamtzei menucha nechona al kanfei haShechina.","God full of mercy who dwells on high, grant proper rest upon the wings of the Divine Presence."),
    occP("\u05D1\u05B0\u05BC\u05DE\u05B7\u05E2\u05B2\u05DC\u05D5\u05B9\u05EA \u05E7\u05B0\u05D3\u05D5\u05B9\u05E9\u05B4\u05D9\u05DD \u05D5\u05BC\u05D8\u05B0\u05D4\u05D5\u05B9\u05E8\u05B4\u05D9\u05DD \u05DB\u05B0\u05BC\u05D6\u05B9\u05D4\u05B7\u05E8 \u05D4\u05B8\u05E8\u05B8\u05E7\u05B4\u05D9\u05E2\u05B7 \u05DE\u05B7\u05D6\u05B0\u05D4\u05B4\u05D9\u05E8\u05B4\u05D9\u05DD. \u05D1\u05B0\u05BC\u05D2\u05B7\u05DF \u05E2\u05B5\u05D3\u05B6\u05DF \u05EA\u05B0\u05BC\u05D4\u05B5\u05D0 \u05DE\u05B0\u05E0\u05D5\u05BC\u05D7\u05B8\u05EA\u05B8\u05BC\u05D4, \u05D5\u05B0\u05E0\u05B8\u05D7 \u05E2\u05B7\u05DC \u05DE\u05B4\u05E9\u05B0\u05BC\u05DB\u05B8\u05BC\u05D1\u05D5\u05B9, \u05D5\u05B0\u05E0\u05B9\u05D0\u05DE\u05B7\u05E8 \u05D0\u05B8\u05DE\u05B5\u05DF.","Bema'alot kedoshim utehorim kezohar harakia mazhirim. Began Eden tehe menuchata, venach al mishkavo, venomar amen.","Among the holy and pure who shine as the radiance of heaven, may their rest be in the Garden of Eden, resting in peace; and let us say, Amen.")
  ],"Keil Malei Rachamim")
];

/* Hatarat Nedarim (short opening) */
OCC_PRAYERS.hatarat=[
  occPR("hat_main","Annulment of Vows","\u05D4\u05B7\u05EA\u05B8\u05BC\u05E8\u05B7\u05EA \u05E0\u05B0\u05D3\u05B8\u05E8\u05B4\u05D9\u05DD",[
    occR("Recited before a panel of three on Erev Rosh HaShanah."),
    occP("\u05E9\u05B4\u05C1\u05DE\u05B0\u05E2\u05D5\u05BC \u05E0\u05B8\u05D0 \u05E8\u05B7\u05D1\u05D5\u05B9\u05EA\u05B7\u05D9, \u05D3\u05B7\u05BC\u05D9\u05B8\u05BC\u05E0\u05B4\u05D9\u05DD \u05DE\u05B7\u05DE\u05B0\u05D7\u05B4\u05D9\u05DD, \u05D4\u05B2\u05E8\u05B5\u05D9 \u05D0\u05B2\u05E0\u05B4\u05D9 \u05DE\u05B4\u05EA\u05B0\u05D7\u05B8\u05E8\u05B5\u05D8 \u05D5\u05B0\u05E0\u05B4\u05D7\u05B8\u05DD \u05E2\u05B7\u05DC \u05DB\u05B8\u05BC\u05DC \u05E0\u05B0\u05D3\u05B8\u05E8\u05B4\u05D9\u05DD \u05D5\u05BC\u05E9\u05B0\u05C1\u05D1\u05D5\u05BC\u05E2\u05D5\u05B9\u05EA \u05E9\u05B6\u05C1\u05E0\u05B8\u05D3\u05B7\u05E8\u05B0\u05EA\u05B4\u05D9.","Shim'u na rabotai, dayanim mumchim, harei ani mitcharet venicham al kol nedarim ushvu'ot shenadarti.","Listen, please, my masters, expert judges: I hereby regret and seek release from all vows and oaths I have made.")
  ],"Hatarat Nedarim")
];

OCC_PRAYERS.shevabrachot=[
  occPR("sb_intro","The Seven Blessings","\u05E9\u05B6\u05C1\u05D1\u05B7\u05E2 \u05D1\u05B0\u05E8\u05B8\u05DB\u05D5\u05B9\u05EA",[
    occR("Recited under the chuppah over a cup of wine, and at the meals of celebration during the seven days that follow. The blessing over wine is said first, then the six blessings of rejoicing.")
  ],"Sheva Brachot"),
  occPR("sb_1","1 \u00B7 Over the Wine","\u05D1\u05D5\u05B9\u05E8\u05B5\u05D0 \u05E4\u05B0\u05BC\u05E8\u05B4\u05D9 \u05D4\u05B7\u05D2\u05B6\u05BC\u05E4\u05B6\u05DF",[
    occP("\u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD, \u05D1\u05D5\u05B9\u05E8\u05B5\u05D0 \u05E4\u05B0\u05BC\u05E8\u05B4\u05D9 \u05D4\u05B7\u05D2\u05B8\u05BC\u05E4\u05B6\u05DF.","Baruch ata Adonai Eloheinu melech ha'olam, borei peri hagafen.","Blessed are You, Lord our God, King of the universe, Creator of the fruit of the vine.")
  ],"Sheva Brachot"),
  occPR("sb_2","2 \u00B7 All for His Glory","\u05E9\u05B6\u05C1\u05D4\u05B7\u05DB\u05B9\u05BC\u05DC \u05D1\u05B8\u05BC\u05E8\u05B8\u05D0 \u05DC\u05B4\u05DB\u05B0\u05D1\u05D5\u05B9\u05D3\u05D5\u05B9",[
    occP("\u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD, \u05E9\u05B6\u05C1\u05D4\u05B7\u05DB\u05B9\u05BC\u05DC \u05D1\u05B8\u05BC\u05E8\u05B8\u05D0 \u05DC\u05B4\u05DB\u05B0\u05D1\u05D5\u05B9\u05D3\u05D5\u05B9.","Baruch ata Adonai Eloheinu melech ha'olam, shehakol bara lichvodo.","Blessed are You, Lord our God, King of the universe, who created all things for His glory.")
  ],"Sheva Brachot"),
  occPR("sb_3","3 \u00B7 Creator of Humankind","\u05D9\u05D5\u05B9\u05E6\u05B5\u05E8 \u05D4\u05B8\u05D0\u05B8\u05D3\u05B8\u05DD",[
    occP("\u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD, \u05D9\u05D5\u05B9\u05E6\u05B5\u05E8 \u05D4\u05B8\u05D0\u05B8\u05D3\u05B8\u05DD.","Baruch ata Adonai Eloheinu melech ha'olam, yotzer ha'adam.","Blessed are You, Lord our God, King of the universe, who fashioned humankind.")
  ],"Sheva Brachot"),
  occPR("sb_4","4 \u00B7 In His Image","\u05D0\u05B2\u05E9\u05B6\u05C1\u05E8 \u05D9\u05B8\u05E6\u05B7\u05E8",[
    occP("\u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD, \u05D0\u05B2\u05E9\u05B6\u05C1\u05E8 \u05D9\u05B8\u05E6\u05B7\u05E8 \u05D0\u05B6\u05EA \u05D4\u05B8\u05D0\u05B8\u05D3\u05B8\u05DD \u05D1\u05B0\u05E6\u05B7\u05DC\u05B0\u05DE\u05D5\u05B9, \u05D1\u05B0\u05E6\u05B6\u05DC\u05B6\u05DD \u05D3\u05B0\u05DE\u05D5\u05BC\u05EA \u05EA\u05B7\u05D1\u05B0\u05E0\u05B4\u05D9\u05EA\u05D5\u05B9, \u05D5\u05B0\u05D4\u05B4\u05EA\u05B0\u05E7\u05B4\u05D9\u05DF \u05DC\u05D5\u05B9 \u05DE\u05B4\u05DE\u05B6\u05BC\u05E0\u05D5\u05BC \u05D1\u05B4\u05BC\u05E0\u05B0\u05D9\u05B7\u05DF \u05E2\u05B2\u05D3\u05B5\u05D9 \u05E2\u05B7\u05D3. \u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4, \u05D9\u05D5\u05B9\u05E6\u05B5\u05E8 \u05D4\u05B8\u05D0\u05B8\u05D3\u05B8\u05DD.","Baruch ata Adonai Eloheinu melech ha'olam, asher yatzar et ha'adam betzalmo, betzelem demut tavnito, vehitkin lo mimenu binyan adei ad. Baruch ata Adonai, yotzer ha'adam.","Blessed are You, Lord our God, King of the universe, who fashioned the human in His image, in the image of His likeness, and prepared from within him an everlasting structure. Blessed are You, Lord, who fashioned humankind.")
  ],"Sheva Brachot"),
  occPR("sb_5","5 \u00B7 Zion Rejoices","\u05E9\u05B9\u05C2\u05D5\u05B9\u05E9 \u05EA\u05B8\u05E9\u05B4\u05C2\u05D9\u05E9",[
    occP("\u05E9\u05B9\u05C2\u05D5\u05B9\u05E9 \u05EA\u05B8\u05E9\u05B4\u05C2\u05D9\u05E9 \u05D5\u05B0\u05EA\u05B8\u05D2\u05B5\u05DC \u05D4\u05B8\u05E2\u05B2\u05E7\u05B8\u05E8\u05B8\u05D4 \u05D1\u05B0\u05E7\u05B4\u05D1\u05B0\u05BC\u05D5\u05BC\u05E5 \u05D1\u05B8\u05BC\u05E0\u05B6\u05D9\u05D4\u05B8 \u05DC\u05B0\u05EA\u05D5\u05B9\u05DB\u05B8\u05D4\u05BB \u05D1\u05B0\u05E9\u05B4\u05C2\u05DE\u05B0\u05D7\u05B8\u05D4. \u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4, \u05DE\u05B0\u05E9\u05B7\u05C2\u05DE\u05B5\u05BC\u05D7\u05B7 \u05E6\u05B4\u05D9\u05BC\u05D5\u05B9\u05DF \u05D1\u05B0\u05D1\u05B8\u05E0\u05B6\u05D9\u05D4\u05B8.","Sos tasis vetagel ha'akara bekibutz baneha letocha besimcha. Baruch ata Adonai, mesame'ach Tziyon bevaneha.","May the barren one (Zion) exult and be glad as her children are gathered to her in joy. Blessed are You, Lord, who gladdens Zion through her children.")
  ],"Sheva Brachot"),
  occPR("sb_6","6 \u00B7 Joy of the Couple","\u05E9\u05B7\u05C2\u05DE\u05B5\u05BC\u05D7\u05B7 \u05EA\u05B0\u05E9\u05B7\u05C2\u05DE\u05B5\u05BC\u05D7",[
    occP("\u05E9\u05B7\u05C2\u05DE\u05B5\u05BC\u05D7 \u05EA\u05B0\u05E9\u05B7\u05C2\u05DE\u05B5\u05BC\u05D7 \u05E8\u05B5\u05E2\u05B4\u05D9\u05DD \u05D4\u05B8\u05D0\u05B2\u05D4\u05D5\u05BC\u05D1\u05B4\u05D9\u05DD, \u05DB\u05B0\u05BC\u05E9\u05B7\u05C2\u05DE\u05B5\u05BC\u05D7\u05B2\u05DA\u05B8 \u05D9\u05B0\u05E6\u05B4\u05D9\u05E8\u05B0\u05DA\u05B8 \u05D1\u05B0\u05D2\u05B7\u05DF \u05E2\u05B5\u05D3\u05B6\u05DF \u05DE\u05B4\u05E7\u05B6\u05BC\u05D3\u05B6\u05DD. \u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4, \u05DE\u05B0\u05E9\u05B7\u05C2\u05DE\u05B5\u05BC\u05D7\u05B7 \u05D7\u05B8\u05EA\u05B8\u05DF \u05D5\u05B0\u05DB\u05B7\u05DC\u05B8\u05BC\u05D4.","Same'ach tesamach re'im ha'ahuvim, kesamechacha yetzircha began Eden mikedem. Baruch ata Adonai, mesame'ach chatan vechala.","Grant abundant joy to these loving companions, as You gave joy to Your creation in the Garden of Eden of old. Blessed are You, Lord, who gladdens the groom and bride.")
  ],"Sheva Brachot"),
  occPR("sb_7","7 \u00B7 Joy and Gladness","\u05D0\u05B2\u05E9\u05B6\u05C1\u05E8 \u05D1\u05B8\u05BC\u05E8\u05B8\u05D0",[
    occP("\u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05DE\u05B6\u05DC\u05B6\u05DA\u05B0 \u05D4\u05B8\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD, \u05D0\u05B2\u05E9\u05B6\u05C1\u05E8 \u05D1\u05B8\u05BC\u05E8\u05B8\u05D0 \u05E9\u05B8\u05C2\u05E9\u05D5\u05B9\u05DF \u05D5\u05B0\u05E9\u05B4\u05C2\u05DE\u05B0\u05D7\u05B8\u05D4, \u05D7\u05B8\u05EA\u05B8\u05DF \u05D5\u05B0\u05DB\u05B7\u05DC\u05B8\u05BC\u05D4, \u05D2\u05B4\u05D9\u05DC\u05B8\u05D4 \u05E8\u05B4\u05E0\u05B8\u05BC\u05D4 \u05D3\u05B4\u05D9\u05E6\u05B8\u05D4 \u05D5\u05B0\u05D7\u05B6\u05D3\u05B0\u05D5\u05B8\u05D4, \u05D0\u05B7\u05D4\u05B2\u05D1\u05B8\u05D4 \u05D5\u05B0\u05D0\u05B7\u05D7\u05B2\u05D5\u05B8\u05D4 \u05D5\u05B0\u05E9\u05B8\u05C1\u05DC\u05D5\u05B9\u05DD \u05D5\u05B0\u05E8\u05B5\u05E2\u05D5\u05BC\u05EA. \u05DE\u05B0\u05D4\u05B5\u05E8\u05B8\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC \u05D9\u05B4\u05E9\u05B8\u05BC\u05DE\u05B7\u05E2 \u05D1\u05B0\u05E2\u05B8\u05E8\u05B5\u05D9 \u05D9\u05B0\u05D4\u05D5\u05BC\u05D3\u05B8\u05D4 \u05D5\u05BC\u05D1\u05B0\u05D7\u05BB\u05E6\u05D5\u05B9\u05EA \u05D9\u05B0\u05E8\u05D5\u05BC\u05E9\u05B8\u05C1\u05DC\u05B8\u05B4\u05D9\u05DD, \u05E7\u05D5\u05B9\u05DC \u05E9\u05B8\u05C2\u05E9\u05D5\u05B9\u05DF \u05D5\u05B0\u05E7\u05D5\u05B9\u05DC \u05E9\u05B4\u05C2\u05DE\u05B0\u05D7\u05B8\u05D4, \u05E7\u05D5\u05B9\u05DC \u05D7\u05B8\u05EA\u05B8\u05DF \u05D5\u05B0\u05E7\u05D5\u05B9\u05DC \u05DB\u05B7\u05DC\u05B8\u05BC\u05D4, \u05E7\u05D5\u05B9\u05DC \u05DE\u05B4\u05E6\u05B0\u05D4\u05B2\u05DC\u05D5\u05B9\u05EA \u05D7\u05B2\u05EA\u05B8\u05E0\u05B4\u05D9\u05DD \u05DE\u05B5\u05D7\u05BB\u05E4\u05B8\u05BC\u05EA\u05B8\u05DD \u05D5\u05BC\u05E0\u05B0\u05E2\u05B8\u05E8\u05B4\u05D9\u05DD \u05DE\u05B4\u05DE\u05B4\u05BC\u05E9\u05B0\u05C1\u05EA\u05B5\u05BC\u05D4 \u05E0\u05B0\u05D2\u05B4\u05D9\u05E0\u05B8\u05EA\u05B8\u05DD. \u05D1\u05B8\u05BC\u05E8\u05D5\u05BC\u05DA\u05B0 \u05D0\u05B7\u05EA\u05B8\u05BC\u05D4 \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4, \u05DE\u05B0\u05E9\u05B7\u05C2\u05DE\u05B5\u05BC\u05D7\u05B7 \u05D7\u05B8\u05EA\u05B8\u05DF \u05E2\u05B4\u05DD \u05D4\u05B7\u05DB\u05B7\u05BC\u05DC\u05B8\u05BC\u05D4.","Baruch ata Adonai Eloheinu melech ha'olam, asher bara sason vesimcha, chatan vechala, gila rina ditza vechedva, ahava ve'achva veshalom vere'ut. Mehera Adonai Eloheinu yishama be'arei Yehuda uvchutzot Yerushalayim, kol sason vekol simcha, kol chatan vekol kala, kol mitzhalot chatanim mechupatam un'arim mimishteh neginatam. Baruch ata Adonai, mesame'ach chatan im hakala.","Blessed are You, Lord our God, King of the universe, who created joy and gladness, groom and bride, mirth, glad song, delight and rejoicing, love and harmony, peace and companionship. Soon, Lord our God, may there be heard in the cities of Judah and the streets of Jerusalem the voice of joy and the voice of gladness, the voice of the groom and the voice of the bride, the jubilant voice of grooms from their wedding canopies and of youths from their feasts of song. Blessed are You, Lord, who gladdens the groom with the bride.")
  ],"Sheva Brachot")
];

/* ====== DAY-RULES ENGINE ====== */
function todaySpecials(d,mode){
  d=d||new Date();const h=todayHeb(d);const dow=jsWeekday(d);const specials=[];
  const isRC=(h.day===1||h.day===30);
  const isChanukah=((h.month===9&&h.day>=25)||(h.month===10&&h.day<=(h.day<=3?3:2)));
  const omer=(h.month===1&&h.day>=16)||h.month===2||(h.month===3&&h.day<=5);
  // Tachanun skipped on: Shabbat, RC, Chanukah, all of Nissan, etc.
  const noTach = dow===6 || isRC || isChanukah || h.month===1 || (h.month===7) || (h.month===3&&h.day<=12);
  if(isRC)specials.push({id:"hallel",label:"Rosh Chodesh",reason:"Half-Hallel and Ya'aleh V'Yavo are added today.",svc:"hallel",tag:"hallel"});
  if(isChanukah)specials.push({id:"chanukah",label:"Chanukah",reason:"Light the menorah after nightfall; full Hallel and Al HaNissim are added.",svc:"chanukah",tag:"chanukah"});
  if(omer){const n=omerCount(d);if(n>0)specials.push({id:"omer",label:"Sefirat HaOmer",reason:`Count day ${n} of the Omer tonight after nightfall.`,svc:null,tag:"omer"});}
  if(h.month===1&&h.day>=1)specials.push({id:"ilanot",label:"Nissan",reason:"Bless blossoming fruit trees (Birkat HaIlanot) once this month.",svc:"ilanot",tag:"nissan"});
  if(h.month===6&&h.day===29)specials.push({id:"hatarat",label:"Erev Rosh HaShanah",reason:"Annul vows (Hatarat Nedarim) before a panel of three.",svc:"hatarat"});
  if((h.month===7&&h.day>=1&&h.day<=10))specials.push({id:"avinu",label:"Ten Days of Repentance",reason:"Avinu Malkeinu is added after the Amidah.",svc:"avinu",tag:"avinu"});
  if(!noTach)specials.push({id:"tachanun",label:"Weekday",reason:"Tachanun is said after the Amidah today.",svc:"tachanun",tag:"tachanun"});
  else specials.push({id:"notach",label:"Festive day",reason:"Tachanun is omitted today.",svc:null});
  return specials;
}
/* Decide which conditional prayers belong today. Returns sets of prayer-ids/tags to hide. */
function dayPlan(d,mode){
  d=d||new Date();const h=todayHeb(d);const dow=jsWeekday(d);
  const isRC=(h.day===1||h.day===30);
  const isChanukah=((h.month===9&&h.day>=25)||(h.month===10&&h.day<=3));
  const inIsrael=(mode==="israel"||mode==="yerushalayim");
  const fest=(typeof hebFestival==="function")?hebFestival(h,inIsrael):null;
  const fullHallelFest = fest==="sukkot"||fest==="shemini_atzeret"||fest==="shavuot"||(h.month===1&&h.day>=15&&h.day<=(inIsrael?21:22)&&fest==="pesach"&&h.day<=15);
  // Tachanun is omitted on: Shabbat, Rosh Chodesh, Chanukah, all Nissan, Tishrei through 22, Av 9-15, Sivan 1-12, Purim, etc.
  let noTach = dow===6 || isRC || isChanukah || h.month===1 || (h.month===7&&h.day<=22) || (h.month===3&&h.day<=12) || (h.month===5&&h.day>=9&&h.day<=15) || (h.month===11&&h.day===15) || (h.month===12&&(h.day===14||h.day===15)) || (h.month===13&&(h.day===14||h.day===15));
  if(state.hideTachanun)noTach=true; // user override (simcha in shul, new baby, etc.)
  const hallelToday = isRC || isChanukah || !!fest;
  return {
    isRC,isChanukah,fest,hallelToday,
    showTachanun:!noTach,
    showHallel:hallelToday,
    // prayer ids that are conditional
    hideIds:new Set([
      ...(!noTach?[]:["tachanun","tachanun_mincha"]),
      ...(hallelToday?[]:["hallel_shacharit"]),
    ])
  };
}
/* Tefillin / men-oriented prayer ids hidden when Woman mode is on */
const MENS_PRAYER_IDS=new Set(["tefillin","tefilin","tzitzit_bracha","akeidah_tzitzit","birchot_tzitzit"]);
function womanHidden(pr){
  if(!state.womanMode)return false;
  const id=(pr.id||"").toLowerCase();
  if(MENS_PRAYER_IDS.has(id))return true;
  const t=((pr.en||"")+" "+(pr.he||"")).toLowerCase();
  if(/tefillin|tefilin|\u05EA\u05E4\u05D9\u05DC\u05D9\u05DF|\u05EA\u05B0\u05BC\u05E4\u05B4\u05D9\u05DC\u05B4\u05D9\u05DF/.test(t))return true;
  return false;
}
function jsWeekday(d){const tz=tzForLoc(state.loc);try{const wd=new Intl.DateTimeFormat("en-US",{timeZone:tz,weekday:"short"}).format(d);return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(wd);}catch(e){return d.getDay();}}
function shirShelYomToday(d){const wd=jsWeekday(d);const map=[
  {ps:24,he:"\u05DC\u05B0\u05D3\u05B8\u05D5\u05B4\u05D3 \u05DE\u05B4\u05D6\u05B0\u05DE\u05D5\u05B9\u05E8",en:"Psalm 24 \u00B7 Sunday"},
  {ps:48,he:"\u05E9\u05B4\u05C1\u05D9\u05E8 \u05DE\u05B4\u05D6\u05B0\u05DE\u05D5\u05B9\u05E8",en:"Psalm 48 \u00B7 Monday"},
  {ps:82,he:"\u05DE\u05B4\u05D6\u05B0\u05DE\u05D5\u05B9\u05E8 \u05DC\u05B0\u05D0\u05B8\u05E1\u05B8\u05F3",en:"Psalm 82 \u00B7 Tuesday"},
  {ps:94,he:"\u05D0\u05B5\u05DC \u05E0\u05B0\u05E7\u05B8\u05DE\u05D5\u05B9\u05EA",en:"Psalm 94 \u00B7 Wednesday"},
  {ps:81,he:"\u05DC\u05B7\u05DE\u05B0\u05E0\u05B7\u05E6\u05B5\u05BC\u05D7\u05B7",en:"Psalm 81 \u00B7 Thursday"},
  {ps:93,he:"\u05D9\u05B0\u05D4\u05D5\u05B8\u05D4 \u05DE\u05B8\u05DC\u05B8\u05DA\u05B0",en:"Psalm 93 \u00B7 Friday"},
  {ps:92,he:"\u05DE\u05B4\u05D6\u05B0\u05DE\u05D5\u05B9\u05E8 \u05E9\u05B4\u05C1\u05D9\u05E8 \u05DC\u05B0\u05D9\u05D5\u05B9\u05DD \u05D4\u05B7\u05E9\u05B8\u05BC\u05D1\u05B8\u05BC\u05EA",en:"Psalm 92 \u00B7 Shabbat"}
];return map[wd];}


/* ====== NAMES TO PRAY FOR + PERSONAL VERSE ====== */
/* Names get inserted into the appropriate prayer spots:
   - refuah (healing) -> shown at Refuah blessing (Amidah #8) and before Elohai Netzor
   - parnasa, success, general -> before Elohai Netzor / at relevant points */
const PRAY_CATEGORIES=[
  {id:"refuah",en:"Healing",he:"\u05DC\u05B4\u05E8\u05B0\u05E4\u05D5\u05BC\u05D0\u05B8\u05D4",spot:"Refuah (8th blessing of the Amidah)"},
  {id:"parnasa",en:"Livelihood",he:"\u05DC\u05B0\u05E4\u05B7\u05E8\u05B0\u05E0\u05B8\u05E1\u05B8\u05D4",spot:"Birkat HaShanim (9th blessing)"},
  {id:"shidduch",en:"A match",he:"\u05DC\u05B0\u05E9\u05B4\u05C1\u05D3\u05BC\u05D5\u05BC\u05DA\u05B0",spot:"Personal requests in Shema Koleinu"},
  {id:"success",en:"Success & general",he:"\u05DC\u05B0\u05D4\u05B7\u05E6\u05B0\u05DC\u05B8\u05D7\u05B8\u05D4",spot:"Personal requests in Shema Koleinu"}
];
function namesByCat(cat){return (state.prayForNames||[]).filter(n=>n.cat===cat);}
function addPrayName(name,cat,motherName){
  state.prayForNames=state.prayForNames||[];
  state.prayForNames.push({id:"n"+Date.now()+Math.floor(Math.random()*999),name:name.trim(),cat,mother:(motherName||"").trim()});
  saveState();
}
function removePrayName(id){state.prayForNames=(state.prayForNames||[]).filter(n=>n.id!==id);saveState();}
function formatNameList(cat){
  const list=namesByCat(cat);if(!list.length)return "";
  return list.map(n=>n.mother?`${n.name} \u05D1\u05B6\u05DF/\u05D1\u05B7\u05EA ${n.mother}`:n.name).join(", ");
}

/* Verse database for the personal verse at the end of Shemoneh Esrei.
   Custom: a Tanach verse that begins with the first letter of one's name and ends with the last.
   Standard reference set (public-domain biblical verses), keyed [firstLetter][lastLetter]. */
const VERSE_DB={
  "א":{
    "כ":"אַשְׁרֵי הָעָם שֶּכָּכָה לוֹ, אַשְׁרֵי הָעָם שֶיְהוָה אֱלֹהָיו (תהלים קמ״ד)"
  },
  "ד":{
    "ד":"דִרְשוּ יְהוָה וְעֻזּוֹ, בַקְשוּ פָנָיו תָמִיד (תהלים ק״ד)"
  },
  "י":{
    "ב":"יְבָרֶכְךָ יְהוָה וְיִשְׁמְרֶךָ (במדבר ו״כ״ד)"
  },
  "מ":{
    "ד":"מָה גָדְלוּ מַעֲשֶיךָ יְהוָה, מְאֹד עָמְקוּ מַחְשְׁבֹתֶיךָ (תהלים צ״ב)"
  },
  "ש":{
    "ם":"שָׁלוֹם רָב לְאֹהֲבֵי תוֹרָתֶךָ, וְאֵין לָמוֹ מִכְשוֹל (תהלים קי״ט)"
  }
};
function findVersesForName(hebName){
  hebName=(hebName||"").trim();if(!hebName)return [];
  const letters=hebName.replace(/[^\u05D0-\u05EA]/g,"");
  if(!letters.length)return [];
  const first=letters[0];
  let last=letters[letters.length-1];
  const finals={"\u05DA":"\u05DB","\u05DD":"\u05DE","\u05DF":"\u05E0","\u05E3":"\u05E4","\u05E5":"\u05E6"};
  const lastNorm=finals[last]||last;
  const out=[];
  const fb=VERSE_DB[first]||{};
  Object.keys(fb).forEach(lk=>{const lkNorm=finals[lk]||lk;if(lk===last||lkNorm===lastNorm)out.push(fb[lk]);});
  return out;
}

function allBasePrayers(svcId){const imp=importedFor(svcId);const custom=(state.customPrayers&&state.customPrayers[svcId])||[];const builtin=(PRAYERS[svcId]||(typeof OCC_PRAYERS!=='undefined'?OCC_PRAYERS[svcId]:null)||[]);return (imp.length?imp:builtin).concat(custom);}
function effPrayer(svcId,pr){
  const perN=state.prayerEdits&&state.prayerEdits[svcId+"."+pr.id+"@"+state.nusach];
  const glob=state.prayerEdits&&state.prayerEdits[prayerKey(svcId,pr.id)];
  const ov=perN||glob;if(!ov)return pr;
  return Object.assign({},pr,{en:ov.en!=null?ov.en:pr.en,he:ov.he!=null?ov.he:pr.he,section:ov.section!=null?ov.section:pr.section,blocks:ov.blocks||pr.blocks});
}
function orderedPrayers(svcId){let prs=allBasePrayers(svcId).slice();const ord=state.order&&state.order[svcId];if(ord&&ord.length){prs.sort((a,b)=>{let ia=ord.indexOf(a.id),ib=ord.indexOf(b.id);if(ia<0)ia=999;if(ib<0)ib=999;return ia-ib;});}const hid=(state.hidden&&state.hidden[svcId])||[];
  const plan=(typeof dayPlan==="function")?dayPlan(new Date(),state.israelMode):null;
  return prs.filter(p=>{
    if(hid.includes(p.id))return false;
    if(womanHidden(p))return false;
    if(plan&&plan.hideIds&&plan.hideIds.has(p.id))return false;
    return true;
  }).map(p=>effPrayer(svcId,p));
}
const NUSACH_LABELS={ashkenaz:"Ashkenaz",sefard:"Sefard",ari:"Nusach Ari",edot:"Edot HaMizrach"};

/* ====== CURRENT SERVICE BY TIME ====== */
function currentService(z,nm){
  if(!z)return {id:"shacharit",note:"Morning prayer"};
  const a=z.alot,ch=z.chatzot,mg=z.minchaG,sk=z.shkia,tz=z.tzeit,tf=z.tefila;
  if(nm>=a&&nm<ch)return {id:"shacharit",note:"Shacharit \u00B7 latest by "+hmFmt(tf)};
  if(nm>=ch&&nm<mg)return {id:"mincha",note:"Mincha begins "+hmFmt(mg)};
  if(nm>=mg&&nm<sk)return {id:"mincha",note:"Mincha \u00B7 until sunset "+hmFmt(sk)};
  if(nm>=sk&&nm<tz)return {id:"maariv",note:"Dusk \u00B7 nightfall "+hmFmt(tz)};
  if(nm>=tz||nm<a){if(nm>=tz&&nm<22*60)return {id:"maariv",note:"Maariv \u00B7 the evening prayer"};return {id:"krias",note:"Before sleep \u00B7 bedtime Shema"};}
  return {id:"shacharit",note:"Shacharit"};
}

/* ====== ONBOARDING ====== */
let obStep=0,obData={};
