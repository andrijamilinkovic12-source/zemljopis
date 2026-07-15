// bazapodataka.js - Služi isključivo za proveru tačnosti pojmova

// Službeni popis Ministarstva pravosuđa, uprave i digitalne transformacije RH:
// 127 gradova i Grad Zagreb, koji ima poseban status grada i županije.
const GradoviHrvatske = [
    "DUGO SELO", "IVANIĆ-GRAD", "JASTREBARSKO", "SAMOBOR", "SVETA NEDELJA", "SVETI IVAN ZELINA", "VELIKA GORICA", "VRBOVEC", "ZAPREŠIĆ",
    "DONJA STUBICA", "KLANJEC", "KRAPINA", "OROSLAVJE", "PREGRADA", "ZABOK", "ZLATAR",
    "GLINA", "HRVATSKA KOSTAJNICA", "KUTINA", "NOVSKA", "PETRINJA", "POPOVAČA", "SISAK",
    "DUGA RESA", "KARLOVAC", "OGULIN", "OZALJ", "SLUNJ",
    "GOSPIĆ", "NOVALJA", "OTOČAC", "SENJ",
    "IVANEC", "LEPOGLAVA", "LUDBREG", "NOVI MAROF", "VARAŽDIN", "VARAŽDINSKE TOPLICE",
    "ĐURĐEVAC", "KOPRIVNICA", "KRIŽEVCI",
    "BJELOVAR", "ČAZMA", "DARUVAR", "GAREŠNICA", "GRUBIŠNO POLJE",
    "BAKAR", "CRES", "CRIKVENICA", "ČABAR", "DELNICE", "KASTAV", "KRALJEVICA", "KRK", "MALI LOŠINJ", "NOVI VINODOLSKI", "OPATIJA", "RAB", "RIJEKA", "VRBOVSKO",
    "ORAHOVICA", "SLATINA", "VIROVITICA",
    "KUTJEVO", "LIPIK", "PAKRAC", "PLETERNICA", "POŽEGA",
    "NOVA GRADIŠKA", "SLAVONSKI BROD",
    "BENKOVAC", "BIOGRAD NA MORU", "NIN", "OBROVAC", "PAG", "ZADAR",
    "BELI MANASTIR", "BELIŠĆE", "DONJI MIHOLJAC", "ĐAKOVO", "NAŠICE", "OSIJEK", "VALPOVO",
    "DUBROVNIK", "KORČULA", "METKOVIĆ", "OPUZEN", "PLOČE",
    "DRNIŠ", "KNIN", "SKRADIN", "ŠIBENIK", "VODICE",
    "ILOK", "OTOK", "VINKOVCI", "VUKOVAR", "ŽUPANJA",
    "HVAR", "IMOTSKI", "KAŠTELA", "KOMIŽA", "MAKARSKA", "OMIŠ", "SINJ", "SOLIN", "SPLIT", "STARI GRAD", "SUPETAR", "TRILJ", "TROGIR", "VIS", "VRGORAC", "VRLIKA",
    "BUJE-BUIE", "BUZET", "LABIN", "NOVIGRAD-CITTANOVA", "PAZIN", "POREČ-PARENZO", "PULA-POLA", "ROVINJ-ROVIGNO", "UMAG-UMAGO", "VODNJAN-DIGNANO",
    "ČAKOVEC", "MURSKO SREDIŠĆE", "PRELOG", "ZAGREB"
];

// Severna Makedonija nema zaseban pravni status grada osim Grada Skoplja.
// Zato su ovde samo urbana opštinska sedišta sa najmanje 5.000 stanovnika (Popis 2021),
// bez gradskih opština Skoplja, ruralnih opština i naziva planskih regiona.
const GradoviSeverneMakedonije = [
    "SKOPLJE", "KUMANOVO", "BITOLJ", "PRILEP", "TETOVO", "ŠTIP", "VELES", "OHRID", "STRUMICA",
    "GOSTIVAR", "KAVADARCI", "KOČANI", "KIČEVO", "GEVGELIJA", "STRUGA", "RADOVIŠ", "KRIVA PALANKA",
    "NEGOTINO", "DEBAR", "SVETI NIKOLE", "PROBIŠTIP", "DELČEVO", "VINICA", "RESEN", "BEROVO", "KRATOVO", "BOGDANCI"
];

// Crna Gora nema pravni status „Grad“: lokalne jedinice su opštine, Glavni grad i Prijestonica.
// Zato su ovde samo veća stvarna urbana sedišta (najmanje 5.000 stanovnika u gradskoj celini,
// Popis 2023), uključujući Podgoricu i Cetinje. Naselja koja čine iste gradske celine nisu posebni unosi.
const GradoviCrneGore = [
    "PODGORICA", "NIKŠIĆ", "PLJEVLJA", "BAR", "CETINJE", "ULCINJ", "TIVAT", "BERANE",
    "BIJELO POLJE", "BUDVA", "HERCEG NOVI", "ROŽAJE", "KOTOR"
];

// Opštinski nazivi bez dovoljnog urbanog središta, gradski delovi i geografske celine
// ne smeju proći kao grad ni preko tolerantne pretrage.
const NaziviKojiNisuGradoviUCrnojGori = new Set([
    "ANDRIJEVICA", "DANILOVGRAD", "GUSINJE", "KOLAŠIN", "MOJKOVAC", "PETNJICA", "PLAV", "PLUŽINE",
    "ŠAVNIK", "TUZI", "ZETA", "ŽABLJAK", "GOLUBOVCI", "KLIČEVO", "DOBROTA", "IGALO", "SPUŽ",
    "GLAVNI GRAD", "PRIJESTONICA", "BOKA KOTORSKA", "CRNOGORSKO PRIMORJE"
]);

// Slovenija ima 69 naselja sa zakonskim statusom mesta. Nazivi su dati na srpskom;
// slovenački oblik Koper se standardizuje na srpski oblik Kopar.
const GradoviSlovenije = [
    "AJDOVŠČINA", "BLED", "BOVEC", "BREŽICE", "CELJE", "ČRNOMELJ", "DOMŽALE", "GORNJA RADGONA",
    "HRASTNIK", "IDRIJA", "ILIRSKA BISTRICA", "IZOLA", "JESENICE", "KAMNIK", "KOČEVJE", "KOPAR",
    "KOSTANJEVICA NA KRKI", "KRANJ", "KRŠKO", "LAŠKO", "LENDAVA", "LITIJA", "LJUBLJANA", "LJUTOMER",
    "MARIBOR", "METLIKA", "MURSKA SOBOTA", "NOVA GORICA", "NOVO MESTO", "ORMOŽ", "PIRAN", "POSTOJNA",
    "PTUJ", "RADEČE", "RADOVLJICA", "RAVNE NA KOROŠKEM", "SEVNICA", "SEŽANA", "SLOVENSKA BISTRICA",
    "SLOVENJ GRADEC", "SLOVENSKE KONJICE", "ŠKOFJA LOKA", "ŠOŠTANJ", "TOLMIN", "TRBOVLJE", "TRŽIČ",
    "VELENJE", "VIŠNJA GORA", "VRHNIKA", "ZAGORJE OB SAVI", "ŽALEC", "CERKNICA", "DRAVOGRAD", "GROSUPLJE",
    "LOGATEC", "MEDVODE", "MENGEŠ", "MEŽICA", "PREVALJE", "RIBNICA", "ROGAŠKA SLATINA", "RUŠE",
    "ŠEMPETER PRI GORICI", "ŠENTJUR", "TREBNJE", "ŽELEZNIKI", "ŽIRI", "LENART V SLOVENSKIH GORICAH", "ZREČE"
];

// Izabrani nazivi opština i regija bez statusa mesta, uključujući Ankaran koji bi inače
// mogao da prođe kao slovna greška za Ankaru.
const NaziviKojiNisuGradoviUSloveniji = new Set([
    "ANKARAN", "BOHINJ", "DOBRNA", "DOLENJSKE TOPLICE", "GORNJA VAS-POLJANE", "HODOŠ", "HORJUL",
    "JEZERSKO", "KOMEN", "KUZMA", "LOŠKI POTOK", "LUKOVICA", "MAJŠPERK", "MIREN-KOSTANJEVICA",
    "MORAVSKE TOPLICE", "OSILNICA", "PODČETRTEK", "POLZELA", "RAČE-FRAM", "RADENCI", "RAZKRIŽJE",
    "SREDIŠČE OB DRAVI", "ŠALOVCI", "ŠENČUR", "VERŽEJ", "ZAVRČ", "ŽETALE", "GORENJSKA",
    "DOLENJSKA", "KOROŠKA", "PRIMORSKA", "ŠTAJERSKA", "POMURJE"
]);

// BiH nema jedinstven propis za lokalnu samoupravu: status grada određuju entiteti.
// Ovde su samo zakonske jedinice lokalne samouprave sa statusom Grada, bez opština,
// gradskih opština, kantona, regiona i Brčko distrikta.
const GradoviFederacijeBiH = [
    "BIHAĆ", "BOSANSKA KRUPA", "ČAPLJINA", "CAZIN", "GORAŽDE", "GRAČANICA", "GRADAČAC", "KONJIC",
    "LIVNO", "LJUBUŠKI", "LUKAVAC", "MOSTAR", "NOVI TRAVNIK", "ORAŠJE", "SARAJEVO", "SREBRENIK",
    "STOLAC", "ŠIROKI BRIJEG", "TUZLA", "VISOKO", "ZAVIDOVIĆI", "ZENICA", "ŽIVINICE"
];

const GradoviRepublikeSrpske = [
    "BANJA LUKA", "BIJELJINA", "ISTOČNO SARAJEVO", "LAKTAŠI", "DOBOJ", "DERVENTA", "PRIJEDOR",
    "PRNJAVOR", "TREBINJE", "ZVORNIK", "GRADIŠKA", "TESLIĆ"
];

const GradoviBosneIHercegovine = [
    ...GradoviFederacijeBiH,
    ...GradoviRepublikeSrpske
];

