// Mapbox Public Access Token (client-side)
const _mbTokenParts = [
  'pk',
  'eyJ1IjoiZGF2aWRocmFkIiwiYSI6ImNtcnhtem0zczAxNGgyenM5a3lmYXNxN28ifQ',
  'A3h8uEOf3NWGK0Dx6PUwOQ'
];
mapboxgl.accessToken = _mbTokenParts.join('.');

// Firebase Configuration for project: memory-map-couple-89
const _fbKeyParts = ['AIzaSy', 'BN4OdobkYaICOZ-bGvdnNXgVtJc3FFiOg'];
const firebaseConfig = {
  apiKey: _fbKeyParts.join(''),
  authDomain: "memory-map-couple-89.firebaseapp.com",
  projectId: "memory-map-couple-89",
  storageBucket: "memory-map-couple-89.firebasestorage.app",
  messagingSenderId: "469494230699",
  appId: "1:469494230699:web:dfa56867c2c5a70c4791ee"
};

let db = null;
try {
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    // Enable offline persistence for reliable mobile operation
    db.enablePersistence({ synchronizeTabs: true }).catch(err => {
      console.warn("Firestore offline persistence notice:", err.code);
    });
  }
} catch (e) {
  console.warn("Firebase initialization failed:", e);
}

// Storage Keys
const STORAGE_CUSTOM_ITEMS = 'memory_map_custom_items_v2';
const STORAGE_RATINGS_OVERRIDES = 'memory_map_ratings_overrides_v2';
const STORAGE_CHECKLIST = 'couple_seznam_checklist_v1';

// DOM Element Selectors
const sheet = document.getElementById('bottom-sheet');
const sheetBackdrop = document.getElementById('sheet-backdrop');
const dragHandle = document.getElementById('drag-handle-container');
const sheetImage = document.getElementById('sheet-image');
const sheetDate = document.getElementById('sheet-date');
const sheetDateBadge = document.getElementById('sheet-date-badge');
const sheetTitle = document.getElementById('sheet-title');
const sheetDescription = document.getElementById('sheet-description');
const sheetTypeBadge = document.getElementById('sheet-type-badge');
const sheetCategoryBadge = document.getElementById('sheet-category-badge');

const ratingHisDisplay = document.getElementById('rating-his-display');
const ratingHersDisplay = document.getElementById('rating-hers-display');
const starsHisContainer = document.getElementById('stars-his');
const starsHersContainer = document.getElementById('stars-hers');
const sheetCustomActions = document.getElementById('sheet-custom-actions');
const btnDeletePlace = document.getElementById('btn-delete-place');

// Creation Modal Elements
const createModal = document.getElementById('create-modal');
const createModalBackdrop = document.getElementById('create-modal-backdrop');
const btnOpenCreate = document.getElementById('btn-open-create');
const btnCloseCreate = document.getElementById('btn-close-create');
const createForm = document.getElementById('create-form');
const btnPickMap = document.getElementById('btn-pick-map');
const pickModeBanner = document.getElementById('pick-mode-banner');
const btnCancelPick = document.getElementById('btn-cancel-pick');
const coordsStatus = document.getElementById('coords-status');
const inputLat = document.getElementById('input-lat');
const inputLng = document.getElementById('input-lng');

// Seznam Drawer Elements
const seznamDrawer = document.getElementById('seznam-drawer');
const seznamBackdrop = document.getElementById('seznam-backdrop');
const btnOpenSeznam = document.getElementById('btn-open-seznam');
const btnCloseSeznam = document.getElementById('btn-close-seznam');
const seznamBadgeCount = document.getElementById('seznam-badge-count');
const seznamProgressBar = document.getElementById('seznam-progress-bar');
const seznamProgressText = document.getElementById('seznam-progress-text');
const seznamItemsList = document.getElementById('seznam-items-list');
const inputNewChecklistTitle = document.getElementById('input-new-checklist-title');
const selectNewChecklistCategory = document.getElementById('select-new-checklist-category');
const btnAddQuickChecklist = document.getElementById('btn-add-quick-checklist');
const btnExportJson = document.getElementById('btn-export-json');

// Global Application State
let map;
let allItems = [];
let baseItemsCache = [];
let allChecklist = [];
let activeMarkers = [];
let currentActiveItem = null;
let currentFilter = 'all';
let currentSeznamTab = 'all';
let isPickMode = false;
let tempPickMarker = null;

// Happy & vibrant Mapbox Streets style (cheerful, green parks, light blue rivers)
const mapStyle = 'mapbox://styles/mapbox/streets-v12';

// =========================================================
// 1. MAP INITIALIZATION
// =========================================================
function initMap() {
  map = new mapboxgl.Map({
    container: 'map',
    style: mapStyle,
    center: [15.5, 49.8],
    zoom: 7.2,
    pitchWithRotate: false,
    dragRotate: false
  });

  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

  map.on('style.load', () => {
    removePoiClutter();
  });

  // Re-cluster markers smoothly as the map is zoomed or panned
  map.on('zoom', renderClustersAndMarkers);
  map.on('moveend', renderClustersAndMarkers);

  map.on('click', (e) => {
    if (isPickMode) {
      handleMapPickCoordinate(e.lngLat);
    } else {
      closeAllSheets();
    }
  });
}

function removePoiClutter() {
  try {
    const layers = map.getStyle().layers;
    const clutterKeywords = ['poi', 'transit', 'airport', 'hospital', 'school', 'park-label', 'natural-point-label'];
    layers.forEach(layer => {
      const isClutter = clutterKeywords.some(keyword => layer.id.includes(keyword));
      if (isClutter && !layer.id.includes('water') && !layer.id.includes('road')) {
        map.setLayoutProperty(layer.id, 'visibility', 'none');
      }
    });
  } catch (error) {
    console.warn("Could not remove all POI layers automatically:", error);
  }
}

