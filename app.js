"use strict";

const POLITICAL_PALETTE = [
  "#f4caca", // somon foarte deschis
  "#c9dcf2", // albastru foarte deschis
  "#d2e8ca", // verde foarte deschis
  "#f6e6ae", // galben foarte deschis
  "#ddd0f0", // violet foarte deschis
  "#efcde1", // roz foarte deschis
  "#c9e8e4"  // turcoaz foarte deschis
];
const CONTEXT_LAND_COLOR = "#dfe4e9";
const NEUTRAL_TERRITORY_COLOR = CONTEXT_LAND_COLOR;
const OCEAN_COLOR = "#dbeefa";
const NEUTRAL_TERRITORY_IDS = new Set(["383", "732"]); // Kosovo, Sahara Occidentală
const NATURAL_EARTH_50M_URL = "data/ne_50m_admin_0_countries.geojson";
const NATURAL_EARTH_DISPUTED_50M_URL = "data/ne_50m_admin_0_breakaway_disputed_areas.geojson";
const MAP_SOURCE_LABEL_50M = "Natural Earth 1:50m";
const MICRO_MARKER_RADIUS = 3;
const MICRO_MARKER_HITBOX_RADIUS = 11;
// În Oceania unele state/teritorii sunt arhipelaguri foarte întinse sau trec
// peste meridianul de 180°. Poligonul real poate produce linii lungi urâte
// în SVG; pentru ele folosim doar marcajul cartografic verificat.
const MARKER_ONLY_BY_REGION = {
  Oceania: new Set(["16", "162", "166", "184", "258", "296", "316", "520", "570", "574", "580", "581", "583", "584", "585", "612", "772", "776", "798", "876", "882"])
};
const OBSERVER_IDS = new Set(["275", "336"]); // Palestina și Vatican
const PROFILE_LABELS = {
  school: "Atlas școlar",
  un: "ONU – 193 de state membre",
  observers: "ONU + două state observatoare",
  iso: "ISO 3166 – țări și teritorii"
};
const CONTINENT_RO = {
  Africa: "Africa",
  NorthAmerica: "America de Nord",
  SouthAmerica: "America de Sud",
  Asia: "Asia",
  Europe: "Europa",
  Oceania: "Oceania"
};
const VIEW_CONFIG = {
  all: {projection: "naturalEarth", lonMin: -180, lonMax: 180, latMin: -89.5, latMax: 90, padding: 12, fit: "frame"},

  // Regiunile sunt cadre geografice, nu măști de continent. Țările care intră
  // firesc în cadru, dar nu aparțin regiunii active, rămân vizibile în gri.
  // Europa este păstrată aproape identic cu versiunea 1.4.8, unde cadrul era reușit.
  Europe: {projection: "naturalEarth", lonMin: -22, lonMax: 72, latMin: 31, latMax: 72, padding: 9, fit: "frame", yShift: 14},
  Asia: {projection: "naturalEarth", lonMin: -18, lonMax: 212, latMin: -20, latMax: 82, padding: 10, fit: "frame", wrapCenter: 100, yShift: 3},
  Africa: {projection: "naturalEarth", lonMin: -30, lonMax: 112, latMin: -40, latMax: 60, padding: 10, fit: "frame", yShift: 1},
  NorthAmerica: {projection: "naturalEarth", lonMin: -182, lonMax: -25, latMin: -12, latMax: 86, padding: 10, fit: "frame", wrapCenter: -108, yShift: 3},
  SouthAmerica: {projection: "naturalEarth", lonMin: -96, lonMax: 28, latMin: -60, latMax: 23, padding: 10, fit: "frame", yShift: 1},
  Oceania: {projection: "naturalEarth", lonMin: 68, lonMax: 205, latMin: -52, latMax: 24, padding: 9, fit: "frame", wrapCenter: 145, yShift: 3}
};

// Statele transcontinentale sunt active în ambele vederi relevante. Geometria
// completă este păstrată, iar cadrul fiecărei hărți afișează doar partea vizibilă.
const TRANS_CONTINENTAL_REGIONS = {
  "643": ["Europe", "Asia"], // Rusia
  "792": ["Europe", "Asia"], // Turcia
  "398": ["Europe", "Asia"], // Kazahstan
  "196": ["Europe", "Asia"], // Cipru
  "268": ["Europe", "Asia"], // Georgia
  "51": ["Europe", "Asia"],  // Armenia
  "31": ["Europe", "Asia"]   // Azerbaidjan
};

// În profilurile ONU, teritoriile dependente sunt colorate cu aceeași culoare
// ca statul suveran, fără a deveni răspunsuri separate.
const SOVEREIGN_PARENT_IDS = {
  "304": "208", "234": "208",
  "254": "250", "312": "250", "474": "250", "638": "250", "175": "250",
  "540": "250", "258": "250", "666": "250", "652": "250", "663": "250", "260": "250",
  "630": "840", "850": "840", "16": "840", "316": "840", "580": "840", "581": "840",
  "238": "826", "292": "826", "136": "826", "92": "826", "660": "826", "500": "826",
  "796": "826", "654": "826", "239": "826", "612": "826", "86": "826", "60": "826",
  "832": "826", "831": "826", "833": "826",
  "248": "246", "744": "578", "74": "578",
  "533": "528", "531": "528", "534": "528", "535": "528",
  "162": "36", "166": "36", "334": "36", "574": "36",
  "344": "156", "446": "156",
  "184": "554", "570": "554", "772": "554"
};

// Unele seturi Natural Earth păstrează teritoriul de peste mări în aceeași
// geometrie cu statul suveran (de exemplu Guyana Franceză în geometria Franței).
const SOVEREIGN_OVERSEAS_REGIONS = {
  "250": ["SouthAmerica"]
};



// Excluderi minime de vizibilitate regională. Păstrăm obiectul chiar când
// majoritatea regiunilor nu au excluderi, deoarece displayedFeatures() îl
// consultă la fiecare desenare.
const REGION_VISIBILITY_EXCLUDE = {
  Europe: new Set(["304"]), // Groenlanda nu se desenează în vederea Europei
  Asia: new Set([]),
  Africa: new Set([]),
  NorthAmerica: new Set([]),
  SouthAmerica: new Set([]),
  Oceania: new Set([])
};

// Contextul regional se stabilește geometric, fără liste manuale de vecini.

const SPECIAL_INFO = {
  "304": "Groenlanda — teritoriu autonom în Regatul Danemarcei; nu este răspuns separat în profilul curent.",
  "732": "Sahara Occidentală — teritoriu neautonom cu statut disputat; este desenată separat de Maroc.",
  "383": "Kosovo — statut și recunoaștere internațională contestate; nu este stat membru ONU.",
  "158": "Taiwan — nu este stat membru ONU; devine selectabil în profilul ISO 3166.",
  "275": "Statul Palestina — stat observator nemembru al ONU.",
  "336": "Vatican — stat observator nemembru al ONU."
};

let countryData = {};
let dataReady = false;
let dataLoadError = null;
let geoReady = false;
let worldTopology = null;
let worldFeatures = [];
let disputedFeatures = [];
let featureById = new Map();
let markerCoordinates = new Map();
let politicalColors = {};
let selContinent = "all";
let mapProfile = "school";
let clickQs = [], clickIdx = 0, clickScore = 0, clickStreak = 0;
let timerInterval = null, timeLeft = 30, answered = false;
let sessionScore = 0, totalAns = 0, totalOk = 0;
let matchPairs = [], matchDone = 0, matchScore = 0;
let dragId = null, dragEl = null, selectedCapitalId = null;
let flagPairs = [], flagDone = 0, flagScore = 0;
let flagDragId = null, flagDragEl = null, selectedFlagId = null;
let lb = [];
let prog = {};
try { lb = JSON.parse(localStorage.getItem("gq_lb130") || "[]"); } catch (_) {}
try { prog = JSON.parse(localStorage.getItem("gq_prog130") || "{}"); } catch (_) {}

function normalizeId(value) {
  if (value === null || value === undefined || value === "") return "";
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? String(parsed) : String(value);
}

