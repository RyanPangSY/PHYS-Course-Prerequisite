import { courseData } from '../data.js';

// State
const studiedCourses = new Set();

// DOM Elements
const searchInput = document.getElementById('course-search');
const searchResults = document.getElementById('search-results');
const studiedList = document.getElementById('studied-list');

// Search Logic
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  searchResults.innerHTML = '';
  
  if (!query) {
    searchResults.style.display = 'none';
    return;
  }

  const matches = courseData.filter(c => 
    (c.code.toLowerCase().includes(query) || c.title.toLowerCase().includes(query)) &&
    !studiedCourses.has(c.code)
  ).slice(0, 10); // Limit to 10 results

  if (matches.length > 0) {
    searchResults.style.display = 'block';
    matches.forEach(c => {
      const div = document.createElement('div');
      div.className = 'search-result-item';
      div.innerHTML = `<strong>${c.code}</strong> - ${c.title}`;
      div.onclick = () => addStudiedCourse(c.code);
      searchResults.appendChild(div);
    });
  } else {
    searchResults.style.display = 'none';
  }
});

// Hide search results when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('#search-container')) {
    searchResults.style.display = 'none';
  }
  if (!e.target.closest('#target-search-container')) {
    targetSearchResults.style.display = 'none';
  }
});

// Target Search Elements
const targetSearchInput = document.getElementById('target-search');
const targetSearchResults = document.getElementById('target-search-results');
const targetPrereqDisplay = document.getElementById('target-prereq-display');
let currentTargetCourse = null;

// Target Search Logic
targetSearchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  targetSearchResults.innerHTML = '';
  
  if (!query) {
    targetSearchResults.style.display = 'none';
    return;
  }

  const matches = courseData.filter(c => 
    c.code.toLowerCase().includes(query) || c.title.toLowerCase().includes(query)
  ).slice(0, 10);

  if (matches.length > 0) {
    targetSearchResults.style.display = 'block';
    matches.forEach(c => {
      const div = document.createElement('div');
      div.className = 'search-result-item';
      div.innerHTML = `<strong>${c.code}</strong> - ${c.title}`;
      div.onclick = () => selectTargetCourse(c.code);
      targetSearchResults.appendChild(div);
    });
  } else {
    targetSearchResults.style.display = 'none';
  }
});

function selectTargetCourse(code) {
  currentTargetCourse = code;
  targetSearchInput.value = code;
  targetSearchResults.style.display = 'none';
  renderTargetPrereqs();
}

function isSatisfied(node) {
  if (!node) return true;
  if (typeof node === 'string') {
    return studiedCourses.has(node);
  } else if (node.and) {
    return node.and.every(child => isSatisfied(child));
  } else if (node.or) {
    return node.or.some(child => isSatisfied(child));
  }
  return false;
}

function renderTargetPrereqs() {
  if (!currentTargetCourse) {
    targetPrereqDisplay.innerHTML = '';
    return;
  }
  
  const visited = new Set();

  function buildHtml(node) {
    if (!node) return '';
    
    if (typeof node === 'string') {
      const isStudied = studiedCourses.has(node);
      const statusClass = isStudied ? 'status-studied' : 'status-unstudied';
      const icon = isStudied ? '✓' : '✗';
      
      let html = `<div class="prereq-node"><span class="${statusClass}">${icon} ${node}</span>`;
      
      if (!visited.has(node)) {
        visited.add(node);
        const courseObj = courseData.find(c => c.code === node);
        if (courseObj && courseObj.prerequisites && courseObj.prerequisites.parsed) {
           html += buildHtml(courseObj.prerequisites.parsed);
        }
      } else {
        html += ` <span style="color:#888; font-size:10px;">(already listed)</span>`;
      }
      html += `</div>`;
      return html;
    } else if (node.and) {
      const satisfied = isSatisfied(node);
      const labelClass = satisfied ? 'logic-label logic-met' : 'logic-label';
      let html = `<div class="prereq-node"><span class="${labelClass}">ALL OF:</span>`;
      node.and.forEach(child => { html += buildHtml(child); });
      html += `</div>`;
      return html;
    } else if (node.or) {
      const satisfied = isSatisfied(node);
      const labelClass = satisfied ? 'logic-label logic-met' : 'logic-label';
      let html = `<div class="prereq-node"><span class="${labelClass}">ONE OF:</span>`;
      node.or.forEach(child => { html += buildHtml(child); });
      html += `</div>`;
      return html;
    }
    return '';
  }

  const courseObj = courseData.find(c => c.code === currentTargetCourse);
  if (!courseObj) return;

  let html = `<h4 style="margin-top:0; margin-bottom:10px;">Prerequisites for ${currentTargetCourse}</h4>`;
  if (courseObj.prerequisites && courseObj.prerequisites.parsed) {
    visited.add(currentTargetCourse);
    html += buildHtml(courseObj.prerequisites.parsed);
  } else {
    html += `<p style="color: #888; font-style: italic;">No prerequisites.</p>`;
  }
  
  targetPrereqDisplay.innerHTML = html;
}

