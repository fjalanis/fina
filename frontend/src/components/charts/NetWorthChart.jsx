import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { formatNumber } from '../../utils/formatters';

// Make width and height optional for responsiveness
const NetWorthChart = ({ data, width = null, height = 500 }) => {
  const svgRef = useRef();
  const tooltipRef = useRef();
  const containerRef = useRef(); // Ref for the container div

  useEffect(() => {
    if (!data || !data.trend || data.trend.length === 0 || !containerRef.current) {
      d3.select(svgRef.current).selectAll('*').remove(); // Clear if no data or container
      return;
    }

    // Get container dimensions for responsiveness
    const containerWidth = containerRef.current.clientWidth;
    const effectiveWidth = width || containerWidth; // Use prop width or container width

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    // Set up dimensions and margins
    const margin = { top: 40, right: 50, bottom: 60, left: 80 };
    const innerWidth = effectiveWidth - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG - use viewBox for scaling, remove fixed height attr
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${effectiveWidth} ${height}`) // Use viewBox
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('width', '100%') // Make SVG width responsive
      // .attr('height', height) // REMOVE fixed height attribute
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create tooltip - Apply styles similar to Sankey
    const tooltip = d3.select(tooltipRef.current)
      .style('opacity', 0)
      .attr('class', 'tooltip') // Keep class if needed for other purposes
      .style('position', 'absolute')
      .style('background-color', 'rgba(0, 0, 0, 0.7)') // Black transparent bg
      .style('color', 'white') // White text
      .style('border-radius', '4px') // Match radius
      .style('padding', '8px') // Match padding
      .style('font-size', '12px') // Match font size
      .style('pointer-events', 'none');
      // Removed border, box-shadow

    // Parse dates and ensure numeric values
    const parseDate = d3.timeParse('%Y-%m-%dT%H:%M:%S.%LZ');
    const formattedData = data.trend.map(d => {
        const date = parseDate(d.date);
        const assets = +d.assets || 0; // Ensure number, default 0
        const liabilities = +d.liabilities || 0; // Ensure number, default 0
        const netWorth = +d.netWorth || (assets - liabilities); // Ensure number or calculate
        return { date, assets, liabilities, netWorth };
    }).filter(d => d.date instanceof Date && !isNaN(d.date)); // Filter out invalid dates

    // Adjust liabilities to be negative
    const adjustedData = formattedData.map(d => ({
      ...d,
      liabilities: -d.liabilities // Make liabilities negative
    }));

    // Set up scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(formattedData, d => d.date))
      .range([0, innerWidth]);

    // Single Y-Scale for Assets, Liabilities, and Net Worth
    const yMin = d3.min(adjustedData, d => Math.min(d.liabilities, d.netWorth)); // Include net worth in min
    const yMax = d3.max(adjustedData, d => Math.max(d.assets, d.netWorth)); // Include net worth in max
    const yScale = d3.scaleLinear()
      // Ensure domain always includes 0, add padding
      .domain([Math.min(0, yMin * 1.1), Math.max(0, yMax * 1.1)])
      .range([innerHeight, 0])
      .nice(); // Adjust domain to nice round values

    const yZero = yScale(0); // Get pixel position for Y=0

    // Create color scales
    const colorScale = d3.scaleOrdinal()
      .domain(['assets', 'liabilities', 'netWorth'])
      .range(['#10B981', '#EF4444', '#3B82F6']);

    // Add X axis at Y=0
    svg.append('g')
      .attr('transform', `translate(0,${yZero})`) // Position at Y=0
      .call(d3.axisBottom(xScale)
        .ticks(5)
        .tickFormat(d3.timeFormat('%b %Y')))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');

    // Add SINGLE Y axis (Left)
    svg.append('g')
      .call(d3.axisLeft(yScale)
        .ticks(5)
        .tickFormat(d => formatNumber(d)))
      .append('text')
      .attr('fill', '#000') // Ensure text is visible
      .attr('transform', 'rotate(-90)')
      .attr('y', 6)
      .attr('dy', '-4em') // Adjust position relative to axis
      .attr('dx', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .text('Amount'); // Simple label

    // Define area generators (using the single yScale)
    const areaAssets = d3.area()
      .x(d => xScale(d.date))
      .y0(yScale(0)) // Use scaled 0
      .y1(d => yScale(d.assets))
      .curve(d3.curveMonotoneX);

    const areaLiabilities = d3.area()
      .x(d => xScale(d.date))
      .y0(yScale(0)) // Use scaled 0
      .y1(d => yScale(d.liabilities)) // Use adjusted negative liabilities
      .curve(d3.curveMonotoneX);

    // Draw liability area (no change in drawing logic, uses new yScale)
    svg.append('path')
      .datum(adjustedData.filter(d => d.date)) // Filter out potential null dates
      .attr('fill', colorScale('liabilities'))
      .attr('opacity', 0.7)
      .attr('d', areaLiabilities);
      // Removed mouseover/mouseout for area path

    // Draw asset area (no change in drawing logic, uses new yScale)
    svg.append('path')
      .datum(adjustedData.filter(d => d.date)) // Filter out potential null dates
      .attr('fill', colorScale('assets'))
      .attr('opacity', 0.7)
      .attr('d', areaAssets);
      // Removed mouseover/mouseout for area path

    // Add net worth line (use the single yScale)
    svg.append('path')
      .datum(formattedData) // Use original data with positive liabilities for net worth calc
      .attr('fill', 'none')
      .attr('stroke', colorScale('netWorth'))
      .attr('stroke-width', 3)
      .attr('d', d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.netWorth)) // Use the main yScale
        .defined(d => d.date instanceof Date && !isNaN(d.date)) // Only draw defined points
        .curve(d3.curveMonotoneX));
      // Removed mouseover/mouseout from line itself, use dots for tooltips

    // Add dots for net worth (use the single yScale)
    svg.selectAll('.dot')
      .data(formattedData.filter(d => d.date instanceof Date && !isNaN(d.date)))
      .enter().append('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.date))
      .attr('cy', d => yScale(d.netWorth)) // Use the main yScale
      .attr('r', 4)
      .style('fill', colorScale('netWorth'))
      .style('stroke', 'white')
      .style('stroke-width', 2)
      .on('mouseover', function(event, d) {
        // console.log('[DEBUG] Tooltip mouseover data:', d); // Remove log

        const tooltipHtml = `
          <strong>Date:</strong> ${d3.timeFormat('%b %d, %Y')(d.date)}<br/>
          <strong>Assets:</strong> ${formatNumber(d.assets)}<br/>
          <strong>Liabilities:</strong> ${formatNumber(d.liabilities)}<br/>
          <strong>Net Worth:</strong> ${formatNumber(d.netWorth)}
        `;
        // console.log('[DEBUG] Tooltip HTML:', tooltipHtml); // Remove log

        const [x, y] = d3.pointer(event, containerRef.current);

        tooltip
          .style('opacity', 0.9) // Set opacity directly
          .html(tooltipHtml)
          // Position relative to container, adjust offset as needed
          .style('left', (x + 15) + 'px') 
          .style('top', (y) + 'px'); 
      })
      .on('mouseout', function() {
        // tooltip.transition().duration(500).style('opacity', 0); // Remove transition
        tooltip.style('opacity', 0); // Hide directly
      });

    // Add legend (adjust position slightly)
    const legend = svg.append('g')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 10)
      .attr('text-anchor', 'end') // Align text to the right of the squares
      .selectAll('g')
      .data(['assets', 'liabilities', 'netWorth'])
      .enter().append('g')
      // Position legend at top-right, adjust transform as needed
      .attr('transform', (d, i) => `translate(${innerWidth - 100}, ${i * 20})`);

    legend.append('rect')
      .attr('x', 81) // Position square relative to the translation
      .attr('width', 19)
      .attr('height', 19)
      .attr('fill', d => colorScale(d))
      .attr('opacity', d => d === 'netWorth' ? 1 : 0.7);

    legend.append('text')
      .attr('x', 75) // Position text relative to the translation
      .attr('y', 9.5)
      .attr('dy', '0.32em')
      .text(d => {
        if (d === 'assets') return 'Assets';
        if (d === 'liabilities') return 'Liabilities';
        if (d === 'netWorth') return 'Net Worth';
        return d;
      });

  }, [data, width, height]); // Rerun effect if data or dimensions change

  return (
    // Add container ref here
    // Consider adding aspect ratio padding to container if height removal causes collapse
    // e.g., style={{ position: 'relative', width: '100%', paddingBottom: '52%' /* height/width */ }}
    <div ref={containerRef} className="relative w-full"> 
      {/* SVG position absolute for padding trick if used */}
      {/* <svg ref={svgRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}></svg> */}
      <svg ref={svgRef}></svg> {/* Keep SVG simple for now */}
      <div ref={tooltipRef} className="absolute z-10 pointer-events-none"></div> {/* Added pointer-events-none to tooltip container */}
    </div>
  );
};

export default NetWorthChart; 