function safeText(value, fallback = "—") {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ") || fallback;
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function flagEmojiFromCode(cca2) {
  const code = String(cca2 || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  return [...code].map(char => String.fromCodePoint(127397 + char.charCodeAt(0))).join("");
}

function localFlagUrl(cca2) {
  const code = String(cca2 || "").toLowerCase();
  return /^[a-z]{2}$/.test(code) ? `assets/flags/${code}.svg` : "";
}

function showFlagImage(img, emoji, country) {
  const fallback = country.flag_emoji || flagEmojiFromCode(country.iso2);
  const src = localFlagUrl(country.iso2);

  img.onload = () => {
    img.hidden = false;
    img.style.display = "block";
    emoji.style.display = "none";
  };
  img.onerror = () => {
    img.hidden = true;
    img.style.display = "none";
    emoji.style.display = "block";
    emoji.textContent = fallback;
  };

  img.hidden = true;
  img.style.display = "none";
  emoji.style.display = "none";
  img.alt = `Drapelul ${country.name_ro}`;
  emoji.setAttribute("aria-label", `Drapelul ${country.name_ro}`);

  if (src) img.src = src;
  else img.onerror();
}

function fmtPop(n) {
  const value = Number(n) || 0;
  if (value >= 1e9) return (value / 1e9).toFixed(1).replace(".", ",") + " mld.";
  if (value >= 1e6) return (value / 1e6).toFixed(1).replace(".", ",") + " mil.";
  if (value >= 1e3) return Math.round(value / 1e3).toLocaleString("ro-RO") + " mii";
  return value ? value.toLocaleString("ro-RO") : "—";
}

function fmtArea(n) {
  const value = Number(n) || 0;
  return value ? value.toLocaleString("ro-RO") + " km²" : "—";
}

async function ensureData() {
  if (dataReady) return;
  const status = document.getElementById("data-status");
  if (!window.GEOQUIZ_COUNTRIES || typeof window.GEOQUIZ_COUNTRIES !== "object") {
    dataLoadError = new Error("Fișierul local data/countries-data.js lipsește sau nu a putut fi citit.");
    if (status) status.textContent = dataLoadError.message;
    throw dataLoadError;
  }
  countryData = window.GEOQUIZ_COUNTRIES;
  const unCount = Object.values(countryData).filter(country => country.un_member === true).length;
  if (unCount !== 193) console.warn(`GeoQuiz: setul local conține ${unCount} state membre ONU, nu 193.`);
  if (status) status.textContent = `Date locale încărcate: ${unCount} de state membre ONU. Aplicația poate funcționa offline.`;
  dataReady = true;
  updateProfileInfo();
}

async function fetchNaturalEarth50m() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(NATURAL_EARTH_50M_URL, {signal: controller.signal, cache: "force-cache"});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const geojson = await response.json();
    if (!geojson || !Array.isArray(geojson.features) || geojson.features.length < 200) {
      throw new Error("GeoJSON incomplet");
    }
    return geojson.features;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchNaturalEarthDisputed50m() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(NATURAL_EARTH_DISPUTED_50M_URL, {signal: controller.signal, cache: "force-cache"});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const geojson = await response.json();
    if (!geojson || !Array.isArray(geojson.features)) throw new Error("GeoJSON disputat incomplet");
    return geojson.features.filter(feature => feature?.geometry).map((feature, index) => ({
      type: "Feature",
      id: `disputed-${index}`,
      properties: {
        name: feature.properties?.BRK_NAME || feature.properties?.NAME_EN || feature.properties?.NAME || "Zonă disputată",
        type: feature.properties?.TYPE || feature.properties?.featurecla || "Disputed"
      },
      geometry: feature.geometry
    }));
  } finally {
    clearTimeout(timer);
  }
}

function naturalEarthNumericId(properties = {}) {
  const candidates = [properties.UN_A3, properties.ISO_N3, properties.ISO_N3_EH];
  for (const candidate of candidates) {
    const text = String(candidate ?? "").trim();
    if (/^\d{1,3}$/.test(text)) return String(Number.parseInt(text, 10));
  }
  return "";
}

function installMapFeatures(features, sourceLabel) {
  worldFeatures = features.filter(feature => feature?.geometry && feature.id).map(feature => ({
    type: "Feature",
    id: normalizeId(feature.id),
    properties: {
      name: feature.properties?.name || "",
      color: Number(feature.properties?.color) || 0,
      source: sourceLabel
    },
    geometry: feature.geometry
  }));

  // Natural Earth rămâne sursa principală. Dacă un ID folosit de GeoQuiz nu
  // există în conversia Natural Earth, completăm numai acea entitate din setul
  // local. Astfel un stat nu poate dispărea din quiz din cauza diferențelor de
  // identificatori dintre seturile cartografice.
  const presentIds = new Set(worldFeatures.map(feature => feature.id));
  for (const local of (window.GEOQUIZ_MAP?.features || [])) {
    const id = normalizeId(local.id);
    if (!id || presentIds.has(id) || !local.geometry) continue;
    worldFeatures.push({
      type: "Feature",
      id,
      properties: {
        name: local.name || local.properties?.name || "",
        color: Number(local.color ?? local.properties?.color) || 0,
        source: "harta locală de completare"
      },
      geometry: local.geometry
    });
    presentIds.add(id);
  }

  featureById = new Map(worldFeatures.filter(feature => feature.id).map(feature => [feature.id, feature]));
  politicalColors = {};
  for (const feature of worldFeatures) {
    politicalColors[feature.id] = POLITICAL_PALETTE[feature.properties.color % POLITICAL_PALETTE.length];
  }
  for (const id of markerCoordinates.keys()) {
    if (!politicalColors[id]) {
      const seed = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
      politicalColors[id] = POLITICAL_PALETTE[seed % POLITICAL_PALETTE.length];
    }
  }
}

function installDisputedFeatures(rawFeatures) {
  const source = Array.isArray(rawFeatures) ? rawFeatures : [];
  disputedFeatures = source.filter(feature => feature?.geometry).map((feature, index) => ({
    type: "Feature",
    id: `disputed-${index}`,
    properties: {
      name: feature.properties?.BRK_NAME || feature.properties?.NAME_EN || feature.properties?.NAME || "Zonă disputată",
      type: feature.properties?.TYPE || feature.properties?.featurecla || "Disputed"
    },
    geometry: feature.geometry
  }));
}

async function ensureGeo() {
  if (geoReady) return;
  if (!window.GEOQUIZ_MAP || !Array.isArray(window.GEOQUIZ_MAP.features)) {
    throw new Error("Fișierul local data/map-data.js lipsește sau nu a putut fi citit.");
  }

  // Punctele pentru microstate și insule rămân locale, astfel încât jocul
  // să poată folosi aceleași hitbox-uri chiar când schimbăm geometria hărții.
  markerCoordinates = new Map(Object.entries(window.GEOQUIZ_MAP.points || {}).map(([id, point]) => [normalizeId(id), point]));

  // Zonele disputate sunt independente de sursa hărții principale. Dacă
  // pachetul local disputed-data.js este prezent, îl instalăm imediat; astfel
  // stratul nu dispare când browserul folosește harta locală de rezervă.
  const embeddedDisputed = Array.isArray(window.GEOQUIZ_DISPUTED_FEATURES)
    ? window.GEOQUIZ_DISPUTED_FEATURES
    : null;
  if (embeddedDisputed) {
    installDisputedFeatures(embeddedDisputed);
  } else {
    try {
      installDisputedFeatures(await fetchNaturalEarthDisputed50m());
    } catch (disputedError) {
      disputedFeatures = [];
      console.warn("GeoQuiz: stratul Natural Earth pentru zone disputate nu a putut fi încărcat.", disputedError);
    }
  }

  let sourceLabel = "harta locală de rezervă";
  try {
    const remoteFeatures = await fetchNaturalEarth50m();
    const converted = remoteFeatures.map(item => {
      const props = item.properties || {};
      const name = props.NAME_RO || props.NAME_EN || props.NAME || props.ADMIN || "";
      let id = naturalEarthNumericId(props);
      // Natural Earth păstrează Somaliland ca unitate cartografică separată,
      // dar fără un cod numeric ONU/ISO utilizabil de baza GeoQuiz. Îl păstrăm
      // ca geometrie neutră de context, fără să devină răspuns în quiz.
      if (!id && String(name).toLowerCase() === "somaliland") id = "x-somaliland";
      return {
        id,
        properties: {
          name,
          color: Number(props.MAPCOLOR7 || props.MAPCOLOR9 || 0)
        },
        geometry: item.geometry
      };
    }).filter(item => item.id);
    installMapFeatures(converted, MAP_SOURCE_LABEL_50M);
    sourceLabel = MAP_SOURCE_LABEL_50M;
  } catch (error) {
    console.warn("GeoQuiz: fișierul local Natural Earth 1:50m nu a putut fi încărcat; folosesc harta de rezervă.", error);
    const localFeatures = window.GEOQUIZ_MAP.features.map(item => ({
      id: normalizeId(item.id),
      properties: {name: item.name || "", color: Number(item.color) || 0},
      geometry: item.geometry
    }));
    installMapFeatures(localFeatures, sourceLabel);
  }

  geoReady = true;
  const status = document.getElementById("data-status");
  if (status && dataReady) {
    const unCount = Object.values(countryData).filter(country => country.un_member === true).length;
    status.textContent = `Date locale: ${unCount} de state membre ONU · hartă: ${sourceLabel}.`;
  }
  updateProfileInfo();
}

