import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

describe('App CCTV MVP', () => {
  it('prioriza eventos críticos en cola operativa', () => {
    render(<App />);
    const firstItem = screen.getAllByTestId('event-row')[0];
    expect(firstItem).toHaveTextContent('CRITICAL');
  });

  it('abre popup operativo para alerta crítica', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /atender/i })[0]);
    expect(screen.getByRole('dialog', { name: /operación alerta/i })).toBeInTheDocument();
    expect(screen.getByText(/webrtc/i)).toBeInTheDocument();
  });

  it('filtra historial y exporta CSV con filtros aplicados', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/patente/i), 'ZXCV99');
    await user.click(screen.getByRole('button', { name: /aplicar filtros/i }));
    await user.click(screen.getByRole('button', { name: /exportar csv/i }));

    const csv = screen.getByTestId('csv-output').textContent ?? '';
    expect(csv).toContain('ZXCV99');
    expect(csv).not.toContain('ABCD12');
  });

  it('cambia estado con trazabilidad visible', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText(/estado alt_9001/i), 'CLOSED');
    expect(screen.getByText(/Operador Frontend/)).toBeInTheDocument();
    expect(screen.getByText(/CLOSED por Operador Frontend/)).toBeInTheDocument();
  });
});