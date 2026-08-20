/**
 * section-distributor-locator.js  v3 – OpenStreetMap (Leaflet) Edition
 * Wokiee Theme – Distributor Locator
 *
 * - Free, no API Key needed (OpenStreetMap tiles + Leaflet.js)
 * - Split Desktop Layout: 2 Columns of Cards + Right Sticky Interactive Map
 * - Automatic 100 km radius filter with Geolocation
 * - Interactive synchronization between cards and map markers
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
    return REGION_COLORS[idx % REGION_COLORS.length] || '#006654';
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
  function buildCard(d, regionList, userLat, userLng, index) {
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
    if (d.lat != null && d.lng != null) {
      links += `<button type="button" class="distributor-card__link distributor-card__link--primary dloc-focus-map" data-index="${index}">${ICON.pin} Ver en mapa</button>`;
    } else if (mapQ) {
      links += `<a href="https://www.google.com/maps/search/?api=1&query=${mapQ}" target="_blank" rel="noopener" class="distributor-card__link distributor-card__link--primary">${ICON.maplink} Ver en mapa</a>`;
    }
    if (web)  links += `<a href="${esc(web)}" target="_blank" rel="noopener" class="distributor-card__link">${ICON.globe} Web</a>`;
    if (ig)   links += `<a href="${esc(ig)}" target="_blank" rel="noopener" class="distributor-card__link">${ICON.instagram} Instagram</a>`;

    return `
<article class="distributor-card"
  id="dloc-card-${index}"
  data-index="${index}"
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

  // ── Build Popup Content for Leaflet Map ───────────────────────
  function buildPopupContent(d) {
    const mapQ = encodeURIComponent([d.direccion, d.ciudad, d.region, 'Chile'].filter(Boolean).join(', '));
    const ig   = ensureInstagram(d.instagram);
    const web  = ensureUrl(d.sitio_web);

    let infoHtml = '';
    if (d.direccion || d.ciudad) {
      infoHtml += `<div class="dloc-popup__row">${ICON.pin} <span>${esc(d.direccion || '')}${d.ciudad ? ', ' + esc(d.ciudad) : ''}</span></div>`;
    }
    if (d.telefono) {
      infoHtml += `<div class="dloc-popup__row">${ICON.phone} <a href="tel:${esc(d.telefono.replace(/\s/g,''))}">${esc(d.telefono)}</a></div>`;
    }
    if (d.horario) {
      infoHtml += `<div class="dloc-popup__row">${ICON.clock} <span>${esc(d.horario)}</span></div>`;
    }

    let actionsHtml = `<a href="https://www.google.com/maps/dir/?api=1&destination=${d.lat},${d.lng}" target="_blank" rel="noopener" class="dloc-popup__btn dloc-popup__btn--primary">${ICON.maplink} Cómo llegar</a>`;
    if (ig) {
      actionsHtml += `<a href="${esc(ig)}" target="_blank" rel="noopener" class="dloc-popup__btn">${ICON.instagram} Instagram</a>`;
    } else if (web) {
      actionsHtml += `<a href="${esc(web)}" target="_blank" rel="noopener" class="dloc-popup__btn">${ICON.globe} Web</a>`;
    }

    return `
      <div class="dloc-leaflet-popup">
        <span class="dloc-popup__badge">${esc(d.region || 'Distribuidor')}</span>
        <h4 class="dloc-popup__title">${esc(d.nombre)}</h4>
        <div class="dloc-popup__body">${infoHtml}</div>
        <div class="dloc-popup__actions">${actionsHtml}</div>
      </div>
    `;
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
    const mapEl        = section.querySelector(`#dloc-openmap-${sectionId}`);
    const geoBanner    = section.querySelector('.distributor-locator__geo-banner');
    const geoBannerText = section.querySelector('.distributor-locator__geo-banner-text');
    const geoShowAll   = section.querySelector('.distributor-locator__geo-show-all');
    const geoLocate    = section.querySelector('.distributor-locator__geo-locate');
    const geoBannerClose = section.querySelector('.distributor-locator__geo-banner-close');
    const tabButtons   = section.querySelectorAll('.distributor-locator__tab-btn');
    const cardsPane    = section.querySelector('.distributor-locator__cards-pane');
    const mapPane      = section.querySelector('.distributor-locator__map-pane');

    let allData      = [];
    let regionList   = [];
    let userLocation = null;   // { lat, lng, city?, source }
    let isNearbyMode = false;
    let mapObj       = null;
    let markersLayer = null;
    let userMarker   = null;
    let radiusCircle = null;
    let markersMap   = new Map(); // index -> Leaflet Marker
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

        // ── Init OpenStreetMap if available ──
        if (mapEl && typeof window.L !== 'undefined') {
          initLeafletMap(mapEl);
        }

        // ── Try geolocation ──
        showGeoStatus('loading');
        userLocation = await detectLocation();

        if (userLocation) {
          // Filter nearby within 100km
          const nearby = filterByRadius(allData, userLocation.lat, userLocation.lng, radiusKm);
          if (nearby.length > 0) {
            isNearbyMode = true;
            showGeoStatus('found', userLocation, nearby.length, radiusKm);
            renderCards(nearby);
          } else {
            // No distributors nearby → show all with message
            showGeoStatus('noneNearby', userLocation, 0, radiusKm);
            renderCards(allData);
          }
          if (mapObj) updateUserLocationOnMap(userLocation, radiusKm);
        } else {
          showGeoStatus('denied');
          renderCards(allData);
        }
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
        found:      `${ICON.locme} Mostrando <strong>${count}</strong> distribuidores dentro de <strong>${km} km</strong>${loc && loc.city ? ' de <strong>' + esc(loc.city) + '</strong>' : ' de tu ubicación'}.`,
        noneNearby: `${ICON.warning} No hay distribuidores dentro de ${km} km de tu ubicación. Mostrando todos.`,
        denied:     `${ICON.locme} No se pudo detectar tu ubicación. Mostrando todos los distribuidores.`,
      };

      if (geoBannerText) geoBannerText.innerHTML = messages[state] || '';

      // Show/hide action buttons
      if (geoShowAll) geoShowAll.hidden  = state !== 'found';
      if (geoLocate)  geoLocate.hidden   = state === 'loading' || state === 'found' || state === 'noneNearby';
    }

    // ─── Render cards ─────────────────────────────────────────
    function renderCards(data) {
      grid.innerHTML = '';

      if (!data.length) {
        showEmpty();
        if (countEl) countEl.textContent = '';
        if (mapObj) updateMapMarkers([]);
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
        tmp.innerHTML = buildCard(d, regionList, userLocation?.lat, userLocation?.lng, i);
        const card = tmp.firstElementChild;
        card.style.animationDelay = Math.min(i * 20, 300) + 'ms';

        // Hover & Click interaction with map
        card.addEventListener('mouseenter', () => {
          highlightMarker(i, false);
        });

        frag.appendChild(card);
      });
      grid.appendChild(frag);

      // Focus map button event delegation
      grid.querySelectorAll('.dloc-focus-map').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.index, 10);
          highlightMarker(idx, true);
          // If on mobile and in list tab, switch to map tab
          if (window.innerWidth < 992) {
            activateTab('map');
          }
        });
      });

      if (mapObj) updateMapMarkers(data);
    }

    function showEmpty() { if (emptyState) emptyState.hidden = false; }
    function hideEmpty() { if (emptyState) emptyState.hidden = true; }

    // ─── Apply all active filters ─────────────────────────────
    function applyFilters() {
      const term   = searchTerm.toLowerCase();
      const region = activeRegion;

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
      renderTimer = setTimeout(applyFilters, 160);
    }

    // ─── OpenStreetMap (Leaflet) Implementation ──────────────
    function initLeafletMap(el) {
      const zoom = parseInt(el.dataset.zoom, 10) || 6;
      const lat  = parseFloat(el.dataset.lat) || -35.6751;
      const lng  = parseFloat(el.dataset.lng) || -71.5430;

      mapObj = L.map(el, {
        center: [lat, lng],
        zoom: zoom,
        scrollWheelZoom: false,
        zoomControl: true,
      });

      // Beautiful OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapObj);

      markersLayer = L.featureGroup().addTo(mapObj);
    }

    function updateUserLocationOnMap(loc, km) {
      if (!mapObj || !loc) return;

      if (userMarker) mapObj.removeLayer(userMarker);
      if (radiusCircle) mapObj.removeLayer(radiusCircle);

      // User location marker
      const userIcon = L.divIcon({
        className: 'dloc-user-marker-wrap',
        html: `<div class="dloc-user-marker-dot" title="Tu ubicación"><div class="dloc-user-marker-pulse"></div></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      userMarker = L.marker([loc.lat, loc.lng], { icon: userIcon, zIndexOffset: 1000 })
        .addTo(mapObj)
        .bindPopup(`<strong>Tu ubicación</strong>${loc.city ? '<br>' + esc(loc.city) : ''}`);

      // 100 km Radius Circle
      if (isNearbyMode) {
        radiusCircle = L.circle([loc.lat, loc.lng], {
          radius: km * 1000,
          color: '#006654',
          fillColor: '#006654',
          fillOpacity: 0.07,
          weight: 1.5,
          dashArray: '5, 5'
        }).addTo(mapObj);
      }
    }

    function updateMapMarkers(data) {
      if (!mapObj || !markersLayer) return;

      markersLayer.clearLayers();
      markersMap.clear();

      const validCoords = [];

      data.forEach((d, i) => {
        if (d.lat == null || d.lng == null) return;

        const pinHtml = `
          <div class="dloc-map-pin">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        `;

        const markerIcon = L.divIcon({
          className: 'dloc-leaflet-pin-icon',
          html: pinHtml,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32]
        });

        const marker = L.marker([d.lat, d.lng], { icon: markerIcon });
        marker.bindPopup(buildPopupContent(d), { maxWidth: 300, className: 'dloc-custom-leaflet-popup' });

        marker.on('click', () => {
          highlightCard(i);
        });

        markersLayer.addLayer(marker);
        markersMap.set(i, marker);
        validCoords.push([d.lat, d.lng]);
      });

      // Fit map bounds to show markers
      if (validCoords.length > 0) {
        try {
          if (userLocation && isNearbyMode) {
            const bounds = L.latLngBounds(validCoords);
            bounds.extend([userLocation.lat, userLocation.lng]);
            mapObj.fitBounds(bounds, { padding: [40, 40], maxZoom: 13, animate: true });
          } else {
            mapObj.fitBounds(markersLayer.getBounds(), { padding: [40, 40], maxZoom: 13, animate: true });
          }
        } catch (e) {
          // ignore fitBounds error if single point
        }
      }
    }

    function highlightMarker(index, openPopup) {
      if (!mapObj || !markersMap.has(index)) return;
      const marker = markersMap.get(index);
      const latLng = marker.getLatLng();

      mapObj.panTo(latLng, { animate: true, duration: 0.5 });
      if (openPopup) {
        marker.openPopup();
      }
    }

    function highlightCard(index) {
      const card = grid.querySelector(`#dloc-card-${index}`);
      if (!card) return;

      grid.querySelectorAll('.distributor-card').forEach(c => c.classList.remove('is-active-card'));
      card.classList.add('is-active-card');
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ─── Tab Switching on Mobile ──────────────────────────────
    function activateTab(tab) {
      tabButtons.forEach(btn => {
        const isActive = btn.dataset.tab === tab;
        btn.classList.toggle('is-active', isActive);
      });

      if (cardsPane && mapPane) {
        if (tab === 'map') {
          cardsPane.style.display = 'none';
          mapPane.style.display = 'block';
          if (mapObj) {
            setTimeout(() => { mapObj.invalidateSize(); }, 50);
          }
        } else {
          cardsPane.style.display = 'block';
          mapPane.style.display = 'none';
        }
      }
    }

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        activateTab(btn.dataset.tab);
      });
    });

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
        if (radiusCircle && mapObj) {
          mapObj.removeLayer(radiusCircle);
        }
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
          } else {
            showGeoStatus('noneNearby', userLocation, 0, radiusKm);
            renderCards(allData);
          }
          if (mapObj) updateUserLocationOnMap(userLocation, radiusKm);
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
  }

  // ─── Bootstrap on DOMReady & Shopify Section Events ────────
  function bootstrap() {
    document.querySelectorAll('.distributor-locator').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  document.addEventListener('shopify:section:load', e => {
    const s = e.target.querySelector('.distributor-locator');
    if (s) init(s);
  });
})();