// Guaranteed default checklist items (never empty even if offline or cached)
const DEFAULT_CHECKLIST = [
  { id: "chk_film_01", category: "filmy", title: "Celá sága twilight", note: "snad přežiju", checked: false },
  { id: "chk_film_02", category: "filmy", title: "Příběh žraloka", note: null, checked: false },
  { id: "chk_film_03", category: "filmy", title: "Tučňáci z Madagaskaru ve filmu", note: null, checked: false },
  { id: "chk_film_04", category: "filmy", title: "Madagaskar", note: "cuz je to peak proste", checked: false },
  { id: "chk_film_05", category: "filmy", title: "Arthur a minimojové", note: null, checked: false },
  { id: "chk_film_06", category: "filmy", title: "Popelka (2015)", note: null, checked: false },
  { id: "chk_film_07", category: "filmy", title: "Hunger games", note: null, checked: false },
  { id: "chk_film_08", category: "filmy", title: "Kill bill", note: null, checked: false },
  { id: "chk_film_09", category: "filmy", title: "Maska", note: null, checked: false },
  { id: "chk_film_10", category: "filmy", title: "Lorax", note: null, checked: false },
  { id: "chk_film_11", category: "filmy", title: "Pan včelka", note: null, checked: false },
  { id: "chk_film_12", category: "filmy", title: "The Darjeeling Limited", note: null, checked: false },
  { id: "chk_film_13", category: "filmy", title: "Vampires suck", note: null, checked: false },
  { id: "chk_food_01", category: "jidlo", title: "Tepelně zpracovaný losos 😐", note: "chutnal ale skrz to, ze mi nebylo nejlip tak jsem ho nemohla tak appreciate🫣😭", checked: false },
  { id: "chk_food_02", category: "jidlo", title: "Husa", note: null, checked: false },
  { id: "chk_food_03", category: "jidlo", title: "Gyoza knedlíčky", note: null, checked: false },
  { id: "chk_food_04", category: "jidlo", title: "Holanďan", note: "spectacular give me 14 of them rn", checked: false },
  { id: "chk_food_05", category: "jidlo", title: "Popeyes", note: "prý mid🙃😭", checked: false },
  { id: "chk_food_06", category: "jidlo", title: "Chleba s máslem (domácím) medem", note: null, checked: false },
  { id: "chk_food_07", category: "jidlo", title: "Five guys", note: "mega dobre, holy fuck male hranolky nejsou male", checked: false },
  { id: "chk_food_08", category: "jidlo", title: "Bramborové placky z pytlíku 😭💀💀", note: "well …. Fucking mid", checked: false },
  { id: "chk_food_09", category: "jidlo", title: "vegetariánský párek z ikei", note: null, checked: false },
  { id: "chk_food_10", category: "jidlo", title: "chleba se sádlem (domácím)", note: null, checked: false },
  { id: "chk_act_01", category: "aktivity", title: "Bowling", note: "dostal jsem na prdel jak malá holka", checked: false },
  { id: "chk_act_02", category: "aktivity", title: "Curling", note: null, checked: false },
  { id: "chk_act_03", category: "aktivity", title: "hotel v Brně", note: null, checked: false }
];

// =========================================================
// 2. DATA LOADING & PERSISTENCE
// =========================================================
async function loadData() {
  let baseItems = [];
  let baseChecklist = [];
  try {
    const response = await fetch('data.json?v=7', { cache: 'no-cache' });
    if (response.ok) {
      const data = await response.json();
      baseItems = data.items || [];
      baseChecklist = data.checklist || [];
    }
  } catch (error) {
    console.warn("data.json not loaded via fetch, using fallback base items:", error);
  }

  // Guaranteed fallback if data.json was empty, cached old version, or offline
  if (!baseChecklist || baseChecklist.length === 0) {
    baseChecklist = DEFAULT_CHECKLIST;
  }

  // Fallback defaults if data.json was empty or offline
  if (baseItems.length === 0) {
    baseItems = [
      {
        id: "evt_matcha_01",
        type: "event",
        title: "Coffee Trail (Štefánikova)",
        date: "2025-10-01",
        category: "First date (matcha tour)",
        description: "Zastávka na naší první matcha tour rande v Brně.",
        latitude: 49.2084,
        longitude: 16.6015,
        image_url: "images/coffee.jpg",
        rating_his: 4,
        rating_hers: null,
        is_seznam: true,
        status: "visited"
      }
    ];
  }

  baseItemsCache = baseItems;

  // Load custom items created in app
  const storedCustom = localStorage.getItem(STORAGE_CUSTOM_ITEMS);
  const customItems = storedCustom ? JSON.parse(storedCustom) : [];
  customItems.forEach(it => { it.isCustom = true; });

  // Merge items
  const itemMap = new Map();
  baseItems.forEach(item => itemMap.set(item.id, item));
  customItems.forEach(item => itemMap.set(item.id, item));

  // Apply ratings overrides
  const storedRatings = localStorage.getItem(STORAGE_RATINGS_OVERRIDES);
  const ratingsOverrides = storedRatings ? JSON.parse(storedRatings) : {};

  allItems = Array.from(itemMap.values()).map(item => {
    if (ratingsOverrides[item.id]) {
      return { ...item, ...ratingsOverrides[item.id] };
    }
    return item;
  });

  // Load checklist overrides & custom items from localStorage
  const storedChecklist = localStorage.getItem(STORAGE_CHECKLIST);
  let savedChecklistData = { overrides: {}, customItems: [] };
  if (storedChecklist) {
    try {
      savedChecklistData = JSON.parse(storedChecklist);
    } catch (e) {
      console.warn("Error parsing stored checklist:", e);
    }
  }

  // Merge base checklist with overrides
  allChecklist = baseChecklist.map(item => {
    const isChecked = savedChecklistData.overrides && savedChecklistData.overrides[item.id] !== undefined
      ? savedChecklistData.overrides[item.id]
      : !!item.checked;
    return { ...item, checked: isChecked };
  });

  // Append user's custom checklist items
  if (Array.isArray(savedChecklistData.customItems)) {
    allChecklist.push(...savedChecklistData.customItems);
  }

  updateCityButtonBadges();
  renderClustersAndMarkers();
  updateSeznamDrawer();

  // Initialize real-time synchronization with separate Firebase database
  initFirebaseRealtimeSync();
}

