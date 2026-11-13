import { app, BrowserWindow } from 'electron';
import { startApp } from './startApp/startApp.ts';

startApp({ app, BrowserWindow }, process.env);
