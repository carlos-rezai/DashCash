import type { Meta, StoryObj } from '@storybook/react-vite';
import styled from 'styled-components';
import { expect, userEvent, within } from 'storybook/test';

import { readFirstFamily } from '../../test-support/readFirstFamily/readFirstFamily.ts';
import { readHoveredStyle } from '../../test-support/readHoveredStyle/readHoveredStyle.ts';

// The proof of the global style (design log I3): Storybook's preview wraps
// every Story in GlobalStyle and imports the fonts, so these Stories render
// plain elements and read what the browser computes for them. The expected
// values are the prototype's final dark values (design log Q11, Q13):
// docs/design/prototype/tokens/dashcash-dark.css over Industry's styles.css.

// --color-bg #1b2a39
const GROUND = 'rgb(27, 42, 57)';
// --color-text #e9f1fa
const INK = 'rgb(233, 241, 250)';
// dashcash-dark.css: a { color: var(--color-accent-600) }, #94bce3
const LINK_ACCENT = 'rgb(148, 188, 227)';
// dashcash-dark.css: a:hover { color: var(--color-accent-700) }, #b5d9fd
const LINK_HOVER = 'rgb(181, 217, 253)';
// styles.css: :focus-visible { outline: 2px solid var(--color-accent) },
// dashcash-dark.css --color-accent #749dc4
const FOCUS_ACCENT = 'rgb(116, 157, 196)';

function normaliseWeight(weight: string): string {
  if (weight === 'normal') return '400';
  if (weight === 'bold') return '700';
  return weight;
}

// Asks the browser for one face and returns the faces it loaded for it, as
// "<family> <weight> <status>".
async function loadFace(
  family: 'Barlow' | 'Barlow Condensed',
  weight: '400' | '500' | '600',
): Promise<string[]> {
  const faces = await document.fonts.load(`${weight} 16px "${family}"`);
  return faces.map(
    (face) =>
      `${face.family.replace(/["']/g, '')} ${normaliseWeight(face.weight)} ${face.status}`,
  );
}

const FONT_FILE = /\.(woff2?|ttf|otf)$/;

function Sample() {
  return (
    <main>
      <h1>Accounts</h1>
      <p>Every balance from your last import.</p>
      <a href="#import">Import a statement</a>
      <button type="button">Save</button>
      <button type="button" disabled>
        Delete
      </button>
    </main>
  );
}

// An invented image, inline so nothing loads from the network.
const IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='20'/%3E";

// Every element the element rules of Industry's styles.css reach.
function Elements() {
  return (
    <main>
      <h1>Heading one</h1>
      <h2>Heading two</h2>
      <h3>Heading three</h3>
      <h4>Heading four</h4>
      <h5>Heading five</h5>
      <h6>Heading six</h6>
      <p>Every balance from your last import.</p>
      <a href="#import">Import a statement</a>
      <figure>
        <img alt="Statement preview" src={IMAGE} />
      </figure>
    </main>
  );
}

// styles.css: h1 to h6 { line-height: 1.12; letter-spacing: -0.015em;
// margin: 0 0 var(--space-2) }, then the sizes; h6 letter-spacing 0.08em.
const HEADINGS = [
  { level: 1, size: 42, letterSpacing: -0.015 },
  { level: 2, size: 32, letterSpacing: -0.015 },
  { level: 3, size: 25, letterSpacing: -0.015 },
  { level: 4, size: 20, letterSpacing: -0.015 },
  { level: 5, size: 16, letterSpacing: -0.015 },
  { level: 6, size: 13, letterSpacing: 0.08 },
] as const;

const HEADING_LINE_HEIGHT = 1.12;
// --space-2 and --space-3 at 0.85x density
const SPACE_2 = '6.8px';
const SPACE_3 = '10.2px';

// A page twice as tall as the viewport.
const TallPage = styled.main`
  height: 200vh;
`;

function px(value: string): number {
  return Number.parseFloat(value);
}

const meta = {
  title: 'Styles/GlobalStyle',
  render: () => <Sample />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const GroundAndInk: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = canvasElement.ownerDocument.body;

    await expect(getComputedStyle(body).backgroundColor).toBe(GROUND);
    await expect(getComputedStyle(body).color).toBe(INK);
    await expect(
      getComputedStyle(canvas.getByText('Every balance from your last import.'))
        .color,
    ).toBe(INK);
  },
};

export const FontFamilies: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      readFirstFamily(
        getComputedStyle(
          canvas.getByText('Every balance from your last import.'),
        ),
      ),
    ).toBe('Barlow');
    await expect(
      readFirstFamily(
        getComputedStyle(canvas.getByRole('heading', { name: 'Accounts' })),
      ),
    ).toBe('Barlow Condensed');
  },
};

// The link while its resting colour is read: the container holds it out of the
// pointer's reach, because Chromium on Linux can apply :hover without pointer
// movement.
const RestingFrame = styled.div`
  pointer-events: none;
`;

export const LinkInAccent: Story = {
  render: () => (
    <RestingFrame>
      <Sample />
    </RestingFrame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = canvas.getByRole('link', { name: 'Import a statement' });

    await expect(link.matches(':hover'), 'hovered').toBe(false);
    await expect(getComputedStyle(link).color, 'resting').toBe(LINK_ACCENT);
    await expect(
      readHoveredStyle(link, (style) => style.color),
      'hovered colour',
    ).toBe(LINK_HOVER);
  },
};

