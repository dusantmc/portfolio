'use client';

import { motion, AnimatePresence } from 'framer-motion';
import TabContent from './TabContent';

interface LeftPanelProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const LeftPanel: React.FC<LeftPanelProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'intro', label: 'Intro' },
    { id: 'resume', label: 'Resume' },
    { id: 'about', label: 'About me' }
  ];

  return (
    <div className="w-full lg:w-1/3 min-h-screen bg-white border-r border-gray-200 lg:sticky lg:top-0 flex flex-col">
      {/* Navigation Tabs */}
      <div className="p-4 lg:p-8 pb-4">
        <nav className="flex space-x-4 lg:space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-sm font-medium transition-colors duration-200 ${
                activeTab === tab.id
                  ? 'text-black border-b-2 border-black pb-1'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content with Animation */}
      <div className="flex-1 px-4 lg:px-8 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <TabContent activeTab={activeTab} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-4 lg:p-8 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>© 2025 Copyrights line</span>
          <div className="flex space-x-4">
            <a href="#" className="hover:text-black transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-black transition-colors">X</a>
            <a href="#" className="hover:text-black transition-colors">Upwork</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeftPanel;
