const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const assetsDir = 'C:/Users/Vasko_TUF/Desktop/Word/DocAssets';
fs.mkdirSync(assetsDir, { recursive: true });

const API = 'https://localhost:7277/api';

const users = {
  1: { id: 1, username: 'admin', role: 'Admin', email: 'admin@mg-events.com', threadsCount: 2, postsCount: 5, pinsCount: 3, gradeLevel: null },
  2: { id: 2, username: 'maria.ivanova', role: 'Teacher', email: 'maria.ivanova@mg-events.com', threadsCount: 3, postsCount: 8, pinsCount: 1, gradeLevel: null },
  7: { id: 7, username: 'boris.petkov', role: 'Student', email: 'boris.petkov@mg-events.com', threadsCount: 2, postsCount: 6, pinsCount: 4, gradeLevel: 12 },
  12: { id: 12, username: 'elena.stefanova', role: 'Student', email: 'elena.stefanova@mg-events.com', threadsCount: 1, postsCount: 3, pinsCount: 2, gradeLevel: 11 },
  14: { id: 14, username: 'nikolay.georgiev', role: 'Student', email: 'nikolay.georgiev@mg-events.com', threadsCount: 1, postsCount: 2, pinsCount: 1, gradeLevel: 10 }
};

const threads = [
  {
    id: 1,
    title: 'Неравна настилка пред главния вход',
    createdAt: '2026-03-18T07:10:00Z',
    lastPostAt: '2026-03-19T08:22:00Z',
    createdByUserId: 7,
    createdByUsername: 'boris.petkov',
    createdByRole: 'Student',
    isLocked: false,
    isPinned: true
  },
  {
    id: 2,
    title: '[News] Обновяване на коридорното осветление',
    createdAt: '2026-03-16T09:30:00Z',
    lastPostAt: '2026-03-16T09:30:00Z',
    createdByUserId: 2,
    createdByUsername: 'maria.ivanova',
    createdByRole: 'Teacher',
    isLocked: true,
    isPinned: true
  },
  {
    id: 3,
    title: 'Струпване пред столовата в голямото междучасие',
    createdAt: '2026-03-14T10:00:00Z',
    lastPostAt: '2026-03-18T11:45:00Z',
    createdByUserId: 12,
    createdByUsername: 'elena.stefanova',
    createdByRole: 'Student',
    isLocked: false,
    isPinned: false
  },
  {
    id: 4,
    title: 'Проблем с отоплението в кабинет 214',
    createdAt: '2026-03-11T06:50:00Z',
    lastPostAt: '2026-03-11T13:15:00Z',
    createdByUserId: 14,
    createdByUsername: 'nikolay.georgiev',
    createdByRole: 'Student',
    isLocked: false,
    isPinned: false
  }
];

const postsByThread = {
  1: [
    {
      id: 101,
      title: 'Снимка от сутринта',
      content: 'Плочките пред входа са разместени и при дъжд стават много хлъзгави. Проблемът е най-сериозен в началото на първия учебен час.',
      createdAt: '2026-03-18T07:12:00Z',
      updatedAt: null,
      userId: 7,
      threadId: 1,
      parentPostId: null,
      upvotes: 12,
      downvotes: 1,
      score: 11,
      myVote: 1,
      photoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480"><rect width="100%" height="100%" fill="%23f8d7da"/><rect x="90" y="130" width="620" height="180" rx="22" fill="%23ffffff" stroke="%23c1121f" stroke-width="10"/><text x="400" y="230" text-anchor="middle" font-size="38" font-family="Arial" fill="%238b1020">Снимка на проблемната настилка</text></svg>'
    },
    {
      id: 102,
      title: 'Подкрепям сигнала',
      content: 'И аз минавам оттам всяка сутрин и съм съгласна, че мястото трябва да се обезопаси възможно най-скоро.',
      createdAt: '2026-03-18T09:41:00Z',
      updatedAt: null,
      userId: 12,
      threadId: 1,
      parentPostId: 101,
      upvotes: 8,
      downvotes: 0,
      score: 8,
      myVote: 0,
      photoUrl: null
    },
    {
      id: 103,
      title: 'Предадено към ръководството',
      content: 'Проблемът е предаден към училищното ръководство и ще бъде включен в месечната статистика за рискови места.',
      createdAt: '2026-03-19T08:22:00Z',
      updatedAt: null,
      userId: 2,
      threadId: 1,
      parentPostId: null,
      upvotes: 10,
      downvotes: 0,
      score: 10,
      myVote: 0,
      photoUrl: null
    }
  ]
};

function encodePoint(layerId, x, y) {
  const LAYERS = ['campus', 'main:1', 'main:2', 'main:3', 'main:4', 'small:1', 'small:2', 'small:3'];
  const CODEC = { baseLat: 42.1402, baseLng: 24.7444, layerGapLat: 0.0022, layerGapLng: 0.0022, spanLat: 0.0014, spanLng: 0.0022 };
  const index = Math.max(0, LAYERS.indexOf(layerId));
  const baseLat = CODEC.baseLat + index * CODEC.layerGapLat;
  const baseLng = CODEC.baseLng + index * CODEC.layerGapLng;
  return {
    latitude: baseLat + (0.5 - y / 700) * CODEC.spanLat,
    longitude: baseLng + (x / 1000 - 0.5) * CODEC.spanLng
  };
}

