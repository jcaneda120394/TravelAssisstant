import { createId, dbGet, dbSet } from '@/lib/storage/local-db';
import { providers } from '@/providers/registry';
import type { Budget, Expense, ExpenseCategory } from '@/types/domain';

const BUDGET_KEY = 'budgets';
const EXPENSE_KEY = 'expenses';

export async function getBudget(tripId: string): Promise<Budget | null> {
  const budgets = await dbGet<Budget[]>(BUDGET_KEY, []);
  return budgets.find((budget) => budget.tripId === tripId) ?? null;
}

export async function upsertBudget(input: {
  tripId: string;
  total: number;
  currency: string;
}): Promise<Budget> {
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
