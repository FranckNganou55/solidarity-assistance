import { Platform } from 'react-native';
import { Lang, translate } from './i18n';

/**
 * En web, l'application est servie par le meme hote que l'API (proxy /api),
 * donc une URL relative suffit. Sur mobile, renseigner EXPO_PUBLIC_API_URL.
 */
const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
export const API_BASE = configured && configured.length > 0
  ? configured.replace(/\/$/, '')
  : Platform.OS === 'web'
    ? ''
    : 'http://localhost:8080';

let authToken: string | null = null;
let activeGroupId: number | null = null;
let activeLanguage: Lang = 'fr';
export function setAuthToken(token: string | null) { authToken = token; }
export function setActiveGroupHeader(id: number | null) { activeGroupId = id; }
export function setRequestLanguage(language: Lang) { activeLanguage = language; }
export function getRequestLanguage() { return activeLanguage; }
export function getAuthToken() { return authToken; }

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Options = { method?: string; body?: unknown; form?: FormData; raw?: boolean };

async function request<T>(path: string, options: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', 'Accept-Language': activeLanguage };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  if (activeGroupId != null) headers['X-Group-Id'] = String(activeGroupId);
  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body,
    });
  } catch (e) {
    throw new ApiError(0, translate(activeLanguage, 'network_error'));
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  let data: any = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!response.ok) {
    const localizedCodeMessage: Record<string, string> = {
      forbidden: 'api_forbidden', access_denied: 'api_forbidden',
      validation: 'api_validation', bad_request: 'api_validation',
      unauthorized: 'api_auth_required', not_found: 'api_not_found',
      conflict: 'api_conflict', error: 'api_internal_error',
    };
    const localizedKey = activeLanguage === 'en'
      ? localizedCodeMessage[String(data?.code ?? '').toLowerCase()] ?? ({ 400: 'api_validation', 401: 'api_auth_required', 403: 'api_forbidden', 404: 'api_not_found', 409: 'api_conflict' } as Record<number, string>)[response.status]
      : undefined;
    const message = localizedKey
      ? translate(activeLanguage, localizedKey)
      : (data && (data.message || data.error)) || translate(activeLanguage, 'http_error', { status: response.status });
    throw new ApiError(response.status, message, data?.code);
  }
  return data as T;
}

