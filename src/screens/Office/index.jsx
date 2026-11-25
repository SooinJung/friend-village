import { makeScreen } from '../../dc/runtime.jsx';
import OfficeLogic, { defaults } from './logic.js';
import renderOffice from './view.jsx';
import './style.css';

export default makeScreen('Office', OfficeLogic, renderOffice, defaults);