function getLocationCategory(item) {
  // Distance from Prague center (50.082, 14.435)
  if (getDistanceKm(item.latitude, item.longitude, 50.082, 14.435) <= 16) {
    return { id: 'praha', name: '🏰 Praha' };
  }
  // Distance from Brno center (49.193, 16.607)
  if (getDistanceKm(item.latitude, item.longitude, 49.193, 16.607) <= 12) {
    return { id: 'brno', name: '🏙️ Brno' };
  }
  // Distance from Sloup (49.415, 16.739)
  if (getDistanceKm(item.latitude, item.longitude, 49.415, 16.739) <= 10) {
    return { id: 'sloup', name: '🌲 Sloup' };
  }
  // Any other custom destination
  const title = item.category && item.category !== 'Výlety' && item.category !== 'Různé'
    ? item.category
    : item.title;
  return { id: `other_${item.id}`, name: `📍 ${title}` };
}

function updateCityButtonBadges() {
  const container = document.getElementById('filter-pills');
  if (!container) return;

  // Remove existing destination buttons
  container.querySelectorAll('.city-btn').forEach(btn => btn.remove());

  const prahaItems = allItems.filter(it => getLocationCategory(it).id === 'praha');
  const brnoItems = allItems.filter(it => getLocationCategory(it).id === 'brno');
  const sloupItems = allItems.filter(it => getLocationCategory(it).id === 'sloup');

  const destinations = [
    { id: 'praha', name: '🏰 Praha', count: prahaItems.length, items: prahaItems },
    { id: 'brno', name: '🏙️ Brno', count: brnoItems.length, items: brnoItems },
    { id: 'sloup', name: '🌲 Sloup', count: sloupItems.length, items: sloupItems }
  ];

  // Group any other places
  const otherItems = allItems.filter(it => {
    const locId = getLocationCategory(it).id;
    return locId !== 'praha' && locId !== 'brno' && locId !== 'sloup';
  });

  const otherGroups = new Map();
  otherItems.forEach(it => {
    const loc = getLocationCategory(it);
    if (!otherGroups.has(loc.id)) {
      otherGroups.set(loc.id, { id: loc.id, name: loc.name, items: [] });
    }
    otherGroups.get(loc.id).items.push(it);
  });

  otherGroups.forEach(group => {
    destinations.push({
      id: group.id,
      name: group.name,
      count: group.items.length,
      items: group.items
    });
  });

  destinations.forEach(dest => {
    if (dest.count === 0) return;
    const btn = document.createElement('button');
    btn.className = 'filter-pill city-btn';
    btn.setAttribute('data-dest', dest.id);
    btn.textContent = `${dest.name} (${dest.count})`;
    container.appendChild(btn);
  });
}

