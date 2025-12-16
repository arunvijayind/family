import { Person, StoredRelationship, RelationshipPath, PathSegment, DirectRelationshipType } from '../types';

// Helper to find a relationship ID between two people for a given type
// This is simplified; assumes only one such direct relationship can exist for non-spouse types
// from person1 to person2. For spouse, it's symmetrical.
function findRelationshipId(p1Id: string, p2Id: string, typePrefix: string, relationships: StoredRelationship[]): string | undefined {
    return relationships.find(r => {
        let typeMatches = false;
        if (typePrefix.includes("father") && r.type === DirectRelationshipType.FATHER) typeMatches = true;
        else if (typePrefix.includes("mother") && r.type === DirectRelationshipType.MOTHER) typeMatches = true;
        else if (typePrefix.includes("spouse") && r.type === DirectRelationshipType.SPOUSE) typeMatches = true;
        else if (typePrefix.includes("sibling") && r.type === DirectRelationshipType.SIBLING) typeMatches = true;
        
        if (!typeMatches) return false;

        if (typePrefix.startsWith("is child of")) { // p1 is child, p2 is parent
             return r.toPersonId === p1Id && r.fromPersonId === p2Id;
        } else if (r.type === DirectRelationshipType.SIBLING) { // Sibling relationship is symmetrical for ID finding
            return (r.fromPersonId === p1Id && r.toPersonId === p2Id) || (r.fromPersonId === p2Id && r.toPersonId === p1Id);
        }
         else { // p1 is parent/spouse, p2 is child/spouse
             return r.fromPersonId === p1Id && r.toPersonId === p2Id;
        }
    })?.id;
}


export function findRelationshipPath(
  startPersonId: string,
  endPersonId: string,
  people: Person[],
  relationships: StoredRelationship[]
): RelationshipPath | null {
  if (startPersonId === endPersonId) {
    const person = people.find(p => p.id === startPersonId);
    return person ? [{ person }] : null;
  }

  const adj = new Map<string, { personId: string; relationshipLabel: string, relationshipId?: string }[]>();

  for (const person of people) {
    adj.set(person.id, []);
  }

  for (const rel of relationships) {
    const fromPerson = people.find(p => p.id === rel.fromPersonId);
    const toPerson = people.find(p => p.id === rel.toPersonId);

    if (!fromPerson || !toPerson) continue;

    switch (rel.type) {
      case DirectRelationshipType.FATHER:
        adj.get(rel.fromPersonId)!.push({ personId: rel.toPersonId, relationshipLabel: `is father of`, relationshipId: rel.id });
        adj.get(rel.toPersonId)!.push({ personId: rel.fromPersonId, relationshipLabel: `is child of (father: ${fromPerson.name})`, relationshipId: rel.id });
        break;
      case DirectRelationshipType.MOTHER:
        adj.get(rel.fromPersonId)!.push({ personId: rel.toPersonId, relationshipLabel: `is mother of`, relationshipId: rel.id });
        adj.get(rel.toPersonId)!.push({ personId: rel.fromPersonId, relationshipLabel: `is child of (mother: ${fromPerson.name})`, relationshipId: rel.id });
        break;
      case DirectRelationshipType.SPOUSE:
        adj.get(rel.fromPersonId)!.push({ personId: rel.toPersonId, relationshipLabel: `is spouse of`, relationshipId: rel.id });
        adj.get(rel.toPersonId)!.push({ personId: rel.fromPersonId, relationshipLabel: `is spouse of`, relationshipId: rel.id });
        break;
      case DirectRelationshipType.SIBLING:
        // Sibling relationship is bidirectional
        adj.get(rel.fromPersonId)!.push({ personId: rel.toPersonId, relationshipLabel: `is sibling of`, relationshipId: rel.id });
        adj.get(rel.toPersonId)!.push({ personId: rel.fromPersonId, relationshipLabel: `is sibling of`, relationshipId: rel.id });
        break;
    }
  }

  const queue: { personId: string; currentPath: PathSegment[] }[] = [];
  const startNode = people.find(p => p.id === startPersonId);
  if (!startNode) return null;

  queue.push({ personId: startPersonId, currentPath: [{ person: startNode }] });
  const visited = new Set<string>([startPersonId]); 

  while (queue.length > 0) {
    const { personId, currentPath } = queue.shift()!;
    
    if (personId === endPersonId) {
      return currentPath; 
    }

    const neighbors = adj.get(personId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.personId)) {
        visited.add(neighbor.personId);
        const neighborPerson = people.find(p => p.id === neighbor.personId);
        if (neighborPerson) {
          const lastSegmentInPath = currentPath[currentPath.length - 1];
          const updatedLastSegment = { 
            ...lastSegmentInPath, 
            relationshipToNext: neighbor.relationshipLabel,
            relationshipId: neighbor.relationshipId 
          };
          const newPath = [...currentPath.slice(0, -1), updatedLastSegment, { person: neighborPerson }];
          queue.push({ personId: neighbor.personId, currentPath: newPath });
        }
      }
    }
  }

  return null; 
}


