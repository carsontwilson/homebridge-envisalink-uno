import type { API } from 'homebridge';
import { EnvisalinkUnoPlatform } from './platform.js';

export default (api: API) => {
  api.registerPlatform('EnvisalinkUNO', EnvisalinkUnoPlatform);
};
