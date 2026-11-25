import { useEffect, useState } from 'react';
import Village from './screens/Village/index.jsx';

const W = 390;
const H = 844;

// Fit the 390x844 phone screen into any window without changing its pixel layout.
function useFitScale() {
  const calc = () => {
    const pad = window.innerWidth <= 500 ? 0 : 16;
    return Math.min(1, (window.innerWidth - pad) / W, (window.innerHeight - pad) / H);
  };
  const [scale, setScale] = useState(calc);
  useEffect(() => {
    const on = () => setScale(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return scale;
}

export default function App() {
  const scale = useFitScale();
  return (
    <main className="stage">
      <div className="phone" style={{ width: W * scale, height: H * scale }}>
        <div className="phone-inner" style={{ width: W, height: H, transform: `scale(${scale})` }}>
          <Village />
        </div>
      </div>
    </main>
  );
}
