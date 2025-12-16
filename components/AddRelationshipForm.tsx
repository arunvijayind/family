
import React, { useState } from 'react';
import { Person, DirectRelationshipType } from '../types';

interface AddRelationshipFormProps {
  people: Person[];
  onAddRelationship: (fromId: string, toId: string, type: DirectRelationshipType) => void;
}

const AddRelationshipForm: React.FC<AddRelationshipFormProps> = ({ people, onAddRelationship }) => {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [type, setType] = useState<DirectRelationshipType>(DirectRelationshipType.FATHER);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromId || !toId) return;
    onAddRelationship(fromId, toId, type);
    // Optional: Reset form or keep selection for rapid entry
    setFromId('');
    setToId('');
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-xl border border-slate-100">
      <h3 className="text-lg font-semibold text-indigo-700 mb-4 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
        </svg>
        Add Relationship
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {people.length < 2 ? (
            <p className="text-sm text-slate-500 italic">Add at least two people to create a relationship.</p>
        ) : (
            <>
                <div className="space-y-3">
                    <select
                        value={fromId}
                        onChange={(e) => setFromId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                    >
                        <option value="">Select Person 1</option>
                        {people.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>

                    <div className="flex items-center justify-between text-slate-500 text-sm px-2">
                        <span>is</span>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as DirectRelationshipType)}
                            className="mx-2 flex-grow px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value={DirectRelationshipType.FATHER}>Father</option>
                            <option value={DirectRelationshipType.MOTHER}>Mother</option>
                            <option value={DirectRelationshipType.SPOUSE}>Spouse</option>
                            <option value={DirectRelationshipType.SIBLING}>Sibling</option>
                        </select>
                        <span>of</span>
                    </div>

                    <select
                        value={toId}
                        onChange={(e) => setToId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                    >
                        <option value="">Select Person 2</option>
                        {people.filter(p => p.id !== fromId).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                    Link People
                </button>
            </>
        )}
      </form>
    </div>
  );
};

export default AddRelationshipForm;
