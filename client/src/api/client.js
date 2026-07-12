const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data.error || 'Что-то пошло не так';
    const error = new Error(message);
    error.fieldErrors = data.errors;
    throw error;
  }

  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  getProfile: (token) => request('/profile', { token }),
  getPaytable: () => request('/slot/paytable'),
  spin: (betAmount, token) => request('/slot/spin', { method: 'POST', body: { betAmount }, token }),
  getHistory: (token) => request('/history', { token }),
  getHistoryStats: (token) => request('/history/stats', { token }),
  getLeaderboard: () => request('/leaderboard'),
  getBookPaytable: () => request('/book-slot/paytable'),
  bookSpin: (payload, token) => request('/book-slot/spin', { method: 'POST', body: payload, token }),
  createDealer: (payload, token) => request('/admin/dealers', { method: 'POST', body: payload, token }),
  getDealers: (token) => request('/admin/dealers', { token }),
  deleteDealer: (id, token) => request(`/admin/dealers/${id}`, { method: 'DELETE', token }),
  toggleBlockDealer: (id, token) => request(`/admin/dealers/${id}/toggle-block`, { method: 'POST', token }),
  getAllPlayers: (token) => request('/admin/players', { token }),
  adjustPlayerBalance: (id, payload, token) =>
    request(`/admin/players/${id}/adjust-balance`, { method: 'POST', body: payload, token }),
  createOperator: (payload, token) => request('/dealer/operators', { method: 'POST', body: payload, token }),
  getOperators: (token) => request('/dealer/operators', { token }),
  deleteOperator: (id, token) => request(`/dealer/operators/${id}`, { method: 'DELETE', token }),
  getDealerPlayers: (token) => request('/dealer/players', { token }),
  getDealerPool: (token) => request('/dealer/pool', { token }),
  claimPlayerAsDealer: (id, token) => request(`/dealer/players/${id}/claim`, { method: 'POST', token }),
  adjustDealerPlayerBalance: (id, payload, token) =>
    request(`/dealer/players/${id}/adjust-balance`, { method: 'POST', body: payload, token }),
  getDealerNotifications: (token) => request('/dealer/notifications', { token }),
  markNotificationRead: (id, token) => request(`/dealer/notifications/${id}/read`, { method: 'POST', token }),
  getOperatorPlayers: (token) => request('/operator/players', { token }),
  getOperatorPool: (token) => request('/operator/pool', { token }),
  claimPlayerAsOperator: (id, token) => request(`/operator/players/${id}/claim`, { method: 'POST', token }),
  adjustOperatorPlayerBalance: (id, payload, token) =>
    request(`/operator/players/${id}/adjust-balance`, { method: 'POST', body: payload, token }),
  flagPlayerRisk: (id, token) => request(`/operator/players/${id}/flag-risk`, { method: 'POST', token }),
  adjustDealerBalance: (id, payload, token) =>
    request(`/admin/dealers/${id}/adjust-balance`, { method: 'POST', body: payload, token }),
  adjustOperatorBalance: (id, payload, token) =>
    request(`/dealer/operators/${id}/adjust-balance`, { method: 'POST', body: payload, token }),
  getDealerStats: (params, token) => {
    const query = new URLSearchParams(params).toString();
    return request(`/dealer/stats${query ? `?${query}` : ''}`, { token });
  },
  createPromotion: (payload, token) => request('/dealer/promotions', { method: 'POST', body: payload, token }),
  getPromotions: (token) => request('/dealer/promotions', { token }),
  deactivatePromotion: (id, token) => request(`/dealer/promotions/${id}/deactivate`, { method: 'POST', token }),
  redeemPromotion: (code, token) => request('/promotions/redeem', { method: 'POST', body: { code }, token }),
  getAvailablePromotions: (token) => request('/promotions/available', { token }),
  getAdminStats: (params, token) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/stats${query ? `?${query}` : ''}`, { token });
  },
};
