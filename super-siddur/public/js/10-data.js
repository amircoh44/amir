"use strict";
/* Data model (P/R/PR), services, prayers, Tehillim, state + storage */
/* ====== DATA MODEL ======
   P(he,tr,en,extra): paragraph. extra.alt={sefard,edot,ari} = Hebrew variants by nusach.
   extra.only=[nusach...] show only for those; extra.tags; extra.kavanah; extra.vary=label.
   R(text,extra): rubric.  PR(id,en,he,blocks,section): a named prayer. */
function P(he,tr,en,extra){return Object.assign({k:"p",he,tr,en},extra||{});}
function R(t,extra){return Object.assign({k:"rubric",text:t},extra||{});}
function PR(id,en,he,blocks,section){return {id,en,he,blocks,section:section||"Main"};}

const SERVICES=[
  {id:"shacharit",en:"Shacharit",he:"\u05E9\u05B7\u05C1\u05D7\u05B2\u05E8\u05B4\u05D9\u05EA",when:"Morning prayer",icon:"sun"},
  {id:"mincha",en:"Mincha",he:"\u05DE\u05B4\u05E0\u05B0\u05D7\u05B8\u05D4",when:"Afternoon prayer",icon:"dusk"},
  {id:"maariv",en:"Maariv",he:"\u05DE\u05B7\u05E2\u05B2\u05E8\u05B4\u05D9\u05D1",when:"Evening prayer",icon:"moon"},
  {id:"birkat",en:"Birkat HaMazon",he:"\u05D1\u05B4\u05BC\u05E8\u05B0\u05DB\u05B7\u05BC\u05EA \u05D4\u05B7\u05DE\u05B8\u05BC\u05D6\u05D5\u05B9\u05DF",when:"Blessing after meals",icon:"food"},
  {id:"krias",en:"Krias Shema al HaMita",he:"\u05E7\u05B0\u05E8\u05B4\u05D9\u05D0\u05B7\u05EA \u05E9\u05B0\u05C1\u05DE\u05B7\u05E2 \u05E2\u05B7\u05DC \u05D4\u05B7\u05DE\u05B4\u05D8\u05B8\u05BC\u05D4",when:"Before sleep",icon:"moon"},
  {id:"travel",en:"Tefilat HaDerech",he:"\u05EA\u05B0\u05BC\u05E4\u05B4\u05DC\u05B7\u05BC\u05EA \u05D4\u05B7\u05D3\u05B6\u05BC\u05E8\u05B6\u05DA",when:"While traveling",icon:"path"},
  {id:"brachot",en:"Blessings",he:"\u05D1\u05B0\u05E8\u05B8\u05DB\u05D5\u05B9\u05EA",when:"For various occasions",icon:"star"}
];
function allServices(){return SERVICES.concat(typeof OCC_SERVICES!=='undefined'?OCC_SERVICES:[]);}
function svcById(id){return allServices().find(s=>s.id===id);}

const PRAYERS={
shacharit:[
PR("netilat","Netilat Yadayim","נְטִילַת יָדַיִם",[
  R("Wash each hand three times in alternating sequence, then recite."),
  P("בָּרוּךְ אַתָּה יְיָ, אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו, וְצִוָּנוּ עַל נְטִילַת יָדָיִם.","Baruch ata Adonai, Eloheinu melech ha'olam, asher kid'shanu b'mitzvotav v'tzivanu al n'tilat yadayim.","Blessed are You, Lord our God, King of the universe, who sanctified us with His commandments and commanded us concerning the washing of hands.")
],"Upon Waking"),
PR("asher_yatzar","Asher Yatzar","אֲשֶׁר יָצַר",[
  R("After using the restroom and washing the hands."),
  P("בָּרוּךְ אַתָּה יְיָ, אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר יָצַר אֶת הָאָדָם בְּחָכְמָה, וּבָרָא בוֹ נְקָבִים נְקָבִים, חֲלוּלִים חֲלוּלִים. גָּלוּי וְיָדוּעַ לִפְנֵי כִסֵּא כְבוֹדֶךָ, שֶׁאִם יִפָּתֵחַ אֶחָד מֵהֶם, אוֹ יִסָּתֵם אֶחָד מֵהֶם, אִי אֶפְשָׁר לְהִתְקַיֵּם וְלַעֲמוֹד לְפָנֶיךָ. בָּרוּךְ אַתָּה יְיָ, רוֹפֵא כָל בָּשָׂר וּמַפְלִיא לַעֲשׂוֹת.","Baruch ata Adonai... rofei chol basar umafli la'asot.","Blessed are You, Lord our God, King of the universe, who formed humanity with wisdom and created within them many openings and many cavities. It is revealed and known before the throne of Your glory that if one of them were ruptured, or one of them blocked, it would be impossible to survive and stand before You. Blessed are You, Lord, healer of all flesh, who acts wondrously.")
],"Upon Waking"),
PR("elohai_neshama","Elohai Neshama","אֱלֹהַי נְשָׁמָה",[
  P("אֱלֹהַי, נְשָׁמָה שֶׁנָּתַתָּ בִּי טְהוֹרָה הִיא. אַתָּה בְרָאתָהּ, אַתָּה יְצַרְתָּהּ, אַתָּה נְפַחְתָּהּ בִּי, וְאַתָּה מְשַׁמְּרָהּ בְּקִרְבִּי. כָּל זְמַן שֶׁהַנְּשָׁמָה בְקִרְבִּי, מוֹדֶה אֲנִי לְפָנֶיךָ, יְיָ אֱלֹהַי וֵאלֹהֵי אֲבוֹתַי. בָּרוּךְ אַתָּה יְיָ, הַמַּחֲזִיר נְשָׁמוֹת לִפְגָרִים מֵתִים.","Elohai, neshama shenatata bi t'hora hi...","My God, the soul You placed within me is pure. You created it, You formed it, You breathed it into me, and You preserve it within me. As long as the soul is within me, I thank You, Lord my God and God of my ancestors. Blessed are You, Lord, who restores souls to lifeless bodies.")
],"Upon Waking"),
PR("birchot_torah","Birchot HaTorah","בִּרְכוֹת הַתּוֹרָה",[
  R("Blessings over the Torah, said before any words of Torah study."),
  P("בָּרוּךְ אַתָּה יְיָ, אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו, וְצִוָּנוּ עַל דִּבְרֵי תוֹרָה.","...al divrei Torah.","Blessed are You, Lord our God, King of the universe, who sanctified us with His commandments and commanded us concerning the words of Torah."),
  P("וְהַעֲרֶב נָא יְיָ אֱלֹהֵינוּ אֶת דִּבְרֵי תוֹרָתְךָ בְּפִינוּ וּבְפִי עַמְּךָ בֵּית יִשְׂרָאֵל. בָּרוּךְ אַתָּה יְיָ, הַמְלַמֵּד תּוֹרָה לְעַמּוֹ יִשְׂרָאֵל.","V'ha'arev na...","Make pleasant, Lord our God, the words of Your Torah in our mouths and in the mouths of Your people the House of Israel. Blessed are You, Lord, who teaches Torah to His people Israel."),
  P("יְבָרֶכְךָ יְיָ וְיִשְׁמְרֶךָ. יָאֵר יְיָ פָּנָיו אֵלֶיךָ וִיחֻנֶּךָּ. יִשָּׂא יְיָ פָּנָיו אֵלֶיךָ וְיָשֵׂם לְךָ שָׁלוֹם.","Y'varech'cha Adonai v'yishmerecha...","May the Lord bless you and guard you. May the Lord shine His face upon you and be gracious to you. May the Lord lift His face toward you and grant you peace.",{vary:"Birkat Kohanim — recited as a passage of Torah",tags:["special"]})
],"Upon Waking"),
PR("birchot","Birchot HaShachar","בִּרְכוֹת הַשַּׁחַר",[
  R("The morning blessings, recited in sequence — gratitude for the renewal of body and world."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, הַנּוֹתֵן לַשֶּׂכְוִי בִינָה לְהַבְחִין בֵּין יוֹם וּבֵין לָיְלָה.","...hanoten lasechvi vinah.","...who gives the rooster understanding to distinguish between day and night."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁעָשַׂנִי יִשְׂרָאֵל.","...she'asani Yisrael.","...who has made me a Jew.",{vary:"Some say שֶׁלֹּא עָשַׂנִי גּוֹי / Sephardi rites differ in wording",alt:{ashkenaz:"בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁלֹּא עָשַׂנִי גּוֹי."}}),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁלֹּא עָשַׂנִי עָבֶד.","...shelo asani aved.","...who has not made me a slave."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁלֹּא עָשַׂנִי אִשָּׁה.","...shelo asani isha.","...who has not made me a woman. (Women say: שֶׁעָשַׂנִי כִּרְצוֹנוֹ — who made me according to His will.)"),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, פּוֹקֵחַ עִוְרִים.","...pokeach ivrim.","...who gives sight to the blind."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, מַלְבִּישׁ עֲרֻמִּים.","...malbish arumim.","...who clothes the naked."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, מַתִּיר אֲסוּרִים.","...matir asurim.","...who frees the bound."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, זוֹקֵף כְּפוּפִים.","...zokef k'fufim.","...who straightens the bent."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, רוֹקַע הָאָרֶץ עַל הַמָּיִם.","...roka ha'aretz al hamayim.","...who spreads the earth over the waters."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁעָשָׂה לִי כָּל צָרְכִּי.","...she'asa li kol tzorki.","...who has provided me with all my needs."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, הַמֵּכִין מִצְעֲדֵי גָבֶר.","...hamechin mitzadei gaver.","...who makes firm the steps of man."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אוֹזֵר יִשְׂרָאֵל בִּגְבוּרָה.","...ozer Yisrael bigvura.","...who girds Israel with strength."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, עוֹטֵר יִשְׂרָאֵל בְּתִפְאָרָה.","...oter Yisrael b'tifara.","...who crowns Israel with splendor."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, הַנּוֹתֵן לַיָּעֵף כֹּחַ.","...hanoten laya'ef koach.","...who gives strength to the weary.")
],"Birchot HaShachar")
],
mincha:[],
maariv:[],
birkat:[],
krias:[],
travel:[
PR("td_main","Tefilat HaDerech","תְּפִלַּת הַדֶּרֶךְ",[
  R("Recited once per day when traveling beyond a parsah (about 4 km / 2.5 mi) past the edge of the city. Best said standing, otherwise sitting still.",{kavanah:"Wherever you are headed, the journey itself is held in His hand. Say this with the calm of someone who is accompanied."}),
  P("יְהִי רָצוֹן מִלְּפָנֶיךָ יְיָ אֱלֹהֵינוּ וֵאלֹהֵי אֲבוֹתֵינוּ, שֶׁתּוֹלִיכֵנוּ לְשָׁלוֹם וְתַצְעִידֵנוּ לְשָׁלוֹם וְתַדְרִיכֵנוּ לְשָׁלוֹם, וְתַגִּיעֵנוּ לִמְחוֹז חֶפְצֵנוּ לְחַיִּים וּלְשִׂמְחָה וּלְשָׁלוֹם. וְתַצִּילֵנוּ מִכַּף כָּל אוֹיֵב וְאוֹרֵב וְלִסְטִים וְחַיּוֹת רָעוֹת בַּדֶּרֶךְ, וּמִכָּל מִינֵי פֻּרְעָנֻיּוֹת הַמִּתְרַגְּשׁוֹת לָבוֹא לָעוֹלָם. בָּרוּךְ אַתָּה יְיָ, שׁוֹמֵעַ תְּפִלָּה.","Yehi ratzon milfanecha Adonai Eloheinu...","May it be Your will, Lord our God and God of our ancestors, to lead us in peace, to direct our steps in peace, to guide us in peace, and to bring us to our destination for life, joy and peace. Save us from the hand of every enemy and ambush, from bandits and wild animals on the way, and from all kinds of calamities that come into the world. Blessed are You, Lord, who hears prayer.")
])
],
brachot:[
PR("br_food","Food Blessings","בִּרְכוֹת הַנֶּהֱנִין",[
  R("The blessing said before eating, matched to the food."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, הַמּוֹצִיא לֶחֶם מִן הָאָרֶץ.","...hamotzi lechem min ha'aretz.","Bread: ...who brings forth bread from the earth."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא מִינֵי מְזוֹנוֹת.","...borei minei m'zonot.","Grain foods (not bread): ...who creates varieties of nourishment."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא פְּרִי הַגָּפֶן.","...borei p'ri hagafen.","Wine: ...who creates the fruit of the vine."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא פְּרִי הָעֵץ.","...borei p'ri ha'etz.","Tree fruits: ...who creates the fruit of the tree."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא פְּרִי הָאֲדָמָה.","...borei p'ri ha'adama.","Ground produce: ...who creates the fruit of the ground."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁהַכֹּל נִהְיֶה בִּדְבָרוֹ.","...shehakol nihiyeh bidvaro.","All other foods & drinks: ...by whose word all things came to be.")
],"On Food"),
PR("br_news","Occasions & Wonder","בְּרָכוֹת לְעִתִּים",[
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁהֶחֱיָנוּ וְקִיְּמָנוּ וְהִגִּיעָנוּ לַזְּמַן הַזֶּה.","...shehecheyanu v'kiy'manu v'higi'anu lazman hazeh.","New fruits, new garments, festivals, joyous firsts: ...who has granted us life, sustained us, and brought us to this season."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, הַטּוֹב וְהַמֵּטִיב.","...hatov v'hameitiv.","Good news shared with others: ...who is good and does good."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, דַּיַּן הָאֱמֶת.","...dayan ha'emet.","On hearing of a death: ...the true Judge."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, עוֹשֶׂה מַעֲשֵׂה בְרֵאשִׁית.","...oseh ma'aseh v'reshit.","On seeing lightning, mountains, oceans, or great natural wonders: ...who makes the work of creation.")
],"Occasions")
]
};

