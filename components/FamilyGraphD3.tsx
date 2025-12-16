
import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphLink, DirectRelationshipType, Gender } from '../types'; // Corrected import path and added Gender

interface FamilyGraphD3Props {
  nodes: GraphNode[];
  links: GraphLink[];
  hasHighlightActive: boolean;
  onEditPerson: (personId: string) => void;
  onDeleteRelationship: (relationshipId: string) => void;
  onDeletePerson: (personId: string) => void;
}

// Define an internal type that includes the emoji property
interface ProcessedGraphNode extends GraphNode {
  emoji: string;
}

// Fix: Define InternalD3Link for use with ProcessedGraphNode in D3 simulation
// This type ensures compatibility with d3.forceLink when nodes are ProcessedGraphNode.
interface InternalD3Link extends d3.SimulationLinkDatum<ProcessedGraphNode> {
  id: string;
  type: DirectRelationshipType;
  isHighlighted?: boolean;
  // Explicitly define source and target to satisfy TypeScript if extension inference fails
  source: string | number | ProcessedGraphNode;
  target: string | number | ProcessedGraphNode;
}


const GENDER_COLORS_D3: Record<Gender, string> = {
  male: '#1e3a8a', // blue-800 (darker, vibrant for node background on dark theme)
  female: '#9d174d', // pink-800 (darker, vibrant)
  other: '#065f46', // emerald-800 (darker, vibrant)
  unknown: '#374151', // gray-700 (darker)
};

const getAge = (birthDate?: string): number | null => {
  if (!birthDate) return null;
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  } catch (e) {
    return null;
  }
};

const getEmojiForNode = (node: GraphNode): string => {
  const age = getAge(node.birthDate);
  
  if (age !== null) {
    if (age <= 3) return '👶'; 
    if (age <= 12) { 
      if (node.gender === 'male') return '👦';
      if (node.gender === 'female') return '👧';
      return '🧒'; 
    }
    if (age <= 19) { 
      if (node.gender === 'male') return '🧑'; 
      if (node.gender === 'female') return '🧑'; 
      return '🧑';
    }
    if (age <= 64) { 
      if (node.gender === 'male') return '👨';
      if (node.gender === 'female') return '👩';
      return '🧑';
    }
    if (age >= 65) { 
      if (node.gender === 'male') return '👴';
      if (node.gender === 'female') return '👵';
      return '🧓'; 
    }
  }
  // Fallback if age is null or not in defined ranges (should cover most cases with unknown as default)
  switch (node.gender) {
    case 'male': return '👨';
    case 'female': return '👩';
    case 'other': return '🧑';
    default: return '👤';
  }
};


const NODE_RADIUS = 25; 
const EMOJI_FONT_SIZE = NODE_RADIUS * 1.4; 
const CLIP_PATH_ID = "node-profile-clip";

