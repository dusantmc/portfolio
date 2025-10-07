'use client';

import { motion } from 'framer-motion';

interface Project {
  id: number;
  title: string;
  description: string;
  subtitle: string;
  features: string[];
  cta: string;
  image: string;
  rating: string;
  location: string;
  stats: string;
  traffic: string;
  amenities: string;
}

interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden"
    >
      {/* Project Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-600">Tracker</span>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <a href="#" className="text-gray-600 hover:text-black">Pricing</a>
            <a href="#" className="text-gray-600 hover:text-black">Changelog</a>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xl lg:text-2xl font-bold text-black mb-2">
              {project.description}
            </h3>
            <p className="text-sm lg:text-base text-gray-600 leading-relaxed">
              {project.subtitle}
            </p>
          </div>

          {/* CTA Button */}
          <button className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors duration-200">
            {project.cta}
          </button>

          {/* Features */}
          <div className="space-y-2">
            {project.features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Project Visual/Stats Section */}
      <div className="bg-gray-50 p-6">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          {/* Rating and Stats */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                {project.rating}
              </span>
            </div>
            <button className="text-sm text-gray-600 hover:text-black">Log in</button>
          </div>

          {/* Location */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-900">{project.location}</p>
            <p className="text-xs text-gray-600 mt-1">{project.stats}</p>
          </div>

          {/* Traffic Stats */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-600">Avg. daily traffic</p>
              <p className="text-sm font-medium text-gray-900">{project.traffic}</p>
              <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium mt-1">
                HIGH
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-600">Nearby amenities</p>
              <p className="text-sm font-medium text-gray-900">{project.amenities}</p>
              <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium mt-1">
                HIGH
              </span>
            </div>
          </div>

          {/* More Info Link */}
          <div className="flex items-center justify-between">
            <a href="#" className="text-sm text-gray-600 hover:text-black flex items-center space-x-1">
              <span>More info</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectCard;