function isCountryInProfile(country) {
  if (!country) return false;
  if (NEUTRAL_TERRITORY_IDS.has(country.id)) return false;
  if (mapProfile === "school") return country.un_member === true;
  if (mapProfile === "un") return country.un_member === true;
  if (mapProfile === "observers") return country.un_member === true || country.un_observer === true;
  return country.iso_status === "officially-assigned";
}

function byId(id) {
  return countryData[normalizeId(id)];
}

function countryRegionKey(country) {
  if (!country) return "";
  if (country.region_code !== "019") return country.region_key;
  return country.subregion_code === "005" ? "SouthAmerica" : "NorthAmerica";
}

function countryRegions(country) {
  if (!country) return [];
  const explicit = TRANS_CONTINENTAL_REGIONS[country.id];
  return explicit ? [...explicit] : [countryRegionKey(country)];
}

function countryInRegion(country, region = selContinent) {
  return region === "all" || countryRegions(country).includes(region);
}

function getPool() {
  return Object.values(countryData)
    .filter(isCountryInProfile)
    .filter(country => countryInRegion(country))
    .filter(country => featureById.has(country.id) || markerCoordinates.has(country.id))
    .sort((a, b) => a.name_ro.localeCompare(b.name_ro, "ro"));
}

function profileCountryCount() {
  return Object.values(countryData).filter(isCountryInProfile).filter(c => featureById.size === 0 || featureById.has(c.id) || markerCoordinates.has(c.id)).length;
}

function changeProfile(value) {
  mapProfile = value;
  updateProfileInfo();
}

function updateProfileInfo() {
  const info = document.getElementById("profile-info");
  if (!info) return;
  const count = dataReady ? profileCountryCount() : "…";
  const notes = {
    school: "Sunt folosite statele membre ONU. Teritoriile cu statut contestat sunt afișate neutru și nu sunt răspunsuri separate.",
    un: "Sunt selectabile cele 193 de state membre ale Organizației Națiunilor Unite.",
    observers: "Include cele 193 de state membre ONU, plus Statul Palestina și Vaticanul ca state observatoare.",
    iso: "Include țările și teritoriile cu cod ISO 3166 disponibile în setul cartografic. Zonele cu statut contestat rămân afișate neutru."
  };
  info.innerHTML = `<strong>${PROFILE_LABELS[mapProfile]}</strong> · ${count} entități selectabile.<br>${notes[mapProfile]}`;
}

function selCont(continent, button) {
  selContinent = continent;
  document.querySelectorAll(".cbtn").forEach(b => b.classList.remove("active"));
  button.classList.add("active");
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(screen => screen.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function home() {
  clearInterval(timerInterval);
  showScreen("s-home");
}

function fillCard(country) {
  const img = document.getElementById("card-flag-img");
  const emoji = document.getElementById("card-flag-emoji");
  showFlagImage(img, emoji, country);
  document.getElementById("card-name").textContent = country.name_ro;
  document.getElementById("card-capital").textContent = safeText(country.capital);
  document.getElementById("card-pop").textContent = fmtPop(country.population);
  document.getElementById("card-area").textContent = fmtArea(country.area);
  document.getElementById("card-lang").textContent = safeText(country.languages);
  document.getElementById("card-currency").textContent = safeText(country.currency);
  document.getElementById("card-region").textContent = safeText(country.subregion_name_ro);
}

const SVG_NS = "http://www.w3.org/2000/svg";

function svgElement(tag, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value !== null && value !== undefined) element.setAttribute(name, String(value));
  }
  return element;
}

function displayedFeatures(continent = selContinent) {
  // Antarctica rămâne vizibilă pe glob. În hărțile regionale păstrăm toate
  // geometriile în memorie pentru filtrare, dar desenăm numai țările active,
  // teritoriile dependente relevante și teritoriile neutre ale regiunii.
  const exclude = REGION_VISIBILITY_EXCLUDE[continent] || new Set();
  return worldFeatures.filter(feature => !exclude.has(normalizeId(feature.id)));
}

function forEachGeometryCoordinate(geometry, callback) {
  if (!geometry) return;
  const visit = value => {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
      callback(value);
      return;
    }
    for (const child of value) visit(child);
  };
  visit(geometry.coordinates);
}

function naturalEarthRaw(lon, lat) {
  const lambda = lon * Math.PI / 180;
  const phi = Math.max(-89.999, Math.min(89.999, lat)) * Math.PI / 180;
  const phi2 = phi * phi;
  const phi4 = phi2 * phi2;
  return [
    lambda * (0.8707 - 0.131979 * phi2 + phi4 * phi4 * phi2 * (phi4 * (0.003971 * phi2 - 0.001529 * phi4) - 0.013791)),
    phi * (1.007226 + phi2 * (0.015085 + phi4 * (-0.044475 + 0.028874 * phi2 - 0.005916 * phi4)))
  ];
}

function mercatorRaw(lon, lat) {
  const lambda = lon * Math.PI / 180;
  const phi = Math.max(-85, Math.min(85, lat)) * Math.PI / 180;
  return [lambda, Math.log(Math.tan((Math.PI / 2 + phi) / 2))];
}

function orthographicRaw(lon, lat, config) {
  const lambda = lon * Math.PI / 180;
  const phi = Math.max(-89.999, Math.min(89.999, lat)) * Math.PI / 180;
  const lambda0 = (config.centerLon || 0) * Math.PI / 180;
  const phi0 = (config.centerLat || 0) * Math.PI / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const cosPhi0 = Math.cos(phi0);
  const sinPhi0 = Math.sin(phi0);
  const dLambda = lambda - lambda0;
  const visible = sinPhi0 * sinPhi + cosPhi0 * cosPhi * Math.cos(dLambda);
  if (visible < -1e-6) return [NaN, NaN];
  return [
    cosPhi * Math.sin(dLambda),
    cosPhi0 * sinPhi - sinPhi0 * cosPhi * Math.cos(dLambda)
  ];
}