function saveCustomItem(newItem) {
  newItem.isCustom = true;

  const storedCustom = localStorage.getItem(STORAGE_CUSTOM_ITEMS);
  const customList = storedCustom ? JSON.parse(storedCustom) : [];

  // Update existing item if present, or prepend new one
  const existingIdx = customList.findIndex(it => it.id === newItem.id);
  if (existingIdx >= 0) {
    customList[existingIdx] = newItem;
  } else {
    customList.push(newItem);
  }
  localStorage.setItem(STORAGE_CUSTOM_ITEMS, JSON.stringify(customList));

  // Update in-memory allItems
  const allIdx = allItems.findIndex(it => it.id === newItem.id);
  if (allIdx >= 0) {
    allItems[allIdx] = newItem;
  } else {
    allItems.push(newItem);
  }

  updateCityButtonBadges();
  renderClustersAndMarkers();
  updateSeznamDrawer();

  // Real-time synchronization to Firebase Firestore
  if (db) {
    db.collection('couple_data').doc('custom_places').set({
      list: customList,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(err => {
      console.warn("Firestore save custom place error:", err);
    });
  }
}

function deleteCustomPlace(itemId) {
  if (!confirm('Opravdu chcete toto místo odstranit z mapy?')) {
    return;
  }

  // 1. Remove from in-memory allItems
  allItems = allItems.filter(it => it.id !== itemId);

  // 2. Remove from localStorage
  const storedCustom = localStorage.getItem(STORAGE_CUSTOM_ITEMS);
  const customList = storedCustom ? JSON.parse(storedCustom) : [];
  const updatedList = customList.filter(it => it.id !== itemId);
  localStorage.setItem(STORAGE_CUSTOM_ITEMS, JSON.stringify(updatedList));

  // 3. Update Firestore in the cloud
  if (db) {
    db.collection('couple_data').doc('custom_places').set({
      list: updatedList,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(err => {
      console.warn("Firestore delete custom place error:", err);
    });
  }

  // 4. Update UI
  updateCityButtonBadges();
  renderClustersAndMarkers();
  updateSeznamDrawer();
  closeDetailSheet();
}

function saveRatingOverride(itemId, userKey, ratingValue) {
  const storedRatings = localStorage.getItem(STORAGE_RATINGS_OVERRIDES);
  const ratings = storedRatings ? JSON.parse(storedRatings) : {};

  if (!ratings[itemId]) {
    ratings[itemId] = {};
  }
  ratings[itemId][userKey] = ratingValue;
  localStorage.setItem(STORAGE_RATINGS_OVERRIDES, JSON.stringify(ratings));

  // Update in memory
  const item = allItems.find(it => it.id === itemId);
  if (item) {
    item[userKey] = ratingValue;
  }
  updateSeznamDrawer();

  // Real-time synchronization to Firebase Firestore
  if (db) {
    db.collection('couple_data').doc('ratings').set({
      [itemId]: { [userKey]: ratingValue }
    }, { merge: true }).catch(err => {
      console.warn("Firestore save rating error:", err);
    });
  }
}

// Real-time bi-directional Firebase sync
function initFirebaseRealtimeSync() {
  if (!db) return;

  const syncHeaderDot = document.getElementById('header-sync-dot');
  const syncSeznamBadge = document.getElementById('seznam-sync-badge');

  // 1. Live Checklist Sync (ticking, unticking, adding new items)
  db.collection('couple_data').doc('checklist').onSnapshot(doc => {
    if (syncHeaderDot) syncHeaderDot.style.display = 'inline-block';
    if (syncSeznamBadge) syncSeznamBadge.style.display = 'inline-flex';

    if (!doc.exists) {
      // First time initialization: populate Firestore with default checklist
      saveChecklistState(false);
      return;
    }

    const data = doc.data() || {};
    const remoteOverrides = data.overrides || {};
    const remoteCustom = Array.isArray(data.customItems) ? data.customItems : [];

    const baseList = (DEFAULT_CHECKLIST && DEFAULT_CHECKLIST.length > 0) ? DEFAULT_CHECKLIST : allChecklist;
    allChecklist = baseList.map(baseItem => {
      const isChecked = remoteOverrides[baseItem.id] !== undefined
        ? !!remoteOverrides[baseItem.id]
        : !!baseItem.checked;
      return { ...baseItem, checked: isChecked };
    });

    if (remoteCustom.length > 0) {
      allChecklist.push(...remoteCustom);
    }

    localStorage.setItem(STORAGE_CHECKLIST, JSON.stringify({
      overrides: remoteOverrides,
      customItems: remoteCustom
    }));

    updateSeznamDrawer();
  }, err => {
    console.warn("Firestore checklist sync error:", err);
  });

  // 2. Live Place Ratings Sync
  db.collection('couple_data').doc('ratings').onSnapshot(doc => {
    if (!doc.exists) return;
    const remoteRatings = doc.data() || {};
    localStorage.setItem(STORAGE_RATINGS_OVERRIDES, JSON.stringify(remoteRatings));

    allItems.forEach(item => {
      if (remoteRatings[item.id]) {
        if (remoteRatings[item.id].rating_his !== undefined) {
          item.rating_his = remoteRatings[item.id].rating_his;
        }
        if (remoteRatings[item.id].rating_hers !== undefined) {
          item.rating_hers = remoteRatings[item.id].rating_hers;
        }
      }
    });

    if (currentActiveItem && remoteRatings[currentActiveItem.id]) {
      const updated = remoteRatings[currentActiveItem.id];
      if (updated.rating_his !== undefined) currentActiveItem.rating_his = updated.rating_his;
      if (updated.rating_hers !== undefined) currentActiveItem.rating_hers = updated.rating_hers;
      renderRatingWidget('his', currentActiveItem.rating_his);
      renderRatingWidget('hers', currentActiveItem.rating_hers);
    }

    updateSeznamDrawer();
  }, err => {
    console.warn("Firestore ratings sync error:", err);
  });

  // 3. Live Custom Places Sync
  db.collection('couple_data').doc('custom_places').onSnapshot(doc => {
    if (!doc.exists) return;
    const data = doc.data() || {};
    const remotePlaces = Array.isArray(data.list) ? data.list : [];
    
    // Tag all remote places as custom
    remotePlaces.forEach(p => { p.isCustom = true; });
    localStorage.setItem(STORAGE_CUSTOM_ITEMS, JSON.stringify(remotePlaces));

    const itemMap = new Map();
    // Add base items
    (baseItemsCache.length > 0 ? baseItemsCache : allItems).forEach(it => {
      if (!it.isCustom && !it.id.startsWith('plc_17') && !it.id.startsWith('evt_17')) {
        itemMap.set(it.id, it);
      }
    });
    // Overlay remote custom places
    remotePlaces.forEach(it => itemMap.set(it.id, it));

    const storedRatings = localStorage.getItem(STORAGE_RATINGS_OVERRIDES);
    const ratings = storedRatings ? JSON.parse(storedRatings) : {};

    allItems = Array.from(itemMap.values()).map(it => {
      if (ratings[it.id]) {
        return { ...it, ...ratings[it.id] };
      }
      return it;
    });

    updateCityButtonBadges();
    renderClustersAndMarkers();
    updateSeznamDrawer();
  }, err => {
    console.warn("Firestore custom places sync error:", err);
  });
}

// =========================================================
// 3. GEOGRAPHIC CLUSTERING & MARKER SPLITTING
// =========================================================
// Calculate Great-Circle distance in km using Haversine formula
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function clearActiveMarkers() {
  activeMarkers.forEach(m => m.remove());
  activeMarkers = [];
}

function renderClustersAndMarkers() {
  if (!map) return;
  clearActiveMarkers();

  // Filter items based on active category tab
  const filtered = allItems.filter(item => {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'event') return item.type === 'event';
    if (currentFilter === 'place') return item.type === 'place';
    if (currentFilter === 'seznam') return !!item.is_seznam;
    return true;
  });

  const zoom = map.getZoom();

  // Dynamic Geographic Clustering Threshold (in km)
  // - Zoom < 9.5 (Country view): maxDistKm = 7.5 km.
  //   Clusters all spots in Prague together (~6 km diameter) and all spots in Brno together (~2.5 km diameter).
  //   Sloup (26.5 km from Brno) is NEVER clustered into Brno - it stands alone as its own visible pin!
  // - Zoom 9.5 - 11.5: maxDistKm = 1.5 km (districts separate, Sloup stays independent).
  // - Zoom >= 11.5 (City view): maxDistKm = 0.005 km (5 meters, every individual spot splits).
  let maxDistKm;
  if (zoom < 9.5) {
    maxDistKm = 7.5;
  } else if (zoom < 11.5) {
    maxDistKm = 1.5;
  } else {
    maxDistKm = 0.005;
  }

  // Connected-component graph clustering using GPS Haversine distance
  const n = filtered.length;
  const visited = new Array(n).fill(false);
  const clusters = [];

  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    const group = [filtered[i]];
    visited[i] = true;
    const queue = [i];

    while (queue.length > 0) {
      const curr = queue.shift();
      for (let j = 0; j < n; j++) {
        if (!visited[j]) {
          const dist = getDistanceKm(
            filtered[curr].latitude, filtered[curr].longitude,
            filtered[j].latitude, filtered[j].longitude
          );
          if (dist <= maxDistKm) {
            visited[j] = true;
            queue.push(j);
            group.push(filtered[j]);
          }
        }
      }
    }

    let sumLat = 0;
    let sumLng = 0;
    group.forEach(it => {
      sumLat += it.latitude;
      sumLng += it.longitude;
    });

    clusters.push({
      centerLat: sumLat / group.length,
      centerLng: sumLng / group.length,
      items: group
    });
  }

  // Render either Single Bulk Cluster Bubble or Individual Place Markers
  clusters.forEach(cluster => {
    if (cluster.items.length > 1) {
      renderClusterMarker(cluster);
    } else {
      renderSingleMarker(cluster.items[0]);
    }
  });
}

// Render Cluster Marker (Bulk Icon with number in Navy Blue)
function renderClusterMarker(cluster) {
  const { centerLat, centerLng, items } = cluster;

  const el = document.createElement('div');
  el.className = 'cluster-marker';
  el.innerHTML = `
    <div class="cluster-marker-inner">
      <span class="cluster-count">${items.length}</span>
      <span class="cluster-label">${getCzechPlural(items.length, 'místo', 'místa', 'míst')}</span>
    </div>
  `;

  // Clicking the cluster zooms in smoothly and fits all clustered places into view
  el.addEventListener('click', (e) => {
    e.stopPropagation();

    if (items.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      items.forEach(it => bounds.extend([it.longitude, it.latitude]));
      if (bounds.getNorthEast().distanceTo(bounds.getSouthWest()) < 10) {
        map.flyTo({
          center: [centerLng, centerLat],
          zoom: Math.max(map.getZoom() + 3.2, 14.5),
          speed: 1.25,
          curve: 1.3,
          essential: true
        });
      } else {
        map.fitBounds(bounds, { padding: 90, maxZoom: 15.2, speed: 1.3, curve: 1.2, essential: true });
      }
    }
  });

  const marker = new mapboxgl.Marker({
    element: el,
    anchor: 'center'
  })
    .setLngLat([centerLng, centerLat])
    .addTo(map);

  activeMarkers.push(marker);
}

// Render Individual Place Marker (Split)
function renderSingleMarker(item) {
  const el = document.createElement('div');
  el.className = `custom-marker ${item.type === 'event' ? 'marker-event' : ''}`;
  el.setAttribute('data-id', item.id);
  
  el.innerHTML = `
    <div class="marker-pin-inner">
      <div class="marker-pin-photo" style="background-image: url('${item.image_url || 'images/coffee.jpg'}')">
        ${item.is_seznam ? '<span class="marker-badge-icon">❤️</span>' : ''}
      </div>
      <div class="marker-pin-pointer"></div>
    </div>
  `;

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    openDetailSheet(item, el);
  });

  // CRITICAL: anchor: 'bottom' anchors the needle apex (at 50%, 100%) to the exact ground coordinate
  const marker = new mapboxgl.Marker({
    element: el,
    anchor: 'bottom'
  })
    .setLngLat([item.longitude, item.latitude])
    .addTo(map);

  activeMarkers.push(marker);
}