// Čuva da tolerantna pretraga ne prihvati opštinu ili administrativnu oblast BiH
// kao sličan naziv nekog grada iz druge države (npr. Kakanj -> Kazanj).
const NaziviKojiNisuGradoviUBiH = new Set([
    // 57 opština Federacije BiH
    "BANOVIĆI", "BOSANSKI PETROVAC", "BOSANSKO GRAHOVO", "BREZA", "BUGOJNO", "BUSOVAČA", "BUŽIM",
    "CENTAR SARAJEVO", "ČELIĆ", "ČITLUK", "DOBOJ ISTOK", "DOBOJ JUG", "DOBRETIĆI", "DOMALJEVAC-ŠAMAC",
    "DONJI VAKUF", "DRVAR", "FOČA U FBIH", "FOJNICA", "GORNJI VAKUF-USKOPLJE", "GLAMOČ", "GRUDE",
    "HADŽIĆI", "ILIDŽA", "ILIJAŠ", "JABLANICA", "JAJCE", "KAKANJ", "KALESIJA", "KISELJAK", "KLADANJ",
    "KLJUČ", "KREŠEVO", "KUPRES", "MAGLAJ", "NEUM", "NOVI GRAD SARAJEVO", "NOVO SARAJEVO", "ODŽAK",
    "OLOVO", "PALE FBIH", "POSUŠJE", "PROZOR-RAMA", "RAVNO", "SANSKI MOST", "SAPNA", "STARI GRAD SARAJEVO",
    "TEOČAK", "TEŠANJ", "TOMISLAVGRAD", "TRAVNIK", "TRNOVO", "USORA", "VAREŠ", "VELIKA KLADUŠA", "VITEZ",
    "VOGOŠĆA", "ŽEPČE",

    // 52 opštine Republike Srpske nakon što je Teslić dobio status Grada
    "BERKOVIĆI", "BILEĆA", "BRATUNAC", "BROD", "VIŠEGRAD", "VLASENICA", "VUKOSAVLJE", "GACKO",
    "DONJI ŽABAR", "ISTOČNA ILIDŽA", "ISTOČNI DRVAR", "ISTOČNI MOSTAR", "ISTOČNI STARI GRAD",
    "ISTOČNO NOVO SARAJEVO", "JEZERO", "KALINOVIK", "KNEŽEVO", "KOZARSKA DUBICA", "KOSTAJNICA",
    "KOTOR VAROŠ", "KRUPA NA UNI", "KUPRES", "LOPARE", "LJUBINJE", "MILIĆI", "MODRIČA", "MRKONJIĆ GRAD",
    "NEVESINJE", "NOVI GRAD", "NOVO GORAŽDE", "OSMACI", "OŠTRA LUKA", "PALE", "PELAGIĆEVO", "PETROVAC",
    "PETROVO", "RIBNIK", "ROGATICA", "RUDO", "SOKOLAC", "SRBAC", "SREBRENICA", "STANARI", "ŠAMAC",
    "ŠEKOVIĆI", "ŠIPOVO", "TRNOVO", "UGLJEVIK", "FOČA", "HAN PIJESAK", "ČAJNIČE", "ČELINAC",

    // Brčko i entitetsko/kantonalno uređenje nisu jedinice sa statusom Grada.
    "BRČKO", "BRČKO DISTRIKT", "BRČKO DISTRIKT BIH", "FEDERACIJA BIH", "FEDERACIJA BOSNE I HERCEGOVINE",
    "REPUBLIKA SRPSKA", "UNSKO-SANSKI KANTON", "POSAVSKI KANTON", "TUZLANSKI KANTON",
    "ZENIČKO-DOBOJSKI KANTON", "BOSANSKO-PODRINJSKI KANTON GORAŽDE", "SREDNJOBOSANSKI KANTON",
    "HERCEGOVAČKO-NERETVANSKI KANTON", "ZAPADNOHERCEGOVAČKI KANTON", "KANTON SARAJEVO", "KANTON 10"
]);

