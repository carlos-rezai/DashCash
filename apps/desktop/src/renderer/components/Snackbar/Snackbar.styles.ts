import { styled, type DefaultTheme } from 'styled-components';

export type SnackbarTone = 'success' | 'error' | 'info' | 'warning';

// Snackbar.dc.html: the colour of a tone's icon and hairline, and its tint
// over the raised fill.
function toneColour(tone: SnackbarTone, theme: DefaultTheme): string {
  switch (tone) {
    case 'success':
      return theme.color.positive;
    case 'error':
      return theme.color.danger;
    case 'warning':
      return theme.color.warning;
    default:
      return theme.color.accent[600];
  }
}

function toneTint(tone: SnackbarTone, theme: DefaultTheme): string {
  switch (tone) {
    case 'success':
      return theme.color.positiveTint;
    case 'error':
      return theme.color.dangerTint;
    case 'warning':
      return theme.color.warningTint;
    default:
      return theme.color.accent[100];
  }
}

// The snackbar: the tone's tint over the raised fill inside a hairline in the
// tone's colour, with the large shadow; the icon, the text and the close
// button in a row.
export const Frame = styled.div<{ $tone: SnackbarTone }>`
  box-sizing: border-box;
  width: 100%;
  display: flex;
  gap: ${({ theme }) => theme.space.snackbarGap};
  padding: ${({ theme }) => theme.space.snackbarPadding}
    ${({ theme }) => theme.space.snackbarPadding}
    ${({ theme }) => theme.space.snackbarPadding}
    ${({ theme }) => theme.space.snackbarPaddingLeft};
  background: ${({ theme }) => theme.color.surface};
  background-image: linear-gradient(
    ${({ theme, $tone }) => toneTint($tone, theme)},
    ${({ theme, $tone }) => toneTint($tone, theme)}
  );
  border: 1px solid
    color-mix(
      in srgb,
      ${({ theme, $tone }) => toneColour($tone, theme)}
        ${({ theme }) => theme.color.snackbarHairline},
      transparent
    );
  box-shadow: ${({ theme }) => theme.shadow.lg};
`;

export const Lead = styled.span<{ $tone: SnackbarTone }>`
  display: flex;
  padding-top: ${({ theme }) => theme.space.snackbarIconNudge};
  color: ${({ theme, $tone }) => toneColour($tone, theme)};
`;

export const Text = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.snackbarTextGap};
`;

export const Title = styled.span`
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: ${({ theme }) => theme.font.bodyWeightStrong};
  text-wrap: pretty;
`;

export const Message = styled.span`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.color.textMuted};
  text-wrap: pretty;
`;

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.space2};
  padding-top: ${({ theme }) => theme.space.snackbarActionsPadding};
`;

export const Close = styled.div`
  margin: ${({ theme }) => theme.space.snackbarClosePull}
    ${({ theme }) => theme.space.snackbarClosePull} 0 0;
`;
