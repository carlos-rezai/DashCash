import { contextBridge, ipcRenderer } from 'electron';
import { isChannel } from '@dashcash/contract';
import { createBridge } from './createBridge/createBridge.ts';

contextBridge.exposeInMainWorld(
  'dashcash',
  createBridge(
    (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    isChannel,
  ),
);
