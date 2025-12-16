import React, { useState, useCallback } from 'react';
import { Person, StoredRelationship, RelationshipPath } from '../types';
import PersonSelector from './common/PersonSelector';
import { findRelationshipPath, deriveComplexRelationship } from '../utils/graphPathfinder';

interface RelationshipChainFinderProps {
  people: Person[];
  relationships: StoredRelationship[];
  onHighlightPath: (path: RelationshipPath | null) => void;
}

const RelationshipChainFinder: React.FC<RelationshipChainFinderProps> = ({ people, relationships, onHighlightPath }) => {
  const [personAId, setPersonAId] = useState<string>('');
  const [personBId, setPersonBId] = useState<string>('');
  const [foundPath, setFoundPath] = useState<RelationshipPath | null>(null);
  const [derivedRelationship, setDerivedRelationship] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const resetSearch = () => {
    setFoundPath(null);
    setDerivedRelationship(null);
    setError(null);
    onHighlightPath(null); // Clear highlights on new selection
  };

  const handleFindPath = useCallback(() => {
    if (!personAId || !personBId) {
      setError("Please select both Person A and Person B.");
      resetSearch();
      return;
    }
    
    resetSearch();
    setIsLoading(true);

    if (personAId === personBId) {
        const person = people.find(p => p.id === personAId);
        if (person) {
            setFoundPath([{person}]);
            setDerivedRelationship(`${person.name} is themselves.`);
        }
        setIsLoading(false);
        return;
    }
    
    setTimeout(() => {
      const path = findRelationshipPath(personAId, personBId, people, relationships);
      setFoundPath(path);
      if (path) {
        const complexRel = deriveComplexRelationship(path, people);
        setDerivedRelationship(complexRel);
        // Do not automatically highlight here, let user click button
      } else {
        setError("No relationship path found between the selected individuals.");
      }
      setIsLoading(false);
    }, 300);

  }, [personAId, personBId, people, relationships, onHighlightPath]);

  const handleShowOnGraphClick = () => {
    if (foundPath) {
      onHighlightPath(foundPath);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-2xl space-y-6 max-w-3xl mx-auto">
      <h2 className="text-3xl font-semibold text-indigo-700 mb-6 text-center">Find Relationship Chain</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
        <PersonSelector
            people={people.filter(p => p.id !== personBId)}
            selectedPersonId={personAId}
            onChange={(id) => { setPersonAId(id); resetSearch(); }}
            label="Person A"
            placeholder="Select starting person"
            idPrefix="chainA"
        />
        <PersonSelector
            people={people.filter(p => p.id !== personAId)}
            selectedPersonId={personBId}
            onChange={(id) => { setPersonBId(id); resetSearch(); }}
            label="Person B"
            placeholder="Select ending person"
            idPrefix="chainB"
        />
      </div>

      <div className="text-center">
        <button
          onClick={handleFindPath}
          disabled={isLoading || !personAId || !personBId}
          className="px-8 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:bg-slate-400"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Searching...
            </div>
          ) : 'Find Path'}
        </button>
      </div>

      {error && <p className="text-red-600 bg-red-50 p-3 rounded-md text-center">{error}</p>}

      {foundPath && foundPath.length > 0 && (
        <div className="mt-4 p-4 bg-indigo-50 rounded-lg shadow">
            {derivedRelationship && (
                <div className="mb-4 p-3 bg-sky-50 border border-sky-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-sky-700 mb-1">Relationship Summary:</h3>
                    <p className="text-sky-800 text-xl">{derivedRelationship}</p>
                </div>
            )}

            {!(foundPath.length === 1 && personAId === personBId) && (
                 <div className="mb-4 text-center">
                    <button
                        onClick={handleShowOnGraphClick}
                        className="px-4 py-2 text-sm bg-teal-500 hover:bg-teal-600 text-white rounded-md shadow transition-colors"
                    >
                        Show Path on Graph
                    </button>
                </div>
            )}

            <h3 className="text-xl font-semibold text-indigo-700 mb-3">Detailed Path:</h3>
            {foundPath.length === 1 && personAId === personBId && foundPath[0].person ? (
                <div className="flex items-center space-x-3 p-2">
                    {foundPath[0].person.profilePicUrl ? (
                        <img src={foundPath[0].person.profilePicUrl} alt={foundPath[0].person.name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                        <span className="h-10 w-10 rounded-full bg-slate-300 flex items-center justify-center text-slate-600 text-sm">
                            {foundPath[0].person.name.substring(0,1)}
                        </span>
                    )}
                    <strong className="text-indigo-600">{foundPath[0].person.name}</strong>
                    <span className="text-slate-700">is themselves.</span>
                </div>
            ) : (
            <ol className="list-none space-y-3">
              {foundPath.map((segment, index) => (
                <li key={segment.person.id} className="text-slate-700">
                  <div className="flex items-center">
                    <span className={`flex-shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-full ${index === 0 ? 'bg-sky-500' : index === foundPath.length-1 ? 'bg-purple-500' : 'bg-indigo-500'} text-white font-bold mr-3`}>
                      {index + 1}
                    </span>
                    {segment.person.profilePicUrl ? (
                        <img src={segment.person.profilePicUrl} alt={segment.person.name} className="h-8 w-8 rounded-full object-cover mr-2 border border-slate-300" />
                    ) : (
                         <span className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs mr-2">
                            {segment.person.name.substring(0,1)}
                        </span>
                    )}
                    <strong className="text-indigo-600">{segment.person.name}</strong>
                    <span className="text-xs ml-1 text-slate-500">({segment.person.gender})</span>
                  </div>
                  {segment.relationshipToNext && (
                    <div className="pl-11 mt-1">
                        <span className="text-slate-500 italic">&rarr; {segment.relationshipToNext} &rarr;</span>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
};

export default RelationshipChainFinder;