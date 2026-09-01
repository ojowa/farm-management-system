import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Card className="custom">Content</Card>);
    expect(screen.getByText('Content').parentElement?.className).toContain('custom');
  });

  it('calls onClick when provided', () => {
    const onClick = vi.fn();
    render(<Card onClick={onClick}>Clickable</Card>);
    fireEvent.click(screen.getByText('Clickable'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('has cursor-pointer when onClick provided', () => {
    render(<Card onClick={() => {}}>Clickable</Card>);
    expect(screen.getByText('Clickable').parentElement?.className).toContain('cursor-pointer');
  });
});

describe('CardHeader', () => {
  it('renders children', () => {
    render(<Card><CardHeader>Header</CardHeader></Card>);
    expect(screen.getByText('Header')).toBeInTheDocument();
  });
});

describe('CardTitle', () => {
  it('renders title text', () => {
    render(<Card><CardTitle>Title</CardTitle></Card>);
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('renders as h3 element', () => {
    render(<Card><CardTitle>Title</CardTitle></Card>);
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });
});

describe('CardDescription', () => {
  it('renders description text', () => {
    render(<Card><CardDescription>Description</CardDescription></Card>);
    expect(screen.getByText('Description')).toBeInTheDocument();
  });
});

describe('CardContent', () => {
  it('renders content', () => {
    render(<Card><CardContent>Content</CardContent></Card>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

describe('CardFooter', () => {
  it('renders footer', () => {
    render(<Card><CardFooter>Footer</CardFooter></Card>);
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });
});
