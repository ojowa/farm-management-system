import AppLayout from '@/components/AppLayout';
import ReconnectingBanner from '@/components/ReconnectingBanner';
import OfflineBanner from '@/components/OfflineBanner';

export const dynamic = 'force-dynamic';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ReconnectingBanner />
      <OfflineBanner />
      <AppLayout>{children}</AppLayout>
    </>
  );
}
