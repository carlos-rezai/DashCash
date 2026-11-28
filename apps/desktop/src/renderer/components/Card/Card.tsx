import type { ReactNode } from 'react';
import { hasText } from '../../utils/hasText/hasText.ts';
import {
  Frame,
  Header,
  Kicker,
  Title,
  type CardPadding,
} from './Card.styles.ts';

type CardProps = {
  kicker?: string;
  title?: string;
  padding?: CardPadding;
  children: ReactNode;
};

// The surface that holds a page's blocks: an optional kicker and title above
// the content.
export function Card({ kicker, title, padding = 'md', children }: CardProps) {
  // An empty string is absent, as in the prototype.
  const hasHeader = hasText(kicker) || hasText(title);
  return (
    <Frame $padding={padding}>
      {hasHeader ? (
        <Header>
          {hasText(kicker) ? <Kicker>{kicker}</Kicker> : null}
          {hasText(title) ? <Title>{title}</Title> : null}
        </Header>
      ) : null}
      {children}
    </Frame>
  );
}
