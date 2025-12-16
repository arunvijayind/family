import { Person, StoredRelationship, DirectRelationshipType } from './types';

export const INITIAL_PEOPLE: Person[] = [
  { id: '1', name: 'John Doe', gender: 'male', birthDate: '1970-05-15', profilePicUrl: undefined },
  { id: '2', name: 'Jane Smith', gender: 'female', birthDate: '1972-08-20', profilePicUrl: undefined },
  { id: '3', name: 'Mike Doe', gender: 'male', birthDate: '1995-01-10', profilePicUrl: undefined },
  { id: '4', name: 'Sarah Doe', gender: 'female', birthDate: '1998-11-25', profilePicUrl: undefined },
  { id: '5', name: 'Robert Roe', gender: 'male', birthDate: '1996-07-01', profilePicUrl: undefined },
  { id: '6', name: 'Emily Poe', gender: 'female', birthDate: '2020-03-03', profilePicUrl: undefined },
  { id: '7', name: 'Chris Doe', gender: 'male', birthDate: '1992-06-01', profilePicUrl: undefined}, // Sibling for Mike/Sarah
];

export const INITIAL_RELATIONSHIPS: StoredRelationship[] = [
  // John and Jane are spouses
  { id: 'r1', fromPersonId: '1', toPersonId: '2', type: DirectRelationshipType.SPOUSE },
  // John is father of Mike, Sarah, Chris
  { id: 'r2', fromPersonId: '1', toPersonId: '3', type: DirectRelationshipType.FATHER },
  { id: 'r3', fromPersonId: '1', toPersonId: '4', type: DirectRelationshipType.FATHER },
  { id: 'r9', fromPersonId: '1', toPersonId: '7', type: DirectRelationshipType.FATHER },
  // Jane is mother of Mike, Sarah, Chris
  { id: 'r4', fromPersonId: '2', toPersonId: '3', type: DirectRelationshipType.MOTHER },
  { id: 'r5', fromPersonId: '2', toPersonId: '4', type: DirectRelationshipType.MOTHER },
  { id: 'r10', fromPersonId: '2', toPersonId: '7', type: DirectRelationshipType.MOTHER },
  // Sarah and Robert are spouses
  { id: 'r6', fromPersonId: '4', toPersonId: '5', type: DirectRelationshipType.SPOUSE },
  // Robert is father of Emily
  { id: 'r7', fromPersonId: '5', toPersonId: '6', type: DirectRelationshipType.FATHER },
  // Sarah is mother of Emily
  { id: 'r8', fromPersonId: '4', toPersonId: '6', type: DirectRelationshipType.MOTHER },
  // Sibling relationships (example, could be one way or bidirectional based on convention)
  // For simplicity, we'll treat SIBLING as a single link connecting two siblings.
  // The pathfinder logic will need to understand its bidirectional nature.
  { id: 's1', fromPersonId: '3', toPersonId: '4', type: DirectRelationshipType.SIBLING }, // Mike and Sarah
  { id: 's2', fromPersonId: '3', toPersonId: '7', type: DirectRelationshipType.SIBLING }, // Mike and Chris
  { id: 's3', fromPersonId: '4', toPersonId: '7', type: DirectRelationshipType.SIBLING }, // Sarah and Chris
];