/* ---- Shacharit: Pesukei D'Zimra ---- */
PRAYERS.shacharit.push(
PR("baruch_sheamar","Baruch She'amar","בָּרוּךְ שֶׁאָמַר",[
  R("Opening blessing of the Verses of Praise. Stand; hold the front tzitzit until Yishtabach.",{tags:["special"]}),
  P("בָּרוּךְ שֶׁאָמַר וְהָיָה הָעוֹלָם, בָּרוּךְ הוּא. בָּרוּךְ עוֹשֶׂה בְרֵאשִׁית, בָּרוּךְ אוֹמֵר וְעוֹשֶׂה, בָּרוּךְ גּוֹזֵר וּמְקַיֵּם, בָּרוּךְ מְרַחֵם עַל הָאָרֶץ, בָּרוּךְ מְרַחֵם עַל הַבְּרִיּוֹת. בָּרוּךְ אַתָּה יְיָ, מֶלֶךְ מְהֻלָּל בַּתִּשְׁבָּחוֹת.","Baruch she'amar v'haya ha'olam...","Blessed is He who spoke, and the world came to be. Blessed is He. Blessed is the Maker of creation; blessed is He who speaks and does; blessed is He who decrees and fulfills; blessed is He who has mercy on the earth; blessed is He who has mercy on all creatures. Blessed are You, Lord, King praised in praises.")
],"Pesukei D'Zimra"),
PR("ashrei","Ashrei","אַשְׁרֵי",[
  R("Psalm 145 — the heart of the Verses of Praise. Read the full psalm in Tehillim; concentrate especially on the verse below."),
  P("אַשְׁרֵי יוֹשְׁבֵי בֵיתֶךָ, עוֹד יְהַלְלוּךָ סֶּלָה. אַשְׁרֵי הָעָם שֶׁכָּכָה לּוֹ, אַשְׁרֵי הָעָם שֶׁיְיָ אֱלֹהָיו.","Ashrei yoshvei veitecha...","Happy are those who dwell in Your house; they continually praise You, Selah. Happy is the people for whom this is so; happy is the people whose God is the Lord."),
  P("פּוֹתֵחַ אֶת יָדֶךָ, וּמַשְׂבִּיעַ לְכָל חַי רָצוֹן.","Poteach et yadecha, umasbia l'chol chai ratzon.","You open Your hand and satisfy the desire of every living being.",{tags:["special"],kav:{found:"Pause and concentrate here. Picture the open hand sustaining all life.",halachic:"This verse requires kavanah on its meaning — that the Holy One sustains every creature. If Ashrei was recited without focus on this verse, it is repeated.",kabbalistic:"The verse contains the secret of divine sustenance flowing into the worlds. The heart is directed to the channel of blessing through which the Source provides for all, each according to its need."}}),
  P("תְּהִלַּת יְיָ יְדַבֶּר פִּי, וִיבָרֵךְ כָּל בָּשָׂר שֵׁם קָדְשׁוֹ לְעוֹלָם וָעֶד. וַאֲנַחְנוּ נְבָרֵךְ יָהּ, מֵעַתָּה וְעַד עוֹלָם, הַלְלוּיָהּ.","T'hilat Adonai y'daber pi...","My mouth will speak the praise of the Lord, and all flesh will bless His holy name forever and ever. And we will bless the Lord from now and forever, Halleluyah.")
],"Pesukei D'Zimra"),
PR("hallelu_psalms","Hallelukah Psalms","הַלְלוּיָהּ",[
  R("Psalms 146–150 are recited in full, each opening and closing with Halleluyah. Tap to read them complete in Tehillim.",{tags:["special"]}),
  P("הַלְלוּיָהּ, הַלְלִי נַפְשִׁי אֶת יְיָ. אֲהַלְלָה יְיָ בְּחַיָּי, אֲזַמְּרָה לֵאלֹהַי בְּעוֹדִי.","Halleluyah, halleli nafshi et Adonai...","Halleluyah! Praise the Lord, O my soul. I will praise the Lord while I live; I will sing to my God as long as I exist. (Psalm 146 — continues 147–150.)")
],"Pesukei D'Zimra"),
PR("yishtabach","Yishtabach","יִשְׁתַּבַּח",[
  R("Closing blessing of the Verses of Praise."),
  P("יִשְׁתַּבַּח שִׁמְךָ לָעַד מַלְכֵּנוּ, הָאֵל הַמֶּלֶךְ הַגָּדוֹל וְהַקָּדוֹשׁ בַּשָּׁמַיִם וּבָאָרֶץ. כִּי לְךָ נָאֶה, יְיָ אֱלֹהֵינוּ וֵאלֹהֵי אֲבוֹתֵינוּ, שִׁיר וּשְׁבָחָה, הַלֵּל וְזִמְרָה. בָּרוּךְ אַתָּה יְיָ, אֵל מֶלֶךְ גָּדוֹל בַּתִּשְׁבָּחוֹת, אֵל הַהוֹדָאוֹת, אֲדוֹן הַנִּפְלָאוֹת, הַבּוֹחֵר בְּשִׁירֵי זִמְרָה, מֶלֶךְ אֵל חֵי הָעוֹלָמִים.","Yishtabach shimcha la'ad malkenu...","May Your name be praised forever, our King — the great and holy God and King in heaven and on earth. For to You, Lord our God and God of our ancestors, song and praise are fitting. Blessed are You, Lord, God and King, great in praises, God of thanksgivings, Master of wonders, who chooses songs of praise, King, God, Life of the worlds.")
],"Pesukei D'Zimra")
);