export const KeyboardFocusRing: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = canvas.getByRole('link', { name: 'Import a statement' });

    await userEvent.tab();

    await expect(link).toHaveFocus();
    await expect(link.matches(':focus-visible')).toBe(true);
    const style = getComputedStyle(link);
    await expect(style.outlineStyle).toBe('solid');
    await expect(style.outlineWidth).toBe('2px');
    await expect(style.outlineColor).toBe(FOCUS_ACCENT);
    await expect(style.outlineOffset).toBe('2px');
  },
};

export const DisabledButtonCursor: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      getComputedStyle(canvas.getByRole('button', { name: 'Delete' })).cursor,
    ).toBe('not-allowed');
  },
};

export const FontsLoaded: Story = {
  play: async () => {
    await expect(await loadFace('Barlow', '400')).toContain(
      'Barlow 400 loaded',
    );
    await expect(await loadFace('Barlow', '500')).toContain(
      'Barlow 500 loaded',
    );
    await expect(await loadFace('Barlow', '600')).toContain(
      'Barlow 600 loaded',
    );
    await expect(await loadFace('Barlow Condensed', '500')).toContain(
      'Barlow Condensed 500 loaded',
    );
    await expect(await loadFace('Barlow Condensed', '600')).toContain(
      'Barlow Condensed 600 loaded',
    );

    // Nothing loads a font from the network: every font file comes from the
    // app itself.
    const fontOrigins = performance
      .getEntriesByType('resource')
      .map((entry) => new URL(entry.name))
      .filter(
        (url) =>
          FONT_FILE.test(url.pathname) || url.hostname.startsWith('fonts.'),
      )
      .map((url) => url.origin);
    for (const origin of fontOrigins) {
      await expect(origin).toBe(window.location.origin);
    }
  },
};

export const BorderBox: Story = {
  render: () => <Elements />,
  play: async ({ canvasElement }) => {
    const main = within(canvasElement).getByRole('main');

    await expect(getComputedStyle(main).boxSizing).toBe('border-box');
    await expect(getComputedStyle(main, '::before').boxSizing).toBe(
      'border-box',
    );
    await expect(getComputedStyle(main, '::after').boxSizing).toBe(
      'border-box',
    );
  },
};

export const DarkColorScheme: Story = {
  play: async ({ canvasElement }) => {
    const root = canvasElement.ownerDocument.documentElement;

    await expect(getComputedStyle(root).colorScheme).toBe('dark');
  },
};

export const PageAndBody: Story = {
  render: () => <TallPage />,
  play: async ({ canvasElement }) => {
    const html = canvasElement.ownerDocument.documentElement;
    const body = canvasElement.ownerDocument.body;
    // The viewport's height: the root element's client height.
    const viewport = `${String(html.clientHeight)}px`;

    // The page is taller than the viewport, so only height: 100 % keeps
    // html and body at the viewport's height. Their margin 0 is left out:
    // the story-test harness already sets html and body to margin 0, so no
    // assertion on it could fail without the rule.
    for (const element of [html, body]) {
      await expect(
        getComputedStyle(element).height,
        `${element.tagName} height`,
      ).toBe(viewport);
    }

    const style = getComputedStyle(body);
    await expect(style.fontSize).toBe('15px');
    await expect(style.lineHeight).toBe('23.25px');
    await expect(style.getPropertyValue('-webkit-font-smoothing')).toBe(
      'antialiased',
    );
  },
};

export const Headings: Story = {
  render: () => <Elements />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    for (const heading of HEADINGS) {
      const style = getComputedStyle(
        canvas.getByRole('heading', { level: heading.level }),
      );
      const name = `h${String(heading.level)}`;
      await expect(style.fontSize, `${name} size`).toBe(
        `${String(heading.size)}px`,
      );
      await expect(px(style.lineHeight), `${name} line height`).toBeCloseTo(
        heading.size * HEADING_LINE_HEIGHT,
        2,
      );
      await expect(
        px(style.letterSpacing),
        `${name} letter spacing`,
      ).toBeCloseTo(heading.size * heading.letterSpacing, 3);
      await expect(style.marginTop, `${name} top margin`).toBe('0px');
      await expect(style.marginBottom, `${name} bottom margin`).toBe(SPACE_2);
    }

    await expect(
      getComputedStyle(canvas.getByRole('heading', { level: 6 })).textTransform,
    ).toBe('uppercase');
  },
};

export const ParagraphLinkImageFigure: Story = {
  render: () => <Elements />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const paragraph = getComputedStyle(
      canvas.getByText('Every balance from your last import.'),
    );
    await expect(paragraph.marginTop).toBe('0px');
    await expect(paragraph.marginBottom).toBe(SPACE_3);

    const link = canvas.getByRole('link', { name: 'Import a statement' });
    await expect(getComputedStyle(link).textUnderlineOffset).toBe('3px');

    const figure = canvas.getByRole('figure');
    const image = within(figure).getByRole('img', {
      name: 'Statement preview',
    });
    await expect(getComputedStyle(image).display).toBe('block');
    await expect(getComputedStyle(image).maxWidth).toBe('100%');
    await expect(getComputedStyle(figure).margin).toBe('0px');
  },
};
