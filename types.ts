
import type * as d3 from 'd3';

// Fix: Added missing pipe '|' before 'other'
export type Gender = 'male' | 'female' | 'other' | 'unknown';

export interface Person {
  id: string;
  name: string;
  gender: Gender;
  birthDate?: string; // YYYY-MM-DD format
  profilePicUrl?: string; 
}

export enum DirectRelationshipType {
  FATHER = 'FATHER', 
  MOTHER = 'MOTHER', 
  SPOUSE = 'SPOUSE',
  SIBLING = 'SIBLING',
}

export interface StoredRelationship {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  type: DirectRelationshipType; 
}

export interface PathSegment {
  person: Person;
  relationshipToNext?: string; 
  relationshipId?: string; 
}

export type RelationshipPath = PathSegment[];

// For D3.js force simulation
export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  gender: Gender;
  birthDate?: string;
  profilePicUrl?: string;
  isHighlighted?: boolean; 
  radius?: number; // For node size and collision
  // d3.SimulationNodeDatum adds: index, x, y, vx, vy, fx, fy
  // Explicitly defining them to ensure availability even if d3 types inference issues occur
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

// For D3.js force simulation
export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  id: string; 
  // source and target will be GraphNode objects after D3 processes them, 
  // initially they can be string IDs.
  source: string | GraphNode; 
  target: string | GraphNode; 
  type: DirectRelationshipType;
  isHighlighted?: boolean; 
}
