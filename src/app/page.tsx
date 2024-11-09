import { Suspense } from 'react';
import PostRedirect from '@/components/PostRedirect';
import Loading from '@/components/ui/loading';

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <PostRedirect />
    </Suspense>
  );
}