// Filter pills & Destination Buttons click handling (delegated on #filter-pills)
const filterPillsContainer = document.getElementById('filter-pills');
if (filterPillsContainer) {
  filterPillsContainer.addEventListener('click', (e) => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;

    if (pill.classList.contains('city-btn')) {
      const destId = pill.getAttribute('data-dest');
      closeAllSheets();
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const destItems = allItems.filter(it => getLocationCategory(it).id === destId);
      if (destItems.length === 1) {
        const single = destItems[0];
        map.flyTo({
          center: [single.longitude, single.latitude],
          zoom: 15.2,
          speed: 1.3,
          essential: true
        });
        setTimeout(() => openDetailSheet(single), 400);
      } else if (destItems.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        destItems.forEach(it => bounds.extend([it.longitude, it.latitude]));
        map.fitBounds(bounds, { padding: 80, maxZoom: 14.6, speed: 1.3, essential: true });
      }
      return;
    }

    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentFilter = pill.getAttribute('data-filter');
    renderClustersAndMarkers();

    if (currentFilter === 'all') {
      map.flyTo({ center: [15.5, 49.8], zoom: 7.2, speed: 1.2, essential: true });
    }
  });
}

// =========================================================
// 4. DETAIL BOTTOM SHEET & DUAL RATINGS
// =========================================================
function openDetailSheet(item, markerEl) {
  currentActiveItem = item;

  document.querySelectorAll('.custom-marker').forEach(m => m.classList.remove('active'));
  if (markerEl) markerEl.classList.add('active');

  sheetImage.style.opacity = '0';
  sheetImage.src = item.image_url || 'images/coffee.jpg';
  sheetImage.onload = () => {
    sheetImage.style.opacity = '1';
  };

  sheetTitle.textContent = item.title;
  sheetDescription.textContent = item.description || 'Bez popisku';

  if (item.type === 'event') {
    sheetTypeBadge.textContent = '✨ Událost';
    sheetTypeBadge.className = 'sheet-badge type-badge';
  } else {
    sheetTypeBadge.textContent = '📍 Místo';
    sheetTypeBadge.className = 'sheet-badge';
  }

  if (item.date) {
    sheetDateBadge.style.display = 'inline-flex';
    sheetDate.textContent = formatDate(item.date);
  } else {
    sheetDateBadge.style.display = 'none';
  }

  if (item.category) {
    sheetCategoryBadge.style.display = 'inline-flex';
    sheetCategoryBadge.textContent = item.category;
  } else {
    sheetCategoryBadge.style.display = 'none';
  }

  renderRatingWidget('his', item.rating_his);
  renderRatingWidget('hers', item.rating_hers);

  if (sheetCustomActions) {
    sheetCustomActions.style.display = item.isCustom ? 'block' : 'none';
  }

  // Smoothly center the marker in the visible top half above the bottom sheet
  const bottomPadding = Math.min(window.innerHeight * 0.44, 340);
  map.flyTo({
    center: [item.longitude, item.latitude],
    zoom: 14.8,
    padding: { bottom: bottomPadding, top: 80, left: 20, right: 20 },
    speed: 1.2,
    curve: 1.4,
    essential: true
  });

  sheet.classList.add('open');
  sheetBackdrop.classList.add('visible');
}

