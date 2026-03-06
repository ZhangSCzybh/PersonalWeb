import React from 'react'
import { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '🥰',  '🤩', '😘', '😗', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',  '😐', '😑', '😶',  '😮‍', '🤥', '🤤', '😴', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];

function ClickEffect() {
  const [clicks, setClicks] = useState([]);

  const handleClick = useCallback((e) => {
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    const id = Date.now() + Math.random();
    
    setClicks(prev => [...prev, {
      id,
      x: e.clientX,
      y: e.clientY,
      emoji
    }]);

    setTimeout(() => {
      setClicks(prev => prev.filter(click => click.id !== id));
    }, 1000);
  }, []);

  const handleMoleWhacked = useCallback((e) => {
    const moleEmojis = ['🎉', '⭐', '💫', '✨', '🌟', '💥', '🎯', '👏', '🙌', '🤜', '👊'];
    const emoji = moleEmojis[Math.floor(Math.random() * moleEmojis.length)];
    const id = Date.now() + Math.random();
    const { x, y } = e.detail;
    
    setClicks(prev => [...prev, {
      id,
      x,
      y,
      emoji,
      isMoleHit: true
    }]);

    setTimeout(() => {
      setClicks(prev => prev.filter(click => click.id !== id));
    }, 1000);
  }, []);

  useEffect(() => {
    document.addEventListener('click', handleClick);
    document.addEventListener('moleWhacked', handleMoleWhacked);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('moleWhacked', handleMoleWhacked);
    };
  }, [handleClick, handleMoleWhacked]);

  return (
    <>
      {clicks.map(click => (
        <span
          key={click.id}
          style={{
            position: 'fixed',
            left: click.x,
            top: click.y,
            fontSize: click.isMoleHit ? '36px' : '24px',
            pointerEvents: 'none',
            zIndex: 9999,
            animation: click.isMoleHit ? 'moleHit 1s ease-out forwards' : 'floatAway 1s ease-out forwards',
            transform: 'translate(-50%, -50%)'
          }}
        >
          {click.emoji}
        </span>
      ))}
      <style>{`
        @keyframes floatAway {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -150%) scale(1.5) rotate(360deg);
          }
        }
        @keyframes moleHit {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(0.5);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -100%) scale(1.5);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -200%) scale(2) rotate(180deg);
          }
        }
      `}</style>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClickEffect />
    <App />
  </React.StrictMode>,
)
