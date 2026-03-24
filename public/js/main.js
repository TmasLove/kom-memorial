// Auto-set today's date on date inputs with no value
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];

  document.querySelectorAll('input[type="date"]').forEach(el => {
    if (!el.value && !el.hasAttribute('min')) {
      // Don't override if already has a value or a min restriction
    }
    if (!el.value && el.id === 'lost_date') {
      el.value = today;
    }
  });
});