function buildProjection(continent) {
  const W = 960, H = 500;
  const baseConfig = VIEW_CONFIG[continent || "all"] || VIEW_CONFIG.all;
  const config = {...baseConfig, autoViewport: (continent || "all") !== "all"};
  const padding = config.padding || 16;
  const center = config.wrapCenter ?? ((config.lonMin + config.lonMax) / 2);

  const normalizeLongitude = lon => {
    if (config.wrapCenter === undefined) return lon;
    let value = lon;
    while (value - center > 180) value -= 360;
    while (value - center < -180) value += 360;
    return value;
  };
  const rawProjectionUnwrapped = (lon, lat) => {
    if (config.projection === "orthographic") return orthographicRaw(lon, lat, config);
    if (config.projection === "naturalEarth") return naturalEarthRaw(lon, lat);
    return mercatorRaw(lon, lat);
  };
  const rawProjection = (lon, lat) => rawProjectionUnwrapped(normalizeLongitude(lon), lat);
  const coordinateInsideSeed = coordinate => {
    if ((continent || "all") === "all") return true;
    const lon = normalizeLongitude(coordinate[0]);
    const lat = coordinate[1];
    return lon >= baseConfig.lonMin && lon <= baseConfig.lonMax
      && lat >= baseConfig.latMin && lat <= baseConfig.latMax;
  };

  const samples = [];
  if ((continent || "all") !== "all") {
    // Încadrăm exclusiv continentul activ. Țările de context nu au voie să
    // schimbe zoom-ul sau centrul hărții.
    for (const feature of worldFeatures) {
      if (!featureIsSelectable(feature, continent)) continue;
      forEachGeometryCoordinate(feature.geometry, coordinate => {
        // Pentru state transcontinentale / cu teritorii îndepărtate folosim
        // cadrul de referință numai pentru a alege componenta relevantă.
        if (!coordinateInsideSeed(coordinate)) return;
        const projected = rawProjection(coordinate[0], coordinate[1]);
        if (projected.every(Number.isFinite)) samples.push(projected);
      });
    }
    // Microstatele și insulele active trebuie să participe și ele la fit.
    for (const country of Object.values(countryData)) {
      if (!isCountryInProfile(country) || !countryInRegion(country, continent)) continue;
      const point = markerCoordinates.get(country.id);
      if (!point || !coordinateInsideSeed(point)) continue;
      const projected = rawProjection(point[0], point[1]);
      if (projected.every(Number.isFinite)) samples.push(projected);
    }
  }

  // Harta mondială și eventualul fallback folosesc cadrul geografic complet.
  if (samples.length < 10) {
    const steps = 180;
    for (let index = 0; index <= steps; index += 1) {
      const t = index / steps;
      const lon = baseConfig.lonMin + (baseConfig.lonMax - baseConfig.lonMin) * t;
      const lat = baseConfig.latMin + (baseConfig.latMax - baseConfig.latMin) * t;
      samples.push(rawProjection(lon, baseConfig.latMin));
      samples.push(rawProjection(lon, baseConfig.latMax));
      samples.push(rawProjection(baseConfig.lonMin, lat));
      samples.push(rawProjection(baseConfig.lonMax, lat));
    }
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of samples) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const width = Math.max(1e-9, maxX - minX);
  const height = Math.max(1e-9, maxY - minY);
  const scale = Math.min((W - 2 * padding) / width, (H - 2 * padding) / height);
  const offsetX = (W - width * scale) / 2 - minX * scale;
  const offsetY = (H - height * scale) / 2 + maxY * scale + (config.yShift || 0);

  const project = coordinate => {
    const [x, y] = rawProjection(coordinate[0], coordinate[1]);
    return [x * scale + offsetX, offsetY - y * scale];
  };
  project.projectUnwrapped = (lon, lat) => {
    const [x, y] = rawProjectionUnwrapped(lon, lat);
    return [x * scale + offsetX, offsetY - y * scale];
  };
  project.normalizeLongitude = normalizeLongitude;
  project.scale = scale;
  project.config = config;
  project.width = W;
  project.height = H;
  project.clipRect = {x: 0, y: 0, width: W, height: H};
  project.pointInside = coordinate => {
    const [x, y] = project(coordinate);
    return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= W && y >= 0 && y <= H;
  };
  return project;
}

function longitudeForView(lon, config) {
  if (!config || config.wrapCenter === undefined) return lon;
  let value = lon;
  const center = config.wrapCenter;
  while (value - center > 180) value -= 360;
  while (value - center < -180) value += 360;
  return value;
}