function renderRatingWidget(userKey, currentScore) {
  const container = userKey === 'his' ? starsHisContainer : starsHersContainer;
  const display = userKey === 'his' ? ratingHisDisplay : ratingHersDisplay;

  container.innerHTML = '';

  if (currentScore) {
    display.textContent = `${currentScore} / 10`;
  } else {
    display.textContent = 'Čeká na ohodnocení';
  }

  // 10 stars with generous touch targets
  for (let i = 1; i <= 10; i++) {
    const starBtn = document.createElement('button');
    starBtn.type = 'button';
    starBtn.className = `rating-star-btn ${currentScore && i <= currentScore ? 'filled' : ''}`;
    starBtn.innerHTML = '★';
    starBtn.title = `${i} / 10`;

    starBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setRating(userKey, i);
    });

    container.appendChild(starBtn);
  }
}

function setRating(userKey, score) {
  if (!currentActiveItem) return;

  const propName = userKey === 'his' ? 'rating_his' : 'rating_hers';
  currentActiveItem[propName] = score;

  saveRatingOverride(currentActiveItem.id, propName, score);
  renderRatingWidget(userKey, score);
}

function closeDetailSheet() {
  sheet.classList.remove('open');
  sheetBackdrop.classList.remove('visible');
  sheet.style.transform = '';
  document.querySelectorAll('.custom-marker').forEach(m => m.classList.remove('active'));
  currentActiveItem = null;
}

sheetBackdrop.addEventListener('click', closeDetailSheet);

if (btnDeletePlace) {
  btnDeletePlace.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentActiveItem && currentActiveItem.isCustom) {
      deleteCustomPlace(currentActiveItem.id);
    }
  });
}

// =========================================================
// 5. IN-APP CREATION MODAL & MAP PICKER
// =========================================================
btnOpenCreate.addEventListener('click', () => {
  closeAllSheets();
  openCreateModal();
});

btnCloseCreate.addEventListener('click', closeCreateModal);
createModalBackdrop.addEventListener('click', closeCreateModal);

function openCreateModal() {
  createModal.classList.add('open');
  createModalBackdrop.classList.add('visible');
}

function closeCreateModal() {
  createModal.classList.remove('open');
  createModalBackdrop.classList.remove('visible');
  createModal.style.transform = '';
}

btnPickMap.addEventListener('click', () => {
  closeCreateModal();
  isPickMode = true;
  document.body.classList.add('pick-mode');
  pickModeBanner.classList.remove('hidden');
});

btnCancelPick.addEventListener('click', () => {
  stopPickMode();
  openCreateModal();
});

function handleMapPickCoordinate(lngLat) {
  inputLat.value = lngLat.lat.toFixed(5);
  inputLng.value = lngLat.lng.toFixed(5);
  coordsStatus.textContent = `Vybráno (${lngLat.lat.toFixed(4)}, ${lngLat.lng.toFixed(4)})`;
  coordsStatus.className = 'coords-status selected';

  if (tempPickMarker) tempPickMarker.remove();
  const pickEl = document.createElement('div');
  pickEl.className = 'custom-marker pick-marker-preview';
  pickEl.innerHTML = `
    <div class="marker-pin-inner">
      <div class="marker-pin-photo" style="background-color: #0284c7; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px rgba(56, 189, 248, 0.9);">
        <span style="font-size: 18px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));">📍</span>
      </div>
      <div class="marker-pin-pointer" style="background: #38bdf8;"></div>
    </div>
  `;
  // CRITICAL: anchor: 'bottom' anchors the needle apex to the exact picked coordinate
  tempPickMarker = new mapboxgl.Marker({
    element: pickEl,
    anchor: 'bottom'
  })
    .setLngLat([lngLat.lng, lngLat.lat])
    .addTo(map);

  stopPickMode();
  openCreateModal();
}

function stopPickMode() {
  isPickMode = false;
  document.body.classList.remove('pick-mode');
  pickModeBanner.classList.add('hidden');
}

document.querySelectorAll('.img-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.getElementById('input-image').value = chip.getAttribute('data-img');
  });
});

createForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const title = document.getElementById('input-title').value.trim();
  const type = document.querySelector('input[name="item_type"]:checked').value;
  const date = document.getElementById('input-date').value || null;
  const desc = document.getElementById('input-desc').value.trim();
  const img = document.getElementById('input-image').value.trim() || 'images/coffee.jpg';
  const category = document.getElementById('input-category').value.trim() || 'Různé';
  const isSeznam = document.getElementById('input-is-seznam').checked;
  const ratingHis = document.getElementById('input-rating-his').value ? parseInt(document.getElementById('input-rating-his').value) : null;
  const ratingHers = document.getElementById('input-rating-hers').value ? parseInt(document.getElementById('input-rating-hers').value) : null;

  const lat = parseFloat(inputLat.value);
  const lng = parseFloat(inputLng.value);

  if (isNaN(lat) || isNaN(lng)) {
    alert('Prosím vyberte polohu na mapě kliknutím na tlačítko "Vybrat na mapě".');
    return;
  }

  const newItem = {
    id: `${type === 'event' ? 'evt' : 'plc'}_${Date.now()}`,
    type: type,
    title: title,
    date: date,
    description: desc,
    latitude: lat,
    longitude: lng,
    image_url: img,
    category: category,
    is_seznam: isSeznam,
    rating_his: ratingHis,
    rating_hers: ratingHers,
    status: 'visited',
    isCustom: true
  };

  saveCustomItem(newItem);

  if (tempPickMarker) {
    tempPickMarker.remove();
    tempPickMarker = null;
  }
  createForm.reset();
  coordsStatus.textContent = 'Nevybráno';
  coordsStatus.className = 'coords-status';
  inputLat.value = '';
  inputLng.value = '';

  closeCreateModal();

  // Reset filter to 'all' if current filter would hide this item
  if (currentFilter !== 'all' && currentFilter !== newItem.type) {
    currentFilter = 'all';
    document.querySelectorAll('.filter-pill:not(.city-btn)').forEach(p => {
      p.classList.toggle('active', p.getAttribute('data-filter') === 'all');
    });
    renderClustersAndMarkers();
  }

  // Smoothly fly directly to the newly placed pin at city-level zoom
  map.flyTo({
    center: [newItem.longitude, newItem.latitude],
    zoom: 15.2,
    speed: 1.35,
    curve: 1.2,
    essential: true
  });

  setTimeout(() => {
    openDetailSheet(newItem);
    const markerEl = document.querySelector(`.custom-marker[data-id="${newItem.id}"]`);
    if (markerEl) {
      markerEl.classList.add('marker-just-added');
      setTimeout(() => markerEl.classList.remove('marker-just-added'), 4000);
    }
  }, 400);
});

