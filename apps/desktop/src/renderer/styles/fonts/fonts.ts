// The self-hosted fonts: Barlow 400, 500, 600 and Barlow Condensed 500, 600,
// served from node_modules by the bundler. Nothing loads a font from the
// network. Storybook's preview imports this module now, the App later.
/// <reference types="vite/client" />
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
