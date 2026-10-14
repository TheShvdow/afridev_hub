import type { Preview } from '@storybook/angular';
import '../../apps/web/src/styles.scss';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark',  value: 'var(--color-surface-900, #121212)' },
        { name: 'light', value: '#ffffff' },
      ],
    },
  },
};

export default preview;
