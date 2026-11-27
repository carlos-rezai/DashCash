import type { Meta, StoryObj } from '@storybook/react-vite';
import styled from 'styled-components';
import { expect, waitFor, within } from 'storybook/test';
import { Loader } from './Loader.tsx';

// The colours a reader sees, written out from SPEC section 2, apart from the
// Theme: Chromium reports computed colours as rgb().
// --color-accent-600 #94bce3
const ACCENT = 'rgb(148, 188, 227)';
// --sb-positive #7cc59a
const GREEN = 'rgb(124, 197, 154)';

// One loop of every motion: 1,6 s (SPEC, Loaders).
const LOOP_MS = 1600;

// The strokes of the mark, wherever the Loader groups them.
const SHAPES = 'path, line, polyline, polygon, circle, ellipse, rect';

type Mark = {
  svg: SVGSVGElement;
  // The full mark only: the C and the solid line.
  c: SVGGraphicsElement | null;
  line: SVGGraphicsElement | null;
  // The three dashes, from the centre outwards along the 45 degree line.
  dashes: SVGGraphicsElement[];
};

function area(shape: SVGGraphicsElement): number {
  const box = shape.getBBox();
  return box.width * box.height;
}

// Finds the one mark inside the status and tells its strokes apart by their
// geometry: the C is the largest, the solid line the next, the dashes the
// smallest, ordered left to right.
async function readMark(
  status: HTMLElement,
  size: number,
  full: boolean,
): Promise<Mark> {
  const svgs = status.querySelectorAll('svg');
  await expect(svgs).toHaveLength(1);
  const svg = svgs.item(0);

  await expect(svg.getAttribute('aria-hidden')).toBe('true');
  const box = svg.getBoundingClientRect();
  await expect(box.width).toBeCloseTo(size, 0);
  await expect(box.height).toBeCloseTo(size, 0);

  const shapes = [...svg.querySelectorAll<SVGGraphicsElement>(SHAPES)].filter(
    (shape) => shape.closest('defs, clipPath, mask, symbol') === null,
  );
  await expect(shapes).toHaveLength(full ? 5 : 3);

  const bySize = [...shapes].sort((a, b) => area(b) - area(a));
  const dashes = (full ? bySize.slice(2) : bySize).sort(
    (a, b) => a.getBBox().x - b.getBBox().x,
  );
  return {
    svg,
    c: full ? (bySize[0] ?? null) : null,
    line: full ? (bySize[1] ?? null) : null,
    dashes,
  };
}

async function expectStroke(mark: Mark, color: string): Promise<void> {
  for (const shape of [mark.c, mark.line, ...mark.dashes]) {
    if (shape !== null) {
      await expect(getComputedStyle(shape).stroke).toBe(color);
    }
  }
}

// How strongly a stroke shows: its opacity times every group's up to the mark.
function opacityOf(shape: Element | null, svg: SVGSVGElement): number {
  let opacity = 1;
  for (
    let element: Element | null = shape;
    element !== null;
    element = element.parentElement
  ) {
    opacity *= Number(getComputedStyle(element).opacity);
    if (element === svg) break;
  }
  return opacity;
}

function opacities(mark: Mark): {
  c: number;
  line: number;
  dashes: number[];
} {
  return {
    c: opacityOf(mark.c, mark.svg),
    line: opacityOf(mark.line, mark.svg),
    dashes: mark.dashes.map((dash) => opacityOf(dash, mark.svg)),
  };
}

// Stops every motion of the story at one moment, counted from its start.
// Moments in the second loop come after the 200 ms fade-in.
function pauseAt(root: Element, ms: number): void {
  for (const animation of root.getAnimations({ subtree: true })) {
    animation.pause();
    animation.currentTime = ms;
  }
}

async function expectOpacities(
  actual: number[],
  expected: number[],
  moment: string,
): Promise<void> {
  await expect(actual, moment).toHaveLength(expected.length);
  for (const [index, value] of expected.entries()) {
    await expect(
      actual[index],
      `${moment}, stroke ${String(index)}`,
    ).toBeCloseTo(value, 2);
  }
}

