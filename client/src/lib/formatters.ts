// Утилиты для форматирования данных

export function formatCurrency(amount: number): string {
  // Форматируем число с пробелами для разрядов и добавляем символ рубля
  return `${amount.toLocaleString('ru-RU')} ₽`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date || date === '') return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  // Проверяем на Invalid Date
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatDateForInput(date: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Активен',
    overdue: 'Просрочен',
    underpaid: 'Недоплата',
    paid_off: 'Погашен',
    completed: 'Полностью оплачен'
  };
  return labels[status] || status;
}

export function getStatusVariant(status: string): 'default' | 'destructive' | 'success' | 'info' | 'warning' {
  const variants: Record<string, 'default' | 'destructive' | 'success' | 'info' | 'warning'> = {
    active: 'info',
    overdue: 'destructive',
    underpaid: 'warning',
    paid_off: 'success',
    completed: 'success'
  };
  return variants[status] || 'default';
}
