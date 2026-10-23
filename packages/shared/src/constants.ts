export const Role = {
  OWNER: 'OWNER',
  PARTNER: 'PARTNER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Visibility = {
  PERSONAL: 'PERSONAL',
  SHARED: 'SHARED',
} as const;
export type Visibility = (typeof Visibility)[keyof typeof Visibility];

export const Priority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const WishStatus = {
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  GIFTED: 'GIFTED',
  RECEIVED: 'RECEIVED',
} as const;
export type WishStatus = (typeof WishStatus)[keyof typeof WishStatus];

export const EventKind = {
  EVENT: 'EVENT',
  MEETING: 'MEETING',
  DATE: 'DATE',
  HOLIDAY: 'HOLIDAY',
} as const;
export type EventKind = (typeof EventKind)[keyof typeof EventKind];

export const TaskCategory = {
  CLEANING: 'CLEANING',
  COOKING: 'COOKING',
  SHOPPING: 'SHOPPING',
  REPAIRS: 'REPAIRS',
  DOCS: 'DOCS',
  PET: 'PET',
  FINANCE: 'FINANCE',
  OTHER: 'OTHER',
} as const;
export type TaskCategory = (typeof TaskCategory)[keyof typeof TaskCategory];

export const TaskStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
  CANCELLED: 'CANCELLED',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const FeedScope = {
  ALL: 'ALL',
  PERSONAL: 'PERSONAL',
  SHARED: 'SHARED',
} as const;
export type FeedScope = (typeof FeedScope)[keyof typeof FeedScope];

export const ScopeFilter = {
  personal: 'personal',
  shared: 'shared',
  all: 'all',
} as const;
export type ScopeFilter = (typeof ScopeFilter)[keyof typeof ScopeFilter];
