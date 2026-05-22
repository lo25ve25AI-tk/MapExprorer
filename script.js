const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const demoBtn = document.getElementById('demoBtn');
const resetBtn = document.getElementById('resetBtn');
const statusEl = document.getElementById('status');

const METERS_TO_PX = 4;
const REVEAL_RADIUS_M = 10;
const REVEAL_RADIUS_PX = REVEAL_RADIUS_M * METERS_TO_PX;

const width = canvas.width;
const height = canvas.height;

const mapLayer = document.createElement('canvas');
mapLayer.width = width;
mapLayer.height = height;
const mapCtx = mapLayer.getContext('2d');

const fogLayer = document.createElement('canvas');
fogLayer.width = width;
fogLayer.height = height;
const fogCtx = fogLayer.getContext('2d');

let watchId = null;
let path = [];
let lastGeoPoint = null;
let demoTimer = null;

function createBaseMap() {
  mapCtx.clearRect(0, 0, width, height);
  mapCtx.fillStyle = '#000';
  mapCtx.fillRect(0, 0, width, height);

  mapCtx.strokeStyle = '#fff';
  mapCtx.lineWidth = 10;
  mapCtx.lineCap = 'round';

  const roads = [
    [
      [30, 100],
      [220, 120],
      [420, 80],
      [600, 130],
      [860, 95],
    ],
    [
      [70, 480],
      [250, 420],
      [420, 430],
      [640, 370],
      [840, 410],
    ],
    [
      [150, 30],
      [180, 200],
      [160, 320],
      [200, 540],
    ],
    [
      [460, 40],
      [480, 220],
      [520, 340],
      [510, 540],
    ],
  ];

  roads.forEach((road) => {
    mapCtx.beginPath();
    road.forEach(([x, y], i) => {
      if (i === 0) mapCtx.moveTo(x, y);
      else mapCtx.lineTo(x, y);
    });
    mapCtx.stroke();
  });

  mapCtx.fillStyle = '#fff';
  const buildings = [
    [290, 190, 70, 60],
    [350, 240, 110, 90],
    [640, 180, 80, 100],
    [730, 250, 120, 70],
    [600, 430, 160, 80],
    [300, 420, 120, 90],
  ];
  buildings.forEach(([x, y, w, h]) => mapCtx.fillRect(x, y, w, h));
}

function resetFog() {
  fogCtx.globalCompositeOperation = 'source-over';
  fogCtx.fillStyle = 'rgba(0, 0, 0, 1)';
  fogCtx.fillRect(0, 0, width, height);
}

function revealAt(x, y) {
  fogCtx.save();
  fogCtx.globalCompositeOperation = 'destination-out';

  const grad = fogCtx.createRadialGradient(x, y, REVEAL_RADIUS_PX * 0.15, x, y, REVEAL_RADIUS_PX);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  fogCtx.fillStyle = grad;

  fogCtx.beginPath();
  fogCtx.arc(x, y, REVEAL_RADIUS_PX, 0, Math.PI * 2);
  fogCtx.fill();
  fogCtx.restore();
}

function drawPath() {
  if (path.length < 2) return;
  ctx.save();
  ctx.strokeStyle = '#5bc0ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  path.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(mapLayer, 0, 0);
  drawPath();
  ctx.drawImage(fogLayer, 0, 0);
}

function setStatus(text) {
  statusEl.textContent = text;
}

function resetAll() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  if (demoTimer) clearInterval(demoTimer);
  demoTimer = null;
  path = [];
  lastGeoPoint = null;
  resetFog();
  render();
  setStatus('リセットしました');
}

function screenPointFromGeo(current, origin) {
  const metersPerDegLat = 111320;
  const metersPerDegLon = metersPerDegLat * Math.cos((origin.lat * Math.PI) / 180);

  const dxMeters = (current.lon - origin.lon) * metersPerDegLon;
  const dyMeters = (current.lat - origin.lat) * metersPerDegLat;

  const centerX = width / 2;
  const centerY = height / 2;

  return [centerX + dxMeters * METERS_TO_PX, centerY - dyMeters * METERS_TO_PX];
}

function addPointAndReveal(x, y) {
  path.push([x, y]);
  revealAt(x, y);
  render();
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
      const current = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
      };

      if (!lastGeoPoint) {
        lastGeoPoint = current;
      }

      const [x, y] = screenPointFromGeo(current, lastGeoPoint);
      addPointAndReveal(x, y);
      setStatus(`追跡中: lat ${current.lat.toFixed(6)}, lon ${current.lon.toFixed(6)}`);
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
  path = [];
  resetFog();

  const demoPoints = [
    [70, 110], [130, 115], [200, 120], [270, 112], [350, 95], [420, 80],
    [480, 95], [550, 118], [620, 125], [700, 114], [780, 105], [840, 97],
    [770, 140], [710, 190], [680, 250], [660, 320], [640, 380], [610, 430],
    [560, 440], [500, 435], [430, 430], [360, 428], [290, 420], [250, 430],
    [210, 470],
  ];

  let i = 0;
  setStatus('デモ軌跡を再生中...');
  demoTimer = setInterval(() => {
    if (i >= demoPoints.length) {
      clearInterval(demoTimer);
      demoTimer = null;
      setStatus('デモ完了');
      return;
    }
    const [x, y] = demoPoints[i++];
    addPointAndReveal(x, y);
  }, 220);
}

startBtn.addEventListener('click', startGeolocation);
demoBtn.addEventListener('click', startDemoPath);
resetBtn.addEventListener('click', resetAll);

createBaseMap();
resetFog();
render();
