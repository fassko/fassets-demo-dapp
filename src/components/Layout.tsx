'use client';

import Header from '@/components/Header';
import Navigation from '@/components/Navigation';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className='font-sans min-h-screen bg-gray-50'>
      <div className='sticky top-0 z-50'>
        <Header />
        <div className='z-40 bg-gray-50'>
          <Navigation />
        </div>
      </div>
      <div className='p-4 md:p-8'>
        <main className='flex flex-col gap-2'>{children}</main>
      </div>
    </div>
  );
}