/* ------------------------------- types ---------------------------------- */
export interface MemberView {
  id: number; lastName: string; firstName: string; fullName: string; phone: string;
  city: string; quarter?: string; photoUrl?: string; email?: string;
  active: boolean; roleId: number; roleCode: string; roleName: string;
  superAdmin: boolean; groupAdmin: boolean;
  mustChangePassword: boolean; cycleContributions: number; totalContributions: number;
  requiredAssistances: number; requiredAssistancesOverride?: number | null; bureauPosition?: string | null; eligibleForAssistance: boolean;
  createdAt: string; lastLoginAt?: string; permissions: string[]; photoShape: 'CIRCLE' | 'SQUARE';
}
export interface LoginResponse { token: string; expiresIn: number; mustChangePassword: boolean; member: MemberView; }
export interface MeSummary {
  member: MemberView; cycleContributions: number; requiredAssistances: number; eligible: boolean;
  missingToEligibility: number; totalContributions: number; totalContributedAmount: number;
  openEvents: number; pendingContributions: number; myRequests: number;
}
export interface EventView {
  id: number; reference: string; typeId: number; typeName: string; typeIcon?: string;
  beneficiaryId: number; beneficiaryName: string; beneficiaryPhone: string; beneficiaryPhotoUrl?: string;
  description: string; status: 'OPEN' | 'CLOSED' | 'CANCELLED'; closingDate?: string;
  contributionsOpen: boolean; daysLeft: number; contributionCount: number; collectedAmount: number;
  targetAmount?: number; createdBy?: number; createdByName?: string; createdAt: string; requestedAt?: string; beneficiaryPhotoShape: 'CIRCLE' | 'SQUARE';
  closedAt?: string; closedByName?: string; myContribution?: ContributionView; eligibilityOverridden: boolean; eligibilityOverrideByName?: string; supportingDocumentUrl?: string;
}
export interface ContributionView {
  id: number; eventId: number; eventReference: string; eventTypeName: string;
  memberId: number; memberName: string; memberPhone: string; memberPhotoUrl?: string;
  amount: number; method: string; status: 'PENDING' | 'VALIDATED' | 'REJECTED' | 'INVALIDATED'; note?: string;
  cycleNumber?: number; submittedAt: string; validatedAt?: string; validatedByName?: string;
  rejectionReason?: string; eventClosingDate?: string; eventStatus: string;
  paymentReceived: boolean; receiptReference?: string; paymentReceivedAt?: string; paymentReceivedByName?: string;
  proofPhotoUrl?: string; proofPhotoShape: 'CIRCLE' | 'SQUARE'; memberPhotoShape: 'CIRCLE' | 'SQUARE';
}
export interface EventParticipantView { memberId: number; memberName: string; phone: string; photoUrl?: string; photoShape: 'CIRCLE' | 'SQUARE'; contribution?: ContributionView | null; }
export interface RequestView {
  id: number; memberId: number; memberName: string; memberPhone: string; memberPhotoUrl?: string;
  typeId: number; typeName: string; typeIcon?: string; reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED'; eligible: boolean;
  cycleCountAtRequest?: number; minRequiredAtRequest?: number; decisionComment?: string;
  eventId?: number; eventReference?: string; createdAt: string; decidedAt?: string; decidedByName?: string; documentUrl?: string; memberPhotoShape: 'CIRCLE' | 'SQUARE';
}
export interface TypeView { id: number; name: string; description?: string; icon?: string; active: boolean; createdAt: string; eventCount: number; }
export interface RoleView { id: number; code: string; name: string; description?: string; systemRole: boolean; permissions: string[]; memberCount: number; }
export interface PermissionView { code: string; labelFr: string; labelEn: string; group: string; }
export interface PageResponse<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number; last: boolean; }
export interface SettingsView {
  orgName: string; logoUrl?: string; primaryColor: string; accentColor: string; currency: string;
  minContributionsRequired: number; minContributionAmount: number; defaultLocale: string; defaultTheme: string; defaultPassword: string;
  contactPhone?: string; contactEmail?: string; motto?: string;
}
export interface PublicSettings { orgName: string; logoUrl?: string; primaryColor: string; accentColor: string; currency: string; defaultLocale: string; minContributionAmount: number; }
export interface GroupView { id: number; name: string; logoUrl?: string; city?: string; description?: string; contactPhone?: string; contactEmail?: string; primaryColor: string; accentColor: string; currency: string; minAssistancesRequired: number; principalAdmin: boolean; roleName?: string; }
export interface AuditEntry { id: number; actorId?: number; actorName?: string; action: string; entityType?: string; entityId?: number; details?: string; createdAt: string; }
export interface NotificationView { id: number; type: string; title: string; message: string; entityType?: string; entityId?: number; createdAt: string; readAt?: string; }
export interface NotificationList { notifications: NotificationView[]; unreadCount: number; }