function geometryPath(geometry, projection, featureId = "") {
  if (!geometry) return "";
  const config = projection.config || VIEW_CONFIG.all;
  const W = projection.width || 960;
  const H = projection.height || 500;

  const unwrapRing = ring => {
    if (!Array.isArray(ring) || ring.length < 3) return [];
    const result = [];
    let previousLon = null;
    for (const coordinate of ring) {
      if (!Array.isArray(coordinate) || coordinate.length < 2) continue;
      let lon = projection.normalizeLongitude
        ? projection.normalizeLongitude(coordinate[0])
        : longitudeForView(coordinate[0], config);
      const lat = coordinate[1];
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
      if (previousLon !== null) {
        while (lon - previousLon > 180) lon -= 360;
        while (lon - previousLon < -180) lon += 360;
      }
      result.push([lon, lat]);
      previousLon = lon;
    }
    return result;
  };

  const projectedCandidate = (ring, shift) => {
    const points = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [lon, lat] of ring) {
      const [x, y] = projection.projectUnwrapped
        ? projection.projectUnwrapped(lon + shift, lat)
        : projection([lon + shift, lat]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      points.push([x, y]);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    if (points.length < 3) return null;
    const ix0 = Math.max(0, minX), iy0 = Math.max(0, minY);
    const ix1 = Math.min(W, maxX), iy1 = Math.min(H, maxY);
    const intersection = Math.max(0, ix1 - ix0) * Math.max(0, iy1 - iy0);
    const centerDistance = Math.abs(((minX + maxX) / 2) - W / 2);
    return {points, minX, minY, maxX, maxY, intersection, centerDistance, shift};
  };

  const chooseShift = ring => {
    // Pe glob nu duplicăm geometria. În vederile regionale testăm copiile
    // vecine ale lumii și alegem componenta care cade cel mai bine în viewport.
    const shifts = (normalizeId(featureId) === "304")
      ? [0]
      : ((config.autoViewport && projection.projectUnwrapped)
        ? [-720, -360, 0, 360, 720]
        : [0]);
    const candidates = shifts.map(shift => projectedCandidate(ring, shift)).filter(Boolean);
    const visible = candidates.filter(c => c.maxX >= 0 && c.minX <= W && c.maxY >= 0 && c.minY <= H);
    const pool = visible.length ? visible : candidates;
    if (!pool.length) return null;
    pool.sort((a, b) => (b.intersection - a.intersection) || (a.centerDistance - b.centerDistance));
    return pool[0];
  };

  const ringPathWithShift = (ring, shift) => {
    const unwrapped = unwrapRing(ring);
    if (unwrapped.length < 3) return "";
    const commands = [];
    for (const [lon, lat] of unwrapped) {
      const [x, y] = projection.projectUnwrapped
        ? projection.projectUnwrapped(lon + shift, lat)
        : projection([lon + shift, lat]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      commands.push(`${commands.length ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return commands.length >= 3 ? commands.join("") + "Z" : "";
  };

  const polygonPath = polygon => {
    if (!Array.isArray(polygon) || !polygon.length) return "";
    const outer = unwrapRing(polygon[0]);
    const chosen = chooseShift(outer);
    if (!chosen) return "";
    // Dacă această componentă nu atinge deloc viewportul regional, nu o desenăm.
    if (config.autoViewport && !(chosen.maxX >= 0 && chosen.minX <= W && chosen.maxY >= 0 && chosen.minY <= H)) return "";

    // Caz special de antimeridian la latitudini extreme: unele componente
    // multipart pot fi proiectate ca o fâșie foarte lungă și foarte subțire
    // lipită de marginea de sus. Nu reprezintă o suprafață cartografică utilă,
    // ci o alegere greșită a copiei ±360° pentru acel inel.
    if (config.autoViewport) {
      const cw = chosen.maxX - chosen.minX;
      const ch = chosen.maxY - chosen.minY;
      // Componente arctice mutate pe copia greșită a lumii pot apărea ca
      // fâșii lungi și foarte subțiri lipite de marginea de sus. Sunt
      // artefacte de antimeridian, nu suprafețe geografice utile.
      const topSliver = chosen.minY < 58 && cw > 115 && ch < 34 && cw > ch * 4.8;
      if (topSliver) return "";
    }

    return polygon.map(ring => ringPathWithShift(ring, chosen.shift)).join("");
  };

  if (geometry.type === "Polygon") return polygonPath(geometry.coordinates);
  if (geometry.type === "MultiPolygon") return geometry.coordinates.map(polygonPath).join("");
  return "";
}

function geometryIntersectsViewport(geometry, projection) {
  if (!geometry) return false;
  const W = projection.width || 960;
  const H = projection.height || 500;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let anyInside = false;
  forEachGeometryCoordinate(geometry, coordinate => {
    const [x, y] = projection(coordinate);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    if (x >= 0 && x <= W && y >= 0 && y <= H) anyInside = true;
  });
  if (anyInside) return true;
  if (!Number.isFinite(minX)) return false;
  // Include și țările foarte mari a căror margine înconjoară viewportul,
  // chiar dacă niciun vârf nu cade exact în dreptunghi.
  return maxX >= 0 && minX <= W && maxY >= 0 && minY <= H;
}

// Pentru fundalul regional desenăm numai țări care încap integral în cadrul
// geografic ales. Dacă o țară din alt continent ar trebui tăiată la margine,
// o ascundem complet; este mai curat decât să apară fâșii sau tăieturi drepte.
function projectedBounds(feature, projection) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  forEachGeometryCoordinate(feature.geometry, coordinate => {
    const [x, y] = projection(coordinate);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  });
  return Number.isFinite(minX) ? [[minX, minY], [maxX, maxY]] : [[0, 0], [0, 0]];
}

function featureIsSelectable(feature, region = selContinent) {
  const country = byId(feature.id);
  return isCountryInProfile(country) && countryInRegion(country, region);
}

function featureIsNeutralTerritory(feature) {
  return NEUTRAL_TERRITORY_IDS.has(normalizeId(feature.id));
}

function baseCountryColor(id) {
  return politicalColors[normalizeId(id)] || CONTEXT_LAND_COLOR;
}

function featureFill(feature) {
  if (featureIsNeutralTerritory(feature)) return NEUTRAL_TERRITORY_COLOR;
  const id = normalizeId(feature.id);
  if (featureIsSelectable(feature)) return baseCountryColor(id);
  // În hărțile regionale Groenlanda este doar context geografic, nu extensia
  // colorată a Danemarcei. Pe glob păstrăm asocierea vizuală cu Danemarca.
  if (id === "304" && selContinent !== "all" && mapProfile !== "iso") return CONTEXT_LAND_COLOR;
  const parentId = SOVEREIGN_PARENT_IDS[id];
  if (parentId && mapProfile !== "iso") return baseCountryColor(parentId);
  if ((SOVEREIGN_OVERSEAS_REGIONS[id] || []).includes(selContinent)) return baseCountryColor(id);
  return CONTEXT_LAND_COLOR;
}

function featureTitle(feature) {
  const id = normalizeId(feature.id);
  if (SPECIAL_INFO[id]) return SPECIAL_INFO[id];
  const country = byId(id);
  if (country) {
    if (!isCountryInProfile(country)) {
      if (country.independent === false) {
        const parentId = SOVEREIGN_PARENT_IDS[id];
        const parent = parentId ? byId(parentId) : null;
        const relation = parent ? ` asociat ${parent.name_ro}` : "";
        return `${country.name_ro} — teritoriu dependent${relation}; nu este răspuns separat în profilul ${PROFILE_LABELS[mapProfile]}.`;
      }
      return `${country.name_ro} — nu face parte din profilul ${PROFILE_LABELS[mapProfile]}.`;
    }
    if (!countryInRegion(country)) return `${country.name_ro} — teritoriu vizibil pentru context, dar nu face parte din regiunea selectată.`;
    return country.name_ro;
  }
  return feature.properties?.name || "Entitate cartografică";
}

function territoryMessage(feature) {
  const id = normalizeId(feature.id);
  const feedback = document.getElementById("click-fb");
  feedback.className = "feedback info";
  feedback.textContent = SPECIAL_INFO[id] || featureTitle(feature);
}


function featureUsesMarkerOnly(feature, continent = selContinent) {
  const set = MARKER_ONLY_BY_REGION[continent];
  return Boolean(set && set.has(normalizeId(feature?.id)));
}

function markerCandidates(continent, projection) {
  const candidates = [];
  for (const country of Object.values(countryData)) {
    if (!isCountryInProfile(country) || !countryInRegion(country, continent || "all")) continue;
    const point = markerCoordinates.get(country.id);
    if (!point) continue;
    const feature = featureById.get(country.id);
    let needsMarker = !feature || featureUsesMarkerOnly(feature, continent) || Number(country.area || 0) < 10000;
    if (feature) {
      const bounds = projectedBounds(feature, projection);
      const width = Math.abs(bounds[1][0] - bounds[0][0]);
      const height = Math.abs(bounds[1][1] - bounds[0][1]);
      needsMarker = needsMarker || width < 10 || height < 10 || width * height < 90;
    }
    if (!needsMarker) continue;
    const projected = projection(point);
    if (projected.every(Number.isFinite) && projected[0] >= 0 && projected[0] <= 960 && projected[1] >= 0 && projected[1] <= 500) {
      candidates.push({feature: feature || {id: country.id, properties: {name: country.name_ro}, geometry: null}, point: projected});
    }
  }
  return candidates;
}

function attachContextTerritoryInteraction(element, feature) {
  const id = normalizeId(feature?.id);
  if (!SOVEREIGN_PARENT_IDS[id] || featureIsSelectable(feature)) return false;
  // Groenlanda rămâne context gri și neinteractiv în hărțile regionale.
  if (id === "304" && selContinent !== "all") return false;
  element.style.pointerEvents = "all";
  element.style.cursor = "help";
  element.setAttribute("tabindex", "0");
  element.setAttribute("role", "button");
  element.setAttribute("aria-label", featureTitle(feature));
  const showInfo = event => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    territoryMessage(feature);
  };
  element.addEventListener("click", showInfo);
  element.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") showInfo(event);
  });
  return true;
}

function attachMapInteraction(element, feature) {
  if (!featureIsSelectable(feature)) {
    element.style.pointerEvents = "none";
    return;
  }
  element.addEventListener("pointerdown", event => event.preventDefault());
  element.addEventListener("click", event => {
    if (event.detail > 0 && typeof element.blur === "function") element.blur();
    handleCountryClick(feature.id);
  });
  element.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleCountryClick(feature.id);
  });
}

async function loadMap(continent) {
  await Promise.all([ensureData(), ensureGeo()]);
  const W = 960, H = 500;
  const svg = document.getElementById("map");
  svg.replaceChildren();

  const projection = buildProjection(continent);
  const rect = projection.clipRect || {x: 0, y: 0, width: W, height: H};
  const defs = svgElement("defs");
  const clip = svgElement("clipPath", {id: "map-clip"});
  clip.append(svgElement("rect", {x: rect.x, y: rect.y, width: rect.width, height: rect.height, rx: 8}));
  defs.append(clip);
  svg.append(defs, svgElement("rect", {width: W, height: H, fill: OCEAN_COLOR}));

  const features = displayedFeatures(continent);
  const mapGroup = svgElement("g", {"clip-path": "url(#map-clip)"});
  svg.append(mapGroup);

  // Context geografic automat: orice țară din afara regiunii care intersectează
  // cadrul poate apărea discret în gri. Nu folosim liste manuale de vecini.
  // geometryPath() elimină segmentele anormal de lungi de la meridianul de
  // înfășurare, care produceau dungile peste Asia și America de Nord.
  const contextFeatures = features.filter(item =>
    !featureIsSelectable(item) &&
    !featureIsNeutralTerritory(item) &&
    ((continent || "all") === "all" || geometryIntersectsViewport(item.geometry, projection))
  );
  for (const feature of contextFeatures) {
    const pathData = geometryPath(feature.geometry, projection, feature.id);
    if (!pathData) continue;
    const contextPath = svgElement("path", {
      class: "country context", d: pathData, fill: featureFill(feature),
      "fill-rule": "evenodd", "pointer-events": "none",
      "aria-hidden": SOVEREIGN_PARENT_IDS[normalizeId(feature.id)] ? "false" : "true",
      "data-country-id": normalizeId(feature.id)
    });
    attachContextTerritoryInteraction(contextPath, feature);
    mapGroup.append(contextPath);
  }

  // Active countries are the only polygon elements that can receive input.
  for (const feature of features.filter(item => featureIsSelectable(item) && !featureIsNeutralTerritory(item) && !featureUsesMarkerOnly(item, continent))) {
    const pathData = geometryPath(feature.geometry, projection, feature.id);
    if (!pathData) continue;
    const path = svgElement("path", {
      class: "country active", d: pathData, id: `c${normalizeId(feature.id)}`,
      fill: featureFill(feature), "fill-rule": "evenodd", tabindex: 0,
      role: "button", "aria-label": featureTitle(feature), "data-country-id": normalizeId(feature.id)
    });
    attachMapInteraction(path, feature);
    mapGroup.append(path);
  }

  // Neutral territories use a quiet neutral fill. No hatch, no dashed outline,
  // no permanent label, and no duplicate overlay path.
  for (const feature of features.filter(feature => featureIsNeutralTerritory(feature) && ((continent || "all") === "all" || featureIsSelectable(feature, continent) || geometryIntersectsViewport(feature.geometry, projection)))) {
    const pathData = geometryPath(feature.geometry, projection, feature.id);
    if (!pathData) continue;
    const selectable = featureIsSelectable(feature);
    const path = svgElement("path", {
      class: `country neutral-territory ${selectable ? "active" : "context"}`,
      d: pathData, id: `c${normalizeId(feature.id)}`, fill: NEUTRAL_TERRITORY_COLOR,
      "fill-rule": "evenodd", tabindex: selectable ? 0 : -1,
      role: selectable ? "button" : "img", "aria-label": featureTitle(feature),
      "data-country-id": normalizeId(feature.id)
    });
    attachMapInteraction(path, feature);
    mapGroup.append(path);
  }

  // Strat experimental Natural Earth pentru zone disputate / breakaway.
  // Se desenează neutru peste harta de bază, fără interacțiune, astfel încât
  // aceeași regulă vizuală să se aplice tuturor disputelor disponibile în set.
  if (disputedFeatures.length) {
    const disputedGroup = svgElement("g", {class: "disputed-overlay", "pointer-events": "none", "aria-hidden": "true"});
    for (const feature of disputedFeatures) {
      if ((continent || "all") !== "all" && !geometryIntersectsViewport(feature.geometry, projection)) continue;
      const pathData = geometryPath(feature.geometry, projection, feature.id);
      if (!pathData) continue;
      disputedGroup.append(svgElement("path", {
        d: pathData,
        fill: "#d9dee4",
        stroke: "#9fa8b2",
        "stroke-width": "0.6",
        "vector-effect": "non-scaling-stroke",
        "fill-rule": "evenodd"
      }));
    }
    mapGroup.append(disputedGroup);
  }

  const markerGroup = svgElement("g", {class: "micro-markers"});
  mapGroup.append(markerGroup);
  const markerItems = markerCandidates(continent, projection);
  for (let markerIndex = 0; markerIndex < markerItems.length; markerIndex += 1) {
    const item = markerItems[markerIndex];
    const id = normalizeId(item.feature.id);
    let nearest = Infinity;
    for (let otherIndex = 0; otherIndex < markerItems.length; otherIndex += 1) {
      if (otherIndex === markerIndex) continue;
      const other = markerItems[otherIndex];
      const dx = item.point[0] - other.point[0];
      const dy = item.point[1] - other.point[1];
      nearest = Math.min(nearest, Math.hypot(dx, dy));
    }
    const hitRadius = Number.isFinite(nearest)
      ? Math.max(6, Math.min(MICRO_MARKER_HITBOX_RADIUS, nearest * 0.42))
      : MICRO_MARKER_HITBOX_RADIUS;
    const group = svgElement("g", {transform: `translate(${item.point[0]},${item.point[1]})`, class: "micro-marker-group"});
    const hitbox = svgElement("circle", {
      class: "micro-marker-hitbox", r: hitRadius.toFixed(2), fill: "#ffffff", "fill-opacity": "0.001",
      tabindex: -1, role: "button", "aria-label": featureTitle(item.feature), "data-country-id": id
    });
    hitbox.style.pointerEvents = "none";
    hitbox.addEventListener("pointerdown", event => event.preventDefault());
    hitbox.addEventListener("click", event => {
      if (hitbox.dataset.enabled !== "true") return;
      event.stopPropagation();
      handleCountryClick(id);
    });
    hitbox.addEventListener("keydown", event => {
      if (hitbox.dataset.enabled !== "true" || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault(); handleCountryClick(id);
    });
    const dot = svgElement("circle", {
      class: "micro-marker", id: `m${id}`, r: MICRO_MARKER_RADIUS,
      fill: baseCountryColor(id), "data-country-id": id, "pointer-events": "none"
    });
    group.append(hitbox, dot);
    markerGroup.append(group);
  }
  updateMapNote();
}

function updateMicroMarkerInteractivity(targetId = "") {
  const normalizedTarget = normalizeId(targetId);
  document.querySelectorAll(".micro-marker-group").forEach(group => {
    const hitbox = group.querySelector(".micro-marker-hitbox");
    const id = normalizeId(hitbox?.dataset.countryId);
    const feature = featureById.get(id) || {id};
    const enabled = Boolean(!answered && featureIsSelectable(feature));
    group.classList.toggle("target", Boolean(normalizedTarget && id === normalizedTarget));
    if (!hitbox) return;
    hitbox.dataset.enabled = enabled ? "true" : "false";
    hitbox.style.pointerEvents = enabled ? "all" : "none";
    hitbox.setAttribute("tabindex", enabled ? "0" : "-1");
  });
}

function updateMapNote() {
  const note = document.getElementById("map-note");
  if (!note) return;
  note.textContent = "";
  note.hidden = true;
}

function updateStateElement(selector, state, fill = null) {
  const element = document.querySelector(selector);
  if (!element) return;
  element.classList.remove("hit", "miss", "reveal");
  if (state) element.classList.add(state);
  if (fill !== null) element.setAttribute("fill", fill);
}

function setCountryState(id, state) {
  const normalized = normalizeId(id);
  updateStateElement(`#c${normalized}`, state);
  updateStateElement(`#m${normalized}`, state);
}

function restoreCountryState(id) {
  const normalized = normalizeId(id);
  const feature = featureById.get(normalized);
  updateStateElement(`#c${normalized}`, null, feature ? featureFill(feature) : CONTEXT_LAND_COLOR);
  updateStateElement(`#m${normalized}`, null, baseCountryColor(normalized));
}

function resetColors() {
  document.querySelectorAll(".country").forEach(element => {
    const feature = featureById.get(normalizeId(element.dataset.countryId));
    element.classList.remove("hit", "miss", "reveal");
    element.setAttribute("fill", feature ? featureFill(feature) : CONTEXT_LAND_COLOR);
  });
  document.querySelectorAll(".micro-marker").forEach(element => {
    element.classList.remove("hit", "miss", "reveal");
    element.setAttribute("fill", baseCountryColor(element.dataset.countryId));
  });
}

async function prepareGame() {
  const status = document.getElementById("data-status");
  try {
    await Promise.all([ensureData(), ensureGeo()]);
    return true;
  } catch (error) {
    if (status) status.textContent = error.message;
    console.error(error);
    return false;
  }
}

async function startClick() {
  if (!await prepareGame()) return;
  const pool = shuffle(getPool());
  if (!pool.length) {
    document.getElementById("data-status").textContent = "Nu există țări disponibile pentru selecția curentă.";
    return;
  }
  showScreen("s-click");
  clickQs = pool.slice(0, Math.min(15, pool.length));
  clickIdx = 0; clickScore = 0; clickStreak = 0; answered = false;
  document.getElementById("click-score").textContent = "0";
  await loadMap(selContinent);
  loadClickQ();
}

function loadClickQ() {
  if (clickIdx >= clickQs.length) { endClick(); return; }
  answered = false;
  timeLeft = 30;
  document.getElementById("click-fb").className = "feedback";
  document.getElementById("click-prog").style.width = (clickIdx / clickQs.length * 100) + "%";
  const question = clickQs[clickIdx];
  fillCard(question);
  resetColors();
  updateMicroMarkerInteractivity(question.id);
  clearInterval(timerInterval);
  document.getElementById("timer-disp").textContent = "30";
  timerInterval = setInterval(() => {
    timeLeft -= 1;
    document.getElementById("timer-disp").textContent = timeLeft;
    if (timeLeft <= 0) { clearInterval(timerInterval); if (!answered) timeoutClick(); }
  }, 1000);
}

function handleCountryClick(rawId) {
  const id = normalizeId(rawId);
  if (answered || !clickQs.length) return;
  const question = clickQs[clickIdx];
  if (id === question.id) {
    answered = true;
    updateMicroMarkerInteractivity();
    clearInterval(timerInterval);
    clickStreak += 1;
    const bonus = Math.max(1, Math.floor(timeLeft / 5));
    const points = 10 + bonus + (clickStreak > 2 ? 5 : 0);
    clickScore += points; sessionScore += points; totalOk += 1; totalAns += 1;
    updateProg(countryRegionKey(question), true);
    document.getElementById("click-score").textContent = clickScore;
    setCountryState(id, "hit");
    const feedback = document.getElementById("click-fb");
    feedback.className = "feedback ok";
    feedback.textContent = `✅ Corect! +${points} pct${clickStreak > 2 ? ` 🔥 serie ${clickStreak}` : ""}`;
    setTimeout(() => { clickIdx += 1; loadClickQ(); }, 1400);
  } else {
    const clicked = byId(id);
    if (!clicked || !isCountryInProfile(clicked)) {
      const feature = featureById.get(id);
      if (feature) territoryMessage(feature);
      return;
    }
    setCountryState(id, "miss");
    const feedback = document.getElementById("click-fb");
    feedback.className = "feedback bad";
    feedback.textContent = `❌ Aceasta este ${clicked.name_ro} — mai încearcă!`;
    totalAns += 1;
    updateProg(countryRegionKey(question), false);
    setTimeout(() => restoreCountryState(id), 700);
  }
}

function timeoutClick() {
  if (answered) return;
  answered = true; updateMicroMarkerInteractivity(); clearInterval(timerInterval); clickStreak = 0; totalAns += 1;
  const question = clickQs[clickIdx];
  setCountryState(question.id, "reveal");
  const feedback = document.getElementById("click-fb");
  feedback.className = "feedback bad";
  feedback.textContent = `⏰ Timp expirat! ${question.name_ro} este evidențiată cu galben.`;
  updateProg(countryRegionKey(question), false);
  setTimeout(() => { clickIdx += 1; loadClickQ(); }, 2200);
}

function skipClick() {
  if (!clickQs.length || answered) return;
  clearInterval(timerInterval); answered = true; updateMicroMarkerInteractivity(); totalAns += 1;
  const question = clickQs[clickIdx];
  setCountryState(question.id, "reveal");
  const feedback = document.getElementById("click-fb");
  feedback.className = "feedback bad";
  feedback.textContent = `⏭ Sărit — ${question.name_ro} este evidențiată cu galben.`;
  updateProg(countryRegionKey(question), false);
  setTimeout(() => { clickIdx += 1; loadClickQ(); }, 1800);
}

function endClick() {
  clearInterval(timerInterval);
  showLb();
}

async function startMatch() {
  if (!await prepareGame()) return;
  const pool = shuffle(getPool());
  if (!pool.length) return;
  matchPairs = pool.slice(0, Math.min(6, pool.length));
  matchDone = 0; matchScore = 0; selectedCapitalId = null;
  document.getElementById("match-score").textContent = "0";
  document.getElementById("match-prog").style.width = "0%";
  document.getElementById("match-next-btn").style.display = "none";
  document.getElementById("match-fb").className = "feedback";
  showScreen("s-match");
  renderMatch();
}

function renderMatch() {
  const capitals = shuffle(matchPairs.map(p => ({id: p.id, capital: p.capital})));
  const countries = shuffle(matchPairs.map(p => ({id: p.id, name: p.name_ro, iso2: p.iso2})));
  const dragColumn = document.getElementById("drag-col");
  const dropColumn = document.getElementById("drop-col");
  dragColumn.innerHTML = ""; dropColumn.innerHTML = "";
  capitals.forEach(item => {
    const div = document.createElement("div");
    div.className = "drag-item"; div.draggable = true; div.dataset.id = item.id;
    div.textContent = safeText(item.capital);
    div.setAttribute("role", "button");
    div.setAttribute("tabindex", "0");
    div.addEventListener("click", () => selectCapitalItem(div));
    div.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectCapitalItem(div); }
    });
    div.addEventListener("dragstart", onDragStart); div.addEventListener("dragend", onDragEnd);
    dragColumn.appendChild(div);
  });
  countries.forEach(item => {
    const div = document.createElement("div");
    div.className = "drop-zone"; div.dataset.id = item.id; div.dataset.label = item.name;

    const flag = document.createElement("img");
    flag.className = "drop-flag";
    flag.alt = "";
    flag.draggable = false;
    flag.src = localFlagUrl(item.iso2);
    flag.addEventListener("error", () => {
      const fallback = document.createElement("span");
      fallback.className = "drop-flag-fallback";
      fallback.textContent = flagEmojiFromCode(item.iso2);
      flag.replaceWith(fallback);
    }, {once: true});

    const label = document.createElement("span");
    label.textContent = item.name;
    div.append(flag, label);
    div.addEventListener("click", () => tryCapitalMatch(div, selectedCapitalId, null));
    div.addEventListener("dragover", onDragOver); div.addEventListener("dragleave", onDragLeave); div.addEventListener("drop", onDrop);
    dropColumn.appendChild(div);
  });
}

function selectCapitalItem(item) {
  if (!item || item.classList.contains("used")) return;
  document.querySelectorAll(".drag-item.selected").forEach(el => el.classList.remove("selected"));
  selectedCapitalId = item.dataset.id;
  item.classList.add("selected");
}

function onDragStart(event) {
  dragId = event.target.dataset.id; dragEl = event.target; selectedCapitalId = dragId;
  document.querySelectorAll(".drag-item.selected").forEach(el => el.classList.remove("selected"));
  event.target.classList.add("selected", "dragging"); event.dataTransfer.effectAllowed = "move";
}
function onDragEnd(event) { event.target.classList.remove("dragging"); }
function onDragOver(event) {
  event.preventDefault();
  const zone = event.target.closest(".drop-zone");
  if (zone && !zone.classList.contains("matched")) zone.classList.add("over");
  event.dataTransfer.dropEffect = "move";
}
function onDragLeave(event) { event.target.closest(".drop-zone")?.classList.remove("over"); }
function onDrop(event) {
  event.preventDefault();
  const zone = event.target.closest(".drop-zone");
  if (!zone) return;
  zone.classList.remove("over");
  tryCapitalMatch(zone, dragId, dragEl);
}

function tryCapitalMatch(zone, id, sourceEl) {
  if (!zone || zone.classList.contains("matched") || !id) return;
  const capitalEl = sourceEl || document.querySelector(`.drag-item[data-id="${CSS.escape(id)}"]`);
  if (!capitalEl || capitalEl.classList.contains("used")) return;
  const feedback = document.getElementById("match-fb");

  if (id === zone.dataset.id) {
    zone.classList.add("matched");
    const pair = matchPairs.find(p => p.id === id);
    if (pair && !zone.querySelector(".matched-capital")) {
      const capital = document.createElement("span");
      capital.className = "matched-capital";
      capital.textContent = ` — ${safeText(pair.capital)}`;
      zone.appendChild(capital);
    }
    capitalEl.classList.remove("selected");
    capitalEl.classList.add("used");
    selectedCapitalId = null; dragId = null; dragEl = null;
    matchDone += 1; matchScore += 10; sessionScore += 10; totalOk += 1; totalAns += 1;
    document.getElementById("match-score").textContent = matchScore;
    document.getElementById("match-prog").style.width = (matchDone / matchPairs.length * 100) + "%";
    if (pair) updateProg(countryRegionKey(pair), true);
    feedback.className = "feedback ok"; feedback.textContent = "✅ Corect!";
    setTimeout(() => { if (feedback.textContent === "✅ Corect!") feedback.className = "feedback"; }, 900);
    if (matchDone === matchPairs.length) {
      setTimeout(() => {
        feedback.className = "feedback ok";
        feedback.textContent = `🎉 Runda completă! +${matchScore} puncte`;
        document.getElementById("match-next-btn").style.display = "inline-block";
      }, 400);
    }
  } else {
    zone.classList.add("wrong-anim"); totalAns += 1;
    const pair = matchPairs.find(p => p.id === id);
    if (pair) updateProg(countryRegionKey(pair), false);
    feedback.className = "feedback bad"; feedback.textContent = "❌ Capitala nu aparține acestei țări.";
    setTimeout(() => zone.classList.remove("wrong-anim"), 700);
    setTimeout(() => { if (feedback.className.includes("bad")) feedback.className = "feedback"; }, 1200);
  }
}

function nextMatchRound() {
  document.getElementById("match-next-btn").style.display = "none";
  document.getElementById("match-fb").className = "feedback";
  matchDone = 0; matchScore = 0; selectedCapitalId = null; dragId = null; dragEl = null;
  matchPairs = shuffle(getPool()).slice(0, 6);
  renderMatch();
}


async function startFlagMatch() {
  if (!await prepareGame()) return;
  const pool = shuffle(getPool().filter(country => /^[A-Z]{2}$/i.test(String(country.iso2 || ""))));
  if (!pool.length) return;
  flagPairs = pool.slice(0, Math.min(6, pool.length));
  flagDone = 0; flagScore = 0; selectedFlagId = null;
  document.getElementById("flag-score").textContent = "0";
  document.getElementById("flag-prog").style.width = "0%";
  document.getElementById("flag-next-btn").style.display = "none";
  document.getElementById("flag-fb").className = "feedback";
  showScreen("s-flags");
  renderFlagMatch();
}

function renderFlagMatch() {
  selectedFlagId = null;
  const flags = shuffle(flagPairs.map(p => ({id: p.id, iso2: p.iso2, name: p.name_ro})));
  const countries = shuffle(flagPairs.map(p => ({id: p.id, name: p.name_ro})));
  const flagColumn = document.getElementById("flag-drag-col");
  const countryColumn = document.getElementById("flag-drop-col");
  flagColumn.innerHTML = "";
  countryColumn.innerHTML = "";

  flags.forEach(item => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "flag-item";
    tile.draggable = true;
    tile.dataset.id = item.id;
    tile.setAttribute("aria-label", `Drapel pentru ${item.name}`);

    const img = document.createElement("img");
    img.src = localFlagUrl(item.iso2);
    img.alt = `Drapel pentru ${item.name}`;
    img.draggable = false;
    img.addEventListener("error", () => {
      const fallback = document.createElement("span");
      fallback.className = "flag-item-fallback";
      fallback.textContent = flagEmojiFromCode(item.iso2);
      img.replaceWith(fallback);
    }, {once: true});
    tile.appendChild(img);
    tile.addEventListener("click", () => selectFlagItem(tile));
    tile.addEventListener("dragstart", onFlagDragStart);
    tile.addEventListener("dragend", onFlagDragEnd);
    flagColumn.appendChild(tile);
  });

  countries.forEach(item => {
    const zone = document.createElement("button");
    zone.type = "button";
    zone.className = "flag-country-zone";
    zone.dataset.id = item.id;

    const slot = document.createElement("span");
    slot.className = "flag-country-slot";
    slot.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "flag-country-label";
    label.textContent = item.name;
    zone.append(slot, label);

    zone.addEventListener("click", () => tryFlagMatch(zone, selectedFlagId, null));
    zone.addEventListener("dragover", onFlagDragOver);
    zone.addEventListener("dragleave", onFlagDragLeave);
    zone.addEventListener("drop", onFlagDrop);
    countryColumn.appendChild(zone);
  });
}

function selectFlagItem(tile) {
  if (!tile || tile.classList.contains("used")) return;
  document.querySelectorAll(".flag-item.selected").forEach(el => el.classList.remove("selected"));
  selectedFlagId = tile.dataset.id;
  tile.classList.add("selected");
}

function onFlagDragStart(event) {
  const tile = event.currentTarget;
  if (tile.classList.contains("used")) { event.preventDefault(); return; }
  flagDragId = tile.dataset.id;
  flagDragEl = tile;
  selectedFlagId = flagDragId;
  document.querySelectorAll(".flag-item.selected").forEach(el => el.classList.remove("selected"));
  tile.classList.add("selected", "dragging");
  event.dataTransfer.effectAllowed = "move";
}

function onFlagDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
}