function addStudiedCourse(code) {
  studiedCourses.add(code);
  searchInput.value = '';
  searchResults.style.display = 'none';
  renderStudiedCourses();
  updateChartColors();
  renderTargetPrereqs();
}

function removeStudiedCourse(code) {
  studiedCourses.delete(code);
  renderStudiedCourses();
  updateChartColors();
  renderTargetPrereqs();
}

function renderStudiedCourses() {
  studiedList.innerHTML = studiedCourses.size === 0 
    ? '<p style="color: #888; font-style: italic; text-align: center;">No courses added yet.</p>' 
    : '';
    
  studiedCourses.forEach(code => {
    const course = courseData.find(c => c.code === code);
    const div = document.createElement('div');
    div.className = 'studied-item';
    div.innerHTML = `
      <span title="${course ? course.title : ''}"><strong>${code}</strong></span>
      <span class="remove-btn" onclick="removeStudiedCourse('${code}')">✕</span>
    `;
    studiedList.appendChild(div);
  });
}

// Initialize empty state
renderStudiedCourses();

// --- Sidebar Resizer Logic ---
const sidebar = document.getElementById('sidebar');
const resizer = document.getElementById('resizer');
const chartContainer = document.getElementById('chart-container');
let isResizing = false;

resizer.addEventListener('mousedown', (e) => {
  isResizing = true;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  // Prevent text selection and iframe/svg pointer events while dragging
  e.preventDefault();
  chartContainer.style.pointerEvents = 'none';
});

document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;
  
  // Calculate new width based on mouse position
  // e.clientX is the mouse position relative to the viewport
  let newWidth = e.clientX;
  
  // Enforce min and max widths (matching CSS)
  if (newWidth < 250) newWidth = 250;
  if (newWidth > 600) newWidth = 600;
  
  sidebar.style.width = newWidth + 'px';
});

window.addEventListener('mouseup', () => {
  if (isResizing) {
    isResizing = false;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = '';
    chartContainer.style.pointerEvents = 'auto';
    // Trigger D3 resize to adjust the center of the graph after dragging is done
    window.dispatchEvent(new Event('resize'));
  }
});

// --- D3 Graph Logic ---
const nodes = [];
const links = [];
const nodeMap = new Map();

function addNode(id, type, label) {
  if (!nodeMap.has(id)) {
    const node = { id, type, label };
    nodes.push(node);
    nodeMap.set(id, node);
  }
  return nodeMap.get(id);
}

function processPrereq(prereq, parentId, courseCode) {
  if (!prereq) return;

  if (typeof prereq === 'string') {
    addNode(prereq, 'course', prereq);
    links.push({ source: prereq, target: parentId });
  } else if (prereq.and) {
    const andId = `AND_${courseCode}_${Math.random().toString(36).substr(2, 9)}`;
    addNode(andId, 'and', 'AND');
    links.push({ source: andId, target: parentId });
    prereq.and.forEach(child => processPrereq(child, andId, courseCode));
  } else if (prereq.or) {
    const orId = `OR_${courseCode}_${Math.random().toString(36).substr(2, 9)}`;
    addNode(orId, 'or', 'OR');
    links.push({ source: orId, target: parentId });
    prereq.or.forEach(child => processPrereq(child, orId, courseCode));
  }
}

courseData.forEach(course => {
  addNode(course.code, 'course', course.code);
  if (course.prerequisites && course.prerequisites.parsed) {
    processPrereq(course.prerequisites.parsed, course.code, course.code);
  }
});

const chartDiv = document.getElementById('chart');
const width = chartDiv.clientWidth;
const height = chartDiv.clientHeight;

const zoom = d3.zoom().on("zoom", (event) => {
  g.attr("transform", event.transform);
});

const svg = d3.select("#chart").append("svg")
  .attr("width", "100%")
  .attr("height", "100%")
  .call(zoom);

const g = svg.append("g");

svg.append("defs").append("marker")
  .attr("id", "arrow")
  .attr("viewBox", "0 -5 10 10")
  .attr("refX", 20)
  .attr("refY", 0)
  .attr("markerWidth", 6)
  .attr("markerHeight", 6)
  .attr("orient", "auto")
  .append("path")
  .attr("fill", "#999")
  .attr("d", "M0,-5L10,0L0,5");