export function deriveComplexRelationship(
  path: RelationshipPath | null,
  allPeople: Person[] 
): string | null {
  if (!path || path.length < 2) return null;

  const startPerson = path[0].person;
  const endPerson = path[path.length - 1].person;

  if (path.length === 2) { // Direct relationship
    const p1Segment = path[0];
    if (p1Segment.relationshipToNext) {
      if (p1Segment.relationshipToNext.startsWith("is child of")) {
        return `${startPerson.name} is child of ${endPerson.name}.`;
      }
       if (p1Segment.relationshipToNext.includes("is sibling of")) {
        return `${startPerson.name} and ${endPerson.name} are siblings.`;
      }
      return `${startPerson.name} ${p1Segment.relationshipToNext} ${endPerson.name}.`;
    }
  }

  if (path.length === 3) { // One intermediate person
    const p1Segment = path[0]; 
    const p2Segment = path[1]; 
    const p1RelToP2 = p1Segment.relationshipToNext; // P1 -> P2
    const p2RelToP3 = p2Segment.relationshipToNext; // P2 -> P3 (EndPerson)

    // Grandparent/Grandchild
    if ((p1RelToP2?.includes("is father of") || p1RelToP2?.includes("is mother of")) &&
        (p2RelToP3?.includes("is father of") || p2RelToP3?.includes("is mother of"))) {
      const genderTerm = startPerson.gender === 'male' ? 'grandfather' : startPerson.gender === 'female' ? 'grandmother' : 'grandparent';
      return `${startPerson.name} is ${genderTerm} of ${endPerson.name}.`;
    }

    if (p1RelToP2?.startsWith("is child of") && p2RelToP3?.startsWith("is child of")) {
      const genderTerm = startPerson.gender === 'male' ? 'grandson' : startPerson.gender === 'female' ? 'granddaughter' : 'grandchild';
      return `${startPerson.name} is ${genderTerm} of ${endPerson.name}.`;
    }
    
    // Parent-in-law / Child-in-law
    // A is parent of B, B is spouse of C  => A is parent-in-law of C
    if ((p1RelToP2?.includes("is father of") || p1RelToP2?.includes("is mother of")) &&
         p2RelToP3?.includes("is spouse of")) {
        const genderTerm = startPerson.gender === 'male' ? 'father-in-law' : startPerson.gender === 'female' ? 'mother-in-law' : 'parent-in-law';
        return `${startPerson.name} is ${genderTerm} of ${endPerson.name}.`;
    }
    // A is spouse of B, B is child of C => A is child-in-law of C
    if (p1RelToP2?.includes("is spouse of") && p2RelToP3?.startsWith("is child of")) {
        const genderTerm = startPerson.gender === 'male' ? 'son-in-law' : startPerson.gender === 'female' ? 'daughter-in-law' : 'child-in-law';
        return `${startPerson.name} is ${genderTerm} of ${endPerson.name}.`;
    }

    // Uncle/Aunt - Nephew/Niece
    // P1 is Sibling of P2, P2 is Parent of P3 => P1 is Uncle/Aunt of P3
    if (p1RelToP2?.includes("is sibling of") && (p2RelToP3?.includes("is father of") || p2RelToP3?.includes("is mother of"))) {
        const genderTerm = startPerson.gender === 'male' ? 'uncle' : startPerson.gender === 'female' ? 'aunt' : 'aunt/uncle';
        return `${startPerson.name} is ${genderTerm} of ${endPerson.name}.`;
    }
    // P1 is Parent of P2, P2 is Sibling of P3 => P1 is Parent of P3's Sibling (i.e., P1 is Parent of P3)
    // This is covered by direct parent check or grandparent if there's another generation.
    // For Nephew/Niece: P1 is Child of P2, P2 is Sibling of P3 => P1 is Nephew/Niece of P3
     if (p1RelToP2?.startsWith("is child of") && p2RelToP3?.includes("is sibling of")) {
        const genderTerm = startPerson.gender === 'male' ? 'nephew' : startPerson.gender === 'female' ? 'niece' : 'nephew/niece';
        return `${startPerson.name} is ${genderTerm} of ${endPerson.name}.`;
    }
  }

  return null; // Could provide a generic "Connected via..." for longer paths
}