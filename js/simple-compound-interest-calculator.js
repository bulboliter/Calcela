'use strict';

let pieChart = null;
let lineChart = null;
let lastWindowWidth = window.innerWidth;
let tooltipTimeout = null;
let debounceTimer = null;

const LIMITS = {
    principal: { min: 0, max: 999999999 },
    rate: { min: 0, max: 100 },
    time: { min: 0, max: 1000 }
};

function sanitizeNumber(value) {
    return String(value).replace(/[^0-9.,]/g, '');
}

function formatWithCommas(number) {
    return number.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatInputWithCommas(input) {
    let value = sanitizeNumber(input.value);
    value = value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts.length === 2 && parts[1].length > 2) {
        value = parts[0] + '.' + parts[1].substring(0, 2);
    }
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    input.value = parts.length === 2 ? parts[0] + '.' + parts[1] : parts[0];
}

function parseFormattedNumber(value) {
    const sanitized = sanitizeNumber(value);
    return parseFloat(sanitized.replace(/,/g, '')) || 0;
}

function validateInput(id, value) {
    const limits = LIMITS[id];
    const errorElement = document.getElementById(`${id}-error`);
    const inputElement = document.getElementById(id);
    if (!limits) return true;
    const numValue = id === 'principal' ? parseFormattedNumber(value) : parseFloat(value);
    if (isNaN(numValue) || numValue < limits.min || numValue > limits.max) {
        inputElement.classList.add('input-error');
        errorElement.style.display = 'block';
        return false;
    } else {
        inputElement.classList.remove('input-error');
        errorElement.style.display = 'none';
        return true;
    }
}

function updateInteractiveFormula(principal, rate, time, timeInYears, interestType, interest, total, compoundFrequency) {
    const formulaDiv = document.getElementById('interactiveFormula');
    const formulaDisplay = document.getElementById('formulaDisplay');
    if (!formulaDiv || !formulaDisplay) return;
    formulaDiv.style.display = 'block';
    if (interestType === 'simple') {
        formulaDisplay.innerHTML = `
            <div class="formula-input-display">
                <span class="formula-value">$${formatWithCommas(principal)}</span>
                <span class="formula-operator">×</span>
                <span class="formula-value">${rate}%</span>
                <span class="formula-operator">×</span>
                <span class="formula-value">${timeInYears.toFixed(2)} years</span>
                <span class="formula-operator">=</span>
                <span class="formula-value" style="background-color: #5cb85c;">$${formatWithCommas(interest)}</span>
            </div>
            <div class="formula-breakdown">
                <div class="formula-part"><strong>Principal (P)</strong>$${formatWithCommas(principal)}</div>
                <div class="formula-part"><strong>Rate (r)</strong>${rate}% = ${(rate/100).toFixed(4)}</div>
                <div class="formula-part"><strong>Time (t)</strong>${timeInYears.toFixed(2)} years</div>
                <div class="formula-part"><strong>Interest (I)</strong>$${formatWithCommas(interest)}</div>
            </div>`;
    } else {
        const compoundName = {'365':'Daily','52':'Weekly','12':'Monthly','4':'Quarterly','2':'Semi-Annually','1':'Annually'}[compoundFrequency] || 'Annually';
        formulaDisplay.innerHTML = `
            <div class="formula-input-display">
                <span class="formula-value">$${formatWithCommas(principal)}</span>
                <span class="formula-operator">×</span>
                <span class="formula-operator">(1 +</span>
                <span class="formula-value">${rate}%/${compoundFrequency}</span>
                <span class="formula-operator">)^</span>
                <span class="formula-value">${(compoundFrequency * timeInYears).toFixed(0)}</span>
                <span class="formula-operator">=</span>
                <span class="formula-value" style="background-color: #5cb85c;">$${formatWithCommas(total)}</span>
            </div>
            <div class="formula-breakdown">
                <div class="formula-part"><strong>Principal (P)</strong>$${formatWithCommas(principal)}</div>
                <div class="formula-part"><strong>Rate (r)</strong>${rate}% = ${(rate/100).toFixed(4)}</div>
                <div class="formula-part"><strong>Time (t)</strong>${timeInYears.toFixed(2)} years</div>
                <div class="formula-part"><strong>Compounding</strong>${compoundName} (n=${compoundFrequency})</div>
                <div class="formula-part"><strong>Total Periods</strong>${(compoundFrequency * timeInYears).toFixed(0)}</div>
                <div class="formula-part"><strong>Growth Factor</strong>${Math.pow(1 + (rate/100)/compoundFrequency, compoundFrequency * timeInYears).toFixed(4)}</div>
            </div>`;
    }
}

