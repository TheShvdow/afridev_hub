import type { Meta, StoryObj } from '@storybook/angular';
import { InputComponent } from './input.component';

const meta: Meta<InputComponent> = {
  title: 'Components/Input',
  component: InputComponent,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'url', 'tel'],
    },
    label:       { control: 'text' },
    placeholder: { control: 'text' },
    hint:        { control: 'text' },
    error:       { control: 'text' },
    required:    { control: 'boolean' },
    prefixIcon:  { control: 'text' },
    suffixIcon:  { control: 'text' },
  },
  render: (args) => ({
    props: args,
    template: `<afri-input
      [label]="label"
      [placeholder]="placeholder"
      [type]="type"
      [hint]="hint"
      [error]="error"
      [required]="required"
      [prefixIcon]="prefixIcon"
      [suffixIcon]="suffixIcon"
    ></afri-input>`,
  }),
};

export default meta;
type Story = StoryObj<InputComponent>;

export const Default: Story = {
  args: {
    label: 'Email address',
    placeholder: 'you@example.com',
    type: 'email',
  },
};

export const WithHint: Story = {
  args: {
    label: 'Username',
    placeholder: 'your_handle',
    hint: 'Only letters, numbers and underscores.',
  },
};

export const WithError: Story = {
  args: {
    label: 'Email address',
    placeholder: 'you@example.com',
    error: 'Please enter a valid email address.',
  },
};

export const Required: Story = {
  args: {
    label: 'Full name',
    placeholder: 'Ada Lovelace',
    required: true,
  },
};

export const WithPrefixIcon: Story = {
  args: {
    label: 'Search',
    placeholder: 'Search projects…',
    prefixIcon: 'i-heroicons-magnifying-glass',
  },
};

export const WithSuffixIcon: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: '••••••••',
    suffixIcon: 'i-heroicons-eye',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Read-only field',
    placeholder: 'Cannot be edited',
  },
  render: (args) => ({
    props: args,
    template: `<afri-input
      [label]="label"
      [placeholder]="placeholder"
      [disabled]="true"
    ></afri-input>`,
  }),
};
