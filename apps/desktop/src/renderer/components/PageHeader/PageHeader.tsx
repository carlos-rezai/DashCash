import type { ReactNode } from 'react';
import { Icon } from '../../primitives/Icon/Icon.tsx';
import { Tag, type TagTone } from '../../primitives/Tag/Tag.tsx';
import {
  Actions,
  Back,
  Column,
  Frame,
  Subtitle,
  Title,
  TitleRow,
} from './PageHeader.styles.ts';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  tag?: string;
  tagTone?: TagTone;
  onBack?: () => void;
  backLabel?: string;
  // The actions, at the right.
  children: ReactNode;
};

const BACK_ICON_SIZE = 14;
const DEFAULT_BACK_LABEL = 'Back';

// Tells the user where they are: a title with an optional back link, tag and
// subtitle, and the page's actions at the right.
export function PageHeader({
  title,
  subtitle,
  tag,
  tagTone = 'accent',
  onBack,
  backLabel,
  children,
}: PageHeaderProps) {
  // An empty string is absent, as in the prototype.
  return (
    <Frame>
      <Column>
        {onBack ? (
          <Back type="button" onClick={onBack}>
            <Icon glyph="arrowLeft" size={BACK_ICON_SIZE} />
            <span>{backLabel || DEFAULT_BACK_LABEL}</span>
          </Back>
        ) : null}
        <TitleRow>
          <Title>{title}</Title>
          {tag ? <Tag label={tag} tone={tagTone} /> : null}
        </TitleRow>
        {subtitle ? <Subtitle>{subtitle}</Subtitle> : null}
      </Column>
      <Actions>{children}</Actions>
    </Frame>
  );
}
