/**
 * section-distributor-locator.js  v2 – Geolocation Edition
 * Wokiee Theme – Distributor Locator
 *
 * ┌─ Geolocation strategy ──────────────────────────────────────┐
 * │ 1. Browser Geolocation API (accurate, needs permission)     │
 * │ 2. IP Geolocation fallback via ipapi.co (city-level, free)  │
 * │ 3. If both fail → show all distributors                     │
 * └─────────────────────────────────────────────────────────────┘
 * ┌─ Distance ──────────────────────────────────────────────────┐
 * │ Haversine formula on pre-geocoded lat/lng in JSON           │
 * │ Default radius: 100 km (configurable via data attribute)    │
 * └─────────────────────────────────────────────────────────────┘
 */

(function () {
  'use strict';

  const DEFAULT_RADIUS_KM = 100;

  // ── Icon helpers ─────────────────────────────────────────────
  const ICON = {
    pin:       `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    clock:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    phone:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    globe:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    instagram: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`,
    maplink:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
    locme:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.94 11a8 8 0 1 0-7.94 8.94"/><path d="M22 12h-4"/><path d="M12 22v-4"/><path d="M12 2v4"/><path d="M2 12h4"/></svg>`,
    warning:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    close:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  };

  // ── Region colour palette ─────────────────────────────────────
  const REGION_COLORS = [
    '#2d6a4f','#1d3557','#9b2226','#6d3b47',
    '#583101','#3d405b','#4a4e69','#22577a',
    '#344e41','#7b2d8b','#c05c2e','#2b6cb0',
  ];

  function getRegionColor(region, regionList) {
    const idx = regionList.indexOf(region);
    return REGION_COLORS[idx % REGION_COLORS.length] || '#555';
  }

  // ── Haversine distance (km) ───────────────────────────────────
  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) *
              Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
  }

  // ── Geolocation helpers ───────────────────────────────────────
  function getBrowserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('no-geolocation'));
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'browser' }),
        err => reject(err),
        { timeout: 8000, maximumAge: 300000 }
      );
    });
  }

  function getIPLocation() {
    return fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) })
      .then(r => r.json())
      .then(d => {
        if (d.latitude && d.longitude) {
          return { lat: d.latitude, lng: d.longitude, city: d.city, source: 'ip' };
        }
        throw new Error('ip-no-coords');
      });
  }

  async function detectLocation() {
    try {
      return await getBrowserLocation();
    } catch (browserErr) {
      try {
        return await getIPLocation();
      } catch {
        return null;
      }
    }
  }

  // ── URL helpers ───────────────────────────────────────────────
  function ensureUrl(url) {
    if (!url || url === '*') return null;
    return url.startsWith('http') ? url : 'https://' + url;
  }

  function ensureInstagram(handle) {
    if (!handle) return null;
    const clean = handle
      .replace(/^https?:\/\/(?:www\.)?instagram\.com\//i, '')
      .replace(/^@/, '').split(/\s/)[0].trim();
    if (!clean || clean.length < 2) return null;
    return 'https://www.instagram.com/' + clean + '/';
  }

  // ── Escape helpers ────────────────────────────────────────────
  function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escAttr(str) {
    return String(str || '').replace(/"/g,'&quot;');
  }

  // ── Build distributor card ────────────────────────────────────
  function buildCard(d, regionList, userLat, userLng) {
    const color  = getRegionColor(d.region, regionList);
    const mapQ   = encodeURIComponent([d.direccion, d.ciudad, d.region, 'Chile'].filter(Boolean).join(', '));
    const web    = ensureUrl(d.sitio_web);
    const ig     = ensureInstagram(d.instagram);

    // Distance badge
    let distanceBadge = '';
    if (userLat != null && d.lat != null) {
      const km = Math.round(haversine(userLat, userLng, d.lat, d.lng));
      distanceBadge = `<span class="distributor-card__distance">${km} km</span>`;
    }

    // Info rows
    let rows = '';
    if (d.direccion || d.ciudad) {
      const loc = [d.direccion, d.ciudad].filter(Boolean).join(', ');
      rows += `<div class="distributor-card__row">${ICON.pin}<span>${esc(loc)}</span></div>`;
    }
    if (d.telefono) {
      const telClean = d.telefono.replace(/\s/g, '');
      rows += `<div class="distributor-card__row">${ICON.phone}<a href="tel:${esc(telClean)}" style="color:inherit;text-decoration:none;">${esc(d.telefono)}</a></div>`;
    }
    if (d.horario) {
      rows += `<div class="distributor-card__row">${ICON.clock}<span>${esc(d.horario)}</span></div>`;
    }

    // Link buttons
    let links = '';
    if (mapQ) links += `<a href="https://www.google.com/maps/search/?api=1&query=${mapQ}" target="_blank" rel="noopener" class="distributor-card__link distributor-card__link--primary">${ICON.maplink} Ver en mapa</a>`;
    if (web)  links += `<a href="${esc(web)}" target="_blank" rel="noopener" class="distributor-card__link">${ICON.globe} Sitio web</a>`;
    if (ig)   links += `<a href="${esc(ig)}" target="_blank" rel="noopener" class="distributor-card__link">${ICON.instagram} Instagram</a>`;

    return `
<article class="distributor-card"
  data-name="${escAttr(d.nombre)}"
  data-region="${escAttr(d.region)}"
  data-city="${escAttr(d.ciudad)}"
  data-address="${escAttr(d.direccion)}"
  data-lat="${d.lat ?? ''}"
  data-lng="${d.lng ?? ''}">
  <div class="distributor-card__header">
    <span class="distributor-card__region-badge" style="background:${color}">${esc(d.region || 'Sin región')}</span>
    ${distanceBadge}
  </div>
  <h3 class="distributor-card__name">${esc(d.nombre)}</h3>
  <div class="distributor-card__info">${rows}</div>
  ${links ? `<div class="distributor-card__links">${links}</div>` : ''}
</article>`;
  }

  // ── Geocode cache ─────────────────────────────────────────────
  const geocodeCache = {};
  function geocodeAddress(geocoder, address) {
    if (geocodeCache[address]) return Promise.resolve(geocodeCache[address]);
    return new Promise(resolve => {
      geocoder.geocode({ address }, (results, status) => {
        const loc = status === 'OK' && results[0] ? results[0].geometry.location : null;
        geocodeCache[address] = loc;
        resolve(loc);
      });
    });
  }

  // ── Main initialiser ──────────────────────────────────────────
  function init(section) {
    const sectionId = section.dataset.sectionId;
    const jsonUrl   = section.dataset.jsonUrl;
    const radiusKm  = parseInt(section.dataset.radius || DEFAULT_RADIUS_KM, 10);

    const searchInput  = section.querySelector('.distributor-locator__search');
    const searchClear  = section.querySelector('.distributor-locator__search-clear');
    const regionSelect = section.querySelector('.distributor-locator__region-select');
    const grid         = section.querySelector(`#dloc-grid-${sectionId}`);
    const emptyState   = section.querySelector(`#dloc-empty-${sectionId}`);
    const countEl      = section.querySelector('.distributor-locator__count');
    const skeleton     = section.querySelector('.distributor-locator__skeleton-grid');
    const mapEl        = section.querySelector(`#dloc-map-${sectionId}`);
    const geoBanner    = section.querySelector('.distributor-locator__geo-banner');
    const geoBannerText = section.querySelector('.distributor-locator__geo-banner-text');
    const geoShowAll   = section.querySelector('.distributor-locator__geo-show-all');
    const geoLocate    = section.querySelector('.distributor-locator__geo-locate');
    const geoBannerClose = section.querySelector('.distributor-locator__geo-banner-close');

    let allData      = [];
    let regionList   = [];
    let userLocation = null;   // { lat, lng, city?, source }
    let isNearbyMode = false;
    let mapObj       = null;
    let markersAll   = [];
    let searchTerm   = '';
    let activeRegion = '';
    let renderTimer  = null;

    // ─── Load JSON ────────────────────────────────────────────
    fetch(jsonUrl)
      .then(r => r.json())
      .then(async data => {
        allData = data.filter(d => d.nombre && d.nombre.trim());
        regionList = [...new Set(allData.map(d => d.region).filter(Boolean))].sort();

        if (regionSelect) {
          regionList.forEach(region => {
            const opt = document.createElement('option');
            opt.value = region;
            opt.textContent = region;
            regionSelect.appendChild(opt);
          });
        }

        if (skeleton) skeleton.remove();

        // ── Try geolocation ──
        showGeoStatus('loading');
        userLocation = await detectLocation();

        if (userLocation) {
          // Filter nearby
          const nearby = filterByRadius(allData, userLocation.lat, userLocation.lng, radiusKm);
          if (nearby.length > 0) {
            isNearbyMode = true;
            showGeoStatus('found', userLocation, nearby.length, radiusKm);
            renderCards(nearby);
          } else {
            // No distributors nearby → show all with warning
            showGeoStatus('noneNearby', userLocation, 0, radiusKm);
            renderCards(allData);
          }
        } else {
          showGeoStatus('denied');
          renderCards(allData);
        }

        if (mapEl) initMap(mapEl, allData);
      })
      .catch(err => {
        console.error('[DistributorLocator]', err);
        if (skeleton) skeleton.remove();
        showEmpty();
      });

    // ─── Filter by radius ─────────────────────────────────────
    function filterByRadius(data, lat, lng, km) {
      return data
        .filter(d => d.lat != null && d.lng != null)
        .map(d => ({ ...d, _distance: haversine(lat, lng, d.lat, d.lng) }))
        .filter(d => d._distance <= km)
        .sort((a, b) => a._distance - b._distance);
    }

    // ─── Geo banner state machine ─────────────────────────────
    function showGeoStatus(state, loc, count, km) {
      if (!geoBanner) return;

      geoBanner.hidden = false;
      geoBanner.className = 'distributor-locator__geo-banner distributor-locator__geo-banner--' + state;

      const messages = {
        loading:    `${ICON.locme} Detectando tu ubicación…`,
        found:      `${ICON.locme} Mostrando <strong>${count}</strong> distribuidor${count !== 1 ? 'es' : ''} dentro de <strong>${km} km</strong>${loc && loc.city ? ' de <strong>' + esc(loc.city) + '</strong>' : ' de tu ubicación'}.`,
        noneNearby: `${ICON.warning} No hay distribuidores dentro de ${km} km de tu ubicación. Mostrando todos.`,
        denied:     `${ICON.locme} No se pudo detectar tu ubicación. Mostrando todos los distribuidores.`,
      };

      if (geoBannerText) geoBannerText.innerHTML = messages[state] || '';

      // Show/hide action buttons based on state
      if (geoShowAll) geoShowAll.hidden  = state !== 'found';
      if (geoLocate)  geoLocate.hidden   = state === 'loading' || state === 'found' || state === 'noneNearby';
    }

    // ─── Render cards ─────────────────────────────────────────
    function renderCards(data) {
      grid.innerHTML = '';

      if (!data.length) {
        showEmpty();
        if (countEl) countEl.textContent = '';
        return;
      }

      hideEmpty();

      const shown = data.length;
      if (countEl) {
        countEl.textContent = `${shown} distribuidor${shown !== 1 ? 'es' : ''} encontrado${shown !== 1 ? 's' : ''}`;
      }

      const frag = document.createDocumentFragment();
      data.forEach((d, i) => {
        const tmp = document.createElement('div');
        tmp.innerHTML = buildCard(d, regionList, userLocation?.lat, userLocation?.lng);
        const card = tmp.firstElementChild;
        card.style.animationDelay = Math.min(i * 28, 350) + 'ms';
        frag.appendChild(card);
      });
      grid.appendChild(frag);

      if (mapObj) updateMapMarkers(data);
    }

    function showEmpty() { if (emptyState) emptyState.hidden = false; }
    function hideEmpty() { if (emptyState) emptyState.hidden = true; }

    // ─── Apply all active filters ─────────────────────────────
    function applyFilters() {
      const term   = searchTerm.toLowerCase();
      const region = activeRegion;

      // Start from nearby subset or all depending on mode
      let base = isNearbyMode && userLocation
        ? filterByRadius(allData, userLocation.lat, userLocation.lng, radiusKm)
        : allData;

      const filtered = base.filter(d => {
        const matchRegion = !region || d.region === region;
        const matchSearch = !term ||
          (d.nombre    || '').toLowerCase().includes(term) ||
          (d.ciudad    || '').toLowerCase().includes(term) ||
          (d.direccion || '').toLowerCase().includes(term) ||
          (d.comuna    || '').toLowerCase().includes(term);
        return matchRegion && matchSearch;
      });

      renderCards(filtered);
    }

    function scheduleFilter() {
      clearTimeout(renderTimer);
      renderTimer = setTimeout(applyFilters, 180);
    }

    // ─── Event listeners ──────────────────────────────────────
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        searchTerm = searchInput.value.trim();
        if (searchClear) searchClear.hidden = !searchTerm;
        scheduleFilter();
      });
    }

    if (searchClear) {
      searchClear.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        searchTerm = '';
        searchClear.hidden = true;
        scheduleFilter();
      });
    }

    if (regionSelect) {
      regionSelect.addEventListener('change', () => {
        activeRegion = regionSelect.value;
        scheduleFilter();
      });
    }

    // "Ver todos" — exit nearby mode
    if (geoShowAll) {
      geoShowAll.addEventListener('click', () => {
        isNearbyMode = false;
        geoShowAll.hidden = true;
        geoBanner.hidden = true;
        renderCards(allData);
      });
    }

    // "Detectar ubicación" — re-trigger geolocation
    if (geoLocate) {
      geoLocate.addEventListener('click', async () => {
        showGeoStatus('loading');
        userLocation = await detectLocation();
        if (userLocation) {
          const nearby = filterByRadius(allData, userLocation.lat, userLocation.lng, radiusKm);
          if (nearby.length > 0) {
            isNearbyMode = true;
            showGeoStatus('found', userLocation, nearby.length, radiusKm);
            renderCards(nearby);
            if (mapObj) {
              mapObj.setCenter({ lat: userLocation.lat, lng: userLocation.lng });
              mapObj.setZoom(10);
            }
          } else {
            showGeoStatus('noneNearby', userLocation, 0, radiusKm);
            renderCards(allData);
          }
        } else {
          showGeoStatus('denied');
        }
      });
    }

    // Close banner
    if (geoBannerClose) {
      geoBannerClose.addEventListener('click', () => {
        if (geoBanner) geoBanner.hidden = true;
      });
    }

    // Empty state reset
    if (emptyState) {
      const resetBtn = emptyState.querySelector('.distributor-locator__empty-reset');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          if (searchInput) searchInput.value = '';
          if (regionSelect) regionSelect.value = '';
          if (searchClear) searchClear.hidden = true;
          searchTerm  = '';
          activeRegion = '';
          isNearbyMode = false;
          renderCards(allData);
        });
      }
    }

    // ─── Google Maps ──────────────────────────────────────────
    function initMap(el, data) {
      const apiKey = el.dataset.apiKey;
      if (!apiKey) return;

      const zoom = parseInt(el.dataset.zoom, 10) || 5;
      const lat  = userLocation ? userLocation.lat : parseFloat(el.dataset.lat) || -35.6751;
      const lng  = userLocation ? userLocation.lng : parseFloat(el.dataset.lng) || -71.5430;
      const autoZoom = userLocation ? 9 : zoom;

      if (!window.google?.maps) {
        window.__dlocMapReady = () => {
          delete window.__dlocMapReady;
          createMap(el, lat, lng, autoZoom, data);
        };
        const s = document.createElement('script');
        s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=__dlocMapReady&loading=async`;
        s.async = true;
        document.head.appendChild(s);
      } else {
        createMap(el, lat, lng, autoZoom, data);
      }
    }

    function createMap(el, lat, lng, zoom, data) {
      mapObj = new google.maps.Map(el, {
        center: { lat, lng },
        zoom,
        styles: [
          { featureType: 'all', elementType: 'labels.text.fill', stylers: [{ color: '#444444' }] },
          { featureType: 'landscape', elementType: 'all', stylers: [{ color: '#f2f2f2' }] },
          { featureType: 'road', elementType: 'all', stylers: [{ saturation: -100 }, { lightness: 45 }] },
          { featureType: 'water', elementType: 'all', stylers: [{ color: '#bde0f7' }] },
        ],
        mapTypeControl: false,
        streetViewControl: false,
      });

      const infoWindow = new google.maps.InfoWindow();

      // User location marker
      if (userLocation) {
        new google.maps.Marker({
          position: { lat: userLocation.lat, lng: userLocation.lng },
          map: mapObj,
          title: 'Tu ubicación',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 3,
          },
          zIndex: 999,
        });

        // 100km radius circle
        new google.maps.Circle({
          strokeColor: '#4285F4',
          strokeOpacity: 0.25,
          strokeWeight: 1.5,
          fillColor: '#4285F4',
          fillOpacity: 0.06,
          map: mapObj,
          center: { lat: userLocation.lat, lng: userLocation.lng },
          radius: DEFAULT_RADIUS_KM * 1000,
        });
      }

      // Distributor markers (use pre-geocoded coords + Geocoder fallback)
      const geocoder = new google.maps.Geocoder();
      const toPlace  = data.filter(d => d.direccion || d.ciudad);

      toPlace.forEach((d, i) => {
        const placeMarker = (pos) => {
          if (!pos) return;
          const marker = new google.maps.Marker({
            position: pos,
            map: mapObj,
            title: d.nombre,
            _data: d,
          });
          markersAll.push(marker);
          marker.addListener('click', () => {
            infoWindow.setContent(`
              <div class="dloc-infowindow">
                <strong>${esc(d.nombre)}</strong>
                <span>${esc([d.direccion, d.ciudad].filter(Boolean).join(', '))}</span>
                ${d.telefono ? `<br><span>${esc(d.telefono)}</span>` : ''}
                ${d.horario  ? `<br><small>${esc(d.horario)}</small>` : ''}
              </div>`);
            infoWindow.open(mapObj, marker);
          });
        };

        if (d.lat != null && d.lng != null) {
          // Pre-geocoded — instant
          placeMarker({ lat: d.lat, lng: d.lng });
        } else {
          // Fallback: Google Geocoder (rate-limited)
          setTimeout(() => {
            const address = [d.direccion, d.ciudad, 'Chile'].filter(Boolean).join(', ');
            geocodeAddress(geocoder, address).then(placeMarker);
          }, i * 25);
        }
      });
    }

    function updateMapMarkers(visibleData) {
      const visibleNames = new Set(visibleData.map(d => d.nombre));
      markersAll.forEach(m => m.setVisible(visibleNames.has(m.title)));
    }
  }

  // ── Bootstrap ─────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.distributor-locator').forEach(init);
  });

  if (window.Shopify?.designMode) {
    document.addEventListener('shopify:section:load', e => {
      const s = e.target.querySelector('.distributor-locator');
      if (s) init(s);
    });
  }

})();
