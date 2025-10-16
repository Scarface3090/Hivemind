import React from 'react';
import { ConsensusLabel } from './ConsensusLabel';
import { ConsensusLabelType } from '../../shared/enums.js';

/**
 * Example usage of the ConsensusLabel component
 * This file demonstrates different variants and use cases
 */
export const ConsensusLabelExamples: React.FC = () => {
  const exampleData = [
    {
      label: ConsensusLabelType.PerfectHivemind,
      standardDeviation: 1.2,
      description: 'The collective mind speaks as one'
    },
    {
      label: ConsensusLabelType.EchoChamber,
      standardDeviation: 3.8,
      description: 'Most minds think alike'
    },
    {
      label: ConsensusLabelType.BattleRoyale,
      standardDeviation: 6.5,
      description: 'The community is at war'
    },
    {
      label: ConsensusLabelType.TotalAnarchy,
      standardDeviation: 10.2,
      description: 'Chaos reigns supreme'
    },
    {
      label: ConsensusLabelType.DumpsterFire,
      standardDeviation: 15.7,
      description: 'Complete pandemonium'
    },
    {
      label: ConsensusLabelType.InsufficientData,
      standardDeviation: 0,
      description: 'Not enough data to determine consensus'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-4">Consensus Label Examples</h2>
      
      {/* Default variant */}
      <section>
        <h3 className="text-lg font-semibold mb-3">Default Variant</h3>
        <div className="space-y-3">
          {exampleData.map((consensus, index) => (
            <ConsensusLabel 
              key={index}
              consensus={consensus}
            />
          ))}
        </div>
      </section>

      {/* Compact variant */}
      <section>
        <h3 className="text-lg font-semibold mb-3">Compact Variant</h3>
        <div className="flex flex-wrap gap-2">
          {exampleData.map((consensus, index) => (
            <ConsensusLabel 
              key={index}
              consensus={consensus}
              variant="compact"
            />
          ))}
        </div>
      </section>

      {/* Mobile-full variant */}
      <section>
        <h3 className="text-lg font-semibold mb-3">Mobile-Full Variant</h3>
        <div className="space-y-2">
          {exampleData.slice(0, 3).map((consensus, index) => (
            <ConsensusLabel 
              key={index}
              consensus={consensus}
              variant="mobile-full"
            />
          ))}
        </div>
      </section>

      {/* Interactive variant */}
      <section>
        <h3 className="text-lg font-semibold mb-3">Interactive Variant</h3>
        <div className="space-y-2">
          {exampleData.slice(0, 2).map((consensus, index) => (
            <ConsensusLabel 
              key={index}
              consensus={consensus}
              onClick={() => alert(`Clicked: ${consensus.description}`)}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