function calculateInterest() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        performCalculation();
    }, 100);
}

function performCalculation() {
    const principalInput = document.getElementById('principal');
    const rateInput = document.getElementById('rate');
    const timeInput = document.getElementById('time');
    const principal = parseFormattedNumber(principalInput.value);
    const rate = parseFloat(rateInput.value) || 0;
    const time = parseFloat(timeInput.value) || 0;
    const timeUnit = document.getElementById('timeUnit').value;
    const interestType = document.querySelector('input[name="interestType"]:checked').value;
    const compoundFrequency = parseFloat(document.getElementById('compoundFrequency').value) || 1;
    const compoundFreqGroup = document.getElementById('compoundFrequencyGroup');
    if (interestType === 'compound') {
        compoundFreqGroup.style.display = 'block';
        compoundFreqGroup.classList.add('show');
    } else {
        compoundFreqGroup.style.display = 'none';
        compoundFreqGroup.classList.remove('show');
    }
    const isPrincipalValid = validateInput('principal', principalInput.value);
    const isRateValid = validateInput('rate', rate);
    const isTimeValid = validateInput('time', time);
    if (!isPrincipalValid || !isRateValid || !isTimeValid || principal === 0 || rate === 0 || time === 0) {
        document.getElementById('results').classList.remove('show');
        document.getElementById('interactiveFormula').style.display = 'none';
        return;
    }
    let timeInYears;
    switch(timeUnit) {
        case 'days': timeInYears = time / 365; break;
        case 'weeks': timeInYears = time / 52; break;
        case 'months': timeInYears = time / 12; break;
        case 'quarters': timeInYears = time / 4; break;
        default: timeInYears = time;
    }
    let interest = 0;
    let total = 0;
    try {
        if (interestType === 'simple') {
            interest = (principal * rate * timeInYears) / 100;
            total = principal + interest;
        } else {
            const rateDecimal = rate / 100;
            total = principal * Math.pow(1 + rateDecimal / compoundFrequency, compoundFrequency * timeInYears);
            interest = total - principal;
        }
        if (!isFinite(total) || !isFinite(interest)) {
            throw new Error('Calculation overflow');
        }
        document.getElementById('interestEarned').textContent = `$${formatWithCommas(interest)}`;
        document.getElementById('totalAmount').textContent = `$${formatWithCommas(total)}`;
        document.getElementById('results').classList.add('show');
        setTimeout(() => {
            safeChartUpdate(() => {
                updateChart(principal, interest);
                updateLineChart(principal, rate, timeInYears, interestType, timeUnit, compoundFrequency);
            });
        }, 0);
        updateInteractiveFormula(principal, rate, time, timeInYears, interestType, interest, total, compoundFrequency);
        updateURL();
    } catch (error) {
        console.error('Calculation error:', error);
        document.getElementById('results').classList.remove('show');
        document.getElementById('interactiveFormula').style.display = 'none';
    }
}

function updateChart(principal, interest) {
    if (pieChart && typeof pieChart.destroy === 'function') {
        pieChart.destroy();
    }
    const total = principal + interest;
    const principalPercentage = ((principal / total) * 100).toFixed(1);
    const interestPercentage = ((interest / total) * 100).toFixed(1);
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    pieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: [`Principal (${principalPercentage}%)`, `Interest (${interestPercentage}%)`],
            datasets: [{
                data: [principal, interest],
                backgroundColor: ['#4a90e2', '#5cb85c'],
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: { size: 12, weight: '500' },
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const dataset = data.datasets[0];
                                    const value = dataset.data[i];
                                    return { text: label + ': $' + formatWithCommas(value), fillStyle: dataset.backgroundColor[i], hidden: false, index: i };
                                });
                            }
                            return [];
                        }
                    },
                    onClick: null
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.label.split(' (')[0];
                            const value = '$' + formatWithCommas(context.parsed);
                            const percentage = context.label.match(/\(([^)]+)\)/)[1];
                            return label + ': ' + value + ' (' + percentage + ')';
                        }
                    }
                }
            },
            cutout: '60%'
        }
    });
}

