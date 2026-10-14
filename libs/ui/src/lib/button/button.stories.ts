import type { Meta, StoryObj } from '@storybook/angular';
import { ButtonComponent } from './button.component';

const meta: Meta<ButtonComponent> = {
  title: 'Components/Button',
  component: ButtonComponent,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger', 'outline'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
    },
    disabled: { control: 'boolean' },
    loading:  { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
  render: (args) => ({
    props: args,
    template: `<afri-button
      [variant]="variant"
      [size]="size"
      [disabled]="disabled"
      [loading]="loading"
      [fullWidth]="fullWidth"
    >Button</afri-button>`,
  }),
};

export default meta;
type Story = StoryObj<ButtonComponent>;

export const Primary: Story = {
  args: { variant: 'primary', size: 'md' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', size: 'md' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', size: 'md' },
};

export const Danger: Story = {
  args: { variant: 'danger', size: 'md' },
};

export const Outline: Story = {
  args: { variant: 'outline', size: 'md' },
};

export const ExtraSmall: Story = {
  args: { variant: 'primary', size: 'xs' },
};

export const Small: Story = {
  args: { variant: 'primary', size: 'sm' },
};

export const Large: Story = {
  args: { variant: 'primary', size: 'lg' },
};

export const Loading: Story = {
  args: { variant: 'primary', size: 'md', loading: true },
};

export const Disabled: Story = {
  args: { variant: 'primary', size: 'md', disabled: true },
};

export const FullWidth: Story = {
  args: { variant: 'primary', size: 'md', fullWidth: true },
};
