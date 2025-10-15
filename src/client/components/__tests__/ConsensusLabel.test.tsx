import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConsensusLabel } from '../ConsensusLabel';
import { ConsensusLabelType } from '../../../shared/enums.js';
import type { ConsensusLabel as ConsensusLabelData } from '../../../shared/types/ScoreSummary.js';

describe('ConsensusLabel', () => {
  const mockConsensusData: ConsensusLabelData = {
    label: ConsensusLabelType.PerfectHivemind,
    standardDeviation: 1.5,
    description: 'The collective mind speaks as one'
  };

  it('renders consensus label with correct text and icon', () => {
    render(<ConsensusLabel consensus={mockConsensusData} />);
    
    expect(screen.getByText('Perfect Hivemind')).toBeInTheDocument();
    expect(screen.getByText('The collective mind speaks as one')).toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<ConsensusLabel consensus={mockConsensusData} />);
    
    const element = screen.getByRole('status');
    expect(element).toHaveAttribute('aria-label');
    expect(element).toHaveAttribute('aria-describedby');
  });

  it('renders different variants correctly', () => {
    const { rerender } = render(
      <ConsensusLabel consensus={mockConsensusData} variant="compact" />
    );
    
    // Compact variant should hide description
    expect(screen.queryByText('The collective mind speaks as one')).not.toBeVisible();
    
    rerender(<ConsensusLabel consensus={mockConsensusData} variant="mobile-full" />);
    expect(screen.getByText('The collective mind speaks as one')).toBeInTheDocument();
  });

  it('handles interactive mode correctly', () => {
    const mockClick = jest.fn();
    render(
      <ConsensusLabel 
        consensus={mockConsensusData} 
        onClick={mockClick}
      />
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('tabIndex', '0');
  });

  it('renders all consensus label types', () => {
    const labelTypes = [
      ConsensusLabelType.PerfectHivemind,
      ConsensusLabelType.EchoChamber,
      ConsensusLabelType.BattleRoyale,
      ConsensusLabelType.TotalAnarchy,
      ConsensusLabelType.DumpsterFire,
      ConsensusLabelType.InsufficientData
    ];

    labelTypes.forEach(labelType => {
      const data: ConsensusLabelData = {
        label: labelType,
        standardDeviation: 5.0,
        description: 'Test description'
      };

      const { unmount } = render(<ConsensusLabel consensus={data} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      unmount();
    });
  });
});
