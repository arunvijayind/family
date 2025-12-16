
import React, { useState } from 'react';
import { Person, DirectRelationshipType } from '../types';

interface AddPersonFormProps {
  onAddPerson: (
    name: string,
    gender: Person['gender'],
    birthDate?: string,
    profilePicUrl?: string,
    initialRelationship?: {
        relationshipType: DirectRelationshipType | 'SON' | 'DAUGHTER';
        relatedToPersonId: string;
    }
  ) => void;
  people: Person[];
}

const AddPersonForm: React.FC<AddPersonFormProps> = ({ onAddPerson, people }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Person['gender']>('unknown');
  const [birthDate, setBirthDate] = useState('');
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [profilePicFile, setProfilePicFile] = useState<string | undefined>(undefined);
  
  // Initial Relationship State
  const [useInitialRel, setUseInitialRel] = useState(false);
  const [relType, setRelType] = useState<DirectRelationshipType | 'SON' | 'DAUGHTER' | ''>('');
  const [relatedPersonId, setRelatedPersonId] = useState('');

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
    if (!name.trim()) return;

    let initialRelationship = undefined;
    if (useInitialRel && relType && relatedPersonId) {
        initialRelationship = {
            relationshipType: relType as DirectRelationshipType | 'SON' | 'DAUGHTER',
            relatedToPersonId: relatedPersonId
        };
    }

    onAddPerson(name, gender, birthDate || undefined, profilePicFile, initialRelationship);
    
    // Reset form
    setName('');
    setGender('unknown');
    setBirthDate('');
    setProfilePicPreview(null);
    setProfilePicFile(undefined);
    setUseInitialRel(false);
    setRelType('');
    setRelatedPersonId('');
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-xl border border-slate-100 mb-6">
      <h3 className="text-lg font-semibold text-indigo-700 mb-4 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
        Add New Person
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
            placeholder="e.g. Alice Smith"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value as Person['gender'])}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
            >
              <option value="unknown">Unknown</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="birthDate" className="block text-sm font-medium text-slate-700 mb-1">Birth Date</label>
            <input
              type="date"
              id="birthDate"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
            />
          </div>
        </div>

        <div>
            <label htmlFor="profilePic" className="block text-sm font-medium text-slate-700 mb-1">Profile Picture</label>
            <div className="flex items-center space-x-4">
                <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Choose File
                    <input type="file" id="profilePic" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
                {profilePicPreview && (
                    <img src={profilePicPreview} alt="Preview" className="h-10 w-10 rounded-full object-cover border border-slate-300" />
                )}
            </div>
        </div>

        {/* Quick Add Relationship Toggle */}
        {people.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
                 <div className="flex items-center mb-2">
                    <input 
                        id="useInitialRel" 
                        type="checkbox" 
                        checked={useInitialRel} 
                        onChange={(e) => setUseInitialRel(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="useInitialRel" className="ml-2 block text-sm text-slate-700">
                        Add immediate relationship
                    </label>
                 </div>
                 
                 {useInitialRel && (
                     <div className="bg-slate-50 p-3 rounded-md space-y-3">
                         <div className="text-sm text-slate-600 mb-1">This new person is the...</div>
                         <div className="grid grid-cols-1 gap-2">
                             <select
                                value={relType}
                                onChange={(e) => setRelType(e.target.value as any)}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                             >
                                 <option value="">Select Relationship...</option>
                                 <option value={DirectRelationshipType.FATHER}>Father</option>
                                 <option value={DirectRelationshipType.MOTHER}>Mother</option>
                                 <option value="SON">Son</option>
                                 <option value="DAUGHTER">Daughter</option>
                                 <option value={DirectRelationshipType.SPOUSE}>Spouse</option>
                                 <option value={DirectRelationshipType.SIBLING}>Sibling</option>
                             </select>
                             <div className="text-sm text-slate-600 text-center">of</div>
                             <select
                                value={relatedPersonId}
                                onChange={(e) => setRelatedPersonId(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                             >
                                 <option value="">Select Person...</option>
                                 {people.map(p => (
                                     <option key={p.id} value={p.id}>{p.name}</option>
                                 ))}
                             </select>
                         </div>
                     </div>
                 )}
            </div>
        )}

        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          Add Person
        </button>
      </form>
    </div>
  );
};

export default AddPersonForm;
