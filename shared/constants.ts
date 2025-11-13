// Маппинг ID студий YClients на их названия
export const STUDIO_MAP: Record<number, string> = {
  583940: "Волгоград",
  773014: "Краснодар",
  853611: "Казань",
  872713: "Иркутск",
  931484: "Самара",
  951422: "Красноярск",
  990785: "Новосибирск",
  992493: "СПБ (Пионерская)",
  993170: "СПБ (Садовая)",
  993180: "УФА",
  1073247: "Тюмень",
  1073250: "Екатеринбург",
  1084591: "Челябинск",
  1130009: "Ростов",
  1147984: "Омск",
};

// Список студий для использования в селекторах
export const STUDIOS = Object.entries(STUDIO_MAP).map(([id, name]) => ({
  id: Number(id),
  name,
}));

// Получить название студии по ID
export function getStudioName(companyId: number | null): string | null {
  if (!companyId) return null;
  return STUDIO_MAP[companyId] || null;
}
