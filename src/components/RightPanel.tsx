'use client';

import ProjectCard from './ProjectCard';

const RightPanel: React.FC = () => {
  // Sample project data
  const projects = [
    {
      id: 1,
      title: "EV Charging App",
      description: "Find and qualify charging sites in minutes",
      subtitle: "Quickly identify and assess charging sites near you so you don't lose your spark on the road.",
      features: [
        "Locate nearby amenities",
        "Access EV and traffic data", 
        "24/7 support"
      ],
      cta: "Get started for free",
      image: "/api/placeholder/600/400",
      rating: "4.4/5",
      location: "1 Infinite Loop, Cupertino, CA 95014, USA",
      stats: "324 drivers have used this charging site in the last 7 days.",
      traffic: "72,738 vehicles",
      amenities: "Within a 10 minute walk"
    },
    {
      id: 2,
      title: "Mobile Discovery App",
      description: "Discover new experiences",
      subtitle: "A mobile app that helps users discover and explore new places, activities, and experiences in their city.",
      features: [
        "Personalized recommendations",
        "Social sharing features",
        "Offline maps support"
      ],
      cta: "Download now",
      image: "/api/placeholder/600/400",
      rating: "4.8/5",
      location: "Available worldwide",
      stats: "Over 1M downloads",
      traffic: "50,000+ daily users",
      amenities: "24/7 customer support"
    },
    {
      id: 3,
      title: "SaaS Dashboard",
      description: "Analytics made simple",
      subtitle: "A comprehensive dashboard for SaaS companies to track user engagement, revenue metrics, and growth analytics.",
      features: [
        "Real-time analytics",
        "Custom reports",
        "Team collaboration"
      ],
      cta: "Start free trial",
      image: "/api/placeholder/600/400",
      rating: "4.6/5",
      location: "Cloud-based platform",
      stats: "Trusted by 500+ companies",
      traffic: "10,000+ active users",
      amenities: "Enterprise support"
    },
    {
      id: 4,
      title: "E-commerce Platform",
      description: "Sell anything, anywhere",
      subtitle: "A complete e-commerce solution that helps businesses create beautiful online stores and manage their inventory.",
      features: [
        "Drag-and-drop builder",
        "Payment integration",
        "Inventory management"
      ],
      cta: "Create your store",
      image: "/api/placeholder/600/400",
      rating: "4.7/5",
      location: "Global marketplace",
      stats: "Powering 10,000+ stores",
      traffic: "1M+ monthly transactions",
      amenities: "24/7 technical support"
    }
  ];

  return (
    <div className="w-full lg:w-2/3 bg-white overflow-y-auto">
      <div className="p-4 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RightPanel;
