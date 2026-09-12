-- Companion travel prefs: kids / elderly with ages
alter table public.user_preferences
  add column if not exists traveling_with_kids boolean not null default false;

alter table public.user_preferences
  add column if not exists kids_ages integer[] not null default '{}';

alter table public.user_preferences
  add column if not exists traveling_with_elderly boolean not null default false;

alter table public.user_preferences
  add column if not exists elderly_ages integer[] not null default '{}';
