import type { ReactNode } from 'react';
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
  const hasHeader = kicker !== undefined || title !== undefined;
  return (
    <Frame $padding={padding}>
      {hasHeader ? (
        <Header>
          {kicker === undefined ? null : <Kicker>{kicker}</Kicker>}
          {title === undefined ? null : <Title>{title}</Title>}
        </Header>
      ) : null}
      {children}
    </Frame>
  );
}