function updateLineChart(principal, rate, timeInYears, interestType, timeUnit, compoundFrequency = 1) {
    if (lineChart && typeof lineChart.destroy === 'function') {
        lineChart.destroy();
    }
    const labels = [];
    const principalData = [];
    const interestData = [];
    const totalData = [];
    let numPoints = Math.min(Math.ceil(timeInYears), 10);
    if (timeUnit === 'months' && timeInYears < 2) {
        numPoints = Math.ceil(timeInYears * 12);
    }
    const isMobile = window.innerWidth <= 480;
    for (let i = 0; i <= numPoints; i++) {
        const currentTime = (i / numPoints) * timeInYears;
        if (timeUnit === 'days' && timeInYears < 0.5) {
            labels.push(`Day ${Math.round(currentTime * 365)}`);
        } else if (timeUnit === 'weeks' && timeInYears < 1) {
            labels.push(`Week ${Math.round(currentTime * 52)}`);
        } else if (timeUnit === 'months' && timeInYears < 2) {
            labels.push(`Month ${Math.round(currentTime * 12)}`);
        } else {
            labels.push(`Year ${currentTime.toFixed(1)}`);
        }
        let currentInterest = 0;
        let currentTotal = principal;
        if (currentTime > 0) {
            if (interestType === 'simple') {
                currentInterest = (principal * rate * currentTime) / 100;
                currentTotal = principal + currentInterest;
            } else {
                currentTotal = principal * Math.pow(1 + (rate / 100) / compoundFrequency, compoundFrequency * currentTime);
                currentInterest = currentTotal - principal;
            }
        }
        principalData.push(principal);
        interestData.push(currentInterest);
        totalData.push(currentTotal);
    }
    const lineCtx = document.getElementById('lineChart').getContext('2d');
    lineChart = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Principal', data: principalData, backgroundColor: 'rgba(74, 144, 226, 0.2)', borderColor: '#4a90e2', borderWidth: 2, fill: true, tension: 0.1, pointRadius: isMobile ? 0 : 3, pointHoverRadius: 5, pointHitRadius: isMobile ? 15 : 10, order: 2 },
                { label: 'Interest', data: totalData, backgroundColor: 'rgba(92, 184, 92, 0.2)', borderColor: '#5cb85c', borderWidth: 2, fill: '-1', tension: 0.1, pointRadius: isMobile ? 0 : 3, pointHoverRadius: 5, pointHitRadius: isMobile ? 15 : 10, order: 1 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false, axis: 'x' },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: { size: 12, weight: '500' },
                        generateLabels: function(chart) {
                            return [
                                { text: 'Principal', fillStyle: '#4a90e2', strokeStyle: '#4a90e2', lineWidth: 2, hidden: false, index: 0 },
                                { text: 'Interest', fillStyle: '#5cb85c', strokeStyle: '#5cb85c', lineWidth: 2, hidden: false, index: 1 }
                            ];
                        }
                    },
                    onClick: null
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    position: isMobile ? 'average' : 'nearest',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: '#ddd',
                    borderWidth: 1,
                    titleFont: { size: isMobile ? 12 : 14 },
                    bodyFont: { size: isMobile ? 11 : 13 },
                    padding: isMobile ? 8 : 10,
                    displayColors: false,
                    callbacks: {
                        title: (tooltipItems) => tooltipItems[0].label,
                        label: (context) => null,
                        afterBody: (tooltipItems) => {
                            const index = tooltipItems[0].dataIndex;
                            return [
                                'Total: $' + formatWithCommas(totalData[index]),
                                'Principal: $' + formatWithCommas(principalData[index]),
                                'Interest: $' + formatWithCommas(interestData[index])
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => value >= 1000 ? '$' + (value / 1000).toFixed(0) + 'k' : '$' + value,
                        font: { size: isMobile ? 10 : 11 },
                        maxTicksLimit: isMobile ? 6 : 8
                    },
                    grid: { display: true, drawBorder: false, color: '#f0f0f0' }
                },
                x: {
                    ticks: { font: { size: isMobile ? 9 : 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: isMobile ? 5 : 8 },
                    grid: { display: false }
                }
            },
            onClick: (event, elements) => {
                if (tooltipTimeout) clearTimeout(tooltipTimeout);
                if (!elements || elements.length === 0) {
                    lineChart.tooltip.setActiveElements([]);
                    lineChart.update();
                } else {
                    tooltipTimeout = setTimeout(() => {
                        lineChart.tooltip.setActiveElements([]);
                        lineChart.update();
                    }, 3000);
                }
            },
            onHover: (event, elements) => {
                if (elements && elements.length > 0 && tooltipTimeout) {
                    clearTimeout(tooltipTimeout);
                }
            }
        }
    });
}

