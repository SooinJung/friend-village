import { makeScreen } from '../../dc/runtime.jsx';
import VillageLogic, { defaults } from './logic.js';
import renderVillage from './view.jsx';
import './style.css';

export default makeScreen('Village', VillageLogic, renderVillage, defaults);
