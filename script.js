const form = document.getElementById('valuationForm');
const predictBtn = document.getElementById('predictBtn');
const resetBtn = document.getElementById('resetBtn');
const themeToggle = document.getElementById('themeToggle');

const elements = {
  bedrooms: document.getElementById('bedrooms'),
  bathrooms: document.getElementById('bathrooms'),
  area: document.getElementById('area'),
  age: document.getElementById('age'),
  location: document.getElementById('location'),
  growth: document.getElementById('growth'),
  bedroomsValue: document.getElementById('bedroomsValue'),
  bathroomsValue: document.getElementById('bathroomsValue'),
  areaValue: document.getElementById('areaValue'),
  ageValue: document.getElementById('ageValue'),
  growthValue: document.getElementById('growthValue'),
  priceOutput: document.getElementById('priceOutput'),
  priceHint: document.getElementById('priceHint'),
  affordability: document.getElementById('affordability'),
  investmentScore: document.getElementById('investmentScore'),
  riskLevel: document.getElementById('riskLevel'),
  pricePerSqft: document.getElementById('pricePerSqft'),
  marketTrendValue: document.getElementById('marketTrendValue'),
  demandValue: document.getElementById('demandValue'),
  confidenceValue: document.getElementById('confidenceValue'),
  demandBar: document.getElementById('demandBar'),
  upgradeBar: document.getElementById('upgradeBar'),
  liquidityBar: document.getElementById('liquidityBar'),
  forecastChart: document.getElementById('forecastChart'),
};

const locMultipliers = {
  city: 1.2,
  suburb: 1.08,
  coastal: 1.16,
  rural: 0.93,
};

const scenarios = {
  balanced: { demand: 72, upgrade: 64, liquidity: 76 },
  renovation: { demand: 80, upgrade: 88, liquidity: 69 },
  growth: { demand: 88, upgrade: 74, liquidity: 82 },
};

const trainingData = [
  { area: 1100, bedrooms: 2, bathrooms: 1, age: 18, growth: 4, location: 'city', price: 435000 },
  { area: 1500, bedrooms: 3, bathrooms: 2, age: 12, growth: 6, location: 'suburb', price: 610000 },
  { area: 2100, bedrooms: 3, bathrooms: 2, age: 9, growth: 8, location: 'coastal', price: 780000 },
  { area: 2600, bedrooms: 4, bathrooms: 3, age: 6, growth: 9, location: 'city', price: 925000 },
  { area: 1800, bedrooms: 2, bathrooms: 2, age: 24, growth: 3, location: 'rural', price: 390000 },
  { area: 2400, bedrooms: 4, bathrooms: 3, age: 14, growth: 7, location: 'suburb', price: 860000 },
  { area: 3200, bedrooms: 5, bathrooms: 3, age: 5, growth: 10, location: 'coastal', price: 1120000 },
  { area: 1700, bedrooms: 3, bathrooms: 2, age: 11, growth: 5, location: 'city', price: 640000 },
];

let modelWeights = [];

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function getLocationValue(location) {
  return locMultipliers[location] || 1;
}

function buildFeatureVector(values) {
  return [
    1,
    values.area / 1000,
    values.bedrooms,
    values.bathrooms,
    values.age / 10,
    values.growth / 10,
    getLocationValue(values.location),
  ];
}

function trainLinearRegression(data) {
  const weights = Array(7).fill(0);
  const learningRate = 0.03;

  for (let iteration = 0; iteration < 1400; iteration += 1) {
    let gradient = Array(7).fill(0);

    data.forEach((sample) => {
      const features = buildFeatureVector(sample);
      const prediction = features.reduce((sum, feature, index) => sum + weights[index] * feature, 0);
      const target = sample.price / 100000;
      const error = prediction - target;

      features.forEach((feature, index) => {
        gradient[index] += error * feature;
      });
    });

    gradient.forEach((value, index) => {
      weights[index] -= (learningRate / data.length) * value;
    });
  }

  return weights;
}

function predictWithModel(values) {
  const features = buildFeatureVector(values);
  const rawPrediction = features.reduce((sum, feature, index) => sum + modelWeights[index] * feature, 0);
  return Math.max(220000, Math.round(rawPrediction * 100000));
}

function updateRangeLabels() {
  elements.bedroomsValue.textContent = elements.bedrooms.value;
  elements.bathroomsValue.textContent = elements.bathrooms.value;
  elements.areaValue.textContent = elements.area.value;
  elements.ageValue.textContent = elements.age.value;
  elements.growthValue.textContent = elements.growth.value;
}