/* ---- Shacharit: Shema & its blessings ---- */
PRAYERS.shacharit.push(
PR("barchu","Barchu","בָּרְכוּ",[
  R("Said with a minyan only. The leader calls; the congregation answers."),
  P("בָּרְכוּ אֶת יְיָ הַמְבֹרָךְ. בָּרוּךְ יְיָ הַמְבֹרָךְ לְעוֹלָם וָעֶד.","Barchu et Adonai hamevorach. Baruch Adonai hamevorach l'olam va'ed.","Bless the Lord, the blessed One. Blessed is the Lord, the blessed One, for all eternity.",{tags:["requires_minyan"]})
],"Shema & Its Blessings"),
PR("yotzer","Yotzer Or","יוֹצֵר אוֹר",[
  R("First blessing before Shema — praising God who forms light and renews creation."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, יוֹצֵר אוֹר וּבוֹרֵא חֹשֶׁךְ, עוֹשֶׂה שָׁלוֹם וּבוֹרֵא אֶת הַכֹּל.","Baruch ata Adonai... yotzer or uvorei choshech, oseh shalom uvorei et hakol.","Blessed are You, Lord our God, King of the universe, who forms light and creates darkness, who makes peace and creates all things."),
  P("הַמֵּאִיר לָאָרֶץ וְלַדָּרִים עָלֶיהָ בְּרַחֲמִים, וּבְטוּבוֹ מְחַדֵּשׁ בְּכָל יוֹם תָּמִיד מַעֲשֵׂה בְרֵאשִׁית. בָּרוּךְ אַתָּה יְיָ, יוֹצֵר הַמְּאוֹרוֹת.","Hame'ir la'aretz...","Who illuminates the earth and those who dwell on it with mercy, and in His goodness renews each day, continually, the work of creation. Blessed are You, Lord, who forms the luminaries.")
],"Shema & Its Blessings"),
PR("ahava_rabbah","Ahava Rabbah","אַהֲבָה רַבָּה",[
  R("Second blessing — God's love for Israel, expressed through the gift of Torah. (Sephardi/Edot rites open אַהֲבַת עוֹלָם.)"),
  P("אַהֲבָה רַבָּה אֲהַבְתָּנוּ יְיָ אֱלֹהֵינוּ, חֶמְלָה גְדוֹלָה וִיתֵרָה חָמַלְתָּ עָלֵינוּ. אָבִינוּ מַלְכֵּנוּ, בַּעֲבוּר אֲבוֹתֵינוּ שֶׁבָּטְחוּ בְךָ וַתְּלַמְּדֵם חֻקֵּי חַיִּים, כֵּן תְּחָנֵּנוּ וּתְלַמְּדֵנוּ.","Ahava rabba ahavtanu...","With an abounding love You have loved us, Lord our God; with great and extra compassion You have shown us compassion. Our Father, our King — for the sake of our ancestors who trusted in You, whom You taught the statutes of life — so be gracious to us and teach us.",{alt:{edot:"אַהֲבַת עוֹלָם אֲהַבְתָּנוּ יְיָ אֱלֹהֵינוּ, חֶמְלָה גְדוֹלָה וִיתֵרָה חָמַלְתָּ עָלֵינוּ.",ari:"אַהֲבַת עוֹלָם אֲהַבְתָּנוּ יְיָ אֱלֹהֵינוּ, חֶמְלָה גְדוֹלָה וִיתֵרָה חָמַלְתָּ עָלֵינוּ."},vary:"Opening word varies by nusach"}),
  P("וַהֲבִיאֵנוּ לְשָׁלוֹם מֵאַרְבַּע כַּנְפוֹת הָאָרֶץ, וְתוֹלִיכֵנוּ קוֹמְמִיּוּת לְאַרְצֵנוּ. בָּרוּךְ אַתָּה יְיָ, הַבּוֹחֵר בְּעַמּוֹ יִשְׂרָאֵל בְּאַהֲבָה.","Vahavienu l'shalom...","Bring us in peace from the four corners of the earth, and lead us upright to our land. Blessed are You, Lord, who chooses His people Israel with love.")
],"Shema & Its Blessings"),
PR("shema","Shema Yisrael","שְׁמַע יִשְׂרָאֵל",[
  R("Cover your eyes with the right hand and concentrate on accepting the sovereignty of Heaven.",{tags:["special"]}),
  P("שְׁמַע יִשְׂרָאֵל, יְיָ אֱלֹהֵינוּ, יְיָ אֶחָד.","Shema Yisrael, Adonai Eloheinu, Adonai Echad.","Hear, O Israel: the Lord is our God, the Lord is One.",{tags:["special"],kav:{found:"Cover your eyes. Draw out the word Echad — One — affirming His sovereignty over the heavens, the earth, and the four directions.",halachic:"One must concentrate on accepting the yoke of Heaven (kabbalat ol malchut shamayim). The first verse requires kavanah to fulfill the mitzvah; if said without intent to its meaning, the verse is repeated. Pronounce each word clearly and pause slightly between words that could blur together.",kabbalistic:"In the prolonging of Echad: hold the ches (eight) for the One enthroned over the seven heavens and the earth, and the dalet (four) for His sovereignty over the four directions. The tradition of the Arizal directs the heart to the unification of the Holy One and His Presence — yichud Kudsha Brich Hu uShechinteh."}}),
  P("בָּרוּךְ שֵׁם כְּבוֹד מַלְכוּתוֹ לְעוֹלָם וָעֶד.","Baruch shem k'vod malchuto l'olam va'ed.","Blessed is the name of His glorious kingdom forever and ever.",{vary:"Said quietly, except on Yom Kippur"}),
  P("וְאָהַבְתָּ אֵת יְיָ אֱלֹהֶיךָ, בְּכָל לְבָבְךָ וּבְכָל נַפְשְׁךָ וּבְכָל מְאֹדֶךָ. וְהָיוּ הַדְּבָרִים הָאֵלֶּה אֲשֶׁר אָנֹכִי מְצַוְּךָ הַיּוֹם עַל לְבָבֶךָ. וְשִׁנַּנְתָּם לְבָנֶיךָ וְדִבַּרְתָּ בָּם, בְּשִׁבְתְּךָ בְּבֵיתֶךָ וּבְלֶכְתְּךָ בַדֶּרֶךְ, וּבְשָׁכְבְּךָ וּבְקוּמֶךָ. וּקְשַׁרְתָּם לְאוֹת עַל יָדֶךָ, וְהָיוּ לְטֹטָפֹת בֵּין עֵינֶיךָ. וּכְתַבְתָּם עַל מְזֻזוֹת בֵּיתֶךָ וּבִשְׁעָרֶיךָ.","V'ahavta et Adonai Elohecha...","You shall love the Lord your God with all your heart, with all your soul, and with all your might. These words which I command you today shall be upon your heart. Teach them diligently to your children, and speak of them when you sit at home and when you walk on the way, when you lie down and when you rise. Bind them as a sign upon your hand, and let them be ornaments between your eyes. Write them upon the doorposts of your house and upon your gates.",{vary:"First paragraph — Deuteronomy 6:5–9"}),
  P("וְהָיָה אִם שָׁמֹעַ תִּשְׁמְעוּ אֶל מִצְוֹתַי אֲשֶׁר אָנֹכִי מְצַוֶּה אֶתְכֶם הַיּוֹם, לְאַהֲבָה אֶת יְיָ אֱלֹהֵיכֶם וּלְעָבְדוֹ בְּכָל לְבַבְכֶם וּבְכָל נַפְשְׁכֶם. וְנָתַתִּי מְטַר אַרְצְכֶם בְּעִתּוֹ... הִשָּׁמְרוּ לָכֶם פֶּן יִפְתֶּה לְבַבְכֶם...","V'haya im shamoa...","And it shall be, if you diligently obey My commandments which I command you today, to love the Lord your God and serve Him with all your heart and all your soul — I will give the rain of your land in its season... Guard yourselves, lest your heart be tempted...",{vary:"Second paragraph — Deuteronomy 11:13–21 (read in full)"}),
  P("וַיֹּאמֶר יְיָ אֶל מֹשֶׁה לֵּאמֹר. דַּבֵּר אֶל בְּנֵי יִשְׂרָאֵל וְאָמַרְתָּ אֲלֵהֶם, וְעָשׂוּ לָהֶם צִיצִת עַל כַּנְפֵי בִגְדֵיהֶם לְדֹרֹתָם... אֲנִי יְיָ אֱלֹהֵיכֶם, אֱמֶת.","Vayomer Adonai el Moshe...","And the Lord said to Moses: Speak to the children of Israel and tell them to make for themselves tzitzit on the corners of their garments throughout their generations... I am the Lord your God — True.",{vary:"Third paragraph — Numbers 15:37–41 (read in full)"})
],"Shema & Its Blessings"),
PR("emet_vyatziv","Emet V'Yatziv","אֱמֶת וְיַצִּיב",[
  R("The blessing of redemption after Shema. Do not pause between Shema and the Amidah."),
  P("אֱמֶת וְיַצִּיב וְנָכוֹן וְקַיָּם וְיָשָׁר וְנֶאֱמָן... עַל הָרִאשׁוֹנִים וְעַל הָאַחֲרוֹנִים, דָּבָר טוֹב וְקַיָּם לְעוֹלָם וָעֶד.","Emet v'yatziv v'nachon...","True and firm, established and enduring, right and faithful... upon the first things and the last, a matter good and enduring forever and ever."),
  P("מִי כָמֹכָה בָּאֵלִם יְיָ, מִי כָּמֹכָה נֶאְדָּר בַּקֹּדֶשׁ, נוֹרָא תְהִלֹּת עֹשֵׂה פֶלֶא. בָּרוּךְ אַתָּה יְיָ, גָּאַל יִשְׂרָאֵל.","Mi chamocha ba'elim Adonai...","Who is like You among the mighty, Lord? Who is like You, glorious in holiness, awesome in praises, working wonders? Blessed are You, Lord, who redeemed Israel.")
],"Shema & Its Blessings")
);

/* ---- Shacharit: The Amidah (Shemoneh Esrei) ---- */
PRAYERS.shacharit.push(
PR("amidah_open","Amidah — Opening","עֲמִידָה",[
  R("Take three steps back, then three forward. Stand with feet together; the Amidah is said silently, facing Jerusalem. Bow at the marked words.",{tags:["special"]}),
  P("אֲדֹנָי, שְׂפָתַי תִּפְתָּח, וּפִי יַגִּיד תְּהִלָּתֶךָ.","Adonai, sefatai tiftach, ufi yagid tehilatecha.","Lord, open my lips, and my mouth will declare Your praise.",{kav:{found:"Stand as one who enters the presence of a king. Let go of all else; speak only to Him.",halachic:"Bring the feet together as one, as the angels stand. One must know before Whom one stands; the first blessing (Avot) requires kavanah, and if said without intent it is repeated. Take three steps forward to enter before the King.",kabbalistic:"The three steps forward correspond to the ascent through the worlds. Standing with feet together draws the two legs into one, the heart directed upward to receive the flow that the lips are about to release in praise."}}),
],"Amidah"),
PR("avot","1 · Avot","אָבוֹת",[
  R("Bend the knees at Baruch, bow at Ata, straighten at the Name."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ וֵאלֹהֵי אֲבוֹתֵינוּ, אֱלֹהֵי אַבְרָהָם, אֱלֹהֵי יִצְחָק, וֵאלֹהֵי יַעֲקֹב, הָאֵל הַגָּדוֹל הַגִּבּוֹר וְהַנּוֹרָא, אֵל עֶלְיוֹן, גּוֹמֵל חֲסָדִים טוֹבִים, וְקוֹנֵה הַכֹּל, וְזוֹכֵר חַסְדֵי אָבוֹת, וּמֵבִיא גוֹאֵל לִבְנֵי בְנֵיהֶם לְמַעַן שְׁמוֹ בְּאַהֲבָה.","Baruch ata Adonai... Elohei Avraham, Elohei Yitzchak, vElohei Yaakov...","Blessed are You, Lord our God and God of our ancestors, God of Abraham, God of Isaac, and God of Jacob, the great, mighty and awesome God, God Most High, who bestows kindnesses and creates all, who remembers the kindness of the patriarchs and brings a redeemer to their children's children, for His name's sake, with love.",{alt:{edot:"אֱלֹהֵי אַבְרָהָם, אֱלֹהֵי יִצְחָק, וֵאלֹהֵי יַעֲקֹב, הָאֵל הַגָּדוֹל הַגִּבּוֹר וְהַנּוֹרָא, אֵל עֶלְיוֹן, גּוֹמֵל חֲסָדִים טוֹבִים, קוֹנֵה הַכֹּל, וְזוֹכֵר חַסְדֵי אָבוֹת, וּמֵבִיא גוֹאֵל לִבְנֵי בְנֵיהֶם, לְמַעַן שְׁמוֹ בְּאַהֲבָה."},vary:"Between Rosh Hashanah & Yom Kippur add זָכְרֵנוּ לְחַיִּים"}),
  P("מֶלֶךְ עוֹזֵר וּמוֹשִׁיעַ וּמָגֵן. בָּרוּךְ אַתָּה יְיָ, מָגֵן אַבְרָהָם.","Melech ozer umoshia umagen. Baruch ata Adonai, magen Avraham.","King, Helper, Savior and Shield. Blessed are You, Lord, Shield of Abraham.")
],"Amidah"),
PR("gevurot","2 · Gevurot","גְּבוּרוֹת",[
  R("God's might — sustaining life and reviving the dead."),
  P("אַתָּה גִבּוֹר לְעוֹלָם אֲדֹנָי, מְחַיֵּה מֵתִים אַתָּה, רַב לְהוֹשִׁיעַ.","Ata gibor l'olam Adonai, mechaye metim ata, rav l'hoshia.","You are eternally mighty, my Lord, the Reviver of the dead are You; abundantly able to save.",{vary:"In winter add מַשִּׁיב הָרוּחַ וּמוֹרִיד הַגֶּשֶׁם; in summer (Israel) מוֹרִיד הַטָּל"}),
  P("מְכַלְכֵּל חַיִּים בְּחֶסֶד, מְחַיֵּה מֵתִים בְּרַחֲמִים רַבִּים, סוֹמֵךְ נוֹפְלִים, וְרוֹפֵא חוֹלִים, וּמַתִּיר אֲסוּרִים, וּמְקַיֵּם אֱמוּנָתוֹ לִישֵׁנֵי עָפָר. מִי כָמוֹךָ בַּעַל גְּבוּרוֹת וּמִי דּוֹמֶה לָּךְ, מֶלֶךְ מֵמִית וּמְחַיֶּה וּמַצְמִיחַ יְשׁוּעָה.","Mechalkel chayim b'chesed...","He sustains the living with kindness, revives the dead with great mercy, supports the falling, heals the sick, frees the captive, and keeps faith with those who sleep in the dust. Who is like You, Master of mighty deeds, and who can be compared to You — King who brings death and restores life and makes salvation flourish."),
  P("וְנֶאֱמָן אַתָּה לְהַחֲיוֹת מֵתִים. בָּרוּךְ אַתָּה יְיָ, מְחַיֵּה הַמֵּתִים.","V'ne'eman ata l'hachayot metim. Baruch ata Adonai, mechaye hametim.","And You are faithful to revive the dead. Blessed are You, Lord, who revives the dead.")
],"Amidah"),
PR("kedusha","Kedushah","קְדֻשָּׁה",[
  R("Said only with a minyan, during the leader's repetition. Rise on the toes at each קָדוֹשׁ.",{tags:["requires_minyan","special"]}),
  P("נְקַדֵּשׁ אֶת שִׁמְךָ בָּעוֹלָם... קָדוֹשׁ, קָדוֹשׁ, קָדוֹשׁ יְיָ צְבָאוֹת, מְלֹא כָל הָאָרֶץ כְּבוֹדוֹ. בָּרוּךְ כְּבוֹד יְיָ מִמְּקוֹמוֹ. יִמְלֹךְ יְיָ לְעוֹלָם, אֱלֹהַיִךְ צִיּוֹן לְדֹר וָדֹר, הַלְלוּיָהּ.","Nekadesh et shimcha... Kadosh, kadosh, kadosh...","We sanctify Your name in the world as it is sanctified in the heavens above... Holy, holy, holy is the Lord of hosts; the whole earth is full of His glory. Blessed is the glory of the Lord from His place. The Lord shall reign forever — your God, O Zion, for all generations. Halleluyah.",{alt:{edot:"נְקַדֵּשׁ וְנַעֲרִיצָךְ כְּנֹעַם שִׂיחַ סוֹד שַׂרְפֵי קֹדֶשׁ... קָדוֹשׁ, קָדוֹשׁ, קָדוֹשׁ יְיָ צְבָאוֹת, מְלֹא כָל הָאָרֶץ כְּבוֹדוֹ.",ari:"נְקַדֵּשׁ אֶת שִׁמְךָ בָּעוֹלָם, כְּשֵׁם שֶׁמַּקְדִּישִׁים אוֹתוֹ בִּשְׁמֵי מָרוֹם... קָדוֹשׁ, קָדוֹשׁ, קָדוֹשׁ יְיָ צְבָאוֹת, מְלֹא כָל הָאָרֶץ כְּבוֹדוֹ."},vary:"Wording of the introduction varies by nusach"})
],"Amidah"),
PR("kedushat_hashem","3 · Kedushat HaShem","קְדֻשַּׁת הַשֵּׁם",[
  P("אַתָּה קָדוֹשׁ וְשִׁמְךָ קָדוֹשׁ, וּקְדוֹשִׁים בְּכָל יוֹם יְהַלְלוּךָ סֶּלָה. בָּרוּךְ אַתָּה יְיָ, הָאֵל הַקָּדוֹשׁ.","Ata kadosh v'shimcha kadosh...","You are holy and Your name is holy, and holy ones praise You every day, Selah. Blessed are You, Lord, the holy God.",{vary:"Between Rosh Hashanah & Yom Kippur seal הַמֶּלֶךְ הַקָּדוֹשׁ"})
],"Amidah"),
PR("binah","4 · Binah","בִּינָה",[
  R("The thirteen middle blessings are requests. First — for wisdom."),
  P("אַתָּה חוֹנֵן לְאָדָם דַּעַת, וּמְלַמֵּד לֶאֱנוֹשׁ בִּינָה. חָנֵּנוּ מֵאִתְּךָ דֵּעָה בִּינָה וְהַשְׂכֵּל. בָּרוּךְ אַתָּה יְיָ, חוֹנֵן הַדָּעַת.","Ata chonen l'adam da'at...","You graciously grant knowledge to man and teach understanding to mortals. Grant us from You knowledge, understanding and insight. Blessed are You, Lord, gracious Giver of knowledge.")
],"Amidah"),
PR("teshuvah","5 · Teshuvah","תְּשׁוּבָה",[
  P("הֲשִׁיבֵנוּ אָבִינוּ לְתוֹרָתֶךָ, וְקָרְבֵנוּ מַלְכֵּנוּ לַעֲבוֹדָתֶךָ, וְהַחֲזִירֵנוּ בִּתְשׁוּבָה שְׁלֵמָה לְפָנֶיךָ. בָּרוּךְ אַתָּה יְיָ, הָרוֹצֶה בִּתְשׁוּבָה.","Hashivenu Avinu l'Toratecha...","Bring us back, our Father, to Your Torah; draw us near, our King, to Your service; and return us in complete repentance before You. Blessed are You, Lord, who desires repentance.")
],"Amidah"),
PR("selichah","6 · Selichah","סְלִיחָה",[
  R("Lightly strike the chest at חָטָאנוּ / פָשָׁעְנוּ."),
  P("סְלַח לָנוּ אָבִינוּ כִּי חָטָאנוּ, מְחַל לָנוּ מַלְכֵּנוּ כִּי פָשָׁעְנוּ, כִּי מוֹחֵל וְסוֹלֵחַ אָתָּה. בָּרוּךְ אַתָּה יְיָ, חַנּוּן הַמַּרְבֶּה לִסְלוֹחַ.","S'lach lanu Avinu ki chatanu...","Forgive us, our Father, for we have sinned; pardon us, our King, for we have transgressed — for You pardon and forgive. Blessed are You, Lord, gracious One who pardons abundantly.")
],"Amidah"),
PR("geulah","7 · Geulah","גְּאֻלָּה",[
  P("רְאֵה נָא בְעָנְיֵנוּ, וְרִיבָה רִיבֵנוּ, וּגְאָלֵנוּ מְהֵרָה לְמַעַן שְׁמֶךָ, כִּי גוֹאֵל חָזָק אָתָּה. בָּרוּךְ אַתָּה יְיָ, גּוֹאֵל יִשְׂרָאֵל.","Re'eh na v'onyenu...","Look upon our affliction, take up our cause, and redeem us swiftly for Your name's sake, for You are a mighty Redeemer. Blessed are You, Lord, Redeemer of Israel.")
],"Amidah"),
PR("refuah","8 · Refuah","רְפוּאָה",[
  R("One may add a private prayer here for a sick person by name."),
  P("רְפָאֵנוּ יְיָ וְנֵרָפֵא, הוֹשִׁיעֵנוּ וְנִוָּשֵׁעָה, כִּי תְהִלָּתֵנוּ אָתָּה, וְהַעֲלֵה רְפוּאָה שְׁלֵמָה לְכָל מַכּוֹתֵינוּ. בָּרוּךְ אַתָּה יְיָ, רוֹפֵא חוֹלֵי עַמּוֹ יִשְׂרָאֵל.","Refa'enu Adonai v'nerafe...","Heal us, Lord, and we shall be healed; save us and we shall be saved, for You are our praise. Bring complete healing to all our wounds. Blessed are You, Lord, who heals the sick of His people Israel.")
],"Amidah"),
PR("birkat_hashanim","9 · Birkat HaShanim","בִּרְכַּת הַשָּׁנִים",[
  P("בָּרֵךְ עָלֵינוּ יְיָ אֱלֹהֵינוּ אֶת הַשָּׁנָה הַזֹּאת וְאֶת כָּל מִינֵי תְבוּאָתָהּ לְטוֹבָה, וְתֵן בְּרָכָה עַל פְּנֵי הָאֲדָמָה, וְשַׂבְּעֵנוּ מִטּוּבֶךָ. בָּרוּךְ אַתָּה יְיָ, מְבָרֵךְ הַשָּׁנִים.","Barech aleinu...","Bless this year for us, Lord our God, and all its kinds of produce for good. Grant blessing upon the face of the earth, and satisfy us with Your goodness. Blessed are You, Lord, who blesses the years.",{vary:"In winter say וְתֵן טַל וּמָטָר לִבְרָכָה"})
],"Amidah"),
PR("kibbutz","10 · Kibbutz Galuyot","קִבּוּץ גָּלֻיּוֹת",[
  P("תְּקַע בְּשׁוֹפָר גָּדוֹל לְחֵרוּתֵנוּ, וְשָׂא נֵס לְקַבֵּץ גָּלֻיּוֹתֵינוּ, וְקַבְּצֵנוּ יַחַד מֵאַרְבַּע כַּנְפוֹת הָאָרֶץ. בָּרוּךְ אַתָּה יְיָ, מְקַבֵּץ נִדְחֵי עַמּוֹ יִשְׂרָאֵל.","Teka b'shofar gadol...","Sound the great shofar for our freedom, raise a banner to gather our exiles, and bring us together from the four corners of the earth. Blessed are You, Lord, who gathers the dispersed of His people Israel.")
],"Amidah"),
PR("din","11 · Hashavat Mishpat","הָשָׁבַת מִשְׁפָּט",[
  P("הָשִׁיבָה שׁוֹפְטֵינוּ כְּבָרִאשׁוֹנָה וְיוֹעֲצֵינוּ כְּבַתְּחִלָּה, וְהָסֵר מִמֶּנּוּ יָגוֹן וַאֲנָחָה, וּמְלוֹךְ עָלֵינוּ אַתָּה יְיָ לְבַדְּךָ בְּחֶסֶד וּבְרַחֲמִים. בָּרוּךְ אַתָּה יְיָ, מֶלֶךְ אוֹהֵב צְדָקָה וּמִשְׁפָּט.","Hashiva shofteinu...","Restore our judges as at first and our counselors as at the beginning; remove from us sorrow and sighing, and reign over us, You alone, with kindness and mercy. Blessed are You, Lord, King who loves righteousness and justice.",{vary:"Between Rosh Hashanah & Yom Kippur seal הַמֶּלֶךְ הַמִּשְׁפָּט"})
],"Amidah"),
PR("birkat_minim","12 · Birkat HaMinim","בִּרְכַּת הַמִּינִים",[
  P("וְלַמַּלְשִׁינִים אַל תְּהִי תִקְוָה, וְכָל הָרִשְׁעָה כְּרֶגַע תֹּאבֵד, וְכָל אוֹיְבֵי עַמְּךָ מְהֵרָה יִכָּרֵתוּ. בָּרוּךְ אַתָּה יְיָ, שׁוֹבֵר אוֹיְבִים וּמַכְנִיעַ זֵדִים.","V'lamalshinim...","Let there be no hope for slanderers, and may all wickedness perish in an instant; may all the enemies of Your people be swiftly cut off. Blessed are You, Lord, who breaks enemies and humbles the arrogant.")
],"Amidah"),
PR("tzadikim","13 · Al HaTzadikim","עַל הַצַּדִּיקִים",[
  P("עַל הַצַּדִּיקִים וְעַל הַחֲסִידִים וְעַל זִקְנֵי עַמְּךָ בֵּית יִשְׂרָאֵל... יֶהֱמוּ רַחֲמֶיךָ יְיָ אֱלֹהֵינוּ, וְתֵן שָׂכָר טוֹב לְכָל הַבּוֹטְחִים בְּשִׁמְךָ בֶּאֱמֶת. בָּרוּךְ אַתָּה יְיָ, מִשְׁעָן וּמִבְטָח לַצַּדִּיקִים.","Al hatzadikim...","Upon the righteous, the devout, the elders of Your people the House of Israel... may Your mercy be aroused, Lord our God, and grant good reward to all who sincerely trust in Your name. Blessed are You, Lord, the support and trust of the righteous.")
],"Amidah"),
PR("yerushalayim","14 · Binyan Yerushalayim","בִּנְיַן יְרוּשָׁלַיִם",[
  P("וְלִירוּשָׁלַיִם עִירְךָ בְּרַחֲמִים תָּשׁוּב, וְתִשְׁכּוֹן בְּתוֹכָהּ כַּאֲשֶׁר דִּבַּרְתָּ, וּבְנֵה אוֹתָהּ בְּקָרוֹב בְּיָמֵינוּ בִּנְיַן עוֹלָם, וְכִסֵּא דָוִד מְהֵרָה לְתוֹכָהּ תָּכִין. בָּרוּךְ אַתָּה יְיָ, בּוֹנֵה יְרוּשָׁלָיִם.","V'lirushalayim ircha...","Return in mercy to Jerusalem Your city and dwell within it as You promised; rebuild it soon, in our days, as an everlasting structure, and establish the throne of David speedily within it. Blessed are You, Lord, who builds Jerusalem.")
],"Amidah"),
PR("david","15 · Malchut Beit David","מַלְכוּת בֵּית דָּוִד",[
  P("אֶת צֶמַח דָּוִד עַבְדְּךָ מְהֵרָה תַצְמִיחַ, וְקַרְנוֹ תָּרוּם בִּישׁוּעָתֶךָ, כִּי לִישׁוּעָתְךָ קִוִּינוּ כָּל הַיּוֹם. בָּרוּךְ אַתָּה יְיָ, מַצְמִיחַ קֶרֶן יְשׁוּעָה.","Et tzemach David...","Speedily cause the offshoot of David Your servant to flourish, and exalt his pride through Your salvation, for we await Your salvation all day. Blessed are You, Lord, who causes the horn of salvation to flourish.")
],"Amidah"),
PR("kabbalat_tefillah","16 · Shomea Tefillah","שׁוֹמֵעַ תְּפִלָּה",[
  R("One may insert personal requests within this blessing."),
  P("שְׁמַע קוֹלֵנוּ יְיָ אֱלֹהֵינוּ, חוּס וְרַחֵם עָלֵינוּ, וְקַבֵּל בְּרַחֲמִים וּבְרָצוֹן אֶת תְּפִלָּתֵנוּ... כִּי אַתָּה שׁוֹמֵעַ תְּפִלַּת כָּל פֶּה. בָּרוּךְ אַתָּה יְיָ, שׁוֹמֵעַ תְּפִלָּה.","Shma kolenu...","Hear our voice, Lord our God; have pity and compassion upon us, and accept our prayer with mercy and favor... for You hear the prayer of every mouth. Blessed are You, Lord, who hears prayer.")
],"Amidah"),
PR("avodah","17 · Avodah","עֲבוֹדָה",[
  R("The final three blessings are thanksgiving and peace, said at every Amidah of the year."),
  P("רְצֵה יְיָ אֱלֹהֵינוּ בְּעַמְּךָ יִשְׂרָאֵל וּבִתְפִלָּתָם, וְהָשֵׁב אֶת הָעֲבוֹדָה לִדְבִיר בֵּיתֶךָ... וְתֶחֱזֶינָה עֵינֵינוּ בְּשׁוּבְךָ לְצִיּוֹן בְּרַחֲמִים. בָּרוּךְ אַתָּה יְיָ, הַמַּחֲזִיר שְׁכִינָתוֹ לְצִיּוֹן.","Retzeh Adonai Eloheinu...","Be pleased, Lord our God, with Your people Israel and their prayer; restore the service to the inner sanctuary of Your House... May our eyes behold Your return to Zion in mercy. Blessed are You, Lord, who restores His Presence to Zion.",{vary:"On Rosh Chodesh & festivals add יַעֲלֶה וְיָבֹא"})
],"Amidah"),
PR("modim","18 · Modim","מוֹדִים",[
  R("Bow at מוֹדִים אֲנַחְנוּ לָךְ and remain bowed until the Name."),
  P("מוֹדִים אֲנַחְנוּ לָךְ, שָׁאַתָּה הוּא יְיָ אֱלֹהֵינוּ וֵאלֹהֵי אֲבוֹתֵינוּ לְעוֹלָם וָעֶד, צוּר חַיֵּינוּ מָגֵן יִשְׁעֵנוּ אַתָּה הוּא לְדוֹר וָדוֹר. נוֹדֶה לְּךָ וּנְסַפֵּר תְּהִלָּתֶךָ עַל חַיֵּינוּ הַמְּסוּרִים בְּיָדֶךָ, וְעַל נִשְׁמוֹתֵינוּ הַפְּקוּדוֹת לָךְ, וְעַל נִסֶּיךָ שֶׁבְּכָל יוֹם עִמָּנוּ.","Modim anachnu lach...","We thankfully acknowledge that You are the Lord our God and God of our ancestors forever; the Rock of our lives, the Shield of our salvation in every generation. We thank You and declare Your praise for our lives entrusted to Your hand, for our souls in Your keeping, and for Your daily miracles with us.",{vary:"On Chanukah & Purim add עַל הַנִּסִּים"}),
  P("וְעַל כֻּלָּם יִתְבָּרַךְ וְיִתְרוֹמַם שִׁמְךָ מַלְכֵּנוּ תָּמִיד לְעוֹלָם וָעֶד... בָּרוּךְ אַתָּה יְיָ, הַטּוֹב שִׁמְךָ וּלְךָ נָאֶה לְהוֹדוֹת.","V'al kulam...","For all this may Your name be blessed and exalted, our King, continually, forever and ever... Blessed are You, Lord — Your name is good, and to You it is fitting to give thanks.")
],"Amidah"),
PR("birkat_shalom","19 · Birkat Shalom","בִּרְכַּת שָׁלוֹם",[
  P("שִׂים שָׁלוֹם טוֹבָה וּבְרָכָה, חֵן וָחֶסֶד וְרַחֲמִים, עָלֵינוּ וְעַל כָּל יִשְׂרָאֵל עַמֶּךָ. בָּרְכֵנוּ אָבִינוּ כֻּלָּנוּ כְּאֶחָד בְּאוֹר פָּנֶיךָ... בָּרוּךְ אַתָּה יְיָ, הַמְבָרֵךְ אֶת עַמּוֹ יִשְׂרָאֵל בַּשָּׁלוֹם.","Sim shalom tova uvracha...","Grant peace, goodness and blessing, grace, kindness and mercy upon us and upon all Israel Your people. Bless us, our Father, all as one, with the light of Your face... Blessed are You, Lord, who blesses His people Israel with peace.",{alt:{ari:"שָׁלוֹם רָב עַל יִשְׂרָאֵל עַמְּךָ תָּשִׂים לְעוֹלָם... בָּרוּךְ אַתָּה יְיָ, הַמְבָרֵךְ אֶת עַמּוֹ יִשְׂרָאֵל בַּשָּׁלוֹם.",sefard:"שָׁלוֹם רָב עַל יִשְׂרָאֵל עַמְּךָ תָּשִׂים לְעוֹלָם..."},vary:"Many say שָׁלוֹם רָב at Mincha & Maariv"}),
  P("אֱלֹהַי, נְצוֹר לְשׁוֹנִי מֵרָע וּשְׂפָתַי מִדַּבֵּר מִרְמָה, וְלִמְקַלְלַי נַפְשִׁי תִדּוֹם, וְנַפְשִׁי כֶּעָפָר לַכֹּל תִּהְיֶה. עֹשֶׂה שָׁלוֹם בִּמְרוֹמָיו, הוּא יַעֲשֶׂה שָׁלוֹם עָלֵינוּ וְעַל כָּל יִשְׂרָאֵל, וְאִמְרוּ אָמֵן.","Elohai, netzor leshoni mera...","My God, guard my tongue from evil and my lips from speaking deceit. To those who curse me let my soul be silent, and let my soul be like dust to all. May He who makes peace in His heights make peace upon us and upon all Israel; and say: Amen.",{kavanah:"Take three steps back. Bow left at עֹשֶׂה שָׁלוֹם, right at הוּא יַעֲשֶׂה, forward at וְעַל כָּל יִשְׂרָאֵל.",tags:["special"]})
],"Amidah")
);

/* ---- Shacharit: Tachanun & Concluding ---- */
PRAYERS.shacharit.push(
PR("hallel_shacharit","Hallel","הַלֵּל",[
  R("Added after the Amidah on Rosh Chodesh, festivals, and Chanukah. On Rosh Chodesh and the latter days of Pesach, the abbreviated (Half) Hallel is said; on other festivals and Chanukah, the complete Hallel.",{tags:["special"]}),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ לִקְרֹא אֶת הַהַלֵּל.","Baruch ata Adonai Eloheinu melech ha'olam, asher kid'shanu b'mitzvotav v'tzivanu likro et haHallel.","Blessed are You, Lord our God, King of the universe, who has sanctified us with His commandments and commanded us to recite the Hallel."),
  P("הַלְלוּיָהּ, הַלְלוּ עַבְדֵי יְיָ, הַלְלוּ אֶת שֵׁם יְיָ. יְהִי שֵׁם יְיָ מְבֹרָךְ מֵעַתָּה וְעַד עוֹלָם.","Halleluyah, hallelu avdei Adonai, hallelu et shem Adonai...","Halleluyah! Praise, you servants of the Lord, praise the name of the Lord. Blessed be the name of the Lord from now and forever. (Psalms 113–118 are recited in full.)"),
  R("Psalms 113 through 118 are recited. Tap to read them complete in Tehillim.",{tags:["special"]})
],"Hallel"),
PR("tachanun","Tachanun","תַּחֲנוּן",[
  R("Supplication after the Amidah (omitted on Shabbat, festivals, and joyous days). Sit and rest the head on the arm.",{tags:["special"]}),
  P("וַיֹּאמֶר דָּוִד אֶל גָּד: צַר לִי מְאֹד, נִפְּלָה נָּא בְיַד יְיָ כִּי רַבִּים רַחֲמָיו, וּבְיַד אָדָם אַל אֶפֹּלָה.","Vayomer David el Gad...","And David said to Gad: I am in great distress; let us fall into the hand of the Lord, for His mercies are great, but let me not fall into the hand of man."),
  P("רַחוּם וְחַנּוּן חָטָאתִי לְפָנֶיךָ, יְיָ מָלֵא רַחֲמִים רַחֵם עָלַי וְקַבֵּל תַּחֲנוּנָי.","Rachum v'chanun chatati l'fanecha...","Merciful and gracious One, I have sinned before You; Lord, full of compassion, have mercy on me and accept my supplications.")
],"Tachanun"),
PR("ashrei_return","Ashrei (return)","אַשְׁרֵי",[
  R("Psalm 145 is recited again before the concluding prayers."),
  P("אַשְׁרֵי יוֹשְׁבֵי בֵיתֶךָ, עוֹד יְהַלְלוּךָ סֶּלָה... פּוֹתֵחַ אֶת יָדֶךָ, וּמַשְׂבִּיעַ לְכָל חַי רָצוֹן.","Ashrei yoshvei veitecha...","Happy are those who dwell in Your house... You open Your hand and satisfy the desire of every living being. (Read the full psalm.)")
],"Concluding"),
PR("uva_letzion","Uva LeTzion","וּבָא לְצִיּוֹן",[
  P("וּבָא לְצִיּוֹן גּוֹאֵל, וּלְשָׁבֵי פֶשַׁע בְּיַעֲקֹב, נְאֻם יְיָ... וַאֲנִי זֹאת בְּרִיתִי אוֹתָם אָמַר יְיָ.","Uva l'Tzion goel...","A redeemer shall come to Zion, and to those of Jacob who turn from transgression, says the Lord... And as for Me, this is My covenant with them, says the Lord.")
],"Concluding"),
PR("aleinu","Aleinu","עָלֵינוּ",[
  R("Recited standing at the close of every service. Bow at וַאֲנַחְנוּ כּוֹרְעִים.",{tags:["special"]}),
  P("עָלֵינוּ לְשַׁבֵּחַ לַאֲדוֹן הַכֹּל, לָתֵת גְּדֻלָּה לְיוֹצֵר בְּרֵאשִׁית, שֶׁלֹּא עָשָׂנוּ כְּגוֹיֵי הָאֲרָצוֹת... וַאֲנַחְנוּ כּוֹרְעִים וּמִשְׁתַּחֲוִים וּמוֹדִים לִפְנֵי מֶלֶךְ מַלְכֵי הַמְּלָכִים, הַקָּדוֹשׁ בָּרוּךְ הוּא.","Aleinu l'shabe'ach...","It is upon us to praise the Master of all, to ascribe greatness to the Author of creation, who has not made us like the nations of the lands... And we bow, prostrate ourselves, and give thanks before the King of kings of kings, the Holy One, blessed be He.",{kav:{found:"Bow fully at 'and we bow.' Reflect that all of history bends toward His kingship.",halachic:"Bend the knees and bow at וַאֲנַחְנוּ כּוֹרְעִים; one may not bow during the rest. Aleinu should be said standing.",kabbalistic:"Aleinu is attributed by tradition to Yehoshua upon entering the Land. It proclaims the future unification of the Divine Name, when יְהוָה יִהְיֶה אֶחָד — He will be One and His Name One."}}),
  P("עַל כֵּן נְקַוֶּה לְּךָ יְיָ אֱלֹהֵינוּ, לִרְאוֹת מְהֵרָה בְּתִפְאֶרֶת עֻזֶּךָ... וְהָיָה יְיָ לְמֶלֶךְ עַל כָּל הָאָרֶץ, בַּיּוֹם הַהוּא יִהְיֶה יְיָ אֶחָד וּשְׁמוֹ אֶחָד.","Al ken nekaveh...","Therefore we put our hope in You, Lord our God, to soon behold the splendor of Your might... And the Lord shall be King over all the earth; on that day the Lord shall be One and His name One.")
],"Concluding"),
PR("shir_shel_yom","Shir Shel Yom","שִׁיר שֶׁל יוֹם",[
  R("The Psalm of the Day — a different psalm for each weekday, recited after Aleinu.",{tags:["special"]}),
  P("הַיּוֹם יוֹם רִאשׁוֹן בְּשַׁבָּת, שֶׁבּוֹ הָיוּ הַלְוִיִּם אוֹמְרִים בְּבֵית הַמִּקְדָּשׁ: לַיְיָ הָאָרֶץ וּמְלוֹאָהּ, תֵּבֵל וְיֹשְׁבֵי בָהּ. (תהלים כד)","Hayom yom rishon b'Shabbat...","Today is the first day of the week, on which the Levites would say in the Temple: 'The earth is the Lord's and all it holds, the world and its inhabitants' (Psalm 24). Each day has its own psalm — Sun 24, Mon 48, Tue 82, Wed 94, Thu 81, Fri 93.",{vary:"The psalm changes with the weekday"})
],"Concluding"),
PR("mourners_kaddish","Mourner's Kaddish","קַדִּישׁ יָתוֹם",[
  R("Recited by mourners, standing, with a minyan.",{tags:["requires_minyan","special"]}),
  P("יִתְגַּדַּל וְיִתְקַדַּשׁ שְׁמֵהּ רַבָּא. בְּעָלְמָא דִּי בְרָא כִרְעוּתֵהּ, וְיַמְלִיךְ מַלְכוּתֵהּ... יְהֵא שְׁמֵהּ רַבָּא מְבָרַךְ לְעָלַם וּלְעָלְמֵי עָלְמַיָּא.","Yitgadal v'yitkadash shmeh rabba...","Magnified and sanctified be His great name in the world He created according to His will, and may He establish His kingdom... May His great name be blessed forever and to all eternity.",{alt:{edot:"יִתְגַּדַּל וְיִתְקַדַּשׁ שְׁמֵהּ רַבָּא, אָמֵן. בְּעָלְמָא דִּי בְרָא כִרְעוּתֵהּ, וְיַמְלִיךְ מַלְכוּתֵהּ, וְיַצְמַח פֻּרְקָנֵהּ וִיקָרֵב מְשִׁיחֵהּ.",ari:"יִתְגַּדַּל וְיִתְקַדַּשׁ שְׁמֵהּ רַבָּא, בְּעָלְמָא דִּי בְרָא כִרְעוּתֵהּ, וְיַמְלִיךְ מַלְכוּתֵהּ, וְיַצְמַח פֻּרְקָנֵהּ וִיקָרֵב מְשִׁיחֵהּ."},vary:"Sephardi & Ari rites add וְיַצְמַח פֻּרְקָנֵהּ"})
],"Concluding")
);

/* ====== MINCHA ====== */
PRAYERS.mincha.push(
PR("korbanot_mincha","Opening","פְּתִיחָה",[
  R("Mincha is brief. Many begin with the Korban HaTamid or Ketoret; the core is Ashrei, the Amidah, and Tachanun.")
],"Opening"),
PR("ashrei_mincha","Ashrei","אַשְׁרֵי",[
  P("אַשְׁרֵי יוֹשְׁבֵי בֵיתֶךָ, עוֹד יְהַלְלוּךָ סֶּלָה. אַשְׁרֵי הָעָם שֶׁכָּכָה לּוֹ, אַשְׁרֵי הָעָם שֶׁיְיָ אֱלֹהָיו... פּוֹתֵחַ אֶת יָדֶךָ, וּמַשְׂבִּיעַ לְכָל חַי רָצוֹן.","Ashrei yoshvei veitecha...","Happy are those who dwell in Your house; they continually praise You, Selah... You open Your hand and satisfy the desire of every living being. (Psalm 145, read in full.)")
],"Opening"),
PR("amidah_mincha","The Amidah","עֲמִידָה",[
  R("The same Shemoneh Esrei as Shacharit — opening, three of praise, thirteen requests, three of thanks. Said standing, silently, facing Jerusalem.",{tags:["special"]}),
  P("אֲדֹנָי, שְׂפָתַי תִּפְתָּח, וּפִי יַגִּיד תְּהִלָּתֶךָ. בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ וֵאלֹהֵי אֲבוֹתֵינוּ, אֱלֹהֵי אַבְרָהָם, אֱלֹהֵי יִצְחָק, וֵאלֹהֵי יַעֲקֹב...","Adonai sefatai tiftach...","Lord, open my lips, and my mouth will declare Your praise. Blessed are You, Lord our God and God of our ancestors, God of Abraham, Isaac, and Jacob... (Continue the full weekday Amidah, identical to Shacharit.)",{kavanah:"Pause from the day's work and stand fully present before Him."})
],"Amidah"),
PR("tachanun_mincha","Tachanun","תַּחֲנוּן",[
  R("Supplication, as in Shacharit (omitted on the same joyous days)."),
  P("רַחוּם וְחַנּוּן חָטָאתִי לְפָנֶיךָ, יְיָ מָלֵא רַחֲמִים רַחֵם עָלַי וְקַבֵּל תַּחֲנוּנָי.","Rachum v'chanun...","Merciful and gracious One, I have sinned before You; Lord, full of compassion, have mercy on me and accept my supplications.")
],"Tachanun"),
PR("aleinu_mincha","Aleinu","עָלֵינוּ",[
  R("Stand. Concludes the service, as in Shacharit.",{tags:["special"]}),
  P("עָלֵינוּ לְשַׁבֵּחַ לַאֲדוֹן הַכֹּל... וְהָיָה יְיָ לְמֶלֶךְ עַל כָּל הָאָרֶץ, בַּיּוֹם הַהוּא יִהְיֶה יְיָ אֶחָד וּשְׁמוֹ אֶחָד.","Aleinu l'shabe'ach...","It is upon us to praise the Master of all... And the Lord shall be King over all the earth; on that day the Lord shall be One and His name One.")
],"Concluding")
);

/* ====== MAARIV ====== */
PRAYERS.maariv.push(
PR("vehu_rachum","V'hu Rachum","וְהוּא רַחוּם",[
  R("The evening service opens with a verse of mercy."),
  P("וְהוּא רַחוּם יְכַפֵּר עָוֹן וְלֹא יַשְׁחִית, וְהִרְבָּה לְהָשִׁיב אַפּוֹ, וְלֹא יָעִיר כָּל חֲמָתוֹ. יְיָ הוֹשִׁיעָה, הַמֶּלֶךְ יַעֲנֵנוּ בְיוֹם קָרְאֵנוּ.","V'hu rachum yechaper avon...","And He, the Merciful, atones for sin and does not destroy; abundantly He withdraws His anger and does not arouse all His wrath. Lord, save us; may the King answer us on the day we call.")
],"Opening"),
PR("barchu_maariv","Barchu","בָּרְכוּ",[
  R("Said with a minyan.",{tags:["requires_minyan"]}),
  P("בָּרְכוּ אֶת יְיָ הַמְבֹרָךְ. בָּרוּךְ יְיָ הַמְבֹרָךְ לְעוֹלָם וָעֶד.","Barchu et Adonai hamevorach...","Bless the Lord, the blessed One. Blessed is the Lord, the blessed One, for all eternity.",{tags:["requires_minyan"]})
],"Shema & Its Blessings"),
PR("maariv_aravim","Maariv Aravim","מַעֲרִיב עֲרָבִים",[
  R("First blessing before the evening Shema — God who brings on the evenings."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר בִּדְבָרוֹ מַעֲרִיב עֲרָבִים, בְּחָכְמָה פּוֹתֵחַ שְׁעָרִים, וּבִתְבוּנָה מְשַׁנֶּה עִתִּים וּמַחֲלִיף אֶת הַזְּמַנִּים... בָּרוּךְ אַתָּה יְיָ, הַמַּעֲרִיב עֲרָבִים.","Baruch ata Adonai... asher bidvaro maariv aravim...","Blessed are You, Lord our God, King of the universe, who by His word brings on the evenings, with wisdom opens the gates, with understanding alters the times and changes the seasons... Blessed are You, Lord, who brings on the evenings.")
],"Shema & Its Blessings"),
PR("ahavat_olam","Ahavat Olam","אַהֲבַת עוֹלָם",[
  R("Second blessing — God's eternal love expressed through Torah."),
  P("אַהֲבַת עוֹלָם בֵּית יִשְׂרָאֵל עַמְּךָ אָהָבְתָּ, תּוֹרָה וּמִצְוֹת חֻקִּים וּמִשְׁפָּטִים אוֹתָנוּ לִמַּדְתָּ... כִּי הֵם חַיֵּינוּ וְאֹרֶךְ יָמֵינוּ, וּבָהֶם נֶהְגֶּה יוֹמָם וָלָיְלָה. בָּרוּךְ אַתָּה יְיָ, אוֹהֵב עַמּוֹ יִשְׂרָאֵל.","Ahavat olam beit Yisrael...","With an eternal love You have loved the House of Israel Your people; Torah and commandments, statutes and laws You have taught us... for they are our life and the length of our days, and on them we meditate day and night. Blessed are You, Lord, who loves His people Israel.")
],"Shema & Its Blessings"),
PR("shema_maariv","Shema Yisrael","שְׁמַע יִשְׂרָאֵל",[
  R("Cover the eyes and concentrate on accepting the sovereignty of Heaven, as in the morning.",{tags:["special"]}),
  P("שְׁמַע יִשְׂרָאֵל, יְיָ אֱלֹהֵינוּ, יְיָ אֶחָד.","Shema Yisrael, Adonai Eloheinu, Adonai Echad.","Hear, O Israel: the Lord is our God, the Lord is One.",{kavanah:"Cover your eyes; draw out Echad — One.",tags:["special"]}),
  P("בָּרוּךְ שֵׁם כְּבוֹד מַלְכוּתוֹ לְעוֹלָם וָעֶד.","Baruch shem k'vod malchuto l'olam va'ed.","Blessed is the name of His glorious kingdom forever and ever.",{vary:"Said quietly"}),
  P("וְאָהַבְתָּ אֵת יְיָ אֱלֹהֶיךָ, בְּכָל לְבָבְךָ וּבְכָל נַפְשְׁךָ וּבְכָל מְאֹדֶךָ... (שלוש פרשיות כמו בשחרית).","V'ahavta et Adonai Elohecha...","You shall love the Lord your God with all your heart, all your soul, and all your might... (All three paragraphs, as in the morning.)",{vary:"Three paragraphs — Deut. 6, Deut. 11, Numbers 15"})
],"Shema & Its Blessings"),
PR("emet_vemunah","Emet V'Emunah","אֱמֶת וֶאֱמוּנָה",[
  R("The evening blessing of redemption after Shema."),
  P("אֱמֶת וֶאֱמוּנָה כָּל זֹאת, וְקַיָּם עָלֵינוּ, כִּי הוּא יְיָ אֱלֹהֵינוּ וְאֵין זוּלָתוֹ, וַאֲנַחְנוּ יִשְׂרָאֵל עַמּוֹ... מִי כָמֹכָה בָּאֵלִם יְיָ. בָּרוּךְ אַתָּה יְיָ, גָּאַל יִשְׂרָאֵל.","Emet ve'emunah kol zot...","True and faithful is all this, and firmly established for us, that He is the Lord our God and there is none besides Him, and we, Israel, are His people... Who is like You among the mighty, Lord. Blessed are You, Lord, who redeemed Israel.")
],"Shema & Its Blessings"),
PR("hashkivenu","Hashkivenu","הַשְׁכִּיבֵנוּ",[
  R("A prayer for protection through the night."),
  P("הַשְׁכִּיבֵנוּ יְיָ אֱלֹהֵינוּ לְשָׁלוֹם, וְהַעֲמִידֵנוּ מַלְכֵּנוּ לְחַיִּים, וּפְרֹשׂ עָלֵינוּ סֻכַּת שְׁלוֹמֶךָ... וּשְׁמֹר צֵאתֵנוּ וּבוֹאֵנוּ לְחַיִּים וּלְשָׁלוֹם מֵעַתָּה וְעַד עוֹלָם. בָּרוּךְ אַתָּה יְיָ, שׁוֹמֵר עַמּוֹ יִשְׂרָאֵל לָעַד.","Hashkivenu Adonai Eloheinu l'shalom...","Lay us down, Lord our God, in peace, and raise us up again, our King, to life; spread over us the shelter of Your peace... Guard our going out and coming in for life and peace, from now and forever. Blessed are You, Lord, who guards His people Israel forever.")
],"Shema & Its Blessings"),
PR("amidah_maariv","The Amidah","עֲמִידָה",[
  R("The weekday Amidah, said standing and silently — the same nineteen blessings as Shacharit.",{tags:["special"]}),
  P("אֲדֹנָי, שְׂפָתַי תִּפְתָּח, וּפִי יַגִּיד תְּהִלָּתֶךָ. בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ וֵאלֹהֵי אֲבוֹתֵינוּ...","Adonai sefatai tiftach...","Lord, open my lips, and my mouth will declare Your praise. Blessed are You, Lord our God and God of our ancestors... (Continue the full weekday Amidah.)")
],"Amidah"),
PR("aleinu_maariv","Aleinu","עָלֵינוּ",[
  R("Stand. Concludes the evening service.",{tags:["special"]}),
  P("עָלֵינוּ לְשַׁבֵּחַ לַאֲדוֹן הַכֹּל... וְהָיָה יְיָ לְמֶלֶךְ עַל כָּל הָאָרֶץ, בַּיּוֹם הַהוּא יִהְיֶה יְיָ אֶחָד וּשְׁמוֹ אֶחָד.","Aleinu l'shabe'ach...","It is upon us to praise the Master of all... And the Lord shall be King over all the earth; on that day the Lord shall be One and His name One.")
],"Concluding")
);

/* ====== BIRKAT HAMAZON ====== */
PRAYERS.birkat.push(
PR("zimmun","Zimmun","זִמּוּן",[
  R("When three or more adults ate together, the leader invites the others to bless. Said with a minyan/group.",{tags:["requires_minyan"]}),
  P("רַבּוֹתַי נְבָרֵךְ. יְהִי שֵׁם יְיָ מְבֹרָךְ מֵעַתָּה וְעַד עוֹלָם. בִּרְשׁוּת רַבּוֹתַי, נְבָרֵךְ (אֱלֹהֵינוּ) שֶׁאָכַלְנוּ מִשֶּׁלּוֹ. בָּרוּךְ (אֱלֹהֵינוּ) שֶׁאָכַלְנוּ מִשֶּׁלּוֹ וּבְטוּבוֹ חָיִינוּ.","Rabotai nevarech...","Gentlemen, let us bless. May the name of the Lord be blessed from now and forever. With your permission, let us bless the One of whose food we have eaten. Blessed is the One of whose food we have eaten and through whose goodness we live.",{tags:["requires_minyan"]})
],"Zimmun"),
PR("hazan","1 · HaZan","הַזָּן אֶת הַכֹּל",[
  R("The first blessing — thanking God who feeds all."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, הַזָּן אֶת הָעוֹלָם כֻּלּוֹ בְּטוּבוֹ, בְּחֵן בְּחֶסֶד וּבְרַחֲמִים, הוּא נוֹתֵן לֶחֶם לְכָל בָּשָׂר, כִּי לְעוֹלָם חַסְדּוֹ... בָּרוּךְ אַתָּה יְיָ, הַזָּן אֶת הַכֹּל.","Baruch ata Adonai... hazan et ha'olam kulo b'tuvo...","Blessed are You, Lord our God, King of the universe, who nourishes the whole world in His goodness, with grace, kindness and mercy; He gives bread to all flesh, for His kindness is eternal... Blessed are You, Lord, who nourishes all.")
],"Birkat HaMazon"),
PR("haaretz","2 · Birkat HaAretz","בִּרְכַּת הָאָרֶץ",[
  R("Thanks for the land, the covenant, and the Torah."),
  P("נוֹדֶה לְּךָ יְיָ אֱלֹהֵינוּ עַל שֶׁהִנְחַלְתָּ לַאֲבוֹתֵינוּ אֶרֶץ חֶמְדָּה טוֹבָה וּרְחָבָה... וְעַל הַכֹּל יְיָ אֱלֹהֵינוּ אֲנַחְנוּ מוֹדִים לָךְ וּמְבָרְכִים אוֹתָךְ. בָּרוּךְ אַתָּה יְיָ, עַל הָאָרֶץ וְעַל הַמָּזוֹן.","Nodeh lecha Adonai Eloheinu...","We thank You, Lord our God, for having granted our ancestors a desirable, good and spacious land... and for everything, Lord our God, we thank and bless You. Blessed are You, Lord, for the land and for the food.",{vary:"On Chanukah & Purim add עַל הַנִּסִּים"})
],"Birkat HaMazon"),
PR("yerushalayim_bm","3 · Boneh Yerushalayim","בּוֹנֵה יְרוּשָׁלַיִם",[
  R("A prayer for Jerusalem and for our sustenance."),
  P("רַחֵם נָא יְיָ אֱלֹהֵינוּ עַל יִשְׂרָאֵל עַמֶּךָ, וְעַל יְרוּשָׁלַיִם עִירֶךָ, וְעַל צִיּוֹן מִשְׁכַּן כְּבוֹדֶךָ... וּבְנֵה יְרוּשָׁלַיִם עִיר הַקֹּדֶשׁ בִּמְהֵרָה בְיָמֵינוּ. בָּרוּךְ אַתָּה יְיָ, בּוֹנֵה בְרַחֲמָיו יְרוּשָׁלָיִם. אָמֵן.","Rachem na Adonai Eloheinu...","Have mercy, Lord our God, on Israel Your people, on Jerusalem Your city, and on Zion the dwelling of Your glory... and rebuild Jerusalem the holy city soon, in our days. Blessed are You, Lord, who in His mercy rebuilds Jerusalem. Amen.",{vary:"On Shabbat add רְצֵה; on Rosh Chodesh & festivals add יַעֲלֶה וְיָבֹא"})
],"Birkat HaMazon"),
PR("hatov","4 · HaTov V'HaMeitiv","הַטּוֹב וְהַמֵּטִיב",[
  R("The fourth blessing, followed by the Harachaman supplications."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, הָאֵל אָבִינוּ מַלְכֵּנוּ אַדִּירֵנוּ בּוֹרְאֵנוּ גֹּאֲלֵנוּ... הוּא הֵטִיב, הוּא מֵטִיב, הוּא יֵיטִיב לָנוּ.","Baruch ata Adonai... hatov v'hameitiv...","Blessed are You, Lord our God, King of the universe — the God who is our Father, our King, our Mighty One, our Creator, our Redeemer... He has done good, He does good, and He will do good to us."),
  P("הָרַחֲמָן הוּא יִמְלֹךְ עָלֵינוּ לְעוֹלָם וָעֶד. הָרַחֲמָן הוּא יִתְבָּרַךְ בַּשָּׁמַיִם וּבָאָרֶץ... עֹשֶׂה שָׁלוֹם בִּמְרוֹמָיו, הוּא יַעֲשֶׂה שָׁלוֹם עָלֵינוּ וְעַל כָּל יִשְׂרָאֵל, וְאִמְרוּ אָמֵן.","Harachaman hu yimloch aleinu...","May the Merciful One reign over us forever. May the Merciful One be blessed in heaven and on earth... May He who makes peace in His heights make peace upon us and upon all Israel; and say: Amen.",{kavanah:"Conclude in gratitude — sustenance is a daily gift, not a given."})
],"Birkat HaMazon"),
PR("ba_alhamichya","Me'ein Shalosh \u00B7 Al HaMichya","מֵעֵין שָׁלוֹשׁ",[
  R("The after-blessing for the five grains (other than bread), wine, and the seven species."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, עַל הַמִּחְיָה וְעַל הַכַּלְכָּלָה... כִּי אַתָּה יְיָ טוֹב וּמֵטִיב לַכֹּל, וְנוֹדֶה לְּךָ עַל הָאָרֶץ וְעַל הַמִּחְיָה. בָּרוּךְ אַתָּה יְיָ, עַל הָאָרֶץ וְעַל הַמִּחְיָה.","Baruch ata Adonai Eloheinu melech ha'olam, al hamichya ve'al hakalkala...","Blessed are You, Lord our God, King of the universe, for the nourishment and sustenance... for You, Lord, are good and do good to all, and we thank You for the land and for the nourishment. Blessed are You, Lord, for the land and for the nourishment.")
],"Bracha Achrona"),
PR("ba_borei","Borei Nefashot","בּוֹרֵא נְפָשׁוֹת",[
  R("After foods and drinks that do not require the fuller after-blessing."),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא נְפָשׁוֹת רַבּוֹת וְחֶסְרוֹנָן, עַל כָּל מַה שֶּׁבָּרָא לְהַחֲיוֹת בָּהֶם נֶפֶשׁ כָּל חָי. בָּרוּךְ חֵי הָעוֹלָמִים.","Baruch ata Adonai Eloheinu melech ha'olam, borei nefashot rabot vechesronan, al kol ma shebara lehachayot bahem nefesh kol chai. Baruch chei ha'olamim.","Blessed are You, Lord our God, King of the universe, Creator of many living beings and their needs, for all that You created to sustain the life of every being. Blessed is the Life of the worlds.")
],"Bracha Achrona")
);

/* ====== KRIAT SHEMA AL HAMITA ====== */
PRAYERS.krias.push(
PR("hamapil","HaMapil","הַמַּפִּיל",[
  R("Said in bed before sleep — the blessing over sleep.",{tags:["special"]}),
  P("בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, הַמַּפִּיל חֶבְלֵי שֵׁנָה עַל עֵינָי וּתְנוּמָה עַל עַפְעַפָּי... יְהִי רָצוֹן מִלְּפָנֶיךָ יְיָ אֱלֹהַי שֶׁתַּשְׁכִּיבֵנִי לְשָׁלוֹם וְתַעֲמִידֵנִי לְשָׁלוֹם... בָּרוּךְ אַתָּה יְיָ, הַמֵּאִיר לָעוֹלָם כֻּלּוֹ בִּכְבוֹדוֹ.","Baruch ata Adonai... hamapil chevlei shena al einai...","Blessed are You, Lord our God, King of the universe, who casts the bonds of sleep upon my eyes and slumber upon my eyelids... May it be Your will, Lord my God, to lay me down in peace and raise me up in peace... Blessed are You, Lord, who illuminates the whole world with His glory.",{kavanah:"Release the day. Place the soul in His keeping for the night."})
],"At Bedtime"),
PR("shema_mita","Shema","שְׁמַע",[
  R("Recite at least the first paragraph of the Shema; many say all three."),
  P("שְׁמַע יִשְׂרָאֵל, יְיָ אֱלֹהֵינוּ, יְיָ אֶחָד. בָּרוּךְ שֵׁם כְּבוֹד מַלְכוּתוֹ לְעוֹלָם וָעֶד.","Shema Yisrael... Baruch shem...","Hear, O Israel: the Lord is our God, the Lord is One. Blessed is the name of His glorious kingdom forever and ever.",{tags:["special"]}),
  P("וְאָהַבְתָּ אֵת יְיָ אֱלֹהֶיךָ, בְּכָל לְבָבְךָ וּבְכָל נַפְשְׁךָ וּבְכָל מְאֹדֶךָ...","V'ahavta...","You shall love the Lord your God with all your heart, all your soul, and all your might... (First paragraph; continue if desired.)")
],"At Bedtime"),
PR("hashkivenu_mita","Verses of Protection","פְּסוּקֵי שְׁמִירָה",[
  P("בְּיָדְךָ אַפְקִיד רוּחִי, פָּדִיתָה אוֹתִי יְיָ אֵל אֱמֶת. הִנֵּה לֹא יָנוּם וְלֹא יִישָׁן שׁוֹמֵר יִשְׂרָאֵל.","B'yadcha afkid ruchi...","Into Your hand I entrust my spirit; You have redeemed me, Lord, God of truth. Behold, the Guardian of Israel neither slumbers nor sleeps."),
  P("הַמַּלְאָךְ הַגֹּאֵל אוֹתִי מִכָּל רָע יְבָרֵךְ אֶת הַנְּעָרִים, וְיִקָּרֵא בָהֶם שְׁמִי וְשֵׁם אֲבֹתַי אַבְרָהָם וְיִצְחָק, וְיִדְגּוּ לָרֹב בְּקֶרֶב הָאָרֶץ.","Hamalach hagoel oti...","May the angel who redeems me from all evil bless the youths; may my name be called upon them, and the names of my fathers Abraham and Isaac, and may they multiply abundantly in the midst of the earth.",{kavanah:"End the day as it began — in His protection."})
],"At Bedtime")
);

/* ====== TEHILLIM ====== */
/* Embedded psalms (accurate, vocalized). Others fetch live from Sefaria. */
const TEHILLIM_EMBED={
1:["אַשְׁרֵי הָאִישׁ אֲשֶׁר לֹא הָלַךְ בַּעֲצַת רְשָׁעִים, וּבְדֶרֶךְ חַטָּאִים לֹא עָמָד, וּבְמוֹשַׁב לֵצִים לֹא יָשָׁב.","כִּי אִם בְּתוֹרַת יְיָ חֶפְצוֹ, וּבְתוֹרָתוֹ יֶהְגֶּה יוֹמָם וָלָיְלָה.","וְהָיָה כְּעֵץ שָׁתוּל עַל פַּלְגֵי מָיִם, אֲשֶׁר פִּרְיוֹ יִתֵּן בְּעִתּוֹ, וְעָלֵהוּ לֹא יִבּוֹל, וְכֹל אֲשֶׁר יַעֲשֶׂה יַצְלִיחַ.","לֹא כֵן הָרְשָׁעִים, כִּי אִם כַּמֹּץ אֲשֶׁר תִּדְּפֶנּוּ רוּחַ.","עַל כֵּן לֹא יָקֻמוּ רְשָׁעִים בַּמִּשְׁפָּט, וְחַטָּאִים בַּעֲדַת צַדִּיקִים.","כִּי יוֹדֵעַ יְיָ דֶּרֶךְ צַדִּיקִים, וְדֶרֶךְ רְשָׁעִים תֹּאבֵד."],
20:["לַמְנַצֵּחַ מִזְמוֹר לְדָוִד.","יַעַנְךָ יְיָ בְּיוֹם צָרָה, יְשַׂגֶּבְךָ שֵׁם אֱלֹהֵי יַעֲקֹב.","יִשְׁלַח עֶזְרְךָ מִקֹּדֶשׁ, וּמִצִּיּוֹן יִסְעָדֶךָּ.","יִזְכֹּר כָּל מִנְחֹתֶךָ, וְעוֹלָתְךָ יְדַשְּׁנֶה סֶלָה.","יִתֶּן לְךָ כִלְבָבֶךָ, וְכָל עֲצָתְךָ יְמַלֵּא.","נְרַנְּנָה בִּישׁוּעָתֶךָ, וּבְשֵׁם אֱלֹהֵינוּ נִדְגֹּל, יְמַלֵּא יְיָ כָּל מִשְׁאֲלוֹתֶיךָ.","עַתָּה יָדַעְתִּי כִּי הוֹשִׁיעַ יְיָ מְשִׁיחוֹ, יַעֲנֵהוּ מִשְּׁמֵי קָדְשׁוֹ, בִּגְבֻרוֹת יֵשַׁע יְמִינוֹ.","אֵלֶּה בָרֶכֶב וְאֵלֶּה בַסּוּסִים, וַאֲנַחְנוּ בְּשֵׁם יְיָ אֱלֹהֵינוּ נַזְכִּיר.","הֵמָּה כָּרְעוּ וְנָפָלוּ, וַאֲנַחְנוּ קַּמְנוּ וַנִּתְעוֹדָד.","יְיָ הוֹשִׁיעָה, הַמֶּלֶךְ יַעֲנֵנוּ בְיוֹם קָרְאֵנוּ."],
23:["מִזְמוֹר לְדָוִד, יְיָ רֹעִי לֹא אֶחְסָר.","בִּנְאוֹת דֶּשֶׁא יַרְבִּיצֵנִי, עַל מֵי מְנֻחוֹת יְנַהֲלֵנִי.","נַפְשִׁי יְשׁוֹבֵב, יַנְחֵנִי בְמַעְגְּלֵי צֶדֶק לְמַעַן שְׁמוֹ.","גַּם כִּי אֵלֵךְ בְּגֵיא צַלְמָוֶת לֹא אִירָא רָע כִּי אַתָּה עִמָּדִי, שִׁבְטְךָ וּמִשְׁעַנְתֶּךָ הֵמָּה יְנַחֲמֻנִי.","תַּעֲרֹךְ לְפָנַי שֻׁלְחָן נֶגֶד צֹרְרָי, דִּשַּׁנְתָּ בַשֶּׁמֶן רֹאשִׁי, כּוֹסִי רְוָיָה.","אַךְ טוֹב וָחֶסֶד יִרְדְּפוּנִי כָּל יְמֵי חַיָּי, וְשַׁבְתִּי בְּבֵית יְיָ לְאֹרֶךְ יָמִים."],
100:["מִזְמוֹר לְתוֹדָה, הָרִיעוּ לַיְיָ כָּל הָאָרֶץ.","עִבְדוּ אֶת יְיָ בְּשִׂמְחָה, בֹּאוּ לְפָנָיו בִּרְנָנָה.","דְּעוּ כִּי יְיָ הוּא אֱלֹהִים, הוּא עָשָׂנוּ וְלוֹ אֲנַחְנוּ, עַמּוֹ וְצֹאן מַרְעִיתוֹ.","בֹּאוּ שְׁעָרָיו בְּתוֹדָה, חֲצֵרֹתָיו בִּתְהִלָּה, הוֹדוּ לוֹ בָּרְכוּ שְׁמוֹ.","כִּי טוֹב יְיָ, לְעוֹלָם חַסְדּוֹ, וְעַד דֹּר וָדֹר אֱמוּנָתוֹ."],
121:["שִׁיר לַמַּעֲלוֹת, אֶשָּׂא עֵינַי אֶל הֶהָרִים, מֵאַיִן יָבֹא עֶזְרִי.","עֶזְרִי מֵעִם יְיָ, עֹשֵׂה שָׁמַיִם וָאָרֶץ.","אַל יִתֵּן לַמּוֹט רַגְלֶךָ, אַל יָנוּם שֹׁמְרֶךָ.","הִנֵּה לֹא יָנוּם וְלֹא יִישָׁן, שׁוֹמֵר יִשְׂרָאֵל.","יְיָ שֹׁמְרֶךָ, יְיָ צִלְּךָ עַל יַד יְמִינֶךָ.","יוֹמָם הַשֶּׁמֶשׁ לֹא יַכֶּכָּה, וְיָרֵחַ בַּלָּיְלָה.","יְיָ יִשְׁמָרְךָ מִכָּל רָע, יִשְׁמֹר אֶת נַפְשֶׁךָ.","יְיָ יִשְׁמָר צֵאתְךָ וּבוֹאֶךָ, מֵעַתָּה וְעַד עוֹלָם."],
128:["שִׁיר הַמַּעֲלוֹת, אַשְׁרֵי כָּל יְרֵא יְיָ, הַהֹלֵךְ בִּדְרָכָיו.","יְגִיעַ כַּפֶּיךָ כִּי תֹאכֵל, אַשְׁרֶיךָ וְטוֹב לָךְ.","אֶשְׁתְּךָ כְּגֶפֶן פֹּרִיָּה בְּיַרְכְּתֵי בֵיתֶךָ, בָּנֶיךָ כִּשְׁתִלֵי זֵיתִים סָבִיב לְשֻׁלְחָנֶךָ.","הִנֵּה כִי כֵן יְבֹרַךְ גָּבֶר יְרֵא יְיָ.","יְבָרֶכְךָ יְיָ מִצִּיּוֹן, וּרְאֵה בְּטוּב יְרוּשָׁלָיִם, כֹּל יְמֵי חַיֶּיךָ.","וּרְאֵה בָנִים לְבָנֶיךָ, שָׁלוֹם עַל יִשְׂרָאֵל."],
130:["שִׁיר הַמַּעֲלוֹת, מִמַּעֲמַקִּים קְרָאתִיךָ יְיָ.","אֲדֹנָי שִׁמְעָה בְקוֹלִי, תִּהְיֶינָה אָזְנֶיךָ קַשֻּׁבוֹת לְקוֹל תַּחֲנוּנָי.","אִם עֲוֹנוֹת תִּשְׁמָר יָהּ, אֲדֹנָי מִי יַעֲמֹד.","כִּי עִמְּךָ הַסְּלִיחָה, לְמַעַן תִּוָּרֵא.","קִוִּיתִי יְיָ קִוְּתָה נַפְשִׁי, וְלִדְבָרוֹ הוֹחָלְתִּי.","נַפְשִׁי לַאדֹנָי, מִשֹּׁמְרִים לַבֹּקֶר, שֹׁמְרִים לַבֹּקֶר.","יַחֵל יִשְׂרָאֵל אֶל יְיָ, כִּי עִם יְיָ הַחֶסֶד, וְהַרְבֵּה עִמּוֹ פְדוּת.","וְהוּא יִפְדֶּה אֶת יִשְׂרָאֵל, מִכֹּל עֲוֹנוֹתָיו."],
150:["הַלְלוּיָהּ, הַלְלוּ אֵל בְּקָדְשׁוֹ, הַלְלוּהוּ בִּרְקִיעַ עֻזּוֹ.","הַלְלוּהוּ בִגְבוּרֹתָיו, הַלְלוּהוּ כְּרֹב גֻּדְלוֹ.","הַלְלוּהוּ בְּתֵקַע שׁוֹפָר, הַלְלוּהוּ בְּנֵבֶל וְכִנּוֹר.","הַלְלוּהוּ בְּתֹף וּמָחוֹל, הַלְלוּהוּ בְּמִנִּים וְעֻגָב.","הַלְלוּהוּ בְצִלְצְלֵי שָׁמַע, הַלְלוּהוּ בְּצִלְצְלֵי תְרוּעָה.","כֹּל הַנְּשָׁמָה תְּהַלֵּל יָהּ, הַלְלוּיָהּ."]
};

/* Occasion lists */
const TEHILLIM_OCC=[
  {label:"Tikkun HaKlali",he:"תִּקּוּן הַכְּלָלִי",sub:"Rebbe Nachman",ch:[16,32,41,42,59,77,90,105,137,150]},
  {label:"For a Sick Person",he:"לְרְפוּאָה",ch:[20,6,9,13,22,30,86,88,91,102,103,142]},
  {label:"For Livelihood",he:"לְפַרְנָסָה",ch:[23,24,34,67,90,121,128,144]},
  {label:"For Protection",he:"לִשְׁמִירָה",ch:[20,91,121,3,4,17]},
  {label:"For a Safe Journey",he:"לְדֶרֶךְ",ch:[121,91,16]},
  {label:"For Peace",he:"לְשָׁלוֹם",ch:[46,120,122,125,133]},
  {label:"Thanksgiving",he:"לְהוֹדָאָה",ch:[100,103,107,116,136,150]},
  {label:"Day of a Yahrzeit",he:"לְיוֹם הַזִּכָּרוֹן",ch:[33,16,17,72,91,104,130]}
];

/* Three division systems */
const TEHILLIM_BOOKS=[
  {label:"Book I",he:"סֵפֶר א'",from:1,to:41},
  {label:"Book II",he:"סֵפֶר ב'",from:42,to:72},
  {label:"Book III",he:"סֵפֶר ג'",from:73,to:89},
  {label:"Book IV",he:"סֵפֶר ד'",from:90,to:106},
  {label:"Book V",he:"סֵפֶר ה'",from:107,to:150}
];
/* Weekly: index 0 = Sunday … 6 = Shabbat */
const TEHILLIM_WEEK=[
  {label:"Sunday",he:"יוֹם רִאשׁוֹן",from:1,to:29},
  {label:"Monday",he:"יוֹם שֵׁנִי",from:30,to:50},
  {label:"Tuesday",he:"יוֹם שְׁלִישִׁי",from:51,to:72},
  {label:"Wednesday",he:"יוֹם רְבִיעִי",from:73,to:89},
  {label:"Thursday",he:"יוֹם חֲמִישִׁי",from:90,to:106},
  {label:"Friday",he:"יוֹם שִׁשִּׁי",from:107,to:119},
  {label:"Shabbat",he:"יוֹם הַשַּׁבָּת",from:120,to:150}
];
/* Monthly: by Hebrew day of month 1..30 (day 30 falls back into day 29 in a 29-day month) */
const TEHILLIM_MONTH=[
  [1,9],[10,17],[18,22],[23,28],[29,34],[35,38],[39,43],[44,48],[49,54],[55,59],
  [60,65],[66,68],[69,71],[72,76],[77,78],[79,82],[83,87],[88,89],[90,96],[97,103],
  [104,105],[106,107],[108,112],[113,118],[119,119],[120,134],[135,139],[140,144],[145,150]
];
function rangeArr(a,b){const r=[];for(let i=a;i<=b;i++)r.push(i);return r;}
function monthChaptersForDay(dayNum,monthLen){
  let idx=dayNum-1;
  if(idx>=TEHILLIM_MONTH.length)idx=TEHILLIM_MONTH.length-1;
  // In a 29-day month, fold day 30's portion into day 29
  if(monthLen===29&&dayNum>=29){return rangeArr(TEHILLIM_MONTH[28][0],150);}
  const seg=TEHILLIM_MONTH[idx];return rangeArr(seg[0],seg[1]);
}

/* ====== STATE ====== */
const DEFAULTS={
  onboarded:false,userHebName:"",userEngName:"",birthday:null,
  loc:{name:"Denver, CO",lat:39.7392,lng:-104.9903,tz:"America/Denver"},
  israelMode:"diaspora",nusach:"ashkenaz",
  theme:"warm",textSize:1.0,hebScale:1.0,enScale:1.0,suppScale:1.0,readMode:"scroll",
  timeFmt:"12",             // "12" = 12-hour US (9:05 AM), "24" = 24-hour military (21:05)
  translit:true,showInstr:true,showKavanot:true,hebrewOnly:false,minyan:false,
  kavLevels:{found:true,halachic:false,kabbalistic:false},
  view:"home",viewArg:null,
  favorites:[],recent:[],
  tehillimSeq:null,tehDivMode:"weekly",tehBookOpen:null,tehSub:null,
  order:{},hidden:{},
  prayerEdits:{},customPrayers:{},editMode:false,
  prayForNames:[],personalVerse:null,
  resumeSvc:null,resumeScroll:{},lastSeen:{},
  haptics:true,dailyThought:false,travelSense:false,
  notifyPrayers:false,notifyMinutes:15,notifyWhich:{shacharit:true,mincha:true,maariv:true},
  insertRules:[],insertRulesDeleted:[],
  hideTachanun:false,womanMode:false,
  gender:"",                // "male" | "female" | "" (unset → gendered blocks all show)
  audiences:{},             // which custom audiences this user belongs to: {kohen:true,...}
  audienceDefs:[],          // global audience definitions [{key,label}] (admin-managed, synced)
  coverSeen:0,
  showCover:true,           // user toggle: animated opening cover on launch
  branding:null,            // admin-set splash overrides {title1,title2,subtitle,bgImage,accent}
  adminToken:""             // admin's saved token for server-side saves (this device only)
};
let state={};
function loadState(){try{const s=localStorage.getItem("super_siddur_v23");state=s?Object.assign({},DEFAULTS,JSON.parse(s)):Object.assign({},DEFAULTS);}catch(e){state=Object.assign({},DEFAULTS);}if(!state.order)state.order={};if(!state.hidden)state.hidden={};if(!state.prayerEdits)state.prayerEdits={};if(!state.customPrayers)state.customPrayers={};}
function saveState(){try{localStorage.setItem("super_siddur_v23",JSON.stringify(state));}catch(e){}}
loadState();

/* ====== HELPERS ====== */
function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!==undefined)e.innerHTML=html;return e;}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function $(sel){return document.querySelector(sel);}
function toast(msg){const t=el("div","toast",esc(msg));document.body.appendChild(t);setTimeout(()=>t.remove(),2200);}
const THEMES=[["warm","Warm","#0a0907","#d4a854"],["midnight","Midnight","#070a14","#7ba8c4"],["sage","Sage","#0d1411","#9fa97a"],["wine","Wine","#13070a","#b85870"],["mono","Mono","#0a0a0a","#e0e0e0"],["parchment","Parchment","#f4ede0","#7a4818"],["daylight","Daylight","#fafaf7","#7a4818"]];
function applyTheme(){const cls="t-"+(state.theme||"warm");document.body.className=cls;document.documentElement.className=cls;document.documentElement.style.setProperty("--scale",state.textSize);document.documentElement.style.setProperty("--hscale",state.hebScale||1);document.documentElement.style.setProperty("--escale",state.enScale||1);document.documentElement.style.setProperty("--sscale",state.suppScale||1);}
function favKey(s,p){return s+"."+p;}
function isFav(s,p){return state.favorites.includes(favKey(s,p));}
function toggleFav(s,p){const k=favKey(s,p);const i=state.favorites.indexOf(k);if(i>=0)state.favorites.splice(i,1);else state.favorites.push(k);saveState();}
function trackRecent(s,p){const k=favKey(s,p);state.recent=state.recent.filter(x=>x!==k);state.recent.unshift(k);if(state.recent.length>8)state.recent=state.recent.slice(0,8);saveState();}
/* Admin-uploaded icon overrides, key -> /api/icons/<key>/raw (populated on load). */
window.ICON_OVERRIDES=window.ICON_OVERRIDES||{};
function iconOverrideUrl(key){return window.ICON_OVERRIDES[key]||null;}
function postureIcon(tag){
  const o=iconOverrideUrl(tag);
  if(o)return `<img class="icon" src="${o}" alt="${esc(tag)}" style="width:1.1em;height:1.1em;object-fit:contain;vertical-align:middle">`;
  if(tag==="stand")return '<svg class="icon" viewBox="0 0 24 24" style="width:1.1em;height:1.1em"><path d="M12 4v16M6 10l6-6 6 6"/></svg>';
  if(tag==="sit")return '<svg class="icon" viewBox="0 0 24 24" style="width:1.1em;height:1.1em"><path d="M12 20V4M6 14l6 6 6-6"/></svg>';
  if(tag==="bow")return '<svg class="icon" viewBox="0 0 24 24" style="width:1.1em;height:1.1em"><circle cx="12" cy="5" r="2.2"/><path d="M12 8c0 3-1 4-4 5l1 6M12 8c1 2.5 3 3.5 5 4"/></svg>';
  return "";
}
function postureFromText(t){if(/\bstand(ing)?\b|recited standing|while standing|rise\b/i.test(t))return{tag:"stand",label:"Stand"};if(/\bsit(ting)?\b|recited sit|sit down|be seated|in bed/i.test(t))return{tag:"sit",label:"Sit"};if(/\bbow(ing)?\b|prostrat/i.test(t))return{tag:"bow",label:"Bow"};return null;}
function pickHe(b){if(b.alt&&b.alt[state.nusach])return b.alt[state.nusach];return b.he;}
/* ---- visibility conditions ----
   A reusable condition gates content blocks AND per-block icons:
     {gender:"male"|"female", region:"israel"|"diaspora", minyan:true|false, audiences:[key,...]}
   Any unset facet is unconstrained. Gender only hides when the user has actually
   chosen a different gender (unset shows both, so a man's & woman's blessing both
   appear until gender is set). Custom audiences require membership in ALL listed. */
function audienceActive(key){return !!(state.audiences&&state.audiences[key]);}
function condMatches(c){
  if(!c)return true;
  /* effective gender: explicit profile gender, or the "Women's siddur" display toggle */
  const eg=state.gender||(state.womanMode?"female":"");
  if(c.gender&&eg&&c.gender!==eg)return false;
  const inIsrael=(state.israelMode==="israel"||state.israelMode==="yerushalayim");
  if(c.region==="israel"&&!inIsrael)return false;
  if(c.region==="diaspora"&&inIsrael)return false;
  if(c.minyan===true&&!state.minyan)return false;
  if(c.minyan===false&&state.minyan)return false;
  if(c.audiences&&c.audiences.length){for(let i=0;i<c.audiences.length;i++){if(!audienceActive(c.audiences[i]))return false;}}
  return true;
}
function blockVisible(b){const tags=b.tags||[];if(tags.includes("requires_minyan")&&!state.minyan)return false;if(b.only&&!b.only.includes(state.nusach))return false;if(b.skip&&b.skip.includes(state.nusach))return false;
  /* Legacy region (b.region or a *_only tag) — e.g. Ashkenaz Maariv "Baruch Hashem
     L'Olam" said only outside Eretz Yisrael. Newer blocks use b.cond instead. */
  const inIsrael=(state.israelMode==="israel"||state.israelMode==="yerushalayim");
  const region=b.region||(tags.includes("diaspora_only")?"diaspora":tags.includes("israel_only")?"israel":null);
  if(region==="diaspora"&&inIsrael)return false;
  if(region==="israel"&&!inIsrael)return false;
  if(!condMatches(b.cond))return false;
  return true;}
function prayerKey(svcId,prId){return svcId+"."+prId;}
function importedFor(svcId){return ((window.IMPORTED&&window.IMPORTED[svcId])||[]).filter(p=>!p.only||p.only.includes(state.nusach));}

