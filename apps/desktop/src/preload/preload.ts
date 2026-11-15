import { contextBridge, ipcRenderer } from 'electron';
import { createBridge } from './createBridge/createBridge.ts';

contextBridge.exposeInMainWorld(
  'dashcash',
  createBridge((channel, ...args) => ipcRenderer.invoke(channel, ...args)),
);