function rotationOf(shape: SVGGraphicsElement | null): number {
  const matrix = shape?.getScreenCTM();
  return matrix ? (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI : NaN;
}

function centreOf(shape: SVGGraphicsElement | null): DOMPoint | null {
  const matrix = shape?.getScreenCTM();
  return matrix ? new DOMPoint(16, 16).matrixTransform(matrix) : null;
}

const meta = {
  title: 'Primitives/Loader',
  component: Loader,
} satisfies Meta<typeof Loader>;

export default meta;

type Story = StoryObj<typeof meta>;

// The four variants at 48 px, as Component Inventory.dc.html shows them.

// Dash first, cash second: the solid line, the dashes one by one, then the C.
export const Draw: Story = {
  args: { variant: 'draw', size: 48, delay: 0 },
  play: async ({ canvasElement }) => {
    const status = within(canvasElement).getByRole('status', {
      name: 'Loading',
    });
    const mark = await readMark(status, 48, true);
    await expectStroke(mark, ACCENT);

    const at = async (
      percent: number,
      expected: { c: number; line: number; dashes: number[] },
    ): Promise<void> => {
      pauseAt(canvasElement, LOOP_MS + (LOOP_MS * percent) / 100);
      const actual = opacities(mark);
      await expect(actual.line, `line at ${String(percent)} %`).toBeCloseTo(
        expected.line,
        2,
      );
      await expect(actual.c, `C at ${String(percent)} %`).toBeCloseTo(
        expected.c,
        2,
      );
      await expectOpacities(
        actual.dashes,
        expected.dashes,
        `dashes at ${String(percent)} %`,
      );
    };

    await at(20, { line: 1, dashes: [0, 0, 0], c: 0 });
    await at(31, { line: 1, dashes: [1, 0, 0], c: 0 });
    await at(39, { line: 1, dashes: [1, 1, 0], c: 0 });
    await at(47, { line: 1, dashes: [1, 1, 1], c: 0 });
    await at(80, { line: 1, dashes: [1, 1, 1], c: 1 });
  },
};

// C and line still; the dashes pulse 0,2 -> 1 -> 0,2 in turn, 1/6 loop apart.
export const March: Story = {
  args: { variant: 'march', size: 48, delay: 0 },
  play: async ({ canvasElement }) => {
    const status = within(canvasElement).getByRole('status', {
      name: 'Loading',
    });
    const mark = await readMark(status, 48, true);
    await expectStroke(mark, ACCENT);

    // 48 moments across the second loop, so every delay has run out.
    const steps = 48;
    const samples = Array.from({ length: steps }, (_, step) => {
      pauseAt(canvasElement, LOOP_MS + (LOOP_MS * step) / steps);
      return opacities(mark);
    });

    for (const sample of samples) {
      await expect(sample.c).toBeCloseTo(1, 2);
      await expect(sample.line).toBeCloseTo(1, 2);
    }

    const peaks: number[] = [];
    for (const index of [0, 1, 2]) {
      const values = samples.map((sample) => sample.dashes[index] ?? NaN);
      await expect(
        Math.max(...values),
        `dash ${String(index)} at most`,
      ).toBeCloseTo(1, 1);
      await expect(
        Math.min(...values),
        `dash ${String(index)} at least`,
      ).toBeCloseTo(0.2, 2);
      peaks.push(values.indexOf(Math.max(...values)));
    }

    // Each dash peaks 1/6 loop after the one before it.
    const [first = NaN, second = NaN, third = NaN] = peaks;
    await expect((second - first + steps) % steps).toBe(steps / 6);
    await expect((third - second + steps) % steps).toBe(steps / 6);
  },
};

// The C turns around the centre; line and dashes stay still.
export const Orbit: Story = {
  args: { variant: 'orbit', size: 48, delay: 0 },
  play: async ({ canvasElement }) => {
    const status = within(canvasElement).getByRole('status', {
      name: 'Loading',
    });
    const mark = await readMark(status, 48, true);
    await expectStroke(mark, ACCENT);
    const still = [mark.line, ...mark.dashes];

    pauseAt(canvasElement, 0);
    const startAngle = rotationOf(mark.c);
    const startCentre = centreOf(mark.c);
    const startBoxes = still.map((shape) =>
      JSON.stringify(shape?.getBoundingClientRect()),
    );

    // A quarter loop later the C has turned a quarter.
    pauseAt(canvasElement, LOOP_MS / 4);
    await expect(rotationOf(mark.c) - startAngle).toBeCloseTo(90, 0);
    const centre = centreOf(mark.c);
    await expect(centre?.x).toBeCloseTo(startCentre?.x ?? NaN, 1);
    await expect(centre?.y).toBeCloseTo(startCentre?.y ?? NaN, 1);

    await expect(
      still.map((shape) => JSON.stringify(shape?.getBoundingClientRect())),
    ).toEqual(startBoxes);
    const actual = opacities(mark);
    await expectOpacities(
      [actual.c, actual.line, ...actual.dashes],
      [1, 1, 1, 1, 1],
      'a quarter loop',
    );
  },
};

// The dashes light up one after another (20 / 42 / 64 %) and stay lit.
export const Grow: Story = {
  args: { variant: 'grow', size: 48, delay: 0 },
  play: async ({ canvasElement }) => {
    const status = within(canvasElement).getByRole('status', {
      name: 'Loading',
    });
    const mark = await readMark(status, 48, true);
    await expectStroke(mark, ACCENT);

    const at = async (percent: number, dashes: number[]): Promise<void> => {
      pauseAt(canvasElement, LOOP_MS + (LOOP_MS * percent) / 100);
      const actual = opacities(mark);
      await expect(actual.c, `C at ${String(percent)} %`).toBeCloseTo(1, 2);
      await expect(actual.line, `line at ${String(percent)} %`).toBeCloseTo(
        1,
        2,
      );
      await expectOpacities(
        actual.dashes,
        dashes,
        `dashes at ${String(percent)} %`,
      );
    };

    await at(10, [0.18, 0.18, 0.18]);
    await at(21, [1, 0.18, 0.18]);
    await at(43, [1, 1, 0.18]);
    await at(65, [1, 1, 1]);
  },
};

// At 20 px or less the mark is its three dashes only.
export const DashesOnly: Story = {
  args: { size: 16, delay: 0 },
  play: async ({ canvasElement }) => {
    const status = within(canvasElement).getByRole('status', {
      name: 'Loading',
    });
    const mark = await readMark(status, 16, false);
    await expectStroke(mark, ACCENT);
  },
};

// Labels from Component Inventory.dc.html: the visible label names the status.

export const Recalculating: Story = {
  args: { variant: 'march', size: 28, label: 'Recalculating…', delay: 0 },
  play: async ({ canvasElement }) => {
    const status = within(canvasElement).getByRole('status', {
      name: 'Recalculating…',
    });
    await readMark(status, 28, true);

    const label = within(status).getByText('Recalculating…');
    await expect(label).toBeVisible();
    await expect(getComputedStyle(label).fontSize).toBe('13px');
  },
};

export const Checking: Story = {
  args: { variant: 'march', size: 16, label: 'Checking…', delay: 0 },
  play: async ({ canvasElement }) => {
    const status = within(canvasElement).getByRole('status', {
      name: 'Checking…',
    });
    await readMark(status, 16, false);

    const label = within(status).getByText('Checking…');
    await expect(label).toBeVisible();
    await expect(getComputedStyle(label).fontSize).toBe('13px');
  },
};

// Inside a button the Loader takes the colour of the text around it.
const PositiveText = styled.span`
  color: ${({ theme }) => theme.color.positive};
`;

export const CurrentColour: Story = {
  args: { color: 'currentColor', delay: 0 },
  render: (args) => (
    <PositiveText>
      <Loader {...args} />
    </PositiveText>
  ),
  play: async ({ canvasElement }) => {
    const status = within(canvasElement).getByRole('status', {
      name: 'Loading',
    });
    const mark = await readMark(status, 32, true);
    await expectStroke(mark, GREEN);
  },
};

// The default delay of 300 ms: nothing shows before it, the status after it.
export const Delayed: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('svg')).toBeNull();
    await expect(canvasElement.innerText.trim()).toBe('');

    await waitFor(
      async () => {
        const status = within(canvasElement).getByRole('status', {
          name: 'Loading',
        });
        const svg = status.querySelector('svg');
        await expect(svg).not.toBeNull();
        await expect(svg).toBeVisible();
      },
      { timeout: 2000 },
    );
    const status = within(canvasElement).getByRole('status', {
      name: 'Loading',
    });
    await readMark(status, 32, true);
  },
};
