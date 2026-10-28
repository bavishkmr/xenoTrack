import api from './api';

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  changePassword: (currentPassword, newPassword) => api.post('/auth/change-password', { currentPassword, newPassword }),
};

export const dashboardService = {
  getAdmin: () => api.get('/dashboard/admin'),
  getStaff: () => api.get('/dashboard/staff'),
};

export const memberService = {
  list: (params) => api.get('/members', { params }),
  getById: (id) => api.get(`/members/${id}`),
  create: (data) => api.post('/members', data),
  update: (id, data) => api.put(`/members/${id}`, data),
  updateStatus: (id, status) => api.patch(`/members/${id}/status`, { status }),
};

export const programService = {
  listPrograms: (params) => api.get('/programs', { params }),
  createProgram: (data) => api.post('/programs', data),
  updateProgram: (id, data) => api.put(`/programs/${id}`, data),
  listGroups: (params) => api.get('/groups', { params }),
  getGroup: (id) => api.get(`/groups/${id}`),
  createGroup: (data) => api.post('/groups', data),
  updateGroup: (id, data) => api.put(`/groups/${id}`, data),
  assignStaff: (groupId, data) => api.post(`/groups/${groupId}/staff`, data),
  removeStaff: (groupId, staffId) => api.delete(`/groups/${groupId}/staff/${staffId}`),
  enroll: (data) => api.post('/enrollments', data),
  updateEnrollment: (id, data) => api.put(`/enrollments/${id}`, data),
};

export const staffService = {
  list: (params) => api.get('/staff', { params }),
  getById: (id) => api.get(`/staff/${id}`),
  create: (data) => api.post('/staff', data),
  update: (id, data) => api.put(`/staff/${id}`, data),
  resetPassword: (id, new_password) => api.post(`/staff/${id}/reset-password`, { new_password }),
};

export const attendanceService = {
  listSessions: (params) => api.get('/attendance/sessions', { params }),
  createSession: (data) => api.post('/attendance/sessions', data),
  getSessionRecords: (sessionId) => api.get(`/attendance/sessions/${sessionId}/records`),
  saveBulk: (data) => api.post('/attendance/records/bulk', data),
  updateRecord: (id, data) => api.put(`/attendance/records/${id}`, data),
};

export const feeService = {
  listPlans: (params) => api.get('/fees/plans', { params }),
  createPlan: (data) => api.post('/fees/plans', data),
  updatePlan: (id, data) => api.put(`/fees/plans/${id}`, data),
  listRecords: (params) => api.get('/fees/records', { params }),
  createRecord: (data) => api.post('/fees/records', data),
  updateRecord: (id, data) => api.put(`/fees/records/${id}`, data),
  listPayments: (params) => api.get('/fees/payments', { params }),
  createPayment: (data) => api.post('/fees/payments', data),
  getReceipt: (id) => api.get(`/fees/payments/${id}/receipt`),
  reversePayment: (id, reason) => api.post(`/fees/payments/${id}/reverse`, { reason }),
};

export const reportService = {
  getAttendance: (params) => api.get('/reports/attendance', { params }),
  getCollections: (params) => api.get('/reports/collections', { params }),
  getOutstanding: (params) => api.get('/reports/outstanding-fees', { params }),
};

export const settingsService = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  getActivityLogs: (params) => api.get('/settings/activity-logs', { params }),
};
