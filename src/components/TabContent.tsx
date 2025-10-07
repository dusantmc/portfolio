'use client';

interface TabContentProps {
  activeTab: string;
}

const TabContent: React.FC<TabContentProps> = ({ activeTab }) => {
  const renderIntroContent = () => (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold text-black mb-4">
          Hi, I&apos;m Dusan! 👋
        </h1>
        <h2 className="text-4xl lg:text-5xl font-bold text-black mb-6">
          I design products that work.
        </h2>
        <p className="text-base lg:text-lg text-gray-700 leading-relaxed">
          I help founders and teams transform rough ideas into smooth experiences. 
          Specialized in SaaS platforms, mobile apps, and everything in between.
        </p>
      </div>

      {/* Call to Action */}
      <div className="space-y-4">
        <button className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors duration-200">
          Book a call
        </button>
        <p className="text-gray-600">dusantomic@gmail.com</p>
      </div>

      {/* Trusted by Section */}
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Trusted by fast-paced startups in crypto, real estate, and beyond.
        </p>
        <div className="flex items-center space-x-6 opacity-60">
          {/* Placeholder logos */}
          <div className="w-8 h-8 bg-gray-300 rounded"></div>
          <div className="w-8 h-8 bg-gray-300 rounded"></div>
          <div className="w-8 h-8 bg-gray-300 rounded"></div>
          <div className="w-8 h-8 bg-gray-300 rounded"></div>
          <div className="w-8 h-8 bg-gray-300 rounded"></div>
          <div className="w-8 h-8 bg-gray-300 rounded"></div>
          <div className="w-8 h-8 bg-gray-300 rounded"></div>
        </div>
      </div>
    </div>
  );

  const renderResumeContent = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-black mb-6">Resume</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-black mb-2">Experience</h3>
          <div className="space-y-4">
            <div className="border-l-2 border-gray-200 pl-4">
              <h4 className="font-medium text-black">Senior Product Designer</h4>
              <p className="text-sm text-gray-600">Company Name • 2022 - Present</p>
              <p className="text-gray-700 mt-1">Led design for multiple SaaS products...</p>
            </div>
            <div className="border-l-2 border-gray-200 pl-4">
              <h4 className="font-medium text-black">Product Designer</h4>
              <p className="text-sm text-gray-600">Previous Company • 2020 - 2022</p>
              <p className="text-gray-700 mt-1">Designed mobile applications...</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-black mb-2">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {['Figma', 'Sketch', 'Adobe Creative Suite', 'Prototyping', 'User Research', 'Design Systems'].map((skill) => (
              <span key={skill} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAboutContent = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-black mb-6">About me</h2>
      
      <div className="space-y-4">
        <p className="text-gray-700 leading-relaxed">
          I&apos;m a passionate product designer with over 5 years of experience creating 
          digital experiences that users love. I believe in the power of good design 
          to solve real problems and drive business success.
        </p>
        
        <p className="text-gray-700 leading-relaxed">
          When I&apos;m not designing, you can find me exploring new technologies, 
          reading about design trends, or hiking in the mountains. I&apos;m always 
          eager to learn and grow in this ever-evolving field.
        </p>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-black mb-2">Fun Facts</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Coffee enthusiast ☕</li>
            <li>• Travel lover ✈️</li>
            <li>• Dog person 🐕</li>
            <li>• Night owl 🌙</li>
          </ul>
        </div>
      </div>
    </div>
  );

  switch (activeTab) {
    case 'intro':
      return renderIntroContent();
    case 'resume':
      return renderResumeContent();
    case 'about':
      return renderAboutContent();
    default:
      return renderIntroContent();
  }
};

export default TabContent;
