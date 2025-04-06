import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { sankeyLinkHorizontal } from 'd3-sankey'; // Keep standard link generator
import { sankeyCircular } from 'd3-sankey-circular'; // Use sankeyCircular again
// import { sankeyCircular } from 'd3-sankey-circular';

const SankeyDiagram = ({ data, width = 960, height = 500 }) => {
  const svgRef = useRef();
  const tooltipRef = useRef(); // Ref for a tooltip div

  // Define margins
  const margin = { top: 20, right: 50, bottom: 20, left: 50 }; // Reduced horizontal margins
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Memoize processed data to avoid recalculation on every render unless data changes
  const processedData = useMemo(() => {
    if (!data || !data.nodes || !data.links || data.nodes.length === 0) {
      return null;
    }
    // Deep copy data to avoid mutating the original prop
    const graph = JSON.parse(JSON.stringify(data)); 

    // *** Log if any links have zero or negative value ***
    const zeroValueLinks = graph.links.filter(link => link.value <= 0);
    if (zeroValueLinks.length > 0) {
      console.warn("Warning: Sankey input data contains links with zero or negative value:", zeroValueLinks);
    }
    // *** End Log ***

    // Create the Sankey layout generator using sankeyCircular
    const sankeyLayout = sankeyCircular() // Use the circular version again
      .nodeId(d => d.id)
      .nodeWidth(20) // Width of the node rectangles
      .nodePadding(15) // Vertical space between nodes in the same column
      // .nodeAlign(d3.sankeyLeft) // Temporarily remove alignment constraint
      .extent([[0, 0], [innerWidth, innerHeight]]);

    // Compute the Sankey layout
    let layout;
    try {
      layout = sankeyLayout(graph);
    } catch (error) {
      console.error("Error during Sankey layout calculation:", error);
      // Avoid stringifying the potentially cyclic graph object
      console.error("Data causing error (structure might be cyclic):", graph);
      // Return null or some indicator that layout failed
      return null; 
    }
    
    // TODO: Attempt to enforce Income left, Expense right? 
    // This often requires manual manipulation of node.x0, node.x1 after layout calculation
    // Or potentially defining node columns/layers explicitly if possible.

    return layout;
  }, [data, innerWidth, innerHeight]);

  // Color scale based on node type
  const color = useMemo(() => {
    return d3.scaleOrdinal()
      .domain(['income', 'expense', 'asset', 'liability', 'equity', 'unknown'])
      .range(['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#cccccc']); // Example color scheme
  }, []);

  useEffect(() => {
    if (!processedData) return;

    // *** Log the data after layout calculation ***
    console.log("Data after layout calculation:", processedData);
    // *** End Log ***

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Clear previous render
    svg.selectAll("*").remove();

    const group = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Tooltip Div Setup
    const tooltip = d3.select(tooltipRef.current)
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background-color', 'rgba(0, 0, 0, 0.7)')
        .style('color', 'white')
        .style('padding', '8px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none'); // Prevent tooltip from blocking mouse events

    // --- Render Links ---
    const link = group.append('g')
      .attr('fill', 'none')
      .attr('stroke-opacity', 0.5)
      .selectAll('g')
      .data(processedData.links)
      .join('g')
        .style('mix-blend-mode', 'multiply'); // Blending mode can look nice

    link.append('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', d => color(d.source.type || 'unknown')) // Color link based on source node type
      .attr('stroke-width', d => Math.max(1, d.width))
      // Apply dashed style for non-USD units
      .style('stroke-dasharray', d => d.unit !== 'USD' ? '5, 5' : 'none')
      .on('mouseover', (event, d) => {
        tooltip
            .style('visibility', 'visible')
            .html(`
                <strong>Flow:</strong> ${d.source.name} -> ${d.target.name}<br>
                <strong>Amount:</strong> ${d.value.toFixed(2)} ${d.unit}<br>
                ${d.unit !== 'USD' ? '<span style="color: yellow;">(Non-USD)</span>' : ''}
            `);
        d3.select(event.currentTarget).attr('stroke-opacity', 0.8);
      })
      .on('mousemove', (event) => {
        // Get coordinates relative to the main group ('g') element
        const [x, y] = d3.pointer(event, group.node()); 
        tooltip
            .style('top', (y - 10) + 'px')  // Use relative y
            .style('left', (x + 10) + 'px'); // Use relative x
      })
      .on('mouseout', (event) => {
        tooltip.style('visibility', 'hidden');
        d3.select(event.currentTarget).attr('stroke-opacity', 0.5);
      });

    // --- Render Nodes ---
    const node = group.append('g')
      .attr('stroke', '#000')
      .selectAll('rect')
      .data(processedData.nodes)
      .join('rect')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('height', d => d.y1 - d.y0)
        .attr('width', d => d.x1 - d.x0)
        .attr('fill', d => color(d.type || 'unknown'))
        .on('mouseover', (event, d) => {
          tooltip
              .style('visibility', 'visible')
              .html(`
                  <strong>Account:</strong> ${d.name}<br>
                  <strong>Type:</strong> ${d.type}<br>
                  <strong>Total Flow:</strong> ${d.totalFlow.toFixed(2)} ${d.unit}<br>
                  ${d.unit !== 'USD' ? '<span style="color: yellow;">(Non-USD)</span>' : ''}
              `);
          d3.select(event.currentTarget).attr('stroke-width', 1.5);
        })
        .on('mousemove', (event) => {
            // Get coordinates relative to the main group ('g') element
            const [x, y] = d3.pointer(event, group.node());
            tooltip
                .style('top', (y - 10) + 'px') // Use relative y
                .style('left', (x + 10) + 'px'); // Use relative x
        })
        .on('mouseout', (event) => {
            tooltip.style('visibility', 'hidden');
            d3.select(event.currentTarget).attr('stroke-width', 1);
        });

    // Add node labels
    group.append('g')
        .attr('font-family', 'sans-serif')
        .attr('font-size', 10)
      .selectAll('text')
      .data(processedData.nodes)
      .join('text')
        .attr('x', d => d.x1 + 6) // Position label to the right of the node
        .attr('y', d => (d.y1 + d.y0) / 2) // Vertically center label
        .attr('dy', '0.35em') // Adjust vertical alignment
        .attr('text-anchor', 'start') // Align text start to the position
        .text(d => `${d.name} (${d.totalFlow.toFixed(0)} ${d.unit})`) // Show name and total flow
        // Truncate long labels if needed
        .filter(d => d.x1 < width / 2) // Check if node is on the left side (adjust condition if needed)
          .attr('x', d => d.x0 - 6) // Position label to the left for left-side nodes
          .attr('text-anchor', 'end'); // Align text end to the position

  }, [processedData, width, height, margin, innerWidth, innerHeight, color]); // Include all dependencies

  if (!processedData) {
    // Can return null, a placeholder, or the empty SVG container
    return (
        <div style={{ width, height }}>
            <svg ref={svgRef}></svg>
            <div ref={tooltipRef}></div> {/* Tooltip div needs to exist */} 
        </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}> {/* Container for SVG and absolute positioned tooltip */}
        <svg ref={svgRef}></svg>
        <div ref={tooltipRef}></div>
    </div>
  );
};

export default SankeyDiagram; 