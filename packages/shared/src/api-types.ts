import type {
  Role,
  Visibility,
  Priority,
  WishStatus,
  EventKind,
  TaskCategory,
  TaskStatus,
  FeedScope,
  ScopeFilter,
} from './constants';

// ─── User ────────────────────────────────────────────────────────────────────

export interface UserDto {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  timezone: string;
  createdAt: string;
}

export interface AuthResponse {
  user: UserDto;
  accessToken: string;
}

// ─── Couple ──────────────────────────────────────────────────────────────────

export interface CoupleMemberDto {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: Role;
  joinedAt: string;
}

export interface CoupleDto {
  id: string;
  name: string | null;
  inviteCode: string;
  createdAt: string;
  members: CoupleMemberDto[];
}

// ─── Wishlist / Wish ─────────────────────────────────────────────────────────

export interface WishlistDto {
  id: string;
  ownerId: string;
  coupleId: string | null;
  title: string;
  description: string | null;
  visibility: Visibility;
  wishCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WishDto {
  id: string;
  wishlistId: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string;
  url: string | null;
  imageUrl: string | null;
  priority: Priority;
  status: WishStatus;
  reservedById: string | null;
  reservedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface WishlistDetailDto extends WishlistDto {
  wishes: WishDto[];
}

// ─── CalendarEvent ───────────────────────────────────────────────────────────

export interface CalendarEventDto {
  id: string;
  icsUid: string;
  creatorId: string;
  coupleId: string | null;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  timezone: string;
  kind: EventKind;
  color: string | null;
  reminderMinutesBefore: number | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Task ────────────────────────────────────────────────────────────────────

export interface TaskDto {
  id: string;
  coupleId: string;
  creatorId: string;
  assigneeId: string | null;
  title: string;
  description: string | null;
  category: TaskCategory;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStatsBucket {
  byStatus: Record<TaskStatus, number>;
  byCategory: Record<TaskCategory, number>;
  total: number;
}

export interface TaskStatsDto {
  couple: TaskStatsBucket;
  personal: TaskStatsBucket;
}

// ─── Calendar Feed ───────────────────────────────────────────────────────────

export interface CalendarFeedTokenDto {
  token: string;
  feedUrl: string;
  webcalUrl: string;
  scope: FeedScope;
  includeTodos: boolean;
  createdAt: string;
  lastAccessAt: string | null;
}

// ─── Query params ────────────────────────────────────────────────────────────

export interface WishListQuery {
  scope?: ScopeFilter;
}

export interface WishQuery {
  wishlistId?: string;
  status?: string;
  hideReserved?: boolean;
}

export interface EventQuery {
  from: string;
  to: string;
  scope?: ScopeFilter;
}

export interface TaskQuery {
  assignee?: 'me' | 'partner' | 'unassigned' | 'all';
  category?: string;
  status?: string;
  q?: string;
  due?: 'today' | 'week' | 'overdue' | 'all';
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginatedDto<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
