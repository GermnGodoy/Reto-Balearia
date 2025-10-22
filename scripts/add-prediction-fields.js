const fs = require('fs');
const path = require('path');

// Read the travels.json file
const travelsPath = path.join(__dirname, '../data/travels.json');
const travelsData = JSON.parse(fs.readFileSync(travelsPath, 'utf8'));

// Function to generate prediction with some variance
function generatePrediction(actual, variancePercent = 10) {
  const variance = (Math.random() - 0.5) * 2 * (actual * variancePercent / 100);
  return Math.round(actual + variance);
}

// Add prediction fields to each timeline entry
travelsData.forEach(travel => {
  travel.timeline.forEach(entry => {
    // Generate predicted values with some variance from actual
    const predictedProfit = generatePrediction(entry.profit, 15);
    const predictedPeople = generatePrediction(entry.people, 12);

    // Calculate errors (predicted - actual)
    const profitError = predictedProfit - entry.profit;
    const peopleError = predictedPeople - entry.people;

    // Add the new fields
    entry.predictedProfit = predictedProfit;
    entry.profitError = profitError;
    entry.predictedPeople = predictedPeople;
    entry.peopleError = peopleError;
  });
});

// Write back to file
fs.writeFileSync(travelsPath, JSON.stringify(travelsData, null, 2));

console.log('Successfully added prediction fields to travels.json');
