export * from './core/index.js';
export * from './assets/index.js';
import { library } from './assets/index.js';
import { renderDocument } from './core/svg.js';
export const renderSvg = (doc, opts) => renderDocument(doc, library, opts);
