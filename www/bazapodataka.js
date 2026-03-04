// bazapodataka.js - Služi isključivo za proveru tačnosti pojmova

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
            "URUGVAJ", "UZBEKISTAN", "VANUATU", "VELIKA BRITANIJA", "VELS", "VENECUELA", 
            "VIJETNAM", "ZAMBIJA", "ZELENORTSKA OSTRVA", "ZIMBABVE"
        ],
        grad: [
            "ABIDŽAN", "ABU DABI", "ABUDŽA", "ADELEJD", "ADIS ABEBA", "AKRA", "ALEKSANDRIJA", 
            "ALMATI", "ALŽIR", "AMAN", "AMSTERDAM", "ANDORA LA VELJA", "ANKARA", "ANTANANARIVO", 
            "ANTALIJA", "ANTVERPEN", "APIJA", "ARHUS", "ARILJE", "ASMARA", "ASTANA", "ASUNSION", 
            "ATINA", "ATLANTA", "AŠHABAD", "BAGDAD", "BAKU", "BALTIMOR", "BAMAKO", "BANDAR SERI BEGAVAN", 
            "BANDŽUL", "BANGI", "BANGKOK", "BARI", "BARSELONA", "BASTER", "BAZEL", "BEIRA", "BEJRUT", 
            "BELMOPAN", "BENGUELA", "BENIN SITI", "BEOGRAD", "BERGEN", "BERLIN", "BERN", "BEČ", "BILBAO", 
            "BIRMINGEM", "BISAU", "BIŠKEK", "BIZERTA", "BLANTAJER", "BOGOTA", "BOLONJA", "BORDO", "BOSTON", 
            "BRATISLAVA", "BRAŠOV", "BRAZAVIL", "BRAZILIJA", "BREMEN", "BRIDŽTAUN", "BRISEL", "BRIZBEJN", 
            "BRNO", "BUDIMPEŠTA", "BUDŽUMBURA", "BUENOS AJRES", "BUKUREŠT", "BULAVAJO", "BURGAS", "CIRIH", 
            "ČAČAK", "ČENAJ", "ČIKAGO", "ĆUPRIJA", "DABLIN", "DAKA", "DAKAR", "DALAS", "DAMASK", "DAR ES SALAM", 
            "DENVER", "DETROIT", "DILI", "DIR DAUA", "DISELDORF", "DODOMA", "DOHA", "DORTMUND", "DREZDEN", 
            "DUALA", "DUBAI", "DUBROVNIK", "DURBAN", "DUŠANBE", "ĐAKOVICA", "ĐENOVA", "DŽAKARTA", "DŽEDA", 
            "DŽIBA", "DŽIBUTI", "DŽORDŽTAUN", "DŽUBA", "EDINBURG", "EDMONTON", "ENUGU", "FILADELFIJA", 
            "FINIKS", "FIRENCA", "FRANKFURT", "FREETOWN", "FRITAUN", "FUNAFUTI", "GABORONE", "GETEBORG", 
            "GITEGA", "GIZA", "GLAZGOV", "GRAC", "GUANGDŽOU", "GVADALAHARA", "GVATEMALA", "HAG", "HAIFA", 
            "HAMBURG", "HANOJ", "HANOVER", "HARARE", "HARKOV", "HAVANA", "HELSINKI", "HJUSTON", "HONGKONG", 
            "HONIJARA", "HURGADA", "IBADAN", "INĐIJA", "INZBRUK", "ISLAMABAD", "JAMUSUKRO", "JAREN", "JAUNDE", 
            "JEKATERINBURG", "JEREVAN", "JERUSALIM", "JOHANESBURG", "JOKOHAMA", "JUŽNA TARAVA", "KABUL", 
            "KAIRO", "KALI", "KALKUTA", "KAMPALA", "KANBERA", "KANO", "KARAČI", "KARAKAS", "KARTUM", "KASABLANKA", 
            "KASTRI", "KATMANDU", "KAZABLANKA", "KAZANJ", "KEJPTAUN", "KELGARI", "KELN", "KIGALI", "KIJEV", 
            "KINGSTAUN", "KINGSTON", "KINŠASA", "KISANGANI", "KITO", "KIŠINJEV", "KJOTO", "KLUŽ-NAPOKA", 
            "KOLOMBO", "KONAKRI", "KOPENHAGEN", "KORDOBA", "KRAGUJEVAC", "KRAKOV", "KRUŠEVAC", "KUALA LUMPUR", 
            "KUMASI", "KUVAJT", "LA PAZ", "LAGOS", "LAHOR", "LAJPCIG", "LAVOV", "LESKOVAC", "LIBERVIL", "LIDZ", 
            "LIL", "LILONGVE", "LIMA", "LINC", "LION", "LISABON", "LIVERPUL", "LJUBLJANA", "LOME", "LONDON", 
            "LOS ANĐELES", "LOZANA", "LUANDA", "LUBUMBAŠI", "LUCERN", "LUKSEMBURG", "LUSAKA", "MADRID", 
            "MADŽURO", "MAJAMI", "MAKAO", "MALABO", "MALE", "MALME", "MANAGVA", "MANAMA", "MANČESTER", 
            "MANILA", "MAPUTO", "MARAKEŠ", "MARSELJ", "MASERU", "MASKAT", "MBABANE", "MBARE", "MEDELJIN", 
            "MEDINA", "MEKA", "MEKSIKO", "MELBURN", "MILANO", "MINHEN", "MINSK", "MOGADIŠ", "MOMBASA", 
            "MONAKO", "MONROVIJA", "MONTEREJ", "MONTEVIDEO", "MONTREAL", "MORONI", "MOSKVA", "MOSTAR", 
            "MUMBAJ", "NAJROBI", "NANT", "NAPULJ", "NASAU", "NDŽAMENA", "NEJPJIDO", "NGERULMUD", "NICA", 
            "NIJAMEJ", "NIKOZIJA", "NIRNBERG", "NIŠ", "NIŽNJI NOVGOROD", "NOVI PAZAR", "NOVI SAD", "NJU DELHI", 
            "NJU ORLEANS", "NJUJORK", "NUAKŠOT", "NUKUALOFA", "ODESA", "OKLAND", "ORAN", "ORLANDO", "OSAKA", 
            "OSLO", "OTAVA", "PALERMO", "PALIKIR", "PANAMA", "PARAMARIBO", "PARIZ", "PEKING", "PERT", "PJONGJANG", 
            "PLOVDIV", "PNOM PEN", "PODGORICA", "PORT ELIZABET", "PORT HARUKURT", "PORT LUJ", "PORT MORZBI", 
            "PORT O PRENS", "PORT OV SPEJN", "PORT VILA", "PORTLAND", "PORTO", "PORTO NOVO", "PRAG", "PRAJA", 
            "PRETORIJA", "PRIŠTINA", "PRIZREN", "RABAT", "REJKJAVIK", "RIGA", "RIJAD", "RIM", "RIO DE ŽANEIRO", 
            "ROSARIO", "ROTERDAM", "ROZO", "SALCBURG", "SALI", "SAN HOSE", "SAN MARINO", "SAN SALVADOR", "SANA", 
            "SANKT PETERBURG", "SANTIJAGO", "SANTO DOMINGO", "SAO PAULO", "SAO TOME", "SAPORO", "SARAJEVO", 
            "SENT DŽONS", "SENT DŽORDŽIZ", "SEUL", "SEVILJA", "SIDNEJ", "SIJETL", "SINGAPUR", "SKOPLJE", 
            "SMEDEREVO", "SOFIJA", "SOLUN", "SOMBOR", "SPLIT", "STOKHOLM", "STRAZBUR", "SUBOTICA", "SUEC", 
            "SUVA", "ŠABAC", "ŠANGAJ", "ŠEFILD", "ŠENŽEN", "ŠRI DŽAJAVARDENEPURA KOTE", "ŠTUTGART", "TALIN", 
            "TAMAŠET", "TAMPERE", "TANGER", "TAŠKENT", "TBILISI", "TEGUSIGALPA", "TEHERAN", "TEL AVIV", 
            "TEMIŠVAR", "TETUAN", "TIMBU", "TIRANA", "TOKIO", "TORINO", "TORONTO", "TRIPOLI", "TRONDHAJM", 
            "TULUZ", "TUNIS", "UAGADUGU", "ULAN BATOR", "UŽICE", "VADUC", "VALENSIJA", "VALETA", "VANKUVER", 
            "VARNA", "VARŠAVA", "VATIKAN", "VAŠINGTON", "VELINGTON", "VENECIJA", "VERONA", "VIJENTIJAN", 
            "VIKTORIJA", "VILNJUS", "VINDHUK", "VROCLAV", "ZADAR", "ZAGREB", "ZAJEČAR", "ZANZIBAR", "ZRENJANIN", 
            "ŽENEVA"
        ],
        reka: [
            "AMAZON", "AMU DARJA", "AMUR", "ARAKS", "ARKANZAS", "BANI", "BELI NIL", "BENUE", "BOJANA", "BOSNA", 
            "BRAMAPUTRA", "CETINA", "CRNI TIMOK", "DARLING", "DNJEPAR", "DNJESTAR", "DON", "DRAVA", "DRIM", 
            "DRINA", "DUERO", "DUNAV", "ĐETINJA", "EBRO", "ELBA", "EUFRAT", "GAMBIJA", "GANG", 
            "GARONA", "GVADALKIVIR", "GVADIJANA", "HADSON", "HOANGHO", "HUANGHE", "IBAR", "IND", "IRAVADI", 
            "ISKAR", "JADAR", "JANGCE", "JANGCEKJANG", "JASENICA", "JENISEJ", "JORDAN", "JUBA", "JUKON", 
            "JUŽNA MORAVA", "KAMA", "KASAI", "KAVANGO", "KOLORADO", "KOLUBARA", "KOLUMBIJA", "KONGO", "KRKA", 
            "KUPA", "KWANZA", "KWILU", "LABA", "LENA", "LIM", "LIMPOPO", "LOGON", "LOMAMI", "LOARA", "LUALABA", 
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
            "DELI JOVAN", "DENALI", "DEVICA", "DINARIDI", "DRACENSKE PLANINE", "DREŽNIK GRADINA", "DRMANOVINA", 
            "DUKAT", "DŽUMAJKA", "ELBRUS", "ELGON", "EMSI KUSI", "ERTA ALE", "ETNA", "EVEREST", "FRUŠKA GORA", 
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
            "TIBESTI", "TILVA NJAGRA", "TJAN ŠAN", "TRESIBABA", "TROGLAV", "TUBCAL", "TUPIŽNICA", "URAL", 
            "VARDENIK", "VELIKI GREBEN", "VELIKI JASTREBAC", "VELIKI KRŠ", "VENČAC", "VEZUV", "VIDLIČ", "VIDOJEVICA", 
            "VIRUNGA", "VLAŠIĆ", "VLAŠKA PLANINA", "VRŠAČKE PLANINE", "VUJAN", "ZLATAR", "ZLATIBOR", 
            "ZVIJEZDA", "ŽELJIN", "ŽILINDAR"
        ],
        biljka: [
            "AGAVA", "ALOJA", "AMARANT", "ANANAS", "ARIŠ", "ARONIJA", "AVOKADO", "BADEM", "BAGREM", 
            "BAMBUS", "BANANA", "BLITVA", "BOKVICA", "BOR", "BORANIJA", "BOROVNICA", "BOSILJAK", "BOŽUR", 
            "BRESKVA", "BREZA", "BROKOLI", "BRŠLJAN", "BUKVA", "BUNDEVA", "CELER", "CIKLAMA", "CVEKLA", 
            "ČAJ", "ČEMPRES", "ČIČAK", "ČUVARKUĆA", "DETELINA", "DINJA", "DUD", "DUNJA", "ĐUMBIR", 
            "ĐURĐEVAK", "EUKALIPTUS", "FIKUS", "GERBER", "GINKO", "GLADIOLA", "GRAB", "GRAŠAK", 
            "GREJPFRUT", "GROŽĐE", "HAJDUČKA TRAVA", "HMELJ", "HORTENZIJA", "HRAST", "HRIZANTEMA", 
            "JABUKA", "JAGODA", "JASEN", "JAVOR", "JEČAM", "JELA", "KADIFA", "KAFA", "KAJSIJA", "KAKAO", 
            "KAKTUS", "KAMILICA", "KARANFIL", "KARFIOL", "KEDAR", "KELJ", "KESTEN", "KIKIRIKI", "KIVI", 
            "KLEKA", "KOPRIVA", "KRASTAVAC", "KROMPIR", "KRUŠKA", "KUKURUZ", "KUPINA", "KUPUS", "LALA", 
            "LAVANDA", "LEŠNIK", "LIMUN", "LIPA", "LOKVANJ", "LOVOR", "LOZA", "LUBENICA", "LUK", 
            "LJILJAN", "LJUBIČICA", "LJUTIĆ", "MAHOVINA", "MAK", "MALINA", "MANDARINA", "MANGO", 
            "MASLAČAK", "MASLINA", "MATIČNJAK", "MENTA", "MUŠKATLA", "NANA", "NARCIS", "NEVEN", "ORAH", 
            "ORHIDEJA", "OSKORUŠA", "OVAS", "PAMUK", "PAPRAT", "PAPRIKA", "PARADAJZ", "PASULJ", 
            "PATLIDŽAN", "PELIN", "PERŠUN", "PIRINAČ", "POMORANDŽA", "PRAZILUK", "PŠENICA", "RAŽ", 
            "RIBIZLA", "ROGAČ", "ROTKVICA", "RUKOLA", "RUZMARIN", "RUŽA", "SALATA", "SMILJE", "SMOKVA", 
            "SMRČA", "SOČIVO", "SOJA", "SPANAĆ", "SUNCOKRET", "SUSAM", "ŠAFRAN", "ŠARGAREPA", "ŠEBOJ", 
            "ŠLJIVA", "ŠPARGLA", "TIKVICA", "TIMIJAN", "TISA", "TOPOLA", "TREŠNJA", "TRNJINA", "TRSKA", 
            "URMA", "VISIBABA", "VIŠNJA", "VLAŠAC", "VRBA", "ZOVA", "ZUMBUL", "ŽALFIJA", "ŽITO"
        ],
        zivotinja: [
            "AFRIČKI SLON", "AJE-AJE", "AJKULA", "ALIGATOR", "ALPAKA", "ANAKONDA", "ANTILOPA", "ARA", 
            "BABUN", "BAKALAR", "BIK", "BIVOL", "BIZON", "BOGOMOLJKA", "BONOBO", "BUBAMARA", "BUBANŠVABA", 
            "BUMBAR", "BUVA", "CRV", "CVRČAK", "ČAKALJ", "ČAPLJA", "ČAVKA", "ČINČILA", "ĆUK", "ĆURAN", "ĆURKA", 
            "DABAR", "DELFIN", "DETLIĆ", "DINGO", "DINOSAURUS", "DODO", "ĐAVO", "EMU", "FAZAN", 
            "FENEK", "FLAMINGO", "FOKA", "GALEB", "GAVRAN", "GELADA", "GEPARD", "GERENUK", "GNU", 
            "GOLUB", "GORILA", "GRLICA", "GUSKA", "GUŠTER", "HAMELEON", "HIJENA", "HOBOTNICA", "HRČAK", 
            "IGUANA", "IMPALA", "INDRI", "IRVAS", "JAGUAR", "JASTREB", "JAZAVAC", "JAZAVAC MEDOŽDER", "JEGULJA", 
            "JELEN", "JEŽ", "KAKADU", "KAMELEON", "KAMILA", "KANARINAC", "KAPSKI BIVO", 
            "KENGUR", "KIT", "KOBRA", "KOJOT", "KOKOŠKA", "KOMARAC", "KONJ", "KORNJAČA", "KOS", "KOZA", "KRAVA", 
            "KROKODIL", "KRTICA", "KUDU", "KUDU ANTILOPA", "KUNA", "LABUD", "LAMA", "LASICA", "LASTAVICA", "LAV", 
            "LEMUR", "LENJIVAC", "LEOPARD", "LEPTIR", "LIGNJA", "LISICA", "LJUSKAVAC", "LOS", "LOSOS", "MAČKA", 
            "MAGARAC", "MAJMUN", "MAMBA", "MANDRIL", "MARABU", "MEDVED", "MEDUZA", "MERKAT", "MIŠ", "MORSKA KRAVA", 
            "MORŽ", "MRAV", "MRAVOJED", "MUNGOS", "MUVA", "NILSKI KONJ", "NILSKI KROKODIL", 
            "NOJ", "NOSOROG", "NJORKA", "OKAPI", "ORANGUTAN", "ORAO", "ORIKS", "ORKA", "OSA", "OVAN", "OVCA", 
            "PANDA", "PANGOLIN", "PANTER", "PAPAGAJ", "PAS", "PASTRMKA", "PATKA", "PAUK", "PAUN", "PČELA", 
            "PELIKAN", "PETAO", "PINGVIN", "PIRANA", "PREPELICA", "PUMA", "PUSTINJSKA LISICA", "PUŽ", "RAK", 
            "RAKUN", "RIS", "ROVČICA", "SERVAL", "SLON", "SOKO", "SOM", "SOVA", "SRNA", "SRNDAĆ", "STEPSKI SKOČIMIŠ", 
            "STRŠLJEN", "SURIKATA", "SVINJA", "SVRAKA", "ŠAKAL", "ŠARAN", "ŠIMPANZA", "ŠIŠMIŠ", "ŠKORPIJA", 
            "TAPIR", "TIGAR", "TUKAN", "TVOR", "VEPAR", "VEVERICA", "VIDRA", "VILIN KONJIC", "VO", "VODENI BIVO", 
            "VRABAC", "VRANA", "VUK", "ZEC", "ZEBRA", "ZMIJA", "ŽABA", "ŽDRAL", "ŽIRAFA"
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
            "SREBRO", "SREDSTVO", "SRMA", "STAKLO", "STALAK", "STANIOL", "STAP", "STAZA", "STATIV", "STATUA", "STEPENICE", 
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
            "TRENERKA", "TREZOR", "TRIBINA", "TRICIKL", "TRIMER", "TROK", "TROLEJBUS", "TROMBON", "TRONOŽAC", "TROTINET", 
            "TRUBA", "TRUP", "TUBA", "TURBAN", "TURPIJA", "TUŠ", "TUŠ KABINA", "UDICA", "UDŽBENIK", "UGLJOMER", "UKRAS", 
            "ULOŽAK", "UMIVAONIK", "UNIFORMA", "UPALJAČ", "UPRTAČ", "UPUT", "URAM", "UREĐAJ", "USISIVAČ", "USTAV", 
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
            "FRANKFURT NA MAJNI": "FRANKFURT"
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
            "PARADAJZ": "RAJČICA", 
            "ŠARGAREPA": "MRKVA",
            "PASULJ": "GRAH"
        },
        zivotinja: {
            "KER": "PAS",
            "KUČE": "PAS",
            "MACA": "MAČKA",
            "GUDIN": "SVINJA",
            "PRASAC": "SVINJA",
            "KOKA": "KOKOŠKA"
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

        // Početno slovo mora biti tačno (npr. ne može igrač za slovo B kucati AEOGRAD)
        if (!rec.startsWith(slovo)) {
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

        // 3. Tolerancija na greške (Fuzzy search)
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