const BazaPodataka = {
    reci: {
        drzava: [
            "ALBANIJA", "ALŽIR", "ANDORA", "ANGOLA", "ANTIGVA I BARBUDA", "ARGENTINA", 
            "AUSTRALIJA", "AUSTRIJA", "AVGANISTAN", "AZERBEJDŽAN", "BAHAME", "BAHAMI", 
            "BAHREIN", "BANGLADEŠ", "BARBADOS", "BELGIJA", "BELIZE", "BELORUSIJA", 
            "BENIN", "BIH", "BOCVANA", "BOLIVIJA", "BOSNA I HERCEGOVINA", "BRAZIL", 
            "BRUNEJ", "BUGARSKA", "BURKINA FASO", "BURMA", "BURUNDI", "BUTAN", 
            "CENTRALNOAFRIČKA REPUBLIKA", "CRNA GORA", "ČAD", "ČEŠKA", "ČILE", 
            "DANSKA", "DEMOKRATSKA REPUBLIKA KONGO", "DOMINIKA", "DOMINIKANA", 
            "DOMINIKANSKA REPUBLIKA", "DŽIBUTI", "EGIPAT", "EKVADOR", "EKVATORIJALNA GVINEJA", 
            "ENGLESKA", "ERITREJA", "ESTONIJA", "ESVATINI", "ETIOPIJA", "FIDŽI", 
            "FILIPINI", "FINSKA", "FRANCUSKA", "GABON", "GAMBIJA", "GANA", "GRENADA", 
            "GRUZIJA", "GRČKA", "GVAJANA", "GVATEMALA", "GVINEJA", "GVINEJA BISAO", 
            "HAITI", "HOLANDIJA", "HONDURAS", "HRVATSKA", "INDIJA", "INDONEZIJA", 
            "IRAK", "IRAN", "IRSKA", "ISLAND", "ISTOČNI TIMOR", "ITALIJA", "IZRAEL", 
            "JAMAJKA", "JAPAN", "JEMEN", "JERMENIJA", "JORDAN", "JUŽNA KOREJA", 
            "JUŽNI SUDAN", "JUŽNOAFRIČKA REPUBLIKA", "KAMBODŽA", "KAMERUN", "KANADA", 
            "KATAR", "KAZAHSTAN", "KENIJA", "KINA", "KIPAR", "KIRGISTAN", "KIRGIZIJA", 
            "KIRIBATI", "KOLUMBIJA", "KOMORI", "KONGO", "KOSTARIKA", "KUBA", "KUVAJT",
            "LAOS", "LESOTO", "LETONIJA", "LIBAN", "LIBERIJA", "LIBIJA", "LIHTENŠTAJN", 
            "LITVANIJA", "LUKSEMBURG", "MADAGASKAR", "MAĐARSKA", "MAKEDONIJA", 
            "MALAVI", "MALDIVI", "MALEZIJA", "MALI", "MALTA", "MAROKO", "MARŠALSKA OSTRVA", 
            "MAURICIJUS", "MAURITANIJA", "MEKSIKO", "MIJANMAR", "MIKRONEZIJA", "MJANMAR", 
            "MOLDAVIJA", "MONAKO", "MONGOLIJA", "MOZAMBIK", "NAMIBIJA", "NAURU", 
            "NEMAČKA", "NEPAL", "NIGER", "NIGERIJA", "NIKARAGVA", "NORVEŠKA", 
            "NOVI ZELAND", "OBALA SLONOVAČE", "OMAN", "PAKISTAN", "PALAU", "PANAMA", 
            "PAPUA NOVA GVINEJA", "PARAGVAJ", "PERU", "POLJSKA", "PORTUGAL", 
            "PORTUGALIJA", "REPUBLIKA KONGO", "RUANDA", "RUMUNIJA", "RUSIJA", "SAD", 
            "SALVADOR", "SAMOA", "SAN MARINO", "SAO TOME I PRINCIPE", "SAO TOME I PRINSIPE", 
            "SAUDIJSKA ARABIJA", "SEJŠELI", "SENEGAL", "SENT KITS I NEVIS", "SEVERNA IRSKA", 
            "SEVERNA KOREJA", "SEVERNA MAKEDONIJA", "SIJERA LEONE", "SINGAPUR", "SIRIJA", 
            "SJEDINJENE AMERIČKE DRŽAVE", "SLOVAČKA", "SLOVENIJA", "SOLOMONSKA OSTRVA", 
            "SOMALIJA", "SRBIJA", "SUDAN", "SURINAM", "SVETA LUCIJA", "SVETI VINSENT I GRENADINI", 
            "ŠKOTSKA", "ŠPANIJA", "ŠRI LANKA", "ŠVAJCARSKA", "ŠVEDSKA", "TADŽIKISTAN", 
            "TAJLAND", "TANZANIJA", "TOGO", "TONGA", "TRINIDAD I TOBAGO", "TUNIS", 
            "TURKMENISTAN", "TURKMENIJA", "TURSKA", "TUVALU", "UAE", "UGANDA", 
            "UJEDINJENI ARAPSKI EMIRATI", "UJEDINJENO KRALJEVSTVO", "UKRAJINA", 
            "URUGVAJ", "UZBEKISTAN", "VANUATU", "VATIKAN", "VELIKA BRITANIJA", "VELS", "VENECUELA", 
            "VIJETNAM", "ZAMBIJA", "ZELENORTSKA OSTRVA", "ZIMBABVE"
        ],
        grad: [
            "ABIDŽAN", "ABU DABI", "ABUDŽA", "ADELEJD", "ADIS ABEBA", "AKRA", "ALEKSANDRIJA", 
            "ALMATI", "ALŽIR", "AMAN", "AMSTERDAM", "ANDORA LA VELJA", "ANKARA", "ANTANANARIVO", 
            "ANTALIJA", "ANTVERPEN", "APIJA", "ARHUS", "ASMARA", "ASTANA", "ASUNSION",
            "ATINA", "ATLANTA", "AŠHABAD", "BAGDAD", "BAKU", "BALTIMOR", "BAMAKO", "BANDAR SERI BEGAVAN", 
            "BANDŽUL", "BANGI", "BANGKOK", "BARI", "BARSELONA", "BASTER", "BAZEL", "BEIRA", "BEJRUT", 
            "BELMOPAN", "BENGUELA", "BENIN SITI", "BEOGRAD", "BERGEN", "BERLIN", "BERN", "BEČ", "BILBAO", 
            "BIRMINGEM", "BISAU", "BIŠKEK", "BIZERTA", "BLANTAJER", "BOGOTA", "BOLONJA", "BOR", "BORDO", "BOSTON",
            "BRATISLAVA", "BRAŠOV", "BRAZAVIL", "BRAZILIJA", "BREMEN", "BRIDŽTAUN", "BRISEL", "BRIZBEJN", 
            "BRNO", "BUDIMPEŠTA", "BUDŽUMBURA", "BUENOS AJRES", "BUKUREŠT", "BULAVAJO", "BURGAS", "CIRIH", 
            "ČAČAK", "ČENAJ", "ČIKAGO", "DABLIN", "DAKA", "DAKAR", "DALAS", "DAMASK", "DAR ES SALAM",
            "DENVER", "DETROIT", "DILI", "DIRE DAUA", "DISELDORF", "DODOMA", "DOHA", "DORTMUND", "DREZDEN", 
            "DUALA", "DUBAI", "DURBAN", "DUŠANBE", "ĐENOVA", "DŽAKARTA", "DŽEDA",
            "DŽIBUTI", "DŽORDŽTAUN", "DŽUBA", "EDINBURG", "EDMONTON", "ENUGU", "FILADELFIJA", 
            "FINIKS", "FIRENCA", "FRANKFURT", "FRITAUN", "FUNAFUTI", "GABORONE", "GETEBORG", 
            "GITEGA", "GIZA", "GLAZGOV", "GRAC", "GUANGDŽOU", "GVADALAHARA", "GVATEMALA", "HAG", "HAIFA", 
            "HAMBURG", "HANOJ", "HANOVER", "HARARE", "HARKOV", "HAVANA", "HELSINKI", "HJUSTON", "HONGKONG", 
            "HONIJARA", "HURGADA", "IBADAN", "INZBRUK", "ISLAMABAD", "JAGODINA", "JAMUSUKRO", "JAREN", "JAUNDE",
            "JEKATERINBURG", "JEREVAN", "JERUSALIM", "JOHANESBURG", "JOKOHAMA", "JUŽNA TARAVA", "KABUL", 
            "KAIRO", "KALKUTA", "KAMPALA", "KANBERA", "KANO", "KARAČI", "KARAKAS", "KARTUM", "KASABLANKA",
            "KASTRI", "KATMANDU", "KAZABLANKA", "KAZANJ", "KEJPTAUN", "KELGARI", "KELN", "KIGALI", "KIJEV", 
            "KIKINDA", "KINGSTAUN", "KINGSTON", "KINŠASA", "KISANGANI", "KITO", "KIŠINJEV", "KJOTO", "KLUŽ-NAPOKA",
            "KOLOMBO", "KONAKRI", "KOPENHAGEN", "KORDOBA", "KRAGUJEVAC", "KRAKOV", "KRALJEVO", "KRUŠEVAC", "KUALA LUMPUR",
            "KUMASI", "KUVAJT", "LA PAZ", "LAGOS", "LAHOR", "LAJPCIG", "LAVOV", "LESKOVAC", "LIBERVIL", "LIDZ", 
            "LIL", "LILONGVE", "LIMA", "LINC", "LION", "LISABON", "LIVERPUL", "LOME", "LONDON",
            "LOS ANĐELES", "LOZANA", "LOZNICA", "LUANDA", "LUBUMBAŠI", "LUCERN", "LUKSEMBURG", "LUSAKA", "MADRID",
            "MADŽURO", "MAJAMI", "MAKAO", "MALABO", "MALE", "MALME", "MANAGVA", "MANAMA", "MANČESTER", 
            "MANILA", "MAPUTO", "MARAKEŠ", "MARSELJ", "MASERU", "MASKAT", "MBABANE", "MBARE", "MEDELJIN", 
            "MEDINA", "MEKA", "MEKSIKO", "MELBURN", "MILANO", "MINHEN", "MINSK", "MOGADIŠ", "MOMBASA", 
            "MONAKO", "MONROVIJA", "MONTEREJ", "MONTEVIDEO", "MONTREAL", "MORONI", "MOSKVA",
            "MUMBAJ", "NAJROBI", "NANT", "NAPULJ", "NASAU", "NDŽAMENA", "NEJPJIDO", "NGERULMUD", "NICA", 
            "NIJAMEJ", "NIKOZIJA", "NIRNBERG", "NIŠ", "NIŽNJI NOVGOROD", "NOVI PAZAR", "NOVI SAD", "NJU DELHI", 
            "NJU ORLEANS", "NJUJORK", "NUAKŠOT", "NUKUALOFA", "ODESA", "OKLAND", "ORAN", "ORLANDO", "OSAKA", 
            "OSLO", "OTAVA", "PALERMO", "PALIKIR", "PANAMA", "PANČEVO", "PARAMARIBO", "PARIZ", "PEKING", "PIROT", "PERT", "PJONGJANG",
            "PLOVDIV", "PNOM PEN", "PORT ELIZABET", "PORT HARKORT", "PORT LUJ", "PORT MORZBI",
            "PORT O PRENS", "PORT OV SPEJN", "PORT VILA", "PORTLAND", "PORTO", "PORTO NOVO", "POŽAREVAC", "PRAG", "PRAJA",
            "PRETORIJA", "PRIŠTINA", "PROKUPLJE", "RABAT", "REJKJAVIK", "RIGA", "RIJAD", "RIM", "RIO DE ŽANEIRO",
            "ROSARIO", "ROTERDAM", "ROZO", "SALCBURG", "SAN HOSE", "SAN MARINO", "SAN SALVADOR", "SANA",
            "SANKT PETERBURG", "SANTIJAGO", "SANTO DOMINGO", "SAO PAULO", "SAO TOME", "SAPORO",
            "SENT DŽONS", "SENT DŽORDŽIZ", "SEUL", "SEVILJA", "SIDNEJ", "SIJETL", "SINGAPUR",
            "SMEDEREVO", "SOFIJA", "SOLUN", "SOMBOR", "SREMSKA MITROVICA", "STOKHOLM", "STRAZBUR", "SUBOTICA", "SUEC",
            "SUVA", "ŠABAC", "ŠANGAJ", "ŠEFILD", "ŠENŽEN", "ŠRI DŽAJAVARDENEPURA KOTE", "ŠTUTGART", "TALIN", 
            "TAMAŠET", "TAMPERE", "TANGER", "TAŠKENT", "TBILISI", "TEGUSIGALPA", "TEHERAN", "TEL AVIV", 
            "TEMIŠVAR", "TETUAN", "TIMPU", "TIRANA", "TOKIO", "TORINO", "TORONTO", "TRIPOLI", "TRONDHAJM", 
            "TULUZ", "TUNIS", "UAGADUGU", "ULAN BATOR", "UŽICE",
            "VADUC", "VALENSIJA", "VALETA", "VALJEVO", "VANKUVER", "VARNA", "VARŠAVA", "VATIKAN", "VAŠINGTON", "VELINGTON", "VENECIJA", "VERONA", "VIJENTIJAN",
            "VIKTORIJA", "VILNJUS", "VINDHUK", "VRANJE", "VROCLAV", "VRŠAC", "ZAJEČAR", "ZANZIBAR", "ZRENJANIN",
            "ŽENEVA",
            ...GradoviHrvatske,
            ...GradoviSeverneMakedonije,
            ...GradoviCrneGore,
            ...GradoviSlovenije,
            ...GradoviBosneIHercegovine
        ],
        reka: [
            "AMAZON", "AMU DARJA", "AMUR", "ARAKS", "ARKANZAS", "BANI", "BELI NIL", "BENUE", "BOJANA", "BOSNA", 
            "BRAMAPUTRA", "CETINA", "CRNI TIMOK", "DARLING", "DNJEPAR", "DNJESTAR", "DON", "DRAVA", "DRIM", 
            "DRINA", "DUERO", "DUNAV", "ĐETINJA", "EBRO", "ELBA", "EUFRAT", "GAMBIJA", "GANG", 
            "GARONA", "GVADALKIVIR", "GVADIJANA", "HADSON", "HOANGHO", "HUANGHE", "IBAR", "IND", "IRAVADI", 
            "ISKAR", "JADAR", "JANGCE", "JANGCEKJANG", "JASENICA", "JENISEJ", "JORDAN", "JUBA", "JUKON", 
            "JUŽNA MORAVA", "KAMA", "KASAI", "KAVANGO", "KOLORADO", "KOLUBARA", "KOLUMBIJA", "KONGO", "KRKA", 
            "KUPA", "KVANZA", "KVILU", "LABA", "LENA", "LIM", "LIMPOPO", "LOGON", "LOMAMI", "LOARA", "LUALABA", 
            "LUANGVA", "LUGOMIR", "LJUBLJANICA", "LJIG", "MADEIRA", "MAFOU", "MAGDALENA", "MAJNA", "MAKENZI", 
            "MANO", "MARI", "MARICA", "MARNA", "MEKONG", "MISISIPI", "MISURI", "MLAVA", "MORAČA", "MURA", 
            "NELSON", "NERETVA", "NEVA", "NIGER", "NIL", "NIŠAVA", "NOSOB", "NYONG", "NJEMEN", "OB", "ODRA", 
            "OHAJO", "OKA", "OKAVANGO", "ORANŽ", "ORINOKO", "OUHAM", "PANGANI", "PARAGVAJ", "PARANA", "PČINJA", 
            "PEČORA", "PEK", "PIVA", "PLAVI NIL", "PO", "POTOMAK", "RAJNA", "RASINA", "RESAVA", "RIO GRANDE", 
            "RIO NEGRO", "RONA", "RUFIJI", "SALVIN", "SANA", "SANKURU", "SAO FRANSISKO", "SAVA", "SENA", 
            "SENEGAL", "SENT LORENS", "SEVERN", "SIR DARJA", "SITNICA", "SKRAPEŽ", "STRUMA", "ŠARI", "ŠELDA", 
            "TAMIŠ", "TANA", "TARA", "TARIM", "TEMZA", "TEŽO", "TIBAR", "TIGAR", "TIMOK", "TISA", "TOKANTINS", 
            "TOPLICA", "TREBIŠNJICA", "UBANGI", "UNA", "URAL", "URUGVAJ", "UVAC", "VARDAR", "VELIKA MORAVA", 
            "VISLA", "VIZER", "VLASINA", "VOLGA", "VOLTA", "VRBAS", "ZAMBEZI", "ZAPADNA MORAVA", "ZETA", "ŽUTA REKA"
        ],
        planina: [
            "AHAGAR", "AKONKAGVA", "ALPI", "AMBA ALAGI", "ANDI", "ANKARATRA", "APALAČKE PLANINE", "APENINI", 
            "ARARAT", "ARBANAŠKA PLANINA", "ARBANAŠKO BRDO", "ATLAS", "AVALA", "BABA", "BABIČKA GORA", 
            "BANJSKO BRDO", "BELAVA", "BELJANICA", "BESNA KOBILA", "BEŠNJAJA", "BITOVIK", "BIĆ", "BLAGAJA", 
            "BOBIJA", "BOHOVSKA PLANINA", "BORANJA", "BUKOVIK", "BUKULJA", "CER", "CRNI VRH", "CRNOKOSA", 
            "CRVENA GORA", "ČEMERNICA", "ČEMERNIK", "ČEMERNO", "ČUDINSKA PLANINA", "DEBELA GORA", "DEBELO BRDO", 
            "DELI JOVAN", "DENALI", "DEVICA", "DINARIDI", "DRAKENSBERG", "DREŽNIK GRADINA", "DRMANOVINA", 
            "DUKAT", "DŽUMAJKA", "ELBRUS", "ELGON", "EMI KUSI", "ERTA ALE", "ETNA", "EVEREST", "FRUŠKA GORA", 
            "FUDŽI", "GAJEVA PLANINA", "GILJEVA", "GLEDIĆKE PLANINE", "GLOŠKA PLANINA", "GOLAŠ", "GOLEMI STOL", 
            "GOLI KRŠ", "GOLIJA", "GOLUBAC", "GOLJAK", "GOČ", "GRADINA", "GRAMADA", "GREBEN", "GROT", "GUČEVO", 
            "HIMALAJI", "HINDUKUŠ", "HOMOLJSKE PLANINE", "HUM", "IGMAN", "JABLANIK", "JABUKA", 
            "JADOVNIK", "JAGODNJA", "JAHORINA", "JARUT", "JASTREBAC", "JAVOR", "JAVORIŠTE", "JAVORJE", "JELICA", 
            "JELOVA GORA", "JEŠEVAC", "JEŽEVAC", "JUHOR", "K2", "KABLAR", "KAMENA GORA", "KAMERUN", "KARAKORUM", 
            "KARISIMBI", "KARPATI", "KAVKAZ", "KENIJA", "KILIMANDŽARO", "KOPAONIK", "KOSMAJ", "KOTLENIK", "KOZJAK", 
            "KOZOMOR", "KRAVARSKA PLANINA", "KRSTATAC", "KRUŠEVICA", "KUČAJSKE PLANINE", "KUKAVICA", "KUKUTNICA", 
            "KULAL", "LEBA", "LEPA GORA", "LISINSKA PLANINA", "LIŠKOVAC", "LOMA", "MAGLEŠ", "MAJDAN", "MALI KRŠ", 
            "MALIČ", "MALINIK", "MALJEN", "MARA", "MATERHORN", "MEDVEDNIK", "MERU", "MILEVSKA PLANINA", 
            "MILOSLAVSKA PLANINA", "MIROČ", "MOKO", "MOKRA GORA", "MON BLAN", "MONT EVEREST", "MUČANJ", 
            "MUHAVURA", "MURTENICA", "NEMIĆ", "NIMBA", "NINAJA", "NJANI", "NJEGOŠ", "OBLIK", "OROVICA", "OSTRICA", 
            "OSTROZUB", "OVČAR", "OZREN", "OŠTRIK", "PAMIR", "PASJAČA", "PEŠTER", "PIRENEJI", "PLJAČKOVICA", 
            "POBIJENIK", "POVLEN", "PROJIĆ", "RADAN", "RADOČELO", "RAVNA PLANINA", "RGAJSKA PLANINA", "ROGOZNA", 
            "ROŽANJ", "RTANJ", "RUDNIK", "RUJ", "RUJAN", "RUVENZORI", "SAMANJAC", "SELIČEVICA", "SINAJ", "SLEMEN", 
            "SOKOLOVICA", "SOKOLSKE PLANINE", "STARA PLANINA", "STENOVITE PLANINE", "STOJKOVAČKA PLANINA", 
            "STOL", "STOLOVI", "STRELA", "STUDENA PLANINA", "SUBJEL", "SUVA PLANINA", "SUVOBOR", "SVETI ILIJA", 
            "SVRLJIŠKE PLANINE", "ŠAR PLANINA", "ŠIROKA PLANINA", "ŠLJIVOVIK", "ŠOMRDA", "TARA", "TATRE", 
            "TIBESTI", "TILVA NJAGRA", "TJAN ŠAN", "TRESIBABA", "TROGLAV", "TUBKAL", "TUPIŽNICA", "URAL", 
            "VARDENIK", "VELIKI GREBEN", "VELIKI JASTREBAC", "VELIKI KRŠ", "VENČAC", "VEZUV", "VIDLIČ", "VIDOJEVICA", 
            "VIRUNGA", "VLAŠIĆ", "VLAŠKA PLANINA", "VRŠAČKE PLANINE", "VUJAN", "ZLATAR", "ZLATIBOR", 
            "ZVIJEZDA", "ŽELJIN", "ŽILINDAR"
        ],
        biljka: [
            "AGAVA", "ALGA", "ALOJA", "AMARANT", "ANANAS", "ARIŠ", "ARONIJA", "AVOKADO", 
            "BADEM", "BAGREM", "BAMBUS", "BANANA", "BAOBAB", "BEGONIJA", "BELI LUK", 
            "BIBER", "BLITVA", "BOB", "BOKVICA", "BOR", "BORANIJA", "BOROVNICA", "BOSILJAK", 
            "BOŽUR", "BRESKVA", "BREZA", "BROKOLI", "BRUSNICA", "BRŠLJAN", "BUKVA", 
            "BUNDEVA", "CELER", "CER", "CIKLAMA", "CIMET", "CRNI LUK", "CVEKLA", "ČAJ", 
            "ČEMPRES", "ČIČAK", "ČUVARKUĆA", "DETELINA", "DINJA", "DUD", "DUNJA", "ĐUMBIR", 
            "ĐURĐEVAK", "EUKALIPTUS", "FIKUS", "FREZIJA", "GERBER", "GINKO", "GLADIOLA", 
            "GRAB", "GRAŠAK", "GREJPFRUT", "GROŽĐE", "HAJDUČKA TRAVA", "HELJDA", "HIBISKUS", 
            "HMELJ", "HORTENZIJA", "HRAST", "HRIZANTEMA", "IRIS", "JABUKA", "JAGODA", 
            "JASEN", "JASMIN", "JAVOR", "JEČAM", "JELA", "JORGOVAN", "KADIFA", "KAFA", 
            "KAJSIJA", "KAKAO", "KAKTUS", "KAMELIJA", "KAMILICA", "KANDILKA", "KANTARION", 
            "KARANFIL", "KARANFILIĆ", "KARFIOL", "KEDAR", "KELERABA", "KELJ", "KESTEN", 
            "KIKIRIKI", "KIVI", "KLEKA", "KLEN", "KONOPLJA", "KOPRIVA", "KRASTAVAC", 
            "KROKUS", "KROMPIR", "KRUŠKA", "KUKURUZ", "KUPINA", "KUPUS", "KURKUMA", "LALA", 
            "LAN", "LAVANDA", "LEŠNIK", "LIMUN", "LIPA", "LIŠAJ", "LOKVANJ", "LOVOR", 
            "LOZA", "LUBENICA", "LUK", "LJILJAN", "LJUBIČICA", "LJUTIĆ", "MAGNOLIJA", 
            "MAHOVINA", "MAJČINA DUŠICA", "MAK", "MALINA", "MANDARINA", "MANGO", 
            "MARGARETA", "MASLAČAK", "MASLINA", "MATIČNJAK", "MENTA", "MUŠKATLA", 
            "MUŠMULA", "NANA", "NAR", "NARANDŽA", "NARCIS", "NEVEN", "OGROZD", "OMORIKA", 
            "ORAH", "OREGANO", "ORHIDEJA", "ORIGANO", "OSKORUŠA", "OVAS", "PALMA", 
            "PAMUK", "PAPAJA", "PAPRAT", "PAPRIKA", "PARADAJZ", "PAŠKANAT", "PASULJ", 
            "PATLIDŽAN", "PELIN", "PERŠUN", "PETUNIJA", "PIRINAČ", "PLATAN", "POMORANDŽA", 
            "PRAZILUK", "PROKELJ", "PROSO", "PŠENICA", "RAŽ", "REPA", "RIBIZLA", "ROGAČ", 
            "ROTKVA", "ROTKVICA", "RUKOLA", "RUZMARIN", "RUŽA", "SALATA", "SEKVOJA", 
            "SMILJE", "SMOKVA", "SMRČA", "SOČIVO", "SOJA", "SPANAĆ", "SUNCOKRET", "SUSAM", 
            "ŠAFRAN", "ŠARGAREPA", "ŠEBOJ", "ŠIPAK", "ŠIPURAK", "ŠLJIVA", "ŠPARGLA", 
            "TIKVICA", "TIMIJAN", "TISA", "TOPOLA", "TREŠNJA", "TRNJINA", "TRSKA", "URMA", 
            "VISIBABA", "VIŠNJA", "VLAŠAC", "VRBA", "ZELJE", "ZOVA", "ZUMBUL", "ŽALFIJA", 
            "ŽITO"
        ],
        zivotinja: [
            "AFRIČKI SLON", "AJE-AJE", "AJKULA", "ALBATROS", "ALIGATOR", "ALPAKA", "ANAKONDA", 
            "ANTILOPA", "ARA", "BABUN", "BAKALAR", "BALEGAR", "BELOUŠKA", "BIK", "BISERKA", 
            "BIVOL", "BIZON", "BOGOMOLJKA", "BONOBO", "BUBAMARA", "BUBAŠVABA", "BUMBAR", 
            "BUVA", "CRNA UDOVICA", "CRV", "CRVENDAĆ", "CVRČAK", "ČAKALJ", "ČAPLJA", "ČAVKA", 
            "ČEŠLJUGAR", "ČINČILA", "ČOVEČJA RIBICA", "ČUDNOKLJUNAŠ", "ĆELAVI IBIS", "ĆUK", 
            "ĆURAN", "ĆURKA", "DABAR", "DAŽDEVNJAK", "DELFIN", "DETLIĆ", "DINGO", "DINOSAURUS", 
            "DIVLJA SVINJA", "DIVOKOZA", "DODO", "DROZD", "ĐAVO", "ĐAVOLJA RAŽA", "EMU", 
            "FAZAN", "FENEK", "FLAMINGO", "FOKA", "GALEB", "GAVRAN", "GELADA", "GEPARD", 
            "GERENUK", "GLISTA", "GNU", "GNJURAC", "GOLUB", "GORILA", "GRGEČ", "GRIZLI", 
            "GRLICA", "GUSKA", "GUŠTER", "HAMELEON", "HARPIJA", "HIJENA", "HOBOTNICA", 
            "HRČAK", "HRT", "IBIS", "IGUANA", "IMPALA", "INDRI", "IRVAS", "JAGUAR", "JAREBICA", 
            "JASTOG", "JASTREB", "JAZAVAC", "JAZAVAC MEDOŽDER", "JEGULJA", "JELEN", "JEŽ", 
            "KAKADU", "KAMELEON", "KAMILA", "KANARINAC", "KAPSKI BIVO", "KENGUR", "KIT", 
            "KIVI", "KOBRA", "KOJOT", "KOKOŠKA", "KOLIBRI", "KOMARAC", "KONDOR", "KONJ", 
            "KORMORAN", "KORNJAČA", "KOS", "KOZA", "KRAVA", "KROKODIL", "KRPELJ", "KRTICA", 
            "KUDU", "KUDU ANTILOPA", "KUNA", "LABUD", "LAMA", "LASICA", "LASTAVICA", "LAV", 
            "LEMUR", "LENJIVAC", "LEOPARD", "LEPTIR", "LIGNJA", "LIKAON", "LISICA", 
            "LJUSKAVAC", "LOS", "LOSOS", "MAČKA", "MAGARAC", "MAJMUN", "MAMBA", "MANDRIL", 
            "MARABU", "MEDVED", "MEDUZA", "MERKAT", "MIŠ", "MORSKA KRAVA", "MORSKA ZVEZDA", 
            "MORSKI KONJIĆ", "MORŽ", "MRAV", "MRAVOJED", "MRENA", "MRMOT", "MUNGOS", "MUVA", 
            "NANDU", "NILSKI KONJ", "NILSKI KROKODIL", "NOJ", "NOSOROG", "NJORKA", "OKAPI", 
            "OKLOPNIK", "ORANGUTAN", "ORAO", "ORIKS", "ORKA", "OSA", "OSTRIGA", "OVAN", 
            "OVCA", "PANDA", "PANGOLIN", "PANTER", "PAPAGAJ", "PAS", "PASTRMKA", "PATKA", 
            "PAUK", "PAUN", "PČELA", "PELIKAN", "PETAO", "PIJAVICA", "PINGVIN", "PIRANA", 
            "PITON", "PREPELICA", "PUH", "PUMA", "PUSTINJSKA LISICA", "PUŽ", "RAK", "RAKUN", 
            "RAŽA", "RIS", "RODA", "ROVAC", "ROVČICA", "SARDINA", "SERVAL", "SIPA", 
            "SKAKAVAC", "SKUŠA", "SLEPI MIŠ", "SLON", "SMUĐ", "SOKO", "SOM", "SOVA", "SRNA", 
            "SRNDAĆ", "STEPSKI SKOČIMIŠ", "STONOGA", "STRŠLJEN", "SURIKATA", "SVINJA", 
            "SVITAC", "SVRAKA", "ŠAKAL", "ŠARAN", "ŠIMPANZA", "ŠIŠMIŠ", "ŠKOLJKA", "ŠKORPIJA", 
            "ŠTUKA", "TAPIR", "TERMIT", "TETREB", "TIGAR", "TUKAN", "TUNA", "TVOR", "UDAV", 
            "UGOR", "UHOLAŽA", "VAŠ", "VEPAR", "VEVERICA", "VIDRA", "VILIN KONJIC", "VO", 
            "VODENI BIVO", "VOMBAT", "VRABAC", "VRANA", "VUK", "ZEBA", "ZEBRA", "ZEC", 
            "ZMIJA", "ZOLJA", "ŽABA", "ŽDRAL", "ŽIRAFA", "ŽUNA"
        ],
        predmet: [
            "AJNCER", "AKUMULATOR", "AKVARIJUM", "ALARM", "ALAT", "ALBUM", "ALKA", "AMAJLIJA", "AMFORA", "AMPULA", 
            "AMREL", "ANTENA", "APARAT", "ASFALT", "ASPIRIN", "ASURA", "AŠOV", "AUTO", "AUTOMAT", "AVAN", "AVION", 
            "BADEMANTIL", "BAGER", "BAKAR", "BAKLJA", "BAKRAČ", "BALDAHIN", "BALETANKE", "BALON", "BANDERA", 
            "BAROMETAR", "BATERIJA", "BAZEN", "BEDEM", "BEDŽ", "BELEŽNICA", "BICIKL", "BIDE", "BILIJAR", "BINA", 
            "BISTA", "BLENDER", "BLOK", "BLUZA", "BOCA", "BODEŽ", "BOJLER", "BOKAL", "BOMBA", "BOMBONA", "BOVA", 
            "BRANIK", "BRAVA", "BRIJAČ", "BRISAČ", "BROD", "BROJANICA", "BRUS", "BRUSHALTER", "BUBANJ", "BUBICA", 
            "BUĆKALICA", "BUDILNIK", "BUMERANG", "BUNDA", "BURE", "BURGIJA", "BURMA", "BUSOLA", "BUŠILICA", "CD", 
            "CEDILJKA", "CEGER", "CEMENT", "CENTRIFUGA", "CEV", "CEVČICA", "CIGARETA", "CIGLA", "CIKLOTRON", "CILINDAR", 
            "CIPELE", "CREP", "CREVO", "CRTEŽ", "CUCLA", "CVIKERI", "ČAČKALICA", "ČAJNIK", "ČAKLJA", "ČAMAC", "ČARAPA", 
            "ČARŠAF", "ČARŠAV", "ČASOPIS", "ČAŠA", "ČAURA", "ČEKIĆ", "ČEKRK", "ČEP", "ČESMA", "ČEŠALJ", "ČETKA", 
            "ČETKICA", "ČIBUK", "ČINIJA", "ČIP", "ČIRAK", "ČIVILUK", "ČIZME", "ČOJA", "ČOKANJ", "ČUTURA", "ČUTURICA", 
            "ĆASA", "ĆEBE", "ĆILIM", "ĆUP", "ĆUSKIJA", "DAIRE", "DALJINSKI", "DASKA", "DEKA", "DETEKTOR", "DEZODORANS", 
            "DIGITRON", "DIJADEM", "DIJAMANT", "DIMNJAK", "DINAMO", "DIODA", "DIRKA", "DISK", "DISKETA", "DIVAN", 
            "DLETO", "DNEVNIK", "DOMINE", "DOSIJE", "DRES", "DRLJAČA", "DRON", "DRVCE", "DUBINOMER", "DUGME", "DUKAT", 
            "DUKS", "DUKSERICA", "DURBIN", "DUŠEK", "DVOGLED", "DŽAK", "DŽEMPER", "DŽEZVA", "DŽIP", "DŽOJSTIK", "DŽUKBOKS", 
            "ĐERAM", "ĐERĐEF", "ĐON", "ĐUBROVNIK", "ĐULE", "EKRAN", "EKSER", "ELEKTROMOTOR", "ELISA", "EMAJL", 
            "ENCIKLOPEDIJA", "EPOLETA", "EPRUVETA", "ESCAJG", "ETIKETA", "ETISON", "FARBA", "FASCIKLA", "FEN", "FENJER", 
            "FERIBOT", "FES", "FIKSNI TELEFON", "FILDŽAN", "FILM", "FILTER", "FIOKA", "FLAŠA", "FLASTER", "FLAUTA", 
            "FLIPER", "FLOMASTER", "FOLIJA", "FONTANA", "FOTELJA", "FOTOAPARAT", "FOTOGRAFIJA", "FRESKA", "FRIZBI", 
            "FRIŽIDER", "FROTIR", "FRULA", "FUTROLA", "GAĆE", "GAJBA", "GAJTAN", "GALIJA", "GARDEROBA", "GARDEROBER", 
            "GASMASKA", "GAZA", "GENERATOR", "GIPS", "GITARA", "GLETERICA", "GLINA", "GLISER", "GLOBUS", "GOBLEN", "GONG", 
            "GONIOMETAR", "GORIONIK", "GOVORNICA", "GRABULJE", "GRAMOFON", "GRANATA", "GROMOBRAN", "GUMA", "GUMICA", 
            "HALJINA", "HAMER", "HANGAR", "HARMONIKA", "HARFA", "HARPUN", "HARTIJA", "HELANKE", "HELIKOPTER", 
            "HEMIJSKA OLOVKA", "HIJEROGLIF", "HLADNJAK", "HOBLERICA", "IGLA", "IGRAČKA", "IKONA", "INJEKCIJA", 
            "INKUBATOR", "INSTRUMENT", "INTERFON", "INVALIDSKA KOLICA", "IVERICA", "IVIČNJAK", "IZLOG", "IZVIJAČ", 
            "JAHTA", "JAKNA", "JARBOL", "JASTUK", "JASTUČNICA", "JATAGAN", "JEDRO", "JELEK", "KABAL", "KABANICA", 
            "KACIGA", "KADA", "KADIONICA", "KAIŠ", "KAJAK", "KAJLA", "KALENDAR", "KALEŽ", "KALKULATOR", "KALUP", "KAMA", 
            "KAMEN", "KAMERA", "KAMIN", "KAMION", "KAMIONET", "KANDILO", "KANAP", "KANISTER", "KANTA", "KANTAR", "KAPA", 
            "KAPIJA", "KAPSULA", "KAPUT", "KARABIN", "KARBURATOR", "KARDIGAN", "KARMIN", "KARTA", "KARTON", "KASA", 
            "KASETAR", "KASICA", "KAŠIKA", "KAŠIKARA", "KATALIZATOR", "KATAMARAN", "KATANAC", "KATAPULT", "KATEDRA", 
            "KAUČ", "KAVEZ", "KAZAN", "KECELJA", "KEGLA", "KERAMIKA", "KESA", "KILT", "KIMONO", "KIP", "KIST", "KIŠOBRAN", 
            "KLACKALICA", "KLADIVO", "KLAMERICA", "KLARINET", "KLATNO", "KLAVIJATURA", "KLAVIR", "KLEŠTA", "KLIMA", 
            "KLIN", "KLIZALJKE", "KLOPKA", "KLOZET", "KLUPA", "KLJUČ", "KNJIGA", "KOBASICA", "KOCKA", "KOČIJA", "KOFER", 
            "KOLICA", "KOLT", "KOMBINEZON", "KOMBI", "KOMPAS", "KOMPLET", "KOMPOSTER", "KONAC", "KONFETI", "KONOPAC", 
            "KONTEJNER", "KOPAČKA", "KOPČA", "KOPLJE", "KORITO", "KORMILO", "KORPA", "KOSA", "KOSILICA", "KOSTIM", 
            "KOSTUR", "KOŠ", "KOŠNICA", "KOŠULJA", "KOTAO", "KOTUR", "KOTURALJKE", "KOVANICA", "KOVERAT", "KOVERTA", 
            "KRAVATA", "KREDA", "KREMA", "KREVET", "KRIGLA", "KROFNA", "KROV", "KRPA", "KRST", "KRUNA", "KUGLA", "KUKA", 
            "KUTIJA", "KUTLAČA", "LAK", "LAMPA", "LAMPION", "LANAC", "LASER", "LASO", "LASTIŠ", "LAVABO", "LAVIRINT", 
            "LEDENICA", "LEGURA", "LEK", "LENJIR", "LEPAK", "LEPEZA", "LESTVE", "LESTVICE", "LETAK", "LETELICA", "LETVA", 
            "LEVAK", "LEŽAJ", "LIFT", "LIM", "LIMENKA", "LINIJA", "LINOLEUM", "LIRA", "LOKNA", "LOKOMOTIVA", "LONAC", 
            "LONČE", "LOPATA", "LOPTA", "LOPTICA", "LOZINKA", "LULA", "LUPA", "LUSTER", "LUTKA", "LJULJAŠKA", "LJUŠTILICA", 
            "MAČ", "MAČETA", "MAGACIN", "MAGNET", "MAJICA", "MAKAZE", "MAKETA", "MALJ", "MAMAC", "MANTIL", "MAPA", 
            "MARAMA", "MARAMICA", "MARGARIN", "MARKA", "MARKER", "MASKA", "MAŠINA", "MAŠNA", "MATERIJAL", "MATICA", 
            "MEDALJA", "MEDALJON", "MERAČ", "MERMER", "METAK", "METAL", "METAR", "METEOR", "METLA", "MIKROFON", 
            "MIKROSKOP", "MIKROVALNA", "MIKSER", "MILJE", "MINA", "MINĐUŠA", "MINERAL", "MIŠ", "MITRALJEZ", "MLIN", 
            "MODEL", "MODLA", "MOKASINA", "MONITOR", "MOTIKA", "MOTOR", "MREŽA", "MREŽICA", "MUNICIJA", "MUŠTIKLA", 
            "NAJLON", "NAKIT", "NAKOVANJ", "NALEPNICA", "NAMIRNICA", "NAMEŠTAJ", "NAOČARE", "NAPRAVA", "NAPRSTAK", 
            "NARUKVICA", "NASLON", "NASLONJAČ", "NAVIGACIJA", "NEONKA", "NESEZER", "NIŠAN", "NIT", "NITNA", "NIVELIR", 
            "NOGARE", "NOGAVICA", "NOKŠIR", "NOSAČ", "NOSILA", "NOVAC", "NOVČANIK", "NOVČIĆ", "NOVINE", "NOŽ", "NJIHALO", 
            "OBARAČ", "OBOA", "OBRAZAC", "OBUĆA", "ODAR", "ODEĆA", "ODELO", "ODVIJAČ", "OGLAS", "OGLEDALO", "OGRADA", 
            "OGRLICA", "OGRTAČ", "OKLAGIJA", "OKLOP", "OKOV", "OKVIR", "OLOVO", "OLOVKA", "OLTAR", "OMOT", "OMOTAČ", 
            "OPRUGA", "ORDEN", "ORMAR", "ORUŽJE", "OSIGURAČ", "OSOVINA", "OSTAVA", "OTIRAČ", "OVAL", "PADOBRAN", 
            "PAKERICA", "PAKET", "PAKOVANJE", "PALETA", "PALICA", "PANCIR", "PANO", "PANTOFLE", "PANTALONE", "PAPIR", 
            "PAPIRIĆ", "PAPUČE", "PARABOLA", "PARAFIN", "PARFEM", "PARKET", "PARNA MAŠINA", "PASOŠ", "PASTA", "PATIKA", 
            "PATIKE", "PATRONA", "PAVILJON", "PEČAT", "PEGLA", "PEHAR", "PELENA", "PENDREK", "PENKALO", "PEPELJARA", 
            "PERAČ", "PERAJE", "PERIKA", "PERNICA", "PERO", "PERILICA", "PERTLA", "PEŠKIR", "PETARDA", "PETROLEJ", 
            "PIANINO", "PIKADO", "PILA", "PINCETA", "PISAK", "PISAĆA MAŠINA", "PISMO", "PIŠTALJKA", "PIŠTOLJ", "PLAFON", 
            "PLAKAR", "PLAKAT", "PLANETA", "PLASTENIK", "PLASTIKA", "PLATNO", "PLAŠT", "PLATO", "PLEH", "PLETENICA", 
            "PLETIVO", "PLIN", "PLIŠ", "PLOČA", "PLOČICA", "PLOT", "PLUG", "POJAS", "POKLON", "POKLOPAC", "POKROV", 
            "POLICA", "PONTON", "PORCELAN", "PORTAL", "PORTRET", "POSLUŽAVNIK", "POSTAVA", "POSTELJINA", "POSTER", 
            "POSUDA", "POSUĐE", "POTKOVICA", "POZIVNICA", "PRAĆKA", "PRAG", "PREDIVO", "PREKIDAČ", "PREKRIVAČ", "PREMAZ", 
            "PRESLICA", "PREZERVATIV", "PRIKOLICA", "PRIVEZAK", "PRIZMA", "PROJEKTIL", "PROJEKTOR", "PROSTIRKA", "PROZOR", 
            "PRSLUK", "PRSTEN", "PRUT", "PUDER", "PULT", "PUMPA", "PUNJAČ", "PUTOKAZ", "PUZLA", "PUŠKA", "RAČUN", 
            "RAČUNALJKA", "RAČUNAR", "RADAR", "RADIJATOR", "RADIO", "RAF", "RAGASTOV", "RAJFEŠLUS", "RAKETA", "RAM", 
            "RAMPA", "RANAC", "RAPIR", "RASKRSNICA", "RASPEĆE", "RAŽANJ", "RECEPT", "REČNIK", "REFLEKTOR", "REGAL", 
            "REGISTAR", "REKET", "RELIKVIJA", "REMEN", "RENDE", "RENDGEN", "RERNA", "REŠETO", "REZA", "REZAČ", "REZERVOAR", 
            "REZONATOR", "RIBEŽ", "ROBA", "ROBOT", "ROKOVNIK", "ROLER", "ROLKA", "ROLERI", "ROLNA", "ROMAN", "ROMOBIL", 
            "ROŠTILJ", "ROTOR", "ROZETA", "RUBLJE", "RUKAV", "RUKAVICA", "RUKOHVAT", "RUKSAK", "RUŽ", "SABLJA", "SAČMA", 
            "SAFIR", "SAJLA", "SAKO", "SAKSIJA", "SAKSOFON", "SALAMA", "SALVETA", "SANDALE", "SANDUK", "SANKE", "SAPUN", 
            "SAT", "SATARA", "SATELIT", "SCENA", "SECKA", "SEČIVO", "SEDIŠTE", "SEDLO", "SEF", "SEKIRA", "SEMAFOR", "SEME", 
            "SENF", "SENZOR", "SEPARATOR", "SERVIS", "SET", "SFERA", "SIDRO", "SIFON", "SIGNAL", "SIJALICA", "SILIKON", 
            "SINTETIKA", "SINTISAJZER", "SIRENA", "SIRUP", "SITO", "SKAKALICA", "SKALPEL", "SKELA", "SKEJT", "SKEJTBORD", 
            "SKIJE", "SKLADIŠTE", "SKOBA", "SKULPTURA", "SKUTER", "SLAMKA", "SLANIK", "SLAVINA", "SLEME", "SLIKA", 
            "SLIKOVNICA", "SLUŠALICE", "SODA", "SOFA", "SOKOVNIK", "SOMUN", "SONDA", "SPAJALICA", "SPREJ", "SPRAVA", 
            "SREBRO", "SREDSTVO", "SRMA", "STAKLO", "STALAK", "STANIOL", "STAZA", "STATIV", "STATUA", "STEPENICE", 
            "STEPENIK", "STEZNIK", "STO", "STOLICA", "STOLNJAK", "STOŽER", "STRELA", "STRELICA", "STRUG", "STUB", "STVAR", 
            "SUDOPERA", "SUKNJA", "SUNCOBRAN", "SUNĐER", "SUĐE", "SUVENIR", "SVEĆA", "SVESKA", "SVETILJKA", "SVRDLO", 
            "ŠAH", "ŠAL", "ŠANAC", "ŠARKA", "ŠATOR", "ŠERBET", "ŠERPA", "ŠESTAR", "ŠIBICA", "ŠIBLJE", "ŠIFRA", "ŠINJEL", 
            "ŠIPKA", "ŠIŠARKA", "ŠLEM", "ŠLJEM", "ŠMIRGLA", "ŠOLJA", "ŠORTS", "ŠPORET", "ŠPRIC", "ŠRAF", "ŠRAFCIGER", 
            "ŠTAMPAČ", "ŠTAP", "ŠTAPIĆ", "ŠTIPALJKA", "ŠTIT", "TABAKERA", "TABELA", "TABLA", "TABLET", "TABLETA", 
            "TABLICA", "TABURE", "TAJMER", "TAKSI", "TAMBURA", "TAMPON", "TANK", "TANJIR", "TAPA", "TAPET", "TASTATURA", 
            "TASTER", "TAŠNA", "TAVA", "TAVAN", "TEG", "TEGLA", "TELEFON", "TELEGRAM", "TELESKOP", "TELEVIZOR", "TENDA", 
            "TENK", "TEPIH", "TERA", "TERET", "TERMOMETAR", "TERMOS", "TESTAMENT", "TESTERA", "TESTO", "TETIVA", "TIGANJ", 
            "TIKET", "TINTA", "TIPL", "TIRAŽ", "TIRKIZ", "TOCILO", "TOČAK", "TOMPUS", "TON", "TOP", "TOPLOMER", "TOPUZ", 
            "TORBA", "TORBICA", "TORANJ", "TORTA", "TRAMBOLINA", "TRAMVAJ", "TRANZISTOR", "TRAKA", "TRAKTOR", "TREGER", 
            "TRENERKA", "TREZOR", "TRIBINA", "TRICIKL", "TRIMER", "TROLEJBUS", "TROMBON", "TRONOŽAC", "TROTINET", 
            "TRUBA", "TRUP", "TUBA", "TURBAN", "TURPIJA", "TUŠ", "TUŠ KABINA", "UDICA", "UDŽBENIK", "UGLJOMER", "UKRAS", 
            "ULOŽAK", "UMIVAONIK", "UNIFORMA", "UPALJAČ", "UPRTAČ", "UPUT", "UREĐAJ", "USISIVAČ", "USTAV", 
            "UTIČNICA", "UTIKAČ", "UTOVARIVAČ", "UZDA", "UZICA", "UZORAK", "UŽE", "VADIČEP", "VAGA", "VAGON", "VAKUUM", 
            "VALJAK", "VANGLA", "VARJAČA", "VATA", "VATROMET", "VAZA", "VAZDUHOPLOV", "VEKNA", "VENAC", "VENTIL", 
            "VENTILATOR", "VERIGE", "VESLO", "VEŠALICA", "VEŠ MAŠINA", "VEZA", "VIDEO", "VIJAK", "VILICE", "VILJUŠKA", 
            "VILJUŠKAR", "VINO", "VIOLINA", "VISAK", "VIZIR", "VIZA", "VLAK", "VLAKNO", "VODOMER", "VOLAN", "VOSAK", 
            "VOZ", "VOZILO", "VRATA", "VRATILO", "VRČ", "VREĆA", "VREĆICA", "VRETENO", "VRPCA", "ZAKRPA", "ZAMAK", 
            "ZAMRZIVAČ", "ZAPTIVKA", "ZASLON", "ZASTAVA", "ZASTOR", "ZATVARAČ", "ZAVESA", "ZAVOJ", "ZAVRTANJ", "ZDJELA", 
            "ZGLOB", "ZGRADA", "ZID", "ZLATO", "ZMAJ", "ZNAČKA", "ZNAK", "ZUPČANIK", "ZVUČNIK", "ZVONO", "ŽALUZINA", 
            "ŽARAČ", "ŽARDINJERA", "ŽBICA", "ŽELEZO", "ŽEMLJA", "ŽETON", "ŽEZLO", "ŽICA", "ŽIG", "ŽILET", "ŽIPON", 
            "ŽLJEB", "ŽMIGAVAC", "ŽVAKA", "ŽVAKAĆA GUMA"
        ]
    },

    // Zakon o teritorijalnoj organizaciji RS, čl. 20 i Grad Beograd kao posebna teritorijalna jedinica.
    // Ovaj spisak služi kao izvor istine: među srpskim unosima u kategoriji „Grad“ priznaju se samo ovi nazivi.
    gradoviSaStatusomGradaUSrbiji: [
        "BEOGRAD", "BOR", "VALJEVO", "VRANJE", "VRŠAC", "ZAJEČAR", "ZRENJANIN", "JAGODINA",
        "KIKINDA", "KRAGUJEVAC", "KRALJEVO", "KRUŠEVAC", "LESKOVAC", "LOZNICA", "NIŠ", "NOVI PAZAR",
        "NOVI SAD", "PANČEVO", "PIROT", "POŽAREVAC", "PRIŠTINA", "PROKUPLJE", "SMEDEREVO", "SOMBOR",
        "SREMSKA MITROVICA", "SUBOTICA", "UŽICE", "ČAČAK", "ŠABAC"
    ],

    // Gradovi RH: 127 gradova + Grad Zagreb (poseban status grada i županije).
    gradoviSaStatusomGradaUHrvatskoj: GradoviHrvatske,

    // Veća urbana sedišta Severne Makedonije; ovo nije spisak pravnih „gradova“.
    gradoviSeverneMakedonije: GradoviSeverneMakedonije,

    // Veća urbana sedišta Crne Gore; ovo nije spisak pravnih „gradova“.
    gradoviCrneGore: GradoviCrneGore,
    naziviKojiNisuGradoviUCrnojGori: [...NaziviKojiNisuGradoviUCrnojGori],

    // Slovenija: 69 naselja sa zakonskim statusom mesta, vođenih srpskim nazivima.
    gradoviSaStatusomGradaUSloveniji: GradoviSlovenije,
    naziviKojiNisuGradoviUSloveniji: [...NaziviKojiNisuGradoviUSloveniji],

    // BiH: zakonski Gradovi iz FBiH i Republike Srpske; Brčko distrikt nije Grad.
    gradoviSaStatusomGradaUBosniIHercegovini: GradoviBosneIHercegovine,
    gradoviSaStatusomGradaUFBiH: GradoviFederacijeBiH,
    gradoviSaStatusomGradaURepubliciSrpskoj: GradoviRepublikeSrpske,
    naziviKojiNisuGradoviUBosniIHercegovini: [...NaziviKojiNisuGradoviUBiH],

    // REČNIK SINONIMA: Sve verzije usmeravamo na jedan glavni pojam radi lakšeg bodovanja
    alijasi: {
        drzava: {
            "BAHAME": "BAHAMI",
            "BIH": "BOSNA I HERCEGOVINA",
            "DOMINIKANA": "DOMINIKANSKA REPUBLIKA",
            "KIRGIZIJA": "KIRGISTAN",
            "SAO TOME I PRINCIPE": "SAO TOME I PRINSIPE",
            "SAD": "SJEDINJENE AMERIČKE DRŽAVE",
            "TURKMENIJA": "TURKMENISTAN",
            "UAE": "UJEDINJENI ARAPSKI EMIRATI",
            "MJANMAR": "MIJANMAR",
            "PORTUGAL": "PORTUGALIJA"
        },
        grad: {
            "MEKSIKO SITI": "MEKSIKO",
            "PANAMA SITI": "PANAMA",
            "GVATEMALA SITI": "GVATEMALA",
            "KUVAJT SITI": "KUVAJT",
            "LUKSEMBURG SITI": "LUKSEMBURG",
            "WASHINGTON": "VAŠINGTON",
            "ST PETERBURG": "SANKT PETERBURG",
            "SVETI PETARBURG": "SANKT PETERBURG",
            "DEN HAG": "HAG",
            "THE HAGUE": "HAG",
            "VIENNA": "BEČ",
            "MÜNCHEN": "MINHEN",
            "ZURICH": "CIRIH",
            "FRANKFURT NA MAJNI": "FRANKFURT",
            "BUJE": "BUJE-BUIE",
            "POREČ": "POREČ-PARENZO",
            "PULA": "PULA-POLA",
            "ROVINJ": "ROVINJ-ROVIGNO",
            "UMAG": "UMAG-UMAGO",
            "VODNJAN": "VODNJAN-DIGNANO",
            "SKOPJE": "SKOPLJE",
            "BITOLA": "BITOLJ",
            "STIP": "ŠTIP",
            "SHTIP": "ŠTIP",
            "KOCANI": "KOČANI",
            "KOCHANI": "KOČANI",
            "KICEVO": "KIČEVO",
            "KICHEVO": "KIČEVO",
            "RADOVIS": "RADOVIŠ",
            "RADOVISH": "RADOVIŠ",
            "PROBISTIP": "PROBIŠTIP",
            "PROBISHTIP": "PROBIŠTIP",
            "DELCEVO": "DELČEVO",
            "DELCHEVO": "DELČEVO",
            "NIKSIC": "NIKŠIĆ",
            "BIJELOPOLJE": "BIJELO POLJE",
            "BELO POLJE": "BIJELO POLJE",
            "HERCEGNOVI": "HERCEG NOVI",
            "ROZAJE": "ROŽAJE",
            "KOPER": "KOPAR",
            "BANJALUKA": "BANJA LUKA",
            "BIHAC": "BIHAĆ",
            "CAPLJINA": "ČAPLJINA",
            "GORAZDE": "GORAŽDE",
            "GRACANICA": "GRAČANICA",
            "GRADACAC": "GRADAČAC",
            "LJUBUSKI": "LJUBUŠKI",
            "ORASJE": "ORAŠJE",
            "SIROKI BRIJEG": "ŠIROKI BRIJEG",
            "ZAVIDOVICI": "ZAVIDOVIĆI",
            "ZIVINICE": "ŽIVINICE",
            "ISTOCNO SARAJEVO": "ISTOČNO SARAJEVO",
            "LAKTASI": "LAKTAŠI",
            "GRADISKA": "GRADIŠKA",
            "TESLIC": "TESLIĆ"
        },
        reka: {
            "HOANGHO": "ŽUTA REKA",
            "HUANGHE": "ŽUTA REKA",
            "JANGCEKJANG": "JANGCE",
            "ELBA": "LABA"
        },
        planina: {
            "CRNI VRH (ISTOČNA SRBIJA)": "CRNI VRH",
            "CRNI VRH (JAGODINA)": "CRNI VRH",
            "CRNI VRH (PRIBOJ)": "CRNI VRH",
            "EVEREST": "MONT EVEREST",
            "MAUNT EVEREST": "MONT EVEREST",
            "MT EVEREST": "MONT EVEREST"
        },
        biljka: {
            "MENTA": "NANA",
            "RAJČICA": "PARADAJZ", 
            "MRKVA": "ŠARGAREPA",
            "GRAH": "PASULJ",
            "KAPULA": "LUK",
            "KROMPIRI": "KROMPIR",
            "KUKURUZA": "KUKURUZ",
            "KIKIRIK": "KIKIRIKI",
            "PATLIĐAN": "PATLIDŽAN",
            "CVIKLA": "CVEKLA",
            "KARFIJOL": "KARFIOL",
            "RUŽMARIN": "RUZMARIN",
            "OREGANO": "ORIGANO"
        },
        zivotinja: {
            "KER": "PAS",
            "KUČE": "PAS",
            "MACA": "MAČKA",
            "GUDIN": "SVINJA",
            "PRASAC": "SVINJA",
            "KOKA": "KOKOŠKA",
            "SLEPI MIŠ": "ŠIŠMIŠ",
            "KLOKAN": "KENGUR",
            "MORSKI PAS": "AJKULA",
            "TULJAN": "FOKA",
            "MEDVJED": "MEDVED",
            "ŽOHAR": "BUBAŠVABA",
            "MEČKA": "MEDVED",
            "PES": "PAS"
        },
        predmet: {
            "MOBILNI": "TELEFON",
            "KOMPJUTER": "RAČUNAR",
            "TV": "TELEVIZOR",
            "DEKA": "ĆEBE",
            "ŠALICA": "ŠOLJA"
        }
    },

    // Pomaže da se unos na ćirilici prebaci u latinicu pre same provere
    presloviULatinicu: function(tekst) {
        const mapa = {
            "А":"A", "Б":"B", "В":"V", "Г":"G", "Д":"D", "Ђ":"Đ", "Е":"E", "Ж":"Ž", 
            "З":"Z", "И":"I", "Ј":"J", "К":"K", "Л":"L", "Љ":"LJ", "М":"M", "Н":"N", 
            "Њ":"NJ", "О":"O", "П":"P", "Р":"R", "С":"S", "Т":"T", "Ћ":"Ć", "У":"U", 
            "Ф":"F", "Х":"H", "Ц":"C", "Ч":"Č", "Џ":"DŽ", "Ш":"Š"
        };
        return tekst.split('').map(char => mapa[char] || char).join('');
    },

    /**
     * Oblik za poređenje bez dijakritika. Tako unos bez kvačica može proći za
     * odgovarajuće slovo (npr. C za Č, S za Š, Dz za Dž), ali se pri bodovanju
     * uvek vraća izvorni kanonski naziv.
     */
    normalizujBezDijakritika: function(tekst) {
        return this.presloviULatinicu(tekst.trim().toUpperCase())
            .replace(/DŽ/g, "DZ")
            .replace(/Đ/g, "DJ")
            .replace(/[ČĆ]/g, "C")
            .replace(/Š/g, "S")
            .replace(/Ž/g, "Z");
    },

    /**
     * Algoritam za računanje broja grešaka (Damerau-Levenshtein distance)
     */
    izracunajUdaljenost: function(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        let matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // zamena
                        matrix[i][j - 1] + 1,     // ubacivanje
                        matrix[i - 1][j] + 1      // brisanje
                    );
                    // Provera za permutaciju (zamena mesta za dva susedna slova)
                    if (i > 1 && j > 1 && b.charAt(i - 1) === a.charAt(j - 2) && b.charAt(i - 2) === a.charAt(j - 1)) {
                        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
                    }
                }
            }
        }
        return matrix[b.length][a.length];
    },

    /**
     * Traži reč u bazi uz toleranciju na greške u kucanju
     */
    pronadjiPojamUBazi: function(kategorija, unetaRec, zadatoSlovo) {
        let rec = this.presloviULatinicu(unetaRec.trim().toUpperCase());
        let slovo = this.presloviULatinicu(zadatoSlovo.toUpperCase());
        let normalizovanaRec = this.normalizujBezDijakritika(rec);
        let normalizovanoSlovo = this.normalizujBezDijakritika(slovo);

        // Početno slovo mora biti tačno, uz toleranciju na izostavljene dijakritike
        // (npr. Cacak je prihvatljiv odgovor za zadato slovo Č, ali AEOGRAD nije za B).
        if (!normalizovanaRec.startsWith(normalizovanoSlovo)) {
            return null;
        }

        // Pravilo za Sloveniju, Crnu Goru i BiH: isključeni administrativni nazivi ne mogu proći ni
        // preko tolerantnog poređenja sa istoimenim ili sličnim gradom iz druge države.
        if (kategorija === "grad" && (
            NaziviKojiNisuGradoviUSloveniji.has(rec) ||
            NaziviKojiNisuGradoviUCrnojGori.has(rec) ||
            NaziviKojiNisuGradoviUBiH.has(rec)
        )) {
            return null;
        }

        // 1. Direktna provera (Glavni niz)
        if (this.reci[kategorija] && this.reci[kategorija].includes(rec)) {
            return rec;
        }

        // 2. Direktna provera (Alijasi)
        if (this.alijasi[kategorija] && this.alijasi[kategorija].hasOwnProperty(rec)) {
            return rec;
        }

        // 3. Direktna provera bez dijakritika, za ekavski/ijekavski i regionalne tastature.
        if (this.reci[kategorija]) {
            let pojamBezDijakritika = this.reci[kategorija].find(bazaRec => (
                this.normalizujBezDijakritika(bazaRec) === normalizovanaRec
            ));
            if (pojamBezDijakritika) {
                return pojamBezDijakritika;
            }
        }

        if (this.alijasi[kategorija]) {
            let alijasBezDijakritika = Object.keys(this.alijasi[kategorija]).find(alijas => (
                this.normalizujBezDijakritika(alijas) === normalizovanaRec
            ));
            if (alijasBezDijakritika) {
                return alijasBezDijakritika;
            }
        }

        // 4. Tolerancija na greške (Fuzzy search)
        let najboljiKandidat = null;
        let najmanjaUdaljenost = Infinity;

        // Dinamička tolerancija na osnovu dužine reči
        let dozvoljenaUdaljenost = 0;
        if (rec.length >= 5 && rec.length <= 7) dozvoljenaUdaljenost = 1;
        if (rec.length > 7) dozvoljenaUdaljenost = 2;

        if (dozvoljenaUdaljenost > 0) {
            // Provera u glavnom nizu
            if (this.reci[kategorija]) {
                for (let i = 0; i < this.reci[kategorija].length; i++) {
                    let bazaRec = this.reci[kategorija][i];
                    if (bazaRec.startsWith(slovo)) {
                        
                        // OPTIMIZACIJA: Preskoči reči sa prevelikom razlikom u dužini
                        if (Math.abs(rec.length - bazaRec.length) > dozvoljenaUdaljenost) {
                            continue;
                        }

                        let udaljenost = this.izracunajUdaljenost(rec, bazaRec);
                        if (udaljenost <= dozvoljenaUdaljenost && udaljenost < najmanjaUdaljenost) {
                            najmanjaUdaljenost = udaljenost;
                            najboljiKandidat = bazaRec;
                        }
                    }
                }
            }
            
            // Provera u alijasima
            if (this.alijasi[kategorija]) {
                for (let alijas in this.alijasi[kategorija]) {
                    if (alijas.startsWith(slovo)) {
                        
                        // OPTIMIZACIJA ZA ALIJASE: Preskoči reči sa prevelikom razlikom u dužini
                        if (Math.abs(rec.length - alijas.length) > dozvoljenaUdaljenost) {
                            continue;
                        }

                        let udaljenost = this.izracunajUdaljenost(rec, alijas);
                        if (udaljenost <= dozvoljenaUdaljenost && udaljenost < najmanjaUdaljenost) {
                            najmanjaUdaljenost = udaljenost;
                            najboljiKandidat = alijas;
                        }
                    }
                }
            }
        }

        return najboljiKandidat; // Vraća ispravljenu reč ili null
    },

    /**
     * Proverava da li je uneta reč tačna i da li počinje pravim slovom
     */
    proveriPojam: function(kategorija, unetaRec, zadatoSlovo) {
        if (!unetaRec) return false;
        let pronadjeno = this.pronadjiPojamUBazi(kategorija, unetaRec, zadatoSlovo);
        return pronadjeno !== null;
    },

    /**
     * Vraća standardizovan naziv pojma za potrebe BODOVANJA.
     */
    standardizujPojam: function(kategorija, unetaRec, zadatoSlovo) {
        if (!unetaRec) return "";
        
        let pravaRec = this.pronadjiPojamUBazi(kategorija, unetaRec, zadatoSlovo);
        
        if (pravaRec) {
            // Ako je pronađena reč zapravo alijas, vrati njen glavni pojam radi bodovanja
            if (this.alijasi[kategorija] && this.alijasi[kategorija][pravaRec]) {
                return this.alijasi[kategorija][pravaRec];
            }
            return pravaRec;
        }
        
        return this.presloviULatinicu(unetaRec.trim().toUpperCase());
    }
};

// Export (ako se koristi u Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BazaPodataka;
}