function pin(id, layerId, x, y, title, category, score, authorId, createdAt, description) {
  const point = encodePoint(layerId, x, y);
  const upvotes = Math.max(score + 2, 0);
  const downvotes = Math.max(2 - score, 0);
  return {
    id,
    title,
    description,
    category,
    latitude: point.latitude,
    longitude: point.longitude,
    photoUrl: null,
    createdAt,
    createdByUserId: authorId,
    createdByUsername: users[authorId].username,
    upvotes,
    downvotes,
    score,
    myVote: 0
  };
}

const pins = [
  pin(301, 'campus', 705, 420, 'Разместени плочки при главния вход', 'Безопасност', 14, 7, '2026-03-18T07:10:00Z', 'Зоната става рискова при дъжд и натоварен трафик.'),
  pin(302, 'campus', 725, 438, 'Нужна маркировка към двора', 'Организация', 9, 12, '2026-03-17T09:00:00Z', 'Учениците преминават хаотично в пиковите междучасия.'),
  pin(303, 'main:1', 265, 280, 'Струпване в лобито', 'Организация', 6, 14, '2026-03-15T10:05:00Z', 'Лобито се претоварва в началото на учебния ден.'),
  pin(304, 'main:1', 340, 640, 'Шум в столовата', 'Организация', 11, 12, '2026-03-14T11:20:00Z', 'При голямото междучасие има прекомерен шум и струпване.'),
  pin(305, 'main:2', 205, 360, 'Отоплението в 201 е слабо', 'Поддръжка', 8, 7, '2026-03-11T08:35:00Z', 'Температурата е ниска през първите часове.'),
  pin(306, 'main:3', 205, 350, 'Осветлението пред библиотеката премигва', 'Оборудване', 7, 2, '2026-03-12T07:40:00Z', 'Нужно е техническо обслужване.'),
  pin(307, 'small:1', 500, 250, 'Лабораторията по биология има нужда от нови табла', 'Оборудване', 5, 2, '2026-03-10T12:00:00Z', 'Част от оборудването е морално остаряло.'),
  pin(308, 'small:3', 520, 290, 'Недостатъчна вентилация в кабинет 314', 'Хигиена', 10, 14, '2026-03-09T13:15:00Z', 'В помещението се събира топъл въздух и е нужна проветривост.')
];

const reports = [
  {
    id: 501,
    targetType: 'Post',
    targetId: 101,
    targetLabel: 'Снимка от сутринта',
    contextLabel: 'Тема: Неравна настилка пред главния вход',
    reason: 'Съдържанието изисква бърза реакция от администратора поради риск от инцидент.',
    details: 'Сигналът е подаден от ученик и съдържа визуално доказателство.',
    reporterUsername: 'elena.stefanova',
    createdAt: '2026-03-19T09:10:00Z',
    status: 'Open',
    previewPath: '/threads/1?postId=101',
    targetExists: true
  },
  {
    id: 502,
    targetType: 'Pin',
    targetId: 301,
    targetLabel: 'Разместени плочки при главния вход',
    contextLabel: 'Кампус · Дворна зона',
    reason: 'Сигналът е много популярен и трябва да се включи в месечния отчет.',
    details: 'Има висок рейтинг и няколко потвърждения от други потребители.',
    reporterUsername: 'maria.ivanova',
    createdAt: '2026-03-20T08:00:00Z',
    status: 'Reviewed',
    previewPath: '/map?pinId=301',
    targetExists: true
  }
];

const teacherRequests = [
  { id: 601, username: 'georgi.atanasov', email: 'georgi.atanasov@mg-events.com', motivation: 'Желая да публикувам официални съобщения и да подпомагам модерацията.', createdAt: '2026-03-12T10:30:00Z', status: 'Pending' }
];

const pinReport = {
  schoolName: 'МГ "Академик Кирил Попов" - Пловдив',
  monthKey: '2026-03',
  monthLabel: 'Март 2026',
  totalPins: 8,
  pinsWithPhotos: 1,
  activeZones: 6,
  hotspots: [
    { layerLabel: 'Кампус', zoneLabel: 'Дворна зона', dominantCategory: 'Безопасност', pinsCount: 2, totalScore: 23 },
    { layerLabel: 'Голяма сграда - етаж 1', zoneLabel: 'Столова', dominantCategory: 'Организация', pinsCount: 1, totalScore: 11 },
    { layerLabel: 'Малка сграда - етаж 3', zoneLabel: '314', dominantCategory: 'Хигиена', pinsCount: 1, totalScore: 10 }
  ],
  categories: [
    { category: 'Безопасност', pinsCount: 2, totalScore: 23 },
    { category: 'Организация', pinsCount: 3, totalScore: 26 },
    { category: 'Оборудване', pinsCount: 2, totalScore: 12 },
    { category: 'Хигиена', pinsCount: 1, totalScore: 10 }
  ],
  topPins: pins.slice(0, 5).map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    layerLabel: item.id === 301 || item.id === 302 ? 'Кампус' : item.id === 307 || item.id === 308 ? 'Малка сграда' : 'Голяма сграда',
    zoneLabel: item.title.includes('вход') ? 'Дворна зона' : item.title.includes('столовата') ? 'Столова' : item.title.includes('библиотеката') ? 'Библиотека' : 'Кабинет',
    createdByUsername: item.createdByUsername,
    score: item.score,
    createdAt: item.createdAt
  }))
};

