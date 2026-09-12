import { createId, dbGet, dbSet } from '@/lib/storage/local-db';
import { isUuid, useCloudStorage } from '@/lib/storage/cloud';
import { supabase } from '@/lib/supabase/client';
import { providers } from '@/providers/registry';
import type { Budget, Expense, ExpenseCategory } from '@/types/domain';

const BUDGET_KEY = 'budgets';
const EXPENSE_KEY = 'expenses';

type BudgetRow = {
  id: string;
  trip_id: string;
  total: number;
  currency: string;
  categories: Partial<Record<ExpenseCategory, number>>;
};

type ExpenseRow = {
  id: string;
  trip_id: string;
  user_id: string;
  amount: number;
  currency: string;
  amount_home: number;
  home_currency: string;
  category: ExpenseCategory;
  expense_date: string;
  location: string | null;
  notes: string | null;
  created_at: string;
};

export async function getBudget(tripId: string): Promise<Budget | null> {
  if (useCloudStorage() && isUuid(tripId) && supabase) {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('trip_id', tripId)
      .maybeSingle();
    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }
    const row = data as BudgetRow;
    return {
      id: row.id,
      tripId: row.trip_id,
      total: Number(row.total),
      currency: row.currency,
      categories: row.categories ?? {},
    };
  }

  const budgets = await dbGet<Budget[]>(BUDGET_KEY, []);
  return budgets.find((budget) => budget.tripId === tripId) ?? null;
}

export async function upsertBudget(input: {
  tripId: string;
  total: number;
  currency: string;
}): Promise<Budget> {
  if (useCloudStorage() && isUuid(input.tripId) && supabase) {
    const { data, error } = await supabase
      .from('budgets')
      .upsert(
        {
          trip_id: input.tripId,
          total: input.total,
          currency: input.currency,
          categories: {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'trip_id' },
      )
      .select('*')
      .single();
    if (error) {
      throw error;
    }
    const row = data as BudgetRow;
    return {
      id: row.id,
      tripId: row.trip_id,
      total: Number(row.total),
      currency: row.currency,
      categories: row.categories ?? {},
    };
  }

  const budgets = await dbGet<Budget[]>(BUDGET_KEY, []);
  const existing = budgets.find((budget) => budget.tripId === input.tripId);
  if (existing) {
    const next = { ...existing, total: input.total, currency: input.currency };
    await dbSet(
      BUDGET_KEY,
      budgets.map((budget) => (budget.id === existing.id ? next : budget)),
    );
    return next;
  }
  const budget: Budget = {
    id: createId('budget'),
    tripId: input.tripId,
    total: input.total,
    currency: input.currency,
    categories: {},
  };
  await dbSet(BUDGET_KEY, [budget, ...budgets]);
  return budget;
}

export async function listExpenses(tripId: string): Promise<Expense[]> {
  if (useCloudStorage() && isUuid(tripId) && supabase) {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', tripId)
      .order('expense_date', { ascending: false });
    if (error) {
      throw error;
    }
    return (data as ExpenseRow[]).map((row) => ({
      id: row.id,
      tripId: row.trip_id,
      userId: row.user_id,
      amount: Number(row.amount),
      currency: row.currency,
      amountHome: Number(row.amount_home),
      homeCurrency: row.home_currency,
      category: row.category,
      date: row.expense_date,
      location: row.location ?? undefined,
      notes: row.notes ?? undefined,
      createdAt: row.created_at,
    }));
  }

  const expenses = await dbGet<Expense[]>(EXPENSE_KEY, []);
  return expenses
    .filter((expense) => expense.tripId === tripId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function addExpense(input: {
  tripId: string;
  userId: string;
  amount: number;
  currency: string;
  homeCurrency: string;
  category: ExpenseCategory;
  date: string;
  location?: string;
  notes?: string;
}): Promise<Expense> {
  const conversion = await providers.currency.convert(
    input.amount,
    input.currency,
    input.homeCurrency,
  );

  if (useCloudStorage(input.userId) && isUuid(input.tripId) && supabase) {
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        trip_id: input.tripId,
        user_id: input.userId,
        amount: input.amount,
        currency: input.currency,
        amount_home: conversion.result,
        home_currency: input.homeCurrency,
        category: input.category,
        expense_date: input.date,
        location: input.location ?? null,
        notes: input.notes ?? null,
      })
      .select('*')
      .single();
    if (error) {
      throw error;
    }
    const row = data as ExpenseRow;
    return {
      id: row.id,
      tripId: row.trip_id,
      userId: row.user_id,
      amount: Number(row.amount),
      currency: row.currency,
      amountHome: Number(row.amount_home),
      homeCurrency: row.home_currency,
      category: row.category,
      date: row.expense_date,
      location: row.location ?? undefined,
      notes: row.notes ?? undefined,
      createdAt: row.created_at,
    };
  }

  const expense: Expense = {
    id: createId('exp'),
    tripId: input.tripId,
    userId: input.userId,
    amount: input.amount,
    currency: input.currency,
    amountHome: conversion.result,
    homeCurrency: input.homeCurrency,
    category: input.category,
    date: input.date,
    location: input.location,
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };
  const expenses = await dbGet<Expense[]>(EXPENSE_KEY, []);
  await dbSet(EXPENSE_KEY, [expense, ...expenses]);
  return expense;
}

export function summarizeExpenses(expenses: Expense[], budget: Budget | null) {
  const spent = expenses.reduce((sum, expense) => sum + expense.amountHome, 0);
  const remaining = budget ? budget.total - spent : null;
  const byCategory = expenses.reduce<Record<string, number>>((acc, expense) => {
    acc[expense.category] = (acc[expense.category] ?? 0) + expense.amountHome;
    return acc;
  }, {});
  return { spent, remaining, byCategory };
}