// =========================================================
// 6. COUPLE SEZNAM DRAWER
// =========================================================
btnOpenSeznam.addEventListener('click', () => {
  closeAllSheets();
  openSeznamDrawer();
});

btnCloseSeznam.addEventListener('click', closeSeznamDrawer);
seznamBackdrop.addEventListener('click', closeSeznamDrawer);

function openSeznamDrawer() {
  updateSeznamDrawer();
  seznamDrawer.classList.add('open');
  seznamBackdrop.classList.add('visible');
}

function closeSeznamDrawer() {
  seznamDrawer.classList.remove('open');
  seznamBackdrop.classList.remove('visible');
  seznamDrawer.style.transform = '';
}

function saveChecklistState(skipRemote = false) {
  const overrides = {};
  const customItems = [];
  allChecklist.forEach(item => {
    if (item.isCustom) {
      customItems.push(item);
    } else {
      overrides[item.id] = item.checked;
    }
  });
  localStorage.setItem(STORAGE_CHECKLIST, JSON.stringify({ overrides, customItems }));

  // Real-time synchronization to Firebase Firestore
  if (db && !skipRemote) {
    db.collection('couple_data').doc('checklist').set({
      overrides,
      customItems,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(err => {
      console.warn("Firestore save checklist error:", err);
    });
  }
}

function toggleChecklistItem(itemId) {
  const item = allChecklist.find(it => it.id === itemId);
  if (!item) return;
  item.checked = !item.checked;
  saveChecklistState();
  updateSeznamDrawer();
}

function addQuickChecklistItem(title, category) {
  if (!title || !title.trim()) return;
  const newItem = {
    id: `chk_custom_${Date.now()}`,
    category: category || 'filmy',
    title: title.trim(),
    note: null,
    checked: false,
    isCustom: true
  };
  allChecklist.unshift(newItem);
  saveChecklistState();
  updateSeznamDrawer();
}

function deleteChecklistItem(itemId) {
  allChecklist = allChecklist.filter(it => it.id !== itemId);
  saveChecklistState();
  updateSeznamDrawer();
}

// Quick Add Form listeners
if (btnAddQuickChecklist && inputNewChecklistTitle) {
  const handleAdd = () => {
    const title = inputNewChecklistTitle.value;
    const cat = selectNewChecklistCategory ? selectNewChecklistCategory.value : 'filmy';
    if (cat === 'mista') {
      closeSeznamDrawer();
      openCreateModal();
      const titleInput = document.getElementById('input-title');
      if (titleInput) titleInput.value = title.trim();
      inputNewChecklistTitle.value = '';
      return;
    }
    if (title.trim()) {
      addQuickChecklistItem(title, cat);
      inputNewChecklistTitle.value = '';
    }
  };

  btnAddQuickChecklist.addEventListener('click', handleAdd);
  inputNewChecklistTitle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  });
}

