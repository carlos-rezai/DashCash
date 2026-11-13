import { app, BrowserWindow, net, protocol, screen, session } from 'electron';
import { startApp } from './startApp/startApp.ts';

startApp({ app, BrowserWindow, screen, protocol, net, session }, process.env);
