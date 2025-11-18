import CandidateCard from './CandidateCard';

const CandidateGrid = ({
  candidates,
  activePhase,
  selectedTop30,
  selectedTop12,
  selectedTop5,
  finalistas,
  onToggleSelection,
  onAssignPosition,
  onDeleteCandidate
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
      {candidates.map((candidate) => (
        <CandidateCard
          key={candidate.id}
          candidate={candidate}
          activePhase={activePhase}
          isSelectedTop30={selectedTop30.includes(candidate.id)}
          isSelectedTop12={selectedTop12.includes(candidate.id)}
          isSelectedTop5={selectedTop5.includes(candidate.id)}
          finalistaPosition={Object.entries(finalistas).find(([_, id]) => id === candidate.id)?.[0]}
          onToggleSelection={onToggleSelection}
          onAssignPosition={onAssignPosition}
          onDeleteCandidate={onDeleteCandidate}
        />
      ))}
    </div>
  );
};

export default CandidateGrid;