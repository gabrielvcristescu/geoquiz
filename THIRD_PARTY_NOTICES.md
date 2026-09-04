# Third-party notices

GeoQuiz folosește date și resurse externe pentru cartografie și reprezentarea steagurilor. Logica aplicației este proprie proiectului.

## Natural Earth

GeoQuiz include local:

- `Admin 0 – Countries`, scara 1:50m;
- `Admin 0 – Breakaway, disputed areas`, scara 1:50m.

Fișierele din proiect:

- `data/ne_50m_admin_0_countries.geojson`;
- `data/ne_50m_admin_0_breakaway_disputed_areas.geojson`.

Aceste GeoJSON-uri au fost convertite din arhivele shapefile oficiale Natural Earth 1:50m. Natural Earth pune datele sale în domeniul public.

GeoQuiz folosește identificatorii numerici ONU/ISO pentru a lega geometria de datele locale despre țări. Dacă geometria Natural Earth nu poate fi citită, aplicația poate folosi `data/map-data.js` ca hartă de rezervă.

Natural Earth descrie setul implicit Admin 0 ca fiind orientat în general spre situația de facto. GeoQuiz nu urmărește să exprime o poziție politică asupra teritoriilor disputate; stratul dedicat zonelor disputate este suprapus neutru în interfață.

## Flag Icons

Steagurile SVG plate din `assets/flags/` provin din proiectul **Flag Icons 7.5.0** (`lipis/flag-icons`).

Copyright (c) 2013 Panayiotis Lipiridis.

Flag Icons este distribuit sub **MIT License**. Textul integral al licenței furnizate de proiect este inclus în:

`assets/flags/LICENSE-flag-icons.txt`

GeoQuiz folosește variantele 4:3 și păstrează fișierele local pentru funcționarea offline.