const FamilyGraphD3: React.FC<FamilyGraphD3Props> = ({ nodes: initialNodes, links: initialLinks, hasHighlightActive, onEditPerson, onDeleteRelationship, onDeletePerson }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [clickedLinkDetails, setClickedLinkDetails] = useState<{ id: string, text: string, x: number, y: number } | null>(null);
  const [clickedNodeDetails, setClickedNodeDetails] = useState<{ id: string, name: string, x: number, y: number } | null>(null);
  const [hoveredLinkDetails, setHoveredLinkDetails] = useState<{ text: string, x: number, y: number } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 2000, height: 1500 });

  const processedNodes: ProcessedGraphNode[] = useMemo(() => initialNodes.map(n => ({ 
      ...n, 
      radius: n.radius || NODE_RADIUS,
      emoji: getEmojiForNode(n) 
    })), [initialNodes]);

  const processedLinks: InternalD3Link[] = useMemo(() => initialLinks.map(link => ({
    id: link.id,
    type: link.type,
    isHighlighted: link.isHighlighted,
    source: link.source as string, // D3 will resolve to GraphNode
    target: link.target as string, // D3 will resolve to GraphNode
  })), [initialLinks]);

  useEffect(() => {
    const containerElement = containerRef.current;
    if (!containerElement) return;

    const observer = new ResizeObserver(() => {
      const { width, height } = containerElement.getBoundingClientRect();
      setDimensions({
        width: Math.max(width, 2000), // Ensure minimum size for simulation stability
        height: Math.max(height, 1500),
      });
    });

    observer.observe(containerElement);
    
    // Initial set
    const { width, height } = containerElement.getBoundingClientRect();
    setDimensions({
        width: Math.max(width, 2000),
        height: Math.max(height, 1500),
    });

    return () => {
      observer.unobserve(containerElement);
      observer.disconnect();
    };
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

  const { width: svgWidth, height: svgHeight } = dimensions;

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const containerElement = containerRef.current;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous SVG content
    
    svg.attr('width', svgWidth)
       .attr('height', svgHeight)
       .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`) // Use viewBox for better scaling if needed
       .on('click', (event) => { // Click on SVG background to clear link tooltip
            if (event.target === svg.node()) { // Ensure click is on SVG itself, not a child
                setClickedLinkDetails(null);
                setClickedNodeDetails(null);
            }
       });
    
    const defs = svg.append('defs');

    // Define clip path for circular images
    defs.append('clipPath')
        .attr('id', CLIP_PATH_ID)
      .append('circle')
        .attr('r', NODE_RADIUS);

    // Setup simulation
    const simulation = d3.forceSimulation<ProcessedGraphNode>(processedNodes)
      .force('link', d3.forceLink<ProcessedGraphNode, InternalD3Link>(processedLinks) 
                      .id((d: ProcessedGraphNode) => d.id as string) 
                      .distance(180) 
                      .strength(0.5)) 
      .force('charge', d3.forceManyBody().strength(-500)) 
      .force('collision', d3.forceCollide<ProcessedGraphNode>().radius(d => (d.radius || NODE_RADIUS) + 25)) 
      .force('center', d3.forceCenter(svgWidth / 2, svgHeight / 2))
      .on('tick', ticked);

    // Define marker colors based on type
    const markerColor = (type: DirectRelationshipType) => {
        switch(type) {
            case DirectRelationshipType.FATHER: return '#60a5fa'; // blue-400
            case DirectRelationshipType.MOTHER: return '#f472b6'; // pink-400
            default: return '#9ca3af'; // gray-400 (default/unused for now)
        }
    };

    // Define arrow markers
    defs.selectAll('marker') 
      .data([DirectRelationshipType.FATHER, DirectRelationshipType.MOTHER]) 
      .join('marker')
        .attr('id', d => `arrow-${d}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', NODE_RADIUS + 7) 
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
      .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', d => markerColor(d));

    // Function to get relationship text for tooltips
    const getRelationshipText = (d_link: InternalD3Link): string => {
        const sourceNode = d_link.source as ProcessedGraphNode; 
        const targetNode = d_link.target as ProcessedGraphNode;
        const relTypeDisplay = d_link.type.charAt(0) + d_link.type.slice(1).toLowerCase().replace('_', ' ');
        let message = '';

        if (d_link.type === DirectRelationshipType.SPOUSE || d_link.type === DirectRelationshipType.SIBLING) {
            message = `${sourceNode.name} is ${relTypeDisplay.toLowerCase()} of ${targetNode.name}`;
        } else { 
            message = `${sourceNode.name} is ${relTypeDisplay.toLowerCase()} of ${targetNode.name}`;
        }
        return message;
    };

    // Create links
    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll<SVGPathElement, InternalD3Link>('path') 
      .data(processedLinks, d => d.id)
      .join('path')
        .attr('class', d => `link type-${d.type}`) 
        .attr('marker-end', d => {
          if (d.type === DirectRelationshipType.FATHER) return `url(#arrow-FATHER)`;
          if (d.type === DirectRelationshipType.MOTHER) return `url(#arrow-MOTHER)`;
          return null; 
        })
        .on('click', function(event, d_link: InternalD3Link) { 
            event.stopPropagation(); 
            const message = getRelationshipText(d_link);
            const containerRect = containerElement.getBoundingClientRect();
            setClickedLinkDetails({
                id: d_link.id,
                text: message,
                x: event.clientX - containerRect.left + containerElement.scrollLeft + 15, 
                y: event.clientY - containerRect.top + containerElement.scrollTop + 15,
            });
            setClickedNodeDetails(null);
            setHoveredLinkDetails(null); 
        })
        .on('mouseenter', function(event, d_link: InternalD3Link) {
            if (clickedLinkDetails && (clickedLinkDetails.text === getRelationshipText(d_link))) return; // Don't show hover if this link is already clicked
            const message = getRelationshipText(d_link);
            const containerRect = containerElement.getBoundingClientRect();
            setHoveredLinkDetails({
                text: message,
                x: event.clientX - containerRect.left + containerElement.scrollLeft + 15,
                y: event.clientY - containerRect.top + containerElement.scrollTop - 5, 
            });
        })
        .on('mouseleave', function() {
            setHoveredLinkDetails(null);
        });

    // Create node groups
    const nodeGroup = svg.append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, ProcessedGraphNode>('g') 
      .data(processedNodes, d => d.id as string) 
      .join('g')
        .attr('class', 'node')
        .call(drag(simulation) as any); 

    // Background circle for color and highlight target
    nodeGroup.append('circle')
      .attr('r', d => d.radius || NODE_RADIUS)
      .attr('fill', d => GENDER_COLORS_D3[d.gender] || GENDER_COLORS_D3.unknown)
      .attr('stroke', '#4b5563') 
      .attr('stroke-width', 1.5)
      .on('click', (event, d_node) => {
          event.stopPropagation();
          const containerRect = containerElement.getBoundingClientRect();
          setClickedNodeDetails({
              id: d_node.id,
              name: d_node.name,
              x: event.clientX - containerRect.left + containerElement.scrollLeft + 15,
              y: event.clientY - containerRect.top + containerElement.scrollTop + 15
          });
          setClickedLinkDetails(null);
          setHoveredLinkDetails(null);
      });
      
    // Append image or emoji
    nodeGroup.each(function(d_node) { 
        const group = d3.select(this);
        if (d_node.profilePicUrl) {
            group.append('image')
                .attr('href', d_node.profilePicUrl)
                .attr('x', -(d_node.radius || NODE_RADIUS))
                .attr('y', -(d_node.radius || NODE_RADIUS))
                .attr('height', (d_node.radius || NODE_RADIUS) * 2)
                .attr('width', (d_node.radius || NODE_RADIUS) * 2)
                .attr('clip-path', `url(#${CLIP_PATH_ID})`)
                .on('click', (event) => {
                    event.stopPropagation();
                    const containerRect = containerElement.getBoundingClientRect();
                    setClickedNodeDetails({
                        id: d_node.id,
                        name: d_node.name,
                        x: event.clientX - containerRect.left + containerElement.scrollLeft + 15,
                        y: event.clientY - containerRect.top + containerElement.scrollTop + 15
                    });
                    setClickedLinkDetails(null);
                    setHoveredLinkDetails(null);
                });
        } else {
            group.append('text')
                .attr('class', 'emoji-node')
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'central')
                .style('font-size', `${EMOJI_FONT_SIZE}px`)
                .style('-webkit-user-select', 'none') 
                .style('user-select', 'none')
                .text(d_node.emoji)
                .on('click', (event) => {
                    event.stopPropagation();
                    const containerRect = containerElement.getBoundingClientRect();
                    setClickedNodeDetails({
                        id: d_node.id,
                        name: d_node.name,
                        x: event.clientX - containerRect.left + containerElement.scrollLeft + 15,
                        y: event.clientY - containerRect.top + containerElement.scrollTop + 15
                    });
                    setClickedLinkDetails(null);
                    setHoveredLinkDetails(null);
                });
        }
    });

    // Node name labels (background for halo effect)
    nodeGroup.append('text')
        .attr('class', 'node-label-bg') 
        .attr('dy', d => (d.radius || NODE_RADIUS) + 12) 
        .text(d => d.name)
        .on('click', (event, d_node) => { 
            event.stopPropagation();
            const containerRect = containerElement.getBoundingClientRect();
            setClickedNodeDetails({
                id: d_node.id,
                name: d_node.name,
                x: event.clientX - containerRect.left + containerElement.scrollLeft + 15,
                y: event.clientY - containerRect.top + containerElement.scrollTop + 15
            });
            setClickedLinkDetails(null); 
            setHoveredLinkDetails(null);
        });
    
    // Node name labels (foreground)
    nodeGroup.append('text')
      .attr('class', 'node-label-fg') 
      .attr('dy', d => (d.radius || NODE_RADIUS) + 12) 
      .text(d => d.name)
      .on('click', (event, d_node) => { 
        event.stopPropagation();
        const containerRect = containerElement.getBoundingClientRect();
        setClickedNodeDetails({
            id: d_node.id,
            name: d_node.name,
            x: event.clientX - containerRect.left + containerElement.scrollLeft + 15,
            y: event.clientY - containerRect.top + containerElement.scrollTop + 15
        });
        setClickedLinkDetails(null); 
        setHoveredLinkDetails(null);
      });
      

    // Tick function to update positions
    function ticked() {
        link.attr('d', d => {
            const source = d.source as ProcessedGraphNode; 
            const target = d.target as ProcessedGraphNode;
            
            if (!source || !target || source.x == null || source.y == null || target.x == null || target.y == null) {
                 // console.warn("Skipping link draw due to unresolved/unpositioned nodes:", d);
                return `M0,0L0,0`; 
            }
            return `M${source.x},${source.y}L${target.x},${target.y}`;
        });
        nodeGroup.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    }

    // Function to initially pan and zoom (center content)
    const initialPanAndZoom = () => {
        if (processedNodes.length === 0 || !svg.node() || !containerElement) return;
    
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        processedNodes.forEach(node => {
            const x = node.x ?? svgWidth / 2; 
            const y = node.y ?? svgHeight / 2; 
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        });
        
        const padding = 100; 
        const contentWidth = (maxX - minX) || svgWidth / 2; 
        const contentHeight = (maxY - minY) || svgHeight / 2; 

        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        const graphActualWidth = Math.min(svgWidth, (maxX + padding) - minX);
        const graphActualHeight = Math.min(svgHeight, (maxY + padding) - minY);

        const clientWidth = containerElement.clientWidth;
        const clientHeight = containerElement.clientHeight;
    
        const scrollLeft = minX + graphActualWidth / 2 - clientWidth / 2;
        const scrollTop = minY + graphActualHeight / 2 - clientHeight / 2;

        containerElement.scrollLeft = Math.max(0, scrollLeft);
        containerElement.scrollTop = Math.max(0, scrollTop);
    };
    
    setTimeout(initialPanAndZoom, 200); 

    return () => {
      simulation.stop();
    };
  }, [processedNodes, processedLinks, svgWidth, svgHeight]); // Removed onEditPerson and others to avoid re-running simulation on callback change if they are not stable, though useCallback in App makes them stable.


  // Effect to apply highlighting classes
  useEffect(() => {
    const d3Svg = d3.select(svgRef.current);
    d3Svg.selectAll('.node')
      .classed('highlighted', d => (d as ProcessedGraphNode).isHighlighted || false) 
      .classed('dimmed', d => hasHighlightActive && !(d as ProcessedGraphNode).isHighlighted); 
    
    d3Svg.selectAll('.link')
      .classed('highlighted', d => (d as InternalD3Link).isHighlighted || false)
      .classed('dimmed', d => hasHighlightActive && !(d as InternalD3Link).isHighlighted);

  }, [hasHighlightActive, processedNodes, processedLinks]);

  // Drag handler
  function drag(simulation: d3.Simulation<ProcessedGraphNode, InternalD3Link>) { 
    function dragstarted(event: d3.D3DragEvent<SVGGElement, ProcessedGraphNode, ProcessedGraphNode>, d: ProcessedGraphNode) { 
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
      setClickedLinkDetails(null); 
      setClickedNodeDetails(null);
      setHoveredLinkDetails(null);
    }
    function dragged(event: d3.D3DragEvent<SVGGElement, ProcessedGraphNode, ProcessedGraphNode>, d: ProcessedGraphNode) { 
      d.fx = event.x;
      d.fy = event.y;
    }
    function dragended(event: d3.D3DragEvent<SVGGElement, ProcessedGraphNode, ProcessedGraphNode>, d: ProcessedGraphNode) { 
      if (!event.active) simulation.alphaTarget(0);
      // d.fx = null; // Keep node fixed after drag unless explicitly unfixed
      // d.fy = null; 
    }
    return d3.drag<SVGGElement, ProcessedGraphNode>() 
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }

  return (
    <div ref={containerRef} className="graph-container-d3 w-full h-full">
      <svg ref={svgRef}></svg>
      {/* Link Click Tooltip */}
      {clickedLinkDetails && (
        <div 
            style={{ 
                position: 'absolute', 
                left: clickedLinkDetails.x, 
                top: clickedLinkDetails.y,
                transform: 'translateY(-100%)', 
                marginTop: '-10px',
                pointerEvents: 'auto'
            }} 
            className="link-tooltip p-2 rounded-md shadow-lg text-sm z-50 flex items-center gap-2"
        >
          <span>{clickedLinkDetails.text}</span>
          <button 
            onClick={(e) => {
                e.stopPropagation();
                onDeleteRelationship(clickedLinkDetails.id);
                setClickedLinkDetails(null);
            }}
            className="text-red-400 hover:text-red-300 font-bold ml-1 p-1 hover:bg-slate-700 rounded"
            title="Delete Relationship"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Node Click Tooltip */}
      {clickedNodeDetails && (
        <div 
            style={{ 
                position: 'absolute', 
                left: clickedNodeDetails.x, 
                top: clickedNodeDetails.y,
                transform: 'translateY(-100%)', 
                marginTop: '-10px',
                pointerEvents: 'auto'
            }} 
            className="link-tooltip p-2 rounded-md shadow-lg text-sm z-50 flex items-center gap-3"
        >
          <span className="font-semibold text-slate-200">{clickedNodeDetails.name}</span>
          <div className="flex gap-1">
              <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onEditPerson(clickedNodeDetails.id);
                    setClickedNodeDetails(null);
                }}
                className="text-indigo-400 hover:text-indigo-300 p-1 hover:bg-slate-700 rounded"
                title="Edit Person"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onDeletePerson(clickedNodeDetails.id);
                    setClickedNodeDetails(null);
                }}
                className="text-red-400 hover:text-red-300 p-1 hover:bg-slate-700 rounded"
                title="Delete Person"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
          </div>
        </div>
      )}

      {/* Hover Tooltip */}
      {hoveredLinkDetails && (
        <div 
            style={{ 
                position: 'absolute', 
                left: hoveredLinkDetails.x, 
                top: hoveredLinkDetails.y,
                transform: 'translateY(-100%)', 
                marginTop: '-10px', 
            }} 
            className="link-tooltip p-2 rounded-md shadow-lg text-sm pointer-events-none z-50"
        >
          {hoveredLinkDetails.text}
        </div>
      )}
    </div>
  );
};

export default FamilyGraphD3;
