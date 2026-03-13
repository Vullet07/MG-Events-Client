import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import api, { getApiErrorMessage } from "../api/api";
import { useToast } from "../context/ToastContext";
import { formatDateTime } from "../utils/formatDateTime";
import "./MapPage.css";

const W = 1000;
const H = 700;
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3.2;
const ROOM_CLUSTER_THRESHOLD = 18;

const VIEWS = [
  { id: "campus", label: "Кампус", floors: 1 },
  { id: "main", label: "Голяма сграда", floors: 4 },
  { id: "small", label: "Малка сграда", floors: 3 }
];

const LAYERS = ["campus", "main:1", "main:2", "main:3", "main:4", "small:1", "small:2", "small:3"];

const CODEC = {
  baseLat: 42.1402,
  baseLng: 24.7444,
  layerGapLat: 0.0022,
  layerGapLng: 0.0022,
  spanLat: 0.0014,
  spanLng: 0.0022
};

const API_ORIGIN = (() => {
  try {
    return new URL(api.defaults.baseURL).origin;
  } catch {
    return "";
  }
})();

const ZONE_LABELS = {
  class: "Стая",
  special: "Специална зона",
  lab: "Лаборатория",
  zone: "Обща зона"
};

function room(id, x, y, w, h, label, kind, sub = "") {
  return { id, x, y, w, h, label, kind, sub };
}

function fitInside(x, y, w, h, aspect) {
  let width = w;
  let height = h;
  if (width / height > aspect) {
    width = height * aspect;
  } else {
    height = width / aspect;
  }
  return {
    x: x + (w - width) / 2,
    y: y + (h - height) / 2,
    w: width,
    h: height
  };
}

function createProjection(bounds, frame, pad = 0) {
  const width = Math.max(1, frame.w - pad * 2);
  const height = Math.max(1, frame.h - pad * 2);
  const scale = Math.min(width / bounds.w, height / bounds.h);
  const drawWidth = bounds.w * scale;
  const drawHeight = bounds.h * scale;
  return {
    scale,
    offsetX: frame.x + pad + (width - drawWidth) / 2 - bounds.x * scale,
    offsetY: frame.y + pad + (height - drawHeight) / 2 - bounds.y * scale
  };
}

function projectPoint(x, y, projection) {
  return {
    x: x * projection.scale + projection.offsetX,
    y: y * projection.scale + projection.offsetY
  };
}

function unprojectPoint(x, y, projection) {
  return {
    x: (x - projection.offsetX) / projection.scale,
    y: (y - projection.offsetY) / projection.scale
  };
}

function projectRect(item, projection) {
  const point = projectPoint(item.x, item.y, projection);
  return {
    ...item,
    x: point.x,
    y: point.y,
    w: item.w * projection.scale,
    h: item.h * projection.scale
  };
}

function projectPath(path, projection) {
  return path.replace(/([ML])\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (_, command, xRaw, yRaw) => {
    const point = projectPoint(Number(xRaw), Number(yRaw), projection);
    return `${command}${Math.round(point.x * 100) / 100} ${Math.round(point.y * 100) / 100}`;
  });
}

const CAMPUS_SOURCE_FRAME = fitInside(70, 24, 860, 650, 1000 / 1240);
const CAMPUS_SOURCE_PROJECTION = {
  scale: CAMPUS_SOURCE_FRAME.w / 1000,
  offsetX: CAMPUS_SOURCE_FRAME.x,
  offsetY: CAMPUS_SOURCE_FRAME.y
};

const cx = (value) => Math.round((CAMPUS_SOURCE_PROJECTION.offsetX + value * CAMPUS_SOURCE_PROJECTION.scale) * 100) / 100;
const cy = (value) => Math.round((CAMPUS_SOURCE_PROJECTION.offsetY + value * CAMPUS_SOURCE_PROJECTION.scale) * 100) / 100;
const cw = (value) => Math.round(value * CAMPUS_SOURCE_PROJECTION.scale * 100) / 100;
const ch = (value) => Math.round(value * CAMPUS_SOURCE_PROJECTION.scale * 100) / 100;
const projectCampusPolygon = (points) => points.map(([x, y]) => [cx(x), cy(y)]);

const CAMPUS_OUTER_PATH_SOURCE = "M24 18 L918 18 L918 840 L996 840 L996 1220 L554 1220 L554 840 L24 840 Z";
const CAMPUS_MAIN_PATH_SOURCE =
  "M80 82 L228 82 L228 98 L348 98 L348 168 L598 168 L598 200 L268 200 L268 236 L516 236 L516 348 L198 348 L198 650 L232 650 L232 712 L198 712 L198 678 L80 678 L80 210 L148 210 L148 82 Z";
const CAMPUS_OUTER_POLYGON = projectCampusPolygon([
  [24, 18],
  [918, 18],
  [918, 840],
  [996, 840],
  [996, 1220],
  [554, 1220],
  [554, 840],
  [24, 840]
]);
const CAMPUS_MAIN_POLYGON = projectCampusPolygon([
  [80, 82],
  [228, 82],
  [228, 98],
  [348, 98],
  [348, 168],
  [598, 168],
  [598, 200],
  [268, 200],
  [268, 236],
  [516, 236],
  [516, 348],
  [198, 348],
  [198, 650],
  [232, 650],
  [232, 712],
  [198, 712],
  [198, 678],
  [80, 678],
  [80, 210],
  [148, 210],
  [148, 82]
]);

const CAMPUS_ROOMS = [
  room("main-block-north", cx(80), cy(82), cw(188), ch(128), "Голяма сграда", "special", "северно крило"),
  room("main-block-west", cx(80), cy(210), cw(118), ch(468), "Голяма сграда", "special", "западно крило"),
  room("main-block-center", cx(198), cy(236), cw(318), ch(112), "Голяма сграда", "special", "централно крило"),
  room("main-block-gym", cx(348), cy(98), cw(250), ch(102), "Голяма сграда", "special", "ФВС сектор"),
  room("main-block-south", cx(198), cy(650), cw(34), ch(62), "Голяма сграда", "special", "южен вход"),
  room("small-building", cx(724), cy(840), cw(216), ch(186), "Малка сграда", "lab"),
  room("court", cx(680), cy(374), cw(240), ch(154), "Игрище", "special"),
  room("small-court", cx(752), cy(1048), cw(194), ch(130), "Малко игрище", "special"),
  room("annex-yard", cx(676), cy(840), cw(264), ch(380), "Дворна зона", "zone"),
  room("north-walk", cx(24), cy(18), cw(894), ch(36), "Северна алея", "zone"),
  room("west-garden", cx(24), cy(54), cw(58), ch(786), "Западна зелена зона", "zone"),
  room("north-garden", cx(250), cy(86), cw(76), ch(130), "Северна зелена зона", "zone"),
  room("east-garden", cx(554), cy(288), cw(86), ch(320), "Източна зелена зона", "zone"),
  room("south-east-garden", cx(700), cy(620), cw(218), ch(178), "Югоизточна зелена зона", "zone"),
  room("south-garden", cx(554), cy(840), cw(120), ch(380), "Южна зелена зона", "zone"),
  room("east-border", cx(918), cy(840), cw(78), ch(380), "Източна алея", "zone"),
  room("south-walk", cx(554), cy(1184), cw(442), ch(36), "Южна алея", "zone")
];

const CAMPUS_BUILDING_IDS = new Set([
  "main-block-north",
  "main-block-west",
  "main-block-center",
  "main-block-gym",
  "main-block-south",
  "small-building"
]);

const CAMPUS_BUILDINGS = CAMPUS_ROOMS.filter((item) => CAMPUS_BUILDING_IDS.has(item.id));
const CAMPUS_SMALL_BUILDING = CAMPUS_BUILDINGS.find((item) => item.id === "small-building") || null;
const CAMPUS_ZONES = CAMPUS_ROOMS.filter((item) => !CAMPUS_BUILDING_IDS.has(item.id));

