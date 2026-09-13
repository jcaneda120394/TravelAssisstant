import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { ResponsiveScrollView } from '@/components/layout/responsive-scroll-view';
import { TextField } from '@/components/forms/text-field';
import { ChipSelect } from '@/components/forms/chip-select';
import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { View } from '@/components/ui/primitives';
import { useAuth } from '@/hooks/use-auth';
import { useDisplayCurrency } from '@/hooks/use-display-currency';
import {
  addExpense,
  getBudget,
  listExpenses,
  summarizeExpenses,
  upsertBudget,
} from '@/services/budget/budget.service';
import type { ExpenseCategory } from '@/types/domain';
import { analytics } from '@/lib/analytics';
import { getErrorMessage } from '@/lib/errors/app-error';
import { labelize } from '@/constants/preferences';

const CATEGORIES = [
  'flights',
  'hotel',
  'food',
  'transportation',
  'attractions',
  'shopping',
  'esim',
  'insurance',
  'miscellaneous',
] as const satisfies readonly ExpenseCategory[];

export function BudgetScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const { user } = useAuth();
  const { currency: homeCurrency } = useDisplayCurrency();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('25');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [budgetTotal, setBudgetTotal] = useState('2000');

  const activeTripId = tripId ?? 'none';

  const query = useQuery({
    queryKey: ['budget-screen', activeTripId],
    enabled: activeTripId !== 'none',
    queryFn: async () => {
      const budget = await getBudget(activeTripId);
      const expenses = await listExpenses(activeTripId);
      return { budget, expenses, summary: summarizeExpenses(expenses, budget) };
    },
  });

  const saveBudget = useMutation({
    mutationFn: () =>
      upsertBudget({
        tripId: activeTripId,
        total: Number(budgetTotal) || 0,
        currency: homeCurrency,
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['budget-screen'] }),
  });

  const saveExpense = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('Sign in required');
      }
      return addExpense({
        tripId: activeTripId,
        userId: user.id,
        amount: Number(amount) || 0,
        currency: homeCurrency,
        homeCurrency,
        category,
        date: new Date().toISOString().slice(0, 10),
      });
    },
    onSuccess: () => {
      analytics.track('expense_added', { category });
      void queryClient.invalidateQueries({ queryKey: ['budget-screen'] });
      setAmount('');
    },
    onError: (error) => Alert.alert('Expense failed', getErrorMessage(error)),
  });

  if (activeTripId === 'none') {
    return (
      <Screen className="px-5 pt-4">
        <SectionHeader
          title="Budget"
          subtitle="Open a trip first, then manage budget from the trip dashboard."
        />
      </Screen>
    );
  }

  const summary = query.data?.summary;

  return (
    <Screen>
      <ResponsiveScrollView className="flex-1 px-5 pt-4" testID="screen-budget">
        <SectionHeader title="Trip budget" subtitle={`Home currency ${homeCurrency}`} />
        <Card className="mb-4">
          <AppText className="font-sans-semibold text-lg">
            Spent {summary?.spent.toFixed(2) ?? '0'} / {query.data?.budget?.total ?? '—'}
          </AppText>
          <AppText muted className="mt-1">
            Remaining: {summary?.remaining == null ? '—' : summary.remaining.toFixed(2)}
          </AppText>
          <TextField label="Trip budget total" value={budgetTotal} onChangeText={setBudgetTotal} keyboardType="decimal-pad" />
          <Button label="Save budget" loading={saveBudget.isPending} onPress={() => saveBudget.mutate()} />
        </Card>

        <Card className="mb-4">
          <SectionHeader title="Add expense" />
          <TextField label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          <ChipSelect
            options={CATEGORIES}
            values={[category]}
            multiple={false}
            labels={Object.fromEntries(CATEGORIES.map((item) => [item, labelize(item)]))}
            onChange={(values) => setCategory((values[0] as ExpenseCategory) ?? 'food')}
          />
          <View className="mt-3">
            <Button label="Add expense" loading={saveExpense.isPending} onPress={() => saveExpense.mutate()} />
          </View>
        </Card>

        <Card>
          <SectionHeader title="Recent expenses" />
          {query.data?.expenses.map((expense) => (
            <AppText key={expense.id} muted className="mb-2">
              {expense.date} · {labelize(expense.category)} · {expense.amountHome.toFixed(2)}{' '}
              {expense.homeCurrency}
            </AppText>
          ))}
        </Card>
      </ResponsiveScrollView>
    </Screen>
  );
}
