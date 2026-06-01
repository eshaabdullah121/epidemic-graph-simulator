/* ============================================================
   CHARTS MODULE
   Canvas-based Epicurve and D3 Bar Charts
   ============================================================ */

/**
 * Render the epidemic curve (SIR over time) using Canvas
 */
function renderEpicurve(canvas, epicurveData, totalPopulation) {
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    
    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 10, right: 15, bottom: 25, left: 40 };

    ctx.clearRect(0, 0, w, h);

    if (epicurveData.length < 2) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Waiting for simulation data...', w / 2, h / 2);
        return;
    }

    const maxY = totalPopulation;
    const maxX = epicurveData.length - 1;

    const scaleX = (w - padding.left - padding.right) / Math.max(maxX, 1);
    const scaleY = (h - padding.top - padding.bottom) / maxY;

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (h - padding.top - padding.bottom) * i / 4;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, h - padding.bottom);
    ctx.lineTo(w - padding.right, h - padding.bottom);
    ctx.stroke();

    // Draw axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Day ${epicurveData.length - 1}`, w / 2, h - 5);
    
    // Y-axis labels
    ctx.textAlign = 'right';
    ctx.fillText(totalPopulation.toString(), padding.left - 5, padding.top + 4);
    ctx.fillText('0', padding.left - 5, h - padding.bottom + 4);

    // Draw lines with gradient effect
    const drawLine = (data, key, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        data.forEach((d, i) => {
            const x = padding.left + i * scaleX;
            const y = h - padding.bottom - d[key] * scaleY;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Add glow effect
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.2;
        ctx.stroke();
        ctx.globalAlpha = 1;
    };

    drawLine(epicurveData, 's', COLORS.susceptible);
    drawLine(epicurveData, 'i', COLORS.infected);
    drawLine(epicurveData, 'r', COLORS.recovered);

    // Draw legend
    const legendY = padding.top + 5;
    const legendItems = [
        { label: 'S', color: COLORS.susceptible },
        { label: 'I', color: COLORS.infected },
        { label: 'R', color: COLORS.recovered }
    ];
    
    ctx.font = 'bold 9px sans-serif';
    let legendX = w - padding.right - 60;
    legendItems.forEach(item => {
        ctx.fillStyle = item.color;
        ctx.fillRect(legendX, legendY, 10, 10);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.textAlign = 'left';
        ctx.fillText(item.label, legendX + 14, legendY + 8);
        legendX += 25;
    });
}

/**
 * Render age distribution bar chart using D3
 */
function renderAgeChart(container, stats) {
    const containerEl = typeof container === 'string' ? 
        document.getElementById(container) : container;
    
    d3.select(containerEl).selectAll('*').remove();

    if (!stats) return;

    const data = [
        { group: 'Child', ...stats.byAge[AgeGroup.CHILD] },
        { group: 'Youth', ...stats.byAge[AgeGroup.YOUTH] },
        { group: 'Elderly', ...stats.byAge[AgeGroup.ELDERLY] }
    ];

    const rect = containerEl.getBoundingClientRect();
    const margin = { top: 5, right: 5, bottom: 20, left: 30 };
    const width = rect.width - margin.left - margin.right;
    const height = rect.height - margin.top - margin.bottom;

    if (width <= 0 || height <= 0) return;

    const svg = d3.select(containerEl)
        .append('svg')
        .attr('width', rect.width)
        .attr('height', rect.height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x0 = d3.scaleBand()
        .domain(data.map(d => d.group))
        .range([0, width])
        .padding(0.2);

    const x1 = d3.scaleBand()
        .domain(['s', 'i', 'r'])
        .range([0, x0.bandwidth()])
        .padding(0.05);

    const maxVal = d3.max(data, d => Math.max(d.s, d.i, d.r)) || 1;
    const y = d3.scaleLinear()
        .domain([0, maxVal])
        .range([height, 0]);

    const colors = { s: COLORS.susceptible, i: COLORS.infected, r: COLORS.recovered };

    const groups = svg.selectAll('.group')
        .data(data)
        .enter()
        .append('g')
        .attr('transform', d => `translate(${x0(d.group)},0)`);

    groups.selectAll('rect')
        .data(d => ['s', 'i', 'r'].map(key => ({ key, value: d[key] })))
        .enter()
        .append('rect')
        .attr('x', d => x1(d.key))
        .attr('y', d => y(d.value))
        .attr('width', x1.bandwidth())
        .attr('height', d => height - y(d.value))
        .attr('fill', d => colors[d.key])
        .attr('rx', 2);

    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x0).tickSize(0))
        .selectAll('text')
        .attr('fill', 'rgba(255,255,255,0.6)')
        .style('font-size', '8px');

    svg.selectAll('.domain').attr('stroke', 'rgba(255,255,255,0.2)');
    svg.selectAll('.tick line').attr('stroke', 'rgba(255,255,255,0.1)');
}

/**
 * Render gender distribution bar chart using D3
 */
function renderGenderChart(container, stats) {
    const containerEl = typeof container === 'string' ? 
        document.getElementById(container) : container;
    
    d3.select(containerEl).selectAll('*').remove();

    if (!stats) return;

    const data = [
        { group: 'Male', ...stats.byGender[Gender.MALE] },
        { group: 'Female', ...stats.byGender[Gender.FEMALE] }
    ];

    const rect = containerEl.getBoundingClientRect();
    const margin = { top: 5, right: 5, bottom: 20, left: 30 };
    const width = rect.width - margin.left - margin.right;
    const height = rect.height - margin.top - margin.bottom;

    if (width <= 0 || height <= 0) return;

    const svg = d3.select(containerEl)
        .append('svg')
        .attr('width', rect.width)
        .attr('height', rect.height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x0 = d3.scaleBand()
        .domain(data.map(d => d.group))
        .range([0, width])
        .padding(0.3);

    const x1 = d3.scaleBand()
        .domain(['s', 'i', 'r'])
        .range([0, x0.bandwidth()])
        .padding(0.05);

    const maxVal = d3.max(data, d => Math.max(d.s, d.i, d.r)) || 1;
    const y = d3.scaleLinear()
        .domain([0, maxVal])
        .range([height, 0]);

    const colors = { s: COLORS.susceptible, i: COLORS.infected, r: COLORS.recovered };

    const groups = svg.selectAll('.group')
        .data(data)
        .enter()
        .append('g')
        .attr('transform', d => `translate(${x0(d.group)},0)`);

    groups.selectAll('rect')
        .data(d => ['s', 'i', 'r'].map(key => ({ key, value: d[key] })))
        .enter()
        .append('rect')
        .attr('x', d => x1(d.key))
        .attr('y', d => y(d.value))
        .attr('width', x1.bandwidth())
        .attr('height', d => height - y(d.value))
        .attr('fill', d => colors[d.key])
        .attr('rx', 2);

    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x0).tickSize(0))
        .selectAll('text')
        .attr('fill', 'rgba(255,255,255,0.6)')
        .style('font-size', '8px');

    svg.selectAll('.domain').attr('stroke', 'rgba(255,255,255,0.2)');
    svg.selectAll('.tick line').attr('stroke', 'rgba(255,255,255,0.1)');
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderEpicurve, renderAgeChart, renderGenderChart };
}
