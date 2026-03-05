import { useState, useRef, useEffect } from 'react';
import './Home.css';

const orbitItems = [
  { 
    image: '/uploads/home/5661772591473_.pic.jpg',
    label: 'Google', 
    size: 50
  },
  { 
    image: '/uploads/home/beauty_1679598666156.JPG',
    label: 'OpenAI', 
    size: 50
  },
  { 
    image: '/uploads/home/zz4641723786956_.pic.jpg',
    label: 'AI助手', 
    size: 50
  },
  { 
    image: '/uploads/home/3881767168405_.pic.jpg',
    label: '智能', 
    size: 192
  },
];

const cardContent = {
  nameLabel: 'My name is:',
  flipWords: ['ZAIYEBUHUI', '再也不会'],
  description: '———————————————————————————————',
  roles: [
    'Influencer (>1 followers)',
    'Web Developer',
    'Game Developer',
    'Game Critic',
    'Digital Nomad',
    'Trader'
  ]
};

function FlipWords({ words, duration = 3000 }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
        setIsAnimating(false);
      }, 500);
    }, duration);
    return () => clearInterval(interval);
  }, [words.length, duration]);

  return (
    <span className={`flip-word ${isAnimating ? 'flip-out' : 'flip-in'}`}>
      {words[currentIndex]}
    </span>
  );
}

function ThreeDCard({ width = '412px', height = '458px' }) {
  const cardRef = useRef(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -10;
      const rotateY = ((x - centerX) / centerX) * 10;
      
      setRotation({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
      setRotation({ x: 0, y: 0 });
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div 
      ref={cardRef}
      className="three-d-card"
      style={{
        width,
        height,
        '--rotate-x': `${rotation.x}deg`,
        '--rotate-y': `${rotation.y}deg`
      }}
    >
      <div className="three-d-card-content">
        <p className="card-name-label">{cardContent.nameLabel}</p>
        <h1 className="card-name">
          <FlipWords words={cardContent.flipWords} duration={3000} />
        </h1>
        <p className="card-description">{cardContent.description}</p>
        <div className="card-roles">
          {cardContent.roles.map((role, index) => (
            <span key={index} className="card-role">{role}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="home-page">
      <div className="orbit-wrapper">
        <div className="orbit-section">
          <ThreeDCard width="412px" height="458px" />
          
          <div className="orbit-ring orbit-ring-1">
            {orbitItems.slice(0, 2).map((item, index) => (
              <div
                key={item.label}
                className="orbit-icon orbit-icon-img"
                style={{ 
                  '--i': index, 
                  '--size': item.size + 'px'
                }}
              >
                <img src={item.image} alt={item.label} />
              </div>
            ))}
          </div>
          
          <div className="orbit-ring orbit-ring-2">
            {orbitItems.slice(2).map((item, index) => (
              <div
                key={item.label}
                className="orbit-icon orbit-icon-img"
                style={{ 
                  '--i': index, 
                  '--size': item.size + 'px'
                }}
              >
                <img src={item.image} alt={item.label} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
