import type { Preview } from '@storybook/react-vite';
import { ThemeProvider } from 'styled-components';
import { theme } from '../apps/desktop/src/renderer/tokens/index.ts';
import '../apps/desktop/src/renderer/types/styledTheme/styledTheme.ts';
import '../apps/desktop/src/renderer/styles/fonts/fonts.ts';
import { GlobalStyle } from '../apps/desktop/src/renderer/styles/GlobalStyle/GlobalStyle.ts';
import { a11y } from './a11y.ts';

const preview: Preview = {
  parameters: { a11y },
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default preview;