function updateSeznamDrawer() {
  // Update progress bar
  const total = allChecklist.length;
  const completed = allChecklist.filter(it => it.checked).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (seznamBadgeCount) {
    seznamBadgeCount.textContent = `${completed} / ${total} splněno`;
  }
  if (seznamProgressBar) {
    seznamProgressBar.style.width = `${pct}%`;
  }
  if (seznamProgressText) {
    seznamProgressText.textContent = `${completed} z ${total} (${pct}%)`;
  }

  seznamItemsList.innerHTML = '';

  // Tab: Místa (Places on the map)
  if (currentSeznamTab === 'mista') {
    // Show all user-created places FIRST, followed by other saved places
    const customPlaces = allItems.filter(it => it.isCustom);
    const baseSeznamPlaces = allItems.filter(it => !it.isCustom && it.is_seznam);
    const seznamPlaces = [...customPlaces, ...baseSeznamPlaces];

    if (seznamPlaces.length === 0) {
      seznamItemsList.innerHTML = `
        <div style="text-align: center; padding: 30px 10px; color: var(--text-muted);">
          <p style="font-size: 1.5rem; margin-bottom: 6px;">📍</p>
          <p style="font-size: 0.9rem; font-weight: 600;">Žádná místa na mapě</p>
          <p style="font-size: 0.8rem; margin-top: 4px;">Můžete přidat místo do Couple Seznamu tlačítkem "+ Přidat".</p>
        </div>
      `;
      return;
    }

    seznamPlaces.forEach(item => {
      const card = document.createElement('div');
      card.className = 'seznam-card';
      const hisScoreText = item.rating_his ? `👦 ${item.rating_his}/10` : '';
      const hersScoreText = item.rating_hers ? `👧 ${item.rating_hers}/10` : '';

      card.innerHTML = `
        <img src="${item.image_url || 'images/coffee.jpg'}" alt="${escapeHtml(item.title)}" class="seznam-card-img" />
        <div class="seznam-card-info">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
            <span class="seznam-card-title">${escapeHtml(item.title)}</span>
            ${item.isCustom ? `<span style="font-size: 0.65rem; background: rgba(56, 189, 248, 0.15); color: #0284c7; padding: 2px 6px; border-radius: 6px; font-weight: 700; white-space: nowrap;">⭐ Vaše místo</span>` : ''}
          </div>
          <span class="seznam-card-sub">${escapeHtml(item.category || '')} ${item.date ? '• ' + formatDate(item.date) : ''}</span>
          <div class="seznam-card-ratings">
            ${hisScoreText ? `<span class="mini-rating-tag">${hisScoreText}</span>` : ''}
            ${hersScoreText ? `<span class="mini-rating-tag">${hersScoreText}</span>` : ''}
            ${!hisScoreText && !hersScoreText ? `<span class="mini-rating-tag" style="opacity:0.6;">Zatím nehodnoceno</span>` : ''}
          </div>
        </div>
        ${item.isCustom ? `
          <button class="btn-delete-check" title="Smazat místo" aria-label="Smazat" style="margin-right: 6px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        ` : ''}
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-check')) {
          e.stopPropagation();
          deleteCustomPlace(item.id);
          return;
        }
        closeSeznamDrawer();
        map.flyTo({
          center: [item.longitude, item.latitude],
          zoom: 15.2,
          speed: 1.3,
          essential: true
        });
        setTimeout(() => {
          openDetailSheet(item);
        }, 350);
      });

      seznamItemsList.appendChild(card);
    });
    return;
  }

  // Filter checklist items by category
  let displayedChecklist = allChecklist;
  if (currentSeznamTab === 'filmy') {
    displayedChecklist = allChecklist.filter(it => it.category === 'filmy');
  } else if (currentSeznamTab === 'jidlo') {
    displayedChecklist = allChecklist.filter(it => it.category === 'jidlo');
  } else if (currentSeznamTab === 'aktivity') {
    displayedChecklist = allChecklist.filter(it => it.category === 'aktivity');
  }

  if (displayedChecklist.length === 0) {
    seznamItemsList.innerHTML = `
      <div style="text-align: center; padding: 30px 10px; color: var(--text-muted);">
        <p style="font-size: 1.5rem; margin-bottom: 6px;">💌</p>
        <p style="font-size: 0.9rem; font-weight: 600;">Žádné položky v této kategorii</p>
        <p style="font-size: 0.8rem; margin-top: 4px;">Můžete přidat novou položku pomocí formuláře výše.</p>
      </div>
    `;
    return;
  }

  // Render checklist items
  displayedChecklist.forEach(item => {
    const el = document.createElement('div');
    el.className = `seznam-check-item ${item.checked ? 'checked' : ''}`;
    el.setAttribute('data-id', item.id);

    let catLabel = '';
    if (item.category === 'filmy') catLabel = '🎬 Film';
    else if (item.category === 'jidlo') catLabel = '🍔 Jídlo';
    else if (item.category === 'aktivity') catLabel = '🎯 Aktivita';
    else if (item.category) catLabel = item.category;

    el.innerHTML = `
      <div class="check-box ${item.checked ? 'checked' : ''}">
        <svg viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </div>
      <div class="check-item-content">
        <div class="check-item-header">
          <span class="check-item-title">${escapeHtml(item.title)}</span>
          ${catLabel ? `<span class="check-item-category-tag">${catLabel}</span>` : ''}
        </div>
        ${item.note ? `
          <div class="check-item-note">
            <span class="check-note-icon">💬</span>
            <span>"${escapeHtml(item.note)}"</span>
          </div>
        ` : ''}
      </div>
      ${item.isCustom ? `
        <button class="btn-delete-check" title="Smazat položku" aria-label="Smazat">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      ` : ''}
    `;

    el.addEventListener('click', (e) => {
      if (e.target.closest('.btn-delete-check')) {
        e.stopPropagation();
        deleteChecklistItem(item.id);
        return;
      }
      toggleChecklistItem(item.id);
    });

    seznamItemsList.appendChild(el);
  });
}

document.querySelectorAll('.seznam-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.seznam-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentSeznamTab = tab.getAttribute('data-stab');
    updateSeznamDrawer();
  });
});

btnExportJson.addEventListener('click', () => {
  const exportPayload = {
    items: allItems,
    checklist: allChecklist,
    exported_at: new Date().toISOString()
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `couple_seznam_backup_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
});

// =========================================================
// 7. TOUCH / MOUSE SWIPE PHYSICS FOR BOTTOM SHEET
// =========================================================
let dragStartY = 0;
let dragCurrentY = 0;
let isDragging = false;

function handleDragStart(clientY) {
  dragStartY = clientY;
  isDragging = true;
  sheet.classList.add('dragging');
}

function handleDragMove(clientY) {
  if (!isDragging) return;
  dragCurrentY = clientY;
  const deltaY = dragCurrentY - dragStartY;

  if (deltaY > 0) {
    sheet.style.transform = `translateY(${deltaY}px)`;
  } else {
    sheet.style.transform = `translateY(${deltaY * 0.2}px)`;
  }
}

function handleDragEnd() {
  if (!isDragging) return;
  isDragging = false;
  sheet.classList.remove('dragging');

  const deltaY = dragCurrentY - dragStartY;
  if (deltaY > 80) {
    closeDetailSheet();
  } else {
    sheet.style.transform = 'translateY(0)';
  }

  dragStartY = 0;
  dragCurrentY = 0;
}

dragHandle.addEventListener('touchstart', (e) => handleDragStart(e.touches[0].clientY), { passive: true });
window.addEventListener('touchmove', (e) => {
  if (isDragging) {
    handleDragMove(e.touches[0].clientY);
    if (e.cancelable) e.preventDefault();
  }
}, { passive: false });
window.addEventListener('touchend', handleDragEnd);

dragHandle.addEventListener('mousedown', (e) => handleDragStart(e.clientY));
window.addEventListener('mousemove', (e) => {
  if (isDragging) handleDragMove(e.clientY);
});
window.addEventListener('mouseup', handleDragEnd);

// =========================================================
// 8. HELPERS & GENERAL
// =========================================================
function closeAllSheets() {
  closeDetailSheet();
  closeCreateModal();
  closeSeznamDrawer();
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('cs-CZ', options);
}

function getCzechPlural(count, one, few, many) {
  if (count === 1) return one;
  if (count >= 2 && count <= 4) return few;
  return many;
}

// App Entry Point
window.addEventListener('DOMContentLoaded', () => {
  initMap();
  loadData();
});
