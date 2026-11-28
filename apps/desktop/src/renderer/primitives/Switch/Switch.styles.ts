import { styled } from 'styled-components';

// Switch.dc.html: a bare button, the track beside its label, faded when
// disabled.
export const Frame = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.switchGap};
  padding: 0;
  font-family: ${({ theme }) => theme.font.body};
  font-size: ${({ theme }) => theme.fontSize.md};
  cursor: pointer;
  color: ${({ theme }) => theme.color.text};
  background: none;
  border: 0;

  &:disabled {
    opacity: ${({ theme }) => theme.color.opacity.disabled};
  }
`;

// The track: square, the accent when on, a neutral outline when off. It does
// not animate (design log Q9).
export const Track = styled.span<{ $on: boolean }>`
  box-sizing: border-box;
  position: relative;
  flex: none;
  width: ${({ theme }) => theme.size.switchWidth};
  height: ${({ theme }) => theme.size.switchHeight};
  background: ${({ $on, theme }) =>
    $on ? theme.color.accent[500] : 'transparent'};
  border: ${({ theme }) => theme.size.hairline} solid
    ${({ $on, theme }) =>
      $on ? theme.color.accent[500] : theme.color.neutral[400]};
`;

// The knob: the ground colour on the right when on, grey on the left when off.
export const Knob = styled.span<{ $on: boolean }>`
  position: absolute;
  top: ${({ theme }) => theme.space.switchKnobTop};
  left: ${({ $on, theme }) =>
    $on ? theme.space.switchKnobOn : theme.space.switchKnobOff};
  width: ${({ theme }) => theme.size.switchKnob};
  height: ${({ theme }) => theme.size.switchKnob};
  background: ${({ $on, theme }) =>
    $on ? theme.color.bg : theme.color.neutral[600]};
`;

export const Label = styled.span`
  line-height: 1.3;
`;
