const startBtn = document.getElementById('startBtn');
const demoBtn = document.getElementById('demoBtn');
const resetBtn = document.getElementById('resetBtn');
const statusEl = document.getElementById('status');

const REVEAL_RADIUS_M = 10;
const DEMO_INTERVAL_MS = 600;

let watchId = null;
let demoTimer = null;
let pathLatLngs = [];
let followMarker = null;

const map = L.map('map', {
  zoomControl: true,
  preferCanvas: true,
}).setView([35.681236, 139.767125], 17);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 20,
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

const pathLine = L.polyline([], {
  color: '#5bc0ff',
  weight: 4,
  opacity: 0.95,
}).addTo(map);

const FogOverlay = L.Layer.extend({
  onAdd(targetMap) {
    this._map = targetMap;
    this._canvas = L.DomUtil.create('canvas', 'leaflet-fog-layer');
    this._ctx = this._canvas.getContext('2d');
    const pane = targetMap.getPane('overlayPane');
    pane.appendChild(this._canvas);

    L.DomEvent.disableClickPropagation(this._canvas);
    L.DomEvent.disableScrollPropagation(this._canvas);

    targetMap.on('move zoom resize', this._redraw, this);
    this._resize();
    this._redraw();
  },

  onRemove(targetMap) {
    targetMap.off('move zoom resize', this._redraw, this);
    L.DomUtil.remove(this._canvas);
  },

  _resize() {
    const size = this._map.getSize();
    this._canvas.width = size.x;
    this._canvas.height = size.y;
    this._canvas.style.width = `${size.x}px`;
    this._canvas.style.height = `${size.y}px`;
    this._canvas.style.position = 'absolute';
    this._canvas.style.top = '0';
    this._canvas.style.left = '0';
    this._canvas.style.pointerEvents = 'none';
  },

  _redraw() {
    if (!this._map || !this._ctx) return;

    this._resize();

    const ctx = this._ctx;
    const w = this._canvas.width;
    const h = this._canvas.height;

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.90)';
    ctx.fillRect(0, 0, w, h);

    for (const latLng of pathLatLngs) {
      const p = this._map.latLngToContainerPoint(latLng);
      const radiusPx = Math.max(14, metersToPixels(this._map, REVEAL_RADIUS_M, latLng.lat));

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const grad = ctx.createRadialGradient(p.x, p.y, radiusPx * 0.2, p.x, p.y, radiusPx);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radiusPx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },
});

const fogOverlay = new FogOverlay();
fogOverlay.addTo(map);

function metersToPixels(targetMap, meters, lat) {
  const zoom = targetMap.getZoom();
  const metersPerPixel =
    (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  return meters / metersPerPixel;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function updateRoute(lat, lon, shouldRecenter = false) {
  const latLng = L.latLng(lat, lon);
  pathLatLngs.push(latLng);
  pathLine.setLatLngs(pathLatLngs);

  if (!followMarker) {
    followMarker = L.circleMarker(latLng, {
      radius: 7,
      color: '#80d1ff',
      weight: 2,
      fillColor: '#1ea0ff',
      fillOpacity: 0.9,
    }).addTo(map);
  } else {
    followMarker.setLatLng(latLng);
  }

  if (shouldRecenter) map.setView(latLng, Math.max(map.getZoom(), 18));

  fogOverlay._redraw();
}

function resetAll() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  if (demoTimer) clearInterval(demoTimer);
  demoTimer = null;

  pathLatLngs = [];
  pathLine.setLatLngs(pathLatLngs);

  if (followMarker) {
    map.removeLayer(followMarker);
    followMarker = null;
  }

  fogOverlay._redraw();
  setStatus('リセットしました');
}

function startGeolocation() {
  if (!navigator.geolocation) {
    setStatus('このブラウザはGeolocation APIに対応していません。');
    return;
  }

  if (demoTimer) {
    clearInterval(demoTimer);
    demoTimer = null;
  }

  if (watchId !== null) navigator.geolocation.clearWatch(watchId);

  setStatus('位置情報を取得中...');
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      updateRoute(latitude, longitude, pathLatLngs.length === 0);
      setStatus(
        `追跡中: lat ${latitude.toFixed(6)}, lon ${longitude.toFixed(6)}, 精度±${Math.round(
          accuracy
        )}m`
      );
    },
    (err) => {
      setStatus(`位置情報エラー: ${err.message}`);
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
  );
}

function startDemoPath() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  if (demoTimer) clearInterval(demoTimer);

  resetAll();

  const demoPoints = [
    [35.681236, 139.767125],
    [35.681300, 139.767350],
    [35.681340, 139.767620],
    [35.681290, 139.767850],
    [35.681150, 139.768030],
    [35.680980, 139.768110],
    [35.680790, 139.768020],
    [35.680670, 139.767810],
    [35.680640, 139.767520],
    [35.680730, 139.767280],
    [35.680930, 139.767140],
    [35.681120, 139.767090],
  ];

  map.setView(demoPoints[0], 18);

  let i = 0;
  setStatus('デモ軌跡を再生中...');
  demoTimer = setInterval(() => {
    if (i >= demoPoints.length) {
      clearInterval(demoTimer);
      demoTimer = null;
      setStatus('デモ完了');
      return;
    }

    const [lat, lon] = demoPoints[i++];
    updateRoute(lat, lon);
  }, DEMO_INTERVAL_MS);
}

startBtn.addEventListener('click', startGeolocation);
demoBtn.addEventListener('click', startDemoPath);
resetBtn.addEventListener('click', resetAll);

setStatus('待機中（実地図連携）');
