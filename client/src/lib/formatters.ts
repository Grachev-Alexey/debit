// Утилиты для форматирования данных

export function formatCurrency(amount: number): string {
  // Форматируем число с пробелами для разрядов и добавляем символ рубля
  return `${amount.toLocaleString('ru-RU')} ₽`;
}

export function formatDate(date: Date | string | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
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
    paid: 'Оплачен'
  };
  return labels[status] || status;
}

export function getStatusVariant(status: string): 'default' | 'destructive' | 'success' | 'info' {
  const variants: Record<string, 'default' | 'destructive' | 'success' | 'info'> = {
    active: 'info',
    overdue: 'destructive',
    paid: 'success'
  };
  return variants[status] || 'default';
}
