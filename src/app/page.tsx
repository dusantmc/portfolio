'use client';

import { useState, Suspense, useEffect } from 'react';
import Clarity from '@microsoft/clarity';
import LeftPanel from '@/components/LeftPanel';
import RightPanel from '@/components/RightPanel';
import MetaRobots from '@/components/MetaRobots';
import CustomMetaTags from '@/components/CustomMetaTags';

export default function Home() {
  const [activeTab, setActiveTab] = useState('intro');

  useEffect(() => {
    Clarity.init('u6yojs5f1t');
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <MetaRobots />
        <CustomMetaTags />
      </Suspense>
      <div className="app-shell">
        <LeftPanel activeTab={activeTab} setActiveTab={setActiveTab} />
        <RightPanel />
      </div>
    </>
  );
}
