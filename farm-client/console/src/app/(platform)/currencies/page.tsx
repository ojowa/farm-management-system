'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  platformCurrencyAPI,
} from '@/lib/api';
import type { Currency, ExchangeRate, SetExchangeRateInput } from '@/lib/types';
import { toastError, toastSuccess, getErrorMessage } from '@/lib/toast';

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fromCurrency, setFromCurrency] = useState('');
  const [toCurrency, setToCurrency] = useState('');
  const [rate, setRate] = useState('');
  const [effectiveAt, setEffectiveAt] = useState('');
  const [source, setSource] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [currenciesRes, ratesRes] = await Promise.all([
        platformCurrencyAPI.listCurrencies(),
        platformCurrencyAPI.listRates(),
      ]);
      setCurrencies(currenciesRes.data || []);
      setRates((ratesRes.data || [] as ExchangeRate[]).sort((a: ExchangeRate, b: ExchangeRate) =>
        new Date(b.effectiveAt).getTime() - new Date(a.effectiveAt).getTime()
      ));
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const baseCurrency = 'USD';
  const rateMap = new Map<string, ExchangeRate>();
  rates.forEach((r) => {
    rateMap.set(`${r.fromCurrency}|${r.toCurrency}`, r);
  });

  const getRate = (from: string, to: string): number | null => {
    const r = rateMap.get(`${from}|${to}`);
    return r ? r.rate : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromCurrency || !toCurrency || !rate) {
      toastError('From currency, to currency, and rate are required.');
      return;
    }
    if (fromCurrency === toCurrency) {
      toastError('From and to currency must be different.');
      return;
    }
    const rateNum = Number(rate);
    if (!Number.isFinite(rateNum) || rateNum <= 0) {
      toastError('Rate must be a positive number.');
      return;
    }

    setSaving(true);
    try {
      const payload: SetExchangeRateInput = {
        fromCurrency,
        toCurrency,
        rate: rateNum,
        ...(effectiveAt ? { effectiveAt } : {}),
        ...(source ? { source } : {}),
      };
      await platformCurrencyAPI.setRate(payload);
      toastSuccess(
        `Exchange rate set: 1 ${fromCurrency} = ${rateNum.toFixed(4)} ${toCurrency}`
      );
      setFromCurrency('');
      setToCurrency('');
      setRate('');
      setEffectiveAt('');
      setSource('');
      void loadData();
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const formattedDate = (iso: string) => {
    return new Date(iso).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-sm text-gray-500">Loading currency rates…</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Currency Exchange Rates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Set and view exchange rates between currencies. Rates are used to
            convert amounts to the organization’s base currency.
          </p>
        </div>
        <button
          onClick={() => void loadData()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {/* Set Rate Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Set Exchange Rate</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">From Currency</label>
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a]"
            >
              <option value="">Select currency</option>
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">To Currency</label>
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a]"
            >
              <option value="">Select currency</option>
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Rate</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">1</span>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="e.g. 1500.25"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a]"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">1 {fromCurrency} = X {toCurrency}</p>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Effective At (optional)</label>
            <input
              type="datetime-local"
              value={effectiveAt}
              onChange={(e) => setEffectiveAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a]"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Source (optional)</label>
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. manual, ecb, openexchangerates"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a]"
            />
          </div>
          <div className="lg:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={saving || !fromCurrency || !toCurrency || !rate || fromCurrency === toCurrency}
              className="w-full px-4 py-2.5 bg-[#16a34a] text-white text-sm font-medium rounded-lg hover:bg-[#15803d] disabled:opacity-50"
            >
              {saving ? 'Setting…' : 'Set Rate'}
            </button>
          </div>
        </form>
      </div>

      {/* Exchange Rates Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Current Exchange Rates</h2>
          <p className="text-sm text-gray-500">
            {rates.length} rate{rates.length !== 1 ? 's' : ''} recorded.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">From</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">To</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Rate</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Effective At</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rates.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2-3 .895-3-2 1.343-2-3-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 18H5a2 2 0 01-2-2V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v9a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">No exchange rates yet</p>
                      <p className="text-xs text-gray-500 mt-1">Set your first rate using the form above.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              rates.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-[#16a34a]/10 text-[#16a34a]">
                      {r.fromCurrency}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-[#16a34a]/10 text-[#16a34a]">
                      {r.toCurrency}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-gray-900">
                    {r.rate.toFixed(4)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{formattedDate(r.effectiveAt)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-400">{r.source || '—'}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Reference: Rates against base (USD) */}
      <div className="mt-8 bg-[#16a34a]/5 rounded-xl border border-[#16a34a]/20 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Rates Against Base (USD)</h2>
        <p className="text-xs text-gray-500 mb-4">
          Latest rate for 1 USD → each currency (most recent effective date).
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {currencies
            .filter((c) => c.code !== baseCurrency)
            .map((c) => {
              const rate = getRate(baseCurrency, c.code);
              return (
                <div key={c.code} className="bg-white p-4 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{c.code}</span>
                    <span className="text-xs text-gray-400">{c.name}</span>
                  </div>
                  <div className="text-xl font-mono font-bold text-[#16a34a]">
                    {rate !== null ? rate.toFixed(4) : '—'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {rate !== null ? `1 USD = ${rate.toFixed(4)} ${c.code}` : 'No rate set'}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
