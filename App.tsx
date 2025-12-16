
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Person, StoredRelationship, DirectRelationshipType, RelationshipPath, GraphLink, GraphNode } from './types';
// Removed AddPersonForm import
// Removed AddRelationshipForm import
import PersonList from './components/PersonList'; // Import PersonList
import FamilyGraphD3 from './components/FamilyGraphD3';
import RelationshipChainFinder from './components/RelationshipChainFinder';
import EditPersonModal from './components/EditPersonModal'; // Import new modal
import { INITIAL_PEOPLE, INITIAL_RELATIONSHIPS } from './constants';

enum ActiveView {
  ManageFamily = 'ManageFamily',
  FindChain = 'FindChain',
}

interface HighlightedPathInfo {
  nodeIds: Set<string>;
  linkIds: Set<string>;
}

const App: React.FC = () => {
  const [people, setPeople] = useState<Person[]>(INITIAL_PEOPLE);
  const [relationships, setRelationships] = useState<StoredRelationship[]>(INITIAL_RELATIONSHIPS);
  const [activeView, setActiveView] = useState<ActiveView>(ActiveView.ManageFamily);
  const [error, setError] = useState<string | null>(null);
  const [highlightedPathInfo, setHighlightedPathInfo] = useState<HighlightedPathInfo | null>(null);

  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Ref for the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadFamilyData = useCallback(() => {
    const data = {
      people,
      relationships,
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'family_tree_data.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [people, relationships]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const importFamilyData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const data = JSON.parse(json);

        // Basic validation
        if (!Array.isArray(data.people) || !Array.isArray(data.relationships)) {
          throw new Error("Invalid file format: JSON must contain 'people' and 'relationships' arrays.");
        }

        setPeople(data.people);
        setRelationships(data.relationships);
        setHighlightedPathInfo(null);
        setError(null);
        
        // Reset the file input so the same file can be selected again if needed
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (err) {
        console.error("Import error:", err);
        setError("Failed to import data. The file might be corrupted or in an invalid format.");
      }
    };
    reader.readAsText(file);
  };

  const updateRelationship = useCallback((id: string, fromPersonId: string, toPersonId: string, type: DirectRelationshipType): boolean => {
    setError(null);
    if (fromPersonId === toPersonId) {
        setError("Cannot form a relationship with oneself.");
        return false;
    }

    // Check for duplicates (excluding the current relationship being edited)
    const duplicate = relationships.find(r => 
        r.id !== id &&
        ((r.fromPersonId === fromPersonId && r.toPersonId === toPersonId && r.type === type) ||
         ((type === DirectRelationshipType.SPOUSE || type === DirectRelationshipType.SIBLING) && r.fromPersonId === toPersonId && r.toPersonId === fromPersonId && r.type === type))
    );

    if (duplicate) {
        setError("This relationship already exists.");
        return false;
    }

    // Check parent constraints if we are setting a parent
    if (type === DirectRelationshipType.FATHER || type === DirectRelationshipType.MOTHER) {
        const existingParent = relationships.find(r => r.id !== id && r.toPersonId === toPersonId && r.type === type);
        if (existingParent && existingParent.fromPersonId !== fromPersonId) {
            setError(`This person already has a ${type.toLowerCase()} assigned.`);
            return false;
        }
    }

    setRelationships(prev => prev.map(r => r.id === id ? { ...r, fromPersonId, toPersonId, type } : r));
    setHighlightedPathInfo(null);
    return true;
  }, [relationships]);

  const deletePerson = useCallback((personId: string) => {
    if (!window.confirm("Are you sure you want to delete this person? This will also remove all their associated relationships.")) {
        return;
    }
    setPeople(prev => prev.filter(p => p.id !== personId));
    setRelationships(prev => prev.filter(r => r.fromPersonId !== personId && r.toPersonId !== personId));
    setHighlightedPathInfo(null);
    setEditingPerson(null);
    setIsEditModalOpen(false);
  }, []);

  const deleteRelationship = useCallback((relationshipId: string) => {
    if (!window.confirm("Are you sure you want to delete this relationship?")) {
        return;
    }
    setRelationships(prev => prev.filter(r => r.id !== relationshipId));
    setHighlightedPathInfo(null);
  }, []);
  
  const handleOpenEditModal = useCallback((personId: string) => {
    const person = people.find(p => p.id === personId);
    if (person) {
      setEditingPerson(person);
      setIsEditModalOpen(true);
      setError(null);
    } else {
      setError("Could not find person to edit.");
    }
  }, [people]);

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingPerson(null);
  };

  const handleUpdatePerson = (personId: string, updates: Partial<Omit<Person, 'id'>>) => {
    setError(null);
    if (updates.name && people.some(p => p.id !== personId && p.name.toLowerCase() === updates.name!.trim().toLowerCase())) {
        setError(`Another person with name "${updates.name}" already exists.`);
        return false; 
    }

    setPeople(prevPeople => 
      prevPeople.map(p => 
        p.id === personId ? { ...p, ...updates, name: updates.name ? updates.name.trim() : p.name } : p
      )
    );
    handleCloseEditModal();
    return true; 
  };


  const graphNodes: GraphNode[] = useMemo(() => people.map(p => ({ 
    ...p, 
    isHighlighted: highlightedPathInfo?.nodeIds.has(p.id) ?? false,
    radius: 25, 
    birthDate: p.birthDate,
  })), [people, highlightedPathInfo]);

  const graphLinks: GraphLink[] = useMemo(() => relationships.map(r => ({
    id: r.id,
    source: r.fromPersonId, 
    target: r.toPersonId,   
    type: r.type,
    isHighlighted: highlightedPathInfo?.linkIds.has(r.id) ?? false,
  })), [relationships, highlightedPathInfo]);

  const handleHighlightPath = useCallback((path: RelationshipPath | null) => {
    if (!path || path.length === 0) {
      setHighlightedPathInfo(null);
      return;
    }
    const nodeIds = new Set<string>();
    const linkIds = new Set<string>();
    path.forEach(segment => {
      nodeIds.add(segment.person.id);
      if (segment.relationshipId) {
        linkIds.add(segment.relationshipId);
      }
    });
    if (path.length === 1) { 
        linkIds.clear();
    }
    setHighlightedPathInfo({ nodeIds, linkIds });
    setActiveView(ActiveView.ManageFamily); 
  }, []);

  const clearHighlight = () => {
    setHighlightedPathInfo(null);
  };

  const hasHighlight = useMemo(() => highlightedPathInfo !== null && (highlightedPathInfo.nodeIds.size > 0 || highlightedPathInfo.linkIds.size > 0), [highlightedPathInfo]);
  
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <header className="text-center py-4 px-4 bg-white shadow-md z-20">
        <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600">
            Family Tree Navigator
            </h1>
        </div>
      </header>

      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 w-auto max-w-md z-50 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-center shadow-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-4 text-red-700 font-semibold">&times;</button>
        </div>
      )}

      {isEditModalOpen && editingPerson && (
        <EditPersonModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          personToEdit={editingPerson}
          onUpdatePerson={handleUpdatePerson}
          onDeletePerson={deletePerson}
          relationships={relationships}
          people={people}
          onUpdateRelationship={updateRelationship}
          onDeleteRelationship={deleteRelationship}
        />
      )}

      <div className="my-4 flex justify-center space-x-2 sm:space-x-4 z-10">
        {(Object.keys(ActiveView) as Array<keyof typeof ActiveView>).map((viewKey) => (
          <button
            key={viewKey}
            onClick={() => setActiveView(ActiveView[viewKey])}
            className={`px-4 py-2 rounded-md text-sm sm:text-base font-medium transition-colors duration-200 ease-in-out
              ${activeView === ActiveView[viewKey] 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'bg-white text-indigo-600 hover:bg-indigo-100'}`}
          >
            {viewKey === 'ManageFamily' ? 'View Tree' : 'Find Relationship Chain'}
          </button>
        ))}
      </div>
      
      <main className="flex-grow flex flex-col p-4">
        {activeView === ActiveView.ManageFamily && (
          <div className="flex-grow flex flex-col lg:flex-row gap-4">
            <div className="lg:w-1/3 xl:w-1/4 space-y-4 order-2 lg:order-1 lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto p-1">
                <div className="mb-4 p-4 bg-white rounded-lg shadow">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-indigo-700">Manage Tree</h2>
                        <div className="flex space-x-2">
                          <input 
                              type="file" 
                              ref={fileInputRef} 
                              style={{ display: 'none' }} 
                              accept=".json" 
                              onChange={importFamilyData} 
                          />
                          <button
                              onClick={handleImportClick}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                              title="Import tree data from JSON"
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m-4 0v9" />
                              </svg>
                              Import
                          </button>
                          <button
                              onClick={downloadFamilyData}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                              title="Download current tree data as JSON"
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Export
                          </button>
                        </div>
                    </div>
                    {hasHighlight && (
                        <div className="mt-3">
                            <button
                                onClick={clearHighlight}
                                className="w-full px-3 py-1.5 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border border-yellow-300 rounded-md shadow-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                <span>Clear Highlight</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
                {/* Removed AddPersonForm usage */}
                <PersonList people={people} onEdit={handleOpenEditModal} onDelete={deletePerson} />
                {/* Removed AddRelationshipForm usage */}
            </div>
            <div className="lg:w-2/3 xl:w-3/4 order-1 lg:order-2 flex-grow graph-container-d3 shadow-lg rounded-lg"> {/* Removed bg-white to let CSS rule apply */}
              {people.length > 0 ? (
                <FamilyGraphD3 
                  nodes={graphNodes} 
                  links={graphLinks} 
                  hasHighlightActive={hasHighlight}
                  onEditPerson={handleOpenEditModal} 
                  onDeleteRelationship={deleteRelationship}
                  onDeletePerson={deletePerson}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-300 text-center">Add people and relationships to see the graph.</p> {/* Changed text-slate-500 to text-slate-300 */}
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === ActiveView.FindChain && (
          <div className="flex-grow flex items-center justify-center">
            <RelationshipChainFinder 
              people={people} 
              relationships={relationships}
              onHighlightPath={handleHighlightPath}
            />
          </div>
        )}
      </main>
      <footer className="text-center py-3 text-xs text-slate-500 bg-white border-t border-slate-200 z-10">
        Built with React, TypeScript, Tailwind CSS, and D3.js.
      </footer>
    </div>
  );
};

export default App;
