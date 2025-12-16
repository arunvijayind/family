
import React from 'react';
import { Person } from '../../types';

interface PersonSelectorProps {
  people: Person[];
  selectedPersonId: string;
  onChange: (personId: string) => void;
  label: string;
  placeholder: string;
  idPrefix: string; // To ensure unique IDs for labels and inputs
}

const PersonSelector: React.FC<PersonSelectorProps> = ({
  people,
  selectedPersonId,
  onChange,
  label,
  placeholder,
  idPrefix
}) => {
  const selectId = `${idPrefix}-personSelector`;
  return (
    <div>
      <label htmlFor={selectId} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <select
        id={selectId}
        value={selectedPersonId}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm
                   focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                   disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200"
        disabled={people.length === 0}
      >
        <option value="">{people.length === 0 ? "No people available" : placeholder}</option>
        {people.map(person => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default PersonSelector;