const MAIN = {
  1: [
    room("COR-V", 96, 270, 62, 348, "Коридор", "zone"),
    room("120", 40, 110, 56, 96, "120", "class"),
    room("WC-1W", 40, 206, 56, 32, "Жени", "zone"),
    room("WC-1M", 40, 238, 56, 32, "Мъже", "zone"),
    room("119", 96, 110, 40, 52, "119", "class"),
    room("MED", 96, 162, 40, 44, "Лекар", "special"),
    room("FVS1-M", 252, 168, 58, 74, "Мъже", "zone"),
    room("FVS1", 310, 168, 190, 74, "ФВС салон 1", "special"),
    room("FVS1-W", 500, 168, 58, 74, "Жени", "zone"),
    room("101", 158, 338, 62, 56, "101", "class"),
    room("102", 158, 394, 62, 56, "102", "class"),
    room("103", 158, 450, 62, 56, "103", "class"),
    room("104", 158, 506, 62, 56, "104", "class"),
    room("105", 158, 562, 62, 56, "105", "class"),
    room("106", 96, 618, 124, 40, "106", "class"),
    room("DINING", 220, 618, 380, 74, "Столова", "special"),
    room("LOBBY", 220, 242, 250, 96, "Лоби", "special"),
    room("STAIR-1A", 158, 234, 62, 104, "Стълбище", "zone")
  ],
  2: [
    room("COR-V", 96, 338, 62, 320, "Коридор", "zone"),
    room("209", 22, 110, 74, 44, "209", "class"),
    room("210", 22, 154, 74, 44, "210", "class"),
    room("WC-2W-A", 22, 198, 74, 36, "Жени", "zone"),
    room("WC-2M-A", 22, 234, 74, 36, "Мъже", "zone"),
    room("207", 96, 110, 62, 124, "207", "class"),
    room("OPEN-2A", 96, 234, 62, 104, "Отворена зона", "zone"),
    room("WC-2W-B", 220, 234, 130, 52, "Жени", "zone"),
    room("WC-2M-B", 350, 234, 130, 52, "Мъже", "zone"),
    room("COR-T", 220, 286, 260, 52, "Коридор", "zone"),
    room("201", 158, 338, 62, 56, "201", "class"),
    room("202", 158, 394, 62, 56, "202", "class"),
    room("203", 158, 450, 62, 56, "203", "class"),
    room("204", 158, 506, 62, 56, "204", "class"),
    room("205", 158, 562, 62, 48, "205", "class"),
    room("206", 158, 610, 62, 48, "206", "class"),
    room("FVS2", 332, 132, 184, 92, "ФВС салон 2", "special"),
    room("STAIR-2A", 158, 234, 62, 104, "Стълбище", "zone"),
    room("STAIR-2B", 96, 658, 124, 34, "Стълбище", "zone")
  ],
  3: [
    room("COR-V", 134, 334, 60, 294, "Коридор", "zone"),
    room("301", 194, 334, 60, 42, "301", "class"),
    room("302", 194, 376, 60, 42, "302", "class"),
    room("303", 194, 418, 60, 42, "303", "class"),
    room("304", 194, 460, 60, 42, "304", "class"),
    room("305", 194, 502, 60, 42, "305", "class"),
    room("306", 194, 544, 60, 42, "306", "class"),
    room("307", 166, 222, 54, 46, "307", "class"),
    room("308", 166, 132, 54, 50, "308", "class"),
    room("309", 194, 586, 60, 42, "309", "class"),
    room("310", 166, 182, 54, 40, "310", "class"),
    room("LIB", 92, 132, 42, 56, "Библиотека", "special"),
    room("SEC", 92, 188, 42, 42, "Секретар", "special"),
    room("WC-3M", 92, 230, 42, 34, "Мъже", "zone"),
    room("WC-3W", 92, 264, 42, 34, "Жени", "zone"),
    room("OPEN-3C", 220, 268, 34, 66, "Стълбище", "zone"),
    room("STAIR-3B", 134, 628, 120, 48, "Стълбище", "zone")
  ],
  4: [
    room("COR-V", 134, 334, 60, 294, "Коридор", "zone"),
    room("401", 194, 334, 60, 42, "401", "class"),
    room("402", 194, 376, 60, 42, "402", "class"),
    room("403", 194, 418, 60, 42, "403", "class"),
    room("404", 194, 460, 60, 42, "404", "class"),
    room("405", 194, 502, 60, 42, "405", "class"),
    room("406", 194, 544, 60, 42, "406", "class"),
    room("407", 166, 222, 54, 46, "407", "class"),
    room("408", 166, 132, 54, 50, "408", "class"),
    room("410", 92, 188, 42, 42, "410", "class"),
    room("411", 92, 132, 42, 56, "411", "class"),
    room("LABP", 166, 182, 54, 40, "Лаб. прогр.", "lab"),
    room("WC-4M", 92, 230, 42, 34, "Мъже", "zone"),
    room("WC-4W", 92, 264, 42, 34, "Жени", "zone"),
    room("OPEN-4C", 220, 268, 34, 66, "Стълбище", "zone"),
    room("HIST", 194, 586, 60, 42, "История", "special"),
    room("STAIR-4B", 134, 628, 120, 48, "Стълбище", "zone")
  ]
};

const SMALL = {
  1: [
    room("PHY", 260, 120, 110, 100, "Физика", "lab"),
    room("BIO", 260, 220, 110, 96, "Биология", "lab"),
    room("CHEM", 260, 316, 110, 92, "Химия", "lab"),
    room("WC-S1W", 260, 408, 110, 66, "Жени", "zone"),
    room("WC-S1M", 260, 474, 110, 106, "Мъже", "zone"),
    room("COR-S1", 370, 120, 110, 460, "Коридор", "zone"),
    room("113", 480, 120, 110, 92, "113", "class"),
    room("114", 480, 212, 110, 96, "114", "class"),
    room("SERV", 480, 308, 110, 114, "Обслужващ персонал", "special"),
    room("STAIR-S1", 480, 422, 110, 158, "Стълбище", "zone")
  ],
  2: [
    room("211", 260, 120, 110, 88, "211", "class"),
    room("212", 260, 208, 110, 188, "212", "class"),
    room("WC-S2M", 260, 396, 110, 70, "Мъже", "zone"),
    room("WC-S2W", 260, 466, 110, 114, "Жени", "zone"),
    room("COR-S2", 370, 120, 110, 460, "Коридор", "zone"),
    room("213", 480, 120, 110, 86, "213", "class"),
    room("214", 480, 206, 110, 220, "214", "class"),
    room("STAIR-S2", 480, 426, 110, 154, "Стълбище", "zone")
  ],
  3: [
    room("TECH", 260, 120, 110, 138, "Технологии", "special", "и иновации"),
    room("RESEARCH", 260, 258, 110, 128, "Изследов.", "special", "и проекти"),
    room("WC-S3M", 260, 386, 110, 70, "Мъже", "zone"),
    room("WC-S3W", 260, 456, 110, 124, "Жени", "zone"),
    room("COR-S3", 370, 120, 110, 460, "Коридор", "zone"),
    room("315", 370, 120, 110, 76, "315", "class"),
    room("313", 480, 120, 110, 134, "313", "class"),
    room("314", 480, 254, 110, 172, "314", "class"),
    room("STAIR-S3", 480, 426, 110, 154, "Стълбище", "zone")
  ]
};

const MAIN_HULLS = {
  1: "M40 110 L136 110 L136 206 L158 206 L158 234 L252 234 L252 168 L558 168 L558 242 L470 242 L470 338 L220 338 L220 618 L600 618 L600 692 L220 692 L220 658 L96 658 L96 270 L40 270 Z",
  2: "M22 110 L158 110 L158 234 L480 234 L480 338 L220 338 L220 692 L96 692 L96 270 L22 270 Z",
  3: "M92 132 L220 132 L220 268 L254 268 L254 676 L134 676 L134 298 L92 298 Z",
  4: "M92 132 L220 132 L220 268 L254 268 L254 676 L134 676 L134 298 L92 298 Z"
};

const MAIN_HULL_POLYGONS = {
  1: [
    [40, 110], [136, 110], [136, 206], [158, 206], [158, 234], [252, 234], [252, 168], [558, 168], [558, 242],
    [470, 242], [470, 338], [220, 338], [220, 618], [600, 618], [600, 692], [220, 692], [220, 658], [96, 658],
    [96, 270], [40, 270]
  ],
  2: [
    [22, 110], [158, 110], [158, 234], [480, 234], [480, 338], [220, 338], [220, 692], [96, 692], [96, 270], [22, 270]
  ],
  3: [
    [92, 132], [220, 132], [220, 268], [254, 268], [254, 676], [134, 676], [134, 298], [92, 298]
  ],
  4: [
    [92, 132], [220, 132], [220, 268], [254, 268], [254, 676], [134, 676], [134, 298], [92, 298]
  ]
};

const SMALL_HULL = { x: 260, y: 120, w: 330, h: 460 };
const LEGACY_CODEC = {
  baseLat: 42.6977,
  baseLng: 23.3219,
  layerStepLat: 0.0012,
  layerStepLng: 0.0011
};

const FLOOR_WORLD_BOUNDS = {
  "main:1": { x: 40, y: 110, w: 560, h: 582 },
  "main:2": { x: 22, y: 110, w: 578, h: 582 },
  "main:3": { x: 92, y: 132, w: 162, h: 544 },
  "main:4": { x: 92, y: 132, w: 162, h: 544 },
  "small:1": { x: 260, y: 120, w: 330, h: 460 },
  "small:2": { x: 260, y: 120, w: 330, h: 460 },
  "small:3": { x: 260, y: 120, w: 330, h: 460 },
  campus: { x: 0, y: 0, w: W, h: H }
};

