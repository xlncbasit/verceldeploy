import { Suspense } from 'react';
import RedirectComponent from '@/components/RedirectComponent';
import Loading from '@/components/ui/loading';

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <RedirectComponent />
    </Suspense>
  );
}
