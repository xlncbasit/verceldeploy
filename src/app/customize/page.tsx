import { Suspense } from 'react';
import CustomizeContent from './CustomizeContent';
import Loading from '@/components/ui/loading';

export default function CustomizePage() {
  return (
    <Suspense fallback={<Loading />}>
      <CustomizeContent />
    </Suspense>
  );
}