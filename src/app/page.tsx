'use client';

import { useRouter } from 'next/navigation';

import Layout from '@/components/Layout';
import Settings from '@/components/Settings';

export default function Home() {
  const router = useRouter();

  const handleNavigate = (tab: string) => {
    router.push(`/${tab}`);
  };

  return (
    <Layout>
      <Settings onNavigate={handleNavigate} />
    </Layout>
  );
}