function onFlagDragOver(event) {
  event.preventDefault();
  const zone = event.currentTarget;
  if (!zone.classList.contains("matched")) zone.classList.add("over");
  event.dataTransfer.dropEffect = "move";
}

function onFlagDragLeave(event) {
  event.currentTarget.classList.remove("over");
}

function onFlagDrop(event) {
  event.preventDefault();
  const zone = event.currentTarget;
  zone.classList.remove("over");
  tryFlagMatch(zone, flagDragId, flagDragEl);
}

function tryFlagMatch(zone, id, sourceEl) {
  if (!zone || zone.classList.contains("matched") || !id) return;
  const flagEl = sourceEl || document.querySelector(`.flag-item[data-id="${CSS.escape(id)}"]`);
  if (!flagEl || flagEl.classList.contains("used")) return;
  const feedback = document.getElementById("flag-fb");

  if (id === zone.dataset.id) {
    zone.classList.add("matched");
    const pair = flagPairs.find(p => p.id === id);
    const slot = zone.querySelector(".flag-country-slot");
    if (slot && pair) {
      slot.classList.add("matched");
      const img = document.createElement("img");
      img.src = localFlagUrl(pair.iso2);
      img.alt = "";
      img.addEventListener("error", () => {
        slot.textContent = flagEmojiFromCode(pair.iso2);
      }, {once: true});
      slot.replaceChildren(img);
    }
    flagEl.classList.remove("selected");
    flagEl.classList.add("used");
    selectedFlagId = null;
    flagDone += 1; flagScore += 10; sessionScore += 10; totalOk += 1; totalAns += 1;
    document.getElementById("flag-score").textContent = flagScore;
    document.getElementById("flag-prog").style.width = (flagDone / flagPairs.length * 100) + "%";
    if (pair) updateProg(countryRegionKey(pair), true);
    feedback.className = "feedback ok";
    feedback.textContent = "✅ Corect!";
    setTimeout(() => { if (feedback.textContent === "✅ Corect!") feedback.className = "feedback"; }, 900);

    if (flagDone === flagPairs.length) {
      setTimeout(() => {
        feedback.className = "feedback ok";
        feedback.textContent = `🎉 Runda completă! +${flagScore} puncte`;
        document.getElementById("flag-next-btn").style.display = "inline-block";
      }, 400);
    }
  } else {
    zone.classList.add("wrong-anim");
    totalAns += 1;
    const pair = flagPairs.find(p => p.id === id);
    if (pair) updateProg(countryRegionKey(pair), false);
    feedback.className = "feedback bad";
    feedback.textContent = "❌ Drapelul nu aparține acestei țări.";
    setTimeout(() => zone.classList.remove("wrong-anim"), 700);
    setTimeout(() => { if (feedback.className.includes("bad")) feedback.className = "feedback"; }, 1200);
  }
}

