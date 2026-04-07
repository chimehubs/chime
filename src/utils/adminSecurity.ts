export const ADMIN_DASHBOARD_PIN = '1688';
export const ADMIN_DASHBOARD_PIN_SESSION_KEY = 'admin-dashboard:pin-verified';

export function isAdminDashboardPinVerified() {
  return window.sessionStorage.getItem(ADMIN_DASHBOARD_PIN_SESSION_KEY) === 'true';
}

export function setAdminDashboardPinVerified() {
  window.sessionStorage.setItem(ADMIN_DASHBOARD_PIN_SESSION_KEY, 'true');
}

export function clearAdminDashboardPinVerification() {
  window.sessionStorage.removeItem(ADMIN_DASHBOARD_PIN_SESSION_KEY);
}

export function isValidAdminDashboardPin(value: string) {
  return value.trim() === ADMIN_DASHBOARD_PIN;
}
