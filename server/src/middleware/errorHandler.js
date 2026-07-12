export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Маршрут не найден' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error('Необработанная ошибка:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
}
