
import React, { useState, useEffect, useMemo } from 'react';
import { Person, StoredRelationship, DirectRelationshipType } from '../types';

interface EditPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  personToEdit: Person | null;
  onUpdatePerson: (personId: string, updates: Partial<Omit<Person, 'id'>>) => boolean;
  onDeletePerson: (personId: string) => void;
  relationships: StoredRelationship[];
  people: Person[];
  onUpdateRelationship: (id: string, fromPersonId: string, toPersonId: string, type: DirectRelationshipType) => boolean;
  onDeleteRelationship: (id: string) => void;
}

const EditPersonModal: React.FC<EditPersonModalProps> = ({ 
    isOpen, 
    onClose, 
    personToEdit, 
    onUpdatePerson, 
    onDeletePerson,
    relationships,
    people,
    onUpdateRelationship,
    onDeleteRelationship
}) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Person['gender']>('unknown');
  const [birthDate, setBirthDate] = useState('');
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [profilePicFile, setProfilePicFile] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // State for relationship editing
  const [editingRelId, setEditingRelId] = useState<string | null>(null);
  const [editingRelType, setEditingRelType] = useState<DirectRelationshipType | 'CHILD'>('CHILD');

  useEffect(() => {
    if (personToEdit) {
      setName(personToEdit.name);
      setGender(personToEdit.gender);
      setBirthDate(personToEdit.birthDate || '');
      setProfilePicPreview(personToEdit.profilePicUrl || null);
      setProfilePicFile(personToEdit.profilePicUrl || undefined);
      setError(null);
      setEditingRelId(null);
    }
  }, [personToEdit]);

  // Compute relationships involving this person
  const personRelationships = useMemo(() => {
      if (!personToEdit) return [];
      return relationships
        .filter(r => r.fromPersonId === personToEdit.id || r.toPersonId === personToEdit.id)
        .map(r => {
            const isFrom = r.fromPersonId === personToEdit.id;
            const otherPersonId = isFrom ? r.toPersonId : r.fromPersonId;
            const otherPerson = people.find(p => p.id === otherPersonId);
            return {
                ...r,
                otherPerson,
                isFrom // true if personToEdit is the 'source' (e.g. FATHER), false if 'target' (e.g. CHILD)
            };
        });
  }, [personToEdit, relationships, people]);

  if (!isOpen || !personToEdit) {
    return null;
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result as string);
        setProfilePicFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setProfilePicPreview(null);
      setProfilePicFile(undefined);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name cannot be empty.");
      return;
    }
    const success = onUpdatePerson(personToEdit.id, {
      name: name.trim(),
      gender,
      birthDate: birthDate || undefined, 
      profilePicUrl: profilePicFile,
    });

    if (!success) {
         // App usually sets its own error, but we can set local if needed.
    }
  };

  const getRelationshipDescription = (rel: typeof personRelationships[0]) => {
      if (!rel.otherPerson) return "Unknown person";
      const otherName = rel.otherPerson.name;
      
      if (rel.isFrom) {
          // PersonToEdit is the [TYPE] of OtherPerson
          const typeStr = rel.type.charAt(0) + rel.type.slice(1).toLowerCase();
          return `is ${typeStr} of ${otherName}`;
      } else {
          // OtherPerson is [TYPE] of PersonToEdit
          // So PersonToEdit is [PASSIVE_TYPE] of OtherPerson
          if (rel.type === DirectRelationshipType.FATHER || rel.type === DirectRelationshipType.MOTHER) {
              return `is Child of ${otherName}`;
          } else if (rel.type === DirectRelationshipType.SPOUSE) {
              return `is Spouse of ${otherName}`;
          } else if (rel.type === DirectRelationshipType.SIBLING) {
              return `is Sibling of ${otherName}`;
          }
      }
      return `${rel.type} with ${otherName}`;
  };

  const startEditingRel = (rel: typeof personRelationships[0]) => {
    setEditingRelId(rel.id);
    // Initialize editing type based on current state
    if (rel.isFrom) {
        setEditingRelType(rel.type);
    } else {
        if (rel.type === DirectRelationshipType.FATHER || rel.type === DirectRelationshipType.MOTHER) {
            setEditingRelType('CHILD'); // Represents "Is Child Of"
        } else {
            setEditingRelType(rel.type);
        }
    }
  };

  const saveRelEdit = (rel: typeof personRelationships[0]) => {
      if (!rel.otherPerson) return;
      
      let fromId = personToEdit.id;
      let toId = rel.otherPerson.id;
      let type: DirectRelationshipType = DirectRelationshipType.SIBLING; // Default

      if (editingRelType === 'CHILD') {
           // PersonToEdit is Child of OtherPerson.
           // So OtherPerson is Parent of PersonToEdit.
           fromId = rel.otherPerson.id;
           toId = personToEdit.id;
           // Determine parent type based on OtherPerson gender
           if (rel.otherPerson.gender === 'male') type = DirectRelationshipType.FATHER;
           else if (rel.otherPerson.gender === 'female') type = DirectRelationshipType.MOTHER;
           else type = DirectRelationshipType.FATHER; // Fallback or need strict 'PARENT' type
      } else {
          // Active types: Father, Mother, Spouse, Sibling
          // "PersonToEdit is [TYPE] of OtherPerson"
          type = editingRelType as DirectRelationshipType;
          fromId = personToEdit.id;
          toId = rel.otherPerson.id;
      }
      
      const success = onUpdateRelationship(rel.id, fromId, toId, type);
      if (success) {
          setEditingRelId(null);
      } else {
          // Error handled in App
      }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-2xl font-semibold text-indigo-700 mb-3">Edit Person: {personToEdit.name}</h2>
          
          {error && <p className="text-xs text-red-500 bg-red-50 p-2 rounded">{error}</p>}

          <div>
            <label htmlFor="editPersonName" className="block text-sm font-medium text-slate-700 mb-1">
              Name
            </label>
            <input
              type="text"
              id="editPersonName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm
                         focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="editBirthDate" className="block text-sm font-medium text-slate-700 mb-1">
                Birth Date
                </label>
                <input
                type="date"
                id="editBirthDate"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm
                            focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
            </div>
            <div>
                <label htmlFor="editGender" className="block text-sm font-medium text-slate-700 mb-1">
                Gender
                </label>
                <select
                id="editGender"
                value={gender}
                onChange={(e) => setGender(e.target.value as Person['gender'])}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm
                            focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                <option value="unknown">Unknown</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                </select>
            </div>
          </div>
          <div>
            <label htmlFor="editProfilePic" className="block text-sm font-medium text-slate-700 mb-1">
              Profile Picture
            </label>
            <input
              type="file"
              id="editProfilePic"
              accept="image/*"
              onChange={handleImageChange}
              className="mt-1 block w-full text-sm text-slate-500
                         file:mr-4 file:py-2 file:px-4
                         file:rounded-md file:border-0
                         file:text-sm file:font-semibold
                         file:bg-indigo-50 file:text-indigo-700
                         hover:file:bg-indigo-100"
            />
            {profilePicPreview && (
              <div className="mt-2 text-center">
                <img src={profilePicPreview} alt="Preview" className="inline-block h-24 w-24 rounded-full object-cover border-2 border-indigo-200" />
              </div>
            )}
          </div>
          
          <hr className="border-slate-200 my-4" />
          
          <div>
            <h3 className="text-lg font-medium text-indigo-700 mb-2">Relationships</h3>
            {personRelationships.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No relationships recorded.</p>
            ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {personRelationships.map(rel => (
                        <li key={rel.id} className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100">
                             {editingRelId === rel.id ? (
                                 <div className="flex-grow flex items-center gap-2">
                                     <span className="text-sm text-slate-700 font-semibold">{personToEdit.name}</span>
                                     <span className="text-xs text-slate-500">is</span>
                                     <select
                                        value={editingRelType}
                                        onChange={(e) => setEditingRelType(e.target.value as any)}
                                        className="text-sm border-slate-300 rounded p-1"
                                     >
                                         <option value={DirectRelationshipType.FATHER}>Father</option>
                                         <option value={DirectRelationshipType.MOTHER}>Mother</option>
                                         <option value={DirectRelationshipType.SPOUSE}>Spouse</option>
                                         <option value={DirectRelationshipType.SIBLING}>Sibling</option>
                                         <option value="CHILD">Child</option>
                                     </select>
                                     <span className="text-xs text-slate-500">of</span>
                                     <span className="text-sm text-slate-700 font-semibold">{rel.otherPerson?.name}</span>
                                     <div className="flex ml-auto gap-1">
                                        <button type="button" onClick={() => saveRelEdit(rel)} className="text-green-600 hover:text-green-800 p-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        <button type="button" onClick={() => setEditingRelId(null)} className="text-slate-500 hover:text-slate-700 p-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                     </div>
                                 </div>
                             ) : (
                                <>
                                    <div className="text-sm text-slate-700">
                                        <span className="font-semibold">{personToEdit.name}</span> {getRelationshipDescription(rel)}
                                    </div>
                                    <div className="flex gap-1">
                                        <button type="button" onClick={() => startEditingRel(rel)} className="text-indigo-500 hover:text-indigo-700 p-1 rounded hover:bg-indigo-50">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                        </button>
                                        <button type="button" onClick={() => onDeleteRelationship(rel.id)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                </>
                             )}
                        </li>
                    ))}
                </ul>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-4">
            <button
                type="button"
                onClick={() => onDeletePerson(personToEdit.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
                Delete Person
            </button>
            <div className="flex space-x-3">
                <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                Cancel
                </button>
                <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                Save Changes
                </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPersonModal;
