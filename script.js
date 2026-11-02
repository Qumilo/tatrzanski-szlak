document.addEventListener('DOMContentLoaded', () => {

    // Zegar i odliczanie do wschodu słońca / zmierzchu
    const liveClockEl = document.getElementById('live-clock');
    const sunsetTimerEl = document.getElementById('sunset-timer');

    const sunSchedule = {
        1:  { riseH: 7, riseM: 35, setH: 16, setM: 10 },
        2:  { riseH: 6, riseM: 50, setH: 17, setM: 0  },
        3:  { riseH: 5, riseM: 55, setH: 17, setM: 50 },
        4:  { riseH: 5, riseM: 50, setH: 19, setM: 35 },
        5:  { riseH: 5, riseM: 0,  setH: 20, setM: 20 },
        6:  { riseH: 4, riseM: 35, setH: 20, setM: 50 },
        7:  { riseH: 4, riseM: 50, setH: 20, setM: 40 },
        8:  { riseH: 5, riseM: 30, setH: 19, setM: 55 },
        9:  { riseH: 6, riseM: 15, setH: 18, setM: 50 },
        10: { riseH: 7, riseM: 0,  setH: 17, setM: 45 },
        11: { riseH: 6, riseM: 55, setH: 16, setM: 0  },
        12: { riseH: 7, riseM: 35, setH: 15, setM: 45 }
    };

    function updateClockAndSun() {
        const now = new Date();
        if (liveClockEl) {
            liveClockEl.textContent = now.toLocaleTimeString('pl-PL');
        }
        if (!sunsetTimerEl) return;

        const sched = sunSchedule[now.getMonth() + 1] || { riseH: 6, riseM: 30, setH: 17, setM: 0 };
        const todaySunrise = new Date(now);
        todaySunrise.setHours(sched.riseH, sched.riseM, 0, 0);

        const todaySunset = new Date(now);
        todaySunset.setHours(sched.setH, sched.setM, 0, 0);

        if (now < todaySunrise) {
            const diffMs = todaySunrise - now;
            const hrs = Math.floor(diffMs / 3600000);
            const mins = Math.floor((diffMs % 3600000) / 60000);
            sunsetTimerEl.innerHTML = `Noc na szlaku – do wschodu: <strong>${hrs}h ${mins}m</strong>`;
        } else if (now < todaySunset) {
            const diffMs = todaySunset - now;
            const hrs = Math.floor(diffMs / 3600000);
            const mins = Math.floor((diffMs % 3600000) / 60000);
            sunsetTimerEl.innerHTML = `Dzień – do zmierzchu: <strong>${hrs}h ${mins}m</strong>`;
        } else {
            const tomorrowSunrise = new Date(todaySunrise);
            tomorrowSunrise.setDate(tomorrowSunrise.getDate() + 1);
            const diffMs = tomorrowSunrise - now;
            const hrs = Math.floor(diffMs / 3600000);
            const mins = Math.floor((diffMs % 3600000) / 60000);
            sunsetTimerEl.innerHTML = `Noc na szlaku – do wschodu: <strong>${hrs}h ${mins}m</strong>`;
        }
    }

    updateClockAndSun();
    setInterval(updateClockAndSun, 1000);

    // Menu mobilne i zmiana motywu (jasny / ciemny)
    const menuToggle = document.getElementById('menu-toggle');
    const mainNav = document.getElementById('main-nav');

    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            const isOpen = mainNav.classList.toggle('open');
            menuToggle.classList.toggle('active', isOpen);
            menuToggle.setAttribute('aria-expanded', String(isOpen));
        });

        mainNav.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                mainNav.classList.remove('open');
                menuToggle.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }

    const themeToggle = document.getElementById('theme-toggle');
    if (localStorage.getItem('tatry_theme') === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeToggle) themeToggle.textContent = '☀️ Tryb dzienny';
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-mode');
            themeToggle.textContent = isDark ? '☀️ Tryb dzienny' : '🌙 Tryb nocny';
            localStorage.setItem('tatry_theme', isDark ? 'dark' : 'light');
        });
    }

    // Wyszukiwarka i filtrowanie katalogu szlaków
    const searchInput = document.getElementById('trail-search');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const trailCards = document.querySelectorAll('.trail-card');
    const noResultsMsg = document.getElementById('no-results-msg');
    let activeFilter = 'wszystkie';

    function filterTrails() {
        const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
        let visibleCount = 0;

        trailCards.forEach(card => {
            const categories = (card.dataset.category || '').split(' ');
            const matchesCategory = activeFilter === 'wszystkie' || categories.includes(activeFilter);
            const matchesQuery = query === '' || card.textContent.toLowerCase().includes(query);

            if (matchesCategory && matchesQuery) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        if (noResultsMsg) {
            noResultsMsg.hidden = visibleCount > 0;
        }
    }

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.dataset.filter;
            filterTrails();
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', filterTrails);
    }

    // Mapa szlaków (Leaflet) i kalkulator trasy
    const tatraNodes = {
        koziniec:          { id: 'koziniec', name: 'Zakopane (Rondo JP II / Koziniec)', elev: 936, lat: 49.2804, lng: 19.9752, group: 'Start' },
        wylotbialego:      { id: 'wylotbialego', name: 'Dolina Białego (wylot / Droga pod Reglami)', elev: 930, lat: 49.2764, lng: 19.9556, group: 'Start' },
        kuznice:           { id: 'kuznice', name: 'Kuźnice (Potok Bystra)', elev: 1010, lat: 49.2693, lng: 19.9802, group: 'Start' },
        strazyska:         { id: 'strazyska', name: 'Dolina Strążyska (wylot)', elev: 900, lat: 49.2784, lng: 19.9394, group: 'Start' },
        kiry:              { id: 'kiry', name: 'Kiry (Dolina Kościeliska)', elev: 927, lat: 49.2754, lng: 19.8689, group: 'Start' },
        palenica:          { id: 'palenica', name: 'Palenica Białczańska', elev: 984, lat: 49.2552, lng: 20.1029, group: 'Start' },
        kopanadbialym:     { id: 'kopanadbialym', name: 'Ścieżka nad Reglami (pod Kopą nad Białym)', elev: 1035, lat: 49.2622, lng: 19.9555, group: 'Regle' },
        sarniaskala:       { id: 'sarniaskala', name: 'Sarnia Skała', elev: 1377, lat: 49.2654, lng: 19.9416, group: 'Regle' },
        kalatowki:         { id: 'kalatowki', name: 'Polana Kalatówki', elev: 1198, lat: 49.2608, lng: 19.9712, group: 'Doliny' },
        kondratowa:        { id: 'kondratowa', name: 'Hala Kondratowa (schronisko PTTK)', elev: 1333, lat: 49.2486, lng: 19.9488, group: 'Doliny' },
        kondrackaprzelecz: { id: 'kondrackaprzelecz', name: 'Kondracka Przełęcz', elev: 1725, lat: 49.2466, lng: 19.9340, group: 'Przełęcze' },
        giewont:           { id: 'giewont', name: 'Giewont (łańcuchy)', elev: 1894, lat: 49.2508, lng: 19.9341, group: 'Szczyty' },
        ornak:             { id: 'ornak', name: 'Hala Ornak / Wąwóz Kraków', elev: 1100, lat: 49.2291, lng: 19.8621, group: 'Doliny' },
        ciemniak:          { id: 'ciemniak', name: 'Ciemniak', elev: 2096, lat: 49.2312, lng: 19.9032, group: 'Czerwone Wierchy' },
        krzesanica:        { id: 'krzesanica', name: 'Krzesanica', elev: 2122, lat: 49.2316, lng: 19.9105, group: 'Czerwone Wierchy' },
        malolaczniak:      { id: 'malolaczniak', name: 'Małołączniak', elev: 2096, lat: 49.2360, lng: 19.9193, group: 'Czerwone Wierchy' },
        kopakondracka:     { id: 'kopakondracka', name: 'Kopa Kondracka', elev: 2005, lat: 49.2367, lng: 19.9322, group: 'Czerwone Wierchy' },
        boczan:            { id: 'boczan', name: 'Boczań / Skupniów Upłaz', elev: 1224, lat: 49.2643, lng: 19.9911, group: 'Regle' },
        myslenickieturnie: { id: 'myslenickieturnie', name: 'Myślenickie Turnie', elev: 1352, lat: 49.2507, lng: 19.9803, group: 'Regle' },
        murowaniec:        { id: 'murowaniec', name: 'Hala Gąsienicowa (Murowaniec)', elev: 1500, lat: 49.2435, lng: 20.0071, group: 'Doliny' },
        zielonystaw:       { id: 'zielonystaw', name: 'Zielony Staw Gąsienicowy', elev: 1672, lat: 49.2296, lng: 20.0001, group: 'Stawy' },
        czarnystaw:        { id: 'czarnystaw', name: 'Czarny Staw Gąsienicowy', elev: 1624, lat: 49.2330, lng: 20.0175, group: 'Stawy' },
        karb:              { id: 'karb', name: 'Przełęcz Karb', elev: 1853, lat: 49.2298, lng: 20.0085, group: 'Przełęcze' },
        koscielec:         { id: 'koscielec', name: 'Kościelec', elev: 2155, lat: 49.2255, lng: 20.0148, group: 'Szczyty' },
        kasprowy:          { id: 'kasprowy', name: 'Kasprowy Wierch', elev: 1987, lat: 49.2315, lng: 19.9816, group: 'Szczyty' },
        beskid:            { id: 'beskid', name: 'Beskid', elev: 2012, lat: 49.2286, lng: 19.9876, group: 'Szczyty' },
        swinica:           { id: 'swinica', name: 'Świnica (łańcuchy)', elev: 2301, lat: 49.2194, lng: 20.0093, group: 'Szczyty' },
        zawrat:            { id: 'zawrat', name: 'Przełęcz Zawrat (Orla Perć)', elev: 2159, lat: 49.2189, lng: 20.0169, group: 'Orla Perć' },
        koziwierch:        { id: 'koziwierch', name: 'Kozi Wierch (Orla Perć)', elev: 2291, lat: 49.2184, lng: 20.0286, group: 'Orla Perć' },
        krzyzne:           { id: 'krzyzne', name: 'Przełęcz Krzyżne (Orla Perć)', elev: 2112, lat: 49.2281, lng: 20.0472, group: 'Orla Perć' },
        piecstawow:        { id: 'piecstawow', name: 'Dolina Pięciu Stawów', elev: 1671, lat: 49.2136, lng: 20.0485, group: 'Doliny' },
        szpiglasowy:       { id: 'szpiglasowy', name: 'Szpiglasowy Wierch (łańcuchy)', elev: 2172, lat: 49.1975, lng: 20.0430, group: 'Szczyty' },
        morskieoko:        { id: 'morskieoko', name: 'Morskie Oko', elev: 1395, lat: 49.2014, lng: 20.0711, group: 'Stawy' },
        rysy:              { id: 'rysy', name: 'Rysy (najwyższy szczyt)', elev: 2499, lat: 49.1795, lng: 20.0881, group: 'Szczyty' }
    };

    // Punkty pośrednie odwzorowujące przebieg szlaków TPN na mapie
    const trailPaths = {
        'kuznice_boczan': [[49.2693, 19.9802], [49.2676, 19.9835], [49.2656, 19.9872], [49.2643, 19.9911]],
        'boczan_murowaniec': [[49.2643, 19.9911], [49.2590, 19.9950], [49.2535, 19.9985], [49.2485, 20.0005], [49.2435, 20.0071]],
        'murowaniec_zielonystaw': [[49.2435, 20.0071], [49.2408, 20.0018], [49.2362, 19.9953], [49.2314, 19.9974], [49.2296, 20.0001]],
        'zielonystaw_beskid': [[49.2296, 20.0001], [49.2260, 20.0050], [49.2230, 20.0032], [49.2225, 19.9993], [49.2249, 19.9933], [49.2286, 19.9876]],
        'beskid_kasprowy': [[49.2286, 19.9876], [49.2298, 19.9850], [49.2315, 19.9816]],
        'kasprowy_kopakondracka': [[49.2315, 19.9816], [49.2325, 19.9720], [49.2305, 19.9640], [49.2300, 19.9520], [49.2335, 19.9410], [49.2367, 19.9322]],
        'kopakondracka_malolaczniak': [[49.2367, 19.9322], [49.2358, 19.9255], [49.2360, 19.9193]],
        'malolaczniak_krzesanica': [[49.2360, 19.9193], [49.2335, 19.9150], [49.2316, 19.9105]],
        'kopakondracka_kondrackaprzelecz': [[49.2367, 19.9322], [49.2415, 19.9332], [49.2466, 19.9340]],
        'kondrackaprzelecz_giewont': [[49.2466, 19.9340], [49.2490, 19.9335], [49.2508, 19.9341]],
        'kondrackaprzelecz_kondratowa': [[49.2466, 19.9340], [49.2468, 19.9415], [49.2486, 19.9488]],
        'kondratowa_kalatowki': [[49.2486, 19.9488], [49.2535, 19.9580], [49.2575, 19.9660], [49.2608, 19.9712]],
        'kalatowki_kuznice': [[49.2608, 19.9712], [49.2645, 19.9755], [49.2693, 19.9802]],
        'koziniec_wylotbialego': [[49.2804, 19.9752], [49.2774, 19.9675], [49.2780, 19.9580], [49.2764, 19.9556]],
        'wylotbialego_kopanadbialym': [[49.2764, 19.9556], [49.2722, 19.9545], [49.2675, 19.9548], [49.2622, 19.9555]],
        'kopanadbialym_kalatowki': [[49.2622, 19.9555], [49.2592, 19.9555], [49.2592, 19.9632], [49.2624, 19.9675], [49.2608, 19.9712]],
        'kuznice_koziniec': [[49.2693, 19.9802], [49.2720, 19.9848], [49.2760, 19.9820], [49.2804, 19.9752]],
        'murowaniec_czarnystaw': [[49.2435, 20.0071], [49.2390, 20.0120], [49.2330, 20.0175]],
        'czarnystaw_zawrat': [[49.2330, 20.0175], [49.2280, 20.0215], [49.2230, 20.0195], [49.2189, 20.0169]],
        'zawrat_koziwierch': [[49.2189, 20.0169], [49.2192, 20.0225], [49.2184, 20.0286]],
        'koziwierch_krzyzne': [[49.2184, 20.0286], [49.2215, 20.0340], [49.2245, 20.0390], [49.2281, 20.0472]],
        'krzyzne_murowaniec': [[49.2281, 20.0472], [49.2350, 20.0380], [49.2400, 20.0220], [49.2435, 20.0071]],
        'palenica_piecstawow': [[49.2552, 20.1029], [49.2360, 20.0890], [49.2255, 20.0785], [49.2175, 20.0610], [49.2136, 20.0485]],
        'piecstawow_szpiglasowy': [[49.2136, 20.0485], [49.2060, 20.0425], [49.1985, 20.0415], [49.1975, 20.0430]],
        'szpiglasowy_morskieoko': [[49.1975, 20.0430], [49.1985, 20.0445], [49.2005, 20.0580], [49.2014, 20.0711]],
        'morskieoko_palenica': [[49.2014, 20.0711], [49.2150, 20.0810], [49.2360, 20.0890], [49.2552, 20.1029]]
    };

    const presets = {
        'moja-wyrypa': [
            'kuznice', 'boczan', 'murowaniec', 'zielonystaw', 'beskid', 'kasprowy',
            'kopakondracka', 'malolaczniak', 'krzesanica', 'malolaczniak', 'kopakondracka',
            'kondrackaprzelecz', 'kondratowa', 'kalatowki', 'kuznice'
        ],
        'moja-rozgrzewka': [
            'koziniec', 'wylotbialego', 'kopanadbialym', 'kalatowki', 'kuznice', 'koziniec'
        ],
        'orla-perc': [
            'kuznice', 'boczan', 'murowaniec', 'czarnystaw', 'zawrat', 'koziwierch', 'krzyzne', 'murowaniec', 'boczan', 'kuznice'
        ],
        'giewont-czerwone': [
            'kuznice', 'kalatowki', 'kondratowa', 'kondrackaprzelecz', 'giewont', 'kondrackaprzelecz', 'kopakondracka', 'kondratowa', 'kalatowki', 'kuznice'
        ],
        'szpiglasowy': [
            'palenica', 'piecstawow', 'szpiglasowy', 'morskieoko', 'palenica'
        ]
    };

    const waypointsListEl = document.getElementById('waypoints-list');
    const waypointFilterInput = document.getElementById('waypoint-filter');
    const paceSelect = document.getElementById('route-pace');
    const loopRouteBtn = document.getElementById('loop-route-btn');
    const undoPointBtn = document.getElementById('undo-point-btn');
    const clearRouteBtn = document.getElementById('clear-route-btn');
    const presetButtons = document.querySelectorAll('.btn-preset');

    const routePathText = document.getElementById('route-path-text');
    const sumDist = document.getElementById('sum-dist');
    const sumElev = document.getElementById('sum-elev');
    const sumTime = document.getElementById('sum-time');
    const sumGot = document.getElementById('sum-got');
    const plannedRouteOption = document.getElementById('planned-route-option');
    const formMapPreviewText = document.getElementById('form-map-preview-text');

    let selectedSequence = JSON.parse(localStorage.getItem('tatry_planned_route') || 'null');
    if (!Array.isArray(selectedSequence) || selectedSequence.length === 0) {
        selectedSequence = [...presets['moja-wyrypa']];
    } else {
        selectedSequence = selectedSequence.filter(id => Boolean(tatraNodes[id]));
        if (selectedSequence.length === 0) {
            selectedSequence = [...presets['moja-wyrypa']];
        }
    }

    let currentPlannedRouteSummary = '';
    let map = null;
    let routeLine = null;
    const nodeMarkers = {};

    function getDistanceKm(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function getSegmentCoords(n1, n2) {
        const fwdKey = `${n1.id}_${n2.id}`;
        if (trailPaths[fwdKey]) {
            return trailPaths[fwdKey];
        }
        const revKey = `${n2.id}_${n1.id}`;
        if (trailPaths[revKey]) {
            return [...trailPaths[revKey]].reverse();
        }
        return [[n1.lat, n1.lng], [n2.lat, n2.lng]];
    }

    function isSameSequence(a, b) {
        return a.length === b.length && a.every((val, index) => val === b[index]);
    }

    function saveRouteState() {
        localStorage.setItem('tatry_planned_route', JSON.stringify(selectedSequence));
    }

    function buildPinIcon(nodeId) {
        const occurrences = [];
        selectedSequence.forEach((seqId, idx) => {
            if (seqId === nodeId) occurrences.push(idx + 1);
        });
        const isSelected = occurrences.length > 0;
        const labelText = occurrences.join(', ');
        const width = isSelected ? Math.max(28, labelText.length * 7 + 14) : 14;
        const height = isSelected ? 28 : 14;
        const bg = isSelected ? '#e05a1b' : '#1f5c3f';

        const style = `
            width: ${width}px;
            height: ${height}px;
            background-color: ${bg};
            color: #ffffff;
            border: 2px solid #ffffff;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        `;

        return L.divIcon({
            className: '',
            html: `<div style="${style}">${isSelected ? labelText : ''}</div>`,
            iconSize: [width, height],
            iconAnchor: [width / 2, height / 2]
        });
    }

    const mapElement = document.getElementById('tatra-map');
    if (mapElement && typeof L !== 'undefined') {
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 17,
            minZoom: 11,
            attribution: '&copy; OpenStreetMap'
        });

        const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            maxZoom: 17,
            minZoom: 11,
            attribution: '&copy; OpenTopoMap'
        });

        const hikingTrailsLayer = L.tileLayer('https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png', {
            maxZoom: 17,
            opacity: 0.45,
            attribution: '&copy; Waymarked Trails'
        });

        map = L.map('tatra-map', {
            center: [49.245, 19.965],
            zoom: 12,
            minZoom: 11,
            layers: [osmLayer, hikingTrailsLayer]
        });

        L.control.layers(
            {
                'Mapa turystyczna (OSM)': osmLayer,
                'Mapa topograficzna (poziomice)': topoLayer
            },
            {
                'Szlaki turystyczne PTTK': hikingTrailsLayer
            }
        ).addTo(map);

        Object.values(tatraNodes).forEach(node => {
            const marker = L.marker([node.lat, node.lng], {
                icon: buildPinIcon(node.id),
                title: `${node.name} (${node.elev} m)`
            }).addTo(map);

            marker.on('click', () => {
                if (selectedSequence[selectedSequence.length - 1] === node.id) {
                    selectedSequence.pop();
                } else {
                    selectedSequence.push(node.id);
                }
                saveRouteState();
                renderWaypointsList();
                updateCustomRoute(false);
            });

            nodeMarkers[node.id] = marker;
        });
    }

    function renderWaypointsList() {
        if (!waypointsListEl) return;
        const query = (waypointFilterInput ? waypointFilterInput.value : '').trim().toLowerCase();
        waypointsListEl.innerHTML = '';

        Object.values(tatraNodes).forEach(node => {
            const textToMatch = `${node.name} ${node.group} ${node.elev}`.toLowerCase();
            if (query && !textToMatch.includes(query)) return;

            const occurrences = [];
            selectedSequence.forEach((id, idx) => {
                if (id === node.id) occurrences.push(idx + 1);
            });
            const isSelected = occurrences.length > 0;

            const itemDiv = document.createElement('div');
            itemDiv.className = `waypoint-item ${isSelected ? 'selected' : ''}`;

            const leftDiv = document.createElement('div');
            leftDiv.className = 'waypoint-item-left';

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = isSelected;
            cb.addEventListener('change', e => {
                e.stopPropagation();
                if (cb.checked) {
                    selectedSequence.push(node.id);
                } else {
                    selectedSequence = selectedSequence.filter(id => id !== node.id);
                }
                saveRouteState();
                renderWaypointsList();
                updateCustomRoute(false);
            });

            const span = document.createElement('span');
            span.innerHTML = `<strong>${node.name}</strong> (${node.elev} m)`;
            leftDiv.appendChild(cb);
            leftDiv.appendChild(span);
            itemDiv.appendChild(leftDiv);

            if (isSelected) {
                const badge = document.createElement('span');
                badge.className = 'waypoint-order-badge';
                badge.textContent = occurrences.join(', ');
                itemDiv.appendChild(badge);
            }

            itemDiv.addEventListener('click', e => {
                if (e.target === cb) return;
                if (isSelected && selectedSequence[selectedSequence.length - 1] === node.id) {
                    selectedSequence.pop();
                } else {
                    selectedSequence.push(node.id);
                }
                saveRouteState();
                renderWaypointsList();
                updateCustomRoute(false);
            });

            waypointsListEl.appendChild(itemDiv);
        });
    }

    function updateCustomRoute(fitMap = true) {
        if (map) {
            Object.keys(nodeMarkers).forEach(id => {
                nodeMarkers[id].setIcon(buildPinIcon(id));
            });

            if (routeLine) {
                map.removeLayer(routeLine);
                routeLine = null;
            }
        }

        if (selectedSequence.length < 2) {
            routePathText.textContent = selectedSequence.length === 1
                ? `Punkt startowy: ${tatraNodes[selectedSequence[0]].name}. Wybierz kolejny punkt z listy lub na mapie.`
                : 'Zaznacz co najmniej 2 punkty na liście obok lub kliknij znaczniki na mapie.';
            sumDist.textContent = '0 km';
            sumElev.textContent = '+0 m';
            sumTime.textContent = '0h 00m';
            sumGot.textContent = '0 pkt';
            currentPlannedRouteSummary = '';
            return;
        }

        const nodesSeq = selectedSequence.map(id => tatraNodes[id]).filter(Boolean);
        const allCoords = [];
        let totalKm = 0;
        let totalClimb = 0;

        for (let i = 0; i < nodesSeq.length - 1; i++) {
            const n1 = nodesSeq[i];
            const n2 = nodesSeq[i + 1];
            const segCoords = getSegmentCoords(n1, n2);

            segCoords.forEach((pt, idx) => {
                if (i === 0 || idx > 0) {
                    allCoords.push(pt);
                }
            });

            let legKm = 0;
            for (let j = 0; j < segCoords.length - 1; j++) {
                legKm += getDistanceKm(segCoords[j][0], segCoords[j][1], segCoords[j + 1][0], segCoords[j + 1][1]);
            }
            legKm *= 1.15;
            totalKm += legKm;

            const elevDiff = n2.elev - n1.elev;
            if (elevDiff > 0) {
                totalClimb += elevDiff + Math.round(legKm * 20);
            } else {
                totalClimb += Math.round(legKm * 15);
            }
        }

        if (map && allCoords.length >= 2) {
            routeLine = L.polyline(allCoords, {
                color: '#e05a1b',
                weight: 4.5,
                opacity: 0.95,
                lineJoin: 'round'
            }).addTo(map);

            if (fitMap) {
                map.fitBounds(routeLine.getBounds(), { padding: [35, 35], maxZoom: 14 });
            }
        }

        let baseHours = 0;
        if (isSameSequence(selectedSequence, presets['moja-wyrypa'])) {
            totalKm = 25.9;
            totalClimb = 2115;
            baseHours = 11 + (39 / 60);
        } else if (isSameSequence(selectedSequence, presets['moja-rozgrzewka'])) {
            totalKm = 12.3;
            totalClimb = 746;
            baseHours = 4 + (47 / 60);
        } else {
            totalKm = Math.round(totalKm * 10) / 10;
            totalClimb = Math.round(totalClimb);
            baseHours = (totalKm / 3.8) + (totalClimb / 420);
        }

        const paceFactor = paceSelect ? parseFloat(paceSelect.value) : 1.0;
        const gotPoints = Math.round(totalKm) + Math.round(totalClimb / 100);
        const adjustedHours = baseHours * paceFactor;
        const hrs = Math.floor(adjustedHours);
        const mins = Math.round((adjustedHours - hrs) * 60);

        const selectedKeyNames = nodesSeq.map(n => n.name).join(' → ');
        routePathText.textContent = selectedKeyNames;
        currentPlannedRouteSummary = `Własna trasa z mapy: ${selectedKeyNames} (${totalKm.toFixed(1)} km, ↑${totalClimb} m)`;

        if (plannedRouteOption) {
            plannedRouteOption.value = currentPlannedRouteSummary;
            plannedRouteOption.textContent = currentPlannedRouteSummary;
        }
        if (formMapPreviewText) {
            formMapPreviewText.textContent = `${selectedKeyNames} — Dystans: ${totalKm.toFixed(1)} km | Suma podejść: +${totalClimb} m | Czas: ${hrs}h ${String(mins).padStart(2, '0')}m`;
        }

        sumDist.textContent = `${totalKm.toFixed(1)} km`;
        sumElev.textContent = `+${totalClimb} m`;
        sumTime.textContent = `${hrs}h ${String(mins).padStart(2, '0')}m`;
        sumGot.textContent = `${gotPoints} pkt`;
    }

    if (waypointFilterInput) {
        waypointFilterInput.addEventListener('input', renderWaypointsList);
    }
    if (paceSelect) {
        paceSelect.addEventListener('change', () => updateCustomRoute(false));
    }
    if (loopRouteBtn) {
        loopRouteBtn.addEventListener('click', () => {
            if (selectedSequence.length >= 2 && selectedSequence[0] !== selectedSequence[selectedSequence.length - 1]) {
                selectedSequence.push(selectedSequence[0]);
                saveRouteState();
                renderWaypointsList();
                updateCustomRoute(true);
            }
        });
    }
    if (undoPointBtn) {
        undoPointBtn.addEventListener('click', () => {
            if (selectedSequence.length > 0) {
                selectedSequence.pop();
                saveRouteState();
                renderWaypointsList();
                updateCustomRoute(false);
            }
        });
    }
    if (clearRouteBtn) {
        clearRouteBtn.addEventListener('click', () => {
            selectedSequence = [];
            saveRouteState();
            renderWaypointsList();
            updateCustomRoute(false);
        });
    }

    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const seq = presets[btn.dataset.preset];
            if (seq) {
                selectedSequence = [...seq];
                saveRouteState();
                renderWaypointsList();
                updateCustomRoute(true);
            }
        });
    });

    renderWaypointsList();
    updateCustomRoute(true);

    // Checklista ekwipunku w góry
    const defaultGearItems = [
        { text: 'Buty trekkingowe z dobrą podeszwą', checked: false },
        { text: 'Kurtka przeciwdeszczowa i przeciwwiatrowa', checked: false },
        { text: 'Zapas wody (min. 2 l) oraz prowiant wysokoenergetyczny', checked: false },
        { text: 'Latarka czołówka i zapasowe baterie', checked: false },
        { text: 'Naładowany telefon z aplikacją Ratunek + powerbank', checked: false },
        { text: 'Apteczka osobista (folia NRC, plastry, bandaż)', checked: false },
        { text: 'Ciepła bluza (polar), czapka i rękawiczki (także pod łańcuchy)', checked: false },
        { text: 'Papierowa mapa Tatr lub pobrana mapa offline', checked: false }
    ];

    const packingListEl = document.getElementById('packing-list');
    const totalItemsCountEl = document.getElementById('total-items-count');
    const checkedItemsCountEl = document.getElementById('checked-items-count');
    const addGearForm = document.getElementById('add-gear-form');
    const newGearInput = document.getElementById('new-gear-input');
    const resetGearBtn = document.getElementById('reset-gear-btn');

    let gearList = JSON.parse(localStorage.getItem('tatry_gear') || 'null');
    if (!Array.isArray(gearList)) {
        gearList = defaultGearItems.map(item => ({ ...item }));
    }

    function renderGearList() {
        if (!packingListEl) return;
        packingListEl.innerHTML = '';

        gearList.forEach((item, idx) => {
            const li = document.createElement('li');
            li.className = `packing-item ${item.checked ? 'checked' : ''}`;

            const label = document.createElement('label');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'gear-cb';
            cb.checked = item.checked;
            cb.addEventListener('change', () => {
                gearList[idx].checked = cb.checked;
                saveGear();
            });

            const span = document.createElement('span');
            span.textContent = item.text;
            label.append(cb, span);

            const rmBtn = document.createElement('button');
            rmBtn.type = 'button';
            rmBtn.className = 'remove-gear-btn';
            rmBtn.innerHTML = '&times;';
            rmBtn.addEventListener('click', () => {
                gearList.splice(idx, 1);
                saveGear();
            });

            li.append(label, rmBtn);
            packingListEl.appendChild(li);
        });

        if (totalItemsCountEl) {
            totalItemsCountEl.textContent = String(gearList.length);
        }
        if (checkedItemsCountEl) {
            checkedItemsCountEl.textContent = String(gearList.filter(i => i.checked).length);
        }
    }

    function saveGear() {
        localStorage.setItem('tatry_gear', JSON.stringify(gearList));
        renderGearList();
    }

    if (addGearForm && newGearInput) {
        addGearForm.addEventListener('submit', e => {
            e.preventDefault();
            const val = newGearInput.value.trim();
            if (val) {
                gearList.push({ text: val, checked: false });
                newGearInput.value = '';
                saveGear();
            }
        });
    }

    if (resetGearBtn) {
        resetGearBtn.addEventListener('click', () => {
            gearList = defaultGearItems.map(item => ({ ...item }));
            saveGear();
        });
    }

    renderGearList();

    // Galeria zdjęć (Lightbox)
    const galleryTriggers = Array.from(document.querySelectorAll('.gallery-trigger'));
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    let currentImgIndex = 0;

    function openLightbox(idx) {
        currentImgIndex = idx;
        const item = galleryTriggers[currentImgIndex];
        if (!item || !lightboxModal) return;
        lightboxImg.src = item.dataset.full;
        lightboxImg.alt = item.dataset.caption || 'Zdjęcie z Tatr';
        lightboxCaption.textContent = item.dataset.caption || '';
        lightboxModal.hidden = false;
    }

    galleryTriggers.forEach((item, idx) => {
        item.addEventListener('click', () => openLightbox(idx));
        item.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openLightbox(idx);
            }
        });
    });

    document.getElementById('lightbox-close')?.addEventListener('click', () => {
        lightboxModal.hidden = true;
    });
    document.getElementById('lightbox-prev')?.addEventListener('click', () => {
        openLightbox((currentImgIndex - 1 + galleryTriggers.length) % galleryTriggers.length);
    });
    document.getElementById('lightbox-next')?.addEventListener('click', () => {
        openLightbox((currentImgIndex + 1) % galleryTriggers.length);
    });

    document.addEventListener('keydown', e => {
        if (!lightboxModal || lightboxModal.hidden) return;
        if (e.key === 'Escape') lightboxModal.hidden = true;
        if (e.key === 'ArrowLeft') openLightbox((currentImgIndex - 1 + galleryTriggers.length) % galleryTriggers.length);
        if (e.key === 'ArrowRight') openLightbox((currentImgIndex + 1) % galleryTriggers.length);
    });

    // Quiz wiedzy o Tatrach (losowane 8 pytań z puli 30)
    const questionBank = [
        { q: 'Które cztery szczyty tworzą masyw Czerwonych Wierchów?', options: ['Giewont, Kasprowy Wierch, Beskid, Świnica', 'Ciemniak, Krzesanica, Małołączniak, Kopa Kondracka', 'Wołowiec, Rakoń, Grześ, Starorobociański Wierch'], answer: 1 },
        { q: 'Co oznaczają czasy przejść podawane na drewnianych tabliczkach szlakowych TPN?', options: ['Są orientacyjne – realny czas zależy od kondycji, pogody i przerw na widoki', 'To maksymalny dopuszczalny czas przebywania na szlaku', 'To czas mierzony dla biegaczy górskich'], answer: 0 },
        { q: 'Jaki jest oficjalny numer alarmowy do TOPR?', options: ['985 (lub 601 100 300)', '998', '986'], answer: 0 },
        { q: 'Który dwutysięcznik (2012 m n.p.m.) leży na grani głównej tuż obok Kasprowego Wierchu?', options: ['Sarnia Skała', 'Beskid', 'Gęsia Szyja'], answer: 1 },
        { q: 'Ile punktów GOT PTTK daje trasa o długości 26 km i przewyższeniu 2100 m?', options: ['26 punktów', '47 punktów (1 pkt za km + 1 pkt za każde 100 m podejścia)', '100 punktów'], answer: 1 },
        { q: 'Skąd w Zakopanem startuje klasyczny szlak przez Boczań lub Dolinę Jaworzynki na Halę Gąsienicową?', options: ['Z Kuźnic', 'Z Kir', 'Z Palenicy Białczańskiej'], answer: 0 },
        { q: 'Jak nazywa się schronisko położone na Hali Gąsienicowej?', options: ['Murowaniec', 'Ornak', 'Roztoka'], answer: 0 },
        { q: 'Który szczyt jest najwyższy w masywie Czerwonych Wierchów (2122 m n.p.m.)?', options: ['Ciemniak', 'Krzesanica', 'Kopa Kondracka'], answer: 1 },
        { q: 'Jaka roślina nadaje jesienią intensywnie rudy kolor zboczom Czerwonych Wierchów?', options: ['Sit skucina', 'Kosodrzewina', 'Szafran spiski'], answer: 0 },
        { q: 'Jak odbywa się ruch turystyczny na kopule szczytowej Giewontu oraz na odcinku Orlej Perci Zawrat – Kozi Wierch?', options: ['Jest jednokierunkowy', 'Jest dwukierunkowy', 'Szlaki te są zamknięte dla turystów'], answer: 0 },
        { q: 'Która dolina zaczyna się w Kirach i prowadzi do Wąwozu Kraków oraz schroniska na Hali Ornak?', options: ['Dolina Kościeliska', 'Dolina Białego', 'Dolina Pięciu Stawów'], answer: 0 },
        { q: 'Jaka bezpłatna aplikacja przesyła ratownikom TOPR współrzędne GPS podczas wezwania pomocy?', options: ['Ratunek', 'mObywatel', 'Jakdojade'], answer: 0 },
        { q: 'Która przełęcz (1853 m n.p.m.) oddziela Małego Kościelca od podejścia na właściwy szczyt Kościelca?', options: ['Przełęcz Karb', 'Zawrat', 'Krzyżne'], answer: 0 },
        { q: 'Czy na szlaku prowadzącym na szczyt Kościelca (2155 m n.p.m.) zamontowano łańcuchy?', options: ['Nie, mimo stromych płyt skalnych szlak nie posiada łańcuchów', 'Tak, wzdłuż całej grani', 'Na Kościelec nie prowadzi żaden szlak'], answer: 0 },
        { q: 'Z którego parkingu rozpoczyna się szlak prowadzący nad Morskie Oko?', options: ['Z Palenicy Białczańskiej', 'Z Kuźnic', 'Z Jaszczurówki'], answer: 0 },
        { q: 'Jak nazywa się największy wodospad w polskich Tatrach, położony na progu Doliny Pięciu Stawów?', options: ['Siklawa', 'Siklawica', 'Wodogrzmoty Mickiewicza'], answer: 0 },
        { q: 'Jak nazywa się szlak z Doliny Pięciu Stawów do Morskiego Oka z krótkim odcinkiem łańcuchów pod przełęczą?', options: ['Szlak przez Szpiglasową Przełęcz (i Szpiglasowy Wierch)', 'Droga pod Reglami', 'Dolina Chochołowska'], answer: 0 },
        { q: 'Który szczyt reglowy (1377 m n.p.m.) między Doliną Strążyską a Doliną Białego słynie z widoku na Giewont?', options: ['Sarnia Skała', 'Nosal', 'Gubałówka'], answer: 0 },
        { q: 'Jaką wysokość ma polski wierzchołek Rysów (najwyższy punkt Polski)?', options: ['2499 m n.p.m.', '2301 m n.p.m.', '2655 m n.p.m.'], answer: 0 },
        { q: 'Które schronisko jest najwyżej położonym schroniskiem w polskich Tatrach (1671 m n.p.m.)?', options: ['Schronisko w Dolinie Pięciu Stawów Polskich', 'Schronisko na Hali Kondratowej', 'Schronisko nad Morskim Okiem'], answer: 0 },
        { q: 'O jakiej porze dnia latem w Tatrach najczęściej tworzą się gwałtowne burze termiczne?', options: ['W godzinach popołudniowych (zwykle po godz. 13:00–14:00)', 'O wschodzie słońca', 'Wyłącznie w nocy'], answer: 0 },
        { q: 'W jakim okresie w TPN obowiązuje zakaz poruszania się po szlakach od zmierzchu do świtu?', options: ['Od 1 marca do 30 listopada', 'Tylko w lipcu i sierpniu', 'Przez cały rok nie ma żadnych ograniczeń'], answer: 0 },
        { q: 'Z którego miejsca najszybciej dojdziesz szlakiem na Rusinową Polanę i Gęsią Szyję?', options: ['Z Wierchu Poroniec lub Zazadni', 'Z Kir', 'Z Doliny Małej Łąki'], answer: 0 },
        { q: 'Jak nazywa się staw w zachodniej części Doliny Gąsienicowej na szlaku w stronę Beskidu i Kasprowego?', options: ['Zielony Staw Gąsienicowy', 'Smreczyński Staw', 'Wielki Staw Polski'], answer: 0 },
        { q: 'Między którymi przełęczami przebiega główny odcinek Orlej Perci?', options: ['Między Zawratem a Krzyżnem (przez Kozi Wierch i Granaty)', 'Między Kondracką Przełęczą a Kasprowym Wierchem', 'Między Karbem a Świnicką Przełęczą'], answer: 0 },
        { q: 'Który szczyt (2291 m n.p.m.) na trasie Orlej Perci jest najwyższym szczytem leżącym w całości w Polsce?', options: ['Kozi Wierch', 'Giewont', 'Kasprowy Wierch'], answer: 0 },
        { q: 'Czy do Kuźnic w Zakopanem można wjechać prywatnym samochodem osobowym?', options: ['Nie, obowiązuje zakaz ruchu – dojazd możliwy jest busem, autobusem lub pieszo', 'Tak, pod samą kolejkę jest bezpłatny parking', 'Tak, ale tylko w weekendy'], answer: 0 },
        { q: 'Ile stopni liczy międzynarodowa skala zagrożenia lawinowego stosowana przez TOPR?', options: ['5 stopni', '3 stopnie', '10 stopni'], answer: 0 },
        { q: 'Gdzie w Dolinie Kościeliskiej znajduje się krótki szlak z drabinką i łańcuchem prowadzący przez jaskinię?', options: ['W Wąwozie Kraków (Smocza Jama)', 'Na Polanie Pisanej', 'Na Hali Stoły'], answer: 0 },
        { q: 'Co należy zrobić w pierwszej kolejności, gdy na grani powyżej 2000 m n.p.m. zbliża się burza?', options: ['Natychmiast zejść ze szczytu, grani oraz okolic żelaznych łańcuchów', 'Schować się pod najwyższym pojedynczym drzewem', 'Stanąć obok metalowego krzyża szczytowego'], answer: 0 }
    ];

    const quizContainer = document.getElementById('quiz-questions-container');
    const quizForm = document.getElementById('quiz-form');
    const quizResult = document.getElementById('quiz-result');
    let currentQuizQuestions = [];

    function shuffle(arr) {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    function drawRandomQuizQuestions() {
        currentQuizQuestions = shuffle(questionBank).slice(0, 8).map(item => {
            const opts = shuffle(item.options.map((t, idx) => ({ t, ok: idx === item.answer })));
            return {
                q: item.q,
                options: opts.map(o => o.t),
                correctIndex: opts.findIndex(o => o.ok)
            };
        });

        if (!quizContainer) return;
        quizContainer.innerHTML = '';

        currentQuizQuestions.forEach((item, idx) => {
            const qDiv = document.createElement('div');
            qDiv.className = 'quiz-question';
            qDiv.innerHTML = `<div class="quiz-q-header"><p><strong>${idx + 1}. ${item.q}</strong></p><span class="quiz-q-status" hidden></span></div>`;

            item.options.forEach((optText, optIdx) => {
                const label = document.createElement('label');
                label.innerHTML = `<input type="radio" name="quiz_q_${idx}" value="${optIdx}"> ${optText}`;
                qDiv.appendChild(label);
            });

            const noteP = document.createElement('p');
            noteP.className = 'quiz-correct-note';
            noteP.hidden = true;
            qDiv.appendChild(noteP);
            quizContainer.appendChild(qDiv);
        });

        if (quizResult) quizResult.hidden = true;
    }

    quizForm?.addEventListener('submit', e => {
        e.preventDefault();
        let correctCount = 0;
        let wrongCount = 0;
        let skippedCount = 0;
        const qDivs = quizContainer.querySelectorAll('.quiz-question');

        currentQuizQuestions.forEach((item, idx) => {
            const qDiv = qDivs[idx];
            const labels = qDiv.querySelectorAll('label');
            const badge = qDiv.querySelector('.quiz-q-status');
            const noteP = qDiv.querySelector('.quiz-correct-note');

            labels.forEach(l => l.classList.remove('user-correct', 'user-wrong', 'correct-hint'));
            badge.className = 'quiz-q-status';
            badge.hidden = false;
            noteP.hidden = true;

            const checked = quizForm.querySelector(`input[name="quiz_q_${idx}"]:checked`);
            if (checked) {
                const chosen = Number(checked.value);
                if (chosen === item.correctIndex) {
                    correctCount++;
                    labels[chosen].classList.add('user-correct');
                    badge.classList.add('status-ok');
                    badge.textContent = '+1 pkt (Poprawna)';
                } else {
                    wrongCount++;
                    labels[chosen].classList.add('user-wrong');
                    labels[item.correctIndex].classList.add('correct-hint');
                    badge.classList.add('status-bad');
                    badge.textContent = '0 pkt (Błędna)';
                    noteP.hidden = false;
                    noteP.textContent = `Prawidłowa odpowiedź: ${item.options[item.correctIndex]}`;
                }
            } else {
                skippedCount++;
                labels[item.correctIndex].classList.add('correct-hint');
                badge.classList.add('status-skip');
                badge.textContent = '0 pkt (Brak wyboru)';
                noteP.hidden = false;
                noteP.textContent = `Prawidłowa odpowiedź: ${item.options[item.correctIndex]}`;
            }
        });

        if (quizResult) {
            quizResult.hidden = false;
            quizResult.innerHTML = `
                <h4>Twój wynik końcowy: <strong>${correctCount} / 8 pkt (${Math.round((correctCount / 8) * 100)}%)</strong></h4>
                <div class="quiz-score-grid">
                    <div class="quiz-score-pill">Poprawne: <strong>${correctCount}</strong></div>
                    <div class="quiz-score-pill">Błędne: <strong>${wrongCount}</strong></div>
                    <div class="quiz-score-pill">Pominięte: <strong>${skippedCount}</strong></div>
                </div>`;
        }
    });

    document.getElementById('quiz-new-set')?.addEventListener('click', drawRandomQuizQuestions);
    drawRandomQuizQuestions();

    // Sekcja FAQ i opinie o szlakach
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const exp = btn.getAttribute('aria-expanded') === 'true';
            btn.setAttribute('aria-expanded', String(!exp));
            if (btn.nextElementSibling) btn.nextElementSibling.hidden = exp;
            const icon = btn.querySelector('.faq-icon');
            if (icon) icon.textContent = exp ? '+' : '−';
        });
    });

    const defaultOpinions = [
        {
            name: 'Mój wpis (Główna wyrypa)',
            rating: 5,
            date: 'Październik 2026',
            trail: 'Wielka Pętla: Kuźnice – Boczań – Beskid (2012 m) – Krzesanica (2122 m) – Dolina Kondratowa (25,9 km)',
            desc: 'Jedna z najbardziej satysfakcjonujących tras ze startem w Zakopanem. Podejście przez Boczań i Halę Gąsienicową na Beskid fajnie łączy się z szeroką, rudą granią Czerwonych Wierchów aż po Krzesanicę i zejściem przez Kondracką Przełęcz do Kuźnic.'
        },
        {
            name: 'Mój wpis (Rozgrzewka)',
            rating: 5,
            date: 'Październik 2026',
            trail: 'Pętla rozgrzewkowa: Droga pod Reglami – Dolina Białego – Kalatówki – Kuźnice (12,3 km)',
            desc: 'Bardzo dobry szlak na pierwszy dzień po przyjeździe do Zakopanego. Dojście Drogą pod Reglami, podejście wąwozem Doliny Białego obok Kopy nad Białym (1035 m) do Ścieżki nad Reglami i zejście przez Kalatówki oraz Kuźnice pozwala spokojnie rozruszać nogi.'
        },
        {
            name: 'Kamil',
            rating: 5,
            date: 'Wrzesień 2026',
            trail: 'Szpiglasowy Wierch z Pięciu Stawów do Morskiego Oka',
            desc: 'Polecam osobom, które chcą po raz pierwszy spróbować krótkiego odcinka z łańcuchami w Tatrach Wysokich. Podejście od strony Pięciu Stawów daje lekką dawkę adrenaliny, a widok ze Szpiglasowego Wierchu na obie doliny robi robotę.'
        }
    ];

    const opinionForm = document.getElementById('trail-opinion-form');
    const reportsList = document.getElementById('reports-list');
    const opinionsCountEl = document.getElementById('opinions-count');
    const trailSelect = document.getElementById('rep-trail');
    const customTrailGroup = document.getElementById('custom-trail-group');
    const customTrailInput = document.getElementById('rep-custom-trail');
    const formSuccess = document.getElementById('form-success');

    let savedOpinions = JSON.parse(localStorage.getItem('tatry_opinions') || 'null');
    if (!Array.isArray(savedOpinions) || !savedOpinions.length) {
        savedOpinions = [...defaultOpinions];
        localStorage.setItem('tatry_opinions', JSON.stringify(savedOpinions));
    }

    function renderOpinions() {
        if (!reportsList) return;
        reportsList.innerHTML = '';

        savedOpinions.forEach(op => {
            const stars = Math.min(5, Math.max(1, Number(op.rating) || 5));
            const article = document.createElement('article');
            article.className = 'report-card';

            const meta = document.createElement('div');
            meta.className = 'report-meta';
            const left = document.createElement('div');
            const strong = document.createElement('strong');
            strong.textContent = op.name;
            const dateSpan = document.createElement('span');
            dateSpan.className = 'report-date';
            dateSpan.textContent = op.date ? `• ${op.date}` : '';
            left.append(strong, dateSpan);

            const rSpan = document.createElement('span');
            rSpan.className = 'rating-stars';
            rSpan.textContent = `${'⭐'.repeat(stars)} (${stars}/5)`;
            meta.append(left, rSpan);

            const tP = document.createElement('p');
            tP.className = 'report-trail-name';
            tP.textContent = `Szlak: ${op.trail}`;
            const dP = document.createElement('p');
            dP.textContent = op.desc;

            article.append(meta, tP, dP);
            reportsList.appendChild(article);
        });

        if (opinionsCountEl) {
            opinionsCountEl.textContent = String(savedOpinions.length);
        }
    }

    function selectPlannedRouteInForm() {
        if (trailSelect && currentPlannedRouteSummary) {
            trailSelect.value = currentPlannedRouteSummary;
            if (customTrailGroup) customTrailGroup.hidden = true;
            trailSelect.focus();
        }
    }

    document.getElementById('use-planned-route-btn')?.addEventListener('click', selectPlannedRouteInForm);
    document.getElementById('rate-this-route-link')?.addEventListener('click', selectPlannedRouteInForm);

    trailSelect?.addEventListener('change', () => {
        if (customTrailGroup) {
            customTrailGroup.hidden = trailSelect.value !== 'custom_trail';
        }
    });

    document.getElementById('reset-opinions-btn')?.addEventListener('click', () => {
        savedOpinions = [...defaultOpinions];
        localStorage.setItem('tatry_opinions', JSON.stringify(savedOpinions));
        renderOpinions();
    });

    opinionForm?.addEventListener('submit', e => {
        e.preventDefault();
        const nameIn = document.getElementById('rep-name');
        const emailIn = document.getElementById('rep-email');
        const ratingIn = document.getElementById('rep-rating');
        const descIn = document.getElementById('rep-desc');

        document.getElementById('err-name').textContent = '';
        document.getElementById('err-email').textContent = '';
        document.getElementById('err-trail').textContent = '';
        if (document.getElementById('err-custom-trail')) {
            document.getElementById('err-custom-trail').textContent = '';
        }
        document.getElementById('err-desc').textContent = '';
        if (formSuccess) formSuccess.hidden = true;

        let valid = true;
        if (nameIn.value.trim().length < 2) {
            document.getElementById('err-name').textContent = 'Podaj imię lub nick (min. 2 znaki).';
            valid = false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailIn.value.trim())) {
            document.getElementById('err-email').textContent = 'Wprowadź poprawny adres e-mail.';
            valid = false;
        }

        let chosenTrail = trailSelect.value;
        if (!chosenTrail) {
            document.getElementById('err-trail').textContent = 'Wybierz szlak z listy lub kliknij „Wybierz tę trasę do opinii”.';
            valid = false;
        } else if (chosenTrail === 'custom_trail') {
            if (!customTrailInput || customTrailInput.value.trim().length < 3) {
                document.getElementById('err-custom-trail').textContent = 'Wpisz nazwę własnego szlaku (min. 3 znaki).';
                valid = false;
            } else {
                chosenTrail = customTrailInput.value.trim();
            }
        }

        if (descIn.value.trim().length < 15) {
            document.getElementById('err-desc').textContent = 'Opinia musi mieć co najmniej 15 znaków.';
            valid = false;
        }

        if (valid) {
            savedOpinions.unshift({
                name: nameIn.value.trim(),
                rating: Number(ratingIn ? ratingIn.value : 5),
                date: new Date().toLocaleDateString('pl-PL'),
                trail: chosenTrail,
                desc: descIn.value.trim()
            });
            localStorage.setItem('tatry_opinions', JSON.stringify(savedOpinions));
            renderOpinions();
            opinionForm.reset();
            if (customTrailGroup) customTrailGroup.hidden = true;
            if (formSuccess) formSuccess.hidden = false;
        }
    });

    renderOpinions();

    // Przycisk powrotu na górę strony
    const scrollTopBtn = document.getElementById('scroll-top');
    if (scrollTopBtn) {
        window.addEventListener('scroll', () => {
            scrollTopBtn.hidden = window.scrollY < 400;
        });
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});