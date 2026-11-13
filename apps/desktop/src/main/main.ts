import { app, BrowserWindow, screen } from 'electron';
import { startApp } from './startApp/startApp.ts';

startApp({ app, BrowserWindow, screen }, process.env);