function getPrediction() {
  const bedrooms = Number(elements.bedrooms.value);
  const bathrooms = Number(elements.bathrooms.value);
  const area = Number(elements.area.value);
  const age = Number(elements.age.value);
  const location = elements.location.value;
  const growth = Number(elements.growth.value);

  const heuristic = Math.round(((area * 245) + (bedrooms * 47000) + (bathrooms * 36000) + (growth * 6000) - (age * 1800)) * getLocationValue(location));
  const modelPrediction = predictWithModel({ area, bedrooms, bathrooms, age, growth, location });
  const prediction = Math.round((heuristic * 0.35) + (modelPrediction * 0.65));
  const pricePerSqft = Math.round(prediction / area);
  const investment = Math.min(99, Math.round(45 + growth * 4 + bedrooms * 3 + (bathrooms - 1) * 5 + (location === 'suburb' ? 8 : location === 'coastal' ? 6 : 2)));
  const affordability = prediction > 900000 ? 'Premium' : prediction > 650000 ? 'Balanced' : 'Accessible';
  const risk = prediction > 900000 ? 'Moderate' : 'Low';
  const hint = prediction > 850000
    ? 'High demand and limited supply support premium confidence.'
    : 'This profile is attractive for value-focused buyers.';

  return { prediction, pricePerSqft, investment, affordability, risk, hint };
}

function renderScenario(scenarioKey) {
  const scenario = scenarios[scenarioKey];
  elements.demandBar.style.width = `${scenario.demand}%`;
  elements.upgradeBar.style.width = `${scenario.upgrade}%`;
  elements.liquidityBar.style.width = `${scenario.liquidity}%`;
}

function drawForecastChart() {
  const values = {
    area: Number(elements.area.value),
    growth: Number(elements.growth.value),
    bedrooms: Number(elements.bedrooms.value),
    location: elements.location.value,
  };

  const points = Array.from({ length: 6 }, (_, index) => {
    const base = 70 + values.growth * 6 + values.area / 180 + values.bedrooms * 8;
    const wave = Math.sin((index + 1) * 0.9 + values.bedrooms / 3) * 16;
    const locationBoost = values.location === 'coastal' ? 12 : values.location === 'suburb' ? 6 : 0;
    return 120 - (base / 10) + wave + locationBoost;
  });

  const width = 320;
  const height = 170;
  const padding = 20;
  const step = (width - padding * 2) / (points.length - 1);

  const polyline = points
    .map((point, index) => `${padding + index * step},${point}`)
    .join(' ');
  const areaPath = `M ${padding},${height - padding} L ${polyline.replace(/ /g, ' L ')} L ${width - padding},${height - padding} Z`;

  elements.forecastChart.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" rx="16" fill="rgba(255,255,255,0.03)"></rect>
    <g stroke="rgba(255,255,255,0.12)" stroke-width="1">
      <line x1="20" y1="30" x2="300" y2="30"></line>
      <line x1="20" y1="80" x2="300" y2="80"></line>
      <line x1="20" y1="130" x2="300" y2="130"></line>
    </g>
    <path d="${areaPath}" fill="url(#forecastGradient)" opacity="0.28"></path>
    <polyline points="${polyline}" fill="none" stroke="url(#forecastStroke)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline>
    <defs>
      <linearGradient id="forecastGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#55f0c5" stop-opacity="0.9"></stop>
        <stop offset="100%" stop-color="#6e8cff" stop-opacity="0.18"></stop>
      </linearGradient>
      <linearGradient id="forecastStroke" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#55f0c5"></stop>
        <stop offset="100%" stop-color="#6e8cff"></stop>
      </linearGradient>
    </defs>
  `;
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  themeToggle.textContent = theme === 'light' ? '🌙 Dark mode' : '☀️ Light mode';
}

function runPrediction() {
  updateRangeLabels();
  const result = getPrediction();

  elements.priceOutput.textContent = formatCurrency(result.prediction);
  elements.priceHint.textContent = result.hint;
  elements.affordability.textContent = result.affordability;
  elements.investmentScore.textContent = `${result.investment}/100`;
  elements.riskLevel.textContent = result.risk;
  elements.pricePerSqft.textContent = formatCurrency(result.pricePerSqft);

  const marketTrend = `${(3.8 + Number(elements.growth.value) * 0.4).toFixed(1)}%`;
  elements.marketTrendValue.textContent = `+${marketTrend}`;
  elements.demandValue.textContent = Number(elements.growth.value) > 7 ? 'Very high' : 'High';
  elements.confidenceValue.textContent = `${Math.min(98, 82 + Number(elements.growth.value) * 2)}%`;

  drawForecastChart();
  renderScenario(document.querySelector('.chip.active')?.dataset.scenario || 'balanced');
}

predictBtn.addEventListener('click', runPrediction);
resetBtn.addEventListener('click', () => {
  elements.bedrooms.value = 3;
  elements.bathrooms.value = 2;
  elements.area.value = 2200;
  elements.age.value = 10;
  elements.location.value = 'city';
  elements.growth.value = 6;
  updateRangeLabels();
  runPrediction();
});

themeToggle.addEventListener('click', () => {
  const currentTheme = document.body.dataset.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', currentTheme);
  applyTheme(currentTheme);
});

form.querySelectorAll('input, select').forEach((control) => {
  control.addEventListener('input', runPrediction);
  control.addEventListener('change', runPrediction);
});

document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach((item) => item.classList.remove('active'));
    chip.classList.add('active');
    renderScenario(chip.dataset.scenario);
  });
});

modelWeights = trainLinearRegression(trainingData);
applyTheme(localStorage.getItem('theme') || 'dark');
updateRangeLabels();
runPrediction();