const FLOOR_DISPLAY_FRAMES = {
  main: { x: 84, y: 88, w: 832, h: 540, pad: 12 },
  small: { x: 118, y: 94, w: 764, h: 520, pad: 12 }
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function toLayerId(view, floor) {
  if (view === "campus") return "campus";
  return `${view}:${floor}`;
}

function parseLayerId(layerId) {
  if (layerId === "campus") return { view: "campus", floor: 1 };
  const [view, floorRaw] = layerId.split(":");
  return { view, floor: Number(floorRaw || 1) };
}

function getFallbackZone(layerId, x, y) {
  if (layerId === "campus") {
    const smallBuilding = CAMPUS_BUILDINGS.find((item) => item.id === "small-building");
    const insideMainBuilding = pointInPolygon(x, y, CAMPUS_MAIN_POLYGON);
    const insideSmallBuilding = smallBuilding ? pointInRect(x, y, smallBuilding) : false;

    if (insideMainBuilding || insideSmallBuilding) return null;
    if (!pointInPolygon(x, y, CAMPUS_OUTER_POLYGON)) return null;

    return {
      id: "CAMPUS-YARD",
      x: x - 12,
      y: y - 12,
      w: 24,
      h: 24,
      label: "Дворна зона",
      kind: "zone",
      sub: "Кампус"
    };
  }

  const { view, floor } = parseLayerId(layerId);
  if (view === "main") {
    const polygon = MAIN_HULL_POLYGONS[floor];
    if (!polygon || !pointInPolygon(x, y, polygon)) return null;
    return {
      id: `COR-FALLBACK-${layerId}`,
      x: x - 12,
      y: y - 12,
      w: 24,
      h: 24,
      label: "Коридор",
      kind: "zone",
      sub: `Голяма сграда · етаж ${floor}`
    };
  }

  if (view === "small" && pointInRect(x, y, SMALL_HULL)) {
    return {
      id: `COR-FALLBACK-${layerId}`,
      x: x - 12,
      y: y - 12,
      w: 24,
      h: 24,
      label: "Коридор",
      kind: "zone",
      sub: `Малка сграда · етаж ${floor}`
    };
  }

  return null;
}

function findZoneAtPoint(layerId, x, y, rooms) {
  return findRoomAtPoint(x, y, rooms) || getFallbackZone(layerId, x, y);
}

function getCampusBuildingAtPoint(x, y) {
  if (pointInPolygon(x, y, CAMPUS_MAIN_POLYGON)) {
    return {
      id: "campus-main-building",
      label: "Голяма сграда",
      building: "main"
    };
  }

  if (CAMPUS_SMALL_BUILDING && pointInRect(x, y, CAMPUS_SMALL_BUILDING)) {
    return {
      id: "campus-small-building",
      label: "Малка сграда",
      building: "small"
    };
  }

  return null;
}

function getInteractiveTargetAtPoint(layerId, x, y, rooms) {
  if (layerId === "campus") {
    const building = getCampusBuildingAtPoint(x, y);
    if (building) {
      return { type: "building", ...building };
    }
  }

  const room = findZoneAtPoint(layerId, x, y, rooms);
  if (room) {
    return { type: "room", room };
  }

  return null;
}

function encodeLayerPoint(layerId, x, y) {
  const index = Math.max(0, LAYERS.indexOf(layerId));
  const baseLat = CODEC.baseLat + index * CODEC.layerGapLat;
  const baseLng = CODEC.baseLng + index * CODEC.layerGapLng;
  const nx = clamp(x / W, 0, 1);
  const ny = clamp(y / H, 0, 1);
  return {
    latitude: baseLat + (0.5 - ny) * CODEC.spanLat,
    longitude: baseLng + (nx - 0.5) * CODEC.spanLng
  };
}

function decodeLayerPoint(latitudeRaw, longitudeRaw) {
  const latitude = Number(latitudeRaw);
  const longitude = Number(longitudeRaw);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const approxIndex = Math.round((latitude - CODEC.baseLat) / CODEC.layerGapLat);
  const index = clamp(approxIndex, 0, LAYERS.length - 1);
  const layerId = LAYERS[index];
  const baseLat = CODEC.baseLat + index * CODEC.layerGapLat;
  const baseLng = CODEC.baseLng + index * CODEC.layerGapLng;
  const ny = 0.5 - (latitude - baseLat) / CODEC.spanLat;
  const nx = (longitude - baseLng) / CODEC.spanLng + 0.5;
  const x = nx * W;
  const y = ny * H;
  if (x < -120 || x > W + 120 || y < -120 || y > H + 120) return null;
  return { layerId, x: clamp(x, 0, W), y: clamp(y, 0, H) };
}

function getRooms(layerId) {
  if (layerId === "campus") return CAMPUS_ZONES;
  const parsed = parseLayerId(layerId);
  if (parsed.view === "main") return MAIN[parsed.floor] || [];
  if (parsed.view === "small") return SMALL[parsed.floor] || [];
  return [];
}

function findRoomAtPoint(x, y, rooms) {
  return rooms.find((item) => x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h) || null;
}

function toSvgPoint(event, svg) {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const matrix = svg.getScreenCTM();
  if (!matrix) return { x: 0, y: 0 };
  const transformed = point.matrixTransform(matrix.inverse());
  return { x: transformed.x, y: transformed.y };
}

function buildVisuals(pins, roomAnchors, cellSize = 28, zoom = 1, activePinId = null) {
  const roomBuckets = new Map();
  const freePins = [];

  pins.forEach((pin) => {
    if (!pin.roomId) {
      freePins.push(pin);
      return;
    }

    const key = `${pin.layerId}::${pin.roomId}`;
    if (!roomBuckets.has(key)) {
      roomBuckets.set(key, []);
    }
    roomBuckets.get(key).push(pin);
  });

  const visuals = [];
  const buckets = new Map();
  [...freePins]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .forEach((pin) => {
    const key = `${Math.round(pin.x / cellSize)}:${Math.round(pin.y / cellSize)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(pin);
    });

  roomBuckets.forEach((bucketPins, key) => {
    if (bucketPins.length < ROOM_CLUSTER_THRESHOLD) {
      bucketPins.forEach((pin) => {
        const bucketKey = `${Math.round(pin.x / cellSize)}:${Math.round(pin.y / cellSize)}`;
        if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
        buckets.get(bucketKey).push(pin);
      });
      return;
    }

    const roomAnchor = roomAnchors.get(key);
    const centerX = roomAnchor?.x ?? bucketPins.reduce((sum, item) => sum + item.x, 0) / bucketPins.length;
    const centerY = roomAnchor?.y ?? bucketPins.reduce((sum, item) => sum + item.y, 0) / bucketPins.length;
    const topPin = [...bucketPins].sort((a, b) => {
      if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
      return new Date(b.createdAt) - new Date(a.createdAt);
    })[0];

    visuals.push({
      type: "room-cluster",
      id: `room-cluster-${key}`,
      x: centerX,
      y: centerY,
      count: bucketPins.length,
      pins: bucketPins,
      roomId: topPin.roomId,
      roomLabel: topPin.roomLabel || "Стая",
      containsActive: bucketPins.some((pin) => pin.id === activePinId),
      score: bucketPins.reduce((sum, pin) => sum + (pin.score || 0), 0)
    });
  });

  buckets.forEach((bucketPins) => {
    if (bucketPins.length === 1) {
      const pin = bucketPins[0];
      visuals.push({ type: "pin", pin, x: pin.x, y: pin.y, stackSize: 1 });
      return;
    }

    const cx = bucketPins.reduce((sum, item) => sum + item.x, 0) / bucketPins.length;
    const cy = bucketPins.reduce((sum, item) => sum + item.y, 0) / bucketPins.length;
    const spiderfyLimit = zoom >= 1.6 ? 12 : zoom >= 1.25 ? 8 : 5;

    if (bucketPins.length <= spiderfyLimit || bucketPins.some((pin) => pin.id === activePinId)) {
      bucketPins.forEach((pin, index) => {
        const angle = (Math.PI * 2 * index) / bucketPins.length;
        const radius = 14 + Math.min(20, bucketPins.length * 2.2) + Math.max(0, (1.4 - zoom) * 7);
        visuals.push({
          type: "pin",
          pin,
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          stackSize: bucketPins.length
        });
      });
      return;
    }

    visuals.push({ type: "cluster", id: `cluster-${Math.round(cx)}-${Math.round(cy)}`, x: cx, y: cy, count: bucketPins.length, pins: bucketPins });
  });

  return visuals;
}

function tone(score) {
  if (score >= 10) return "marker-high";
  if (score <= -3) return "marker-low";
  return "marker-mid";
}

function layerLabel(view, floor) {
  if (view === "campus") return "Кампус";
  if (view === "main") return `Голяма сграда - етаж ${floor}`;
  return `Малка сграда - етаж ${floor}`;
}

function getLayerProjection(layerId) {
  if (layerId === "campus") {
    return { scale: 1, offsetX: 0, offsetY: 0 };
  }

  const parsed = parseLayerId(layerId);
  const bounds = FLOOR_WORLD_BOUNDS[layerId];
  const frame = FLOOR_DISPLAY_FRAMES[parsed.view];

  if (!bounds || !frame) {
    return { scale: 1, offsetX: 0, offsetY: 0 };
  }

  return createProjection(bounds, frame, frame.pad || 0);
}

function getDefaultZoomForView(view) {
  return view === "campus" ? 1.42 : 1.18;
}

function getFocusZoomForView(view, intent = "pin") {
  if (view === "campus") {
    return intent === "room" ? 1.58 : 1.5;
  }

  if (intent === "room") return 1.28;
  return 1.22;
}

function resolveMediaUrl(url) {
  if (!url) return "";
  const normalizedUrl = url.replace(/\\/g, "/");
  if (/^https?:\/\//i.test(normalizedUrl) || normalizedUrl.startsWith("blob:") || normalizedUrl.startsWith("data:")) {
    return normalizedUrl;
  }
  if (!API_ORIGIN) return normalizedUrl;
  return `${API_ORIGIN}${normalizedUrl.startsWith("/") ? normalizedUrl : `/${normalizedUrl}`}`;
}

const ROOM_DIRECTORY = [
  ...CAMPUS_ZONES.map((item) => ({ ...item, layerId: "campus", view: "campus", floor: 1 })),
  ...Object.entries(MAIN).flatMap(([floorValue, items]) =>
    items.map((item) => ({
      ...item,
      layerId: `main:${floorValue}`,
      view: "main",
      floor: Number(floorValue)
    }))
  ),
  ...Object.entries(SMALL).flatMap(([floorValue, items]) =>
    items.map((item) => ({
      ...item,
      layerId: `small:${floorValue}`,
      view: "small",
      floor: Number(floorValue)
    }))
  )
];

const LEGACY_PIN_SLOTS = [
  { layerId: "campus", id: "court" },
  { layerId: "campus", id: "annex-yard" },
  { layerId: "campus", id: "north-walk" },
  { layerId: "campus", id: "east-garden" },
  { layerId: "main:1", id: "LOBBY" },
  { layerId: "main:1", id: "DINING" },
  { layerId: "main:1", id: "101" },
  { layerId: "main:2", id: "FVS2" },
  { layerId: "main:2", id: "COR-T" },
  { layerId: "main:2", id: "201" },
  { layerId: "main:3", id: "LIB" },
  { layerId: "main:3", id: "301" },
  { layerId: "main:4", id: "LABP" },
  { layerId: "main:4", id: "401" },
  { layerId: "small:1", id: "PHY" },
  { layerId: "small:1", id: "COR-S1" },
  { layerId: "small:1", id: "113" },
  { layerId: "small:2", id: "211" },
  { layerId: "small:2", id: "COR-S2" },
  { layerId: "small:3", id: "TECH" },
  { layerId: "small:3", id: "RESEARCH" },
  { layerId: "small:3", id: "STAIR-S3" }
]
  .map((slot) => {
    const roomData = ROOM_DIRECTORY.find((item) => item.layerId === slot.layerId && item.id === slot.id);
    if (!roomData) return null;
    return {
      ...slot,
      x: roomData.x + roomData.w / 2,
      y: roomData.y + roomData.h / 2,
      roomData
    };
  })
  .filter(Boolean);

function getLegacyFallbackSlot(pin, index) {
  if (!LEGACY_PIN_SLOTS.length) return null;

  const latitude = Number(pin.latitude);
  const longitude = Number(pin.longitude);
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    const approxLatIndex = Math.round((latitude - LEGACY_CODEC.baseLat) / LEGACY_CODEC.layerStepLat);
    const approxLngIndex = Math.round((longitude - LEGACY_CODEC.baseLng) / LEGACY_CODEC.layerStepLng);
    const score = Math.abs(approxLatIndex) > Math.abs(approxLngIndex) ? approxLatIndex : approxLngIndex;
    return LEGACY_PIN_SLOTS[Math.abs(score) % LEGACY_PIN_SLOTS.length];
  }

  const safeIndex = Math.abs(((pin.id || index + 1) * 7) % LEGACY_PIN_SLOTS.length);
  return LEGACY_PIN_SLOTS[safeIndex];
}

export default function MapPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const svgRef = useRef(null);
  const dragStateRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    cameraX: 0,
    cameraY: 0
  });
  const suppressClickRef = useRef(false);

  const [pins, setPins] = useState([]);
  const [view, setView] = useState("campus");
  const [floor, setFloor] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [camera, setCamera] = useState({ x: W / 2, y: H / 2 });
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [latestCreatedPin, setLatestCreatedPin] = useState(null);
  const [activePinId, setActivePinId] = useState(null);
  const [activeCluster, setActiveCluster] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const [search, setSearch] = useState("");
  const [roomSearch, setRoomSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [minScore, setMinScore] = useState(-20);
  const [onlyWithPhoto, setOnlyWithPhoto] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const layerId = useMemo(() => toLayerId(view, floor), [view, floor]);
  const rooms = useMemo(() => getRooms(layerId), [layerId]);
  const currentProjection = useMemo(() => getLayerProjection(layerId), [layerId]);
  const deferredSearch = useDeferredValue(search);
  const deferredRoomSearch = useDeferredValue(roomSearch);

  useEffect(() => {
    const fetchPins = async () => {
      try {
        const response = await api.get("/event-pins");
        setPins(response.data?.items || response.data || []);
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, "Неуспешно зареждане на маркерите."));
      }
    };

    fetchPins();
  }, []);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setFeedback("Кликни върху картата, избери стая/зона и публикувай маркер.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview("");
      return;
    }
    const preview = URL.createObjectURL(photoFile);
    setPhotoPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [photoFile]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;

    const wheelListener = (event) => handleWheel(event);
    svg.addEventListener("wheel", wheelListener, { passive: false });

    return () => {
      svg.removeEventListener("wheel", wheelListener);
    };
  });

  const normalizedPins = useMemo(() => {
    return pins
      .map((pin, index) => {
        const decoded = decodeLayerPoint(pin.latitude, pin.longitude);
        const fallbackSlot = !decoded ? getLegacyFallbackSlot(pin, index) : null;

        if (!decoded && !fallbackSlot) return null;

        const rawLayerId = decoded?.layerId || fallbackSlot.layerId;
        const rawX = decoded?.x ?? fallbackSlot.x;
        const rawY = decoded?.y ?? fallbackSlot.y;
        const layerRooms = getRooms(rawLayerId);
        const roomData = decoded
          ? findZoneAtPoint(rawLayerId, rawX, rawY, layerRooms)
          : fallbackSlot.roomData;
        const layerProjection = getLayerProjection(rawLayerId);
        const screenPoint = projectPoint(rawX, rawY, layerProjection);
        return {
          ...pin,
          layerId: rawLayerId,
          rawX,
          rawY,
          x: screenPoint.x,
          y: screenPoint.y,
          roomId: roomData?.id || null,
          roomLabel: roomData?.label || null,
          roomKind: roomData?.kind || null,
          roomSubLabel: roomData?.sub || "",
          isLegacyMapped: !decoded,
          score: pin.score || 0,
          upvotes: pin.upvotes || 0,
          downvotes: pin.downvotes || 0,
          myVote: pin.myVote || 0
        };
      })
      .filter(Boolean);
  }, [pins]);

  const layerPins = useMemo(() => normalizedPins.filter((pin) => pin.layerId === layerId), [normalizedPins, layerId]);
  const roomPinCounts = useMemo(() => {
    const counts = new Map();
    normalizedPins.forEach((pin) => {
      if (!pin.roomId) return;
      const key = `${pin.layerId}::${pin.roomId}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [normalizedPins]);

  const filteredPins = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return layerPins.filter((pin) => {
      if (pin.score < minScore) return false;
      if (onlyWithPhoto && !pin.photoUrl) return false;
      if (roomFilter !== "all" && pin.roomId !== roomFilter) return false;
      if (zoneFilter !== "all" && pin.roomKind !== zoneFilter) return false;
      if (!query) return true;
      const haystack = `${pin.title || ""} ${pin.description || ""} ${pin.createdByUsername || ""} ${pin.roomLabel || ""} ${pin.roomId || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [deferredSearch, layerPins, minScore, onlyWithPhoto, roomFilter, zoneFilter]);

  const displayRooms = useMemo(() => rooms.map((item) => projectRect(item, currentProjection)), [rooms, currentProjection]);
  const roomAnchors = useMemo(() => {
    const anchors = new Map();
    displayRooms.forEach((item) => {
      anchors.set(`${layerId}::${item.id}`, {
        x: item.x + item.w / 2,
        y: item.y + item.h / 2
      });
    });
    return anchors;
  }, [displayRooms, layerId]);

  const visuals = useMemo(
    () => buildVisuals(filteredPins, roomAnchors, clamp(34 - zoom * 8, 16, 30), zoom, activePinId),
    [activePinId, filteredPins, roomAnchors, zoom]
  );
  const activePin = useMemo(() => normalizedPins.find((pin) => pin.id === activePinId) || null, [normalizedPins, activePinId]);
  const kinds = useMemo(() => Array.from(new Set(rooms.map((item) => item.kind))).filter(Boolean), [rooms]);
  const roomSearchResults = useMemo(() => {
    const query = deferredRoomSearch.trim().toLowerCase();
    const source = query
      ? ROOM_DIRECTORY.filter((item) => {
          const haystack = `${item.id} ${item.label} ${item.sub || ""} ${ZONE_LABELS[item.kind] || item.kind} ${layerLabel(item.view, item.floor)}`.toLowerCase();
          return haystack.includes(query);
        })
      : ROOM_DIRECTORY.filter((item) => item.layerId === layerId);

    return source
      .map((item) => ({
        ...item,
        pinCount: roomPinCounts.get(`${item.layerId}::${item.id}`) || 0
      }))
      .sort((a, b) => {
        if (b.pinCount !== a.pinCount) return b.pinCount - a.pinCount;
        return a.label.localeCompare(b.label, "bg");
      })
      .slice(0, query ? 24 : 12);
  }, [deferredRoomSearch, layerId, roomPinCounts]);
  const pinExplorerPins = useMemo(
    () =>
      [...filteredPins]
        .sort((a, b) => {
          if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
          return new Date(b.createdAt) - new Date(a.createdAt);
        })
        .slice(0, 12),
    [filteredPins]
  );

  useEffect(() => {
    setRoomFilter((current) => (current !== "all" && !rooms.some((item) => item.id === current) ? "all" : current));
    setZoneFilter((current) => (current !== "all" && !kinds.includes(current) ? "all" : current));
    setActiveCluster(null);
  }, [kinds, rooms]);

  const selectedRoomData = useMemo(() => {
    if (!selectedPoint) return null;
    return getInteractiveTargetAtPoint(layerId, selectedPoint.x, selectedPoint.y, rooms)?.room || null;
  }, [layerId, selectedPoint, rooms]);

  const selectedScreenPoint = useMemo(() => {
    if (!selectedPoint) return null;
    return projectPoint(selectedPoint.x, selectedPoint.y, currentProjection);
  }, [currentProjection, selectedPoint]);

  const viewBox = useMemo(() => {
    const width = W / zoom;
    const height = H / zoom;
    const minX = clamp(camera.x - width / 2, 0, W - width);
    const minY = clamp(camera.y - height / 2, 0, H - height);
    return `${Math.round(minX * 100) / 100} ${Math.round(minY * 100) / 100} ${Math.round(width * 100) / 100} ${Math.round(height * 100) / 100}`;
  }, [camera, zoom]);

  const focusOnPoint = (x, y, nextZoom = null) => {
    if (nextZoom !== null) setZoom(nextZoom);
    setCamera({ x: clamp(x, 0, W), y: clamp(y, 0, H) });
  };

  const zoomAroundSvgPoint = (svgPoint, delta) => {
    const nextZoom = clamp(zoom + delta, MIN_ZOOM, MAX_ZOOM);
    if (nextZoom === zoom) return;

    const currentWidth = W / zoom;
    const currentHeight = H / zoom;
    const currentMinX = clamp(camera.x - currentWidth / 2, 0, W - currentWidth);
    const currentMinY = clamp(camera.y - currentHeight / 2, 0, H - currentHeight);
    const ratioX = clamp((svgPoint.x - currentMinX) / currentWidth, 0, 1);
    const ratioY = clamp((svgPoint.y - currentMinY) / currentHeight, 0, 1);
    const nextWidth = W / nextZoom;
    const nextHeight = H / nextZoom;
    const nextMinX = clamp(svgPoint.x - ratioX * nextWidth, 0, W - nextWidth);
    const nextMinY = clamp(svgPoint.y - ratioY * nextHeight, 0, H - nextHeight);

    setZoom(nextZoom);
    setCamera({
      x: nextMinX + nextWidth / 2,
      y: nextMinY + nextHeight / 2
    });
  };

  const resetView = () => {
    setZoom(getDefaultZoomForView(view));
    setCamera({ x: W / 2, y: H / 2 });
    setActiveCluster(null);
  };

  const focusRoom = (roomData) => {
    if (!roomData) return;
    if (roomData.id === "small-building") {
      handleBuildingNavigate("small");
      return;
    }
    if (roomData.id?.startsWith("main-block")) {
      handleBuildingNavigate("main");
      return;
    }
    const centerX = roomData.x + roomData.w / 2;
    const centerY = roomData.y + roomData.h / 2;
    const targetLayerId = toLayerId(roomData.view, roomData.floor);
    const targetProjection = getLayerProjection(targetLayerId);
    const screenCenter = projectPoint(centerX, centerY, targetProjection);
    setView(roomData.view);
    setFloor(roomData.floor);
    setRoomFilter(roomData.id);
    setZoneFilter("all");
    setSelectedPoint({ x: centerX, y: centerY });
    setActivePinId(null);
    setActiveCluster(null);
    focusOnPoint(screenCenter.x, screenCenter.y, getFocusZoomForView(roomData.view, "room"));
    setFeedback(`Фокусирана зона: ${roomData.label}`);
  };

  const clearFilters = () => {
    setSearch("");
    setRoomSearch("");
    setRoomFilter("all");
    setZoneFilter("all");
    setMinScore(-20);
    setOnlyWithPhoto(false);
    setActiveCluster(null);
    setFeedback("Филтрите са изчистени.");
  };

  const handleMapClick = (event) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (!svgRef.current) return;
    const point = toSvgPoint(event, svgRef.current);
    const worldPoint = unprojectPoint(point.x, point.y, currentProjection);
    const target = getInteractiveTargetAtPoint(layerId, worldPoint.x, worldPoint.y, rooms);

    if (target?.type === "building") {
      handleBuildingNavigate(target.building);
      setFeedback(`\u041E\u0442\u0432\u043E\u0440\u0435\u043D \u0435 \u0438\u0437\u0433\u043B\u0435\u0434\u044A\u0442 \u0437\u0430 ${target.label}.`);
      setError("");
      return;
    }

    if (!target?.room) {
      setSelectedPoint(null);
      setActiveCluster(null);
      setFeedback("\u0418\u0437\u0431\u0440\u0430\u043D\u0430\u0442\u0430 \u0442\u043E\u0447\u043A\u0430 \u0435 \u0438\u0437\u0432\u044A\u043D \u0432\u0430\u043B\u0438\u0434\u043D\u0430 \u0437\u043E\u043D\u0430 \u0437\u0430 \u043C\u0430\u0440\u043A\u0435\u0440.");
      setError("");
      return;
    }

    setSelectedPoint({ x: worldPoint.x, y: worldPoint.y });
    setActiveCluster(null);
    setFeedback(`\u0418\u0437\u0431\u0440\u0430\u043D\u0430 \u0437\u043E\u043D\u0430: ${target.room.label}`);
    setError("");
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0 || !svgRef.current) return;
    dragStateRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      cameraX: camera.x,
      cameraY: camera.y
    };
    svgRef.current.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragStateRef.current.active || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const visibleWidth = W / zoom;
    const visibleHeight = H / zoom;
    const dx = (event.clientX - dragStateRef.current.startX) * (visibleWidth / rect.width);
    const dy = (event.clientY - dragStateRef.current.startY) * (visibleHeight / rect.height);

    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      dragStateRef.current.moved = true;
      suppressClickRef.current = true;
    }

    setCamera({
      x: clamp(dragStateRef.current.cameraX - dx, 0, W),
      y: clamp(dragStateRef.current.cameraY - dy, 0, H)
    });
  };

  const handlePointerUp = (event) => {
    if (!dragStateRef.current.active || !svgRef.current) return;
    svgRef.current.releasePointerCapture?.(event.pointerId);
    dragStateRef.current.active = false;
  };

  const handleWheel = (event) => {
    event.preventDefault();
    if (!svgRef.current) return;
    const point = toSvgPoint(event, svgRef.current);
    zoomAroundSvgPoint(point, event.deltaY < 0 ? 0.16 : -0.16);
  };

  const handleBuildingNavigate = (building) => {
    if (building === "main") {
      setView("main");
      setFloor(1);
      setZoom(getDefaultZoomForView("main"));
      setCamera({ x: W / 2, y: H / 2 });
      setRoomFilter("all");
      setZoneFilter("all");
      setSelectedPoint(null);
      setActivePinId(null);
      setActiveCluster(null);
      return;
    }
    if (building === "small") {
      setView("small");
      setFloor(1);
      setZoom(getDefaultZoomForView("small"));
      setCamera({ x: W / 2, y: H / 2 });
      setRoomFilter("all");
      setZoneFilter("all");
      setSelectedPoint(null);
      setActivePinId(null);
      setActiveCluster(null);
    }
  };

  const handlePhotoChange = (file) => {
    if (!file) {
      setPhotoFile(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Разрешени са само изображения.");
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      setError("Снимката трябва да е до 5MB.");
      return;
    }
    setError("");
    setPhotoFile(file);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!selectedPoint) {
      setError("Кликни върху картата, за да избереш място.");
      return;
    }
    if (!selectedRoomData) {
      setError("Маркер може да се създаде само във валидна зона или помещение.");
      return;
    }
    if (!title.trim()) {
      setError("Заглавието е задължително.");
      return;
    }

    setLoading(true);
    setError("");
    setFeedback("");

    try {
      const encoded = encodeLayerPoint(layerId, selectedPoint.x, selectedPoint.y);
      const formData = new FormData();
      formData.append("title", title.trim());

      const roomLabel = selectedRoomData?.label || "";
      const zoneLabel = selectedRoomData?.kind ? ZONE_LABELS[selectedRoomData.kind] : "";
      const roomSubLabel = selectedRoomData?.sub ? `Детайл: ${selectedRoomData.sub}` : "";
      const enrichedDescription = [description.trim(), roomLabel ? `Стая/зона: ${roomLabel}` : "", roomSubLabel, zoneLabel ? `Тип: ${zoneLabel}` : ""]
        .filter(Boolean)
        .join(" | ");

      formData.append("description", enrichedDescription);
      formData.append("latitude", String(encoded.latitude));
      formData.append("longitude", String(encoded.longitude));
      if (photoFile) formData.append("photo", photoFile);

      const response = await api.post("/event-pins", formData);
      const createdPin = response.data;
      setPins((prev) => [createdPin, ...prev]);
      setLatestCreatedPin(createdPin);
      setTitle("");
      setDescription("");
      setPhotoFile(null);
      setPhotoPreview("");
      setSelectedPoint(null);
      setFeedback("Маркерът е създаден успешно.");
      toast?.success("Маркерът е публикуван.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Неуспешно създаване на маркер."));
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pinId, value) => {
    try {
      await api.post(`/event-pins/${pinId}/vote`, { value });
      setPins((prev) =>
        prev.map((pin) => {
          if (pin.id !== pinId) return pin;
          const oldVote = pin.myVote || 0;
          const nextVote = oldVote === value ? 0 : value;
          const upDelta = (nextVote === 1 ? 1 : 0) - (oldVote === 1 ? 1 : 0);
          const downDelta = (nextVote === -1 ? 1 : 0) - (oldVote === -1 ? 1 : 0);
          return {
            ...pin,
            myVote: nextVote,
            upvotes: (pin.upvotes || 0) + upDelta,
            downvotes: (pin.downvotes || 0) + downDelta,
            score: (pin.score || 0) + upDelta - downDelta
          };
        })
      );
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Неуспешно гласуване за маркер."));
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Геолокацията не се поддържа от този браузър.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const decoded = decodeLayerPoint(position.coords.latitude, position.coords.longitude);
        if (decoded) {
          const parsed = parseLayerId(decoded.layerId);
          const projection = getLayerProjection(decoded.layerId);
          const screenPoint = projectPoint(decoded.x, decoded.y, projection);
          setView(parsed.view);
          setFloor(parsed.floor);
          setSelectedPoint({ x: decoded.x, y: decoded.y });
          focusOnPoint(screenPoint.x, screenPoint.y, getFocusZoomForView(parsed.view, "pin"));
          setFeedback("Локацията е позиционирана върху учебната карта.");
          return;
        }

        setView("campus");
        setFloor(1);
        setSelectedPoint({ x: W / 2, y: H / 2 });
        focusOnPoint(W / 2, H / 2, 1);
        setFeedback("Локацията е извън учебната карта. Показан е кампус изглед.");
      },
      () => setError("Няма достъп до текущата локация.")
    );
  };

  const renderBase = () => {
    if (view === "campus") {
      return (
        <g>
          <rect x="0" y="0" width={W} height={H} className="indoor-grid-bg" />
          <path
            d={projectPath(CAMPUS_OUTER_PATH_SOURCE, CAMPUS_SOURCE_PROJECTION)}
            className="campus-asphalt"
          />

          {[
            [24, 18, 894, 36],
            [24, 54, 58, 786],
            [82, 700, 70, 140],
            [250, 86, 76, 130],
            [554, 288, 86, 320],
            [700, 620, 218, 178],
            [554, 840, 120, 380],
            [918, 840, 78, 380],
            [554, 1184, 442, 36]
          ].map(([x, y, width, height], index) => (
            <rect
              key={`campus-green-${index}`}
              x={cx(x)}
              y={cy(y)}
              width={cw(width)}
              height={ch(height)}
              rx="6"
              className="campus-green"
            />
          ))}

          <g
            className="campus-nav-group"
            onClick={(event) => {
              event.stopPropagation();
              handleBuildingNavigate("main");
            }}
          >
            <path
              d={projectPath(CAMPUS_MAIN_PATH_SOURCE, CAMPUS_SOURCE_PROJECTION)}
              className="indoor-building-main campus-main-footprint"
            />
            <path
              d={projectPath(CAMPUS_MAIN_PATH_SOURCE, CAMPUS_SOURCE_PROJECTION)}
              className="campus-main-outline"
            />
          </g>

          <g
            className="campus-nav-group"
            onClick={(event) => {
              event.stopPropagation();
              handleBuildingNavigate("small");
            }}
          >
            <rect
              x={cx(724)}
              y={cy(840)}
              width={cw(216)}
              height={ch(186)}
              rx="4"
              className="indoor-building-small"
            />
            <rect
              x={cx(724)}
              y={cy(840)}
              width={cw(216)}
              height={ch(186)}
              rx="4"
              className="campus-main-outline"
            />
          </g>

          <rect x={cx(680)} y={cy(374)} width={cw(240)} height={ch(154)} rx="6" className="campus-court" />
          <circle cx={cx(800)} cy={cy(451)} r={ch(18)} className="campus-court-mark" />
          <line x1={cx(800)} y1={cy(374)} x2={cx(800)} y2={cy(528)} className="campus-court-mark" />
          <path d={`M${cx(680)} ${cy(406)} Q${cx(706)} ${cy(451)} ${cx(680)} ${cy(496)}`} className="campus-court-arc" />
          <path d={`M${cx(920)} ${cy(406)} Q${cx(894)} ${cy(451)} ${cx(920)} ${cy(496)}`} className="campus-court-arc" />

          <rect x={cx(676)} y={cy(840)} width={cw(66)} height={ch(380)} className="campus-road" />
          <rect x={cx(744)} y={cy(1048)} width={cw(208)} height={ch(130)} rx="4" className="campus-court campus-court-small" />
          <line x1={cx(848)} y1={cy(1048)} x2={cx(848)} y2={cy(1178)} className="campus-court-mark soft" />
          <circle cx={cx(848)} cy={cy(1113)} r={ch(14)} className="campus-court-mark soft" />
          <path d={`M${cx(744)} ${cy(1082)} Q${cx(766)} ${cy(1113)} ${cx(744)} ${cy(1144)}`} className="campus-court-arc soft" />
          <path d={`M${cx(952)} ${cy(1082)} Q${cx(930)} ${cy(1113)} ${cx(952)} ${cy(1144)}`} className="campus-court-arc soft" />

          <text x={cx(500)} y={cy(62)} className="indoor-campus-title" textAnchor="middle">
            МГ „Акад. Кирил Попов“
          </text>
          <text x={cx(500)} y={cy(96)} className="indoor-campus-subtitle" textAnchor="middle">
            Голяма сграда · Малка сграда · Двор и спортни зони
          </text>
          <text x={cx(344)} y={cy(312)} className="indoor-campus-label" textAnchor="middle">
            Голяма сграда
          </text>
          <text x={cx(800)} y={cy(456)} className="indoor-campus-label" textAnchor="middle">
            Игрище
          </text>
          <text x={cx(832)} y={cy(936)} className="indoor-campus-label" textAnchor="middle">
            Малка сграда
          </text>
          <text x={cx(848)} y={cy(1113)} className="indoor-campus-label indoor-campus-label-soft" textAnchor="middle">
            Малко игрище
          </text>
          <text x={cx(472)} y={cy(38)} className="indoor-campus-label indoor-campus-label-soft" textAnchor="middle">
            Северна алея
          </text>
        </g>
      );
    }

    if (view === "main") {
      return (
        <g>
          <rect x="0" y="0" width={W} height={H} className="indoor-grid-bg" />
          <rect x="56" y="62" width="888" height="576" rx="28" className="floor-frame-panel" />
          <path d={projectPath(MAIN_HULLS[floor], currentProjection)} className="indoor-floor-hull" />
          <text x="76" y="96" className="indoor-floor-title">
            Голяма сграда · Етаж {floor}
          </text>
          <text x="76" y="118" className="indoor-floor-subtitle">
            Запазена структура по оригиналната скица
          </text>
        </g>
      );
    }

    const smallShell = projectRect({ x: 260, y: 120, w: 330, h: 460 }, currentProjection);
    const smallCorridor = projectRect({ x: 370, y: 120, w: 110, h: 460 }, currentProjection);

    return (
      <g>
        <rect x="0" y="0" width={W} height={H} className="indoor-grid-bg" />
        <rect x="72" y="68" width="856" height="564" rx="28" className="floor-frame-panel" />
        <rect x={smallShell.x} y={smallShell.y} width={smallShell.w} height={smallShell.h} rx="12" className="indoor-floor-shell" />
        <rect x={smallCorridor.x} y={smallCorridor.y} width={smallCorridor.w} height={smallCorridor.h} rx="8" className="indoor-corridor" />
        <text x="90" y="102" className="indoor-floor-title">
          Малка сграда · Етаж {floor}
        </text>
        <text x="90" y="124" className="indoor-floor-subtitle">
          STEM / УПК корпус
        </text>
      </g>
    );
  };

  return (
    <div className="page-shell map-page">
      <section className="map-layout map-layout-indoor">
        <aside className="map-panel card card-pad">
          <div className="split-row">
            <h2 className="section-title">Интерактивна карта</h2>
            <button className="btn btn-ghost btn-sm" type="button" onClick={handleUseMyLocation}>
              Моята локация
            </button>
          </div>
          <p className="section-subtitle">
            SVG карта от `TestMap` с етажи, стаи, търсене по зона и backend пинове.
          </p>

          {error && <p className="error-msg">{error}</p>}
          {feedback && <p className="success-msg">{feedback}</p>}

          <div className="map-level-controls card card-pad">
            <div className="map-tab-row">
              {VIEWS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`btn btn-sm ${view === option.id ? "btn-secondary" : "btn-ghost"}`}
                  onClick={() => {
                    setView(option.id);
                    setFloor(1);
                    setZoom(getDefaultZoomForView(option.id));
                    setCamera({ x: W / 2, y: H / 2 });
                    setRoomFilter("all");
                    setZoneFilter("all");
                    setSelectedPoint(null);
                    setActivePinId(null);
                    setActiveCluster(null);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {view !== "campus" && (
              <div className="map-tab-row">
                {Array.from({ length: VIEWS.find((item) => item.id === view)?.floors || 1 }).map((_, index) => {
                  const floorValue = index + 1;
                  return (
                    <button
                      key={floorValue}
                      type="button"
                      className={`btn btn-sm ${floor === floorValue ? "btn-secondary" : "btn-ghost"}`}
                      onClick={() => {
                        setFloor(floorValue);
                        setZoom(getDefaultZoomForView(view));
                        setCamera({ x: W / 2, y: H / 2 });
                        setRoomFilter("all");
                        setZoneFilter("all");
                        setSelectedPoint(null);
                        setActivePinId(null);
                        setActiveCluster(null);
                      }}
                    >
                      Етаж {floorValue}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <form onSubmit={handleCreate} className="form-grid">
            <input
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Заглавие"
            />
            <textarea
              className="textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Описание"
            />
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(event) => handlePhotoChange(event.target.files?.[0] || null)}
            />
            {photoPreview && <img src={photoPreview} alt="Преглед" className="photo-preview" />}
            <p className="muted">
              {selectedRoomData
                ? `Маркерът ще бъде записан в: ${selectedRoomData.label}${selectedRoomData.sub ? ` · ${selectedRoomData.sub}` : ""}`
                : "Избери валидна зона от картата. Маркер извън зона не може да се публикува."}
            </p>
            <button className="btn btn-primary" type="submit" disabled={loading || !selectedRoomData}>
              {loading ? "Публикуване..." : "Създай маркер"}
            </button>
          </form>

          {latestCreatedPin && (
            <div className="map-created-flow">
              <h3>Последно добавен маркер</h3>
              <p className="muted">{latestCreatedPin.title}</p>
              <div className="map-created-flow__actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const decoded = decodeLayerPoint(latestCreatedPin.latitude, latestCreatedPin.longitude);
                    if (!decoded) return;
                    const parsed = parseLayerId(decoded.layerId);
                    const projection = getLayerProjection(decoded.layerId);
                    const screenPoint = projectPoint(decoded.x, decoded.y, projection);
                    setView(parsed.view);
                    setFloor(parsed.floor);
                    setActivePinId(latestCreatedPin.id);
                    focusOnPoint(screenPoint.x, screenPoint.y, getFocusZoomForView(parsed.view, "pin"));
                  }}
                >
                  Покажи на картата
                </button>
                <Link
                  className="btn btn-primary btn-sm"
                  to={`/create-thread?title=${encodeURIComponent(`[Сигнал] ${latestCreatedPin.title || ""}`)}`}
                >
                  Създай тема от сигнала
                </Link>
              </div>
            </div>
          )}

          <div className="map-filters">
            <div className="split-row">
              <h3>Търсене и филтри</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
                Изчисти
              </button>
            </div>
            <input
              className="input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Търси по заглавие, автор, стая"
            />
            <select value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)}>
              <option value="all">Всички стаи/зони</option>
              {rooms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <select value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)}>
              <option value="all">Всички типове</option>
              {kinds.map((kind) => (
                <option key={kind} value={kind}>
                  {ZONE_LABELS[kind] || kind}
                </option>
              ))}
            </select>
            <label className="map-score-label" htmlFor="min-score">
              Минимална оценка: <strong>{minScore}</strong>
            </label>
            <input
              id="min-score"
              type="range"
              min={-20}
              max={50}
              value={minScore}
              onChange={(event) => setMinScore(Number(event.target.value))}
            />
            <label className="map-check">
              <input
                type="checkbox"
                checked={onlyWithPhoto}
                onChange={(event) => setOnlyWithPhoto(event.target.checked)}
              />
              Показвай само маркери със снимка
            </label>
          </div>

          <div className="map-room-directory">
            <div className="split-row">
              <h3>Навигация по стаи и зони</h3>
              <span className="pill">{roomSearchResults.length} резултата</span>
            </div>
            <input
              className="input"
              value={roomSearch}
              onChange={(event) => setRoomSearch(event.target.value)}
              placeholder="Търси стая, етаж, зона или сграда"
            />
            <div className="map-room-directory__list">
              {roomSearchResults.length === 0 ? (
                <p className="muted">Няма намерени стаи или зони.</p>
              ) : (
                roomSearchResults.map((item) => (
                  <button
                    key={`${item.layerId}-${item.id}`}
                    type="button"
                    className={`map-room-entry ${roomFilter === item.id && layerId === item.layerId ? "is-active" : ""}`}
                    onClick={() => focusRoom(item)}
                  >
                    <div>
                      <strong>{item.label}</strong>
                      <span className="muted">
                        {layerLabel(item.view, item.floor)} · {ZONE_LABELS[item.kind] || item.kind}
                        {item.sub ? ` · ${item.sub}` : ""}
                      </span>
                    </div>
                    <span className="pill">{item.pinCount}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="map-pin-explorer">
            <div className="split-row">
              <h3>Пинове в текущия изглед</h3>
              <span className="pill">{pinExplorerPins.length}</span>
            </div>
            <div className="map-pin-explorer__list">
              {pinExplorerPins.length === 0 ? (
                <p className="muted">Няма пинове за текущите филтри.</p>
              ) : (
                pinExplorerPins.map((pin) => (
                  <button
                    key={pin.id}
                    type="button"
                    className={`map-pin-explorer__item ${activePinId === pin.id ? "is-active" : ""}`}
                    onClick={() => {
                      setActivePinId(pin.id);
                      setActiveCluster(null);
                      focusOnPoint(pin.x, pin.y, getFocusZoomForView(view, "pin"));
                    }}
                  >
                    <div>
                      <strong>{pin.title}</strong>
                      <span className="muted">
                        {pin.roomLabel || "Без зона"}
                        {pin.roomSubLabel ? ` · ${pin.roomSubLabel}` : ""}
                        {` · ${pin.createdByUsername || "Неизвестен"}`}
                      </span>
                    </div>
                    <div className="map-pin-explorer__meta">
                      {pin.photoUrl ? <span className="pill">Снимка</span> : null}
                      <span className="pill">#{pin.score}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {activeCluster && (
            <div className="map-cluster-card">
              <div className="split-row">
                <h3>{activeCluster.roomLabel || "Струпване"} · {activeCluster.count} пина</h3>
                {activeCluster.roomId && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setRoomFilter(activeCluster.roomId);
                      setZoneFilter("all");
                    }}
                  >
                    Само тази зона
                  </button>
                )}
              </div>
              <div className="map-cluster-list">
                {activeCluster.pins.slice(0, 24).map((pin) => (
                  <button
                    key={pin.id}
                    type="button"
                    className="map-cluster-item"
                    onClick={() => {
                      setActivePinId(pin.id);
                      setActiveCluster(null);
                      focusOnPoint(pin.x, pin.y, clamp(zoom + 0.2, getDefaultZoomForView(view), MAX_ZOOM));
                    }}
                  >
                    <strong>{pin.title}</strong>
                    <span>{pin.roomLabel || "Без стая"}</span>
                  </button>
                ))}
              </div>
              {activeCluster.count > 24 && (
                <p className="muted">Показани са първите 24 пина. За пълния преглед използвай филтъра за зоната или списъка с пинове.</p>
              )}
            </div>
          )}

          {activePin && (
            <article className="map-active-pin card card-pad">
              <div className="split-row">
                <h3>{activePin.title}</h3>
                <span className="pill">{activePin.roomLabel || "Без стая"}</span>
              </div>
              {activePin.roomSubLabel && <p className="muted">{activePin.roomSubLabel}</p>}
              {activePin.description && <p>{activePin.description}</p>}
              {activePin.photoUrl && <img src={resolveMediaUrl(activePin.photoUrl)} alt="Снимка към маркер" />}
              <p className="muted">
                {activePin.createdByUsername || "Неизвестен"} · {formatDateTime(activePin.createdAt)}
              </p>
              <div className="pin-votes">
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => handleVote(activePin.id, 1)}>
                  <span aria-hidden="true">{"\uD83D\uDC4D"}</span> {activePin.upvotes}
                </button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => handleVote(activePin.id, -1)}>
                  <span aria-hidden="true">{"\uD83D\uDC4E"}</span> {activePin.downvotes}
                </button>
                <span className="pill">Оценка {activePin.score}</span>
              </div>
              <p className="muted">Слой: {layerLabel(parseLayerId(activePin.layerId).view, parseLayerId(activePin.layerId).floor)}</p>
              <Link
                className="btn btn-danger btn-sm"
                to={`/report?type=Pin&id=${activePin.id}&label=${encodeURIComponent(activePin.title || "Маркер")}&returnTo=${encodeURIComponent(`${location.pathname}${location.search || ""}`)}`}
              >
                Докладвай маркер
              </Link>
            </article>
          )}
        </aside>

        <div className="map-canvas card map-canvas-indoor">
          <div className="map-canvas-header">
            <div>
              <h3>{layerLabel(view, floor)}</h3>
              <p className="muted">
                {view === "campus"
                  ? "Клик върху сградите отваря етажите. На campus изглед пинове се добавят само извън сградите."
                  : "Изгледът пази оригиналната схема на етажа. Празните вътрешни зони се третират като коридор."}
              </p>
            </div>
            <div className="map-zoom-controls">
              <button type="button" className="btn btn-ghost btn-sm" onClick={resetView}>
                Нулирай
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setZoom((prev) => clamp(prev - 0.2, MIN_ZOOM, MAX_ZOOM))}
              >
                -
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setZoom((prev) => clamp(prev + 0.2, MIN_ZOOM, MAX_ZOOM))}
              >
                +
              </button>
            </div>
          </div>

          {view === "campus" && (
            <div className="map-canvas-legend">
              <span><i className="legend-swatch legend-swatch-asphalt" /> Асфалт</span>
              <span><i className="legend-swatch legend-swatch-green" /> Зелени зони</span>
              <span><i className="legend-swatch legend-swatch-court" /> Игрище</span>
              <span><i className="legend-swatch legend-swatch-building" /> Сгради</span>
            </div>
          )}

          <svg
            ref={svgRef}
            className="map-svg"
            viewBox={viewBox}
            onClick={handleMapClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            aria-label="Интерактивна карта"
          >
            {renderBase()}

            <g className="map-rooms-layer">
              {displayRooms.map((item) => (
                <g key={item.id}>
                  <rect
                    x={item.x}
                    y={item.y}
                    width={item.w}
                    height={item.h}
                    rx="4"
                    pointerEvents={view === "campus" ? "none" : undefined}
                    className={
                      view === "campus"
                        ? `campus-zone-hitbox${roomFilter === item.id ? " room-selected" : ""}`
                        : `room-shape room-${item.kind}${roomFilter === item.id ? " room-selected" : ""}`
                    }
                  />
                  {(view !== "campus" || ["court", "small-court"].includes(item.id)) && (
                    <text
                      x={item.x + item.w / 2}
                      y={item.y + item.h / 2}
                      className={`room-label${view === "campus" ? " room-label-campus" : ""}`}
                      textAnchor="middle"
                    >
                      <tspan x={item.x + item.w / 2} dy={item.sub ? "-0.2em" : "0"}>
                        {item.label}
                      </tspan>
                      {item.sub && view !== "campus" && (
                        <tspan x={item.x + item.w / 2} dy="1.1em" className="room-label room-label-sub">
                          {item.sub}
                        </tspan>
                      )}
                    </text>
                  )}
                </g>
              ))}
            </g>

            <g className="map-pins-layer">
              {visuals.map((item) => {
                if (item.type === "cluster" || item.type === "room-cluster") {
                  const radius = item.type === "room-cluster"
                    ? clamp(20 + Math.log2(item.count || 1) * 3.2, 22, 34)
                    : 16;
                  return (
                    <g
                      key={item.id}
                      className={`pin-cluster${item.type === "room-cluster" ? " pin-cluster-room" : ""}${item.containsActive ? " is-active" : ""}`}
                      transform={`translate(${item.x} ${item.y})`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveCluster({
                          id: item.id,
                          roomId: item.roomId || null,
                          roomLabel: item.roomLabel || "Струпване",
                          count: item.count,
                          pins: [...item.pins].sort((a, b) => {
                            if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
                            return new Date(b.createdAt) - new Date(a.createdAt);
                          })
                        });
                        setActivePinId(null);
                        focusOnPoint(
                          item.x,
                          item.y,
                          item.type === "room-cluster"
                            ? Math.max(zoom, getFocusZoomForView(view, "room"))
                            : clamp(zoom + 0.2, getDefaultZoomForView(view), MAX_ZOOM)
                        );
                      }}
                    >
                      <circle className="pin-cluster-hit" r={radius + 7} />
                      <circle r={radius} />
                      <text textAnchor="middle" dy="4">
                        {item.count}
                      </text>
                    </g>
                  );
                }

                return (
                  <g
                    key={item.pin.id}
                    className={`map-pin ${tone(item.pin.score)}${activePinId === item.pin.id ? " is-active" : ""}`}
                    transform={`translate(${item.x} ${item.y})`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActivePinId(item.pin.id);
                      setActiveCluster(null);
                      focusOnPoint(item.x, item.y);
                    }}
                    >
                    <circle className="pin-hit" r={item.stackSize > 1 ? 18 : 16} />
                    <circle className="pin-ring" r={item.stackSize > 1 ? 11 : 9} />
                    <circle className="pin-core" r="6" />
                    {item.stackSize > 1 && (
                      <text className="pin-stack" textAnchor="middle" dy="4">
                        {item.stackSize}
                      </text>
                    )}
                  </g>
                );
              })}

              {selectedScreenPoint && (
                <g className="map-pin-selection" transform={`translate(${selectedScreenPoint.x} ${selectedScreenPoint.y})`}>
                  <circle r="10" />
                  <circle r="3" />
                </g>
              )}
            </g>
          </svg>
        </div>
      </section>
    </div>
  );
}
