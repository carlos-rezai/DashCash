import { app, BrowserWindow, net, protocol, screen } from 'electron';
import { startApp } from './startApp/startApp.ts';

startApp({ app, BrowserWindow, screen, protocol, net }, process.env);
