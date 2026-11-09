-- Rattachement des éditions déjà au catalogue à leur série (après
-- 20261108120000_event_series.sql). 65 séries repérées par le nom sans
-- l'année, plus trois éditions renommées rattachées par leur URL
-- (#4099 Desertus 2027, #4120 TCR No13, #3929 Les Géants Ultra Race 2027),
-- puis 20 séries et 3 rattachements qui touchent des fiches non vérifiées.
-- Ne touche que les fiches sans série : rejouable, et ne défait pas une
-- correction faite entre-temps dans /admin.
update public.events set serie = 'atlas-mountain-race' where id in (10, 1519, 4102) and serie is null;
update public.events set serie = 'b-hard-ultra-race-brevet' where id in (3231, 4140) and serie is null;
update public.events set serie = 'badlands' where id in (52, 3342, 4106) and serie is null;
update public.events set serie = 'basajaun' where id in (40, 3290) and serie is null;
update public.events set serie = 'beyond-borders' where id in (1538, 3852) and serie is null;
update public.events set serie = 'bicisberg' where id in (3167, 5066) and serie is null;
update public.events set serie = 'bikingman-alpes-maritimes' where id in (3222, 3919) and serie is null;
update public.events set serie = 'bikingman-aura' where id in (1350, 3223) and serie is null;
update public.events set serie = 'bikingman-corsica' where id in (3221, 3885) and serie is null;
update public.events set serie = 'bohemian-border-bash-race' where id in (1417, 3206) and serie is null;
update public.events set serie = 'bordeaux-saint-malo' where id in (3211, 3851) and serie is null;
update public.events set serie = 'cosmos' where id in (14, 4100) and serie is null;
update public.events set serie = 'dead-ends-dolci' where id in (1464, 3340) and serie is null;
update public.events set serie = 'desertus-bikus' where id in (1502, 1503, 4099) and serie is null;
update public.events set serie = 'deux-monts-et-puy' where id in (3168, 5070) and serie is null;
update public.events set serie = 'el-piri' where id in (1421, 3762) and serie is null;
update public.events set serie = 'elevation-vercors' where id in (24, 3347, 5060) and serie is null;
update public.events set serie = 'french-road' where id in (15, 1527) and serie is null;
update public.events set serie = 'granguanche-audax-gravel' where id in (8, 4113) and serie is null;
update public.events set serie = 'granguanche-audax-road' where id in (2, 1490, 4111) and serie is null;
update public.events set serie = 'granguanche-audax-trail' where id in (9, 4114) and serie is null;
update public.events set serie = 'graval-road' where id in (3173, 4138) and serie is null;
update public.events set serie = 'gravel-tro-breizh' where id in (3176, 3849) and serie is null;
update public.events set serie = 'gravelman-marseille' where id in (1, 3257) and serie is null;
update public.events set serie = 'gtb-series-spring' where id in (3177, 4098) and serie is null;
update public.events set serie = 'half-to-peak' where id in (1523, 3180) and serie is null;
update public.events set serie = 'heading-southwest' where id in (3227, 3730) and serie is null;
update public.events set serie = 'hellenic-mountain-race' where id in (11, 3202, 4103) and serie is null;
update public.events set serie = 'istra-land' where id in (3771, 4108) and serie is null;
update public.events set serie = 'kromvojoj' where id in (3234, 4016) and serie is null;
update public.events set serie = 'l-ardechoise' where id in (3608, 4143) and serie is null;
update public.events set serie = 'l-echappee-michelin-paris-clermont' where id in (1422, 3729) and serie is null;
update public.events set serie = 'l-estive' where id in (3170, 5071) and serie is null;
update public.events set serie = 'l-ultr-arverne' where id in (1518, 3247) and serie is null;
update public.events set serie = 'l-ultr-aveyronnaise' where id in (3292, 4137) and serie is null;
update public.events set serie = 'la-cinque-terre' where id in (1388, 3293, 4096) and serie is null;
update public.events set serie = 'la-costaud-e' where id in (1872, 3210) and serie is null;
update public.events set serie = 'la-grande-bifurkade' where id in (3209, 4136) and serie is null;
update public.events set serie = 'la-peripherie' where id in (3304, 4133) and serie is null;
update public.events set serie = 'les-geants-ultra-cycling-challenge' where id in (1389, 3296, 3929) and serie is null;
update public.events set serie = 'lost-dot-101' where id in (3195, 4118) and serie is null;
update public.events set serie = 'lyon-geneve-ultra-night-ride' where id in (3249, 4157) and serie is null;
update public.events set serie = 'marseille-napoli' where id in (1537, 3187) and serie is null;
update public.events set serie = 'northcape-4000' where id in (3307, 4123) and serie is null;
update public.events set serie = 'pan-celtic-ultra' where id in (3305, 4131) and serie is null;
update public.events set serie = 'paris-roubaix-cyclotourisme' where id in (3480, 3865) and serie is null;
update public.events set serie = 'paris-souillac' where id in (3169, 5067) and serie is null;
update public.events set serie = 'pyrenean-rally' where id in (3225, 4112) and serie is null;
update public.events set serie = 'race-across-benelux' where id in (3216, 3843) and serie is null;
update public.events set serie = 'race-across-france' where id in (3215, 3912) and serie is null;
update public.events set serie = 'road-tro-breizh' where id in (3178, 4097) and serie is null;
update public.events set serie = 'seven-serpents-quick-bite' where id in (3723, 4134) and serie is null;
update public.events set serie = 'silk-road-mountain-race' where id in (12, 3203) and serie is null;
update public.events set serie = 'the-bright-midnight' where id in (27, 3198, 4110) and serie is null;
update public.events set serie = 'the-grand-escape-italie-slovenie' where id in (3212, 4126) and serie is null;
update public.events set serie = 'the-grand-escape-toscane' where id in (3214, 4127) and serie is null;
update public.events set serie = 'the-traka' where id in (3232, 3980) and serie is null;
update public.events set serie = 'three-peaks-bike-race' where id in (1526, 3291, 4104) and serie is null;
update public.events set serie = 'trans-balkan-race' where id in (3233, 4105) and serie is null;
update public.events set serie = 'transcontinental-race-tcr' where id in (1364, 3196, 4120) and serie is null;
update public.events set serie = 'transiberica' where id in (49, 3288) and serie is null;
update public.events set serie = 'transpyrenees' where id in (23, 3287) and serie is null;
update public.events set serie = 'tuscany-trail' where id in (3201, 4125) and serie is null;
update public.events set serie = 'ultraia' where id in (3191, 4101) and serie is null;
update public.events set serie = 'zone64' where id in (3184, 3728) and serie is null;

-- Fiches non vérifiées (leurs récits ne s'affichent qu'une fois la fiche vérifiée).
-- Rejoignent une série ci-dessus :
update public.events set serie = 'granguanche-audax-trail' where id in (1488) and serie is null;
update public.events set serie = 'istra-land' where id in (63) and serie is null;
update public.events set serie = 'bikingman-alpes-maritimes' where id in (1293) and serie is null;
-- Nouvelles séries (une édition vérifiée ou non + une autre) :
update public.events set serie = 'montenegro-mountain-madness' where id in (25, 4107) and serie is null;
update public.events set serie = 'mother-north' where id in (42, 3199) and serie is null;
update public.events set serie = 'race-across-switzerland' where id in (46, 3217) and serie is null;
update public.events set serie = 'dead-ends-cake' where id in (1285, 4117) and serie is null;
update public.events set serie = 'the-goats' where id in (1290, 3725) and serie is null;
update public.events set serie = 'ride-across-girona' where id in (1401, 3717) and serie is null;
update public.events set serie = 'graval-bikepacking-adventure' where id in (1481, 3174) and serie is null;
update public.events set serie = 'northcape-tarifa-bike-race' where id in (1497, 4076) and serie is null;
update public.events set serie = 'brm-400-bocage-et-volcans' where id in (1510, 3653) and serie is null;
update public.events set serie = 'super-brevet-scandinavia' where id in (1781, 4077) and serie is null;
update public.events set serie = 'seven-serpents-illyrian-loop' where id in (1793, 3724) and serie is null;
update public.events set serie = 'munich-milan-gravel' where id in (1821, 3716) and serie is null;
update public.events set serie = 'le-tour-du-lot-feminin' where id in (1841, 3171) and serie is null;
update public.events set serie = 'pommes-de-terre-breizhees' where id in (1857, 3099) and serie is null;
update public.events set serie = 'dodecaudax-200-km-aout' where id in (1858, 3655) and serie is null;
update public.events set serie = 'ardeche-endurance-challenge' where id in (1861, 3297) and serie is null;
update public.events set serie = 'dodecaudax-200-km-septembre' where id in (1864, 3673) and serie is null;
update public.events set serie = 'ultra-nuit-des-fruits' where id in (1865, 3674) and serie is null;
update public.events set serie = 'brevet-actc-200-km' where id in (1867, 3691) and serie is null;
update public.events set serie = 'dodecaudax-200-km-octobre' where id in (1869, 3697) and serie is null;