const adminUsers = Object.values(users).map((user) => ({
  ...user,
  isBanned: user.id === 14,
  bannedUntil: user.id === 14 ? '2026-04-05T00:00:00Z' : null,
  scheduledDeletionAt: user.gradeLevel === 12 ? '2026-07-01T00:00:00Z' : null
}));

function apiSuccess(data, message = null) {
  return { success: true, message, data };
}

function makeToken(payload) {
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
}

const fakeToken = makeToken({ sub: '1', role: 'Admin', unique_name: 'admin' });

async function mockApi(page) {
  await page.route(`${API}/**`, async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    const json = (data) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(apiSuccess(data)) });

    if (url.endsWith('/auth/me')) return json({ id: 1, username: 'admin', role: 'Admin' });
    if (url.includes('/forum-threads?page=')) return json(threads);
    if (url.endsWith('/forum-threads/1')) return json(threads[0]);
    if (url.includes('/ForumPosts/thread/1')) return json({ items: postsByThread[1], page: 1, pageSize: 20, totalCount: postsByThread[1].length });
    if (url.includes('/event-pins/reports/monthly')) return json(pinReport);
    if (url.endsWith('/event-pins')) return json(pins);
    if (url.includes('/user/public/')) {
      const id = Number(url.split('/user/public/')[1].split('?')[0]);
      return json({ id, username: users[id]?.username || 'Потребител', role: users[id]?.role || 'Student', photoUrl: null });
    }
    if (url.endsWith('/user/profile')) return json({ ...users[1], photoUrl: null });
    if (url.includes('/user?page=')) return json({ items: adminUsers, page: 1, pageSize: 250, totalCount: adminUsers.length });
    if (url.endsWith('/reports')) return json(reports);
    if (url.endsWith('/user/teacher-requests')) return json(teacherRequests);

    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      return json({ ok: true }, 'OK');
    }

    return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Not mocked' }) });
  });
}

async function makeAuthenticatedPage(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 980 }, ignoreHTTPSErrors: true });
  await context.addInitScript((token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('mg:onboardingSeen', '1');
    localStorage.setItem('mg:lastVisited', JSON.stringify([
      { to: '/map', label: 'Карта', at: new Date().toISOString() },
      { to: '/threads', label: 'Теми', at: new Date().toISOString() }
    ]));
  }, fakeToken);
  const page = await context.newPage();
  await mockApi(page);
  return { context, page };
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  const publicPage = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  await publicPage.goto('http://127.0.0.1:4173/login', { waitUntil: 'networkidle' });
  await publicPage.screenshot({ path: path.join(assetsDir, '01-login-page.png'), fullPage: true });
  await publicPage.goto('http://127.0.0.1:4173/register', { waitUntil: 'networkidle' });
  await publicPage.screenshot({ path: path.join(assetsDir, '02-register-page.png'), fullPage: true });
  await publicPage.close();

  const { context, page } = await makeAuthenticatedPage(browser);

  await page.goto('http://127.0.0.1:4173/dashboard', { waitUntil: 'networkidle' });
  await page.locator('.page-shell').screenshot({ path: path.join(assetsDir, '03-dashboard.png') });

  await page.goto('http://127.0.0.1:4173/create-thread', { waitUntil: 'networkidle' });
  await page.locator('.page-shell').screenshot({ path: path.join(assetsDir, '04-create-thread.png') });

  await page.goto('http://127.0.0.1:4173/threads', { waitUntil: 'networkidle' });
  await page.locator('.threads-page').screenshot({ path: path.join(assetsDir, '05-threads-feed.png') });

  await page.goto('http://127.0.0.1:4173/threads/1', { waitUntil: 'networkidle' });
  await page.locator('.thread-details-page').screenshot({ path: path.join(assetsDir, '06-thread-details.png') });

  await page.goto('http://127.0.0.1:4173/map', { waitUntil: 'networkidle' });
  await page.locator('.map-layout-indoor').screenshot({ path: path.join(assetsDir, '07-map-page.png') });

  await page.goto('http://127.0.0.1:4173/admin/users', { waitUntil: 'networkidle' });
  await page.locator('.admin-page').screenshot({ path: path.join(assetsDir, '08-admin-users.png') });
  await page.getByRole('button', { name: /статистик/i }).first().click();
  await page.waitForTimeout(500);
  await page.locator('.admin-page').screenshot({ path: path.join(assetsDir, '09-admin-stats.png') });

  await context.close();
  await browser.close();
})();
