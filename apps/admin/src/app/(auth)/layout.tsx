'use client';

import React from 'react';
import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/lib/toasts';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="min-h-screen flex">
          {/* Left side - branding (desktop only) */}
          <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center p-12">
            <div className="max-w-md text-center">
              <h1 className="text-4xl font-bold text-primary-foreground mb-4">
                Farm Management System
              </h1>
              <p className="text-lg text-primary-foreground/80">
                Complete farm management solution for modern agriculture.
                Track crops, livestock, poultry, finances, and more.
              </p>
              <div className="mt-12 grid grid-cols-3 gap-4 text-primary-foreground/70 text-sm">
                <div>
                  <div className="text-2xl font-bold">500+</div>
                  <div>Farms Managed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">50K+</div>
                  <div>Animals Tracked</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">99.9%</div>
                  <div>Uptime</div>
                </div>
              </div>
            </div>
          </div>
          {/* Right side - auth forms */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-md">{children}</div>
          </div>
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}