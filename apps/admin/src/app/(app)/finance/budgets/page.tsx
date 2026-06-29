'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

const placeholderCategories = [
  {
    id: '1',
    name: 'Seeds & Plants',
    budget: 5000,
    spent: 3200,
    status: 'under',
  },
  {
    id: '2',
    name: 'Fertilizer',
    budget: 8000,
    spent: 7500,
    status: 'near',
  },
  {
    id: '3',
    name: 'Equipment',
    budget: 15000,
    spent: 12000,
    status: 'under',
  },
  {
    id: '4',
    name: 'Labor',
    budget: 20000,
    spent: 19800,
    status: 'near',
  },
  {
    id: '5',
    name: 'Utilities',
    budget: 3000,
    spent: 3500,
    status: 'over',
  },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

export default function BudgetsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/finance"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Finance
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">
            Track spending against your budget categories
          </p>
        </div>
      </div>

      {/* Coming Soon Banner */}
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Budget Feature Coming Soon</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Full budget management with automatic tracking, alerts, and
            forecasting will be available in a future update.
          </p>
        </CardContent>
      </Card>

      {/* Budget Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    placeholderCategories.reduce((a, c) => a + c.budget, 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-orange-100 p-3 dark:bg-orange-900/30">
                <TrendingDown className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    placeholderCategories.reduce((a, c) => a + c.spent, 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    placeholderCategories.reduce(
                      (a, c) => a + (c.budget - c.spent),
                      0
                    )
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Table */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Categories</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Spent</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {placeholderCategories.map((cat) => {
                const remaining = cat.budget - cat.spent;
                return (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell>{formatCurrency(cat.budget)}</TableCell>
                    <TableCell>{formatCurrency(cat.spent)}</TableCell>
                    <TableCell>
                      <span
                        className={
                          remaining >= 0 ? 'text-green-600' : 'text-red-600'
                        }
                      >
                        {formatCurrency(remaining)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          cat.status === 'over'
                            ? 'destructive'
                            : cat.status === 'near'
                            ? 'warning'
                            : 'success'
                        }
                      >
                        {cat.status === 'over'
                          ? 'Over Budget'
                          : cat.status === 'near'
                          ? 'Near Limit'
                          : 'On Track'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