const simulation = d3.forceSimulation(nodes)
  .force("link", d3.forceLink(links).id(d => d.id).distance(60))
  .force("charge", d3.forceManyBody().strength(-300))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("collide", d3.forceCollide().radius(30));

const link = g.append("g")
  .attr("class", "links")
  .selectAll("line")
  .data(links)
  .enter().append("line")
  .attr("class", "link")
  .attr("marker-end", "url(#arrow)");

const node = g.append("g")
  .attr("class", "nodes")
  .selectAll("g")
  .data(nodes)
  .enter().append("g")
  .attr("class", "node")
  .call(d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended));

// Initial color setup
const colorScale = {
  'and': '#90A4AE', // Dull blue-grey
  'or': '#BCAAA4'   // Dull grey-brown
};

const circles = node.append("circle")
  .attr("r", d => d.type === 'course' ? 15 : 10);

node.append("text")
  .attr("dx", 18)
  .attr("dy", ".35em")
  .text(d => d.label);

const tooltip = d3.select("#tooltip");
node.on("mouseover", (event, d) => {
  if (d.type === 'course') {
    const courseInfo = courseData.find(c => c.code === d.id);
    if (courseInfo) {
      tooltip.transition().duration(200).style("opacity", .9);
      tooltip.html(`<strong>${courseInfo.code}</strong><br/>${courseInfo.title}<br/><br/><em>Prereqs:</em><br/>${courseInfo.prerequisites?.raw || 'None'}`);
      
      // Calculate position relative to the chart container
      const containerRect = chartDiv.getBoundingClientRect();
      
      // We need to set the position first to get the actual rendered width/height
      let left = event.clientX - containerRect.left + 10;
      let top = event.clientY - containerRect.top - 28;
      
      tooltip.style("left", left + "px")
             .style("top", top + "px");
             
      // Now adjust if it goes out of bounds
      const tooltipRect = tooltip.node().getBoundingClientRect();
      
      // Prevent tooltip from going off the right edge
      if (left + tooltipRect.width > containerRect.width) {
        left = event.clientX - containerRect.left - tooltipRect.width - 10;
      }
      
      // Prevent tooltip from going off the top edge
      if (top < 0) {
        top = event.clientY - containerRect.top + 20;
      }
      
      // Prevent tooltip from going off the bottom edge
      if (top + tooltipRect.height > containerRect.height) {
        top = event.clientY - containerRect.top - tooltipRect.height - 10;
      }

      tooltip.style("left", left + "px")
             .style("top", top + "px");
    }
  }
}).on("mouseout", () => {
  tooltip.transition().duration(500).style("opacity", 0);
});

simulation.on("tick", () => {
  link
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);

  node
    .attr("transform", d => `translate(${d.x},${d.y})`);
});

function dragstarted(event, d) {
  if (!event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(event, d) {
  d.fx = event.x;
  d.fy = event.y;
}

function dragended(event, d) {
  if (!event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

// Function to update colors based on studied courses
function updateChartColors() {
  circles.attr("fill", d => {
    if (d.type === 'course') {
      if (studiedCourses.has(d.id)) {
        return '#4CAF50'; // Green for studied
      }
      
      // Check if course can be studied
      const courseObj = courseData.find(c => c.code === d.id);
      if (courseObj) {
        // If no prerequisites, or prerequisites are satisfied
        if (!courseObj.prerequisites || !courseObj.prerequisites.parsed || isSatisfied(courseObj.prerequisites.parsed)) {
          return '#FF9800'; // Orange for can study
        }
      }
      
      return '#ccc'; // Grey for unstudied and cannot study
    }
    return colorScale[d.type];
  })
  .attr("stroke", d => {
    if (d.type === 'course') {
      if (studiedCourses.has(d.id)) {
        return '#2E7D32'; // Darker green border for studied
      }
      const courseObj = courseData.find(c => c.code === d.id);
      if (courseObj && (!courseObj.prerequisites || !courseObj.prerequisites.parsed || isSatisfied(courseObj.prerequisites.parsed))) {
        return '#F57C00'; // Darker orange border for can study
      }
    }
    return '#fff';
  });
}

// Initial color update
updateChartColors();

// Reset view on spacebar press
document.addEventListener('keydown', (e) => {
  // Check if spacebar is pressed and we are not typing in an input field
  if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
    e.preventDefault(); // Prevent default scrolling behavior
    svg.transition()
       .duration(750)
       .call(zoom.transform, d3.zoomIdentity);
  }
});

// Handle window resize
window.addEventListener('resize', () => {
  const newWidth = chartDiv.clientWidth;
  const newHeight = chartDiv.clientHeight;
  svg.attr("width", newWidth).attr("height", newHeight);
  simulation.force("center", d3.forceCenter(newWidth / 2, newHeight / 2));
  simulation.alpha(0.3).restart();
});