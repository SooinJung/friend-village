import { makeScreen } from '../../dc/runtime.jsx';
import FaceDrawLogic, { defaults } from './logic.js';
import renderFaceDraw from './view.jsx';
import './style.css';

export default makeScreen('FaceDraw', FaceDrawLogic, renderFaceDraw, defaults);