/* ------------------------------- calls ---------------------------------- */
export const api = {
  publicSettings: (groupId?: number | null) => request<PublicSettings>(`/api/public/settings${groupId ? `?groupId=${groupId}` : ''}`),
  publicGroups: () => request<GroupView[]>('/api/public/groups'),
  groups: () => request<GroupView[]>('/api/groups'),
  createGroup: (body: Record<string, unknown>) => request<GroupView>('/api/groups', { method: 'POST', body }),
    updateGroup: (id: number, body: Record<string, unknown>) => request<GroupView>(`/api/groups/${id}`, { method: 'PUT', body }),
    deleteGroup: (id: number) => request<void>(`/api/groups/${id}`, { method: 'DELETE' }),
  addExistingMemberToGroup: (groupId: number, memberId: number) => request<GroupView>(`/api/groups/${groupId}/members`, { method: 'POST', body: { memberId } }),
  register: (body: { firstName: string; lastName: string; phone: string; city: string; quarter: string; email?: string; password: string; groupId?: number }) =>
    request<{ message: string }>('/api/public/register', { method: 'POST', body }),
  login: (phone: string, password: string) => request<LoginResponse>('/api/auth/login', { method: 'POST', body: { phone, password } }),
  me: () => request<MemberView>('/api/auth/me'),
  mySummary: () => request<MeSummary>('/api/auth/me/summary'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),

  events: (params: { status?: string; typeId?: number; q?: string; page?: number; size?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.status) search.set('status', params.status);
    if (params.typeId) search.set('typeId', String(params.typeId));
    if (params.q) search.set('q', params.q);
    search.set('page', String(params.page ?? 0));
    search.set('size', String(params.size ?? 20));
    return request<PageResponse<EventView>>(`/api/events?${search.toString()}`);
  },
  recentEvents: () => request<EventView[]>('/api/events/recent'),
  event: (id: number) => request<EventView>(`/api/events/${id}`),
  eventContributions: (id: number) => request<ContributionView[]>(`/api/events/${id}/contributions`),
  eventParticipants: (id: number) => request<EventParticipantView[]>(`/api/events/${id}/participants`),
  createEvent: (body: { typeId: number; beneficiaryId: number; description: string; closingDate?: string | null; targetAmount?: number | null; overrideEligibility?: boolean; supportingDocumentUrl?: string }) =>
    request<EventView>('/api/events', { method: 'POST', body }),
  updateEvent: (id: number, body: { description?: string; closingDate?: string | null; targetAmount?: number | null; supportingDocumentUrl?: string }) =>
    request<EventView>(`/api/events/${id}`, { method: 'PUT', body }),
  closeEvent: (id: number, closingDate?: string | null) =>
    request<EventView>(`/api/events/${id}/close`, { method: 'POST', body: { closingDate } }),
  reopenEvent: (id: number) => request<EventView>(`/api/events/${id}/reopen`, { method: 'POST' }),
  cancelEvent: (id: number, reason?: string) => request<EventView>(`/api/events/${id}/cancel`, { method: 'POST', body: { reason } }),
  submitContribution: (eventId: number, body: { amount: number; method: string; note?: string; proofPhotoUrl: string; proofPhotoShape: 'CIRCLE' | 'SQUARE' }) =>
    request<ContributionView>(`/api/events/${eventId}/contributions`, { method: 'POST', body }),

  myContributions: () => request<ContributionView[]>('/api/contributions/mine'),
  pendingContributions: () => request<ContributionView[]>('/api/contributions/pending'),
  /** Validation par le tresorier : il doit confirmer avoir percu l'argent du membre. */
  verifyContribution: (id: number, body: { paymentReceived: boolean; receiptReference?: string; comment?: string }) =>
    request<ContributionView>(`/api/contributions/${id}/validate`, { method: 'POST', body }),
  invalidateContribution: (id: number, reason?: string) =>
    request<ContributionView>(`/api/contributions/${id}/invalidate`, { method: 'POST', body: { comment: reason } }),
  editInvalidatedContribution: (id: number, body: { amount: number; method: string; note?: string; proofPhotoUrl: string; proofPhotoShape: 'CIRCLE' | 'SQUARE' }) =>
    request<ContributionView>(`/api/contributions/${id}`, { method: 'PUT', body }),
  validatedContributions: () => request<ContributionView[]>('/api/contributions/validated'),
  rejectContribution: (id: number, comment?: string) =>
    request<ContributionView>(`/api/contributions/${id}/reject`, { method: 'POST', body: { comment } }),

  requests: (scope: 'mine' | 'all' = 'mine') => request<RequestView[]>(`/api/requests?scope=${scope}`),
  createRequest: (body: { typeId: number; reason: string; documentUrl?: string }) => request<RequestView>('/api/requests', { method: 'POST', body }),
  approveRequest: (id: number, body: { closingDate?: string | null; targetAmount?: number | null; comment?: string }) =>
    request<RequestView>(`/api/requests/${id}/approve`, { method: 'POST', body }),
  rejectRequest: (id: number, comment?: string) => request<RequestView>(`/api/requests/${id}/reject`, { method: 'POST', body: { comment } }),

  types: (activeOnly?: boolean) => request<TypeView[]>(`/api/assistance-types${activeOnly ? '?activeOnly=true' : ''}`),
  createType: (body: { name: string; description?: string; icon?: string; active?: boolean }) =>
    request<TypeView>('/api/assistance-types', { method: 'POST', body }),
  updateType: (id: number, body: { name: string; description?: string; icon?: string; active?: boolean }) =>
    request<TypeView>(`/api/assistance-types/${id}`, { method: 'PUT', body }),
  deactivateType: (id: number) => request<{ message: string }>(`/api/assistance-types/${id}`, { method: 'DELETE' }),

  members: (params: { q?: string; page?: number; size?: number; active?: boolean } = {}) => {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.active !== undefined) search.set('active', String(params.active));
    search.set('page', String(params.page ?? 0));
    search.set('size', String(params.size ?? 50));
    return request<PageResponse<MemberView>>(`/api/members?${search.toString()}`);
  },
  createMember: (body: Record<string, unknown>) => request<{ member: MemberView; temporaryPassword: string }>('/api/members', { method: 'POST', body }),
  updateMember: (id: number, body: Record<string, unknown>) => request<MemberView>(`/api/members/${id}`, { method: 'PUT', body }),
  assignMemberRole: (id: number, roleId: number) => request<MemberView>(`/api/members/${id}/role`, { method: 'PUT', body: { roleId } }),
  setMemberActive: (id: number, active: boolean) => request<MemberView>(`/api/members/${id}/status`, { method: 'PUT', body: { active } }),
  disableMember: (id: number) => request<{ message: string }>(`/api/members/${id}`, { method: 'DELETE' }),
  resetMemberPassword: (id: number) => request<{ temporaryPassword: string }>(`/api/members/${id}/reset-password`, { method: 'POST' }),
  resetMemberCycle: (id: number) => request<{ message: string }>(`/api/members/${id}/reset-cycle`, { method: 'POST' }),
  memberContributions: (id: number) => request<ContributionView[]>(`/api/members/${id}/contributions`),

  bureauMembers: () => request<MemberView[]>('/api/administration/bureau'),
  appointBureauMember: (memberId: number, position: string) => request<MemberView>('/api/administration/bureau', { method: 'POST', body: { memberId, position } }),
  replaceBureauMember: (currentMemberId: number, replacementMemberId: number) => request<MemberView>('/api/administration/bureau/replace', { method: 'PUT', body: { currentMemberId, replacementMemberId } }),
  removeBureauMember: (memberId: number) => request<void>(`/api/administration/bureau/${memberId}`, { method: 'DELETE' }),

  notifications: () => request<NotificationList>('/api/notifications'),
  markNotificationRead: (id: number) => request<void>(`/api/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request<void>('/api/notifications/read-all', { method: 'POST' }),

  roles: () => request<RoleView[]>('/api/roles'),
  permissions: () => request<PermissionView[]>('/api/permissions'),
  createRole: (body: { code: string; name: string; description?: string; permissions: string[] }) =>
    request<RoleView>('/api/roles', { method: 'POST', body }),
  updateRole: (id: number, body: { code: string; name: string; description?: string; permissions: string[] }) =>
    request<RoleView>(`/api/roles/${id}`, { method: 'PUT', body }),
  deleteRole: (id: number) => request<{ message: string }>(`/api/roles/${id}`, { method: 'DELETE' }),

  settings: () => request<SettingsView>('/api/settings'),
  updateSettings: (body: Partial<SettingsView>) => request<SettingsView>('/api/settings', { method: 'PUT', body }),
  uploadLogo: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ logoUrl: string }>('/api/settings/logo', { method: 'POST', form });
  },
  uploadImage: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ url: string }>('/api/uploads', { method: 'POST', form });
  },
  uploadForm: (form: FormData, kind: 'image' | 'logo' | 'document' = 'image') =>
    request<{ url?: string; logoUrl?: string }>(kind === 'logo' ? '/api/settings/logo' : kind === 'document' ? '/api/uploads/document' : '/api/uploads', { method: 'POST', form }),

  dashboard: () => request<Record<string, any>>('/api/stats/dashboard'),
  audit: () => request<PageResponse<AuditEntry>>('/api/audit-logs'),
};

export function assetUrl(path?: string) {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}