function nextFlagRound() {
  document.getElementById("flag-next-btn").style.display = "none";
  document.getElementById("flag-fb").className = "feedback";
  flagDone = 0; flagScore = 0; selectedFlagId = null;
  flagPairs = shuffle(getPool().filter(country => /^[A-Z]{2}$/i.test(String(country.iso2 || "")))).slice(0, 6);
  document.getElementById("flag-score").textContent = "0";
  document.getElementById("flag-prog").style.width = "0%";
  renderFlagMatch();
}

function updateProg(continent, ok) {
  if (!prog[continent]) prog[continent] = {ok: 0, tot: 0};
  prog[continent].tot += 1;
  if (ok) prog[continent].ok += 1;
  try { localStorage.setItem("gq_prog130", JSON.stringify(prog)); } catch (_) {}
}

function clearLeaderboard() {
  if (!confirm("Ștergi toate scorurile salvate din Campionat?")) return;
  lb = [];
  try { localStorage.removeItem("gq_lb130"); } catch (_) {}
  renderLb();
}

function resetStatistics() {
  if (!confirm("Resetezi toate statisticile și progresul pe continente?")) return;
  prog = {};
  totalAns = 0;
  totalOk = 0;
  try { localStorage.removeItem("gq_prog130"); } catch (_) {}
  showStats();
}

