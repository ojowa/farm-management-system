'use client';

import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Plus,
  Calculator,
  Trash2,
} from 'lucide-react';
import { currencyAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { usePermission } from '@/lib/usePermission';
import { NavTabs } from '@/components/NavTabs';
import { FINANCE_TABS } from '@/lib/financeTabs';

const CURRENCY_ORDER = ['USD', 'EUR', 'GBP', 'KES', 'NGN', 'GHS'];

function sortCurrencies(codes: string[]): string[] {
  return [...codes].sort((a, b) => {
    const ai = CURRENCY_ORDER.indexOf(a);
    const bi = CURRENCY_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export default function CurrenciesPage() {
  const { toast } = useToast();
  const { canCreate, canDelete } = usePermission();
  const canWrite = canCreate('currency');
  const canRemove = canDelete('currency');
  const readOnly = !canWrite;

  const [showCurrencyDialog, setShowCurrencyDialog] = useState(false);
  const [showRateDialog, setShowRateDialog] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [currencyForm, setCurrencyForm] = useState({ code: '', name: '', symbol: '' });
  const [rateForm, setRateForm] = useState({ fromCurrency: '', toCurrency: '', rate: '', source: '' });
  const [convertForm, setConvertForm] = useState({ amount: '', fromCurrency: '', toCurrency: '' });
  const [convertResult, setConvertResult] = useState<{ amount: number; rate: number; convertedAmount: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    data: currenciesData,
    loading: loadingCurrencies,
    error: currenciesError,
    refetch: refetchCurrencies,
  } = useFetch<{ data: any[] }>('currencies-list', () => currencyAPI.list(), {
    cacheTime: 60_000,
  });

  const {
    data: ratesData,
    loading: loadingRates,
  } = useFetch<{ data: any[] }>(
    'currency-rates',
    () => currencyAPI.listRates(),
    { cacheTime: 30_000 }
  );

  const currencies = currenciesData?.data || [];
  const rates = ratesData?.data || [];

  const currencyOptions = sortCurrencies(currencies.map((c) => c.code)).map((code) => {
    const c = currencies.find((x) => x.code === code);
    return { value: code, label: `${code} ${c?.name ? `(${c.name})` : ''}` };
  });

  const rateTable = rates.map((r) => {
    const from = currencies.find((c) => c.code === r.fromCurrency);
    const to = currencies.find((c) => c.code === r.toCurrency);
    return {
      ...r,
      fromLabel: from?.symbol || r.fromCurrency,
      toLabel: to?.symbol || r.toCurrency,
    };
  });

  const handleCurrencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCode) {
        await currencyAPI.update(editingCode, {
          name: currencyForm.name.trim(),
          symbol: currencyForm.symbol.trim() || null,
        });
        toast({ type: 'success', title: 'Currency updated' });
      } else {
        await currencyAPI.create({
          code: currencyForm.code.trim().toUpperCase(),
          name: currencyForm.name.trim(),
          symbol: currencyForm.symbol.trim() || null,
        });
        toast({ type: 'success', title: 'Currency added' });
      }
      setShowCurrencyDialog(false);
      setEditingCode(null);
      setCurrencyForm({ code: '', name: '', symbol: '' });
      clearFetchCache('currencies');
      refetchCurrencies();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to save currency',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await currencyAPI.setRate({
        fromCurrency: rateForm.fromCurrency,
        toCurrency: rateForm.toCurrency,
        rate: Number(rateForm.rate),
        source: rateForm.source || null,
      });
      toast({ type: 'success', title: 'Exchange rate saved' });
      setShowRateDialog(false);
      setRateForm({ fromCurrency: '', toCurrency: '', rate: '', source: '' });
      clearFetchCache('currency-rates');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to save rate',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await currencyAPI.convert({
        amount: Number(convertForm.amount),
        fromCurrency: convertForm.fromCurrency,
        toCurrency: convertForm.toCurrency,
      });
      setConvertResult(result);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Conversion failed',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCurrency = async (code: string) => {
    if (!confirm(`Delete currency ${code}?`)) return;
    try {
      await currencyAPI.delete(code);
      toast({ type: 'success', title: 'Currency deleted' });
      clearFetchCache('currencies');
      refetchCurrencies();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete currency',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Currencies</h1>
          <p className="text-muted-foreground">
            Manage the currency registry, exchange rates, and convert amounts
            between currencies using the latest rate.
          </p>
        </div>
        {!readOnly && (
          <div className="flex gap-3">
            <Button onClick={() => setShowCurrencyDialog(true)} className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Add Currency
            </Button>
            <Button variant="outline" onClick={() => setShowRateDialog(true)} className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Add Rate
            </Button>
          </div>
        )}
      </div>

      <NavTabs ariaLabel="Finance section" tabs={FINANCE_TABS} />

      {/* Currency Registry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Currency Registry
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Base currency is USD. All finance ledger amounts are stored and
            totaled in this currency.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loadingCurrencies ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading currencies…</p>
                </div>
              </div>
            ) : currenciesError ? (
              <div className="p-4 rounded bg-red-50 text-red-800 text-sm">
                Failed to load currencies: {currenciesError}
              </div>
            ) : currencies.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">No currencies yet.</p>
                {!readOnly && (
                  <Button onClick={() => setShowCurrencyDialog(true)} className="mt-4">
                    Add Currency
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[40px]">Symbol</TableHead>
                    {canRemove && <TableHead className="w-[60px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currencies.map((c) => (
                    <TableRow key={c.code}>
                      <TableCell className="font-medium">{c.code}</TableCell>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.symbol || '—'}</TableCell>
                      {canRemove && (
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteCurrency(c.code)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Exchange Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Exchange Rates
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Rates define how 1 unit of a foreign currency converts into the
            organization currency (USD). Used when amounts are posted to
            the ledger.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loadingRates ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : rates.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No exchange rates yet. Add one to start converting amounts.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-right w-[80px]">Rate</TableHead>
                    <TableHead>Effective</TableHead>
                    <TableHead className="w-[80px]">Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rates.map((r) => {
                    const from = currencies.find((c) => c.code === r.fromCurrency);
                    const to = currencies.find((c) => c.code === r.toCurrency);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{from?.symbol || r.fromCurrency}</TableCell>
                        <TableCell>{to?.symbol || r.toCurrency}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {r.rate.toFixed(4)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(r.effectiveAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.source || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            {!readOnly && (
              <Button variant="outline" onClick={() => setShowRateDialog(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Exchange Rate
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Currency Converter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" /> Currency Converter
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Convert an amount between any two currencies using the latest rate.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleConvert} className="grid gap-4 sm:grid-cols-4">
            <div className="col-span-3 sm:col-span-1">
              <Label htmlFor="convAmount">Amount</Label>
              <Input
                id="convAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={convertForm.amount}
                onChange={(e) => setConvertForm({ ...convertForm, amount: e.target.value })}
                disabled={saving}
              />
            </div>
            <div className="col-span-3 sm:col-span-1">
              <Label htmlFor="convFrom">From</Label>
              <Select
                id="convFrom"
                placeholder="Currency"
                options={currencyOptions}
                value={convertForm.fromCurrency}
                onChange={(e) => setConvertForm({ ...convertForm, fromCurrency: e.target.value })}
                disabled={saving}
              />
            </div>
            <div className="col-span-3 sm:col-span-1">
              <Label htmlFor="convTo">To</Label>
              <Select
                id="convTo"
                placeholder="Currency"
                options={currencyOptions}
                value={convertForm.toCurrency}
                onChange={(e) => setConvertForm({ ...convertForm, toCurrency: e.target.value })}
                disabled={saving}
              />
            </div>
            <div className="col-span-3 sm:col-span-1 flex items-end">
              <Button type="submit" disabled={saving} className="w-full">
                <span className="flex items-center gap-2">
                  <span>Convert</span>
                </span>
              </Button>
            </div>
          </form>
          {convertResult && (
            <Card className="bg-muted/50 border border-border p-3 mt-3">
              <p className="text-sm font-medium">
                {convertResult.amount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} {convertForm.fromCurrency} =
              </p>
              <p className="text-lg font-bold">
                {convertResult.convertedAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} {convertForm.toCurrency}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Rate: 1 {convertForm.fromCurrency} =
                {convertResult.rate.toFixed(4)} {convertForm.toCurrency}
              </p>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Currency Dialog */}
      {!readOnly && (
        <Dialog
          open={showCurrencyDialog}
          onOpenChange={setShowCurrencyDialog}
          title={editingCode ? 'Edit Currency' : 'Add Currency'}
        >
          <form onSubmit={handleCurrencySubmit} className="space-y-4">
            <div>
              <Label htmlFor="currencyCode">Code <span className="text-destructive">*</span></Label>
              <Input
                id="currencyCode"
                maxLength={3}
                placeholder="e.g. USD"
                value={currencyForm.code}
                onChange={(e) =>
                  setCurrencyForm({ ...currencyForm, code: e.target.value.toUpperCase() })
                }
                disabled={!!editingCode || saving}
              />
            </div>
            <div>
              <Label htmlFor="currencyName">Name <span className="text-destructive">*</span></Label>
              <Input
                id="currencyName"
                placeholder="e.g. United States Dollar"
                value={currencyForm.name}
                onChange={(e) => setCurrencyForm({ ...currencyForm, name: e.target.value })}
                disabled={saving}
              />
            </div>
            <div>
              <Label htmlFor="currencySymbol">Symbol</Label>
              <Input
                id="currencySymbol"
                maxLength={5}
                placeholder="e.g. $"
                value={currencyForm.symbol}
                onChange={(e) => setCurrencyForm({ ...currencyForm, symbol: e.target.value })}
                disabled={saving}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCurrencyDialog(false);
                  setEditingCode(null);
                  setCurrencyForm({ code: '', name: '', symbol: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="w-auto">
                {editingCode ? 'Save Currency' : 'Add Currency'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Add Exchange Rate Dialog */}
      {!readOnly && (
        <Dialog
          open={showRateDialog}
          onOpenChange={setShowRateDialog}
          title="Add Exchange Rate"
        >
          <form onSubmit={handleRateSubmit} className="space-y-4">
            <div>
              <Label htmlFor="rateFromCurrency">From Currency <span className="text-destructive">*</span></Label>
              <Select
                id="rateFromCurrency"
                placeholder="Source currency"
                options={currencyOptions}
                value={rateForm.fromCurrency}
                onChange={(e) => setRateForm({ ...rateForm, fromCurrency: e.target.value })}
                disabled={saving}
              />
            </div>
            <div>
              <Label htmlFor="rateToCurrency">To Currency <span className="text-destructive">*</span></Label>
              <Select
                id="rateToCurrency"
                placeholder="Target currency"
                options={currencyOptions}
                value={rateForm.toCurrency}
                onChange={(e) => setRateForm({ ...rateForm, toCurrency: e.target.value })}
                disabled={saving}
              />
            </div>
            <div>
              <Label htmlFor="rateValue">Rate <span className="text-destructive">*</span></Label>
              <p className="text-xs text-muted-foreground">
                1 {rateForm.fromCurrency || 'From'} = X {rateForm.toCurrency || 'To'}
              </p>
              <Input
                id="rateValue"
                type="number"
                step="0.0001"
                min="0"
                placeholder="0.0000"
                value={rateForm.rate}
                onChange={(e) => setRateForm({ ...rateForm, rate: e.target.value })}
                disabled={saving}
              />
            </div>
            <div>
              <Label htmlFor="rateSource">Source</Label>
              <Input
                id="rateSource"
                placeholder="e.g. manual / ECB"
                value={rateForm.source}
                onChange={(e) => setRateForm({ ...rateForm, source: e.target.value })}
                disabled={saving}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowRateDialog(false);
                  setRateForm({ fromCurrency: '', toCurrency: '', rate: '', source: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="w-auto">Save Rate</Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
