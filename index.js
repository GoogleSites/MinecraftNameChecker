const axios = require('axios');
const fs = require('fs-extra');
const ms = require('ms');

const names = [...new Set(fs.readFileSync('names.txt', 'utf8').replace(/\r/g, '').split('\n').filter(n => n.match(/^[A-Za-z0-9_]{1,16}$/)))];
const total = names.length;
const start = Date.now();

const available = [];
const processed = [];

let last = Date.now() + 1000;

function progressBar(done, total, length) {
  const percentage = (done * 100 / total).toFixed(2);
  const boxes = Math.floor(percentage / 100 * length);
  const bar = '#'.repeat(boxes) + '-'.repeat(length - boxes);

  return [bar, percentage];
}

function waitForNext() {
  return new Promise(resolve => setTimeout(() => {
    last = Date.now();
    resolve();
  }, Date.now() - last + 1000));
}

function fetchAvailable(names) {
  return new Promise(async resolve => {
    await waitForNext();

    axios.post('https://api.mojang.com/profiles/minecraft', names)
      .then(({ data }) => {
        const toLower = data.map(n => n.name.toLowerCase());
        const filtered = names.map(n => n.toLowerCase()).filter(e => !toLower.includes(e));

        resolve(filtered);
      })
      .catch(resolve);
  });
}

async function run() {
  while (names.length > 0) {
    const chunk = names.splice(0, 10);
    const good = await fetchAvailable(chunk);

    const offset = available.length === 0 ? '' : '\n';

    available.push(...good);
    processed.push(...chunk);
    await fs.appendFile('output-' + start + '.txt', available.join('\n') + offset);

    const [bar, percentage] = progressBar(processed.length, total, 50);

    process.stdout.write('[' + bar + '] (' + percentage + '%)\r');
  }

  process.stdout.write('='.repeat(25) + ' '.repeat(50) + '\n\n  Names checked: ' + total + '\n  Time taken: ' + ms(Date.now() - start, { long: true }) + '\n  Available: ' + available.length + ' (' + (available.length * 100 / total).toFixed(2) + '%)\n\n' + '='.repeat(25));
}

run();
