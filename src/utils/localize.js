const roleMap = {
  Admin: "Администратор",
  Teacher: "Учител",
  Student: "Ученик",
  Member: "Потребител",
  User: "Потребител"
};

const reportStatusMap = {
  Pending: "Чака обработка",
  Reviewed: "Прегледан",
  Actioned: "Предприето действие",
  Dismissed: "Отхвърлен",
  Approved: "Одобрен",
  Rejected: "Отказан",
  Active: "Активен",
  Banned: "Блокиран"
};

const targetTypeMap = {
  Post: "Публикация",
  Thread: "Тема",
  Pin: "Маркер",
  User: "Потребител"
};

export function toBgRole(role) {
  return roleMap[role] || role || "Потребител";
}

export function toBgReportStatus(status) {
  return reportStatusMap[status] || status || "Чака обработка";
}

export function toBgTargetType(type) {
  return targetTypeMap[type] || type || "Съдържание";
}
