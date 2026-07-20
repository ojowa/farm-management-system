'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui';
import { marketplaceAPI } from '@/lib/api';

interface Buyer {
  id: string;
  name: string;
  location: string;
  products: string[];
  rating?: number;
}

interface Listing {
  id: string;
  title: string;
  crop: string;
  quantity: string;
  price: string;
  status: string;
  seller: string;
}

type Tab = 'buyers' | 'listings';

export default function MarketplacePage() {
  const [tab, setTab] = useState<Tab>('listings');
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [buyersRes, listingsRes] = await Promise.all([
          marketplaceAPI.listBuyers().catch(() => ({ data: [] })),
          marketplaceAPI.listListings().catch(() => ({ data: [] })),
        ]);
        setBuyers(buyersRes.data.buyers || buyersRes.data || []);
        setListings(listingsRes.data.listings || listingsRes.data || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const filteredBuyers = useMemo(() => {
    if (!search) return buyers;
    const q = search.toLowerCase();
    return buyers.filter((b) => b.name.toLowerCase().includes(q) || b.location.toLowerCase().includes(q));
  }, [buyers, search]);

  const filteredListings = useMemo(() => {
    if (!search) return listings;
    const q = search.toLowerCase();
    return listings.filter((l) => l.title.toLowerCase().includes(q) || l.crop.toLowerCase().includes(q));
  }, [listings, search]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Marketplace</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Connect with buyers and view listings</p>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('listings')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'listings' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
        >
          Listings
        </button>
        <button
          onClick={() => setTab('buyers')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'buyers' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
        >
          Buyers
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder={tab === 'buyers' ? 'Search buyers...' : 'Search listings...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading marketplace...</div>
        ) : tab === 'buyers' ? (
          filteredBuyers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No buyers found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Name</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Location</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Products</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBuyers.map((buyer) => (
                    <tr key={buyer.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{buyer.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{buyer.location}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{buyer.products?.join(', ') || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{buyer.rating ? `${buyer.rating}/5` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          filteredListings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No listings found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Title</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Crop</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Quantity</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Price</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Seller</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredListings.map((listing) => (
                    <tr key={listing.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{listing.title}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{listing.crop}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{listing.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{listing.price}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{listing.seller}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          {listing.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </Card>
    </div>
  );
}
