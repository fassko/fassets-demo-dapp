'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

export default function DirectMintRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/mint');
  }, [router]);

  return null;
}