function setupRealtimeCalculation() {
    const principalInput = document.getElementById('principal');
    principalInput.addEventListener('input', (e) => {
        formatInputWithCommas(e.target);
        calculateInterest();
    });
    principalInput.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            let currentValue = parseFormattedNumber(this.value);
            let increment = currentValue >= 10000 ? 1000 : currentValue >= 1000 ? 100 : currentValue >= 100 ? 10 : 1;
            currentValue += (e.key === 'ArrowUp' ? increment : -increment);
            if (currentValue < 0) currentValue = 0;
            if (currentValue > LIMITS.principal.max) currentValue = LIMITS.principal.max;
            this.value = currentValue.toString();
            formatInputWithCommas(this);
            calculateInterest();
        }
    });
    const inputs = ['rate', 'time'];
    inputs.forEach(id => {
        const input = document.getElementById(id);
        input.addEventListener('input', calculateInterest);
        input.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                let currentValue = parseFloat(this.value) || 0;
                let increment = id === 'rate' ? 0.1 : 1;
                currentValue += (e.key === 'ArrowUp' ? increment : -increment);
                const limits = LIMITS[id];
                if (currentValue < limits.min) currentValue = limits.min;
                if (currentValue > limits.max) currentValue = limits.max;
                this.value = (id === 'rate' ? Math.round(currentValue * 10) / 10 : Math.round(currentValue)).toString();
                calculateInterest();
            }
        });
    });
    document.getElementById('timeUnit').addEventListener('change', calculateInterest);
    document.getElementById('compoundFrequency').addEventListener('change', calculateInterest);
    document.querySelectorAll('input[name="interestType"]').forEach(radio => {
        radio.addEventListener('change', calculateInterest);
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function updateURL() {
    const params = new URLSearchParams({
        p: document.getElementById('principal').value.replace(/,/g, ''),
        r: document.getElementById('rate').value,
        t: document.getElementById('time').value,
        u: document.getElementById('timeUnit').value,
        type: document.querySelector('input[name="interestType"]:checked').value,
        freq: document.getElementById('compoundFrequency').value
    });
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
}

function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('p')) {
        const principalInput = document.getElementById('principal');
        principalInput.value = params.get('p');
        formatInputWithCommas(principalInput);
    }
    if (params.has('r')) document.getElementById('rate').value = params.get('r');
    if (params.has('t')) document.getElementById('time').value = params.get('t');
    if (params.has('u')) document.getElementById('timeUnit').value = params.get('u');
    if (params.has('type')) document.querySelector(`input[name="interestType"][value="${params.get('type')}"]`).checked = true;
    if (params.has('freq')) document.getElementById('compoundFrequency').value = params.get('freq');
}

function safeChartUpdate(updateFunction) {
    try {
        updateFunction();
    } catch (error) {
        console.error('Chart update error:', error);
        if (pieChart) { pieChart.destroy(); pieChart = null; }
        if (lineChart) { lineChart.destroy(); lineChart = null; }
        setTimeout(calculateInterest, 100);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    setupRealtimeCalculation();
    loadFromURL();
    calculateInterest();
    
    const debouncedUpdateURL = debounce(updateURL, 500);
    document.querySelectorAll('.calculator-inputs input, .calculator-inputs select').forEach(el => {
        el.addEventListener('input', debouncedUpdateURL);
        el.addEventListener('change', debouncedUpdateURL);
    });
});

window.addEventListener('resize', () => {
    const currentWidth = window.innerWidth;
    if (Math.abs(currentWidth - lastWindowWidth) > 10) {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (document.getElementById('results').classList.contains('show')) {
                lastWindowWidth = currentWidth;
                calculateInterest();
            }
        }, 250);
    }
});

window.addEventListener('beforeunload', () => {
    if (pieChart) pieChart.destroy();
    if (lineChart) lineChart.destroy();
    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    if (debounceTimer) clearTimeout(debounceTimer);
    if (resizeTimeout) clearTimeout(resizeTimeout);
});

window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        if (document.getElementById('results').classList.contains('show')) {
            if (pieChart) { pieChart.destroy(); pieChart = null; }
            if (lineChart) { lineChart.destroy(); lineChart = null; }
            calculateInterest();
        }
    }
});