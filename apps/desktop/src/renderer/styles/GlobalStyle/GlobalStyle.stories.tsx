import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

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
// styles.css: :focus-visible { outline: 2px solid var(--color-accent) },
// dashcash-dark.css --color-accent #749dc4
const FOCUS_ACCENT = 'rgb(116, 157, 196)';

// The first family of a computed font-family list, without its quotes.
function firstFamily(element: Element): string {
  const [first = ''] = getComputedStyle(element).fontFamily.split(',');
  return first.trim().replace(/^["']|["']$/g, '');
}

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
      firstFamily(canvas.getByText('Every balance from your last import.')),
    ).toBe('Barlow');
    await expect(
      firstFamily(canvas.getByRole('heading', { name: 'Accounts' })),
    ).toBe('Barlow Condensed');
  },
};

export const LinkInAccent: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = canvas.getByRole('link', { name: 'Import a statement' });

    await expect(getComputedStyle(link).color).toBe(LINK_ACCENT);
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
