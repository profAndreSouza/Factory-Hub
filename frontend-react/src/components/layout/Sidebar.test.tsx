import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Sidebar } from './Sidebar';

describe('Sidebar navigation', () => {
  it('exposes links to each application area', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Hub Central/ })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Automa/ })).toHaveAttribute('href', '/automacao');
    expect(screen.getByRole('link', { name: /Ci/ })).toHaveAttribute('href', '/ciencia-de-dados');
    expect(screen.getByRole('link', { name: /Nuvem AWS/ })).toHaveAttribute('href', '/nuvem');
    expect(screen.getByRole('link', { name: /DevOps/ })).toHaveAttribute('href', '/devops');
    expect(screen.getByRole('link', { name: /Smart N1 Dashboard/ })).toHaveAttribute('href', '/dashboard');
  });
});
