import { makeScreen } from '../../dc/runtime.jsx';
import CafeLogic, { defaults } from './logic.js';
import renderCafe from './view.jsx';
import './style.css';

export default makeScreen('Cafe', CafeLogic, renderCafe, defaults);