function showAbout() { showScreen("s-about"); }
function showLb() { showScreen("s-lb"); renderLb(); }
function renderLb() {
  const sorted = [...lb].sort((a, b) => b.score - a.score).slice(0, 10);
  const element = document.getElementById("lb-list");
  if (!sorted.length) {
    element.innerHTML = '<div class="lb-row" style="justify-content:center;color:var(--color-text-secondary,#666)">Niciun scor salvat.</div>';
    return;
  }
  const medals = ["🥇", "🥈", "🥉"];
  element.innerHTML = sorted.map((entry, index) => `<div class="lb-row"><span style="width:22px;font-weight:500">${medals[index] || `${index + 1}.`}</span><span class="lb-name">${escapeHtml(entry.name)}</span><span class="lb-score">${entry.score} pct</span>${entry.isNew ? '<span class="new-badge">NOU</span>' : ""}</div>`).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"}[char]));
}

function saveLb() {
  const input = document.getElementById("player-name");
  const name = input.value.trim();
  if (!name) return;
  lb = lb.map(entry => ({...entry, isNew: false}));
  lb.push({name, score: sessionScore, date: Date.now(), isNew: true});
  lb = lb.sort((a, b) => b.score - a.score).slice(0, 20);
  try { localStorage.setItem("gq_lb130", JSON.stringify(lb)); } catch (_) {}
  input.value = "";
  renderLb();
}

function showStats() {
  showScreen("s-stats");
  const accuracy = totalAns > 0 ? Math.round(totalOk / totalAns * 100) : 0;
  document.getElementById("stat-cards").innerHTML = `<div class="sc"><div class="v">${totalAns}</div><div class="l">Răspunsuri</div></div><div class="sc"><div class="v">${totalOk}</div><div class="l">Corecte</div></div><div class="sc"><div class="v">${accuracy}%</div><div class="l">Acuratețe</div></div>`;
  const continents = ["Europe", "Asia", "Africa", "NorthAmerica", "SouthAmerica", "Oceania"];
  document.getElementById("cont-bars").innerHTML = continents.map(continent => {
    const data = prog[continent] || {ok: 0, tot: 0};
    const percent = data.tot > 0 ? Math.round(data.ok / data.tot * 100) : 0;
    return `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="color:var(--color-text-primary,#111)">${CONTINENT_RO[continent]}</span><span style="color:var(--color-text-secondary,#666)">${data.ok}/${data.tot} (${percent}%)</span></div><div style="height:7px;background:var(--color-background-secondary,#eee);border-radius:3px;overflow:hidden"><div style="height:100%;width:${percent}%;background:#5b8dd9;border-radius:3px"></div></div></div>`;
  }).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  const profileSelect = document.getElementById("profile-select");
  if (profileSelect) profileSelect.value = mapProfile;
  ensureData().catch(console.error);
});
