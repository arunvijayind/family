
import React, { useMemo } from 'react';
import { Person } from '../types';

interface PersonListProps {
  people: Person[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const PersonList: React.FC<PersonListProps> = ({ people, onEdit, onDelete }) => {
  // Sort people alphabetically by name
  const sortedPeople = useMemo(() => {
    return [...people].sort((a, b) => a.name.localeCompare(b.name));
  }, [people]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-xl space-y-4">
      <h2 className="text-2xl font-semibold text-indigo-700 mb-3">People Directory</h2>
      {sortedPeople.length === 0 ? (
        <p className="text-sm text-slate-500 italic">No people added yet.</p>
      ) : (
        <ul className="divide-y divide-slate-200 max-h-64 overflow-y-auto pr-2">
          {sortedPeople.map(person => (
            <li key={person.id} className="py-2 flex justify-between items-center hover:bg-slate-50 rounded px-2 -mx-2 transition-colors">
              <div className="flex items-center space-x-3">
                 {person.profilePicUrl ? (
                     <img src={person.profilePicUrl} alt={person.name} className="h-8 w-8 rounded-full object-cover border border-slate-300" />
                 ) : (
                     <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold select-none">
                         {person.name.charAt(0).toUpperCase()}
                     </div>
                 )}
                 <div>
                    <p className="text-sm font-medium text-slate-700">{person.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{person.gender}</p>
                 </div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                    onClick={() => onEdit(person.id)}
                    className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded-full hover:bg-indigo-100 transition-colors flex items-center justify-center"
                    title="Edit Person"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </button>
                <button
                    onClick={() => onDelete(person.id)}
                    className="text-red-600 hover:text-red-900 p-1.5 rounded-full hover:bg-red-100 transition-colors flex items-center justify-center"
                    title="Delete Person"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PersonList;
