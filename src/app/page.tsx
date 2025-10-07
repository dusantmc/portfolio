'use client';

import { useState, Suspense } from 'react';
import LeftPanel from '@/components/LeftPanel';
import RightPanel from '@/components/RightPanel';
import MetaRobots from '@/components/MetaRobots';

export default function Home() {
  const [activeTab, setActiveTab] = useState('intro');

  return (
    <>
      <Suspense fallback={null}>
        <MetaRobots />
      </Suspense>
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left Panel - Sticky on desktop, full width on mobile */}
        <LeftPanel activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {/* Right Panel - Scrollable */}
        <RightPanel />
      </div>
    </>
  );
}
