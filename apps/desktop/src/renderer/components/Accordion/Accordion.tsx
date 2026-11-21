import { useRef, type ReactNode } from 'react';
import { useRevealOnExpand } from '../../hooks/useRevealOnExpand/useRevealOnExpand.ts';
import { Icon } from '../../primitives/Icon/Icon.tsx';
import { Tag, type TagTone } from '../../primitives/Tag/Tag.tsx';
import {
  Chevron,
  Content,
  Header,
  Meta,
  Section,
  Title,
} from './Accordion.styles.ts';

type AccordionProps = {
  title: string;
  open: boolean;
  onToggle: () => void;
  meta?: string;
  tag?: string;
  tagTone?: TagTone;
  children: ReactNode;
};

const ICON_SIZE = 16;

// A titled row that opens its content below it. The caller owns open; the
// scroll area it sits in scrolls to show the content after it opens.
export function Accordion({
  title,
  open,
  onToggle,
  meta,
  tag,
  tagTone = 'neutral',
  children,
}: AccordionProps) {
  const header = useRef<HTMLButtonElement>(null);
  const section = useRef<HTMLElement>(null);
  useRevealOnExpand(header, section, open);

  return (
    <Section ref={section}>
      <Header
        ref={header}
        type="button"
        aria-expanded={open}
        onClick={onToggle}
      >
        <Chevron $open={open}>
          <Icon glyph="chevronRight" size={ICON_SIZE} />
        </Chevron>
        <Title>{title}</Title>
        {tag ? <Tag label={tag} tone={tagTone} /> : null}
        {meta ? <Meta>{meta}</Meta> : null}
      </Header>
      {open ? <Content>{children}</Content> : null}
    </Section>
  );
}
