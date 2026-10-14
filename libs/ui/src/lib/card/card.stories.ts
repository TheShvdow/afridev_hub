import type { Meta, StoryObj } from '@storybook/angular';
import { CardComponent } from './card.component';

const meta: Meta<CardComponent> = {
  title: 'Components/Card',
  component: CardComponent,
  tags: ['autodocs'],
  argTypes: {
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
    },
    hoverable:  { control: 'boolean' },
    bordered:   { control: 'boolean' },
    extraClass: { control: 'text' },
  },
  render: (args) => ({
    props: args,
    template: `<afri-card
      [padding]="padding"
      [hoverable]="hoverable"
      [bordered]="bordered"
      [extraClass]="extraClass"
    >
      <p class="text-gray-300 text-sm">Card content goes here.</p>
    </afri-card>`,
  }),
};

export default meta;
type Story = StoryObj<CardComponent>;

export const Default: Story = {
  args: { padding: 'md', bordered: true },
};

export const WithFooter: Story = {
  args: { padding: 'md', bordered: true },
  render: (args) => ({
    props: args,
    template: `<afri-card [padding]="padding" [bordered]="bordered">
      <p class="text-gray-300 text-sm">Main card content.</p>
      <div card-footer class="mt-4 pt-4 border-t border-gray-700 flex justify-end gap-2">
        <afri-button variant="ghost" size="sm">Cancel</afri-button>
        <afri-button variant="primary" size="sm">Save</afri-button>
      </div>
    </afri-card>`,
  }),
};

export const Hoverable: Story = {
  args: { padding: 'md', bordered: true, hoverable: true },
};

export const NoPadding: Story = {
  args: { padding: 'none', bordered: true },
  render: () => ({
    props: {},
    template: `<afri-card padding="none" [bordered]="true">
      <img
        src="https://placehold.co/600x200/1a1a2e/4CAF50?text=Card+Image"
        alt="placeholder"
        class="w-full rounded-xl"
      />
    </afri-card>`,
  }),
};

export const LargePadding: Story = {
  args: { padding: 'lg', bordered: true },
};

export const NoBorder: Story = {
  args: { padding: 'md', bordered: false },
};
